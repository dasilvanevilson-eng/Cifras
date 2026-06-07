-- Dados publicos para convites temporarios do Modo Banda/Coral.

create table if not exists public_invite_banda_state (
  invite_id uuid primary key references public_invites(id) on delete cascade,
  item_type text check (item_type in ('musica', 'repertorio')),
  musica_id uuid references musicas(id) on delete set null,
  repertorio_id uuid references repertorios(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint public_invite_banda_state_item_check check (
    (item_type = 'musica' and musica_id is not null and repertorio_id is null)
    or (item_type = 'repertorio' and repertorio_id is not null and musica_id is null)
  )
);

alter table public_invite_banda_state enable row level security;

drop policy if exists "Admins leem estado banda convite publico" on public_invite_banda_state;

create policy "Admins leem estado banda convite publico"
on public_invite_banda_state for select
to authenticated
using (public.current_user_role() = 'admin');

create or replace function public.get_public_banda_coral_data(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_musicas jsonb;
  v_repertorios jsonb;
  v_repertorio_musicas jsonb;
  v_state jsonb;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'banda_coral'
  limit 1;

  if not public.is_public_invite_active(v_invite) then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid');
  end if;

  update public.public_invites
  set
    use_count = use_count + 1,
    last_used_at = now()
  where id = v_invite.id
  returning * into v_invite;

  insert into public.public_invite_accesses (invite_id, accessed_module, metadata)
  values (
    v_invite.id,
    'banda_coral',
    jsonb_build_object('access_mode', coalesce(v_invite.metadata->>'access_mode', 'ambos'))
  );

  select coalesce(jsonb_agg(to_jsonb(m) order by m.titulo), '[]'::jsonb)
  into v_musicas
  from public.musicas m;

  with allowed_repertorios as (
    select value::uuid as repertorio_id
    from jsonb_array_elements_text(coalesce(v_invite.metadata->'repertorio_ids', '[]'::jsonb))
  )
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into v_repertorios
  from public.repertorios r
  inner join allowed_repertorios ar on ar.repertorio_id = r.id;

  with allowed_repertorios as (
    select value::uuid as repertorio_id
    from jsonb_array_elements_text(coalesce(v_invite.metadata->'repertorio_ids', '[]'::jsonb))
  )
  select coalesce(jsonb_agg(to_jsonb(rm) order by rm.repertorio_id, rm.ordem), '[]'::jsonb)
  into v_repertorio_musicas
  from (
    select
      rm.id,
      rm.repertorio_id,
      rm.ordem,
      rm.musica_id,
      rm.tom,
      rm.musica_titulo,
      rm.musica_artista,
      rm.musica_tom_original,
      rm.musica_excluida_em,
      rm.musica_excluida_usuario,
      rm.observacao,
      to_jsonb(m) as musicas
    from public.repertorio_musicas rm
    inner join allowed_repertorios ar on ar.repertorio_id = rm.repertorio_id
    left join public.musicas m on m.id = rm.musica_id
    order by rm.repertorio_id, rm.ordem
  ) rm;

  select coalesce(to_jsonb(s), '{}'::jsonb)
  into v_state
  from public.public_invite_banda_state s
  where s.invite_id = v_invite.id;

  return jsonb_build_object(
    'valid', true,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'title', v_invite.title,
      'module_key', v_invite.module_key,
      'access_mode', coalesce(v_invite.metadata->>'access_mode', 'ambos'),
      'repertorio_ids', coalesce(v_invite.metadata->'repertorio_ids', '[]'::jsonb),
      'expires_at', v_invite.expires_at,
      'max_uses', v_invite.max_uses,
      'use_count', v_invite.use_count
    ),
    'state', v_state,
    'musicas', v_musicas,
    'repertorios', v_repertorios,
    'repertorio_musicas', v_repertorio_musicas
  );
end;
$$;

create or replace function public.update_public_banda_coral_state(
  p_token text,
  p_item_type text,
  p_musica_id uuid default null,
  p_repertorio_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_access_mode text;
  v_state public_invite_banda_state;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'banda_coral'
  limit 1;

  if not public.is_public_invite_active(v_invite) then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid');
  end if;

  v_access_mode = coalesce(v_invite.metadata->>'access_mode', 'ambos');

  if v_access_mode = 'integrante' then
    return jsonb_build_object('valid', false, 'reason', 'leader_not_allowed');
  end if;

  if p_item_type = 'musica' then
    if p_musica_id is null or not exists (select 1 from public.musicas where id = p_musica_id) then
      return jsonb_build_object('valid', false, 'reason', 'music_not_found');
    end if;
  elsif p_item_type = 'repertorio' then
    if p_repertorio_id is null
      or not exists (
        select 1
        from jsonb_array_elements_text(coalesce(v_invite.metadata->'repertorio_ids', '[]'::jsonb)) allowed(id)
        where allowed.id::uuid = p_repertorio_id
      )
    then
      return jsonb_build_object('valid', false, 'reason', 'repertorio_not_allowed');
    end if;
  else
    return jsonb_build_object('valid', false, 'reason', 'invalid_item_type');
  end if;

  insert into public.public_invite_banda_state (
    invite_id,
    item_type,
    musica_id,
    repertorio_id,
    updated_at
  )
  values (
    v_invite.id,
    p_item_type,
    case when p_item_type = 'musica' then p_musica_id else null end,
    case when p_item_type = 'repertorio' then p_repertorio_id else null end,
    now()
  )
  on conflict (invite_id) do update
  set
    item_type = excluded.item_type,
    musica_id = excluded.musica_id,
    repertorio_id = excluded.repertorio_id,
    updated_at = now()
  returning * into v_state;

  return jsonb_build_object('valid', true, 'state', to_jsonb(v_state));
end;
$$;

create or replace function public.get_public_banda_coral_state(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_state public_invite_banda_state;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'banda_coral'
  limit 1;

  if not public.is_public_invite_active(v_invite) then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid');
  end if;

  select *
  into v_state
  from public.public_invite_banda_state
  where invite_id = v_invite.id;

  return jsonb_build_object(
    'valid', true,
    'state', coalesce(to_jsonb(v_state), '{}'::jsonb)
  );
end;
$$;

grant execute on function public.get_public_banda_coral_data(text) to anon, authenticated;
grant execute on function public.update_public_banda_coral_state(text, text, uuid, uuid) to anon, authenticated;
grant execute on function public.get_public_banda_coral_state(text) to anon, authenticated;

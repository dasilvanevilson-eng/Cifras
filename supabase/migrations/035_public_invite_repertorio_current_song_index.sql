-- Adiciona o indice atual como fallback para espelhar a navegacao do repertorio.

alter table public.public_invite_banda_state
add column if not exists repertorio_musica_id uuid references public.repertorio_musicas(id) on delete set null;

alter table public.public_invite_banda_state
add column if not exists current_song_index integer not null default 0;

alter table public.public_invite_banda_state
drop constraint if exists public_invite_banda_state_current_song_index_check;

alter table public.public_invite_banda_state
add constraint public_invite_banda_state_current_song_index_check check (current_song_index >= 0);

alter table public.public_invite_banda_state
drop constraint if exists public_invite_banda_state_item_check;

alter table public.public_invite_banda_state
add constraint public_invite_banda_state_item_check check (
  (
    item_type is null
    and musica_id is null
    and repertorio_id is null
    and repertorio_musica_id is null
  )
  or (
    item_type = 'musica'
    and musica_id is not null
    and repertorio_id is null
    and repertorio_musica_id is null
  )
  or (
    item_type = 'repertorio'
    and repertorio_id is not null
    and musica_id is null
  )
);

drop function if exists public.update_public_banda_coral_state(text, text, uuid, uuid, uuid, integer, integer);

create or replace function public.update_public_banda_coral_state(
  p_token text,
  p_item_type text,
  p_musica_id uuid default null,
  p_repertorio_id uuid default null,
  p_repertorio_musica_id uuid default null,
  p_current_song_index integer default 0,
  p_transpose_semitones integer default 0,
  p_capo integer default 0
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

    if p_repertorio_musica_id is not null
      and not exists (
        select 1
        from public.repertorio_musicas rm
        where rm.id = p_repertorio_musica_id
          and rm.repertorio_id = p_repertorio_id
      )
    then
      return jsonb_build_object('valid', false, 'reason', 'repertorio_music_not_found');
    end if;
  else
    return jsonb_build_object('valid', false, 'reason', 'invalid_item_type');
  end if;

  if coalesce(p_current_song_index, 0) < 0 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_current_song_index');
  end if;

  if coalesce(p_capo, 0) < 0 or coalesce(p_capo, 0) > 11 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_capo');
  end if;

  insert into public.public_invite_banda_state (
    invite_id,
    item_type,
    musica_id,
    repertorio_id,
    repertorio_musica_id,
    current_song_index,
    transpose_semitones,
    capo,
    updated_at
  )
  values (
    v_invite.id,
    p_item_type,
    case when p_item_type = 'musica' then p_musica_id else null end,
    case when p_item_type = 'repertorio' then p_repertorio_id else null end,
    case when p_item_type = 'repertorio' then p_repertorio_musica_id else null end,
    case when p_item_type = 'repertorio' then coalesce(p_current_song_index, 0) else 0 end,
    coalesce(p_transpose_semitones, 0),
    coalesce(p_capo, 0),
    now()
  )
  on conflict (invite_id) do update
  set
    item_type = excluded.item_type,
    musica_id = excluded.musica_id,
    repertorio_id = excluded.repertorio_id,
    repertorio_musica_id = excluded.repertorio_musica_id,
    current_song_index = excluded.current_song_index,
    transpose_semitones = excluded.transpose_semitones,
    capo = excluded.capo,
    updated_at = now()
  returning * into v_state;

  return jsonb_build_object('valid', true, 'state', to_jsonb(v_state));
end;
$$;

grant execute on function public.update_public_banda_coral_state(text, text, uuid, uuid, uuid, integer, integer, integer) to anon, authenticated;

-- Garante que o estado espelhado diferencie "ultima musica salva" de "palco ativo".

alter table public.public_invite_banda_state
add column if not exists is_stage_active boolean not null default false;

update public.public_invite_banda_state
set is_stage_active = false
where is_stage_active is distinct from false;

create or replace function public.clear_public_banda_coral_state(
  p_token text,
  p_client_id text
)
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

  update public.public_invite_banda_state
  set
    item_type = null,
    musica_id = null,
    repertorio_id = null,
    repertorio_musica_id = null,
    current_song_index = 0,
    transpose_semitones = 0,
    capo = 0,
    is_stage_active = false,
    updated_at = now()
  where invite_id = v_invite.id
    and leader_client_id = p_client_id
  returning * into v_state;

  if v_state.invite_id is null then
    return jsonb_build_object('valid', false, 'reason', 'not_current_leader');
  end if;

  return jsonb_build_object('valid', true, 'state', to_jsonb(v_state));
end;
$$;

grant execute on function public.clear_public_banda_coral_state(text, text) to anon, authenticated;

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
  v_allow_acervo boolean;
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
  v_allow_acervo = coalesce(nullif(v_invite.metadata->>'allow_acervo', '')::boolean, true);

  if v_access_mode = 'integrante' then
    return jsonb_build_object('valid', false, 'reason', 'leader_not_allowed');
  end if;

  if p_item_type = 'musica' then
    if p_musica_id is null or not exists (select 1 from public.musicas where id = p_musica_id) then
      return jsonb_build_object('valid', false, 'reason', 'music_not_found');
    end if;

    if not v_allow_acervo
      and not exists (
        select 1
        from public.repertorio_musicas rm
        where rm.musica_id = p_musica_id
          and exists (
            select 1
            from jsonb_array_elements_text(coalesce(v_invite.metadata->'repertorio_ids', '[]'::jsonb)) allowed(id)
            where allowed.id::uuid = rm.repertorio_id
          )
      )
    then
      return jsonb_build_object('valid', false, 'reason', 'music_not_allowed');
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
    is_stage_active,
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
    true,
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
    is_stage_active = true,
    updated_at = now()
  returning * into v_state;

  return jsonb_build_object('valid', true, 'state', to_jsonb(v_state));
end;
$$;

grant execute on function public.update_public_banda_coral_state(text, text, uuid, uuid, uuid, integer, integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';

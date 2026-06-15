-- Exige usuario autenticado para assumir a lideranca do link publico Banda/Coral.

alter table public.public_invite_banda_state
add column if not exists leader_user_id uuid;

alter table public.public_invite_banda_state
add column if not exists leader_name text;

create or replace function public.claim_public_banda_coral_leader(
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
  v_access_mode text;
  v_state public_invite_banda_state;
  v_user_id uuid := auth.uid();
  v_leader_name text;
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

  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'auth_required');
  end if;

  v_access_mode = coalesce(v_invite.metadata->>'access_mode', 'ambos');

  if v_access_mode = 'integrante' then
    return jsonb_build_object('valid', false, 'reason', 'leader_not_allowed');
  end if;

  if nullif(trim(coalesce(p_client_id, '')), '') is null then
    return jsonb_build_object('valid', false, 'reason', 'missing_client_id');
  end if;

  select coalesce(
    nullif(trim(p.nome), ''),
    nullif(trim(u.raw_user_meta_data->>'nome'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.email), ''),
    'Usuario'
  )
  into v_leader_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_user_id;

  insert into public.public_invite_banda_state (
    invite_id,
    leader_client_id,
    leader_user_id,
    leader_name,
    leader_connected_at,
    is_stage_active,
    updated_at
  )
  values (
    v_invite.id,
    p_client_id,
    v_user_id,
    v_leader_name,
    now(),
    false,
    now()
  )
  on conflict (invite_id) do update
  set
    leader_client_id = case
      when public_invite_banda_state.leader_user_id is null
        or public_invite_banda_state.leader_user_id = v_user_id
      then p_client_id
      else public_invite_banda_state.leader_client_id
    end,
    leader_user_id = case
      when public_invite_banda_state.leader_user_id is null
        or public_invite_banda_state.leader_user_id = v_user_id
      then v_user_id
      else public_invite_banda_state.leader_user_id
    end,
    leader_name = case
      when public_invite_banda_state.leader_user_id is null
        or public_invite_banda_state.leader_user_id = v_user_id
      then v_leader_name
      else public_invite_banda_state.leader_name
    end,
    leader_connected_at = case
      when public_invite_banda_state.leader_user_id is null
        or public_invite_banda_state.leader_user_id = v_user_id
      then now()
      else public_invite_banda_state.leader_connected_at
    end,
    item_type = case
      when public_invite_banda_state.leader_user_id is null then null
      else public_invite_banda_state.item_type
    end,
    musica_id = case
      when public_invite_banda_state.leader_user_id is null then null
      else public_invite_banda_state.musica_id
    end,
    repertorio_id = case
      when public_invite_banda_state.leader_user_id is null then null
      else public_invite_banda_state.repertorio_id
    end,
    repertorio_musica_id = case
      when public_invite_banda_state.leader_user_id is null then null
      else public_invite_banda_state.repertorio_musica_id
    end,
    current_song_index = case
      when public_invite_banda_state.leader_user_id is null then 0
      else public_invite_banda_state.current_song_index
    end,
    transpose_semitones = case
      when public_invite_banda_state.leader_user_id is null then 0
      else public_invite_banda_state.transpose_semitones
    end,
    capo = case
      when public_invite_banda_state.leader_user_id is null then 0
      else public_invite_banda_state.capo
    end,
    is_stage_active = case
      when public_invite_banda_state.leader_user_id is null then false
      else public_invite_banda_state.is_stage_active
    end,
    updated_at = case
      when public_invite_banda_state.leader_user_id is null then now()
      else public_invite_banda_state.updated_at
    end
  returning * into v_state;

  return jsonb_build_object(
    'valid', true,
    'is_leader', v_state.leader_user_id = v_user_id,
    'leader', jsonb_build_object(
      'active', v_state.leader_user_id is not null or v_state.leader_client_id is not null,
      'client_id', v_state.leader_client_id,
      'user_id', v_state.leader_user_id,
      'name', coalesce(nullif(trim(v_state.leader_name), ''), 'Usuario'),
      'connected_at', v_state.leader_connected_at
    )
  );
end;
$$;

grant execute on function public.claim_public_banda_coral_leader(text, text) to anon, authenticated;

create or replace function public.release_public_banda_coral_leader(
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
  v_user_id uuid := auth.uid();
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

  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'auth_required');
  end if;

  update public.public_invite_banda_state
  set
    leader_client_id = null,
    leader_user_id = null,
    leader_name = null,
    leader_connected_at = null
  where invite_id = v_invite.id
    and leader_user_id = v_user_id;

  return jsonb_build_object('valid', true);
end;
$$;

grant execute on function public.release_public_banda_coral_leader(text, text) to anon, authenticated;

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
  v_user_id uuid := auth.uid();
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

  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'auth_required');
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
    and leader_user_id = v_user_id
  returning * into v_state;

  if v_state.invite_id is null then
    return jsonb_build_object('valid', false, 'reason', 'not_current_leader');
  end if;

  return jsonb_build_object('valid', true, 'state', to_jsonb(v_state));
end;
$$;

grant execute on function public.clear_public_banda_coral_state(text, text) to anon, authenticated;

create or replace function public.set_public_banda_coral_stage_active(
  p_token text,
  p_client_id text,
  p_is_stage_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_state public_invite_banda_state;
  v_user_id uuid := auth.uid();
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

  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'auth_required');
  end if;

  update public.public_invite_banda_state
  set
    is_stage_active = coalesce(p_is_stage_active, false),
    updated_at = now()
  where invite_id = v_invite.id
    and leader_user_id = v_user_id
  returning * into v_state;

  if v_state.invite_id is null then
    return jsonb_build_object('valid', false, 'reason', 'not_current_leader');
  end if;

  return jsonb_build_object('valid', true, 'state', to_jsonb(v_state));
end;
$$;

grant execute on function public.set_public_banda_coral_stage_active(text, text, boolean) to anon, authenticated;

create or replace function public.get_public_banda_coral_presence(p_token text)
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
    'leader', jsonb_build_object(
      'active', v_state.leader_user_id is not null or v_state.leader_client_id is not null,
      'client_id', v_state.leader_client_id,
      'user_id', v_state.leader_user_id,
      'name', coalesce(nullif(trim(v_state.leader_name), ''), 'Usuario'),
      'connected_at', v_state.leader_connected_at
    )
  );
end;
$$;

grant execute on function public.get_public_banda_coral_presence(text) to anon, authenticated;

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
  v_existing_state public_invite_banda_state;
  v_state public_invite_banda_state;
  v_user_id uuid := auth.uid();
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

  if v_user_id is null then
    return jsonb_build_object('valid', false, 'reason', 'auth_required');
  end if;

  select *
  into v_existing_state
  from public.public_invite_banda_state
  where invite_id = v_invite.id;

  if v_existing_state.leader_user_id is distinct from v_user_id then
    return jsonb_build_object('valid', false, 'reason', 'not_current_leader');
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

  update public.public_invite_banda_state
  set
    item_type = p_item_type,
    musica_id = case when p_item_type = 'musica' then p_musica_id else null end,
    repertorio_id = case when p_item_type = 'repertorio' then p_repertorio_id else null end,
    repertorio_musica_id = case when p_item_type = 'repertorio' then p_repertorio_musica_id else null end,
    current_song_index = case when p_item_type = 'repertorio' then coalesce(p_current_song_index, 0) else 0 end,
    transpose_semitones = coalesce(p_transpose_semitones, 0),
    capo = coalesce(p_capo, 0),
    is_stage_active = true,
    updated_at = now()
  where invite_id = v_invite.id
    and leader_user_id = v_user_id
  returning * into v_state;

  if v_state.invite_id is null then
    return jsonb_build_object('valid', false, 'reason', 'not_current_leader');
  end if;

  return jsonb_build_object('valid', true, 'state', to_jsonb(v_state));
end;
$$;

grant execute on function public.update_public_banda_coral_state(text, text, uuid, uuid, uuid, integer, integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';

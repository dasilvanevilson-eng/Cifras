-- Limpa a ultima execucao espelhada quando o lider assume o convite ou fecha a execucao.
-- Assim integrantes nao abrem uma musica antiga antes do lider exibir algo na sessao atual.

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

  if nullif(trim(coalesce(p_client_id, '')), '') is null then
    return jsonb_build_object('valid', false, 'reason', 'missing_client_id');
  end if;

  insert into public.public_invite_banda_state (
    invite_id,
    leader_client_id,
    leader_connected_at,
    updated_at
  )
  values (
    v_invite.id,
    p_client_id,
    now(),
    now()
  )
  on conflict (invite_id) do update
  set
    leader_client_id = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then p_client_id
      else public_invite_banda_state.leader_client_id
    end,
    leader_connected_at = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then now()
      else public_invite_banda_state.leader_connected_at
    end,
    item_type = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then null
      else public_invite_banda_state.item_type
    end,
    musica_id = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then null
      else public_invite_banda_state.musica_id
    end,
    repertorio_id = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then null
      else public_invite_banda_state.repertorio_id
    end,
    repertorio_musica_id = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then null
      else public_invite_banda_state.repertorio_musica_id
    end,
    current_song_index = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then 0
      else public_invite_banda_state.current_song_index
    end,
    transpose_semitones = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then 0
      else public_invite_banda_state.transpose_semitones
    end,
    capo = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then 0
      else public_invite_banda_state.capo
    end,
    updated_at = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at is null
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then now()
      else public_invite_banda_state.updated_at
    end
  returning * into v_state;

  return jsonb_build_object(
    'valid', true,
    'is_leader', v_state.leader_client_id = p_client_id,
    'leader', jsonb_build_object(
      'active', v_state.leader_client_id is not null and v_state.leader_connected_at >= now() - interval '45 seconds',
      'client_id', v_state.leader_client_id,
      'connected_at', v_state.leader_connected_at
    )
  );
end;
$$;

grant execute on function public.claim_public_banda_coral_leader(text, text) to anon, authenticated;

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

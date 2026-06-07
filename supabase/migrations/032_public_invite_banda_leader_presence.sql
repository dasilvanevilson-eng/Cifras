-- Controle de presenca do lider em convites publicos do Modo Banda/Coral.

alter table public.public_invite_banda_state
add column if not exists leader_client_id text;

alter table public.public_invite_banda_state
add column if not exists leader_connected_at timestamptz;

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
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then p_client_id
      else public_invite_banda_state.leader_client_id
    end,
    leader_connected_at = case
      when public_invite_banda_state.leader_client_id is null
        or public_invite_banda_state.leader_client_id = p_client_id
        or public_invite_banda_state.leader_connected_at < now() - interval '45 seconds'
      then now()
      else public_invite_banda_state.leader_connected_at
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

create or replace function public.heartbeat_public_banda_coral_leader(
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
  set leader_connected_at = now()
  where invite_id = v_invite.id
    and leader_client_id = p_client_id
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
    leader_client_id = null,
    leader_connected_at = null
  where invite_id = v_invite.id
    and leader_client_id = p_client_id;

  return jsonb_build_object('valid', true);
end;
$$;

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
      'active', v_state.leader_client_id is not null and v_state.leader_connected_at >= now() - interval '45 seconds',
      'client_id', v_state.leader_client_id,
      'connected_at', v_state.leader_connected_at
    )
  );
end;
$$;

grant execute on function public.claim_public_banda_coral_leader(text, text) to anon, authenticated;
grant execute on function public.heartbeat_public_banda_coral_leader(text, text) to anon, authenticated;
grant execute on function public.release_public_banda_coral_leader(text, text) to anon, authenticated;
grant execute on function public.get_public_banda_coral_presence(text) to anon, authenticated;

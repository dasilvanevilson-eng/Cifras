-- Permite resetar a lideranca do link publico Banda/Coral apos login.

create or replace function public.reset_public_banda_coral_leader(
  p_token text,
  p_client_id text default null
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
  where invite_id = v_invite.id;

  return jsonb_build_object(
    'valid', true,
    'leader', jsonb_build_object(
      'active', false,
      'client_id', null,
      'user_id', null,
      'name', null,
      'connected_at', null
    )
  );
end;
$$;

grant execute on function public.reset_public_banda_coral_leader(text, text) to anon, authenticated;

notify pgrst, 'reload schema';

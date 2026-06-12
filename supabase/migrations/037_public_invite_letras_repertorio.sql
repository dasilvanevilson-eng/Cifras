-- Libera um repertorio em modo Letras por convite publico independente.

create or replace function public.get_public_letras_repertorio_data(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_repertorio_id uuid;
  v_repertorio jsonb;
  v_musicas jsonb;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'letras_repertorio'
  limit 1;

  if not public.is_public_invite_active(v_invite) then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid');
  end if;

  v_repertorio_id = coalesce(
    v_invite.target_id,
    nullif(v_invite.metadata->>'repertorio_id', '')::uuid,
    (
      select value::uuid
      from jsonb_array_elements_text(coalesce(v_invite.metadata->'repertorio_ids', '[]'::jsonb))
      limit 1
    )
  );

  if v_repertorio_id is null then
    return jsonb_build_object('valid', false, 'reason', 'repertorio_not_allowed');
  end if;

  select to_jsonb(r)
  into v_repertorio
  from public.repertorios r
  where r.id = v_repertorio_id;

  if v_repertorio is null then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
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
    'letras.repertorio',
    jsonb_build_object('repertorio_id', v_repertorio_id)
  );

  select coalesce(jsonb_agg(to_jsonb(rm) order by rm.ordem), '[]'::jsonb)
  into v_musicas
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
    left join public.musicas m on m.id = rm.musica_id
    where rm.repertorio_id = v_repertorio_id
    order by rm.ordem
  ) rm;

  return jsonb_build_object(
    'valid', true,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'title', v_invite.title,
      'module_key', v_invite.module_key,
      'target_type', v_invite.target_type,
      'target_id', v_invite.target_id,
      'allowed_actions', v_invite.allowed_actions,
      'expires_at', v_invite.expires_at,
      'max_uses', v_invite.max_uses,
      'use_count', v_invite.use_count
    ),
    'repertorio', v_repertorio,
    'musicas', v_musicas
  );
end;
$$;

grant execute on function public.get_public_letras_repertorio_data(text) to anon, authenticated;

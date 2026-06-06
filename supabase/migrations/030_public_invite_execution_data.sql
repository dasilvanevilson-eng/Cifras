-- Dados de execucao liberados por convite publico temporario.

create or replace function public.get_public_musica_data(p_token text, p_musica_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_musica jsonb;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'dashboard'
  limit 1;

  if v_invite.id is null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= now()
    or (
      v_invite.max_uses is not null
      and v_invite.use_count > v_invite.max_uses
    )
  then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid');
  end if;

  select to_jsonb(m)
  into v_musica
  from public.musicas m
  where m.id = p_musica_id;

  if v_musica is null then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  insert into public.public_invite_accesses (invite_id, accessed_module, metadata)
  values (
    v_invite.id,
    'musicas.execucao',
    jsonb_build_object('musica_id', p_musica_id)
  );

  return jsonb_build_object('valid', true, 'musica', v_musica);
end;
$$;

create or replace function public.get_public_repertorio_execution_data(p_token text, p_repertorio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_repertorio jsonb;
  v_musicas jsonb;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'dashboard'
  limit 1;

  if v_invite.id is null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= now()
    or (
      v_invite.max_uses is not null
      and v_invite.use_count > v_invite.max_uses
    )
  then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid');
  end if;

  select to_jsonb(r)
  into v_repertorio
  from public.repertorios r
  where r.id = p_repertorio_id;

  if v_repertorio is null then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  select coalesce(jsonb_agg(to_jsonb(rm) order by rm.ordem), '[]'::jsonb)
  into v_musicas
  from (
    select
      rm.id,
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
    where rm.repertorio_id = p_repertorio_id
    order by rm.ordem
  ) rm;

  insert into public.public_invite_accesses (invite_id, accessed_module, metadata)
  values (
    v_invite.id,
    'repertorios.execucao',
    jsonb_build_object('repertorio_id', p_repertorio_id)
  );

  return jsonb_build_object(
    'valid', true,
    'repertorio', v_repertorio,
    'musicas', v_musicas
  );
end;
$$;

grant execute on function public.get_public_musica_data(text, uuid) to anon, authenticated;
grant execute on function public.get_public_repertorio_execution_data(text, uuid) to anon, authenticated;

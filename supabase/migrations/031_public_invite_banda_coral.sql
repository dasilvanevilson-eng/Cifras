-- Dados publicos para convites temporarios do Modo Banda/Coral.

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
    'musicas', v_musicas,
    'repertorios', v_repertorios,
    'repertorio_musicas', v_repertorio_musicas
  );
end;
$$;

grant execute on function public.get_public_banda_coral_data(text) to anon, authenticated;

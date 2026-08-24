-- Garante que repertorios gravem uma copia privada quando a origem e da comunidade.
-- Se o usuario optar por sobrescrever uma cifra privada com o mesmo titulo,
-- a atualizacao acontece no banco para manter RLS, triggers e auditoria consistentes.

create or replace function public.ensure_private_musica_for_repertorio(
  p_musica_id uuid,
  p_overwrite_musica_id uuid default null
)
returns public.musicas
language plpgsql
security definer
set search_path = public
as $$
declare
  source_record public.musicas%rowtype;
  target_record public.musicas%rowtype;
  existing_record public.musicas%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuario autenticado obrigatorio para preparar cifra do repertorio.';
  end if;

  select *
  into source_record
  from public.musicas
  where id = p_musica_id
    and visibility = 'publica'
    and public.can_view_musica(id)
  limit 1;

  if source_record.id is null then
    raise exception 'Cifra da comunidade nao encontrada ou sem permissao de leitura.';
  end if;

  if p_overwrite_musica_id is not null then
    select *
    into target_record
    from public.musicas
    where id = p_overwrite_musica_id
      and visibility = 'privada'
      and (owner_id = current_user_id or created_by = current_user_id)
      and public.normalize_title(titulo) = public.normalize_title(source_record.titulo)
    limit 1;

    if target_record.id is null then
      raise exception 'Cifra privada para sobrescrever nao encontrada.';
    end if;

    update public.musicas
    set
      titulo = source_record.titulo,
      artista = source_record.artista,
      tom = source_record.tom,
      tags = source_record.tags,
      musica_link = source_record.musica_link,
      colaborador_nome = source_record.colaborador_nome,
      revisado_por_nome = source_record.revisado_por_nome,
      cifra_original = source_record.cifra_original,
      cifra_chordpro = source_record.cifra_chordpro,
      cifra_exibicao = source_record.cifra_exibicao,
      cifra_editor_state = source_record.cifra_editor_state,
      visibility = 'privada',
      owner_id = current_user_id,
      organization_id = null,
      source_musica_id = source_record.id,
      created_by = current_user_id,
      updated_at = now()
    where id = target_record.id
    returning * into target_record;

    return target_record;
  end if;

  select *
  into existing_record
  from public.musicas
  where visibility = 'privada'
    and source_musica_id = source_record.id
    and (owner_id = current_user_id or created_by = current_user_id)
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if existing_record.id is not null then
    return existing_record;
  end if;

  insert into public.musicas (
    titulo,
    artista,
    tom,
    tags,
    musica_link,
    colaborador_nome,
    revisado_por_nome,
    cifra_original,
    cifra_chordpro,
    cifra_exibicao,
    cifra_editor_state,
    visibility,
    owner_id,
    organization_id,
    source_musica_id,
    created_by
  )
  values (
    source_record.titulo,
    source_record.artista,
    source_record.tom,
    source_record.tags,
    source_record.musica_link,
    source_record.colaborador_nome,
    source_record.revisado_por_nome,
    source_record.cifra_original,
    source_record.cifra_chordpro,
    source_record.cifra_exibicao,
    source_record.cifra_editor_state,
    'privada',
    current_user_id,
    null,
    source_record.id,
    current_user_id
  )
  returning * into existing_record;

  return existing_record;
end;
$$;

revoke all on function public.ensure_private_musica_for_repertorio(uuid, uuid) from public;
grant execute on function public.ensure_private_musica_for_repertorio(uuid, uuid) to authenticated;

create index if not exists musicas_private_repertorio_source_idx
on public.musicas (source_musica_id, owner_id, created_by)
where visibility = 'privada' and source_musica_id is not null;

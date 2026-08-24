-- Ao republicar uma cifra privada ajustada, atualiza a versao publica ja criada
-- pelo mesmo usuario para a mesma origem. Cria uma nova versao apenas na primeira
-- publicacao daquele usuario.

create or replace function public.publish_private_musica_to_community(
  p_musica_id uuid,
  p_colaborador_nome text default null,
  p_revisado_por_nome text default null
)
returns public.musicas
language plpgsql
security definer
set search_path = public
as $$
declare
  private_record public.musicas%rowtype;
  published_record public.musicas%rowtype;
  current_user_id uuid := auth.uid();
  display_name text := nullif(trim(coalesce(p_colaborador_nome, '')), '');
  reviewer_name text := nullif(trim(coalesce(p_revisado_por_nome, '')), '');
  community_source_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario autenticado obrigatorio para publicar cifras.';
  end if;

  select *
  into private_record
  from public.musicas
  where id = p_musica_id
    and visibility = 'privada'
    and public.can_edit_musica(id)
  limit 1;

  if private_record.id is null then
    raise exception 'Cifra privada nao encontrada ou sem permissao de edicao.';
  end if;

  if private_record.source_musica_id is null then
    update public.musicas
    set
      artista = private_record.artista,
      tom = private_record.tom,
      tags = private_record.tags,
      musica_link = private_record.musica_link,
      colaborador_nome = coalesce(private_record.colaborador_nome, display_name),
      revisado_por_nome = coalesce(private_record.revisado_por_nome, reviewer_name, display_name),
      cifra_original = private_record.cifra_original,
      cifra_chordpro = private_record.cifra_chordpro,
      cifra_exibicao = private_record.cifra_exibicao,
      cifra_editor_state = private_record.cifra_editor_state,
      visibility = 'publica',
      owner_id = null,
      organization_id = null,
      source_musica_id = null,
      created_by = current_user_id
    where id = private_record.id
    returning * into published_record;

    return published_record;
  end if;

  community_source_id := private_record.source_musica_id;

  update public.musicas
  set
    titulo = private_record.titulo,
    artista = private_record.artista,
    tom = private_record.tom,
    tags = private_record.tags,
    musica_link = private_record.musica_link,
    colaborador_nome = coalesce(display_name, private_record.colaborador_nome, colaborador_nome),
    revisado_por_nome = coalesce(private_record.revisado_por_nome, reviewer_name, display_name),
    cifra_original = private_record.cifra_original,
    cifra_chordpro = private_record.cifra_chordpro,
    cifra_exibicao = private_record.cifra_exibicao,
    cifra_editor_state = private_record.cifra_editor_state,
    visibility = 'publica',
    owner_id = null,
    organization_id = null,
    source_musica_id = community_source_id,
    created_by = current_user_id
  where id = (
    select m.id
    from public.musicas m
    where m.visibility = 'publica'
      and m.source_musica_id = community_source_id
      and m.created_by = current_user_id
    order by m.updated_at desc nulls last, m.created_at desc nulls last, m.id desc
    limit 1
  )
  returning * into published_record;

  if published_record.id is not null then
    return published_record;
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
    private_record.titulo,
    private_record.artista,
    private_record.tom,
    private_record.tags,
    private_record.musica_link,
    coalesce(display_name, private_record.colaborador_nome),
    coalesce(private_record.revisado_por_nome, reviewer_name, display_name),
    private_record.cifra_original,
    private_record.cifra_chordpro,
    private_record.cifra_exibicao,
    private_record.cifra_editor_state,
    'publica',
    null,
    null,
    community_source_id,
    current_user_id
  )
  returning * into published_record;

  return published_record;
end;
$$;

revoke all on function public.publish_private_musica_to_community(uuid, text, text) from public;
grant execute on function public.publish_private_musica_to_community(uuid, text, text) to authenticated;

create index if not exists musicas_public_user_version_lookup_idx
  on public.musicas (source_musica_id, created_by)
  where visibility = 'publica'
    and source_musica_id is not null
    and created_by is not null;

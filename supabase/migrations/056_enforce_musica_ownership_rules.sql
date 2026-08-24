-- Consolida as regras de autoria das cifras:
-- - Admin edita/exclui qualquer cifra.
-- - Usuarios editam/excluem apenas cifras acrescentadas por eles mesmos.
-- - Ajustes feitos a partir da Comunidade sempre voltam como nova versao publica.
-- - Cifras publicas legadas sem autoria passam a pertencer a Nevilson da Silva.

do $$
declare
  nevilson_user_id uuid;
begin
  select p.id
  into nevilson_user_id
  from public.profiles p
  where public.normalize_title(p.nome) = public.normalize_title('Nevilson da Silva')
  order by p.created_at
  limit 1;

  if nevilson_user_id is null then
    raise exception 'Perfil "Nevilson da Silva" nao encontrado para atribuir cifras publicas legadas.';
  end if;

  update public.musicas
  set
    created_by = nevilson_user_id,
    colaborador_nome = coalesce(nullif(trim(colaborador_nome), ''), 'Nevilson da Silva')
  where visibility = 'publica'
    and source_musica_id is null
    and created_by is null;
end $$;

create or replace function public.can_edit_musica(p_musica_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.musicas m
    where m.id = p_musica_id
      and (
        public.current_user_role() = 'admin'
        or (
          m.visibility = 'publica'
          and m.created_by = auth.uid()
        )
        or (
          m.visibility in ('privada', 'compartilhada')
          and (
            m.owner_id = auth.uid()
            or m.created_by = auth.uid()
          )
        )
        or (
          m.visibility = 'organizacao'
          and m.created_by = auth.uid()
        )
      )
  )
$$;

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
    private_record.source_musica_id,
    current_user_id
  )
  returning * into published_record;

  return published_record;
end;
$$;

revoke all on function public.publish_private_musica_to_community(uuid, text, text) from public;
grant execute on function public.publish_private_musica_to_community(uuid, text, text) to authenticated;

create or replace function public.delete_musica_com_vinculos(p_musica_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_edit_musica(p_musica_id) then
    raise exception 'Usuario sem permissao para excluir esta cifra.';
  end if;

  update public.repertorio_musicas rm
  set
    musica_titulo = coalesce(rm.musica_titulo, m.titulo),
    musica_artista = coalesce(rm.musica_artista, m.artista),
    musica_tom_original = coalesce(rm.musica_tom_original, m.tom),
    tom = coalesce(rm.tom, m.tom),
    musica_excluida_em = now(),
    musica_excluida_usuario = auth.uid(),
    musica_id = null
  from public.musicas m
  where rm.musica_id = m.id
    and m.id = p_musica_id;

  delete from public.musicas
  where id = p_musica_id;
end;
$$;

revoke all on function public.delete_musica_com_vinculos(uuid) from public;
grant execute on function public.delete_musica_com_vinculos(uuid) to authenticated;

-- Copia uma cifra visivel para o acervo privado do usuario autenticado.
-- Centralizar a operacao no banco evita divergencias entre payload do cliente,
-- triggers e policies de insert da tabela musicas.

create or replace function public.duplicate_musica_to_private(
  p_musica_id uuid,
  p_titulo text default null
)
returns public.musicas
language plpgsql
security definer
set search_path = public
as $$
declare
  source_record public.musicas%rowtype;
  duplicated_record public.musicas%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuario autenticado obrigatorio para copiar cifras.';
  end if;

  select *
  into source_record
  from public.musicas
  where id = p_musica_id
    and public.can_view_musica(id)
  limit 1;

  if source_record.id is null then
    raise exception 'Cifra de origem nao encontrada ou sem permissao de leitura.';
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
    coalesce(nullif(trim(p_titulo), ''), source_record.titulo),
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
  returning * into duplicated_record;

  return duplicated_record;
end;
$$;

revoke all on function public.duplicate_musica_to_private(uuid, text) from public;
grant execute on function public.duplicate_musica_to_private(uuid, text) to authenticated;

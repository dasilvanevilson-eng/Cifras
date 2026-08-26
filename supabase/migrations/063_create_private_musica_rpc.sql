-- Cria cifras privadas por RPC para evitar bloqueios de RLS no insert direto.

create or replace function public.create_private_musica(
  p_titulo text,
  p_artista text default null,
  p_tom text default null,
  p_tags text default null,
  p_musica_link text default null,
  p_colaborador_nome text default null,
  p_revisado_por_nome text default null,
  p_cifra_original text default null,
  p_cifra_chordpro text default null,
  p_cifra_exibicao text default null,
  p_cifra_editor_state jsonb default '{}'::jsonb
)
returns public.musicas
language plpgsql
security definer
set search_path = public
as $$
declare
  created_record public.musicas%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuario autenticado obrigatorio para cadastrar cifras.';
  end if;

  if nullif(trim(coalesce(p_titulo, '')), '') is null then
    raise exception 'Titulo da cifra obrigatorio.';
  end if;

  if nullif(trim(coalesce(p_cifra_original, '')), '') is null then
    raise exception 'Cifra obrigatoria.';
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
    trim(p_titulo),
    nullif(trim(coalesce(p_artista, '')), ''),
    nullif(trim(coalesce(p_tom, '')), ''),
    nullif(trim(coalesce(p_tags, '')), ''),
    nullif(trim(coalesce(p_musica_link, '')), ''),
    nullif(trim(coalesce(p_colaborador_nome, '')), ''),
    nullif(trim(coalesce(p_revisado_por_nome, '')), ''),
    p_cifra_original,
    coalesce(p_cifra_chordpro, ''),
    coalesce(p_cifra_exibicao, ''),
    coalesce(p_cifra_editor_state, '{}'::jsonb),
    'privada',
    current_user_id,
    null,
    null,
    current_user_id
  )
  returning * into created_record;

  return created_record;
end;
$$;

revoke all on function public.create_private_musica(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;

grant execute on function public.create_private_musica(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;

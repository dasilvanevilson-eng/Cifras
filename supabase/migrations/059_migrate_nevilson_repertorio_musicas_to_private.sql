-- Copia para "Minhas cifras" as musicas da comunidade usadas nos repertorios
-- do Nevilson da Silva e substitui os vinculos dos repertorios pelas copias privadas.

create or replace function public.preview_nevilson_repertorio_public_musicas()
returns table (
  user_id uuid,
  user_name text,
  repertorios_afetados bigint,
  vinculos_publicos bigint,
  musicas_publicas_distintas bigint,
  copias_privadas_existentes bigint,
  copias_privadas_a_criar bigint
)
language sql
security definer
set search_path = public
as $$
  with target_user as (
    select p.id, p.nome
    from public.profiles p
    where public.normalize_title(p.nome) = public.normalize_title('Nevilson da Silva')
  ),
  public_links as (
    select
      tu.id as user_id,
      tu.nome as user_name,
      r.id as repertorio_id,
      m.id as musica_id,
      pm.id as private_musica_id
    from target_user tu
    join public.repertorios r
      on r.criado_por = tu.id
    join public.repertorio_musicas rm
      on rm.repertorio_id = r.id
    join public.musicas m
      on m.id = rm.musica_id
     and m.visibility = 'publica'
    left join public.musicas pm
      on pm.visibility = 'privada'
     and pm.source_musica_id = m.id
     and (pm.owner_id = tu.id or pm.created_by = tu.id)
  )
  select
    tu.id,
    tu.nome,
    count(distinct pl.repertorio_id),
    count(pl.musica_id),
    count(distinct pl.musica_id),
    count(distinct pl.private_musica_id),
    count(distinct pl.musica_id) filter (where pl.private_musica_id is null)
  from target_user tu
  left join public_links pl
    on pl.user_id = tu.id
  group by tu.id, tu.nome;
$$;

create or replace function public.migrate_nevilson_repertorio_public_musicas_to_private()
returns table (
  user_id uuid,
  user_name text,
  repertorios_afetados bigint,
  vinculos_migrados bigint,
  copias_privadas_criadas bigint,
  vinculos_duplicados_removidos bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_user_name text;
  created_count bigint := 0;
  deleted_count bigint := 0;
  updated_count bigint := 0;
  affected_repertorios bigint := 0;
begin
  select p.id, p.nome
  into target_user_id, target_user_name
  from public.profiles p
  where public.normalize_title(p.nome) = public.normalize_title('Nevilson da Silva');

  if target_user_id is null then
    raise exception 'Perfil Nevilson da Silva nao encontrado.';
  end if;

  if (
    select count(*)
    from public.profiles p
    where public.normalize_title(p.nome) = public.normalize_title('Nevilson da Silva')
  ) > 1 then
    raise exception 'Mais de um perfil Nevilson da Silva encontrado. Execute a rotina manualmente usando o id correto.';
  end if;

  with source_musicas as (
    select distinct m.*
    from public.repertorios r
    join public.repertorio_musicas rm
      on rm.repertorio_id = r.id
    join public.musicas m
      on m.id = rm.musica_id
     and m.visibility = 'publica'
    where r.criado_por = target_user_id
      and not exists (
        select 1
        from public.musicas private_m
        where private_m.visibility = 'privada'
          and private_m.source_musica_id = m.id
          and (private_m.owner_id = target_user_id or private_m.created_by = target_user_id)
      )
  ),
  inserted as (
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
      created_by,
      updated_by
    )
    select
      sm.titulo,
      sm.artista,
      sm.tom,
      sm.tags,
      sm.musica_link,
      sm.colaborador_nome,
      sm.revisado_por_nome,
      sm.cifra_original,
      sm.cifra_chordpro,
      sm.cifra_exibicao,
      sm.cifra_editor_state,
      'privada',
      target_user_id,
      null,
      sm.id,
      target_user_id,
      target_user_id
    from source_musicas sm
    returning id
  )
  select count(*)
  into created_count
  from inserted;

  drop table if exists tmp_nevilson_repertorio_musica_map;

  create temporary table tmp_nevilson_repertorio_musica_map on commit drop as
  select
    rm.id as repertorio_musica_id,
    rm.repertorio_id,
    rm.ordem,
    rm.musica_id as public_musica_id,
    private_m.id as private_musica_id
  from public.repertorios r
  join public.repertorio_musicas rm
    on rm.repertorio_id = r.id
  join public.musicas public_m
    on public_m.id = rm.musica_id
   and public_m.visibility = 'publica'
  join lateral (
    select pm.id
    from public.musicas pm
    where pm.visibility = 'privada'
      and pm.source_musica_id = public_m.id
      and (pm.owner_id = target_user_id or pm.created_by = target_user_id)
    order by pm.updated_at desc nulls last, pm.created_at desc nulls last, pm.id
    limit 1
  ) private_m on true
  where r.criado_por = target_user_id;

  with duplicate_links as (
    select mapped.repertorio_musica_id
    from tmp_nevilson_repertorio_musica_map mapped
    where exists (
      select 1
      from public.repertorio_musicas current_private
      where current_private.repertorio_id = mapped.repertorio_id
        and current_private.musica_id = mapped.private_musica_id
        and current_private.id <> mapped.repertorio_musica_id
    )
    union
    select later_link.repertorio_musica_id
    from tmp_nevilson_repertorio_musica_map later_link
    join tmp_nevilson_repertorio_musica_map earlier_link
      on earlier_link.repertorio_id = later_link.repertorio_id
     and earlier_link.private_musica_id = later_link.private_musica_id
     and (
       earlier_link.ordem < later_link.ordem
       or (
         earlier_link.ordem = later_link.ordem
         and earlier_link.repertorio_musica_id < later_link.repertorio_musica_id
       )
     )
  ),
  deleted as (
    delete from public.repertorio_musicas rm
    using duplicate_links dl
    where rm.id = dl.repertorio_musica_id
    returning rm.id
  )
  select count(*)
  into deleted_count
  from deleted;

  with updated as (
    update public.repertorio_musicas rm
    set musica_id = mapped.private_musica_id
    from tmp_nevilson_repertorio_musica_map mapped
    where rm.id = mapped.repertorio_musica_id
      and rm.musica_id = mapped.public_musica_id
    returning rm.repertorio_id
  )
  select count(*), count(distinct repertorio_id)
  into updated_count, affected_repertorios
  from updated;

  return query
  select
    target_user_id,
    target_user_name,
    affected_repertorios,
    updated_count,
    created_count,
    deleted_count;
end;
$$;

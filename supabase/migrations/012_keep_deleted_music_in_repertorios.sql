-- Mantem no repertorio uma referencia visivel quando uma musica e excluida do acervo.

alter table repertorio_musicas
add column if not exists musica_titulo text,
add column if not exists musica_artista text,
add column if not exists musica_tom_original text,
add column if not exists musica_excluida_em timestamptz,
add column if not exists musica_excluida_usuario uuid references auth.users(id) on delete set null;

update repertorio_musicas rm
set
  musica_titulo = coalesce(rm.musica_titulo, m.titulo),
  musica_artista = coalesce(rm.musica_artista, m.artista),
  musica_tom_original = coalesce(rm.musica_tom_original, m.tom)
from musicas m
where rm.musica_id = m.id;

alter table repertorio_musicas
alter column musica_id drop not null;

alter table repertorio_musicas
drop constraint if exists repertorio_musicas_musica_id_fkey;

alter table repertorio_musicas
add constraint repertorio_musicas_musica_id_fkey
foreign key (musica_id) references musicas(id) on delete set null;

create or replace function public.prevent_delete_musica_em_repertorio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.repertorio_musicas
    where musica_id = old.id
  ) then
    raise exception 'Use a exclusao com preservacao nos repertorios para excluir esta musica.';
  end if;

  return old;
end;
$$;

create or replace function public.delete_musica_com_vinculos(p_musica_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(public.current_user_role(), '') not in ('admin', 'editor') then
    raise exception 'Apenas administradores e editores podem excluir musicas.';
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

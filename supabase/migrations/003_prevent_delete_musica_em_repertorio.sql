-- Impede exclusoes diretas de musicas que ainda estejam vinculadas a repertorios.
-- A interface pode remover os vinculos primeiro, com confirmacao explicita do usuario,
-- e so entao excluir a musica.

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
    raise exception 'Remova a musica dos repertorios antes de exclui-la.';
  end if;

  return old;
end;
$$;

drop trigger if exists prevent_delete_musica_em_repertorio on musicas;

create trigger prevent_delete_musica_em_repertorio
before delete on musicas
for each row
execute function public.prevent_delete_musica_em_repertorio();

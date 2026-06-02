-- Exclui uma musica, removendo antes seus vinculos com repertorios.
-- Repertorios que ficarem vazios apos a remocao tambem sao excluidos.
-- A operacao roda em uma unica transacao por chamada da funcao.

create or replace function public.delete_musica_com_vinculos(p_musica_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  repertorios_vazios uuid[];
begin
  if coalesce(public.current_user_role(), '') not in ('admin', 'editor') then
    raise exception 'Apenas administradores e editores podem excluir musicas.';
  end if;

  select coalesce(array_agg(rm.repertorio_id), '{}'::uuid[])
  into repertorios_vazios
  from public.repertorio_musicas rm
  where rm.musica_id = p_musica_id
    and (
      select count(*)
      from public.repertorio_musicas rm_count
      where rm_count.repertorio_id = rm.repertorio_id
    ) <= 1;

  delete from public.repertorio_musicas
  where musica_id = p_musica_id;

  delete from public.repertorios
  where id = any(repertorios_vazios);

  delete from public.musicas
  where id = p_musica_id;
end;
$$;

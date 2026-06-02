-- Troca a ordem de duas musicas dentro de um repertorio em uma unica transacao.

create or replace function public.swap_repertorio_musicas_ordem(
  p_current_id uuid,
  p_target_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_ordem integer;
  target_ordem integer;
begin
  if coalesce(public.current_user_role(), '') not in ('admin', 'editor') then
    raise exception 'Apenas administradores e editores podem reordenar repertorios.';
  end if;

  select ordem
  into current_ordem
  from public.repertorio_musicas
  where id = p_current_id;

  select ordem
  into target_ordem
  from public.repertorio_musicas
  where id = p_target_id;

  if current_ordem is null or target_ordem is null then
    raise exception 'Musica do repertorio nao encontrada.';
  end if;

  update public.repertorio_musicas
  set ordem = target_ordem
  where id = p_current_id;

  update public.repertorio_musicas
  set ordem = current_ordem
  where id = p_target_id;
end;
$$;

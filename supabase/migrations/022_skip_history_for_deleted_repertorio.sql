-- Evita erro de foreign key ao excluir um repertorio.
-- Durante a exclusao em cascata, triggers de historico podem tentar registrar
-- alteracoes para um repertorio que ja nao existe mais.

create or replace function public.insert_repertorio_history(
  p_repertorio_id uuid,
  p_acao text,
  p_detalhes jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.repertorios
    where id = p_repertorio_id
  ) then
    return;
  end if;

  insert into public.repertorio_historico (
    repertorio_id,
    usuario_id,
    usuario_nome,
    acao,
    detalhes
  )
  values (
    p_repertorio_id,
    auth.uid(),
    public.current_user_name(),
    p_acao,
    coalesce(p_detalhes, '{}'::jsonb)
  );
end;
$$;

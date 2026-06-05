-- Corrige acesso a repertorios privados.
-- Compartilhamentos gravados so devem liberar acesso quando o repertorio estiver como seletivo.

create or replace function public.can_view_repertorio(p_repertorio_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.repertorios r
    where r.id = p_repertorio_id
      and (
        r.visibilidade = 'publico'
        or r.criado_por = auth.uid()
        or public.current_user_role() = 'admin'
        or (
          r.visibilidade = 'seletivo'
          and exists (
            select 1
            from public.repertorio_compartilhamentos rc
            where rc.repertorio_id = r.id
              and rc.user_id = auth.uid()
          )
        )
      )
  )
$$;

create or replace function public.can_edit_repertorio(p_repertorio_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.repertorios r
    where r.id = p_repertorio_id
      and public.current_user_role() in ('admin', 'editor')
      and (
        r.criado_por = auth.uid()
        or public.current_user_role() = 'admin'
        or (
          r.permite_edicao_compartilhada
          and (
            r.visibilidade = 'publico'
            or (
              r.visibilidade = 'seletivo'
              and exists (
                select 1
                from public.repertorio_compartilhamentos rc
                where rc.repertorio_id = r.id
                  and rc.user_id = auth.uid()
              )
            )
          )
        )
      )
  )
$$;

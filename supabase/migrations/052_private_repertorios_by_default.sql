-- Repertorios passam a ser privados por padrao e sem configuracao de privacidade na UI.

alter table public.repertorios
  alter column visibilidade set default 'privado';

update public.repertorios
set
  visibilidade = 'privado',
  permite_edicao_compartilhada = false
where visibilidade is distinct from 'privado'
   or permite_edicao_compartilhada is distinct from false;

delete from public.repertorio_compartilhamentos;

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
        public.current_user_role() = 'admin'
        or r.criado_por = auth.uid()
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
      and (
        public.current_user_role() = 'admin'
        or r.criado_por = auth.uid()
      )
  )
$$;

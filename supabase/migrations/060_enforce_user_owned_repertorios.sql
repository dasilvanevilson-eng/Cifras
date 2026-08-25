-- Repertorios sao individuais por usuario, inclusive para administradores.

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
      and r.criado_por = auth.uid()
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
      and r.criado_por = auth.uid()
  )
$$;

drop policy if exists "Usuarios autenticados podem criar repertorios" on public.repertorios;

create policy "Usuarios autenticados podem criar repertorios"
on public.repertorios for insert
to authenticated
with check (
  auth.uid() is not null
  and coalesce(criado_por, auth.uid()) = auth.uid()
);

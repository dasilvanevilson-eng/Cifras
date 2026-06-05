-- Reforca as policies de privacidade dos repertorios.
-- Remove policies antigas nas tabelas de repertorio e recria as regras de acesso do zero.

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
        or r.visibilidade = 'publico'
        or (
          r.visibilidade = 'privado'
          and r.criado_por = auth.uid()
        )
        or (
          r.visibilidade = 'seletivo'
          and (
            r.criado_por = auth.uid()
            or exists (
              select 1
              from public.repertorio_compartilhamentos rc
              where rc.repertorio_id = r.id
                and rc.user_id = auth.uid()
            )
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
        public.current_user_role() = 'admin'
        or r.criado_por = auth.uid()
        or (
          r.permite_edicao_compartilhada
          and r.visibilidade = 'publico'
        )
        or (
          r.permite_edicao_compartilhada
          and r.visibilidade = 'seletivo'
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

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('repertorios', 'repertorio_musicas', 'repertorio_compartilhamentos')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

alter table repertorios enable row level security;
alter table repertorio_musicas enable row level security;
alter table repertorio_compartilhamentos enable row level security;

create policy "Repertorios visiveis por privacidade"
on repertorios for select
to authenticated
using (public.can_view_repertorio(id));

create policy "Admin e editor criam repertorios proprios"
on repertorios for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'editor')
  and coalesce(criado_por, auth.uid()) = auth.uid()
);

create policy "Usuarios autorizados editam repertorios"
on repertorios for update
to authenticated
using (public.can_edit_repertorio(id))
with check (public.can_edit_repertorio(id));

create policy "Usuarios autorizados excluem repertorios"
on repertorios for delete
to authenticated
using (public.can_edit_repertorio(id));

create policy "Musicas de repertorios visiveis"
on repertorio_musicas for select
to authenticated
using (public.can_view_repertorio(repertorio_id));

create policy "Usuarios autorizados adicionam musicas ao repertorio"
on repertorio_musicas for insert
to authenticated
with check (public.can_edit_repertorio(repertorio_id));

create policy "Usuarios autorizados alteram musicas do repertorio"
on repertorio_musicas for update
to authenticated
using (public.can_edit_repertorio(repertorio_id))
with check (public.can_edit_repertorio(repertorio_id));

create policy "Usuarios autorizados removem musicas do repertorio"
on repertorio_musicas for delete
to authenticated
using (public.can_edit_repertorio(repertorio_id));

create policy "Compartilhamentos de repertorios visiveis"
on repertorio_compartilhamentos for select
to authenticated
using (public.can_view_repertorio(repertorio_id));

create policy "Usuarios autorizados criam compartilhamentos"
on repertorio_compartilhamentos for insert
to authenticated
with check (public.can_edit_repertorio(repertorio_id));

create policy "Usuarios autorizados alteram compartilhamentos"
on repertorio_compartilhamentos for update
to authenticated
using (public.can_edit_repertorio(repertorio_id))
with check (public.can_edit_repertorio(repertorio_id));

create policy "Usuarios autorizados removem compartilhamentos"
on repertorio_compartilhamentos for delete
to authenticated
using (public.can_edit_repertorio(repertorio_id));

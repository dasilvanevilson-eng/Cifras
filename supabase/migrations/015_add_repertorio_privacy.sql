-- Privacidade e compartilhamento de repertorios.

alter table repertorios
add column if not exists criado_por uuid references auth.users(id) on delete set null default auth.uid(),
add column if not exists visibilidade text not null default 'publico'
  check (visibilidade in ('privado', 'publico', 'seletivo')),
add column if not exists permite_edicao_compartilhada boolean not null default false;

update repertorios
set visibilidade = 'publico'
where visibilidade is null;

create table if not exists repertorio_compartilhamentos (
  repertorio_id uuid not null references repertorios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (repertorio_id, user_id)
);

alter table repertorio_compartilhamentos enable row level security;

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
        or exists (
          select 1
          from public.repertorio_compartilhamentos rc
          where rc.repertorio_id = r.id
            and rc.user_id = auth.uid()
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

drop policy if exists "Usuarios autenticados leem repertorios" on repertorios;
drop policy if exists "Admin e editor cadastram repertorios" on repertorios;
drop policy if exists "Admin e editor atualizam repertorios" on repertorios;
drop policy if exists "Admin e editor removem repertorios" on repertorios;

create policy "Usuarios autenticados leem repertorios permitidos"
on repertorios for select
to authenticated
using (public.can_view_repertorio(id));

create policy "Admin e editor cadastram repertorios"
on repertorios for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'editor')
  and coalesce(criado_por, auth.uid()) = auth.uid()
);

create policy "Usuarios autorizados atualizam repertorios"
on repertorios for update
to authenticated
using (public.can_edit_repertorio(id))
with check (public.can_edit_repertorio(id));

create policy "Usuarios autorizados removem repertorios"
on repertorios for delete
to authenticated
using (public.can_edit_repertorio(id));

drop policy if exists "Usuarios autenticados leem musicas dos repertorios" on repertorio_musicas;
drop policy if exists "Admin e editor associam musicas aos repertorios" on repertorio_musicas;
drop policy if exists "Admin e editor reordenam musicas dos repertorios" on repertorio_musicas;
drop policy if exists "Admin e editor removem musicas dos repertorios" on repertorio_musicas;

create policy "Usuarios autorizados leem musicas dos repertorios"
on repertorio_musicas for select
to authenticated
using (public.can_view_repertorio(repertorio_id));

create policy "Usuarios autorizados associam musicas aos repertorios"
on repertorio_musicas for insert
to authenticated
with check (public.can_edit_repertorio(repertorio_id));

create policy "Usuarios autorizados reordenam musicas dos repertorios"
on repertorio_musicas for update
to authenticated
using (public.can_edit_repertorio(repertorio_id))
with check (public.can_edit_repertorio(repertorio_id));

create policy "Usuarios autorizados removem musicas dos repertorios"
on repertorio_musicas for delete
to authenticated
using (public.can_edit_repertorio(repertorio_id));

create policy "Usuarios autenticados leem compartilhamentos visiveis"
on repertorio_compartilhamentos for select
to authenticated
using (public.can_view_repertorio(repertorio_id));

create policy "Usuarios autorizados gerenciam compartilhamentos"
on repertorio_compartilhamentos for all
to authenticated
using (public.can_edit_repertorio(repertorio_id))
with check (public.can_edit_repertorio(repertorio_id));

drop policy if exists "Usuarios autenticados veem perfis para compartilhamento" on profiles;

create policy "Usuarios autenticados veem perfis para compartilhamento"
on profiles for select
to authenticated
using (true);

-- Multiusuario e multi-cliente para cifras.
-- Mantem compatibilidade com o acervo atual migrando musicas existentes para a comunidade publica.

create extension if not exists unaccent with schema extensions;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'musico' check (papel in ('admin', 'editor', 'musico')),
  status text not null default 'ativo' check (status in ('ativo', 'pendente', 'bloqueado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

alter table public.musicas
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists visibility text not null default 'publica'
    check (visibility in ('publica', 'privada', 'organizacao', 'compartilhada')),
  add column if not exists source_musica_id uuid references public.musicas(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists titulo_normalizado text;

alter table public.repertorios
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create table if not exists public.musica_compartilhamentos (
  musica_id uuid not null references public.musicas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_edit boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (musica_id, user_id)
);

create table if not exists public.musica_group_shares (
  musica_id uuid not null references public.musicas(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  can_edit boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (musica_id, organization_id)
);

alter table public.musica_compartilhamentos enable row level security;
alter table public.musica_group_shares enable row level security;

create or replace function public.normalize_title(value text)
returns text
language sql
immutable
as $$
  select lower(extensions.unaccent(coalesce(value, '')))
$$;

update public.musicas
set
  visibility = coalesce(visibility, 'publica'),
  titulo_normalizado = public.normalize_title(titulo)
where titulo_normalizado is null;

create or replace function public.touch_musicas_multiuser()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  new.titulo_normalizado = public.normalize_title(new.titulo);

  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.owner_id = case
      when new.visibility in ('privada', 'compartilhada') then coalesce(new.owner_id, auth.uid())
      else new.owner_id
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists touch_musicas_multiuser on public.musicas;
create trigger touch_musicas_multiuser
before insert or update on public.musicas
for each row
execute function public.touch_musicas_multiuser();

create or replace function public.current_user_is_org_member(p_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.status = 'ativo'
  )
$$;

create or replace function public.current_user_org_role(p_organization_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select om.papel
  from public.organization_members om
  where om.organization_id = p_organization_id
    and om.user_id = auth.uid()
    and om.status = 'ativo'
  limit 1
$$;

create or replace function public.can_view_musica(p_musica_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.musicas m
    where m.id = p_musica_id
      and (
        public.current_user_role() = 'admin'
        or m.visibility = 'publica'
        or m.owner_id = auth.uid()
        or m.created_by = auth.uid()
        or (
          m.visibility = 'organizacao'
          and m.organization_id is not null
          and public.current_user_is_org_member(m.organization_id)
        )
        or exists (
          select 1
          from public.musica_compartilhamentos mc
          where mc.musica_id = m.id
            and mc.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.musica_group_shares mg
          where mg.musica_id = m.id
            and public.current_user_is_org_member(mg.organization_id)
        )
      )
  )
$$;

create or replace function public.can_edit_musica(p_musica_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.musicas m
    where m.id = p_musica_id
      and (
        public.current_user_role() = 'admin'
        or m.owner_id = auth.uid()
        or m.created_by = auth.uid()
        or (
          m.organization_id is not null
          and public.current_user_org_role(m.organization_id) in ('admin', 'editor')
        )
        or exists (
          select 1
          from public.musica_compartilhamentos mc
          where mc.musica_id = m.id
            and mc.user_id = auth.uid()
            and mc.can_edit
        )
        or exists (
          select 1
          from public.musica_group_shares mg
          where mg.musica_id = m.id
            and mg.can_edit
            and public.current_user_org_role(mg.organization_id) in ('admin', 'editor')
        )
      )
  )
$$;

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
        r.organization_id is null
        or public.current_user_role() = 'admin'
        or public.current_user_is_org_member(r.organization_id)
      )
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
      and (
        public.current_user_role() = 'admin'
        or r.criado_por = auth.uid()
        or (
          r.organization_id is not null
          and public.current_user_org_role(r.organization_id) in ('admin', 'editor')
        )
        or (
          r.permite_edicao_compartilhada
          and r.visibilidade = 'publico'
          and (
            r.organization_id is null
            or public.current_user_is_org_member(r.organization_id)
          )
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
      and tablename in ('musicas', 'musica_compartilhamentos', 'musica_group_shares', 'organizations', 'organization_members')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy "Organizacoes visiveis para membros"
on public.organizations for select
to authenticated
using (public.current_user_role() = 'admin' or public.current_user_is_org_member(id));

create policy "Admins criam organizacoes"
on public.organizations for insert
to authenticated
with check (public.current_user_role() = 'admin');

create policy "Admins gerenciam organizacoes"
on public.organizations for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Membros visiveis para a propria organizacao"
on public.organization_members for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or user_id = auth.uid()
  or public.current_user_is_org_member(organization_id)
);

create policy "Admins gerenciam membros"
on public.organization_members for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Musicas visiveis por escopo"
on public.musicas for select
to authenticated
using (public.can_view_musica(id));

create policy "Usuarios autenticados criam musicas rastreadas"
on public.musicas for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    visibility = 'publica'
    or owner_id = auth.uid()
    or (
      visibility = 'organizacao'
      and organization_id is not null
      and public.current_user_org_role(organization_id) in ('admin', 'editor')
    )
  )
);

create policy "Usuarios autorizados editam musicas"
on public.musicas for update
to authenticated
using (public.can_edit_musica(id))
with check (public.can_edit_musica(id));

create policy "Usuarios autorizados excluem musicas"
on public.musicas for delete
to authenticated
using (public.can_edit_musica(id));

create policy "Compartilhamentos visiveis por acesso a musica"
on public.musica_compartilhamentos for select
to authenticated
using (public.can_view_musica(musica_id));

create policy "Compartilhamentos gerenciados por editores da musica"
on public.musica_compartilhamentos for all
to authenticated
using (public.can_edit_musica(musica_id))
with check (public.can_edit_musica(musica_id));

create policy "Compartilhamentos de grupo visiveis por acesso a musica"
on public.musica_group_shares for select
to authenticated
using (public.can_view_musica(musica_id));

create policy "Compartilhamentos de grupo gerenciados por editores da musica"
on public.musica_group_shares for all
to authenticated
using (public.can_edit_musica(musica_id))
with check (public.can_edit_musica(musica_id));

drop policy if exists "Musicas de repertorios visiveis" on public.repertorio_musicas;
create policy "Musicas de repertorios visiveis"
on public.repertorio_musicas for select
to authenticated
using (
  public.can_view_repertorio(repertorio_id)
  and (musica_id is null or public.can_view_musica(musica_id))
);

drop policy if exists "Usuarios autorizados adicionam musicas ao repertorio" on public.repertorio_musicas;
create policy "Usuarios autorizados adicionam musicas ao repertorio"
on public.repertorio_musicas for insert
to authenticated
with check (
  public.can_edit_repertorio(repertorio_id)
  and public.can_view_musica(musica_id)
);

create index if not exists musicas_scope_owner_idx
  on public.musicas (visibility, organization_id, owner_id);

create index if not exists musicas_titulo_normalizado_idx
  on public.musicas (titulo_normalizado);

create index if not exists musica_compartilhamentos_user_idx
  on public.musica_compartilhamentos (user_id, musica_id);

create index if not exists musica_group_shares_org_idx
  on public.musica_group_shares (organization_id, musica_id);

create index if not exists organization_members_user_idx
  on public.organization_members (user_id, organization_id);

create index if not exists repertorios_org_privacy_idx
  on public.repertorios (organization_id, visibilidade, criado_por);

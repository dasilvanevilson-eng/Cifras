-- Script de referencia para o banco do Master Cifras.
-- Revise antes de executar, pois algumas tabelas ou policies podem ja existir no Supabase.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  papel text not null default 'musico' check (papel in ('admin', 'editor', 'musico')),
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select papel
  from public.profiles
  where id = auth.uid()
$$;

alter table profiles enable row level security;

create policy "Usuario le o proprio perfil"
on profiles for select
to authenticated
using (auth.uid() = id or public.current_user_role() = 'admin');

create policy "Usuario atualiza o proprio perfil"
on profiles for update
to authenticated
using (auth.uid() = id or public.current_user_role() = 'admin')
with check (auth.uid() = id or public.current_user_role() = 'admin');

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.papel is distinct from new.papel
    and coalesce(auth.role(), '') <> 'service_role'
    and coalesce(public.current_user_role(), '') <> 'admin'
  then
    raise exception 'Apenas administradores podem alterar o papel de um perfil.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on profiles;

create trigger prevent_profile_role_escalation
before update on profiles
for each row
execute function public.prevent_profile_role_escalation();

create policy "Admin cadastra perfis"
on profiles for insert
to authenticated
with check (public.current_user_role() = 'admin');

-- Depois de criar seu primeiro usuario no Supabase Auth,
-- crie o perfil admin manualmente no SQL editor:
--
-- insert into profiles (id, nome, papel)
-- values ('ID_DO_USUARIO_AQUI', 'Administrador', 'admin');

create table if not exists musicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  artista text,
  tom text,
  tags text,
  musica_link text,
  cifra_original text not null,
  cifra_chordpro text not null,
  created_at timestamptz not null default now()
);

alter table musicas enable row level security;

create policy "Usuarios autenticados leem musicas"
on musicas for select
to authenticated
using (true);

create policy "Admin e editor cadastram musicas"
on musicas for insert
to authenticated
with check (public.current_user_role() in ('admin', 'editor'));

create policy "Admin e editor atualizam musicas"
on musicas for update
to authenticated
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

create policy "Admin e editor removem musicas"
on musicas for delete
to authenticated
using (public.current_user_role() in ('admin', 'editor'));

create table if not exists repertorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date,
  created_at timestamptz not null default now()
);

alter table repertorios enable row level security;

create policy "Usuarios autenticados leem repertorios"
on repertorios for select
to authenticated
using (true);

create policy "Admin e editor cadastram repertorios"
on repertorios for insert
to authenticated
with check (public.current_user_role() in ('admin', 'editor'));

create policy "Admin e editor atualizam repertorios"
on repertorios for update
to authenticated
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

create policy "Admin e editor removem repertorios"
on repertorios for delete
to authenticated
using (public.current_user_role() in ('admin', 'editor'));

create table if not exists repertorio_musicas (
  id uuid primary key default gen_random_uuid(),
  repertorio_id uuid not null references repertorios(id) on delete cascade,
  musica_id uuid not null references musicas(id) on delete restrict,
  ordem integer not null default 1,
  tom text,
  created_at timestamptz not null default now(),
  unique (repertorio_id, musica_id)
);

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

alter table repertorio_musicas enable row level security;

create policy "Usuarios autenticados leem musicas dos repertorios"
on repertorio_musicas for select
to authenticated
using (true);

create policy "Admin e editor associam musicas aos repertorios"
on repertorio_musicas for insert
to authenticated
with check (public.current_user_role() in ('admin', 'editor'));

create policy "Admin e editor reordenam musicas dos repertorios"
on repertorio_musicas for update
to authenticated
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

create policy "Admin e editor removem musicas dos repertorios"
on repertorio_musicas for delete
to authenticated
using (public.current_user_role() in ('admin', 'editor'));

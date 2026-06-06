-- Permissoes personalizadas por usuario.

create table if not exists user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_execute boolean not null default false,
  can_export boolean not null default false,
  can_manage boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (user_id, module_key)
);

create index if not exists user_permissions_user_idx
on user_permissions (user_id);

create or replace function public.touch_user_permissions_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists touch_user_permissions_updated_at on user_permissions;

create trigger touch_user_permissions_updated_at
before insert or update on user_permissions
for each row
execute function public.touch_user_permissions_updated_at();

alter table user_permissions enable row level security;

drop policy if exists "Usuarios leem proprias permissoes" on user_permissions;
drop policy if exists "Admins leem todas permissoes" on user_permissions;
drop policy if exists "Admins criam permissoes" on user_permissions;
drop policy if exists "Admins atualizam permissoes" on user_permissions;
drop policy if exists "Admins removem permissoes" on user_permissions;

create policy "Usuarios leem proprias permissoes"
on user_permissions for select
to authenticated
using (user_id = auth.uid());

create policy "Admins leem todas permissoes"
on user_permissions for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "Admins criam permissoes"
on user_permissions for insert
to authenticated
with check (public.current_user_role() = 'admin');

create policy "Admins atualizam permissoes"
on user_permissions for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Admins removem permissoes"
on user_permissions for delete
to authenticated
using (public.current_user_role() = 'admin');

-- Mantém a autorização no banco alinhada à normalização usada pela interface.
-- Evita que valores legados como "Admin" ou " admin " sejam rejeitados pelas policies.

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select lower(trim(papel))
  from public.profiles
  where id = auth.uid()
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_role() to service_role;

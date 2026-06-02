-- Garante a funcao usada por policies, triggers e Edge Functions para checar papel do usuario.

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

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_role() to service_role;

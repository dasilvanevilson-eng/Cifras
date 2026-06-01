-- Impede que usuarios comuns alterem o proprio papel em `profiles`.
-- Admins continuam podendo gerenciar papeis pela interface ou SQL autenticado.

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

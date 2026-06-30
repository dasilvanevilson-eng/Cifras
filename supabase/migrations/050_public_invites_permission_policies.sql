-- Alinha as policies de convites publicos com permissoes granulares por usuario.

create or replace function public.current_user_has_system_permission(
  p_module_key text,
  p_action_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.current_user_role() = 'admin' then
    return true;
  end if;

  return exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid()
      and up.scope_type = 'system'
      and up.scope_key = 'global'
      and up.module_key = p_module_key
      and case p_action_key
        when 'can_view' then up.can_view
        when 'can_create' then up.can_create
        when 'can_edit' then up.can_edit
        when 'can_delete' then up.can_delete
        when 'can_execute' then up.can_execute
        when 'can_export' then up.can_export
        when 'can_manage' then up.can_manage
        else false
      end
  );
end;
$$;

grant execute on function public.current_user_has_system_permission(text, text) to authenticated;
grant execute on function public.current_user_has_system_permission(text, text) to service_role;

drop policy if exists "Admins leem convites publicos" on public.public_invites;
drop policy if exists "Admins criam convites publicos" on public.public_invites;
drop policy if exists "Admins atualizam convites publicos" on public.public_invites;
drop policy if exists "Admins removem convites publicos" on public.public_invites;
drop policy if exists "Admins leem acessos de convites publicos" on public.public_invite_accesses;

drop policy if exists "Permissao le convites publicos" on public.public_invites;
drop policy if exists "Permissao cria convites publicos" on public.public_invites;
drop policy if exists "Permissao atualiza convites publicos" on public.public_invites;
drop policy if exists "Permissao remove convites publicos" on public.public_invites;
drop policy if exists "Permissao le acessos de convites publicos" on public.public_invite_accesses;

create policy "Permissao le convites publicos"
on public.public_invites for select
to authenticated
using (public.current_user_has_system_permission('convites_publicos', 'can_view'));

create policy "Permissao cria convites publicos"
on public.public_invites for insert
to authenticated
with check (
  public.current_user_has_system_permission('convites_publicos', 'can_create')
  and created_by = auth.uid()
);

create policy "Permissao atualiza convites publicos"
on public.public_invites for update
to authenticated
using (public.current_user_has_system_permission('convites_publicos', 'can_edit'))
with check (public.current_user_has_system_permission('convites_publicos', 'can_edit'));

create policy "Permissao remove convites publicos"
on public.public_invites for delete
to authenticated
using (public.current_user_has_system_permission('convites_publicos', 'can_delete'));

create policy "Permissao le acessos de convites publicos"
on public.public_invite_accesses for select
to authenticated
using (public.current_user_has_system_permission('convites_publicos', 'can_view'));

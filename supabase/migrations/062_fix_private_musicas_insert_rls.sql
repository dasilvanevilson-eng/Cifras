-- Corrige o cadastro de cifras privadas em "Minhas cifras".
-- O insert deve aceitar usuarios autenticados criando uma cifra propria,
-- mesmo quando created_by/owner_id forem preenchidos pelo trigger.

drop policy if exists "Usuarios autenticados criam musicas rastreadas" on public.musicas;

create policy "Usuarios autenticados criam musicas rastreadas"
on public.musicas for insert
to authenticated
with check (
  auth.uid() is not null
  and coalesce(created_by, auth.uid()) = auth.uid()
  and (
    (
      visibility = 'publica'
      and owner_id is null
      and organization_id is null
    )
    or (
      visibility in ('privada', 'compartilhada')
      and coalesce(owner_id, auth.uid()) = auth.uid()
      and organization_id is null
    )
    or (
      visibility = 'organizacao'
      and organization_id is not null
      and public.current_user_org_role(organization_id) in ('admin', 'editor')
    )
  )
);

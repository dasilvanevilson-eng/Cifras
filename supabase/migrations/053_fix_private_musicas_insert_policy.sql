-- Permite que usuarios autenticados copiem cifras publicas para o acervo privado.
-- A policy anterior exigia created_by = auth.uid() antes do trigger preencher valores
-- padrao, o que podia bloquear o insert com RLS em algumas instalacoes.

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

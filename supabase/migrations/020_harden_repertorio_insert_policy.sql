-- Reforca a policy de insert de repertorios com comparacao direta.
-- Esta versao evita depender de coalesce no WITH CHECK.

drop policy if exists "Usuarios autenticados criam repertorios proprios" on repertorios;
drop policy if exists "Admin e editor criam repertorios proprios" on repertorios;
drop policy if exists "Admin e editor cadastram repertorios" on repertorios;

create policy "Usuarios autenticados criam repertorios com proprio usuario"
on repertorios for insert
to authenticated
with check (
  auth.uid() is not null
  and criado_por = auth.uid()
);

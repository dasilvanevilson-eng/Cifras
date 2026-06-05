-- Corrige definitivamente o insert de repertorios.
-- O app envia explicitamente id, criado_por e criado_por_nome.
-- As permissoes de edicao/leitura continuam controladas pelas demais policies.

drop policy if exists "Usuarios autenticados criam repertorios com proprio usuario" on repertorios;
drop policy if exists "Usuarios autenticados criam repertorios proprios" on repertorios;
drop policy if exists "Admin e editor criam repertorios proprios" on repertorios;
drop policy if exists "Admin e editor cadastram repertorios" on repertorios;
drop policy if exists "Usuarios autenticados podem criar repertorios" on repertorios;

create policy "Usuarios autenticados podem criar repertorios"
on repertorios for insert
to authenticated
with check (auth.uid() is not null);

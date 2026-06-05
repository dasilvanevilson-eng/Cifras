-- Corrige a policy de criacao de repertorios.
-- A validacao principal do insert passa a ser: usuario autenticado criando repertorio para si.
-- As permissoes de tela continuam controlando quem ve o formulario, e as demais alteracoes seguem
-- protegidas por can_edit_repertorio.

drop policy if exists "Admin e editor criam repertorios proprios" on repertorios;
drop policy if exists "Admin e editor cadastram repertorios" on repertorios;

create policy "Usuarios autenticados criam repertorios proprios"
on repertorios for insert
to authenticated
with check (
  auth.uid() is not null
  and coalesce(criado_por, auth.uid()) = auth.uid()
);

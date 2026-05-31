-- Script de referencia para o banco do Master Cifras.
-- Revise antes de executar, pois algumas tabelas ja existem no Supabase.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  papel text not null default 'musico' check (papel in ('admin', 'editor', 'musico')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Usuario le o proprio perfil"
on profiles for select
to authenticated
using (auth.uid() = id);

create policy "Usuario atualiza o proprio perfil"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Depois de criar seu primeiro usuario no Supabase Auth,
-- voce pode criar o perfil admin manualmente assim:
--
-- insert into profiles (id, nome, papel)
-- values ('ID_DO_USUARIO_AQUI', 'Administrador', 'admin');

-- Papeis:
-- admin: acesso total.
-- editor: cadastra e edita musicas e repertorios.
-- musico: visualiza cifras e repertorios.

-- Estrutura sugerida para a tabela musicas:
--
-- create table if not exists musicas (
--   id uuid primary key default gen_random_uuid(),
--   titulo text not null,
--   artista text,
--   tom text,
--   cifra_original text not null,
--   cifra_chordpro text not null,
--   created_at timestamptz not null default now()
-- );
--
-- alter table musicas enable row level security;
--
-- create policy "Usuarios autenticados leem musicas"
-- on musicas for select
-- to authenticated
-- using (true);
--
-- create policy "Usuarios autenticados cadastram musicas"
-- on musicas for insert
-- to authenticated
-- with check (true);

-- Estrutura sugerida para a tabela repertorios:
--
-- create table if not exists repertorios (
--   id uuid primary key default gen_random_uuid(),
--   nome text not null,
--   data date,
--   created_at timestamptz not null default now()
-- );
--
-- alter table repertorios enable row level security;
--
-- create policy "Usuarios autenticados leem repertorios"
-- on repertorios for select
-- to authenticated
-- using (true);
--
-- create policy "Usuarios autenticados cadastram repertorios"
-- on repertorios for insert
-- to authenticated
-- with check (true);

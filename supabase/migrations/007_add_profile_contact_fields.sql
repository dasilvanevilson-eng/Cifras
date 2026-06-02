-- Campos complementares para o cadastro administrativo de usuarios.

alter table profiles
add column if not exists telefone text,
add column if not exists observacao text;

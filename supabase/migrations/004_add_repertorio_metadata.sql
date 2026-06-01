-- Adiciona metadados opcionais para planejamento de cultos, ensaios e eventos.

alter table repertorios
add column if not exists tipo text,
add column if not exists horario time,
add column if not exists local text,
add column if not exists responsavel text,
add column if not exists observacoes text;

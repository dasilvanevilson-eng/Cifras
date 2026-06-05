-- Observacao livre da musica dentro de um repertorio especifico.

alter table repertorio_musicas
add column if not exists observacao text;

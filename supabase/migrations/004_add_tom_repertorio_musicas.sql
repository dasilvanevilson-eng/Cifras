-- Permite salvar um tom especifico da musica dentro de cada repertorio.
-- O tom original da musica continua sendo alterado apenas no cadastro/edicao da musica.

alter table repertorio_musicas
add column if not exists tom text;

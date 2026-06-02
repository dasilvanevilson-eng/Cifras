-- Campo normalizado para exibicao, impressao, PDF e execucao de cifras.
-- `cifra_original` permanece como texto-base editavel para conversao.

alter table musicas
add column if not exists cifra_exibicao text;

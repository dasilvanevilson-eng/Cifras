-- Guarda os dados do usuario logado no momento do envio da sugestao.

alter table sugestoes_musicas
add column if not exists enviado_por_nome text,
add column if not exists enviado_por_email text,
add column if not exists enviado_por_papel text;

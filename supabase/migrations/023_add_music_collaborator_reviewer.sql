-- Guarda quem colaborou com a sugestao da cifra e quem fez a revisao.

alter table musicas
add column if not exists colaborador_nome text,
add column if not exists revisado_por_nome text;

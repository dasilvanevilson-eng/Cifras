-- Diferencia sugestoes de musicas novas de sugestoes de ajuste em musicas existentes.

alter table sugestoes_musicas
add column if not exists tipo_sugestao text not null default 'nova'
  check (tipo_sugestao in ('nova', 'ajuste')),
add column if not exists musica_origem_id uuid references musicas(id) on delete set null;

create index if not exists sugestoes_musicas_tipo_sugestao_idx
on sugestoes_musicas (tipo_sugestao);

create index if not exists sugestoes_musicas_musica_origem_id_idx
on sugestoes_musicas (musica_origem_id);

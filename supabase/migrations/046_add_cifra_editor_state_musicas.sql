-- Guarda o estado limpo do editor de cifras para preservar marcacoes de vozes
-- sem exigir que o usuario edite as diretivas internas do ChordPro.

alter table public.musicas
add column if not exists cifra_editor_state jsonb not null default '{}'::jsonb;

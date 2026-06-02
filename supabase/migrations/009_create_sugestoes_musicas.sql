-- Tabela para musicos enviarem sugestoes de musicas antes de entrarem no acervo oficial.

create table if not exists sugestoes_musicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  artista text,
  tom text,
  cifra_original text not null,
  musica_link text,
  observacao text,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovada', 'rejeitada')),
  motivo_rejeicao text,
  musica_id uuid references musicas(id) on delete set null,
  enviado_por uuid not null references auth.users(id) on delete cascade default auth.uid(),
  revisado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table sugestoes_musicas enable row level security;

drop policy if exists "Usuarios enviam sugestoes de musicas" on sugestoes_musicas;
drop policy if exists "Usuarios leem as proprias sugestoes" on sugestoes_musicas;
drop policy if exists "Admin e editor leem todas sugestoes" on sugestoes_musicas;
drop policy if exists "Admin e editor revisam sugestoes" on sugestoes_musicas;

create policy "Usuarios enviam sugestoes de musicas"
on sugestoes_musicas for insert
to authenticated
with check (
  enviado_por = auth.uid()
  and status = 'pendente'
  and revisado_por is null
  and reviewed_at is null
);

create policy "Usuarios leem as proprias sugestoes"
on sugestoes_musicas for select
to authenticated
using (enviado_por = auth.uid());

create policy "Admin e editor leem todas sugestoes"
on sugestoes_musicas for select
to authenticated
using (public.current_user_role() in ('admin', 'editor'));

create policy "Admin e editor revisam sugestoes"
on sugestoes_musicas for update
to authenticated
using (public.current_user_role() in ('admin', 'editor'))
with check (public.current_user_role() in ('admin', 'editor'));

create index if not exists sugestoes_musicas_status_idx
on sugestoes_musicas (status);

create index if not exists sugestoes_musicas_enviado_por_idx
on sugestoes_musicas (enviado_por);

create index if not exists sugestoes_musicas_created_at_idx
on sugestoes_musicas (created_at desc);

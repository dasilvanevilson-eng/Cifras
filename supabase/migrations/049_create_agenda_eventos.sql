create table if not exists agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  local text,
  inicio timestamptz not null,
  fim timestamptz,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'cancelado')),
  responsavel text,
  orientacoes text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agenda_evento_repertorios (
  evento_id uuid not null references agenda_eventos(id) on delete cascade,
  repertorio_id uuid not null references repertorios(id) on delete cascade,
  primary key (evento_id, repertorio_id)
);

create index if not exists agenda_eventos_inicio_idx on agenda_eventos(inicio);
alter table agenda_eventos enable row level security;
alter table agenda_evento_repertorios enable row level security;

create policy "Agenda autenticados leem eventos" on agenda_eventos for select to authenticated using (true);
create policy "Agenda autenticados criam eventos" on agenda_eventos for insert to authenticated with check (created_by = auth.uid());
create policy "Agenda autores ou admins alteram eventos" on agenda_eventos for update to authenticated using (created_by = auth.uid() or public.current_user_role() = 'admin') with check (created_by = auth.uid() or public.current_user_role() = 'admin');
create policy "Agenda autores ou admins excluem eventos" on agenda_eventos for delete to authenticated using (created_by = auth.uid() or public.current_user_role() = 'admin');
create policy "Agenda autenticados leem repertorios de eventos" on agenda_evento_repertorios for select to authenticated using (true);
create policy "Agenda autores ou admins vinculam repertorios" on agenda_evento_repertorios for insert to authenticated with check (exists (select 1 from agenda_eventos where id = evento_id and (created_by = auth.uid() or public.current_user_role() = 'admin')));
create policy "Agenda autores ou admins removem vinculos" on agenda_evento_repertorios for delete to authenticated using (exists (select 1 from agenda_eventos where id = evento_id and (created_by = auth.uid() or public.current_user_role() = 'admin')));

-- Sessoes ao vivo para o Modo Banda/Coral.

create table if not exists sessoes_banda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  repertorio_id uuid references repertorios(id) on delete set null,
  musica_atual_id uuid references musicas(id) on delete set null,
  tom_atual text,
  criada_por uuid references auth.users(id) on delete set null,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessoes_banda_participantes (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes_banda(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'integrante' check (papel in ('lider', 'integrante')),
  seguir_lider boolean not null default true,
  entrou_em timestamptz not null default now(),
  unique (sessao_id, usuario_id)
);

create index if not exists sessoes_banda_ativa_idx
on sessoes_banda (ativa, updated_at desc);

create index if not exists sessoes_banda_participantes_sessao_idx
on sessoes_banda_participantes (sessao_id);

create or replace function public.touch_sessao_banda_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_sessao_banda_updated_at on sessoes_banda;

create trigger touch_sessao_banda_updated_at
before update on sessoes_banda
for each row
execute function public.touch_sessao_banda_updated_at();

create or replace function public.can_lead_sessao_banda(p_sessao_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('admin', 'editor')
    and exists (
      select 1
      from public.sessoes_banda_participantes sbp
      where sbp.sessao_id = p_sessao_id
        and sbp.usuario_id = auth.uid()
        and sbp.papel = 'lider'
    )
$$;

alter table sessoes_banda enable row level security;
alter table sessoes_banda_participantes enable row level security;

drop policy if exists "Usuarios autenticados veem sessoes ativas" on sessoes_banda;
drop policy if exists "Admin e editor criam sessoes banda" on sessoes_banda;
drop policy if exists "Lideres alteram sessoes banda" on sessoes_banda;
drop policy if exists "Lideres encerram sessoes banda" on sessoes_banda;

create policy "Usuarios autenticados veem sessoes ativas"
on sessoes_banda for select
to authenticated
using (ativa = true or criada_por = auth.uid() or public.can_lead_sessao_banda(id));

create policy "Admin e editor criam sessoes banda"
on sessoes_banda for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'editor')
  and coalesce(criada_por, auth.uid()) = auth.uid()
);

create policy "Lideres alteram sessoes banda"
on sessoes_banda for update
to authenticated
using (public.can_lead_sessao_banda(id))
with check (public.can_lead_sessao_banda(id));

create policy "Lideres encerram sessoes banda"
on sessoes_banda for delete
to authenticated
using (public.can_lead_sessao_banda(id));

drop policy if exists "Usuarios veem participantes de sessoes ativas" on sessoes_banda_participantes;
drop policy if exists "Usuarios entram em sessoes banda" on sessoes_banda_participantes;
drop policy if exists "Usuarios atualizam propria participacao" on sessoes_banda_participantes;
drop policy if exists "Lideres gerenciam participantes" on sessoes_banda_participantes;

create policy "Usuarios veem participantes de sessoes ativas"
on sessoes_banda_participantes for select
to authenticated
using (
  exists (
    select 1
    from public.sessoes_banda sb
    where sb.id = sessao_id
      and sb.ativa = true
  )
);

create policy "Usuarios entram em sessoes banda"
on sessoes_banda_participantes for insert
to authenticated
with check (
  usuario_id = auth.uid()
  and (
    papel = 'integrante'
    or public.current_user_role() in ('admin', 'editor')
  )
  and exists (
    select 1
    from public.sessoes_banda sb
    where sb.id = sessao_id
      and sb.ativa = true
  )
);

create policy "Usuarios atualizam propria participacao"
on sessoes_banda_participantes for update
to authenticated
using (usuario_id = auth.uid())
with check (
  usuario_id = auth.uid()
  and (
    papel = 'integrante'
    or public.current_user_role() in ('admin', 'editor')
  )
);

create policy "Lideres gerenciam participantes"
on sessoes_banda_participantes for delete
to authenticated
using (public.can_lead_sessao_banda(sessao_id) or usuario_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table sessoes_banda;
exception
  when duplicate_object then
    null;
  when undefined_object then
    null;
end $$;

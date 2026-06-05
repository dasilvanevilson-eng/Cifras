-- Historico de alteracoes dos repertorios e snapshot do usuario criador.

alter table repertorios
add column if not exists criado_por_nome text;

update repertorios r
set criado_por_nome = coalesce(r.criado_por_nome, p.nome)
from profiles p
where r.criado_por = p.id;

create table if not exists repertorio_historico (
  id uuid primary key default gen_random_uuid(),
  repertorio_id uuid not null references repertorios(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_nome text,
  acao text not null,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table repertorio_historico enable row level security;

create or replace function public.current_user_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(nome, 'Usuario')
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.set_repertorio_creator_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.criado_por = coalesce(new.criado_por, auth.uid());
  new.criado_por_nome = coalesce(new.criado_por_nome, public.current_user_name());
  return new;
end;
$$;

drop trigger if exists set_repertorio_creator_snapshot on repertorios;

create trigger set_repertorio_creator_snapshot
before insert on repertorios
for each row
execute function public.set_repertorio_creator_snapshot();

create or replace function public.insert_repertorio_history(
  p_repertorio_id uuid,
  p_acao text,
  p_detalhes jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.repertorio_historico (
    repertorio_id,
    usuario_id,
    usuario_nome,
    acao,
    detalhes
  )
  values (
    p_repertorio_id,
    auth.uid(),
    public.current_user_name(),
    p_acao,
    coalesce(p_detalhes, '{}'::jsonb)
  );
end;
$$;

create or replace function public.log_repertorio_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.insert_repertorio_history(
      new.id,
      'Repertorio criado',
      jsonb_build_object(
        'nome', new.nome,
        'data', new.data,
        'visibilidade', new.visibilidade,
        'permite_edicao_compartilhada', new.permite_edicao_compartilhada
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform public.insert_repertorio_history(
      new.id,
      'Repertorio alterado',
      jsonb_build_object(
        'nome_anterior', old.nome,
        'nome_novo', new.nome,
        'data_anterior', old.data,
        'data_nova', new.data,
        'visibilidade_anterior', old.visibilidade,
        'visibilidade_nova', new.visibilidade,
        'edicao_compartilhada_anterior', old.permite_edicao_compartilhada,
        'edicao_compartilhada_nova', new.permite_edicao_compartilhada
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.insert_repertorio_history(
      old.id,
      'Repertorio excluido',
      jsonb_build_object('nome', old.nome)
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists log_repertorio_changes on repertorios;

create trigger log_repertorio_changes
after insert or update on repertorios
for each row
execute function public.log_repertorio_changes();

create or replace function public.log_repertorio_musicas_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repertorio_id uuid;
  v_titulo text;
begin
  v_repertorio_id = coalesce(new.repertorio_id, old.repertorio_id);

  select coalesce(m.titulo, new.musica_titulo, old.musica_titulo, 'Musica')
  into v_titulo
  from public.musicas m
  where m.id = coalesce(new.musica_id, old.musica_id);

  v_titulo = coalesce(v_titulo, new.musica_titulo, old.musica_titulo, 'Musica');

  if tg_op = 'INSERT' then
    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Musica adicionada',
      jsonb_build_object('musica', v_titulo, 'ordem', new.ordem, 'tom', new.tom, 'observacao', new.observacao)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Musica do repertorio alterada',
      jsonb_build_object(
        'musica', v_titulo,
        'ordem_anterior', old.ordem,
        'ordem_nova', new.ordem,
        'tom_anterior', old.tom,
        'tom_novo', new.tom,
        'observacao_anterior', old.observacao,
        'observacao_nova', new.observacao
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Musica removida',
      jsonb_build_object('musica', v_titulo, 'ordem', old.ordem)
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists log_repertorio_musicas_changes on repertorio_musicas;

create trigger log_repertorio_musicas_changes
after insert or update or delete on repertorio_musicas
for each row
execute function public.log_repertorio_musicas_changes();

create or replace function public.log_repertorio_compartilhamentos_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repertorio_id uuid;
  v_shared_user_name text;
begin
  v_repertorio_id = coalesce(new.repertorio_id, old.repertorio_id);

  select coalesce(nome, 'Usuario')
  into v_shared_user_name
  from public.profiles
  where id = coalesce(new.user_id, old.user_id);

  if tg_op = 'INSERT' then
    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Compartilhamento adicionado',
      jsonb_build_object('usuario', v_shared_user_name)
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.insert_repertorio_history(
      v_repertorio_id,
      'Compartilhamento removido',
      jsonb_build_object('usuario', v_shared_user_name)
    );
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists log_repertorio_compartilhamentos_changes on repertorio_compartilhamentos;

create trigger log_repertorio_compartilhamentos_changes
after insert or delete on repertorio_compartilhamentos
for each row
execute function public.log_repertorio_compartilhamentos_changes();

create policy "Historico visivel para repertorios permitidos"
on repertorio_historico for select
to authenticated
using (public.can_view_repertorio(repertorio_id));

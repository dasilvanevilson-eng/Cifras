-- Links publicos temporarios para acesso controlado em modo visualizacao.

create table if not exists public_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  title text not null,
  module_key text not null,
  target_type text not null default 'module',
  target_id uuid,
  allowed_actions jsonb not null default '["view"]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  max_uses integer,
  use_count integer not null default 0,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_invites_module_check check (module_key <> ''),
  constraint public_invites_target_check check (target_type <> ''),
  constraint public_invites_max_uses_check check (max_uses is null or max_uses > 0),
  constraint public_invites_use_count_check check (use_count >= 0)
);

create index if not exists public_invites_token_idx
on public_invites (token);

create index if not exists public_invites_module_expires_idx
on public_invites (module_key, expires_at);

create table if not exists public_invite_accesses (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public_invites(id) on delete cascade,
  visitor_name text,
  accessed_module text not null,
  accessed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists public_invite_accesses_invite_idx
on public_invite_accesses (invite_id, accessed_at desc);

create or replace function public.touch_public_invites_updated_at()
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

drop trigger if exists touch_public_invites_updated_at on public_invites;

create trigger touch_public_invites_updated_at
before insert or update on public_invites
for each row
execute function public.touch_public_invites_updated_at();

alter table public_invites enable row level security;
alter table public_invite_accesses enable row level security;

drop policy if exists "Admins leem convites publicos" on public_invites;
drop policy if exists "Admins criam convites publicos" on public_invites;
drop policy if exists "Admins atualizam convites publicos" on public_invites;
drop policy if exists "Admins removem convites publicos" on public_invites;
drop policy if exists "Admins leem acessos de convites publicos" on public_invite_accesses;

create policy "Admins leem convites publicos"
on public_invites for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "Admins criam convites publicos"
on public_invites for insert
to authenticated
with check (
  public.current_user_role() = 'admin'
  and created_by = auth.uid()
);

create policy "Admins atualizam convites publicos"
on public_invites for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Admins removem convites publicos"
on public_invites for delete
to authenticated
using (public.current_user_role() = 'admin');

create policy "Admins leem acessos de convites publicos"
on public_invite_accesses for select
to authenticated
using (public.current_user_role() = 'admin');

create or replace function public.is_public_invite_active(p_invite public_invites)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_invite.id is not null
    and p_invite.revoked_at is null
    and p_invite.expires_at > now()
    and (
      p_invite.max_uses is null
      or p_invite.use_count < p_invite.max_uses
    );
$$;

create or replace function public.get_public_dashboard_data(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_musicas jsonb;
  v_repertorios jsonb;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'dashboard'
  limit 1;

  if not public.is_public_invite_active(v_invite) then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid');
  end if;

  update public.public_invites
  set
    use_count = use_count + 1,
    last_used_at = now()
  where id = v_invite.id
  returning * into v_invite;

  insert into public.public_invite_accesses (invite_id, accessed_module)
  values (v_invite.id, 'dashboard');

  select coalesce(jsonb_agg(to_jsonb(m) order by m.titulo), '[]'::jsonb)
  into v_musicas
  from public.musicas m;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into v_repertorios
  from public.repertorios r;

  return jsonb_build_object(
    'valid', true,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'title', v_invite.title,
      'module_key', v_invite.module_key,
      'target_type', v_invite.target_type,
      'target_id', v_invite.target_id,
      'allowed_actions', v_invite.allowed_actions,
      'expires_at', v_invite.expires_at,
      'max_uses', v_invite.max_uses,
      'use_count', v_invite.use_count
    ),
    'musicas', v_musicas,
    'repertorios', v_repertorios
  );
end;
$$;

create or replace function public.get_public_repertorio_musicas(p_token text, p_repertorio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public_invites;
  v_musicas jsonb;
begin
  select *
  into v_invite
  from public.public_invites
  where token = p_token
    and module_key = 'dashboard'
  limit 1;

  if v_invite.id is null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= now()
    or (
      v_invite.max_uses is not null
      and v_invite.use_count > v_invite.max_uses
    )
  then
    return jsonb_build_object('valid', false, 'reason', 'expired_or_invalid', 'musicas', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(to_jsonb(rm) order by rm.ordem), '[]'::jsonb)
  into v_musicas
  from (
    select
      rm.id,
      rm.ordem,
      rm.musica_id,
      rm.tom,
      rm.musica_titulo,
      rm.musica_artista,
      rm.musica_tom_original,
      rm.musica_excluida_em,
      rm.musica_excluida_usuario,
      rm.observacao,
      to_jsonb(m) as musicas
    from public.repertorio_musicas rm
    left join public.musicas m on m.id = rm.musica_id
    where rm.repertorio_id = p_repertorio_id
    order by rm.ordem
  ) rm;

  return jsonb_build_object('valid', true, 'musicas', v_musicas);
end;
$$;

grant execute on function public.get_public_dashboard_data(text) to anon, authenticated;
grant execute on function public.get_public_repertorio_musicas(text, uuid) to anon, authenticated;

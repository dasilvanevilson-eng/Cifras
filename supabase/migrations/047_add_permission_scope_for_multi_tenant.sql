-- Prepara permissões para escopos futuros (por exemplo, uma organização/tenant),
-- preservando o comportamento atual: todas pertencem ao escopo system/global.

alter table public.user_permissions
  add column if not exists scope_type text not null default 'system',
  add column if not exists scope_key text not null default 'global';

alter table public.user_permissions
  drop constraint if exists user_permissions_user_id_module_key_key;

alter table public.user_permissions
  add constraint user_permissions_user_scope_module_key
  unique (user_id, scope_type, scope_key, module_key);

create index if not exists user_permissions_scope_idx
  on public.user_permissions (scope_type, scope_key, user_id);

comment on column public.user_permissions.scope_type is
  'Tipo de escopo da permissao: system hoje; tenant quando houver organizacoes.';

comment on column public.user_permissions.scope_key is
  'Identificador do escopo. O sistema atual usa global; tenants usarao o ID da organizacao.';

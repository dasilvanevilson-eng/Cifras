-- Configuracoes globais do sistema.
-- A estrutura por chave/valor em jsonb permite comecar simples e evoluir para ajustes mais complexos.

create table if not exists system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  category text not null default 'general',
  label text,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists system_settings_category_idx
on system_settings (category);

create index if not exists system_settings_public_idx
on system_settings (is_public);

create or replace function public.touch_system_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists touch_system_settings_updated_at on system_settings;

create trigger touch_system_settings_updated_at
before insert or update on system_settings
for each row
execute function public.touch_system_settings_updated_at();

alter table system_settings enable row level security;

drop policy if exists "Todos leem configuracoes publicas" on system_settings;
drop policy if exists "Admins leem configuracoes" on system_settings;
drop policy if exists "Admins criam configuracoes" on system_settings;
drop policy if exists "Admins atualizam configuracoes" on system_settings;
drop policy if exists "Admins removem configuracoes" on system_settings;

create policy "Todos leem configuracoes publicas"
on system_settings for select
to anon, authenticated
using (is_public = true);

create policy "Admins leem configuracoes"
on system_settings for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "Admins criam configuracoes"
on system_settings for insert
to authenticated
with check (public.current_user_role() = 'admin');

create policy "Admins atualizam configuracoes"
on system_settings for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Admins removem configuracoes"
on system_settings for delete
to authenticated
using (public.current_user_role() = 'admin');

insert into system_settings (key, value, category, label, description, is_public)
values
  ('app_name', '"Master Cifras"'::jsonb, 'login', 'Nome do sistema', 'Nome exibido na tela inicial e em areas do sistema.', true),
  ('login_subtitle', '""'::jsonb, 'login', 'Subtitulo do login', 'Texto curto opcional abaixo do nome do sistema.', true),
  ('login_background_url', '"/assets/login-background.jpg"'::jsonb, 'login', 'Imagem de fundo do login', 'URL publica ou caminho local da imagem de fundo.', true),
  ('primary_color', '"#1d4f45"'::jsonb, 'theme', 'Cor principal', 'Cor principal para futuras personalizacoes visuais.', true),
  ('accent_color', '"#c8792b"'::jsonb, 'theme', 'Cor de destaque', 'Cor de destaque para futuras personalizacoes visuais.', true),
  ('show_app_name_on_login', 'true'::jsonb, 'login', 'Mostrar nome no login', 'Controla se o nome do sistema aparece sobre a tela inicial.', true)
on conflict (key) do nothing;

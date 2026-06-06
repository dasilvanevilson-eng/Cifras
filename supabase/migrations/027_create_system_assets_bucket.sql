-- Bucket para arquivos globais de personalizacao do sistema.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'system-assets',
  'system-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Todos leem assets publicos do sistema" on storage.objects;
drop policy if exists "Admins enviam assets do sistema" on storage.objects;
drop policy if exists "Admins atualizam assets do sistema" on storage.objects;
drop policy if exists "Admins removem assets do sistema" on storage.objects;

create policy "Todos leem assets publicos do sistema"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'system-assets');

create policy "Admins enviam assets do sistema"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'system-assets'
  and public.current_user_role() = 'admin'
);

create policy "Admins atualizam assets do sistema"
on storage.objects for update
to authenticated
using (
  bucket_id = 'system-assets'
  and public.current_user_role() = 'admin'
)
with check (
  bucket_id = 'system-assets'
  and public.current_user_role() = 'admin'
);

create policy "Admins removem assets do sistema"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'system-assets'
  and public.current_user_role() = 'admin'
);

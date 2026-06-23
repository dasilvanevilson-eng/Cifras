create table if not exists public.image_links (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  token text not null unique,
  image_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(image_urls) = 'array'),
  expires_at timestamptz not null,
  max_uses integer null check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists image_links_token_idx on public.image_links(token);

drop trigger if exists touch_image_links_updated_at on public.image_links;
create trigger touch_image_links_updated_at
before update on public.image_links
for each row execute function public.touch_public_invites_updated_at();

alter table public.image_links enable row level security;

drop policy if exists "Admins gerenciam links de imagem" on public.image_links;
create policy "Admins gerenciam links de imagem"
on public.image_links for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('image-link-assets', 'image-link-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins gerenciam imagens dos links" on storage.objects;
create policy "Admins gerenciam imagens dos links"
on storage.objects for all
to authenticated
using (bucket_id = 'image-link-assets' and public.current_user_role() = 'admin')
with check (bucket_id = 'image-link-assets' and public.current_user_role() = 'admin');

create or replace function public.get_public_image_link_data(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.image_links;
begin
  select * into v_link
  from public.image_links
  where token = p_token
  for update;

  if not found
    or v_link.revoked_at is not null
    or v_link.expires_at <= now()
    or (v_link.max_uses is not null and v_link.use_count >= v_link.max_uses) then
    return jsonb_build_object('valid', false);
  end if;

  update public.image_links
  set use_count = use_count + 1
  where id = v_link.id;

  return jsonb_build_object(
    'valid', true,
    'title', v_link.title,
    'images', v_link.image_urls
  );
end;
$$;

grant execute on function public.get_public_image_link_data(text) to anon, authenticated;

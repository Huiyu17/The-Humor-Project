-- Week 4 baseline: reconstructed from SQL executed by the user and the
-- 17-policy export supplied on 2026-10-03. NOT automatically applied.
-- The current hosted project already has these changes: do not rerun for testing.
-- Prerequisite: existing Week 3 profiles/images/captions/caption_votes/jokes tables.
-- On another project replace the project-specific Storage URL below.
-- Review any additional policies/grants before reuse: this file replaces only
-- the known policies, not arbitrary policies in an unfamiliar database.
--
-- Create/configure buckets through Supabase Storage dashboard/API:
-- avatars: public, 2 MB, image/jpeg + image/png + image/webp
-- caption-images: public, 5 MB, same MIME types
-- No Storage file metadata or objects are inserted/deleted by this script.

begin;

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  image_id uuid not null references public.images(id),
  user_input text not null,
  prompt text not null check (length(trim(prompt)) > 0),
  model text not null check (length(trim(model)) > 0),
  created_at timestamptz not null default now()
);

alter table public.captions add column if not exists generation_id uuid
  references public.generations(id);
alter table public.images
  add column if not exists user_id uuid references public.profiles(id),
  add column if not exists storage_path text;
create index if not exists generations_user_id_idx on public.generations(user_id);
create index if not exists captions_generation_id_idx on public.captions(generation_id);
create index if not exists images_user_id_idx on public.images(user_id);

alter table public.profiles enable row level security;
alter table public.caption_votes enable row level security;
alter table public.generations enable row level security;
alter table public.captions enable row level security;
alter table public.images enable row level security;
alter table public.jokes enable row level security;

revoke all privileges on table public.profiles, public.caption_votes,
  public.generations, public.captions, public.images, public.jokes
  from anon, authenticated;
-- Table-level REVOKE does not clear arbitrary pre-existing column-level grants.
-- This is a baseline for the known schema, not a generic privilege reset.
grant select on public.profiles to authenticated;
grant update (first_name, last_name, avatar_url, updated_at)
  on public.profiles to authenticated;
grant select, insert on public.caption_votes to authenticated;
-- Supabase upsert submits ownership and caption columns during conflict updates.
grant update (user_id, caption_id, value, updated_at)
  on public.caption_votes to authenticated;
grant select, insert on public.generations to authenticated;
grant select on public.captions, public.images, public.jokes to anon, authenticated;
grant insert (image_id, content, generation_id) on public.captions to authenticated;
grant insert (url, alt_text, user_id, storage_path) on public.images to authenticated;

drop policy if exists "Allow public read access" on public.jokes;

drop policy if exists "Users can insert their own votes" on public.caption_votes;
create policy "Users can insert their own votes" on public.caption_votes
  as permissive for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own votes" on public.caption_votes;
create policy "Users can read their own votes" on public.caption_votes
  as permissive for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own votes" on public.caption_votes;
create policy "Users can update their own votes" on public.caption_votes
  as permissive for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Anyone can read captions" on public.captions;
create policy "Anyone can read captions" on public.captions
  as permissive for select to anon, authenticated
  using (true);

drop policy if exists "Users can insert captions for their own generations" on public.captions;
create policy "Users can insert captions for their own generations" on public.captions
  as permissive for insert to authenticated
  with check (exists (select 1 from public.generations g where g.id = captions.generation_id and g.user_id = (select auth.uid()) and g.image_id = captions.image_id));

drop policy if exists "Users can insert their own generations" on public.generations;
create policy "Users can insert their own generations" on public.generations
  as permissive for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own generations" on public.generations;
create policy "Users can read their own generations" on public.generations
  as permissive for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Anyone can read images" on public.images;
create policy "Anyone can read images" on public.images
  as permissive for select to anon, authenticated
  using (true);

drop policy if exists "Users can insert their own uploaded images" on public.images;
create policy "Users can insert their own uploaded images" on public.images
  as permissive for insert to authenticated
  with check (user_id = (select auth.uid()) and (storage.foldername(storage_path))[1] = (select auth.uid())::text and url = ('https://qizafcxydohtbqwjjdva.supabase.co/storage/v1/object/public/caption-images/' || storage_path) and exists (select 1 from storage.objects o where o.bucket_id = 'caption-images' and o.name = images.storage_path));

drop policy if exists "Anyone can read jokes" on public.jokes;
create policy "Anyone can read jokes" on public.jokes
  as permissive for select to anon, authenticated
  using (true);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles
  as permissive for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  as permissive for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Give users access to own folder 1oj01fe_0" on storage.objects;
create policy "Give users access to own folder 1oj01fe_0" on storage.objects
  as permissive for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar files" on storage.objects;
create policy "Users can delete their own avatar files" on storage.objects
  as permissive for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can select their own avatar files" on storage.objects;
create policy "Users can select their own avatar files" on storage.objects
  as permissive for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can select their own caption image files" on storage.objects;
create policy "Users can select their own caption image files" on storage.objects
  as permissive for select to authenticated
  using (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own caption images" on storage.objects;
create policy "Users can upload their own caption images" on storage.objects
  as permissive for insert to authenticated
  with check (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;


-- Run after 006 in Supabase SQL Editor. No existing rows are removed.
-- Deletion withdraws a publication; source photos and private generation records remain.
begin;

alter table public.captions add column if not exists deleted_at timestamptz;
alter table public.generations add column if not exists withdrawn_at timestamptz;

-- Restrictive policies also protect older app deployments that do not filter deleted_at.
drop policy if exists "Hide withdrawn captions" on public.captions;
create policy "Hide withdrawn captions" on public.captions
  as restrictive for select to anon, authenticated using (deleted_at is null);

drop policy if exists "Do not republish withdrawn generations" on public.captions;
create policy "Do not republish withdrawn generations" on public.captions
  as restrictive for insert to authenticated
  with check (exists (select 1 from public.generations g
    where g.id = captions.generation_id and g.user_id = (select auth.uid())
      and g.withdrawn_at is null));

drop policy if exists "Votes require a visible caption" on public.caption_votes;
create policy "Votes require a visible caption" on public.caption_votes
  as restrictive for all to authenticated
  using (exists (select 1 from public.captions c where c.id = caption_votes.caption_id))
  with check (exists (select 1 from public.captions c where c.id = caption_votes.caption_id));

-- Removing a like clears the user's positive vote, never changes it to a downvote.
grant delete on public.caption_votes to authenticated;
drop policy if exists "Users can remove their own votes" on public.caption_votes;
create policy "Users can remove their own votes" on public.caption_votes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Deliberately narrow DEFINER operation: clients have no general UPDATE access.
-- Needed to update rows that become invisible under SELECT RLS, and to make
-- deletion retries succeed even after the first response is lost.
create or replace function public.humor_delete_caption(p_caption_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  source_id uuid;
begin
  if owner_id is null then
    raise exception 'Sign in to delete' using errcode = '42501';
  end if;
  select c.generation_id into source_id from public.captions c
    join public.generations g on g.id = c.generation_id
    where c.id = p_caption_id and g.user_id = owner_id;
  if source_id is null then
    raise exception 'Caption unavailable or not yours' using errcode = '42501';
  end if;
  -- Same lock as publication: a stale Publish retry must not resurrect a deletion.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(source_id::text, 0));
  update public.generations set withdrawn_at = coalesce(withdrawn_at, now())
    where id = source_id and user_id = owner_id;
  update public.captions set deleted_at = coalesce(deleted_at, now())
    where generation_id = source_id;
  return true;
end;
$$;
revoke all on function public.humor_delete_caption(uuid) from public, anon;
grant execute on function public.humor_delete_caption(uuid) to authenticated;

create or replace function public.humor_publish_preview(p_generation_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  draft public.generations%rowtype;
  caption_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to publish' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_generation_id::text, 0));
  select * into draft from public.generations
    where id = p_generation_id and user_id = auth.uid();
  if not found or draft.generated_content is null or draft.withdrawn_at is not null then
    raise exception 'Preview unavailable' using errcode = '42501';
  end if;
  select id into caption_id from public.captions
    where generation_id = draft.id order by created_at limit 1;
  if caption_id is not null then return caption_id; end if;
  if not exists (select 1 from public.images
    where id = draft.image_id and (user_id is null or user_id = auth.uid())) then
    raise exception 'Photo unavailable' using errcode = '42501';
  end if;
  insert into public.captions (image_id, content, generation_id)
    values (draft.image_id, draft.generated_content, draft.id)
    returning id into caption_id;
  return caption_id;
end;
$$;
revoke all on function public.humor_publish_preview(uuid) from public, anon;
grant execute on function public.humor_publish_preview(uuid) to authenticated;
commit;

select routine_name, security_type from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('humor_delete_caption', 'humor_publish_preview');

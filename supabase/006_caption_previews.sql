-- Run once in Supabase SQL Editor before testing the Week 5 preview flow.
-- Existing captions and the Week 4 deployment remain compatible.
begin;

alter table public.generations
  add column if not exists generated_content text
  check (generated_content is null or length(trim(generated_content)) between 1 and 500);

-- generations already has owner-only SELECT/INSERT RLS. Draft text stays there;
-- only explicit publication inserts a row into the public caption collection.
grant insert (generated_content) on public.generations to authenticated;

create or replace function public.humor_publish_preview(p_generation_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  draft public.generations%rowtype;
  caption_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to publish' using errcode = '42501';
  end if;

  -- Serialize retries for this draft without granting users UPDATE access.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_generation_id::text, 0));
  select * into draft from public.generations
    where id = p_generation_id and user_id = auth.uid();
  if not found or draft.generated_content is null then
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
where routine_schema = 'public' and routine_name = 'humor_publish_preview';

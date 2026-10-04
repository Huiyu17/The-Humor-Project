-- Next manual step: install in Supabase SQL Editor before switching the app to RPC.
-- SECURITY INVOKER preserves the caller's grants and RLS policies.
begin;

create or replace function public.humor_publish_generated_caption(
  p_image_id uuid,
  p_user_input text,
  p_prompt text,
  p_model text,
  p_content text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_generation_id uuid;
  new_caption_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to publish' using errcode = '42501';
  end if;

  if p_image_id is null
    or length(trim(coalesce(p_user_input, ''))) not between 5 and 500
    or length(trim(coalesce(p_prompt, ''))) not between 1 and 20000
    or length(trim(coalesce(p_model, ''))) not between 1 and 200
    or length(trim(coalesce(p_content, ''))) not between 1 and 500
  then
    raise exception 'Invalid generation input' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.images i
    where i.id = p_image_id
      and (i.user_id is null or i.user_id = current_user_id)
  ) then
    raise exception 'Choose a preset or your own photo' using errcode = '42501';
  end if;

  insert into public.generations (user_id, image_id, user_input, prompt, model)
  values (current_user_id, p_image_id, trim(p_user_input), p_prompt, p_model)
  returning id into new_generation_id;

  insert into public.captions (image_id, content, generation_id)
  values (p_image_id, trim(p_content), new_generation_id)
  returning id into new_caption_id;

  return new_caption_id;
end;
$$;

revoke all on function public.humor_publish_generated_caption(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.humor_publish_generated_caption(uuid, text, text, text, text)
  to authenticated;

commit;

select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'humor_publish_generated_caption';

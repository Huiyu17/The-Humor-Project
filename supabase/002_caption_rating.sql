-- Proposed Project 1 schema. Use only if the course does not supply a schema.
-- Leaves jokes, existing data, and all RLS settings/policies untouched.
begin;

create table public.images (
  id uuid primary key default gen_random_uuid(),
  url text not null check (url ~ '^https://'),
  alt_text text not null,
  created_at timestamptz not null default now()
);

create table public.captions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images(id) on delete cascade,
  content text not null check (length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.caption_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption_id uuid not null references public.captions(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (user_id, caption_id)
);
create index captions_created_at_idx on public.captions(created_at desc);
create index caption_votes_caption_id_idx on public.caption_votes(caption_id);

-- Do not rely on hiding buttons: enforce vote ownership in Postgres as well.
-- Week 3 explicitly defers RLS. This trigger is scoped to this new votes table.
create function public.humor_validate_vote()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to vote' using errcode = '42501';
  end if;
  if tg_op <> 'INSERT' then
    if old.user_id <> auth.uid() then
      raise exception 'You may only change your own votes' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.user_id <> auth.uid() then
    raise exception 'Invalid vote owner' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.caption_id <> old.caption_id then
      raise exception 'Vote caption cannot change' using errcode = '42501';
    end if;
  end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and length(trim(first_name)) > 0 and length(trim(last_name)) > 0
  ) then
    raise exception 'Complete your profile before voting' using errcode = '42501';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger humor_vote_owner before insert or update or delete
on public.caption_votes for each row execute function public.humor_validate_vote();

revoke all on public.images, public.captions, public.caption_votes from anon, authenticated;
grant select on public.images, public.captions to anon, authenticated;
grant select, insert, update on public.caption_votes to authenticated;
revoke execute on function public.humor_validate_vote() from public, anon, authenticated;

commit;

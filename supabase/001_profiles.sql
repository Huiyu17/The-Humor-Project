-- Week 3. Review existing triggers before running this file.
-- No RLS statements: existing policies and RLS settings are left untouched.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles alter column first_name drop not null;
alter table public.profiles alter column last_name drop not null;

create or replace function public.humor_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.humor_create_profile() from public, anon, authenticated;

-- Only install when no other INSERT trigger already exists on auth.users.
-- If one exists, inspect it with 000_inspect.sql and verify it creates profiles.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass and not tgisinternal
      and (tgtype & 4) = 4
  ) then
    create trigger humor_profile_after_signup
      after insert on auth.users for each row
      execute function public.humor_create_profile();
  end if;
end;
$$;

-- Existing users signed up before the trigger also need a profile.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

commit;

-- Read only. Run this first and compare with the proposed schema.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'captions', 'images', 'caption_votes', 'jokes')
order by table_name, ordinal_position;

select t.tgname, pg_get_triggerdef(t.oid) as trigger_definition,
  pg_get_functiondef(t.tgfoid) as function_definition
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'avatars';

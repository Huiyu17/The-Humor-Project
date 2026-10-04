-- Read-only audit. has_any_column_privilege also detects column-level grants.
select
  t.tablename,
  t.rowsecurity as rls_enabled,
  has_table_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'SELECT') as anon_can_select,
  has_any_column_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'INSERT') as anon_can_insert,
  has_any_column_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'UPDATE') as anon_can_update,
  has_table_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'DELETE') as anon_can_delete
from pg_tables t
where t.schemaname = 'public'
order by t.tablename;

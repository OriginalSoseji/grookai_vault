-- Human-readable policy snapshot for quick reviews
select 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  permissive,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, command, policyname;


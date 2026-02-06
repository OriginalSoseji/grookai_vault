-- Fingerprinting L2 audit SQL (executed via pg)

-- 1) Does fingerprint_bindings exist + row counts?
select to_regclass('public.fingerprint_bindings') as fingerprint_bindings;
select count(*) as bindings_count from public.fingerprint_bindings;

-- 2) Does fingerprint_provenance_events exist + row counts?
select to_regclass('public.fingerprint_provenance_events') as fingerprint_provenance_events;
select count(*) as prov_count from public.fingerprint_provenance_events;

-- 3) Show 5 most recent bindings (if table exists)
select * from public.fingerprint_bindings order by created_at desc nulls last limit 5;

-- 4) Show 10 most recent provenance events (if table exists)
select * from public.fingerprint_provenance_events order by created_at desc nulls last limit 10;

-- 5) Check foreign keys referencing bindings/provenance
select
  tc.table_schema, tc.table_name, kcu.column_name,
  ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and (ccu.table_name in ('fingerprint_bindings','fingerprint_provenance_events'));

-- 6) Find any functions mentioning fingerprint/provenance
select n.nspname as schema, p.proname as name
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proname ilike '%fingerprint%' or p.proname ilike '%provenance%'
order by 1,2;

-- 7) Find views mentioning fingerprint/provenance
select schemaname, viewname
from pg_views
where viewname ilike '%fingerprint%' or viewname ilike '%provenance%'
order by 1,2;

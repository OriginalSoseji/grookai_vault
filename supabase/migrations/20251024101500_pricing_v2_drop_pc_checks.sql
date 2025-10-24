-- Pricing v2: Drop legacy constraints/enums referencing 'pricecharting'

-- 1) Drop any CHECK constraints in public schema whose definition mentions 'pricecharting'
do $$
declare r record;
begin
  for r in (
    select conrelid::regclass as table_name, conname
    from pg_constraint c
    where c.contype = 'c'
      and c.connamespace = 'public'::regnamespace
      and pg_get_constraintdef(c.oid) ilike '%pricecharting%'
  ) loop
    execute format('alter table %s drop constraint if exists %I', r.table_name, r.conname);
  end loop;
end $$;

-- 2) Convert any ENUM types in public schema that include a 'pricecharting' label to TEXT on referencing columns
do $$
declare rec record;
begin
  for rec in (
    select t.oid as type_oid, t.typname as type_name
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype = 'e'
      and exists (select 1 from pg_enum e where e.enumtypid = t.oid and e.enumlabel ilike 'pricecharting')
  ) loop
    -- For each column using this enum, alter to TEXT
    perform 1;
    for r in (
      select table_schema, table_name, column_name
      from information_schema.columns
      where udt_schema = 'public' and udt_name = rec.type_name
    ) loop
      execute format('alter table %I.%I alter column %I type text using %I::text', r.table_schema, r.table_name, r.column_name, r.column_name);
    end loop;
  end loop;
end $$;

-- 3) Optional: reintroduce permissive CHECKs (without pricecharting) on known columns if desired
-- Example (uncomment if you want a bounded set):
-- alter table if exists public.card_prices
--   add constraint card_prices_source_check_v2 check (lower(source) in ('justtcg','ebay','grookai_index','app'));


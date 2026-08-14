-- ONE_PIECE_CANONICAL_IMPORT_DURABLE_STAGING_SCHEMA_V1 rollback candidate.
-- This rollback is valid only before any durable One Piece staging rows exist.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  batch_rows bigint;
  staging_rows bigint;
  ledger_rows bigint;
  ledger_name text;
  later_migrations bigint;
begin
  if to_regclass('public.one_piece_canonical_import_batches') is null
     or to_regclass('public.one_piece_canonical_import_rows') is null then
    raise exception 'One Piece durable staging schema is incomplete or absent';
  end if;

  select count(*) into batch_rows
  from public.one_piece_canonical_import_batches;
  select count(*) into staging_rows
  from public.one_piece_canonical_import_rows;
  if batch_rows <> 0 or staging_rows <> 0 then
    raise exception 'Refusing schema rollback with durable One Piece staging rows: batches %, rows %',
      batch_rows, staging_rows;
  end if;

  select count(*), min(name)
    into ledger_rows, ledger_name
  from supabase_migrations.schema_migrations
  where version = '20260814120000';
  if ledger_rows <> 1 or ledger_name <> 'one_piece_canonical_import_durable_staging_v1' then
    raise exception 'Exact One Piece migration ledger row is not present';
  end if;

  select count(*) into later_migrations
  from supabase_migrations.schema_migrations
  where version > '20260814120000';
  if later_migrations <> 0 then
    raise exception 'Refusing rollback after later migrations were recorded';
  end if;
end;
$$;

drop table public.one_piece_canonical_import_rows;
drop table public.one_piece_canonical_import_batches;
drop function public.one_piece_canonical_import_reject_mutation_v1();

delete from supabase_migrations.schema_migrations
where version = '20260814120000'
  and name = 'one_piece_canonical_import_durable_staging_v1';

commit;

begin;

-- RETIRE_LEGACY_INGEST_MERGE_CARD_PRINTS_V1
--
-- This pre-canonical helper targets an identity conflict key that no longer
-- exists. Current ingestion uses the governed canonical warehouse pipelines.
-- Keep the function as a fail-closed compatibility stub so any unknown caller
-- receives an explicit error instead of performing an unsafe merge.

create or replace function ingest.merge_card_prints()
returns void
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception using
    errcode = '0A000',
    message = 'ingest.merge_card_prints() is retired',
    detail = 'The legacy merge key is incompatible with the current canonical card-print identity model.',
    hint = 'Use the governed canonical warehouse ingestion pipeline.';
end;
$function$;

comment on function ingest.merge_card_prints() is
  'Retired fail-closed compatibility stub. Use the governed canonical warehouse ingestion pipeline.';

revoke all on function ingest.merge_card_prints() from public;
revoke all on function ingest.merge_card_prints() from anon;
revoke all on function ingest.merge_card_prints() from authenticated;

commit;

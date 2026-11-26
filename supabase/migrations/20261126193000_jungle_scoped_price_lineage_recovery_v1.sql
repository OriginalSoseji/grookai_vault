-- Restore product-scoped current Jungle lineage validation.
-- All evidence, currency, amount, canonical identity, finish and Gym-lane checks stay unchanged.
begin;
CREATE OR REPLACE FUNCTION public.jungle_edition_price_row_restricted_valid_v1(row_data jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare frozen jsonb; expected record; field_name text;
begin
  if row_data->>'edition_assignment_id' is null
     or row_data->>'gym_edition_assignment_id' is not null then return false; end if;
  select assignment.assignment_payload into frozen
  from public.tcgplayer_jungle_edition_assignments_v1 assignment
  cross join lateral public.tcgplayer_jungle_assignment_candidates_for_products_v1(
    array[(assignment.assignment_payload#>>'{source,product_id}')::integer]) candidate
  where assignment.id=(row_data->>'edition_assignment_id')::uuid
    and candidate.source_observation_id=assignment.source_observation_id
    and candidate.source_sync_run_id=assignment.source_sync_run_id
    and candidate.binding_id=assignment.binding_id
    and candidate.assignment_sha256=assignment.assignment_sha256
    and candidate.assignment_payload=assignment.assignment_payload;
  if not found then return false; end if;
  if row_data->>'source_mapping_id' is not null
     or row_data->>'variant_assignment_id' is not null then return false; end if;
  if row_data ? 'edition_assignment_payload'
     and row_data->'edition_assignment_payload' is distinct from frozen then return false; end if;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'variant_assignment_version','TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
    'variant_assignment_status','exact_child_finish','mapping_method','jungle_edition_binding_v1',
    'language_result','english','finish_result','exact_child_finish','source_integrity_result','passed',
    'duplicate_product_result','unique','freshness_result','fresh'
  )) loop
    if row_data ? expected.key and row_data->>expected.key is distinct from expected.value
      then return false; end if;
  end loop;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'source_observation_id',frozen#>'{source,observation_id}',
    'source_sync_run_id',frozen#>'{source,sync_run_id}',
    'source_artifact_id',frozen#>'{source,artifact_id}',
    'source_artifact_hash',frozen#>'{source,artifact_hash}',
    'source_product_id',frozen#>'{source,product_id}',
    'source_subtype_name',frozen#>'{source,subtype}',
    'source_row_hash',frozen#>'{source,row_hash}',
    'source_price_row_identity',frozen#>'{source,price_row_identity}',
    'currency',frozen#>'{source,currency}',
    'card_print_id',frozen#>'{canonical,card_print_id}',
    'card_printing_id',frozen#>'{canonical,card_printing_id}',
    'gv_id',frozen#>'{canonical,gv_id}',
    'printing_gv_id',frozen#>'{canonical,printing_gv_id}',
    'finish_key',frozen#>'{canonical,finish_key}'
  )) loop
    if row_data->>expected.key is distinct from expected.value then return false; end if;
  end loop;
  if (row_data->>'source_artifact_date')::date
       is distinct from (frozen#>>'{source,artifact_observed_on}')::date
    or (row_data->>'source_observed_on')::date
       is distinct from (frozen#>>'{source,observed_on}')::date
    or (row_data->>'market_price')::numeric
       is distinct from (frozen#>>'{source,market_price}')::numeric
    or extract(epoch from (row_data->>'source_sync_finished_at')::timestamptz)
       is distinct from (frozen#>>'{source,sync_finished_at_epoch}')::numeric
    then return false; end if;
  foreach field_name in array array['low_price','mid_price','high_price','direct_low_price'] loop
    if row_data ? field_name and (row_data->>field_name)::numeric
      is distinct from (frozen->'source'->>field_name)::numeric then return false; end if;
  end loop;
  return true;
exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return false;
end;
$function$
;
commit;

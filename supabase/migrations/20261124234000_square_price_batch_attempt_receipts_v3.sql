-- Forward correction to the persistently applied local authority prototype.
-- Observed means the whole business effect was read back, not proof that a
-- particular HTTP attempt returned successfully. Unknown attempts stay unknown.
begin;
do $guard$
declare definition text; marker text:='  if accepted=b.member_count then';
begin
 definition:=pg_get_functiondef('public.square_price_batch_service_v1(text,jsonb)'::regprocedure);
 if encode(sha256(convert_to(definition,'UTF8')),'hex')<>'792162c1d0f245dd9b142ddfa93ef382b650788344f6b3bce0199d4085408ac3' then
  raise exception 'square_batch_receipt_prior_authority_drift';
 end if;
 if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='grookai_square.price_batch_attempts'::regclass
     and conname='price_batch_attempts_status_check') is distinct from
    'CHECK ((status = ANY (ARRAY[''sending''::text, ''unknown''::text, ''rejected''::text])))' then
  raise exception 'square_batch_receipt_constraint_drift';
 end if;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then
  raise exception 'square_batch_receipt_marker_drift';
 end if;
 alter table grookai_square.price_batch_attempts drop constraint price_batch_attempts_status_check;
 alter table grookai_square.price_batch_attempts add constraint price_batch_attempts_status_check
  check(status in ('sending','unknown','rejected','observed'));
 definition:=replace(definition,marker,$replacement$  if accepted=b.member_count then
   update grookai_square.price_batch_attempts set status='observed',finished_at=clock_timestamp()
    where batch_id=b.id and status='sending' and lease_fence=c.lease_fence and lease_token=c.lease_token;$replacement$);
 execute definition;
end $guard$;

-- Only already-complete, independently observed parents can close a historical
-- dangling sending record. Do not alter request, membership, unknown/rejected
-- history, catalog mappings, source data, stock or settlement.
update grookai_square.price_batch_attempts a set status='observed',finished_at=b.finished_at
from grookai_square.price_batches b
where a.batch_id=b.id and a.status='sending' and b.status='succeeded'
 and (select count(*) from grookai_square.price_batch_members m where m.batch_id=b.id)=b.member_count
 and not exists(select 1 from grookai_square.price_batch_members m where m.batch_id=b.id and (
  m.observed_object is null or m.observed_at is null
  or grookai_square.price_batch_projection_v1(m.observed_object) is distinct from m.binding->'projection'
  or coalesce((m.observed_object->>'version')::numeric,0)<=(m.binding->>'itemVersion')::numeric
  or coalesce((m.observed_object#>>'{item_data,variations,0,version}')::numeric,0)<=(m.binding->>'variationVersion')::numeric));
commit;

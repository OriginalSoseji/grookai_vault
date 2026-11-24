-- Forward-only policy repair. Stop new/unsent publication after vendor pause,
-- while keeping retained parents eligible for scheduled readback/recovery.
-- No stock, sale, payment, mapping, request or membership writer is changed.
begin;
do $guard$
declare batch_fn text; commerce_fn text; old_enabled text; old_begin text;
 old_connections text; new_connections text;
begin
 batch_fn:=pg_get_functiondef('public.square_price_batch_service_v1(text,jsonb)'::regprocedure);
 commerce_fn:=pg_get_functiondef('public.square_commerce_service_v2(text,jsonb)'::regprocedure);
 if encode(sha256(convert_to(batch_fn,'UTF8')),'hex')<>'492692525153db44b954a539cdac1b9313ea3f07c187db207f3a5ca567bc9f46'
  or encode(sha256(convert_to(commerce_fn,'UTF8')),'hex')<>'5ef48123825c07a02784b76a14d01c0b4b40fb51f8e6caabfb6619da9e8bae75' then
  raise exception 'square_batch_pause_prior_authority_drift';
 end if;
 old_enabled:='select pc.enabled and ctl.catalog_enabled and c.status=''connected''';
 old_begin:=$marker$ if p_action='begin' then
  if b.status not in ('prepared','uncertain') then raise exception 'square_batch_not_pending'; end if;$marker$;
 old_connections:=$marker$or exists(select 1 from grookai_square.allocations where connection_id=cx.id and state in ('preparing','active','withdrawing','review','sold')))$marker$;
 if (length(batch_fn)-length(replace(batch_fn,old_enabled,'')))/length(old_enabled)<>1
  or (length(batch_fn)-length(replace(batch_fn,old_begin,'')))/length(old_begin)<>1
  or (length(commerce_fn)-length(replace(commerce_fn,old_connections,'')))/length(old_connections)<>1 then
  raise exception 'square_batch_pause_marker_drift';
 end if;
 batch_fn:=replace(batch_fn,old_enabled,'select pc.enabled and c.auto_sync and ctl.catalog_enabled and c.status=''connected''');
 batch_fn:=replace(batch_fn,old_begin,old_begin||$pause$
  if b.started_at is null and not c.auto_sync then
   if exists(select 1 from grookai_square.price_batch_attempts where batch_id=b.id) then raise exception 'square_reconciliation_required'; end if;
   update grookai_square.price_batches set status='cancelled',finished_at=clock_timestamp(),error_code='square_auto_sync_paused' where id=b.id;
   return grookai_square.price_batch_result_v1(b.id);
  end if;$pause$);
 new_connections:=$recovery$or exists(select 1 from grookai_square.allocations where connection_id=cx.id and state in ('preparing','active','withdrawing','review','sold'))
    or exists(select 1 from grookai_square.price_batches where connection_id=cx.id and status in ('prepared','sending','uncertain')))$recovery$;
 commerce_fn:=replace(commerce_fn,old_connections,new_connections);
 execute batch_fn;
 execute commerce_fn;
end $guard$;
commit;

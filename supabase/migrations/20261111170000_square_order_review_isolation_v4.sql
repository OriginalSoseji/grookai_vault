-- A permanently unsupported order holds only its own physical copies. Saved
-- uncertain requests remain evidence; they cannot block every other stock lane
-- or become permission to release/reallocate an unresolved physical copy.
begin;

do $guard$
begin
 if (select encode(extensions.digest(prosrc,'sha256'),'hex') from pg_proc
     where oid='public.square_commerce_service_v2(text,jsonb)'::regprocedure)
   is distinct from '98a051b9bf927bc48ead032cf5c173e6535c7439aac2a4811bb404e226939ea4'
 then raise exception 'square_order_review_service_drift'; end if;
 if (select encode(extensions.digest(prosrc,'sha256'),'hex') from pg_proc
     where oid='public.square_commerce_workspace_v2()'::regprocedure)
   is distinct from '582beca15b4002134fbee5ac3e9216f0e4a729f37ecb9927d781a536b88f80e5'
 then raise exception 'square_order_review_workspace_drift'; end if;
end $guard$;

alter table grookai_square.allocations
 add column review_order_id text check(review_order_id ~ '^[A-Za-z0-9_-]{1,192}$'),
 add column review_stock_operation_id uuid references grookai_square.stock_operations(id) on delete restrict;

do $repair$
declare definition text; marker text; replacement text;
begin
 select pg_get_functiondef('public.square_commerce_service_v2(text,jsonb)'::regprocedure) into definition;
 marker:=$old$  if observation.state<>'paid' then return jsonb_build_object('recorded',true,'sales',0,'state',observation.state); end if;$old$;
 replacement:=$new$  if observation.state='review' then
   if snapshot->>'id' is null or snapshot->>'id' !~ '^[A-Za-z0-9_-]{1,192}$' then raise exception 'square_order_unconfirmed'; end if;
   ids:='{}'::uuid[];
   for a in select ax.* from grookai_square.allocations ax join grookai_square.targets tx on tx.id=ax.target_id
    where ax.connection_id=c.id and tx.connection_id=c.id and ax.state in ('preparing','active','withdrawing','review')
     and tx.variation_id in (select value->>'variationId' from jsonb_array_elements(snapshot->'lines'))
    order by ax.id for update of ax loop
    select * into op from grookai_square.stock_operations where allocation_id=a.id and connection_id=c.id
     and status in ('prepared','sending','uncertain') order by created_at,id limit 1 for update;
    if op.id is not null then
     -- Stop automation, retain the immutable body/key and identify its unresolved
     -- obligation on the held allocation. No provider outcome is invented.
     update grookai_square.stock_operations set status='failed',
      error_code=case when op.status='prepared' then 'square_order_review_before_send' else 'square_order_stock_unconfirmed' end,
      finished_at=clock_timestamp() where id=op.id;
    end if;
    if a.state<>'review' or a.review_order_id is null or op.id is not null then
     update grookai_square.allocations set state='review',review_order_id=coalesce(review_order_id,snapshot->>'id'),
      review_stock_operation_id=coalesce(review_stock_operation_id,op.id),updated_at=clock_timestamp() where id=a.id;
     update grookai_square.targets set last_error='square_order_requires_review',updated_at=clock_timestamp() where id=a.target_id;
     insert into grookai_square.allocation_events(allocation_id,state,quantity,reason)
      values(a.id,'review',a.confirmed_quantity,'square_order_requires_review');
    end if;
    ids:=array_append(ids,a.id);
   end loop;
   return jsonb_build_object('recorded',true,'sales',0,'state','review','quarantined',cardinality(ids));
  end if;
  if observation.state<>'paid' then return jsonb_build_object('recorded',true,'sales',0,'state',observation.state); end if;$new$;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'square_order_review_observe_marker'; end if;
 definition:=replace(definition,marker,replacement);

 marker:=$old$when ax.state in ('preparing','withdrawing','review') then 1$old$;
 replacement:=$new$when ax.review_order_id is not null then 4 when ax.state in ('preparing','withdrawing','review') then 1$new$;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'square_order_review_priority_marker'; end if;
 definition:=replace(definition,marker,replacement);

 marker:=$old$ elsif p_action='release_stock' then$old$;
 replacement:=$new$ elsif p_action='release_stock' then
  if a.review_order_id is not null then raise exception 'square_order_requires_review' using errcode='55000'; end if;$new$;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'square_order_review_release_marker'; end if;
 definition:=replace(definition,marker,replacement);

 marker:=$old$ elsif p_action='stock_prepare' then$old$;
 replacement:=$new$ elsif p_action='stock_prepare' then
  if p_data->>'kind'='allocate' and a.review_order_id is not null then raise exception 'square_order_requires_review' using errcode='55000'; end if;$new$;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'square_order_review_prepare_marker'; end if;
 definition:=replace(definition,marker,replacement);
 execute definition;

 select pg_get_functiondef('public.square_commerce_workspace_v2()'::regprocedure) into definition;
 marker:=$old$ax.confirmed_quantity as quantity,ax.updated_at as "checkedAt"$old$;
 replacement:=$new$ax.confirmed_quantity as quantity,ax.updated_at as "checkedAt",ax.review_order_id is not null as "orderReviewRequired"$new$;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'square_order_review_workspace_marker'; end if;
 execute replace(definition,marker,replacement);
end $repair$;

notify pgrst,'reload schema';
commit;

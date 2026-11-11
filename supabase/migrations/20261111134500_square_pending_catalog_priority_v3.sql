-- Recover the connection's saved catalog obligation before focusing a new card.
-- Otherwise newer copy-change entries can repeatedly encounter a busy catalog
-- lane while the one uncertain request waits behind them. No new write authority.
begin;
do $repair$
declare source text; definition text; old_order text := 'order by case when tx.instance_id=(p_data->>''focusInstanceId'')::uuid then -1';
 new_order text := 'order by case when exists(select 1 from grookai_square.operations pending where pending.connection_id=c.id and pending.target_id=tx.id and pending.status in (''prepared'',''sending'',''uncertain'')) then -2 when tx.instance_id=(p_data->>''focusInstanceId'')::uuid then -1';
begin
 select prosrc,pg_get_functiondef(oid) into source,definition from pg_proc where oid='public.square_commerce_service_v2(text,jsonb)'::regprocedure;
 if encode(extensions.digest(source,'sha256'),'hex') is distinct from '506cead09bf5c99a4a180e812d98537e4f000a023e7a98cc0a8752b75b136b7a' then raise exception 'square_pending_priority_source_drift'; end if;
 if (length(source)-length(replace(source,old_order,'')))/length(old_order)<>1 then raise exception 'square_pending_priority_call_count_drift'; end if;
 execute replace(definition,old_order,new_order);
end $repair$;
notify pgrst,'reload schema';
commit;

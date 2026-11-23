-- Opt-in bounded automatic reads reserve the oldest sold mapping before LIMIT.
-- No stock, sale, catalog-write, identity, ownership or permission authority changes.
begin;

do $repair$
declare
 definition text;
 current_hash text;
 marker text := 'elsif p_action=''commerce_targets'' then';
 replacement text := $window$elsif p_action='commerce_targets' then
  if p_data->>'automaticRecoveryLimit' in ('2','5') and p_data->>'focusInstanceId' is null then
   return coalesce((
    with window_candidates as materialized (
     select tx.id,tx.instance_id,tx.item_id,tx.variation_id,tx.selected,
      ax.state as allocation_state,ax.created_at as allocated_at,tx.updated_at as recovery_checked,
      case when exists(select 1 from grookai_square.operations pending
       where pending.connection_id=c.id and pending.target_id=tx.id and pending.status in ('prepared','sending','uncertain')) then -2
       when qx.instance_id is not null and qx.processed_at is null then 0
       when ax.state in ('preparing','withdrawing','review') then 1 when ax.state='sold' then 3 else 2 end as recovery_priority
     from grookai_square.targets tx
     left join grookai_square.allocations ax on ax.target_id=tx.id
     left join grookai_square.copy_changes qx on qx.instance_id=tx.instance_id
     where tx.connection_id=c.id
     order by recovery_priority,recovery_checked,tx.id
     limit (p_data->>'automaticRecoveryLimit')::integer
    ), ranked as materialized (
     select window_candidates.*,row_number() over(order by recovery_priority,recovery_checked,id) as recovery_slot
     from window_candidates
    ), oldest_sold as materialized (
     select tx.id,tx.instance_id,tx.item_id,tx.variation_id,tx.selected,
      ax.state as allocation_state,ax.created_at as allocated_at
     from grookai_square.targets tx join grookai_square.allocations ax on ax.target_id=tx.id
     where tx.connection_id=c.id and ax.state='sold'
     order by tx.updated_at,tx.id limit 1
    ), selected as (
     select id,instance_id,item_id,variation_id,selected,allocation_state,allocated_at,recovery_slot
     from ranked
     where not exists(select 1 from oldest_sold)
      or exists(select 1 from ranked r join oldest_sold s on r.id=s.id)
      or recovery_slot<(p_data->>'automaticRecoveryLimit')::integer
     union all
     select id,instance_id,item_id,variation_id,selected,allocation_state,allocated_at,
      (p_data->>'automaticRecoveryLimit')::bigint as recovery_slot
     from oldest_sold where not exists(select 1 from ranked r where r.id=oldest_sold.id)
    )
    select jsonb_agg(to_jsonb(result_row)-'recovery_slot' order by result_row.recovery_slot) from selected result_row
   ),'[]'::jsonb);
  end if;
$window$;
begin
 select pg_get_functiondef('public.square_commerce_service_v2(text,jsonb)'::regprocedure) into definition;
 current_hash:=encode(extensions.digest(definition,'sha256'),'hex');
 if current_hash='a12df583b9c6163cd7be81183ae91956fd92b8264aa98233c46d24f9ba1bc3a2' then return; end if;
 if current_hash is distinct from '0ff9248e9f768d7960a0d693f8e265aa7118a060838ca5c22af444df1bbf8a2f' then
  raise exception 'square_recovery_window_source_drift';
 end if;
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then
  raise exception 'square_recovery_window_marker_drift';
 end if;
 execute replace(definition,marker,replacement);
end $repair$;

notify pgrst,'reload schema';
commit;

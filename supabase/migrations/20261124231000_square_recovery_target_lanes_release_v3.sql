-- Forward correction: live obligations and sold stock use separate bounded lanes.
-- Keep the prior locally applied003000 migration immutable. No writer or ACL changes.
begin;
do $repair$
declare definition text; current_hash text;
 old_window text := $old_window$elsif p_action='commerce_targets' then
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
$old_window$;
 new_window text := $new_window$elsif p_action='commerce_targets' then
  if p_data->>'automaticRecoveryLimit' in ('2','5') and p_data->>'focusInstanceId' is null then
   return coalesce((
    with sold_window as materialized (
     select tx.id,tx.instance_id,tx.item_id,tx.variation_id,tx.selected,
      ax.state as allocation_state,ax.created_at as allocated_at,tx.updated_at as recovery_checked
     from grookai_square.targets tx join grookai_square.allocations ax on ax.target_id=tx.id
     where tx.connection_id=c.id and ax.state='sold'
     order by tx.updated_at,tx.id limit (p_data->>'automaticRecoveryLimit')::integer
    ), live_window as materialized (
     select tx.id,tx.instance_id,tx.item_id,tx.variation_id,tx.selected,
      ax.state as allocation_state,ax.created_at as allocated_at,tx.updated_at as recovery_checked,
      case when exists(select 1 from grookai_square.operations pending
       where pending.connection_id=c.id and pending.target_id=tx.id and pending.status in ('prepared','sending','uncertain')) then -2
       when qx.instance_id is not null and qx.processed_at is null then 0
       when ax.state in ('preparing','withdrawing','review') then 1 else 2 end as recovery_priority
     from grookai_square.targets tx
     left join grookai_square.allocations ax on ax.target_id=tx.id
     left join grookai_square.copy_changes qx on qx.instance_id=tx.instance_id
     where tx.connection_id=c.id and ax.state is distinct from 'sold'
     order by recovery_priority,recovery_checked,tx.id
     limit (p_data->>'automaticRecoveryLimit')::integer-case when exists(select 1 from sold_window) then 1 else 0 end
    ), live_ranked as (
     select live_window.*,row_number() over(order by recovery_priority,recovery_checked,id) as recovery_slot from live_window
    ), sold_ranked as (
     select sold_window.*,row_number() over(order by recovery_checked,id) as sold_slot from sold_window
    ), selected as (
     select id,instance_id,item_id,variation_id,selected,allocation_state,allocated_at,recovery_slot from live_ranked
     union all
     select id,instance_id,item_id,variation_id,selected,allocation_state,allocated_at,
      (select count(*) from live_window)+sold_slot as recovery_slot
     from sold_ranked where sold_slot<=(p_data->>'automaticRecoveryLimit')::integer-(select count(*) from live_window)
    )
    select jsonb_agg(to_jsonb(result_row)-'recovery_slot' order by result_row.recovery_slot) from selected result_row
   ),'[]'::jsonb);
  end if;
$new_window$;
begin
 select pg_get_functiondef('public.square_commerce_service_v2(text,jsonb)'::regprocedure) into definition;
 current_hash:=encode(extensions.digest(definition,'sha256'),'hex');
 if current_hash='5ef48123825c07a02784b76a14d01c0b4b40fb51f8e6caabfb6619da9e8bae75' then return; end if;
 if current_hash is distinct from 'a12df583b9c6163cd7be81183ae91956fd92b8264aa98233c46d24f9ba1bc3a2' then raise exception 'square_recovery_lanes_source_drift'; end if;
 if (length(definition)-length(replace(definition,old_window,'')))/length(old_window)<>1 then raise exception 'square_recovery_lanes_marker_drift'; end if;
 execute replace(definition,old_window,new_window);
end $repair$;
notify pgrst,'reload schema';
commit;

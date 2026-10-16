begin;

-- Capture fee evidence in the database writer path so web, native, and recovery
-- clients all receive the same immutable realized-sale accounting.
create or replace function public.inventory_sale_fee_snapshot_capture_v1(p_owner_id uuid,p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  lines jsonb;
  fee_bps integer;
  fixed_minor bigint;
begin
  if p_owner_id is null or p_request_id is null or jsonb_typeof(p_cart) is distinct from 'object' then
    raise exception 'Invalid sale request' using errcode='22023';
  end if;
  select coalesce(s.selling_fee_bps,0), coalesce(s.selling_fee_fixed_minor,0)
    into fee_bps, fixed_minor
    from (select p_owner_id as owner_id) viewer
    left join public.inventory_profit_settings s on s.owner_id=viewer.owner_id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'instanceId', item->>'instanceId',
      'sellingFeeMinor', round((item->>'unitMinor')::numeric * fee_bps / 10000)::bigint + fixed_minor
    ) order by item->>'instanceId'),'[]'::jsonb)
    into lines
    from jsonb_array_elements(p_cart->'items') item
    where item->>'instanceId' is not null;
  insert into public.inventory_sale_fee_snapshots(owner_id,request_id,lines)
    values(p_owner_id,p_request_id,lines)
    on conflict (owner_id,request_id) do nothing;
  return jsonb_build_object('requestId',p_request_id,'lines',lines);
end $$;
revoke all on function public.inventory_sale_fee_snapshot_capture_v1(uuid,uuid,jsonb) from public,anon,authenticated;

create or replace function public.inventory_sale_fee_snapshot_capture_trigger_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.receipt->>'kind' is distinct from 'purchase' then
    perform public.inventory_sale_fee_snapshot_capture_v1(new.owner_id,new.request_id,new.request);
  end if;
  return new;
end $$;
revoke all on function public.inventory_sale_fee_snapshot_capture_trigger_v1() from public,anon,authenticated;
drop trigger if exists inventory_sale_fee_snapshot_capture on public.vendor_sales_cart_receipts;
create trigger inventory_sale_fee_snapshot_capture after insert on public.vendor_sales_cart_receipts
  for each row execute function public.inventory_sale_fee_snapshot_capture_trigger_v1();

create or replace function public.inventory_sale_fee_snapshot_save_v1(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid(); cart jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null then raise exception 'Invalid sale request' using errcode='22023'; end if;
  select request into cart from public.vendor_sales_cart_receipts
    where owner_id=actor and request_id=p_request_id and receipt->>'kind' is distinct from 'purchase';
  if cart is null then raise exception 'Sale request not found' using errcode='22023'; end if;
  return public.inventory_sale_fee_snapshot_capture_v1(actor,p_request_id,cart);
end $$;
revoke all on function public.inventory_sale_fee_snapshot_save_v1(uuid) from public,anon;
grant execute on function public.inventory_sale_fee_snapshot_save_v1(uuid) to authenticated;

commit;

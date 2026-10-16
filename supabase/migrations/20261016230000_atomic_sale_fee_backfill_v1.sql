begin;

-- Backfill uses the exact fee assumption visible in the P&L screen. This avoids
-- freezing a stale persisted setting when the user just changed the inputs.
create or replace function public.inventory_sale_fee_snapshot_backfill_v1(
  p_request_id uuid,
  p_selling_fee_bps integer,
  p_selling_fee_fixed_minor bigint
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  cart jsonb;
  computed_lines jsonb;
  saved_lines jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or p_selling_fee_bps is null or p_selling_fee_bps not between 0 and 10000
     or p_selling_fee_fixed_minor is null or p_selling_fee_fixed_minor not between 0 and 1000000 then
    raise exception 'Invalid selling fee assumption' using errcode='22023';
  end if;
  select request into cart
    from public.vendor_sales_cart_receipts
    where owner_id=actor and request_id=p_request_id and receipt->>'kind' is distinct from 'purchase';
  if cart is null then raise exception 'Sale request not found' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'instanceId', item->>'instanceId',
      'sellingFeeMinor', round((item->>'unitMinor')::numeric * p_selling_fee_bps / 10000)::bigint + p_selling_fee_fixed_minor
    ) order by item->>'instanceId'),'[]'::jsonb)
    into computed_lines
    from jsonb_array_elements(cart->'items') item
    where item->>'instanceId' is not null;
  insert into public.inventory_sale_fee_snapshots(owner_id,request_id,lines)
    values(actor,p_request_id,computed_lines)
    on conflict (owner_id,request_id) do nothing;
  select lines into saved_lines
    from public.inventory_sale_fee_snapshots
    where owner_id=actor and request_id=p_request_id;
  return jsonb_build_object('requestId',p_request_id,'lines',saved_lines);
end $$;
revoke all on function public.inventory_sale_fee_snapshot_backfill_v1(uuid,integer,bigint) from public,anon;
grant execute on function public.inventory_sale_fee_snapshot_backfill_v1(uuid,integer,bigint) to authenticated;

commit;

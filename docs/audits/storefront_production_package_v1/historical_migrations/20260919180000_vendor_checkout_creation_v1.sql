-- Private checkout preparation/recovery. No rollout, HTTP endpoint or worker.
begin;
create or replace function public.vendor_order_checkout_prepare_v1(p_order_id uuid,p_buyer_id uuid,p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_stock_reservations;
 s public.vendor_stores;seller public.vendor_seller_accounts;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null or p_buyer_id is null then raise exception 'order_checkout_invalid';end if;
 select * into o from public.vendor_orders where id=p_order_id;
 if not found or o.buyer_id<>p_buyer_id then raise exception 'order_checkout_unavailable';end if;
 -- Match the existing acquisition order. Settlement never waits for store or
 -- seller locks after taking stock, so these paths cannot reverse lock order.
 select * into strict s from public.vendor_stores where id=(o.seller->>'storeId')::uuid for update;
 select * into strict seller from public.vendor_seller_accounts where id=(o.seller->>'id')::uuid for update;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict o from public.vendor_orders where id=p_order_id for update;
 if o.paid or cardinality(o.review_reasons)>0 or r.state<>'payment_pending' or s.owner_id<>o.owner_id
  or seller.owner_id<>o.owner_id or seller.store_id<>s.id or seller.state<>'bound' or seller.closeout_id is not null
  or row(seller.stripe_account_id,seller.connected_account_id,seller.livemode,seller.controller) is distinct from
   row(o.seller->>'platformAccountId',o.seller->>'connectedAccountId',(o.seller->>'livemode')::boolean,o.seller->'controller')
  or not s.web_published or not exists(select 1 from public.vendor_orders_rollout where orders_enabled)
  or not exists(select 1 from public.vendor_stock_rollout where reservations_enabled)
  or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(o.owner_id)->>'store_web')::boolean,false)
  or not exists(select 1 from public.public_profiles where user_id=o.owner_id and public_profile_enabled and vault_sharing_enabled
   and nullif(slug,'') is not null and nullif(display_name,'') is not null) then raise exception 'order_checkout_unavailable';end if;
 if r.instance_id is not null then
  if public.vendor_store_copy_reason_v1(o.owner_id,r.instance_id) is not null or
   not exists(select 1 from public.vendor_store_items where store_id=s.id and instance_id=r.instance_id) then raise exception 'order_item_unavailable';end if;
 else
  if public.vendor_store_custom_reason_v1(r.product_id) is not null or
   not exists(select 1 from public.vendor_store_custom_products where id=r.product_id and store_id=s.id and published) or
   not exists(select 1 from public.vendor_store_rollout where custom_enabled) then raise exception 'order_item_unavailable';end if;
 end if;
 -- The old claim's bound-session fast path is intentionally safe here because
 -- this wrapper reauthorizes BOTH new and already-bound sessions above.
 a:=public.vendor_order_claim_v1(o.id,p_token);
 return jsonb_build_object('order',to_jsonb(o),'attempt',to_jsonb(a),'stockState',r.state);
end;$$;

create or replace function public.vendor_order_checkout_recovery_v1(p_order_id uuid,p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_stock_reservations;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null then raise exception 'order_checkout_invalid';end if;
 select * into strict o from public.vendor_orders where id=p_order_id;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if a.creation_started_at is null then raise exception 'order_creation_not_started';end if;
 -- Recovery grants no provider-create authority. The original first timestamp
 -- is immutable: vendor_order_claim_v1 still rejects POST after 23 hours.
 -- Binding still requires a session created inside the original attempt window.
 if a.session_id is null then
  if a.lease_expires_at>clock_timestamp() then
   if a.lease_token is distinct from p_token then raise exception 'order_claim_busy';end if;
  else
   update public.vendor_order_attempts set lease_token=p_token,lease_fence=lease_fence+1,
    lease_expires_at=clock_timestamp()+interval '120 seconds' where id=a.id returning * into a;
  end if;
 end if;
 return jsonb_build_object('order',to_jsonb(o),'attempt',to_jsonb(a),'stockState',r.state);
end;$$;
revoke all on function public.vendor_order_checkout_prepare_v1(uuid,uuid,uuid),public.vendor_order_checkout_recovery_v1(uuid,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_checkout_prepare_v1(uuid,uuid,uuid),public.vendor_order_checkout_recovery_v1(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;

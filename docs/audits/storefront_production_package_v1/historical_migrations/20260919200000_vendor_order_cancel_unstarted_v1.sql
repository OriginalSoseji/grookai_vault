-- Buyer cancellation is evidence of no checkout start, never provider evidence.
begin;
create table if not exists public.vendor_order_cancellations (
 order_id uuid primary key references public.vendor_orders(id) on delete restrict,
 reservation_id uuid not null unique references public.vendor_stock_reservations(id) on delete restrict,
 attempt_id uuid not null unique references public.vendor_order_attempts(id) on delete restrict,
 buyer_id uuid not null references auth.users(id) on delete restrict,
 revision bigint not null check(revision>0),
 canceled_at timestamptz not null default clock_timestamp(),
 reason text not null default 'checkout_never_started' check(reason='checkout_never_started')
);
alter table public.vendor_order_cancellations enable row level security;
revoke all on public.vendor_order_cancellations from public,anon,authenticated,service_role;
grant select on public.vendor_order_cancellations to service_role;
create or replace function public.vendor_order_cancellation_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'order_cancellation_retained';end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_order_cancellations'::regclass and tgname='vendor_order_cancellation_immutable') then
  create trigger vendor_order_cancellation_immutable before update or delete on public.vendor_order_cancellations
   for each row execute function public.vendor_order_cancellation_immutable_v1();
 end if;
end$$;

alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_check3;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_check3 check(
 (state in ('payment_pending','consumed') and payment_started_at is not null) or
 (state='held' and payment_started_at is null) or
 (state='released' and (payment_started_at is not null)=(release_reason in ('provider_unpaid','order_canceled_unstarted'))));
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_release_reason_check;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_release_reason_check
 check(release_reason in ('canceled','expired','provider_unpaid','order_canceled_unstarted'));

create or replace function public.vendor_stock_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'stock_history_retained';end if;
 if (to_jsonb(new)-array['state','payment_started_at','released_at','release_reason']) is distinct from
    (to_jsonb(old)-array['state','payment_started_at','released_at','release_reason']) then raise exception 'stock_reservation_immutable';end if;
 if old.state='held' and new.state in ('payment_pending','released') then return new;end if;
 if old.state='payment_pending' and new.state in ('consumed','released') and new.payment_started_at=old.payment_started_at
  and exists(select 1 from public.vendor_orders o join public.vendor_order_observations e on e.order_id=o.id and e.revision=o.revision
   where o.reservation_id=old.id and e.applied_action=case new.state when 'consumed' then 'consume' else 'release' end)
  then return new;end if;
 -- The only additional transition requires the retained receipt and a pristine
 -- attempt. No GUC, browser status, missing session or expired lease is authority.
 if old.state='payment_pending' and new.state='released' and new.payment_started_at=old.payment_started_at
  and new.release_reason='order_canceled_unstarted'
  and exists(select 1 from public.vendor_orders o
   join public.vendor_order_cancellations c on c.order_id=o.id and c.reservation_id=old.id and c.buyer_id=o.buyer_id and c.revision=o.revision
   join public.vendor_order_attempts a on a.id=c.attempt_id and a.order_id=o.id
   where o.reservation_id=old.id and not o.paid and cardinality(o.review_reasons)=0
    and a.creation_started_at is null and a.lease_token is null and a.lease_expires_at is null and a.lease_fence=0
    and a.session_id is null and a.session_created_at is null and a.payment_intent_id is null)
  then return new;end if;
 raise exception 'stock_reservation_immutable';
end;$$;

create or replace function public.vendor_order_cancel_unstarted_v1(p_order_id uuid,p_buyer_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;r public.vendor_stock_reservations;a public.vendor_order_attempts;c public.vendor_order_cancellations;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_buyer_id is null or p_order_id is null then raise exception 'order_cancellation_unavailable';end if;
 select * into o from public.vendor_orders where id=p_order_id and buyer_id=p_buyer_id;
 if not found then raise exception 'order_cancellation_unavailable';end if;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 -- Compatible with checkout preparation/claim and settlement. No acquisition,
 -- package, publication or seller-readiness gate can strand an old obligation.
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict o from public.vendor_orders where id=o.id for update;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if o.buyer_id<>p_buyer_id or r.buyer_id<>p_buyer_id or o.paid or cardinality(o.review_reasons)>0 then raise exception 'order_cancellation_unavailable';end if;
 if a.creation_started_at is not null or a.lease_token is not null or a.lease_expires_at is not null or a.lease_fence<>0
  or a.session_id is not null or a.session_created_at is not null or a.payment_intent_id is not null then raise exception 'order_checkout_started';end if;
 select * into c from public.vendor_order_cancellations where order_id=o.id;
 if found then
  if r.state<>'released' or r.release_reason<>'order_canceled_unstarted' or
   row(c.reservation_id,c.attempt_id,c.buyer_id,c.revision) is distinct from row(r.id,a.id,p_buyer_id,o.revision) then raise exception 'order_cancellation_unavailable';end if;
 else
  if r.state<>'payment_pending' then raise exception 'order_cancellation_unavailable';end if;
  insert into public.vendor_order_cancellations(order_id,reservation_id,attempt_id,buyer_id,revision)
   values(o.id,r.id,a.id,p_buyer_id,o.revision+1) returning * into c;
  update public.vendor_orders set revision=c.revision where id=o.id;
  update public.vendor_stock_reservations set state='released',release_reason='order_canceled_unstarted',released_at=c.canceled_at where id=r.id;
 end if;
 return jsonb_build_object('orderId',o.id,'state','canceled','canceledAt',c.canceled_at);
end;$$;

create or replace function public.vendor_order_cancellation_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('canceledAt',c.canceled_at,'canCancel',coalesce(
  auth.uid()=o.buyer_id and c.order_id is null and not o.paid and cardinality(o.review_reasons)=0 and r.state='payment_pending'
  and a.id is not null and a.creation_started_at is null and a.lease_token is null and a.lease_expires_at is null and a.lease_fence=0
  and a.session_id is null and a.session_created_at is null and a.payment_intent_id is null,false))
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 left join public.vendor_order_attempts a on a.order_id=o.id
 left join public.vendor_order_cancellations c on c.order_id=o.id
 where o.id=p_order_id and auth.uid() in(o.owner_id,o.buyer_id);
$$;
revoke all on function public.vendor_order_cancellation_immutable_v1(),public.vendor_order_cancel_unstarted_v1(uuid,uuid),
 public.vendor_order_cancellation_status_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_cancel_unstarted_v1(uuid,uuid) to service_role;
grant execute on function public.vendor_order_cancellation_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';
commit;

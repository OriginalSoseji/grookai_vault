-- Permanent removal is different from releasing a physical copy for resale.
-- Provider evidence stays append-only; the existing stock guard remains intact.
begin;

create table if not exists grookai_square.vault_removal_readbacks_v1 (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 instance_id uuid not null references public.vault_item_instances(id) on delete restrict,
 connection_id uuid not null references grookai_square.connections(id) on delete restrict,
 target_id uuid not null references grookai_square.targets(id) on delete restrict,
 allocation_id uuid not null references grookai_square.allocations(id) on delete restrict,
 withdrawal_id uuid not null references grookai_square.stock_operations(id) on delete restrict,
 run_id uuid not null references grookai_square.worker_runs(id) on delete restrict,
 source_snapshot jsonb not null check(octet_length(source_snapshot::text)<=65536),
 provider_quantity integer not null check(provider_quantity=0),
 reconciled_through timestamptz not null,
 checked_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
 check(expires_at>checked_at)
);
create index if not exists square_vault_removal_latest_v1
 on grookai_square.vault_removal_readbacks_v1(allocation_id,checked_at desc,id desc);

create table if not exists grookai_square.vault_removal_archives_v1 (
 instance_id uuid primary key references public.vault_item_instances(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 allocation_id uuid not null references grookai_square.allocations(id) on delete restrict,
 readback_id uuid not null unique references grookai_square.vault_removal_readbacks_v1(id) on delete restrict,
 archived_at timestamptz not null,
 recorded_at timestamptz not null default clock_timestamp()
);
alter table grookai_square.vault_removal_readbacks_v1 enable row level security;
alter table grookai_square.vault_removal_archives_v1 enable row level security;
revoke all on grookai_square.vault_removal_readbacks_v1,grookai_square.vault_removal_archives_v1
 from public,anon,authenticated,service_role;

create or replace function grookai_square.vault_removal_source_v1(p_instance uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_array(v.id,v.user_id,v.card_print_id,v.card_printing_id,v.slab_cert_id,
  v.gv_vi_id,v.legacy_vault_item_id,v.condition_label,v.intent,v.pricing_mode,
  v.asking_price_amount,v.asking_price_currency,v.archived_at)
 from public.vault_item_instances v where v.id=p_instance;
$$;

create or replace function grookai_square.vault_removal_order_blocked_v1(p_connection uuid,p_variation text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from (
   select distinct on(order_id) state,evidence from grookai_square.order_observations
   where connection_id=p_connection order by order_id,created_at desc,id desc
  ) latest where state in ('pending','review') and evidence->'lines' @>
   jsonb_build_array(jsonb_build_object('variationId',p_variation))
 );
$$;

create or replace function public.square_vault_removal_service_v1(p_action text,p_data jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 actor uuid := (p_data->>'ownerId')::uuid;
 instance uuid := (p_data->>'instanceId')::uuid;
 copy public.vault_item_instances;
 c grookai_square.connections;
 t grookai_square.targets;
 a grookai_square.allocations;
 op grookai_square.stock_operations;
 proof grookai_square.vault_removal_readbacks_v1;
begin
 if actor is null or instance is null then raise exception 'square_invalid_request'; end if;
 select * into copy from public.vault_item_instances where id=instance and user_id=actor;
 if copy.id is null then raise exception 'square_copy_not_owned'; end if;
 if p_action='context' then
  return jsonb_build_object('instanceId',copy.id,'gvvi',copy.gv_vi_id,'archived',copy.archived_at is not null,
   'claims',coalesce((select jsonb_agg(jsonb_build_object('connectionId',ax.connection_id,'targetId',tx.id,'state',ax.state))
    from grookai_square.allocations ax join grookai_square.targets tx on tx.id=ax.target_id
    join grookai_square.connections cx on cx.id=ax.connection_id
    where ax.instance_id=copy.id and tx.owner_id=actor and cx.owner_id=actor
     and ax.state in ('preparing','active','withdrawing','review')),'[]'::jsonb));
 end if;
 if p_action<>'attest' then raise exception 'square_invalid_request'; end if;
 c:=grookai_square.locked_connection(p_data);
 select * into t from grookai_square.targets where id=(p_data->>'targetId')::uuid
  and connection_id=c.id and instance_id=instance and owner_id=actor for update;
 if t.id is null then raise exception 'square_target_not_owned'; end if;
 select * into a from grookai_square.allocations where target_id=t.id for update;
 select * into copy from public.vault_item_instances where id=instance and user_id=actor for update;
 select * into op from grookai_square.stock_operations where allocation_id=a.id
  and status='succeeded' order by created_at desc,id desc limit 1;
 if copy.archived_at is not null or a.state is distinct from 'review' or a.confirmed_quantity is distinct from 0
  or t.selected or p_data->>'quantity' is distinct from '0'
  or op.id is null or op.kind is distinct from 'withdraw' or op.receipt->>'quantity' is distinct from '0'
  or c.reconcile_cursor is null or op.finished_at is null
  or c.reconcile_cursor<op.finished_at or c.reconcile_cursor<clock_timestamp()-interval '2 minutes'
  or exists(select 1 from grookai_square.stock_operations where allocation_id=a.id and status in ('prepared','sending','uncertain'))
  or exists(select 1 from grookai_square.sales where allocation_id=a.id)
  or exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=instance)
  or public.vendor_stock_live_quantity_v1(instance,null)>0
  or exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=instance and released_at is null)
  or grookai_square.vault_removal_order_blocked_v1(c.id,t.variation_id)
  or exists(select 1 from grookai_square.signals where environment=c.environment and merchant_id=c.merchant_id and processed_at is null)
  or not exists(select 1 from grookai_square.worker_runs where id=(p_data->>'runId')::uuid and environment=c.environment and status='running')
 then raise exception 'square_removal_unconfirmed'; end if;
 insert into grookai_square.vault_removal_readbacks_v1(owner_id,instance_id,connection_id,target_id,allocation_id,
  withdrawal_id,run_id,source_snapshot,provider_quantity,reconciled_through)
 values(actor,instance,c.id,t.id,a.id,op.id,(p_data->>'runId')::uuid,grookai_square.vault_removal_source_v1(instance),0,c.reconcile_cursor)
 returning * into proof;
 return jsonb_build_object('status','ready_to_archive','instanceId',instance,'gvvi',copy.gv_vi_id,'readbackId',proof.id);
end;
$$;
revoke all on function public.square_vault_removal_service_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.square_vault_removal_service_v1(text,jsonb) to service_role;

create or replace function grookai_square.finalize_vault_removal_v1() returns trigger
language plpgsql volatile security definer set search_path='' as $$
declare
 c grookai_square.connections;
 t grookai_square.targets;
 a grookai_square.allocations;
 proof grookai_square.vault_removal_readbacks_v1;
begin
 if old.archived_at is not null or new.archived_at is null or not grookai_square.copy_claimed(old.id) then return new; end if;
 if auth.uid() is distinct from old.user_id or row(new.id,new.user_id,new.card_print_id,new.card_printing_id,new.slab_cert_id,new.gv_vi_id,new.legacy_vault_item_id,
   new.condition_label,new.intent,new.pricing_mode,new.asking_price_amount,new.asking_price_currency)
  is distinct from row(old.id,old.user_id,old.card_print_id,old.card_printing_id,old.slab_cert_id,old.gv_vi_id,old.legacy_vault_item_id,
   old.condition_label,old.intent,old.pricing_mode,old.asking_price_amount,old.asking_price_currency)
 then raise exception 'square_stock_reserved' using errcode='55000'; end if;
 perform public.vendor_stock_require_isolation_v1();
 -- The archive writer already holds the copy. Never wait for the provider
 -- lane's connection->target->allocation->copy order in the opposite direction.
 begin
  select * into a from grookai_square.allocations where instance_id=old.id
   and state in ('preparing','active','withdrawing','review') for update nowait;
  if a.id is null then return new; end if;
  select * into t from grookai_square.targets where id=a.target_id for update nowait;
  select * into c from grookai_square.connections where id=a.connection_id for update nowait;
 exception when lock_not_available then
  raise exception 'square_removal_busy' using errcode='55000';
 end;
 if c.owner_id is distinct from old.user_id or t.owner_id is distinct from old.user_id
  or t.instance_id is distinct from old.id then raise exception 'square_stock_reserved' using errcode='55000'; end if;
 if c.lease_token is not null and c.lease_until>clock_timestamp() then
  raise exception 'square_removal_busy' using errcode='55000'; end if;
 select * into proof from grookai_square.vault_removal_readbacks_v1
 where allocation_id=a.id and instance_id=old.id and owner_id=old.user_id and target_id=t.id and connection_id=c.id
  and expires_at>clock_timestamp() and source_snapshot=grookai_square.vault_removal_source_v1(old.id)
 order by checked_at desc,id desc limit 1;
 if proof.id is null or a.state is distinct from 'review' or a.confirmed_quantity is distinct from 0 or t.selected
  or c.reconcile_cursor is null
  or c.reconcile_cursor<proof.reconciled_through or c.reconcile_cursor<clock_timestamp()-interval '2 minutes'
  or not exists(select 1 from grookai_square.worker_runs where id=proof.run_id and environment=c.environment and status='succeeded')
  or not exists(select 1 from grookai_square.stock_operations where id=proof.withdrawal_id and allocation_id=a.id
   and kind='withdraw' and status='succeeded' and receipt->>'quantity'='0')
  or exists(select 1 from grookai_square.stock_operations where allocation_id=a.id and status in ('prepared','sending','uncertain'))
  or exists(select 1 from grookai_square.sales where allocation_id=a.id)
  or exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=old.id)
  or public.vendor_stock_live_quantity_v1(old.id,null)>0
  or exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=old.id and released_at is null)
  or grookai_square.vault_removal_order_blocked_v1(c.id,t.variation_id)
  or exists(select 1 from grookai_square.signals where environment=c.environment and merchant_id=c.merchant_id and processed_at is null)
 then
  raise exception 'square_stock_reserved' using errcode='55000',
   detail=jsonb_build_object('kind','square_vault_removal_v1','instanceId',old.id,'gvvi',old.gv_vi_id)::text;
 end if;
 update grookai_square.allocations set state='released',released_at=clock_timestamp(),updated_at=clock_timestamp(),
  release_reason='owner_archived_after_confirmed_square_withdrawal' where id=a.id;
 insert into grookai_square.vault_removal_archives_v1(instance_id,owner_id,allocation_id,readback_id,archived_at)
  values(old.id,old.user_id,a.id,proof.id,new.archived_at);
 return new;
end;
$$;
revoke all on function grookai_square.vault_removal_source_v1(uuid),grookai_square.vault_removal_order_blocked_v1(uuid,text),
 grookai_square.finalize_vault_removal_v1() from public,anon,authenticated,service_role;
do $$ begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vault_item_instances'::regclass and tgname='finalize_square_vault_removal_v1') then
  create trigger finalize_square_vault_removal_v1 before update of archived_at on public.vault_item_instances
   for each row execute function grookai_square.finalize_vault_removal_v1();
 end if;
end $$;

commit;

-- Forward-only Square commerce authority. All new acquisition remains default-off.
-- Canonical archive/disposition bodies are factored byte-preservingly from their
-- applied source into private owner-parameterized cores. No Auth impersonation.
begin;
do $source_guard$ begin
if (select encode(extensions.digest(prosrc,'sha256'),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='vault_archive_exact_instance_v1') is distinct from '25140227b49b271f8efa1321924c38ef3ef9392700582d08ecf1b0c60e770f69' then raise exception 'square_inventory_source_drift'; end if;
if (select encode(extensions.digest(prosrc,'sha256'),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='vault_record_exact_instance_disposition_v2') is distinct from '3fa40286a14881f1cc5f0ebd139295da5c5835570dc41b148b8a96261f1d43e7' then raise exception 'square_inventory_source_drift'; end if;
end $source_guard$;
create schema grookai_inventory;
revoke all on schema grookai_inventory from public,anon,authenticated,service_role;
create or replace function grookai_inventory.archive_exact_instance_v2(
  p_owner_id uuid,
  p_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := p_owner_id;
  v_now timestamptz := now();
  v_instance public.vault_item_instances%rowtype;
  v_bucket public.vault_items%rowtype;
  v_slab public.slab_certs%rowtype;
  v_card_print_id uuid;
  v_remaining_count integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_instance_id is null then
    raise exception 'instance_id_required' using errcode = 'P0001';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = p_instance_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  if v_instance.archived_at is not null then
    raise exception 'vault_instance_already_archived' using errcode = 'P0001';
  end if;

  if v_instance.slab_cert_id is not null then
    select *
    into v_slab
    from public.slab_certs
    where id = v_instance.slab_cert_id;
  end if;

  v_card_print_id := coalesce(v_instance.card_print_id, v_slab.card_print_id);

  if v_card_print_id is null then
    raise exception 'vault_instance_missing_card_print' using errcode = 'P0001';
  end if;

  update public.vault_item_instances
  set archived_at = v_now
  where id = v_instance.id
    and user_id = v_uid
    and archived_at is null;

  if not found then
    raise exception 'vault_instance_archive_failed' using errcode = 'P0001';
  end if;

  select *
  into v_bucket
  from public.resolve_active_vault_anchor_v1(
    p_user_id => v_uid,
    p_card_print_id => v_card_print_id,
    p_create_if_missing => false
  );

  select count(*)
  into v_remaining_count
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  where vii.user_id = v_uid
    and vii.archived_at is null
    and coalesce(vii.card_print_id, sc.card_print_id) = v_card_print_id;

  if v_bucket.id is not null then
    if v_remaining_count <= 0 then
      update public.vault_items
      set
        qty = 0,
        archived_at = coalesce(archived_at, v_now)
      where id = v_bucket.id
        and user_id = v_uid
      returning *
      into v_bucket;
    else
      update public.vault_items
      set
        qty = v_remaining_count,
        archived_at = null
      where id = v_bucket.id
        and user_id = v_uid
      returning *
      into v_bucket;
    end if;
  end if;

  return jsonb_build_object(
    'archived_instance_id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', v_instance.legacy_vault_item_id,
    'resolved_vault_item_id', v_bucket.id,
    'remaining_active_count', v_remaining_count,
    'bucket_qty', v_bucket.qty,
    'bucket_archived_at', v_bucket.archived_at
  );
end;
$$;
create or replace function grookai_inventory.record_exact_instance_disposition_v3(
  p_owner_id uuid,
  p_instance_id uuid,
  p_disposition_type text,
  p_sale_price_amount numeric default null,
  p_sale_price_currency text default null,
  p_counterparty_label text default null,
  p_trade_received_description text default null,
  p_trade_cash_direction text default null,
  p_trade_cash_amount numeric default null,
  p_trade_cash_currency text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := p_owner_id;
  v_disposition_type text := lower(btrim(coalesce(p_disposition_type, '')));
  v_sale_price_currency text := upper(nullif(btrim(p_sale_price_currency), ''));
  v_counterparty_label text := nullif(btrim(p_counterparty_label), '');
  v_trade_received_description text := nullif(btrim(p_trade_received_description), '');
  v_trade_cash_direction text := lower(nullif(btrim(p_trade_cash_direction), ''));
  v_trade_cash_currency text := upper(nullif(btrim(p_trade_cash_currency), ''));
  v_instance public.vault_item_instances%rowtype;
  v_card_print_id uuid;
  v_event public.vault_item_instance_dispositions%rowtype;
  v_archive jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_instance_id is null then
    raise exception 'instance_id_required' using errcode = '22023';
  end if;

  if v_disposition_type not in ('sale', 'trade') then
    raise exception 'invalid_disposition_type' using errcode = '22023';
  end if;

  if v_counterparty_label is not null and char_length(v_counterparty_label) > 120 then
    raise exception 'counterparty_too_long' using errcode = '22023';
  end if;

  if v_disposition_type = 'sale' then
    if p_sale_price_amount is null or p_sale_price_amount <= 0 then
      raise exception 'sale_price_required' using errcode = '22023';
    end if;
    if v_sale_price_currency is null or char_length(v_sale_price_currency) <> 3 then
      raise exception 'sale_currency_required' using errcode = '22023';
    end if;
    if v_trade_received_description is not null
       or v_trade_cash_direction is not null
       or p_trade_cash_amount is not null
       or v_trade_cash_currency is not null then
      raise exception 'sale_trade_fields_not_allowed' using errcode = '22023';
    end if;
  else
    if p_sale_price_amount is not null or v_sale_price_currency is not null then
      raise exception 'trade_sale_fields_not_allowed' using errcode = '22023';
    end if;
    if v_trade_received_description is null then
      raise exception 'trade_received_description_required' using errcode = '22023';
    end if;
    if char_length(v_trade_received_description) > 1000 then
      raise exception 'trade_received_description_too_long' using errcode = '22023';
    end if;
    if (
      v_trade_cash_direction is null
      and (p_trade_cash_amount is not null or v_trade_cash_currency is not null)
    ) or (
      v_trade_cash_direction is not null
      and (
        v_trade_cash_direction not in ('received', 'paid')
        or p_trade_cash_amount is null
        or p_trade_cash_amount <= 0
        or v_trade_cash_currency is null
        or char_length(v_trade_cash_currency) <> 3
      )
    ) then
      raise exception 'invalid_trade_cash_adjustment' using errcode = '22023';
    end if;
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = p_instance_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0002';
  end if;

  if v_instance.archived_at is not null then
    raise exception 'vault_instance_already_archived' using errcode = '23514';
  end if;

  if v_instance.gv_vi_id is null or btrim(v_instance.gv_vi_id) = '' then
    raise exception 'vault_instance_missing_gvvi' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.vault_item_instance_dispositions d
    where d.vault_item_instance_id = v_instance.id
  ) then
    raise exception 'vault_instance_disposition_already_recorded' using errcode = '23505';
  end if;

  v_card_print_id := v_instance.card_print_id;
  if v_card_print_id is null and v_instance.slab_cert_id is not null then
    select sc.card_print_id
    into v_card_print_id
    from public.slab_certs sc
    where sc.id = v_instance.slab_cert_id;
  end if;

  if v_card_print_id is null then
    raise exception 'vault_instance_missing_card_print' using errcode = '23514';
  end if;

  insert into public.vault_item_instance_dispositions (
    user_id,
    vault_item_instance_id,
    card_print_id,
    card_printing_id,
    gv_vi_id,
    disposition_type,
    condition_label,
    intent_at_disposition,
    asking_price_amount,
    asking_price_currency,
    counterparty_label,
    sale_price_amount,
    sale_price_currency,
    trade_received_description,
    trade_cash_direction,
    trade_cash_amount,
    trade_cash_currency
  ) values (
    v_uid,
    v_instance.id,
    v_card_print_id,
    v_instance.card_printing_id,
    upper(btrim(v_instance.gv_vi_id)),
    v_disposition_type,
    v_instance.condition_label,
    v_instance.intent,
    v_instance.asking_price_amount,
    case
      when v_instance.asking_price_amount is null then null
      else upper(coalesce(nullif(btrim(v_instance.asking_price_currency), ''), 'USD'))
    end,
    v_counterparty_label,
    p_sale_price_amount,
    v_sale_price_currency,
    v_trade_received_description,
    v_trade_cash_direction,
    p_trade_cash_amount,
    v_trade_cash_currency
  )
  returning * into v_event;

  v_archive := grookai_inventory.archive_exact_instance_v2(p_owner_id,v_instance.id);

  if coalesce(v_archive ->> 'archived_instance_id', '') <> v_instance.id::text
     or coalesce(v_archive ->> 'gv_vi_id', '') <> upper(btrim(v_instance.gv_vi_id))
     or coalesce(v_archive ->> 'card_print_id', '') <> v_card_print_id::text then
    raise exception 'vault_instance_archive_readback_mismatch' using errcode = 'P0001';
  end if;

  return v_archive || jsonb_build_object(
    'disposition_id', v_event.id,
    'disposition_type', v_event.disposition_type,
    'counterparty_label', v_event.counterparty_label,
    'sale_price_amount', v_event.sale_price_amount,
    'sale_price_currency', v_event.sale_price_currency,
    'trade_received_description', v_event.trade_received_description,
    'trade_cash_direction', v_event.trade_cash_direction,
    'trade_cash_amount', v_event.trade_cash_amount,
    'trade_cash_currency', v_event.trade_cash_currency,
    'asking_price_snapshot_amount', v_event.asking_price_amount,
    'asking_price_snapshot_currency', v_event.asking_price_currency,
    'recorded_at', v_event.created_at
  );
end;
$$;
revoke all on all functions in schema grookai_inventory from public,anon,authenticated,service_role;
create or replace function public.vault_archive_exact_instance_v1(
  p_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$ begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
 return grookai_inventory.archive_exact_instance_v2(auth.uid(),p_instance_id);
end; $$;
create or replace function public.vault_record_exact_instance_disposition_v2(
  p_instance_id uuid,
  p_disposition_type text,
  p_sale_price_amount numeric default null,
  p_sale_price_currency text default null,
  p_counterparty_label text default null,
  p_trade_received_description text default null,
  p_trade_cash_direction text default null,
  p_trade_cash_amount numeric default null,
  p_trade_cash_currency text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$ begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
 return grookai_inventory.record_exact_instance_disposition_v3(auth.uid(),p_instance_id,p_disposition_type,
 p_sale_price_amount,p_sale_price_currency,p_counterparty_label,p_trade_received_description,
 p_trade_cash_direction,p_trade_cash_amount,p_trade_cash_currency);
end; $$;
-- COMMERCE AUTHORITY BELOW
alter table grookai_square.oauth_attempts add column client_return text not null default 'web' check(client_return in ('web','native'));
alter table grookai_square.connections add column reconcile_cursor timestamptz not null default clock_timestamp();
create table grookai_square.commerce_controls (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 revision bigint not null default 0, owner_allowlist uuid[] not null default '{}'
);
insert into grookai_square.commerce_controls(singleton) values(true);
create table grookai_square.preferences (
 connection_id uuid primary key references grookai_square.connections(id) on delete restrict,
 auto_enroll boolean not null default false, sell_on_square boolean not null default false,
 consent_at timestamptz, updated_at timestamptz not null default clock_timestamp()
);
create table grookai_square.commerce_control_history (
 revision bigint primary key, enabled boolean not null, owner_allowlist uuid[] not null,
 changed_at timestamptz not null default clock_timestamp()
);
create table grookai_square.allocations (
 id uuid primary key default gen_random_uuid(), target_id uuid not null unique references grookai_square.targets(id) on delete restrict,
 connection_id uuid not null references grookai_square.connections(id) on delete restrict,
 instance_id uuid not null references public.vault_item_instances(id) on delete restrict,
 state text not null check(state in ('preparing','active','withdrawing','released','sold','review')),
 source_snapshot jsonb not null, confirmed_quantity integer check(confirmed_quantity between 0 and 1),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 released_at timestamptz, release_reason text, unique(id,connection_id)
);
create unique index square_one_physical_claim_v2 on grookai_square.allocations(instance_id)
 where state in ('preparing','active','withdrawing','review');
create table grookai_square.stock_operations (
 id uuid primary key default gen_random_uuid(), connection_id uuid not null,
 allocation_id uuid not null, kind text not null check(kind in ('allocate','withdraw')),
 payload jsonb not null check(octet_length(payload::text)<=65536),
 source_snapshot jsonb not null,
 status text not null default 'prepared' check(status in ('prepared','sending','uncertain','succeeded','failed')),
 error_code text, receipt jsonb, created_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 foreign key(allocation_id,connection_id) references grookai_square.allocations(id,connection_id) on delete restrict
);
create unique index square_one_pending_stock_v2 on grookai_square.stock_operations(connection_id)
 where status in ('prepared','sending','uncertain');
create table grookai_square.signals (
 environment text not null check(environment in ('sandbox','production')), event_id text not null,
 merchant_id text not null, resource_type text not null check(resource_type in ('order','payment','refund','inventory','authorization')),
 resource_id text not null, body_hash text not null check(body_hash ~ '^[0-9a-f]{64}$'),
 received_at timestamptz not null default clock_timestamp(), processed_at timestamptz, error_code text,
 primary key(environment,event_id)
);
create table grookai_square.order_observations (
 id uuid primary key default gen_random_uuid(), connection_id uuid not null references grookai_square.connections(id) on delete restrict,
 order_id text not null, evidence_hash text not null check(evidence_hash ~ '^[0-9a-f]{64}$'),
 evidence jsonb not null check(octet_length(evidence::text)<=262144),
 state text not null check(state in ('pending','paid','canceled','refunded','review')),
 error_code text, created_at timestamptz not null default clock_timestamp(), unique(connection_id,order_id,evidence_hash)
);
create table grookai_square.sales (
 id uuid primary key default gen_random_uuid(), connection_id uuid not null, allocation_id uuid not null unique,
 order_id text not null, line_id text not null, sale_cents bigint not null check(sale_cents between 1 and 100000000),
 tax_cents bigint not null default 0 check(tax_cents>=0),
 disposition_id uuid not null unique references public.vault_item_instance_dispositions(id) on delete restrict,
 observation_id uuid not null references grookai_square.order_observations(id) on delete restrict,
 recorded_at timestamptz not null default clock_timestamp(), unique(connection_id,order_id,line_id),
 foreign key(allocation_id,connection_id) references grookai_square.allocations(id,connection_id) on delete restrict
);
create table grookai_square.refunds (
 connection_id uuid not null references grookai_square.connections(id) on delete restrict, refund_id text not null,
 order_id text not null, status text not null check(status in ('PENDING','APPROVED','REJECTED','FAILED','COMPLETED')),
 amount_cents bigint not null check(amount_cents>=0), evidence_hash text not null,
 updated_at timestamptz not null default clock_timestamp(), primary key(connection_id,refund_id)
);
create table grookai_square.returns (
 sale_id uuid primary key references grookai_square.sales(id) on delete restrict,
 returned_instance_id uuid not null unique references public.vault_item_instances(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 confirmed_at timestamptz not null default clock_timestamp()
);
create table grookai_square.copy_changes (
 instance_id uuid primary key references public.vault_item_instances(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 changed_at timestamptz not null default clock_timestamp(), processed_at timestamptz
);
create table grookai_square.allocation_events (
 id bigint generated always as identity primary key, allocation_id uuid not null references grookai_square.allocations(id) on delete restrict,
 state text not null, quantity integer, reason text, recorded_at timestamptz not null default clock_timestamp()
);
do $private_tables$ declare name text; begin
 foreach name in array array['commerce_controls','commerce_control_history','preferences','allocations','stock_operations','signals','order_observations','sales','refunds','returns','copy_changes','allocation_events'] loop
  execute format('alter table grookai_square.%I enable row level security',name);
  execute format('revoke all on grookai_square.%I from public,anon,authenticated,service_role',name);
 end loop;
end $private_tables$;
revoke all on all sequences in schema grookai_square from public,anon,authenticated,service_role;
create function grookai_square.stock_operation_immutable() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'square_stock_history_retained'; end if;
 if (to_jsonb(new)-array['status','error_code','receipt','finished_at']) is distinct from
  (to_jsonb(old)-array['status','error_code','receipt','finished_at']) then raise exception 'square_stock_request_immutable'; end if;
 return new;
end $$;
create trigger square_stock_request_immutable_v2 before update or delete on grookai_square.stock_operations
 for each row execute function grookai_square.stock_operation_immutable();
create function grookai_square.record_allocation_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into grookai_square.allocation_events(allocation_id,state,quantity,reason)
  values(new.id,new.state,new.confirmed_quantity,new.release_reason);
 return new;
end $$;
create trigger square_allocation_event_v2 after insert or update of state,confirmed_quantity,release_reason on grookai_square.allocations
 for each row execute function grookai_square.record_allocation_event();

create function grookai_square.enqueue_copy() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from grookai_square.connections cx join grookai_square.preferences px on px.connection_id=cx.id where cx.owner_id=new.user_id and px.auto_enroll)
  or exists(select 1 from grookai_square.targets where instance_id=new.id) then
  insert into grookai_square.copy_changes(instance_id,owner_id) values(new.id,new.user_id)
   on conflict(instance_id) do update set changed_at=clock_timestamp(),processed_at=null;
 end if;
 return new;
end $$;
create trigger queue_square_copy_change_v2 after insert or update of intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label,archived_at,card_printing_id,name
 on public.vault_item_instances for each row execute function grookai_square.enqueue_copy();

-- A claim is durable across disconnect, privacy changes and uncertain IO. This
-- function takes no client-controlled bypass context and protects actual stock.
create function grookai_square.copy_claimed(p_instance uuid) returns boolean
language sql volatile security definer set search_path='' as $$
 select exists(select 1 from grookai_square.allocations where instance_id=p_instance and state in ('preparing','active','withdrawing','review'));
$$;
create function grookai_square.guard_copy() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.archived_at is null and exists(select 1 from grookai_square.allocations where instance_id=old.id and state='sold') then
  raise exception 'square_sold_copy_requires_return_intake' using errcode='55000'; end if;
 if tg_op='UPDATE' and row(new.id,new.user_id,new.card_print_id,new.card_printing_id,new.slab_cert_id,new.gv_vi_id,new.archived_at)
   is not distinct from row(old.id,old.user_id,old.card_print_id,old.card_printing_id,old.slab_cert_id,old.gv_vi_id,old.archived_at) then return new; end if;
 perform public.vendor_stock_require_isolation_v1();
 if grookai_square.copy_claimed(old.id) then raise exception 'square_stock_reserved' using errcode='55000'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger guard_square_stock_copy_v2 before update or delete on public.vault_item_instances
 for each row execute function grookai_square.guard_copy();
create function grookai_square.guard_competing_claim() returns trigger
language plpgsql security definer set search_path='' as $$
declare instance uuid;
begin
 if tg_table_name='vault_item_instance_dispositions' then instance:=new.vault_item_instance_id;
 else instance:=new.instance_id; end if;
 if instance is null then return new; end if;
 perform public.vendor_stock_require_isolation_v1();
 perform 1 from public.vault_item_instances where id=instance for update;
 if grookai_square.copy_claimed(instance) then raise exception 'square_stock_reserved' using errcode='55000'; end if;
 return new;
end $$;
create trigger guard_square_stock_disposition_v2 before insert on public.vault_item_instance_dispositions
 for each row execute function grookai_square.guard_competing_claim();
create trigger guard_square_stock_web_claim_v2 before insert on public.vendor_stock_reservations
 for each row execute function grookai_square.guard_competing_claim();
create trigger guard_square_stock_ebay_claim_v2 before insert on public.ebay_seller_reservations_v1
 for each row execute function grookai_square.guard_competing_claim();
create function grookai_square.guard_slab() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and row(new.grader,new.cert_number,new.card_print_id,new.grade,new.qualifiers)
  is not distinct from row(old.grader,old.cert_number,old.card_print_id,old.grade,old.qualifiers) then return new; end if;
 perform public.vendor_stock_require_isolation_v1();
 -- Square allocation locks copies and only MVCC-reads slab evidence. Waiting
 -- on those same copies here gives a fresh post-wait claim snapshot without
 -- introducing a copy→slab row-lock inversion.
 perform 1 from public.vault_item_instances where slab_cert_id=old.id order by id for update;
 if exists(select 1 from grookai_square.allocations ax join public.vault_item_instances vx on vx.id=ax.instance_id
  where vx.slab_cert_id=old.id and ax.state in ('preparing','active','withdrawing','review')) then raise exception 'square_stock_reserved' using errcode='55000'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger guard_square_stock_slab_v2 before update or delete on public.slab_certs
 for each row execute function grookai_square.guard_slab();

create function grookai_square.locked_connection(p_data jsonb) returns grookai_square.connections
language plpgsql volatile security definer set search_path='' as $$
declare c grookai_square.connections;
begin
 select * into c from grookai_square.connections where id=(p_data->>'connectionId')::uuid and owner_id=(p_data->>'ownerId')::uuid for update;
 if c.id is null then raise exception 'square_connection_not_owned'; end if;
 if c.lease_token is distinct from (p_data->>'leaseToken')::uuid or c.lease_fence is distinct from (p_data->>'fence')::bigint
   or c.lease_token is null or c.lease_until<=clock_timestamp() then raise exception 'square_connection_busy'; end if;
 return c;
end $$;

create function public.square_commerce_controls_set_v2(p_expected_revision bigint,p_enabled boolean,p_owners uuid[]) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare r bigint;
begin
 select revision into r from grookai_square.commerce_controls where singleton for update;
 if p_expected_revision is distinct from r or p_enabled is null or p_owners is null or cardinality(p_owners)>100
  or array_position(p_owners,null) is not null or exists(select 1 from unnest(p_owners) x where not exists(select 1 from auth.users where id=x))
  then raise exception 'square_controls_conflict'; end if;
 update grookai_square.commerce_controls set enabled=p_enabled,owner_allowlist=p_owners,revision=revision+1 where singleton returning revision into r;
 insert into grookai_square.commerce_control_history(revision,enabled,owner_allowlist) values(r,p_enabled,p_owners);
 return r;
end $$;

create function public.square_commerce_workspace_v2() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',exists(select 1 from grookai_square.commerce_controls where enabled and auth.uid()=any(owner_allowlist)),
 'connections',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'autoEnroll',coalesce(p.auto_enroll,false),'sellOnSquare',coalesce(p.sell_on_square,false),
 'allocated',(select count(*) from grookai_square.allocations where connection_id=c.id and state='active'),
 'pending',(select count(*) from grookai_square.allocations where connection_id=c.id and state in ('preparing','withdrawing')),
 'reviews',(select count(*) from grookai_square.allocations where connection_id=c.id and state='review'),
 'sales',(select count(*) from grookai_square.sales where connection_id=c.id),
 'refunds',(select count(*) from grookai_square.refunds where connection_id=c.id),
 'allocations',coalesce((select jsonb_agg(row) from (select ax.target_id as "targetId",vx.gv_vi_id as gvvi,vx.name,ax.state,
  ax.confirmed_quantity as quantity,ax.updated_at as "checkedAt" from grookai_square.allocations ax
  join public.vault_item_instances vx on vx.id=ax.instance_id where ax.connection_id=c.id and ax.state not in ('released','sold')
  order by case when ax.state='review' then 0 else 1 end,ax.updated_at desc limit 50) row),'[]'::jsonb),
 'recentSales',coalesce((select jsonb_agg(row) from (select s.id,s.sale_cents as "saleCents",s.recorded_at as "recordedAt",a.instance_id as "instanceId",
   exists(select 1 from grookai_square.returns where sale_id=s.id) as returned,
   exists(select 1 from grookai_square.refunds where connection_id=c.id and order_id=s.order_id and status='COMPLETED') as "refundReported"
  from grookai_square.sales s join grookai_square.allocations a on a.id=s.allocation_id where s.connection_id=c.id order by s.recorded_at desc limit 20) row),'[]'::jsonb)))
 from grookai_square.connections c left join grookai_square.preferences p on p.connection_id=c.id where c.owner_id=auth.uid()),'[]'::jsonb));
$$;

create function public.square_commerce_service_v2(p_action text,p_data jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare c grookai_square.connections; t grookai_square.targets; a grookai_square.allocations;
 op grookai_square.stock_operations; ctl grookai_square.commerce_controls;
 actor uuid:=(p_data->>'ownerId')::uuid; snapshot jsonb; result jsonb; item record; observation grookai_square.order_observations;
 sale grookai_square.sales; copy public.vault_item_instances; returned public.vault_item_instances; disposition jsonb; ids uuid[]; anchor public.vault_items;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>1200000 then raise exception 'square_invalid_request'; end if;
 if p_action='oauth_start' then
  result:=public.square_service_v1(p_action,p_data);
  if coalesce(p_data->>'clientReturn','web') not in ('web','native') then raise exception 'square_invalid_request'; end if;
  update grookai_square.oauth_attempts set client_return=coalesce(p_data->>'clientReturn','web') where id=(p_data->>'attemptId')::uuid;
  return result;
 elsif p_action='oauth_consume' then
  result:=public.square_service_v1(p_action,p_data);
  return result||jsonb_build_object('clientReturn',(select client_return from grookai_square.oauth_attempts where id=(result->>'id')::uuid));
 elsif p_action='disconnect' then
  select * into c from grookai_square.connections where id=(p_data->>'connectionId')::uuid and owner_id=actor for update;
  if c.id is null then raise exception 'square_connection_not_owned'; end if;
  if exists(select 1 from grookai_square.allocations where connection_id=c.id and state in ('preparing','active','withdrawing','review'))
   or exists(select 1 from grookai_square.stock_operations where connection_id=c.id and status in ('prepared','sending','uncertain')) then raise exception 'square_withdraw_before_disconnect'; end if;
  return public.square_service_v1(p_action,p_data);
 elsif p_action='signal_connection' then
  select * into c from grookai_square.connections where environment=p_data->>'environment' and merchant_id=p_data->>'merchantId' and status='connected';
  return case when c.id is null then '{}'::jsonb else jsonb_build_object('ownerId',c.owner_id,'connectionId',c.id) end;
 elsif p_action not in ('preferences','enroll','allocation','stock_prepare','stock_begin','stock_finish','stock_fail','order_observe','refund_observe','signals','signal_done','return','commerce_connections','commerce_targets','release_stock','stock_sold','order_variations','cursor','stock_cancel_prepared','target_checked','commerce_run_start','commerce_run_finish') then
  return public.square_service_v1(p_action,p_data);
 end if;
 select * into ctl from grookai_square.commerce_controls where singleton;
 if p_action='commerce_connections' then
  return coalesce((select jsonb_agg(jsonb_build_object('ownerId',cx.owner_id,'connectionId',cx.id)) from grookai_square.connections cx
   where cx.environment=p_data->>'environment' and cx.merchant_id is not null and cx.status='connected'
   and (exists(select 1 from grookai_square.preferences where connection_id=cx.id and (auto_enroll or sell_on_square))
    or exists(select 1 from grookai_square.allocations where connection_id=cx.id and state in ('preparing','active','withdrawing','review','sold')))),'[]'::jsonb);
 end if;
 if p_action in ('commerce_run_start','commerce_run_finish') then
  select * into c from grookai_square.connections where id=(p_data->>'connectionId')::uuid and owner_id=actor;
  if c.id is null then raise exception 'square_connection_not_owned'; end if;
  return public.square_worker_run_v1((p_data->>'runId')::uuid,case p_action when 'commerce_run_start' then 'start' else 'finish' end,
   case p_action when 'commerce_run_start' then jsonb_build_object('environment',c.environment) else p_data->'result' end);
 elsif p_action='preferences' then
  select * into c from grookai_square.connections where id=(p_data->>'connectionId')::uuid and owner_id=actor for update;
  if c.id is null then raise exception 'square_connection_not_owned'; end if;
  if p_data->>'confirmed' is distinct from 'true' or not ctl.enabled or not coalesce(actor=any(ctl.owner_allowlist),false)
    or c.status<>'connected' or c.location_id is null then raise exception 'square_sync_disabled'; end if;
  insert into grookai_square.preferences(connection_id,auto_enroll,sell_on_square,consent_at)
   values(c.id,coalesce((p_data->>'autoEnroll')::boolean,false),coalesce((p_data->>'sellOnSquare')::boolean,false),clock_timestamp())
   on conflict(connection_id) do update set auto_enroll=excluded.auto_enroll,sell_on_square=excluded.sell_on_square,consent_at=excluded.consent_at,updated_at=clock_timestamp();
  update grookai_square.connections set auto_sync=coalesce((p_data->>'autoEnroll')::boolean,false) or coalesce((p_data->>'sellOnSquare')::boolean,false) where id=c.id;
  return jsonb_build_object('saved',true);
 end if;
 c:=grookai_square.locked_connection(p_data);
 if p_action='cursor' then
  if (p_data->>'through')::timestamptz>clock_timestamp()+interval '5 seconds' then raise exception 'square_invalid_cursor'; end if;
  update grookai_square.connections set reconcile_cursor=greatest(reconcile_cursor,(p_data->>'through')::timestamptz) where id=c.id;
  return jsonb_build_object('recorded',true);
 elsif p_action='order_variations' then
  if jsonb_typeof(p_data->'variationIds') is distinct from 'array' or jsonb_array_length(p_data->'variationIds')>1000 then raise exception 'square_invalid_request'; end if;
  return coalesce((select jsonb_agg(variation_id) from grookai_square.targets where connection_id=c.id
   and variation_id in (select jsonb_array_elements_text(p_data->'variationIds'))),'[]'::jsonb);
 elsif p_action='commerce_targets' then
  return coalesce((select jsonb_agg(to_jsonb(tx)) from (select tx.id,tx.instance_id,tx.item_id,tx.variation_id,tx.selected,ax.state as allocation_state,ax.created_at as allocated_at
   from grookai_square.targets tx left join grookai_square.allocations ax on ax.target_id=tx.id left join grookai_square.copy_changes qx on qx.instance_id=tx.instance_id where tx.connection_id=c.id
   order by case when tx.instance_id=(p_data->>'focusInstanceId')::uuid then -1 when qx.instance_id is not null and qx.processed_at is null then 0 when ax.state in ('preparing','withdrawing','review') then 1 when ax.state='sold' then 3 else 2 end,tx.updated_at,tx.id limit 1000) tx),'[]'::jsonb);
 elsif p_action='enroll' then
  if not ctl.enabled or not coalesce(actor=any(ctl.owner_allowlist),false) then return jsonb_build_object('enrolled',0); end if;
  if not c.auto_sync or not exists(select 1 from grookai_square.preferences where connection_id=c.id and auto_enroll) then return jsonb_build_object('enrolled',0); end if;
  ids:=array(select v.id from public.vault_item_instances v where v.user_id=actor and v.archived_at is null
   and not exists(select 1 from grookai_square.targets where connection_id=c.id and instance_id=v.id)
   and grookai_square.offer(actor,v.id) is not null order by (v.id=(p_data->>'focusInstanceId')::uuid) desc nulls last,v.created_at,v.id limit 50);
  insert into grookai_square.targets(connection_id,owner_id,instance_id) select c.id,actor,x from unnest(ids) x on conflict do nothing;
  return jsonb_build_object('enrolled',cardinality(ids));
 elsif p_action='signals' then
  return coalesce((select jsonb_agg(to_jsonb(s)-'body_hash') from (select * from grookai_square.signals
   where environment=c.environment and merchant_id=c.merchant_id and processed_at is null order by received_at,event_id limit 25) s),'[]'::jsonb);
 elsif p_action='signal_done' then
  update grookai_square.signals set processed_at=clock_timestamp(),error_code=p_data->>'errorCode'
   where environment=c.environment and merchant_id=c.merchant_id and event_id=p_data->>'eventId';
  return jsonb_build_object('recorded',true);
 elsif p_action='refund_observe' then
  snapshot:=p_data->'evidence';
  if snapshot->>'locationId' is distinct from c.location_id or snapshot->>'currency'<>'USD'
   or snapshot->>'status' not in ('PENDING','APPROVED','REJECTED','FAILED','COMPLETED') then raise exception 'square_refund_unconfirmed'; end if;
  insert into grookai_square.refunds(connection_id,refund_id,order_id,status,amount_cents,evidence_hash)
   values(c.id,snapshot->>'id',snapshot->>'orderId',snapshot->>'status',(snapshot->>'amountCents')::bigint,p_data->>'evidenceHash')
   on conflict(connection_id,refund_id) do update set status=excluded.status,amount_cents=excluded.amount_cents,evidence_hash=excluded.evidence_hash,updated_at=clock_timestamp()
    where grookai_square.refunds.order_id=excluded.order_id and grookai_square.refunds.status<>'COMPLETED';
  return jsonb_build_object('recorded',true);
 elsif p_action='order_observe' then
  snapshot:=p_data->'evidence';
  if snapshot->>'locationId' is distinct from c.location_id or snapshot->>'currency' is distinct from 'USD'
   or snapshot->>'state' not in ('pending','paid','canceled','refunded','review') or jsonb_typeof(snapshot->'lines') is distinct from 'array'
   or jsonb_array_length(snapshot->'lines')>1000 then raise exception 'square_order_unconfirmed'; end if;
  insert into grookai_square.order_observations(connection_id,order_id,evidence_hash,evidence,state,error_code)
   values(c.id,snapshot->>'id',p_data->>'evidenceHash',snapshot,snapshot->>'state',snapshot->>'errorCode')
   on conflict(connection_id,order_id,evidence_hash) do nothing;
  select * into strict observation from grookai_square.order_observations where connection_id=c.id and order_id=snapshot->>'id' and evidence_hash=p_data->>'evidenceHash';
  if observation.state<>'paid' then return jsonb_build_object('recorded',true,'sales',0,'state',observation.state); end if;
  -- All exact-copy locks precede claim transitions. Same business effect recovers
  -- its durable sale even after feature pause or a later refund notification.
  perform 1 from public.vault_item_instances v join grookai_square.targets tx on tx.instance_id=v.id
   where tx.connection_id=c.id and tx.variation_id in (select value->>'variationId' from jsonb_array_elements(snapshot->'lines')) order by v.id for update of v;
  for item in select value as line from jsonb_array_elements(snapshot->'lines') loop
   select * into t from grookai_square.targets where connection_id=c.id and variation_id=item.line->>'variationId';
   if t.id is null then continue; end if;
   select * into sale from grookai_square.sales where connection_id=c.id and order_id=snapshot->>'id' and line_id=item.line->>'id';
   if sale.id is not null then
    if sale.sale_cents is distinct from (item.line->>'saleCents')::bigint then raise exception 'square_sale_evidence_changed'; end if;
    continue;
   end if;
   select * into a from grookai_square.allocations where target_id=t.id for update;
   if item.line->>'quantity' is distinct from '1' or (item.line->>'saleCents')::bigint not between 1 and 100000000
    or a.id is null or a.state not in ('preparing','active','withdrawing','review') then raise exception 'square_sale_requires_review'; end if;
   select * into copy from public.vault_item_instances where id=a.instance_id and user_id=c.owner_id and archived_at is null;
   if copy.id is null then raise exception 'square_sale_requires_review'; end if;
   -- Release only this Square claim inside the same transaction that writes the
   -- shared canonical disposition. Other provider claims still reject the write.
   update grookai_square.allocations set state='sold',confirmed_quantity=0,updated_at=clock_timestamp() where id=a.id;
   disposition:=grookai_inventory.record_exact_instance_disposition_v3(c.owner_id,a.instance_id,'sale',
    (item.line->>'saleCents')::numeric/100,'USD','Square',null,null,null,null);
   insert into grookai_square.sales(connection_id,allocation_id,order_id,line_id,sale_cents,tax_cents,disposition_id,observation_id)
    values(c.id,a.id,snapshot->>'id',item.line->>'id',(item.line->>'saleCents')::bigint,coalesce((item.line->>'taxCents')::bigint,0),(disposition->>'disposition_id')::uuid,observation.id);
  end loop;
  return jsonb_build_object('recorded',true,'state','paid','sales',(select count(*) from grookai_square.sales where connection_id=c.id and order_id=snapshot->>'id'));
 elsif p_action='return' then
  select * into sale from grookai_square.sales where id=(p_data->>'saleId')::uuid and connection_id=c.id;
  if sale.id is null or p_data->>'confirmed' is distinct from 'true' then raise exception 'square_return_confirmation_required'; end if;
  if exists(select 1 from grookai_square.returns where sale_id=sale.id) then
   return jsonb_build_object('returned',true,'instanceId',(select returned_instance_id from grookai_square.returns where sale_id=sale.id)); end if;
  if not exists(select 1 from grookai_square.refunds where connection_id=c.id and order_id=sale.order_id and status='COMPLETED') then raise exception 'square_completed_refund_required'; end if;
  select v.* into strict copy from public.vault_item_instances v join grookai_square.allocations ax on ax.instance_id=v.id where ax.id=sale.allocation_id for update of v;
  if copy.slab_cert_id is not null then raise exception 'square_graded_return_requires_intake_review'; end if;
  anchor:=public.resolve_active_vault_anchor_v1(p_user_id=>c.owner_id,p_card_print_id=>copy.card_print_id,
   p_gv_id=>(select gv_id from public.card_prints where id=copy.card_print_id),p_name=>copy.name,p_create_if_missing=>true);
  returned:=public.admin_vault_instance_create_v1(p_user_id=>c.owner_id,p_card_print_id=>copy.card_print_id,p_card_printing_id=>copy.card_printing_id,
   p_legacy_vault_item_id=>anchor.id,p_condition_label=>copy.condition_label,p_name=>(select name from public.card_prints where id=copy.card_print_id),
   p_notes=>'Returned from a refunded Square sale. Original sale history is retained.');
  update public.vault_items set qty=(select count(*) from public.vault_item_instances vx left join public.slab_certs sx on sx.id=vx.slab_cert_id
   where vx.user_id=c.owner_id and vx.archived_at is null and coalesce(vx.card_print_id,sx.card_print_id)=copy.card_print_id),archived_at=null where id=anchor.id;
  if returned.gv_vi_id is null or returned.gv_vi_id=copy.gv_vi_id or returned.legacy_vault_item_id is distinct from anchor.id then raise exception 'square_return_readback_unconfirmed'; end if;
  insert into grookai_square.returns(sale_id,returned_instance_id,owner_id) values(sale.id,returned.id,c.owner_id);
  return jsonb_build_object('returned',true,'instanceId',returned.id,'gvvi',returned.gv_vi_id);
 end if;
 select * into t from grookai_square.targets where id=(p_data->>'targetId')::uuid and connection_id=c.id for update;
 if t.id is null then raise exception 'square_target_not_owned'; end if;
 select * into a from grookai_square.allocations where target_id=t.id for update;
 if p_action='target_checked' then
  update grookai_square.targets set updated_at=clock_timestamp() where id=t.id;
  update grookai_square.copy_changes set processed_at=clock_timestamp() where instance_id=t.instance_id and owner_id=c.owner_id
   and changed_at<=coalesce((p_data->>'checkedThrough')::timestamptz,'-infinity'::timestamptz);
  return jsonb_build_object('recorded',true);
 elsif p_action='stock_cancel_prepared' then
  select * into op from grookai_square.stock_operations where allocation_id=a.id and status='prepared' and kind='allocate' for update;
  if op.id is null then raise exception 'square_reconciliation_required'; end if;
  update grookai_square.stock_operations set status='failed',error_code='square_source_changed_before_send',finished_at=clock_timestamp() where id=op.id;
  update grookai_square.allocations set state='released',released_at=clock_timestamp(),release_reason='never_sent',updated_at=clock_timestamp() where id=a.id;
  return jsonb_build_object('canceled',true);
 elsif p_action='release_stock' then
  if p_data->>'confirmed' is distinct from 'true' or a.state is distinct from 'review' or a.confirmed_quantity is distinct from 0
   or p_data->>'physicalCopyPresent' is distinct from 'true' or p_data->>'registerOnline' is distinct from 'true'
   or exists(select 1 from grookai_square.sales where allocation_id=a.id)
   or exists(select 1 from grookai_square.stock_operations where allocation_id=a.id and status in ('prepared','sending','uncertain')) then
   raise exception 'square_stock_release_confirmation_required'; end if;
  update grookai_square.allocations set state='released',released_at=clock_timestamp(),updated_at=clock_timestamp(),release_reason='owner_confirmed_online_register_and_physical_copy' where id=a.id;
  update grookai_square.targets set selected=false,updated_at=clock_timestamp() where id=t.id;
  return jsonb_build_object('released',true);
 elsif p_action='stock_sold' then
  if a.state is distinct from 'sold' or not exists(select 1 from grookai_square.sales where allocation_id=a.id) then raise exception 'square_sale_unconfirmed'; end if;
  update grookai_square.stock_operations set status='succeeded',receipt=jsonb_build_object('recoveredBySale',true,'quantity',0),finished_at=clock_timestamp()
   where allocation_id=a.id and kind='allocate' and status in ('sending','uncertain');
  return jsonb_build_object('recorded',true);
 elsif p_action='allocation' then
  return jsonb_build_object('target',to_jsonb(t),'allocation',to_jsonb(a),'offer',grookai_square.offer(actor,t.instance_id),
   'sellEnabled',ctl.enabled and coalesce(actor=any(ctl.owner_allowlist),false) and t.selected
    and exists(select 1 from grookai_square.preferences where connection_id=c.id and sell_on_square),
   'pending',(select to_jsonb(x) from grookai_square.stock_operations x where allocation_id=a.id and status in ('prepared','sending','uncertain') limit 1));
 elsif p_action='stock_prepare' then
  if t.item_id is null or t.variation_id is null or jsonb_typeof(p_data->'payload') is distinct from 'object' then raise exception 'square_stock_not_ready'; end if;
  select * into copy from public.vault_item_instances where id=t.instance_id and user_id=actor for update;
  if p_data->>'kind'='allocate' then
   if not ctl.enabled or not coalesce(actor=any(ctl.owner_allowlist),false) or not t.selected
    or not exists(select 1 from grookai_square.preferences where connection_id=c.id and sell_on_square) then raise exception 'square_sync_disabled'; end if;
   snapshot:=grookai_square.offer(actor,t.instance_id);
   if snapshot is null or snapshot is distinct from p_data->'sourceSnapshot' or copy.archived_at is not null
    or public.vendor_stock_live_quantity_v1(copy.id,null)>0
    or exists(select 1 from public.ebay_seller_reservations_v1 where instance_id=copy.id and released_at is null)
    or exists(select 1 from public.vault_item_instance_dispositions where vault_item_instance_id=copy.id)
    then raise exception 'square_stock_unavailable'; end if;
   if a.id is not null and a.state<>'released' then raise exception 'square_stock_already_claimed'; end if;
   insert into grookai_square.allocations(target_id,connection_id,instance_id,state,source_snapshot)
    values(t.id,c.id,t.instance_id,'preparing',snapshot) on conflict(target_id) do update set state='preparing',source_snapshot=excluded.source_snapshot,confirmed_quantity=null,released_at=null,release_reason=null returning * into a;
  elsif p_data->>'kind'='withdraw' then
   if a.id is null or a.state not in ('preparing','active','review','withdrawing','sold') then raise exception 'square_stock_not_allocated'; end if;
   if a.state<>'sold' then update grookai_square.allocations set state='withdrawing',updated_at=clock_timestamp() where id=a.id returning * into a; end if;
  else raise exception 'square_invalid_request'; end if;
  snapshot:=p_data->'payload';
  if snapshot#>>'{changes,0,type}' is distinct from 'PHYSICAL_COUNT' or jsonb_array_length(snapshot->'changes')<>1
   or snapshot#>>'{changes,0,physical_count,catalog_object_id}' is distinct from t.variation_id
   or snapshot#>>'{changes,0,physical_count,location_id}' is distinct from c.location_id
   or snapshot#>>'{changes,0,physical_count,state}' is distinct from 'IN_STOCK'
   or snapshot#>>'{changes,0,physical_count,quantity}' is distinct from (case p_data->>'kind' when 'allocate' then '1' else '0' end)
   or nullif(snapshot->>'idempotency_key','') is null then raise exception 'square_invalid_stock_request'; end if;
  insert into grookai_square.stock_operations(connection_id,allocation_id,kind,payload,source_snapshot) values(c.id,a.id,p_data->>'kind',snapshot,a.source_snapshot) returning * into op;
  return to_jsonb(op);
 end if;
 select * into op from grookai_square.stock_operations where id=(p_data->>'operationId')::uuid and connection_id=c.id and allocation_id=a.id for update;
 if op.id is null then raise exception 'square_stock_operation_missing'; end if;
 if p_action='stock_begin' then
  if op.status not in ('prepared','sending','uncertain') then raise exception 'square_stock_operation_terminal'; end if;
  update grookai_square.stock_operations set status='sending' where id=op.id returning * into op; return to_jsonb(op);
 elsif p_action='stock_fail' then
  update grookai_square.stock_operations set status=case when coalesce((p_data->>'uncertain')::boolean,true) then 'uncertain' else 'failed' end,error_code=p_data->>'errorCode' where id=op.id and status<>'succeeded';
  -- Even a definitive provider rejection retains the claim for explicit review.
  update grookai_square.allocations set state='review',updated_at=clock_timestamp() where id=a.id and state<>'sold';
  return jsonb_build_object('recorded',true);
 elsif p_action='stock_finish' then
  if (p_data->>'quantity')::integer is distinct from (case op.kind when 'allocate' then 1 else 0 end) then raise exception 'square_stock_readback_unconfirmed'; end if;
  if op.status='succeeded' then return jsonb_build_object('recorded',true); end if;
  if op.status not in ('sending','uncertain') then raise exception 'square_stock_operation_not_started'; end if;
  update grookai_square.stock_operations set status='succeeded',receipt=jsonb_build_object('quantity',(p_data->>'quantity')::integer),finished_at=clock_timestamp() where id=op.id;
  update grookai_square.allocations set state=case when state='sold' then state when op.kind='allocate' then 'active' else 'review' end,
   confirmed_quantity=(p_data->>'quantity')::integer,updated_at=clock_timestamp(),
   release_reason=case when op.kind='withdraw' then 'square_zero_confirmed_pending_offline_sale_review' else release_reason end where id=a.id;
  return jsonb_build_object('recorded',true,'state',case op.kind when 'allocate' then 'active' else 'review' end);
 end if;
 raise exception 'square_invalid_request';
end $$;

create function public.square_signal_record_v2(p_environment text,p_event_id text,p_merchant_id text,p_type text,p_resource_id text,p_body_hash text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
begin
 if p_event_id !~ '^[A-Za-z0-9_-]{1,150}$' or p_merchant_id !~ '^[A-Za-z0-9_-]{1,100}$' or p_resource_id !~ '^[A-Za-z0-9_-]{1,150}$' then raise exception 'square_invalid_signal'; end if;
 insert into grookai_square.signals(environment,event_id,merchant_id,resource_type,resource_id,body_hash)
  values(p_environment,p_event_id,p_merchant_id,p_type,p_resource_id,p_body_hash) on conflict do nothing;
 return true;
end $$;
create function public.square_commerce_health_v2(p_environment text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version','SQUARE_COMMERCE_HEALTH_V2','environment',p_environment,
 'controls',(select jsonb_build_object('enabled',enabled,'revision',revision,'owners',cardinality(owner_allowlist)) from grookai_square.commerce_controls where singleton),
 'allocated',(select count(*) from grookai_square.allocations ax join grookai_square.connections cx on cx.id=ax.connection_id where cx.environment=p_environment and ax.state='active'),
 'reviewClaims',(select count(*) from grookai_square.allocations ax join grookai_square.connections cx on cx.id=ax.connection_id where cx.environment=p_environment and ax.state='review'),
 'pendingStock',(select count(*) from grookai_square.stock_operations ox join grookai_square.connections cx on cx.id=ox.connection_id where cx.environment=p_environment and ox.status in ('prepared','sending','uncertain')),
 'oldSignals',(select count(*) from grookai_square.signals where environment=p_environment and processed_at is null and received_at<statement_timestamp()-interval '5 minutes'),
 'reconnectRequired',(select count(*) from grookai_square.connections where environment=p_environment and status='reconnect_required'),
 'targetErrors',(select count(*) from grookai_square.targets tx join grookai_square.connections cx on cx.id=tx.connection_id where cx.environment=p_environment and tx.last_error is not null),
 'lastRun',(select jsonb_build_object('status',status,'startedAt',started_at,'finishedAt',finished_at,'errorCode',error_code) from grookai_square.worker_runs where environment=p_environment order by started_at desc,id desc limit 1));
$$;
revoke all on all functions in schema grookai_square from public,anon,authenticated,service_role;
revoke all on function public.square_commerce_service_v2(text,jsonb),public.square_commerce_workspace_v2(),
 public.square_commerce_controls_set_v2(bigint,boolean,uuid[]),public.square_signal_record_v2(text,text,text,text,text,text) from public,anon,authenticated,service_role;
revoke all on function public.square_commerce_health_v2(text) from public,anon,authenticated,service_role;
grant execute on function public.square_commerce_workspace_v2() to authenticated;
grant execute on function public.square_commerce_service_v2(text,jsonb),public.square_commerce_controls_set_v2(bigint,boolean,uuid[]),
 public.square_signal_record_v2(text,text,text,text,text,text) to service_role;
grant execute on function public.square_commerce_health_v2(text) to service_role;
notify pgrst,'reload schema';
commit;

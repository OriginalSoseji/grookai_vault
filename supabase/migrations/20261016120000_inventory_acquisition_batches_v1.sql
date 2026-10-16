begin;

-- Exact-copy acquisition ledger. GVVI remains the identity anchor: every line points to
-- one vault_item_instances row, never to a grouped card quantity.
alter table public.vault_item_instances
  add column if not exists acquisition_date timestamptz null,
  add column if not exists acquisition_method text null,
  add column if not exists acquisition_batch_id uuid null;

alter table public.vault_item_instances
  drop constraint if exists vault_item_instances_acquisition_method_check;
alter table public.vault_item_instances
  add constraint vault_item_instances_acquisition_method_check
  check (acquisition_method is null or acquisition_method in ('purchase','trade','backfill','import','manual'));

create index if not exists vault_item_instances_owner_acquisition_date_idx
  on public.vault_item_instances (user_id, acquisition_date asc nulls first, created_at asc)
  where archived_at is null;

create table if not exists public.inventory_acquisition_batches (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_receipt_id uuid null,
  purchased_at timestamptz not null,
  total_paid_minor bigint not null check (total_paid_minor >= 0 and total_paid_minor <= 100000000000),
  currency text not null default 'USD' check (currency = 'USD'),
  allocation_method text not null check (allocation_method in ('equal_split','weighted_reference','manual','per_line','backfill')),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table if not exists public.inventory_acquisition_batch_lines (
  batch_id uuid not null references public.inventory_acquisition_batches(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  instance_id uuid not null references public.vault_item_instances(id) on delete restrict,
  gvvi_id text not null,
  allocated_cost_minor bigint not null check (allocated_cost_minor >= 0 and allocated_cost_minor <= 100000000000),
  created_at timestamptz not null default now(),
  primary key (batch_id, instance_id),
  unique (owner_id, instance_id)
);

alter table public.vault_item_instances
  drop constraint if exists vault_item_instances_acquisition_batch_fk;
alter table public.vault_item_instances
  add constraint vault_item_instances_acquisition_batch_fk
  foreign key (acquisition_batch_id) references public.inventory_acquisition_batches(id) on delete set null;

create index if not exists inventory_acquisition_batches_owner_date_idx
  on public.inventory_acquisition_batches(owner_id, purchased_at desc);
create index if not exists inventory_acquisition_batch_lines_owner_idx
  on public.inventory_acquisition_batch_lines(owner_id, created_at desc);

alter table public.inventory_acquisition_batches enable row level security;
alter table public.inventory_acquisition_batch_lines enable row level security;
drop policy if exists inventory_acquisition_batches_owner_read_v1 on public.inventory_acquisition_batches;
drop policy if exists inventory_acquisition_batch_lines_owner_read_v1 on public.inventory_acquisition_batch_lines;
create policy inventory_acquisition_batches_owner_read_v1 on public.inventory_acquisition_batches
  for select to authenticated using (owner_id = auth.uid());
create policy inventory_acquisition_batch_lines_owner_read_v1 on public.inventory_acquisition_batch_lines
  for select to authenticated using (owner_id = auth.uid());
revoke all on public.inventory_acquisition_batches from anon;
revoke all on public.inventory_acquisition_batch_lines from anon;
grant select on public.inventory_acquisition_batches to authenticated;
grant select on public.inventory_acquisition_batch_lines to authenticated;

-- Cost edits made by older flows still get a date and provenance. Purchase/trade
-- capture below upgrades the method to the stronger transaction-specific value.
create or replace function public.inventory_acquisition_cost_provenance_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.acquisition_cost is distinct from old.acquisition_cost
     or new.acquisition_currency is distinct from old.acquisition_currency then
    if new.acquisition_date is null then new.acquisition_date := coalesce(old.acquisition_date, old.created_at, clock_timestamp()); end if;
    if new.acquisition_method is null then new.acquisition_method := 'manual'; end if;
  end if;
  return new;
end $$;
drop trigger if exists vault_item_instances_acquisition_provenance_v1 on public.vault_item_instances;
create trigger vault_item_instances_acquisition_provenance_v1
before update of acquisition_cost, acquisition_currency on public.vault_item_instances
for each row execute function public.inventory_acquisition_cost_provenance_v1();

create or replace function public.inventory_acquisition_batch_save_v1(
  p_batch_id uuid,
  p_source_receipt_id uuid,
  p_purchased_at timestamptz,
  p_total_paid_minor bigint,
  p_allocation_method text,
  p_lines jsonb,
  p_note text default ''
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid(); line jsonb; instance_id uuid; gvvi text; amount bigint;
  ids uuid[] := '{}'; total bigint := 0; item public.vault_item_instances%rowtype;
  prior public.inventory_acquisition_batches%rowtype; count_lines integer;
  result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_batch_id is null or p_purchased_at is null or p_total_paid_minor is null
     or p_total_paid_minor < 0 or p_total_paid_minor > 100000000000
     or p_allocation_method not in ('equal_split','weighted_reference','manual','per_line','backfill')
     or jsonb_typeof(p_lines) is distinct from 'array'
     or jsonb_array_length(p_lines) not between 1 and 1000
     or p_note is null or length(p_note) > 500 then
    raise exception 'Invalid acquisition batch' using errcode='22023';
  end if;
  select * into prior from public.inventory_acquisition_batches where owner_id=actor and id=p_batch_id;
  if found then
    select jsonb_build_object('batchId', prior.id, 'purchasedAt', prior.purchased_at,
      'totalPaidMinor', prior.total_paid_minor, 'allocationMethod', prior.allocation_method,
      'lineCount', count(*)) into result
      from public.inventory_acquisition_batch_lines where owner_id=actor and batch_id=prior.id;
    return result;
  end if;
  count_lines := jsonb_array_length(p_lines);
  for line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(line) is distinct from 'object'
       or line - array['instanceId','gvviId','allocatedMinor'] <> '{}'::jsonb
       or jsonb_typeof(line->'instanceId') is distinct from 'string'
       or jsonb_typeof(line->'gvviId') is distinct from 'string'
       or jsonb_typeof(line->'allocatedMinor') is distinct from 'number'
       or coalesce(line->>'allocatedMinor','') !~ '^\d{1,12}$' then
      raise exception 'Invalid acquisition batch line' using errcode='22023';
    end if;
    instance_id := (line->>'instanceId')::uuid;
    gvvi := btrim(line->>'gvviId'); amount := (line->>'allocatedMinor')::bigint;
    if instance_id = any(ids) or length(gvvi) = 0 or length(gvvi) > 200 or amount < 0 then
      raise exception 'Repeated or invalid acquisition copy' using errcode='22023';
    end if;
    ids := array_append(ids, instance_id); total := total + amount;
    if total > 100000000000 then raise exception 'Acquisition total is too large' using errcode='22023'; end if;
  end loop;
  if p_total_paid_minor <> total and p_allocation_method <> 'backfill' then
    raise exception 'Allocated costs must equal the purchase total' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('acquisition:'||actor::text||':'||p_batch_id::text,0));
  insert into public.inventory_acquisition_batches(id,owner_id,source_receipt_id,purchased_at,total_paid_minor,allocation_method,note)
    values(p_batch_id,actor,p_source_receipt_id,p_purchased_at,p_total_paid_minor,p_allocation_method,btrim(p_note));
  for line in select value from jsonb_array_elements(p_lines) loop
    instance_id := (line->>'instanceId')::uuid; gvvi := btrim(line->>'gvviId'); amount := (line->>'allocatedMinor')::bigint;
    select * into item from public.vault_item_instances where id=instance_id and user_id=actor and archived_at is null for update;
    if not found or item.gv_vi_id is distinct from gvvi then raise exception 'GVVI does not match this owned copy' using errcode='PT409'; end if;
    if item.acquisition_batch_id is not null and p_allocation_method <> 'backfill' then
      raise exception 'Copy already belongs to an acquisition batch' using errcode='PT409';
    end if;
    insert into public.inventory_acquisition_batch_lines(batch_id,owner_id,instance_id,gvvi_id,allocated_cost_minor)
      values(p_batch_id,actor,instance_id,gvvi,amount);
    update public.vault_item_instances
      set acquisition_cost=(amount::numeric/100), acquisition_currency='USD',
          acquisition_date=p_purchased_at, acquisition_method=case when p_allocation_method='backfill' then 'backfill' else 'purchase' end,
          acquisition_batch_id=p_batch_id
      where id=instance_id and user_id=actor;
  end loop;
  return jsonb_build_object('batchId',p_batch_id,'purchasedAt',p_purchased_at,'totalPaidMinor',p_total_paid_minor,
    'allocationMethod',p_allocation_method,'lineCount',count_lines);
exception when unique_violation then
  raise exception 'One or more copies already have acquisition history' using errcode='PT409';
end $$;
revoke all on function public.inventory_acquisition_batch_save_v1(uuid,uuid,timestamptz,bigint,text,jsonb,text) from public,anon;
grant execute on function public.inventory_acquisition_batch_save_v1(uuid,uuid,timestamptz,bigint,text,jsonb,text) to authenticated;

create or replace function public.inventory_acquisition_batches_read_v1(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_sort text default 'oldest',
  p_limit integer default 100
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid := auth.uid(); rows jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_limit is null or p_limit not between 1 and 500 or p_sort not in ('oldest','newest') then raise exception 'Invalid acquisition filter' using errcode='22023'; end if;
  with selected as (
    select i.*, cp.name as card_name, cp.set_code as card_set_code, cp.number as card_number
    from public.vault_item_instances i
    left join public.card_prints cp on cp.id=i.card_print_id
    where i.user_id=actor and i.archived_at is null
      and (p_from is null or coalesce(i.acquisition_date,i.created_at) >= p_from)
      and (p_to is null or coalesce(i.acquisition_date,i.created_at) < p_to)
    order by case when p_sort='oldest' then coalesce(i.acquisition_date,i.created_at) end asc nulls first,
      case when p_sort='newest' then coalesce(i.acquisition_date,i.created_at) end desc nulls last, i.id
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'instanceId', selected.id, 'gvviId', selected.gv_vi_id, 'cardPrintId', selected.card_print_id,
    'name', coalesce(selected.card_name,selected.name,'Unknown card'), 'setCode', coalesce(selected.card_set_code,selected.set_name,'—'),
    'number', coalesce(selected.card_number,'—'), 'condition', coalesce(selected.condition_label,'Unknown'),
    'acquisitionCost', public.vendor_cost_classify_v1(selected.acquisition_cost,selected.acquisition_currency),
    'acquisitionDate', coalesce(selected.acquisition_date,selected.created_at), 'acquisitionMethod', selected.acquisition_method,
    'batchId', selected.acquisition_batch_id, 'marketPrice', selected.market_price
  ) order by case when p_sort='oldest' then coalesce(selected.acquisition_date,selected.created_at) end asc nulls first,
    case when p_sort='newest' then coalesce(selected.acquisition_date,selected.created_at) end desc nulls last, selected.id),'[]'::jsonb)
  into rows from selected;
  return jsonb_build_object('ownerId',actor,'from',p_from,'to',p_to,'sort',p_sort,'items',rows);
end $$;
revoke all on function public.inventory_acquisition_batches_read_v1(timestamptz,timestamptz,text,integer) from public,anon;
grant execute on function public.inventory_acquisition_batches_read_v1(timestamptz,timestamptz,text,integer) to authenticated;

-- Existing purchase receipts are upgraded into the ledger automatically. The
-- whole receipt remains the cash outlay; per-copy lines are exact COG evidence.
create or replace function public.vendor_purchase_acquisition_capture_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; instance_id uuid; line_count integer := 0; batch_id uuid := new.request_id;
begin
  if new.receipt->>'kind' <> 'purchase' then return new; end if;
  select count(*) into line_count from jsonb_array_elements(new.receipt->'items') x where x->>'instanceId' is not null and x->>'instanceId' <> '';
  if line_count = 0 then return new; end if;
  insert into public.inventory_acquisition_batches(id,owner_id,source_receipt_id,purchased_at,total_paid_minor,allocation_method,note)
    values(batch_id,new.owner_id,new.request_id,(new.receipt->>'createdAt')::timestamptz,(new.receipt->>'purchaseMinor')::bigint,'per_line','Captured from purchase receipt')
    on conflict (id) do nothing;
  for item in select value from jsonb_array_elements(new.receipt->'items') loop
    if item->>'instanceId' is not null and item->>'instanceId' <> '' then
      instance_id := (item->>'instanceId')::uuid;
      insert into public.inventory_acquisition_batch_lines(batch_id,owner_id,instance_id,gvvi_id,allocated_cost_minor)
        values(batch_id,new.owner_id,instance_id,item->>'gvviId',(item->>'unitMinor')::bigint)
        on conflict (batch_id,instance_id) do nothing;
      update public.vault_item_instances set acquisition_date=(new.receipt->>'createdAt')::timestamptz,
        acquisition_method='purchase', acquisition_batch_id=batch_id
        where id=instance_id and user_id=new.owner_id;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists vendor_sales_purchase_acquisition_capture on public.vendor_sales_cart_receipts;
create trigger vendor_sales_purchase_acquisition_capture
  after insert on public.vendor_sales_cart_receipts for each row execute function public.vendor_purchase_acquisition_capture_v1();
revoke all on function public.vendor_purchase_acquisition_capture_v1() from public,anon,authenticated;

-- Negotiated trade-ins already write the trade credit into acquisition_cost.
-- Preserve that exact consideration while labeling the source and date.
create or replace function public.vendor_trade_acquisition_provenance_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; instance_id uuid;
begin
  if new.receipt->'tradeIn' is null then return new; end if;
  for item in select value from jsonb_array_elements(new.receipt->'tradeIn'->'items') loop
    if item->>'instanceId' is not null and item->>'instanceId' <> '' then
      instance_id := (item->>'instanceId')::uuid;
      update public.vault_item_instances
        set acquisition_date=(new.receipt->>'createdAt')::timestamptz,
            acquisition_method='trade'
        where id=instance_id and user_id=new.owner_id and archived_at is null;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists vendor_sales_trade_acquisition_provenance on public.vendor_sales_cart_receipts;
create trigger vendor_sales_trade_acquisition_provenance
  after insert on public.vendor_sales_cart_receipts for each row execute function public.vendor_trade_acquisition_provenance_v1();
revoke all on function public.vendor_trade_acquisition_provenance_v1() from public,anon,authenticated;

-- This rollout is explicitly requested for the owner's Sales Desk.
update public.vendor_purchase_control set enabled=true where singleton;

commit;

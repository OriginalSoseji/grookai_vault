begin;

alter table public.vault_item_instance_dispositions
  add column if not exists counterparty_label text null,
  add column if not exists sale_price_amount numeric null,
  add column if not exists sale_price_currency text null,
  add column if not exists trade_received_description text null,
  add column if not exists trade_cash_direction text null,
  add column if not exists trade_cash_amount numeric null,
  add column if not exists trade_cash_currency text null;

alter table public.vault_item_instance_dispositions
  drop constraint if exists vault_item_instance_dispositions_counterparty_length,
  add constraint vault_item_instance_dispositions_counterparty_length
    check (
      counterparty_label is null
      or (
        btrim(counterparty_label) <> ''
        and char_length(counterparty_label) <= 120
      )
    ),
  drop constraint if exists vault_item_instance_dispositions_sale_price,
  add constraint vault_item_instance_dispositions_sale_price
    check (
      sale_price_amount is null
      or sale_price_amount > 0
    ),
  drop constraint if exists vault_item_instance_dispositions_sale_price_pair,
  add constraint vault_item_instance_dispositions_sale_price_pair
    check (
      (sale_price_amount is null and sale_price_currency is null)
      or
      (
        sale_price_amount is not null
        and sale_price_currency = upper(sale_price_currency)
        and char_length(sale_price_currency) = 3
      )
    ),
  drop constraint if exists vault_item_instance_dispositions_trade_description,
  add constraint vault_item_instance_dispositions_trade_description
    check (
      trade_received_description is null
      or (
        btrim(trade_received_description) <> ''
        and char_length(trade_received_description) <= 1000
      )
    ),
  drop constraint if exists vault_item_instance_dispositions_trade_cash_direction,
  add constraint vault_item_instance_dispositions_trade_cash_direction
    check (
      trade_cash_direction is null
      or trade_cash_direction in ('received', 'paid')
    ),
  drop constraint if exists vault_item_instance_dispositions_trade_cash_amount,
  add constraint vault_item_instance_dispositions_trade_cash_amount
    check (
      trade_cash_amount is null
      or trade_cash_amount > 0
    ),
  drop constraint if exists vault_item_instance_dispositions_trade_cash_pair,
  add constraint vault_item_instance_dispositions_trade_cash_pair
    check (
      (
        trade_cash_direction is null
        and trade_cash_amount is null
        and trade_cash_currency is null
      )
      or
      (
        trade_cash_direction in ('received', 'paid')
        and trade_cash_amount is not null
        and trade_cash_currency = upper(trade_cash_currency)
        and char_length(trade_cash_currency) = 3
      )
    ),
  drop constraint if exists vault_item_instance_dispositions_payload_by_type,
  add constraint vault_item_instance_dispositions_payload_by_type
    check (
      (
        disposition_type = 'sale'
        and sale_price_amount is not null
        and trade_received_description is null
        and trade_cash_direction is null
        and trade_cash_amount is null
        and trade_cash_currency is null
      )
      or
      (
        disposition_type = 'trade'
        and sale_price_amount is null
        and sale_price_currency is null
        and trade_received_description is not null
      )
    ) not valid;

alter table public.vault_item_instance_dispositions
  validate constraint vault_item_instance_dispositions_payload_by_type;

revoke all on function public.vault_dispose_exact_instance_v1(uuid, text)
from public, anon, authenticated, service_role;
drop function public.vault_dispose_exact_instance_v1(uuid, text);

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
as $$
declare
  v_uid uuid := auth.uid();
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

  v_archive := public.vault_archive_exact_instance_v1(v_instance.id);

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

revoke all on function public.vault_record_exact_instance_disposition_v2(
  uuid, text, numeric, text, text, text, text, numeric, text
) from public, anon;
grant execute on function public.vault_record_exact_instance_disposition_v2(
  uuid, text, numeric, text, text, text, text, numeric, text
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;

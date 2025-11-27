-- Implements admin.import_prices_do v1 for canonical price ingestion into card_price_observations.
-- Legacy price tables are intentionally ignored; invalid rows are routed to unmatched_price_rows.

create or replace function admin.import_prices_do(_payload jsonb, _bridge_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, admin, extensions
as $function$
declare
  rows jsonb := coalesce(_payload->'rows', '[]'::jsonb);
  item jsonb;
  inserted_count integer := 0;
  unmatched_count integer := 0;
  reason text;
  v_card_print_id uuid;
  v_value numeric;
  v_source_id text;
  v_observed_at timestamptz;
  v_currency price_currency;
  v_currency_text text;
  v_kind price_kind;
  v_kind_text text;
  v_qty integer;
  v_meta jsonb;
begin
  if _bridge_token is distinct from current_setting('app.bridge_token', true) then
    raise exception 'unauthorized bridge token';
  end if;

  if jsonb_typeof(rows) <> 'array' then
    rows := '[]'::jsonb;
  end if;

  for item in
    select value from jsonb_array_elements(rows) as t(value)
  loop
    reason := null;
    v_card_print_id := null;
    v_value := null;
    v_source_id := null;
    v_observed_at := now();
    v_currency := 'USD';
    v_kind := 'sold';
    v_qty := 1;
    v_meta := '{}'::jsonb;

    if jsonb_typeof(item) <> 'object' then
      reason := 'invalid_row_shape';
    end if;

    if reason is null then
      if coalesce(item->>'card_print_id', '') = '' then
        reason := 'missing_card_print_id';
      else
        begin
          v_card_print_id := (item->>'card_print_id')::uuid;
        exception
          when others then
            reason := 'invalid_card_print_id';
        end;
      end if;
    end if;

    if reason is null then
      if coalesce(item->>'value', '') = '' then
        reason := 'missing_value';
      else
        begin
          v_value := (item->>'value')::numeric;
          if v_value <= 0 then
            reason := 'invalid_value';
          end if;
        exception
          when others then
            reason := 'invalid_value';
        end;
      end if;
    end if;

    if reason is null then
      v_source_id := nullif(item->>'source_id', '');
      if v_source_id is null then
        reason := 'missing_source_id';
      elsif not exists (select 1 from price_sources where id = v_source_id) then
        reason := 'unknown_source_id';
      end if;
    end if;

    if reason is null and item ? 'observed_at' then
      begin
        v_observed_at := (item->>'observed_at')::timestamptz;
      exception
        when others then
          reason := 'invalid_observed_at';
      end;
    end if;

    if reason is null then
      v_currency_text := coalesce(nullif(item->>'currency', ''), 'USD');
      begin
        v_currency := v_currency_text::price_currency;
      exception
        when others then
          reason := 'invalid_currency';
      end;
    end if;

    if reason is null then
      v_kind_text := coalesce(nullif(item->>'kind', ''), 'sold');
      begin
        v_kind := v_kind_text::price_kind;
      exception
        when others then
          reason := 'invalid_kind';
      end;
    end if;

    if reason is null and item ? 'qty' then
      begin
        v_qty := (item->>'qty')::integer;
        if v_qty <= 0 then
          reason := 'invalid_qty';
        end if;
      exception
        when others then
          reason := 'invalid_qty';
      end;
    end if;

    if reason is null and item ? 'meta' then
      v_meta := coalesce(item->'meta', '{}'::jsonb);
    end if;

    if reason is null then
      begin
        insert into card_price_observations(
          card_print_id,
          source_id,
          observed_at,
          currency,
          value,
          kind,
          qty,
          meta
        )
        values (
          v_card_print_id,
          v_source_id,
          v_observed_at,
          v_currency,
          v_value,
          v_kind,
          v_qty,
          coalesce(v_meta, '{}'::jsonb)
        );
        inserted_count := inserted_count + 1;
      exception
        when foreign_key_violation then
          reason := 'insert_fk_violation';
        when others then
          reason := 'insert_error';
      end;
    end if;

    if reason is not null then
      unmatched_count := unmatched_count + 1;
      begin
        insert into unmatched_price_rows(raw_payload, reason)
        values (coalesce(item, '{}'::jsonb), reason);
      exception
        when others then
          -- swallow logging errors to avoid masking original failures
          null;
      end;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted_count', inserted_count,
    'unmatched_count', unmatched_count
  );
end;
$function$;

revoke all on function admin.import_prices_do(jsonb, text) from public;
grant execute on function admin.import_prices_do(jsonb, text) to anon;

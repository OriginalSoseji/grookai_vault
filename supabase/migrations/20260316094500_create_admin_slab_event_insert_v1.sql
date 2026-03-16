create or replace function public.admin_slab_event_insert_v1(
  p_slab_cert_id uuid,
  p_event_type text,
  p_event_source text,
  p_source_event_key text,
  p_event_ts timestamptz,
  p_card_print_id uuid default null,
  p_vault_item_id uuid default null,
  p_price numeric default null,
  p_currency text default null,
  p_event_metadata jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_event_type text := nullif(btrim(p_event_type), '');
  v_event_source text := nullif(btrim(p_event_source), '');
  v_source_event_key text := nullif(btrim(p_source_event_key), '');
  v_currency text := nullif(btrim(p_currency), '');
begin
  if p_slab_cert_id is null then
    raise exception 'p_slab_cert_id is required';
  end if;

  if v_event_type is null then
    raise exception 'p_event_type is required';
  end if;

  if p_event_ts is null then
    raise exception 'p_event_ts is required';
  end if;

  if p_price is not null and p_price < 0 then
    raise exception 'p_price must be >= 0';
  end if;

  if v_source_event_key is not null and v_event_source is null then
    raise exception 'p_event_source is required when p_source_event_key is present';
  end if;

  if not exists (
    select 1
    from public.slab_certs sc
    where sc.id = p_slab_cert_id
  ) then
    raise exception 'p_slab_cert_id does not exist: %', p_slab_cert_id;
  end if;

  if v_source_event_key is not null then
    insert into public.slab_provenance_events (
      slab_cert_id,
      card_print_id,
      vault_item_id,
      event_type,
      event_source,
      source_event_key,
      price,
      currency,
      event_metadata,
      event_ts
    ) values (
      p_slab_cert_id,
      p_card_print_id,
      p_vault_item_id,
      v_event_type,
      v_event_source,
      v_source_event_key,
      p_price,
      v_currency,
      p_event_metadata,
      p_event_ts
    )
    on conflict (slab_cert_id, event_source, source_event_key)
      where source_event_key is not null
    do nothing
    returning id into v_event_id;

    if v_event_id is not null then
      return v_event_id;
    end if;

    select spe.id
    into v_event_id
    from public.slab_provenance_events spe
    where spe.slab_cert_id = p_slab_cert_id
      and spe.event_source = v_event_source
      and spe.source_event_key = v_source_event_key
    limit 1;

    return v_event_id;
  end if;

  insert into public.slab_provenance_events (
    slab_cert_id,
    card_print_id,
    vault_item_id,
    event_type,
    event_source,
    source_event_key,
    price,
    currency,
    event_metadata,
    event_ts
  ) values (
    p_slab_cert_id,
    p_card_print_id,
    p_vault_item_id,
    v_event_type,
    v_event_source,
    null,
    p_price,
    v_currency,
    p_event_metadata,
    p_event_ts
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.admin_slab_event_insert_v1(
  uuid, text, text, text, timestamptz, uuid, uuid, numeric, text, jsonb
) from public, anon, authenticated;

grant execute on function public.admin_slab_event_insert_v1(
  uuid, text, text, text, timestamptz, uuid, uuid, numeric, text, jsonb
) to service_role;

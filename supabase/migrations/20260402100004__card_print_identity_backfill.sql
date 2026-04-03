begin;

do $$
declare
  v_missing_set_rows integer := 0;
  v_blocked_count integer := 0;
  v_blocked_reasons jsonb := '[]'::jsonb;
begin
  select count(*)::int
  into v_missing_set_rows
  from public.card_prints cp
  left join public.sets s
    on s.id = cp.set_id
  where s.id is null;

  if v_missing_set_rows > 0 then
    raise exception
      'card_print_identity backfill blocked: % card_print rows are missing parent set rows',
      v_missing_set_rows;
  end if;

  with projected as (
    select
      cp.id as card_print_id,
      public.card_print_identity_backfill_projection_v1(
        s.source,
        cp.set_code,
        s.code,
        cp.number,
        cp.number_plain,
        cp.name,
        cp.variant_key,
        cp.printed_total,
        cp.printed_set_abbrev
      ) as projection
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
  )
  select count(*)::int
  into v_blocked_count
  from projected
  where projection ->> 'status' = 'blocked';

  if v_blocked_count > 0 then
    with projected as (
      select
        public.card_print_identity_backfill_projection_v1(
          s.source,
          cp.set_code,
          s.code,
          cp.number,
          cp.number_plain,
          cp.name,
          cp.variant_key,
          cp.printed_total,
          cp.printed_set_abbrev
        ) as projection
      from public.card_prints cp
      join public.sets s
        on s.id = cp.set_id
    ),
    blocked as (
      select
        projection ->> 'block_reason' as block_reason,
        count(*)::int as row_count
      from projected
      where projection ->> 'status' = 'blocked'
      group by 1
      order by 1
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'block_reason', block_reason,
          'row_count', row_count
        )
        order by block_reason
      ),
      '[]'::jsonb
    )
    into v_blocked_reasons
    from blocked;

    raise exception
      'card_print_identity backfill blocked: % rows are not classifiable under Phase 8 approved domains; reasons=%',
      v_blocked_count,
      v_blocked_reasons::text;
  end if;

  with projected as (
    select
      cp.id as card_print_id,
      public.card_print_identity_backfill_projection_v1(
        s.source,
        cp.set_code,
        s.code,
        cp.number,
        cp.number_plain,
        cp.name,
        cp.variant_key,
        cp.printed_total,
        cp.printed_set_abbrev
      ) as projection
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
  )
  insert into public.card_print_identity (
    id,
    card_print_id,
    identity_domain,
    set_code_identity,
    printed_number,
    normalized_printed_name,
    source_name_raw,
    identity_payload,
    identity_key_version,
    identity_key_hash,
    is_active,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    projected.card_print_id,
    projected.projection ->> 'identity_domain',
    projected.projection ->> 'set_code_identity',
    projected.projection ->> 'printed_number',
    projected.projection ->> 'normalized_printed_name',
    projected.projection ->> 'source_name_raw',
    coalesce(projected.projection -> 'identity_payload', '{}'::jsonb),
    projected.projection ->> 'identity_key_version',
    projected.projection ->> 'identity_key_hash',
    true,
    now(),
    now()
  from projected
  where projected.projection ->> 'status' = 'ready'
    and not exists (
      select 1
      from public.card_print_identity existing
      where existing.card_print_id = projected.card_print_id
        and existing.is_active = true
    )
  order by projected.card_print_id;
end;
$$;

commit;

-- PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: cf3b0e774dc617aff711c67826c4ade5485e6beb2e18c396bdbc603a2099997b
-- Scope: 2 zero-pricing legacy_orphan cleanup rows.
-- No migrations. No global apply.

begin;

create temporary table pkg34b_targets (
  card_print_id uuid primary key,
  card_printing_id uuid not null unique,
  species_mapping_id uuid not null unique,
  price_curve_id uuid not null unique,
  ebay_snapshot_id uuid not null unique,
  ebay_latest_source text not null,
  pricing_job_id uuid not null unique,
  card_number text not null,
  card_name text not null
) on commit drop;

insert into pkg34b_targets (
  card_print_id,
  card_printing_id,
  species_mapping_id,
  price_curve_id,
  ebay_snapshot_id,
  ebay_latest_source,
  pricing_job_id,
  card_number,
  card_name
) values
  ('070f8fd3-3aef-4e52-b84e-1b7e64673a96'::uuid, '293fa0c1-b221-4352-b7e8-83692613d771'::uuid, '0d5ce239-d675-4b8e-9c3d-b7a1de6d16f0'::uuid, 'fbf24a98-60a1-4a62-8650-050ba4bbc9bf'::uuid, 'ddff1fe8-694d-4c25-80c5-752684bf285a'::uuid, 'ebay_browse', '04c6c4c7-89cc-42cc-878b-177974a0699e'::uuid, '68', 'Sandshrew'),
  ('02a9c42c-5303-4d7c-85c9-886497097710'::uuid, '31b72a5d-f261-4f8d-8e5d-12e73a3abead'::uuid, 'e05611f3-6753-43ba-881a-52e6e61e6afc'::uuid, 'bc60069f-f466-467f-adf5-59801f7a7a6c'::uuid, '4171d19a-c52c-4006-a6bc-a05e3a5217e8'::uuid, 'ebay_browse', '518d4cb1-5eae-49ba-9e4c-161a0a68bae5'::uuid, '84', 'Garganacl');

do $$
declare
  v_targets integer;
  v_bad_parent integer;
  v_bad_child integer;
  v_bad_species integer;
  v_bad_curve integer;
  v_bad_snapshot integer;
  v_bad_latest integer;
  v_bad_job integer;
  v_blocking_refs integer;
  v_deleted_curves integer;
  v_deleted_snapshots integer;
  v_deleted_latest integer;
  v_deleted_jobs integer;
  v_deleted_species integer;
  v_deleted_children integer;
  v_deleted_parents integer;
  ref record;
begin
  select count(*) into v_targets from pkg34b_targets;
  if v_targets <> 2 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE target guard failed: expected 2, got %', v_targets;
  end if;

  select count(*) into v_bad_parent
  from pkg34b_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or cp.set_code <> 'legacy_orphan'
     or cp.number <> t.card_number
     or cp.name <> t.card_name;
  if v_bad_parent <> 0 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE parent guard failed: %', v_bad_parent;
  end if;

  select count(*) into v_bad_child
  from pkg34b_targets t
  left join public.card_printings cpr on cpr.id = t.card_printing_id and cpr.card_print_id = t.card_print_id
  where cpr.id is null or cpr.finish_key <> 'normal';
  if v_bad_child <> 0 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE child guard failed: %', v_bad_child;
  end if;

  select count(*) into v_bad_species
  from pkg34b_targets t
  left join public.card_print_species cps on cps.id = t.species_mapping_id and cps.card_print_id = t.card_print_id
  where cps.id is null
     or cps.source <> 'grookai_dex_name_rule_v1'
     or cps.role <> 'primary'
     or cps.active is not true
     or cps.counts_for_completion is not true;
  if v_bad_species <> 0 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE species guard failed: %', v_bad_species;
  end if;

  select count(*) into v_bad_curve
  from pkg34b_targets t
  left join public.card_print_price_curves cpc on cpc.id = t.price_curve_id and cpc.card_print_id = t.card_print_id
  where cpc.id is null
     or coalesce(cpc.listing_count, 0) <> 0
     or coalesce(cpc.confidence, 0) > 0.2
     or cpc.nm_median is not null or cpc.nm_floor is not null or coalesce(cpc.nm_samples, 0) <> 0
     or cpc.lp_median is not null or cpc.lp_floor is not null or coalesce(cpc.lp_samples, 0) <> 0
     or cpc.mp_median is not null or cpc.mp_floor is not null or coalesce(cpc.mp_samples, 0) <> 0
     or cpc.hp_median is not null or cpc.hp_floor is not null or coalesce(cpc.hp_samples, 0) <> 0
     or cpc.dmg_median is not null or cpc.dmg_floor is not null or coalesce(cpc.dmg_samples, 0) <> 0;
  if v_bad_curve <> 0 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE price curve guard failed: %', v_bad_curve;
  end if;

  select count(*) into v_bad_snapshot
  from pkg34b_targets t
  left join public.ebay_active_price_snapshots eaps on eaps.id = t.ebay_snapshot_id and eaps.card_print_id = t.card_print_id
  where eaps.id is null
     or eaps.source <> 'ebay_browse'
     or eaps.listing_count <> 0
     or eaps.raw_sample_count_nm <> 0
     or eaps.raw_sample_count_lp <> 0
     or eaps.nm_floor is not null
     or eaps.nm_median is not null
     or eaps.lp_floor is not null
     or eaps.lp_median is not null;
  if v_bad_snapshot <> 0 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE ebay snapshot guard failed: %', v_bad_snapshot;
  end if;

  select count(*) into v_bad_latest
  from pkg34b_targets t
  left join public.ebay_active_prices_latest eapl on eapl.card_print_id = t.card_print_id and eapl.source = t.ebay_latest_source
  where eapl.card_print_id is null
     or eapl.source <> 'ebay_browse'
     or eapl.listing_count <> 0
     or eapl.confidence > 0.2
     or eapl.nm_floor is not null
     or eapl.nm_median is not null
     or eapl.lp_floor is not null
     or eapl.lp_median is not null;
  if v_bad_latest <> 0 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE ebay latest guard failed: %', v_bad_latest;
  end if;

  select count(*) into v_bad_job
  from pkg34b_targets t
  left join public.pricing_jobs pj on pj.id = t.pricing_job_id and pj.card_print_id = t.card_print_id
  where pj.id is null
     or pj.reason <> 'scheduled_refresh'
     or pj.status <> 'done'
     or pj.attempts <> 1
     or pj.requester_user_id is not null
     or pj.error is not null
     or pj.locked_at is not null
     or pj.locked_by is not null;
  if v_bad_job <> 0 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE pricing job guard failed: %', v_bad_job;
  end if;

  for ref in
    select tc.table_schema, tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'card_prints'
      and ccu.column_name = 'id'
      and tc.table_name not in (
        'card_printings',
        'card_print_species',
        'card_print_price_curves',
        'ebay_active_price_snapshots',
        'ebay_active_prices_latest',
        'pricing_jobs'
      )
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg34b_targets t on ref.%I = t.card_print_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_blocking_refs;
    if v_blocking_refs <> 0 then
      raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE parent dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_blocking_refs;
    end if;
  end loop;

  for ref in
    select tc.table_schema, tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'card_printings'
      and ccu.column_name = 'id'
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg34b_targets t on ref.%I = t.card_printing_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_blocking_refs;
    if v_blocking_refs <> 0 then
      raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE child dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_blocking_refs;
    end if;
  end loop;

  delete from public.card_print_price_curves cpc using pkg34b_targets t where cpc.id = t.price_curve_id;
  get diagnostics v_deleted_curves = row_count;
  delete from public.ebay_active_price_snapshots eaps using pkg34b_targets t where eaps.id = t.ebay_snapshot_id;
  get diagnostics v_deleted_snapshots = row_count;
  delete from public.ebay_active_prices_latest eapl using pkg34b_targets t where eapl.card_print_id = t.card_print_id and eapl.source = t.ebay_latest_source;
  get diagnostics v_deleted_latest = row_count;
  delete from public.pricing_jobs pj using pkg34b_targets t where pj.id = t.pricing_job_id;
  get diagnostics v_deleted_jobs = row_count;
  delete from public.card_print_species cps using pkg34b_targets t where cps.id = t.species_mapping_id;
  get diagnostics v_deleted_species = row_count;
  delete from public.card_printings cpr using pkg34b_targets t where cpr.id = t.card_printing_id;
  get diagnostics v_deleted_children = row_count;
  delete from public.card_prints cp using pkg34b_targets t where cp.id = t.card_print_id;
  get diagnostics v_deleted_parents = row_count;

  if v_deleted_curves <> 2
     or v_deleted_snapshots <> 2
     or v_deleted_latest <> 2
     or v_deleted_jobs <> 2
     or v_deleted_species <> 2
     or v_deleted_children <> 2
     or v_deleted_parents <> 2 then
    raise exception 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE delete count guard failed: curves %, snapshots %, latest %, jobs %, species %, children %, parents %',
      v_deleted_curves, v_deleted_snapshots, v_deleted_latest, v_deleted_jobs, v_deleted_species, v_deleted_children, v_deleted_parents;
  end if;

  raise notice 'PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE dry-run passed: pricing rows deleted %, species %, children %, parents %, fingerprint cf3b0e774dc617aff711c67826c4ade5485e6beb2e18c396bdbc603a2099997b',
    v_deleted_curves + v_deleted_snapshots + v_deleted_latest + v_deleted_jobs,
    v_deleted_species,
    v_deleted_children,
    v_deleted_parents;
end $$;

rollback;

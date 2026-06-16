-- ENRICH-13F1-SUFFIX-DUPLICATE-TRANSFER-DRY-RUN GUARDED DRY-RUN TRANSACTION V1
-- Generated for review/proof only.
-- Package fingerprint: 8d363c0d4eff9389606fa452090e234830c207438057cbf48733f110e67cdc5b
-- Scope: 4 suffix duplicate parent dependency transfers.
-- Base-number rows are intentionally excluded and remain blocked.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table enrich13f1_targets (
  duplicate_card_print_id uuid primary key,
  canonical_owner_card_print_id uuid not null,
  set_code text not null,
  card_number text not null,
  base_number text not null,
  suffix text not null,
  duplicate_name text not null,
  canonical_owner_name text not null,
  source_external_id text
) on commit drop;

insert into enrich13f1_targets (
  duplicate_card_print_id,
  canonical_owner_card_print_id,
  set_code,
  card_number,
  base_number,
  suffix,
  duplicate_name,
  canonical_owner_name,
  source_external_id
) values
  ('6922b72a-f472-4bea-9c3b-e4320f11924e'::uuid, '6f632392-0999-4a74-84ec-9346caf17d24'::uuid, 'xy4', '65a', '65', 'a', 'Aegislash EX', 'Aegislash-EX', 'xy4-65a'),
  ('6b99ca2c-6f45-4089-b566-7f2927aa101f'::uuid, 'a99aa4ae-0d1b-4d9c-81be-9db0a65ca8e1'::uuid, 'xyp', 'XY150a', 'XY150', 'a', 'Yveltal-EX', 'Yveltal-EX', 'xyp-XY150a'),
  ('33e0cfc8-8036-472a-bebd-1aed68e22ba0'::uuid, '79d4fa29-4137-46de-bf72-14ee8fe96119'::uuid, 'xyp', 'XY177a', 'XY177', 'a', 'Karen', 'Karen', 'xyp-XY177a'),
  ('0fa596a5-2124-410e-9faa-50f7fc970134'::uuid, '2170847e-7ce9-482c-ac4f-02122ba3538b'::uuid, 'xyp', 'XY198a', 'XY198', 'a', 'M Camerupt-EX', 'M Camerupt-EX', 'xyp-XY198a');

do $$
declare
  v_targets integer;
  v_bad_identity integer;
  v_printing_refs integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from enrich13f1_targets;
  if v_targets <> 4 then
    raise exception 'ENRICH-13F1 target count guard failed: expected 4, got %', v_targets;
  end if;

  select count(*) into v_bad_identity
  from enrich13f1_targets target
  left join public.card_prints duplicate on duplicate.id = target.duplicate_card_print_id
  left join public.card_prints owner on owner.id = target.canonical_owner_card_print_id
  where duplicate.id is null
     or owner.id is null
     or duplicate.id = owner.id
     or duplicate.set_code is not null
     or duplicate.number is not null
     or owner.set_code <> target.set_code
     or owner.number <> target.card_number
     or owner.name <> target.canonical_owner_name
     or target.suffix is null
     or target.card_number !~ (target.suffix || '$');

  if v_bad_identity <> 0 then
    raise exception 'ENRICH-13F1 suffix owner identity guard failed: % rows', v_bad_identity;
  end if;

  select count(*) into v_printing_refs
  from public.card_printings cpr
  join enrich13f1_targets target on target.duplicate_card_print_id = cpr.card_print_id
  where exists (select 1 from public.external_printing_mappings epm where epm.card_printing_id = cpr.id)
     or exists (select 1 from public.vault_item_instances vii where vii.card_printing_id = cpr.id)
     or exists (select 1 from public.canon_warehouse_candidates cwc where cwc.promoted_card_printing_id = cpr.id);

  if v_printing_refs <> 0 then
    raise exception 'ENRICH-13F1 duplicate child printing dependency guard failed: % refs', v_printing_refs;
  end if;

  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_prints'
      and rel.relname <> all(array[
        'card_print_identity',
        'card_print_species',
        'card_print_traits',
        'card_printings',
        'external_mappings'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_card_print_id from enrich13f1_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'ENRICH-13F1 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
  end if;
end $$;

delete from public.external_mappings em
using enrich13f1_targets target
where em.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.external_mappings owner_em
    where owner_em.card_print_id = target.canonical_owner_card_print_id
      and owner_em.source = em.source
      and owner_em.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.canonical_owner_card_print_id
from enrich13f1_targets target
where em.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_identity cpi
using enrich13f1_targets target
where cpi.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_traits cpt
using enrich13f1_targets target
where cpt.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_print_traits owner_trait
    where owner_trait.card_print_id = target.canonical_owner_card_print_id
      and owner_trait.trait_type = cpt.trait_type
      and owner_trait.trait_value = cpt.trait_value
      and owner_trait.source = cpt.source
  );

update public.card_print_traits cpt
set card_print_id = target.canonical_owner_card_print_id
from enrich13f1_targets target
where cpt.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_species cps
using enrich13f1_targets target
where cps.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_print_species owner_species
    where owner_species.card_print_id = target.canonical_owner_card_print_id
      and owner_species.species_id = cps.species_id
      and owner_species.role = cps.role
      and owner_species.source = cps.source
      and owner_species.active = cps.active
  );

update public.card_print_species cps
set card_print_id = target.canonical_owner_card_print_id,
    updated_at = now()
from enrich13f1_targets target
where cps.card_print_id = target.duplicate_card_print_id;

delete from public.card_printings cpr
using enrich13f1_targets target
where cpr.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_printings owner_printing
    where owner_printing.card_print_id = target.canonical_owner_card_print_id
      and owner_printing.finish_key = cpr.finish_key
  );

update public.card_printings cpr
set card_print_id = target.canonical_owner_card_print_id
from enrich13f1_targets target
where cpr.card_print_id = target.duplicate_card_print_id;

do $$
declare
  v_remaining_duplicate_dependencies integer;
  v_identity_duplicates integer;
  v_external_duplicates integer;
  v_child_duplicates integer;
begin
  select
    (select count(*) from public.external_mappings where card_print_id in (select duplicate_card_print_id from enrich13f1_targets))
    + (select count(*) from public.card_print_identity where card_print_id in (select duplicate_card_print_id from enrich13f1_targets))
    + (select count(*) from public.card_print_traits where card_print_id in (select duplicate_card_print_id from enrich13f1_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select duplicate_card_print_id from enrich13f1_targets))
    + (select count(*) from public.card_printings where card_print_id in (select duplicate_card_print_id from enrich13f1_targets))
  into v_remaining_duplicate_dependencies;

  if v_remaining_duplicate_dependencies <> 0 then
    raise exception 'ENRICH-13F1 remaining duplicate dependencies guard failed: % rows', v_remaining_duplicate_dependencies;
  end if;

  select count(*) into v_identity_duplicates
  from (
    select identity_domain, identity_key_hash
    from public.card_print_identity
    where is_active = true
    group by identity_domain, identity_key_hash
    having count(*) > 1
  ) dupes;
  if v_identity_duplicates <> 0 then
    raise exception 'ENRICH-13F1 active identity duplicate guard failed: % groups', v_identity_duplicates;
  end if;

  select count(*) into v_external_duplicates
  from (
    select source, external_id
    from public.external_mappings
    where coalesce(active, true) = true
    group by source, external_id
    having count(distinct card_print_id) > 1
  ) dupes;
  if v_external_duplicates <> 0 then
    raise exception 'ENRICH-13F1 external mapping duplicate guard failed: % groups', v_external_duplicates;
  end if;

  select count(*) into v_child_duplicates
  from (
    select card_print_id, finish_key
    from public.card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) dupes;
  if v_child_duplicates <> 0 then
    raise exception 'ENRICH-13F1 child printing duplicate guard failed: % groups', v_child_duplicates;
  end if;
end $$;

delete from public.card_prints cp
using enrich13f1_targets target
where cp.id = target.duplicate_card_print_id;

rollback;

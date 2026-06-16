-- ENRICH-13G1-CELEBRATIONS-SUBSET-ALIAS-TRANSFER-DRY-RUN GUARDED DRY-RUN TRANSACTION V1
-- Generated for review/proof only.
-- Package fingerprint: 2a55568422b6a513dbfe6ca64ea662274acc697a3f6955e249e23c781b6641ac
-- Scope: 4 Celebrations Classic Collection source-alias transfers.
-- Host cel25 15A# public identity creation is forbidden.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table enrich13g1_targets (
  alias_card_print_id uuid primary key,
  subset_owner_card_print_id uuid not null,
  source_set_code text not null,
  source_number text not null,
  canonical_subset_set_code text not null,
  canonical_subset_number text not null,
  card_name text not null,
  source_external_id text
) on commit drop;

insert into enrich13g1_targets (
  alias_card_print_id,
  subset_owner_card_print_id,
  source_set_code,
  source_number,
  canonical_subset_set_code,
  canonical_subset_number,
  card_name,
  source_external_id
) values
  ('90685cb5-3cfd-4fd8-a4dd-2664e00c4eb0'::uuid, 'd62d4f5c-277b-4f32-b5aa-a393d990fbb3'::uuid, 'cel25', '15A1', 'cel25c', '15', 'Venusaur', 'cel25-15A1'),
  ('8e4958ab-1e4e-4636-87e1-4650ae938086'::uuid, 'c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid, 'cel25', '15A2', 'cel25c', '15', 'Here Comes Team Rocket!', 'cel25-15A2'),
  ('d7e84443-dae0-4d48-b32a-b2719ec4d670'::uuid, '3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid, 'cel25', '15A3', 'cel25c', '15', 'Rocket''s Zapdos', 'cel25-15A3'),
  ('aedd9f51-0d41-48de-a35d-2df67bb72046'::uuid, 'a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid, 'cel25', '15A4', 'cel25c', '15', 'Claydol', 'cel25-15A4');

do $$
declare
  v_targets integer;
  v_bad_identity integer;
  v_printing_refs integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from enrich13g1_targets;
  if v_targets <> 4 then
    raise exception 'ENRICH-13G1 target count guard failed: expected 4, got %', v_targets;
  end if;

  select count(*) into v_bad_identity
  from enrich13g1_targets target
  left join public.card_prints alias on alias.id = target.alias_card_print_id
  left join public.card_prints owner on owner.id = target.subset_owner_card_print_id
  where alias.id is null
     or owner.id is null
     or alias.id = owner.id
     or alias.set_code is not null
     or alias.number is not null
     or owner.set_code <> target.canonical_subset_set_code
     or owner.number <> target.canonical_subset_number
     or owner.name <> target.card_name
     or target.source_set_code <> 'cel25'
     or target.canonical_subset_set_code <> 'cel25c'
     or target.source_number !~ '^15A[0-9]+$';

  if v_bad_identity <> 0 then
    raise exception 'ENRICH-13G1 subset owner identity guard failed: % rows', v_bad_identity;
  end if;

  select count(*) into v_printing_refs
  from public.card_printings cpr
  join enrich13g1_targets target on target.alias_card_print_id = cpr.card_print_id
  where exists (select 1 from public.external_printing_mappings epm where epm.card_printing_id = cpr.id)
     or exists (select 1 from public.vault_item_instances vii where vii.card_printing_id = cpr.id)
     or exists (select 1 from public.canon_warehouse_candidates cwc where cwc.promoted_card_printing_id = cpr.id);

  if v_printing_refs <> 0 then
    raise exception 'ENRICH-13G1 alias child printing dependency guard failed: % refs', v_printing_refs;
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
      'select count(*) from %I.%I where %I in (select alias_card_print_id from enrich13g1_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'ENRICH-13G1 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
  end if;
end $$;

delete from public.external_mappings em
using enrich13g1_targets target
where em.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.external_mappings owner_em
    where owner_em.card_print_id = target.subset_owner_card_print_id
      and owner_em.source = em.source
      and owner_em.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.subset_owner_card_print_id
from enrich13g1_targets target
where em.card_print_id = target.alias_card_print_id;

delete from public.card_print_identity cpi
using enrich13g1_targets target
where cpi.card_print_id = target.alias_card_print_id;

delete from public.card_print_traits cpt
using enrich13g1_targets target
where cpt.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.card_print_traits owner_trait
    where owner_trait.card_print_id = target.subset_owner_card_print_id
      and owner_trait.trait_type = cpt.trait_type
      and owner_trait.trait_value = cpt.trait_value
      and owner_trait.source = cpt.source
  );

update public.card_print_traits cpt
set card_print_id = target.subset_owner_card_print_id
from enrich13g1_targets target
where cpt.card_print_id = target.alias_card_print_id;

delete from public.card_print_species cps
using enrich13g1_targets target
where cps.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.card_print_species owner_species
    where owner_species.card_print_id = target.subset_owner_card_print_id
      and owner_species.species_id = cps.species_id
      and owner_species.role = cps.role
      and owner_species.source = cps.source
      and owner_species.active = cps.active
  );

update public.card_print_species cps
set card_print_id = target.subset_owner_card_print_id,
    updated_at = now()
from enrich13g1_targets target
where cps.card_print_id = target.alias_card_print_id;

delete from public.card_printings cpr
using enrich13g1_targets target
where cpr.card_print_id = target.alias_card_print_id
  and exists (
    select 1
    from public.card_printings owner_printing
    where owner_printing.card_print_id = target.subset_owner_card_print_id
      and owner_printing.finish_key = cpr.finish_key
  );

update public.card_printings cpr
set card_print_id = target.subset_owner_card_print_id
from enrich13g1_targets target
where cpr.card_print_id = target.alias_card_print_id;

do $$
declare
  v_remaining_alias_dependencies integer;
  v_identity_duplicates integer;
  v_external_duplicates integer;
  v_child_duplicates integer;
begin
  select
    (select count(*) from public.external_mappings where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_print_identity where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_print_traits where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select alias_card_print_id from enrich13g1_targets))
    + (select count(*) from public.card_printings where card_print_id in (select alias_card_print_id from enrich13g1_targets))
  into v_remaining_alias_dependencies;

  if v_remaining_alias_dependencies <> 0 then
    raise exception 'ENRICH-13G1 remaining alias dependencies guard failed: % rows', v_remaining_alias_dependencies;
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
    raise exception 'ENRICH-13G1 active identity duplicate guard failed: % groups', v_identity_duplicates;
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
    raise exception 'ENRICH-13G1 external mapping duplicate guard failed: % groups', v_external_duplicates;
  end if;

  select count(*) into v_child_duplicates
  from (
    select card_print_id, finish_key
    from public.card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) dupes;
  if v_child_duplicates <> 0 then
    raise exception 'ENRICH-13G1 child printing duplicate guard failed: % groups', v_child_duplicates;
  end if;
end $$;

delete from public.card_prints cp
using enrich13g1_targets target
where cp.id = target.alias_card_print_id;

rollback;

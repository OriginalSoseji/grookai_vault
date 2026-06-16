-- POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP GUARDED DRY-RUN TRANSACTION V1
-- Package fingerprint: 90e8f24e7dca6bc29c0b2d6fc1e6b049402348eafcf8c375c9ed14d83cb6b732
-- Scope: 7 dependency-bearing padded/unpadded duplicate parent groups.
-- Excludes append-only feed rows.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

set local statement_timeout = '10min';

create temporary table post_rec02a_targets (
  canonical_parent_id uuid primary key,
  duplicate_parent_id uuid not null unique,
  canonical_gv_id text not null,
  duplicate_gv_id text not null,
  set_code text not null,
  normalized_key text not null,
  duplicate_child_count integer not null
) on commit drop;

insert into post_rec02a_targets (
  canonical_parent_id,
  duplicate_parent_id,
  canonical_gv_id,
  duplicate_gv_id,
  set_code,
  normalized_key,
  duplicate_child_count
) values
  ('755dabde-0f54-48c0-9862-2a02053b37fe'::uuid, '0b4aa3b3-3c2e-4394-87c1-f28efa396e51'::uuid, 'GV-PK-LOR-017', 'GV-PK-LOR-17', 'swsh11', 'swsh11|17|trevenant||', 0),
  ('155e3b7b-c79a-495e-b849-9e6c66294673'::uuid, '0b24e7e8-9e51-428d-a974-2e2268c7b193'::uuid, 'GV-PK-LOR-026', 'GV-PK-LOR-26', 'swsh11', 'swsh11|26|chandelure||', 0),
  ('8c104bd5-c6b1-4d5b-8295-d50ac7ca5f9e'::uuid, '052f60a3-dc6d-433c-bce2-ed814c64e34d'::uuid, 'GV-PK-LOR-033', 'GV-PK-LOR-33', 'swsh11', 'swsh11|33|seel||', 1),
  ('fc4dbb32-9d0f-4353-bfd1-65959069aab4'::uuid, '071eccbf-7bdd-494a-a43e-b3bc6965ea3a'::uuid, 'GV-PK-LOR-045', 'GV-PK-LOR-45', 'swsh11', 'swsh11|45|hisuian basculegion||', 0),
  ('8f39a034-e33b-419a-a574-7d81d212d955'::uuid, '03ae5e0a-e43b-4828-8f6a-89a402d14656'::uuid, 'GV-PK-LOR-067', 'GV-PK-LOR-67', 'swsh11', 'swsh11|67|mr. mime||', 1),
  ('6595e3e2-cad0-44f7-bf29-18c7b9f0ecce'::uuid, '02eb2e6a-e65a-4d8e-8b5e-8f23b868c53f'::uuid, 'GV-PK-LOR-098', 'GV-PK-LOR-98', 'swsh11', 'swsh11|98|hariyama||', 1),
  ('5dcec667-2dc0-4cb5-97f0-e8342e190ff8'::uuid, '0fbf4a2e-2bd2-43b7-8f57-2ae906272571'::uuid, 'GV-PK-LOR-099', 'GV-PK-LOR-99', 'swsh11', 'swsh11|99|meditite||', 1);

do $$
declare
  v_targets integer;
  v_missing_parent integer;
  v_bad_parent_shape integer;
  v_append_only_refs integer;
  v_bad_child_refs integer := 0;
  v_new_printing_gv_conflicts integer;
  v_unhandled_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from post_rec02a_targets;
  if v_targets <> 7 then
    raise exception 'POST-REC-02A target count guard failed: expected 7, got %', v_targets;
  end if;

  select count(*) into v_missing_parent
  from post_rec02a_targets target
  left join public.card_prints canonical on canonical.id = target.canonical_parent_id
  left join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.id is null
     or duplicate.id is null
     or canonical.id = duplicate.id;

  if v_missing_parent <> 0 then
    raise exception 'POST-REC-02A missing parent guard failed: % rows', v_missing_parent;
  end if;

  select count(*) into v_bad_parent_shape
  from post_rec02a_targets target
  join public.card_prints canonical on canonical.id = target.canonical_parent_id
  join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.set_code <> duplicate.set_code
     or canonical.set_code <> target.set_code
     or canonical.name <> duplicate.name
     or canonical.number !~ '^0+[0-9]+[A-Za-z]*$'
     or duplicate.number ~ '^0+[0-9]+[A-Za-z]*$';

  if v_bad_parent_shape <> 0 then
    raise exception 'POST-REC-02A parent shape guard failed: % rows', v_bad_parent_shape;
  end if;

  select count(*) into v_append_only_refs
  from public.card_feed_events cfe
  join post_rec02a_targets target on target.duplicate_parent_id = cfe.card_print_id;

  if v_append_only_refs <> 0 then
    raise exception 'POST-REC-02A append-only feed exclusion guard failed: % refs', v_append_only_refs;
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
        'external_mappings',
        'external_discovery_candidates',
        'card_embeddings',
        'card_fingerprint_index',
        'scanner_fingerprint_index',
        'justtcg_variants',
        'justtcg_variant_prices_latest',
        'justtcg_variant_price_snapshots',
        'card_print_price_curves',
        'ebay_active_prices_latest',
        'ebay_active_price_snapshots',
        'pricing_jobs',
        'pricing_watch',
        'vault_item_instances',
        'vault_items',
        'card_interactions',
        'card_interaction_outcomes',
        'card_signals',
        'slab_certs',
        'card_feed_events'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_unhandled_parent_refs := v_unhandled_parent_refs + v_dynamic_refs;
  end loop;

  if v_unhandled_parent_refs <> 0 then
    raise exception 'POST-REC-02A unhandled parent dependency guard failed: % refs', v_unhandled_parent_refs;
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
      and ref.relname = 'card_printings'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (
         select cpr.id
         from public.card_printings cpr
         join post_rec02a_targets target on target.duplicate_parent_id = cpr.card_print_id
       )',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_bad_child_refs := v_bad_child_refs + v_dynamic_refs;
  end loop;

  if v_bad_child_refs <> 0 then
    raise exception 'POST-REC-02A duplicate child dependency guard failed: % refs', v_bad_child_refs;
  end if;

  select count(*) into v_new_printing_gv_conflicts
  from public.card_printings duplicate_child
  join post_rec02a_targets target on target.duplicate_parent_id = duplicate_child.card_print_id
  where not exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  )
  and exists (
    select 1
    from public.card_printings any_child
    where any_child.printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
      and any_child.id <> duplicate_child.id
  );

  if v_new_printing_gv_conflicts <> 0 then
    raise exception 'POST-REC-02A transfer printing_gv_id conflict guard failed: % rows', v_new_printing_gv_conflicts;
  end if;
end $$;

delete from public.external_mappings em
using post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.external_mappings existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.source = em.source
      and existing.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id;

update public.external_discovery_candidates edc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where edc.card_print_id = target.duplicate_parent_id;

insert into public.card_print_traits
  (card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity)
select
  target.canonical_parent_id,
  trait.trait_type,
  trait.trait_value,
  trait.source,
  trait.confidence,
  trait.hp,
  trait.national_dex,
  trait.types,
  trait.rarity,
  trait.supertype,
  trait.card_category,
  trait.legacy_rarity
from public.card_print_traits trait
join post_rec02a_targets target on target.duplicate_parent_id = trait.card_print_id
on conflict (card_print_id, trait_type, trait_value, source) do nothing;

delete from public.card_print_traits trait
using post_rec02a_targets target
where trait.card_print_id = target.duplicate_parent_id;

insert into public.card_print_species
  (card_print_id, species_id, role, counts_for_completion, source, confidence, evidence, active)
select
  target.canonical_parent_id,
  species.species_id,
  species.role,
  species.counts_for_completion,
  species.source,
  species.confidence,
  species.evidence,
  species.active
from public.card_print_species species
join post_rec02a_targets target on target.duplicate_parent_id = species.card_print_id
on conflict (card_print_id, species_id, role) where active = true do nothing;

delete from public.card_print_species species
using post_rec02a_targets target
where species.card_print_id = target.duplicate_parent_id;

delete from public.card_print_identity identity
using post_rec02a_targets target
where identity.card_print_id = target.duplicate_parent_id;

delete from public.card_embeddings ce
using post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.card_embeddings existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.card_embeddings ce
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id;

update public.card_fingerprint_index cfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cfi.card_print_id = target.duplicate_parent_id;

delete from public.scanner_fingerprint_index sfi
using post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.scanner_fingerprint_index existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.hash_d = sfi.hash_d
      and existing.algorithm_version = sfi.algorithm_version
      and existing.source_type = sfi.source_type
  );

update public.scanner_fingerprint_index sfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id;

update public.justtcg_variants jv
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jv.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_prices_latest jvl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvl.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_price_snapshots jvs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvs.card_print_id = target.duplicate_parent_id;

update public.card_print_price_curves cppc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cppc.card_print_id = target.duplicate_parent_id;

delete from public.ebay_active_prices_latest eapl
using post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.ebay_active_prices_latest existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.ebay_active_prices_latest eapl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id;

update public.ebay_active_price_snapshots eaps
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eaps.card_print_id = target.duplicate_parent_id;

update public.pricing_jobs pj
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pj.card_print_id = target.duplicate_parent_id;

delete from public.pricing_watch pw
using post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.pricing_watch existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.watch_reason = pw.watch_reason
  );

update public.pricing_watch pw
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id;

update public.vault_item_instances vii
set card_printing_id = null,
    card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where vii.card_print_id = target.duplicate_parent_id;

update public.vault_items vi
set card_id = target.canonical_parent_id
from post_rec02a_targets target
where vi.card_id = target.duplicate_parent_id;

update public.card_interactions ci
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ci.card_print_id = target.duplicate_parent_id;

update public.card_interaction_outcomes cio
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cio.card_print_id = target.duplicate_parent_id;

update public.card_signals cs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cs.card_print_id = target.duplicate_parent_id;

update public.slab_certs sc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sc.card_print_id = target.duplicate_parent_id;

delete from public.card_printings duplicate_child
using post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  );

update public.card_printings duplicate_child
set
  card_print_id = target.canonical_parent_id,
  printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
from post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id;

do $$
declare
  v_remaining_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
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
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_remaining_refs := v_remaining_refs + v_dynamic_refs;
  end loop;

  if v_remaining_refs <> 0 then
    raise exception 'POST-REC-02A duplicate parent references remain: % refs', v_remaining_refs;
  end if;
end $$;

delete from public.card_prints cp
using post_rec02a_targets target
where cp.id = target.duplicate_parent_id;

do $$
declare
  v_remaining_duplicate_parents integer;
begin
  select count(*) into v_remaining_duplicate_parents
  from public.card_prints cp
  join post_rec02a_targets target on target.duplicate_parent_id = cp.id;

  if v_remaining_duplicate_parents <> 0 then
    raise exception 'POST-REC-02A duplicate parent delete simulation incomplete: % rows', v_remaining_duplicate_parents;
  end if;
end $$;

rollback;

-- POST-REC-01-READY-DUPLICATE-PARENT-CLEANUP GUARDED DRY-RUN TRANSACTION V1
-- Package fingerprint: 6f86ad96ba603cd08db7b418b2f9dca98b8d373c1dcdde6967557df6c0755494
-- Scope: 23 deterministic padded/unpadded duplicate parent groups.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table post_rec01_targets (
  canonical_parent_id uuid primary key,
  duplicate_parent_id uuid not null unique,
  canonical_gv_id text not null,
  duplicate_gv_id text not null,
  set_code text not null,
  normalized_key text not null,
  duplicate_child_count integer not null
) on commit drop;

insert into post_rec01_targets (
  canonical_parent_id,
  duplicate_parent_id,
  canonical_gv_id,
  duplicate_gv_id,
  set_code,
  normalized_key,
  duplicate_child_count
) values
  ('817191d0-a89d-41f0-a61e-833ffb1f85d7'::uuid, 'c60cec9b-a452-474f-acb7-61ae355ed82a'::uuid, 'GV-PK-PR-SV-019', 'GV-PK-PR-SV-19', 'svp', 'svp|19|baxcalibur||', 1),
  ('017bfcbe-d9de-4fa1-b1bf-c9c34c2efef8'::uuid, 'd540e969-4f37-4fca-a0ce-ea2855baf966'::uuid, 'GV-PK-PR-SV-021', 'GV-PK-PR-SV-21', 'svp', 'svp|21|murkrow||', 1),
  ('b455b195-3513-4a95-9d0f-4bd57e07a226'::uuid, 'f13a7a69-f7d9-4051-9816-82bdb3e1fe04'::uuid, 'GV-PK-PR-SV-022', 'GV-PK-PR-SV-22', 'svp', 'svp|22|pelipper||', 1),
  ('bae6ee06-ffe3-4cf6-81b5-b54341b5f1d2'::uuid, '8558344a-3b8e-4db7-a393-1ce7908fe17d'::uuid, 'GV-PK-PR-SV-025', 'GV-PK-PR-SV-25', 'svp', 'svp|25|tinkatink||', 1),
  ('b9af3b2f-7c98-46c7-ba23-1b12dd41be1a'::uuid, 'b3f32041-a264-4862-8d9b-c434de23d6bb'::uuid, 'GV-PK-PR-SV-026', 'GV-PK-PR-SV-26', 'svp', 'svp|26|varoom||', 3),
  ('dc8ef53f-d2f6-4efb-a97d-d891fe83326c'::uuid, '2cab3cc4-2a36-4f9e-ace3-4974d2cfb0af'::uuid, 'GV-PK-PR-SV-037', 'GV-PK-PR-SV-37', 'svp', 'svp|37|cleffa||', 1),
  ('637371f3-486d-4eef-850b-58f47c24104c'::uuid, 'f013f140-4022-472d-a3e4-82431f66e2b6'::uuid, 'GV-PK-PR-SV-038', 'GV-PK-PR-SV-38', 'svp', 'svp|38|togekiss||', 1),
  ('5d3d86e5-9da4-4cae-a42e-d38685122117'::uuid, 'aa83c51b-56c1-447e-868c-535f5c14f9e9'::uuid, 'GV-PK-PR-SV-039', 'GV-PK-PR-SV-39', 'svp', 'svp|39|mawile||', 1),
  ('51e53f1e-9e4f-4819-8b43-099e6ad3772b'::uuid, '94ded563-b3b5-4c08-bc45-f3c3002c9ed7'::uuid, 'GV-PK-PR-SV-045', 'GV-PK-PR-SV-45', 'svp', 'svp|45|paradise resort||', 1),
  ('733c241e-8ac0-4426-a2cc-48ae987433ac'::uuid, '34852c32-ba98-4524-884f-8920982205f9'::uuid, 'GV-PK-PR-SV-047', 'GV-PK-PR-SV-47', 'svp', 'svp|47|charmander||', 2),
  ('6a1b706e-06cf-4ac6-a0f9-1e0d4df5690f'::uuid, '802bf0ba-c845-4754-9a12-cd8f75378eb9'::uuid, 'GV-PK-PR-SV-048', 'GV-PK-PR-SV-48', 'svp', 'svp|48|squirtle||', 2),
  ('1d04ee8c-f8ce-4796-a9f3-4dcec6d747ce'::uuid, 'ffa598ee-63e5-4d72-99d8-189aecd7c092'::uuid, 'GV-PK-PR-SV-005', 'GV-PK-PR-SV-5', 'svp', 'svp|5|quaquaval||', 1),
  ('7714a551-eb7f-4732-9cf4-44c1d098bcc3'::uuid, 'ccf0bf34-0271-4fd1-b77e-95095906b8ac'::uuid, 'GV-PK-PR-SV-058', 'GV-PK-PR-SV-58', 'svp', 'svp|58|iron bundle||', 1),
  ('6b292ee1-fd38-454b-9082-1ff6eb4ee06e'::uuid, '27c3cc72-a45b-47bc-88b6-deaddb5a7c5f'::uuid, 'GV-PK-PR-SV-059', 'GV-PK-PR-SV-59', 'svp', 'svp|59|xatu||', 1),
  ('01dbd447-78e7-4cdf-86a4-5d4520de8619'::uuid, '87432ed1-f1f6-4019-8c9e-20cc7f7c9a3f'::uuid, 'GV-PK-PR-SV-006', 'GV-PK-PR-SV-6', 'svp', 'svp|6|pawmot||', 1),
  ('f9f3b38c-ae15-4f6e-b775-2adf115cf37e'::uuid, '18b4c58c-8126-4256-ad07-4c1e62382835'::uuid, 'GV-PK-PR-SV-007', 'GV-PK-PR-SV-7', 'svp', 'svp|7|hawlucha||', 1),
  ('71663533-9094-4b88-b52f-5cedb2ee0a62'::uuid, '70f39107-7bba-412a-8303-1fc923038a08'::uuid, 'GV-PK-PR-SV-091', 'GV-PK-PR-SV-91', 'svp', 'svp|91|koraidon||', 1),
  ('2de2e34e-a1bb-4879-ac3f-808a7c01fe20'::uuid, '7195cbfe-f3ee-447e-9fcf-53dd2828663c'::uuid, 'GV-PK-PR-SV-092', 'GV-PK-PR-SV-92', 'svp', 'svp|92|miraidon||', 1),
  ('b4a6a123-4085-47a1-a02a-dd7e16a39b65'::uuid, '1bf53554-69bf-417b-9366-cc0db213b430'::uuid, 'GV-PK-LOR-047', 'GV-PK-LOR-47', 'swsh11', 'swsh11|47|swanna||', 1),
  ('45432572-4dc5-42fb-88d6-58b708fc47c5'::uuid, '1c89e6f0-9fa4-4f01-baea-2416348638de'::uuid, 'GV-PK-LOR-053', 'GV-PK-LOR-53', 'swsh11', 'swsh11|53|raichu||', 1),
  ('76390c0f-b80a-49aa-ac2e-1d7301163bf0'::uuid, '17066191-eb5f-43e7-8872-7b2562fa3836'::uuid, 'GV-PK-LOR-064', 'GV-PK-LOR-64', 'swsh11', 'swsh11|64|gastly||', 1),
  ('0729c39a-0ebd-4f4d-b041-5388e6ed2284'::uuid, '17d7004e-7293-4ea7-b86e-21231f6a914f'::uuid, 'GV-PK-LOR-086', 'GV-PK-LOR-86', 'swsh11', 'swsh11|86|machop||', 1),
  ('43288865-6901-4b77-884e-c8a48d6b36cd'::uuid, '1d66adc2-d5db-42bc-8a75-abdf3e44c2e4'::uuid, 'GV-PK-LOR-093', 'GV-PK-LOR-93', 'swsh11', 'swsh11|93|aerodactyl vstar||', 0);

do $$
declare
  v_targets integer;
  v_missing_parent integer;
  v_bad_parent_shape integer;
  v_bad_identity integer;
  v_bad_child_refs integer;
  v_new_printing_gv_conflicts integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from post_rec01_targets;
  if v_targets <> 23 then
    raise exception 'POST-REC-01 target count guard failed: expected 23, got %', v_targets;
  end if;

  select count(*) into v_missing_parent
  from post_rec01_targets target
  left join public.card_prints canonical on canonical.id = target.canonical_parent_id
  left join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.id is null
     or duplicate.id is null
     or canonical.id = duplicate.id;

  if v_missing_parent <> 0 then
    raise exception 'POST-REC-01 missing parent guard failed: % rows', v_missing_parent;
  end if;

  select count(*) into v_bad_parent_shape
  from post_rec01_targets target
  join public.card_prints canonical on canonical.id = target.canonical_parent_id
  join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.set_code <> duplicate.set_code
     or canonical.set_code <> target.set_code
     or canonical.name <> duplicate.name
     or canonical.number !~ '^0+[0-9]+[A-Za-z]*$'
     or duplicate.number ~ '^0+[0-9]+[A-Za-z]*$';

  if v_bad_parent_shape <> 0 then
    raise exception 'POST-REC-01 parent shape guard failed: % rows', v_bad_parent_shape;
  end if;

  select count(*) into v_bad_identity
  from post_rec01_targets target
  where not exists (
    select 1
    from public.card_print_identity cpi
    where cpi.card_print_id = target.canonical_parent_id
      and cpi.is_active = true
  );

  if v_bad_identity <> 0 then
    raise exception 'POST-REC-01 canonical active identity guard failed: % rows', v_bad_identity;
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
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec01_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'POST-REC-01 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
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
         join post_rec01_targets target on target.duplicate_parent_id = cpr.card_print_id
       )',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_bad_child_refs := coalesce(v_bad_child_refs, 0) + v_dynamic_refs;
  end loop;

  if coalesce(v_bad_child_refs, 0) <> 0 then
    raise exception 'POST-REC-01 duplicate child dependency guard failed: % refs', v_bad_child_refs;
  end if;

  select count(*) into v_new_printing_gv_conflicts
  from public.card_printings duplicate_child
  join post_rec01_targets target on target.duplicate_parent_id = duplicate_child.card_print_id
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
    raise exception 'POST-REC-01 transfer printing_gv_id conflict guard failed: % rows', v_new_printing_gv_conflicts;
  end if;
end $$;

delete from public.external_mappings em
using post_rec01_targets target
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
from post_rec01_targets target
where em.card_print_id = target.duplicate_parent_id;

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
join post_rec01_targets target on target.duplicate_parent_id = trait.card_print_id
on conflict (card_print_id, trait_type, trait_value, source) do nothing;

delete from public.card_print_traits trait
using post_rec01_targets target
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
join post_rec01_targets target on target.duplicate_parent_id = species.card_print_id
on conflict (card_print_id, species_id, role) where active = true do nothing;

delete from public.card_print_species species
using post_rec01_targets target
where species.card_print_id = target.duplicate_parent_id;

delete from public.card_print_identity identity
using post_rec01_targets target
where identity.card_print_id = target.duplicate_parent_id;

delete from public.card_printings duplicate_child
using post_rec01_targets target
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
from post_rec01_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id;

do $$
declare
  v_remaining_children integer;
  v_remaining_identities integer;
  v_remaining_traits integer;
  v_remaining_species integer;
  v_remaining_mappings integer;
begin
  select count(*) into v_remaining_children
  from public.card_printings cpr
  join post_rec01_targets target on target.duplicate_parent_id = cpr.card_print_id;
  select count(*) into v_remaining_identities
  from public.card_print_identity identity
  join post_rec01_targets target on target.duplicate_parent_id = identity.card_print_id;
  select count(*) into v_remaining_traits
  from public.card_print_traits trait
  join post_rec01_targets target on target.duplicate_parent_id = trait.card_print_id;
  select count(*) into v_remaining_species
  from public.card_print_species species
  join post_rec01_targets target on target.duplicate_parent_id = species.card_print_id;
  select count(*) into v_remaining_mappings
  from public.external_mappings em
  join post_rec01_targets target on target.duplicate_parent_id = em.card_print_id;

  if v_remaining_children + v_remaining_identities + v_remaining_traits + v_remaining_species + v_remaining_mappings <> 0 then
    raise exception 'POST-REC-01 duplicate dependency cleanup incomplete: children %, identities %, traits %, species %, mappings %',
      v_remaining_children, v_remaining_identities, v_remaining_traits, v_remaining_species, v_remaining_mappings;
  end if;
end $$;

delete from public.card_prints cp
using post_rec01_targets target
where cp.id = target.duplicate_parent_id;

do $$
declare
  v_remaining_duplicate_parents integer;
begin
  select count(*) into v_remaining_duplicate_parents
  from public.card_prints cp
  join post_rec01_targets target on target.duplicate_parent_id = cp.id;

  if v_remaining_duplicate_parents <> 0 then
    raise exception 'POST-REC-01 duplicate parent delete simulation incomplete: % rows', v_remaining_duplicate_parents;
  end if;
end $$;

rollback;

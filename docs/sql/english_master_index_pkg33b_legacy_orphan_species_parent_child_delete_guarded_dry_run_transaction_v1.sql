-- PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: 2def6522202e4fab393ceaf63a18cfb55797da0328a01cd1091d65c32eb19b37
-- Scope: 14 derived species mapping deletes, 14 child deletes, 14 parent deletes.
-- No migrations. No global apply.

begin;

create temporary table pkg33b_targets (
  card_print_id uuid primary key,
  card_printing_id uuid not null unique,
  species_mapping_id uuid not null unique,
  set_code text not null,
  card_number text not null,
  card_name text not null,
  finish_key text not null
) on commit drop;

insert into pkg33b_targets (
  card_print_id,
  card_printing_id,
  species_mapping_id,
  set_code,
  card_number,
  card_name,
  finish_key
) values
  ('16770d4c-32a3-4c4b-b722-2ed76ecabb09'::uuid, '131dd03f-aa60-4a14-94d7-43061155ca6a'::uuid, '16c9bf98-71c7-4919-9c9f-d1aa3cc366a5'::uuid, 'legacy_orphan', '2', 'Ivysaur', 'normal'),
  ('69a78c80-8c98-4afc-80a7-43cef4d06e3b'::uuid, '7295ea87-d1e7-45e4-a85b-bbb4c517bee8'::uuid, 'f0902f8a-4bf5-46bb-908b-24e7c5a9aba7'::uuid, 'legacy_orphan', '24', 'Pyroar', 'normal'),
  ('eb09a5a2-e5ce-4d82-b29c-f012ae059746'::uuid, '52672e8a-fc71-479a-8c8d-cda941a57fc3'::uuid, 'be38ebdd-d5a8-4a7f-b892-1791d5f58a70'::uuid, 'legacy_orphan', '3', 'Mega Venusaur ex', 'normal'),
  ('aafbe34a-372b-4372-973d-6e3f9a0724c0'::uuid, '14544219-bec4-45a0-8f7e-034ec4356ab8'::uuid, 'f32f40ac-511a-4013-a05d-23577a445b87'::uuid, 'legacy_orphan', '48', 'Raikou', 'normal'),
  ('7e602b13-dd87-496b-80fc-dfe247ad8f22'::uuid, '2091d696-2ff2-4915-aade-d7c5801c15a9'::uuid, 'e8920a88-d73d-4a95-9fe6-021a0ec033d6'::uuid, 'legacy_orphan', '5', 'Exeggutor', 'normal'),
  ('ecdb1219-3c7a-4e02-a6c3-c70c09876945'::uuid, 'b2fe1f56-286f-49ff-807a-7af1a5713dcf'::uuid, '80cb82bf-d54d-4c7b-8418-2ad82e094a3f'::uuid, 'legacy_orphan', '53', 'Heliolisk', 'normal'),
  ('7de06767-8a39-4816-8c7c-0069ea9aef56'::uuid, '39a64161-dfd4-46b8-9773-add4befb0510'::uuid, 'bb3cabd9-8c53-4288-8127-869494e47710'::uuid, 'legacy_orphan', '54', 'Abra', 'normal'),
  ('9244f260-31ab-4c2a-95a6-c6dd074b97f4'::uuid, 'fc263c88-24ae-442b-bc23-573abf5a6652'::uuid, '88681c91-6e71-4795-80da-584f2840ef4c'::uuid, 'legacy_orphan', '55', 'Kadabra', 'normal'),
  ('983adbc3-0e3b-4636-a62c-6fd852af2284'::uuid, 'ccb7e545-55b0-4fa9-ac32-420011b79604'::uuid, 'f43ec5a6-4b7c-4cdc-8b37-f28cfbf3b323'::uuid, 'legacy_orphan', '62', 'Spoink', 'normal'),
  ('cfef2ab1-d4e4-438c-9d12-dfd36b9c666c'::uuid, 'd8c4ecc1-fd7a-4072-bee6-2954316fb603'::uuid, 'd67ebaa7-21b0-4038-a256-40cfeaf520ea'::uuid, 'legacy_orphan', '74', 'Lunatone', 'normal'),
  ('f097e73c-0a80-4b0e-8744-68167798b06c'::uuid, '9227bce5-f22e-4153-bd04-23304a354cc1'::uuid, '121f3576-cbf2-4dff-a475-f2b3f1219839'::uuid, 'legacy_orphan', '78', 'Croagunk', 'normal'),
  ('b69810c8-c77f-4398-8792-7591339d9159'::uuid, '89dbea3c-e76e-444a-858c-b78f09f0010b'::uuid, '098323d0-684f-49a3-94ac-336dcf0bcc39'::uuid, 'legacy_orphan', '80', 'Marshadow', 'normal'),
  ('4f15e2d0-db12-473c-a1d6-96135cfda9a5'::uuid, 'c418b27a-acab-40e3-aafa-729fbe9801c1'::uuid, '2009dde4-266b-4f6e-8cbd-27b4d22ff801'::uuid, 'legacy_orphan', '86', 'Mega Absol ex', 'normal'),
  ('3e7b74cd-876e-4344-a5a9-a9f4cf383cb6'::uuid, '72267b2f-85ed-4028-840b-a3b7dae7c094'::uuid, '6f0dbf62-4a26-4bbc-a539-5d8bcd48b0d7'::uuid, 'legacy_orphan', '95', 'Dialga', 'normal');

do $$
declare
  v_targets integer;
  v_parent_mismatch integer;
  v_child_mismatch integer;
  v_species_mismatch integer;
  v_child_count_mismatch integer;
  v_species_count_mismatch integer;
  v_blocking_refs integer;
  v_deleted_species integer;
  v_deleted_children integer;
  v_deleted_parents integer;
  ref record;
begin
  select count(*) into v_targets from pkg33b_targets;
  if v_targets <> 14 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE target guard failed: expected 14, got %', v_targets;
  end if;

  select count(*) into v_parent_mismatch
  from pkg33b_targets t
  left join public.card_prints cp on cp.id = t.card_print_id
  where cp.id is null
     or coalesce(cp.set_code, '') <> 'legacy_orphan'
     or coalesce(cp.set_code, '') <> t.set_code
     or coalesce(cp.name, '') <> t.card_name
     or coalesce(cp.number, '') <> t.card_number;
  if v_parent_mismatch <> 0 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE parent guard failed: %', v_parent_mismatch;
  end if;

  select count(*) into v_child_mismatch
  from pkg33b_targets t
  left join public.card_printings cpr
    on cpr.id = t.card_printing_id
   and cpr.card_print_id = t.card_print_id
  where cpr.id is null
     or cpr.finish_key <> 'normal'
     or cpr.finish_key <> t.finish_key;
  if v_child_mismatch <> 0 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE child guard failed: %', v_child_mismatch;
  end if;

  select count(*) into v_species_mismatch
  from pkg33b_targets t
  left join public.card_print_species cps
    on cps.id = t.species_mapping_id
   and cps.card_print_id = t.card_print_id
  where cps.id is null
     or cps.source <> 'grookai_dex_name_rule_v1'
     or cps.role <> 'primary'
     or cps.active is not true
     or cps.counts_for_completion is not true;
  if v_species_mismatch <> 0 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE species guard failed: %', v_species_mismatch;
  end if;

  select count(*) into v_child_count_mismatch
  from pkg33b_targets t
  where (
    select count(*)
    from public.card_printings cpr
    where cpr.card_print_id = t.card_print_id
  ) <> 1;
  if v_child_count_mismatch <> 0 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE child-count guard failed: %', v_child_count_mismatch;
  end if;

  select count(*) into v_species_count_mismatch
  from pkg33b_targets t
  where (
    select count(*)
    from public.card_print_species cps
    where cps.card_print_id = t.card_print_id
  ) <> 1;
  if v_species_count_mismatch <> 0 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE species-count guard failed: %', v_species_count_mismatch;
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
      and tc.table_name not in ('card_printings', 'card_print_species')
  loop
    execute format(
      'select count(*) from %I.%I ref join pg_temp.pkg33b_targets t on ref.%I = t.card_print_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_blocking_refs;
    if v_blocking_refs <> 0 then
      raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE parent dependency guard failed: %.%.% has % refs',
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
      'select count(*) from %I.%I ref join pg_temp.pkg33b_targets t on ref.%I = t.card_printing_id',
      ref.table_schema,
      ref.table_name,
      ref.column_name
    ) into v_blocking_refs;
    if v_blocking_refs <> 0 then
      raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE child dependency guard failed: %.%.% has % refs',
        ref.table_schema, ref.table_name, ref.column_name, v_blocking_refs;
    end if;
  end loop;

  delete from public.card_print_species cps
  using pkg33b_targets t
  where cps.id = t.species_mapping_id;
  get diagnostics v_deleted_species = row_count;
  if v_deleted_species <> 14 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE species delete guard failed: expected 14, got %', v_deleted_species;
  end if;

  delete from public.card_printings cpr
  using pkg33b_targets t
  where cpr.id = t.card_printing_id;
  get diagnostics v_deleted_children = row_count;
  if v_deleted_children <> 14 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE child delete guard failed: expected 14, got %', v_deleted_children;
  end if;

  delete from public.card_prints cp
  using pkg33b_targets t
  where cp.id = t.card_print_id;
  get diagnostics v_deleted_parents = row_count;
  if v_deleted_parents <> 14 then
    raise exception 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE parent delete guard failed: expected 14, got %', v_deleted_parents;
  end if;

  raise notice 'PKG-33B-LEGACY-ORPHAN-SPECIES-PARENT-CHILD-DELETE dry-run passed: species mappings deleted %, children deleted %, parents deleted %, fingerprint 2def6522202e4fab393ceaf63a18cfb55797da0328a01cd1091d65c32eb19b37',
    v_deleted_species, v_deleted_children, v_deleted_parents;
end $$;

rollback;

-- ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER-DRY-RUN GUARDED DRY-RUN TRANSACTION V1
-- Generated for review/proof only.
-- Package fingerprint: 17fffbc2ffe5831de01ed152c47c668e4c94c92ff36601e1f1cc7651b4dafc02
-- Scope: 40 deterministic name/alias duplicate parent dependency transfers.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table enrich13e1_targets (
  bucket text not null,
  duplicate_card_print_id uuid primary key,
  canonical_owner_card_print_id uuid not null,
  set_code text not null,
  card_number text not null,
  duplicate_name text not null,
  canonical_owner_name text not null,
  source_external_id text
) on commit drop;

insert into enrich13e1_targets (
  bucket,
  duplicate_card_print_id,
  canonical_owner_card_print_id,
  set_code,
  card_number,
  duplicate_name,
  canonical_owner_name,
  source_external_id
) values
  ('platinum_g_suffix_name_alias_collision', '45ce6c25-7aba-4bf7-8cff-ce1dd9030fb3'::uuid, '177d5026-d94e-4662-a008-cf20d6a35ef0'::uuid, 'pl4', '26', 'Porygon-Z', 'Porygon-Z G', 'pl4-26'),
  ('platinum_g_suffix_name_alias_collision', '227298d6-9bec-4197-98c6-7ede8ae05cf9'::uuid, '6d6576aa-99bf-4381-96b1-af58ab28d5c2'::uuid, 'pl4', '53', 'Beedrill', 'Beedrill G', 'pl4-53'),
  ('platinum_owner_shorthand_alias_collision', '6d87f138-46ab-49a4-8f84-5f3f7aee1cca'::uuid, '2552ac51-9214-4017-b2ed-ba165631338e'::uuid, 'pl2', '16', 'Bronzong 4', 'Bronzong E4', 'pl2-16'),
  ('platinum_owner_shorthand_alias_collision', '333a3f96-f983-4ffb-8fc9-e439de00f466'::uuid, 'ba220027-ac17-4275-abee-67dda9805044'::uuid, 'pl2', '17', 'Drapion 4', 'Drapion E4', 'pl2-17'),
  ('platinum_owner_shorthand_alias_collision', 'c157b2e8-69e6-4d78-9d39-0e605e179991'::uuid, '4a88d956-5f65-4eeb-afef-38213e983283'::uuid, 'pl2', '18', 'Espeon 4', 'Espeon E4', 'pl2-18'),
  ('platinum_owner_shorthand_alias_collision', '338cff03-124b-42ea-9b25-e8bf25017e71'::uuid, '0fdb9d12-93e2-49c1-9808-b549b6140910'::uuid, 'pl2', '20', 'Gallade 4', 'Gallade E4', 'pl2-20'),
  ('platinum_owner_shorthand_alias_collision', 'fb696830-60f0-43cd-b9e9-8d4fac84ba49'::uuid, '39ed3b66-9cd7-4408-a8f6-b516ad516748'::uuid, 'pl2', '23', 'Golem 4', 'Golem E4', 'pl2-23'),
  ('platinum_owner_shorthand_alias_collision', 'd94a146c-9368-4125-8af1-c1f783d5d7da'::uuid, '49472547-a8ec-40f2-a7cf-02f5f2c6d1cb'::uuid, 'pl2', '24', 'Heracross 4', 'Heracross E4', 'pl2-24'),
  ('platinum_owner_shorthand_alias_collision', '6cffaa5f-913f-46eb-be8d-50a1d0b228ab'::uuid, 'e6210a44-e44d-493c-9881-830291830e5e'::uuid, 'pl2', '28', 'Mr. Mime 4', 'Mr. Mime E4', 'pl2-28'),
  ('platinum_owner_shorthand_alias_collision', '83e70822-d09b-4ff6-bc9e-03ef5b5fa656'::uuid, '11e2a93f-811f-48a9-a4c6-81a835711554'::uuid, 'pl2', '32', 'Rhyperior 4', 'Rhyperior E4', 'pl2-32'),
  ('platinum_owner_shorthand_alias_collision', '7af859d0-9ae8-4d50-b54e-ea951f22a91f'::uuid, '1decc8b2-0cf2-4179-9832-61e34d6cffaa'::uuid, 'pl2', '35', 'Vespiquen 4', 'Vespiquen E4', 'pl2-35'),
  ('platinum_owner_shorthand_alias_collision', '38ff1409-5e4d-4aa5-a273-3ef0b06238db'::uuid, '2eb41fa2-8722-4058-a482-aa119ac76085'::uuid, 'pl2', '37', 'Yanmega 4', 'Yanmega E4', 'pl2-37'),
  ('platinum_owner_shorthand_alias_collision', 'ea5af9d8-3a57-4483-8fc2-5d13323bd144'::uuid, '7963fb5b-b97c-469b-b2f9-be03ce3cf2f4'::uuid, 'pl2', '38', 'Alakazam 4', 'Alakazam E4', 'pl2-38'),
  ('platinum_owner_shorthand_alias_collision', '653f25f9-edff-4927-a029-0d28ed267d6d'::uuid, '249bd976-5328-4776-8a4a-80d10da8cb93'::uuid, 'pl2', '42', 'Hippowdon 4', 'Hippowdon E4', 'pl2-42'),
  ('platinum_owner_shorthand_alias_collision', 'dcd0d169-bc8a-4d58-b166-c3235b08b88a'::uuid, '70264f85-14f5-4286-955e-e09abc63fe1f'::uuid, 'pl2', '43', 'Infernape 4', 'Infernape E4', 'pl2-43'),
  ('platinum_owner_shorthand_alias_collision', 'a11e47c8-f667-498f-9b9f-75ccad204455'::uuid, '8dcd0887-b4a3-40e9-9634-dd9caea49a90'::uuid, 'pl2', '47', 'Rapidash 4', 'Rapidash E4', 'pl2-47'),
  ('platinum_owner_shorthand_alias_collision', '72915f71-1c12-4cee-b6e6-1d372e28cc7f'::uuid, '9b3c0b77-e9a6-43e3-b0b9-c6474c31e0ed'::uuid, 'pl2', '48', 'Scizor 4', 'Scizor E4', 'pl2-48'),
  ('platinum_owner_shorthand_alias_collision', 'c642c215-a4e3-4648-b2a4-0070de5f4f76'::uuid, 'f6debf35-d35f-4df7-bc1c-a263bdf54992'::uuid, 'pl2', '54', 'Whiscash 4', 'Whiscash E4', 'pl2-54'),
  ('platinum_owner_shorthand_alias_collision', 'd36e276b-06bb-46a3-8a72-4f6d544d9da3'::uuid, '915a6f3a-8075-46d5-9c32-c992a8581c60'::uuid, 'pl2', '60', 'Flareon 4', 'Flareon E4', 'pl2-60'),
  ('platinum_owner_shorthand_alias_collision', '37f22309-ab0c-4e46-901d-87bec9f18a36'::uuid, '3a8e4066-b4b0-41b8-bffc-8d69d321183b'::uuid, 'pl2', '62', 'Gliscor 4', 'Gliscor E4', 'pl2-62'),
  ('platinum_owner_shorthand_alias_collision', '5fab13b0-1f5b-447a-90f8-6a22905109f4'::uuid, 'f3bc2983-3597-4bd7-a437-fe7fe4570fbb'::uuid, 'pl2', '65', 'Houndoom 4', 'Houndoom E4', 'pl2-65'),
  ('same_name_same_number_duplicate_collision', '7df8528c-c8f8-4110-890d-0fb32bc0fbf3'::uuid, '54c7a89d-53f0-43f7-8e39-0ce10eb58558'::uuid, 'bw9', '40', 'Nidoran♀', 'Nidoran ♀', 'bw9-40'),
  ('same_name_same_number_duplicate_collision', 'c0b41c1b-2d6f-4c5f-bf85-ccae2c731d46'::uuid, '57e87ed1-769c-4f1e-8b06-a1070cfccbd0'::uuid, 'bw9', '43', 'Nidoran♂', 'Nidoran ♂', 'bw9-43'),
  ('same_name_same_number_duplicate_collision', '57560dcd-655d-4dc8-bef2-d5e453b97029'::uuid, '0693f9de-73cc-4df6-b03c-23a084049e60'::uuid, 'col1', '1', 'Clefable', 'Clefable', 'col1-1'),
  ('same_name_same_number_duplicate_collision', 'd74643a3-162e-47e2-9c82-79f9a297156f'::uuid, '6c46512b-d0c9-43ed-9847-6808a52743ec'::uuid, 'col1', '5', 'Forretress', 'Forretress', 'col1-5'),
  ('same_name_same_number_duplicate_collision', 'a9203bf3-0a2f-4ef5-af3f-3dbdc6bf8bce'::uuid, '64c77c93-2d6a-4098-812b-593db15688dd'::uuid, 'col1', '10', 'Houndoom', 'Houndoom', 'col1-10'),
  ('same_name_same_number_duplicate_collision', '7c6fd787-474c-4cb1-a230-63ff5e2f0dab'::uuid, '9e88b30d-4a91-4f38-83af-e3a98bbadc82'::uuid, 'xy4', '23', 'Manectric EX', 'Manectric-EX', 'xy4-23'),
  ('same_name_same_number_duplicate_collision', '25259133-e7f0-4a5a-8204-4baa2866ea7d'::uuid, '298a9523-9d6a-40fe-b31e-8f59045bb00d'::uuid, 'xy4', '24', 'M Manectric EX', 'M Manectric-EX', 'xy4-24'),
  ('same_name_same_number_duplicate_collision', 'e7bc4b52-6e1b-412a-a121-d27b63c497f9'::uuid, 'eb853a5c-8c81-4699-a534-24a5530e1465'::uuid, 'xy4', '34', 'Gengar EX', 'Gengar-EX', 'xy4-34'),
  ('same_name_same_number_duplicate_collision', '01657633-3bd1-4bad-9efa-626d9a652596'::uuid, '6b5c8254-202a-4a0c-b067-b77ec1925ce2'::uuid, 'xy4', '35', 'M Gengar EX', 'M Gengar-EX', 'xy4-35'),
  ('same_name_same_number_duplicate_collision', 'e38e47d7-d61f-4662-a302-2f4808157e4b'::uuid, '5ce95024-d3df-40ba-8263-21101d654a61'::uuid, 'xy4', '58', 'Malamar EX', 'Malamar-EX', 'xy4-58'),
  ('same_name_same_number_duplicate_collision', '29ab165f-342c-467e-993f-ea98d49ba788'::uuid, '7f3c81c5-21ae-4360-8ae9-d7961b1e03d7'::uuid, 'xy4', '62', 'Dialga EX', 'Dialga-EX', 'xy4-62'),
  ('same_name_same_number_duplicate_collision', '367a9aa6-3ec4-471f-a173-9e292e3a28d9'::uuid, 'c3958b10-bdfe-4034-ac39-a99bda88cee5'::uuid, 'xy4', '67', 'Florges EX', 'Florges-EX', 'xy4-67'),
  ('same_name_same_number_duplicate_collision', 'dc95efa2-88da-41d5-8d35-b1089b756020'::uuid, '1f35e4c2-4072-402e-bc72-aa902fcac136'::uuid, 'xy4', '113', 'Manectric EX', 'Manectric-EX', 'xy4-113'),
  ('same_name_same_number_duplicate_collision', '2257ea5d-92bf-483b-8f40-8aaddfd7259c'::uuid, 'd51f58a8-f814-44ac-a2ce-8064c14ed4cc'::uuid, 'xy4', '114', 'Gengar EX', 'Gengar-EX', 'xy4-114'),
  ('same_name_same_number_duplicate_collision', '3f17b09d-9e44-4ae7-bfe9-c8168f92f0b0'::uuid, 'd30b345c-7149-4071-ad24-3b20519451bc'::uuid, 'xy4', '115', 'Malamar EX', 'Malamar-EX', 'xy4-115'),
  ('same_name_same_number_duplicate_collision', '4057e212-ac7d-4ecf-a3f0-40b396bbfe09'::uuid, '2d3c5888-7463-4f87-b379-6235e90c3aa3'::uuid, 'xy4', '116', 'Florges EX', 'Florges-EX', 'xy4-116'),
  ('same_name_same_number_duplicate_collision', 'fc8b63a5-934e-43da-a09d-8e2af2eb5209'::uuid, 'e5d7e176-2153-46c9-ad00-e939de38d577'::uuid, 'xy4', '120', 'M Manectric EX', 'M Manectric-EX', 'xy4-120'),
  ('same_name_same_number_duplicate_collision', '1b9b8cac-ec8f-4d20-a0eb-a81d58b5f41e'::uuid, '3fc7f13e-c543-4d29-8d69-c09661389f31'::uuid, 'xy4', '121', 'M Gengar EX', 'M Gengar-EX', 'xy4-121'),
  ('same_name_same_number_duplicate_collision', '77ebedc5-b9f3-4312-993b-bdf0d6cc9391'::uuid, 'bdb8f826-87b8-49f5-99a2-00bc1da15493'::uuid, 'xy4', '122', 'Dialga EX', 'Dialga-EX', 'xy4-122');

do $$
declare
  v_targets integer;
  v_bad_identity integer;
  v_manual_rows integer;
  v_printing_refs integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from enrich13e1_targets;
  if v_targets <> 40 then
    raise exception 'ENRICH-13E1 target count guard failed: expected 40, got %', v_targets;
  end if;

  select count(*) into v_manual_rows
  from enrich13e1_targets
  where duplicate_name = 'Luxray GL'
     or canonical_owner_name = 'Luxray GL LV.X'
     or bucket = 'manual_collision_adjudication_required';
  if v_manual_rows <> 0 then
    raise exception 'ENRICH-13E1 manual-blocked row guard failed: % rows', v_manual_rows;
  end if;

  select count(*) into v_bad_identity
  from enrich13e1_targets target
  left join public.card_prints duplicate on duplicate.id = target.duplicate_card_print_id
  left join public.card_prints owner on owner.id = target.canonical_owner_card_print_id
  where duplicate.id is null
     or owner.id is null
     or duplicate.id = owner.id
     or owner.set_code <> target.set_code
     or owner.number <> target.card_number
     or duplicate.set_code is not null
     or duplicate.number is not null;

  if v_bad_identity <> 0 then
    raise exception 'ENRICH-13E1 parent identity guard failed: % rows', v_bad_identity;
  end if;

  select count(*) into v_printing_refs
  from public.card_printings cpr
  join enrich13e1_targets target on target.duplicate_card_print_id = cpr.card_print_id
  where exists (select 1 from public.external_printing_mappings epm where epm.card_printing_id = cpr.id)
     or exists (select 1 from public.vault_item_instances vii where vii.card_printing_id = cpr.id)
     or exists (select 1 from public.canon_warehouse_candidates cwc where cwc.promoted_card_printing_id = cpr.id);

  if v_printing_refs <> 0 then
    raise exception 'ENRICH-13E1 duplicate child printing dependency guard failed: % refs', v_printing_refs;
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
      'select count(*) from %I.%I where %I in (select duplicate_card_print_id from enrich13e1_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'ENRICH-13E1 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
  end if;
end $$;

delete from public.external_mappings em
using enrich13e1_targets target
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
from enrich13e1_targets target
where em.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_identity cpi
using enrich13e1_targets target
where cpi.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_traits cpt
using enrich13e1_targets target
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
from enrich13e1_targets target
where cpt.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_species cps
using enrich13e1_targets target
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
from enrich13e1_targets target
where cps.card_print_id = target.duplicate_card_print_id;

delete from public.card_printings cpr
using enrich13e1_targets target
where cpr.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_printings owner_printing
    where owner_printing.card_print_id = target.canonical_owner_card_print_id
      and owner_printing.finish_key = cpr.finish_key
  );

update public.card_printings cpr
set card_print_id = target.canonical_owner_card_print_id
from enrich13e1_targets target
where cpr.card_print_id = target.duplicate_card_print_id;

do $$
declare
  v_remaining_duplicate_dependencies integer;
  v_identity_duplicates integer;
  v_external_duplicates integer;
  v_child_duplicates integer;
begin
  select
    (select count(*) from public.external_mappings where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_print_identity where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_print_traits where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
    + (select count(*) from public.card_printings where card_print_id in (select duplicate_card_print_id from enrich13e1_targets))
  into v_remaining_duplicate_dependencies;

  if v_remaining_duplicate_dependencies <> 0 then
    raise exception 'ENRICH-13E1 remaining duplicate dependencies guard failed: % rows', v_remaining_duplicate_dependencies;
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
    raise exception 'ENRICH-13E1 active identity duplicate guard failed: % groups', v_identity_duplicates;
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
    raise exception 'ENRICH-13E1 external mapping duplicate guard failed: % groups', v_external_duplicates;
  end if;

  select count(*) into v_child_duplicates
  from (
    select card_print_id, finish_key
    from public.card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) dupes;
  if v_child_duplicates <> 0 then
    raise exception 'ENRICH-13E1 child printing duplicate guard failed: % groups', v_child_duplicates;
  end if;
end $$;

delete from public.card_prints cp
using enrich13e1_targets target
where cp.id = target.duplicate_card_print_id;

rollback;

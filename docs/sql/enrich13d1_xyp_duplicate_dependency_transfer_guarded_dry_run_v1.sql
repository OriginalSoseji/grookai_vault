-- ENRICH-13D1-XYP-DUPLICATE-DEPENDENCY-TRANSFER-DRY-RUN GUARDED DRY-RUN TRANSACTION V1
-- Generated for review/proof only.
-- Package fingerprint: 9715c745f549bff135a0f8f18718e8d89dbcbc185309f11a5c474f68181368c2
-- Scope: 56 XYP duplicate parent dependency transfers.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

create temporary table enrich13d1_targets (
  duplicate_card_print_id uuid primary key,
  canonical_owner_card_print_id uuid not null,
  set_code text not null,
  card_number text not null,
  duplicate_name text not null,
  canonical_owner_name text not null,
  source_external_id text
) on commit drop;

insert into enrich13d1_targets (
  duplicate_card_print_id,
  canonical_owner_card_print_id,
  set_code,
  card_number,
  duplicate_name,
  canonical_owner_name,
  source_external_id
) values
  ('58c58090-9800-4765-a647-9aefa576bc13'::uuid, '6600f6b5-8b32-45f3-a121-37d108c7274e'::uuid, 'xyp', 'XY07', 'Xerneas EX', 'Xerneas-EX', 'xyp-XY07'),
  ('6bc3b8aa-5c50-4ac0-b6d6-4afed13e2f90'::uuid, 'f8df7ade-2a33-4097-96cb-85711be82b05'::uuid, 'xyp', 'XY08', 'Yveltal EX', 'Yveltal-EX', 'xyp-XY08'),
  ('66c651ae-6796-4c5e-b1a1-eac792001b2c'::uuid, '305fe59c-2a9f-462e-b1c6-b6be85b570cc'::uuid, 'xyp', 'XY09', 'Garchomp EX', 'Garchomp-EX', 'xyp-XY09'),
  ('21224447-ada6-4b08-b43e-0ff7143821f2'::uuid, '79ba62da-08f3-428a-b452-438b0492cf77'::uuid, 'xyp', 'XY17', 'Charizard EX', 'Charizard-EX', 'xyp-XY17'),
  ('8f95acba-29e3-4721-8609-10976aae510b'::uuid, '0d2c01ee-7ae5-4540-b4bd-8c0394d7e08d'::uuid, 'xyp', 'XY18', 'Chesnaught EX', 'Chesnaught-EX', 'xyp-XY18'),
  ('d3feca43-01e1-4796-b51b-8d835721a938'::uuid, 'f6a684c4-bea0-4ea2-bb80-bfd059894829'::uuid, 'xyp', 'XY19', 'Delphox EX', 'Delphox-EX', 'xyp-XY19'),
  ('925a4bd1-ca5d-4490-b508-e8af810ba83f'::uuid, '5a72b200-f6f2-4e27-a736-83b4e49a1d61'::uuid, 'xyp', 'XY20', 'Greninja EX', 'Greninja-EX', 'xyp-XY20'),
  ('f4664236-a902-40d7-b85f-02281086d478'::uuid, '9a874210-ac76-49ed-973a-7618c64280a3'::uuid, 'xyp', 'XY25', 'Krookodile EX', 'Krookodile-EX', 'xyp-XY25'),
  ('e262d148-38f7-437b-9101-466b14d8bb71'::uuid, '97e20721-78f7-4456-9e4d-a0fc966ba090'::uuid, 'xyp', 'XY28', 'Venusaur EX', 'Venusaur-EX', 'xyp-XY28'),
  ('611c81d5-427a-4d06-af47-683a9328d408'::uuid, 'd9257ce8-437f-4313-8188-6f808632ba03'::uuid, 'xyp', 'XY29', 'Charizard EX', 'Charizard-EX', 'xyp-XY29'),
  ('f46d7286-3522-4a9c-9d02-bb1e2aac838d'::uuid, '0a407511-8a6c-41f9-83b7-ffbe0f7d4ff9'::uuid, 'xyp', 'XY30', 'Blastoise EX', 'Blastoise-EX', 'xyp-XY30'),
  ('9731b3b7-f419-47f9-8bd0-ca0e58f24254'::uuid, 'cb3f5b0c-387f-42ce-92ad-f90efd536d08'::uuid, 'xyp', 'XY34', 'Metagross EX', 'Metagross-EX', 'xyp-XY34'),
  ('a6ecd3e5-8565-4751-9b3d-d600b9e96cb0'::uuid, '25a7e282-cbbf-45ed-8dc6-405ce028d09e'::uuid, 'xyp', 'XY35', 'M Metagross EX', 'M Metagross-EX', 'xyp-XY35'),
  ('c463af8f-dc05-4701-a85a-5701759785ed'::uuid, '84d52140-a09e-4903-ba5b-fa22053515b4'::uuid, 'xyp', 'XY41', 'Kyogre EX', 'Kyogre-EX', 'xyp-XY41'),
  ('9fdb0609-ffb8-4cc8-9dc4-f761b35e625e'::uuid, '8eccabb3-05f2-4032-9c26-a9945fe80a46'::uuid, 'xyp', 'XY42', 'Groudon EX', 'Groudon-EX', 'xyp-XY42'),
  ('9dadc33c-1dd9-4f06-8fa7-d9b65b813fd0'::uuid, '81f376d8-63f5-4c64-9020-3c4475491105'::uuid, 'xyp', 'XY43', 'Diancie EX', 'Diancie-EX', 'xyp-XY43'),
  ('bd8c9916-39a4-4167-bb51-028dad615434'::uuid, 'a8b51a1d-6470-46e6-8339-078e85beb3eb'::uuid, 'xyp', 'XY44', 'M Diancie EX', 'M Diancie-EX', 'xyp-XY44'),
  ('08620178-a665-47b4-946d-563792c9f0d1'::uuid, '7f2a6b58-dddf-47ea-b448-9ff5d1651595'::uuid, 'xyp', 'XY45', 'Gallade EX', 'Gallade-EX', 'xyp-XY45'),
  ('4ce6a624-8fe0-497c-9814-ba27d11f4457'::uuid, '47d8123b-1371-41bd-a52a-6df24aeb76a1'::uuid, 'xyp', 'XY53', 'Sceptile EX', 'Sceptile-EX', 'xyp-XY53'),
  ('199e8699-1e8d-42dd-93d3-ac67f7e247be'::uuid, '10f41a7c-3990-42b8-a186-57defe900734'::uuid, 'xyp', 'XY54', 'Blaziken EX', 'Blaziken-EX', 'xyp-XY54'),
  ('3e26a8f0-f57a-4cff-9427-a364e852e2ea'::uuid, '076c588b-a52a-426a-b43e-21152616f508'::uuid, 'xyp', 'XY55', 'Swampert EX', 'Swampert-EX', 'xyp-XY55'),
  ('4dc9624b-0430-46de-9104-fa62bbb77411'::uuid, '08acb1ab-8523-47ed-9b0e-4f5648c87ab8'::uuid, 'xyp', 'XY61', 'Flygon EX', 'Flygon-EX', 'xyp-XY61'),
  ('880bf738-91f8-44f0-9026-5517058e9cbe'::uuid, 'ff324c30-a3ca-4b8b-8c4e-8049f33b9e19'::uuid, 'xyp', 'XY62', 'Absol EX', 'Absol-EX', 'xyp-XY62'),
  ('dc99db79-d50c-4e88-bc44-77d1bc265f78'::uuid, '0259c3c5-97ca-4d3a-bfcf-78a434b07f33'::uuid, 'xyp', 'XY63', 'M Absol EX', 'M Absol-EX', 'xyp-XY63'),
  ('04d1872d-6505-466f-9c01-bcdf79aea618'::uuid, '52c18531-8a85-45be-8626-6d9a6f5c68d9'::uuid, 'xyp', 'XY66', 'Rayquaza EX', 'Rayquaza-EX', 'xyp-XY66'),
  ('f1d1a0a7-521c-4b41-9086-65609e4c7dc0'::uuid, 'e9b80833-603d-4505-9195-e490e6cdc6a5'::uuid, 'xyp', 'XY69', 'Rayquaza EX', 'Rayquaza-EX', 'xyp-XY69'),
  ('0746e844-c0b6-416a-a4f8-59a383c00577'::uuid, 'ad45223e-5318-413d-a343-013cdf81a1b0'::uuid, 'xyp', 'XY70', 'Tyrantrum EX', 'Tyrantrum-EX', 'xyp-XY70'),
  ('54d64715-33fb-4b18-be8a-fc15903f7056'::uuid, '2c7966df-555e-423e-b4fa-730611505275'::uuid, 'xyp', 'XY71', 'Hoopa EX', 'Hoopa-EX', 'xyp-XY71'),
  ('868a28a2-1202-485c-ba5c-9e9f5d877120'::uuid, '3442ba73-f66a-477e-9cb5-8bd8cba7eba2'::uuid, 'xyp', 'XY72', 'Latios EX', 'Latios-EX', 'xyp-XY72'),
  ('6c84a128-e234-44f6-b3b5-89e716739640'::uuid, 'e1a8be62-d5b7-4ffb-b0c7-462d1bc09dc8'::uuid, 'xyp', 'XY73', 'Rayquaza EX', 'Rayquaza-EX', 'xyp-XY73'),
  ('a9fe2b90-45c5-4f36-8b29-bb5d1f1253a3'::uuid, '1ae8ad54-92c0-4375-8cdb-622f8a59e3c1'::uuid, 'xyp', 'XY84', 'Pikachu EX', 'Pikachu-EX', 'xyp-XY84'),
  ('90ff03b9-f123-4910-b8d2-2b1b8d01de8a'::uuid, 'a5091e90-ad56-4791-b605-97afb187e834'::uuid, 'xyp', 'XY85', 'Hoopa EX', 'Hoopa-EX', 'xyp-XY85'),
  ('c98aa790-ece8-4ef2-9a88-bafc43cf0a81'::uuid, 'b63dbed6-96c5-4865-8df5-89630a8e9d9e'::uuid, 'xyp', 'XY86', 'M Blaziken EX', 'M Blaziken-EX', 'xyp-XY86'),
  ('4a972191-0050-4761-8dcf-d51aa6af0989'::uuid, 'cd1e8985-0c07-4eb7-aef2-ef5115885dd3'::uuid, 'xyp', 'XY87', 'M Swampert EX', 'M Swampert-EX', 'xyp-XY87'),
  ('4f7b83ca-6291-4f21-bc09-add8bb57e266'::uuid, '1896918c-c20f-4e65-8642-d61d1eb84aff'::uuid, 'xyp', 'XY97', 'Aerodactyl EX', 'Aerodactyl-EX', 'xyp-XY97'),
  ('9dcb962b-c341-4ec8-bf46-c17ec39bcf59'::uuid, '3673b751-e636-46d2-8f38-5a833d2d78c4'::uuid, 'xyp', 'XY98', 'M Aerodactyl EX', 'M Aerodactyl-EX', 'xyp-XY98'),
  ('d159fd8a-4a12-4109-8200-36416c2a2ad2'::uuid, 'eedbb474-00a4-41fe-857d-17109102658b'::uuid, 'xyp', 'XY102', 'Aurorus EX', 'Aurorus-EX', 'xyp-XY102'),
  ('85e239b5-64d6-4ad8-8b3e-e705d2230f8e'::uuid, '9ece083e-4361-4e0a-b65b-3f9c791d522d'::uuid, 'xyp', 'XY103', 'Mawile EX', 'Mawile-EX', 'xyp-XY103'),
  ('69b69961-c668-468d-875f-af02e758c4d9'::uuid, 'b301e859-ad1f-4165-9a85-917fc4adac13'::uuid, 'xyp', 'XY104', 'M Mawile EX', 'M Mawile-EX', 'xyp-XY104'),
  ('f921a1a3-4d49-4da1-bc20-362e14e2616f'::uuid, '5391ffa9-0374-458c-be51-7fc0fbd3812b'::uuid, 'xyp', 'XY106', 'Gyarados EX', 'Gyarados-EX', 'xyp-XY106'),
  ('84c6fde5-ec72-4bc8-abf7-ac1f3d646c2b'::uuid, '81f73254-b9d3-4ab9-bba6-fd6440a2019f'::uuid, 'xyp', 'XY107', 'Mewtwo EX', 'Mewtwo-EX', 'xyp-XY107'),
  ('d07b5d10-99bc-4eea-a6c0-006653f4e6db'::uuid, 'd25e49f0-8513-4aa0-9947-afdfb26cd7cc'::uuid, 'xyp', 'XY108', 'Machamp EX', 'Machamp-EX', 'xyp-XY108'),
  ('a87c065b-cbeb-4566-b4b8-81430723bb93'::uuid, 'fe82ee50-1c48-42d3-ad45-65de76a81be3'::uuid, 'xyp', 'XY121', 'Charizard EX', 'Charizard-EX', 'xyp-XY121'),
  ('e8e43d13-0ee1-4433-91ef-fbe866b48e57'::uuid, '013f6060-be7c-45e3-ae65-610f5bae7822'::uuid, 'xyp', 'XY122', 'Blastoise EX', 'Blastoise-EX', 'xyp-XY122'),
  ('a9c6bd70-e259-4367-a7f3-c101d445eec1'::uuid, '61f75475-0503-453c-94f8-88e45943fd69'::uuid, 'xyp', 'XY123', 'Venusaur EX', 'Venusaur-EX', 'xyp-XY123'),
  ('98cf50cf-7b25-41ae-bac1-e6f6f30904c9'::uuid, 'c1fa0bfa-ab99-41d6-9423-96effff0db10'::uuid, 'xyp', 'XY124', 'Pikachu EX', 'Pikachu-EX', 'xyp-XY124'),
  ('163d74c3-97a1-498a-ae80-a2a679a818b9'::uuid, 'd49b3435-a672-4c96-a88c-e27a2a25f55a'::uuid, 'xyp', 'XY125', 'Mewtwo EX', 'Mewtwo-EX', 'xyp-XY125'),
  ('2411eb14-4660-45b1-8bc7-ff7638f20d7d'::uuid, '00dad38a-e1b4-423d-a142-2d21a8b78c2a'::uuid, 'xyp', 'XY126', 'Mew EX', 'Mew-EX', 'xyp-XY126'),
  ('7193b9ae-ed5b-457e-b67f-efef355afb96'::uuid, '9e4886e0-b28d-49a2-91c6-a4f56a8d5463'::uuid, 'xyp', 'XY133', 'Ash Greninja EX', 'Ash-Greninja-EX', 'xyp-XY133'),
  ('b0600304-d67b-4247-a22e-0608e41bce1b'::uuid, '3fe897a2-89c9-4ac4-95a7-2cfaa7297db4'::uuid, 'xyp', 'XY148', 'Shaymin EX', 'Shaymin-EX', 'xyp-XY148'),
  ('5677ca01-b8f2-42db-8735-fb33b4e8e57b'::uuid, '7087218e-f25a-4427-ab0a-7c419566792a'::uuid, 'xyp', 'XY149', 'Xerneas EX', 'Xerneas-EX', 'xyp-XY149'),
  ('c5b41380-01c1-48fe-a436-8641686db1f5'::uuid, '0a00ba6c-905f-4daf-9cb6-65c4a2137ccc'::uuid, 'xyp', 'XY151', 'Zygarde EX', 'Zygarde-EX', 'xyp-XY151'),
  ('f87b9751-2451-4ce0-95f8-8e092d216904'::uuid, 'ce9359fe-82b3-4ecf-9d98-794a4489906d'::uuid, 'xyp', 'XY153', 'Ho Oh', 'Ho-Oh', 'xyp-XY153'),
  ('ce148dc6-45fe-460e-b3c5-cf3483b494b5'::uuid, 'ef28e6f7-269a-4190-88ec-33ba5ccba6e6'::uuid, 'xyp', 'XY157', 'Beedrill EX', 'Beedrill-EX', 'xyp-XY157'),
  ('84b007d0-449c-44fa-bef1-f5331638f50f'::uuid, 'be43ca5e-2ebc-4275-9464-91c4b6af5018'::uuid, 'xyp', 'XY170', 'Salamence EX', 'Salamence-EX', 'xyp-XY170'),
  ('39dec21c-fef0-441e-a900-aeabc07b3f93'::uuid, 'd3d63cac-4f16-44a3-80c1-6b17158a47d4'::uuid, 'xyp', 'XY173', 'Volcanion EX', 'Volcanion-EX', 'xyp-XY173');

do $$
declare
  v_targets integer;
  v_bad_identity integer;
  v_suffix_rows integer;
  v_printing_refs integer;
  v_disallowed_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from enrich13d1_targets;
  if v_targets <> 56 then
    raise exception 'ENRICH-13D1 target count guard failed: expected 56, got %', v_targets;
  end if;

  select count(*) into v_bad_identity
  from enrich13d1_targets target
  left join public.card_prints duplicate on duplicate.id = target.duplicate_card_print_id
  left join public.card_prints owner on owner.id = target.canonical_owner_card_print_id
  where duplicate.id is null
     or owner.id is null
     or duplicate.id = owner.id
     or owner.set_code <> 'xyp'
     or target.set_code <> 'xyp'
     or duplicate.set_code is not null
     or duplicate.number is not null
     or coalesce(owner.number, '') <> target.card_number;

  if v_bad_identity <> 0 then
    raise exception 'ENRICH-13D1 parent identity guard failed: % rows', v_bad_identity;
  end if;

  select count(*) into v_suffix_rows
  from enrich13d1_targets
  where card_number ~ '[[:alpha:]]$';
  if v_suffix_rows <> 0 then
    raise exception 'ENRICH-13D1 suffix exclusion guard failed: % rows', v_suffix_rows;
  end if;

  select count(*) into v_printing_refs
  from public.card_printings cpr
  join enrich13d1_targets target on target.duplicate_card_print_id = cpr.card_print_id
  where exists (select 1 from public.external_printing_mappings epm where epm.card_printing_id = cpr.id)
     or exists (select 1 from public.vault_item_instances vii where vii.card_printing_id = cpr.id)
     or exists (select 1 from public.canon_warehouse_candidates cwc where cwc.promoted_card_printing_id = cpr.id);

  if v_printing_refs <> 0 then
    raise exception 'ENRICH-13D1 duplicate child printing dependency guard failed: % refs', v_printing_refs;
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
      'select count(*) from %I.%I where %I in (select duplicate_card_print_id from enrich13d1_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_parent_refs := v_disallowed_parent_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_parent_refs <> 0 then
    raise exception 'ENRICH-13D1 disallowed parent dependency guard failed: % refs', v_disallowed_parent_refs;
  end if;
end $$;

delete from public.external_mappings em
using enrich13d1_targets target
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
from enrich13d1_targets target
where em.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_identity cpi
using enrich13d1_targets target
where cpi.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_traits cpt
using enrich13d1_targets target
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
from enrich13d1_targets target
where cpt.card_print_id = target.duplicate_card_print_id;

delete from public.card_print_species cps
using enrich13d1_targets target
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
from enrich13d1_targets target
where cps.card_print_id = target.duplicate_card_print_id;

delete from public.card_printings cpr
using enrich13d1_targets target
where cpr.card_print_id = target.duplicate_card_print_id
  and exists (
    select 1
    from public.card_printings owner_printing
    where owner_printing.card_print_id = target.canonical_owner_card_print_id
      and owner_printing.finish_key = cpr.finish_key
  );

update public.card_printings cpr
set card_print_id = target.canonical_owner_card_print_id
from enrich13d1_targets target
where cpr.card_print_id = target.duplicate_card_print_id;

do $$
declare
  v_remaining_duplicate_dependencies integer;
  v_identity_duplicates integer;
  v_external_duplicates integer;
  v_child_duplicates integer;
begin
  select
    (select count(*) from public.external_mappings where card_print_id in (select duplicate_card_print_id from enrich13d1_targets))
    + (select count(*) from public.card_print_identity where card_print_id in (select duplicate_card_print_id from enrich13d1_targets))
    + (select count(*) from public.card_print_traits where card_print_id in (select duplicate_card_print_id from enrich13d1_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select duplicate_card_print_id from enrich13d1_targets))
    + (select count(*) from public.card_printings where card_print_id in (select duplicate_card_print_id from enrich13d1_targets))
  into v_remaining_duplicate_dependencies;

  if v_remaining_duplicate_dependencies <> 0 then
    raise exception 'ENRICH-13D1 remaining duplicate dependencies guard failed: % rows', v_remaining_duplicate_dependencies;
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
    raise exception 'ENRICH-13D1 active identity duplicate guard failed: % groups', v_identity_duplicates;
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
    raise exception 'ENRICH-13D1 external mapping duplicate guard failed: % groups', v_external_duplicates;
  end if;

  select count(*) into v_child_duplicates
  from (
    select card_print_id, finish_key
    from public.card_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) dupes;
  if v_child_duplicates <> 0 then
    raise exception 'ENRICH-13D1 child printing duplicate guard failed: % groups', v_child_duplicates;
  end if;
end $$;

delete from public.card_prints cp
using enrich13d1_targets target
where cp.id = target.duplicate_card_print_id;

rollback;

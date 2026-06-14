-- English Master Index PKG-06C-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: e89f24ba671422a6198da0f9668753409cee408321c178248e8f78fe56639eec
-- Package fingerprint: 839a42b870b455a16055c88c5b4e39c4a83da421e4cd36df581eee4358000684

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg06c_supported_child_printings (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  set_key text not null,
  card_number text not null,
  card_name text not null,
  finish_key text not null,
  provenance_source text not null,
  provenance_ref text not null,
  created_by text not null
) on commit drop;

insert into pkg06c_supported_child_printings (
  card_printing_id,
  card_print_id,
  set_key,
  card_number,
  card_name,
  finish_key,
  provenance_source,
  provenance_ref,
  created_by
) values
  ('9bfbba3b-7aa5-4e9d-89d3-6e37359cb4ee'::uuid, '3adadb08-a9ef-4879-af78-ef8f6f9decf6'::uuid, 'neo4', '106', 'Shining Celebi', 'holo', 'verified_master_set_index_v1', 'neo4:106:holo', 'pkg06c_supported_finish_subset_dry_run_v1'),
  ('cfb1e942-b355-4ddb-ac0b-42b0109919f2'::uuid, '144e42f1-b803-42ac-aabe-a3db97c16fa6'::uuid, 'neo4', '107', 'Shining Charizard', 'holo', 'verified_master_set_index_v1', 'neo4:107:holo', 'pkg06c_supported_finish_subset_dry_run_v1'),
  ('1816d38e-36a0-4e65-a40c-a84cda2e4220'::uuid, '01c5a20c-0d8c-4274-a55d-614b38b64fec'::uuid, 'neo4', '108', 'Shining Kabutops', 'holo', 'verified_master_set_index_v1', 'neo4:108:holo', 'pkg06c_supported_finish_subset_dry_run_v1'),
  ('6a123f5e-2371-4f2b-9d75-95abab7db6ac'::uuid, '762b7cfc-3b44-4d9b-aa10-2b9539cf86e6'::uuid, 'neo4', '109', 'Shining Mewtwo', 'holo', 'verified_master_set_index_v1', 'neo4:109:holo', 'pkg06c_supported_finish_subset_dry_run_v1'),
  ('77a7fd2a-48aa-458e-ad5a-db0f890461ed'::uuid, 'afde284e-1cd1-422d-b6fa-a649c6f3e49d'::uuid, 'neo4', '110', 'Shining Noctowl', 'holo', 'verified_master_set_index_v1', 'neo4:110:holo', 'pkg06c_supported_finish_subset_dry_run_v1'),
  ('0b34f47b-860b-41f3-88f5-d71e9b543b15'::uuid, '3f5bba1d-3d0c-4188-8abf-1945d315decd'::uuid, 'neo4', '111', 'Shining Raichu', 'holo', 'verified_master_set_index_v1', 'neo4:111:holo', 'pkg06c_supported_finish_subset_dry_run_v1'),
  ('4a360cee-f686-4c13-9e61-6ef3452bc185'::uuid, '4b1a138c-ff9d-44de-91b4-eee95aadf558'::uuid, 'neo4', '112', 'Shining Steelix', 'holo', 'verified_master_set_index_v1', 'neo4:112:holo', 'pkg06c_supported_finish_subset_dry_run_v1'),
  ('f68d1685-b298-4ab3-b42a-14d17eb20364'::uuid, 'de40da7c-1283-4fe3-ab1b-a84948e88df8'::uuid, 'neo4', '113', 'Shining Tyranitar', 'holo', 'verified_master_set_index_v1', 'neo4:113:holo', 'pkg06c_supported_finish_subset_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06c_supported_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06c_supported_child_printings;
  select count(distinct set_key) into set_count from pkg06c_supported_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06c_supported_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06c_supported_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06c_supported_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 8 then raise exception 'PKG-06C child count drift: %', child_count; end if;
  if parent_count <> 8 then raise exception 'PKG-06C parent count drift: %', parent_count; end if;
  if set_count <> 1 then raise exception 'PKG-06C set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06C unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06C existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06C id collision count: %', id_collision_count; end if;
end $$;

insert into public.card_printings (
  id,
  card_print_id,
  finish_key,
  is_provisional,
  provenance_source,
  provenance_ref,
  created_by
)
select
  card_printing_id,
  card_print_id,
  finish_key,
  false,
  provenance_source,
  provenance_ref,
  created_by
from pkg06c_supported_child_printings;

select
  'PKG-06C-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS'::text as package_id,
  'e89f24ba671422a6198da0f9668753409cee408321c178248e8f78fe56639eec'::text as source_readiness_fingerprint,
  '839a42b870b455a16055c88c5b4e39c4a83da421e4cd36df581eee4358000684'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06c_supported_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06c_supported_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06c_supported_child_printings)::int as planned_child_rows;

rollback;

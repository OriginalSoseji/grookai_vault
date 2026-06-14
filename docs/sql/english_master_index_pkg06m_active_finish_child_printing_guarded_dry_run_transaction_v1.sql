-- English Master Index PKG-06M-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: 3152748852069897bb63e10e138fd46dd508f492b2124a3e8665bd9763a7ab38
-- Package fingerprint: 33c58f8b631f87aa6b798c054a3a9acdf0a149536e772de21376867129944b66

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06m_active_child_printings (
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

insert into pkg06m_active_child_printings (
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
  ('a01ef970-838c-4a7a-b612-b6549d9e810f'::uuid, 'ed70b926-0713-46d7-bd0c-0a2cb00fde87'::uuid, 'bwp', 'BW13', 'Minccino', 'cosmos', 'verified_master_set_index_v1', 'bwp:BW13:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('90fe28a3-8584-48a0-b4d3-fb12e6f3ec1a'::uuid, 'b4e7b7f6-1853-46b2-a2c1-314c972a9dab'::uuid, 'bwp', 'BW25', 'Scraggy', 'cosmos', 'verified_master_set_index_v1', 'bwp:BW25:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('1f9eca18-80ee-4853-b119-4ee16ca85dda'::uuid, '7d2a2ef3-947f-45e1-b131-f187756d25bd'::uuid, 'bwp', 'BW34', 'Luxio', 'cosmos', 'verified_master_set_index_v1', 'bwp:BW34:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('6ef8d0bd-a586-48ec-9d36-e5cdce5ac278'::uuid, 'edf0bf05-f1c1-491c-bb1a-2a9a67f7e11f'::uuid, 'ecard2', '148', 'Kingdra', 'holo', 'verified_master_set_index_v1', 'ecard2:148:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('ca8aaf7b-4564-41fc-8b61-52050229782c'::uuid, '10984a73-42e1-4d43-b849-2362ca0d3573'::uuid, 'ecard2', '149', 'Lugia', 'holo', 'verified_master_set_index_v1', 'ecard2:149:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('be6c16b5-93ae-4532-8350-93c203469d76'::uuid, '8ae44549-d90a-4fdc-b172-129a0aad89bd'::uuid, 'ecard2', '150', 'Nidoking', 'holo', 'verified_master_set_index_v1', 'ecard2:150:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('06ee4e68-ff3f-4787-9cb4-183ffb22f2ab'::uuid, '90d02205-2ea4-4032-a1ef-a4ac2434aac2'::uuid, 'hgss2', '5', 'Mismagius', 'normal', 'verified_master_set_index_v1', 'hgss2:5:normal', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('d622ca54-3a47-4aba-b444-38682842bd17'::uuid, 'a7e40af1-416f-4e1e-9764-353276710382'::uuid, 'hgss2', '26', 'Tyranitar', 'normal', 'verified_master_set_index_v1', 'hgss2:26:normal', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('7b87b736-803d-441b-81dd-c6d85d0480b2'::uuid, 'a30dd8d5-2b21-4092-8582-3da5477680f6'::uuid, 'hgss2', 'TWO', 'Alph Lithograph', 'holo', 'verified_master_set_index_v1', 'hgss2:TWO:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('d75f2f12-d5eb-4f83-baca-8e2528878820'::uuid, '0856700a-d0d4-49fb-84e6-27730beee29e'::uuid, 'me02', '3', 'Vileplume', 'cosmos', 'verified_master_set_index_v1', 'me02:3:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('24f42fbe-c38c-4451-917f-f03cd843c438'::uuid, '190e9217-eafb-4a79-96cc-283e21d6e691'::uuid, 'me02', '26', 'Suicune', 'cosmos', 'verified_master_set_index_v1', 'me02:26:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('84a257a9-411b-4c6e-8a4a-9b2d8d0c5fcb'::uuid, '2f3295d3-5c80-4baa-8485-42bc6094d280'::uuid, 'me02', '79', 'Ambipom', 'holo', 'verified_master_set_index_v1', 'me02:79:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('2a7fbd49-e957-4452-823e-29b7ed3c9473'::uuid, 'da2e0954-6a8e-49cd-b958-bf8dc8e5a76a'::uuid, 'pl2', '15', 'Beedrill', 'normal', 'verified_master_set_index_v1', 'pl2:15:normal', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('71cf61ea-73a3-42ac-84d0-ef56b47f1e72'::uuid, '0fdb9d12-93e2-49c1-9808-b549b6140910'::uuid, 'pl2', '20', 'Gallade E4', 'cosmos', 'verified_master_set_index_v1', 'pl2:20:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('48cdd15d-31af-4d60-957e-56dc803b3698'::uuid, '11e2a93f-811f-48a9-a4c6-81a835711554'::uuid, 'pl2', '32', 'Rhyperior E4', 'holo', 'verified_master_set_index_v1', 'pl2:32:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('0f77b585-de65-4de5-a08a-518c5b43ae52'::uuid, '069c53c7-7485-434b-9bd8-9e3d9b53ca82'::uuid, 'pop2', '5', 'Tauros', 'normal', 'verified_master_set_index_v1', 'pop2:5:normal', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('7fd55855-bc53-43fe-b731-63cc002c1713'::uuid, 'ba5dad59-94fb-4381-9b87-00eb500ccc22'::uuid, 'pop2', '9', 'Multi Technical Machine 01', 'normal', 'verified_master_set_index_v1', 'pop2:9:normal', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('f45c8d45-5ea5-4eee-a9e6-883332575b6c'::uuid, '65509b80-7282-406b-bc11-a1a25b526fcc'::uuid, 'pop2', '17', 'Celebi ex', 'cosmos', 'verified_master_set_index_v1', 'pop2:17:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('dda774de-1a9c-4ba5-b7a5-dc6dfa21ec00'::uuid, '2992e699-4147-44bc-a6f9-075578b45858'::uuid, 'ru1', '1', 'Venusaur', 'holo', 'verified_master_set_index_v1', 'ru1:1:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('6493ad5b-3389-4003-9070-7e4f2535d03b'::uuid, '9713c94f-7091-440a-aa60-8892f3c87ac3'::uuid, 'ru1', '7', 'Pikachu', 'holo', 'verified_master_set_index_v1', 'ru1:7:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('160058cd-dbfa-4c26-b127-cd0ec7397be0'::uuid, '1ec56d5e-a923-40a9-aa99-ce688f8a6394'::uuid, 'ru1', '9', 'Mewtwo', 'holo', 'verified_master_set_index_v1', 'ru1:9:holo', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('5e4973e9-ac49-4aa0-be51-f9e4f4a3b742'::uuid, 'def2ed23-cc25-4287-bc26-efc76694fff1'::uuid, 'sm10', '22', 'Arcanine', 'cosmos', 'verified_master_set_index_v1', 'sm10:22:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('6d1e9b8c-7c2e-464a-b7e2-0dc970d7336d'::uuid, '959ffbe4-673f-4349-9d95-423c262bb469'::uuid, 'sm10', '75', 'Mewtwo', 'cosmos', 'verified_master_set_index_v1', 'sm10:75:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('7b23635f-41f7-49eb-962f-106dcbba9eb9'::uuid, 'bffce463-454c-46be-b153-866141b06110'::uuid, 'sm10', '129', 'Melmetal', 'cosmos', 'verified_master_set_index_v1', 'sm10:129:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('bd61c976-d691-49b5-96bb-165beda4d05e'::uuid, '80426d02-ca72-44d2-8eac-a95ed3d370dd'::uuid, 'sm11', '51', 'Golisopod', 'cosmos', 'verified_master_set_index_v1', 'sm11:51:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('235ad83e-223c-4fcf-9d6d-1d780673bb49'::uuid, 'b52489d9-28a7-4dc1-8687-f1c458863db3'::uuid, 'sm11', '114', 'Garchomp', 'cosmos', 'verified_master_set_index_v1', 'sm11:114:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('f5136477-fafd-434f-ae4a-4ebd8d99048a'::uuid, '6a88e7c6-80be-4036-989b-0d01a904e29c'::uuid, 'sm11', '184', 'Silvally', 'cosmos', 'verified_master_set_index_v1', 'sm11:184:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('db8087e5-a292-45f7-943f-58599dbc98a4'::uuid, '19881e11-b8f7-4a37-bc56-6e2f6608777f'::uuid, 'sm7', '40', 'Wailord', 'cosmos', 'verified_master_set_index_v1', 'sm7:40:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('b723d872-51fa-4865-877c-9f01e3ced1ce'::uuid, 'e4e4ebdb-ea21-4b59-aa71-ae9245697d14'::uuid, 'sm7', '81', 'Groudon', 'cosmos', 'verified_master_set_index_v1', 'sm7:81:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1'),
  ('e40c3590-630b-4e69-8423-a3379c71745d'::uuid, '74b1832b-a760-4f6f-95af-b8d8eb8e2775'::uuid, 'sm7', '106', 'Salamence', 'cosmos', 'verified_master_set_index_v1', 'sm7:106:cosmos', 'pkg06m_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06m_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06m_active_child_printings;
  select count(distinct set_key) into set_count from pkg06m_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06m_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06m_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06m_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 30 then raise exception 'PKG-06M child count drift: %', child_count; end if;
  if parent_count <> 30 then raise exception 'PKG-06M parent count drift: %', parent_count; end if;
  if set_count <> 10 then raise exception 'PKG-06M set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06M unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06M existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06M id collision count: %', id_collision_count; end if;
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
from pkg06m_active_child_printings;

select
  'PKG-06M-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  '3152748852069897bb63e10e138fd46dd508f492b2124a3e8665bd9763a7ab38'::text as source_readiness_fingerprint,
  '33c58f8b631f87aa6b798c054a3a9acdf0a149536e772de21376867129944b66'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06m_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06m_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06m_active_child_printings)::int as planned_child_rows;

rollback;

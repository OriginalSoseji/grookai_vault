-- English Master Index PKG-06O-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: cbf85fe431198ce3905182788e9446fdbd77dba77eb645a3c0ac237bbb73c1b7
-- Package fingerprint: 1010018fb1c6e78cde69680d5ca6548b1c18a87889aa015e7306db45a8a99449

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06o_active_child_printings (
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

insert into pkg06o_active_child_printings (
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
  ('6094d858-bdb7-43c5-a46e-fb44bd4f8b55'::uuid, '34fcf0c5-d399-40f0-9991-0f79d5ec9d7e'::uuid, '2018sm', '11', 'Eevee', 'holo', 'verified_master_set_index_v1', '2018sm:11:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('4fba1a8f-89a5-4d1c-927a-385a39fced36'::uuid, '7bf4c9f2-4713-40df-a462-7f36164c6391'::uuid, 'base2', '17', 'Clefable', 'normal', 'verified_master_set_index_v1', 'base2:17:normal', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('9022747c-f7c2-4fc9-8962-26f030f1889c'::uuid, 'ce6ac2d3-7342-43bc-bdb3-272ab3d5a287'::uuid, 'base3', '15', 'Zapdos', 'cosmos', 'verified_master_set_index_v1', 'base3:15:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('4d39f5dd-5c4e-4fee-b3eb-a6f45f0c2d0e'::uuid, '87270efb-0586-4b45-a5b7-2290025157dc'::uuid, 'base5', '83', 'Dark Raichu', 'holo', 'verified_master_set_index_v1', 'base5:83:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('5323201d-ece7-4afd-b175-fa32cb455019'::uuid, '982ec0e7-dba7-45da-9a34-9110b970a08e'::uuid, 'bw8', '61', 'Gallade', 'cosmos', 'verified_master_set_index_v1', 'bw8:61:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('90173e60-3c12-4126-b869-bac2b9faa0b5'::uuid, '38b1c885-c206-4b33-bcff-518df070c964'::uuid, 'dp6', '131', 'Cynthia''s Feelings', 'cosmos', 'verified_master_set_index_v1', 'dp6:131:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('007c1f97-c3c9-4ea3-af52-fe60a95e8095'::uuid, '6611c72d-5fcb-4253-813f-766b25f2184d'::uuid, 'dpp', 'DP25', 'Tropical Wind', 'holo', 'verified_master_set_index_v1', 'dpp:DP25:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('c0c5cbf6-6232-44e4-8f45-3df93c9f680e'::uuid, '1e22707b-3069-4cec-b490-cea01912b714'::uuid, 'ex2', '93', 'Multi Energy', 'cosmos', 'verified_master_set_index_v1', 'ex2:93:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('abb3e339-3380-466b-830e-1ca20583e1d1'::uuid, 'f5fb70c6-b256-4097-bb0d-b01e8e77f3a1'::uuid, 'ex3', '15', 'Flygon', 'cosmos', 'verified_master_set_index_v1', 'ex3:15:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('1cc2d45d-801a-4047-bed8-7a83c2a8e548'::uuid, '0ffc8970-37ec-4b39-8eb1-30afd7559af7'::uuid, 'fut20', '1', 'Pikachu on the Ball', 'normal', 'verified_master_set_index_v1', 'fut20:1:normal', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('21cb8a6f-1442-48a4-9962-7cd44d174be2'::uuid, '9e0ec5b0-53fb-46a8-a8df-84bc784f01ee'::uuid, 'hgss3', 'THREE', 'Alph Lithograph', 'holo', 'verified_master_set_index_v1', 'hgss3:THREE:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('3f2188d8-f994-42ac-a497-b7d3f616eba8'::uuid, 'c84c5fb6-c82b-42ba-83ff-4a95792fd36d'::uuid, 'neo3', '65', 'Shining Gyarados', 'holo', 'verified_master_set_index_v1', 'neo3:65:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('c6232f46-6eaa-4a05-afba-41de983c4943'::uuid, 'fcef490a-df66-4609-8dae-9ee1c64c1be5'::uuid, 'neo3', '66', 'Shining Magikarp', 'holo', 'verified_master_set_index_v1', 'neo3:66:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('d41330b3-63ac-4fd0-a620-a0d3ab6cd468'::uuid, '660a040c-c8cb-4e40-900b-6ad9fd36e9da'::uuid, 'pl1', '38', 'Shaymin', 'cosmos', 'verified_master_set_index_v1', 'pl1:38:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('e1fc00b3-af6b-4990-a277-4d3f54dcb7b8'::uuid, '9cb42a75-9231-4295-b329-92916dad4878'::uuid, 'pop7', '2', 'Gallade', 'normal', 'verified_master_set_index_v1', 'pop7:2:normal', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('7c1c306a-ca2c-476f-99c5-9eb8ca0a3ce3'::uuid, 'c3879354-edb7-4ceb-8f09-78e1cdc03485'::uuid, 'pop7', '9', 'Stantler', 'cosmos', 'verified_master_set_index_v1', 'pop7:9:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('31bdad87-3f69-46cc-9176-6e157cededb7'::uuid, 'afb538d5-4c8b-4438-ab03-59530a95df0c'::uuid, 'sm2', '42', 'Alolan Golem', 'cosmos', 'verified_master_set_index_v1', 'sm2:42:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('2b97b725-efc2-4c01-bfd9-5694c55dc02b'::uuid, '633d664a-46b7-4b45-9155-e2e9fa1e2069'::uuid, 'sm2', '65', 'Machamp', 'cosmos', 'verified_master_set_index_v1', 'sm2:65:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('fba65140-91f9-4595-995b-6b55c3e40d0f'::uuid, 'f569f9de-4830-4406-91ce-e97f159d3872'::uuid, 'sm3', '33', 'Gyarados', 'cosmos', 'verified_master_set_index_v1', 'sm3:33:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('9867f9a4-cabd-4fa6-a392-dafc368b3086'::uuid, '44b92f31-c2a9-4cb5-bdbf-7f29eacfd06c'::uuid, 'sm3', '41', 'Raichu', 'cosmos', 'verified_master_set_index_v1', 'sm3:41:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('9ace33aa-4ab6-4644-af77-41b6b1d3b953'::uuid, 'ddf3c537-bbbe-478c-acb5-2634022c6db7'::uuid, 'sm3.5', '28', 'Pikachu', 'cosmos', 'verified_master_set_index_v1', 'sm3.5:28:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('dff0c5ad-9c1a-410a-a25d-0c02d3e25948'::uuid, '0e43c24f-9c92-45ed-9ddf-08c357071371'::uuid, 'sm6', '72', 'Zygarde', 'cosmos', 'verified_master_set_index_v1', 'sm6:72:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('33ddb6ee-4725-4031-a1be-312ffae2d00f'::uuid, '39392f73-5a93-4e9c-a1cd-ab2ba5218d35'::uuid, 'sm9', '119', 'Dragonite', 'cosmos', 'verified_master_set_index_v1', 'sm9:119:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('9f851756-3f7a-4e1b-9f62-edbd1abf087f'::uuid, 'd3fb5d46-ab92-46f5-b16a-d9bcf91883ef'::uuid, 'smp', 'SM247', 'Reshiram & Charizard-GX', 'holo', 'verified_master_set_index_v1', 'smp:SM247:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('4b5aaca5-a6ff-44a6-9317-9b0f54a9d9cd'::uuid, 'c10ca532-50bd-48c0-bb75-0b0c73c03072'::uuid, 'smp', 'SM248', 'Pikachu & Zekrom-GX', 'holo', 'verified_master_set_index_v1', 'smp:SM248:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('35bb0f3c-117e-484d-9358-097506207920'::uuid, '0a323582-0da9-4525-87e8-98363a040e54'::uuid, 'sv06', '100', 'Hisuian Arcanine', 'normal', 'verified_master_set_index_v1', 'sv06:100:normal', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('b5636aa2-ecdc-4a37-aaad-acb1b2f2b934'::uuid, '7324c779-c306-4922-b449-744475ca97b0'::uuid, 'sv08', '014', 'Rabsca', 'normal', 'verified_master_set_index_v1', 'sv08:14:normal', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('51653be0-92c0-456a-b7bc-c7f6fc5224dd'::uuid, 'debaa368-c72f-4d4f-8a7c-26421a46ccb3'::uuid, 'sv08', '038', 'Gouging Fire', 'normal', 'verified_master_set_index_v1', 'sv08:38:normal', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('5f57906b-7259-464f-b856-db149b26bece'::uuid, '44d6adc4-b377-4b2f-a58e-7bec0de9686a'::uuid, 'sv08.5', '40', 'Sylveon', 'cosmos', 'verified_master_set_index_v1', 'sv08.5:40:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('a0db6f43-2a17-46ab-9588-e2ce0e7c3d36'::uuid, 'f114b4a3-5225-4d59-9565-3302d9866a96'::uuid, 'swsh11', '37', 'Kingdra', 'normal', 'verified_master_set_index_v1', 'swsh11:37:normal', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('4245a9e3-ac85-4118-950a-6480480d6e9e'::uuid, '6127bc72-a261-4181-9532-201937ef1ea4'::uuid, 'swsh11', '74', 'Cresselia', 'holo', 'verified_master_set_index_v1', 'swsh11:74:holo', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('43c145ee-27d7-436c-b3b3-82b688f790ba'::uuid, 'fe52fa6f-5407-4697-9f18-4700169a8cff'::uuid, 'xy10', '56', 'Tyranitar', 'cosmos', 'verified_master_set_index_v1', 'xy10:56:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('ca92a8fc-9c3d-4e0c-9c2c-8a5cffd914e7'::uuid, 'e7f8c7de-2078-4142-a8b6-15f80128d46e'::uuid, 'xy10', '63', 'Lucario', 'cosmos', 'verified_master_set_index_v1', 'xy10:63:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('71214d7e-9181-4139-911b-36c3fa2ef8ae'::uuid, 'f869872b-30bb-4840-9050-fcd62f3f3f39'::uuid, 'xy11', '11', 'Shiftry', 'cosmos', 'verified_master_set_index_v1', 'xy11:11:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('a3619bb3-3651-4e9e-a4af-df0ec51afed9'::uuid, 'ce022c70-c119-402c-b45a-093b4baed782'::uuid, 'xy11', '64', 'Bisharp', 'cosmos', 'verified_master_set_index_v1', 'xy11:64:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('38999255-ae26-4ace-a63f-13b5f21f20a1'::uuid, '59ae0f12-340e-4db3-9438-8b45add133c8'::uuid, 'xy2', '70', 'Druddigon', 'cosmos', 'verified_master_set_index_v1', 'xy2:70:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('89666ddd-0e64-4b30-8226-9843cfd0dcd5'::uuid, '9b9d5c10-d3c8-4049-9e23-c8a82542a41e'::uuid, 'xy5', '65', 'Eelektross', 'cosmos', 'verified_master_set_index_v1', 'xy5:65:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('0b6f0005-8cd2-4b4c-810f-c8f80ee204bd'::uuid, '433a05e5-b760-44c4-bf8a-f90c894b85bb'::uuid, 'xy5', '110', 'Flygon', 'cosmos', 'verified_master_set_index_v1', 'xy5:110:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('5920c3a9-b6d2-4ac2-8ab7-ca3a3d11aa82'::uuid, 'eb0ee88c-4088-4bdf-a6d7-4cb732f76ed0'::uuid, 'xy6', '52', 'Dragonite', 'cosmos', 'verified_master_set_index_v1', 'xy6:52:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1'),
  ('5263c309-5720-4c34-b8fb-4478efd4cea7'::uuid, '6438ff7e-f25f-469f-a744-debd3a1a52f7'::uuid, 'xy6', '57', 'Salamence', 'cosmos', 'verified_master_set_index_v1', 'xy6:57:cosmos', 'pkg06o_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06o_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06o_active_child_printings;
  select count(distinct set_key) into set_count from pkg06o_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06o_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06o_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06o_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 40 then raise exception 'PKG-06O child count drift: %', child_count; end if;
  if parent_count <> 40 then raise exception 'PKG-06O parent count drift: %', parent_count; end if;
  if set_count <> 29 then raise exception 'PKG-06O set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06O unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06O existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06O id collision count: %', id_collision_count; end if;
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
from pkg06o_active_child_printings;

select
  'PKG-06O-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  'cbf85fe431198ce3905182788e9446fdbd77dba77eb645a3c0ac237bbb73c1b7'::text as source_readiness_fingerprint,
  '1010018fb1c6e78cde69680d5ca6548b1c18a87889aa015e7306db45a8a99449'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06o_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06o_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06o_active_child_printings)::int as planned_child_rows;

rollback;

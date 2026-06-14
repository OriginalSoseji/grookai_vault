-- English Master Index PKG-06L-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: dd1e8cc74ffdee1b00c4c9bbf48537c25161c75fea1d0d31e890c6872cb3a8ff
-- Package fingerprint: e33919f310fb71194f2bc5852345cd2f81d3a8b854b95885a832e703e170e6c1

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06l_active_child_printings (
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

insert into pkg06l_active_child_printings (
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
  ('e240774f-6f00-4da9-82b0-4356a2c6f9f9'::uuid, 'd6c5b531-550e-463c-be43-e2a6b9b86b7a'::uuid, '2015xy', '2', 'Lotad', 'holo', 'verified_master_set_index_v1', '2015xy:2:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('74738012-a6ad-495d-9137-3d77e5678c58'::uuid, 'eed99fce-c433-4583-a21f-e207b1f23b2b'::uuid, '2015xy', '3', 'Torchic', 'holo', 'verified_master_set_index_v1', '2015xy:3:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('8d877337-e31a-45da-8e44-a3e39a9423d5'::uuid, '65906508-6468-4220-8939-d3dde51b0d0c'::uuid, '2015xy', '7', 'Electrike', 'holo', 'verified_master_set_index_v1', '2015xy:7:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('d38cb492-e911-408c-afb7-3929f71e0c6a'::uuid, 'cb354025-1f27-484a-8175-df4ba23b9f2b'::uuid, 'bw1', '1', 'Snivy', 'cosmos', 'verified_master_set_index_v1', 'bw1:1:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('193c02fc-5448-4300-9041-faabd81390fd'::uuid, '2504c339-def5-471c-96bc-0120752883ec'::uuid, 'bw1', '15', 'Tepig', 'cosmos', 'verified_master_set_index_v1', 'bw1:15:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('c3a13e58-f08e-4f4b-b606-6bc32b7f3bcd'::uuid, 'cfce0cf8-6a23-420f-a5ff-4abfd4c11216'::uuid, 'bw1', '27', 'Oshawott', 'cosmos', 'verified_master_set_index_v1', 'bw1:27:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('2ce901e6-7187-4004-aa1b-e8be15bc712e'::uuid, '33fa423d-19cc-46a4-a3ff-09bac0c836ee'::uuid, 'bw10', '16', 'Blastoise', 'cosmos', 'verified_master_set_index_v1', 'bw10:16:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('7fe994e0-afb7-4181-88aa-301fe3302254'::uuid, '7bcff2e5-19f4-4e2d-b29e-a2ba362aec75'::uuid, 'bw10', '49', 'Machamp', 'cosmos', 'verified_master_set_index_v1', 'bw10:49:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('22b9fe95-6264-47f0-b388-471b59a648a8'::uuid, 'd21b2705-53f4-4b53-a4a9-e955b0c532da'::uuid, 'bw10', '69', 'Haxorus', 'cosmos', 'verified_master_set_index_v1', 'bw10:69:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('2f9680af-b15c-49fc-9cab-ef911bf290d7'::uuid, 'dfd3361e-95fe-47c1-b586-352ad9086be5'::uuid, 'bw11', '19', 'Charizard', 'cosmos', 'verified_master_set_index_v1', 'bw11:19:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('622bf617-f144-44f8-a6e3-4815161470f5'::uuid, '812b1aad-04d7-4099-935e-f94da25d7806'::uuid, 'bw11', '80', 'Lucario', 'cosmos', 'verified_master_set_index_v1', 'bw11:80:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('d94b7622-9ec8-4734-b524-332e1240ae23'::uuid, '59e62682-48db-40c3-863f-c181860b877d'::uuid, 'bw11', '90', 'Zoroark', 'cosmos', 'verified_master_set_index_v1', 'bw11:90:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('1ca31bb3-c9ca-4073-b263-0f6507292765'::uuid, 'b28f03db-9c58-4c5a-832a-3652d6c17301'::uuid, 'bw3', '13', 'Virizion', 'cosmos', 'verified_master_set_index_v1', 'bw3:13:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('f23f1253-c74d-45a4-b52e-ea365549d398'::uuid, '1180d399-e03e-4f51-a644-563dfe6d4c0e'::uuid, 'bw3', '34', 'Kyurem', 'cosmos', 'verified_master_set_index_v1', 'bw3:34:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('aae00522-e3dc-4d92-bae8-0a5b61ebbe1d'::uuid, '50f05b2e-a89f-4bd6-8725-c2a3454e0dee'::uuid, 'bw3', '84', 'Cobalion', 'cosmos', 'verified_master_set_index_v1', 'bw3:84:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('f62eedaa-10ad-4985-91a8-4d24b525a82b'::uuid, '38ff42f5-8f30-49d4-bd31-311fb5678bf9'::uuid, 'ecard3', 'H4', 'Beedrill', 'holo', 'verified_master_set_index_v1', 'ecard3:H4:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('0f4b05ae-f36a-4031-9931-e05a56e1b71d'::uuid, 'bbb1d304-fc24-42ed-945a-fc97a255934c'::uuid, 'ecard3', 'H6', 'Dewgong', 'holo', 'verified_master_set_index_v1', 'ecard3:H6:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('cfa65a6d-58fb-49a5-b180-946a5202e7a6'::uuid, '923a57d7-eadf-4cb4-822a-7c24d78161fa'::uuid, 'ecard3', 'H8', 'Forretress', 'holo', 'verified_master_set_index_v1', 'ecard3:H8:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('670cc238-b1e3-4ce6-a5b8-7d4e87c89c25'::uuid, '1dcb43b5-4c95-4bb3-a62f-9256224cf633'::uuid, 'ecard3', 'H9', 'Gengar', 'holo', 'verified_master_set_index_v1', 'ecard3:H9:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('3b110a23-d006-48d8-adda-ed806792b57e'::uuid, '3d85e8d6-b531-4f34-afde-98fd037e77d2'::uuid, 'pop9', '4', 'Regigigas', 'holo', 'verified_master_set_index_v1', 'pop9:4:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('bfdf6c79-2f2d-4ea9-a5e0-64c8e8834496'::uuid, '6c354617-6788-40bf-a7ef-c012a62ddcfc'::uuid, 'pop9', '8', 'Gabite', 'normal', 'verified_master_set_index_v1', 'pop9:8:normal', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('8f3c5069-66a2-4a51-96b9-6e81b954dc4d'::uuid, '58688767-db43-4138-b56f-86b8cebf1e0d'::uuid, 'pop9', '9', 'Lopunny', 'normal', 'verified_master_set_index_v1', 'pop9:9:normal', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('84b92a77-9a00-4e31-a5cf-7bdbf1ac4712'::uuid, '0f494f50-abf2-47ca-a25e-40fc9b33a071'::uuid, 'pop9', '10', 'Pachirisu', 'normal', 'verified_master_set_index_v1', 'pop9:10:normal', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('fc5ce9c0-3418-4853-a13b-26e31d36a03e'::uuid, 'ab49e04e-7462-4cb2-8a08-c4048c056369'::uuid, 'sm4', '28', 'Regice', 'cosmos', 'verified_master_set_index_v1', 'sm4:28:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('78670648-3afe-4362-8d1a-3858b0dc4d32'::uuid, '31fa9627-206c-43d4-bb35-74e876b99440'::uuid, 'sm4', '53', 'Regirock', 'cosmos', 'verified_master_set_index_v1', 'sm4:53:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('8e4a1b25-da72-4154-ac28-bd483a0acd12'::uuid, 'b96a39d5-347c-4658-a784-d9f9030ea903'::uuid, 'sm4', '68', 'Registeel', 'cosmos', 'verified_master_set_index_v1', 'sm4:68:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('2cd0596c-89cd-4738-a56d-c88fdbe75eac'::uuid, '9ac066fb-adeb-4b8c-a0d8-1b1583b78206'::uuid, 'sm4', '75', 'Jangmo-o', 'cosmos', 'verified_master_set_index_v1', 'sm4:75:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('cfd6d2cf-53b1-46c8-948b-a2fe16caf9ca'::uuid, 'ebf1b771-cc7d-430b-8adf-1f4a55d9b54d'::uuid, 'swsh12', '22', 'Rapidash', 'normal', 'verified_master_set_index_v1', 'swsh12:22:normal', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('1d26ac2e-0aee-4739-9231-dc2aaeae962f'::uuid, 'c2c8ea3c-282e-4a8f-98b8-d559332497a1'::uuid, 'swsh12', '36', 'Articuno', 'cosmos', 'verified_master_set_index_v1', 'swsh12:36:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('4453986d-81ef-4e96-ace3-3082b62293f1'::uuid, '61eba8fb-abff-4dd5-9e51-bb8d3f1a9910'::uuid, 'swsh12', '147', 'Archeops', 'normal', 'verified_master_set_index_v1', 'swsh12:147:normal', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('f6d884e5-23d9-4ec6-82f2-cc1cdadad2bf'::uuid, '2a38dbfa-2da0-4367-b44e-3d8ac796f68b'::uuid, 'swsh12', '156', 'Forest Seal Stone', 'normal', 'verified_master_set_index_v1', 'swsh12:156:normal', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('61380cc8-5b09-4d69-b6cc-ae1444cd0d6e'::uuid, '72c4ffc9-787c-407f-ba90-58e8ab925dee'::uuid, 'swsh4.5', '56', 'Indeedee', 'normal', 'verified_master_set_index_v1', 'swsh4.5:56:normal', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('ce5e5bbc-8bae-4eb5-9d82-47ffe1810e77'::uuid, '1adc8c40-9657-4152-b792-f2349c582981'::uuid, 'swsh4.5', '58', 'Boss''s Orders', 'holo', 'verified_master_set_index_v1', 'swsh4.5:58:holo', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('9ef2965f-11f7-47bf-8263-bfaac110702b'::uuid, '1d04ea71-3ba1-430c-a926-34e5764dc0c4'::uuid, 'swsh4.5', '60', 'Professor''s Research', 'cosmos', 'verified_master_set_index_v1', 'swsh4.5:60:cosmos', 'pkg06l_active_finish_child_printing_dry_run_v1'),
  ('d2686174-b14e-4dfc-9e35-51461d1c6464'::uuid, '1d04ea71-3ba1-430c-a926-34e5764dc0c4'::uuid, 'swsh4.5', '60', 'Professor''s Research', 'holo', 'verified_master_set_index_v1', 'swsh4.5:60:holo', 'pkg06l_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06l_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06l_active_child_printings;
  select count(distinct set_key) into set_count from pkg06l_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06l_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06l_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06l_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 35 then raise exception 'PKG-06L child count drift: %', child_count; end if;
  if parent_count <> 34 then raise exception 'PKG-06L parent count drift: %', parent_count; end if;
  if set_count <> 10 then raise exception 'PKG-06L set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06L unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06L existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06L id collision count: %', id_collision_count; end if;
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
from pkg06l_active_child_printings;

select
  'PKG-06L-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  'dd1e8cc74ffdee1b00c4c9bbf48537c25161c75fea1d0d31e890c6872cb3a8ff'::text as source_readiness_fingerprint,
  'e33919f310fb71194f2bc5852345cd2f81d3a8b854b95885a832e703e170e6c1'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06l_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06l_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06l_active_child_printings)::int as planned_child_rows;

rollback;

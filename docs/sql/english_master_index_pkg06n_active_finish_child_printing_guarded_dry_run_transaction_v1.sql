-- English Master Index PKG-06N-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: 03593d1d1bc85e794ee1f4327bd26f4061ec3cf2eac2a20fc60b690bae1274dc
-- Package fingerprint: a21913de6bb88b867dfd8d081cc4e0c2a813feaa4f48fba62a129296bf713987

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06n_active_child_printings (
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

insert into pkg06n_active_child_printings (
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
  ('106ce585-847b-4f7e-be5a-a44f325cedba'::uuid, 'ca560f24-c889-42e9-97b8-dcacb0375740'::uuid, '2011bw', '3', 'Tepig', 'holo', 'verified_master_set_index_v1', '2011bw:3:holo', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('6e50b741-6221-4655-bdb8-05315965d93c'::uuid, '5e9fef92-65af-41f8-a2cd-fc3f6342fc8c'::uuid, '2011bw', '7', 'Munna', 'holo', 'verified_master_set_index_v1', '2011bw:7:holo', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('1ab41134-b302-4c04-953e-2a8c48de6eda'::uuid, 'fad43142-6bff-48ec-b2a0-a1a6b8e51251'::uuid, 'bw2', '30', 'Beartic', 'cosmos', 'verified_master_set_index_v1', 'bw2:30:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('b1c0cb88-be0c-428f-a4c7-5f6478efcbf2'::uuid, 'b29f5f7a-c9d5-416e-9938-eeb3acef7465'::uuid, 'bw2', '56', 'Excadrill', 'cosmos', 'verified_master_set_index_v1', 'bw2:56:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('314fb566-fc5c-4e30-b945-67e4dd31e9b0'::uuid, '60ef1c8b-a004-41af-b008-40a722fc5c6b'::uuid, 'bw5', '3', 'Venusaur', 'cosmos', 'verified_master_set_index_v1', 'bw5:3:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('ba00ec88-051e-4453-ae86-ea15c64bb417'::uuid, '8dcb6716-734c-4e0f-870a-a47a2ccaec5c'::uuid, 'bw5', '66', 'Krookodile', 'cosmos', 'verified_master_set_index_v1', 'bw5:66:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('86601df6-63d7-4407-8a51-04c297d0da78'::uuid, 'c769b72b-4559-4eb1-a745-79d8514d4f6a'::uuid, 'bw9', '17', 'Reshiram', 'cosmos', 'verified_master_set_index_v1', 'bw9:17:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('d0649209-e79b-4e40-bae0-214c69665003'::uuid, '5a2dab46-36be-42a4-81eb-5cc8388e75a0'::uuid, 'bw9', '83', 'Dragonite', 'cosmos', 'verified_master_set_index_v1', 'bw9:83:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('3707be5a-0605-4371-b0d8-df9887c347fd'::uuid, '1d550f8e-b2be-45f0-a7c0-da1895f03fd8'::uuid, 'dp4', '16', 'Dialga', 'cosmos', 'verified_master_set_index_v1', 'dp4:16:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('4d946282-89a7-49fd-bb71-0e91f9078753'::uuid, 'b86a3c34-266c-42a1-8e8c-52456ce31bd3'::uuid, 'dp4', '26', 'Palkia', 'cosmos', 'verified_master_set_index_v1', 'dp4:26:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('eeb0a9ad-48ca-4176-ad6d-4c28e03ae2ed'::uuid, 'a8f079f8-c1f1-40bd-bc10-e735077c8106'::uuid, 'dp7', '30', 'Tyranitar', 'cosmos', 'verified_master_set_index_v1', 'dp7:30:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('0c8ade80-9565-4b33-800f-c371a5d05c33'::uuid, 'e8444009-0c47-48a6-af07-f5b450ac0082'::uuid, 'dp7', 'SH1', 'Drifloon', 'reverse', 'verified_master_set_index_v1', 'dp7:SH1:reverse', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('a9537b4b-1396-4113-94e6-abb61917b54e'::uuid, 'd978fa20-f6aa-44b8-a501-79f5b543c104'::uuid, 'dv1', '5', 'Dragonite', 'cosmos', 'verified_master_set_index_v1', 'dv1:5:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('0d172198-629b-450b-bd67-a5794246e84c'::uuid, '31d877dd-a029-4a27-b1a1-c7ae1fa016ec'::uuid, 'dv1', '8', 'Salamence', 'cosmos', 'verified_master_set_index_v1', 'dv1:8:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('fa295f8f-e124-469a-94a6-3f54cdac54bc'::uuid, '009cbfaa-e544-48ff-892a-d9b944b52e9f'::uuid, 'hgssp', 'HGSS10', 'Latias', 'cosmos', 'verified_master_set_index_v1', 'hgssp:HGSS10:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('ff648756-1e5d-4be5-82b1-67cb618494d1'::uuid, '7563ffed-0a77-44e8-9c63-71a43939e4c5'::uuid, 'hgssp', 'HGSS18', 'Tropical Tidal Wave', 'holo', 'verified_master_set_index_v1', 'hgssp:HGSS18:holo', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('985aa2c7-2039-47e5-acb1-b322cd66eac2'::uuid, '68aae708-14f7-4b85-9234-efae75b1796b'::uuid, 'neo1', '20', 'Cleffa', 'normal', 'verified_master_set_index_v1', 'neo1:20:normal', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('1028bee9-645e-405b-b6f0-f5df1f330e79'::uuid, '33697b43-8f8d-4560-b987-85f43c2e9557'::uuid, 'neo1', '105', 'Recycle Energy', 'holo', 'verified_master_set_index_v1', 'neo1:105:holo', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('79a36bb0-770b-47dd-b8aa-9ad24259de22'::uuid, '9622a3e4-ea20-4447-8f92-8dc4d3e28bb0'::uuid, 'xy9', '3', 'Meganium', 'cosmos', 'verified_master_set_index_v1', 'xy9:3:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('e635e891-3fb4-4d32-9498-94deaa8e7f68'::uuid, 'ad868cdd-6061-4415-bd7f-379f04856d4a'::uuid, 'xy9', '21', 'Slowking', 'cosmos', 'verified_master_set_index_v1', 'xy9:21:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1'),
  ('376af764-558a-405c-9ba8-41b5ca3326c7'::uuid, '203cba12-16e7-452e-a21a-2c265796dedf'::uuid, 'xy9', '30', 'Suicune', 'cosmos', 'verified_master_set_index_v1', 'xy9:30:cosmos', 'pkg06n_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06n_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06n_active_child_printings;
  select count(distinct set_key) into set_count from pkg06n_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06n_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06n_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06n_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 21 then raise exception 'PKG-06N child count drift: %', child_count; end if;
  if parent_count <> 21 then raise exception 'PKG-06N parent count drift: %', parent_count; end if;
  if set_count <> 10 then raise exception 'PKG-06N set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06N unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06N existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06N id collision count: %', id_collision_count; end if;
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
from pkg06n_active_child_printings;

select
  'PKG-06N-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  '03593d1d1bc85e794ee1f4327bd26f4061ec3cf2eac2a20fc60b690bae1274dc'::text as source_readiness_fingerprint,
  'a21913de6bb88b867dfd8d081cc4e0c2a813feaa4f48fba62a129296bf713987'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06n_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06n_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06n_active_child_printings)::int as planned_child_rows;

rollback;

-- English Master Index PKG-06K-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: 9409a240229daece80d0d39382e4013840523b6ac335e38ce5c7cd68f9448633
-- Package fingerprint: 93a6199e422ce13f9f64142c05d9eb677d15522e95412c3578d4eff77893dbb1

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06k_active_child_printings (
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

insert into pkg06k_active_child_printings (
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
  ('f11e55fd-ab20-4f93-8564-460135e1fc63'::uuid, '5a88f7e3-847b-4d39-94e1-1891ca9dcafe'::uuid, '2012bw', '4', 'Pignite', 'holo', 'verified_master_set_index_v1', '2012bw:4:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('aee3d36a-a6fc-433b-b2d6-49c92555cf7d'::uuid, 'd807f57c-6904-4710-9ab9-de53d9bb1dc4'::uuid, '2012bw', '5', 'Dewott', 'holo', 'verified_master_set_index_v1', '2012bw:5:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('8abc3ac6-1fa7-43ad-9533-742711afc811'::uuid, '353b9924-4d4e-44b4-b55c-a28a5a377cb2'::uuid, '2012bw', '10', 'Scraggy', 'holo', 'verified_master_set_index_v1', '2012bw:10:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('e8818427-7496-4c33-a0b1-705c8a16b8d4'::uuid, 'd3b5a22a-f7fe-4088-9756-845e95ab3011'::uuid, '2012bw', '11', 'Klang', 'holo', 'verified_master_set_index_v1', '2012bw:11:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('83b37eec-6b28-4e19-8779-7cbb02a52bc1'::uuid, 'ba12910d-12b8-48ea-9623-d717bfb211d1'::uuid, '2012bw', '12', 'Axew', 'holo', 'verified_master_set_index_v1', '2012bw:12:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('0eb48e5c-0ba1-48cb-ae01-8dfc2123a29c'::uuid, '079ae0a0-eba5-4620-9e72-801bd0a1714e'::uuid, 'basep', '13', 'Venusaur', 'holo', 'verified_master_set_index_v1', 'basep:13:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('d533920d-72d3-4c74-ab71-28eebddb44ed'::uuid, '5af74dbf-2b3d-4d92-b17a-a5cc3fecf13a'::uuid, 'basep', '15', 'Cool Porygon', 'holo', 'verified_master_set_index_v1', 'basep:15:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('38081e9e-73c4-4e36-bf85-876e82cc5fb8'::uuid, 'c9fc79b3-3130-4910-b4b7-1aad5d31d874'::uuid, 'basep', '18', 'Team Rocket''s Meowth', 'normal', 'verified_master_set_index_v1', 'basep:18:normal', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('1e58e3a4-0ed7-4d16-acf6-e2ba4464cd3d'::uuid, 'f92b127d-17a6-4c93-b638-c29434a6c031'::uuid, 'basep', '33', 'Scizor', 'normal', 'verified_master_set_index_v1', 'basep:33:normal', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('3e20f4e7-ace1-4caf-814f-b4c03d8639cf'::uuid, '54698766-cc91-4386-bd6d-dfc4f569f6fd'::uuid, 'bw6', '24', 'Gyarados', 'cosmos', 'verified_master_set_index_v1', 'bw6:24:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('42e9904e-17e3-40c7-bff5-4c916dba54e1'::uuid, 'ec067898-aa72-4aaf-bb81-c7ee78527250'::uuid, 'bw6', '28', 'Milotic', 'cosmos', 'verified_master_set_index_v1', 'bw6:28:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('586f414c-a380-41ba-92fc-096f641e58fd'::uuid, '0be0dd94-49c6-4d58-9cef-b29a4db22142'::uuid, 'bw6', '40', 'Ampharos', 'cosmos', 'verified_master_set_index_v1', 'bw6:40:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('b37bc1c3-c5c1-436e-9a0f-e4182686e537'::uuid, '98c489f9-e34c-4687-8130-afe70b3ec450'::uuid, 'bw6', '80', 'Aggron', 'cosmos', 'verified_master_set_index_v1', 'bw6:80:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('0f57d1d8-6ef9-4c7d-b045-bf07fca3cca3'::uuid, 'f623349e-0ea2-4a4d-a370-a8bab7152498'::uuid, 'bw6', '91', 'Garchomp', 'cosmos', 'verified_master_set_index_v1', 'bw6:91:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('aa0d9fd3-9354-40d7-b209-3b7f530ad43d'::uuid, '3d3119f4-18bd-4dae-8611-455ebce1cf4a'::uuid, 'bw6', '98', 'Hydreigon', 'cosmos', 'verified_master_set_index_v1', 'bw6:98:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('aceabf6d-ddda-471d-a35b-5347fe16c729'::uuid, '99282997-fa3a-4764-bd55-9411860d9b10'::uuid, 'dp2', '33', 'Rampardos', 'cosmos', 'verified_master_set_index_v1', 'dp2:33:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('2172b0a9-b9c8-42ad-9f4b-650a9b168bb5'::uuid, '23ca8e6f-6772-42a9-96cd-78e4cf338a02'::uuid, 'dp2', '109', 'Bebe''s Search', 'cosmos', 'verified_master_set_index_v1', 'dp2:109:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('5e088fe5-e7e8-45bf-9ecf-825f3ab1ad15'::uuid, '5081ec1d-979c-419e-b838-8e58ea4da5d8'::uuid, 'dp2', '121', 'Electivire LV.X', 'holo', 'verified_master_set_index_v1', 'dp2:121:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('96c321fc-771c-42fe-8f60-d47fa69fc814'::uuid, '48d366e6-c3fd-4ec4-92f2-5032524aafd0'::uuid, 'dp2', '122', 'Lucario LV.X', 'holo', 'verified_master_set_index_v1', 'dp2:122:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('dbe46339-331f-4859-8a36-73ad911ead31'::uuid, 'e2f2b04d-c672-4051-9105-b712a8f2ca16'::uuid, 'dp2', '123', 'Magmortar LV.X', 'holo', 'verified_master_set_index_v1', 'dp2:123:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('fe81dec0-27f5-434d-b4dd-4ea88a818de0'::uuid, 'f142196a-ad89-4138-9540-e27067505fb0'::uuid, 'dp2', '124', 'Time-Space Distortion', 'holo', 'verified_master_set_index_v1', 'dp2:124:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('fa493bd3-c0f3-4699-a689-187c7f500aa4'::uuid, '4b0ca559-e74a-477d-8d33-d027fddbc58e'::uuid, 'ex4', '90', 'Cradily ex', 'holo', 'verified_master_set_index_v1', 'ex4:90:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('a5a63fc3-55c1-4579-b3fa-c1e6c38fa10a'::uuid, '948a7294-2833-4f53-81ca-a9ff677e215d'::uuid, 'ex4', '91', 'Entei ex', 'holo', 'verified_master_set_index_v1', 'ex4:91:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('d8b2a25d-17fb-417c-8105-20bcdee42c6c'::uuid, '4c23f0ab-4d8a-451b-bcac-a47dc3b189c3'::uuid, 'ex4', '92', 'Raikou ex', 'holo', 'verified_master_set_index_v1', 'ex4:92:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('3ddce893-6fb9-4999-981a-335b624043bc'::uuid, '72047f9f-df62-4b25-b90a-fcde0da3ebf3'::uuid, 'ex4', '93', 'Sceptile ex', 'holo', 'verified_master_set_index_v1', 'ex4:93:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('4fe604db-0023-4faf-863e-dacadade5c4a'::uuid, '63fc471f-1a60-45f8-91c9-3675d959dd84'::uuid, 'ex4', '96', 'Absol', 'holo', 'verified_master_set_index_v1', 'ex4:96:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('82777d06-fb45-4761-9be9-5371ba02179e'::uuid, '16163c20-78d4-4c1f-9b8d-5ad033c55170'::uuid, 'ex4', '97', 'Jirachi', 'holo', 'verified_master_set_index_v1', 'ex4:97:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('d3356c58-2e40-4dd9-9783-94197f78a287'::uuid, '0e9d8afb-099a-449e-8201-d05eaf4970c6'::uuid, 'me01', '48', 'Raikou', 'cosmos', 'verified_master_set_index_v1', 'me01:48:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('5161e4da-3781-4149-93ed-eb12773ffc42'::uuid, '87e718fc-f5df-46ba-8a40-32f1881ada53'::uuid, 'me01', '58', 'Ralts', 'cosmos', 'verified_master_set_index_v1', 'me01:58:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('a9b75f1c-229d-4b6d-a371-b19821653778'::uuid, 'dd8f0c4d-ac21-441d-a57f-34be3a02a6f8'::uuid, 'me01', '59', 'Kirlia', 'cosmos', 'verified_master_set_index_v1', 'me01:59:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('b3e6344f-b3a5-48c6-aab6-07e317ef7d87'::uuid, '031dc29b-18cb-4048-8301-a29f3bd6335c'::uuid, 'me01', '76', 'Riolu', 'cosmos', 'verified_master_set_index_v1', 'me01:76:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('cf450ee9-a050-4688-bc90-970ebd3edaf1'::uuid, 'c29cf7bf-d1cb-407a-8570-37f9dff2d488'::uuid, 'me01', '93', 'Steelix', 'holo', 'verified_master_set_index_v1', 'me01:93:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('7fe63728-7a59-4e58-b00b-9ff304512d11'::uuid, '04433312-9e95-4e0c-a593-929c278e7499'::uuid, 'me01', '95', 'Dialga', 'holo', 'verified_master_set_index_v1', 'me01:95:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('6ca6bcf4-a63d-4dbd-81fb-a7f6f9197d02'::uuid, '666de235-a8af-49f2-99c9-f1a8a5343494'::uuid, 'si1', '1', 'Mew', 'holo', 'verified_master_set_index_v1', 'si1:1:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('898e07f2-3783-4faf-90d5-6567fb3e49ca'::uuid, '6e97b72a-8adc-4005-8a15-f51b79d7087c'::uuid, 'si1', '4', 'Togepi', 'holo', 'verified_master_set_index_v1', 'si1:4:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('ad96e570-ee93-4579-a69f-965d284c55e1'::uuid, '27b7b9fb-ebff-483b-8d93-8e600ec2fd19'::uuid, 'si1', '7', 'Ledyba', 'holo', 'verified_master_set_index_v1', 'si1:7:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('b5d92cc6-cfd4-4d97-a0b4-734fac5234e8'::uuid, '169d68d8-588a-445b-9ce5-01e9d4086699'::uuid, 'si1', '11', 'Marill', 'holo', 'verified_master_set_index_v1', 'si1:11:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('b50b2af0-886c-4185-b86d-1acdf1003690'::uuid, '17406c6f-0e35-4790-8e21-2e5f4b2ad6ec'::uuid, 'si1', '14', 'Slowking', 'holo', 'verified_master_set_index_v1', 'si1:14:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('9921a6a8-23b3-4136-8e98-826be4178f51'::uuid, 'f7776eff-94e3-4ff9-a627-1577df92a4a5'::uuid, 'si1', '17', 'Vileplume', 'holo', 'verified_master_set_index_v1', 'si1:17:holo', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('1292e129-2020-413e-91d0-32ca7f445374'::uuid, '49f5f973-82b9-4a31-8cb3-16917661f180'::uuid, 'sm8', '89', 'Espeon', 'cosmos', 'verified_master_set_index_v1', 'sm8:89:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('1b11f6ff-ef3b-40fa-aa96-635654f6b0fc'::uuid, '8d474ebf-0156-4aad-afef-551a545d02c1'::uuid, 'sm8', '97', 'Giratina', 'cosmos', 'verified_master_set_index_v1', 'sm8:97:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('bad29a5f-ce49-44e8-8a24-1605440fc5b0'::uuid, '4656055f-65cd-4033-a6d0-42e154fa1710'::uuid, 'sm8', '120', 'Umbreon', 'cosmos', 'verified_master_set_index_v1', 'sm8:120:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('ca9e4a6e-7644-4b86-973b-429b7730fc0d'::uuid, 'ee0f8640-d08b-42bf-a964-5df1dd3078e7'::uuid, 'sm8', '125', 'Steelix', 'cosmos', 'verified_master_set_index_v1', 'sm8:125:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('e0b3f09f-513e-4390-9710-02cf95f1ba6c'::uuid, '00ce0a0e-6796-4979-9997-7985d22f74b0'::uuid, 'sm8', '141', 'Gardevoir', 'cosmos', 'verified_master_set_index_v1', 'sm8:141:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('3a1bc817-98f4-4751-b322-92121c29a5f5'::uuid, 'a1293676-da0f-48c6-ba3e-2707f3860a0f'::uuid, 'sm8', '153', 'Blissey', 'cosmos', 'verified_master_set_index_v1', 'sm8:153:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('42f1c605-6d27-4144-8ce5-ae44ff4f3074'::uuid, 'd17130cc-b402-49e2-ba6b-22c7d3bac711'::uuid, 'sv07', '76', 'Rhyperior', 'cosmos', 'verified_master_set_index_v1', 'sv07:76:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('5a20494c-0cf9-4a30-92b3-d098cce4990a'::uuid, 'd25c5497-7045-4717-b361-49d34d8fd645'::uuid, 'sv07', '096', 'Grimmsnarl', 'normal', 'verified_master_set_index_v1', 'sv07:96:normal', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('d20eaf75-ce1d-48e0-af3c-a4b15fc8b21d'::uuid, '0e886428-ca60-4b13-9b98-cc41d91361d1'::uuid, 'sv07', '101', 'Klinklang', 'cosmos', 'verified_master_set_index_v1', 'sv07:101:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('f0540689-9795-4a1f-ad91-75091bb56e83'::uuid, 'c84e3e43-8b65-4ddd-a760-f9d4a5060d73'::uuid, 'sv07', '104', 'Melmetal', 'cosmos', 'verified_master_set_index_v1', 'sv07:104:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('fd02b7ab-85e0-4a1d-9c2f-1091218459be'::uuid, '7bf55366-9a6b-466f-bd71-f617d626b5d9'::uuid, 'sv07', '107', 'Archaludon', 'normal', 'verified_master_set_index_v1', 'sv07:107:normal', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('a293289e-e7ad-4769-8459-9952c56b52ad'::uuid, '8b27da65-9d66-43b0-8816-5b842bee1fee'::uuid, 'sv09', '41', 'Wailord', 'cosmos', 'verified_master_set_index_v1', 'sv09:41:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('1c8851a2-ae18-4587-a9ec-4f93669c3a8a'::uuid, 'ebba564d-1cf7-4494-9b0a-831c09bac46d'::uuid, 'sv09', '52', 'Iono''s Tadbulb', 'cosmos', 'verified_master_set_index_v1', 'sv09:52:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('520b9bb5-a4cb-4717-9d35-a79e68610d3c'::uuid, '6081b50b-7978-44e7-90a3-47eb1d4d496f'::uuid, 'sv09', '85', 'Lycanroc', 'cosmos', 'verified_master_set_index_v1', 'sv09:85:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('499d4d8f-d83d-49e8-aa8c-5886be2440c4'::uuid, '0f65e7ff-3806-41e3-b51b-18795ad72869'::uuid, 'sv09', '117', 'Hop''s Snorlax', 'cosmos', 'verified_master_set_index_v1', 'sv09:117:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('d35eff3a-2857-4aa2-bf82-0ddbb7aa875a'::uuid, 'daf0489f-69b3-4710-987e-fb5e878386ae'::uuid, 'sv09', '135', 'Hop''s Wooloo', 'cosmos', 'verified_master_set_index_v1', 'sv09:135:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1'),
  ('179eadac-a6d5-4300-b465-a1ff8c55e8f4'::uuid, '316451de-61c5-4662-a9df-a7546f890991'::uuid, 'sv09', '151', 'Lillie''s Pearl', 'cosmos', 'verified_master_set_index_v1', 'sv09:151:cosmos', 'pkg06k_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06k_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06k_active_child_printings;
  select count(distinct set_key) into set_count from pkg06k_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06k_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06k_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06k_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 56 then raise exception 'PKG-06K child count drift: %', child_count; end if;
  if parent_count <> 56 then raise exception 'PKG-06K parent count drift: %', parent_count; end if;
  if set_count <> 10 then raise exception 'PKG-06K set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06K unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06K existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06K id collision count: %', id_collision_count; end if;
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
from pkg06k_active_child_printings;

select
  'PKG-06K-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  '9409a240229daece80d0d39382e4013840523b6ac335e38ce5c7cd68f9448633'::text as source_readiness_fingerprint,
  '93a6199e422ce13f9f64142c05d9eb677d15522e95412c3578d4eff77893dbb1'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06k_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06k_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06k_active_child_printings)::int as planned_child_rows;

rollback;

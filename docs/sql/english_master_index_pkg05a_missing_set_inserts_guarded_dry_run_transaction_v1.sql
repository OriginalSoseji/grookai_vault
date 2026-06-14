-- English Master Index PKG-05A guarded dry-run transaction artifact V1
-- GENERATED ARTIFACT ONLY. Codex did not execute this SQL.
-- Scope: PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS
-- Source readiness fingerprint: da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1
-- Artifact fingerprint: df4c9dcae0a19731d4b96f9efd0322f5fde78722c0c08786e4d97a8a2d395dc9
-- Fresh snapshot hash: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
-- This artifact has no COMMIT path. It must roll back.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg05a_sets (
  set_id uuid primary key,
  set_key text not null unique,
  set_name text not null,
  tcgdex_set_id text not null,
  source_json jsonb not null
) on commit drop;

insert into pkg05a_sets (set_id, set_key, set_name, tcgdex_set_id, source_json) values
  ('02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', 'McDonald''s Collection 2023', '2023sv', '{"tcgdex":{"id":"2023sv","name":"McDonald''s Collection 2023"},"verified_master_index_v1":{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}}'::jsonb),
  ('74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', 'McDonald''s Collection 2024', '2024sv', '{"tcgdex":{"id":"2024sv","name":"McDonald''s Collection 2024"},"verified_master_index_v1":{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}}'::jsonb),
  ('1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', 'Mega Evolution Energy', 'mee', '{"tcgdex":{"id":"mee","name":"Mega Evolution Energy"},"verified_master_index_v1":{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}}'::jsonb),
  ('6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', 'My First Battle', 'mfb', '{"tcgdex":{"id":"mfb","name":"My First Battle"},"verified_master_index_v1":{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}}'::jsonb);

create temporary table pkg05a_card_prints (
  card_print_id uuid primary key,
  set_id uuid not null,
  set_code text not null,
  card_number text not null,
  card_name text not null,
  rarity text null,
  variant_key text not null,
  external_ids jsonb not null,
  ai_metadata jsonb not null
) on commit drop;

insert into pkg05a_card_prints (card_print_id, set_id, set_code, card_number, card_name, rarity, variant_key, external_ids, ai_metadata) values
  ('4091ae25-3624-4f56-a455-7bd3d4beb154'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '1', 'Sprigatito', 'None', '', '{"tcgdex":"2023sv-1"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('451748ac-012e-4d67-9912-d04534a05817'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '2', 'Fuecoco', 'None', '', '{"tcgdex":"2023sv-2"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('3a769557-0102-4fd2-b79e-8eef05b52e60'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '3', 'Quaxly', 'None', '', '{"tcgdex":"2023sv-3"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('98500b36-36d3-470f-9d15-099865980b07'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '4', 'Cetoddle', 'None', '', '{"tcgdex":"2023sv-4"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('e22e07fa-71e2-46aa-9951-829e339f8763'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '5', 'Cetitan', 'None', '', '{"tcgdex":"2023sv-5"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('ee8c68fc-626c-42db-b7ef-fc869fe07ae8'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '6', 'Pikachu', 'None', '', '{"tcgdex":"2023sv-6"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('1dc8d631-789a-4857-a1fd-d72efea4d614'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '7', 'Pawmi', 'None', '', '{"tcgdex":"2023sv-7"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('31b28128-2bba-420a-acee-4962caf0514c'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '8', 'Kilowattrel', 'None', '', '{"tcgdex":"2023sv-8"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('c9372355-e4ff-46a7-8172-94fe7d8a28be'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '9', 'Flittle', 'None', '', '{"tcgdex":"2023sv-9"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('6e7a29e1-3b5b-4c27-86b3-1e63c99f576a'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '10', 'Sandaconda', 'None', '', '{"tcgdex":"2023sv-10"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('fae05233-f9c5-4860-aa86-49a942613ff5'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '11', 'Klawf', 'None', '', '{"tcgdex":"2023sv-11"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('3ed79a65-c672-451a-afd7-e47a68ae2c53'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '12', 'Blissey', 'None', '', '{"tcgdex":"2023sv-12"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('2dd83d5b-2476-4b63-9fbe-c849c2d56aa7'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '13', 'Tandemaus', 'None', '', '{"tcgdex":"2023sv-13"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('1df85310-35da-4070-a3bd-a01a96d39e1c'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '14', 'Cyclizar', 'None', '', '{"tcgdex":"2023sv-14"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('fb3bc199-9149-402e-8342-265eceecf120'::uuid, '02a0e8fa-acc7-4093-b1c8-399468ae82a6'::uuid, '2023sv', '15', 'Kirlia', 'None', '', '{"tcgdex":"2023sv-15"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('43e51937-5821-449d-adf5-7cfc30d135b9'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '1', 'Charizard', 'None', '', '{"tcgdex":"2024sv-1"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('2ff72f10-b4cd-4e26-998c-87b1ca181028'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '2', 'Pikachu', 'None', '', '{"tcgdex":"2024sv-2"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('afa60d30-57c3-44ec-9964-fdf2a2bd7690'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '3', 'Miraidon', 'None', '', '{"tcgdex":"2024sv-3"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('7fe87152-ff37-4a8b-8b56-1338ca39751b'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '4', 'Jigglypuff', 'None', '', '{"tcgdex":"2024sv-4"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('9218afd1-f370-4698-902d-2e60140f127c'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '5', 'Hatenna', 'None', '', '{"tcgdex":"2024sv-5"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('0a81032c-548d-438c-a091-5b2924557771'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '6', 'Dragapult', 'None', '', '{"tcgdex":"2024sv-6"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('24b6d461-b043-4768-ae3a-1cf43442c7d6'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '7', 'Quagsire', 'None', '', '{"tcgdex":"2024sv-7"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('2d9108f8-f23d-49f6-8557-19553332e9eb'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '8', 'Koraidon', 'None', '', '{"tcgdex":"2024sv-8"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('5d51ef4f-5f17-4b8e-b9fc-2ae31f955022'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '9', 'Umbreon', 'None', '', '{"tcgdex":"2024sv-9"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('d3e549c3-b31d-4368-b7b4-e34b28b41c1d'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '10', 'Hydreigon', 'None', '', '{"tcgdex":"2024sv-10"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('d2766899-2087-437d-81a4-8d769e4727a7'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '11', 'Roaring Moon', 'None', '', '{"tcgdex":"2024sv-11"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('2a8e6db0-3a82-4196-8cd8-f0528e68b9ef'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '12', 'Dragonite', 'None', '', '{"tcgdex":"2024sv-12"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('3faee98e-12b5-4f6c-a711-073d024155eb'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '13', 'Eevee', 'None', '', '{"tcgdex":"2024sv-13"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('194dc27a-ce21-4a69-93de-d8c48000c128'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '14', 'Rayquaza', 'None', '', '{"tcgdex":"2024sv-14"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('2c2649a8-a3b7-44cd-87ba-0c5d03667e0f'::uuid, '74f082df-35b6-4b08-af89-4e5d6c7d53bc'::uuid, '2024sv', '15', 'Drampa', 'None', '', '{"tcgdex":"2024sv-15"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('6a28431f-8e78-45ee-adce-46ccde297389'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '001', 'Basic Grass Energy', 'Common', '', '{"tcgdex":"mee-001"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('fa0fa953-2e87-4dfc-8bd9-ebda84a53a12'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '002', 'Basic Fire Energy', 'Common', '', '{"tcgdex":"mee-002"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('fd2dbb1c-728d-48de-9324-6b4e16947e67'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '003', 'Basic Water Energy', 'Common', '', '{"tcgdex":"mee-003"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('69ceec8e-8bbc-4faa-b70a-bac1556429b1'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '004', 'Basic Lightning Energy', 'Common', '', '{"tcgdex":"mee-004"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('f1a590b0-3795-4145-9d68-93dcbb73f3c6'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '005', 'Basic Psychic Energy', 'Common', '', '{"tcgdex":"mee-005"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('f2342804-4844-409a-9b95-ddf10b09bee6'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '006', 'Basic Fighting Energy', 'Common', '', '{"tcgdex":"mee-006"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('c4df4bea-9e6a-46d7-8fbc-2a3293ef58d6'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '007', 'Basic Darkness Energy', 'Common', '', '{"tcgdex":"mee-007"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('fe393cc0-6c1c-4a90-922d-08ef60599c15'::uuid, '1f0996bd-cb77-40c2-9a2b-121849099003'::uuid, 'mee', '008', 'Basic Metal Energy', 'Common', '', '{"tcgdex":"mee-008"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('49d6a794-5703-4de0-aa70-c6b2438ed1c5'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '1', 'Bulbasaur', 'None', '', '{"tcgdex":"mfb-1"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('09af1718-5dbb-4490-8a1e-a71c17584a43'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '2', 'Ivysaur', 'None', '', '{"tcgdex":"mfb-2"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('15da4897-1148-4a9f-9e18-961cb696f249'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '3', 'Oddish', 'None', '', '{"tcgdex":"mfb-3"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('dcf3403e-8108-45e7-b4c8-c8f3fdb8d73d'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '4', 'Gloom', 'None', '', '{"tcgdex":"mfb-4"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('74061f6a-223a-4dd0-a6a7-f8b0f341fe26'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '5', 'Exeggcute', 'None', '', '{"tcgdex":"mfb-5"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('ef1b1771-5477-4c48-b577-e8ded6e641d0'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '6', 'Exeggutor', 'None', '', '{"tcgdex":"mfb-6"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('7981f4c1-055a-4eff-bae1-49fb428e3fdf'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '7', 'Scyther', 'None', '', '{"tcgdex":"mfb-7"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('a6ece9a6-4e33-4879-b5c8-f09274cef1a7'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '8', 'Grass Energy', 'None', '', '{"tcgdex":"mfb-8"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('1c4ae32e-714c-4aa2-8c35-7826cfe759b3'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '9', 'Charmander', 'None', '', '{"tcgdex":"mfb-9"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('31c39836-62b4-4d44-a898-6ba37a148004'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '10', 'Charmeleon', 'None', '', '{"tcgdex":"mfb-10"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('f62c0bf4-ab0e-451d-a149-c312dd95c51e'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '11', 'Vulpix', 'None', '', '{"tcgdex":"mfb-11"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('db309a53-3ed8-4be0-b3f2-b096a64c2f3f'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '12', 'Ninetales', 'None', '', '{"tcgdex":"mfb-12"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('eb4d8953-9d05-43b4-be64-b529162ce221'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '13', 'Growlithe', 'None', '', '{"tcgdex":"mfb-13"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('f7865250-5030-4f54-be6b-aed423100717'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '14', 'Arcanine', 'None', '', '{"tcgdex":"mfb-14"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('37047df4-d52c-4a32-8cb3-c77f565128bc'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '15', 'Magmar', 'None', '', '{"tcgdex":"mfb-15"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('ece0e2a1-74d8-4b8e-bb65-ffd15cd1bbca'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '16', 'Fire Energy', 'None', '', '{"tcgdex":"mfb-16"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('f57348f5-9b22-4d47-adbd-1dfc08f8ef95'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '17', 'Pikachu', 'None', '', '{"tcgdex":"mfb-17"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('e9a443af-8d01-4369-8395-b25d6de7ea75'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '18', 'Raichu', 'None', '', '{"tcgdex":"mfb-18"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('6b496428-8d58-48a8-ba35-a89db7bb4d1a'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '19', 'Magnemite', 'None', '', '{"tcgdex":"mfb-19"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('4457f5d7-c979-493f-8a32-6790a91fb1d5'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '20', 'Magneton', 'None', '', '{"tcgdex":"mfb-20"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('454211cf-bd3f-495a-973c-ef4ac787b7d5'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '21', 'Voltorb', 'None', '', '{"tcgdex":"mfb-21"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('87796913-485e-4003-ad35-c47ec7490d00'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '22', 'Electrode', 'None', '', '{"tcgdex":"mfb-22"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('c76cb0ce-6fde-47f4-a136-c54db8cf59ab'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '23', 'Electabuzz', 'None', '', '{"tcgdex":"mfb-23"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('648e1d4b-8564-43eb-9596-71fbf48c017b'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '24', 'Lightning Energy', 'None', '', '{"tcgdex":"mfb-24"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('49305424-a284-4bd5-a0af-3fd355db549b'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '25', 'Squirtle', 'None', '', '{"tcgdex":"mfb-25"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('f63065d2-d77c-494d-9831-cf594600f7ae'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '26', 'Wartortle', 'None', '', '{"tcgdex":"mfb-26"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('9e71eb08-b0c5-4e15-a581-f97f31120bf0'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '27', 'Poliwag', 'None', '', '{"tcgdex":"mfb-27"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('d0c72906-4ded-475b-8319-c9a8cd7dbdd8'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '28', 'Poliwhirl', 'None', '', '{"tcgdex":"mfb-28"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('0e3a69cb-81e6-4f3f-97e8-da5c4bf063f9'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '29', 'Magikarp', 'None', '', '{"tcgdex":"mfb-29"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('b894bb8d-1ad3-4824-a8ca-0900941ec7cc'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '30', 'Gyarados', 'None', '', '{"tcgdex":"mfb-30"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('cd03d17c-b61f-4d31-b52a-27ff45bcd2de'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '31', 'Lapras', 'None', '', '{"tcgdex":"mfb-31"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('dece707c-a7c1-49b3-ac3b-51959227b4b5'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '32', 'Water Energy', 'None', '', '{"tcgdex":"mfb-32"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('3184e491-41eb-466c-a456-dcea8ff79403'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '33', 'Potion', 'None', '', '{"tcgdex":"mfb-33"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb),
  ('056c0faf-05d0-455b-a576-bb1089414821'::uuid, '6c43360a-bfd9-4df7-b6d5-7b7f2f874c18'::uuid, 'mfb', '34', 'Switch', 'None', '', '{"tcgdex":"mfb-34"}'::jsonb, '{"source":"verified_master_set_index_v1","package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","package_fingerprint_sha256":"da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1"}'::jsonb);

create temporary table pkg05a_card_printings (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  provenance_source text not null,
  provenance_ref text not null,
  created_by text not null
) on commit drop;

insert into pkg05a_card_printings (card_printing_id, card_print_id, finish_key, provenance_source, provenance_ref, created_by) values
  ('3a5ab65e-dda3-45a7-9871-f0532fd349ba'::uuid, '4091ae25-3624-4f56-a455-7bd3d4beb154'::uuid, 'holo', 'verified_master_set_index_v1', '2023sv:1:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('3c456c11-1915-4800-9e76-fc9deb0aa6d3'::uuid, '451748ac-012e-4d67-9912-d04534a05817'::uuid, 'holo', 'verified_master_set_index_v1', '2023sv:2:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('49566d90-2182-48df-8c6b-34e095ab09e1'::uuid, '3a769557-0102-4fd2-b79e-8eef05b52e60'::uuid, 'holo', 'verified_master_set_index_v1', '2023sv:3:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('c01975b3-f875-4980-80ac-a1260b93a142'::uuid, '98500b36-36d3-470f-9d15-099865980b07'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:4:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('3554a0f4-a4fb-4253-9081-0c90871af633'::uuid, 'e22e07fa-71e2-46aa-9951-829e339f8763'::uuid, 'holo', 'verified_master_set_index_v1', '2023sv:5:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('de5f9e17-89e1-40e3-9bc2-569097e55b0a'::uuid, 'ee8c68fc-626c-42db-b7ef-fc869fe07ae8'::uuid, 'holo', 'verified_master_set_index_v1', '2023sv:6:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('cbc1f5a9-2708-4417-a41a-a67492f24846'::uuid, '1dc8d631-789a-4857-a1fd-d72efea4d614'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:7:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('86fb7236-d4e3-41de-95da-04d9b98fb5cf'::uuid, '31b28128-2bba-420a-acee-4962caf0514c'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:8:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('f0e4042d-49d3-49ff-89d5-aca3bad95b31'::uuid, 'c9372355-e4ff-46a7-8172-94fe7d8a28be'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:9:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('28a2bd03-6287-4c5b-848b-737a2be841bf'::uuid, '6e7a29e1-3b5b-4c27-86b3-1e63c99f576a'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:10:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('f58973ec-ae6d-48b9-b149-f75776d7d540'::uuid, 'fae05233-f9c5-4860-aa86-49a942613ff5'::uuid, 'holo', 'verified_master_set_index_v1', '2023sv:11:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('f6be1aac-6bcc-4f7c-9bd5-99faaa03043a'::uuid, '3ed79a65-c672-451a-afd7-e47a68ae2c53'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:12:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('da153acc-e4b0-4668-9e4d-25383c5d3a8e'::uuid, '2dd83d5b-2476-4b63-9fbe-c849c2d56aa7'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:13:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('7a034cd5-5d86-4616-acee-505e92fe6438'::uuid, '1df85310-35da-4070-a3bd-a01a96d39e1c'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:14:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('77d3c498-7661-4656-adf0-3319e99c48d0'::uuid, 'fb3bc199-9149-402e-8342-265eceecf120'::uuid, 'normal', 'verified_master_set_index_v1', '2023sv:15:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('9f030b5c-14bf-4086-9c00-0df453484c77'::uuid, '43e51937-5821-449d-adf5-7cfc30d135b9'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:1:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('b23dcc5c-720a-4684-a5a6-c3634214978c'::uuid, '2ff72f10-b4cd-4e26-998c-87b1ca181028'::uuid, 'holo', 'verified_master_set_index_v1', '2024sv:2:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('d1db979e-f99f-45e9-8f46-3837d42fd535'::uuid, 'afa60d30-57c3-44ec-9964-fdf2a2bd7690'::uuid, 'holo', 'verified_master_set_index_v1', '2024sv:3:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('53f7df37-2144-480a-9733-91e1ecfa0419'::uuid, '7fe87152-ff37-4a8b-8b56-1338ca39751b'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:4:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('e2ce355c-f215-4df4-9a9f-a434f1ee7dbc'::uuid, '9218afd1-f370-4698-902d-2e60140f127c'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:5:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('18137a8c-6450-49dc-879d-0a925eb9ab18'::uuid, '0a81032c-548d-438c-a091-5b2924557771'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:6:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('5282c217-bce0-4464-bf4d-dc14db786d0c'::uuid, '24b6d461-b043-4768-ae3a-1cf43442c7d6'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:7:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('643c1f32-7c70-41f4-aa5e-331c03a16af6'::uuid, '2d9108f8-f23d-49f6-8557-19553332e9eb'::uuid, 'holo', 'verified_master_set_index_v1', '2024sv:8:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('d5d31c60-d683-4fb4-a451-62ff36a8ea70'::uuid, '5d51ef4f-5f17-4b8e-b9fc-2ae31f955022'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:9:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('1ad22655-6716-42ed-a219-aa7434f71e5a'::uuid, 'd3e549c3-b31d-4368-b7b4-e34b28b41c1d'::uuid, 'holo', 'verified_master_set_index_v1', '2024sv:10:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('a49a4bf7-f24c-472c-9224-3b3c3dababa0'::uuid, 'd2766899-2087-437d-81a4-8d769e4727a7'::uuid, 'holo', 'verified_master_set_index_v1', '2024sv:11:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('499b5a96-8132-41ac-94a4-c003cb046c93'::uuid, '2a8e6db0-3a82-4196-8cd8-f0528e68b9ef'::uuid, 'holo', 'verified_master_set_index_v1', '2024sv:12:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('2ebf1e54-7022-49c5-9641-6e299ffdeba4'::uuid, '3faee98e-12b5-4f6c-a711-073d024155eb'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:13:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('eb3133d3-d504-411d-aae4-33873e10c982'::uuid, '194dc27a-ce21-4a69-93de-d8c48000c128'::uuid, 'normal', 'verified_master_set_index_v1', '2024sv:14:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('b1f8ccee-5b8b-45cc-86e1-3fdb209dd318'::uuid, '2c2649a8-a3b7-44cd-87ba-0c5d03667e0f'::uuid, 'holo', 'verified_master_set_index_v1', '2024sv:15:holo', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('6720ec03-ca13-4c66-b9b0-f314d4873dc7'::uuid, '6a28431f-8e78-45ee-adce-46ccde297389'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:1:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('48e37111-db45-4c3e-9331-eb502378cb24'::uuid, '6a28431f-8e78-45ee-adce-46ccde297389'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:1:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('aa86cecf-30f5-4c16-9473-e864efb458ed'::uuid, 'fa0fa953-2e87-4dfc-8bd9-ebda84a53a12'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:2:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('94d17196-ca27-416f-8ca8-a5a89fd87f1d'::uuid, 'fa0fa953-2e87-4dfc-8bd9-ebda84a53a12'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:2:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('17f713ca-82c4-44cf-9a0f-541d62302cf4'::uuid, 'fd2dbb1c-728d-48de-9324-6b4e16947e67'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:3:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('abc466a7-cd70-4e16-851c-2564d06440e2'::uuid, 'fd2dbb1c-728d-48de-9324-6b4e16947e67'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:3:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('67b59885-c79f-49e6-972b-99d095920dde'::uuid, '69ceec8e-8bbc-4faa-b70a-bac1556429b1'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:4:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('187f6e23-116a-412f-9bf3-8388a2b27ec8'::uuid, '69ceec8e-8bbc-4faa-b70a-bac1556429b1'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:4:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('97850493-7f57-4605-9a23-e0b5fe82ada3'::uuid, 'f1a590b0-3795-4145-9d68-93dcbb73f3c6'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:5:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('d017fb91-098b-4a20-8e6c-5fc9f6536744'::uuid, 'f1a590b0-3795-4145-9d68-93dcbb73f3c6'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:5:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('4cf36974-055f-418f-ab37-90bf0caea84e'::uuid, 'f2342804-4844-409a-9b95-ddf10b09bee6'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:6:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('2097cb2f-68eb-4fa5-9a3d-f148e1522589'::uuid, 'f2342804-4844-409a-9b95-ddf10b09bee6'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:6:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('a48c132f-a789-4bd4-a926-9941168721b3'::uuid, 'c4df4bea-9e6a-46d7-8fbc-2a3293ef58d6'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:7:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('8cb351fd-af44-4f09-94d1-2dcbc7240a27'::uuid, 'c4df4bea-9e6a-46d7-8fbc-2a3293ef58d6'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:7:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('0249c75c-6e4e-4ea7-a1db-de1187f252f8'::uuid, 'fe393cc0-6c1c-4a90-922d-08ef60599c15'::uuid, 'normal', 'verified_master_set_index_v1', 'mee:8:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('8c7a8a21-857c-44fc-a649-f64990d0f7b4'::uuid, 'fe393cc0-6c1c-4a90-922d-08ef60599c15'::uuid, 'reverse', 'verified_master_set_index_v1', 'mee:8:reverse', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('ef0602d5-aa38-4185-8248-de4d2f277127'::uuid, '49d6a794-5703-4de0-aa70-c6b2438ed1c5'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:1:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('f94eeee8-dcdd-4418-925b-0171f059c4b1'::uuid, '09af1718-5dbb-4490-8a1e-a71c17584a43'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:2:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('e1c26e1b-c591-4435-aeb2-dbd7a6278e97'::uuid, '15da4897-1148-4a9f-9e18-961cb696f249'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:3:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('303ef3f7-fc39-465b-b723-af303cd5af92'::uuid, 'dcf3403e-8108-45e7-b4c8-c8f3fdb8d73d'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:4:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('2e85b877-83e8-4eab-8a17-776c30dc3a8f'::uuid, '74061f6a-223a-4dd0-a6a7-f8b0f341fe26'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:5:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('5e7f6407-e7f6-4843-88c9-083a5039f060'::uuid, 'ef1b1771-5477-4c48-b577-e8ded6e641d0'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:6:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('9bdf0043-f89d-4239-bd66-16ac35440637'::uuid, '7981f4c1-055a-4eff-bae1-49fb428e3fdf'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:7:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('fa943075-c9a3-4621-acb8-01e1be62f84e'::uuid, 'a6ece9a6-4e33-4879-b5c8-f09274cef1a7'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:8:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('5b7c1221-c63c-4e49-87a2-be02179d89f0'::uuid, '1c4ae32e-714c-4aa2-8c35-7826cfe759b3'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:9:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('52761b25-1af1-4fd0-a442-4eb629ca2052'::uuid, '31c39836-62b4-4d44-a898-6ba37a148004'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:10:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('3d288b21-ea3a-4cf4-a491-3dd31532f4df'::uuid, 'f62c0bf4-ab0e-451d-a149-c312dd95c51e'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:11:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('4321b0df-274c-44d6-82ea-70aad7c16ab5'::uuid, 'db309a53-3ed8-4be0-b3f2-b096a64c2f3f'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:12:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('7ec36739-4363-4cc9-b960-15f3c6999705'::uuid, 'eb4d8953-9d05-43b4-be64-b529162ce221'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:13:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('b79d631b-d7a0-4977-a190-e9868119b5f1'::uuid, 'f7865250-5030-4f54-be6b-aed423100717'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:14:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('7d5adfe8-2267-4be9-8d4a-3146bd674591'::uuid, '37047df4-d52c-4a32-8cb3-c77f565128bc'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:15:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('5c45d0d7-67a0-4822-b667-a68416572b71'::uuid, 'ece0e2a1-74d8-4b8e-bb65-ffd15cd1bbca'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:16:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('c43f6e98-b705-48c6-b6fb-a7dc8d6ab99c'::uuid, 'f57348f5-9b22-4d47-adbd-1dfc08f8ef95'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:17:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('aac30c7e-6912-4078-aed8-382838922572'::uuid, 'e9a443af-8d01-4369-8395-b25d6de7ea75'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:18:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('a687be9f-fa7c-4d99-8d1f-5cee9bad2f92'::uuid, '6b496428-8d58-48a8-ba35-a89db7bb4d1a'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:19:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('a8d9858e-5b68-475f-8090-07acb0e55906'::uuid, '4457f5d7-c979-493f-8a32-6790a91fb1d5'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:20:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('59f73167-8767-4af7-917a-edf3f240af09'::uuid, '454211cf-bd3f-495a-973c-ef4ac787b7d5'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:21:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('1f04a6d1-b34f-4fb3-9d2b-853c30f58a60'::uuid, '87796913-485e-4003-ad35-c47ec7490d00'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:22:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('2db13bfd-df62-47b6-9b28-76d3dcb1c00d'::uuid, 'c76cb0ce-6fde-47f4-a136-c54db8cf59ab'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:23:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('b90cf0a0-fead-4b8c-89c6-a0ddf69a95b9'::uuid, '648e1d4b-8564-43eb-9596-71fbf48c017b'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:24:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('321c93f7-c450-475c-9089-d104c10f7e47'::uuid, '49305424-a284-4bd5-a0af-3fd355db549b'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:25:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('b989899c-7989-42f1-afde-e4beabc74dc3'::uuid, 'f63065d2-d77c-494d-9831-cf594600f7ae'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:26:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('12eda396-59c0-4662-8d39-d9044bc667ac'::uuid, '9e71eb08-b0c5-4e15-a581-f97f31120bf0'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:27:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('83790ad1-9ea8-4222-bed9-87b9f2104587'::uuid, 'd0c72906-4ded-475b-8319-c9a8cd7dbdd8'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:28:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('59564dbf-c2bb-4095-a384-22ba82932b54'::uuid, '0e3a69cb-81e6-4f3f-97e8-da5c4bf063f9'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:29:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('acf2edbe-d92d-498d-a128-00576bbecc71'::uuid, 'b894bb8d-1ad3-4824-a8ca-0900941ec7cc'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:30:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('8a09e838-d6f1-4e36-a64d-84de74abffe4'::uuid, 'cd03d17c-b61f-4d31-b52a-27ff45bcd2de'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:31:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('a073d963-b26b-44cd-b0f9-e72918dd9063'::uuid, 'dece707c-a7c1-49b3-ac3b-51959227b4b5'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:32:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('673d0e32-6748-4f2c-8de6-f76a3f3698d5'::uuid, '3184e491-41eb-466c-a456-dcea8ff79403'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:33:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1'),
  ('3df8a13f-4fb7-45db-a8b7-d174a4895f6a'::uuid, '056c0faf-05d0-455b-a576-bb1089414821'::uuid, 'normal', 'verified_master_set_index_v1', 'mfb:34:normal', 'pkg05a_missing_set_insert_dry_run_artifact_v1');

create temporary table pkg05a_external_mappings (
  source text not null,
  external_id text not null,
  card_print_id uuid not null,
  meta jsonb not null
) on commit drop;

insert into pkg05a_external_mappings (source, external_id, card_print_id, meta) values
  ('tcgdex', '2023sv-1', '4091ae25-3624-4f56-a455-7bd3d4beb154'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-2', '451748ac-012e-4d67-9912-d04534a05817'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-3', '3a769557-0102-4fd2-b79e-8eef05b52e60'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-4', '98500b36-36d3-470f-9d15-099865980b07'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-5', 'e22e07fa-71e2-46aa-9951-829e339f8763'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-6', 'ee8c68fc-626c-42db-b7ef-fc869fe07ae8'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-7', '1dc8d631-789a-4857-a1fd-d72efea4d614'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-8', '31b28128-2bba-420a-acee-4962caf0514c'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-9', 'c9372355-e4ff-46a7-8172-94fe7d8a28be'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-10', '6e7a29e1-3b5b-4c27-86b3-1e63c99f576a'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-11', 'fae05233-f9c5-4860-aa86-49a942613ff5'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-12', '3ed79a65-c672-451a-afd7-e47a68ae2c53'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-13', '2dd83d5b-2476-4b63-9fbe-c849c2d56aa7'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-14', '1df85310-35da-4070-a3bd-a01a96d39e1c'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2023sv-15', 'fb3bc199-9149-402e-8342-265eceecf120'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2023sv","set_name":"McDonald''s Collection 2023"}'::jsonb),
  ('tcgdex', '2024sv-1', '43e51937-5821-449d-adf5-7cfc30d135b9'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-2', '2ff72f10-b4cd-4e26-998c-87b1ca181028'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-3', 'afa60d30-57c3-44ec-9964-fdf2a2bd7690'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-4', '7fe87152-ff37-4a8b-8b56-1338ca39751b'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-5', '9218afd1-f370-4698-902d-2e60140f127c'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-6', '0a81032c-548d-438c-a091-5b2924557771'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-7', '24b6d461-b043-4768-ae3a-1cf43442c7d6'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-8', '2d9108f8-f23d-49f6-8557-19553332e9eb'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-9', '5d51ef4f-5f17-4b8e-b9fc-2ae31f955022'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-10', 'd3e549c3-b31d-4368-b7b4-e34b28b41c1d'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-11', 'd2766899-2087-437d-81a4-8d769e4727a7'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-12', '2a8e6db0-3a82-4196-8cd8-f0528e68b9ef'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-13', '3faee98e-12b5-4f6c-a711-073d024155eb'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-14', '194dc27a-ce21-4a69-93de-d8c48000c128'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', '2024sv-15', '2c2649a8-a3b7-44cd-87ba-0c5d03667e0f'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"2024sv","set_name":"McDonald''s Collection 2024"}'::jsonb),
  ('tcgdex', 'mee-001', '6a28431f-8e78-45ee-adce-46ccde297389'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mee-002', 'fa0fa953-2e87-4dfc-8bd9-ebda84a53a12'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mee-003', 'fd2dbb1c-728d-48de-9324-6b4e16947e67'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mee-004', '69ceec8e-8bbc-4faa-b70a-bac1556429b1'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mee-005', 'f1a590b0-3795-4145-9d68-93dcbb73f3c6'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mee-006', 'f2342804-4844-409a-9b95-ddf10b09bee6'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mee-007', 'c4df4bea-9e6a-46d7-8fbc-2a3293ef58d6'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mee-008', 'fe393cc0-6c1c-4a90-922d-08ef60599c15'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mee","set_name":"Mega Evolution Energy"}'::jsonb),
  ('tcgdex', 'mfb-1', '49d6a794-5703-4de0-aa70-c6b2438ed1c5'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-2', '09af1718-5dbb-4490-8a1e-a71c17584a43'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-3', '15da4897-1148-4a9f-9e18-961cb696f249'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-4', 'dcf3403e-8108-45e7-b4c8-c8f3fdb8d73d'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-5', '74061f6a-223a-4dd0-a6a7-f8b0f341fe26'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-6', 'ef1b1771-5477-4c48-b577-e8ded6e641d0'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-7', '7981f4c1-055a-4eff-bae1-49fb428e3fdf'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-8', 'a6ece9a6-4e33-4879-b5c8-f09274cef1a7'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-9', '1c4ae32e-714c-4aa2-8c35-7826cfe759b3'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-10', '31c39836-62b4-4d44-a898-6ba37a148004'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-11', 'f62c0bf4-ab0e-451d-a149-c312dd95c51e'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-12', 'db309a53-3ed8-4be0-b3f2-b096a64c2f3f'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-13', 'eb4d8953-9d05-43b4-be64-b529162ce221'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-14', 'f7865250-5030-4f54-be6b-aed423100717'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-15', '37047df4-d52c-4a32-8cb3-c77f565128bc'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-16', 'ece0e2a1-74d8-4b8e-bb65-ffd15cd1bbca'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-17', 'f57348f5-9b22-4d47-adbd-1dfc08f8ef95'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-18', 'e9a443af-8d01-4369-8395-b25d6de7ea75'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-19', '6b496428-8d58-48a8-ba35-a89db7bb4d1a'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-20', '4457f5d7-c979-493f-8a32-6790a91fb1d5'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-21', '454211cf-bd3f-495a-973c-ef4ac787b7d5'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-22', '87796913-485e-4003-ad35-c47ec7490d00'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-23', 'c76cb0ce-6fde-47f4-a136-c54db8cf59ab'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-24', '648e1d4b-8564-43eb-9596-71fbf48c017b'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-25', '49305424-a284-4bd5-a0af-3fd355db549b'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-26', 'f63065d2-d77c-494d-9831-cf594600f7ae'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-27', '9e71eb08-b0c5-4e15-a581-f97f31120bf0'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-28', 'd0c72906-4ded-475b-8319-c9a8cd7dbdd8'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-29', '0e3a69cb-81e6-4f3f-97e8-da5c4bf063f9'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-30', 'b894bb8d-1ad3-4824-a8ca-0900941ec7cc'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-31', 'cd03d17c-b61f-4d31-b52a-27ff45bcd2de'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-32', 'dece707c-a7c1-49b3-ac3b-51959227b4b5'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-33', '3184e491-41eb-466c-a456-dcea8ff79403'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb),
  ('tcgdex', 'mfb-34', '056c0faf-05d0-455b-a576-bb1089414821'::uuid, '{"package_id":"PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS","set_key":"mfb","set_name":"My First Battle"}'::jsonb);

-- Guard 1: source package shape must still match the approved readiness artifact.
do $$
declare
  set_count int;
  parent_count int;
  child_count int;
begin
  select count(*) into set_count from pkg05a_sets;
  select count(*) into parent_count from pkg05a_card_prints;
  select count(*) into child_count from pkg05a_card_printings;
  if set_count <> 4 then raise exception 'PKG-05A set count drift: %', set_count; end if;
  if parent_count <> 72 then raise exception 'PKG-05A parent count drift: %', parent_count; end if;
  if child_count <> 80 then raise exception 'PKG-05A child count drift: %', child_count; end if;
end $$;

-- Guard 2: no target set, parent, child, or external mapping may already exist.
do $$
declare
  collision_count int;
begin
  select count(*) into collision_count
  from pkg05a_sets target
  join public.sets s
    on s.game = 'pokemon'
   and (lower(coalesce(s.code, '')) = lower(target.set_key)
        or lower(coalesce(s.name, '')) = lower(target.set_name)
        or s.source->'tcgdex'->>'id' = target.tcgdex_set_id);
  if collision_count <> 0 then raise exception 'PKG-05A set collision count: %', collision_count; end if;

  select count(*) into collision_count
  from pkg05a_card_prints target
  join public.card_prints cp
    on lower(coalesce(cp.set_code, '')) = lower(target.set_code)
   and coalesce(cp.number_plain, cp.number) = regexp_replace(target.card_number, '[^0-9]', '', 'g')
   and lower(coalesce(cp.name, '')) = lower(target.card_name);
  if collision_count <> 0 then raise exception 'PKG-05A parent collision count: %', collision_count; end if;

  select count(*) into collision_count
  from pkg05a_external_mappings target
  join public.external_mappings em
    on em.source = target.source
   and em.external_id = target.external_id;
  if collision_count <> 0 then raise exception 'PKG-05A external mapping collision count: %', collision_count; end if;
end $$;

-- Dry-run insert simulation. This transaction must roll back.
insert into public.sets (
  id,
  game,
  code,
  name,
  source
)
select
  set_id,
  'pokemon',
  set_key,
  set_name,
  source_json
from pkg05a_sets;

insert into public.card_prints (
  id,
  set_id,
  set_code,
  number,
  name,
  rarity,
  variant_key,
  external_ids,
  ai_metadata
)
select
  card_print_id,
  set_id,
  set_code,
  card_number,
  card_name,
  rarity,
  variant_key,
  external_ids,
  ai_metadata
from pkg05a_card_prints;

insert into public.external_mappings (
  source,
  external_id,
  card_print_id,
  meta
)
select
  source,
  external_id,
  card_print_id,
  meta
from pkg05a_external_mappings;

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
from pkg05a_card_printings;

-- Guard 3: dry-run post-insert counts must match exactly.
do $$
declare
  inserted_sets int;
  inserted_parents int;
  inserted_children int;
begin
  select count(*) into inserted_sets
  from public.sets s
  join pkg05a_sets target on target.set_id = s.id;
  select count(*) into inserted_parents
  from public.card_prints cp
  join pkg05a_card_prints target on target.card_print_id = cp.id;
  select count(*) into inserted_children
  from public.card_printings cpr
  join pkg05a_card_printings target on target.card_printing_id = cpr.id;
  if inserted_sets <> 4 then raise exception 'PKG-05A inserted set count mismatch: %', inserted_sets; end if;
  if inserted_parents <> 72 then raise exception 'PKG-05A inserted parent count mismatch: %', inserted_parents; end if;
  if inserted_children <> 80 then raise exception 'PKG-05A inserted child count mismatch: %', inserted_children; end if;
end $$;

-- Rollback proof query.
select
  'PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS'::text as package_id,
  'da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1'::text as readiness_fingerprint,
  'df4c9dcae0a19731d4b96f9efd0322f5fde78722c0c08786e4d97a8a2d395dc9'::text as artifact_fingerprint,
  (select count(*) from pkg05a_sets)::int as planned_sets,
  (select count(*) from pkg05a_card_prints)::int as planned_parent_rows,
  (select count(*) from pkg05a_card_printings)::int as planned_child_rows;

rollback;

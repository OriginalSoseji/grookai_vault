-- English Master Index PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source artifact: a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120
-- Package fingerprint: 4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg06a_supported_child_printings (
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

insert into pkg06a_supported_child_printings (
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
  ('c6dbe40a-4f66-459f-80bc-f8b4403c87d3'::uuid, 'ebba151c-68b9-4dba-82a5-b08ae2fe41e2'::uuid, 'pl3', '15', 'Arcanine G', 'cosmos', 'verified_master_set_index_v1', 'pl3:15:cosmos', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('cc0ba3af-18d9-4306-a501-1e4a901d74a9'::uuid, '8cf66125-56f7-4e27-a1fd-08025fae50f0'::uuid, 'pl3', '16', 'Articuno', 'normal', 'verified_master_set_index_v1', 'pl3:16:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('e58aca70-b81c-45c8-8e06-c7b078bd5664'::uuid, '5fe6c6c7-be09-4d88-af91-ce0158248a72'::uuid, 'pl3', '18', 'Camerupt', 'normal', 'verified_master_set_index_v1', 'pl3:18:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('ef1a84f9-e19f-4761-a326-682f4aabc348'::uuid, '6017a435-4e91-44be-8035-6efcbe832ee6'::uuid, 'pl3', '19', 'Camerupt G', 'normal', 'verified_master_set_index_v1', 'pl3:19:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('97b9a1db-8abb-4f0c-8226-ea98a8215e45'::uuid, '009b0d24-d48e-4946-a392-1bae3406e208'::uuid, 'pl3', '20', 'Charizard G', 'normal', 'verified_master_set_index_v1', 'pl3:20:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('c74fd417-13a6-4693-a506-d2f8793c4a14'::uuid, '4d9fc663-8fef-4da5-a6b8-f510e5699ed4'::uuid, 'pl3', '21', 'Chimecho', 'normal', 'verified_master_set_index_v1', 'pl3:21:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('c995007a-91bc-4594-ba0c-a0302dcde846'::uuid, 'b77b0f9a-67a2-47ba-b4b6-4c7a545c7998'::uuid, 'pl3', '22', 'Claydol', 'normal', 'verified_master_set_index_v1', 'pl3:22:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('f88ea8d9-28f9-4e2d-810c-53da1bac5ded'::uuid, 'd9dd2533-779b-4112-bf2c-7a319af9f6bb'::uuid, 'pl3', '23', 'Crawdaunt G', 'normal', 'verified_master_set_index_v1', 'pl3:23:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('e529e4ce-c3e3-465c-bd8b-276bd9c7bd23'::uuid, '7126b46e-2d9d-4906-bee1-13f59f5d50c8'::uuid, 'pl3', '24', 'Dewgong', 'normal', 'verified_master_set_index_v1', 'pl3:24:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('5ed509e8-a7b1-430c-a648-04e79f7f8758'::uuid, '6b418419-525d-4ed3-a2ae-39b214a4fd4c'::uuid, 'pl3', '25', 'Dodrio', 'normal', 'verified_master_set_index_v1', 'pl3:25:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('cee2361d-50ef-4213-bf75-ae4234fa091e'::uuid, 'fd676d83-4f81-4bc8-854f-f8fe6dcd288a'::uuid, 'pl3', '28', 'Exploud', 'normal', 'verified_master_set_index_v1', 'pl3:28:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('d969b3d4-e399-46e0-80d8-ccd71e9935d5'::uuid, '1bd0cf49-3b22-420f-bb12-adcc5f72a7ed'::uuid, 'pl3', '29', 'Honchkrow', 'normal', 'verified_master_set_index_v1', 'pl3:29:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('dd6a08b8-8d47-47e2-b5e3-1c8dff51cbc7'::uuid, 'f98c32dc-ede3-45bb-b03b-c370937cb2dc'::uuid, 'pl3', '30', 'Lickilicky C', 'normal', 'verified_master_set_index_v1', 'pl3:30:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('cfe09a2a-4cf3-4a20-a813-d6eba49613b7'::uuid, '8fd39753-8e91-4445-b71c-3d8c8e2600cc'::uuid, 'pl3', '31', 'Lucario C', 'normal', 'verified_master_set_index_v1', 'pl3:31:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('f6e9c1e1-a11c-4999-b68b-87200f4fe184'::uuid, '0240b3e6-a42a-4b2a-bdf0-58662fb6f281'::uuid, 'pl3', '32', 'Lunatone', 'normal', 'verified_master_set_index_v1', 'pl3:32:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('7dcb776d-1992-4fe9-861d-78574fa66210'::uuid, '7b3cf251-7d11-406a-abf6-c9b980b6316b'::uuid, 'pl3', '33', 'Mawile', 'normal', 'verified_master_set_index_v1', 'pl3:33:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('eb53dc12-71ad-4c5b-a676-b3b34db8c0f6'::uuid, '70464bf7-cfd2-451f-aba5-914884fd11dd'::uuid, 'pl3', '34', 'Medicham', 'normal', 'verified_master_set_index_v1', 'pl3:34:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('6d8834c8-f8b0-4124-afa6-e66f909ba7c0'::uuid, 'ff7ec680-ae02-41bc-b071-a6981fc7b52d'::uuid, 'pl3', '35', 'Milotic C', 'cosmos', 'verified_master_set_index_v1', 'pl3:35:cosmos', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('0490d3ac-dfe0-4d67-8197-7fb89d7a8518'::uuid, '07430ced-256a-405f-83db-e0277e6b5dd2'::uuid, 'pl3', '36', 'Moltres', 'normal', 'verified_master_set_index_v1', 'pl3:36:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('fc8fb544-ff12-48db-98c7-cb570bf9ef25'::uuid, '771d23a1-0073-442d-b44b-f5be74353fa2'::uuid, 'pl3', '37', 'Mr. Mime', 'normal', 'verified_master_set_index_v1', 'pl3:37:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('8c5ec763-a6d4-4b82-974d-4e422e406718'::uuid, '52165d9a-5056-4702-ba6d-f797d28232a6'::uuid, 'pl3', '38', 'Parasect', 'normal', 'verified_master_set_index_v1', 'pl3:38:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('8506e2b8-cbf5-48a6-9fb6-9d070d4e07fe'::uuid, '3cd61474-6984-4433-b67a-1b07cfd48b27'::uuid, 'pl3', '39', 'Primeape', 'normal', 'verified_master_set_index_v1', 'pl3:39:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('2e65cdb2-ed24-43f5-9df6-45fa529fdb93'::uuid, 'f4ba12c4-2d2e-41cb-8881-5319f2e75b5c'::uuid, 'pl3', '40', 'Roserade C', 'normal', 'verified_master_set_index_v1', 'pl3:40:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('55d2cc68-0051-46cc-a3bb-bf2e4d768219'::uuid, 'f299ece0-02e0-470e-b482-b51babd92d85'::uuid, 'pl3', '41', 'Sableye G', 'normal', 'verified_master_set_index_v1', 'pl3:41:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('b03ca252-d035-41dc-993e-395aabe6e8e5'::uuid, '5c55e009-fe5d-4cf6-82b2-5098dfcd6a44'::uuid, 'pl3', '42', 'Sandslash', 'normal', 'verified_master_set_index_v1', 'pl3:42:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('ac043a65-312d-4d10-b75e-a5ca7e63a4cc'::uuid, '7c348b2c-efad-4179-9507-4f013444659a'::uuid, 'pl3', '43', 'Seaking', 'normal', 'verified_master_set_index_v1', 'pl3:43:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('13b5203a-9211-4a01-8129-66f0e9ed0ea3'::uuid, 'e06336fa-0bcd-465e-a448-402d29fdf135'::uuid, 'pl3', '44', 'Shedinja', 'normal', 'verified_master_set_index_v1', 'pl3:44:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('4d12c82c-6d84-4402-9339-bec4cb9eefc6'::uuid, '4380f8fb-12d4-4f21-95fc-122d6e342512'::uuid, 'pl3', '45', 'Solrock', 'normal', 'verified_master_set_index_v1', 'pl3:45:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('dea5c099-3dbc-497a-b8f8-4d2435836b8d'::uuid, 'c670ad70-2972-4fb6-93f2-4381bdf60b1a'::uuid, 'pl3', '46', 'Spinda', 'normal', 'verified_master_set_index_v1', 'pl3:46:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('c641f268-3961-403a-a868-40497c984674'::uuid, '5966c63d-fa8c-4440-8e46-b5d2c92a4a5c'::uuid, 'pl3', '47', 'Wailord', 'normal', 'verified_master_set_index_v1', 'pl3:47:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('2e8ba7e6-ea90-45df-ab30-002a73496103'::uuid, 'ecd177a5-77cd-4236-b8e0-87775f7f9664'::uuid, 'pl3', '48', 'Zapdos', 'normal', 'verified_master_set_index_v1', 'pl3:48:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('1e9d7cc4-6dd2-44da-b651-5c5451e4d974'::uuid, '81243685-62bc-4224-a20a-206a4bea6f8d'::uuid, 'pl3', '49', 'Altaria C', 'normal', 'verified_master_set_index_v1', 'pl3:49:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('016d0ba1-2578-4650-bd18-f5c359c88d6c'::uuid, '61a7cd22-388a-492b-ad84-69151f444b28'::uuid, 'pl3', '50', 'Arcanine', 'normal', 'verified_master_set_index_v1', 'pl3:50:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('daf69b82-654d-4219-9971-5633576ef24c'::uuid, 'a387ce7a-5d78-4253-b87c-9841e1aa0e3d'::uuid, 'pl3', '51', 'Bibarel', 'normal', 'verified_master_set_index_v1', 'pl3:51:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('8318c3d1-7512-491a-a6f7-3357128260ca'::uuid, 'd85a2b37-16ed-4844-867b-d668a0e8b8c3'::uuid, 'pl3', '52', 'Breloom', 'normal', 'verified_master_set_index_v1', 'pl3:52:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('466a433d-57d3-4763-ad46-7cdc855dbc52'::uuid, '3c67af7b-4e64-41ef-86d8-0219162f1ea7'::uuid, 'pl3', '53', 'Carnivine', 'normal', 'verified_master_set_index_v1', 'pl3:53:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('ac021366-5c14-42c6-9783-f4f54695010e'::uuid, '23623429-150e-46f7-ad1f-3093cb4e9732'::uuid, 'pl3', '54', 'Chatot G', 'normal', 'verified_master_set_index_v1', 'pl3:54:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('a38413bf-a80e-4dc3-ad68-ee34b62cbdab'::uuid, '1b5c1cd5-0fd9-447d-b2d9-49cfda472dff'::uuid, 'pl3', '55', 'Cherrim', 'normal', 'verified_master_set_index_v1', 'pl3:55:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('842ee2fc-ab7d-45f6-901c-4cfbefc16b98'::uuid, '834c7b08-0343-4945-b907-20edc73ef686'::uuid, 'pl3', '57', 'Drifblim', 'normal', 'verified_master_set_index_v1', 'pl3:57:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('96475b0f-d058-4448-8d65-1f244c728b08'::uuid, '2a321826-a19e-4c8e-8e4b-46cc667da4f8'::uuid, 'pl3', '58', 'Floatzel', 'normal', 'verified_master_set_index_v1', 'pl3:58:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('030a945e-0b82-447b-85dc-2973f80032e6'::uuid, '116e7b8a-ff1a-4bd2-9b7e-e015ad447046'::uuid, 'pl3', '61', 'Hippopotas', 'normal', 'verified_master_set_index_v1', 'pl3:61:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('671cd6d3-f32d-44de-a2b6-00c66f066f3a'::uuid, 'e8bbec2b-b369-45f9-b5fa-fb9ba60fd8a2'::uuid, 'pl3', '62', 'Ivysaur', 'normal', 'verified_master_set_index_v1', 'pl3:62:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('a0223728-815c-472f-ad48-6d7a7cdaaf12'::uuid, '09ec3387-01f9-42b7-b561-8a3782cb2b7c'::uuid, 'pl3', '63', 'Lopunny', 'normal', 'verified_master_set_index_v1', 'pl3:63:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('1011fe96-8c83-4d08-aec7-67cc0c5f32da'::uuid, '7ed636c2-0dbe-49aa-864b-24c9d3b8fdbb'::uuid, 'pl3', '64', 'Loudred', 'normal', 'verified_master_set_index_v1', 'pl3:64:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('bd8ce4fd-721a-457b-8d0d-2348be479431'::uuid, 'd52eabdb-55f1-4011-90ff-a56c8167e033'::uuid, 'pl3', '65', 'Magmar', 'normal', 'verified_master_set_index_v1', 'pl3:65:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('b4fbdbeb-3fb2-4a80-b27b-65708dc82e71'::uuid, '71d7fbf1-56c8-4d7c-a185-5a34e76e6daa'::uuid, 'pl3', '66', 'Manectric G', 'normal', 'verified_master_set_index_v1', 'pl3:66:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('8ac65d2d-5268-4117-97ff-beaeb58d6995'::uuid, 'd61065b5-994d-4f1f-b923-b0e4cc15c1fc'::uuid, 'pl3', '67', 'Marshtomp', 'normal', 'verified_master_set_index_v1', 'pl3:67:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('0a1e0420-c1fb-4c1d-9c0f-eb8a5d68156d'::uuid, '4d74ef6d-60f6-4cce-ada7-d1ad39fbdcfd'::uuid, 'pl3', '68', 'Masquerain', 'normal', 'verified_master_set_index_v1', 'pl3:68:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('6cf67ded-b284-4c57-bc24-210b59dcfd51'::uuid, 'a431b86d-7588-4211-804e-b05f3f502a66'::uuid, 'pl3', '69', 'Metang', 'normal', 'verified_master_set_index_v1', 'pl3:69:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('d208107c-777d-43bb-83ce-694adf862bfa'::uuid, '8bd8f4b8-5b4a-4123-85da-de20f5e16027'::uuid, 'pl3', '71', 'Minun', 'normal', 'verified_master_set_index_v1', 'pl3:71:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('fa070dd3-f1bb-4dae-8255-c9032649015a'::uuid, '83430e16-3194-436a-90c3-cf07ac6236a9'::uuid, 'pl3', '72', 'Murkrow', 'normal', 'verified_master_set_index_v1', 'pl3:72:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('1d7581c8-d6b5-40df-bd1c-eb1932095bc2'::uuid, 'c963f705-289e-4b58-acc1-618edfe2afe9'::uuid, 'pl3', '73', 'Ninjask', 'normal', 'verified_master_set_index_v1', 'pl3:73:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('b96bb900-1bc6-4a0b-bf40-85c35154b6a0'::uuid, '578de70e-3fd5-4407-8b2d-0b1517ee1f36'::uuid, 'pl3', '74', 'Numel', 'normal', 'verified_master_set_index_v1', 'pl3:74:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('2d258344-3326-4abb-a164-45534f49040f'::uuid, 'c51c267b-986f-43c4-b4a0-e9e16d85ab53'::uuid, 'pl3', '75', 'Pinsir', 'normal', 'verified_master_set_index_v1', 'pl3:75:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('0d4d92df-10b8-4342-8269-2ba0fedc1231'::uuid, '0556fb00-11b6-4f11-a35a-3deab7759f1a'::uuid, 'pl3', '76', 'Plusle', 'normal', 'verified_master_set_index_v1', 'pl3:76:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('37e52fe8-cb79-4add-bea4-83f0b8ce6312'::uuid, '8449707d-6530-4fae-a0de-5eeef71979c2'::uuid, 'pl3', '77', 'Raichu', 'normal', 'verified_master_set_index_v1', 'pl3:77:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('092530b5-475b-43e4-bab8-d398f794d5a3'::uuid, '2d58d0ab-39c9-4f51-96c2-43bd09ad9584'::uuid, 'pl3', '78', 'Raticate G', 'normal', 'verified_master_set_index_v1', 'pl3:78:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('eb1cb858-5494-45ef-967c-b469dc24764d'::uuid, 'f6f062df-a2d0-4908-a553-e7d8d9a15a6b'::uuid, 'pl3', '79', 'Relicanth', 'normal', 'verified_master_set_index_v1', 'pl3:79:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('74819388-79e0-4339-b9e2-93a4baf6ea35'::uuid, '600066dc-da8f-4850-84f0-f55f46d84b67'::uuid, 'pl3', '80', 'Rhydon', 'normal', 'verified_master_set_index_v1', 'pl3:80:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('66049fb6-d063-4b5b-b04a-8c49c4ca2f7a'::uuid, 'a2e5a7dc-1101-4d3d-967d-a05f1853e941'::uuid, 'pl3', '81', 'Roserade', 'normal', 'verified_master_set_index_v1', 'pl3:81:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('98eb33b8-134f-460e-b1e9-359c7fdde1ac'::uuid, '23f1f413-eac9-443f-99d7-8a7d464710b1'::uuid, 'pl3', '82', 'Rotom', 'normal', 'verified_master_set_index_v1', 'pl3:82:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('e12947ca-eef1-4060-ba07-5fdfe3ed8919'::uuid, '1666ba3e-f74d-4d64-ad51-d17fd70028af'::uuid, 'pl3', '84', 'Spiritomb C', 'normal', 'verified_master_set_index_v1', 'pl3:84:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('22691ae0-4ebd-4769-870e-91459d595c4f'::uuid, '7998a0fe-f940-4ef2-97ce-5bae8424a0e9'::uuid, 'pl3', '85', 'Staravia', 'normal', 'verified_master_set_index_v1', 'pl3:85:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('d0c9aae1-d773-4bc1-8364-3b800d0b0a50'::uuid, '475a24d1-4b1e-4318-b0db-9ec2c88bdfbb'::uuid, 'pl3', '86', 'Togekiss C', 'normal', 'verified_master_set_index_v1', 'pl3:86:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('5b3cb523-1e09-416b-8983-ff603197dd40'::uuid, '3431714a-c296-4470-a44b-80c071ce0f59'::uuid, 'pl3', '87', 'Wailmer', 'normal', 'verified_master_set_index_v1', 'pl3:87:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('da614c7c-3c58-4646-aba2-071c38ba27a0'::uuid, '84e74dd8-270f-4feb-9ecf-e12f7bdd74be'::uuid, 'pl3', '88', 'Yanma', 'normal', 'verified_master_set_index_v1', 'pl3:88:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('3d088f38-4420-405c-975f-741ac535dbba'::uuid, '7bb48936-2659-4111-bfc4-bc868bd2dbd9'::uuid, 'pl3', '90', 'Beldum', 'normal', 'verified_master_set_index_v1', 'pl3:90:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('8c684717-a4ad-4804-a0fa-306716790d63'::uuid, 'd6aaf090-a6c2-4104-9037-ac74f7c963e8'::uuid, 'pl3', '91', 'Bidoof', 'normal', 'verified_master_set_index_v1', 'pl3:91:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('3b2d8cb6-07d5-49df-804d-7e2e3bff27c7'::uuid, '16b2fc2a-cede-43a6-870f-9f48422d752e'::uuid, 'pl3', '92', 'Buizel', 'normal', 'verified_master_set_index_v1', 'pl3:92:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('1cc7f763-2f29-4f43-b103-464baa5e4c1a'::uuid, '73f495e9-6ddf-4cbf-934e-292adc3bc018'::uuid, 'pl3', '93', 'Bulbasaur', 'normal', 'verified_master_set_index_v1', 'pl3:93:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('b4e4e011-fce5-480a-8546-25a5f28f4434'::uuid, 'a13895d5-742c-4f50-9041-fa26b5878e3f'::uuid, 'pl3', '94', 'Buneary', 'normal', 'verified_master_set_index_v1', 'pl3:94:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('a57749c4-0cee-418b-9480-23c259943447'::uuid, 'a78d0d59-f376-4b6e-9603-4cf2d28022f6'::uuid, 'pl3', '95', 'Chatot', 'normal', 'verified_master_set_index_v1', 'pl3:95:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('c416f1e1-2fab-4ef8-80cc-ae142f812817'::uuid, '3fae8620-65d8-44ff-9931-21178681a496'::uuid, 'pl3', '96', 'Cherubi', 'normal', 'verified_master_set_index_v1', 'pl3:96:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('9d11410c-4141-469a-a7fb-a1644609d38b'::uuid, 'b1a663b6-1743-4b11-8bd7-b2150720c67a'::uuid, 'pl3', '97', 'Chimchar', 'normal', 'verified_master_set_index_v1', 'pl3:97:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('fd1214e0-2217-41fd-9e36-f0dc6cfd6db9'::uuid, 'f9d8d321-75d6-46ac-ab39-6e4f22165d7d'::uuid, 'pl3', '98', 'Chingling', 'normal', 'verified_master_set_index_v1', 'pl3:98:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('5b4dcb34-fe30-4e0a-8292-9204abc5ed23'::uuid, '42a66a84-e424-4339-bd71-402102187781'::uuid, 'pl3', '99', 'Combee', 'normal', 'verified_master_set_index_v1', 'pl3:99:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('aa1b4024-e3a5-44e5-aa82-36ab0f2097ce'::uuid, '21f808fa-7feb-40f0-8234-4f4968169ac3'::uuid, 'pl3', '100', 'Corphish', 'normal', 'verified_master_set_index_v1', 'pl3:100:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('eecfeee7-c102-4594-8bf3-b0617f39333a'::uuid, 'bd7a3d1c-3704-441b-9491-6bb1281d16be'::uuid, 'pl3', '101', 'Croagunk', 'normal', 'verified_master_set_index_v1', 'pl3:101:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('14ce8cce-6c0e-425c-8b9c-857ac99afcfe'::uuid, '402928d7-7531-4873-8ba4-53fe86d201da'::uuid, 'pl3', '102', 'Doduo', 'normal', 'verified_master_set_index_v1', 'pl3:102:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('f0a4d21c-dd16-4fad-8311-afba7a1d06cc'::uuid, 'bc2e4afe-69cd-444b-883b-fc5734a5b2c3'::uuid, 'pl3', '103', 'Drifloon', 'normal', 'verified_master_set_index_v1', 'pl3:103:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('f0916bf3-4c20-4535-836e-732547344cbf'::uuid, 'af9a19ca-b029-4928-a79f-f2e762537a9f'::uuid, 'pl3', '104', 'Feebas', 'normal', 'verified_master_set_index_v1', 'pl3:104:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('6fb42c9a-104c-42a4-b8f2-4133b84a2ebb'::uuid, '77f723d0-4111-4376-819e-3e76861563a1'::uuid, 'pl3', '105', 'Geodude', 'normal', 'verified_master_set_index_v1', 'pl3:105:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('efdf106f-c958-4d43-870e-4e41bc587688'::uuid, 'ce164eae-52b2-4629-83ac-494ee0484505'::uuid, 'pl3', '106', 'Gible', 'normal', 'verified_master_set_index_v1', 'pl3:106:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('52ce8960-0808-40f0-b665-56bca5b48635'::uuid, '436048aa-c41e-47a5-a2f4-ab3348a07539'::uuid, 'pl3', '107', 'Goldeen', 'normal', 'verified_master_set_index_v1', 'pl3:107:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('5e21e867-177e-4445-86d1-1cbeda972001'::uuid, '2689228e-16bb-4f31-9f4a-a65affed071c'::uuid, 'pl3', '108', 'Growlithe', 'normal', 'verified_master_set_index_v1', 'pl3:108:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('c94e707d-ff06-4a72-a211-1441fa4fd674'::uuid, 'b2d13107-553e-41ec-8188-9f931178c789'::uuid, 'pl3', '109', 'Kricketot', 'normal', 'verified_master_set_index_v1', 'pl3:109:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('91ad3c32-b581-4833-ab83-97dd84623c49'::uuid, '78c06caf-60db-4074-9620-7de6a4ca5752'::uuid, 'pl3', '110', 'Magikarp', 'normal', 'verified_master_set_index_v1', 'pl3:110:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('5affbba2-88b4-4abb-a6f5-38c07e8fe3f8'::uuid, 'b8bf9ec7-390f-42a5-9b18-ae77fef48efb'::uuid, 'pl3', '111', 'Magnemite', 'normal', 'verified_master_set_index_v1', 'pl3:111:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('672aed49-10a5-41f2-8736-565591dd6257'::uuid, 'a0dd729f-8e3f-49a4-a887-7439e8d68ed7'::uuid, 'pl3', '112', 'Mankey', 'normal', 'verified_master_set_index_v1', 'pl3:112:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('a5a29731-2999-4995-b49c-30fda8e3687e'::uuid, '06b014ba-4401-4a6d-95cc-a9ad51e23169'::uuid, 'pl3', '113', 'Meditite', 'normal', 'verified_master_set_index_v1', 'pl3:113:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('6ed85994-b5a0-4eb3-a3b5-51fc383dd62d'::uuid, 'b682f8f6-a00a-4a67-9298-efbe074f207e'::uuid, 'pl3', '114', 'Meowth', 'normal', 'verified_master_set_index_v1', 'pl3:114:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('4746e356-6a0a-4870-9b3b-cf33a9f6f04d'::uuid, 'd7f24309-71e1-48c6-84f2-b4a2657c0f76'::uuid, 'pl3', '115', 'Mime Jr.', 'normal', 'verified_master_set_index_v1', 'pl3:115:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('45d8905a-17f5-4ab5-9898-112f55fed497'::uuid, 'ee0bfb08-e82e-42ae-bc38-522bfcb5b714'::uuid, 'pl3', '116', 'Mudkip', 'normal', 'verified_master_set_index_v1', 'pl3:116:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('288d0878-5641-4505-9ef1-10b61ab4633e'::uuid, '60b496a4-f2c2-4594-88ba-2ec3917137f4'::uuid, 'pl3', '117', 'Nincada', 'normal', 'verified_master_set_index_v1', 'pl3:117:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('6d6bb9b4-909e-4977-8ed4-d90c763d0b30'::uuid, '9acaeee6-1cff-41fe-a06e-cb40af3da40f'::uuid, 'pl3', '118', 'Pachirisu', 'normal', 'verified_master_set_index_v1', 'pl3:118:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('0c3431ca-b2af-4134-9547-a5872ca64af2'::uuid, 'f7c5b01d-a9ef-443d-8681-9bfa5a4d9786'::uuid, 'pl3', '119', 'Paras', 'normal', 'verified_master_set_index_v1', 'pl3:119:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('391812d7-b49a-4293-a232-f65a5876d7ee'::uuid, 'c7c17baf-5364-4240-95be-8d46875ca969'::uuid, 'pl3', '120', 'Pikachu', 'normal', 'verified_master_set_index_v1', 'pl3:120:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('7bf30a5f-61ac-4c07-9ec6-4fab191366ab'::uuid, '7988b2a0-a72b-494c-9eeb-d6a1590825ff'::uuid, 'pl3', '121', 'Piplup', 'normal', 'verified_master_set_index_v1', 'pl3:121:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('75d1cb50-b5d4-4512-87a8-dd604a5a6c0a'::uuid, '9a20ba24-0fc6-46f6-9809-fe039f2e335a'::uuid, 'pl3', '122', 'Rhyhorn', 'normal', 'verified_master_set_index_v1', 'pl3:122:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('294555a1-1795-4a58-8654-2021f5185729'::uuid, 'cb06404e-b2dc-43e8-96d9-9249eaef09bd'::uuid, 'pl3', '123', 'Roselia', 'normal', 'verified_master_set_index_v1', 'pl3:123:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('3faf848f-3b1e-4fd7-9b30-4fb1fdd8b4f6'::uuid, '255eae23-3e2a-4789-9977-4877734a08fb'::uuid, 'pl3', '124', 'Sandshrew', 'normal', 'verified_master_set_index_v1', 'pl3:124:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('d9da924d-b667-405c-aa8a-0e1af133ab4f'::uuid, '973ddbaf-006a-477b-8345-5f75e404a6cf'::uuid, 'pl3', '125', 'Seel', 'normal', 'verified_master_set_index_v1', 'pl3:125:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('c1527768-3711-4b47-ac86-711b60e5a961'::uuid, '36f0d5f0-5625-4bdf-bf79-fe6626b7adcd'::uuid, 'pl3', '126', 'Shinx', 'normal', 'verified_master_set_index_v1', 'pl3:126:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('b6a85715-5aa9-4ab1-8b38-e5654bb70eda'::uuid, '979fbddb-1333-4e55-b8dc-d154ed1a54a6'::uuid, 'pl3', '127', 'Shroomish', 'normal', 'verified_master_set_index_v1', 'pl3:127:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('422e920b-9f6b-4479-9203-c93b91497b54'::uuid, 'af9124bb-5ea5-4a07-8d84-c677af864c45'::uuid, 'pl3', '128', 'Skorupi', 'normal', 'verified_master_set_index_v1', 'pl3:128:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('b100a9b8-1673-4db7-b675-b5675d637f59'::uuid, 'dff4e7f4-9eee-4beb-9b38-d7fc640a17a3'::uuid, 'pl3', '129', 'Starly', 'normal', 'verified_master_set_index_v1', 'pl3:129:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('4927b4f5-f212-4098-bf07-41d0e91cf2b7'::uuid, '0b7e37ef-d77d-453a-af96-62461ab1ec86'::uuid, 'pl3', '130', 'Surskit', 'normal', 'verified_master_set_index_v1', 'pl3:130:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('89bb0134-ffc4-4f26-98d3-8db65617b50d'::uuid, '621536a3-d38a-4f22-9417-ce5e846a7960'::uuid, 'pl3', '131', 'Turtwig', 'normal', 'verified_master_set_index_v1', 'pl3:131:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('6aaddc5c-f49e-49e8-93df-33318747e8b0'::uuid, '25f9b6c9-1135-420e-8003-a116460c4b1d'::uuid, 'pl3', '132', 'Whismur', 'normal', 'verified_master_set_index_v1', 'pl3:132:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('fb0d1177-64cc-444b-9806-17666d16f7de'::uuid, 'df3c5d93-cdcf-42cd-873b-944dfd1cb954'::uuid, 'pl3', '133', 'Zubat', 'normal', 'verified_master_set_index_v1', 'pl3:133:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('fb7e44ae-986e-4551-a1de-eab5e5ee23c4'::uuid, '7bdc0bc2-a0ae-4dd0-a901-8ac7226591d1'::uuid, 'pl3', '134', 'Battle Tower', 'normal', 'verified_master_set_index_v1', 'pl3:134:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('2c281390-b06d-484b-83cb-4f490afd72b3'::uuid, '298ffcc8-fdda-4885-aaaa-4bc9cb9db891'::uuid, 'pl3', '135', 'Champion''s Room', 'normal', 'verified_master_set_index_v1', 'pl3:135:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('5c7a25a1-5fc4-4f2b-bf58-033425891293'::uuid, '0f3fcadd-3408-4292-99d1-08354b807a36'::uuid, 'pl3', '137', 'Cyrus''s Initiative', 'normal', 'verified_master_set_index_v1', 'pl3:137:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('56acf4e4-6e06-4ca4-bb82-94056046adc9'::uuid, 'd74fff2e-b1be-4905-841b-9c01688be911'::uuid, 'pl3', '138', 'Night Teleporter', 'normal', 'verified_master_set_index_v1', 'pl3:138:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1'),
  ('a7d32f5e-2f18-48aa-b311-097ce505c708'::uuid, '65048b5b-a1c0-42d8-b46b-238e02323639'::uuid, 'pl3', '139', 'Palmer''s Contribution', 'normal', 'verified_master_set_index_v1', 'pl3:139:normal', 'pkg06a_child_printing_insert_dry_run_artifact_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  duplicate_count int;
  unsupported_finish_count int;
  missing_parent_count int;
  existing_child_count int;
begin
  select count(*) into child_count from pkg06a_supported_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06a_supported_child_printings;
  select count(distinct set_key) into set_count from pkg06a_supported_child_printings;
  select count(*) into duplicate_count
  from (
    select card_print_id, finish_key
    from pkg06a_supported_child_printings
    group by card_print_id, finish_key
    having count(*) > 1
  ) duplicates;
  select count(*) into unsupported_finish_count
  from pkg06a_supported_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into missing_parent_count
  from pkg06a_supported_child_printings target
  left join public.card_prints cp on cp.id = target.card_print_id
  where cp.id is null;
  select count(*) into existing_child_count
  from pkg06a_supported_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;

  if child_count <> 115 then raise exception 'PKG-06A supported child count drift: %', child_count; end if;
  if parent_count <> 115 then raise exception 'PKG-06A supported parent count drift: %', parent_count; end if;
  if set_count <> 1 then raise exception 'PKG-06A supported set count drift: %', set_count; end if;
  if duplicate_count <> 0 then raise exception 'PKG-06A supported duplicate target count: %', duplicate_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06A supported unsupported finish count: %', unsupported_finish_count; end if;
  if missing_parent_count <> 0 then raise exception 'PKG-06A supported missing parent count: %', missing_parent_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06A supported existing child count: %', existing_child_count; end if;
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
from pkg06a_supported_child_printings;

do $$
declare
  inserted_children int;
begin
  select count(*) into inserted_children
  from public.card_printings cpr
  join pkg06a_supported_child_printings target on target.card_printing_id = cpr.id;
  if inserted_children <> 115 then raise exception 'PKG-06A supported inserted child count mismatch: %', inserted_children; end if;
end $$;

select
  'PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS'::text as package_id,
  'a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120'::text as source_artifact_fingerprint,
  '4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06a_supported_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06a_supported_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06a_supported_child_printings)::int as planned_child_rows;

rollback;

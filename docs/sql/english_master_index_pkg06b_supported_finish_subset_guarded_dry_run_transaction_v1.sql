-- English Master Index PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: 723fba910048e21e8f1df079f3269ecd4b81e3a441cdf2657f3f26d88666a9be
-- Package fingerprint: caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg06b_supported_child_printings (
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

insert into pkg06b_supported_child_printings (
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
  ('0c2e9788-f622-4021-9b46-76a214268349'::uuid, '735170eb-a3fa-4050-9ab4-740c54208aac'::uuid, 'me03', '001', 'Spinarak', 'normal', 'verified_master_set_index_v1', 'me03:1:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('5a82ed34-972e-41b3-abeb-b47f630969b8'::uuid, '70c76b3a-6724-44f0-a3ba-244106bc3ed4'::uuid, 'me03', '002', 'Ariados', 'normal', 'verified_master_set_index_v1', 'me03:2:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('d1237271-7b8c-41f0-aa96-3fb08ed158c2'::uuid, '16e27329-3423-4fa1-9ac6-1e4d84142264'::uuid, 'me03', '003', 'Shaymin', 'normal', 'verified_master_set_index_v1', 'me03:3:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('bdd01f45-da8a-44d7-a040-48abf0a2d762'::uuid, 'a99476e1-b149-4d87-b75f-3c39f2a18558'::uuid, 'me03', '004', 'Snivy', 'normal', 'verified_master_set_index_v1', 'me03:4:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('dfd7ae0c-fa54-42a8-904a-11e58421f670'::uuid, '31aff0bf-e38b-41f6-bec6-794e1d2b0f43'::uuid, 'me03', '005', 'Servine', 'normal', 'verified_master_set_index_v1', 'me03:5:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('96f4c156-258f-4c80-bb6f-6239a43b6764'::uuid, '403af011-c793-4050-9abc-da2077c22af0'::uuid, 'me03', '006', 'Serperior', 'holo', 'verified_master_set_index_v1', 'me03:6:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('801ffdc2-076d-4f1c-bd7e-28465629d0fa'::uuid, '5852ad63-73ce-4140-a0ad-e1f9daea347d'::uuid, 'me03', '007', 'Scatterbug', 'normal', 'verified_master_set_index_v1', 'me03:7:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('9ab3b27a-5313-410d-bcc6-4928e9583f3a'::uuid, 'e4f29a8b-8832-4d03-b39e-a7defebaf2d6'::uuid, 'me03', '008', 'Spewpa', 'normal', 'verified_master_set_index_v1', 'me03:8:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('56c461b8-8244-4b34-8843-3835e90500d1'::uuid, 'e291c6e0-7834-486d-b82c-2dd041850847'::uuid, 'me03', '009', 'Vivillon', 'normal', 'verified_master_set_index_v1', 'me03:9:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c42af11f-ae35-4a4e-be5f-6fe622172885'::uuid, '64d9697c-1efb-4036-8cf5-5108aaca599d'::uuid, 'me03', '010', 'Rowlet', 'normal', 'verified_master_set_index_v1', 'me03:10:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('f6f2046b-fb24-4543-837b-f8bc6b5e4635'::uuid, 'da914045-2e6a-4ccc-97c0-74715fee1b49'::uuid, 'me03', '011', 'Dartrix', 'normal', 'verified_master_set_index_v1', 'me03:11:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('d600db3b-1d71-4370-b8ad-b05881b37cb5'::uuid, '97589046-6255-4342-917b-e0c2b96233fc'::uuid, 'me03', '012', 'Decidueye ex', 'holo', 'verified_master_set_index_v1', 'me03:12:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('2bed6d55-83d4-4b82-9e96-787b789bd7c6'::uuid, '8a88230f-533c-42d6-9037-d8c4c1e721e2'::uuid, 'me03', '013', 'Fletchinder', 'normal', 'verified_master_set_index_v1', 'me03:13:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('e8b132ba-cccd-4648-8d7e-cc853993b6aa'::uuid, '7b6f3d4c-8a7d-4a0c-a8a1-0d84e7f9cce8'::uuid, 'me03', '014', 'Talonflame', 'normal', 'verified_master_set_index_v1', 'me03:14:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('84980895-e339-43c7-aec3-7971e6144e84'::uuid, 'e048de4b-36b9-4d43-acd8-4eca092da4e5'::uuid, 'me03', '015', 'Salandit', 'normal', 'verified_master_set_index_v1', 'me03:15:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('1e80ce61-38b5-4227-b462-5d9f6f1a7f59'::uuid, '6b3d6942-ad01-4d94-8ec3-13cb7a1605a6'::uuid, 'me03', '016', 'Salazzle ex', 'holo', 'verified_master_set_index_v1', 'me03:16:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('b16b1d60-6567-48d0-a2e7-ba706b20ab7f'::uuid, '58335156-aa84-4652-bae8-b6abf00844eb'::uuid, 'me03', '017', 'Turtonator', 'normal', 'verified_master_set_index_v1', 'me03:17:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('2ef6d078-ce20-4095-8922-9d1da7f806cd'::uuid, 'e8fcc30a-78a2-4829-a32b-1ed052b8d62a'::uuid, 'me03', '018', 'Seel', 'normal', 'verified_master_set_index_v1', 'me03:18:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c4c6a0a3-a727-41ff-ad21-dc82f30c038d'::uuid, 'd6183d15-d66d-4c2e-9cef-63d9182b0ecc'::uuid, 'me03', '019', 'Dewgong', 'holo', 'verified_master_set_index_v1', 'me03:19:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c9cd262a-9630-47f5-ad09-0eaa561e1340'::uuid, '62b61be4-a528-4b5a-92b6-6889e175c169'::uuid, 'me03', '020', 'Staryu', 'normal', 'verified_master_set_index_v1', 'me03:20:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('06f50452-81cd-4aec-b190-3133fbf28e50'::uuid, '5bd0c6d4-33a0-4cde-9d18-0cb280936dc2'::uuid, 'me03', '021', 'Mega Starmie ex', 'holo', 'verified_master_set_index_v1', 'me03:21:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('67e13572-2424-4a10-8c67-609affe844e9'::uuid, '478b3fc0-a59a-4344-a0c4-95e23700c35a'::uuid, 'me03', '022', 'Lapras ex', 'holo', 'verified_master_set_index_v1', 'me03:22:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('7a068ddc-4292-4843-bbb8-074832d3bc6e'::uuid, 'd3d80a8c-ba5f-4b22-9c7d-f75476745800'::uuid, 'me03', '023', 'Amaura', 'normal', 'verified_master_set_index_v1', 'me03:23:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('2c79e40f-5deb-4961-9438-144f53da4481'::uuid, 'b1ffe453-a9b9-4e42-9ebe-297e287a0539'::uuid, 'me03', '024', 'Aurorus', 'holo', 'verified_master_set_index_v1', 'me03:24:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('fabe2b5e-4bb4-48c6-ad5e-5590d22bf298'::uuid, 'b7fcaa58-a647-4f10-93f0-01fb5bdf9250'::uuid, 'me03', '025', 'Volcanion', 'normal', 'verified_master_set_index_v1', 'me03:25:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c6d0d690-55fa-4fa2-bd39-8e49299f06a8'::uuid, 'b1d088f5-e90c-4cd7-9e5a-58c7f8db68d4'::uuid, 'me03', '026', 'Shinx', 'normal', 'verified_master_set_index_v1', 'me03:26:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('f174a8bd-a8cd-42ae-8874-283da564add5'::uuid, '27e49cec-d7fd-4f2e-901c-024c20c6e1a5'::uuid, 'me03', '027', 'Luxio', 'normal', 'verified_master_set_index_v1', 'me03:27:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('cf9d544a-a1ac-481b-99f4-38106dc3f2f1'::uuid, '292cb5ca-9a03-4627-a00d-92252dfd3180'::uuid, 'me03', '028', 'Luxray', 'holo', 'verified_master_set_index_v1', 'me03:28:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('afd5bafb-1ba0-4aaa-b549-fdc78d2e3e8f'::uuid, '6b6314f4-04a9-45eb-add5-ec06c31cc0f5'::uuid, 'me03', '029', 'Dedenne', 'normal', 'verified_master_set_index_v1', 'me03:29:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('11ef30d2-d70c-411e-b4c0-7cef385c4e25'::uuid, 'dce97cf5-42da-4236-aa56-9c9c1db5986a'::uuid, 'me03', '030', 'Clefairy', 'normal', 'verified_master_set_index_v1', 'me03:30:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('31ab6417-0f49-4833-978f-da38020b42fe'::uuid, 'e5361178-5749-464b-9c72-533ec7445c07'::uuid, 'me03', '031', 'Mega Clefable ex', 'holo', 'verified_master_set_index_v1', 'me03:31:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('b15d9afc-ff25-412e-bf8b-464d1c888023'::uuid, '8b68d8a5-a0df-456e-baae-488395458d70'::uuid, 'me03', '032', 'Mawile', 'normal', 'verified_master_set_index_v1', 'me03:32:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('d5131dd8-faf2-439e-92b4-e9a35936c487'::uuid, '9ac4a5f8-b8ef-4580-899b-042a9bf57411'::uuid, 'me03', '033', 'Espurr', 'normal', 'verified_master_set_index_v1', 'me03:33:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('1bbb6ace-a5c2-4b2c-af15-ba12afeec80a'::uuid, '618f6f3c-e42e-4546-8d22-91cbf2d6f9dd'::uuid, 'me03', '034', 'Meowstic', 'normal', 'verified_master_set_index_v1', 'me03:34:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('a4fbf8c4-569c-46ad-ba81-336e219ad969'::uuid, 'fcc6b733-59d3-48de-9b33-43c590f4ac70'::uuid, 'me03', '035', 'Spritzee', 'normal', 'verified_master_set_index_v1', 'me03:35:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('4dc0e41c-c375-42b9-9276-f639f8518d11'::uuid, 'de6db776-89ca-4d25-8651-d85df0142562'::uuid, 'me03', '036', 'Aromatisse', 'normal', 'verified_master_set_index_v1', 'me03:36:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('0c6654c2-b635-4092-abd6-2a858b4afaee'::uuid, 'd18e8e17-c417-4d52-a39a-1f2f63c45a46'::uuid, 'me03', '037', 'Nosepass', 'normal', 'verified_master_set_index_v1', 'me03:37:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('6ac2708b-701a-43fb-9fe1-6972d7afae58'::uuid, '426925b4-9ff8-4c14-91c2-cd107507eb3c'::uuid, 'me03', '038', 'Probopass', 'normal', 'verified_master_set_index_v1', 'me03:38:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('61a9952e-592c-4eb8-9d3e-2d7f8986b08f'::uuid, '03ada22b-3264-4cc1-a055-eb6e5c796012'::uuid, 'me03', '039', 'Hippopotas', 'normal', 'verified_master_set_index_v1', 'me03:39:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('9a4b29c0-d8e0-4f0b-9aab-77da1928e71a'::uuid, '7e9a534f-f153-455c-a570-dbcdb16b2899'::uuid, 'me03', '040', 'Hippowdon', 'normal', 'verified_master_set_index_v1', 'me03:40:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('ae85da21-bcc7-4f95-941c-a729625356e1'::uuid, 'a3a3a248-6902-46ce-a8c4-c0adc76127ff'::uuid, 'me03', '041', 'Landorus', 'holo', 'verified_master_set_index_v1', 'me03:41:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('aeaaceb8-95e9-4df6-9b3c-a38ea88a1b7a'::uuid, '8f43dfc7-7d9a-4458-a588-b0be8a5ea45d'::uuid, 'me03', '042', 'Binacle', 'normal', 'verified_master_set_index_v1', 'me03:42:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('042717d2-6396-4e0e-b735-be70a576fc7b'::uuid, '99119687-405a-468c-a015-1e11316e9e48'::uuid, 'me03', '043', 'Barbaracle', 'normal', 'verified_master_set_index_v1', 'me03:43:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('b10c949c-23ec-48b6-bd54-2ffb95dafa7f'::uuid, 'd889d01b-83a3-48f0-b098-b500440fbc04'::uuid, 'me03', '044', 'Tyrunt', 'normal', 'verified_master_set_index_v1', 'me03:44:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('ab0f7b9d-073b-4bf2-99b2-c69f345aff3a'::uuid, '3ab2d14f-943e-497a-9d76-e41af34b4ecd'::uuid, 'me03', '045', 'Tyrantrum', 'holo', 'verified_master_set_index_v1', 'me03:45:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('86519d03-de19-4a51-b019-0d6f410ec29a'::uuid, 'eebfab83-d903-427b-b701-64a0bbfdfca9'::uuid, 'me03', '046', 'Hawlucha', 'normal', 'verified_master_set_index_v1', 'me03:46:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('454c0072-0bfd-4155-8547-28c0e40484f4'::uuid, '44eccc7e-f9a3-438d-851c-e00b8913c59d'::uuid, 'me03', '047', 'Mega Zygarde ex', 'holo', 'verified_master_set_index_v1', 'me03:47:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('fbe47322-ce19-4caf-ac90-a9319f459570'::uuid, 'f77adc5f-8646-4bf0-8e9b-139c7415c332'::uuid, 'me03', '048', 'Gastly', 'normal', 'verified_master_set_index_v1', 'me03:48:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c050c15a-2646-497f-a3ec-8c7c5520ae48'::uuid, 'eeaaf66b-a1c0-423e-a559-1942ff7853a1'::uuid, 'me03', '049', 'Haunter', 'normal', 'verified_master_set_index_v1', 'me03:49:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('595618d2-c0ea-4809-9b52-e9fcb8752c8a'::uuid, '2eb7b562-f94f-488f-b199-ec990ddebb66'::uuid, 'me03', '050', 'Gengar', 'holo', 'verified_master_set_index_v1', 'me03:50:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('97bb04e4-2742-4fb9-bdf3-41fbcc2a7c61'::uuid, '3610b303-8ec8-498e-a0a1-df51c6ac83a9'::uuid, 'me03', '051', 'Skorupi', 'normal', 'verified_master_set_index_v1', 'me03:51:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('1456b8c1-0a19-4ca8-9047-66b5b2e0fab1'::uuid, '52783742-0b6b-4ed9-ab5c-8d4c4f1be24a'::uuid, 'me03', '052', 'Drapion', 'normal', 'verified_master_set_index_v1', 'me03:52:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('e2531213-0f2d-4a31-8979-fe8e03de8b5a'::uuid, 'fb5a2ebd-d2c2-4543-9053-0d9fe2aaa4c6'::uuid, 'me03', '053', 'Yveltal ex', 'holo', 'verified_master_set_index_v1', 'me03:53:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('71116b35-daab-4284-93ee-1686775c97f4'::uuid, '0bfd47d4-29f2-48d0-a69d-594b864372f0'::uuid, 'me03', '054', 'Chien-Pao', 'holo', 'verified_master_set_index_v1', 'me03:54:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('dd491077-1766-4573-9e72-7b96e3b695a8'::uuid, '40730352-12bf-4016-9f6c-7863e499f237'::uuid, 'me03', '055', 'Mega Skarmory ex', 'holo', 'verified_master_set_index_v1', 'me03:55:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('71b58912-fffe-42d2-b920-56aca6134b71'::uuid, 'b893612d-0bf5-4a6a-9b59-f28fb7889047'::uuid, 'me03', '056', 'Honedge', 'normal', 'verified_master_set_index_v1', 'me03:56:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('350db062-be91-45d4-a296-1cb50685d815'::uuid, '5cfd6c34-0e70-47ef-a9f8-4439eca3988c'::uuid, 'me03', '057', 'Doublade', 'normal', 'verified_master_set_index_v1', 'me03:57:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('7ffe37b5-532d-420e-803f-392d3e6f069b'::uuid, '36c704e5-5217-4e4b-8061-55a23b2b0326'::uuid, 'me03', '058', 'Aegislash', 'normal', 'verified_master_set_index_v1', 'me03:58:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('b3255b17-38c1-4be5-92a0-d86d8ff66bcc'::uuid, '44487045-9931-431c-aa29-5387c508bcaa'::uuid, 'me03', '059', 'Klefki', 'normal', 'verified_master_set_index_v1', 'me03:59:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('7282bd66-fa46-4e5d-b013-ec10cdb732ca'::uuid, '194b6bf1-4907-4bea-a39c-b62981028765'::uuid, 'me03', '060', 'Rattata', 'normal', 'verified_master_set_index_v1', 'me03:60:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('f05cc2d0-44c1-4f92-bd95-44b698010a2c'::uuid, '80a4d3f7-d970-471e-8ec5-ccc25a43ce0b'::uuid, 'me03', '061', 'Raticate', 'normal', 'verified_master_set_index_v1', 'me03:61:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('f50a7291-ef60-49a1-91ab-e42aa0407d62'::uuid, '8d1c1faa-a210-4f45-ae9a-bc9752db0a2f'::uuid, 'me03', '062', 'Meowth ex', 'holo', 'verified_master_set_index_v1', 'me03:62:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('262affc3-9475-4989-b322-9105ea76c34b'::uuid, 'b93f64f8-92a7-4649-a453-e751f63f32a2'::uuid, 'me03', '063', 'Snorlax', 'normal', 'verified_master_set_index_v1', 'me03:63:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c9d2c7f5-c684-43bf-b489-f4a699a7fd7b'::uuid, 'a7be381e-2710-4e91-b730-c8913b294759'::uuid, 'me03', '064', 'Bunnelby', 'normal', 'verified_master_set_index_v1', 'me03:64:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('fbdeef1d-9592-482f-aa9d-c302e52ec58c'::uuid, '0a555f3b-646c-4585-905f-01264a57561e'::uuid, 'me03', '065', 'Diggersby', 'normal', 'verified_master_set_index_v1', 'me03:65:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('fb21b59d-013b-4e37-a185-31f0d53b5535'::uuid, 'fd919ac4-eac6-43dc-9ec6-e1f529ed9882'::uuid, 'me03', '066', 'Fletchling', 'normal', 'verified_master_set_index_v1', 'me03:66:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('46518196-721e-4015-9340-510c58f41604'::uuid, 'b617ed29-5ef4-4b18-a95b-06cb6ecfd613'::uuid, 'me03', '067', 'Furfrou', 'normal', 'verified_master_set_index_v1', 'me03:67:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('39534c3b-7ee1-4233-9067-72b5a1537860'::uuid, 'b1dc2408-ec29-43f5-9173-494f27dfdc75'::uuid, 'me03', '068', 'Antique Jaw Fossil', 'normal', 'verified_master_set_index_v1', 'me03:68:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('4c44c345-94ff-40f6-b6dd-ced502496ed8'::uuid, '700f715a-aa50-47c8-aeea-742bb3749d35'::uuid, 'me03', '069', 'Antique Sail Fossil', 'normal', 'verified_master_set_index_v1', 'me03:69:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('fc943fd9-67aa-4df7-b3c8-12f71c723ac8'::uuid, '614f846a-a602-4255-95fd-eaf588ef18c9'::uuid, 'me03', '070', 'Core Memory', 'normal', 'verified_master_set_index_v1', 'me03:70:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('769f605a-fc4f-45cc-903d-93702d500e7a'::uuid, 'd146d31a-9949-4d68-ae41-45c1e9b3b784'::uuid, 'me03', '071', 'Crushing Hammer', 'normal', 'verified_master_set_index_v1', 'me03:71:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('9cf32cc5-daa0-4d10-95b1-11b91c0cb5f7'::uuid, 'e89b8d87-a576-4d58-afef-4c7faf44aa15'::uuid, 'me03', '072', 'Energy Search', 'normal', 'verified_master_set_index_v1', 'me03:72:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('dd2c519c-9f84-4286-b2a2-50c2de432e83'::uuid, '666ff2e0-9d60-4d7d-a05e-9c22717c7aa7'::uuid, 'me03', '073', 'Energy Swatter', 'normal', 'verified_master_set_index_v1', 'me03:73:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('0579fb50-db10-448a-aad6-d6d39e1da277'::uuid, '0a03eea2-377a-4dbb-898e-efb866b9655d'::uuid, 'me03', '074', 'Hole-Digging Shovel', 'normal', 'verified_master_set_index_v1', 'me03:74:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('4a75a3f7-52f1-4a84-9f20-ebb056a43f9b'::uuid, 'a28716d6-ef01-49b0-8615-3e8a18575df2'::uuid, 'me03', '075', 'Jacinthe', 'normal', 'verified_master_set_index_v1', 'me03:75:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('68322293-a573-4d68-9851-cdf6da78f01c'::uuid, 'fe010213-b23c-48cc-876b-8de56818926a'::uuid, 'me03', '076', 'Judge', 'normal', 'verified_master_set_index_v1', 'me03:76:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('205e1797-0e08-47be-b742-f705689b2e28'::uuid, '3460206f-a0cf-499e-9065-3ca4c29e99c8'::uuid, 'me03', '077', 'Lumiose City', 'normal', 'verified_master_set_index_v1', 'me03:77:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('bc72c720-eae8-411b-90ad-f807bc18861a'::uuid, 'b78188ef-ed8a-423a-803c-5f79592c89b6'::uuid, 'me03', '078', 'Lumiose Galette', 'normal', 'verified_master_set_index_v1', 'me03:78:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('493ca83e-52c2-4a07-ab45-1fecdede4ef5'::uuid, '554f08c4-cd75-4252-9cf8-6ce99a2c50c9'::uuid, 'me03', '079', 'Naveen', 'normal', 'verified_master_set_index_v1', 'me03:79:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('3316fbc6-46bc-403a-8a4c-53c7a93b335e'::uuid, 'b6092f9b-f22b-48d7-8c55-d85c5e424da5'::uuid, 'me03', '083', 'Potion', 'normal', 'verified_master_set_index_v1', 'me03:83:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('0b80e586-e959-4432-9c0e-a98e6bda2b97'::uuid, 'bbbf9f14-86b1-4545-a352-8082124c2426'::uuid, 'me03', '084', 'Rosa''s Encouragement', 'normal', 'verified_master_set_index_v1', 'me03:84:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('9e6573ab-3fef-45c6-afa0-4f089afbefc1'::uuid, '6a6f19cb-e198-49e3-85a3-68f443e45bd8'::uuid, 'me03', '085', 'Tarragon', 'normal', 'verified_master_set_index_v1', 'me03:85:normal', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('8a0c64bf-7837-4be0-a55b-6657a1c869ab'::uuid, 'd8bf4d82-3141-47fe-8825-5b14e27f41ef'::uuid, 'me03', '086', 'Growing Grass Energy', 'holo', 'verified_master_set_index_v1', 'me03:86:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('f1d2990b-ab24-4006-9ca2-99a21b2837b9'::uuid, '4cd6a94f-9750-4f16-81a1-d033e7890a74'::uuid, 'me03', '087', 'Rocky Fighting Energy', 'holo', 'verified_master_set_index_v1', 'me03:87:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('24e00977-53a9-40ca-9558-ea63a4ba3db6'::uuid, '0d800684-4096-4bce-ad72-f15d19e53938'::uuid, 'me03', '088', 'Telepathic Psychic Energy', 'holo', 'verified_master_set_index_v1', 'me03:88:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('f8687e56-3206-433d-abc1-f56c70136f35'::uuid, '1e4c3b8d-754d-4ef5-b227-74403f48e8fc'::uuid, 'me03', '089', 'Spewpa', 'holo', 'verified_master_set_index_v1', 'me03:89:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('a601acb5-f5c6-4c40-a249-50064768e3b9'::uuid, 'b609368c-765d-4c2a-a26e-24f26afa8a85'::uuid, 'me03', '090', 'Rowlet', 'holo', 'verified_master_set_index_v1', 'me03:90:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('93c1abbd-9f0b-4fa7-bf46-2c33b64bedf4'::uuid, 'bcef98ca-13fc-4d3f-bdaa-4c7d149b26e8'::uuid, 'me03', '091', 'Talonflame', 'holo', 'verified_master_set_index_v1', 'me03:91:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c7b3c1ff-972e-4ff6-b4f5-1e81d6469308'::uuid, '2079454d-e93a-48db-818a-bc6094d402ed'::uuid, 'me03', '092', 'Aurorus', 'holo', 'verified_master_set_index_v1', 'me03:92:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('d04efa2e-cc53-4e62-8655-bd96b147bb6f'::uuid, 'db560767-e26f-43ba-b859-f173c2ecbb69'::uuid, 'me03', '093', 'Dedenne', 'holo', 'verified_master_set_index_v1', 'me03:93:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('da407912-e76a-49c3-8ce1-92d944861d86'::uuid, '02601537-eba7-4602-b72b-35d50af15261'::uuid, 'me03', '094', 'Clefairy', 'holo', 'verified_master_set_index_v1', 'me03:94:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('22614dd2-8a30-4201-8060-fc94efaf9e02'::uuid, '2a5e4336-dfb8-4e2e-bba8-4cf004fa15a1'::uuid, 'me03', '095', 'Espurr', 'holo', 'verified_master_set_index_v1', 'me03:95:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('939ed7e1-dc9f-4cd9-90eb-568c57c93775'::uuid, '1320d8ad-657e-471a-8f01-830d74062765'::uuid, 'me03', '096', 'Probopass', 'holo', 'verified_master_set_index_v1', 'me03:96:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('112b0fb9-1194-41c6-b54e-e15019eab2b5'::uuid, 'fe5065f8-5f83-4827-85e7-4c270dbd74f7'::uuid, 'me03', '097', 'Drapion', 'holo', 'verified_master_set_index_v1', 'me03:97:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c7606084-e043-4307-b107-8071fecbd187'::uuid, '848ac89a-12ff-4c0a-8fdf-dd3c8d724215'::uuid, 'me03', '098', 'Doublade', 'holo', 'verified_master_set_index_v1', 'me03:98:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('ba1e4ea3-a1f3-4935-aca1-c58b074c5d96'::uuid, '3122c7de-0f8f-4539-a1e2-6ef90db2534f'::uuid, 'me03', '099', 'Raticate', 'holo', 'verified_master_set_index_v1', 'me03:99:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('55e3c352-851f-42ad-b936-184d2f3d4001'::uuid, '5cf66957-fcd0-443c-b562-720fae1be44d'::uuid, 'me03', '100', 'Decidueye ex', 'holo', 'verified_master_set_index_v1', 'me03:100:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('94b87f74-5656-4f73-a7b4-930bf2d592be'::uuid, '13627270-feb0-4607-9227-abd6c8ab3365'::uuid, 'me03', '101', 'Salazzle ex', 'holo', 'verified_master_set_index_v1', 'me03:101:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('73f8d5cf-ed10-4f49-9b41-1ef9f4f04eaf'::uuid, '4c173d4a-7611-45f1-97bb-19be6d899826'::uuid, 'me03', '102', 'Mega Starmie ex', 'holo', 'verified_master_set_index_v1', 'me03:102:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('55356e6b-634e-4d50-b0be-44c3ad63bba0'::uuid, '226a1581-1736-4853-8c6c-02cec25c2455'::uuid, 'me03', '103', 'Mega Clefable ex', 'holo', 'verified_master_set_index_v1', 'me03:103:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('2541077c-0a72-4e77-b031-72c55aa08430'::uuid, '23243dd1-5bdb-4367-b1bc-ba6ab96eb3b8'::uuid, 'me03', '104', 'Mega Zygarde ex', 'holo', 'verified_master_set_index_v1', 'me03:104:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('56e2d8a9-9142-4f2f-9a05-7f9bc29fd27a'::uuid, '5887b358-ce17-4219-8e79-477a030b6190'::uuid, 'me03', '105', 'Yveltal ex', 'holo', 'verified_master_set_index_v1', 'me03:105:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('8567208c-a87f-4eb3-9da8-ab81fd038c35'::uuid, '789477cb-0d25-4522-bb28-09fa663cc6fd'::uuid, 'me03', '106', 'Mega Skarmory ex', 'holo', 'verified_master_set_index_v1', 'me03:106:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('077fc381-1512-4738-9bee-980480cb8cab'::uuid, '38aa330e-7d49-42c8-90b4-0dd4a31dd432'::uuid, 'me03', '107', 'Meowth ex', 'holo', 'verified_master_set_index_v1', 'me03:107:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('611c613c-bd6e-4d3a-bf42-3c1f5fbb32b4'::uuid, '2a546773-31b9-4203-97e8-fbe1f148d11e'::uuid, 'me03', '108', 'Energy Recycler', 'holo', 'verified_master_set_index_v1', 'me03:108:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('8c87923d-6b04-41fc-b28e-f2d5220194cc'::uuid, '49529761-7da4-403f-9279-8a40bcfa767f'::uuid, 'me03', '109', 'Forest of Vitality', 'holo', 'verified_master_set_index_v1', 'me03:109:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('301303ce-036a-4898-a9b3-71d006d9581b'::uuid, '61bc239f-3435-4835-bf86-22cdce9b206a'::uuid, 'me03', '110', 'Jacinthe', 'holo', 'verified_master_set_index_v1', 'me03:110:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('b6caa001-e375-411c-ba4e-852ea1275cb5'::uuid, '809b5a96-3564-4951-9eb5-4f25f57bdee2'::uuid, 'me03', '111', 'Lumiose City', 'holo', 'verified_master_set_index_v1', 'me03:111:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('82a1caa9-eec3-4a20-8c85-decde78eb8be'::uuid, '289bc768-5a73-4982-a57a-ce0436c397d9'::uuid, 'me03', '112', 'Naveen', 'holo', 'verified_master_set_index_v1', 'me03:112:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('57dcf65a-92bc-4afa-bb53-fda7163f4e71'::uuid, '9e07e0e1-6990-4e47-9518-d6086026db6e'::uuid, 'me03', '114', 'Rosa''s Encouragement', 'holo', 'verified_master_set_index_v1', 'me03:114:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('ee7cc167-cb71-4567-80d5-b8b3d4da757a'::uuid, '036baf2d-06d7-42e5-a720-fcf9d1c39b19'::uuid, 'me03', '115', 'Sacred Ash', 'holo', 'verified_master_set_index_v1', 'me03:115:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('7ef70674-f2e7-46ba-aaf3-d7f70f5dde33'::uuid, '22c51d34-e17c-439b-b108-9b39362104a7'::uuid, 'me03', '116', 'Tarragon', 'holo', 'verified_master_set_index_v1', 'me03:116:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('87991951-50b0-4d3e-b00c-bbaa4746d5a1'::uuid, '6a23921f-1994-4aa5-a64e-01ae111ea90b'::uuid, 'me03', '117', 'Wondrous Patch', 'holo', 'verified_master_set_index_v1', 'me03:117:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('d4d09982-1036-45a0-a8f0-811b3d477d0f'::uuid, '47e3e00a-c83d-499b-a750-130a69bc5295'::uuid, 'me03', '118', 'Mega Starmie ex', 'holo', 'verified_master_set_index_v1', 'me03:118:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('39dda9fa-a77b-4ee0-99c8-258287ad74d9'::uuid, '98059fa4-b8f4-48e5-a8e8-0d380f7b4185'::uuid, 'me03', '119', 'Mega Clefable ex', 'holo', 'verified_master_set_index_v1', 'me03:119:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('87a156b9-566f-4f82-8d5c-fcddedcd49cc'::uuid, 'cf8e39f3-4a09-4f6e-b244-33762937b5c5'::uuid, 'me03', '120', 'Mega Zygarde ex', 'holo', 'verified_master_set_index_v1', 'me03:120:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('39c74288-602f-4b2c-a761-c112c0599c92'::uuid, 'fc634433-792a-4fce-909d-18783195da50'::uuid, 'me03', '121', 'Meowth ex', 'holo', 'verified_master_set_index_v1', 'me03:121:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('260db372-e3ad-46cc-8517-3ee3fce30fb3'::uuid, 'ae175a90-81b7-4277-8743-5e635569c87f'::uuid, 'me03', '122', 'Jacinthe', 'holo', 'verified_master_set_index_v1', 'me03:122:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('c8057be5-409c-4b10-add7-955302cc884a'::uuid, 'efb2d887-cc7b-49b7-bd19-8a84badc5e65'::uuid, 'me03', '123', 'Rosa''s Encouragement', 'holo', 'verified_master_set_index_v1', 'me03:123:holo', 'pkg06b_supported_finish_subset_dry_run_v1'),
  ('82ec388b-779a-4fef-94a8-d4d6d794b59f'::uuid, '14b9a447-c4dd-4b17-af79-e54e02d1faf8'::uuid, 'me03', '124', 'Mega Zygarde ex', 'holo', 'verified_master_set_index_v1', 'me03:124:holo', 'pkg06b_supported_finish_subset_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06b_supported_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06b_supported_child_printings;
  select count(distinct set_key) into set_count from pkg06b_supported_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06b_supported_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06b_supported_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06b_supported_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 120 then raise exception 'PKG-06B child count drift: %', child_count; end if;
  if parent_count <> 120 then raise exception 'PKG-06B parent count drift: %', parent_count; end if;
  if set_count <> 1 then raise exception 'PKG-06B set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06B unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06B existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06B id collision count: %', id_collision_count; end if;
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
from pkg06b_supported_child_printings;

select
  'PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS'::text as package_id,
  '723fba910048e21e8f1df079f3269ecd4b81e3a441cdf2657f3f26d88666a9be'::text as source_readiness_fingerprint,
  'caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06b_supported_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06b_supported_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06b_supported_child_printings)::int as planned_child_rows;

rollback;

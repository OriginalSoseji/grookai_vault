-- English Master Index PKG-06I-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: 0999b51bc37a2430923cd021763b38504c5fb388c5741f5deb0c1d0329b86ac5
-- Package fingerprint: 99587da59b29b726112cd2806663442f4b5ab02d906bc7dd112931ded15b142c

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06i_active_child_printings (
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

insert into pkg06i_active_child_printings (
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
  ('e9b87c1c-df1b-49dd-8674-d4f61ed66e42'::uuid, '97d1f0f0-a38b-483f-ac9e-93cc1b322b01'::uuid, '2019sm', '1', 'Caterpie', 'holo', 'verified_master_set_index_v1', '2019sm:1:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('64da1f11-49bd-46dd-8b74-81b47a3be3aa'::uuid, '8abb6a59-0aa5-4e0d-bdfc-53cf11ae584f'::uuid, '2019sm', '2', 'Alolan Exeggutor', 'holo', 'verified_master_set_index_v1', '2019sm:2:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('53b3eef3-1b82-45d0-96af-146bb6997413'::uuid, '632e9c58-483b-4e24-9efd-8962a72b5156'::uuid, '2019sm', '3', 'Magmar', 'holo', 'verified_master_set_index_v1', '2019sm:3:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('e414578a-cdad-4e58-9942-b4abb5c715bf'::uuid, 'ad4bc637-addb-4dfa-bb70-5052b1ec0141'::uuid, '2019sm', '4', 'Alolan Sandshrew', 'holo', 'verified_master_set_index_v1', '2019sm:4:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('9e7907be-2fbe-4218-aa6b-196e8912ae70'::uuid, 'c50b650b-9c3f-44ea-bac7-fb6a3769ff11'::uuid, '2019sm', '5', 'Lapras', 'holo', 'verified_master_set_index_v1', '2019sm:5:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('01657e91-a993-4d29-802f-4fb646e6a779'::uuid, 'f83f391c-0083-454c-a301-acbd06c09a8a'::uuid, '2019sm', '6', 'Pikachu', 'holo', 'verified_master_set_index_v1', '2019sm:6:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('a8195c0d-44ae-4e16-8334-279e816046f2'::uuid, 'd629dcad-ed05-4495-bbf3-f0810a5d4ffc'::uuid, '2019sm', '7', 'Gastly', 'holo', 'verified_master_set_index_v1', '2019sm:7:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('2ce222be-e3ff-4fdd-b2a6-af78e01c25b6'::uuid, '96bf2d63-4e0a-44a9-a3fc-a0b8b7eeabf4'::uuid, '2019sm', '10', 'Alolan Meowth', 'holo', 'verified_master_set_index_v1', '2019sm:10:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('9113379e-2d75-4745-b7d2-9e62ed9bf70e'::uuid, 'c5c33084-6864-49b6-afba-b2f2d3859228'::uuid, 'bw4', '14', 'Moltres', 'cosmos', 'verified_master_set_index_v1', 'bw4:14:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('1f790d6d-8dda-4995-acb6-9e6496775c9e'::uuid, 'a37ba3dc-1e08-48b6-9315-f5230bf356e0'::uuid, 'bw4', '40', 'Raichu', 'cosmos', 'verified_master_set_index_v1', 'bw4:40:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('bd83649e-f984-48f1-a679-d65b2fd8c414'::uuid, 'da9ba45e-67da-45d7-8bad-accde5b78120'::uuid, 'bw4', '41', 'Zapdos', 'cosmos', 'verified_master_set_index_v1', 'bw4:41:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('7ad42dff-6bc3-450a-9e84-7a3fd8059e4c'::uuid, '8497d1b0-a635-4a0b-a682-9591ff32b8a0'::uuid, 'bw4', '46', 'Luxray', 'cosmos', 'verified_master_set_index_v1', 'bw4:46:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('7152a1f8-b7e1-4505-a62b-d954e5fa0fa8'::uuid, '0a06037d-8ae0-4f51-ad49-876e4155a216'::uuid, 'bw4', '62', 'Beheeyem', 'cosmos', 'verified_master_set_index_v1', 'bw4:62:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('d0ed618e-4182-48f9-b024-3cb36fa842ad'::uuid, 'bd4bc44c-92b3-4f59-b282-a393685bbc7e'::uuid, 'bw4', '64', 'Lucario', 'cosmos', 'verified_master_set_index_v1', 'bw4:64:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('8e1aab0e-ceab-4b91-9fe7-0bb1c2dbb4d4'::uuid, 'cdcf72c4-d4c0-4f6b-a5a7-4111d937d106'::uuid, 'bw4', '79', 'Wigglytuff', 'cosmos', 'verified_master_set_index_v1', 'bw4:79:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('a213a19b-6780-4327-9c7a-d1cf31b921c8'::uuid, 'a16a4c39-c18a-4ea0-8e04-5324e324fec9'::uuid, 'bw4', '81', 'Persian', 'cosmos', 'verified_master_set_index_v1', 'bw4:81:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('97a6673b-7b17-4019-8542-3240813f8900'::uuid, '0730e779-b9b3-471b-b680-0e4e0966f155'::uuid, 'pop8', '4', 'Probopass', 'normal', 'verified_master_set_index_v1', 'pop8:4:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('4a93b91e-e130-41eb-a8a9-2843baa60d92'::uuid, '08fe7d65-d0d6-4e96-8a20-416ad4085728'::uuid, 'pop8', '5', 'Yanmega', 'normal', 'verified_master_set_index_v1', 'pop8:5:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('2c5a7c56-ca44-4219-9c05-ffcf1a1f2c33'::uuid, '4b816afd-4f4f-488d-be21-e237a1176373'::uuid, 'pop8', '6', 'Cherrim', 'normal', 'verified_master_set_index_v1', 'pop8:6:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('68ab31ab-9d4f-4166-83ac-9aec559fe832'::uuid, '4b816afd-4f4f-488d-be21-e237a1176373'::uuid, 'pop8', '6', 'Cherrim', 'reverse', 'verified_master_set_index_v1', 'pop8:6:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('d8946b00-7b3f-49d2-a834-9ed5c1951ed6'::uuid, '54c2f783-f42d-4ec1-bd0c-b0a37185b64d'::uuid, 'pop8', '7', 'Carnivine', 'reverse', 'verified_master_set_index_v1', 'pop8:7:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('8fc2208a-f883-43f4-a461-b70b5fc2f5ee'::uuid, 'b12fb97d-7f8a-42f9-a574-1efcf8d995da'::uuid, 'pop8', '11', 'Roseanne''s Research', 'normal', 'verified_master_set_index_v1', 'pop8:11:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('1ec92fd8-f306-425a-9dc7-1dce6cccaf3b'::uuid, '55fc291a-fc74-4e85-af01-3f6e5024827b'::uuid, 'pop8', '12', 'Chimchar', 'reverse', 'verified_master_set_index_v1', 'pop8:12:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('0c779e54-0a64-4d01-b6cb-23cfe29e9fa8'::uuid, '745a27b3-78d3-4422-b991-409212210788'::uuid, 'pop8', '15', 'Piplup', 'normal', 'verified_master_set_index_v1', 'pop8:15:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('a1091b7d-fc96-4b01-8c62-57995c1b50fd'::uuid, '0c94f0e6-2d3d-442a-8d6f-934256e2e3cc'::uuid, 'pop8', '16', 'Riolu', 'reverse', 'verified_master_set_index_v1', 'pop8:16:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('14acb9c7-4d30-434a-a4f0-795ab6d338cb'::uuid, '0a6954f3-9a1c-4f5f-93d5-56b1744c1618'::uuid, 'sv10', '18', 'Hydrapple', 'cosmos', 'verified_master_set_index_v1', 'sv10:18:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('0c5a0d3c-f60a-47df-96b4-e45bac7f2ce6'::uuid, 'b2c60343-de28-46f7-95a1-4b460253d436'::uuid, 'sv10', '42', 'Blaziken', 'cosmos', 'verified_master_set_index_v1', 'sv10:42:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('9f6d2ee1-b7fc-4818-af54-a3241729efc4'::uuid, '7c248920-500a-4f3a-ae3f-976563f983e0'::uuid, 'sv10', '049', 'Misty''s Gyarados', 'normal', 'verified_master_set_index_v1', 'sv10:49:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('31cef076-20cf-4b62-8fe2-1d6d4edd9c04'::uuid, '09cdff39-a3f8-4b9d-ab2e-0b337e8b5eb1'::uuid, 'sv10', '96', 'Team Rocket''s Tyranitar', 'cosmos', 'verified_master_set_index_v1', 'sv10:96:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('48abed30-cb11-4dd6-b6f8-4e134586d6b3'::uuid, '2f69c5c1-6fca-43a1-9b68-bc4b139f676c'::uuid, 'sv10', '102', 'Cynthia''s Gible', 'cosmos', 'verified_master_set_index_v1', 'sv10:102:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('f6bf6932-2a89-4607-826c-6cc8490ec964'::uuid, '0ea13a88-b411-4f5c-8760-5e40ba44ceff'::uuid, 'sv10', '146', 'Zamazenta', 'holo', 'verified_master_set_index_v1', 'sv10:146:holo', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('08856dd8-108a-4e52-8a73-25b756bca644'::uuid, '4a35c293-2cb6-497c-9971-1f21fd2c2d19'::uuid, 'sv10', '149', 'Team Rocket''s Meowth', 'cosmos', 'verified_master_set_index_v1', 'sv10:149:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('8779ecdc-f41a-4910-9c62-022af2cc79d4'::uuid, '655e6f38-9ac8-4a62-a7e2-5292e80d9b0e'::uuid, 'sv10', '159', 'Arven''s Greedent', 'cosmos', 'verified_master_set_index_v1', 'sv10:159:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('dd90a17b-0941-4ae9-a6cc-40b6f7edf987'::uuid, 'ae85a323-92e0-4bc2-875a-6f6b3dd0a32e'::uuid, 'sve', '1', 'Basic Grass Energy', 'cosmos', 'verified_master_set_index_v1', 'sve:1:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('7ed77924-121d-46cc-8a19-f757ee7f7384'::uuid, 'ae85a323-92e0-4bc2-875a-6f6b3dd0a32e'::uuid, 'sve', '1', 'Basic Grass Energy', 'reverse', 'verified_master_set_index_v1', 'sve:1:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('bc24d5cf-7d26-4642-9d8e-b448e505dba8'::uuid, '4594353e-6ac8-47b0-bc6c-9f3575677969'::uuid, 'sve', '3', 'Basic Water Energy', 'cosmos', 'verified_master_set_index_v1', 'sve:3:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('dd73286d-1363-46c1-8bdf-d786df131324'::uuid, '4594353e-6ac8-47b0-bc6c-9f3575677969'::uuid, 'sve', '3', 'Basic Water Energy', 'reverse', 'verified_master_set_index_v1', 'sve:3:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('b0e201f3-cd89-461d-9dd9-d881ed58e6ba'::uuid, '17c7d722-46d6-434f-a50e-51dad64a1b6d'::uuid, 'sve', '4', 'Basic Lightning Energy', 'cosmos', 'verified_master_set_index_v1', 'sve:4:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('ba24f946-e76b-4ac0-80a8-302318048ff8'::uuid, '17c7d722-46d6-434f-a50e-51dad64a1b6d'::uuid, 'sve', '4', 'Basic Lightning Energy', 'reverse', 'verified_master_set_index_v1', 'sve:4:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('2c5ebd92-b108-4531-bfe2-53120b785bd2'::uuid, 'bbcf0e8e-e2f9-4229-9f56-040935519d0c'::uuid, 'sve', '5', 'Basic Psychic Energy', 'cosmos', 'verified_master_set_index_v1', 'sve:5:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('4079a4ef-3eb5-4208-a04c-06add5be06b8'::uuid, 'bbcf0e8e-e2f9-4229-9f56-040935519d0c'::uuid, 'sve', '5', 'Basic Psychic Energy', 'reverse', 'verified_master_set_index_v1', 'sve:5:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('228c4e82-325b-42b3-bcf8-6d296f470c3f'::uuid, '9ac8a843-a344-4643-a2cf-a8aa47e1ff20'::uuid, 'sve', '12', 'Basic Lightning Energy', 'reverse', 'verified_master_set_index_v1', 'sve:12:reverse', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('cd10949a-c672-40f9-9ba6-e57a317b2ba4'::uuid, 'b3f32041-a264-4862-8d9b-c434de23d6bb'::uuid, 'svp', '26', 'Varoom', 'cosmos', 'verified_master_set_index_v1', 'svp:26:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('b2ae99b9-6f58-4bc2-986f-c2cafc0cd133'::uuid, 'ca469f4b-d752-4bae-a821-c6273e698b03'::uuid, 'svp', '46', 'Bulbasaur', 'cosmos', 'verified_master_set_index_v1', 'svp:46:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('e0637e1a-8b67-4d3a-b535-4b392f25d0b5'::uuid, '34852c32-ba98-4524-884f-8920982205f9'::uuid, 'svp', '47', 'Charmander', 'cosmos', 'verified_master_set_index_v1', 'svp:47:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('c14dc850-8ff2-4e5b-ac1c-de44a367a660'::uuid, '802bf0ba-c845-4754-9a12-cd8f75378eb9'::uuid, 'svp', '48', 'Squirtle', 'cosmos', 'verified_master_set_index_v1', 'svp:48:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('4a770d69-2b39-439f-9d3d-9a77ef0212cb'::uuid, 'd88606eb-a47c-46e6-a2aa-f33766d3167b'::uuid, 'svp', '138', 'Porygon2', 'cosmos', 'verified_master_set_index_v1', 'svp:138:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('b7c5a51e-1a41-46be-92fa-5da05890eae6'::uuid, 'e132812c-6fca-4186-a7b5-01cb73e6d50a'::uuid, 'svp', '199', 'Zarude', 'cosmos', 'verified_master_set_index_v1', 'svp:199:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('c29fa2da-2b46-4b86-8fd2-0c63f9e7adfc'::uuid, '49b94ad9-36d3-4d86-8612-b906b51642f5'::uuid, 'svp', '200', 'Eevee', 'cosmos', 'verified_master_set_index_v1', 'svp:200:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('a10ceadb-2eb4-4cf3-8b5a-82a822dfd071'::uuid, '61a7b2de-46b3-4ca2-b6d8-d8735d5332c8'::uuid, 'svp', '201', 'Zebstrika', 'cosmos', 'verified_master_set_index_v1', 'svp:201:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('99bb0980-3710-411c-b707-2da13167dfeb'::uuid, '593d4c3b-5408-4c96-b6bc-8653832bed88'::uuid, 'svp', '202', 'Kangaskhan', 'cosmos', 'verified_master_set_index_v1', 'svp:202:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('f2314fc5-e410-492a-8126-1a4fcf033b11'::uuid, 'a96e4217-84f0-473f-8958-da104aba1aef'::uuid, 'swsh8', '88', 'Electrode', 'cosmos', 'verified_master_set_index_v1', 'swsh8:88:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('69b0d2cb-e482-4399-b969-823ea1b86e04'::uuid, '6a4c1a57-bf8a-4d2a-a564-6068502ef650'::uuid, 'swsh8', '120', 'Deoxys', 'normal', 'verified_master_set_index_v1', 'swsh8:120:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('a1fde897-7f6d-46ec-9097-4fe25013f5bb'::uuid, '12451c1a-3597-40c1-aaba-919749cef7ea'::uuid, 'swsh8', '130', 'Dragapult', 'cosmos', 'verified_master_set_index_v1', 'swsh8:130:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('a7df99f0-ec99-481c-97e0-5f6ef9efc42c'::uuid, '12451c1a-3597-40c1-aaba-919749cef7ea'::uuid, 'swsh8', '130', 'Dragapult', 'normal', 'verified_master_set_index_v1', 'swsh8:130:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('64e7f44e-b6bd-4632-8d66-bcc9f7c8f9aa'::uuid, '7c285cf9-3c61-4dd2-bdaa-9b25fe95dd50'::uuid, 'swsh8', '139', 'Steelix', 'normal', 'verified_master_set_index_v1', 'swsh8:139:normal', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('8b8479ba-99bb-4c2d-a8df-88b751f569db'::uuid, '4e1e1362-d242-4de8-aacb-3bbf7c068189'::uuid, 'swsh8', '148', 'Landorus', 'cosmos', 'verified_master_set_index_v1', 'swsh8:148:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('1f17e32b-458c-4dfc-b9e6-7309eaf7ec99'::uuid, 'af62738f-a696-458d-899f-2c18daa301d9'::uuid, 'swsh8', '161', 'Galarian Obstagoon', 'cosmos', 'verified_master_set_index_v1', 'swsh8:161:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('aad7d778-13c5-4168-aa45-7a60cec80558'::uuid, '855f891a-e504-478b-ae36-4766de0deb90'::uuid, 'swsh8', '222', 'Wooloo', 'cosmos', 'verified_master_set_index_v1', 'swsh8:222:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('8e29894c-8499-420a-aa1b-387470b68bfe'::uuid, '0b42c730-2ed6-4d9d-8715-b1510e956ac3'::uuid, 'xy3', '18', 'Politoed', 'cosmos', 'verified_master_set_index_v1', 'xy3:18:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('191033fa-217b-4898-a700-9e84d2fee16e'::uuid, '433bca74-bee2-46ac-b78d-b469b839e494'::uuid, 'xy3', '25', 'Amaura', 'cosmos', 'verified_master_set_index_v1', 'xy3:25:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('64c41fc1-4be3-43e4-8d83-e53eb0fbc037'::uuid, '655e19fd-c222-4cac-a1f0-d1f32d1618ee'::uuid, 'xy3', '26', 'Aurorus', 'cosmos', 'verified_master_set_index_v1', 'xy3:26:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('c28ec78f-0f9d-45b5-a52a-afc79e2e862a'::uuid, '1a9e6fbc-f7a3-4e1e-a2d5-b87e52bcc6e2'::uuid, 'xy3', '46', 'Machamp', 'cosmos', 'verified_master_set_index_v1', 'xy3:46:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('5f9f078f-e96a-4e33-97c3-622c7e83fd77'::uuid, '5c7d087e-c3ec-40ad-9bc0-65eb190f62d1'::uuid, 'xy3', '61', 'Tyrunt', 'cosmos', 'verified_master_set_index_v1', 'xy3:61:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('86c952f4-7676-42b1-ab1c-2be080a95ccc'::uuid, '5205f3e8-fb60-48c7-b5d3-a003ffe754e7'::uuid, 'xy3', '62', 'Tyrantrum', 'cosmos', 'verified_master_set_index_v1', 'xy3:62:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('3f589eda-57f6-4cbe-be5a-3f6778e9ba9b'::uuid, '81496566-4cac-491c-9452-f0d2f73dd084'::uuid, 'xy3', '63', 'Hawlucha', 'cosmos', 'verified_master_set_index_v1', 'xy3:63:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('bca4cb0b-e42c-47bd-acbf-7350e5127681'::uuid, '3132ce5d-9504-4999-a0c0-351633328859'::uuid, 'xy3', '77', 'Noivern', 'cosmos', 'verified_master_set_index_v1', 'xy3:77:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('159d3946-a723-4761-8de9-045b4f5b63e7'::uuid, '72e57a3e-0903-40da-b23e-85f8220239bf'::uuid, 'xy3', '92', 'Fossil Researcher', 'cosmos', 'verified_master_set_index_v1', 'xy3:92:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('2224339c-06c2-479b-b035-b62285c4e283'::uuid, '7cd51cc3-88fe-4b16-ab61-2fd23152e4eb'::uuid, 'xy7', '4', 'Bellossom', 'cosmos', 'verified_master_set_index_v1', 'xy7:4:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('f46509c7-a42a-405c-aab4-cda155cf1911'::uuid, '4ee9d458-34a6-481c-9565-1c0d463a022d'::uuid, 'xy7', '13', 'Flareon', 'cosmos', 'verified_master_set_index_v1', 'xy7:13:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('9119e6c8-eb58-4f14-9e02-3e1c54410014'::uuid, '78e7e5ba-4c93-4c11-a81f-c71bfebc1e5a'::uuid, 'xy7', '14', 'Entei', 'cosmos', 'verified_master_set_index_v1', 'xy7:14:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('8528d3b7-0a75-48be-8333-49c41aa31b7c'::uuid, '085e1360-d689-4677-b554-82307793f45d'::uuid, 'xy7', '20', 'Gyarados', 'cosmos', 'verified_master_set_index_v1', 'xy7:20:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('0e9f995b-3995-4825-b062-7ff69aba351b'::uuid, '363671be-a315-4303-92a2-f74706b4827a'::uuid, 'xy7', '21', 'Gyarados', 'cosmos', 'verified_master_set_index_v1', 'xy7:21:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('b39cd756-676e-49b5-a583-5def5029a4a9'::uuid, '79a2fdf5-3fb1-48c0-8b74-82753a7467bb'::uuid, 'xy7', '22', 'Vaporeon', 'cosmos', 'verified_master_set_index_v1', 'xy7:22:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('add1e0d5-8391-4a10-94ff-57248fbb37fa'::uuid, 'ee3893f5-e980-4b1e-b581-a8fc5e7cac40'::uuid, 'xy7', '26', 'Jolteon', 'cosmos', 'verified_master_set_index_v1', 'xy7:26:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('3bf8713e-0f26-4b41-9e33-0a46d40e5e44'::uuid, '6e4aa394-294a-4a1a-936b-e005ef916137'::uuid, 'xy7', '54', 'Gardevoir', 'cosmos', 'verified_master_set_index_v1', 'xy7:54:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('993fbfd7-564f-4b91-b649-3c9543e40205'::uuid, '737b19b7-dfde-45db-ac09-d7e0ef65ae3c'::uuid, 'xy8', '15', 'Vivillon', 'cosmos', 'verified_master_set_index_v1', 'xy8:15:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('7a231bf6-d6fc-443f-b9e3-78f5e3018cd5'::uuid, '8f892208-7594-4cb5-8a4c-82cff0fd449c'::uuid, 'xy8', '20', 'Typhlosion', 'cosmos', 'verified_master_set_index_v1', 'xy8:20:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('3b1c1161-efc3-4db1-b9e4-e41a152bbbf3'::uuid, '748466a1-d9ab-4f6f-a473-114f25397be2'::uuid, 'xy8', '55', 'Raikou', 'cosmos', 'verified_master_set_index_v1', 'xy8:55:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('eb42099b-1a00-4cdd-988b-1e75f36caf0c'::uuid, '52f8bfe2-bb19-40b3-bbca-66ab7232cd31'::uuid, 'xy8', '60', 'Gengar', 'cosmos', 'verified_master_set_index_v1', 'xy8:60:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('32e50e9b-7186-4d24-922c-2f5270cae080'::uuid, '2eda8f2a-e1fd-4b2d-b46e-d546b95ca14d'::uuid, 'xy8', '84', 'Gallade', 'cosmos', 'verified_master_set_index_v1', 'xy8:84:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('78d12237-0443-4db8-bb42-81368e288ab7'::uuid, '9e8889e2-2b21-40f1-b852-7698144be639'::uuid, 'xy8', '91', 'Zoroark', 'cosmos', 'verified_master_set_index_v1', 'xy8:91:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('62070ba1-206f-4da7-8826-54abd875365f'::uuid, '0de75611-e899-489f-9f6d-96bcf3c8e74f'::uuid, 'xy8', '94', 'Yveltal', 'cosmos', 'verified_master_set_index_v1', 'xy8:94:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1'),
  ('d0e46253-4eca-4a6a-ac99-d639c7d0cf59'::uuid, '931b65ef-a921-4a31-ab9e-353c5ee539e8'::uuid, 'xy8', '107', 'Xerneas', 'cosmos', 'verified_master_set_index_v1', 'xy8:107:cosmos', 'pkg06i_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06i_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06i_active_child_printings;
  select count(distinct set_key) into set_count from pkg06i_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06i_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06i_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06i_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 84 then raise exception 'PKG-06I child count drift: %', child_count; end if;
  if parent_count <> 78 then raise exception 'PKG-06I parent count drift: %', parent_count; end if;
  if set_count <> 10 then raise exception 'PKG-06I set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06I unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06I existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06I id collision count: %', id_collision_count; end if;
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
from pkg06i_active_child_printings;

select
  'PKG-06I-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  '0999b51bc37a2430923cd021763b38504c5fb388c5741f5deb0c1d0329b86ac5'::text as source_readiness_fingerprint,
  '99587da59b29b726112cd2806663442f4b5ab02d906bc7dd112931ded15b142c'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06i_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06i_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06i_active_child_printings)::int as planned_child_rows;

rollback;

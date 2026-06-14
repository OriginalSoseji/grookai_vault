-- PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE guarded dry-run transaction
-- package_fingerprint_sha256: d66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a
-- This transaction must end in ROLLBACK. No durable writes are authorized by this artifact.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table pkg09a_parent_updates (
  card_print_id uuid primary key,
  target_set_id uuid not null,
  target_set_code text not null,
  target_number text not null,
  target_name text not null
) on commit drop;

insert into pkg09a_parent_updates (card_print_id, target_set_id, target_set_code, target_number, target_name) values
  ('01c5da32-bee4-47a8-9fa4-2b11b967c2d4'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '145', 'Garchomp C LV.X'),
  ('06740900-b1ab-46e1-8ed9-d52e8bf1cd49'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG20', 'Latias'),
  ('0982a088-e9b9-4571-a5eb-2d9b4139b485'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG60', 'Cynthia''s Ambition'),
  ('0c4f0f95-3980-4a6f-a28d-72bc166d2be5'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG42', 'Zeraora VMAX'),
  ('0d812600-fea9-40b2-b399-c6e3aff0b60a'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG54', 'Zamazenta V'),
  ('0f856b9c-39de-4c9f-8fc4-6ef1686a37f1'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG26', 'Riolu'),
  ('10187dc4-4c13-4157-8c1c-92e08e6e19dc'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '8', 'Dark Gyarados'),
  ('1fdf3e02-9156-4003-bc52-2b4d8f40ed65'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '24', '_____''s Pikachu'),
  ('20285363-9cdb-4e52-b40e-8d8fbadc4c83'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG31', 'Turtwig'),
  ('20a2daeb-eaf3-462e-b4c1-663ae6068dbf'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '76', 'M Rayquaza-EX'),
  ('2617ed34-88c9-40cc-816e-72e4a170e737'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG05', 'Lapras'),
  ('26726d70-a78d-4210-9ccc-d79abd215099'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '009', 'Alakazam'),
  ('29e6df78-95f6-478d-b131-7aaed3320d17'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG38', 'Suicune V'),
  ('2e9fba45-6edb-46af-a080-ba36838864d2'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG62', 'Grant'),
  ('313a9917-891e-49bc-9466-730c01b3ca85'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG48', 'Zacian V'),
  ('31dbe012-e7a4-4e00-8f22-021c8ebc7de3'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG64', 'Melony'),
  ('36dae267-0f2e-4973-99c4-a619ab885b4b'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG53', 'Hoopa V'),
  ('38153a0a-009d-4242-a179-528a3d152e6c'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG33', 'Poochyena'),
  ('38ddc64b-02d4-45bb-ad9a-3e6429e12475'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG19', 'Altaria'),
  ('39c1d5cf-b398-4b41-bbfc-3177c2822084'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG32', 'Paras'),
  ('3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '15', 'Rocket''s Zapdos'),
  ('4b37fa75-6f17-4834-bd9f-da1db757e11b'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG11', 'Lunatone'),
  ('539fb3c5-8eef-47ef-b3ba-693d63e4f688'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '107', 'Donphan'),
  ('5449797b-5b49-4e16-b509-1a5c106555c6'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG37', 'Simisear VSTAR'),
  ('55902f3f-3f01-4a82-9d00-f8d78a4d5757'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG03', 'Magmortar'),
  ('567df8e9-0d9f-4309-bdec-412ba43e74dd'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '114', 'Zekrom'),
  ('596e3eed-3378-4643-bdf1-2fc2664c11e3'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG39', 'Lumineon V'),
  ('5dd278a1-ccaa-48e6-84c2-7190ee63c9d8'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '008', 'Golduck'),
  ('5f64ad81-93ff-4b77-aa94-06f8522b3f1e'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '001', 'Meganium'),
  ('6076a1f4-eb63-4217-8e3b-35dd4acc1897'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG24', 'Miltank'),
  ('6264c437-64e9-4f93-8f97-0bcb8f27d60f'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG10', 'Mew'),
  ('6694c497-f816-4afa-bc6e-5e4cd19ecd74'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG45', 'Deoxys VMAX'),
  ('687bd219-98cc-4a9b-881d-8e970235add8'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG46', 'Deoxys VSTAR'),
  ('69572cf4-a580-49cc-90d2-36c053f510a9'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '006', 'Drifblim'),
  ('6b523120-f133-42ee-a784-ab39107d7aee'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG15', 'Solrock'),
  ('6ec141ee-fc15-4793-8064-d729afa8b942'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG21', 'Hisuian Goodra'),
  ('6f7a5d87-d59d-41c2-81af-9aaef7687b27'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG43', 'Zeraora VSTAR'),
  ('70ff6f97-42cf-40bd-9e8f-ffb9bcce2744'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG40', 'Glaceon VSTAR'),
  ('718508f6-7825-43e8-98e1-a57b58dd490f'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '003', 'Alakazam'),
  ('72cab265-6059-449f-a354-2384f7dd77f9'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG70', 'Arceus VSTAR'),
  ('73d3fae8-4fcb-4b07-a875-c82e688d121c'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '88', 'Mew ex'),
  ('74d82d5f-f77a-44e9-b128-9c409ccdec55'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG08', 'Electivire'),
  ('7b6c8f7d-6ad0-4e9c-84a8-66c3de23fb00'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '54', 'Mewtwo-EX'),
  ('7dbe7590-cc75-4f30-a5e4-56e4ac6704d1'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG41', 'Raikou V'),
  ('80d2191d-f454-42ac-97d1-e03e4813720f'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG07', 'Keldeo'),
  ('886244b9-bc31-4e34-b054-1b7f463e6ead'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG04', 'Oricorio'),
  ('8a8a6047-af96-4978-9173-32a773d2ae6a'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG68', 'Origin Forme Dialga VSTAR'),
  ('8cadb41e-3a35-4337-ac68-b90e5334b0c4'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG69', 'Giratina VSTAR'),
  ('8d7795cc-2863-44b3-a4ba-999ab757217f'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '9', 'Team Magma''s Groudon'),
  ('912437b0-a767-43ec-bb1c-a1fc59a2d26f'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '66', 'Shining Magikarp'),
  ('95dca2c2-c3e7-43b4-bc02-227fddc4910d'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '002', 'Inteleon'),
  ('998e4831-1f02-45dd-b56e-bddff248732c'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG29', 'Bidoof'),
  ('9a8eb487-b1a2-449a-bdbd-fbaf13ab7e12'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG25', 'Bibarel'),
  ('9c9a6172-c8a2-4b51-8128-2556010a591b'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG17', 'Thievul'),
  ('9dfce359-5010-4be0-8d49-a0bc89e85216'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG35', 'Leafeon VSTAR'),
  ('9e2ba5c0-0aa8-4a64-bc30-c67cfe7c0256'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG16', 'Absol'),
  ('9fe607cc-72d0-431d-969d-e7cc1c689e1f'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG27', 'Swablu'),
  ('a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '15', 'Claydol'),
  ('a3a4b8fc-48ab-4f50-b562-a5dc24e97265'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG14', 'Comfey'),
  ('a532be32-7786-4ed0-9570-bec548d49e0d'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG09', 'Toxtricity'),
  ('a66d2743-cd07-4ecd-bf6c-13e1077a6d4f'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG67', 'Origin Forme Palkia VSTAR'),
  ('a683bb41-182d-440b-9e6c-d82ebfd38f1d'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '007', 'Psyduck'),
  ('a8259bb9-d94d-4aee-af25-28f0a9656a60'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '010', 'Riolu'),
  ('ad4ac3c7-1141-45a2-88c7-c5b69a5602ee'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG13', 'Diancie'),
  ('af1854ae-372a-49a4-be26-f15b2194642c'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG22', 'Ditto'),
  ('b0068f07-1dfc-4581-a822-dc78a981ea18'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG66', 'Roxanne'),
  ('b16d1b88-29cf-44e9-82c8-53a66ea84692'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '4', 'Charizard'),
  ('b2fc0448-3ab4-4ce8-9d24-623c8ad4c0ba'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '86', 'Rocket''s Admin.'),
  ('b4a42612-945d-419f-a4f4-c64ae5c26d6b'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '93', 'Gardevoir ex δ'),
  ('b57d7fbf-5825-4936-b9f9-1455315d445e'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG36', 'Entei V'),
  ('b82aa05d-78bd-4dee-ab8c-6d770f8799f3'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG61', 'Gardenia''s Vigor'),
  ('b9949117-0cb6-4ba5-b519-990d359b7b26'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG02', 'Kricketune'),
  ('b9f303d7-e876-4bfe-b49f-c0e85a03fe6d'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG59', 'Colress''s Experiment'),
  ('bccbc633-75b7-4424-98d5-81cc91b788ab'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG44', 'Mewtwo VSTAR'),
  ('bdae671a-1905-41ed-9d91-9bcdcd3b841f'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG65', 'Raihan'),
  ('bdbf4197-537b-4fa7-9cac-304006b170aa'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '2', 'Blastoise'),
  ('c05b55ed-8e03-4889-9f4e-2761562ad334'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG49', 'Drapion V'),
  ('c07ec577-c800-4e0b-b089-e696c32bbdf2'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '20', 'Cleffa'),
  ('c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '15', 'Here Comes Team Rocket!'),
  ('c59eff7c-821e-426b-923d-0349e62aa200'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG34', 'Mareep'),
  ('c5b19da0-1f2d-4b86-844f-90284539099d'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '005', 'Drifloon'),
  ('c8246fb5-372d-48be-b051-74337d4055f5'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '73', 'Imposter Professor Oak'),
  ('c9c1a789-a686-4541-99b7-ac7d4de7be30'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '17', 'Umbreon ★'),
  ('cbb18410-e78d-4770-9496-8e6fdd3a401a'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG50', 'Darkrai VSTAR'),
  ('cc4cecad-a7a0-44ed-8c45-a4f8ae87b994'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG55', 'Regigigas VSTAR'),
  ('cddc521f-ebbe-4460-85d5-d78278672f95'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '004', 'Lunatone'),
  ('cfa1960c-e25d-4eb8-b15e-664ec755693d'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG28', 'Duskull'),
  ('d117a1fb-eaf1-4d2e-864c-8146b6dbf824'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG51', 'Hisuian Samurott V'),
  ('d553ac9f-f620-4e1f-bc58-4bbd761e6e26'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG01', 'Hisuian Voltorb'),
  ('d62d4f5c-277b-4f32-b5aa-a393d990fbb3'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '15', 'Venusaur'),
  ('dbafad09-4a8f-4766-b85b-9637bd3fab21'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '113', 'Reshiram'),
  ('e3722b78-d530-409b-96e7-d23170bc26f3'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG63', 'Irida'),
  ('e7c24446-0f6c-4d5c-9fe5-2f7f4eaba033'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG18', 'Magnezone'),
  ('ea89f0b4-2a93-461f-a26e-6dd13f863ad3'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG06', 'Manaphy'),
  ('ebd620c1-fb7a-45af-a7e7-b5f1a4030cc7'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG56', 'Hisuian Zoroark VSTAR'),
  ('ee187555-85f3-4f93-841a-1e53cfa795c3'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG30', 'Pikachu'),
  ('ee891a93-31ae-4eb0-91e4-c659a137180a'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '97', 'Xerneas-EX'),
  ('f244a2ad-6570-4466-b0c0-99997abe184b'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG57', 'Adaman'),
  ('f5e46afe-c6cf-41f2-a6ec-97bcef4fa9f8'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG23', 'Dunsparce'),
  ('f6a2698f-5922-40eb-aff2-b8b9c9ac775a'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG52', 'Hisuian Samurott VSTAR'),
  ('f6ecdc60-447d-4565-9f0d-d6493cd53f7f'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG12', 'Deoxys'),
  ('f7b2a03b-1990-450b-b0ce-70ffda4447cb'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '60', 'Tapu Lele-GX'),
  ('fac09ef1-302a-465e-bacf-c43c39c6790f'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG47', 'Hatterene VMAX'),
  ('fb8b14a4-11fc-4b6d-87ed-8b0f0713cabe'::uuid, '3be64773-d30e-48af-af8c-3563b57e5e4a'::uuid, 'cel25c', '109', 'Luxray GL LV.X'),
  ('fd7af905-5d7a-4d03-b0a1-c70ddbc7ff42'::uuid, 'da2ed3c3-23d9-402f-8f87-b36635e4ea52'::uuid, 'swsh12pt5gg', 'GG58', 'Cheren''s Care');

create temporary table pkg09a_parent_inserts (
  card_print_id uuid primary key,
  set_id uuid not null,
  set_code text not null,
  number text not null,
  name text not null,
  rarity text,
  variant_key text,
  external_ids jsonb not null,
  ai_metadata jsonb not null
) on commit drop;

insert into pkg09a_parent_inserts (card_print_id, set_id, set_code, number, name, rarity, variant_key, external_ids, ai_metadata) values
  ('8a06f042-7225-4d2b-b19c-a42a0846798a'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '011', 'Mega Latias ex', null, '', '{"tcgdex":"mep-011"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-011","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('fdfdd572-c844-4fe5-8da9-7200abfe6055'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '012', 'Mega Lucario ex', null, '', '{"tcgdex":"mep-012"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-012","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('1e6e9be7-17d4-4b0c-ad53-af73b0719a5c'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '013', 'Mega Venusaur ex', null, '', '{"tcgdex":"mep-013"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-013","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('a2061f9b-477e-417c-b887-fa1588e65841'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '014', 'Ceruledge', null, '', '{"tcgdex":"mep-014"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-014","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('42a3071c-64a2-4fe2-a6fe-9597914c0cfb'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '015', 'Zacian', null, '', '{"tcgdex":"mep-015"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-015","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('a8798fd0-faa6-4eb4-8bc7-8de9d902a9b0'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '016', 'Flygon', null, '', '{"tcgdex":"mep-016"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-016","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('fe0655fe-23c2-464a-a37a-c6b04b11e9e4'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '017', 'Toxtricity', null, '', '{"tcgdex":"mep-017"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-017","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('5cd7a18c-0d2f-4e57-82e1-5d03f06942d4'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '018', 'Cottonee', null, '', '{"tcgdex":"mep-018"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-018","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('13b5596f-2b70-4948-90ad-134c22220630'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '019', 'Whimsicott', null, '', '{"tcgdex":"mep-019"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-019","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('93a96678-3d0c-4060-928d-244c3ab152f0'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '020', 'Sneasel', null, '', '{"tcgdex":"mep-020"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-020","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('db786f44-3b3c-42e2-a070-600d9cfad951'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '021', 'Weavile', null, '', '{"tcgdex":"mep-021"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-021","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('5e67b43d-3a75-43ef-a771-91b7d4d55b20'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '022', 'Charcadet', null, '', '{"tcgdex":"mep-022"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-022","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('b9b69cb0-dfe7-4928-b7c5-18358feed3a5'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '023', 'Mega Charizard X ex', null, '', '{"tcgdex":"mep-023"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-023","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('11d2bbcc-37dd-41e7-a08d-7f087b9158a8'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '024', 'Oricorio ex', null, '', '{"tcgdex":"mep-024"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-024","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('e94f133d-201c-460a-8c00-4bd42e9c625a'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '025', 'Mega Kangaskhan ex', null, '', '{"tcgdex":"mep-025"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-025","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('7b76eafc-cd2e-46c0-8cd0-972f824b7501'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '026', 'Meloetta', null, '', '{"tcgdex":"mep-026"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-026","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('e97100d6-f173-409b-940a-5c00ad7e2cc4'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '027', 'Haunter', null, '', '{"tcgdex":"mep-027"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-027","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('3b88fff2-c2ab-4750-b406-71cecafc0ddc'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '028', 'Celebratory Fanfare', null, '', '{"tcgdex":"mep-028"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-028","https://reverseholo.app/sets/mep"]}'::jsonb),
  ('7bd09f9b-5484-4438-98db-0310aeaa458f'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '029', 'Mega Charizard X ex', null, '', '{"tcgdex":"mep-029"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-029","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('5a8dc5d7-d997-40c3-abbe-d0eef7274fe3'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '030', 'Mega Charizard Y ex', null, '', '{"tcgdex":"mep-030"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-030","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('c9891896-f045-4351-9c01-661c5416f156'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '031', 'N''s Zekrom', null, '', '{"tcgdex":"mep-031"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-031","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('a3cb10d9-d6c4-4f3e-ac57-59a04f7addb9'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '032', 'Mega Gardevoir ex', null, '', '{"tcgdex":"mep-032"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-032","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('1a74aac3-6e04-4ac4-9f67-f64587247e25'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '033', 'Mega Lucario ex', null, '', '{"tcgdex":"mep-033"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-033","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('e60163f4-a526-45d1-9429-d943998d0354'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '034', 'Mega Meganium ex', null, '', '{"tcgdex":"mep-034"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-034","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('cc798c00-1284-4f93-89e9-818b11fb5b78'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '035', 'Mega Emboar ex', null, '', '{"tcgdex":"mep-035"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-035","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('a363a681-f7e9-4620-9396-dcf802abc2bf'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '036', 'Mega Feraligatr ex', null, '', '{"tcgdex":"mep-036"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-036","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('d1cd3c09-a98a-41cc-a846-5ae9c995bc18'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '037', 'Bulbasaur', null, '', '{"tcgdex":"mep-037"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-037","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('d4142e2d-3347-4016-990c-0924a00ff1f2'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '038', 'Charmander', null, '', '{"tcgdex":"mep-038"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-038","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('8543361b-731c-40fa-a943-432c3e2d2439'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '039', 'Squirtle', null, '', '{"tcgdex":"mep-039"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-039","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('7a5329c0-6741-4973-bb3a-ce9d3ed668d9'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '040', 'Turtwig', null, '', '{"tcgdex":"mep-040"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-040","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('56460b85-7b14-4e93-8ffa-979490d814e6'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '041', 'Chimchar', null, '', '{"tcgdex":"mep-041"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-041","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('cd6c3e73-d9d3-4006-acf7-c41cc2c39a1d'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '042', 'Piplup', null, '', '{"tcgdex":"mep-042"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-042","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('43c774d3-4c4c-4461-8a7f-686f918f9b05'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '043', 'Rowlet', null, '', '{"tcgdex":"mep-043"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-043","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('029b4b7c-8d8c-4067-b30c-2852eda0f36a'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '044', 'Litten', null, '', '{"tcgdex":"mep-044"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-044","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('50f533d2-dab5-403a-907d-faafe7b324be'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '045', 'Popplio', null, '', '{"tcgdex":"mep-045"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-045","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('e974d152-fefe-4a56-ad6a-1baced7713a9'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '064', 'Serperior', null, '', '{"tcgdex":"mep-064"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-064","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('bfb286b4-20db-475f-9b0e-0057c926283b'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '065', 'Barbaracle', null, '', '{"tcgdex":"mep-065"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-065","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('984c357a-056e-42c4-87ec-0595cd4c6c97'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '066', 'Tyrantrum', null, '', '{"tcgdex":"mep-066"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-066","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('54ca1be2-df3a-4b81-8adc-7b5923fc3dfa'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '067', 'Doublade', null, '', '{"tcgdex":"mep-067"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-067","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('45589393-ca82-4b9c-88c7-d477aaeb45b1'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '068', 'Makuhita', null, '', '{"tcgdex":"mep-068"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-068","https://reverseholo.app/sets/mep"]}'::jsonb),
  ('307545d2-7a82-4c60-8dfe-1b18bc2a092e'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '069', 'Chikorita', null, '', '{"tcgdex":"mep-069"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-069","https://reverseholo.app/sets/mep"]}'::jsonb),
  ('563a0b4e-5f74-4e5c-a0fc-95095a475d0d'::uuid, '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf'::uuid, 'mep', '070', 'Tyrunt', null, '', '{"tcgdex":"mep-070"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["reverseholo_set_checklist","tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/mep-070","https://reverseholo.app/sets/mep","https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list"]}'::jsonb),
  ('de6cac7e-b117-4cf4-8265-16215cf8d7e7'::uuid, '87c9b80e-6466-4792-8c33-a405e1e70a4a'::uuid, 'xya', '24a', 'M Manectric-EX', null, '', '{"tcgdex":"xya-24a"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["pkmncollectors_xya","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/xya-24a","https://www.pkmncollectors.com/cards/m-manectric-ex-yellow-a-alternate-24a-rare"]}'::jsonb),
  ('aaa125f5-1261-47b1-ab32-039c25a0fb58'::uuid, '87c9b80e-6466-4792-8c33-a405e1e70a4a'::uuid, 'xya', '28a', 'Jolteon-EX', null, '', '{"tcgdex":"xya-28a"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["pkmncollectors_xya","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/xya-28a","https://www.pkmncollectors.com/cards/jolteon-ex-yellow-a-alternate-28a-rare"]}'::jsonb),
  ('599c154b-29dd-48fe-acef-ad462d32512f'::uuid, '87c9b80e-6466-4792-8c33-a405e1e70a4a'::uuid, 'xya', '54a', 'Zygarde-EX', null, '', '{"tcgdex":"xya-54a"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["pkmncollectors_xya","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/xya-54a","https://www.pkmncollectors.com/cards/zygarde-ex-yellow-a-alternate-54a-rare"]}'::jsonb),
  ('b11c527e-08b7-4347-927c-d053dc23b9e6'::uuid, '87c9b80e-6466-4792-8c33-a405e1e70a4a'::uuid, 'xya', '55a', 'M Lucario-EX', null, '', '{"tcgdex":"xya-55a"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["pkmncollectors_xya","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/xya-55a","https://www.pkmncollectors.com/cards/m-lucario-ex-yellow-a-alternate-55a-rare"]}'::jsonb),
  ('94e617a5-f3e2-40f9-801a-cf33b431ef0b'::uuid, '87c9b80e-6466-4792-8c33-a405e1e70a4a'::uuid, 'xya', '92a', 'Trainers’ Mail', null, '', '{"tcgdex":"xya-92a"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["tcgcollector_card_variants","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/xya-92a","https://www.tcgcollector.com/cards/13828/trainers-mail-yellow-a-alternate-92a-108"]}'::jsonb),
  ('0d765e43-0ee0-4152-abdf-79bbe7dad438'::uuid, '87c9b80e-6466-4792-8c33-a405e1e70a4a'::uuid, 'xya', '107a', 'Professor Sycamore', null, '', '{"tcgdex":"xya-107a"}'::jsonb, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","source":"verified_master_set_index_v1","sources":["tcgcollector_card_variants","tcgdex"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/xya-107a","https://www.tcgcollector.com/cards/13827/professor-sycamore-yellow-a-alternate-107a-122"]}'::jsonb);

create temporary table pkg09a_child_inserts (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  provenance_source text not null,
  provenance_ref text not null,
  created_by text not null
) on commit drop;

insert into pkg09a_child_inserts (card_printing_id, card_print_id, finish_key, provenance_source, provenance_ref, created_by) values
  ('1a439348-63cd-4e56-97c2-a3857c585fbd'::uuid, '029b4b7c-8d8c-4067-b30c-2852eda0f36a'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:44:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('d64bb458-7f36-41f3-aec6-c975e6c31787'::uuid, '0d765e43-0ee0-4152-abdf-79bbe7dad438'::uuid, 'normal', 'verified_master_set_index_v1', 'xya:107a:normal', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('1990b1cd-63b3-42ba-8913-1fdb247bca01'::uuid, '11d2bbcc-37dd-41e7-a08d-7f087b9158a8'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:24:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('30be20e8-4e02-46de-ba0b-feddefc3ce90'::uuid, '13b5596f-2b70-4948-90ad-134c22220630'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:19:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('985d953d-a624-4a38-a22d-ae4dea45de6c'::uuid, '1a74aac3-6e04-4ac4-9f67-f64587247e25'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:33:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('226aa282-6003-4a96-828c-5af49e4e5969'::uuid, '1e6e9be7-17d4-4b0c-ad53-af73b0719a5c'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:13:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('8c4676e9-100d-4cf1-bee5-7fcbc475eade'::uuid, '307545d2-7a82-4c60-8dfe-1b18bc2a092e'::uuid, 'cosmos', 'verified_master_set_index_v1', 'mep:69:cosmos', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('e0521254-0ac6-4731-b6ef-2ae7cfdec997'::uuid, '307545d2-7a82-4c60-8dfe-1b18bc2a092e'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:69:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('61459221-74ca-4c4c-9f37-268b824ad6c7'::uuid, '3b88fff2-c2ab-4750-b406-71cecafc0ddc'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:28:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('34045915-eefa-43ef-a621-72b965c4f53e'::uuid, '3eb0cb6b-15f1-4f62-8cd5-97fa08ec8734'::uuid, 'holo', 'verified_master_set_index_v1', 'cel25c:15:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('5d053ec8-113a-4b86-af22-23d1a0acef0c'::uuid, '42a3071c-64a2-4fe2-a6fe-9597914c0cfb'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:15:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('006a9879-7c33-4a37-9a9f-5ad2e121d465'::uuid, '43c774d3-4c4c-4461-8a7f-686f918f9b05'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:43:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('50fb9836-a3a0-4742-a29a-09671121fa56'::uuid, '45589393-ca82-4b9c-88c7-d477aaeb45b1'::uuid, 'cosmos', 'verified_master_set_index_v1', 'mep:68:cosmos', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('7cc8e470-9201-459e-8571-601f48ccce17'::uuid, '45589393-ca82-4b9c-88c7-d477aaeb45b1'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:68:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('4441bc40-8668-4dcb-ab14-4ad1b818aaa7'::uuid, '50f533d2-dab5-403a-907d-faafe7b324be'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:45:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('249f318b-94f9-478c-bc9d-caee9ab3851f'::uuid, '54ca1be2-df3a-4b81-8adc-7b5923fc3dfa'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:67:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('7c26980c-cae2-421b-946a-017bee625fe4'::uuid, '563a0b4e-5f74-4e5c-a0fc-95095a475d0d'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:70:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('22e05866-ed00-4c2d-9e00-e5e149b0e0b3'::uuid, '56460b85-7b14-4e93-8ffa-979490d814e6'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:41:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('63fbd93e-1d9c-4495-b82c-8638e397f805'::uuid, '599c154b-29dd-48fe-acef-ad462d32512f'::uuid, 'normal', 'verified_master_set_index_v1', 'xya:54a:normal', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('ed980bbd-e46d-4c75-b03c-cbd87ad8eebd'::uuid, '5a8dc5d7-d997-40c3-abbe-d0eef7274fe3'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:30:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('51ef414d-6a4a-4538-b2e2-d98506117619'::uuid, '5cd7a18c-0d2f-4e57-82e1-5d03f06942d4'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:18:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('e6a54462-6d5e-4217-9a74-fccbe1be08ce'::uuid, '5e67b43d-3a75-43ef-a771-91b7d4d55b20'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:22:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('1e4ae78b-7b51-49d0-baad-e85c40da3bab'::uuid, '7a5329c0-6741-4973-bb3a-ce9d3ed668d9'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:40:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('43473b80-43d1-4433-9cfc-895e4703ca2b'::uuid, '7b76eafc-cd2e-46c0-8cd0-972f824b7501'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:26:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('fa52b2fe-cb54-49e2-a97c-350a8954bb94'::uuid, '7bd09f9b-5484-4438-98db-0310aeaa458f'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:29:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('35aa8262-4d06-4911-b86d-0c8083d021f3'::uuid, '8543361b-731c-40fa-a943-432c3e2d2439'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:39:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('8ba7b459-268a-4a97-a1c9-125d9d68098f'::uuid, '8a06f042-7225-4d2b-b19c-a42a0846798a'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:11:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('244bfdb6-7e01-4933-b85a-aa89e7548363'::uuid, '93a96678-3d0c-4060-928d-244c3ab152f0'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:20:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('d97feec7-3d80-49d1-bbfe-6ca80fb2df99'::uuid, '94e617a5-f3e2-40f9-801a-cf33b431ef0b'::uuid, 'normal', 'verified_master_set_index_v1', 'xya:92a:normal', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('b6276cd5-a477-4e7c-869a-d8a45c109ec1'::uuid, '984c357a-056e-42c4-87ec-0595cd4c6c97'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:66:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('07752071-a0db-4766-8d35-0c4b54e3ad00'::uuid, 'a130c820-cd75-4f2e-8acf-dfc77beb63eb'::uuid, 'holo', 'verified_master_set_index_v1', 'cel25c:15:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('8728eb2c-27a2-4b4a-a631-63bf473feb30'::uuid, 'a2061f9b-477e-417c-b887-fa1588e65841'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:14:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('f5800572-5dbc-466f-8467-93b8fcc1eb4b'::uuid, 'a363a681-f7e9-4620-9396-dcf802abc2bf'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:36:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('182a4ff4-c69a-400b-83c8-a782cffb4945'::uuid, 'a3cb10d9-d6c4-4f3e-ac57-59a04f7addb9'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:32:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('ec0c1ae1-75ae-46cb-b9d2-1f421395309f'::uuid, 'a8798fd0-faa6-4eb4-8bc7-8de9d902a9b0'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:16:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('d9e75342-92ef-4868-87db-fc0a0ae002d2'::uuid, 'aaa125f5-1261-47b1-ab32-039c25a0fb58'::uuid, 'normal', 'verified_master_set_index_v1', 'xya:28a:normal', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('9acd6ae4-47c3-48a3-aa69-983cad544d82'::uuid, 'b11c527e-08b7-4347-927c-d053dc23b9e6'::uuid, 'normal', 'verified_master_set_index_v1', 'xya:55a:normal', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('cdd39b99-58f6-46ce-b8ca-d3b6605f8d0f'::uuid, 'b9b69cb0-dfe7-4928-b7c5-18358feed3a5'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:23:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('fe9852cf-3d6d-429f-b590-82e5679ad17e'::uuid, 'bfb286b4-20db-475f-9b0e-0057c926283b'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:65:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('15c26d52-1719-40be-b29f-5169263e923b'::uuid, 'c267755e-9f4a-4ed5-a6aa-190dd42ae977'::uuid, 'holo', 'verified_master_set_index_v1', 'cel25c:15:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('14436fbf-b2cf-4057-a3ec-e2ab8f0caa5f'::uuid, 'c9891896-f045-4351-9c01-661c5416f156'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:31:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('f99678a3-d141-4ad5-a443-b39b593a45c9'::uuid, 'cc798c00-1284-4f93-89e9-818b11fb5b78'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:35:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('61f04ccb-66ab-447b-adee-0fbfdc1369e6'::uuid, 'cd6c3e73-d9d3-4006-acf7-c41cc2c39a1d'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:42:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('f2a21288-d52d-4ae1-81da-291f4f75eb41'::uuid, 'd1cd3c09-a98a-41cc-a846-5ae9c995bc18'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:37:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('9a102312-771c-42cc-8770-7c03e84bca80'::uuid, 'd4142e2d-3347-4016-990c-0924a00ff1f2'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:38:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('aeda9f7c-40b5-486a-8043-491c7330aacc'::uuid, 'db786f44-3b3c-42e2-a070-600d9cfad951'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:21:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('a734f785-a82e-4bd1-a536-5e19e973fe0c'::uuid, 'de6cac7e-b117-4cf4-8265-16215cf8d7e7'::uuid, 'normal', 'verified_master_set_index_v1', 'xya:24a:normal', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('a93e64f3-8b39-447b-b233-b428abc09299'::uuid, 'e60163f4-a526-45d1-9429-d943998d0354'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:34:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('79a55f77-1746-4a55-8a75-5f87e983f333'::uuid, 'e94f133d-201c-460a-8c00-4bd42e9c625a'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:25:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('4d1b3038-360c-43f1-bd9e-44895389a3fb'::uuid, 'e97100d6-f173-409b-940a-5c00ad7e2cc4'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:27:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('d771059f-c418-4ded-86a3-8316c7ed3670'::uuid, 'e974d152-fefe-4a56-ad6a-1baced7713a9'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:64:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('47c3e31b-135c-41ea-869f-b44c9938424f'::uuid, 'fdfdd572-c844-4fe5-8da9-7200abfe6055'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:12:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1'),
  ('e0473ce0-004b-4d42-86d0-fb4ea26afeac'::uuid, 'fe0655fe-23c2-464a-a37a-c6b04b11e9e4'::uuid, 'holo', 'verified_master_set_index_v1', 'mep:17:holo', 'pkg09a_alias_subset_bulk_convergence_guarded_dry_run_v1');

create temporary table pkg09a_mapping_inserts (
  source text not null,
  external_id text not null,
  card_print_id uuid not null,
  meta jsonb not null
) on commit drop;

insert into pkg09a_mapping_inserts (source, external_id, card_print_id, meta) values
  ('tcgdex', 'mep-011', '8a06f042-7225-4d2b-b19c-a42a0846798a'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"011","card_name":"Mega Latias ex"}'::jsonb),
  ('tcgdex', 'mep-012', 'fdfdd572-c844-4fe5-8da9-7200abfe6055'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"012","card_name":"Mega Lucario ex"}'::jsonb),
  ('tcgdex', 'mep-013', '1e6e9be7-17d4-4b0c-ad53-af73b0719a5c'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"013","card_name":"Mega Venusaur ex"}'::jsonb),
  ('tcgdex', 'mep-014', 'a2061f9b-477e-417c-b887-fa1588e65841'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"014","card_name":"Ceruledge"}'::jsonb),
  ('tcgdex', 'mep-015', '42a3071c-64a2-4fe2-a6fe-9597914c0cfb'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"015","card_name":"Zacian"}'::jsonb),
  ('tcgdex', 'mep-016', 'a8798fd0-faa6-4eb4-8bc7-8de9d902a9b0'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"016","card_name":"Flygon"}'::jsonb),
  ('tcgdex', 'mep-017', 'fe0655fe-23c2-464a-a37a-c6b04b11e9e4'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"017","card_name":"Toxtricity"}'::jsonb),
  ('tcgdex', 'mep-018', '5cd7a18c-0d2f-4e57-82e1-5d03f06942d4'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"018","card_name":"Cottonee"}'::jsonb),
  ('tcgdex', 'mep-019', '13b5596f-2b70-4948-90ad-134c22220630'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"019","card_name":"Whimsicott"}'::jsonb),
  ('tcgdex', 'mep-020', '93a96678-3d0c-4060-928d-244c3ab152f0'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"020","card_name":"Sneasel"}'::jsonb),
  ('tcgdex', 'mep-021', 'db786f44-3b3c-42e2-a070-600d9cfad951'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"021","card_name":"Weavile"}'::jsonb),
  ('tcgdex', 'mep-022', '5e67b43d-3a75-43ef-a771-91b7d4d55b20'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"022","card_name":"Charcadet"}'::jsonb),
  ('tcgdex', 'mep-023', 'b9b69cb0-dfe7-4928-b7c5-18358feed3a5'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"023","card_name":"Mega Charizard X ex"}'::jsonb),
  ('tcgdex', 'mep-024', '11d2bbcc-37dd-41e7-a08d-7f087b9158a8'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"024","card_name":"Oricorio ex"}'::jsonb),
  ('tcgdex', 'mep-025', 'e94f133d-201c-460a-8c00-4bd42e9c625a'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"025","card_name":"Mega Kangaskhan ex"}'::jsonb),
  ('tcgdex', 'mep-026', '7b76eafc-cd2e-46c0-8cd0-972f824b7501'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"026","card_name":"Meloetta"}'::jsonb),
  ('tcgdex', 'mep-027', 'e97100d6-f173-409b-940a-5c00ad7e2cc4'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"027","card_name":"Haunter"}'::jsonb),
  ('tcgdex', 'mep-028', '3b88fff2-c2ab-4750-b406-71cecafc0ddc'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"028","card_name":"Celebratory Fanfare"}'::jsonb),
  ('tcgdex', 'mep-029', '7bd09f9b-5484-4438-98db-0310aeaa458f'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"029","card_name":"Mega Charizard X ex"}'::jsonb),
  ('tcgdex', 'mep-030', '5a8dc5d7-d997-40c3-abbe-d0eef7274fe3'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"030","card_name":"Mega Charizard Y ex"}'::jsonb),
  ('tcgdex', 'mep-031', 'c9891896-f045-4351-9c01-661c5416f156'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"031","card_name":"N''s Zekrom"}'::jsonb),
  ('tcgdex', 'mep-032', 'a3cb10d9-d6c4-4f3e-ac57-59a04f7addb9'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"032","card_name":"Mega Gardevoir ex"}'::jsonb),
  ('tcgdex', 'mep-033', '1a74aac3-6e04-4ac4-9f67-f64587247e25'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"033","card_name":"Mega Lucario ex"}'::jsonb),
  ('tcgdex', 'mep-034', 'e60163f4-a526-45d1-9429-d943998d0354'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"034","card_name":"Mega Meganium ex"}'::jsonb),
  ('tcgdex', 'mep-035', 'cc798c00-1284-4f93-89e9-818b11fb5b78'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"035","card_name":"Mega Emboar ex"}'::jsonb),
  ('tcgdex', 'mep-036', 'a363a681-f7e9-4620-9396-dcf802abc2bf'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"036","card_name":"Mega Feraligatr ex"}'::jsonb),
  ('tcgdex', 'mep-037', 'd1cd3c09-a98a-41cc-a846-5ae9c995bc18'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"037","card_name":"Bulbasaur"}'::jsonb),
  ('tcgdex', 'mep-038', 'd4142e2d-3347-4016-990c-0924a00ff1f2'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"038","card_name":"Charmander"}'::jsonb),
  ('tcgdex', 'mep-039', '8543361b-731c-40fa-a943-432c3e2d2439'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"039","card_name":"Squirtle"}'::jsonb),
  ('tcgdex', 'mep-040', '7a5329c0-6741-4973-bb3a-ce9d3ed668d9'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"040","card_name":"Turtwig"}'::jsonb),
  ('tcgdex', 'mep-041', '56460b85-7b14-4e93-8ffa-979490d814e6'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"041","card_name":"Chimchar"}'::jsonb),
  ('tcgdex', 'mep-042', 'cd6c3e73-d9d3-4006-acf7-c41cc2c39a1d'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"042","card_name":"Piplup"}'::jsonb),
  ('tcgdex', 'mep-043', '43c774d3-4c4c-4461-8a7f-686f918f9b05'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"043","card_name":"Rowlet"}'::jsonb),
  ('tcgdex', 'mep-044', '029b4b7c-8d8c-4067-b30c-2852eda0f36a'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"044","card_name":"Litten"}'::jsonb),
  ('tcgdex', 'mep-045', '50f533d2-dab5-403a-907d-faafe7b324be'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"045","card_name":"Popplio"}'::jsonb),
  ('tcgdex', 'mep-064', 'e974d152-fefe-4a56-ad6a-1baced7713a9'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"064","card_name":"Serperior"}'::jsonb),
  ('tcgdex', 'mep-065', 'bfb286b4-20db-475f-9b0e-0057c926283b'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"065","card_name":"Barbaracle"}'::jsonb),
  ('tcgdex', 'mep-066', '984c357a-056e-42c4-87ec-0595cd4c6c97'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"066","card_name":"Tyrantrum"}'::jsonb),
  ('tcgdex', 'mep-067', '54ca1be2-df3a-4b81-8adc-7b5923fc3dfa'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"067","card_name":"Doublade"}'::jsonb),
  ('tcgdex', 'mep-068', '45589393-ca82-4b9c-88c7-d477aaeb45b1'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"068","card_name":"Makuhita"}'::jsonb),
  ('tcgdex', 'mep-069', '307545d2-7a82-4c60-8dfe-1b18bc2a092e'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"069","card_name":"Chikorita"}'::jsonb),
  ('tcgdex', 'mep-070', '563a0b4e-5f74-4e5c-a0fc-95095a475d0d'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"mep","card_number":"070","card_name":"Tyrunt"}'::jsonb),
  ('tcgdex', 'xya-107a', '0d765e43-0ee0-4152-abdf-79bbe7dad438'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"xya","card_number":"107a","card_name":"Professor Sycamore"}'::jsonb),
  ('tcgdex', 'xya-24a', 'de6cac7e-b117-4cf4-8265-16215cf8d7e7'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"xya","card_number":"24a","card_name":"M Manectric-EX"}'::jsonb),
  ('tcgdex', 'xya-28a', 'aaa125f5-1261-47b1-ab32-039c25a0fb58'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"xya","card_number":"28a","card_name":"Jolteon-EX"}'::jsonb),
  ('tcgdex', 'xya-54a', '599c154b-29dd-48fe-acef-ad462d32512f'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"xya","card_number":"54a","card_name":"Zygarde-EX"}'::jsonb),
  ('tcgdex', 'xya-55a', 'b11c527e-08b7-4347-927c-d053dc23b9e6'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"xya","card_number":"55a","card_name":"M Lucario-EX"}'::jsonb),
  ('tcgdex', 'xya-92a', '94e617a5-f3e2-40f9-801a-cf33b431ef0b'::uuid, '{"package_id":"PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE","set_key":"xya","card_number":"92a","card_name":"Trainers’ Mail"}'::jsonb);

do $$
declare
  parent_update_count int;
  parent_insert_count int;
  child_insert_count int;
  mapping_insert_count int;
  missing_update_parents int;
  target_parent_collisions int;
  insert_parent_collisions int;
  child_collisions int;
  mapping_collisions int;
  duplicate_target_identities int;
begin
  select count(*) into parent_update_count from pkg09a_parent_updates;
  select count(*) into parent_insert_count from pkg09a_parent_inserts;
  select count(*) into child_insert_count from pkg09a_child_inserts;
  select count(*) into mapping_insert_count from pkg09a_mapping_inserts;

  if parent_update_count <> 105 then raise exception 'PKG-09A parent update count drift: %', parent_update_count; end if;
  if parent_insert_count <> 48 then raise exception 'PKG-09A parent insert count drift: %', parent_insert_count; end if;
  if child_insert_count <> 53 then raise exception 'PKG-09A child insert count drift: %', child_insert_count; end if;
  if mapping_insert_count <> 48 then raise exception 'PKG-09A mapping insert count drift: %', mapping_insert_count; end if;

  select count(*) into missing_update_parents
  from pkg09a_parent_updates target
  left join public.card_prints cp on cp.id = target.card_print_id
  where cp.id is null;
  if missing_update_parents <> 0 then raise exception 'PKG-09A missing update parents: %', missing_update_parents; end if;

  select count(*) into target_parent_collisions
  from pkg09a_parent_updates target
  join public.card_prints cp
    on cp.id <> target.card_print_id
   and lower(coalesce(cp.set_code, '')) = lower(target.target_set_code)
   and (lower(coalesce(cp.number, '')) = lower(target.target_number) or lower(coalesce(cp.number_plain, '')) = lower(target.target_number))
   and lower(coalesce(cp.name, '')) = lower(target.target_name);
  if target_parent_collisions <> 0 then raise exception 'PKG-09A target parent collisions: %', target_parent_collisions; end if;

  select count(*) into insert_parent_collisions
  from pkg09a_parent_inserts target
  join public.card_prints cp
    on lower(coalesce(cp.set_code, '')) = lower(target.set_code)
   and (lower(coalesce(cp.number, '')) = lower(target.number) or lower(coalesce(cp.number_plain, '')) = lower(target.number))
   and lower(coalesce(cp.name, '')) = lower(target.name);
  if insert_parent_collisions <> 0 then raise exception 'PKG-09A insert parent collisions: %', insert_parent_collisions; end if;

  select count(*) into child_collisions
  from pkg09a_child_inserts target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  if child_collisions <> 0 then raise exception 'PKG-09A child collisions: %', child_collisions; end if;

  select count(*) into mapping_collisions
  from pkg09a_mapping_inserts target
  join public.external_mappings em
    on em.source = target.source
   and em.external_id = target.external_id;
  if mapping_collisions <> 0 then raise exception 'PKG-09A external mapping collisions: %', mapping_collisions; end if;

  select count(*) into duplicate_target_identities
  from (
    select target_set_code as set_code, target_number as number, target_name as name from pkg09a_parent_updates
    union all
    select set_code, number, name from pkg09a_parent_inserts
  ) target
  group by set_code, number, name
  having count(*) > 1;
  if duplicate_target_identities <> 0 then raise exception 'PKG-09A duplicate target identities: %', duplicate_target_identities; end if;
end $$;

update public.card_prints cp
set
  set_id = target.target_set_id,
  set_code = target.target_set_code,
  number = target.target_number,
  name = target.target_name
from pkg09a_parent_updates target
where cp.id = target.card_print_id;

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
  number,
  name,
  rarity,
  variant_key,
  external_ids,
  ai_metadata
from pkg09a_parent_inserts;

insert into public.external_mappings (source, external_id, card_print_id, meta)
select source, external_id, card_print_id, meta
from pkg09a_mapping_inserts;

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
from pkg09a_child_inserts;

select
  'PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE'::text as package_id,
  'd66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a'::text as package_fingerprint,
  (select count(*)::int from pkg09a_parent_updates) as parent_updates,
  (select count(*)::int from pkg09a_parent_inserts) as parent_inserts,
  (select count(*)::int from pkg09a_child_inserts) as child_inserts,
  (select count(*)::int from pkg09a_mapping_inserts) as mapping_inserts,
  (select count(*)::int from public.card_prints cp join pkg09a_parent_updates target on target.card_print_id = cp.id where cp.set_code = target.target_set_code) as verified_parent_updates;

rollback;

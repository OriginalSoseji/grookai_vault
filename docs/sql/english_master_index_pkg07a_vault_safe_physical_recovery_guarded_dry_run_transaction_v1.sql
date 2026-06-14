-- English Master Index PKG-07A-VAULT-SAFE-PHYSICAL-RECOVERY guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Package fingerprint: d6c304be4f6c3a13b316fbeb8297a8f27d7165f28bd7c2dcbfe4412bfc7f726b

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table pkg07a_physical_recovery_targets (
  card_print_id uuid primary key,
  target_set_code text not null,
  target_number text not null,
  target_name text not null
) on commit drop;

insert into pkg07a_physical_recovery_targets (
  card_print_id,
  target_set_code,
  target_number,
  target_name
) values
  ('d34033e2-a8e8-4e72-b1e9-2033445e8f00'::uuid, '2021swsh', '1', 'Bulbasaur'),
  ('987099f7-59e9-4c0a-9bbb-a0b8fa24a086'::uuid, '2021swsh', '2', 'Chikorita'),
  ('ac2987ab-7972-4e0a-bd34-eecdc494b8b9'::uuid, '2021swsh', '3', 'Treecko'),
  ('53ab14f5-7e43-4098-8eb6-77beb4450c99'::uuid, '2021swsh', '4', 'Turtwig'),
  ('99449877-8fd5-4651-bd39-2321b2bffff5'::uuid, '2021swsh', '5', 'Snivy'),
  ('e95d8646-b98f-4c8c-a01d-2e499c02aa82'::uuid, '2021swsh', '6', 'Chespin'),
  ('cb3e5ff6-ace4-44ca-99e0-91098dff5bba'::uuid, '2021swsh', '7', 'Rowlet'),
  ('6613c2ff-8bad-465b-b186-78c6ac7b9c26'::uuid, '2021swsh', '8', 'Grookey'),
  ('9421cd5e-2640-44c5-8044-47aaa7a7954a'::uuid, '2021swsh', '9', 'Charmander'),
  ('ac9e8297-6e39-419f-8fa0-f58e90c80c01'::uuid, '2021swsh', '10', 'Cyndaquil'),
  ('c13e4ceb-5988-4215-8462-fc378bbe5e46'::uuid, '2021swsh', '11', 'Torchic'),
  ('cefedf7b-f1c0-42f7-af7d-e6e9279358f3'::uuid, '2021swsh', '12', 'Chimchar'),
  ('43d5432d-7152-40de-9660-dd2893847b8a'::uuid, '2021swsh', '13', 'Tepig'),
  ('0980ca25-d2fb-43a3-a74f-789e6a0f8f51'::uuid, '2021swsh', '14', 'Fennekin'),
  ('229d3337-9150-428f-9259-36ee0a0636e2'::uuid, '2021swsh', '15', 'Litten'),
  ('d74fe432-2990-49c2-b908-9c0fcec9eefa'::uuid, '2021swsh', '16', 'Scorbunny'),
  ('0bc143c0-b558-447e-864c-c71c02e3c2b2'::uuid, '2021swsh', '17', 'Squirtle'),
  ('12a7e22b-6d1a-4833-a2fd-c2f020ef0007'::uuid, '2021swsh', '18', 'Totodile'),
  ('29d1fb6e-f0be-4ce1-a0b2-458845d33cad'::uuid, '2021swsh', '19', 'Mudkip'),
  ('f36b29e8-8e24-4e0b-810a-5945738a1df7'::uuid, '2021swsh', '20', 'Piplup'),
  ('c9dbc8fc-b83a-4edb-acbe-d50c05e8a4f1'::uuid, '2021swsh', '21', 'Oshawott'),
  ('3f8c67ec-ac7c-4c02-b46d-a7ff9e9af0b2'::uuid, '2021swsh', '22', 'Froakie'),
  ('dd92a89a-084a-424a-b073-d1564e113919'::uuid, '2021swsh', '23', 'Popplio'),
  ('63ce9abe-eb16-4e0b-8a24-caa5cf820a82'::uuid, '2021swsh', '24', 'Sobble'),
  ('be9b1912-c62b-46d9-9081-acaefe8cf0c2'::uuid, '2021swsh', '25', 'Pikachu'),
  ('2180d1db-0948-4cfc-9a98-da7629c2811a'::uuid, 'col1', '6', 'Groudon'),
  ('922f2b4f-eb6f-492c-89a7-8b4f313509e2'::uuid, 'col1', '8', 'Hitmontop'),
  ('62f77935-5749-4d26-87e6-06bbca565b22'::uuid, 'dp7', '2', 'Empoleon'),
  ('665ee2b0-4a22-43d5-bf8e-8ff22a990384'::uuid, 'dp7', '3', 'Infernape'),
  ('d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff'::uuid, 'dp7', '96', 'Dusknoir'),
  ('7c211bf2-ab9e-489d-842f-65c896270783'::uuid, 'dp7', '97', 'Heatran'),
  ('6f49c231-0a53-4c0c-9db1-6d4c36aa460e'::uuid, 'dp7', '98', 'Machamp'),
  ('7a0dbe87-8ffb-4939-a5c0-371a0a21b302'::uuid, 'dp7', '99', 'Raichu'),
  ('687811f7-e3d2-41bb-b37d-1e73882551d2'::uuid, 'dp7', '100', 'Regigigas'),
  ('e8444009-0c47-48a6-af07-f5b450ac0082'::uuid, 'dp7', 'SH1', 'Drifloon'),
  ('5155d8da-c49b-43cf-8173-1e4ceca853d2'::uuid, 'ecard2', '11', 'Espeon'),
  ('49008b62-21be-48b8-a561-9dc0bea390e1'::uuid, 'ecard2', '12', 'Exeggutor'),
  ('0f752ca1-5458-4241-af37-4a7b48b85013'::uuid, 'ecard2', '13', 'Exeggutor'),
  ('bf8fa8c4-a04d-44f8-ae9e-50a6a6784d88'::uuid, 'ecard2', '15', 'Houndoom'),
  ('d5e3ba78-7a85-49d2-8ab0-295521652f55'::uuid, 'ecard2', '16', 'Hypno'),
  ('11591d3d-6574-487e-9958-f0d94bba5af4'::uuid, 'ecard2', '17', 'Jumpluff'),
  ('72b1ec6b-fe84-4190-a0d3-d95155296261'::uuid, 'ecard2', '18', 'Jynx'),
  ('b22dc290-dade-45f8-b488-5d3c921a79a1'::uuid, 'ecard2', '19', 'Kingdra'),
  ('0e7d501c-b666-43df-9ee6-82443fcae8cb'::uuid, 'ecard2', '20', 'Lanturn'),
  ('a077e73a-275a-405e-85ac-24b28b6ffe3a'::uuid, 'ecard2', '25', 'Ninetales'),
  ('898ad06e-aab1-4c1a-b91b-44fdd6069031'::uuid, 'ecard2', '28', 'Porygon2'),
  ('507f014e-d43d-4b24-b01f-c9635b6aba81'::uuid, 'ecard2', '30', 'Quagsire'),
  ('2233732b-ced1-4f51-b45b-603c1c15a65c'::uuid, 'ecard2', '32', 'Scizor'),
  ('d0270c83-13c1-4d2b-ae50-19830be9d134'::uuid, 'ecard3', '4', 'Articuno'),
  ('36a0af86-f863-4ff0-967c-285a67272dcb'::uuid, 'ecard3', '6', 'Crobat'),
  ('6406220f-4684-4f26-a52d-310db5eb5700'::uuid, 'ecard3', '8', 'Flareon'),
  ('982bd726-548f-4e0c-9a93-c1301af1342f'::uuid, 'ecard3', '9', 'Forretress'),
  ('d139fca7-558c-4dad-9a46-f94e4d45ab6b'::uuid, 'ecard3', 'H13', 'Kabutops'),
  ('8c78b35f-6dd0-4b12-9709-8b4198ad3089'::uuid, 'ecard3', 'H14', 'Ledian'),
  ('02a4156d-5f67-4969-8288-c440938a923c'::uuid, 'ecard3', 'H16', 'Magcargo'),
  ('bb73d56c-c46f-4341-b4a1-825a10c2406b'::uuid, 'ecard3', 'H17', 'Magcargo'),
  ('28d7a9bb-fcff-4e93-861d-d200770984d6'::uuid, 'ecard3', 'H18', 'Magneton'),
  ('415065f4-68dd-44a9-a0f0-d6375e203275'::uuid, 'ecard3', 'H22', 'Piloswine'),
  ('b7c244c2-35bf-4dbd-836c-1341a777d65e'::uuid, 'ecard3', 'H23', 'Politoed'),
  ('e99d7d18-af64-4d34-b62c-8a795f6da2c3'::uuid, 'ecard3', 'H24', 'Poliwrath'),
  ('9a1cc452-e8b4-48bf-acc9-e592fe9cc521'::uuid, 'ecard3', 'H27', 'Rhydon'),
  ('abcf71f3-edd8-4130-aaa3-b7fecada39e2'::uuid, 'ecard3', 'H30', 'Umbreon'),
  ('7cbee94f-9f6a-441d-98e1-6a50da7f72d7'::uuid, 'ecard3', 'H31', 'Vaporeon'),
  ('cfbaec4b-bc98-4f6f-8b06-a30dbe29af30'::uuid, 'pl1', '6', 'Dialga'),
  ('9d20653b-49ea-4a30-8e18-629267d7397b'::uuid, 'pl1', '122', 'Dialga G'),
  ('1cc5b95e-c5b7-477c-a3c1-1d4c26e10875'::uuid, 'pl1', '123', 'Drapion'),
  ('9deb3714-1f02-4eb2-a249-6b3b42a106cb'::uuid, 'pl1', '124', 'Giratina'),
  ('182aab06-7802-4dea-90cb-32dfc7cefaab'::uuid, 'pl1', '125', 'Palkia G'),
  ('24bd8689-4031-40d0-8948-1d08e652ef34'::uuid, 'pl1', '126', 'Shaymin'),
  ('1f03518a-bed9-4c04-ad0c-3a5cf3008248'::uuid, 'pl1', '127', 'Shaymin'),
  ('74b9d351-aecc-4ff9-8ed2-958311074af7'::uuid, 'pl1', 'SH4', 'Lotad'),
  ('e48e17b9-b693-4882-9e9f-d177dbce37c8'::uuid, 'pl1', 'SH5', 'Swablu'),
  ('2ebe059c-614e-4dd6-812f-ebf268459ce5'::uuid, 'pl2', '1', 'Arcanine'),
  ('9d6eb3c7-dc61-4543-b436-a67fd23ba16c'::uuid, 'pl2', '3', 'Darkrai G'),
  ('1970689f-8f93-4148-96b2-0ed8ed149568'::uuid, 'pl2', '5', 'Flygon'),
  ('f619ad6c-007c-4e4d-bea0-a4a517cffa50'::uuid, 'pl2', '95', 'Team Galactic''s Invention G-107 Technical Machine'),
  ('a1b66404-67e9-4586-8ac9-873c421da31e'::uuid, 'pl2', '103', 'Alakazam 4'),
  ('5fd2b141-a2af-4c2c-bb33-df2c2af58c02'::uuid, 'pl2', '104', 'Floatzel GL'),
  ('7d47083d-43a4-4868-9bac-eb1deb237136'::uuid, 'pl2', '105', 'Flygon'),
  ('60789fd6-a0bb-49cd-848f-1ba462f4e965'::uuid, 'pl2', '106', 'Gallade 4'),
  ('2ef89f59-3bd7-430f-9e71-42fea8cdd8ae'::uuid, 'pl2', '107', 'Hippowdon'),
  ('a719dd63-f527-4edf-8c8e-e77bac65a715'::uuid, 'pl2', '108', 'Infernape 4'),
  ('26d6335d-9483-4de2-8b1b-771c43ab31cb'::uuid, 'pl2', '110', 'Mismagius GL'),
  ('25c91739-b09a-4360-94e5-9a8b1ed43755'::uuid, 'pl2', '111', 'Snorlax'),
  ('f5ada689-45c1-4b23-ac62-6a9f0bc11c97'::uuid, 'pl2', 'RT2', 'Frost Rotom'),
  ('949f5c1d-6d29-41cd-91c9-0be81e5360c5'::uuid, 'pl2', 'RT4', 'Mow Rotom'),
  ('0a14f347-5dd0-425a-9c9c-ffd134a9de4f'::uuid, 'pl2', 'RT6', 'Charon''s Choice'),
  ('8cd92a82-149d-43b4-a7d3-d65782536182'::uuid, 'pl3', '141', 'Absol G'),
  ('79097350-eb58-44e8-bd39-3ec5f417f02b'::uuid, 'pl3', '142', 'Blaziken FB'),
  ('880dc8c7-6959-4fda-b79a-32e48c684267'::uuid, 'pl3', '143', 'Charizard G'),
  ('29a4bca4-6264-45f6-bc24-1d5ded5520cd'::uuid, 'pl3', '144', 'Electivire FB'),
  ('2c1b3125-dd67-4522-b3e0-5621c05f7a9a'::uuid, 'pl3', '145', 'Garchomp C'),
  ('89f61622-12a4-4861-abb3-ef3dbcaf2a86'::uuid, 'pl3', '146', 'Rayquaza C'),
  ('fa6310ae-be43-4309-af1d-a5033daff2f0'::uuid, 'pl3', '147', 'Staraptor FB'),
  ('9089264b-fd13-4261-94ac-b252ab89f6c7'::uuid, 'pl3', 'SH8', 'Relicanth'),
  ('e8a8c0b0-2213-4701-89a9-8926cc0d5669'::uuid, 'pl3', 'SH9', 'Yanma'),
  ('a02f871c-fe3e-432b-944d-6decea0eecdf'::uuid, 'pl4', '1', 'Charizard'),
  ('71779a8b-ee22-4892-9425-8e3da51f179a'::uuid, 'pl4', '6', 'Mothim'),
  ('3059259e-c28b-49d6-9f31-64e178e87f28'::uuid, 'pl4', '9', 'Swalot'),
  ('8716f287-3497-49b2-a499-9c1e026a6a94'::uuid, 'pl4', '12', 'Zapdos'),
  ('cf859f9b-f1d6-41ec-9e38-c7fd27743777'::uuid, 'pl4', 'AR2', 'Arceus'),
  ('8b2c91cf-bd7c-4564-84ca-5863e1414257'::uuid, 'pl4', 'AR3', 'Arceus'),
  ('61cd00a6-3418-4980-ade8-b26c8d0b4d5c'::uuid, 'pl4', 'AR4', 'Arceus'),
  ('63a0a7b8-bdfa-4a08-ad30-680bcc45802e'::uuid, 'pl4', 'AR5', 'Arceus'),
  ('67e47461-e03c-4da3-8557-d3df639dbb98'::uuid, 'pl4', 'AR7', 'Arceus'),
  ('0db1b355-bb14-4042-8597-4afd1d9a2b77'::uuid, 'pl4', 'AR8', 'Arceus'),
  ('502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda'::uuid, 'pl4', 'SH10', 'Bagon'),
  ('22a0396f-a0fe-4680-8568-71246489db3c'::uuid, 'pl4', 'SH11', 'Ponyta'),
  ('c11bc9b0-0fe8-488c-bdef-cf1b64f894ec'::uuid, 'sv08.5', '005', 'Leafeon'),
  ('0c9700c4-ca45-4e83-a865-e1a3dee48e80'::uuid, 'sv08.5', '008', 'Whimsicott'),
  ('edc42048-89fc-4cff-8422-ebc9f233f386'::uuid, 'sv08.5', '013', 'Flareon'),
  ('9ed9e9aa-4019-42c5-8051-072fb56a7569'::uuid, 'sv08.5', '022', 'Vaporeon'),
  ('fb911570-4f51-4c86-b030-832974bffcc4'::uuid, 'sv08.5', '025', 'Glaceon'),
  ('e22b6a0d-c544-463f-9654-ba9e7d6978fd'::uuid, 'sv08.5', '029', 'Jolteon'),
  ('6dfd7ee4-f9de-4d77-9373-0006bf86e1b1'::uuid, 'sv08.5', '033', 'Espeon'),
  ('32f0c83a-ba31-419f-81c8-aae5f35033d7'::uuid, 'sv08.5', '037', 'Dusknoir'),
  ('ad2966e5-48b0-4f8e-b7ec-56cfb220de64'::uuid, 'sv08.5', '043', 'Flutter Mane'),
  ('649e4751-83b0-49ea-83cf-75ef59f989ed'::uuid, 'sv08.5', '044', 'Munkidori'),
  ('96e8765b-984b-40ef-b000-75e72b8f47a4'::uuid, 'sv08.5', '045', 'Fezandipiti'),
  ('d9d6fe68-06ab-494b-9519-fc7d76393d09'::uuid, 'sv08.5', '046', 'Iron Boulder'),
  ('1d4be26f-d405-491c-9ce8-fee06b35e702'::uuid, 'sv08.5', '049', 'Groudon'),
  ('6f45550b-ef5c-4767-ad57-77212d4d65c2'::uuid, 'sv08.5', '054', 'Bloodmoon Ursaluna'),
  ('25f1cc8a-87f0-42d9-b440-d30ad27168d6'::uuid, 'sv08.5', '057', 'Okidogi'),
  ('ffb95ade-a643-4ec6-bcb7-6ff41e5e7eae'::uuid, 'sv08.5', '059', 'Umbreon'),
  ('0c1d028f-fc8c-4295-8c3a-2f845eb5baf8'::uuid, 'sv08.5', '065', 'Roaring Moon'),
  ('8968eec8-46f8-4185-a679-ee1d5805cc78'::uuid, 'sv08.5', '070', 'Archaludon'),
  ('bafa6068-a489-4705-811b-8f864f4679d3'::uuid, 'sv08.5', '078', 'Noctowl'),
  ('9030feb1-f99d-4e1e-8c6e-2c9f19b8b616'::uuid, 'sv08.5', '080', 'Dudunsparce'),
  ('0832c419-3fe4-439a-8490-41011fcd843b'::uuid, 'swsh10.5', '005', 'Alolan Exeggutor V'),
  ('067bbc12-ce47-4e7a-bfbb-a9d1ac21f0d4'::uuid, 'swsh10.5', '027', 'Pikachu'),
  ('026c495e-d29a-4232-a319-88637d470cbd'::uuid, 'swsh10.5', '030', 'Mewtwo V'),
  ('3d22fb24-8491-45f1-9b36-b8e609298dcd'::uuid, 'swsh10.5', '031', 'Mewtwo VSTAR'),
  ('5819fec4-dd4b-4dd5-85c8-7d781aa35367'::uuid, 'swsh10.5', '040', 'Conkeldurr V'),
  ('c86e3319-f1df-49c9-b46d-ba0b1c641f92'::uuid, 'swsh10.5', '047', 'Melmetal V'),
  ('032a7df8-4473-4f85-a2d0-cb7dac2fadb5'::uuid, 'swsh10.5', '048', 'Melmetal VMAX'),
  ('3705b603-9adc-4750-aff4-bd7183db87dc'::uuid, 'swsh10.5', '049', 'Dragonite V'),
  ('1c039535-5beb-4374-bcce-ce66645e4ad8'::uuid, 'swsh10.5', '050', 'Dragonite VSTAR'),
  ('d7b23d71-91c0-442d-9d6d-8ecc97f5c7a6'::uuid, 'swsh10.5', '058', 'Slaking V'),
  ('6206fc08-7415-414f-9c22-c2cf57493c1e'::uuid, 'swsh10.5', '064', 'Blanche'),
  ('fc394554-fa86-4510-8a81-79f48df255c6'::uuid, 'swsh10.5', '065', 'Candela'),
  ('d2f87992-4951-464e-9976-4e2caef7e497'::uuid, 'swsh10.5', '066', 'Egg Incubator'),
  ('b45c87d9-4eef-493b-8bc7-3dd19021a7c2'::uuid, 'swsh10.5', '067', 'Lure Module'),
  ('e44d13e5-a6ac-4016-8b81-b6305ea3414b'::uuid, 'swsh10.5', '070', 'Spark'),
  ('4b809146-f6ac-4b99-81e1-f593b115a1aa'::uuid, 'swsh10.5', '071', 'Alolan Exeggutor V'),
  ('3236c55c-fa46-407f-b45d-9ea9186c23bb'::uuid, 'swsh10.5', '072', 'Mewtwo V'),
  ('90a71cb9-4a41-4b42-9aaf-74c521167c2d'::uuid, 'swsh10.5', '073', 'Conkeldurr V'),
  ('1d784874-229a-4fc9-a347-e2ebd2eb1a6b'::uuid, 'swsh10.5', '074', 'Conkeldurr V'),
  ('c3d42060-46a2-48c1-826f-4979be9cf986'::uuid, 'swsh10.5', '075', 'Melmetal V'),
  ('e747c915-43a1-4bc7-8155-34d2734a2d14'::uuid, 'swsh10.5', '076', 'Dragonite V'),
  ('e655ae68-7398-4432-9fcd-3e4e3a1ff045'::uuid, 'swsh10.5', '077', 'Slaking V'),
  ('0ae65a15-2418-42ab-bf67-0142075286a6'::uuid, 'swsh10.5', '078', 'Professor''s Research'),
  ('5e7675a0-aebc-40de-84c7-998a4d5c0975'::uuid, 'swsh10.5', '079', 'Mewtwo VSTAR'),
  ('480390a4-b8d0-4ab9-90d2-e6f61c7defa9'::uuid, 'swsh10.5', '080', 'Melmetal VMAX'),
  ('f21c012b-48cf-48df-b62e-442a783f0e0d'::uuid, 'swsh10.5', '081', 'Dragonite VSTAR'),
  ('259d6022-618e-4590-845b-989a6ed94bdc'::uuid, 'swsh10.5', '082', 'Blanche'),
  ('25b25cc7-9288-4b69-b5bf-9a65410ec6b2'::uuid, 'swsh10.5', '083', 'Candela'),
  ('ece1af3f-11d0-4e6b-9b93-723a4def816c'::uuid, 'swsh10.5', '084', 'Professor''s Research'),
  ('da92a0e3-8059-48aa-8acf-39bda62dfbc3'::uuid, 'swsh10.5', '085', 'Spark'),
  ('ab583991-a87c-423a-863d-2f8e0cbf62c3'::uuid, 'swsh10.5', '086', 'Mewtwo VSTAR'),
  ('d99d7741-06ab-477b-b564-4529710a9ec3'::uuid, 'swsh10.5', '087', 'Egg Incubator'),
  ('122879ec-4d0f-4470-97af-cb82f2408119'::uuid, 'swsh10.5', '088', 'Lure Module'),
  ('9cf48b11-bf42-4aa3-861b-c2ca5543877e'::uuid, 'swsh2', '154', 'Boss''s Orders (Giovanni)'),
  ('5ee8ddf9-81b3-43e0-94b5-951ac0386eb8'::uuid, 'swsh4.5', '58', 'Boss''s Orders (Lysandre)'),
  ('17cd3179-b844-47a8-a197-ae123ca4b583'::uuid, 'swsh4.5', '60', 'Professor''s Research (Professor Juniper)');

do $$
declare
  parent_count int;
  child_count int;
  vault_count int;
  missing_parent_count int;
  duplicate_identity_count int;
begin
  select count(*) into parent_count from pkg07a_physical_recovery_targets;
  select count(*) into child_count
  from public.card_printings cpr
  join pkg07a_physical_recovery_targets target on target.card_print_id = cpr.card_print_id;
  select count(*) into vault_count
  from public.vault_items vi
  join pkg07a_physical_recovery_targets target on target.card_print_id = vi.card_id;
  select count(*) into missing_parent_count
  from pkg07a_physical_recovery_targets target
  left join public.card_prints cp on cp.id = target.card_print_id
  where cp.id is null;
  select count(*) into duplicate_identity_count
  from (
    select target_set_code, target_number, target_name, count(*) as row_count
    from pkg07a_physical_recovery_targets
    group by target_set_code, target_number, target_name
    having count(*) > 1
  ) duplicate_targets;

  if parent_count <> 164 then raise exception 'PKG-07A parent count drift: %', parent_count; end if;
  if child_count <> 253 then raise exception 'PKG-07A child count drift: %', child_count; end if;
  if vault_count <> 0 then raise exception 'PKG-07A vault reference count drift: %', vault_count; end if;
  if missing_parent_count <> 0 then raise exception 'PKG-07A missing parent count: %', missing_parent_count; end if;
  if duplicate_identity_count <> 0 then raise exception 'PKG-07A duplicate target identity count: %', duplicate_identity_count; end if;
end $$;

update public.card_prints cp
set
  set_code = target.target_set_code,
  number = target.target_number,
  name = target.target_name
from pkg07a_physical_recovery_targets target
where cp.id = target.card_print_id;

do $$
declare
  unresolved_count int;
  child_count int;
  vault_count int;
begin
  select count(*) into unresolved_count
  from public.card_prints cp
  join pkg07a_physical_recovery_targets target on target.card_print_id = cp.id
  where cp.set_code is distinct from target.target_set_code
     or cp.number is distinct from target.target_number
     or cp.name is distinct from target.target_name;
  select count(*) into child_count
  from public.card_printings cpr
  join pkg07a_physical_recovery_targets target on target.card_print_id = cpr.card_print_id;
  select count(*) into vault_count
  from public.vault_items vi
  join pkg07a_physical_recovery_targets target on target.card_print_id = vi.card_id;

  if unresolved_count <> 0 then raise exception 'PKG-07A unresolved update count: %', unresolved_count; end if;
  if child_count <> 253 then raise exception 'PKG-07A child count changed after update: %', child_count; end if;
  if vault_count <> 0 then raise exception 'PKG-07A vault references appeared after update: %', vault_count; end if;
end $$;

select
  'PKG-07A-VAULT-SAFE-PHYSICAL-RECOVERY'::text as package_id,
  'd6c304be4f6c3a13b316fbeb8297a8f27d7165f28bd7c2dcbfe4412bfc7f726b'::text as package_fingerprint,
  (select count(*) from pkg07a_physical_recovery_targets)::int as planned_parent_rows,
  (select count(*) from public.card_printings cpr join pkg07a_physical_recovery_targets target on target.card_print_id = cpr.card_print_id)::int as preserved_child_printings;

rollback;

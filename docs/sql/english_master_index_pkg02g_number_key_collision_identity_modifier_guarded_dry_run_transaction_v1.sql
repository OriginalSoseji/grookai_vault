-- PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER guarded dry-run transaction
-- Fingerprint: 6b99a72e94808480edb20c649c62d31364d40ca794bf9c175c630f4b48d678d4
-- Scope: 58 number-key collision rows, 97 parent updates, no deletes, rollback-only.
-- No real apply. No migrations.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg02g_parent_update_targets (
  card_print_id uuid primary key,
  update_class text not null,
  collision_kind text not null,
  expected_set_code text,
  expected_number text,
  expected_name text,
  expected_printed_identity_modifier text,
  target_set_code text,
  target_number text,
  target_name text,
  target_printed_identity_modifier text
) on commit drop;

insert into pkg02g_parent_update_targets (
  card_print_id,
  update_class,
  collision_kind,
  expected_set_code,
  expected_number,
  expected_name,
  expected_printed_identity_modifier,
  target_set_code,
  target_number,
  target_name,
  target_printed_identity_modifier
)
values
  ('2180d1db-0948-4cfc-9a98-da7629c2811a'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Groudon', null, 'col1', '6', 'Groudon', null),
  ('922f2b4f-eb6f-492c-89a7-8b4f313509e2'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Hitmontop', null, 'col1', '8', 'Hitmontop', null),
  ('62f77935-5749-4d26-87e6-06bbca565b22'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Empoleon', null, 'dp7', '2', 'Empoleon', null),
  ('665ee2b0-4a22-43d5-bf8e-8ff22a990384'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Infernape', null, 'dp7', '3', 'Infernape', null),
  ('d45018d3-c2a6-4d82-b3ed-d0ac6ce6e0ff'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Dusknoir', null, 'dp7', '96', 'Dusknoir', null),
  ('7c211bf2-ab9e-489d-842f-65c896270783'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Heatran', null, 'dp7', '97', 'Heatran', null),
  ('6f49c231-0a53-4c0c-9db1-6d4c36aa460e'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Machamp', null, 'dp7', '98', 'Machamp', null),
  ('7a0dbe87-8ffb-4939-a5c0-371a0a21b302'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Raichu', null, 'dp7', '99', 'Raichu', null),
  ('687811f7-e3d2-41bb-b37d-1e73882551d2'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Regigigas', null, 'dp7', '100', 'Regigigas', null),
  ('e8444009-0c47-48a6-af07-f5b450ac0082'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Drifloon', null, 'dp7', 'SH1', 'Drifloon', 'number_prefix:SH'),
  ('cfbaec4b-bc98-4f6f-8b06-a30dbe29af30'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Dialga', null, 'pl1', '6', 'Dialga', null),
  ('9d20653b-49ea-4a30-8e18-629267d7397b'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Dialga G', null, 'pl1', '122', 'Dialga G', null),
  ('1cc5b95e-c5b7-477c-a3c1-1d4c26e10875'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Drapion', null, 'pl1', '123', 'Drapion', null),
  ('9deb3714-1f02-4eb2-a249-6b3b42a106cb'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Giratina', null, 'pl1', '124', 'Giratina', null),
  ('182aab06-7802-4dea-90cb-32dfc7cefaab'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Palkia G', null, 'pl1', '125', 'Palkia G', null),
  ('24bd8689-4031-40d0-8948-1d08e652ef34'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Shaymin', null, 'pl1', '126', 'Shaymin', null),
  ('1f03518a-bed9-4c04-ad0c-3a5cf3008248'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Shaymin', null, 'pl1', '127', 'Shaymin', null),
  ('74b9d351-aecc-4ff9-8ed2-958311074af7'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Lotad', null, 'pl1', 'SH4', 'Lotad', 'number_prefix:SH'),
  ('e48e17b9-b693-4882-9e9f-d177dbce37c8'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Swablu', null, 'pl1', 'SH5', 'Swablu', 'number_prefix:SH'),
  ('2ebe059c-614e-4dd6-812f-ebf268459ce5'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Arcanine', null, 'pl2', '1', 'Arcanine', null),
  ('9d6eb3c7-dc61-4543-b436-a67fd23ba16c'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Darkrai G', null, 'pl2', '3', 'Darkrai G', null),
  ('1970689f-8f93-4148-96b2-0ed8ed149568'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Flygon', null, 'pl2', '5', 'Flygon', null),
  ('f619ad6c-007c-4e4d-bea0-a4a517cffa50'::uuid, 'blocked_target_parent_recovery', 'technical_machine_name_collision', null, null, 'Team Galactic''s Invention G-107 Technical Machine', null, 'pl2', '95', 'Team Galactic''s Invention G-107 Technical Machine', null),
  ('a1b66404-67e9-4586-8ac9-873c421da31e'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Alakazam 4', null, 'pl2', '103', 'Alakazam 4', null),
  ('5fd2b141-a2af-4c2c-bb33-df2c2af58c02'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Floatzel GL', null, 'pl2', '104', 'Floatzel GL', null),
  ('7d47083d-43a4-4868-9bac-eb1deb237136'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Flygon', null, 'pl2', '105', 'Flygon', null),
  ('60789fd6-a0bb-49cd-848f-1ba462f4e965'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Gallade 4', null, 'pl2', '106', 'Gallade 4', null),
  ('2ef89f59-3bd7-430f-9e71-42fea8cdd8ae'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Hippowdon', null, 'pl2', '107', 'Hippowdon', null),
  ('a719dd63-f527-4edf-8c8e-e77bac65a715'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Infernape 4', null, 'pl2', '108', 'Infernape 4', null),
  ('26d6335d-9483-4de2-8b1b-771c43ab31cb'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Mismagius GL', null, 'pl2', '110', 'Mismagius GL', null),
  ('25c91739-b09a-4360-94e5-9a8b1ed43755'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Snorlax', null, 'pl2', '111', 'Snorlax', null),
  ('f5ada689-45c1-4b23-ac62-6a9f0bc11c97'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Frost Rotom', null, 'pl2', 'RT2', 'Frost Rotom', 'number_prefix:RT'),
  ('949f5c1d-6d29-41cd-91c9-0be81e5360c5'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Mow Rotom', null, 'pl2', 'RT4', 'Mow Rotom', 'number_prefix:RT'),
  ('0a14f347-5dd0-425a-9c9c-ffd134a9de4f'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Charon''s Choice', null, 'pl2', 'RT6', 'Charon''s Choice', 'number_prefix:RT'),
  ('8cd92a82-149d-43b4-a7d3-d65782536182'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Absol G', null, 'pl3', '141', 'Absol G', null),
  ('79097350-eb58-44e8-bd39-3ec5f417f02b'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Blaziken FB', null, 'pl3', '142', 'Blaziken FB', null),
  ('880dc8c7-6959-4fda-b79a-32e48c684267'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Charizard G', null, 'pl3', '143', 'Charizard G', null),
  ('29a4bca4-6264-45f6-bc24-1d5ded5520cd'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Electivire FB', null, 'pl3', '144', 'Electivire FB', null),
  ('2c1b3125-dd67-4522-b3e0-5621c05f7a9a'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Garchomp C', null, 'pl3', '145', 'Garchomp C', null),
  ('89f61622-12a4-4861-abb3-ef3dbcaf2a86'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Rayquaza C', null, 'pl3', '146', 'Rayquaza C', null),
  ('fa6310ae-be43-4309-af1d-a5033daff2f0'::uuid, 'blocked_target_parent_recovery', 'lvx_name_modifier_collision', null, null, 'Staraptor FB', null, 'pl3', '147', 'Staraptor FB', null),
  ('9089264b-fd13-4261-94ac-b252ab89f6c7'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Relicanth', null, 'pl3', 'SH8', 'Relicanth', 'number_prefix:SH'),
  ('e8a8c0b0-2213-4701-89a9-8926cc0d5669'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Yanma', null, 'pl3', 'SH9', 'Yanma', 'number_prefix:SH'),
  ('a02f871c-fe3e-432b-944d-6decea0eecdf'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Charizard', null, 'pl4', '1', 'Charizard', null),
  ('71779a8b-ee22-4892-9425-8e3da51f179a'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Mothim', null, 'pl4', '6', 'Mothim', null),
  ('3059259e-c28b-49d6-9f31-64e178e87f28'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Swalot', null, 'pl4', '9', 'Swalot', null),
  ('8716f287-3497-49b2-a499-9c1e026a6a94'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Zapdos', null, 'pl4', '12', 'Zapdos', null),
  ('cf859f9b-f1d6-41ec-9e38-c7fd27743777'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Arceus', null, 'pl4', 'AR2', 'Arceus', 'number_prefix:AR'),
  ('8b2c91cf-bd7c-4564-84ca-5863e1414257'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Arceus', null, 'pl4', 'AR3', 'Arceus', 'number_prefix:AR'),
  ('61cd00a6-3418-4980-ade8-b26c8d0b4d5c'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Arceus', null, 'pl4', 'AR4', 'Arceus', 'number_prefix:AR'),
  ('63a0a7b8-bdfa-4a08-ad30-680bcc45802e'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Arceus', null, 'pl4', 'AR5', 'Arceus', 'number_prefix:AR'),
  ('67e47461-e03c-4da3-8557-d3df639dbb98'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Arceus', null, 'pl4', 'AR7', 'Arceus', 'number_prefix:AR'),
  ('0db1b355-bb14-4042-8597-4afd1d9a2b77'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Arceus', null, 'pl4', 'AR8', 'Arceus', 'number_prefix:AR'),
  ('502ee1d6-d7c2-40d7-8bfa-5e94ff5c3bda'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Bagon', null, 'pl4', 'SH10', 'Bagon', 'number_prefix:SH'),
  ('22a0396f-a0fe-4680-8568-71246489db3c'::uuid, 'blocked_target_parent_recovery', 'prefixed_number_collision', null, null, 'Ponyta', null, 'pl4', 'SH11', 'Ponyta', 'number_prefix:SH'),
  ('9cf48b11-bf42-4aa3-861b-c2ca5543877e'::uuid, 'blocked_target_parent_recovery', 'trainer_parenthetical_name_collision', null, null, 'Boss''s Orders (Giovanni)', null, 'swsh2', '154', 'Boss''s Orders (Giovanni)', 'trainer_subject:giovanni'),
  ('5ee8ddf9-81b3-43e0-94b5-951ac0386eb8'::uuid, 'blocked_target_parent_recovery', 'trainer_parenthetical_name_collision', null, null, 'Boss''s Orders (Lysandre)', null, 'swsh4.5', '58', 'Boss''s Orders (Lysandre)', 'trainer_subject:lysandre'),
  ('17cd3179-b844-47a8-a197-ae123ca4b583'::uuid, 'blocked_target_parent_recovery', 'trainer_parenthetical_name_collision', null, null, 'Professor''s Research (Professor Juniper)', null, 'swsh4.5', '60', 'Professor''s Research (Professor Juniper)', 'trainer_subject:professor_juniper'),
  ('a99d0ffd-9711-4e29-82d4-e5514c3d9d98'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'col1', 'SL6', 'Kyogre', null, 'col1', 'SL6', 'Kyogre', 'number_prefix:SL'),
  ('3397e2c4-7951-4928-86e3-8e12763ec428'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'col1', 'SL8', 'Palkia', null, 'col1', 'SL8', 'Palkia', 'number_prefix:SL'),
  ('91bd37f9-7eef-40d7-a042-3292f6038985'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'dp7', '96', 'Dusknoir LV.X', null, 'dp7', '96', 'Dusknoir LV.X', 'level_x'),
  ('69b15482-f73f-49e0-906e-992a435f4b4f'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'dp7', '97', 'Heatran LV.X', null, 'dp7', '97', 'Heatran LV.X', 'level_x'),
  ('52adb9a2-3176-41a3-8029-c227e8cf92e6'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'dp7', '98', 'Machamp LV.X', null, 'dp7', '98', 'Machamp LV.X', 'level_x'),
  ('bcce787d-4252-4ee8-87f7-df38cfd2e5c4'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'dp7', '99', 'Raichu LV.X', null, 'dp7', '99', 'Raichu LV.X', 'level_x'),
  ('ca1b21a9-98a2-4645-9de1-66aa02a75e68'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'dp7', '100', 'Regigigas LV.X', null, 'dp7', '100', 'Regigigas LV.X', 'level_x'),
  ('1bf5b85a-1990-4546-b38c-2a7ad9d12cbf'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'dp7', 'SH2', 'Duskull', null, 'dp7', 'SH2', 'Duskull', 'number_prefix:SH'),
  ('0fa024a0-c7ae-4a65-b6d4-6d638a82027a'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'dp7', 'SH3', 'Voltorb', null, 'dp7', 'SH3', 'Voltorb', 'number_prefix:SH'),
  ('3eb15a78-b5d6-42b6-913b-c8f84686249c'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl1', '122', 'Dialga G LV.X', null, 'pl1', '122', 'Dialga G LV.X', 'level_x'),
  ('38d416a8-a601-43f6-983b-3e8e0be8ffab'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl1', '123', 'Drapion LV.X', null, 'pl1', '123', 'Drapion LV.X', 'level_x'),
  ('6a5e1c30-1402-4fb7-a677-9399dbf067ee'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl1', '124', 'Giratina LV.X', null, 'pl1', '124', 'Giratina LV.X', 'level_x'),
  ('1c4056b6-275f-4435-aee8-638c6df5cee9'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl1', '125', 'Palkia G LV.X', null, 'pl1', '125', 'Palkia G LV.X', 'level_x'),
  ('dc311e05-8d2c-41dc-a18b-4a42df480db7'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl1', '126', 'Shaymin LV.X', null, 'pl1', '126', 'Shaymin LV.X', 'level_x'),
  ('cb23edfe-7d5a-4e32-af26-e41f48271ccb'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl1', '127', 'Shaymin LV.X', null, 'pl1', '127', 'Shaymin LV.X', 'level_x'),
  ('0b42f7c0-c2b5-475f-bf1e-97655eb28a3a'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl1', 'SH6', 'Vulpix', null, 'pl1', 'SH6', 'Vulpix', 'number_prefix:SH'),
  ('d1a5f335-824b-4023-af12-89896ac9ba3e'::uuid, 'existing_collision_holder_modifier', 'technical_machine_name_collision', 'pl2', '95', 'Team Galactic''s Invention G-107 Technical Machine G', null, 'pl2', '95', 'Team Galactic''s Invention G-107 Technical Machine G', 'name_suffix:g'),
  ('d5dcf523-4fa4-409d-828b-41590db54467'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '103', 'Alakazam E4 LV.X', null, 'pl2', '103', 'Alakazam E4 LV.X', 'level_x'),
  ('bb349eab-a7e8-406e-9cb0-258ba52b4c98'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '104', 'Floatzel GL LV.X', null, 'pl2', '104', 'Floatzel GL LV.X', 'level_x'),
  ('36df499c-7b36-4f0b-9297-0608d198618b'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '105', 'Flygon LV.X', null, 'pl2', '105', 'Flygon LV.X', 'level_x'),
  ('b9b60d69-cde6-4dd8-bfd6-0c818bfd1196'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '106', 'Gallade E4 LV.X', null, 'pl2', '106', 'Gallade E4 LV.X', 'level_x'),
  ('c16d088f-0ad2-4a85-824e-c889a2bfde12'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '107', 'Hippowdon LV.X', null, 'pl2', '107', 'Hippowdon LV.X', 'level_x'),
  ('f890ce32-6389-40a1-9b77-ff610b6e3f88'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '108', 'Infernape E4 LV.X', null, 'pl2', '108', 'Infernape E4 LV.X', 'level_x'),
  ('c37513a0-d943-4c38-9f2f-83b9a0ec9524'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '110', 'Mismagius GL LV.X', null, 'pl2', '110', 'Mismagius GL LV.X', 'level_x'),
  ('c98b6822-0ef1-462f-ad03-cd02107e5ed1'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl2', '111', 'Snorlax LV.X', null, 'pl2', '111', 'Snorlax LV.X', 'level_x'),
  ('556a801c-bf26-4315-94cb-a023e6d1244b'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl2', 'RT1', 'Fan Rotom', null, 'pl2', 'RT1', 'Fan Rotom', 'number_prefix:RT'),
  ('5e9cae28-ec79-4d4b-8e9b-c716056c3dc8'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl2', 'RT3', 'Heat Rotom', null, 'pl2', 'RT3', 'Heat Rotom', 'number_prefix:RT'),
  ('00f64a67-4b22-4827-bc85-d2c31dff23ab'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl2', 'RT5', 'Wash Rotom', null, 'pl2', 'RT5', 'Wash Rotom', 'number_prefix:RT'),
  ('5aba56ba-2887-4f19-b7ec-a3121f414be3'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl3', '141', 'Absol G LV.X', null, 'pl3', '141', 'Absol G LV.X', 'level_x'),
  ('d5330a73-ac35-409a-a3dd-c192dbd704bf'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl3', '142', 'Blaziken FB LV.X', null, 'pl3', '142', 'Blaziken FB LV.X', 'level_x'),
  ('6541ddac-0b89-4591-85db-aba036f5f934'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl3', '143', 'Charizard G LV.X', null, 'pl3', '143', 'Charizard G LV.X', 'level_x'),
  ('4dc2bf8f-9624-4c7b-aa4d-b372ba4383bc'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl3', '144', 'Electivire FB LV.X', null, 'pl3', '144', 'Electivire FB LV.X', 'level_x'),
  ('1c13bf1e-dcff-4460-af92-3289103f7c05'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl3', '145', 'Garchomp C LV.X', null, 'pl3', '145', 'Garchomp C LV.X', 'level_x'),
  ('cb5f46e6-97bd-4e6a-995c-2bca5072d793'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl3', '146', 'Rayquaza C LV.X', null, 'pl3', '146', 'Rayquaza C LV.X', 'level_x'),
  ('dc75d5dc-b426-480f-8f84-30f20d6518e6'::uuid, 'existing_collision_holder_modifier', 'lvx_name_modifier_collision', 'pl3', '147', 'Staraptor FB LV.X', null, 'pl3', '147', 'Staraptor FB LV.X', 'level_x'),
  ('5fefb496-b9cd-4dbe-bec6-63cd90b151f1'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl4', 'AR1', 'Arceus', null, 'pl4', 'AR1', 'Arceus', 'number_prefix:AR'),
  ('74710bb3-5e5c-48f5-a642-086042df54e5'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl4', 'AR6', 'Arceus', null, 'pl4', 'AR6', 'Arceus', 'number_prefix:AR'),
  ('47871621-a579-4429-805d-6d81d2959530'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl4', 'AR9', 'Arceus', null, 'pl4', 'AR9', 'Arceus', 'number_prefix:AR'),
  ('6b44fbe5-21e8-4ee9-9065-195f24d74eb8'::uuid, 'existing_collision_holder_modifier', 'prefixed_number_collision', 'pl4', 'SH12', 'Shinx', null, 'pl4', 'SH12', 'Shinx', 'number_prefix:SH');

do $$
declare
  target_count int;
  drift_count int;
  final_collision_count int;
begin
  select count(*) into target_count from pkg02g_parent_update_targets;
  if target_count <> 97 then
    raise exception 'PKG-02G target count mismatch: %', target_count;
  end if;

  perform 1
  from public.card_prints cp
  where cp.id in (select card_print_id from pkg02g_parent_update_targets)
  for update;

  select count(*) into drift_count
  from public.card_prints cp
  join pkg02g_parent_update_targets target on target.card_print_id = cp.id
  where cp.set_code is distinct from target.expected_set_code
     or cp.number is distinct from target.expected_number
     or cp.name is distinct from target.expected_name
     or cp.printed_identity_modifier is distinct from target.expected_printed_identity_modifier;

  if drift_count <> 0 then
    raise exception 'PKG-02G before-state drift rows: %', drift_count;
  end if;

  update public.card_prints cp
  set printed_identity_modifier = target.target_printed_identity_modifier
  from pkg02g_parent_update_targets target
  where cp.id = target.card_print_id
    and target.update_class = 'existing_collision_holder_modifier';

  update public.card_prints cp
  set
    set_code = target.target_set_code,
    number = target.target_number,
    name = target.target_name,
    printed_identity_modifier = target.target_printed_identity_modifier
  from pkg02g_parent_update_targets target
  where cp.id = target.card_print_id
    and target.update_class = 'blocked_target_parent_recovery';

  select count(*) into drift_count
  from public.card_prints cp
  join pkg02g_parent_update_targets target on target.card_print_id = cp.id
  where cp.set_code is distinct from target.target_set_code
     or cp.number is distinct from target.target_number
     or cp.name is distinct from target.target_name
     or cp.printed_identity_modifier is distinct from target.target_printed_identity_modifier;

  if drift_count <> 0 then
    raise exception 'PKG-02G final field mismatch rows: %', drift_count;
  end if;

  select count(*) into final_collision_count
  from (
    select
      cp.set_id,
      cp.number_plain,
      coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
      coalesce(cp.variant_key, '') as variant_key,
      count(*) as row_count
    from public.card_prints cp
    where cp.set_id in (
      select distinct cp2.set_id
      from public.card_prints cp2
      join pkg02g_parent_update_targets target on target.card_print_id = cp2.id
    )
      and cp.set_id is not null
      and cp.number_plain is not null
      and cp.set_identity_model = 'standard'
    group by cp.set_id, cp.number_plain, coalesce(cp.printed_identity_modifier, ''), coalesce(cp.variant_key, '')
    having count(*) > 1
  ) collisions;

  if final_collision_count <> 0 then
    raise exception 'PKG-02G final unique identity collision groups: %', final_collision_count;
  end if;
end $$;

rollback;

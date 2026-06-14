-- English Master Index PKG-06H-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: 1cdba6ca2ad8cca6c5edd527ffee2e879aa9d6276cf52ac900c7681a3472318e
-- Package fingerprint: 489d80ab40043f16badef31a9553b3cba2031aabaefd90b7ebe328a946173c36

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06h_active_child_printings (
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

insert into pkg06h_active_child_printings (
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
  ('e4c636a9-f056-46e2-ba01-c13460703e39'::uuid, 'da31f66a-e117-4193-956d-6d8e4842b37c'::uuid, 'ex1', '3', 'Blaziken', 'normal', 'verified_master_set_index_v1', 'ex1:3:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('ccda7040-6308-40bc-8095-9718f9ea30e6'::uuid, '0445db40-90d6-4452-8def-df8a6563cb01'::uuid, 'ex1', '7', 'Gardevoir', 'normal', 'verified_master_set_index_v1', 'ex1:7:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('e1910e3f-ba88-4053-9fed-ab46699d32f7'::uuid, 'b0ae3b0a-ca78-4e05-8e1b-0ecd892455ae'::uuid, 'ex1', '93', 'Darkness Energy', 'cosmos', 'verified_master_set_index_v1', 'ex1:93:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('2d006acc-af91-4a86-b19d-1a14dc9496df'::uuid, '3defd22c-d3f0-44d8-89ad-85ff2e5b7742'::uuid, 'ex1', '96', 'Chansey ex', 'holo', 'verified_master_set_index_v1', 'ex1:96:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c794f3e8-e445-4fef-9395-314343bd22f1'::uuid, '3e384211-8fd9-4e1e-b20f-aa688887bdef'::uuid, 'ex1', '97', 'Electabuzz ex', 'holo', 'verified_master_set_index_v1', 'ex1:97:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('d65c86a3-0b2d-4a50-b227-eea737c7b4c2'::uuid, '2ff2a2ac-8a3f-4b72-83e0-064759f85576'::uuid, 'ex1', '98', 'Hitmonchan ex', 'holo', 'verified_master_set_index_v1', 'ex1:98:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('89294f2d-e22a-4aed-9f49-0318c5ef6daa'::uuid, '973ee7a2-fca3-4ebb-a4f3-b7de7a28793c'::uuid, 'ex1', '99', 'Lapras ex', 'holo', 'verified_master_set_index_v1', 'ex1:99:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('3961d011-7631-405a-8f07-e2597615b809'::uuid, '093eed10-f8ca-4ea4-95a1-8b5db8298460'::uuid, 'ex1', '100', 'Magmar ex', 'holo', 'verified_master_set_index_v1', 'ex1:100:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c1c8662a-e129-4a41-b5e2-c76f520e784b'::uuid, 'f957da76-aeda-4460-b2e7-adbff61fbcd1'::uuid, 'ex1', '101', 'Mewtwo ex', 'holo', 'verified_master_set_index_v1', 'ex1:101:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('5f860264-6761-444e-9d43-b6ff40f33f4a'::uuid, 'd42f9858-bced-4c94-aafa-0f713fd35658'::uuid, 'ex1', '102', 'Scyther ex', 'holo', 'verified_master_set_index_v1', 'ex1:102:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('853babc8-4bf6-43ed-a992-4d0b8c3a59dc'::uuid, '22e14575-6c84-46a9-b2e9-98e66b5f4444'::uuid, 'ex1', '103', 'Sneasel ex', 'holo', 'verified_master_set_index_v1', 'ex1:103:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7e8d73f1-c498-401f-96d2-7a36e199086d'::uuid, 'b47aaf34-77a4-455c-bc38-ba8bc5c7cd46'::uuid, 'pop4', '1', 'Chimecho δ', 'normal', 'verified_master_set_index_v1', 'pop4:1:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('8e51c778-cb8f-45da-ad1c-3381b26df2e7'::uuid, 'db946519-a997-4e7c-b3a0-31428ece7aaf'::uuid, 'pop4', '3', 'Flygon', 'holo', 'verified_master_set_index_v1', 'pop4:3:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('765fbab8-3282-4c47-a445-f36470443f41'::uuid, 'db946519-a997-4e7c-b3a0-31428ece7aaf'::uuid, 'pop4', '3', 'Flygon', 'normal', 'verified_master_set_index_v1', 'pop4:3:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('cb642ca8-0ae5-4530-b46c-926960b5456e'::uuid, 'b681bda3-e601-4f05-a6ae-216f35d2760f'::uuid, 'pop4', '6', 'Combusken', 'normal', 'verified_master_set_index_v1', 'pop4:6:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('e992e724-1b78-4758-8dc4-efb3524b895f'::uuid, '1fc74b05-e77a-4ef9-8a84-d01367955afb'::uuid, 'pop4', '9', 'Pokémon Fan Club', 'normal', 'verified_master_set_index_v1', 'pop4:9:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('d359ac31-ea2c-4717-9dae-9e3259f4ed03'::uuid, '7dbc75a6-3b61-4322-8220-b5b1d4634e90'::uuid, 'pop4', '10', 'Scramble Energy', 'normal', 'verified_master_set_index_v1', 'pop4:10:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('a5e3d373-b63c-43c3-b20f-bf6b425c136d'::uuid, 'f65cb048-2d64-4d74-ba45-f6f7d2593098'::uuid, 'pop4', '12', 'Pidgey', 'normal', 'verified_master_set_index_v1', 'pop4:12:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('f6dd2f45-57ae-4c0f-a5f4-c16b2391799d'::uuid, '576aa929-3041-4a06-9fa3-228c63385217'::uuid, 'pop4', '15', 'Treecko δ', 'normal', 'verified_master_set_index_v1', 'pop4:15:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('8180216b-e7c7-47cd-abec-89ec2f9fe800'::uuid, '4548ef14-6bfb-475f-8ef6-ddead8c8e785'::uuid, 'pop4', '16', 'Wobbuffet', 'normal', 'verified_master_set_index_v1', 'pop4:16:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('4fd0df4e-3b37-4154-95b1-6691ffedce12'::uuid, '792e6bbf-f862-46a0-80d0-94fc99a7e733'::uuid, 'pop4', '17', 'Deoxys ex', 'normal', 'verified_master_set_index_v1', 'pop4:17:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('22726694-0d69-4f73-a71d-a5ce9ca9a260'::uuid, '99a700f9-a93f-46ab-aca0-d8d38a7112e6'::uuid, 'pop6', '1', 'Bastiodon', 'normal', 'verified_master_set_index_v1', 'pop6:1:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('3fdef5b2-9c44-4668-b652-705242413828'::uuid, '99bbb853-e286-49cb-9284-3fa60a4286d0'::uuid, 'pop6', '2', 'Lucario', 'normal', 'verified_master_set_index_v1', 'pop6:2:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('f230e076-37c6-4948-a019-22990c84c562'::uuid, '57ecf19f-0279-4492-a781-584610e8bb28'::uuid, 'pop6', '3', 'Manaphy', 'normal', 'verified_master_set_index_v1', 'pop6:3:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('baf4abbc-886d-4701-b682-6519611a1065'::uuid, '01933037-9667-41b1-a739-5ee5d0e7b94c'::uuid, 'pop6', '4', 'Pachirisu', 'normal', 'verified_master_set_index_v1', 'pop6:4:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('d99e9cfd-8b55-47e4-9186-3b65cab803b1'::uuid, '3aff4d3e-78b3-40ea-962a-e46728922859'::uuid, 'pop6', '5', 'Rampardos', 'normal', 'verified_master_set_index_v1', 'pop6:5:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7eab1fc1-c1a4-4491-acbd-ab7edf116fef'::uuid, '3015d794-dad3-47fb-afbe-de5207223a7a'::uuid, 'pop6', '6', 'Drifloon', 'normal', 'verified_master_set_index_v1', 'pop6:6:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('3349737a-a1a0-4e4c-a29b-bbda25be3b16'::uuid, 'f6201ecd-e583-4c22-a7a3-7fe3a3447261'::uuid, 'pop6', '10', 'Staravia', 'normal', 'verified_master_set_index_v1', 'pop6:10:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('bf5eb507-fe50-4d74-aed8-57c05e703bba'::uuid, 'cd796ddc-ae9e-4a0c-b5d5-88dea3e66eb9'::uuid, 'pop6', '12', 'Buneary', 'normal', 'verified_master_set_index_v1', 'pop6:12:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('54e6a69d-4df6-4515-bc29-05bf89edca9d'::uuid, 'fbf4baa6-b0cc-4816-8f44-3507a476316f'::uuid, 'pop6', '16', 'Starly', 'normal', 'verified_master_set_index_v1', 'pop6:16:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('849eeb78-3454-4a77-abf0-c1237032d6c3'::uuid, '62ea95c1-e848-412b-8938-22501ade64f2'::uuid, 'pop6', '17', 'Turtwig', 'normal', 'verified_master_set_index_v1', 'pop6:17:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('dc366d77-c544-4662-8172-762350284d50'::uuid, '88bc1a78-8926-43ca-8ba7-530bcdc38d8c'::uuid, 'sm1', '9', 'Rowlet', 'cosmos', 'verified_master_set_index_v1', 'sm1:9:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('87f89848-f31a-45c6-b1b8-98c83373dcaf'::uuid, '4f11d3e6-a929-40e2-ac42-481174884082'::uuid, 'sm1', '10', 'Dartrix', 'cosmos', 'verified_master_set_index_v1', 'sm1:10:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7bc6cd9e-6fa6-4246-8f51-116a52cd6bfd'::uuid, '04e100df-6ff6-45de-a87b-82428de5db72'::uuid, 'sm1', '24', 'Litten', 'cosmos', 'verified_master_set_index_v1', 'sm1:24:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('779ae62b-90c3-404d-98c7-30deb9ddde73'::uuid, '4c4c2167-aa74-4387-93b0-eb05ad0af08c'::uuid, 'sm1', '25', 'Torracat', 'cosmos', 'verified_master_set_index_v1', 'sm1:25:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('4d7e770c-364c-47f9-a4ce-aea0ea7c93c4'::uuid, '59a013f3-e089-409a-8891-489aeff1593c'::uuid, 'sm1', '39', 'Popplio', 'cosmos', 'verified_master_set_index_v1', 'sm1:39:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('92287b2a-a9ec-47a2-a2b3-c26048cbe5ab'::uuid, 'fcf0cae4-4f60-463d-a28e-0a35f3413d6e'::uuid, 'sm1', '40', 'Brionne', 'cosmos', 'verified_master_set_index_v1', 'sm1:40:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('03b8d16a-8332-41c4-af1e-11d518aa1f06'::uuid, 'f6fbdfb5-5e82-4daa-a2f4-89fb84d7cc02'::uuid, 'sm1', '56', 'Crobat', 'cosmos', 'verified_master_set_index_v1', 'sm1:56:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('dec72d0d-1dec-4f1f-acbf-5d5e553c880f'::uuid, '3f5e1f8d-e484-4a80-a4bd-01f7736d8061'::uuid, 'sm1', '58', 'Alolan Muk', 'cosmos', 'verified_master_set_index_v1', 'sm1:58:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('4200bfc7-db6e-446f-b016-7318b3d62482'::uuid, 'c2dda1f7-efb2-4979-9d5c-d3c1e36df5f2'::uuid, 'sm1', '71', 'Gigalith', 'cosmos', 'verified_master_set_index_v1', 'sm1:71:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('6bc046b7-fd4a-4d32-b3dc-366662373e3b'::uuid, 'b5d9d044-48a6-4907-b25d-756579e9bbba'::uuid, 'sm1', '79', 'Alolan Persian', 'cosmos', 'verified_master_set_index_v1', 'sm1:79:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('dcb32f1a-142f-4f88-b812-f9e4401d7999'::uuid, 'b7c381b3-fb62-4a10-9b50-0892dda6c8bf'::uuid, 'sm1', '82', 'Sharpedo', 'cosmos', 'verified_master_set_index_v1', 'sm1:82:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('cf9961fd-e18a-4f2d-9e0c-9e74ea241eee'::uuid, 'a13b39f4-7147-481b-ae5a-d107f6fac601'::uuid, 'sm1', '87', 'Alolan Dugtrio', 'cosmos', 'verified_master_set_index_v1', 'sm1:87:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('ee1ec66e-a425-4beb-83c4-09f987ce8eb9'::uuid, 'ee400afa-dbf7-4ac8-ac56-8a3bf418859e'::uuid, 'sm1', '96', 'Dragonite', 'cosmos', 'verified_master_set_index_v1', 'sm1:96:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('0d00704e-e577-4ff8-be36-700aba8f98c2'::uuid, '045fc903-a00e-4b37-b9f9-b4087a077b3c'::uuid, 'sv01', '15', 'Meowscarada', 'reverse', 'verified_master_set_index_v1', 'sv01:15:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('764d8644-0d41-4647-92b5-2c7b2220ecc8'::uuid, '18eb6d52-e597-49ed-8639-3b0172f412b2'::uuid, 'sv01', '23', 'Arboliva', 'reverse', 'verified_master_set_index_v1', 'sv01:23:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('d3da09ca-2167-41c1-ac8b-8383a42c4935'::uuid, '92455c95-a764-48fe-b493-761307e3720a'::uuid, 'sv01', '38', 'Skeledirge', 'reverse', 'verified_master_set_index_v1', 'sv01:38:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('6c529b37-028c-47fb-abce-19c771b8de47'::uuid, '3cc32eac-347d-47f0-9123-74e336247f1c'::uuid, 'sv01', '80', 'Miraidon', 'reverse', 'verified_master_set_index_v1', 'sv01:80:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('20f93179-7142-4a6b-a441-3635f28d6e60'::uuid, 'aa749b72-c757-4f2e-9f6b-283c65333f81'::uuid, 'sv01', '106', 'Houndstone', 'reverse', 'verified_master_set_index_v1', 'sv01:106:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('0ef2bdd4-f09c-41ec-b171-16996fa7ba40'::uuid, '64639ecf-4c8f-4287-9db4-85ff1520cb1a'::uuid, 'sv01', '122', 'Klawf', 'reverse', 'verified_master_set_index_v1', 'sv01:122:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('6e6aec60-770e-4fc4-ba27-0442ab8821f5'::uuid, 'ea3864cd-868b-48c7-9cc0-1d2abe75422d'::uuid, 'sv01', '124', 'Koraidon', 'reverse', 'verified_master_set_index_v1', 'sv01:124:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c1ac6d0c-1062-448a-bcb3-9fde782e9f82'::uuid, '2ab851e5-c2e4-4474-8b8c-536f276b4c5e'::uuid, 'sv01', '142', 'Revavroom', 'reverse', 'verified_master_set_index_v1', 'sv01:142:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('4822fb8d-c4cc-4e0b-b971-3b2290b3ce09'::uuid, '50410f1a-53b8-4920-bdcc-df4a8d2555c4'::uuid, 'sv01', '153', 'Indeedee', 'reverse', 'verified_master_set_index_v1', 'sv01:153:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('45795181-314e-4224-8717-71eb93acff5b'::uuid, '292c9404-1259-47be-8802-c113cc352d88'::uuid, 'sv01', '164', 'Cyclizar', 'reverse', 'verified_master_set_index_v1', 'sv01:164:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('bbd049b4-6300-48d1-912b-24e57c14a794'::uuid, '710a201e-69bd-4769-ae3d-e4bf48bb3236'::uuid, 'sv03.5', '1', 'Bulbasaur', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:1:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('aa91ccf3-3860-4435-ade8-2d9bcfd53bf7'::uuid, '7dd08fd2-3546-43fc-8da5-a8daa086055b'::uuid, 'sv03.5', '4', 'Charmander', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:4:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('35253029-3888-433d-87b7-9b8180c38dd6'::uuid, '0d600674-ed81-4e1e-806f-e976ded2263f'::uuid, 'sv03.5', '5', 'Charmeleon', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:5:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c4ce6242-1226-4749-aea6-acbb90e31746'::uuid, '7c9ce21c-eacb-4086-8c26-82ad8ef69988'::uuid, 'sv03.5', '26', 'Raichu', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:26:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('072c70f1-f0de-4e0d-a64f-83ce5abf4af9'::uuid, '2900cb72-8937-4144-8875-b7bc814b26ea'::uuid, 'sv03.5', '45', 'Vileplume', 'normal', 'verified_master_set_index_v1', 'sv03.5:45:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('9e0543d7-1d30-438a-a764-02dc15567a3e'::uuid, '15e368a7-b793-4b71-9596-ef5a279d2ad4'::uuid, 'sv03.5', '63', 'Abra', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:63:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('46c4ea51-c824-4804-83ca-38c2a99c6766'::uuid, 'f94133b3-9465-4660-91a6-2281bd895b02'::uuid, 'sv03.5', '64', 'Kadabra', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:64:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('bb9b0d52-5103-4694-95db-ce758d5ab272'::uuid, '2aafc4f9-be10-4c28-b81f-910410db50c4'::uuid, 'sv03.5', '68', 'Machamp', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:68:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('a680cc36-3cd6-44b0-9dcc-ef88bbcadd47'::uuid, '05748b4b-a908-4cdc-8894-127737e05a47'::uuid, 'sv03.5', '94', 'Gengar', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:94:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('a28175a9-cb4d-4081-9988-53edc5a1b3d0'::uuid, '3e31bedf-01c7-4cb2-bd8e-cca2d319c2f2'::uuid, 'sv03.5', '125', 'Electabuzz', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:125:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('96270d1e-2cb4-4233-b8a8-a112d3d97c8c'::uuid, 'eb968268-3e1d-4181-9a62-ff2fe1e77327'::uuid, 'sv03.5', '146', 'Moltres', 'reverse', 'verified_master_set_index_v1', 'sv03.5:146:reverse', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c4d23519-fb9d-4d0d-ae51-3d1cc987fcec'::uuid, '172dad53-40ee-4854-801f-de533f28502f'::uuid, 'sv03.5', '149', 'Dragonite', 'cosmos', 'verified_master_set_index_v1', 'sv03.5:149:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('5478f8b6-83f9-4937-8043-fafefd2e2604'::uuid, '582f2a28-b7f5-436b-9865-857cd8f8a429'::uuid, 'sv05', '29', 'Magcargo', 'holo', 'verified_master_set_index_v1', 'sv05:29:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('6910bc16-fe36-419b-916a-b2443fc10d86'::uuid, 'a9f98663-ab89-4f94-bad1-7df917677c13'::uuid, 'sv05', '62', 'Iron Thorns', 'cosmos', 'verified_master_set_index_v1', 'sv05:62:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('45667f83-ffd7-4877-9ab8-a5344f69b1fb'::uuid, '67842d66-7355-47cc-97c8-72b51d526c21'::uuid, 'sv05', '77', 'Scream Tail', 'cosmos', 'verified_master_set_index_v1', 'sv05:77:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('f3f5a015-d092-4832-8187-6234e0fb38f2'::uuid, '1b003afa-3458-4926-8dd9-f61268e438e2'::uuid, 'sv05', '79', 'Iron Valiant', 'cosmos', 'verified_master_set_index_v1', 'sv05:79:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('cffd0c33-ad2e-42fd-aa66-9f0fedd11eae'::uuid, '1bc67ac9-6e2d-486b-8cc6-dd0378e63bd3'::uuid, 'sv05', '96', 'Great Tusk', 'cosmos', 'verified_master_set_index_v1', 'sv05:96:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('4a46c730-f9b2-4d59-8985-881ed4e24fc6'::uuid, 'f8003028-e419-490b-8a31-b231ab79ec16'::uuid, 'sv05', '109', 'Roaring Moon', 'cosmos', 'verified_master_set_index_v1', 'sv05:109:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('42ccbaf1-8b7c-4563-8755-62d6038dfe6d'::uuid, '8c988efc-2d6c-4388-83c5-cf8ace8a9c11'::uuid, 'sv05', '119', 'Koraidon', 'cosmos', 'verified_master_set_index_v1', 'sv05:119:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('07771aa3-98b6-4dca-a758-a143223053ef'::uuid, '90278a2b-971e-4000-9ffb-e127b11aaf0d'::uuid, 'sv05', '121', 'Miraidon', 'cosmos', 'verified_master_set_index_v1', 'sv05:121:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7bffcfb0-8915-4422-a492-8e41890a83f0'::uuid, 'bf4a38f1-2693-43ba-9f89-a2409010a5ae'::uuid, 'sv05', '126', 'Hoothoot', 'cosmos', 'verified_master_set_index_v1', 'sv05:126:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('e9835c61-5991-4c37-a7e5-bdc915de1d6a'::uuid, 'd1fdaef2-b775-49a4-9e8d-568325d3e935'::uuid, 'sv05', '127', 'Noctowl', 'cosmos', 'verified_master_set_index_v1', 'sv05:127:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('559df37b-4913-4155-be0a-a4727089cc27'::uuid, '9d8c9876-ef83-4236-9642-24e15a0d07ba'::uuid, 'swsh10', '2', 'Hisuian Voltorb', 'cosmos', 'verified_master_set_index_v1', 'swsh10:2:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7986e7e2-0e38-455a-8d0b-8cf1cb44c65e'::uuid, '099a7c00-8203-4092-ac48-63431d5e2a70'::uuid, 'swsh10', '45', 'Keldeo', 'cosmos', 'verified_master_set_index_v1', 'swsh10:45:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7c400924-fda5-497a-b631-7e6ea5a223f6'::uuid, '099a7c00-8203-4092-ac48-63431d5e2a70'::uuid, 'swsh10', '45', 'Keldeo', 'normal', 'verified_master_set_index_v1', 'swsh10:45:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('337e45e7-0be7-42f2-9e91-a29edddbe2de'::uuid, 'b16bee87-aaff-4a23-bab4-a9ea178fb5fd'::uuid, 'swsh10', '69', 'Wyrdeer', 'normal', 'verified_master_set_index_v1', 'swsh10:69:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('9bb7a6f6-014a-4e78-b15b-537e5698bc01'::uuid, '8aab0c64-b621-44e5-970a-d416e6fa1244'::uuid, 'swsh10', '70', 'Hisuian Growlithe', 'cosmos', 'verified_master_set_index_v1', 'swsh10:70:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('04901fd5-8a23-464e-ae2d-b60f32c6cec8'::uuid, 'de37b411-58be-4563-a232-668bfab9bb63'::uuid, 'swsh10', '92', 'Hisuian Sneasel', 'cosmos', 'verified_master_set_index_v1', 'swsh10:92:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('d7e5d381-dbaf-412c-b68c-6b47dc9b65ff'::uuid, '183f9fb0-46e9-48f1-b336-0735bf53f60b'::uuid, 'swsh10', '97', 'Absol', 'normal', 'verified_master_set_index_v1', 'swsh10:97:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c129e9c1-2676-4198-b64a-0205713de01f'::uuid, '759a56c8-34c7-45ef-bc4c-00a5262623b6'::uuid, 'swsh10', '100', 'Hisuian Samurott', 'normal', 'verified_master_set_index_v1', 'swsh10:100:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('3c0fa7b8-f1c4-43f8-8009-7f3b7adc452e'::uuid, 'b0b7ee5d-846d-408f-8a53-88bce9a76f4e'::uuid, 'swsh10', '107', 'Magnezone', 'normal', 'verified_master_set_index_v1', 'swsh10:107:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('6a2a61a4-562b-48c7-bf9d-0db37e129ceb'::uuid, 'c172778d-d8c6-4380-a425-001f208020a2'::uuid, 'swsh10', '135', 'Adaman', 'normal', 'verified_master_set_index_v1', 'swsh10:135:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('f1ce3ee4-a93f-45c5-8d4a-01b97eaaf2dc'::uuid, 'a45460a3-bb3e-4ee5-b53a-057ba8a97101'::uuid, 'swsh6', '28', 'Cinderace', 'normal', 'verified_master_set_index_v1', 'swsh6:28:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('eae67cba-41c6-48ec-ab5c-878402a2703d'::uuid, 'a6e8cfa7-8880-47fa-9631-22c723d060ab'::uuid, 'swsh6', '43', 'Inteleon', 'cosmos', 'verified_master_set_index_v1', 'swsh6:43:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7d301a7b-652b-4e77-86b7-05df10aef7a4'::uuid, 'a6e8cfa7-8880-47fa-9631-22c723d060ab'::uuid, 'swsh6', '43', 'Inteleon', 'holo', 'verified_master_set_index_v1', 'swsh6:43:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c44669db-bc10-463f-a315-7bbaac277111'::uuid, 'a6e8cfa7-8880-47fa-9631-22c723d060ab'::uuid, 'swsh6', '43', 'Inteleon', 'normal', 'verified_master_set_index_v1', 'swsh6:43:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('70693ce1-67d2-4152-9503-56a97e7266a3'::uuid, '5bb99234-051e-4462-ad1d-560cf9417b79'::uuid, 'swsh6', '52', 'Thundurus', 'cosmos', 'verified_master_set_index_v1', 'swsh6:52:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('6c323119-e685-4498-8beb-1749c5e92468'::uuid, '5bb99234-051e-4462-ad1d-560cf9417b79'::uuid, 'swsh6', '52', 'Thundurus', 'normal', 'verified_master_set_index_v1', 'swsh6:52:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('02fdd23f-a43c-4a17-b6f3-0264297652fc'::uuid, '3d15055b-33d3-4c1b-ae95-7e5d001fc131'::uuid, 'swsh6', '64', 'Cresselia', 'normal', 'verified_master_set_index_v1', 'swsh6:64:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('3dac33cf-2b03-4710-af4e-3c1eb4a1aeb8'::uuid, 'be4140b6-ebc7-4e95-8bf7-4b5945da8896'::uuid, 'swsh6', '73', 'Hatterene', 'normal', 'verified_master_set_index_v1', 'swsh6:73:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('ee13b8b2-afad-4410-9a88-477203ad9d5c'::uuid, '3fe6eac3-ad28-48b0-98f3-c2bee13b4923'::uuid, 'swsh6', '98', 'Galarian Slowking', 'cosmos', 'verified_master_set_index_v1', 'swsh6:98:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('d8e30286-d53b-4d42-a2b6-dadcf35fc1b5'::uuid, 'ef99f50c-00e3-4e70-a099-31b42f309268'::uuid, 'swsh6', '114', 'Cobalion', 'normal', 'verified_master_set_index_v1', 'swsh6:114:normal', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('79ed05fd-52da-48ed-8091-5e0794f06b43'::uuid, 'acd27805-fb0a-492c-9a4c-8d0b06e174d5'::uuid, 'swsh6', '145', 'Klara', 'cosmos', 'verified_master_set_index_v1', 'swsh6:145:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('0b645dfb-f884-477c-bab3-41ea2df48b59'::uuid, '604a08ef-e720-4d66-b63c-202d8162cd57'::uuid, 'swsh6', '173', 'Galarian Zapdos V', 'holo', 'verified_master_set_index_v1', 'swsh6:173:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('4d46443c-9d26-4615-b175-8d3d70d6742e'::uuid, '7b5ef364-2a65-488e-8ddb-78b7f4e65a81'::uuid, 'swsh6', '177', 'Galarian Moltres V', 'holo', 'verified_master_set_index_v1', 'swsh6:177:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('505e051d-16ab-4a9b-8f8d-e741a0d885bd'::uuid, 'cb05c0fb-a67b-4aaa-95d1-fd9d5a10b4d4'::uuid, 'swsh6', '203', 'Ice Rider Calyrex VMAX', 'holo', 'verified_master_set_index_v1', 'swsh6:203:holo', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('d056ad45-744f-419b-93d0-cdfb6f2f5770'::uuid, '5b675cdf-5fe2-48ae-a050-daaee42a63fc'::uuid, 'xy1', '14', 'Chesnaught', 'cosmos', 'verified_master_set_index_v1', 'xy1:14:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('9df93395-b511-4ec4-975c-27ffadbe57b4'::uuid, 'bfa2b70f-850c-4f1c-bef2-8235fb34b4dc'::uuid, 'xy1', '17', 'Vivillon', 'cosmos', 'verified_master_set_index_v1', 'xy1:17:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('2f4a2961-966c-4a21-bb4f-c9a2aadc54fe'::uuid, '21d27e38-bc69-41b3-8127-de0977436ede'::uuid, 'xy1', '26', 'Delphox', 'cosmos', 'verified_master_set_index_v1', 'xy1:26:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('c49e9020-87e0-46a3-b1f0-fe5fd21993af'::uuid, 'e38a4c9b-97f6-4be7-931d-e75b25500811'::uuid, 'xy1', '28', 'Talonflame', 'cosmos', 'verified_master_set_index_v1', 'xy1:28:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('33a87d23-2897-4d89-87fe-2b20e177d4ef'::uuid, '2fc32ec5-2170-4997-b6f4-1b940ef76a01'::uuid, 'xy1', '41', 'Greninja', 'cosmos', 'verified_master_set_index_v1', 'xy1:41:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('5e7eb446-73ff-4fc8-83ef-0324051bc6af'::uuid, '23ad35b8-4252-4bb6-ba1d-bd35f33e8504'::uuid, 'xy1', '42', 'Pikachu', 'cosmos', 'verified_master_set_index_v1', 'xy1:42:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('5f0a71fc-70b6-430c-bd6a-9d9549ee9a0b'::uuid, 'ad815e93-7ca8-40f5-9e90-1dc85d66e674'::uuid, 'xy1', '43', 'Raichu', 'cosmos', 'verified_master_set_index_v1', 'xy1:43:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('7b15ef85-09de-4e38-b66c-38d4d4cc472a'::uuid, '9400f1e7-4cb2-42c9-95bd-02bf637070fd'::uuid, 'xy1', '62', 'Rhyperior', 'cosmos', 'verified_master_set_index_v1', 'xy1:62:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('3e517da6-f2c1-469a-9795-926e4d7508ba'::uuid, 'b8aab21f-a1af-403d-bdb6-c14e03cc820c'::uuid, 'xy1', '73', 'Zoroark', 'cosmos', 'verified_master_set_index_v1', 'xy1:73:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1'),
  ('9b7e506d-340e-455c-900c-63deb408b46f'::uuid, '86273fc7-94ae-4d4c-93d4-1dc1a175d27a'::uuid, 'xy1', '114', 'Furfrou', 'cosmos', 'verified_master_set_index_v1', 'xy1:114:cosmos', 'pkg06h_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06h_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06h_active_child_printings;
  select count(distinct set_key) into set_count from pkg06h_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06h_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06h_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06h_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 110 then raise exception 'PKG-06H child count drift: %', child_count; end if;
  if parent_count <> 105 then raise exception 'PKG-06H parent count drift: %', parent_count; end if;
  if set_count <> 10 then raise exception 'PKG-06H set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06H unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06H existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06H id collision count: %', id_collision_count; end if;
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
from pkg06h_active_child_printings;

select
  'PKG-06H-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  '1cdba6ca2ad8cca6c5edd527ffee2e879aa9d6276cf52ac900c7681a3472318e'::text as source_readiness_fingerprint,
  '489d80ab40043f16badef31a9553b3cba2031aabaefd90b7ebe328a946173c36'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06h_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06h_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06h_active_child_printings)::int as planned_child_rows;

rollback;

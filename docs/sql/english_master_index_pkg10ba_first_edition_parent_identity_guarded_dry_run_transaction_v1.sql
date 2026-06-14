-- English Master Index PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Target set: base2 / Jungle
-- Source readiness fingerprint: 7b7c9692e664b5a9b026b3d78b51b1ff8849421667ba427e2bd7f688c9ebb81b
-- Package fingerprint: e8fd374f201c0a18dd971fa2889f32883a2cc620565088f4926b59f8268707f1

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table pkg10ba_targets (
  target_parent_id uuid primary key,
  target_child_id uuid not null unique,
  base_parent_id uuid not null,
  set_key text not null,
  card_number text not null,
  source_card_name text not null,
  target_card_name text not null,
  source_finish_key text not null,
  target_finish_key text not null,
  target_printed_identity_modifier text not null,
  target_variant_key text null,
  proposed_number_plain text not null,
  evidence jsonb not null
) on commit drop;

insert into pkg10ba_targets (
  target_parent_id,
  target_child_id,
  base_parent_id,
  set_key,
  card_number,
  source_card_name,
  target_card_name,
  source_finish_key,
  target_finish_key,
  target_printed_identity_modifier,
  target_variant_key,
  proposed_number_plain,
  evidence
) values
  ('8166b2e2-4b31-4ea2-9cb1-39147d2ed201'::uuid, 'e68c3c2b-5e53-49d5-9299-bda6b4dde7ac'::uuid, '463f3a84-42a5-4d8f-85c8-7fc1aa14ec36'::uuid, 'base2', '1', 'Clefable', 'Clefable', 'first_edition_holo', 'holo', 'edition:first_edition', null, '1', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-1","https://api.tcgdex.net/v2/en/cards/base2-1","https://prices.pokemontcg.io/tcgplayer/base2-1","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('0408ff9b-353a-4699-b352-3e80ab65d0e9'::uuid, '5213f0a4-91a3-4a94-ab03-7b46e6dbccb7'::uuid, '8eb4813c-0b90-4764-8709-16aa9d5a0d9e'::uuid, 'base2', '2', 'Electrode', 'Electrode', 'first_edition_holo', 'holo', 'edition:first_edition', null, '2', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-2","https://api.tcgdex.net/v2/en/cards/base2-2","https://prices.pokemontcg.io/tcgplayer/base2-2","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('64ccf86a-a72e-4a7d-8798-4908c288372f'::uuid, '482021db-5b64-4e2e-8058-cf4dae0b68a4'::uuid, 'a89425a0-6abc-4c95-872f-6a433087939f'::uuid, 'base2', '3', 'Flareon', 'Flareon', 'first_edition_holo', 'holo', 'edition:first_edition', null, '3', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-3","https://api.tcgdex.net/v2/en/cards/base2-3","https://prices.pokemontcg.io/tcgplayer/base2-3","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('7663a8f4-2a07-4662-9af1-ab8c2da1c84e'::uuid, '0119d023-12f7-4eb1-b99f-c316c9691c5f'::uuid, '44867e4d-aa59-4fef-a33c-4ede1be99495'::uuid, 'base2', '4', 'Jolteon', 'Jolteon', 'first_edition_holo', 'holo', 'edition:first_edition', null, '4', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-4","https://api.tcgdex.net/v2/en/cards/base2-4","https://prices.pokemontcg.io/tcgplayer/base2-4","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('d4dffb25-3868-4c75-a82b-1e008577fd95'::uuid, '2fe99693-4c77-493a-91df-0ffdbf1909ac'::uuid, '43c6f019-7fc4-4f5f-93e2-7f28ee798180'::uuid, 'base2', '5', 'Kangaskhan', 'Kangaskhan', 'first_edition_holo', 'holo', 'edition:first_edition', null, '5', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-5","https://api.tcgdex.net/v2/en/cards/base2-5","https://prices.pokemontcg.io/tcgplayer/base2-5","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('64f16d5f-216e-49f8-b72b-111d466538b7'::uuid, 'a9b81d86-87bb-4466-9f8d-30744d894459'::uuid, 'b35e8af0-bec3-4bb7-bbaf-d623553e4474'::uuid, 'base2', '6', 'Mr. Mime', 'Mr. Mime', 'first_edition_holo', 'holo', 'edition:first_edition', null, '6', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-6","https://api.tcgdex.net/v2/en/cards/base2-6","https://prices.pokemontcg.io/tcgplayer/base2-6","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e3ebf1a5-732d-4b1f-aa1e-8f7769e9b09d'::uuid, 'ef926ff8-9d5d-4883-8f03-8c391190bdaa'::uuid, '8148c1b4-3104-4a36-962f-cab78bb67a89'::uuid, 'base2', '7', 'Nidoqueen', 'Nidoqueen', 'first_edition_holo', 'holo', 'edition:first_edition', null, '7', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-7","https://api.tcgdex.net/v2/en/cards/base2-7","https://prices.pokemontcg.io/tcgplayer/base2-7","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('7879fe9d-3c6b-4816-b455-d0b4a9529dd6'::uuid, '2c770d7f-a22c-4dd5-b25d-c78924947c0e'::uuid, 'bb7ceaa7-dd12-45f1-848f-5091c83ee0f0'::uuid, 'base2', '8', 'Pidgeot', 'Pidgeot', 'first_edition_holo', 'holo', 'edition:first_edition', null, '8', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-8","https://api.tcgdex.net/v2/en/cards/base2-8","https://prices.pokemontcg.io/tcgplayer/base2-8","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('1b23d24d-0f89-4cd7-bde9-d6e6ab7c5f0e'::uuid, 'f8e77af1-b389-4068-b87b-cf748a9d767a'::uuid, '49fa39dd-d4ff-41a7-80dc-03db65aeb4a7'::uuid, 'base2', '9', 'Pinsir', 'Pinsir', 'first_edition_holo', 'holo', 'edition:first_edition', null, '9', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-9","https://api.tcgdex.net/v2/en/cards/base2-9","https://prices.pokemontcg.io/tcgplayer/base2-9","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('cb60acf0-9b9f-448f-ae70-64bd2867149c'::uuid, '44d30395-56b9-4753-9a52-1dd82d28388c'::uuid, '77dcdb70-4912-4574-b790-17e613cecb98'::uuid, 'base2', '10', 'Scyther', 'Scyther', 'first_edition_holo', 'holo', 'edition:first_edition', null, '10', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-10","https://api.tcgdex.net/v2/en/cards/base2-10","https://prices.pokemontcg.io/tcgplayer/base2-10","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('2a1d6530-4cdc-4597-82cf-f3c24d7a725c'::uuid, '9f86c47c-be49-4d69-b81a-5feb5002bc5d'::uuid, '8b3cc33b-bb52-4b52-a731-70f3516345e7'::uuid, 'base2', '11', 'Snorlax', 'Snorlax', 'first_edition_holo', 'holo', 'edition:first_edition', null, '11', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-11","https://api.tcgdex.net/v2/en/cards/base2-11","https://prices.pokemontcg.io/tcgplayer/base2-11","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('4fa69012-0b67-42bd-afc1-a5d03d0c3b25'::uuid, 'b7239b62-ffe0-4ec8-afa9-0982d8cb93e7'::uuid, 'b575fc44-4d9e-460d-9977-8f19fc0a1b4b'::uuid, 'base2', '12', 'Vaporeon', 'Vaporeon', 'first_edition_holo', 'holo', 'edition:first_edition', null, '12', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-12","https://api.tcgdex.net/v2/en/cards/base2-12","https://prices.pokemontcg.io/tcgplayer/base2-12","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('981654af-5a3c-442d-b299-dbd17f69f5ca'::uuid, 'e05a8896-9aba-4fa4-acc4-e7a490557a31'::uuid, '59544cf4-177c-4c83-bd16-44b68733b06f'::uuid, 'base2', '13', 'Venomoth', 'Venomoth', 'first_edition_holo', 'holo', 'edition:first_edition', null, '13', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-13","https://api.tcgdex.net/v2/en/cards/base2-13","https://prices.pokemontcg.io/tcgplayer/base2-13","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('f0df47f7-cc32-45c4-a5a3-0304d891b266'::uuid, '15ccc402-424e-4e6d-bb45-2e93f939f6b8'::uuid, '786ed86f-d6f0-43d7-92dc-22eadd69a620'::uuid, 'base2', '14', 'Victreebel', 'Victreebel', 'first_edition_holo', 'holo', 'edition:first_edition', null, '14', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-14","https://api.tcgdex.net/v2/en/cards/base2-14","https://prices.pokemontcg.io/tcgplayer/base2-14","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('6dccf01b-d4d5-4acb-830a-0927dacea088'::uuid, '0bc07a65-2345-479a-b489-e5fb298e69a9'::uuid, '99f177ea-8920-43cb-9e8d-f6063054fc3d'::uuid, 'base2', '15', 'Vileplume', 'Vileplume', 'first_edition_holo', 'holo', 'edition:first_edition', null, '15', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-15","https://api.tcgdex.net/v2/en/cards/base2-15","https://prices.pokemontcg.io/tcgplayer/base2-15","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('26e05b3b-fed4-417f-a7cd-cd46de9ba736'::uuid, 'b77815d8-03bf-4656-a042-8c28090bd446'::uuid, '8a9af34f-25c2-497b-a6e1-740f8821de4e'::uuid, 'base2', '16', 'Wigglytuff', 'Wigglytuff', 'first_edition_holo', 'holo', 'edition:first_edition', null, '16', '{"sources":["pokemontcg_api","tcgdex","tcgplayer_price_guide","thepricedex_price_list"],"evidence_urls":["https://api.pokemontcg.io/v2/cards/base2-16","https://api.tcgdex.net/v2/en/cards/base2-16","https://prices.pokemontcg.io/tcgplayer/base2-16","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e6c83895-27a4-4cbb-9676-8db21742be1f'::uuid, '4f34cb65-1215-447a-a703-d2f2691b3605'::uuid, '7bf4c9f2-4713-40df-a462-7f36164c6391'::uuid, 'base2', '17', 'Clefable', 'Clefable', 'first_edition_normal', 'normal', 'edition:first_edition', null, '17', '{"sources":["tcgcollector_card_variants","thepricedex_price_list"],"evidence_urls":["https://www.tcgcollector.com/cards/239/clefable-jungle-17-64","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('cc0f5a75-6b43-4c22-a09a-2d579830bff4'::uuid, 'b41ed337-667f-450a-a272-55d046e13199'::uuid, '139df386-af8f-4e58-8f0a-23da7988c90f'::uuid, 'base2', '18', 'Electrode', 'Electrode', 'first_edition_normal', 'normal', 'edition:first_edition', null, '18', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-18","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('b4832da7-63ad-4641-b287-bc4ddb221342'::uuid, '3a2964d0-0512-4240-a335-fcb0557238a4'::uuid, 'f7b186ea-c27d-4ddb-83c9-248691747105'::uuid, 'base2', '19', 'Flareon', 'Flareon', 'first_edition_normal', 'normal', 'edition:first_edition', null, '19', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-19","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('f5f6ec2a-2603-40fd-8b29-8baa8be9a77a'::uuid, '549d3db6-c486-4d88-be89-5230fa3a6471'::uuid, 'c6071c50-bd9a-418c-b2c6-116ff72faf49'::uuid, 'base2', '20', 'Jolteon', 'Jolteon', 'first_edition_normal', 'normal', 'edition:first_edition', null, '20', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-20","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('337c3296-9e72-446e-9705-3ac9ad525cac'::uuid, '5e0d637d-da18-496d-88b9-e482a37bca6a'::uuid, '2c0c2b45-edba-4f37-81e5-a0d197518a2a'::uuid, 'base2', '21', 'Kangaskhan', 'Kangaskhan', 'first_edition_normal', 'normal', 'edition:first_edition', null, '21', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-21","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('9e9e06de-2da7-48a4-8501-3ce9bc3e3932'::uuid, 'e34d2ca8-eeec-4101-b92b-59cb368bd106'::uuid, '1b169d02-6793-4d8b-9d77-c9cdeb26ee9e'::uuid, 'base2', '22', 'Mr. Mime', 'Mr. Mime', 'first_edition_normal', 'normal', 'edition:first_edition', null, '22', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-22","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('321f60ca-a7bc-44b3-8994-d989815d2a1c'::uuid, '80737df4-9ee0-4d09-8582-990a0b0f909a'::uuid, '4bffb982-60d9-477a-9ff7-9ae335dda4e2'::uuid, 'base2', '23', 'Nidoqueen', 'Nidoqueen', 'first_edition_normal', 'normal', 'edition:first_edition', null, '23', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-23","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('6e0521c2-f743-4597-a7ad-5a6a67d7d52f'::uuid, 'a3f194a8-2fc2-4b86-b4af-e956d13893ed'::uuid, '01aeb0d6-4e41-404e-b96f-549aecc7f3b1'::uuid, 'base2', '24', 'Pidgeot', 'Pidgeot', 'first_edition_normal', 'normal', 'edition:first_edition', null, '24', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-24","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('a8b54a0c-0026-4e3b-b397-bab6e19aab96'::uuid, '745ef305-be6d-4c75-b2da-9df78ece02f8'::uuid, 'a6bffe64-1c11-4247-b772-21c5ad0dc2a5'::uuid, 'base2', '25', 'Pinsir', 'Pinsir', 'first_edition_normal', 'normal', 'edition:first_edition', null, '25', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-25","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('10560f32-3ef9-4aaf-90df-f1f319a90e4d'::uuid, 'd759026c-b2e7-4249-aedc-bf2ce6528b9d'::uuid, '08c949df-eee8-46f2-9b92-a5ec2e287e75'::uuid, 'base2', '26', 'Scyther', 'Scyther', 'first_edition_normal', 'normal', 'edition:first_edition', null, '26', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-26","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('d4a62a82-a951-4586-8467-44a5df6b88a1'::uuid, '29ef23eb-fc7e-4965-8bfd-7b20d6a37536'::uuid, '19d64ad6-bb32-43ab-a7ca-99f480cea84f'::uuid, 'base2', '27', 'Snorlax', 'Snorlax', 'first_edition_normal', 'normal', 'edition:first_edition', null, '27', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-27","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('3f2d7d60-c1fd-42f7-9cbd-716243d7465a'::uuid, '6532bd7d-479a-4c0f-95b0-0ca26d0c7b67'::uuid, 'bb8526cb-3ebe-4faa-b0cd-d0178660b0fc'::uuid, 'base2', '28', 'Vaporeon', 'Vaporeon', 'first_edition_normal', 'normal', 'edition:first_edition', null, '28', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-28","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('ed842dc0-185a-47c7-b5d0-04861f96159a'::uuid, 'af3c1b34-91ce-4ec2-a97c-3a2e57636f32'::uuid, 'a91c528e-9e42-4519-b777-3361bd9b7a58'::uuid, 'base2', '29', 'Venomoth', 'Venomoth', 'first_edition_normal', 'normal', 'edition:first_edition', null, '29', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-29","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('3ec83f43-437a-40db-817a-08bb868c63a1'::uuid, 'a5e8931b-a974-4768-a665-260aea01b0b8'::uuid, 'd84484b4-b616-4a30-a323-0de3aecfef9f'::uuid, 'base2', '30', 'Victreebel', 'Victreebel', 'first_edition_normal', 'normal', 'edition:first_edition', null, '30', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-30","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('0956a121-d8a6-4b1a-873d-8e99c4e69f9e'::uuid, '88284b92-5b3c-4ce7-a28e-21a537e5d389'::uuid, 'eca69a92-d4c0-47f2-abea-5b34cf04d64f'::uuid, 'base2', '31', 'Vileplume', 'Vileplume', 'first_edition_normal', 'normal', 'edition:first_edition', null, '31', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-31","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('8b49a770-0bba-478f-b3c1-349d926d431b'::uuid, '3bb4303b-9d15-45f2-8aa3-ddebe59deeb3'::uuid, '575b90b7-8f37-446e-828b-8511c87ef653'::uuid, 'base2', '32', 'Wigglytuff', 'Wigglytuff', 'first_edition_normal', 'normal', 'edition:first_edition', null, '32', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-32","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e3de69fc-0097-466e-b357-a31bf4c67fb6'::uuid, 'e4e56f91-5035-4a65-81cb-842b41f42699'::uuid, '2085f7ed-0882-455b-b5ce-059f7584817e'::uuid, 'base2', '33', 'Butterfree', 'Butterfree', 'first_edition_normal', 'normal', 'edition:first_edition', null, '33', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-33","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('c28b8a47-a608-4238-8ec5-e87e9d09d9e5'::uuid, '7b3871fa-2685-438a-8993-81c806583114'::uuid, 'e8b20660-7604-4e8d-a8d6-6a2e6d2586fd'::uuid, 'base2', '34', 'Dodrio', 'Dodrio', 'first_edition_normal', 'normal', 'edition:first_edition', null, '34', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-34","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e00bc4de-d6a5-49be-87a2-2ef7aca2bdf8'::uuid, '668ab5b5-022d-45c1-9ae1-45a7fc4f0a6e'::uuid, 'b0f2586f-d020-441a-b302-fd3835fb8125'::uuid, 'base2', '35', 'Exeggutor', 'Exeggutor', 'first_edition_normal', 'normal', 'edition:first_edition', null, '35', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-35","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('ed039a17-9bbf-48f5-9256-5247e77bab01'::uuid, '57b86b00-9572-4281-8ab9-66f7bb49b448'::uuid, '03e13c16-3e82-4292-9cdb-20fe0c6273a2'::uuid, 'base2', '36', 'Fearow', 'Fearow', 'first_edition_normal', 'normal', 'edition:first_edition', null, '36', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-36","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('7cb4507b-5e4d-4219-9c8e-acbe0eeb44fa'::uuid, 'cfdcf5bf-7b9c-49e4-82cb-2d2ed7e4e483'::uuid, '8ced4da3-a6c2-4818-84a5-70cc04aa0874'::uuid, 'base2', '37', 'Gloom', 'Gloom', 'first_edition_normal', 'normal', 'edition:first_edition', null, '37', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-37","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('9c326e23-09bd-456e-8832-7860e1632a64'::uuid, '934575ac-67bd-49a8-886a-a5262afd06ef'::uuid, '4f2d7d94-56f2-4cd4-b893-c77ff6f3f6e5'::uuid, 'base2', '38', 'Lickitung', 'Lickitung', 'first_edition_normal', 'normal', 'edition:first_edition', null, '38', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-38","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('d80a6cfa-dc10-459b-a795-dcec59025fe0'::uuid, '6f94f70d-091c-4fb0-8d5b-402f1dbf928a'::uuid, '8ef2ef96-4b3f-46b0-9db8-94e33f312d73'::uuid, 'base2', '39', 'Marowak', 'Marowak', 'first_edition_normal', 'normal', 'edition:first_edition', null, '39', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-39","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e136ef49-fab5-481c-8167-ea966019a619'::uuid, '6742f072-a387-4451-9669-47e6bff25ece'::uuid, '864b6e07-b926-4508-8a88-e7dad594eaab'::uuid, 'base2', '40', 'Nidorina', 'Nidorina', 'first_edition_normal', 'normal', 'edition:first_edition', null, '40', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-40","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('cb172ffb-3ed0-4159-a994-aabb093a62ec'::uuid, 'a1100d4e-32f7-491b-8152-86aa416d2f04'::uuid, 'fd3dbbd0-5893-4ae3-9c50-53c071364292'::uuid, 'base2', '41', 'Parasect', 'Parasect', 'first_edition_normal', 'normal', 'edition:first_edition', null, '41', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-41","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('6d85696b-2eca-42b8-9ec2-732a35dddf83'::uuid, 'eb60055d-ab7f-41b5-8b7e-9dead540451b'::uuid, '1296473c-ae5e-40b8-9661-2d496472d40b'::uuid, 'base2', '42', 'Persian', 'Persian', 'first_edition_normal', 'normal', 'edition:first_edition', null, '42', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-42","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('eae1fed9-3489-4761-8147-b34d948ca0f3'::uuid, '7e0cd4e2-5166-4424-a29a-ef14e31ec312'::uuid, '692ff7e5-b8ad-484c-b658-50e3710c4755'::uuid, 'base2', '43', 'Primeape', 'Primeape', 'first_edition_normal', 'normal', 'edition:first_edition', null, '43', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-43","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('021bbb83-e1dc-48c6-a801-fa2a79dd610d'::uuid, 'def285c7-bf03-4a94-b3b7-96305d863167'::uuid, '453a73dc-05af-47ab-a57b-1d17c205a68a'::uuid, 'base2', '44', 'Rapidash', 'Rapidash', 'first_edition_normal', 'normal', 'edition:first_edition', null, '44', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-44","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e76cf9ef-25f4-45ff-9f23-dae7d0196396'::uuid, 'af1860d3-5c70-4f6e-97d9-b293eae49553'::uuid, 'd881f3d7-b441-4d90-8ab6-e464078af7dd'::uuid, 'base2', '45', 'Rhydon', 'Rhydon', 'first_edition_normal', 'normal', 'edition:first_edition', null, '45', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-45","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('bcc40e6a-c6a0-446c-9b46-2b8d113e9033'::uuid, '07566973-db49-4648-bd01-010918fd0221'::uuid, 'c2ff129b-4dcc-401b-a7be-b3a19b14da46'::uuid, 'base2', '46', 'Seaking', 'Seaking', 'first_edition_normal', 'normal', 'edition:first_edition', null, '46', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-46","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('b57ae891-8af1-4210-8137-f9cdcd088a02'::uuid, '18263147-c26d-4679-b06f-ec4dd7493d4e'::uuid, '13ac80d3-7edf-4742-9301-1df119f1da5f'::uuid, 'base2', '47', 'Tauros', 'Tauros', 'first_edition_normal', 'normal', 'edition:first_edition', null, '47', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-47","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('c9d3fa85-9d95-4079-b0aa-4725ad2804c6'::uuid, '65c2fdf4-19d4-4af8-9051-efea72a5785a'::uuid, 'acda77bf-61d9-4157-82d9-6fc84f066e0f'::uuid, 'base2', '48', 'Weepinbell', 'Weepinbell', 'first_edition_normal', 'normal', 'edition:first_edition', null, '48', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-48","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('9ff402e6-14a6-4b9d-97e6-9b2db0c94893'::uuid, 'ac36acdb-d27c-4d99-afb3-2391a887350d'::uuid, 'fb34fab5-728e-46db-a9e8-ec15439af3f9'::uuid, 'base2', '49', 'Bellsprout', 'Bellsprout', 'first_edition_normal', 'normal', 'edition:first_edition', null, '49', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-49","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('11bc04d5-1083-4957-9099-1150ad3f4df3'::uuid, '8b652443-126f-4f54-93ad-d1a7a365da3d'::uuid, 'f1f0462c-805f-4a17-bddc-bf9bf09ad3d0'::uuid, 'base2', '50', 'Cubone', 'Cubone', 'first_edition_normal', 'normal', 'edition:first_edition', null, '50', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-50","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e5e59ece-e0cd-407c-8ba5-288198eaea73'::uuid, '1b8be1d9-cf6d-4fa5-917c-f8cb1394ae27'::uuid, '60fedecd-1fd8-402a-ad46-a8d407608bf9'::uuid, 'base2', '51', 'Eevee', 'Eevee', 'first_edition_normal', 'normal', 'edition:first_edition', null, '51', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-51","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('2f385267-d556-4174-a5f8-eb6b60a10fd1'::uuid, 'c90e8aee-2061-4d91-95d2-d1c927928259'::uuid, '6bb7f047-4192-4e1a-866b-6b1863de6873'::uuid, 'base2', '52', 'Exeggcute', 'Exeggcute', 'first_edition_normal', 'normal', 'edition:first_edition', null, '52', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-52","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('7d226c91-6076-4f5e-93fb-fcd27c807619'::uuid, 'ab0c63bb-a164-46b4-938c-637ee07c9211'::uuid, '70a81042-5668-48e4-80e6-54ba4909a1ec'::uuid, 'base2', '53', 'Goldeen', 'Goldeen', 'first_edition_normal', 'normal', 'edition:first_edition', null, '53', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-53","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('ad368c93-6d14-4faf-9be3-e5e7809fcb88'::uuid, '707119a9-565a-4df4-bc25-e26f849a3f62'::uuid, '9bdf1ee6-5db0-4738-b695-e6281637a525'::uuid, 'base2', '54', 'Jigglypuff', 'Jigglypuff', 'first_edition_normal', 'normal', 'edition:first_edition', null, '54', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-54","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('8e1a90a3-b415-462a-9073-9a3705bb8f0e'::uuid, 'c14fd117-6f23-4d36-87e6-08be48504a9e'::uuid, '90da3a73-d141-4cc4-8db0-808fc7876fe0'::uuid, 'base2', '55', 'Mankey', 'Mankey', 'first_edition_normal', 'normal', 'edition:first_edition', null, '55', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-55","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('18c57b0c-f585-4114-8c83-ca269b87bfc3'::uuid, '0b53af0f-a334-4cff-9243-df1bf9cc3d2b'::uuid, '1977d1fa-1593-4372-b905-21eaf988d704'::uuid, 'base2', '56', 'Meowth', 'Meowth', 'first_edition_normal', 'normal', 'edition:first_edition', null, '56', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-56","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('b0fe6289-d06e-4073-8d74-a58f30915eaf'::uuid, '6c94473c-ce34-4f6a-af93-715755d29598'::uuid, '29c35216-ec8e-4230-ad89-cb71ea70b3b5'::uuid, 'base2', '57', 'Nidoran♀', 'Nidoran ♀', 'first_edition_normal', 'normal', 'edition:first_edition', null, '57', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-57","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('11174ca4-926f-41f1-86c4-4a8ce939cad5'::uuid, 'd949e8ad-df9c-42bf-ab2d-34fa3149737a'::uuid, '10d87586-94eb-4256-9215-d81f3404ca16'::uuid, 'base2', '58', 'Oddish', 'Oddish', 'first_edition_normal', 'normal', 'edition:first_edition', null, '58', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-58","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('6493748b-f022-4b1b-b4c1-1b8ecb53ef86'::uuid, '7e469cde-4ea2-4865-a6f8-5e69b7811238'::uuid, 'b310769e-9df2-470b-86df-e6cd64c70a19'::uuid, 'base2', '59', 'Paras', 'Paras', 'first_edition_normal', 'normal', 'edition:first_edition', null, '59', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-59","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('ef10cd2c-f954-4100-ac75-516fee7dc4fe'::uuid, '29d2a62e-ac09-46ee-8b65-25e2239582d0'::uuid, '4738ca2e-3071-4e80-90a7-0e615e132482'::uuid, 'base2', '60', 'Pikachu', 'Pikachu', 'first_edition_normal', 'normal', 'edition:first_edition', null, '60', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-60","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('37451848-cd10-4686-9010-206fc3986294'::uuid, '691a6db7-821f-497c-9abe-a3dcfdd4e371'::uuid, '1f7d182d-b78b-4a1c-8c51-a3c30bed848a'::uuid, 'base2', '61', 'Rhyhorn', 'Rhyhorn', 'first_edition_normal', 'normal', 'edition:first_edition', null, '61', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-61","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('5b801485-f317-4fb5-9307-9c660ed0e3a4'::uuid, 'c4322a14-92af-4a9b-91dd-188eb2c052cb'::uuid, '11ba2c21-4244-4dc3-83ca-b9d1af604e84'::uuid, 'base2', '62', 'Spearow', 'Spearow', 'first_edition_normal', 'normal', 'edition:first_edition', null, '62', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-62","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('192e4b3b-fadf-4b3c-b9cd-972047e26e82'::uuid, 'cfcb8e73-e0a1-4392-8478-8ba1f5e6beb2'::uuid, 'e9b344c4-0cdb-4248-8dfe-fe2dbbb1618f'::uuid, 'base2', '63', 'Venonat', 'Venonat', 'first_edition_normal', 'normal', 'edition:first_edition', null, '63', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-63","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb),
  ('e69acb87-4758-42ba-91c3-816d80ecc5bb'::uuid, '0014d98e-64a3-4469-bb66-db550bf6b625'::uuid, '89132b0b-a65f-41db-a6f7-de8d23661958'::uuid, 'base2', '64', 'Poké Ball', 'Poké Ball', 'first_edition_normal', 'normal', 'edition:first_edition', null, '64', '{"sources":["tcgdex","thepricedex_price_list"],"evidence_urls":["https://api.tcgdex.net/v2/en/cards/base2-64","https://www.thepricedex.com/set/base2/jungle/price-list"],"package_id":"PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT"}'::jsonb);

do $$
declare
  target_count int;
  set_count int;
  missing_base_count int;
  inactive_finish_count int;
  parent_collision_count int;
  child_collision_count int;
begin
  select count(*) into target_count from pkg10ba_targets;
  select count(distinct set_key) into set_count from pkg10ba_targets;
  select count(*) into missing_base_count
  from pkg10ba_targets target
  left join public.card_prints base on base.id = target.base_parent_id
  where base.id is null;
  select count(*) into inactive_finish_count
  from pkg10ba_targets target
  left join public.finish_keys fk
    on fk.key = target.target_finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into parent_collision_count
  from pkg10ba_targets target
  join public.card_prints base on base.id = target.base_parent_id
  join public.card_prints cp
    on cp.set_id = base.set_id
   and cp.number_plain = base.number_plain
   and coalesce(cp.printed_identity_modifier, '') = target.target_printed_identity_modifier
   and coalesce(cp.variant_key, '') = coalesce(target.target_variant_key, '');
  select count(*) into child_collision_count
  from pkg10ba_targets target
  join public.card_printings cpr on cpr.id = target.target_child_id;

  if target_count <> 64 then raise exception 'PKG-10BA target count drift: %', target_count; end if;
  if set_count <> 1 then raise exception 'PKG-10BA set count drift: %', set_count; end if;
  if missing_base_count <> 0 then raise exception 'PKG-10BA missing base parents: %', missing_base_count; end if;
  if inactive_finish_count <> 0 then raise exception 'PKG-10BA inactive target finishes: %', inactive_finish_count; end if;
  if parent_collision_count <> 0 then raise exception 'PKG-10BA proposed parent collisions: %', parent_collision_count; end if;
  if child_collision_count <> 0 then raise exception 'PKG-10BA planned child id collisions: %', child_collision_count; end if;
end $$;

insert into public.card_prints (
  id,
  game_id,
  set_id,
  name,
  number,
  variant_key,
  rarity,
  image_url,
  tcgplayer_id,
  external_ids,
  updated_at,
  set_code,
  artist,
  regulation_mark,
  image_alt_url,
  image_source,
  variants,
  created_at,
  last_synced_at,
  print_identity_key,
  ai_metadata,
  image_hash,
  data_quality_flags,
  image_status,
  image_res,
  image_last_checked_at,
  printed_set_abbrev,
  printed_total,
  gv_id,
  image_path,
  identity_domain,
  printed_identity_modifier,
  set_identity_model,
  representative_image_url,
  image_note
)
select
  target.target_parent_id,
  base.game_id,
  base.set_id,
  target.target_card_name,
  base.number,
  target.target_variant_key,
  base.rarity,
  base.image_url,
  null,
  jsonb_build_object('verified_master_index_v1', target.evidence),
  now(),
  base.set_code,
  base.artist,
  base.regulation_mark,
  base.image_alt_url,
  base.image_source,
  base.variants,
  now(),
  now(),
  base.print_identity_key,
  coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
    'source', 'verified_master_set_index_v1',
    'package_id', 'PKG-10B-A-FIRST-EDITION-PARENT-IDENTITY-DRY-RUN-PILOT',
    'source_package_id', 'PKG-10B-FIRST-EDITION-CANONICAL-PARENT-READINESS',
    'first_edition_base_parent_id', base.id::text
  ),
  base.image_hash,
  base.data_quality_flags,
  base.image_status,
  base.image_res,
  base.image_last_checked_at,
  base.printed_set_abbrev,
  base.printed_total,
  null,
  base.image_path,
  base.identity_domain,
  target.target_printed_identity_modifier,
  base.set_identity_model,
  base.representative_image_url,
  'first edition parent identity dry-run clone; rollback only'
from pkg10ba_targets target
join public.card_prints base on base.id = target.base_parent_id;

insert into public.card_printings (
  id,
  card_print_id,
  finish_key,
  created_at,
  is_provisional,
  provenance_source,
  provenance_ref,
  created_by,
  printing_gv_id,
  image_source,
  image_path,
  image_url,
  image_alt_url,
  image_status,
  image_note
)
select
  target.target_child_id,
  target.target_parent_id,
  target.target_finish_key,
  now(),
  false,
  'verified_master_set_index_v1',
  concat(target.set_key, ':', target.card_number, ':', target.source_finish_key, '->', target.target_finish_key),
  'pkg10ba_first_edition_parent_identity_guarded_dry_run_v1',
  null,
  null,
  null,
  null,
  null,
  null,
  'first edition child printing dry-run; rollback only'
from pkg10ba_targets target;

do $$
declare
  inserted_parent_count int;
  inserted_child_count int;
begin
  select count(*) into inserted_parent_count
  from public.card_prints cp
  join pkg10ba_targets target on target.target_parent_id = cp.id;
  select count(*) into inserted_child_count
  from public.card_printings cpr
  join pkg10ba_targets target on target.target_child_id = cpr.id;

  if inserted_parent_count <> 64 then raise exception 'PKG-10BA inserted parent count drift: %', inserted_parent_count; end if;
  if inserted_child_count <> 64 then raise exception 'PKG-10BA inserted child count drift: %', inserted_child_count; end if;
end $$;

rollback;

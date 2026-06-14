-- PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: 3c7f3c848dae292c9fdd9fa0236b7455266bfa0e92a41038066377e08a93d911
-- Scope: 40 external mapping relocations and 40 unsupported source child deletes.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg31b_targets (
  mapping_id uuid primary key,
  source_card_printing_id uuid not null,
  target_card_printing_id uuid not null,
  mapping_source text not null,
  external_id text not null,
  source_set_code text not null,
  source_number text not null,
  source_card_name text not null,
  finish_key text not null,
  target_set_code text not null,
  target_number text not null,
  target_card_name text not null,
  target_rule text not null
) on commit drop;

insert into pkg31b_targets (
  mapping_id,
  source_card_printing_id,
  target_card_printing_id,
  mapping_source,
  external_id,
  source_set_code,
  source_number,
  source_card_name,
  finish_key,
  target_set_code,
  target_number,
  target_card_name,
  target_rule
) values
  ('d81f6006-dc7f-406c-ba07-18efcca44c61'::uuid, 'afaf483c-52b4-438a-ade1-b45b18f668be'::uuid, '367ce13c-79e0-421d-a880-d9e2652d9aca'::uuid, 'tcgdex', 'ecard2-H10', 'ecard2', '10', 'Entei', 'holo', 'ecard2', 'H10', 'Exeggutor', 'h_number_external_id'),
  ('e2a73fc9-4bcb-43d4-9ab1-ccbcb15f022e'::uuid, 'fbeeac56-4482-461e-8d98-f58b5060cb10'::uuid, 'fccaccf1-3a72-49c9-a6a2-de7b9a725e15'::uuid, 'tcgdex', 'ecard2-H14', 'ecard2', '14', 'Houndoom', 'holo', 'ecard2', 'H14', 'Kingdra', 'h_number_external_id'),
  ('f18cc607-9080-436c-9f49-1a9e31f1307b'::uuid, '74325a25-3b1b-42c2-acfd-e41e8e739108'::uuid, '9dcda8d8-b577-40e3-a9a2-455adfe639ce'::uuid, 'tcgdex', 'ecard2-H21', 'ecard2', '21', 'Lanturn', 'holo', 'ecard2', 'H21', 'Scizor', 'h_number_external_id'),
  ('2257692c-85cd-496f-9ee4-3d26e17663c0'::uuid, '66d00c8c-782c-45d7-a1e4-fd7f8195e728'::uuid, '4091404e-6afb-44b7-9e3a-a78ad11a1260'::uuid, 'tcgdex', 'ecard2-H22', 'ecard2', '22', 'Magneton', 'holo', 'ecard2', 'H22', 'Slowking', 'h_number_external_id'),
  ('8b61ffd2-418e-412d-a203-ba5acf56f400'::uuid, 'be2b20d2-e437-44e7-9da6-93a95b8e0819'::uuid, '0ba53c4f-63b2-454d-9486-095781ada106'::uuid, 'tcgdex', 'ecard2-H23', 'ecard2', '23', 'Muk', 'holo', 'ecard2', 'H23', 'Steelix', 'h_number_external_id'),
  ('64d261f1-f1cb-4a39-9413-dd2894eb2d3f'::uuid, 'deb15d88-dd82-43f0-9bb3-02b7085e964a'::uuid, '35078974-b52e-4df8-9d41-0a95c3652619'::uuid, 'tcgdex', 'ecard2-H24', 'ecard2', '24', 'Nidoking', 'holo', 'ecard2', 'H24', 'Sudowoodo', 'h_number_external_id'),
  ('620938db-8342-4b0f-990d-3e2ecaeadbd0'::uuid, 'dd1608f4-88a1-4a43-992f-188af2d2ec6f'::uuid, 'e3f73eb7-6951-4066-bdd7-565436a08aa8'::uuid, 'tcgdex', 'ecard2-H26', 'ecard2', '26', 'Octillery', 'holo', 'ecard2', 'H26', 'Tentacruel', 'h_number_external_id'),
  ('5be4f299-30b4-40b9-88b2-3c87c3cdf1c6'::uuid, '3d61954d-de69-4fbf-aaaf-adc218d11eeb'::uuid, '7261712b-2f55-4a6e-90ee-8fce6a7b0998'::uuid, 'tcgdex', 'ecard2-H27', 'ecard2', '27', 'Parasect', 'holo', 'ecard2', 'H27', 'Togetic', 'h_number_external_id'),
  ('b1ba4d38-47c5-4c0e-87a1-6594f9ee7d18'::uuid, '2f0a8560-e8ed-4ec4-a57b-b837c8ef8e46'::uuid, 'b273df12-870c-4608-8c72-d94b2614f20e'::uuid, 'tcgdex', 'ecard2-H29', 'ecard2', '29', 'Primeape', 'holo', 'ecard2', 'H29', 'Umbreon', 'h_number_external_id'),
  ('b0eb2134-716c-4e22-8b93-3d50737cb79f'::uuid, 'c4964e79-0c11-445b-ac7b-f1b29a96849f'::uuid, '4b60a8dc-fcd5-42dd-9883-e09d8859b632'::uuid, 'tcgdex', 'ecard2-H31', 'ecard2', '31', 'Rapidash', 'holo', 'ecard2', 'H31', 'Vileplume', 'h_number_external_id'),
  ('c1c260cf-9281-4a7d-88f8-88a7a80af136'::uuid, '51ac008a-46ce-4517-a44a-72c147a44009'::uuid, 'a8d3ef98-d370-4d6e-8782-46667b5462a6'::uuid, 'tcgdex', 'ecard3-H13', 'ecard3', '13', 'Jolteon', 'holo', 'ecard3', 'H13', 'Kabutops', 'h_number_external_id'),
  ('08d2657e-b4d7-4b28-a100-46f50f17a961'::uuid, 'c6000245-367b-4851-80aa-abf32ac58311'::uuid, '54de4733-b7c7-43af-a9b8-d8bc772bc099'::uuid, 'tcgdex', 'ecard3-H14', 'ecard3', '14', 'Kabutops', 'holo', 'ecard3', 'H14', 'Ledian', 'h_number_external_id'),
  ('862c3d4d-de7f-4ddc-af4d-13364234fc72'::uuid, '62ec8356-2235-409a-8de5-2b977bf7bf32'::uuid, 'efa663a9-aefc-49f7-b902-2af533891e98'::uuid, 'tcgdex', 'ecard3-H16', 'ecard3', '16', 'Machamp', 'holo', 'ecard3', 'H16', 'Magcargo', 'h_number_external_id'),
  ('1df84f2f-792c-472d-8ba3-4e75f39c3672'::uuid, 'dbe329ea-1e1e-49f7-be24-b29f0adcff78'::uuid, 'bb5904ea-d09f-4e11-83fc-440bcf428744'::uuid, 'tcgdex', 'ecard3-H18', 'ecard3', '18', 'Magcargo', 'holo', 'ecard3', 'H18', 'Magneton', 'h_number_external_id'),
  ('2bc00fe4-3c1d-4bd8-9976-b631d4e494cb'::uuid, 'a1e887f0-17c4-4231-8843-e6d55bb07850'::uuid, '3c1c7a1d-f330-4e2f-98d7-26ee2d1ac481'::uuid, 'tcgdex', 'ecard3-H22', 'ecard3', '22', 'Nidoqueen', 'holo', 'ecard3', 'H22', 'Piloswine', 'h_number_external_id'),
  ('9aaa0dc6-483d-4508-aa12-0453c0114f1f'::uuid, 'aa950ba8-cd0c-460c-a387-14a75eaf4039'::uuid, 'e346d49c-483d-4aac-b6af-5253ff52e2be'::uuid, 'tcgdex', 'ecard3-H23', 'ecard3', '23', 'Omastar', 'holo', 'ecard3', 'H23', 'Politoed', 'h_number_external_id'),
  ('c3573925-92d7-43d0-8a2f-e77eff491045'::uuid, '71203435-92f1-4dfb-ae4c-c4356bbd7bec'::uuid, '0f6d8bf1-6c07-469f-8252-a137c4a77c8b'::uuid, 'tcgdex', 'ecard3-H24', 'ecard3', '24', 'Piloswine', 'holo', 'ecard3', 'H24', 'Poliwrath', 'h_number_external_id'),
  ('f4fbc538-5467-4eef-9553-0806ed661004'::uuid, '7e401b86-f243-41ff-9612-29f6d0bddbd6'::uuid, 'c056acd1-ffe3-44ad-b9dc-14ad3fb20f2d'::uuid, 'tcgdex', 'ecard3-H27', 'ecard3', '27', 'Raichu', 'holo', 'ecard3', 'H27', 'Rhydon', 'h_number_external_id'),
  ('17118cfb-a810-4664-a47d-4e0c599a25c3'::uuid, '05f8063f-42b7-4f19-ad99-6c667ae34e9c'::uuid, '17d43c10-4667-4904-b136-15a473437c51'::uuid, 'tcgdex', 'ecard3-H30', 'ecard3', '30', 'Starmie', 'holo', 'ecard3', 'H30', 'Umbreon', 'h_number_external_id'),
  ('7b122623-24b9-48e6-bbcc-525e4595ba2a'::uuid, 'cb056e44-5d37-4825-bae8-dcde9697a2fc'::uuid, '42f46500-4ba9-4f85-8e73-bb15d211204e'::uuid, 'tcgdex', 'ecard3-H31', 'ecard3', '31', 'Steelix', 'holo', 'ecard3', 'H31', 'Vaporeon', 'h_number_external_id'),
  ('22bcd50e-b03b-4850-ba64-e33d496f6585'::uuid, '772ad84d-9946-4342-bd56-32a2ce5f7db1'::uuid, 'e4f55064-20ae-43a5-a43f-21467f17f2b6'::uuid, 'tcgdex', 'swsh12-TG10', 'swsh12', '10', 'Hisuian Lilligant', 'holo', 'swsh12tg', 'TG10', 'Smeargle', 'trainer_gallery_external_id'),
  ('1a772520-6845-4502-8efa-ce5107cb08ed'::uuid, 'f495ab50-49c1-44e7-95f1-6b0f4d253a72'::uuid, 'c4be7750-2255-42b5-8dd4-b33a82f66dd8'::uuid, 'tcgdex', 'swsh12-TG11', 'swsh12', '11', 'Foongus', 'holo', 'swsh12tg', 'TG11', 'Altaria', 'trainer_gallery_external_id'),
  ('fc92847f-1371-44a9-890e-7409bae51a41'::uuid, '8484b671-8156-4862-bfca-fdc2f984451d'::uuid, '26d12800-9baa-4806-a78c-1590603de86d'::uuid, 'tcgdex', 'swsh12-TG13', 'swsh12', '13', 'Durant', 'holo', 'swsh12tg', 'TG13', 'Serperior V', 'trainer_gallery_external_id'),
  ('313b2592-69a9-4f53-8fa7-d11cd8aa102c'::uuid, '369d34bf-a1cd-44b0-abab-6d5bb9931d36'::uuid, 'd6a2cce7-1685-468b-8399-a988c97aa464'::uuid, 'tcgdex', 'swsh12-TG17', 'swsh12', '17', 'Vulpix', 'holo', 'swsh12tg', 'TG17', 'Mawile V', 'trainer_gallery_external_id'),
  ('309d97c8-022b-4563-8406-eb49c91aa264'::uuid, '4ab8a612-2a74-4c7e-90d4-ae444c396e00'::uuid, '8d79a8b2-26f7-42bc-90be-0ba8c9481483'::uuid, 'tcgdex', 'swsh12-TG18', 'swsh12', '18', 'Ninetales', 'holo', 'swsh12tg', 'TG18', 'Corviknight V', 'trainer_gallery_external_id'),
  ('fb6eda81-89a7-489d-bf56-0b452ea2fae7'::uuid, 'f769c759-b5b6-413f-895b-14f91337ae11'::uuid, 'ba8e9396-2158-4115-8e19-e6039e7fabd7'::uuid, 'tcgdex', 'swsh12-TG19', 'swsh12', '19', 'Growlithe', 'holo', 'swsh12tg', 'TG19', 'Corviknight VMAX', 'trainer_gallery_external_id'),
  ('cf0daa62-9110-4dca-ab7e-ad388c066c8c'::uuid, '1fde69ac-8a5e-4c42-8f68-8e103c5ad599'::uuid, '8b95eaa8-b7e1-4d76-b7d4-9836006cc99a'::uuid, 'tcgdex', 'swsh12-TG20', 'swsh12', '20', 'Arcanine', 'holo', 'swsh12tg', 'TG20', 'Rayquaza VMAX', 'trainer_gallery_external_id'),
  ('1a736ff4-55d9-493f-872e-d1b7031e5bb0'::uuid, '7c1bea86-ef34-40b7-ac14-9c793e9f6115'::uuid, '5a44d032-fe2c-4422-a801-c467d614f75e'::uuid, 'tcgdex', 'swsh12-TG21', 'swsh12', '21', 'Ponyta', 'holo', 'swsh12tg', 'TG21', 'Duraludon VMAX', 'trainer_gallery_external_id'),
  ('e27806d6-bd20-40ad-b58c-6e9cefad3824'::uuid, '531a7f28-6eb6-4554-90d8-2fe661ebc0d9'::uuid, '4aacc239-7709-4033-bbbc-61ffca35fdc9'::uuid, 'tcgdex', 'swsh12-TG26', 'swsh12', '26', 'Braixen', 'holo', 'swsh12tg', 'TG26', 'Professor Burnet', 'trainer_gallery_external_id'),
  ('af46417a-9f9c-497e-b507-6302873c34e7'::uuid, '530e1b5a-d164-4baf-9223-766a0b353483'::uuid, 'caf9e815-3cd2-4c50-a651-7b41419f0a37'::uuid, 'tcgdex', 'swsh12-TG27', 'swsh12', '27', 'Delphox', 'holo', 'swsh12tg', 'TG27', 'Raihan', 'trainer_gallery_external_id'),
  ('44bf5ec8-d33c-4e71-9e69-5f360cd95fd9'::uuid, '239b3344-b641-4b51-b9ca-dec5cfd63e70'::uuid, 'e60c1a37-7b50-428a-b6a6-367c7bc5ddd0'::uuid, 'tcgdex', 'swsh12-TG28', 'swsh12', '28', 'Fletchinder', 'holo', 'swsh12tg', 'TG28', 'Sordward & Shielbert', 'trainer_gallery_external_id'),
  ('086a12f7-59ca-463a-bbae-97a4cb2d6c46'::uuid, '095a8e79-fcff-4dd8-b803-a83e56db6dad'::uuid, '95b663f2-fa7e-4739-a278-4c6a2a00f2c3'::uuid, 'tcgdex', 'swsh12-TG29', 'swsh12', '29', 'Talonflame', 'holo', 'swsh12tg', 'TG29', 'Rayquaza VMAX', 'trainer_gallery_external_id'),
  ('17044a4e-8e5e-426e-a249-e80e87f0af2c'::uuid, '055d93f0-de68-4580-b698-1aa337fa1c45'::uuid, '8db2c2a0-c6f7-4fc6-b0e2-7ce0a8ff3930'::uuid, 'tcgdex', 'swsh12-TG30', 'swsh12', '30', 'Litten', 'holo', 'swsh12tg', 'TG30', 'Duraludon VMAX', 'trainer_gallery_external_id'),
  ('00f96b3e-903f-46f9-b60f-e87a70b6a8a3'::uuid, 'd9832ad2-9b7f-4271-9193-0a52b7af24dc'::uuid, '18941005-d40d-4d51-9618-0fc47e8eac6d'::uuid, 'tcgdex', 'swsh9-TG10', 'swsh9', '10', 'Wormadam', 'holo', 'swsh9tg', 'TG10', 'Houndoom', 'trainer_gallery_external_id'),
  ('e30a86b4-8dd7-42fe-bb44-471bc9499b75'::uuid, 'cf1628aa-11d2-4959-8814-ec3d8aa87e21'::uuid, '7b6957d1-6052-4cf0-92b8-6b1f2d732e21'::uuid, 'tcgdex', 'swsh9-TG12', 'swsh9', '12', 'Cherubi', 'holo', 'swsh9tg', 'TG12', 'Oranguru', 'trainer_gallery_external_id'),
  ('a7724362-338e-4a8c-9730-b37ee7266eb2'::uuid, '9e6ff854-6bdc-455b-be78-8f6605570969'::uuid, '2f7f0c13-bb27-46a4-a897-2f25247e8aa5'::uuid, 'tcgdex', 'swsh9-TG15', 'swsh9', '15', 'Karrablast', 'holo', 'swsh9tg', 'TG15', 'Sylveon VMAX', 'trainer_gallery_external_id'),
  ('ea67a370-ed54-4a93-bb10-7f66b3fb8b4f'::uuid, 'a8189c8b-32cf-467e-9393-27d0781d5912'::uuid, '49d0dd53-6d50-4a82-86e8-87849ed74c3d'::uuid, 'tcgdex', 'swsh9-TG19', 'swsh9', '19', 'Magmar', 'holo', 'swsh9tg', 'TG19', 'Single Strike Urshifu VMAX', 'trainer_gallery_external_id'),
  ('4dbb5d67-b3b3-4f36-be95-0390860cf1c0'::uuid, '8c3172e9-e923-4626-a35e-f34b6fd5371c'::uuid, 'f7d6b1a3-e16b-49cd-ad25-df27db62eecd'::uuid, 'tcgdex', 'swsh9-TG20', 'swsh9', '20', 'Magmortar', 'holo', 'swsh9tg', 'TG20', 'Rapid Strike Urshifu V', 'trainer_gallery_external_id'),
  ('96a2da43-dc14-4171-bd6b-8d806f5c87e6'::uuid, '22d03372-5b83-4925-966b-77a1835b6797'::uuid, '5ec97c3e-5686-4ec2-aa9e-fcb2d5d28ef9'::uuid, 'tcgdex', 'swsh9-TG23', 'swsh9', '23', 'Torkoal', 'holo', 'swsh9tg', 'TG23', 'Umbreon VMAX', 'trainer_gallery_external_id'),
  ('b9f8b12e-50fd-42e6-a0ef-1223656e3187'::uuid, '2b6c724f-c4f2-4744-90bc-8191f4ce3f15'::uuid, '96af9310-93dd-407d-88ee-04bdb6f807bb'::uuid, 'tcgdex', 'swsh9-TG24', 'swsh9', '24', 'Chimchar', 'holo', 'swsh9tg', 'TG24', 'Acerola''s Premonition', 'trainer_gallery_external_id');

do $$
declare
  v_targets integer;
  v_bad_mapping_refs integer;
  v_bad_source_children integer;
  v_bad_target_children integer;
  v_duplicate_target_mappings integer;
  v_other_external_mapping_refs integer;
  v_vault_refs integer;
  v_warehouse_refs integer;
  v_truth_refs integer;
  v_justtcg_refs integer;
  v_updated integer;
  v_deleted integer;
begin
  select count(*) into v_targets from pkg31b_targets;
  if v_targets <> 40 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE target guard failed: expected 40, got %', v_targets;
  end if;

  select count(*) into v_bad_mapping_refs
  from pkg31b_targets t
  left join public.external_printing_mappings em on em.id = t.mapping_id
  where em.id is null
     or em.card_printing_id <> t.source_card_printing_id
     or em.source <> t.mapping_source
     or em.external_id <> t.external_id;
  if v_bad_mapping_refs <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE mapping ownership guard failed: %', v_bad_mapping_refs;
  end if;

  select count(*) into v_bad_source_children
  from pkg31b_targets t
  left join public.card_printings source_child on source_child.id = t.source_card_printing_id
  left join public.card_prints source_parent on source_parent.id = source_child.card_print_id
  where source_child.id is null
     or source_child.finish_key <> t.finish_key
     or lower(source_parent.set_code) <> lower(t.source_set_code)
     or lower(coalesce(source_parent.number, '')) <> lower(t.source_number)
     or source_parent.name <> t.source_card_name;
  if v_bad_source_children <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE source child guard failed: %', v_bad_source_children;
  end if;

  select count(*) into v_bad_target_children
  from pkg31b_targets t
  left join public.card_printings target_child on target_child.id = t.target_card_printing_id
  left join public.card_prints target_parent on target_parent.id = target_child.card_print_id
  where target_child.id is null
     or target_child.id = t.source_card_printing_id
     or target_child.finish_key <> t.finish_key
     or lower(target_parent.set_code) <> lower(t.target_set_code)
     or lower(coalesce(target_parent.number, '')) <> lower(t.target_number)
     or target_parent.name <> t.target_card_name;
  if v_bad_target_children <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE target child guard failed: %', v_bad_target_children;
  end if;

  select count(*) into v_duplicate_target_mappings
  from pkg31b_targets t
  join public.external_printing_mappings em
    on em.card_printing_id = t.target_card_printing_id
   and em.source = t.mapping_source
   and em.external_id = t.external_id
   and em.id <> t.mapping_id;
  if v_duplicate_target_mappings <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE target duplicate mapping guard failed: %', v_duplicate_target_mappings;
  end if;

  select count(*) into v_other_external_mapping_refs
  from public.external_printing_mappings em
  join pkg31b_targets t on t.source_card_printing_id = em.card_printing_id
  where em.id <> t.mapping_id;
  if v_other_external_mapping_refs <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE source child extra external mapping guard failed: %', v_other_external_mapping_refs;
  end if;

  if to_regclass('public.vault_item_instances') is not null then
    select count(*) into v_vault_refs
    from public.vault_item_instances vii
    join pkg31b_targets t on t.source_card_printing_id = vii.card_printing_id
    where vii.archived_at is null;
  else
    v_vault_refs := 0;
  end if;
  if v_vault_refs <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE vault dependency guard failed: %', v_vault_refs;
  end if;

  if to_regclass('public.canon_warehouse_candidates') is not null then
    select count(*) into v_warehouse_refs
    from public.canon_warehouse_candidates cwc
    join pkg31b_targets t on t.source_card_printing_id = cwc.promoted_card_printing_id;
  else
    v_warehouse_refs := 0;
  end if;
  if v_warehouse_refs <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE warehouse dependency guard failed: %', v_warehouse_refs;
  end if;

  if to_regclass('public.card_printing_truth_reviews') is not null then
    select count(*) into v_truth_refs
    from public.card_printing_truth_reviews tr
    join pkg31b_targets t on t.source_card_printing_id = tr.card_printing_id;
  else
    v_truth_refs := 0;
  end if;
  if v_truth_refs <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE truth review dependency guard failed: %', v_truth_refs;
  end if;

  if to_regclass('public.justtcg_grookai_mappings') is not null then
    select count(*) into v_justtcg_refs
    from public.justtcg_grookai_mappings jgm
    join pkg31b_targets t on t.source_card_printing_id = jgm.card_printing_id;
  else
    v_justtcg_refs := 0;
  end if;
  if v_justtcg_refs <> 0 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE justtcg dependency guard failed: %', v_justtcg_refs;
  end if;

  update public.external_printing_mappings em
  set
    card_printing_id = t.target_card_printing_id,
    meta = coalesce(em.meta, '{}'::jsonb)
      || jsonb_build_object(
        'pkg31b_transferred_from_card_printing_id', t.source_card_printing_id::text,
        'pkg31b_transfer_reason', 'external id resolves to existing Master-verified target child',
        'pkg31b_target_rule', t.target_rule,
        'pkg31b_package_fingerprint', '3c7f3c848dae292c9fdd9fa0236b7455266bfa0e92a41038066377e08a93d911'
      )
  from pkg31b_targets t
  where em.id = t.mapping_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 40 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE mapping update guard failed: expected 40, got %', v_updated;
  end if;

  delete from public.card_printings cpr
  using pkg31b_targets t
  where cpr.id = t.source_card_printing_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 40 then
    raise exception 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE child delete guard failed: expected 40, got %', v_deleted;
  end if;

  raise notice 'PKG-31B-EXTERNAL-ID-RELOCATION-CHILD-DELETE dry-run passed: mappings transferred %, source children deleted %, fingerprint 3c7f3c848dae292c9fdd9fa0236b7455266bfa0e92a41038066377e08a93d911', v_updated, v_deleted;
end $$;

rollback;

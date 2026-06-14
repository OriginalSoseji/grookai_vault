-- English Master Index PKG-06J-ACTIVE-FINISH-CHILD-PRINTING-INSERTS guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source readiness fingerprint: 6063892190519f7b48b87f46e4c7d556ad12333655ab0c2aef3149d1da2764f7
-- Package fingerprint: 5bae5af1da3258540c9d010c88023fa4ea668bacde0db12bc454e0a4ec6f2879

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create temporary table pkg06j_active_child_printings (
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

insert into pkg06j_active_child_printings (
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
  ('4bcc20dd-43d3-4466-addb-5a7b02742915'::uuid, '2c5d16d6-8cdc-4035-a390-5098ca9c6194'::uuid, '2017sm', '1', 'Rowlet', 'holo', 'verified_master_set_index_v1', '2017sm:1:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('414df941-ae62-434d-b375-4c247e8c354a'::uuid, 'ddd31e27-9b06-48b1-8147-270a9690ef66'::uuid, '2017sm', '3', 'Litten', 'holo', 'verified_master_set_index_v1', '2017sm:3:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('7424a98a-6db6-4b03-a389-8b5bb11acc99'::uuid, 'd9dae53e-9683-4c01-b587-10590e0d121d'::uuid, '2017sm', '8', 'Alolan Meowth', 'holo', 'verified_master_set_index_v1', '2017sm:8:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('47fc46cf-2e1d-49d3-ab75-0ba20f3e16fe'::uuid, '40b70c25-20b6-4888-8cf0-88bc6da7cfce'::uuid, '2017sm', '10', 'Cutiefly', 'holo', 'verified_master_set_index_v1', '2017sm:10:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('bdbde8d1-90c8-4d57-89b6-163dae2686b8'::uuid, '5b720829-30a0-42cf-9203-6e01fa50fff7'::uuid, '2017sm', '11', 'Pikipek', 'holo', 'verified_master_set_index_v1', '2017sm:11:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('a7e6c358-8347-40c7-b7a3-1b06e6f3e3c0'::uuid, 'abc1a7d0-5bc6-46f9-a2ef-76d156c9c719'::uuid, '2017sm', '12', 'Yungoos', 'holo', 'verified_master_set_index_v1', '2017sm:12:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('edddd688-e64b-40eb-9e1c-04a933663c6e'::uuid, 'd09c0912-9a8d-45dd-a276-09da28bab494'::uuid, '2022swsh', '2', 'Rowlet', 'holo', 'verified_master_set_index_v1', '2022swsh:2:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('2d97e430-2a72-4ee6-97a1-6af98218146d'::uuid, '1c4759db-9b50-45d0-9c0b-655977006168'::uuid, '2022swsh', '3', 'Gossifleur', 'holo', 'verified_master_set_index_v1', '2022swsh:3:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('337bbe0a-6d13-44e4-9237-e0d6765fec6c'::uuid, '98b5e8e1-99c6-4c6e-9d89-ed1accb2dfb6'::uuid, '2022swsh', '4', 'Growlithe', 'holo', 'verified_master_set_index_v1', '2022swsh:4:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('648cf97f-8254-4206-9644-4a92d35218cd'::uuid, '60efdde4-8b1e-4d21-b2d5-c8163d93691d'::uuid, '2022swsh', '5', 'Victini', 'holo', 'verified_master_set_index_v1', '2022swsh:5:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('29c5c104-57ad-41ff-b342-bc7cbcfe07bf'::uuid, 'f16bd0f6-341f-4085-8047-8c84238bf8e4'::uuid, '2022swsh', '7', 'Pikachu', 'holo', 'verified_master_set_index_v1', '2022swsh:7:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('0dadc64e-7400-4c2d-81b1-b1848eab8480'::uuid, 'fd2f7b7c-1dcc-47b8-9fe3-df9deccba773'::uuid, '2022swsh', '15', 'Smeargle', 'holo', 'verified_master_set_index_v1', '2022swsh:15:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('ce27edb5-5496-4ad4-abb4-a98ae5f6f1e4'::uuid, '85c15e81-c19e-4904-a923-0a1782e901d9'::uuid, 'bw7', '13', 'Serperior', 'cosmos', 'verified_master_set_index_v1', 'bw7:13:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('b0f5bf1a-8ab8-4249-a70c-2e01a6a39d2f'::uuid, 'bc9dfb62-bf0b-460c-9d25-3e3a80ad3964'::uuid, 'bw7', '20', 'Charizard', 'cosmos', 'verified_master_set_index_v1', 'bw7:20:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('4a4a512f-ee1b-47eb-9ea0-6a0d446d6f5a'::uuid, '52b4fc4f-d6da-43f0-a13b-71b52445adbb'::uuid, 'bw7', '26', 'Emboar', 'cosmos', 'verified_master_set_index_v1', 'bw7:26:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('0d271504-9c4c-438d-9936-0e2f55f2ebc0'::uuid, '2ed1ec29-d8bb-4933-bec2-ee9a48de871b'::uuid, 'bw7', '41', 'Samurott', 'cosmos', 'verified_master_set_index_v1', 'bw7:41:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('0a9a812b-50a3-4933-a8bd-075f78503b7c'::uuid, '61800823-eef1-4db4-a539-c4f508734134'::uuid, 'bw7', '54', 'Electivire', 'cosmos', 'verified_master_set_index_v1', 'bw7:54:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('5a70fc03-7661-4767-afca-8d50d8cb44b2'::uuid, '9b2cedd8-24bd-424d-af71-e138f75dbd3b'::uuid, 'bw7', '63', 'Dusknoir', 'cosmos', 'verified_master_set_index_v1', 'bw7:63:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('7bd823dc-93be-47b6-9334-bdb3ff4eb038'::uuid, '077bea43-80cb-414b-b58d-5bb533a7d73d'::uuid, 'bw7', '94', 'Scizor', 'cosmos', 'verified_master_set_index_v1', 'bw7:94:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('11c7edcd-5ab0-451d-8389-1c5a11e785fe'::uuid, 'c9c6edad-1ca7-4a9f-b45c-b88a83a17988'::uuid, 'dp1', '76', 'Chimchar', 'cosmos', 'verified_master_set_index_v1', 'dp1:76:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('2f98bd69-b221-44a6-b766-d8eb3ebd7036'::uuid, '2d26dcd1-d42b-4e77-9654-7f9b4297b916'::uuid, 'dp1', '93', 'Piplup', 'cosmos', 'verified_master_set_index_v1', 'dp1:93:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('2f0bbdda-f8b1-4958-a86f-80a30d6617ea'::uuid, 'e6183f85-c1c8-4f93-82b5-38964a5a4c39'::uuid, 'dp1', '103', 'Turtwig', 'cosmos', 'verified_master_set_index_v1', 'dp1:103:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('06e5fe87-15d7-45c8-9c36-edca0c1d8e8b'::uuid, '7b071c37-8c72-4364-8df6-9b450c4ddf1c'::uuid, 'dp1', '112', 'Professor Rowan', 'cosmos', 'verified_master_set_index_v1', 'dp1:112:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('4500171e-bffb-43c6-847e-760c0a39ad1a'::uuid, 'd501fbcc-245b-4f08-8303-4ea4d2a48ae1'::uuid, 'dp1', '120', 'Empoleon LV.X', 'holo', 'verified_master_set_index_v1', 'dp1:120:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('d9124075-c1be-4579-87e4-8ab759917d6f'::uuid, 'ad7f2469-1682-4695-9322-1a27823346c5'::uuid, 'dp1', '121', 'Infernape LV.X', 'holo', 'verified_master_set_index_v1', 'dp1:121:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('74d72aca-d92b-422e-abac-5f77b0c46a96'::uuid, '9c7cd6e8-9881-45e0-b8d8-8b8763dc4147'::uuid, 'dp1', '122', 'Torterra LV.X', 'holo', 'verified_master_set_index_v1', 'dp1:122:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('3edf0555-5536-417a-b5bf-23f36772d6ab'::uuid, 'dc19feb4-ef22-489d-92a0-2b8a2f6e0156'::uuid, 'hgss1', '20', 'Feraligatr', 'cosmos', 'verified_master_set_index_v1', 'hgss1:20:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('6cadbf53-fa25-48a9-a8d3-e6edc0fa199e'::uuid, '61bfff2c-ecad-4b47-833d-44b2454153cd'::uuid, 'hgss1', '26', 'Meganium', 'cosmos', 'verified_master_set_index_v1', 'hgss1:26:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('73a95060-b83f-4dfc-9cb5-6ffb29592a1e'::uuid, '127526a1-a4c1-4066-ae0f-264e08d71984'::uuid, 'hgss1', '32', 'Typhlosion', 'cosmos', 'verified_master_set_index_v1', 'hgss1:32:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('b951885d-8306-4ff7-897e-7c0c1bff46f1'::uuid, '260439c9-4180-447f-bd74-71604ebfad43'::uuid, 'hgss1', '115', 'Grass Energy', 'reverse', 'verified_master_set_index_v1', 'hgss1:115:reverse', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('c6b6eba4-0097-4945-9f2b-338a0d295e46'::uuid, '35fbe785-6b30-427f-94cd-4726d5976fb2'::uuid, 'hgss1', '117', 'Water Energy', 'reverse', 'verified_master_set_index_v1', 'hgss1:117:reverse', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('a7ec5205-bbb0-43d4-90ca-ed677504578a'::uuid, 'df2bd576-1864-477f-bbbf-7905b19a8ff7'::uuid, 'hgss1', '118', 'Lightning Energy', 'reverse', 'verified_master_set_index_v1', 'hgss1:118:reverse', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('f750c6c0-8e9c-4b9e-a9a4-9ffd676f45ca'::uuid, '675d93c2-f6ea-4012-b660-0a7f3d2174a9'::uuid, 'hgss1', 'ONE', 'Alph Lithograph', 'holo', 'verified_master_set_index_v1', 'hgss1:ONE:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('d5a404f5-0c83-4144-bcf1-9992e6600988'::uuid, 'a6c6d0e4-2e5a-413d-9ddb-52b0b8f230bf'::uuid, 'pop5', '3', 'Mew δ', 'holo', 'verified_master_set_index_v1', 'pop5:3:holo', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('6d9e576c-b6ac-42d2-9913-f2abbec82a5a'::uuid, '7a8f665c-eae5-4a82-9e31-593c16ff46b8'::uuid, 'pop5', '5', 'Charmeleon δ', 'normal', 'verified_master_set_index_v1', 'pop5:5:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('0dd45a7a-f346-4891-a5e7-99a4369e3fd1'::uuid, 'fc1a7b29-311d-4ca9-a366-2ff4107f99b4'::uuid, 'pop5', '9', 'δ Rainbow Energy', 'normal', 'verified_master_set_index_v1', 'pop5:9:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('268171a1-2486-4d42-97b5-9bfe1f522821'::uuid, 'c7dcdfaf-71b0-4861-a440-c5deb84ba120'::uuid, 'pop5', '10', 'Charmander δ', 'normal', 'verified_master_set_index_v1', 'pop5:10:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('b3ec949a-4ddc-4915-b0c2-fafcc28a54d2'::uuid, '08768cac-b79b-45c9-864f-006e813de941'::uuid, 'pop5', '14', 'Pelipper δ', 'normal', 'verified_master_set_index_v1', 'pop5:14:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('36d810c1-e476-4be8-a1c0-d3bb3497bc5d'::uuid, '491b4eca-6526-483e-9bdc-c8952f5b0279'::uuid, 'pop5', '16', 'Espeon ★', 'normal', 'verified_master_set_index_v1', 'pop5:16:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('8975ff76-8a94-4bf8-b376-a1ff9ec09d8c'::uuid, '5a43a87e-3f87-4e6f-b3d2-a16df3d6e54e'::uuid, 'pop5', '17', 'Umbreon ★', 'normal', 'verified_master_set_index_v1', 'pop5:17:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('a125dcaf-660b-47c7-b720-2856f392c77d'::uuid, 'cb567ce9-8f96-4c4c-8bd1-f3cae82d7679'::uuid, 'swsh3', '37', 'Suicune', 'normal', 'verified_master_set_index_v1', 'swsh3:37:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('323a8f58-b2e1-430a-85b5-030ea2cdff59'::uuid, 'a5ae1948-cf64-4cc8-bb7a-83e28decd066'::uuid, 'swsh3', '61', 'Tapu Koko', 'normal', 'verified_master_set_index_v1', 'swsh3:61:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('42faa767-dcce-4a8f-9277-5ac59a9da9b5'::uuid, 'd5056dc5-c229-47bd-98ea-246c015c0b92'::uuid, 'swsh3', '63', 'Toxtricity', 'cosmos', 'verified_master_set_index_v1', 'swsh3:63:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('5333737b-2d62-48dd-a65f-6890fd96b738'::uuid, '2c33244b-390e-4ca0-b2dc-43fe03787db1'::uuid, 'swsh3', '81', 'Mimikyu', 'cosmos', 'verified_master_set_index_v1', 'swsh3:81:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('04b229a8-4ee6-4fff-8ad7-07cdc8eb6da6'::uuid, '84243b89-8306-4401-bac1-01497f6a7f15'::uuid, 'swsh3', '105', 'Darkrai', 'cosmos', 'verified_master_set_index_v1', 'swsh3:105:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('30d3150d-ca57-4f8d-97c8-d66b835c670a'::uuid, '84243b89-8306-4401-bac1-01497f6a7f15'::uuid, 'swsh3', '105', 'Darkrai', 'normal', 'verified_master_set_index_v1', 'swsh3:105:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('d5db0a8b-1f67-4aba-a166-a913545feab4'::uuid, '3adb4263-64fd-49c2-b22a-b7bb4abb605a'::uuid, 'swsh3', '133', 'Kangaskhan', 'normal', 'verified_master_set_index_v1', 'swsh3:133:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('8e2aea49-eab2-49ce-8d0e-7887959102af'::uuid, '08a6b53a-5a2e-4b9d-87a4-615ba6c5ab2c'::uuid, 'swsh5', '8', 'Cherrim', 'normal', 'verified_master_set_index_v1', 'swsh5:8:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('bed66f74-6d94-4567-a7c6-c41d5f421d4b'::uuid, '4c3296ee-ec4b-4d95-afb3-b64ebab1bb31'::uuid, 'swsh5', '16', 'Tapu Bulu', 'normal', 'verified_master_set_index_v1', 'swsh5:16:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('4c7c4c4c-7397-4069-b42a-a8751b325d32'::uuid, '35c0ea2a-444d-4dbe-b7ae-a0551e57efb7'::uuid, 'swsh5', '23', 'Tepig', 'cosmos', 'verified_master_set_index_v1', 'swsh5:23:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('0b459464-610e-4e22-9a99-02d6c87e66c9'::uuid, '54f1a687-e471-426c-a866-a5142a8a1b81'::uuid, 'swsh5', '37', 'Octillery', 'normal', 'verified_master_set_index_v1', 'swsh5:37:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('098f22af-e99d-4a8c-9a0c-02a821b3b9c2'::uuid, 'e4e54d9e-52ce-4ab3-943e-c58b531ac314'::uuid, 'swsh5', '46', 'Shinx', 'cosmos', 'verified_master_set_index_v1', 'swsh5:46:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('5077c564-53f3-4b13-8588-cb38abde8310'::uuid, 'b42407d8-754c-4e86-b7e5-c4953b914398'::uuid, 'swsh5', '82', 'Sandaconda', 'cosmos', 'verified_master_set_index_v1', 'swsh5:82:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('fbe4ce13-0906-452b-8f37-4015547183a2'::uuid, '9d438332-6e28-4104-ac18-47d90a0224be'::uuid, 'swsh5', '96', 'Houndoom', 'normal', 'verified_master_set_index_v1', 'swsh5:96:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('4b418c54-77c9-4107-9704-515849c23214'::uuid, 'ebfadb7f-c6ee-4a8d-a386-b6ac91d88f44'::uuid, 'swsh9', '21', 'Moltres', 'cosmos', 'verified_master_set_index_v1', 'swsh9:21:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('c693e2c8-2d2c-4b72-8d36-ba21762786eb'::uuid, 'ebfadb7f-c6ee-4a8d-a386-b6ac91d88f44'::uuid, 'swsh9', '21', 'Moltres', 'normal', 'verified_master_set_index_v1', 'swsh9:21:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('eb5cfa63-f2f8-410a-8e44-28fffa1e5024'::uuid, 'ceb1964f-ae8c-440b-b0f6-c15a2839c3cd'::uuid, 'swsh9', '26', 'Infernape', 'normal', 'verified_master_set_index_v1', 'swsh9:26:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('1e68407c-4121-4cd8-ba38-13c1af14a370'::uuid, 'd7b63842-99f6-4410-93d9-d0cdd5a7304e'::uuid, 'swsh9', '37', 'Empoleon', 'cosmos', 'verified_master_set_index_v1', 'swsh9:37:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('ff74efd4-4526-4e51-8e3f-ad5b9f8a8adb'::uuid, '8168ddc5-6f20-4f0f-8881-33855060c9ca'::uuid, 'swsh9', '121', 'Bibarel', 'normal', 'verified_master_set_index_v1', 'swsh9:121:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('01592a3a-355f-47df-920b-8cc17200e634'::uuid, '9f7b802d-1371-4278-a235-112831588fb5'::uuid, 'swsh9', '132', 'Boss''s Orders', 'cosmos', 'verified_master_set_index_v1', 'swsh9:132:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('798b558d-9f9e-4b76-91ca-c6fcebe2d4cf'::uuid, '9f7b802d-1371-4278-a235-112831588fb5'::uuid, 'swsh9', '132', 'Boss''s Orders', 'normal', 'verified_master_set_index_v1', 'swsh9:132:normal', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('dfda8d6e-95a7-4022-8ed4-365268af3f3a'::uuid, '95721191-f1f9-40c2-8f86-fa0a6c407140'::uuid, 'xy4', '12', 'Pyroar', 'cosmos', 'verified_master_set_index_v1', 'xy4:12:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('f388cee6-9d87-45c6-b112-f9f952b0d9ce'::uuid, '08674e72-ea29-4351-b4d5-8ac47f8da171'::uuid, 'xy4', '17', 'Feraligatr', 'cosmos', 'verified_master_set_index_v1', 'xy4:17:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('a2f963cb-7e18-4392-b716-86e510fb26dd'::uuid, 'e0247407-b6ec-4955-8b3f-e9bd25ff6c17'::uuid, 'xy4', '33', 'Crobat', 'cosmos', 'verified_master_set_index_v1', 'xy4:33:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('e2de7fbe-862e-437b-922e-3511938ac577'::uuid, '27ec3e1d-c8af-49f2-82a0-264358c5b694'::uuid, 'xy4', '43', 'Chandelure', 'cosmos', 'verified_master_set_index_v1', 'xy4:43:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('1060ed6e-81bf-4755-8695-c73ee39581f2'::uuid, '19c2cea5-e1c7-4de2-b768-db283cb71abb'::uuid, 'xy4', '74', 'Hydreigon', 'cosmos', 'verified_master_set_index_v1', 'xy4:74:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('0d97de8b-e728-4afb-a530-6381df00424f'::uuid, 'd5d3ed43-39a0-4265-a219-4b5f91870dba'::uuid, 'xy4', '77', 'Goodra', 'cosmos', 'verified_master_set_index_v1', 'xy4:77:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1'),
  ('803035b2-19a6-4cef-84d5-5f51a3d7a8d4'::uuid, 'ca19c3fe-9583-436b-a7b1-9b5c75001b43'::uuid, 'xy4', '81', 'Blissey', 'cosmos', 'verified_master_set_index_v1', 'xy4:81:cosmos', 'pkg06j_active_finish_child_printing_dry_run_v1');

do $$
declare
  child_count int;
  parent_count int;
  set_count int;
  unsupported_finish_count int;
  existing_child_count int;
  id_collision_count int;
begin
  select count(*) into child_count from pkg06j_active_child_printings;
  select count(distinct card_print_id) into parent_count from pkg06j_active_child_printings;
  select count(distinct set_key) into set_count from pkg06j_active_child_printings;
  select count(*) into unsupported_finish_count
  from pkg06j_active_child_printings target
  left join public.finish_keys fk
    on fk.key = target.finish_key
   and fk.is_active = true
  where fk.key is null;
  select count(*) into existing_child_count
  from pkg06j_active_child_printings target
  join public.card_printings cpr
    on cpr.card_print_id = target.card_print_id
   and cpr.finish_key = target.finish_key;
  select count(*) into id_collision_count
  from pkg06j_active_child_printings target
  join public.card_printings cpr on cpr.id = target.card_printing_id;

  if child_count <> 68 then raise exception 'PKG-06J child count drift: %', child_count; end if;
  if parent_count <> 65 then raise exception 'PKG-06J parent count drift: %', parent_count; end if;
  if set_count <> 10 then raise exception 'PKG-06J set count drift: %', set_count; end if;
  if unsupported_finish_count <> 0 then raise exception 'PKG-06J unsupported finish count: %', unsupported_finish_count; end if;
  if existing_child_count <> 0 then raise exception 'PKG-06J existing child count: %', existing_child_count; end if;
  if id_collision_count <> 0 then raise exception 'PKG-06J id collision count: %', id_collision_count; end if;
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
from pkg06j_active_child_printings;

select
  'PKG-06J-ACTIVE-FINISH-CHILD-PRINTING-INSERTS'::text as package_id,
  '6063892190519f7b48b87f46e4c7d556ad12333655ab0c2aef3149d1da2764f7'::text as source_readiness_fingerprint,
  '5bae5af1da3258540c9d010c88023fa4ea668bacde0db12bc454e0a4ec6f2879'::text as package_fingerprint,
  (select count(distinct set_key) from pkg06j_active_child_printings)::int as planned_sets,
  (select count(distinct card_print_id) from pkg06j_active_child_printings)::int as target_parent_rows,
  (select count(*) from pkg06j_active_child_printings)::int as planned_child_rows;

rollback;

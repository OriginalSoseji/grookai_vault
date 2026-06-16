-- POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP GUARDED DRY-RUN TRANSACTION V1
-- Package fingerprint: e7985ff153dc5e382ac0eb96f103ceaac4bc7f8dc989c3b2614fb8dba5060a41
-- Scope: 83 dependency-bearing padded/unpadded duplicate parent groups.
-- Excludes append-only feed rows.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

set local statement_timeout = '10min';

create temporary table post_rec02a_targets (
  canonical_parent_id uuid primary key,
  duplicate_parent_id uuid not null unique,
  canonical_gv_id text not null,
  duplicate_gv_id text not null,
  set_code text not null,
  normalized_key text not null,
  duplicate_child_count integer not null
) on commit drop;

insert into post_rec02a_targets (
  canonical_parent_id,
  duplicate_parent_id,
  canonical_gv_id,
  duplicate_gv_id,
  set_code,
  normalized_key,
  duplicate_child_count
) values
  ('35ec8ca0-6bc7-4b2a-9077-94bf42c4fecb'::uuid, '96244e7c-c647-412e-b5d7-b073bfbe5d9c'::uuid, 'GV-PK-MEG-001', 'GV-PK-MEG-1', 'me01', 'me01|1|bulbasaur||', 2),
  ('711a2789-6c0b-4c7b-8e5a-15c865deb444'::uuid, '0a7e9961-aebf-4617-b3a3-97ff9540cc2c'::uuid, 'GV-PK-MEG-010', 'GV-PK-MEG-10', 'me01', 'me01|10|meganium||', 3),
  ('2c818714-a5c7-426f-8a8f-9e5db12ba941'::uuid, 'a40d49f6-a528-4fdd-8f89-67c1527e5c03'::uuid, 'GV-PK-MEG-011', 'GV-PK-MEG-11', 'me01', 'me01|11|shuckle||', 2),
  ('a2aae959-98c0-453d-a3e5-196b774acf77'::uuid, 'd0513f68-3ce9-458c-af14-6e8ba8213e23'::uuid, 'GV-PK-MEG-012', 'GV-PK-MEG-12', 'me01', 'me01|12|celebi||', 2),
  ('37f0dcda-5da9-41af-ba5e-6d92c01b2676'::uuid, '93ce0dda-8d3e-440d-a5de-6565e353f3d7'::uuid, 'GV-PK-MEG-013', 'GV-PK-MEG-13', 'me01', 'me01|13|seedot||', 2),
  ('ab5d40b5-ae91-40cd-a3b2-c085eb226c15'::uuid, 'b92d44c5-0b1c-400c-8ee9-597a26c5cbff'::uuid, 'GV-PK-MEG-014', 'GV-PK-MEG-14', 'me01', 'me01|14|nuzleaf||', 2),
  ('223177d5-5156-4bca-97ed-a55405d506bd'::uuid, 'bee3af95-2d7b-4ab3-a0fb-141a460d3b3f'::uuid, 'GV-PK-MEG-015', 'GV-PK-MEG-15', 'me01', 'me01|15|shiftry||', 2),
  ('5e8491ad-fbc4-4e97-b73f-03b6666ffff5'::uuid, '4fc58502-0329-4e2a-bdfc-bc2a32c1f0e6'::uuid, 'GV-PK-MEG-016', 'GV-PK-MEG-16', 'me01', 'me01|16|nincada||', 2),
  ('756b62e3-5bf9-4aa7-9204-5682cb5f312c'::uuid, '1434ce4e-fd3e-4673-bd76-aa3b79f4f3e4'::uuid, 'GV-PK-MEG-017', 'GV-PK-MEG-17', 'me01', 'me01|17|ninjask||', 2),
  ('b01f0f86-df22-4b41-b8ad-e4d1053d6812'::uuid, '62a726e2-1762-47b3-bb40-ba17ce4d1399'::uuid, 'GV-PK-MEG-018', 'GV-PK-MEG-18', 'me01', 'me01|18|dhelmise||', 2),
  ('3a862499-6f17-4531-85d2-30dfc726d882'::uuid, '61ab6f72-9c80-44a0-bd50-b43efb7cf09f'::uuid, 'GV-PK-MEG-019', 'GV-PK-MEG-19', 'me01', 'me01|19|vulpix||', 2),
  ('728642b0-10e0-47fe-902e-acc0cc0f7c6f'::uuid, '869378aa-6f71-4182-8dcf-949248d0d9a2'::uuid, 'GV-PK-MEG-020', 'GV-PK-MEG-20', 'me01', 'me01|20|ninetales||', 2),
  ('e4ccbd91-a03c-416d-969a-af1c8faa7d0f'::uuid, '5c3e43dd-96f9-4fd3-b31f-1509212cb327'::uuid, 'GV-PK-MEG-021', 'GV-PK-MEG-21', 'me01', 'me01|21|numel||', 2),
  ('d13cd05f-d7f8-47c1-92bf-76196414895f'::uuid, 'b435e25c-19b0-4a0f-ba82-c613103b0263'::uuid, 'GV-PK-MEG-022', 'GV-PK-MEG-22', 'me01', 'me01|22|mega camerupt ex||', 1),
  ('3a300a8d-7e5c-4744-9b3b-2961adcd57a2'::uuid, 'acd560a6-a46a-4f07-943a-7bdbb5c63fe7'::uuid, 'GV-PK-MEG-023', 'GV-PK-MEG-23', 'me01', 'me01|23|litleo||', 2),
  ('c906523d-dd38-4899-b343-9339ab6ee3f7'::uuid, '8c6795af-3045-4bd9-8380-727872e79823'::uuid, 'GV-PK-MEG-025', 'GV-PK-MEG-25', 'me01', 'me01|25|volcanion||', 2),
  ('f2a6ce1c-3b4b-4b21-a367-25c6c9a4e2fd'::uuid, '402f016f-d448-455b-93c7-b9e1cd8e50a7'::uuid, 'GV-PK-MEG-026', 'GV-PK-MEG-26', 'me01', 'me01|26|scorbunny||', 2),
  ('d7e33cc1-581b-4b4c-8497-be10892dbe0f'::uuid, '3499ebfc-78e7-440a-a6b4-9be28dac2b21'::uuid, 'GV-PK-MEG-027', 'GV-PK-MEG-27', 'me01', 'me01|27|raboot||', 2),
  ('f7c0bdb9-b762-4c56-b698-4907376db02d'::uuid, 'e313ace5-4e47-4290-b23c-76b992910e31'::uuid, 'GV-PK-MEG-028', 'GV-PK-MEG-28', 'me01', 'me01|28|cinderace||', 2),
  ('3b3e22cf-5165-41ec-9b6e-b441e00528fe'::uuid, 'b67ef4ca-568d-4e24-b845-f8c611d1995d'::uuid, 'GV-PK-MEG-029', 'GV-PK-MEG-29', 'me01', 'me01|29|sizzlipede||', 2),
  ('3bdab7d9-494e-429a-85c4-5bc4f60b56a5'::uuid, 'b7fd7058-6af6-4da6-95c7-3cea7d397caf'::uuid, 'GV-PK-MEG-030', 'GV-PK-MEG-30', 'me01', 'me01|30|centiskorch||', 2),
  ('9458269b-b01d-48a1-a299-ee775da3f6b8'::uuid, 'e2394324-d43d-4bff-9b32-931c0fd7a9ed'::uuid, 'GV-PK-MEG-031', 'GV-PK-MEG-31', 'me01', 'me01|31|chi-yu||', 2),
  ('46bb2c65-85ca-4e54-82c8-bd4dc9709d3d'::uuid, 'cef7073b-d1d7-4848-bdb3-ffeb7d189bfb'::uuid, 'GV-PK-MEG-032', 'GV-PK-MEG-32', 'me01', 'me01|32|mantine||', 2),
  ('d6783e4a-9296-4fec-a85a-98f170b8ecdb'::uuid, '30632d57-00aa-472a-96ac-4ac735531731'::uuid, 'GV-PK-MEG-033', 'GV-PK-MEG-33', 'me01', 'me01|33|corphish||', 2),
  ('36d01240-1013-435a-8216-4b9b333a8281'::uuid, '1026ffa4-592e-4863-82b1-dda9d83f2ac1'::uuid, 'GV-PK-MEG-034', 'GV-PK-MEG-34', 'me01', 'me01|34|kyogre||', 3),
  ('fb0d293a-e731-45d7-af05-85dfe35b6da8'::uuid, '0c18ba69-0ec8-4bc7-a223-164377e4a5b1'::uuid, 'GV-PK-MEG-035', 'GV-PK-MEG-35', 'me01', 'me01|35|snover||', 2),
  ('6041ea6e-d598-45cd-82d5-43ff9af86265'::uuid, '94213180-ef42-4c30-aefe-dc982b46d54c'::uuid, 'GV-PK-MEG-036', 'GV-PK-MEG-36', 'me01', 'me01|36|mega abomasnow ex||', 1),
  ('03253b6e-c0ca-420e-9b5c-548142b39f81'::uuid, 'c2086597-f23d-4c0b-a9e7-e1c434beb51a'::uuid, 'GV-PK-MEG-037', 'GV-PK-MEG-37', 'me01', 'me01|37|clauncher||', 2),
  ('994a32c6-4774-400e-ad94-ef39aaba0836'::uuid, 'f4a775b1-517c-4d6a-a378-8e9c3341a3ab'::uuid, 'GV-PK-MEG-038', 'GV-PK-MEG-38', 'me01', 'me01|38|clawitzer||', 2),
  ('e392d99c-0dbe-44b7-8d41-a2c8f6947c65'::uuid, '495ca168-5d77-441f-bc7e-7f149e3314c1'::uuid, 'GV-PK-MEG-039', 'GV-PK-MEG-39', 'me01', 'me01|39|sobble||', 2),
  ('9de52da6-5c3c-4621-8cec-b01a9db1e4d7'::uuid, '57fab93b-84ac-4e64-ab5b-ee0aa5580f6c'::uuid, 'GV-PK-MEG-004', 'GV-PK-MEG-4', 'me01', 'me01|4|exeggcute||', 2),
  ('cc6e8e9a-0505-49f6-917f-782f106de7f4'::uuid, '77b90e32-68f8-487d-8d1e-a542b53a5c8f'::uuid, 'GV-PK-MEG-040', 'GV-PK-MEG-40', 'me01', 'me01|40|drizzile||', 2),
  ('b23ef0b8-9ab7-4333-9ec7-10555b8ae142'::uuid, '524a9420-08af-4ab8-9e66-e9f6f77511a0'::uuid, 'GV-PK-MEG-041', 'GV-PK-MEG-41', 'me01', 'me01|41|inteleon||', 2),
  ('7a9e718f-f302-455c-a90a-4dd024d773b6'::uuid, '1123150f-fc73-433b-ba0b-db3b22111700'::uuid, 'GV-PK-MEG-042', 'GV-PK-MEG-42', 'me01', 'me01|42|snom||', 2),
  ('4b1ec036-6918-451c-b8d8-504347b96fa1'::uuid, '348be353-9bf1-477d-8453-fb6f8c8bda1b'::uuid, 'GV-PK-MEG-043', 'GV-PK-MEG-43', 'me01', 'me01|43|frosmoth||', 2),
  ('079a15ab-610e-4d7e-b8ba-f4dff5ac97c9'::uuid, 'abe17b87-0635-4ad5-80ac-1dde5c0f3a39'::uuid, 'GV-PK-MEG-044', 'GV-PK-MEG-44', 'me01', 'me01|44|eiscue||', 2),
  ('c910f0c6-98f9-48c9-9a97-44a7d766a91c'::uuid, 'd997de7c-b805-445f-83a0-3ea00411f449'::uuid, 'GV-PK-MEG-045', 'GV-PK-MEG-45', 'me01', 'me01|45|magnemite||', 2),
  ('61df2e14-a9e4-4741-a957-4fef75468dee'::uuid, 'cffee33c-8bb2-42f3-bff6-d1ebd621281b'::uuid, 'GV-PK-MEG-046', 'GV-PK-MEG-46', 'me01', 'me01|46|magneton||', 2),
  ('a4240ebf-2820-4455-90a5-5e24c780758d'::uuid, '6fd997ce-2774-4b08-88b3-74240712706c'::uuid, 'GV-PK-MEG-047', 'GV-PK-MEG-47', 'me01', 'me01|47|magnezone||', 2),
  ('4b121129-bf0a-4835-8af6-dbed0c23b962'::uuid, '9d6ddf70-c0d0-4995-8b4e-8d74d1e0092e'::uuid, 'GV-PK-MEG-049', 'GV-PK-MEG-49', 'me01', 'me01|49|electrike||', 2),
  ('df1a84f9-7a7c-44a6-bce2-b6a21947ac8f'::uuid, '7f748a0a-d4fc-471f-a149-3a003f0f2942'::uuid, 'GV-PK-MEG-050', 'GV-PK-MEG-50', 'me01', 'me01|50|mega manectric ex||', 1),
  ('a3c9641f-5152-4bc9-aec6-f7f5f836a5b6'::uuid, 'c379bebb-1731-47e3-9dba-e3a0df9cada9'::uuid, 'GV-PK-MEG-051', 'GV-PK-MEG-51', 'me01', 'me01|51|pachirisu||', 2),
  ('007c91d0-6e49-4654-b88e-da105cd4bac9'::uuid, '3d76fd95-d3bf-4f4e-b3fe-79f6b6126074'::uuid, 'GV-PK-MEG-052', 'GV-PK-MEG-52', 'me01', 'me01|52|helioptile||', 2),
  ('9b837cfd-0f7f-4bd1-ab75-c9b8c14ba027'::uuid, '3511eda5-fb2d-4d8d-94b0-93a0bd0a91a3'::uuid, 'GV-PK-MEG-056', 'GV-PK-MEG-56', 'me01', 'me01|56|alakazam||', 2),
  ('91eba394-d9a1-4e7e-926f-381d2abd8a32'::uuid, '2f481633-448e-483c-b5af-ce449cd671d0'::uuid, 'GV-PK-MEG-057', 'GV-PK-MEG-57', 'me01', 'me01|57|jynx||', 2),
  ('569f605f-b7e2-4e7d-9182-459287edda7a'::uuid, '87e718fc-f5df-46ba-8a40-32f1881ada53'::uuid, 'GV-PK-MEG-058', 'GV-PK-MEG-58', 'me01', 'me01|58|ralts||', 3),
  ('4800e647-2f2b-4ebc-931e-ef4b672788e2'::uuid, 'dd8f0c4d-ac21-441d-a57f-34be3a02a6f8'::uuid, 'GV-PK-MEG-059', 'GV-PK-MEG-59', 'me01', 'me01|59|kirlia||', 3),
  ('2314a826-39ad-4782-9c0a-465c25f8fe48'::uuid, 'a5ec7878-a1f0-4048-8da5-bf1274361352'::uuid, 'GV-PK-MEG-006', 'GV-PK-MEG-6', 'me01', 'me01|6|tangela||', 2),
  ('addfd1d7-c1cc-42e4-a4c2-ffddbba89022'::uuid, '288e23c3-d19b-455f-bd0d-aa82f42a751c'::uuid, 'GV-PK-MEG-060', 'GV-PK-MEG-60', 'me01', 'me01|60|mega gardevoir ex||', 1),
  ('006ee906-bf8c-46dd-9e14-ac623ba3c596'::uuid, 'f0fe6c4e-1484-4043-9932-10b080d5e459'::uuid, 'GV-PK-MEG-061', 'GV-PK-MEG-61', 'me01', 'me01|61|shedinja||', 2),
  ('99d7e313-27de-4da7-a10e-3d2bb898ebcd'::uuid, 'e5a62eac-b1e3-46bc-a1d6-63cf8ea15e85'::uuid, 'GV-PK-MEG-063', 'GV-PK-MEG-63', 'me01', 'me01|63|grumpig||', 2),
  ('e003f060-6249-47f6-b31b-e2cb4cac5611'::uuid, '8452ac8c-c71f-443e-8f7d-f89eb34ae61d'::uuid, 'GV-PK-MEG-064', 'GV-PK-MEG-64', 'me01', 'me01|64|xerneas||', 3),
  ('33096065-fff0-42f9-9df2-52516e55cd04'::uuid, 'f47cdbb3-e683-4373-8797-20895c8e2f33'::uuid, 'GV-PK-MEG-065', 'GV-PK-MEG-65', 'me01', 'me01|65|greavard||', 2),
  ('56611277-9b14-49e5-b71a-4fc1c675f973'::uuid, '3077badd-632e-4466-afaa-6fc8c3c43ad5'::uuid, 'GV-PK-MEG-066', 'GV-PK-MEG-66', 'me01', 'me01|66|houndstone||', 2),
  ('952acdf6-f707-4bac-a111-133a2d456207'::uuid, '11b0e783-edeb-4a05-9df8-bcf529cacb33'::uuid, 'GV-PK-MEG-067', 'GV-PK-MEG-67', 'me01', 'me01|67|gimmighoul||', 2),
  ('29cd9592-1684-425b-9102-000c335f53b5'::uuid, 'b3afdde8-e7fa-46c2-954d-ae4df2b6b2d7'::uuid, 'GV-PK-MEG-069', 'GV-PK-MEG-69', 'me01', 'me01|69|sandslash||', 2),
  ('80a83fe5-ccc6-4f14-b060-af5ee3bd56c4'::uuid, '94d170c6-5faa-484b-a24c-b0b2652db303'::uuid, 'GV-PK-MEG-007', 'GV-PK-MEG-7', 'me01', 'me01|7|tangrowth||', 2),
  ('b522fb51-1555-4d51-94a4-359988bbbe5f'::uuid, '1fa35a1f-57cb-41dd-9c1e-5d602e06075b'::uuid, 'GV-PK-MEG-070', 'GV-PK-MEG-70', 'me01', 'me01|70|onix||', 2),
  ('61a36b8f-49cd-4200-9e4b-49a2a042060c'::uuid, 'f58b8424-dbed-4813-bb73-1afb0d2799d7'::uuid, 'GV-PK-MEG-071', 'GV-PK-MEG-71', 'me01', 'me01|71|tyrogue||', 2),
  ('38d96ab4-73b8-4a03-9b2a-2d0439e3effc'::uuid, '71bd9d4d-9df7-4614-ac9d-ff0ac58dcc3a'::uuid, 'GV-PK-MEG-072', 'GV-PK-MEG-72', 'me01', 'me01|72|makuhita||', 2),
  ('4faab1bd-e8ce-4fe8-8fda-cd2167875850'::uuid, '82869eea-70cf-450d-b417-55925771308a'::uuid, 'GV-PK-MEG-073', 'GV-PK-MEG-73', 'me01', 'me01|73|hariyama||', 3),
  ('6968d365-f435-4047-9c47-8c9f274f92e6'::uuid, 'c5489115-a557-4c9d-b61f-4e4878fb87ce'::uuid, 'GV-PK-MEG-075', 'GV-PK-MEG-75', 'me01', 'me01|75|solrock||', 2),
  ('6a389901-dd1b-480a-88fc-ca3d1ee02128'::uuid, '031dc29b-18cb-4048-8301-a29f3bd6335c'::uuid, 'GV-PK-MEG-076', 'GV-PK-MEG-76', 'me01', 'me01|76|riolu||', 3),
  ('f6c13207-e0b4-413d-a54d-f7eab7cdeadb'::uuid, '240833a6-3e68-4953-bb2d-751da76525e7'::uuid, 'GV-PK-MEG-077', 'GV-PK-MEG-77', 'me01', 'me01|77|mega lucario ex||', 1),
  ('564ce33e-8dce-40b9-abad-b71b85e50bb6'::uuid, '2b9cb590-0d8c-4f21-be00-c47de44c7c97'::uuid, 'GV-PK-MEG-079', 'GV-PK-MEG-79', 'me01', 'me01|79|toxicroak||', 2),
  ('7d4af188-1b3c-4c6b-8a9b-cb426f11d87b'::uuid, '01699d7f-b6e0-4f83-987d-d58fa3d189c0'::uuid, 'GV-PK-MEG-008', 'GV-PK-MEG-8', 'me01', 'me01|8|chikorita||', 2),
  ('8fbc6c9f-5494-4a27-88ec-b47b75626670'::uuid, '443c8390-b5f9-4508-8b69-fa5356d2173a'::uuid, 'GV-PK-MEG-081', 'GV-PK-MEG-81', 'me01', 'me01|81|stonjourner||', 2),
  ('1b68a134-7b27-448d-b27d-bd6c792e1cf1'::uuid, 'b09d5866-6742-4e82-9510-52a3b2aa967d'::uuid, 'GV-PK-MEG-082', 'GV-PK-MEG-82', 'me01', 'me01|82|nacli||', 2),
  ('4e4b3fa7-31fc-4740-a617-5be4d5ad453e'::uuid, '474ae17f-aabd-43f8-919f-804c43266bd2'::uuid, 'GV-PK-MEG-083', 'GV-PK-MEG-83', 'me01', 'me01|83|naclstack||', 2),
  ('cea4de22-3921-46bf-a88a-41a60978a936'::uuid, '30da861b-529a-4110-9598-35adc4c4a195'::uuid, 'GV-PK-MEG-085', 'GV-PK-MEG-85', 'me01', 'me01|85|crawdaunt||', 2),
  ('8be2f619-a4eb-4cb3-85f2-550e1bd332e7'::uuid, '4be3283f-99bf-493a-a2df-6bfa912e7612'::uuid, 'GV-PK-MEG-087', 'GV-PK-MEG-87', 'me01', 'me01|87|spiritomb||', 2),
  ('69c0e94b-9641-410a-a9f3-62b5bd0b6a79'::uuid, '8004fa96-9648-4533-8db8-e8873f8be9a6'::uuid, 'GV-PK-MEG-088', 'GV-PK-MEG-88', 'me01', 'me01|88|yveltal||', 2),
  ('c1d12a78-15fd-4101-92b1-d03e06aab576'::uuid, '2a0105a9-4d9d-4bc7-8334-ff8a15951a9e'::uuid, 'GV-PK-MEG-089', 'GV-PK-MEG-89', 'me01', 'me01|89|nickit||', 2),
  ('493cbe02-e42b-4ca0-97cb-f9b75584c66f'::uuid, '07847a4a-1aa0-4fea-b2b8-6b066ddb60f7'::uuid, 'GV-PK-MEG-009', 'GV-PK-MEG-9', 'me01', 'me01|9|bayleef||', 2),
  ('1df8b92b-eff7-4f4d-a82f-1302c9885a80'::uuid, '7ffbe4b2-78cc-42f0-82bc-36547a4bcf42'::uuid, 'GV-PK-MEG-090', 'GV-PK-MEG-90', 'me01', 'me01|90|thievul||', 2),
  ('0003593d-5fc1-4f51-a5fa-4211e946c257'::uuid, '7edb19d6-098f-4c38-a4f0-ab0b85e3b151'::uuid, 'GV-PK-MEG-091', 'GV-PK-MEG-91', 'me01', 'me01|91|shroodle||', 2),
  ('2fbd7a5a-fb64-4dda-889d-ff2ba59aac7e'::uuid, '1f3675d6-b609-43e9-b907-49c183255a56'::uuid, 'GV-PK-MEG-092', 'GV-PK-MEG-92', 'me01', 'me01|92|grafaiai||', 2),
  ('7fc198b4-272c-4734-a798-610c3fa32287'::uuid, 'c29cf7bf-d1cb-407a-8570-37f9dff2d488'::uuid, 'GV-PK-MEG-093', 'GV-PK-MEG-93', 'me01', 'me01|93|steelix||', 2),
  ('d05ad932-fbfe-40b6-b812-2097add0e93c'::uuid, 'ff9714bc-090f-4369-a782-ab3ebcdf69a6'::uuid, 'GV-PK-MEG-094', 'GV-PK-MEG-94', 'me01', 'me01|94|mega mawile ex||', 1),
  ('36dea4d3-2ca5-4397-a359-cfbf98023aab'::uuid, '2979056b-be25-453d-8051-c560aa51d586'::uuid, 'GV-PK-MEG-096', 'GV-PK-MEG-96', 'me01', 'me01|96|tinkatink||', 2),
  ('0af77d06-ad91-4f6d-a5fb-c53f2a349628'::uuid, '9a97d097-231b-497c-aab4-d56d3815ff38'::uuid, 'GV-PK-MEG-097', 'GV-PK-MEG-97', 'me01', 'me01|97|tinkatuff||', 2),
  ('90da4fea-bf5b-4335-a5f5-dcb7fab86958'::uuid, '6f4a056f-4a14-4d1e-9d91-53014d15f1b9'::uuid, 'GV-PK-MEG-098', 'GV-PK-MEG-98', 'me01', 'me01|98|tinkaton||', 2),
  ('20f18283-9337-47d2-a807-37f019221717'::uuid, 'eaf4f37e-443a-4fef-a5f4-817c0ddbeb33'::uuid, 'GV-PK-MEG-099', 'GV-PK-MEG-99', 'me01', 'me01|99|gholdengo||', 2);

do $$
declare
  v_targets integer;
  v_missing_parent integer;
  v_bad_parent_shape integer;
  v_append_only_refs integer;
  v_bad_child_refs integer := 0;
  v_new_printing_gv_conflicts integer;
  v_unhandled_parent_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from post_rec02a_targets;
  if v_targets <> 83 then
    raise exception 'POST-REC-02A target count guard failed: expected 83, got %', v_targets;
  end if;

  select count(*) into v_missing_parent
  from post_rec02a_targets target
  left join public.card_prints canonical on canonical.id = target.canonical_parent_id
  left join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.id is null
     or duplicate.id is null
     or canonical.id = duplicate.id;

  if v_missing_parent <> 0 then
    raise exception 'POST-REC-02A missing parent guard failed: % rows', v_missing_parent;
  end if;

  select count(*) into v_bad_parent_shape
  from post_rec02a_targets target
  join public.card_prints canonical on canonical.id = target.canonical_parent_id
  join public.card_prints duplicate on duplicate.id = target.duplicate_parent_id
  where canonical.set_code <> duplicate.set_code
     or canonical.set_code <> target.set_code
     or canonical.name <> duplicate.name
     or canonical.number !~ '^0+[0-9]+[A-Za-z]*$'
     or duplicate.number ~ '^0+[0-9]+[A-Za-z]*$';

  if v_bad_parent_shape <> 0 then
    raise exception 'POST-REC-02A parent shape guard failed: % rows', v_bad_parent_shape;
  end if;

  select count(*) into v_append_only_refs
  from public.card_feed_events cfe
  join post_rec02a_targets target on target.duplicate_parent_id = cfe.card_print_id;

  if v_append_only_refs <> 0 then
    raise exception 'POST-REC-02A append-only feed exclusion guard failed: % refs', v_append_only_refs;
  end if;

  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_prints'
      and rel.relname <> all(array[
        'card_print_identity',
        'card_print_species',
        'card_print_traits',
        'card_printings',
        'external_mappings',
        'external_discovery_candidates',
        'card_embeddings',
        'card_fingerprint_index',
        'scanner_fingerprint_index',
        'justtcg_variants',
        'justtcg_variant_prices_latest',
        'justtcg_variant_price_snapshots',
        'card_print_price_curves',
        'ebay_active_prices_latest',
        'ebay_active_price_snapshots',
        'pricing_jobs',
        'pricing_watch',
        'vault_item_instances',
        'vault_items',
        'card_interactions',
        'card_interaction_outcomes',
        'card_signals',
        'slab_certs',
        'card_feed_events'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_unhandled_parent_refs := v_unhandled_parent_refs + v_dynamic_refs;
  end loop;

  if v_unhandled_parent_refs <> 0 then
    raise exception 'POST-REC-02A unhandled parent dependency guard failed: % refs', v_unhandled_parent_refs;
  end if;

  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_printings'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (
         select cpr.id
         from public.card_printings cpr
         join post_rec02a_targets target on target.duplicate_parent_id = cpr.card_print_id
       )',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_bad_child_refs := v_bad_child_refs + v_dynamic_refs;
  end loop;

  if v_bad_child_refs <> 0 then
    raise exception 'POST-REC-02A duplicate child dependency guard failed: % refs', v_bad_child_refs;
  end if;

  select count(*) into v_new_printing_gv_conflicts
  from public.card_printings duplicate_child
  join post_rec02a_targets target on target.duplicate_parent_id = duplicate_child.card_print_id
  where not exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  )
  and exists (
    select 1
    from public.card_printings any_child
    where any_child.printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
      and any_child.id <> duplicate_child.id
  );

  if v_new_printing_gv_conflicts <> 0 then
    raise exception 'POST-REC-02A transfer printing_gv_id conflict guard failed: % rows', v_new_printing_gv_conflicts;
  end if;
end $$;

delete from public.external_mappings em
using post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.external_mappings existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.source = em.source
      and existing.external_id = em.external_id
  );

update public.external_mappings em
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where em.card_print_id = target.duplicate_parent_id;

update public.external_discovery_candidates edc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where edc.card_print_id = target.duplicate_parent_id;

insert into public.card_print_traits
  (card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity)
select
  target.canonical_parent_id,
  trait.trait_type,
  trait.trait_value,
  trait.source,
  trait.confidence,
  trait.hp,
  trait.national_dex,
  trait.types,
  trait.rarity,
  trait.supertype,
  trait.card_category,
  trait.legacy_rarity
from public.card_print_traits trait
join post_rec02a_targets target on target.duplicate_parent_id = trait.card_print_id
on conflict (card_print_id, trait_type, trait_value, source) do nothing;

delete from public.card_print_traits trait
using post_rec02a_targets target
where trait.card_print_id = target.duplicate_parent_id;

insert into public.card_print_species
  (card_print_id, species_id, role, counts_for_completion, source, confidence, evidence, active)
select
  target.canonical_parent_id,
  species.species_id,
  species.role,
  species.counts_for_completion,
  species.source,
  species.confidence,
  species.evidence,
  species.active
from public.card_print_species species
join post_rec02a_targets target on target.duplicate_parent_id = species.card_print_id
on conflict (card_print_id, species_id, role) where active = true do nothing;

delete from public.card_print_species species
using post_rec02a_targets target
where species.card_print_id = target.duplicate_parent_id;

delete from public.card_print_identity identity
using post_rec02a_targets target
where identity.card_print_id = target.duplicate_parent_id;

delete from public.card_embeddings ce
using post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.card_embeddings existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.card_embeddings ce
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ce.card_print_id = target.duplicate_parent_id;

update public.card_fingerprint_index cfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cfi.card_print_id = target.duplicate_parent_id;

delete from public.scanner_fingerprint_index sfi
using post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.scanner_fingerprint_index existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.hash_d = sfi.hash_d
      and existing.algorithm_version = sfi.algorithm_version
      and existing.source_type = sfi.source_type
  );

update public.scanner_fingerprint_index sfi
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sfi.card_print_id = target.duplicate_parent_id;

update public.justtcg_variants jv
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jv.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_prices_latest jvl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvl.card_print_id = target.duplicate_parent_id;

update public.justtcg_variant_price_snapshots jvs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where jvs.card_print_id = target.duplicate_parent_id;

update public.card_print_price_curves cppc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cppc.card_print_id = target.duplicate_parent_id;

delete from public.ebay_active_prices_latest eapl
using post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id
  and exists (
    select 1 from public.ebay_active_prices_latest existing
    where existing.card_print_id = target.canonical_parent_id
  );

update public.ebay_active_prices_latest eapl
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eapl.card_print_id = target.duplicate_parent_id;

update public.ebay_active_price_snapshots eaps
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where eaps.card_print_id = target.duplicate_parent_id;

update public.pricing_jobs pj
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pj.card_print_id = target.duplicate_parent_id;

delete from public.pricing_watch pw
using post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.pricing_watch existing
    where existing.card_print_id = target.canonical_parent_id
      and existing.watch_reason = pw.watch_reason
  );

update public.pricing_watch pw
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where pw.card_print_id = target.duplicate_parent_id;

update public.vault_item_instances vii
set card_printing_id = null,
    card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where vii.card_print_id = target.duplicate_parent_id;

update public.vault_items vi
set card_id = target.canonical_parent_id
from post_rec02a_targets target
where vi.card_id = target.duplicate_parent_id;

update public.card_interactions ci
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where ci.card_print_id = target.duplicate_parent_id;

update public.card_interaction_outcomes cio
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cio.card_print_id = target.duplicate_parent_id;

update public.card_signals cs
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where cs.card_print_id = target.duplicate_parent_id;

update public.slab_certs sc
set card_print_id = target.canonical_parent_id
from post_rec02a_targets target
where sc.card_print_id = target.duplicate_parent_id;

delete from public.card_printings duplicate_child
using post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id
  and exists (
    select 1
    from public.card_printings canonical_child
    where canonical_child.card_print_id = target.canonical_parent_id
      and canonical_child.finish_key = duplicate_child.finish_key
  );

update public.card_printings duplicate_child
set
  card_print_id = target.canonical_parent_id,
  printing_gv_id = replace(duplicate_child.printing_gv_id, target.duplicate_gv_id, target.canonical_gv_id)
from post_rec02a_targets target
where duplicate_child.card_print_id = target.duplicate_parent_id;

do $$
declare
  v_remaining_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_prints'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select duplicate_parent_id from post_rec02a_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_remaining_refs := v_remaining_refs + v_dynamic_refs;
  end loop;

  if v_remaining_refs <> 0 then
    raise exception 'POST-REC-02A duplicate parent references remain: % refs', v_remaining_refs;
  end if;
end $$;

delete from public.card_prints cp
using post_rec02a_targets target
where cp.id = target.duplicate_parent_id;

do $$
declare
  v_remaining_duplicate_parents integer;
begin
  select count(*) into v_remaining_duplicate_parents
  from public.card_prints cp
  join post_rec02a_targets target on target.duplicate_parent_id = cp.id;

  if v_remaining_duplicate_parents <> 0 then
    raise exception 'POST-REC-02A duplicate parent delete simulation incomplete: % rows', v_remaining_duplicate_parents;
  end if;
end $$;

rollback;

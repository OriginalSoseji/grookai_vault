-- POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP GUARDED DRY-RUN TRANSACTION V1
-- Package fingerprint: 7bf5f95205d26e8e0ba3e85604e3f431259b32e1a07b57eba8764cd6bdd69b8c
-- Scope: 142 dependency-bearing padded/unpadded duplicate parent groups.
-- Excludes append-only feed rows.
-- This transaction intentionally ends with ROLLBACK and contains no COMMIT.

begin;

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
  ('20f18283-9337-47d2-a807-37f019221717'::uuid, 'eaf4f37e-443a-4fef-a5f4-817c0ddbeb33'::uuid, 'GV-PK-MEG-099', 'GV-PK-MEG-99', 'me01', 'me01|99|gholdengo||', 2),
  ('fa33f1a3-1902-4111-82b0-3ab2efeb2124'::uuid, '3cd23751-aa60-4290-9ddb-bfc26c179a4e'::uuid, 'GV-PK-PR-SV-001', 'GV-PK-PR-SV-1', 'svp', 'svp|1|sprigatito||', 1),
  ('1154a3c4-8965-4ac8-be8f-6963bdad7a35'::uuid, '9f044f9b-155c-4341-b0cb-76d98a13a2c6'::uuid, 'GV-PK-PR-SV-011', 'GV-PK-PR-SV-11', 'svp', 'svp|11|arcanine||', 1),
  ('a20d299e-c452-48ae-876a-70513c4171bf'::uuid, '91256748-9c39-4f8c-afde-bd0150dae069'::uuid, 'GV-PK-PR-SV-012', 'GV-PK-PR-SV-12', 'svp', 'svp|12|dondozo||', 1),
  ('38573c4d-7323-4025-a2c9-9090be30a9ef'::uuid, '935bee38-6c43-43f2-8675-239e17291046'::uuid, 'GV-PK-PR-SV-013', 'GV-PK-PR-SV-13', 'svp', 'svp|13|miraidon||', 1),
  ('021b1475-367f-4cc3-bf50-43b578331619'::uuid, '7330cfd2-3857-4a06-b266-65fd008ffb4f'::uuid, 'GV-PK-PR-SV-014', 'GV-PK-PR-SV-14', 'svp', 'svp|14|koraidon||', 1),
  ('10b6b8a7-ccd5-47b1-97f7-65f55df0703d'::uuid, 'a1346047-1250-47b4-9a34-1320d55afcb4'::uuid, 'GV-PK-PR-SV-017', 'GV-PK-PR-SV-17', 'svp', 'svp|17|lucario ex||', 1),
  ('1c1b2f2e-9b6c-4b16-b737-3d5d7659bc53'::uuid, 'af5804f0-ce98-4206-8fca-b5466141fb16'::uuid, 'GV-PK-PR-SV-018', 'GV-PK-PR-SV-18', 'svp', 'svp|18|cyclizar ex||', 1),
  ('da212189-7a46-4cac-ac27-efac8930055a'::uuid, '590b469b-fcf7-418c-a760-3d52a2d475fe'::uuid, 'GV-PK-PR-SV-023', 'GV-PK-PR-SV-23', 'svp', 'svp|23|smoliv||', 1),
  ('ac2c59f1-38cb-4eea-b082-30b4b22b45d2'::uuid, '6cebe351-fe69-4cb3-bd19-7c73baeaf481'::uuid, 'GV-PK-PR-SV-024', 'GV-PK-PR-SV-24', 'svp', 'svp|24|growlithe||', 1),
  ('4659591e-e289-4844-b52d-603711c7573e'::uuid, '9974ccab-da03-42de-bfdb-dd69b273629b'::uuid, 'GV-PK-PR-SV-027', 'GV-PK-PR-SV-27', 'svp', 'svp|27|pikachu||', 1),
  ('276dee1b-f172-4c52-aa8f-abc104b438b5'::uuid, '8c805157-7ecb-4a3f-8c52-3240c69cd492'::uuid, 'GV-PK-PR-SV-028', 'GV-PK-PR-SV-28', 'svp', 'svp|28|miraidon ex||', 1),
  ('0cf0caab-76b3-4430-8878-5427f78d52af'::uuid, '80d88ba4-76cb-45b8-adc1-12f60d6f1068'::uuid, 'GV-PK-PR-SV-029', 'GV-PK-PR-SV-29', 'svp', 'svp|29|koraidon ex||', 1),
  ('6cd56d97-2450-48d4-a47f-a0bcde3972f3'::uuid, '49973fd9-e920-4562-8dbd-3782589cb927'::uuid, 'GV-PK-PR-SV-003', 'GV-PK-PR-SV-3', 'svp', 'svp|3|quaxly||', 1),
  ('218be4da-7037-4334-a9b0-70b1e6e06789'::uuid, '5311de95-28d5-4813-9533-ccb0eaa15eee'::uuid, 'GV-PK-PR-SV-030', 'GV-PK-PR-SV-30', 'svp', 'svp|30|chien-pao ex||', 1),
  ('aaf3fa99-4550-4d66-8a4c-22899eb83200'::uuid, '8d64a5ba-9724-4fa1-86ec-bfd35287e794'::uuid, 'GV-PK-PR-SV-034', 'GV-PK-PR-SV-34', 'svp', 'svp|34|skeledirge ex||', 1),
  ('5b72a481-2fff-4104-8dd7-c8dcc02626b7'::uuid, 'ccae9639-b04e-46bd-a97f-c2f5d031a726'::uuid, 'GV-PK-PR-SV-035', 'GV-PK-PR-SV-35', 'svp', 'svp|35|quaquaval ex||', 1),
  ('dd4dcf50-dca8-447d-933b-b1c483325a5b'::uuid, '0eff4b2d-0649-4fd4-84e4-fd19e25a7226'::uuid, 'GV-PK-PR-SV-042', 'GV-PK-PR-SV-42', 'svp', 'svp|42|houndstone||', 1),
  ('daa55ac3-2697-421a-a0c2-fa07dfc2c7e1'::uuid, 'a6af65cd-03d6-4e12-840e-d44081c21319'::uuid, 'GV-PK-PR-SV-049', 'GV-PK-PR-SV-49', 'svp', 'svp|49|zapdos ex||', 1),
  ('0c500907-b532-4c45-9b35-5cbe4059c21c'::uuid, '6e928c98-a997-4e16-a205-77f78c8e03f2'::uuid, 'GV-PK-PR-SV-050', 'GV-PK-PR-SV-50', 'svp', 'svp|50|alakazam ex||', 1),
  ('c7171ec8-743d-453d-bc8b-47517986916f'::uuid, '9eaf009b-ee67-4811-9e02-0e3ad92d8e23'::uuid, 'GV-PK-PR-SV-051', 'GV-PK-PR-SV-51', 'svp', 'svp|51|snorlax||', 1),
  ('257db1a1-6901-4db1-931e-e28545c27644'::uuid, 'de24b643-d925-4269-9295-4efaa31b2d03'::uuid, 'GV-PK-PR-SV-052', 'GV-PK-PR-SV-52', 'svp', 'svp|52|mewtwo||', 1),
  ('1972a9c9-064b-455f-824e-542a37623b36'::uuid, '1942848c-dff2-48e0-aaa8-f059db416977'::uuid, 'GV-PK-PR-SV-053', 'GV-PK-PR-SV-53', 'svp', 'svp|53|mew ex||', 1),
  ('5076f7d4-8d36-4560-9527-3aaadac3ef42'::uuid, 'a4f7588a-bb56-4bad-890b-50605ffeedfd'::uuid, 'GV-PK-PR-SV-055', 'GV-PK-PR-SV-55', 'svp', 'svp|55|kangaskhan ex||', 1),
  ('dbf93836-ccac-420f-9967-4281c7e775f6'::uuid, 'd1e3a12b-9bc1-40e2-ba80-cfadf5f04c6d'::uuid, 'GV-PK-PR-SV-056', 'GV-PK-PR-SV-56', 'svp', 'svp|56|charizard ex||', 1),
  ('e4bc07b0-08d5-46c9-b4b6-6217bec74cf8'::uuid, '83305754-cb20-4042-8b0d-ecca310380d9'::uuid, 'GV-PK-PR-SV-061', 'GV-PK-PR-SV-61', 'svp', 'svp|61|pineco||', 1),
  ('5e8642f6-1fb5-492a-9e73-8d5976083b9d'::uuid, '611b1fcb-8048-47c3-bb37-0a8036458cc8'::uuid, 'GV-PK-PR-SV-062', 'GV-PK-PR-SV-62', 'svp', 'svp|62|sinistea||', 1),
  ('6f7ddb77-58d2-4e0b-b761-4ce80881c739'::uuid, 'd66a9b95-9a87-438a-80ad-d5fcb9fc845c'::uuid, 'GV-PK-PR-SV-064', 'GV-PK-PR-SV-64', 'svp', 'svp|64|arctibax||', 1),
  ('1eb2ea7e-7b90-421c-a5f5-84ffec00c25d'::uuid, 'cd2e8ee9-01b3-4cec-bf4d-397841280640'::uuid, 'GV-PK-PR-SV-068', 'GV-PK-PR-SV-68', 'svp', 'svp|68|iron valiant ex||', 1),
  ('e5fcec1c-384f-47f7-8dfb-b81e8b88b31d'::uuid, 'ed39efeb-fdc6-4b04-94dd-bc9ec917743f'::uuid, 'GV-PK-PR-SV-070', 'GV-PK-PR-SV-70', 'svp', 'svp|70|greavard||', 1),
  ('123c2f60-a80a-4c07-a1fa-f0b53b09c2c6'::uuid, 'bfea0054-88bd-4948-9a23-a3c1cb982569'::uuid, 'GV-PK-PR-SV-071', 'GV-PK-PR-SV-71', 'svp', 'svp|71|maschiff||', 1),
  ('b3fedab3-1c3f-4aa3-816a-7b3fdcad2a3e'::uuid, '21b4f09d-b6ab-4adb-be2f-c1630760cc34'::uuid, 'GV-PK-PR-SV-072', 'GV-PK-PR-SV-72', 'svp', 'svp|72|great tusk ex||', 1),
  ('ca37b5e3-e21d-43cf-8322-55028194ab8a'::uuid, '608eaea1-fe02-4c9e-be93-36d23935a1a9'::uuid, 'GV-PK-PR-SV-073', 'GV-PK-PR-SV-73', 'svp', 'svp|73|iron treads ex||', 1),
  ('0658c806-e1be-48f4-9c4b-50b54bcd59da'::uuid, '87b4038a-8957-4102-baac-0a0752a1b76d'::uuid, 'GV-PK-PR-SV-074', 'GV-PK-PR-SV-74', 'svp', 'svp|74|charizard ex||', 1),
  ('95bf7fda-0385-4bd0-ab55-26375f189b88'::uuid, 'c724a1f5-37f4-48ed-96bd-19930cce63c7'::uuid, 'GV-PK-PR-SV-075', 'GV-PK-PR-SV-75', 'svp', 'svp|75|mimikyu||', 1),
  ('041b022e-8dea-4078-8189-2ca4ff16219c'::uuid, '922dbb0f-4d6d-4082-ba6e-1f547a6ca7e2'::uuid, 'GV-PK-PR-SV-077', 'GV-PK-PR-SV-77', 'svp', 'svp|77|floragato||', 1),
  ('52362404-5c65-4fe7-b2a4-43b7ed975d2e'::uuid, '58ddc3d4-bd4b-4d0a-bc3d-ff233f5a36e1'::uuid, 'GV-PK-PR-SV-078', 'GV-PK-PR-SV-78', 'svp', 'svp|78|meowscarada ex||', 1),
  ('86ea0095-d913-407e-8e64-7f018e3a542d'::uuid, '616f81f1-a3df-4f71-952d-bbb0122fddd6'::uuid, 'GV-PK-PR-SV-079', 'GV-PK-PR-SV-79', 'svp', 'svp|79|fuecoco||', 1),
  ('2853058a-cc88-468a-a3a3-e4bc1281c158'::uuid, '751d4bbe-926e-4267-b6d8-33e7c4c05782'::uuid, 'GV-PK-PR-SV-080', 'GV-PK-PR-SV-80', 'svp', 'svp|80|crocalor||', 1),
  ('09307184-d786-4590-a6b1-22ce990007a7'::uuid, '05beb8c1-e19a-458c-8714-469e213fded6'::uuid, 'GV-PK-PR-SV-081', 'GV-PK-PR-SV-81', 'svp', 'svp|81|skeledirge ex||', 1),
  ('d474bab4-49c1-4d11-8a96-5ca5ac6378be'::uuid, 'aab48d24-1a65-44d4-961a-8fbcfee12d14'::uuid, 'GV-PK-PR-SV-082', 'GV-PK-PR-SV-82', 'svp', 'svp|82|quaxly||', 1),
  ('29ef74b9-dca4-44f4-b3cf-5ad0c6d1e7ea'::uuid, '26c6b56b-d829-41e9-87f5-de767fdaaca2'::uuid, 'GV-PK-PR-SV-083', 'GV-PK-PR-SV-83', 'svp', 'svp|83|quaxwell||', 1),
  ('54feabc9-f65d-46fd-b3d4-71d35677f5a9'::uuid, '5043bce7-f57d-4325-a026-d6a37da3ce95'::uuid, 'GV-PK-PR-SV-086', 'GV-PK-PR-SV-86', 'svp', 'svp|86|mabosstiff ex||', 1),
  ('23e1224e-6a1d-49c0-94d2-5bb36a7e2711'::uuid, '5477b123-f3d5-4714-bd39-7b7397a8b5e0'::uuid, 'GV-PK-PR-SV-087', 'GV-PK-PR-SV-87', 'svp', 'svp|87|sprigatito ex||', 1),
  ('b7642ea2-8519-499e-b0a5-857943327933'::uuid, '61984aa6-9d6b-456c-9625-ecde4893091d'::uuid, 'GV-PK-PR-SV-088', 'GV-PK-PR-SV-88', 'svp', 'svp|88|pikachu||', 1),
  ('fee01f50-a98b-4594-b559-80d3da98e856'::uuid, '75bb8432-b187-4f94-a559-d55cf6cc7b61'::uuid, 'GV-PK-PR-SV-009', 'GV-PK-PR-SV-9', 'svp', 'svp|9|spidops||', 1),
  ('b4d77eb7-0a23-42e4-8365-59ab89a98cf5'::uuid, '96615575-de08-4370-aff4-77f66910f03a'::uuid, 'GV-PK-PR-SV-093', 'GV-PK-PR-SV-93', 'svp', 'svp|93|carvanha||', 1),
  ('e0e95ad4-64fb-4846-96b6-c1bc4bea89f6'::uuid, 'b6b0fa74-f011-4c8a-8953-de698686a47f'::uuid, 'GV-PK-PR-SV-094', 'GV-PK-PR-SV-94', 'svp', 'svp|94|bellibolt||', 1),
  ('e8df7cdf-b355-42a9-aebd-2e84a29ec39a'::uuid, '89a26c6b-55ae-4865-9298-a6a7b3bee303'::uuid, 'GV-PK-PR-SV-095', 'GV-PK-PR-SV-95', 'svp', 'svp|95|cleffa||', 1),
  ('799e08d1-667c-4b58-809b-313f1c615831'::uuid, '580ffe1e-1f6e-4dcd-99fd-bfbad7b3d95e'::uuid, 'GV-PK-PR-SV-096', 'GV-PK-PR-SV-96', 'svp', 'svp|96|cyclizar||', 1),
  ('bdce87a2-f2a9-45aa-aa7d-eddd5add43c3'::uuid, '0578797c-0d23-4ebb-a8de-7d861c953354'::uuid, 'GV-PK-PR-SV-097', 'GV-PK-PR-SV-97', 'svp', 'svp|97|flutter mane||', 1),
  ('9cb2307f-d80d-442b-9738-e9c7e3949e9a'::uuid, '7bee6735-51cf-4fb3-8d69-5f43f843a76b'::uuid, 'GV-PK-PR-SV-098', 'GV-PK-PR-SV-98', 'svp', 'svp|98|iron thorns||', 1),
  ('cfe55d5d-d756-411b-8850-eed580fb9667'::uuid, '02b75660-84f4-4164-8795-70efda01efc7'::uuid, 'GV-PK-PR-SV-099', 'GV-PK-PR-SV-99', 'svp', 'svp|99|shroodle||', 1),
  ('755dabde-0f54-48c0-9862-2a02053b37fe'::uuid, '0b4aa3b3-3c2e-4394-87c1-f28efa396e51'::uuid, 'GV-PK-LOR-017', 'GV-PK-LOR-17', 'swsh11', 'swsh11|17|trevenant||', 0),
  ('155e3b7b-c79a-495e-b849-9e6c66294673'::uuid, '0b24e7e8-9e51-428d-a974-2e2268c7b193'::uuid, 'GV-PK-LOR-026', 'GV-PK-LOR-26', 'swsh11', 'swsh11|26|chandelure||', 0),
  ('8c104bd5-c6b1-4d5b-8295-d50ac7ca5f9e'::uuid, '052f60a3-dc6d-433c-bce2-ed814c64e34d'::uuid, 'GV-PK-LOR-033', 'GV-PK-LOR-33', 'swsh11', 'swsh11|33|seel||', 1),
  ('fc4dbb32-9d0f-4353-bfd1-65959069aab4'::uuid, '071eccbf-7bdd-494a-a43e-b3bc6965ea3a'::uuid, 'GV-PK-LOR-045', 'GV-PK-LOR-45', 'swsh11', 'swsh11|45|hisuian basculegion||', 0),
  ('8f39a034-e33b-419a-a574-7d81d212d955'::uuid, '03ae5e0a-e43b-4828-8f6a-89a402d14656'::uuid, 'GV-PK-LOR-067', 'GV-PK-LOR-67', 'swsh11', 'swsh11|67|mr. mime||', 1),
  ('6595e3e2-cad0-44f7-bf29-18c7b9f0ecce'::uuid, '02eb2e6a-e65a-4d8e-8b5e-8f23b868c53f'::uuid, 'GV-PK-LOR-098', 'GV-PK-LOR-98', 'swsh11', 'swsh11|98|hariyama||', 1),
  ('5dcec667-2dc0-4cb5-97f0-e8342e190ff8'::uuid, '0fbf4a2e-2bd2-43b7-8f57-2ae906272571'::uuid, 'GV-PK-LOR-099', 'GV-PK-LOR-99', 'swsh11', 'swsh11|99|meditite||', 1);

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
  if v_targets <> 142 then
    raise exception 'POST-REC-02A target count guard failed: expected 142, got %', v_targets;
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

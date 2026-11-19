-- Explicitly synthetic local fixture reconstructed from the retained catalog audit.
-- Public identity/finish shapes only. Never apply this fixture to production.
begin;
do $$begin
 if current_setting('max_worker_processes')<>'0'
  or (select count(*) from public.card_prints)<>1313
  or (select count(*) from auth.users)<>1
  or (select count(*) from public.vault_item_instances)<>15
  or (select count(*) from public.card_prints where set_code in('sv06.5','sv6pt5'))<>198
  or exists(select 1 from public.card_printings c join public.card_prints p on p.id=c.card_print_id where p.set_code in('sv06.5','sv6pt5'))
 then raise exception 'SHROUDED_LOCAL_FIXTURE_PRECONDITION'; end if;
end$$;
update public.sets set name='Shrouded Fable',printed_total=64,printed_set_abbrev='SFA',release_date='2024-08-02' where code in('sv06.5','sv6pt5');
update public.card_prints parent set name=shape.name,number=shape.number,gv_id=shape.gv_id,identity_domain='pokemon_eng_standard'
from(values (1,'Joltik','001','GV-PK-SFA-001'),
(2,'Galvantula','002','GV-PK-SFA-002'),
(3,'Rowlet','003','GV-PK-SFA-003'),
(4,'Dartrix','004','GV-PK-SFA-004'),
(5,'Decidueye','005','GV-PK-SFA-005'),
(6,'Tapu Bulu','006','GV-PK-SFA-006'),
(7,'Houndour','007','GV-PK-SFA-007'),
(8,'Houndoom','008','GV-PK-SFA-008'),
(9,'Iron Moth','009','GV-PK-SFA-009'),
(10,'Horsea','010','GV-PK-SFA-010'),
(11,'Seadra','011','GV-PK-SFA-011'),
(12,'Kingdra ex','012','GV-PK-SFA-012'),
(13,'Sneasel','013','GV-PK-SFA-013'),
(14,'Weavile','014','GV-PK-SFA-014'),
(15,'Revavroom ex','015','GV-PK-SFA-015'),
(16,'Drowzee','016','GV-PK-SFA-016'),
(17,'Hypno','017','GV-PK-SFA-017'),
(18,'Duskull','018','GV-PK-SFA-018'),
(19,'Dusclops','019','GV-PK-SFA-019'),
(20,'Dusknoir','020','GV-PK-SFA-020'),
(21,'Cresselia','021','GV-PK-SFA-021'),
(22,'Sylveon','022','GV-PK-SFA-022'),
(23,'Croagunk','023','GV-PK-SFA-023'),
(24,'Toxicroak','024','GV-PK-SFA-024'),
(25,'Bloodmoon Ursaluna','025','GV-PK-SFA-025'),
(26,'Slither Wing','026','GV-PK-SFA-026'),
(27,'Zubat','027','GV-PK-SFA-027'),
(28,'Golbat','028','GV-PK-SFA-028'),
(29,'Crobat','029','GV-PK-SFA-029'),
(30,'Absol','030','GV-PK-SFA-030'),
(31,'Zorua','031','GV-PK-SFA-031'),
(32,'Zoroark','032','GV-PK-SFA-032'),
(33,'Inkay','033','GV-PK-SFA-033'),
(34,'Malamar','034','GV-PK-SFA-034'),
(35,'Yveltal','035','GV-PK-SFA-035'),
(36,'Okidogi ex','036','GV-PK-SFA-036'),
(37,'Munkidori ex','037','GV-PK-SFA-037'),
(38,'Fezandipiti ex','038','GV-PK-SFA-038'),
(39,'Pecharunt ex','039','GV-PK-SFA-039'),
(40,'Genesect','040','GV-PK-SFA-040'),
(41,'Cufant','041','GV-PK-SFA-041'),
(42,'Copperajah','042','GV-PK-SFA-042'),
(43,'Varoom','043','GV-PK-SFA-043'),
(44,'Axew','044','GV-PK-SFA-044'),
(45,'Fraxure','045','GV-PK-SFA-045'),
(46,'Haxorus','046','GV-PK-SFA-046'),
(47,'Kyurem','047','GV-PK-SFA-047'),
(48,'Meowth','048','GV-PK-SFA-048'),
(49,'Persian','049','GV-PK-SFA-049'),
(50,'Eevee','050','GV-PK-SFA-050'),
(51,'Furfrou','051','GV-PK-SFA-051'),
(52,'Stufful','052','GV-PK-SFA-052'),
(53,'Bewear','053','GV-PK-SFA-053'),
(54,'Academy at Night','054','GV-PK-SFA-054'),
(55,'Binding Mochi','055','GV-PK-SFA-055'),
(56,'Cassiopeia','056','GV-PK-SFA-056'),
(57,'Colress''s Tenacity','057','GV-PK-SFA-057'),
(58,'Dangerous Laser','058','GV-PK-SFA-058'),
(59,'Janine''s Secret Art','059','GV-PK-SFA-059'),
(60,'Neutralization Zone','060','GV-PK-SFA-060'),
(61,'Night Stretcher','061','GV-PK-SFA-061'),
(62,'Poké Vital A','062','GV-PK-SFA-062'),
(63,'Powerglass','063','GV-PK-SFA-063'),
(64,'Xerosic''s Machinations','064','GV-PK-SFA-064'),
(65,'Tapu Bulu','065','GV-PK-SFA-065'),
(66,'Houndoom','066','GV-PK-SFA-066'),
(67,'Horsea','067','GV-PK-SFA-067'),
(68,'Duskull','068','GV-PK-SFA-068'),
(69,'Dusclops','069','GV-PK-SFA-069'),
(70,'Dusknoir','070','GV-PK-SFA-070'),
(71,'Cresselia','071','GV-PK-SFA-071'),
(72,'Munkidori','072','GV-PK-SFA-072'),
(73,'Fezandipiti','073','GV-PK-SFA-073'),
(74,'Okidogi','074','GV-PK-SFA-074'),
(75,'Zorua','075','GV-PK-SFA-075'),
(76,'Cufant','076','GV-PK-SFA-076'),
(77,'Fraxure','077','GV-PK-SFA-077'),
(78,'Persian','078','GV-PK-SFA-078'),
(79,'Bewear','079','GV-PK-SFA-079'),
(80,'Kingdra ex','080','GV-PK-SFA-080'),
(81,'Revavroom ex','081','GV-PK-SFA-081'),
(82,'Okidogi ex','082','GV-PK-SFA-082'),
(83,'Munkidori ex','083','GV-PK-SFA-083'),
(84,'Fezandipiti ex','084','GV-PK-SFA-084'),
(85,'Pecharunt ex','085','GV-PK-SFA-085'),
(86,'Cassiopeia','086','GV-PK-SFA-086'),
(87,'Colress''s Tenacity','087','GV-PK-SFA-087'),
(88,'Janine''s Secret Art','088','GV-PK-SFA-088'),
(89,'Xerosic''s Machinations','089','GV-PK-SFA-089'),
(90,'Okidogi ex','090','GV-PK-SFA-090'),
(91,'Munkidori ex','091','GV-PK-SFA-091'),
(92,'Fezandipiti ex','092','GV-PK-SFA-092'),
(93,'Pecharunt ex','093','GV-PK-SFA-093'),
(94,'Cassiopeia','094','GV-PK-SFA-094'),
(95,'Pecharunt ex','095','GV-PK-SFA-095'),
(96,'Earthen Vessel','096','GV-PK-SFA-096'),
(97,'Powerglass','097','GV-PK-SFA-097'),
(98,'Basic Darkness Energy','098','GV-PK-SFA-098'),
(99,'Basic Metal Energy','099','GV-PK-SFA-099'))shape(n,name,number,gv_id)
where parent.set_code='sv06.5' and coalesce(parent.variant_key,'')='' and parent.number::int=shape.n;
update public.card_prints parent set name=shape.name,number=shape.number,gv_id=shape.gv_id,identity_domain='pokemon_eng_standard'
from(values (1,'Joltik','1','GV-PK-SFA-1'),
(10,'Horsea','10','GV-PK-SFA-10'),
(11,'Seadra','11','GV-PK-SFA-11'),
(12,'Kingdra ex','12','GV-PK-SFA-12'),
(13,'Sneasel','13','GV-PK-SFA-13'),
(14,'Weavile','14','GV-PK-SFA-14'),
(15,'Revavroom ex','15','GV-PK-SFA-15'),
(16,'Drowzee','16','GV-PK-SFA-16'),
(17,'Hypno','17','GV-PK-SFA-17'),
(18,'Duskull','18','GV-PK-SFA-18'),
(19,'Dusclops','19','GV-PK-SFA-19'),
(2,'Galvantula','2','GV-PK-SFA-2'),
(20,'Dusknoir','20','GV-PK-SFA-20'),
(21,'Cresselia','21','GV-PK-SFA-21'),
(22,'Sylveon','22','GV-PK-SFA-22'),
(23,'Croagunk','23','GV-PK-SFA-23'),
(24,'Toxicroak','24','GV-PK-SFA-24'),
(25,'Bloodmoon Ursaluna','25','GV-PK-SFA-25'),
(26,'Slither Wing','26','GV-PK-SFA-26'),
(27,'Zubat','27','GV-PK-SFA-27'),
(28,'Golbat','28','GV-PK-SFA-28'),
(29,'Crobat','29','GV-PK-SFA-29'),
(3,'Rowlet','3','GV-PK-SFA-3'),
(30,'Absol','30','GV-PK-SFA-30'),
(31,'Zorua','31','GV-PK-SFA-31'),
(32,'Zoroark','32','GV-PK-SFA-32'),
(33,'Inkay','33','GV-PK-SFA-33'),
(34,'Malamar','34','GV-PK-SFA-34'),
(35,'Yveltal','35','GV-PK-SFA-35'),
(36,'Okidogi ex','36','GV-PK-SFA-36'),
(37,'Munkidori ex','37','GV-PK-SFA-37'),
(38,'Fezandipiti ex','38','GV-PK-SFA-38'),
(39,'Pecharunt ex','39','GV-PK-SFA-39'),
(4,'Dartrix','4','GV-PK-SFA-4'),
(40,'Genesect','40','GV-PK-SFA-40'),
(41,'Cufant','41','GV-PK-SFA-41'),
(42,'Copperajah','42','GV-PK-SFA-42'),
(43,'Varoom','43','GV-PK-SFA-43'),
(44,'Axew','44','GV-PK-SFA-44'),
(45,'Fraxure','45','GV-PK-SFA-45'),
(46,'Haxorus','46','GV-PK-SFA-46'),
(47,'Kyurem','47','GV-PK-SFA-47'),
(48,'Meowth','48','GV-PK-SFA-48'),
(49,'Persian','49','GV-PK-SFA-49'),
(5,'Decidueye','5','GV-PK-SFA-5'),
(50,'Eevee','50','GV-PK-SFA-50'),
(51,'Furfrou','51','GV-PK-SFA-51'),
(52,'Stufful','52','GV-PK-SFA-52'),
(53,'Bewear','53','GV-PK-SFA-53'),
(54,'Academy at Night','54','GV-PK-SFA-54'),
(55,'Binding Mochi','55','GV-PK-SFA-55'),
(56,'Cassiopeia','56','GV-PK-SFA-56'),
(57,'Colress''s Tenacity','57','GV-PK-SFA-57'),
(58,'Dangerous Laser','58','GV-PK-SFA-58'),
(59,'Janine''s Secret Art','59','GV-PK-SFA-59'),
(6,'Tapu Bulu','6','GV-PK-SFA-6'),
(60,'Neutralization Zone','60','GV-PK-SFA-60'),
(61,'Night Stretcher','61','GV-PK-SFA-61'),
(62,'Poké Vital A','62','GV-PK-SFA-62'),
(63,'Powerglass','63','GV-PK-SFA-63'),
(64,'Xerosic''s Machinations','64','GV-PK-SFA-64'),
(65,'Tapu Bulu','65','GV-PK-SFA-65'),
(66,'Houndoom','66','GV-PK-SFA-66'),
(67,'Horsea','67','GV-PK-SFA-67'),
(68,'Duskull','68','GV-PK-SFA-68'),
(69,'Dusclops','69','GV-PK-SFA-69'),
(7,'Houndour','7','GV-PK-SFA-7'),
(70,'Dusknoir','70','GV-PK-SFA-70'),
(71,'Cresselia','71','GV-PK-SFA-71'),
(72,'Munkidori','72','GV-PK-SFA-72'),
(73,'Fezandipiti','73','GV-PK-SFA-73'),
(74,'Okidogi','74','GV-PK-SFA-74'),
(75,'Zorua','75','GV-PK-SFA-75'),
(76,'Cufant','76','GV-PK-SFA-76'),
(77,'Fraxure','77','GV-PK-SFA-77'),
(78,'Persian','78','GV-PK-SFA-78'),
(79,'Bewear','79','GV-PK-SFA-79'),
(8,'Houndoom','8','GV-PK-SFA-8'),
(80,'Kingdra ex','80','GV-PK-SFA-80'),
(81,'Revavroom ex','81','GV-PK-SFA-81'),
(82,'Okidogi ex','82','GV-PK-SFA-82'),
(83,'Munkidori ex','83','GV-PK-SFA-83'),
(84,'Fezandipiti ex','84','GV-PK-SFA-84'),
(85,'Pecharunt ex','85','GV-PK-SFA-85'),
(86,'Cassiopeia','86','GV-PK-SFA-86'),
(87,'Colress''s Tenacity','87','GV-PK-SFA-87'),
(88,'Janine''s Secret Art','88','GV-PK-SFA-88'),
(89,'Xerosic''s Machinations','89','GV-PK-SFA-89'),
(9,'Iron Moth','9','GV-PK-SFA-9'),
(90,'Okidogi ex','90','GV-PK-SFA-90'),
(91,'Munkidori ex','91','GV-PK-SFA-91'),
(92,'Fezandipiti ex','92','GV-PK-SFA-92'),
(93,'Pecharunt ex','93','GV-PK-SFA-93'),
(94,'Cassiopeia','94','GV-PK-SFA-94'),
(95,'Pecharunt ex','95','GV-PK-SFA-95'),
(96,'Earthen Vessel','96','GV-PK-SFA-96'),
(97,'Powerglass','97','GV-PK-SFA-97'),
(98,'Basic Darkness Energy','98','GV-PK-SFA-98'),
(99,'Basic Metal Energy','99','GV-PK-SFA-99'))shape(n,name,number,gv_id)
where parent.set_code='sv6pt5' and coalesce(parent.variant_key,'')='' and parent.number::int=shape.n;
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Galvantula','002','GV-PK-SV06-5-002-PRIZE-PACK-STAMP','prize_pack_stamp','prize_pack_stamp','pokemon_eng_standard','{"verified_master_index_v1":{"evidence":[{"set_key":"sv06.5","set_name":"Shrouded Fable","card_name":"Galvantula","finish_key":"cosmos","source_key":"pricecharting","source_url":"https://www.pricecharting.com/game/pokemon-Shrouded-Fable/Galvantula-002","card_number":"2","source_kind":"marketplace_checklist","variant_key":"prize_pack_stamp","evidence_label":"PriceCharting search result identifies Galvantula #002 Prize Pack Cosmos Holo."},{"set_key":"sv06.5","set_name":"Shrouded Fable","card_name":"Galvantula","finish_key":"cosmos","source_key":"ebay","source_url":"https://www.ebay.com/itm/335837500784","card_number":"2","source_kind":"marketplace_checklist","variant_key":"prize_pack_stamp","evidence_label":"eBay listing title identifies Galvantula #002 Prize Pack 6 as Cosmo Holo."}],"stamp_label":"prize_pack_stamp","source_status":"ready_for_guarded_dry_run","evidence_count":2,"source_families":["ebay","pricecharting"],"source_package_id":"PKG-17E-STAMPED-ACTIVE-FINISH-WEB-EVIDENCE","stamped_variant_key":"prize_pack_stamp","active_child_finish_key":"cosmos","selected_base_parent_id":"dd251220-bc75-49f5-b80b-146ec6a839c0","source_fingerprint_sha256":"1e655ea689401abeb9be3805bb266b471be3adc758dd19f7c18befdc0a0a5714","live_base_parent_child_finishes":["cosmos","normal","reverse"],"stale_source_base_parent_child_finishes":["normal","reverse"]}}'::jsonb
from public.sets where code='sv06.5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Kingdra ex','012','GV-PK-SFA-012-SHROUDED-FABLE-STAMP','shrouded_fable_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Dusclops','019','GV-PK-SFA-019-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Dusknoir','020','GV-PK-SFA-020-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Okidogi ex','036','GV-PK-SFA-036-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Munkidori ex','037','GV-PK-SFA-037-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Pecharunt ex','039','GV-PK-SFA-039-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Genesect','040','GV-PK-SFA-040-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Copperajah','042','GV-PK-SFA-042-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Binding Mochi','055','GV-PK-SFA-055-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Colress''s Tenacity','057','GV-PK-SFA-057-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Janine''s Secret Art','059','GV-PK-SFA-059-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Neutralization Zone','060','GV-PK-SFA-060-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain,external_ids)
select (select id from public.games where code='pokemon'),id,code,'Powerglass','063','GV-PK-SFA-063-PLAY-POKEMON-STAMP','play_pokemon_stamp',null,'pokemon_eng_standard','{}'::jsonb
from public.sets where code='sv6pt5';
update public.card_prints stamp set external_ids=jsonb_set(stamp.external_ids,'{verified_master_index_v1,selected_base_parent_id}',to_jsonb(base.id::text))
from public.card_prints base where stamp.gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP' and base.set_code='sv06.5' and base.number::int=2 and coalesce(base.variant_key,'')='';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-001-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-001';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-001-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-001';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-002-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-002';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-002-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-002';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'cosmos','GV-PK-SV06-5-002-PRIZE-PACK-STAMP-COSMOS','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-003-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-003';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-003-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-003';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-004-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-004';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-004-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-004';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-005-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-005';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-005-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-005';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-006-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-006';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-006-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-006';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-007-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-007';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-007-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-007';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-008-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-008';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-008-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-008';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-009-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-009';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-009-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-009';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-010-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-010';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-010-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-010';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-011-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-011';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-011-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-011';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-012-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-012';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-013-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-013';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-013-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-013';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-014-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-014';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-014-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-014';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-015-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-015';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-016-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-016';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-016-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-016';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-017-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-017';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-017-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-017';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-018-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-018';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-018-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-018';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-019-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-019';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-019-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-019';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-020-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-020';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-020-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-020';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-021-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-021';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-021-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-021';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-022-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-022';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-022-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-022';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-023-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-023';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-023-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-023';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-024-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-024';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-024-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-024';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-025-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-025';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-025-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-025';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-026-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-026';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-026-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-026';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-027-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-027';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-027-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-027';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-028-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-028';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-028-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-028';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-029-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-029';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-029-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-029';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-030-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-030';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-030-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-030';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-031-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-031';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-031-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-031';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-032-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-032';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-032-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-032';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-033-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-033';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-033-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-033';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-034-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-034';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-034-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-034';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-035-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-035';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-035-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-035';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-036-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-036';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-037-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-037';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-038-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-038';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-039-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-039';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-040-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-040';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-040-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-040';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-041-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-041';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-041-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-041';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-042-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-042';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-042-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-042';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-043-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-043';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-043-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-043';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-044-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-044';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-044-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-044';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-045-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-045';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-045-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-045';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-046-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-046';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-046-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-046';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-047-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-047';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-047-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-047';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-048-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-048';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-048-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-048';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-049-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-049';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-049-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-049';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-050-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-050';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-050-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-050';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-051-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-051';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-051-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-051';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-052-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-052';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-052-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-052';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-053-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-053';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-053-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-053';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-054-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-054';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-054-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-054';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-055-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-055';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-055-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-055';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-056-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-056';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-056-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-056';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-057-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-057';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-057-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-057';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-058-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-058';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-059-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-059';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-059-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-059';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-060-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-060';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-061-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-061';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-061-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-061';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-062-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-062';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-063-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-063';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-063-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-063';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-064-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-064';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-064-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-064';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-065-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-065';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-066-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-066';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-067-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-067';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-068-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-068';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-069-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-069';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-070-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-070';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-071-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-071';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-072-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-072';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-073-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-073';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-074-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-074';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-075-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-075';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-076-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-076';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-077-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-077';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-078-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-078';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-079-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-079';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-080-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-080';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-081-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-081';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-082-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-082';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-083-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-083';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-084-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-084';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-085-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-085';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-086-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-086';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-087-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-087';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-088-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-088';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-089-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-089';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-090-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-090';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-091-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-091';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-092-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-092';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-093-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-093';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-094-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-094';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-095-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-095';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-096-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-096';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-097-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-097';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-098-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-098';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-099-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-099';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-019-PLAY-POKEMON-STAMP-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-019-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-020-PLAY-POKEMON-STAMP-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-020-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-036-PLAY-POKEMON-STAMP-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-036-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-037-PLAY-POKEMON-STAMP-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-037-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-039-PLAY-POKEMON-STAMP-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-039-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'cosmos','GV-PK-SFA-040-PLAY-POKEMON-STAMP-COSMOS','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-040-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'cosmos','GV-PK-SFA-042-PLAY-POKEMON-STAMP-COSMOS','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-042-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-055-PLAY-POKEMON-STAMP-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-055-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-057-PLAY-POKEMON-STAMP-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-057-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-059-PLAY-POKEMON-STAMP-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-059-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-060-PLAY-POKEMON-STAMP-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-060-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-063-PLAY-POKEMON-STAMP-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-063-PLAY-POKEMON-STAMP';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-1-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-1';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-1-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-1';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-10-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-10';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-10-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-10';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-11-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-11';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-11-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-11';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-12-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-12';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-13-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-13';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-13-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-13';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-14-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-14';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-14-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-14';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-15-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-15';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-16-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-16';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-16-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-16';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-17-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-17';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-17-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-17';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-18-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-18';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-18-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-18';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-19-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-19';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-19-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-19';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-2-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-2';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-2-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-2';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-20-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-20';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-20-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-20';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-21-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-21';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-21-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-21';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-22-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-22';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-22-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-22';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-23-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-23';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-23-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-23';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-24-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-24';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-24-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-24';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-25-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-25';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-25-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-25';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-26-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-26';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-26-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-26';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-27-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-27';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-27-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-27';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-28-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-28';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-28-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-28';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-29-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-29';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-29-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-29';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-3-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-3';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-3-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-3';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-30-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-30';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-30-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-30';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-31-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-31';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-31-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-31';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-32-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-32';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-32-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-32';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-33-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-33';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-33-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-33';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-34-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-34';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-34-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-34';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-35-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-35';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-35-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-35';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-36-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-36';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-37-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-37';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-38-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-38';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-39-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-39';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-4-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-4';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-4-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-4';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-40-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-40';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-40-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-40';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-41-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-41';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-41-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-41';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-42-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-42';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-42-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-42';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-43-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-43';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-43-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-43';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-44-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-44';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-44-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-44';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-45-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-45';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-45-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-45';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-46-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-46';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-46-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-46';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-47-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-47';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-47-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-47';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-48-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-48';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-48-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-48';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-49-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-49';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-49-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-49';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-5-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-5';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-5-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-5';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-50-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-50';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-50-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-50';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-51-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-51';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-51-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-51';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-52-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-52';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-52-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-52';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-53-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-53';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-53-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-53';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-54-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-54';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-54-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-54';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-55-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-55';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-55-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-55';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-56-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-56';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-56-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-56';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-57-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-57';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-57-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-57';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-58-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-58';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-59-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-59';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-59-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-59';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-6-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-6';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-6-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-6';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-60-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-60';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-61-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-61';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-61-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-61';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-62-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-62';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-63-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-63';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-63-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-63';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-64-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-64';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-64-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-64';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-65-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-65';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-66-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-66';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-67-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-67';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-68-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-68';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-69-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-69';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-7-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-7';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-7-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-7';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-70-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-70';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-71-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-71';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-72-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-72';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-73-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-73';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-74-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-74';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-75-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-75';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-76-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-76';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-77-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-77';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-78-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-78';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-79-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-79';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-8-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-8';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-8-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-8';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-80-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-80';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-81-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-81';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-82-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-82';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-83-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-83';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-84-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-84';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-85-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-85';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-86-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-86';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-87-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-87';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-88-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-88';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-89-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-89';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'normal','GV-PK-SFA-9-STD','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-9';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'reverse','GV-PK-SFA-9-REVERSE','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-9';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-90-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-90';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-91-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-91';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-92-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-92';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-93-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-93';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-94-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-94';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-95-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-95';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-96-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-96';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-97-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-97';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-98-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-98';
insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,is_provisional) select id,'holo','GV-PK-SFA-99-HOLO','local_shrouded_fixture',false from public.card_prints where gv_id='GV-PK-SFA-99';
insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select '10000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000016',p.id,p.name,p.gv_id,2 from public.card_prints p where p.gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP';
insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id)
select gen_random_uuid(),'10000000-0000-0000-0000-000000000016',p.id,case when n=1 then (select id from public.card_printings c where c.card_print_id=p.id order by c.finish_key limit 1) else null end,'10000000-0000-0000-0000-000000000022','GVVI-LOCAL-SHROUDED-LEGACY-'||n::text from generate_series(1,2)n cross join public.card_prints p where p.gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP';
insert into public.vault_items(id,user_id,card_id,name,gv_id,qty) select '10000000-0000-0000-0000-000000000023','10000000-0000-0000-0000-000000000016',p.id,p.name,p.gv_id,2 from public.card_prints p where p.set_code='sv6pt5' and p.number::int=1 and coalesce(p.variant_key,'')='';
insert into public.vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id)
select gen_random_uuid(),'10000000-0000-0000-0000-000000000016',p.id,case when n=1 then (select id from public.card_printings c where c.card_print_id=p.id order by c.finish_key limit 1) else null end,'10000000-0000-0000-0000-000000000023','GVVI-LOCAL-SHROUDED-CANONICAL-'||n::text from generate_series(1,2)n cross join public.card_prints p where p.set_code='sv6pt5' and p.number::int=1 and coalesce(p.variant_key,'')='';
commit;

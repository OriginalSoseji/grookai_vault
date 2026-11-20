-- Exactly nine Best of Game discovery aliases. No physical object or finish mutation.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
set local search_path=public,pg_catalog;
lock table public.card_prints,public.card_printings,public.sets,public.external_mappings,public.card_print_identity,public.card_print_identity_aliases in share row exclusive mode;
create or replace function public.get_best_of_game_discovery_evidence_v1()
returns jsonb language sql stable security definer set search_path=''
as $function$
 with expected(id,gv_id,set_id,set_code,name,number,identity_domain,variant_key,modifier) as materialized(values
('6b07130e-6ce9-468e-828b-3df34f7be2d4','GV-PK-BOG-1','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Electabuzz','1','pokemon_eng_standard','',null),
('4e714b58-bcf3-4931-9c46-163dadba49b8','GV-PK-BP-1','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Electabuzz','1','pokemon_eng_standard','',null),
('2ff0f40b-493e-4a81-ae00-668e621c8b57','GV-PK-BOG-2','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Hitmonchan','2','pokemon_eng_standard','',null),
('cf3b8770-892a-41d8-8a47-647dbb742fee','GV-PK-BP-2','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Hitmonchan','2','pokemon_eng_standard','',null),
('bdfa57ee-93dd-4ff2-88d0-4f90e217d0ec','GV-PK-BOG-3','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Professor Elm','3','pokemon_eng_standard','',null),
('bd1d64ae-7ce1-469a-821f-2203099eab4f','GV-PK-BP-3','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Professor Elm','3','pokemon_eng_standard','',null),
('4e0665d4-2a6a-4602-8799-db55cbb5f588','GV-PK-BOG-4','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Rocket’s Scizor','4','pokemon_eng_standard','',null),
('8dae8f1d-437f-464c-8415-50f763d1801d','GV-PK-BP-4','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Rocket''s Scizor','4','pokemon_eng_standard','',null),
('da7a223c-b039-4fa0-99c1-c8e396f90f5f','GV-PK-BOG-5','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Rocket’s Sneasel','5','pokemon_eng_standard','',null),
('53761d11-41ee-4971-a393-67052780eb05','GV-PK-BP-5','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Rocket''s Sneasel','5','pokemon_eng_standard','',null),
('700be8a4-8283-411f-af66-371b61e443f9','GV-PK-BOG-6','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Dark Ivysaur','6','pokemon_eng_standard','',null),
('796dfb87-68c7-43bb-b61f-153d40a64cf4','GV-PK-BP-6','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Dark Ivysaur','6','pokemon_eng_standard','',null),
('1c88e69a-1b86-4677-bf93-b977e24e42a2','GV-PK-BOG-7','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Dark Venusaur','7','pokemon_eng_standard','',null),
('03a8bb19-b9c2-42df-b18c-1671746030ab','GV-PK-BP-7','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Dark Venusaur','7','pokemon_eng_standard','',null),
('3f63983b-4a5a-41d2-a510-bfd327d62778','GV-PK-BOG-8','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Rocket’s Mewtwo','8','pokemon_eng_standard','',null),
('371e2c1c-4a18-4961-b2a3-8d01edc07e90','GV-PK-BP-8','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Rocket''s Mewtwo','8','pokemon_eng_standard','',null),
('c9975f91-2815-44f7-b2c8-d7652edaf321','GV-PK-BOG-9','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Rocket’s Hitmonchan','9','pokemon_eng_standard','',null),
('acf3e7a7-5f8d-43d2-ad5c-972db7568be7','GV-PK-BP-9','c8debb57-da6f-46ce-8777-13ecedfe2856','bp','Rocket''s Hitmonchan','9','pokemon_eng_standard','',null),
('614efd10-0ce3-438b-8466-6584bebb88cb','GV-PK-BOG-1-WINNER-STAMP','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Electabuzz','1','pokemon_eng_standard','winner_stamp','winner_stamp'),
('c0204042-56f4-42a8-878c-7908a2925863','GV-PK-BOG-2-WINNER-STAMP','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Hitmonchan','2','pokemon_eng_standard','winner_stamp','winner_stamp'),
('33126ebf-99f6-4d76-a9bc-179c89e2eb34','GV-PK-BOG-6-WINNER-STAMP','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Dark Ivysaur','6','pokemon_eng_standard','winner_stamp','winner_stamp'),
('03e8e4c7-ad3d-470b-adb3-69082a7f6181','GV-PK-BOG-7-WINNER-STAMP','157ea50d-3ab7-42a4-82d3-9e5c89f0a57c','bog','Dark Venusaur','7','pokemon_eng_standard','winner_stamp','winner_stamp')),
 expected_children(id,gv_id,finish,parent_id) as materialized(values
('f8026127-0cc8-42c8-8b6a-0d580465d532','GV-PK-BOG-1-RH','reverse','6b07130e-6ce9-468e-828b-3df34f7be2d4'),
('c045c213-5273-5241-a9ce-2c5234e8d278','GV-PK-BP-1-REV','reverse','4e714b58-bcf3-4931-9c46-163dadba49b8'),
('09d50360-2444-4035-8b35-47bd917f0a98','GV-PK-BOG-2-RH','reverse','2ff0f40b-493e-4a81-ae00-668e621c8b57'),
('fb78c3ee-6113-5547-aef5-b927a8273b18','GV-PK-BP-2-REV','reverse','cf3b8770-892a-41d8-8a47-647dbb742fee'),
('619f6a8d-08c6-4833-b705-402b7f96c622','GV-PK-BOG-3-RH','reverse','bdfa57ee-93dd-4ff2-88d0-4f90e217d0ec'),
('7777dbc1-645f-5831-ad2d-e3a77d5bb246','GV-PK-BP-3-REV','reverse','bd1d64ae-7ce1-469a-821f-2203099eab4f'),
('a125087f-ec65-4799-9bce-48a5fc7af795','GV-PK-BOG-4-STD','normal','4e0665d4-2a6a-4602-8799-db55cbb5f588'),
('c06bd6ca-fae7-4314-bf1e-837bc9176dc4','GV-PK-BP-4-STD','normal','8dae8f1d-437f-464c-8415-50f763d1801d'),
('7f3d7529-1f37-41e2-ab0c-eeb59f21bd26','GV-PK-BOG-5-STD','normal','da7a223c-b039-4fa0-99c1-c8e396f90f5f'),
('3b444a39-5509-4ed9-ba8d-db6c44d212e8','GV-PK-BP-5-STD','normal','53761d11-41ee-4971-a393-67052780eb05'),
('acbee7b5-5de2-4ffa-92bb-c7efc39a94e2','GV-PK-BOG-6-STD','normal','700be8a4-8283-411f-af66-371b61e443f9'),
('a009570b-f50f-473e-9a2d-22951cd5f459','GV-PK-BP-6-STD','normal','796dfb87-68c7-43bb-b61f-153d40a64cf4'),
('9e0ef6f3-6c2f-4b55-a05b-4c94d0dd37dc','GV-PK-BOG-7-STD','normal','1c88e69a-1b86-4677-bf93-b977e24e42a2'),
('399cb935-008e-4cfb-8aa2-1317d9b0f316','GV-PK-BP-7-STD','normal','03a8bb19-b9c2-42df-b18c-1671746030ab'),
('40ebf6d7-864c-4aef-85ac-bf36d5cd04c6','GV-PK-BOG-8-RH','reverse','3f63983b-4a5a-41d2-a510-bfd327d62778'),
('677f6bb6-ee77-58cf-aef5-9b7cba48cbc9','GV-PK-BP-8-RH','reverse','371e2c1c-4a18-4961-b2a3-8d01edc07e90'),
('66eccac6-5424-4c03-8a57-2bb333065347','GV-PK-BOG-9-RH','reverse','c9975f91-2815-44f7-b2c8-d7652edaf321'),
('92bc003d-c229-5ff3-aa6b-a45974d6454c','GV-PK-BP-9-RH','reverse','acf3e7a7-5f8d-43d2-ad5c-972db7568be7')),
 expected_identity(card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash) as materialized(values
('03a8bb19-b9c2-42df-b18c-1671746030ab','pokemon_eng_standard','bp','7','dark venusaur',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','a88cb033effb12fe52850fad7029116d75a289ef9b1008e4bfafa0a918145090'),
('03e8e4c7-ad3d-470b-adb3-69082a7f6181','pokemon_eng_standard','bog','7','dark venusaur',null,'{"printed_total":9,"printed_set_abbrev":"BOG","variant_key_current":"winner_stamp"}','pokemon_eng_standard:v1','9c6f35f905d6bd93987cdd8838e457a1b0245bc9085828b4c78b1a305bd2ba65'),
('1c88e69a-1b86-4677-bf93-b977e24e42a2','pokemon_eng_standard','bog','7','dark venusaur',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','c2c3cdd5d713b48b235350bd2cd45d996aa606be31a7d0c5c1d554140ea70d28'),
('2ff0f40b-493e-4a81-ae00-668e621c8b57','pokemon_eng_standard','bog','2','hitmonchan',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','d0407b868821cc920b92e6eecfca16a5ec34bcb95355a51b80130e52ae94e316'),
('33126ebf-99f6-4d76-a9bc-179c89e2eb34','pokemon_eng_standard','bog','6','dark ivysaur',null,'{"printed_total":9,"printed_set_abbrev":"BOG","variant_key_current":"winner_stamp"}','pokemon_eng_standard:v1','c342515fcf12957aa34426bc48949cac3ee4ea80de6491845f425d835a8bb05e'),
('371e2c1c-4a18-4961-b2a3-8d01edc07e90','pokemon_eng_standard','bp','8','rocket''s mewtwo',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','ee8964cfa7a53403fe01d490042305d2753a48bddcd13048ac2bb0b4f5d9bd31'),
('3f63983b-4a5a-41d2-a510-bfd327d62778','pokemon_eng_standard','bog','8','rocket’s mewtwo',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','62776ad0733e0a95e0f37f0810e65dcf66a71a19ece70f68038750b4ba76924c'),
('4e0665d4-2a6a-4602-8799-db55cbb5f588','pokemon_eng_standard','bog','4','rocket’s scizor',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','8fe46d66335031029866c632bfe2d3b879f173c1382ed77648a604f9786a0260'),
('4e714b58-bcf3-4931-9c46-163dadba49b8','pokemon_eng_standard','bp','1','electabuzz',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','c12482e2f9f2c84858379a93db5afc056097ab046358a356e57b1927d7c588f2'),
('53761d11-41ee-4971-a393-67052780eb05','pokemon_eng_standard','bp','5','rocket''s sneasel',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','26a91d85c45bb5f5a6dbf7d52f38bdf93aadbfc1446485a774a31fe52abe7223'),
('614efd10-0ce3-438b-8466-6584bebb88cb','pokemon_eng_standard','bog','1','electabuzz',null,'{"printed_total":9,"printed_set_abbrev":"BOG","variant_key_current":"winner_stamp"}','pokemon_eng_standard:v1','e3e94de30d709f6cbaaf77f03f2cc8a1496a76b86d78741c374621e6fccc6cc3'),
('6b07130e-6ce9-468e-828b-3df34f7be2d4','pokemon_eng_standard','bog','1','electabuzz',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','8c5bdd1408c4b8797b09bfa408459ef8fed884a679a74bea3c6eb48fe73145e2'),
('700be8a4-8283-411f-af66-371b61e443f9','pokemon_eng_standard','bog','6','dark ivysaur',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','b2acddc346de312c2f75f398d9f0177084d5c2d815e36ba9f7a0a2320c9150c3'),
('796dfb87-68c7-43bb-b61f-153d40a64cf4','pokemon_eng_standard','bp','6','dark ivysaur',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','e4b5ecbd661a83d97b5b676fda540554200f1e2092b40b9f1f9e71c71f912112'),
('8dae8f1d-437f-464c-8415-50f763d1801d','pokemon_eng_standard','bp','4','rocket''s scizor',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','eb5eff2ab109dc416ce2bf181cfcc0b8981e2e25f14bbe47acb4ea8f6efa5c03'),
('acf3e7a7-5f8d-43d2-ad5c-972db7568be7','pokemon_eng_standard','bp','9','rocket''s hitmonchan',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','19e6c066af222d3514411830c1254fe56b0d593d33b8e7c37a78a4a5d3cf1034'),
('bd1d64ae-7ce1-469a-821f-2203099eab4f','pokemon_eng_standard','bp','3','professor elm',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','c5f0dde889487188d70b48978a43d512ddd6f7684813a67d5b29699a8a2af75a'),
('bdfa57ee-93dd-4ff2-88d0-4f90e217d0ec','pokemon_eng_standard','bog','3','professor elm',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','e4288151dd70d3a2357f74503dd313df08911d22560b9b4f8407b50958585b4f'),
('c0204042-56f4-42a8-878c-7908a2925863','pokemon_eng_standard','bog','2','hitmonchan',null,'{"printed_total":9,"printed_set_abbrev":"BOG","variant_key_current":"winner_stamp"}','pokemon_eng_standard:v1','2acd2436c3b81d503e5e088f0ec2fe3f464fea879275909e2bf4d1f34a01971c'),
('c9975f91-2815-44f7-b2c8-d7652edaf321','pokemon_eng_standard','bog','9','rocket’s hitmonchan',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','a040965c5ee71a5b3266bb28d1375f554f483217ea60a239b6c5e0cf5a93999f'),
('cf3b8770-892a-41d8-8a47-647dbb742fee','pokemon_eng_standard','bp','2','hitmonchan',null,'{"printed_total":9,"printed_set_abbrev":"BP","variant_key_current":"base"}','pokemon_eng_standard:v1','6b99e190255e06fc235919340f12d9efc46d8f2db43ddeb8c75781dba98362cf'),
('da7a223c-b039-4fa0-99c1-c8e396f90f5f','pokemon_eng_standard','bog','5','rocket’s sneasel',null,'{"printed_total":9,"printed_set_abbrev":"BOG"}','pokemon_eng_standard:v1','08689663e6d42a51e602e53a23052c99af10928481958109e23f64ce8b8d3704')),
 matched as materialized(
  select p.* from expected e join public.card_prints p on p.id=e.id::uuid
  join public.sets s on s.id=p.set_id
  where p.gv_id=e.gv_id and p.set_id=e.set_id::uuid and p.set_code=e.set_code
   and p.name=e.name and p.number=e.number and p.identity_domain=e.identity_domain
   and p.variant_key is not distinct from e.variant_key
   and p.printed_identity_modifier is not distinct from e.modifier
   and s.code=e.set_code and s.game='pokemon' and s.printed_total=9
   and ((s.code='bog' and s.source->>'tcgdex_set'='bog' and s.printed_set_abbrev='BOG')
     or(s.code='bp' and s.source#>>'{pokemonapi,id}'='bp' and s.printed_set_abbrev='BP'))
   and public.catalog_set_visible_to_request_v1(s.id)
   and public.catalog_card_print_visible_to_request_v1(p.id)
   and coalesce(p.data_quality_flags#>>'{app_visibility_v1,status}','visible')<>'suppressed'
 ), valid as materialized(
  select (select count(*) from matched)=22
   and (select count(*) from expected_identity e join public.card_print_identity i
     on i.card_print_id=e.card_print_id::uuid and i.is_active
     where i.identity_domain=e.identity_domain and i.set_code_identity=e.set_code_identity
       and i.printed_number=e.printed_number and i.normalized_printed_name=e.normalized_printed_name
       and i.source_name_raw is not distinct from e.source_name_raw
       and i.identity_payload=e.identity_payload::jsonb
       and i.identity_key_version=e.identity_key_version and i.identity_key_hash=e.identity_key_hash)=22
   and (select count(*) from public.card_prints where set_code='bog')=13
   and (select count(*) from public.card_prints where set_code='bp')=9
   and (select count(*) from public.card_printings c join matched p on p.id=c.card_print_id)=18
   and (select count(*) from expected_children e join public.card_printings c on c.id=e.id::uuid
     join matched p on p.id=c.card_print_id and p.id=e.parent_id::uuid
     where c.printing_gv_id=e.gv_id and c.finish_key=e.finish and not c.is_provisional)=18
   and not exists(select 1 from expected_children e join public.card_printings c on c.id=e.id::uuid
     where not exists(select 1 from public.finish_keys f where f.key=c.finish_key and f.is_active)
       or exists(select 1 from public.card_printing_truth_reviews r where r.card_printing_id=c.id and r.active
         and r.public_visibility in('hidden_pending_review','hidden_unsupported')))
   and not exists(select 1 from matched p where
      (p.variant_key='winner_stamp' and exists(select 1 from public.card_printings c where c.card_print_id=p.id))
      or(p.variant_key='' and (select count(*) from public.card_printings c where c.card_print_id=p.id)<>1))
   and not exists(select 1 from matched p where p.variant_key='' and not exists(
     select 1 from public.external_mappings m where m.card_print_id=p.id and m.active
       and m.source=case p.set_code when 'bog' then 'tcgdex' else 'pokemonapi' end
       and m.external_id=p.set_code||'-'||p.number))
   and not exists(select 1 from public.card_print_identity_aliases a join matched p
     on p.id=a.legacy_card_print_id or p.id=a.canonical_card_print_id
     where a.active and (a.legacy_set_code<>'bog' or a.canonical_set_code<>'bp'
       or p.variant_key='winner_stamp' or p.set_code='bp' and p.id=a.legacy_card_print_id)) as ok
 )
 select jsonb_build_object('legacy_ids',(select jsonb_agg(id order by id) from matched where set_code='bog' and variant_key=''),
  'canonical_ids',(select jsonb_agg(id order by id) from matched where set_code='bp'),
  'winner_ids',(select jsonb_agg(id order by id) from matched where variant_key='winner_stamp'),
  'legacy_names','{"8dae8f1d-437f-464c-8415-50f763d1801d":"Rocket’s Scizor","53761d11-41ee-4971-a393-67052780eb05":"Rocket’s Sneasel","371e2c1c-4a18-4961-b2a3-8d01edc07e90":"Rocket’s Mewtwo","acf3e7a7-5f8d-43d2-ad5c-972db7568be7":"Rocket’s Hitmonchan"}'::jsonb,
  'canonical_set_id','c8debb57-da6f-46ce-8777-13ecedfe2856') from valid where ok;
$function$;
revoke all on function public.get_best_of_game_discovery_evidence_v1() from public;
grant execute on function public.get_best_of_game_discovery_evidence_v1() to anon,authenticated,service_role;
comment on function public.get_best_of_game_discovery_evidence_v1() is 'Exact visible retained Best of Game membership, provider lineage and existing child inventory only. Null on changed evidence. No printing certification or finish inference.';

do $guard$ begin
 if public.get_best_of_game_discovery_evidence_v1() is null then raise exception 'BEST_OF_GAME_SOURCE_EVIDENCE_DRIFT' using errcode='23514';end if;
end $guard$;
with expected(legacy_id,canonical_id) as(values ('6b07130e-6ce9-468e-828b-3df34f7be2d4'::uuid,'4e714b58-bcf3-4931-9c46-163dadba49b8'::uuid),
('2ff0f40b-493e-4a81-ae00-668e621c8b57'::uuid,'cf3b8770-892a-41d8-8a47-647dbb742fee'::uuid),
('bdfa57ee-93dd-4ff2-88d0-4f90e217d0ec'::uuid,'bd1d64ae-7ce1-469a-821f-2203099eab4f'::uuid),
('4e0665d4-2a6a-4602-8799-db55cbb5f588'::uuid,'8dae8f1d-437f-464c-8415-50f763d1801d'::uuid),
('da7a223c-b039-4fa0-99c1-c8e396f90f5f'::uuid,'53761d11-41ee-4971-a393-67052780eb05'::uuid),
('700be8a4-8283-411f-af66-371b61e443f9'::uuid,'796dfb87-68c7-43bb-b61f-153d40a64cf4'::uuid),
('1c88e69a-1b86-4677-bf93-b977e24e42a2'::uuid,'03a8bb19-b9c2-42df-b18c-1671746030ab'::uuid),
('3f63983b-4a5a-41d2-a510-bfd327d62778'::uuid,'371e2c1c-4a18-4961-b2a3-8d01edc07e90'::uuid),
('c9975f91-2815-44f7-b2c8-d7652edaf321'::uuid,'acf3e7a7-5f8d-43d2-ad5c-972db7568be7'::uuid))
insert into public.card_print_identity_aliases(legacy_card_print_id,canonical_card_print_id,legacy_set_code,canonical_set_code,evidence_reason,created_from_audit,active,authority_status,authority_sources,authority_decision,adjudicated_at)
select legacy_id,canonical_id,'bog','bp','Exact reviewed nine-card source correspondence; retain four distinct Winner parents and every physical object/reference.','best_of_game_discovery_20261120',true,'approved',
array['pokemon_tcg_data_bp','tcgdex_bog','grookai_release_metadata'],'{"legacy_set_code":"bog","canonical_set_code":"bp","expected_overlap_count":9,"canonical_basis":"PokemonTCG provider coordinate already stored by grookai release metadata; exact nine-card source correspondence independently checked against TCGdex.","legacy_disposition":"Retain every stored object, coordinate and downstream reference; suppress only nine approved base aliases in discovery.","finish_policy":"Preserve congruent existing child inventories; no finish creation, transfer, ID rewrite or whole-set printing certification.","identity_evidence":"Exact frozen parent UUID, public ID, source coordinate, name, number, domain, variant and modifier; apostrophe differences enumerated per pair.","classification_sha256":"7ca628ab535be23a9d600c3dcf1f8ef82320bcfee92b7d78326240a7009c4a0f","collision_matrix_sha256":"ca4dc1a64f8246bc16c8a315c456e98aed6a43c07ef17ba2f9644a7c64c10494"}'::jsonb,now()
from expected where not exists(select 1 from public.card_print_identity_aliases a where a.legacy_card_print_id=legacy_id and a.active);
create or replace function public.get_best_of_game_discovery_exclusions_v1()
returns uuid[] language sql stable security definer set search_path=''
as $function$
 with evidence as materialized(select public.get_best_of_game_discovery_evidence_v1() as value),
 expected(legacy_id,canonical_id) as(values ('6b07130e-6ce9-468e-828b-3df34f7be2d4'::uuid,'4e714b58-bcf3-4931-9c46-163dadba49b8'::uuid),
('2ff0f40b-493e-4a81-ae00-668e621c8b57'::uuid,'cf3b8770-892a-41d8-8a47-647dbb742fee'::uuid),
('bdfa57ee-93dd-4ff2-88d0-4f90e217d0ec'::uuid,'bd1d64ae-7ce1-469a-821f-2203099eab4f'::uuid),
('4e0665d4-2a6a-4602-8799-db55cbb5f588'::uuid,'8dae8f1d-437f-464c-8415-50f763d1801d'::uuid),
('da7a223c-b039-4fa0-99c1-c8e396f90f5f'::uuid,'53761d11-41ee-4971-a393-67052780eb05'::uuid),
('700be8a4-8283-411f-af66-371b61e443f9'::uuid,'796dfb87-68c7-43bb-b61f-153d40a64cf4'::uuid),
('1c88e69a-1b86-4677-bf93-b977e24e42a2'::uuid,'03a8bb19-b9c2-42df-b18c-1671746030ab'::uuid),
('3f63983b-4a5a-41d2-a510-bfd327d62778'::uuid,'371e2c1c-4a18-4961-b2a3-8d01edc07e90'::uuid),
('c9975f91-2815-44f7-b2c8-d7652edaf321'::uuid,'acf3e7a7-5f8d-43d2-ad5c-972db7568be7'::uuid)),
 valid as materialized(
  select e.legacy_id from expected e join public.card_print_identity_aliases a
   on a.legacy_card_print_id=e.legacy_id and a.canonical_card_print_id=e.canonical_id
  where a.active and a.authority_status='approved' and a.legacy_set_code='bog' and a.canonical_set_code='bp'
   and a.created_from_audit='best_of_game_discovery_20261120'
   and a.authority_sources=array['pokemon_tcg_data_bp','tcgdex_bog','grookai_release_metadata']::text[]
   and a.authority_decision='{"legacy_set_code":"bog","canonical_set_code":"bp","expected_overlap_count":9,"canonical_basis":"PokemonTCG provider coordinate already stored by grookai release metadata; exact nine-card source correspondence independently checked against TCGdex.","legacy_disposition":"Retain every stored object, coordinate and downstream reference; suppress only nine approved base aliases in discovery.","finish_policy":"Preserve congruent existing child inventories; no finish creation, transfer, ID rewrite or whole-set printing certification.","identity_evidence":"Exact frozen parent UUID, public ID, source coordinate, name, number, domain, variant and modifier; apostrophe differences enumerated per pair.","classification_sha256":"7ca628ab535be23a9d600c3dcf1f8ef82320bcfee92b7d78326240a7009c4a0f","collision_matrix_sha256":"ca4dc1a64f8246bc16c8a315c456e98aed6a43c07ef17ba2f9644a7c64c10494"}'::jsonb
   and a.adjudicated_at is not null
 ) select case when (select value from evidence) is not null and (select count(*) from valid)=9
   then (select array_agg(legacy_id order by legacy_id) from valid) else array[]::uuid[] end;
$function$;
revoke all on function public.get_best_of_game_discovery_exclusions_v1() from public;
grant execute on function public.get_best_of_game_discovery_exclusions_v1() to anon,authenticated,service_role;
comment on function public.get_best_of_game_discovery_exclusions_v1() is 'All nine exact approved Best of Game base aliases only, contingent on complete visible retained evidence. Partial authority suppresses nothing.';
do $guard$ begin
 if cardinality(public.get_best_of_game_discovery_exclusions_v1())<>9 then raise exception 'BEST_OF_GAME_ALIAS_AUTHORITY_DRIFT' using errcode='23514';end if;
end $guard$;
create or replace function public.get_best_of_game_discovery_projection_v1()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select jsonb_build_object('parent_ids',e.value->'winner_ids','set_id',e.value->>'canonical_set_id','set_code','bp')
 from (select public.get_best_of_game_discovery_evidence_v1() as value) e
 where e.value is not null and cardinality(public.get_best_of_game_discovery_exclusions_v1())=9;
$function$;
revoke all on function public.get_best_of_game_discovery_projection_v1() from public;
grant execute on function public.get_best_of_game_discovery_projection_v1() to anon,authenticated,service_role;
comment on function public.get_best_of_game_discovery_projection_v1() is 'Discovery set metadata for exactly four retained Winner parents. Distinct identities and unresolved child state remain unchanged.';

create or replace view public.v_card_prints_set_family_discovery_v1 with(security_invoker=true) as
with projections as materialized(
 select (value->>'parent_id')::uuid as parent_id,(value->>'set_id')::uuid as set_id,value->>'set_code' as set_code
 from(select public.get_shrouded_fable_discovery_projection_v1() as value) s where value is not null
 union all
 select member.id::uuid,(value->>'set_id')::uuid,value->>'set_code'
 from(select public.get_best_of_game_discovery_projection_v1() as value) b
 cross join lateral jsonb_array_elements_text(value->'parent_ids') member(id)
)
select card."id",
card."game_id",
card."set_id",
card."name",
card."number",
card."variant_key",
card."rarity",
card."image_url",
card."tcgplayer_id",
card."external_ids",
card."updated_at",
card."set_code",
card."artist",
card."regulation_mark",
card."image_alt_url",
card."image_source",
card."variants",
card."created_at",
card."last_synced_at",
card."print_identity_key",
card."ai_metadata",
card."image_hash",
card."data_quality_flags",
card."image_status",
card."image_res",
card."image_last_checked_at",
card."printed_set_abbrev",
card."printed_total",
card."number_plain",
card."gv_id",
card."image_path",
card."identity_domain",
card."printed_identity_modifier",
card."set_identity_model",
card."representative_image_url",
card."image_note" from public.card_prints card where card.id not in(select parent_id from projections)
union all
select card."id",
card."game_id",
projection.set_id,
card."name",
card."number",
card."variant_key",
card."rarity",
card."image_url",
card."tcgplayer_id",
card."external_ids",
card."updated_at",
projection.set_code,
card."artist",
card."regulation_mark",
card."image_alt_url",
card."image_source",
card."variants",
card."created_at",
card."last_synced_at",
card."print_identity_key",
card."ai_metadata",
card."image_hash",
card."data_quality_flags",
card."image_status",
card."image_res",
card."image_last_checked_at",
card."printed_set_abbrev",
card."printed_total",
card."number_plain",
card."gv_id",
card."image_path",
card."identity_domain",
card."printed_identity_modifier",
card."set_identity_model",
card."representative_image_url",
card."image_note" from public.card_prints card join projections projection on projection.parent_id=card.id;
comment on view public.v_card_prints_set_family_discovery_v1 is 'Security-invoker discovery-only family projection; physical parents, IDs, identity records, printings and ownership remain stored unchanged.';

CREATE OR REPLACE FUNCTION public.resolve_catalog_discovery_set_code_v1(p_code text, p_game_code text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when lower(btrim(p_code))='bog'
      and (nullif(lower(btrim(p_game_code)),'') is null or lower(btrim(p_game_code))='pokemon')
      and public.get_best_of_game_discovery_projection_v1() is not null
    then 'bp'
    when lower(btrim(p_code))='sv06.5'
      and (nullif(lower(btrim(p_game_code)),'') is null or lower(btrim(p_game_code))='pokemon')
      and public.get_shrouded_fable_discovery_projection_v1() is not null
    then 'sv6pt5'
    when lower(btrim(p_code)) = 'tk-ex-latio'
      and (nullif(lower(btrim(p_game_code)), '') is null or lower(btrim(p_game_code)) = 'pokemon')
      and cardinality(public.get_latios_discovery_exclusions_v1()) = 10
      and (select count(*) from public.card_prints legacy
        join public.sets source_set on source_set.id = legacy.set_id
        where legacy.set_code = 'tk-ex-latio' and source_set.code = 'tk-ex-latio' and source_set.game = 'pokemon') = 10
    then 'tk1b'
    when lower(btrim(p_code)) = '2021swsh'
      and (nullif(lower(btrim(p_game_code)), '') is null or lower(btrim(p_game_code)) = 'pokemon')
      and cardinality(public.get_mcdonalds_2021_discovery_exclusions_v1()) = 25
      and (select count(*) from public.card_prints legacy
        join public.sets source_set on source_set.id = legacy.set_id
        where legacy.set_code = '2021swsh' and source_set.code = '2021swsh' and source_set.game = 'pokemon') = 25
    then 'mcd21'
    when lower(btrim(p_code)) = 'swsh10.5'
      and (nullif(lower(btrim(p_game_code)), '') is null or lower(btrim(p_game_code)) = 'pokemon')
      and cardinality(public.get_pokemon_go_discovery_exclusions_v1()) = 88
      and (select count(*) from public.card_prints legacy
        join public.sets source_set on source_set.id = legacy.set_id
        where legacy.set_code = 'swsh10.5' and source_set.code = 'swsh10.5' and source_set.game = 'pokemon') = 88
    then 'pgo'
    when lower(btrim(p_code)) = 'sv04.5'
      and (nullif(lower(btrim(p_game_code)), '') is null or lower(btrim(p_game_code)) = 'pokemon')
      and cardinality(public.get_paldean_fates_discovery_exclusions_v1()) = 245
      and (select count(*) from public.card_prints legacy
        join public.sets source_set on source_set.id = legacy.set_id
        where legacy.set_code = 'sv04.5' and source_set.code = 'sv04.5' and source_set.game = 'pokemon') = 245
    then 'sv4pt5'
    when lower(btrim(p_code)) = 'sv08.5'
      and (nullif(lower(btrim(p_game_code)), '') is null or lower(btrim(p_game_code)) = 'pokemon')
      and cardinality(public.get_prismatic_discovery_exclusions_v1()) = 180
      and (select count(*) from public.card_prints legacy
        join public.sets source_set on source_set.id = legacy.set_id
        where legacy.set_code = 'sv08.5' and source_set.code = 'sv08.5' and source_set.game = 'pokemon') = 180
    then 'sv8pt5'
    else lower(btrim(p_code))
  end;
$function$
;
create or replace view public.v_card_prints_discovery_v1 with(security_invoker=true) as
SELECT id,
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
    number_plain,
    gv_id,
    image_path,
    identity_domain,
    printed_identity_modifier,
    set_identity_model,
    representative_image_url,
    image_note
   FROM public.v_card_prints_set_family_discovery_v1 card
  WHERE ((id <> ALL (( SELECT get_jungle_edition_discovery_exclusions_v1() AS get_jungle_edition_discovery_exclusions_v1)::uuid[])) AND (NOT (id IN ( SELECT unnest(get_prismatic_discovery_exclusions_v1()) AS unnest))) AND (NOT (id IN ( SELECT unnest(get_paldean_fates_discovery_exclusions_v1()) AS unnest))) AND (NOT (id IN ( SELECT unnest(get_pokemon_go_discovery_exclusions_v1()) AS unnest))) AND (NOT (id IN ( SELECT unnest(get_mcdonalds_2021_discovery_exclusions_v1()) AS unnest))) AND (NOT (id IN ( SELECT unnest(get_latios_discovery_exclusions_v1()) AS unnest))))
 and card.id not in (select unnest(public.get_shrouded_fable_discovery_exclusions_v1()))
 and card.id not in (select unnest(public.get_best_of_game_discovery_exclusions_v1()));
create or replace view public.v_card_printings_discovery_v1 with(security_invoker=true) as
SELECT id,
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
   FROM card_printings printing
  WHERE ((card_print_id <> ALL (( SELECT get_jungle_edition_discovery_exclusions_v1() AS get_jungle_edition_discovery_exclusions_v1)::uuid[])) AND (NOT (card_print_id IN ( SELECT unnest(get_prismatic_discovery_exclusions_v1()) AS unnest))) AND (NOT (card_print_id IN ( SELECT unnest(get_paldean_fates_discovery_exclusions_v1()) AS unnest))) AND (NOT (card_print_id IN ( SELECT unnest(get_pokemon_go_discovery_exclusions_v1()) AS unnest))) AND (NOT (card_print_id IN ( SELECT unnest(get_mcdonalds_2021_discovery_exclusions_v1()) AS unnest))) AND (NOT (card_print_id IN ( SELECT unnest(get_latios_discovery_exclusions_v1()) AS unnest))))
 and printing.card_print_id not in (select unnest(public.get_shrouded_fable_discovery_exclusions_v1()))
 and printing.card_print_id not in (select unnest(public.get_best_of_game_discovery_exclusions_v1()));
create or replace view public.v_card_search with(security_invoker=true) as
SELECT cp.id,
    cp.name,
    cp.set_code,
    cp.number,
    cp.number AS number_raw,
    regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) AS number_digits,
        CASE
            WHEN (regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) <> ''::text) THEN lpad(regexp_replace(COALESCE(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text), 3, '0'::text)
            ELSE NULL::text
        END AS number_padded,
        CASE
            WHEN (cp.number ~ '\d+\s*/\s*\d+'::text) THEN ((lpad(regexp_replace(cp.number, '^\D*?(\d+).*$'::text, '\1'::text), 3, '0'::text) || '/'::text) || regexp_replace(cp.number, '^.*?/(\d+).*$'::text, '\1'::text))
            ELSE NULL::text
        END AS number_slashed,
    COALESCE(cp.rarity, NULL::text) AS rarity,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS image_url,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS thumb_url,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS image_best,
        CASE
            WHEN (auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text])) THEN pr.latest_price_cents
            ELSE NULL::integer
        END AS latest_price_cents,
        CASE
            WHEN ((auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text])) AND (pr.latest_price_cents IS NOT NULL)) THEN ((pr.latest_price_cents)::numeric / 100.0)
            ELSE NULL::numeric
        END AS latest_price,
    lower(cp.name) AS name_lc,
    NULL::numeric AS search_rank,
    cp.representative_image_url,
    cp.image_status,
    cp.image_note,
    NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url, cp.representative_image_url)), ''::text) AS display_image_url,
        CASE
            WHEN (NULLIF(btrim(COALESCE(cp.image_url, cp.image_alt_url)), ''::text) IS NOT NULL) THEN 'exact'::text
            WHEN (NULLIF(btrim(cp.representative_image_url), ''::text) IS NOT NULL) THEN 'representative'::text
            ELSE 'missing'::text
        END AS display_image_kind
   FROM (public.v_card_prints_set_family_discovery_v1 cp
     LEFT JOIN LATERAL ( SELECT (round((COALESCE(p.price_mid, p.price_high, p.price_low) * (100)::numeric)))::integer AS latest_price_cents
           FROM latest_card_prices_v p
          WHERE (p.card_id = cp.id)
          ORDER BY
                CASE
                    WHEN (lower(COALESCE(p.condition, ''::text)) = ANY (ARRAY['nm'::text, 'near mint'::text, 'lp'::text, 'lightly played'::text, 'raw'::text])) THEN 0
                    ELSE 1
                END, p.observed_at DESC NULLS LAST
         LIMIT 1) pr ON ((auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]))))
  WHERE ((NOT (cp.id IN ( SELECT unnest(get_prismatic_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_paldean_fates_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_pokemon_go_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_mcdonalds_2021_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_latios_discovery_exclusions_v1()) AS unnest))))
 and cp.id not in (select unnest(public.get_shrouded_fable_discovery_exclusions_v1()))
 and cp.id not in (select unnest(public.get_best_of_game_discovery_exclusions_v1()));
create or replace view public.v_grookai_dex_card_prints_v1 with(security_invoker=true) as
SELECT ps.id AS species_id,
    ps.slug AS species_slug,
    ps.display_name AS species_display_name,
    ps.national_dex_number,
    cps.card_print_id,
    cp.gv_id,
    cp.name,
    cp.set_id,
    cp.set_code,
    s.name AS set_name,
    cp.number,
    cp.number_plain,
    cp.rarity,
    cp.variant_key,
    cp.image_url,
    cp.image_alt_url,
    cp.image_source,
    cp.image_path,
    cp.representative_image_url,
    cps.role,
    cps.counts_for_completion,
    cps.source,
    cps.confidence,
    cps.evidence,
    cps.active AS mapping_active
   FROM (((card_print_species cps
     JOIN pokemon_species ps ON ((ps.id = cps.species_id)))
     JOIN public.v_card_prints_set_family_discovery_v1 cp ON ((cp.id = cps.card_print_id)))
     LEFT JOIN sets s ON ((s.id = cp.set_id)))
  WHERE ((NOT (cp.id IN ( SELECT unnest(get_prismatic_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_paldean_fates_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_pokemon_go_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_mcdonalds_2021_discovery_exclusions_v1()) AS unnest))) AND (NOT (cp.id IN ( SELECT unnest(get_latios_discovery_exclusions_v1()) AS unnest))))
 and cp.id not in (select unnest(public.get_shrouded_fable_discovery_exclusions_v1()))
 and cp.id not in (select unnest(public.get_best_of_game_discovery_exclusions_v1()));
CREATE OR REPLACE FUNCTION public.get_public_catalog_sets_v2(p_game_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, game text, code text, name text, hero_image_url text, hero_image_source text, set_role text, catalog_set_type text, printed_set_abbrev text, printed_total integer, release_date date, created_at timestamp with time zone, card_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  discovery_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1() || public.get_prismatic_discovery_exclusions_v1();
  paldean_exclusions uuid[] := public.get_paldean_fates_discovery_exclusions_v1();
  pokemon_go_exclusions uuid[] := public.get_pokemon_go_discovery_exclusions_v1();
  mcdonalds_2021_exclusions uuid[] := public.get_mcdonalds_2021_discovery_exclusions_v1();
  latios_exclusions uuid[] := public.get_latios_discovery_exclusions_v1();
  shrouded_exclusions uuid[] := public.get_shrouded_fable_discovery_exclusions_v1();
  best_of_game_exclusions uuid[] := public.get_best_of_game_discovery_exclusions_v1();
  requested_game text := nullif(lower(btrim(coalesce(p_game_code, ''))), '');
  request_role text := coalesce(auth.role(), '');
begin
  if requested_game is not null and length(requested_game) > 64 then
    raise exception 'get_public_catalog_sets_v2 game code is too long';
  end if;

  return query
  with visible_sets as materialized (
    select
      target.id,
      target.game,
      target.code,
      target.name,
      target.hero_image_url,
      target.hero_image_source,
      target.set_role,
      target.source #>> '{scryfall,set_type}' as catalog_set_type,
      target.printed_set_abbrev,
      target.printed_total,
      target.release_date,
      target.created_at,
      lower(target.code) as normalized_code
    from public.sets target
    left join public.catalog_set_release_controls set_control
      on set_control.set_id = target.id
    left join public.catalog_game_release_controls game_control
      on lower(game_control.game_code) = lower(target.game)
    where (requested_game is null or lower(target.game) = requested_game)
      and case
        when set_control.set_id is not null then
          set_control.release_status = 'public'
          or (
            set_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
        when lower(target.game) = 'pokemon' then true
        else
          game_control.release_status = 'public'
          or (
            game_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
      end
  ),
  visible_card_counts as materialized (
    select
      lower(card.set_code) as normalized_code,
      count(*)::bigint as card_count
    from public.v_card_prints_set_family_discovery_v1 card
    join visible_sets visible_set
      on visible_set.id = card.set_id
    where card.gv_id is not null
    and card.id <> all(discovery_exclusions)
      and card.id not in (select unnest(paldean_exclusions))
      and card.id not in (select unnest(pokemon_go_exclusions))
      and card.id not in (select unnest(mcdonalds_2021_exclusions))
      and card.id not in (select unnest(latios_exclusions))
      and card.id not in (select unnest(shrouded_exclusions))
      and card.id not in (select unnest(best_of_game_exclusions))
      and coalesce(
        card.data_quality_flags #>> '{app_visibility_v1,status}',
        'visible'
      ) <> 'suppressed'
    group by lower(card.set_code)
  )
  select
    visible_set.id,
    visible_set.game,
    visible_set.code,
    visible_set.name,
    visible_set.hero_image_url,
    visible_set.hero_image_source,
    visible_set.set_role,
    visible_set.catalog_set_type,
    visible_set.printed_set_abbrev,
    visible_set.printed_total,
    visible_set.release_date,
    visible_set.created_at,
    count_row.card_count
  from visible_sets visible_set
  join visible_card_counts count_row
    on count_row.normalized_code = visible_set.normalized_code
  where count_row.card_count > 0
  order by visible_set.game, visible_set.code, visible_set.id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_search_set_catalog_v1(game_code_in text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'complete', count(*) <= 20000,
    'sets', coalesce(jsonb_agg(to_jsonb(s) order by s.id), '[]'::jsonb)
  )
  from (
    select id, code, name, printed_set_abbrev, printed_total, release_date, identity_model
    from public.sets
    where game = lower(trim(game_code_in))
      and (code not in ('sv08.5','sv04.5','swsh10.5','2021swsh','tk-ex-latio','sv06.5','bog') or public.resolve_prismatic_discovery_set_code_v1(code, game) = code)
    order by id limit 20001
  ) s;
$function$
;
CREATE OR REPLACE FUNCTION public.search_print_identity_v1(q text DEFAULT NULL::text, set_code_in text DEFAULT NULL::text, number_in text DEFAULT NULL::text, object_type_in text DEFAULT NULL::text, limit_in integer DEFAULT 50, offset_in integer DEFAULT 0)
 RETURNS TABLE(search_document_id text, object_type text, parent_gv_id text, printing_gv_id text, display_name text, display_discriminator text, route_path text, route_query text, matched_fields text[], rank_score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with prismatic_query as materialized (
    select case
      when lower(nullif(trim(q), '')) ~ '(^|[[:space:]])sv08[.]5([[:space:]]|$)'
      then regexp_replace(lower(nullif(trim(q), '')),
        '(^|[[:space:]])sv08[.]5(?=[[:space:]]|$)',
        '\1' || public.resolve_prismatic_discovery_set_code_v1('sv08.5'), 'g')
      else lower(nullif(trim(q), ''))
    end as query_text
  ),
  paldean_query as materialized (
    select case
      when prismatic_query.query_text ~ '(^|[[:space:]])sv04[.]5([[:space:]]|$)'
      then regexp_replace(prismatic_query.query_text,
        '(^|[[:space:]])sv04[.]5(?=[[:space:]]|$)',
        '\1' || public.resolve_catalog_discovery_set_code_v1('sv04.5'), 'g')
      else prismatic_query.query_text
    end as query_text
    from prismatic_query
  ),
  pokemon_go_query as materialized (
    select case
      when paldean_query.query_text ~ '(^|[[:space:]])swsh10[.]5([[:space:]]|$)'
      then regexp_replace(paldean_query.query_text,
        '(^|[[:space:]])swsh10[.]5(?=[[:space:]]|$)',
        '\1' || public.resolve_catalog_discovery_set_code_v1('swsh10.5'), 'g')
      else paldean_query.query_text
    end as query_text
    from paldean_query
  ),
  mcdonalds_2021_query as materialized (
    select case
      when pokemon_go_query.query_text ~ '(^|[[:space:]])2021swsh([[:space:]]|$)'
      then regexp_replace(pokemon_go_query.query_text,
        '(^|[[:space:]])2021swsh(?=[[:space:]]|$)',
        '\1' || public.resolve_catalog_discovery_set_code_v1('2021swsh'), 'g')
      else pokemon_go_query.query_text
    end as query_text
    from pokemon_go_query
  ),
  latios_query as materialized (
    select case
      when mcdonalds_2021_query.query_text ~ '(^|[[:space:]])tk-ex-latio([[:space:]]|$)'
      then regexp_replace(mcdonalds_2021_query.query_text,
        '(^|[[:space:]])tk-ex-latio(?=[[:space:]]|$)',
        '\1' || public.resolve_catalog_discovery_set_code_v1('tk-ex-latio'), 'g')
      else mcdonalds_2021_query.query_text
    end as query_text
    from mcdonalds_2021_query
  ),
  normalized_query as materialized (
    select case
      when latios_query.query_text ~ '(^|[[:space:]])sv06[.]5([[:space:]]|$)'
      then regexp_replace(latios_query.query_text,
        '(^|[[:space:]])sv06[.]5(?=[[:space:]]|$)',
        '\1' || public.resolve_catalog_discovery_set_code_v1('sv06.5'), 'g')
      else latios_query.query_text
    end as query_text,
      (select case when lower(trim(q)) like 'gv-%' then nullif(lower(trim(set_code_in)), '')
        else nullif(public.resolve_prismatic_discovery_set_code_v1(coalesce(set_code_in, '')), '') end) as set_code_norm
    from latios_query
  ),
  prepared as not materialized (
    select
      normalized_query.query_text as q_norm,
      regexp_split_to_array(coalesce(normalized_query.query_text, ''), '\s+') as q_tokens,
      normalized_query.set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as number_digits_norm,
      lower(nullif(trim(object_type_in), '')) as object_type_norm,
      greatest(1, least(coalesce(limit_in, 50), 1000)) as result_limit,
      greatest(0, coalesce(offset_in, 0)) as result_offset
    from normalized_query
  ),
  family_projection as materialized (
    select case when coalesce(p.q_norm not like 'gv-%',true)
      and (p.set_code_norm is null or p.set_code_norm='sv6pt5')
      then public.get_shrouded_fable_discovery_projection_v1() else null::jsonb end as value
    from prepared p
  ),
  best_of_game_policy as materialized (
    select case when coalesce(p.q_norm not like 'gv-%',true)
      and (p.set_code_norm is null or p.set_code_norm='bp')
      then public.get_best_of_game_discovery_evidence_v1() else null::jsonb end as evidence,
      case when coalesce(p.q_norm not like 'gv-%',true)
      and (p.set_code_norm is null or p.set_code_norm='bp')
      then public.get_best_of_game_discovery_projection_v1() else null::jsonb end as projection
    from prepared p
  ),
  discovery_policy as materialized (
    select public.get_jungle_edition_discovery_exclusions_v1() as jungle
  ),
  discovery_exclusions as materialized (
    select unnest(jungle) as id from discovery_policy
    union all select unnest(public.get_prismatic_discovery_exclusions_v1())
    union all select unnest(public.get_paldean_fates_discovery_exclusions_v1())
    union all select unnest(public.get_pokemon_go_discovery_exclusions_v1())
    union all select unnest(public.get_mcdonalds_2021_discovery_exclusions_v1())
    union all select unnest(public.get_latios_discovery_exclusions_v1())
    union all select unnest(public.get_shrouded_fable_discovery_exclusions_v1())
    union all select unnest(public.get_best_of_game_discovery_exclusions_v1())
  ),
  parent_identity_seed as materialized (
    select cp.id
    from public.card_prints cp
    cross join prepared p
    where p.q_norm is not null
      and cp.gv_id is not null and lower(cp.gv_id) = p.q_norm
  ),
  name_seed as materialized (
    select cp.id
    from (select discovery_source.* from public.card_prints discovery_source where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)) cp
    cross join prepared p
    where p.q_norm is not null
      and cp.gv_id is not null
      and public.catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)
      and lower(cp.name) like '%' || p.q_norm || '%'
      and (p.set_code_norm is null or lower(cp.set_code) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
    order by
      case when lower(cp.name) = p.q_norm then 0 else 1 end,
      cp.name,
      cp.gv_id
    limit greatest(
      100,
      (select (result_limit + result_offset) * 2 from prepared)
    )
  ),
  matching_sets as materialized (
    select s.id
    from public.sets s
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(coalesce(s.code, '')) = p.q_norm
        or lower(coalesce(s.name, '')) like '%' || p.q_norm || '%'
      )
  ),
  set_seed as materialized (
    select cp.id
    from matching_sets matched
    join (select discovery_source.* from public.card_prints discovery_source where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)) cp on cp.set_id = matched.id
    union
    select cp.id
    from (select discovery_source.* from public.card_prints discovery_source where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)) cp
    cross join prepared p
    where p.q_norm is not null
      and lower(cp.set_code) = p.q_norm
  ),
  printing_identity_seed as materialized (
    select cp.id
    from public.card_printings cpn
    join public.card_prints cp on cp.id = cpn.card_print_id
    cross join prepared p
    where p.q_norm is not null
      and cpn.printing_gv_id is not null and lower(cpn.printing_gv_id) = p.q_norm
  ),
  matched_finish_keys as materialized (
    select fk.key
    from public.finish_keys fk
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(fk.key) = p.q_norm
        or lower(coalesce(fk.label, '')) = p.q_norm
      )
  ),
  finish_seed as materialized (
    select cp.id
    from matched_finish_keys matched
    cross join lateral (
      select source.card_print_id
      from public.card_printings source
      where source.finish_key = matched.key
      offset 0
    ) cpn
    join (select discovery_source.* from public.card_prints discovery_source where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)) cp on cp.id = cpn.card_print_id
  ),
  primary_seed as materialized (
    select id from parent_identity_seed
    union
    select id from name_seed
    union
    select id from printing_identity_seed
  ),
  name_seed_sufficient as materialized (
    select
      count(*) >= (select result_limit + result_offset from prepared) as sufficient
    from name_seed
  ),
  cameo_seed as materialized (
    select cp.id
    from public.v_card_print_cameos_public_v1 cameo
    join (select discovery_source.* from public.card_prints discovery_source where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)) cp on cp.gv_id = cameo.gv_id
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(coalesce(cameo.cameo_subject_name, '')) like '%' || p.q_norm || '%'
        or exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> ''
            and token <> 'cameo'
            and lower(concat_ws(
              ' ',
              cameo.cameo_subject_name,
              cameo.pokemon_ndex,
              array_to_string(cameo.cameo_qualifiers, ' '),
              cameo.notes_raw
            )) like '%' || token || '%'
        )
      )
  ),
  fast_seed as materialized (
    select id from primary_seed
    union
    select id from set_seed
    where not (select sufficient from name_seed_sufficient)
    union
    select id from finish_seed
    where not (select sufficient from name_seed_sufficient)
    union
    select id from cameo_seed
    where not (select sufficient from name_seed_sufficient)
  ),
  filtered_seed as materialized (
    select cp.id
    from (select * from prepared where q_norm is null) p
    cross join lateral (
      select discovery_source.* from public.card_prints discovery_source
      where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)
        and p.set_code_norm is not null and lower(discovery_source.set_code)=p.set_code_norm
      union all
      select discovery_source.* from public.card_prints discovery_source
      where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)
        and p.set_code_norm is null
      offset 0
    ) cp
    where (select q_norm from prepared) is null
      and (p.set_code_norm is null or lower(coalesce(cp.set_code, '')) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
    order by cp.name, cp.gv_id
    limit greatest(
      5000,
      (select (result_limit + result_offset) * 20 from prepared)
    )
  ),
  fallback_request as materialized (
    select * from prepared where q_norm is not null and not exists (select 1 from fast_seed)
  ),
  fallback_probe as materialized (
    select token
    from fallback_request p cross join lateral unnest(p.q_tokens) token
    where token ~ '^[[:alnum:].-]+$' and token ~ '[[:alnum:]]{3}'
    order by length(token) desc, token
    limit 1
  ),
  fallback_probe_ids as materialized (
    select cp.id from public.card_prints cp cross join fallback_probe probe
    where lower(coalesce(cp.gv_id, '') || ' ' || coalesce(cp.print_identity_key, '') || ' ' || coalesce(cp.name, '') || ' ' || coalesce(cp.number, '') || ' ' || coalesce(cp.number_plain, '') || ' ' || coalesce(cp.set_code, '') || ' ' || coalesce(cp.printed_set_abbrev, '') || ' ' || coalesce(cp.rarity, '') || ' ' || coalesce(cp.variant_key, '') || ' ' || coalesce(cp.printed_identity_modifier, '') || ' ' || coalesce(cp.external_ids::text, '')) like '%' || probe.token || '%'
    union
    select cp.id from public.sets s join public.card_prints cp on cp.set_id=s.id
    cross join fallback_probe probe
    where lower(coalesce(s.name,'')) like '%' || probe.token || '%'
  ),
  fallback_seed as materialized (
    select cp.id
    from fallback_request p
    cross join lateral (
      select discovery_source.* from (
        select source.* from fallback_probe_ids selected
        cross join lateral (
          select source.* from public.card_prints source where source.id=selected.id offset 0
        ) source
        where exists (select 1 from fallback_probe)
        union all
        select source.* from public.card_prints source
        where not exists (select 1 from fallback_probe)
      ) discovery_source
      where (select jungle from discovery_policy) is not null and discovery_source.id not in (select id from discovery_exclusions)
      offset 0
    ) cp
    left join public.sets s on s.id = cp.set_id
    cross join lateral (
      select lower(concat_ws(
          ' ',
          cp.gv_id,
          cp.print_identity_key,
          cp.name,
          cp.number,
          cp.number_plain,
          cp.set_code,
          s.name,
          cp.printed_set_abbrev,
          cp.rarity,
          cp.variant_key,
          cp.printed_identity_modifier,
          cp.external_ids::text
        )) as search_text
      offset 0
    ) searchable
    where p.q_norm is not null
      and not exists (select 1 from fast_seed)
      and (
        searchable.search_text like '%' || p.q_norm || '%'
        or not exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> ''
            and searchable.search_text not like '%' || token || '%'
        )
      )
    order by cp.name, cp.gv_id
    limit 10000
  ),
  shrouded_seed as materialized (
    select card.id from family_projection projection
    join public.card_prints card on card.id=(projection.value->>'parent_id')::uuid
    cross join prepared p
    where coalesce(p.q_norm not like 'gv-%',true)
      and (p.set_code_norm is null or p.set_code_norm='sv6pt5')
      and (p.q_norm is not null or p.set_code_norm='sv6pt5')
      and (select jungle from discovery_policy) is not null
      and card.id not in (select id from discovery_exclusions)
  ),
  best_of_game_seed as materialized (
    select card.id from best_of_game_policy policy
    cross join lateral jsonb_array_elements_text(case when policy.projection is not null
      then (policy.evidence->'canonical_ids')||(policy.evidence->'winner_ids') else '[]'::jsonb end) member(id)
    join public.card_prints card on card.id=member.id::uuid
    cross join prepared p
    where (p.q_norm is not null or p.set_code_norm='bp')
      and (select jungle from discovery_policy) is not null
      and card.id not in (select id from discovery_exclusions)
  ),
  candidate_ids as materialized (
    select id from fast_seed
    union
    select id from filtered_seed
    union
    select id from fallback_seed
    union select id from shrouded_seed
    union select id from best_of_game_seed
  ),
  candidate_cards as materialized (
    select cp.*, s.name as joined_set_name,
      case when cp.id=(select (value->>'parent_id')::uuid from family_projection)
        and coalesce(p.q_norm not like 'gv-%',true) then 'sv6pt5'::text
        when cp.id::text in(select jsonb_array_elements_text(projection->'parent_ids') from best_of_game_policy)
        and coalesce(p.q_norm not like 'gv-%',true) then 'bp'::text else cp.set_code end as discovery_set_code
    from candidate_ids candidate
    cross join lateral (
      select source.*
      from public.card_prints source
      where source.id = candidate.id
      offset 0
    ) cp
    left join public.sets s on s.id = cp.set_id
    cross join prepared p
    where cp.gv_id is not null
      and public.catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)
      and (p.set_code_norm is null or lower(coalesce(cp.set_code, '')) = p.set_code_norm
        or (p.set_code_norm='sv6pt5' and cp.id=(select (value->>'parent_id')::uuid from family_projection)
          and coalesce(p.q_norm not like 'gv-%',true))
        or (p.set_code_norm='bp' and cp.id::text in(select jsonb_array_elements_text(projection->'parent_ids') from best_of_game_policy)
          and coalesce(p.q_norm not like 'gv-%',true)))
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
  ),
  cameo_agg as materialized (
    select
      cameo.gv_id,
      string_agg(
        lower(concat_ws(
          ' ',
          'cameo',
          case when cameo.cameo_subject_type = 'trainer' then 'trainer' else 'pokemon' end,
          cameo.cameo_subject_name,
          cameo.pokemon_ndex,
          array_to_string(cameo.cameo_qualifiers, ' '),
          cameo.notes_raw
        )),
        ' '
        order by cameo.cameo_subject_name
      ) as cameo_search_text,
      array_agg(
        distinct (
          case when cameo.cameo_subject_type = 'trainer' then 'Cameo trainer: ' else 'Cameo: ' end
          || cameo.cameo_subject_name
          || case
            when array_length(cameo.cameo_qualifiers, 1) > 0
              then ' · ' || array_to_string(cameo.cameo_qualifiers, ', ')
            else ''
          end
        )
      ) as cameo_labels
    from public.v_card_print_cameos_public_v1 cameo
    join candidate_cards cp on cp.gv_id = cameo.gv_id
    group by cameo.gv_id
  ),
  parent_docs as materialized (
    select
      ('parent:' || cp.gv_id)::text as search_document_id,
      'parent_print'::text as object_type,
      cp.gv_id::text as public_id,
      cp.gv_id::text as parent_gv_id,
      null::text as printing_gv_id,
      cp.name::text as display_name,
      null::text as display_discriminator,
      ('/card/' || cp.gv_id)::text as route_path,
      null::text as route_query,
      cp.name::text as name,
      regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
      case
        when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
        else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
      end as number_padded,
      cp.discovery_set_code::text as set_code,
      lower(concat_ws(
        ' ',
        cp.gv_id,
        cp.print_identity_key,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.set_code,
        cp.joined_set_name,
        cp.printed_set_abbrev,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.external_ids::text,
        cameo.cameo_search_text,
        case when cp.discovery_set_code is distinct from cp.set_code then cp.discovery_set_code end,
        case when cp.id::text in(select jsonb_array_elements_text(evidence->'canonical_ids') from best_of_game_policy where projection is not null)
          or cp.id::text in(select jsonb_array_elements_text(projection->'parent_ids') from best_of_game_policy)
        then concat_ws(' ','bog bp Best of Game',(select evidence->'legacy_names'->>cp.id::text from best_of_game_policy)) end
      ))::text as search_text,
      20::integer as rank_bucket,
      cameo.cameo_search_text::text as cameo_search_text,
      cameo.cameo_labels::text[] as cameo_labels
    from candidate_cards cp
    left join cameo_agg cameo on cameo.gv_id = cp.gv_id
  ),
  child_docs as materialized (
    select
      ('child:' || cpn.printing_gv_id)::text as search_document_id,
      'child_printing'::text as object_type,
      cpn.printing_gv_id::text as public_id,
      cp.gv_id::text as parent_gv_id,
      cpn.printing_gv_id::text as printing_gv_id,
      cp.name::text as display_name,
      coalesce(fk.label, cpn.finish_key)::text as display_discriminator,
      ('/card/' || cp.gv_id)::text as route_path,
      ('printing=' || cpn.printing_gv_id)::text as route_query,
      cp.name::text as name,
      regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
      case
        when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
        else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
      end as number_padded,
      cp.discovery_set_code::text as set_code,
      lower(concat_ws(
        ' ',
        cpn.printing_gv_id,
        cp.gv_id,
        cp.print_identity_key,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.set_code,
        cp.joined_set_name,
        cp.printed_set_abbrev,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        cpn.finish_key,
        fk.label,
        cp.external_ids::text,
        case when cp.discovery_set_code is distinct from cp.set_code then cp.discovery_set_code end,
        case when cp.id::text in(select jsonb_array_elements_text(evidence->'canonical_ids') from best_of_game_policy where projection is not null)
          or cp.id::text in(select jsonb_array_elements_text(projection->'parent_ids') from best_of_game_policy)
        then concat_ws(' ','bog bp Best of Game',(select evidence->'legacy_names'->>cp.id::text from best_of_game_policy)) end
      ))::text as search_text,
      30::integer as rank_bucket,
      null::text as cameo_search_text,
      null::text[] as cameo_labels
    from candidate_cards cp
    cross join lateral (
      select source.*
      from public.card_printings source
      where source.card_print_id = cp.id
        and source.printing_gv_id is not null
      offset 0
    ) cpn
    left join public.finish_keys fk on fk.key = cpn.finish_key
  ),
  docs as materialized (
    select * from parent_docs
    where coalesce((select object_type_norm from prepared),'parent_print') = 'parent_print'
    union all
    select * from child_docs
    where coalesce((select object_type_norm from prepared),'child_printing') = 'child_printing'
  ),
  scored as (
    select
      d.search_document_id,
      d.object_type,
      d.parent_gv_id,
      d.printing_gv_id,
      d.display_name,
      case
        when p.q_norm is not null
          and d.cameo_search_text is not null
          and (
            d.cameo_search_text like '%' || p.q_norm || '%'
            or exists (
              select 1
              from unnest(p.q_tokens) token
              where token <> ''
                and token <> 'cameo'
                and d.cameo_search_text like '%' || token || '%'
            )
          )
          then coalesce(d.cameo_labels[1], 'Cameo')
        else d.display_discriminator
      end as display_discriminator,
      d.route_path,
      d.route_query,
      array_remove(array[
        case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 'public_id' end,
        case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 'parent_gv_id' end,
        case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 'printing_gv_id' end,
        case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 'name' end,
        case when p.q_norm is not null and d.search_text like '%' || p.q_norm || '%' then 'search_text' end,
        case when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 'cameo_search_text' end,
        case when p.q_norm is not null and exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
        ) then 'cameo_token' end,
        case when p.number_digits_norm is not null and d.number_digits = p.number_digits_norm then 'number' end,
        case when p.set_code_norm is not null and lower(coalesce(d.set_code, '')) = p.set_code_norm then 'set_code' end
      ], null)::text[] as matched_fields,
      (
        d.rank_bucket
        + case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 10000 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 9500 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 9000 else 0 end
        + case when p.number_digits_norm is not null and d.number_digits = p.number_digits_norm then 1600 else 0 end
        + case when p.number_digits_norm is not null and d.number_padded = lpad(p.number_digits_norm, 3, '0') then 1100 else 0 end
        + case when p.set_code_norm is not null and lower(coalesce(d.set_code, '')) = p.set_code_norm then 1200 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.name, '')) = p.q_norm then 1800 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 800 else 0 end
        + case when p.q_norm is not null and d.search_text like '%' || p.q_norm || '%' then 400 else 0 end
        + case
          when p.q_norm is not null then (
            select count(*)::integer * 120
            from unnest(p.q_tokens) token
            where token <> '' and d.search_text like '%' || token || '%'
          )
          else 0
        end
        + case when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 300 else 0 end
        + case
          when p.q_norm is not null then (
            select count(*)::integer * 70
            from unnest(p.q_tokens) token
            where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
          )
          else 0
        end
        + case
          when p.q_norm is not null and 'cameo' = any(p.q_tokens) and d.cameo_search_text is not null then 90
          else 0
        end
      )::integer as rank_score
    from docs d
    cross join prepared p
    where (p.object_type_norm is null or d.object_type = p.object_type_norm)
      and (
        p.q_norm is null
        or lower(coalesce(d.public_id, '')) = p.q_norm
        or lower(coalesce(d.parent_gv_id, '')) = p.q_norm
        or lower(coalesce(d.printing_gv_id, '')) = p.q_norm
        or d.search_text like '%' || p.q_norm || '%'
        or d.cameo_search_text like '%' || p.q_norm || '%'
        or not exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> '' and d.search_text not like '%' || token || '%'
        )
      )
  )
  select
    search_document_id,
    object_type,
    parent_gv_id,
    printing_gv_id,
    display_name,
    display_discriminator,
    route_path,
    route_query,
    matched_fields,
    rank_score
  from scored
  where rank_score > 0
  order by rank_score desc, display_name asc, parent_gv_id asc, coalesce(printing_gv_id, '') asc
  limit (select result_limit from prepared)
  offset (select result_offset from prepared);
$function$;
commit;

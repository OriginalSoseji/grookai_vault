// Synthetic local read cases; derived from the passed transactional candidate qualification.
export const metric=`select jsonb_build_object(
 'exclusions',cardinality(public.get_shrouded_fable_discovery_exclusions_v1()),
 'projection',public.get_shrouded_fable_discovery_projection_v1()->>'set_code',
 'route',public.resolve_catalog_discovery_set_code_v1(' SV06.5 ','pokemon'),
 'wrongGame',public.resolve_catalog_discovery_set_code_v1('sv06.5','magic'),
 'catalog',(select jsonb_agg(jsonb_build_object('code',s.code,'count',s.card_count) order by s.code) from public.get_public_catalog_sets_v2('pokemon')s where s.code in('sv06.5','sv6pt5','tk-ex-latio','tk1b','2021swsh','mcd21','swsh10.5','pgo','sv04.5','sv4pt5','sv08.5','sv8pt5')),
 'discovery',(select jsonb_object_agg(set_code,n) from(select set_code,count(*) n from public.v_card_prints_discovery_v1 where set_code in('sv06.5','sv6pt5') group by set_code)t),
 'finishes',(select jsonb_object_agg(finish_key,n) from(select c.finish_key,count(*) n from public.v_card_printings_discovery_v1 c join public.v_card_prints_discovery_v1 p on p.id=c.card_print_id where p.set_code='sv6pt5' group by c.finish_key)t),
 'browseLegacy',(select count(*) from public.search_game_card_prints_v5('pokemon',null,'sv06.5',null,null,'en',512,0)),
 'browseCanonical',(select count(*) from public.search_game_card_prints_v5('pokemon',null,'sv6pt5',null,null,'en',512,0)),
 'identityLegacy',(select count(*) from public.search_print_identity_v1('sv06.5',null,null,'parent_print',512,0)),
 'identityCanonical',(select count(*) from public.search_print_identity_v1('sv6pt5',null,null,'parent_print',512,0)),
 'identityTyped',(select count(*) from public.search_print_identity_v1(null,'sv06.5',null,'parent_print',512,0)),
 'identityChildren',(select count(*) from public.search_print_identity_v1(null,'sv6pt5',null,'child_printing',512,0)),
 'partialRawSetCode',(select count(*) from public.search_print_identity_v1('sv06.',null,null,'parent_print',512,0)),
 'partialCanonicalSetCode',(select count(*) from public.search_print_identity_v1('sv6p',null,null,'parent_print',512,0)),
 'nonmatchingFamilySeed',(select count(*) from public.search_print_identity_v1('sv6pt5 definitelydoesnotmatch',null,null,'parent_print',512,0)),
 'uniqueSearch',(select count(*) from public.search_print_identity_v1('Galvantula sv06.5',null,null,'parent_print',512,0)),
 'stampedGalvantula',(select count(*) from public.v_card_search where id=(select id from public.card_prints where gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP') and set_code='sv6pt5'),
 'sourceSetCatalogLegacy',(select count(*) from jsonb_array_elements(public.get_search_set_catalog_v1('pokemon')->'sets') s where s->>'code'='sv06.5'),
 'sourceSetCatalogCanonical',(select count(*) from jsonb_array_elements(public.get_search_set_catalog_v1('pokemon')->'sets') s where s->>'code'='sv6pt5'),
 'retainedRaw',(select jsonb_object_agg(set_code,n) from(select set_code,count(*) n from public.card_prints where set_code in('sv06.5','sv6pt5') group by set_code)t),
 'exactLegacy',(select count(*) from public.search_print_identity_v1('GV-PK-SV06-5-002-PRIZE-PACK-STAMP','sv06.5',null,'parent_print',512,0)),
 'wrongExactScope',(select count(*) from public.search_print_identity_v1('GV-PK-SV06-5-002-PRIZE-PACK-STAMP','sv6pt5',null,'parent_print',512,0))
 ) as value;`;
export const probe=`select jsonb_build_object('exclusions',cardinality(public.get_shrouded_fable_discovery_exclusions_v1()),'projection',public.get_shrouded_fable_discovery_projection_v1()->>'set_code','route',public.resolve_catalog_discovery_set_code_v1('sv06.5'),'uniqueRetained',(select count(*) from public.v_card_prints_discovery_v1 where gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP'),'legacy',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv06.5')) as value;`;
export const negatives=[
 ['inactive',"update public.card_print_identity_aliases set active=false where legacy_card_print_id=(select id from public.card_prints where set_code='sv06.5' and number::int=99 and coalesce(variant_key,'')='');",98,2],
 ['authorityHash',"update public.card_print_identity_aliases set authority_decision=jsonb_set(authority_decision,'{classification_sha256}',to_jsonb(repeat('0',64))) where legacy_card_print_id=(select id from public.card_prints where set_code='sv06.5' and number::int=99 and coalesce(variant_key,'')='');",98,2],
 ['baseIdentityMismatch',"update public.card_prints set name='LOCAL WRONG TARGET' where set_code='sv6pt5' and number::int=99 and coalesce(variant_key,'')='';",98,2],
 ['stampSourceMismatch',"update public.card_prints set external_ids=jsonb_set(external_ids,'{verified_master_index_v1,source_fingerprint_sha256}',to_jsonb(repeat('0',64))) where gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP';",99,1],
 ['stampModifierMismatch',"update public.card_prints set printed_identity_modifier='local_other_stamp' where gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP';",99,1],
 ['stampFinishMismatch',"update public.card_printings set finish_key='normal' where printing_gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP-COSMOS';",99,1],
 ['unaliasedParent',"insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,identity_domain) select game_id,set_id,set_code,'LOCAL EXTRA SHROUDED','100','GV-PK-LOCAL-SHROUDED-UNALIASED',identity_domain from public.card_prints where gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP';",99,2],
 ['sourceBaseMismatch',"update public.card_prints set external_ids=jsonb_set(external_ids,'{verified_master_index_v1,selected_base_parent_id}',to_jsonb((select id::text from public.card_prints where set_code='sv06.5' and number::int=3 and coalesce(variant_key,'')=''))) where gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP';",99,1],
 ['canonicalStampCollisionFormatting',"insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,identity_domain) select game_id,set_id,set_code,' GALVANTULA  ','#002/064','GV-PK-LOCAL-SHROUDED-FORMATTED-COLLISION','PRIZE_PACK_STAMP',identity_domain from public.card_prints where set_code='sv6pt5' and number::int=2 and coalesce(variant_key,'')='';",99,1],
 ['canonicalStampCollision',"insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,variant_key,printed_identity_modifier,identity_domain) select game_id,set_id,set_code,'Galvantula','002','GV-PK-LOCAL-SHROUDED-COLLISION','prize_pack_stamp','prize_pack_stamp',identity_domain from public.card_prints where set_code='sv6pt5' and number::int=2 and coalesce(variant_key,'')='';",99,1]
];

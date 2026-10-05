import {randomUUID,createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
// Caller must verify a task-owned local lab before calling. Synthetic catalog only.
export async function seedCollectrSealedFixture(db,user){
 const q=(sql,args=[])=>db.query(sql,args);
 const family=randomUUID(),variant=randomUUID(),candidate=randomUUID(),review=randomUUID(),mapping=randomUUID(),release=randomUUID(),card=randomUUID(),printing=randomUUID(),set=randomUUID();
 const cardTarget={gvId:'GV-PK-SEALED-'+card};
 await q('begin');
 try {
  await q('select ensure_vault_owner_v1($1)',[user]);
  await q("insert into sets(id,code,name,game) values($1::uuid,$1::text,'Example','pokemon')",[set]);
  await q("insert into card_prints(id,set_id,name,number,gv_id,game_id) values($1,$2,'Synthetic card','1',$3,(select id from games where code='pokemon'))",[card,set,cardTarget.gvId]);
  await q("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'normal')",[printing,card]);
  await q("insert into sealed_product_families(id,game_key,family_key,canonical_name,manufacturer_name,identity_contract_version,identity_fingerprint) values($1::uuid,'pokemon',$1::text,'Example Booster Box','Fixture','fixture',$2)",[family,hash(family)]);
  await q("insert into sealed_product_variants(id,family_id,variant_key,canonical_name,package_form,language_code,identity_contract_version,identity_fingerprint) values($1,$2,'fixture','Example Booster Box','booster_box','en','fixture',$3)",[variant,family,hash(variant)]);
  await q("insert into tcgcsv_source_categories(category_id,name,raw_payload,payload_hash) values(2147483000,'Fixture','{}',$1)",[hash('category')]);
  await q("insert into tcgcsv_source_groups(group_id,category_id,name,raw_payload,payload_hash) values(2147483001,2147483000,'Example','{}',$1)",[hash('group')]);
  await q(`insert into sealed_product_candidates(id,source_provider,source_category_id,source_group_id,source_product_id,source_product_name,source_payload_hash,classifier_version,classification,confidence)
   values($1,'tcgplayer',2147483000,2147483001,2147483002,'Example Booster Box',$2,'fixture','sealed_candidate',1)`,[candidate,hash(candidate)]);
  await q("insert into sealed_product_candidate_reviews(id,candidate_id,decision,promotion_authorized,reviewed_by,review_contract_version) values($1,$2,'confirmed_sealed',true,$3,'fixture')",[review,candidate,user]);
  await q(`insert into sealed_product_source_mappings(id,variant_id,candidate_id,review_id,source_provider,source_category_id,source_group_id,source_product_id,source_product_name,source_payload_hash,classifier_version,mapping_contract_version,mapping_fingerprint)
   values($1,$2,$3,$4,'tcgplayer',2147483000,2147483001,2147483002,'Example Booster Box',$5,'fixture','fixture',$6)`,[mapping,variant,candidate,review,hash(candidate),hash(mapping)]);
  await q(`insert into sealed_product_releases(id,release_key,game_key,source_audit_producer_sha,source_sample_logical_hash,release_contract_version,manifest_fingerprint,expected_member_count,created_by)
   values($1::uuid,$1::text,'pokemon',$2,$3,'fixture',$3,1,$4)`,[release,'a'.repeat(40),hash(release),user]);
  const qualification=randomUUID();
  await q(`insert into sealed_product_pricing_lane_qualifications(id,variant_id,source_mapping_id,source_price_row_identity,source_subtype_name_normalized,observed_on,currency,qualification_status,source_observation_fingerprint,qualification_contract_version)
   values($1,$2,$3,'fixture','normal',current_date,'USD','qualified_exact',$4,'fixture')`,[qualification,variant,mapping,hash(qualification)]);
  await q('insert into sealed_product_release_members(release_id,variant_id,source_mapping_id,member_fingerprint,qualification_id) values($1,$2,$3,$4,$5)',[release,variant,mapping,hash('member'),qualification]);
  await q('select sealed_product_freeze_release_v1($1,$2,$3)',[release,hash(release),user]);
  await q('select sealed_product_set_active_release_v1($1,null,$2)',[release,user]);
  await q("insert into sealed_product_game_release_controls(game_key,release_status,release_version) values('pokemon','public','fixture') on conflict(game_key) do update set release_status='public'");
  await q("update catalog_game_release_controls set release_status='public' where game_code='pokemon'");
  await q('update sealed_ownership_controls_v1 set enabled=true where singleton');
 await q('commit');
 return {family,variant,mapping,release,card,printing,set,gvId:cardTarget.gvId};
 }catch(error){await q('rollback');throw error;}
}
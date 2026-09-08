// Explicit local-only integration runner. Never reads production credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
const container = JSON.parse(execFileSync('docker',['inspect','supabase_db_sealed-ownership-replay-20260907'],{encoding:'utf8'}))[0];
assert.equal(container.NetworkSettings.Ports['5432/tcp'][0].HostPort,'55430');
assert.equal(container.State.Running,true);
const config={host:'127.0.0.1',port:55430,database:'postgres',user:'postgres',password:'postgres',statement_timeout:10000};
const c=new pg.Client(config);
const hash=x=>createHash('sha256').update(x).digest('hex');
const owner=randomUUID(),other=randomUUID(),run=randomUUID();
const tests=[];
async function insert(table,row) {
  assert.match(table,/^[a-z_]+$/);
  const keys=Object.keys(row);
  return (await c.query(`insert into public.${table} (${keys.map(k=>`"${k}"`).join(',')}) values (${keys.map((_,i)=>`$${i+1}`).join(',')}) returning *`,Object.values(row))).rows[0];
}
async function fixture(game,language='en',options={}) {
  const variant=randomUUID(),family=randomUUID(),candidate=randomUUID(),review=randomUUID(),mapping=randomUUID(),qualification=randomUUID(),release=randomUUID();
  const h=hash(variant); const sourceId=Number.parseInt(h.slice(0,11),16);
  await insert('sealed_product_families',{id:family,game_key:game,family_key:`fixture-${variant}`,canonical_name:`Fixture ${game} box`,manufacturer_name:'Fixture',identity_contract_version:'fixture',identity_fingerprint:hash(family)});
  await insert('sealed_product_variants',{id:variant,family_id:family,variant_key:'fixture',canonical_name:`Fixture ${game} box`,package_form:'booster_box',language_code:language,identity_contract_version:'fixture',identity_fingerprint:h});
  await insert('sealed_product_candidates',{id:candidate,source_provider:'tcgplayer',source_category_id:1,source_group_id:sourceId,source_product_id:sourceId,source_product_name:'Fixture',source_payload_hash:h,classifier_version:'fixture',classification:'sealed_candidate',confidence:1});
  await insert('sealed_product_candidate_reviews',{id:review,candidate_id:candidate,decision:'confirmed_sealed',promotion_authorized:true,reviewed_by:owner,review_contract_version:'fixture'});
  await insert('sealed_product_source_mappings',{id:mapping,variant_id:variant,candidate_id:candidate,review_id:review,source_provider:'tcgplayer',source_category_id:1,source_group_id:sourceId,source_product_id:sourceId,source_product_name:'Fixture',source_payload_hash:h,classifier_version:'fixture',mapping_contract_version:'fixture',mapping_fingerprint:hash(mapping)});
  await insert('sealed_product_pricing_lane_qualifications',{id:qualification,variant_id:variant,source_mapping_id:mapping,source_price_row_identity:qualification,source_subtype_name_normalized:'normal',observed_on:options.date??'2000-01-01',currency:'USD',qualification_status:'qualified_exact',source_observation_fingerprint:hash(qualification),qualification_contract_version:'fixture',qualification_evidence:{observation:{market_price:options.price??null}}});
  await insert('sealed_product_releases',{id:release,game_key:game,release_key:`fixture-${release}`,source_audit_producer_sha:'0'.repeat(40),source_sample_logical_hash:h,release_contract_version:'fixture',manifest_fingerprint:hash(release),expected_member_count:1,created_by:owner});
  const member=await insert('sealed_product_release_members',{release_id:release,variant_id:variant,source_mapping_id:mapping,qualification_id:qualification,member_fingerprint:hash(randomUUID())});
  await c.query("update public.sealed_product_releases set release_state='frozen',frozen_by=$2,frozen_at=now() where id=$1",[release,owner]);
  await c.query("insert into public.sealed_product_release_pointer(game_key,release_id,pointer_contract_version,changed_by) values($1,$2,'fixture',$3) on conflict(game_key) do update set release_id=excluded.release_id",[game,release,owner]);
  await c.query("update public.catalog_game_release_controls set release_status='signed_in' where game_code=$1",[game]);
  await c.query("insert into public.sealed_product_game_release_controls(game_key,release_status,release_version) values($1,'signed_in','fixture') on conflict(game_key) do update set release_status='signed_in'",[game]);
  if(options.image) {
    const evidence=randomUUID(),object=randomUUID(),assertion=randomUUID(),imageRelease=randomUUID(),fingerprint=hash(imageRelease);
    const image={image_mime:'image/jpeg',image_width:500,image_height:500,image_bytes:5000,content_sha256:h};
    await insert('sealed_product_image_evidence',{id:evidence,game_key:game,variant_id:variant,source_mapping_id:mapping,source_release_member_id:member.id,
      source_provider:'tcgplayer',source_category_id:1,source_group_id:sourceId,source_product_id:sourceId,source_image_url:`https://tcgplayer-cdn.tcgplayer.com/product/${sourceId}_200w.jpg`,
      selected_source_role:'exact_front',retrieved_at:new Date(),http_status:200,...image,classification:'exact_image_ready',source_plan_fingerprint:fingerprint,coverage_fingerprint:fingerprint,evidence_contract_version:'fixture',evidence_fingerprint:hash(evidence)});
    await insert('sealed_product_image_objects',{id:object,game_key:game,storage_bucket:'user-card-images',object_path:`sealed/${game}/sha256/${h.slice(0,2)}/${h}.jpg`,...image,
      storage_readback_sha256:h,storage_verified_at:new Date(),object_contract_version:'fixture',object_fingerprint:hash(object)});
    await insert('sealed_product_variant_image_assertions',{id:assertion,game_key:game,variant_id:variant,source_mapping_id:mapping,image_evidence_id:evidence,image_object_id:object,assertion_contract_version:'fixture',assertion_fingerprint:hash(assertion)});
    await insert('sealed_product_image_releases',{id:imageRelease,game_key:game,release_key:`fixture-${imageRelease}`,source_price_release_id:release,source_audit_producer_sha:'0'.repeat(40),source_plan_fingerprint:fingerprint,coverage_fingerprint:fingerprint,release_contract_version:'fixture',manifest_fingerprint:fingerprint,expected_member_count:1,created_by:owner});
    const binding=(await c.query("select encode(extensions.digest(convert_to(jsonb_build_array('SEALED_PRODUCT_IMAGE_RELEASE_MEMBER_V1',$1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text)::text,'UTF8'),'sha256'),'hex') hash",[imageRelease,game,variant,assertion,hash(assertion),hash(evidence),hash(object)])).rows[0].hash;
    await insert('sealed_product_image_release_members',{image_release_id:imageRelease,game_key:game,variant_id:variant,image_assertion_id:assertion,member_fingerprint:binding});
    await c.query("update public.sealed_product_image_releases set release_state='frozen',frozen_at=now(),frozen_by=$2 where id=$1",[imageRelease,owner]);
    await c.query("insert into public.sealed_product_image_release_pointer(game_key,image_release_id,pointer_contract_version,changed_by) values($1,$2,'fixture',$3) on conflict(game_key) do update set image_release_id=excluded.image_release_id",[game,imageRelease,owner]);
  }
  return variant;
}
async function asUser(user=owner) {
  await c.query('reset role');
  await c.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);
  await c.query('set local role authenticated');
}
async function check(name,fn) { await fn(); tests.push(name); console.log(`PASS ${name}`); }
async function denied(fn,pattern) {
  await c.query('savepoint denied_case');
  let error;
  try { await fn(); } catch(e) { error=e; }
  await c.query('rollback to savepoint denied_case');
  assert.ok(error,'expected rejection');
  if(pattern) assert.match(error.message,pattern);
}
const add=(variant,request=randomUUID(),quantity=1)=>c.query('select public.vault_add_sealed_copies_v1($1,$2,$3) result',[variant,request,quantity]).then(r=>r.rows[0].result);
await c.connect();
try {
  const migration=await fs.readFile(new URL('../../supabase/migrations/20260907180000_sealed_owned_instances_v1.sql',import.meta.url),'utf8');
  await c.query(migration);
  await c.query(migration);
  const reads=await fs.readFile(new URL('../../supabase/migrations/20260907183000_sealed_owned_read_models_v1.sql',import.meta.url),'utf8');
  await c.query(reads);
  await c.query(reads);
  const revisions=await fs.readFile(new URL('../../supabase/migrations/20260908070000_sealed_owned_photo_revisions_v1.sql',import.meta.url),'utf8');
  await c.query(revisions);
  await c.query(revisions);
  await c.query('begin');
  await check('sealed service grants remain least-privilege despite Supabase defaults',async()=>{
    for(const [table,allowed] of [
      ['sealed_ownership_controls_v1',['SELECT','UPDATE']],
      ['vault_sealed_requests_v1',['SELECT','INSERT']],
      ['vault_sealed_current_evidence_v1',['SELECT']],
    ]) {
      for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) {
        const actual=(await c.query('select has_table_privilege($1,$2,$3) allowed',['service_role',`public.${table}`,privilege])).rows[0].allowed;
        assert.equal(actual,allowed.includes(privilege),`${table}: service_role ${privilege}`);
        for(const role of ['anon','authenticated'])
          assert.equal((await c.query('select has_table_privilege($1,$2,$3) allowed',[role,`public.${table}`,privilege])).rows[0].allowed,false,`${table}: ${role} ${privilege}`);
      }
    }
    await c.query('set local role service_role');
    await denied(()=>c.query('delete from public.vault_sealed_requests_v1 where false'),/permission denied/);
    await denied(()=>c.query('update public.vault_sealed_requests_v1 set result=result where false'),/permission denied/);
    await denied(()=>c.query('truncate public.vault_sealed_requests_v1'),/permission denied/);
    await c.query('reset role');
  });
  await c.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[owner,`${owner}@example.invalid`,other,`${other}@example.invalid`]);
  const mtg=await fixture('mtg'),pokemon=await fixture('pokemon','ja');
  await c.query('update public.sealed_ownership_controls_v1 set enabled=false');
  await asUser();
  await check('disabled-by-default denies new copies',()=>denied(()=>add(mtg),/sealed_ownership_disabled/));
  await c.query('reset role');
  await c.query('update public.sealed_ownership_controls_v1 set enabled=true');
  await asUser();
  const request=randomUUID(); let created;
  await check('two physical boxes create two unique GVVIs without price or image',async()=>{
    created=await add(mtg,request,2);
    assert.equal(created.created_count,2);
    const rows=(await c.query('select * from public.vault_item_instances where id=any($1::uuid[])',[created.instance_ids])).rows;
    assert.equal(rows.length,2); assert.equal(new Set(rows.map(r=>r.gv_vi_id)).size,2);
    for(const r of rows) { assert.equal(r.card_print_id,null); assert.equal(r.slab_cert_id,null); assert.equal(r.intent,'hold'); assert.equal(r.seal_state,'unknown'); }
  });
  await check('same request returns exact original result',async()=>assert.deepEqual(await add(mtg,request,2),created));
  await check('changed payload with same request is rejected',()=>denied(()=>add(mtg,request,3),/request_payload_conflict/));
  await check('Japanese Pokemon uses same owned-copy lane',async()=>assert.equal((await add(pokemon)).created_count,1));
  await check('typed inventory keeps unpriced copies without fake card IDs',async()=>{
    const rows=(await c.query('select public.get_owned_sealed_copies_v1() item')).rows.map(r=>r.item);
    assert.equal(rows.length,3);
    for(const row of rows) { assert.equal(row.object_kind,'sealed');assert.equal(row.reference_market_price,null);assert.equal(Object.hasOwn(row,'card_print_id'),false); }
    const totals=(await c.query('select public.get_owned_sealed_totals_v1() value')).rows[0].value;
    assert.equal(totals.active_copy_count,3);assert.equal(totals.unpriced_copy_count,3);assert.deepEqual(totals.totals_by_currency,{});
  });
  await check('null or zero quantity is rejected',async()=>{await denied(()=>add(mtg,randomUUID(),null),/invalid_sealed_add/);await denied(()=>add(mtg,randomUUID(),0),/invalid_sealed_add/);});
  await check('unknown variant is denied',()=>denied(()=>add(randomUUID()),/sealed_identity_unavailable/));
  await check('owner cannot convert a sealed identity to another variant',()=>denied(()=>c.query('update public.vault_item_instances set sealed_product_variant_id=$2 where id=$1',[created.instance_ids[0],pokemon]),/immutable/));
  await check('direct owner archive cannot bypass the bound lifecycle journal',()=>denied(()=>c.query("update public.vault_item_instances set archived_at=now(),intent='hold' where id=$1",[created.instance_ids[0]]),/sealed_archive_requires_bound_lifecycle_request/));
  await check('another account cannot see or dispose a copy',async()=>{
    await asUser(other);
    assert.equal((await c.query('select id from public.vault_item_instances where id=$1',[created.instance_ids[0]])).rows.length,0);
    assert.equal((await c.query('select public.get_owned_sealed_copies_v1($1) item',[owner])).rows.length,0);
    await denied(()=>c.query("select public.vault_dispose_sealed_copy_v1($1,$2,'remove')",[created.instance_ids[0],randomUUID()]),/not_owned/);
    await asUser();
  });
  await check('condition and vendor price read back without changing identity',async()=>{
    const r=(await c.query("select public.vault_update_sealed_copy_v1($1,'factory_sealed','undamaged','sell',45.25,'USD') result",[created.instance_ids[0]])).rows[0].result;
    assert.equal(r.asking_price_amount,45.25);assert.equal(r.intent,'sell');
  });
  const saleRequest=randomUUID();let sale;
  await check('sale archives copy and preserves transaction details',async()=>{
    sale=(await c.query("select public.vault_dispose_sealed_copy_v1($1,$2,'sale',42.50,'USD','Local collector') result",[created.instance_ids[0],saleRequest])).rows[0].result;
    assert.equal(sale.archived,true);assert.ok(sale.disposition_id);
    assert.equal((await c.query('select id from public.vault_item_instances where id=$1',[created.instance_ids[0]])).rows.length,0);
  });
  await check('sale retry returns original result after archive',async()=>assert.deepEqual((await c.query("select public.vault_dispose_sealed_copy_v1($1,$2,'sale',42.50,'USD','Local collector') result",[created.instance_ids[0],saleRequest])).rows[0].result,sale));
  await check('second disposition cannot succeed',()=>denied(()=>c.query("select public.vault_dispose_sealed_copy_v1($1,$2,'remove')",[created.instance_ids[0],randomUUID()]),/already_archived/));
  await check('trade plus cash is recorded without creating received inventory',async()=>{
    const r=(await c.query("select public.vault_dispose_sealed_copy_v1($1,$2,'trade',null,null,'Collector','Two booster packs','received',5,'USD') result",[created.instance_ids[1],randomUUID()])).rows[0].result;
    assert.ok(r.disposition_id);
  });
  await c.query('reset role');
  await check('events retain exact variant, condition and cash evidence',async()=>{
    const rows=(await c.query('select * from public.vault_item_instance_dispositions where user_id=$1 order by disposition_type',[owner])).rows;
    assert.equal(rows.length,2);assert.equal(rows[0].sealed_product_variant_id,mtg);assert.equal(rows[0].seal_state,'factory_sealed');
    assert.equal(rows[1].trade_cash_direction,'received');assert.equal(Number(rows[1].trade_cash_amount),5);
  });
  const today=(await c.query("select (now() at time zone 'UTC')::date::text as observed_date")).rows[0].observed_date;
  const priced=await fixture('mtg','en',{date:today,price:12.34,image:true});
  await asUser();
  const pair=await add(priced,randomUUID(),2);
  await c.query("select public.vault_update_sealed_copy_v1($1,'factory_sealed','undamaged','hold')",[pair.instance_ids[0]]);
  await c.query("select public.vault_update_sealed_copy_v1($1,'opened','damaged','sell',90,'USD')",[pair.instance_ids[1]]);
  await check('only intact factory-sealed copies receive exact market totals, never asking prices',async()=>{
    const items=(await c.query('select public.get_owned_sealed_copies_v1(null,$1) item',[pair.instance_ids])).rows.map(r=>r.item);
    assert.equal(items.length,2);assert.ok(items.every(r=>r.reference_market_price===12.34));
    assert.equal(items.find(r=>r.instance_id===pair.instance_ids[0]).owned_market_price,12.34);
    assert.equal(items.find(r=>r.instance_id===pair.instance_ids[1]).owned_market_price,null);
    const total=(await c.query('select public.get_owned_sealed_totals_v1() result')).rows[0].result;
    assert.equal(total.active_copy_count,3);assert.equal(total.priced_copy_count,1);assert.equal(total.unpriced_copy_count,2);assert.deepEqual(total.totals_by_currency,{USD:12.34});
  });
  await check('private GVVI cannot be resolved by another account',async()=>{
    const own=(await c.query('select public.get_owned_sealed_copies_v1(null,$1) item',[[pair.instance_ids[0]]])).rows[0].item;
    assert.equal((await c.query('select public.get_sealed_copy_by_gvvi_v1($1) item',[own.gv_vi_id])).rows[0].item.instance_id,own.instance_id);
    await asUser(other);
    assert.equal((await c.query('select public.get_sealed_copy_by_gvvi_v1($1) item',[own.gv_vi_id])).rows[0].item,null);
    await asUser();
  });
  await c.query('reset role');
  await c.query("insert into public.public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Fixture',true,true) on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true",[owner,`fixture-${owner}`]);
  const section=await insert('wall_sections',{user_id:owner,name:'Fixture sealed',is_public:true,is_active:true,position:10});
  const photoPath=`${owner}/vault-instances/${pair.instance_ids[0]}/front/revisions/${randomUUID().replaceAll('-','')}`;
  await c.query("insert into storage.buckets(id,name,public) values('user-card-images','user-card-images',false) on conflict(id) do nothing");
  await c.query("insert into storage.objects(bucket_id,name,owner,owner_id,metadata) values('user-card-images',$1,$2::uuid,$2::uuid::text,'{\"mimetype\":\"image/jpeg\",\"size\":100}')",[photoPath,owner]);
  await asUser();
  await c.query("update public.vault_item_instances set notes='private fixture note',acquisition_cost=10,acquisition_currency='USD' where id=$1",[pair.instance_ids[0]]);
  await c.query('select public.vault_set_copy_section_memberships_v1($1,$2,true)',[[pair.instance_ids[0]],section.id]);
  await check('public Wall permits assigned copies without exposing acquisition or notes',async()=>{
    await asUser(other);
    const row=(await c.query('select public.get_owned_sealed_inventory_v1($1,null,$2,true) item',[owner,section.id])).rows[0].item;
    assert.equal(row.instance_id,pair.instance_ids[0]);assert.equal(row.notes,null);assert.equal(row.acquisition_cost,null);assert.equal(row.acquisition_currency,null);
    await asUser();
  });
  await check('uploaded photos remain private until explicitly shared and use exact owned paths',async()=>{
    await c.query("select public.vault_save_sealed_details_v1($1,'Private memo',$2,null,false)",[pair.instance_ids[0],photoPath]);
    await asUser(other);
    const privateRow=(await c.query('select public.get_owned_sealed_copies_v1($1,$2) item',[owner,[pair.instance_ids[0]]])).rows[0].item;
    assert.equal(privateRow.personal_image_url,null);assert.equal(privateRow.notes,null);
    assert.equal((await c.query('select public.sealed_owned_media_visible_v1($1) allowed',[photoPath])).rows[0].allowed,false);
    assert.equal((await c.query('select name from storage.objects where name=$1',[photoPath])).rows.length,0);
    await denied(()=>c.query("select public.vault_save_sealed_details_v1($1,'Forged',$2,null,true)",[pair.instance_ids[0],photoPath]),/invalid_owned_photo_path|not_owned/);
    await asUser();
    await c.query("select public.vault_save_sealed_details_v1($1,'Private memo',$2,null,true)",[pair.instance_ids[0],photoPath]);
    await asUser(other);
    const sharedRow=(await c.query('select public.get_owned_sealed_copies_v1($1,$2) item',[owner,[pair.instance_ids[0]]])).rows[0].item;
    assert.equal(sharedRow.personal_image_url,photoPath);assert.equal(sharedRow.notes,null);
    assert.equal((await c.query('select name from storage.objects where name=$1',[photoPath])).rows.length,1);
    await asUser();
  });
  await check('photo revision validation is atomic and rejects missing, wrong-side and new legacy paths',async()=>{
    const prefix=`${owner}/vault-instances/${pair.instance_ids[0]}/`;
    const staged=prefix+`front/revisions/${randomUUID().replaceAll('-','')}`;
    const legacy=prefix+'back/current';
    await c.query('reset role');
    for(const path of [staged,legacy]) await c.query("insert into storage.objects(bucket_id,name,owner,owner_id) values('user-card-images',$1,$2::uuid,$2::uuid::text)",[path,owner]);
    await asUser();
    for(const back of [staged,legacy,prefix+'back/revisions/'+'a'.repeat(32)])
      await denied(()=>c.query("select public.vault_save_sealed_details_v1($1,'New private',$2,$3,false)",[pair.instance_ids[0],staged,back]),/invalid_owned_photo_path/);
    const retained=(await c.query('select image_url,image_display_mode from public.vault_item_instances where id=$1',[pair.instance_ids[0]])).rows[0];
    assert.equal(retained.image_url,photoPath);assert.equal(retained.image_display_mode,'uploaded');
    await asUser(other);
    assert.equal((await c.query('select public.sealed_owned_media_visible_v1($1) allowed',[staged])).rows[0].allowed,false);
    assert.equal((await c.query('select public.sealed_owned_media_visible_v1($1) allowed',[photoPath])).rows[0].allowed,true);
    await asUser();
  });
  await check('private section and block both withhold sealed appearances',async()=>{
    await c.query('update public.wall_sections set is_public=false where id=$1',[section.id]);
    await asUser(other);
    assert.equal((await c.query('select public.get_owned_sealed_inventory_v1($1,null,$2,true)',[owner,section.id])).rows.length,0);
    await asUser();
    await c.query('update public.wall_sections set is_public=true where id=$1',[section.id]);
    await c.query('insert into public.trust_blocks(user_id,blocked_user_id) values($1,$2)',[owner,other]);
    await asUser(other);
    assert.equal((await c.query('select public.get_owned_sealed_inventory_v1($1)',[owner])).rows.length,0);
    assert.equal((await c.query('select name from storage.objects where name=$1',[photoPath])).rows.length,0);
    await asUser();
  });
  await check('server search never returns a nonmatching product',async()=>{
    assert.equal((await c.query("select public.get_owned_sealed_inventory_v1(null,'nonexistent fixture')")).rows.length,0);
    assert.equal((await c.query("select public.get_owned_sealed_inventory_v1(null,'mtg')")).rows.length,2);
  });
  await check('archiving removes section and total exposure without deleting membership history',async()=>{
    await c.query("select public.vault_dispose_sealed_copy_v1($1,$2,'remove')",[pair.instance_ids[0],randomUUID()]);
    assert.equal((await c.query('select public.get_owned_sealed_inventory_v1(null,null,$1,true)',[section.id])).rows.length,0);
    assert.equal((await c.query('select public.get_owned_sealed_totals_v1() result')).rows[0].result.priced_copy_count,0);
    await c.query('reset role');
    assert.equal((await c.query('select * from public.wall_section_memberships where vault_item_instance_id=$1',[pair.instance_ids[0]])).rows.length,1);
  });
  for(const [name,date,price] of [['expired','2000-01-01',25],['future','2099-01-01',25],['malformed',today,'unknown']]) {
    const variant=await fixture('mtg','en',{date,price,image:true});await asUser();
    const ids=(await add(variant)).instance_ids;
    await c.query("select public.vault_update_sealed_copy_v1($1,'factory_sealed','undamaged','hold')",[ids[0]]);
    await check(`${name} price keeps the exact copy but withholds valuation`,async()=>{
      const row=(await c.query('select public.get_owned_sealed_copies_v1(null,$1) item',[ids])).rows[0].item;
      assert.equal(row.reference_market_price,null);assert.equal(row.owned_market_price,null);assert.ok(row.image_object_path);
    });
    await c.query('reset role');
  }
  await check('anonymous cannot call any owned sealed reader or writer',async()=>{
    await c.query("select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claim.role','anon',true)");
    await c.query('set local role anon');
    await denied(()=>c.query('select public.get_owned_sealed_totals_v1()'),/permission denied/);
    await denied(()=>add(priced),/permission denied/);
  });
  await check('history preserves owned transaction details and never crosses accounts',async()=>{
    await asUser();
    const history=(await c.query('select public.get_sealed_ownership_history_v1() item')).rows.map(r=>r.item);
    assert.equal(history.length,3);assert.ok(history.some(r=>r.operation==='sale' && r.sale_price_amount===42.5));
    assert.ok(history.some(r=>r.operation==='trade' && r.cash_amount===5));
    await asUser(other);assert.equal((await c.query('select public.get_sealed_ownership_history_v1()')).rows.length,0);
  });
  await c.query('reset role');
  const cardSet=await insert('sets',{id:randomUUID(),name:'Local card regression',code:`test-${run}`});
  const cardGame=(await c.query("select id from public.games where code='pokemon'")).rows[0].id;
  const card=await insert('card_prints',{id:randomUUID(),game_id:cardGame,set_id:cardSet.id,name:'Local card',gv_id:`GV-PK-FIX-${run}`});
  const slab=await insert('slab_certs',{id:randomUUID(),grader:'PSA',cert_number:`fixture-${run}`,card_print_id:card.id,grade:10});
  await asUser();
  await check('existing card addition still creates exact card copies and legacy quantity',async()=>{
    await c.query('reset role');
    await c.query("select set_config('request.jwt.claim.role','service_role',true)");
    await c.query('set local role service_role');
    const result=(await c.query('select public.vault_add_card_instance_service_v1($1,$2,2) result',[owner,card.id])).rows[0].result;
    assert.equal(result.created_count,2);assert.equal(result.card_print_id,card.id);assert.equal(result.bucket_qty,2);
    await asUser();
    const rows=(await c.query('select * from public.vault_item_instances where user_id=$1 and card_print_id=$2',[owner,card.id])).rows;
    assert.equal(rows.length,2); for(const row of rows){assert.equal(row.sealed_product_variant_id,null);assert.equal(row.seal_state,null);assert.equal(row.slab_cert_id,null)}
  });
  await c.query('reset role');
  await check('existing slab allocator preserves the real certification anchor',async()=>{
    const row=(await c.query('select * from public.admin_vault_instance_create_v1(p_user_id=>$1,p_slab_cert_id=>$2)',[owner,slab.id])).rows[0];
    assert.equal(row.slab_cert_id,slab.id);assert.equal(row.card_print_id,null);assert.equal(row.sealed_product_variant_id,null);assert.ok(row.gv_vi_id);
  });
  await asUser();
  await check('mixed inventory sealed totals exclude cards and slabs',async()=>{
    const totals=(await c.query('select public.get_owned_sealed_totals_v1() result')).rows[0].result;
    const count=Number((await c.query('select count(*) from public.vault_item_instances where user_id=$1 and sealed_product_variant_id is not null and archived_at is null',[owner])).rows[0].count);
    assert.equal(totals.active_copy_count,count);
    await denied(()=>c.query('update public.vault_item_instances set card_print_id=$2 where id=$1',[pair.instance_ids[1],card.id]),/constraint|sealed|immutable/);
  });
  await check('disabling additions preserves inventory, totals and disposition history',async()=>{
    const copies=(await c.query('select public.get_owned_sealed_copies_v1() item')).rows;
    const totals=(await c.query('select public.get_owned_sealed_totals_v1() result')).rows;
    const history=(await c.query('select public.get_sealed_ownership_history_v1() item')).rows;
    await c.query('reset role');
    await c.query('update public.sealed_ownership_controls_v1 set enabled=false');
    await asUser();
    await denied(()=>add(mtg),/sealed_ownership_disabled/);
    assert.deepEqual((await c.query('select public.get_owned_sealed_copies_v1() item')).rows,copies);
    assert.deepEqual((await c.query('select public.get_owned_sealed_totals_v1() result')).rows,totals);
    assert.deepEqual((await c.query('select public.get_sealed_ownership_history_v1() item')).rows,history);
  });
  await c.query('rollback');
  if(process.argv.includes('--concurrency')) {
    // These committed fixtures stay only in the named disposable DB until its required fresh replay.
    await c.query('begin');
    await c.query('insert into auth.users(id,email) values($1,$2)',[owner,`${owner}@example.invalid`]);
    const variant=await fixture('mtg');
    await c.query('update public.sealed_ownership_controls_v1 set enabled=true');
    await c.query('commit');
    async function concurrentCall(sql,params) {
      const connection=new pg.Client(config); await connection.connect();
      try {
        await connection.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[owner]);
        await connection.query('set role authenticated');
        return (await connection.query(sql,params)).rows[0].result;
      } finally { await connection.end(); }
    }
    const request=randomUUID(); let repeated;
    await check('ten concurrent retries create exactly one three-copy addition',async()=>{
      repeated=await Promise.all(Array.from({length:10},()=>concurrentCall('select public.vault_add_sealed_copies_v1($1,$2,3) result',[variant,request])));
      for(const result of repeated) assert.deepEqual(result,repeated[0]);
      assert.equal(Number((await c.query('select count(*) from public.vault_item_instances where user_id=$1',[owner])).rows[0].count),3);
    });
    await check('ten distinct concurrent additions allocate unique nonoverlapping GVVIs',async()=>{
      const results=await Promise.all(Array.from({length:10},()=>concurrentCall('select public.vault_add_sealed_copies_v1($1,$2,2) result',[variant,randomUUID()])));
      assert.equal(new Set(results.flatMap(r=>r.instance_ids)).size,20);
      const counts=(await c.query('select count(*) total,count(distinct gv_vi_id) unique_count from public.vault_item_instances where user_id=$1',[owner])).rows[0];
      assert.equal(Number(counts.total),23);assert.equal(Number(counts.unique_count),23);
    });
    await check('competing sale and trade can commit only one disposition',async()=>{
      const target=repeated[0].instance_ids[0];
      const outcomes=await Promise.allSettled([
        concurrentCall("select public.vault_dispose_sealed_copy_v1($1,$2,'sale',25,'USD') result",[target,randomUUID()]),
        concurrentCall("select public.vault_dispose_sealed_copy_v1($1,$2,'trade',null,null,null,'Fixture trade') result",[target,randomUUID()]),
      ]);
      assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
      assert.match(outcomes.find(r=>r.status==='rejected').reason.message,/already_archived/);
      assert.equal(Number((await c.query('select count(*) from public.vault_item_instance_dispositions where vault_item_instance_id=$1',[target])).rows[0].count),1);
    });
    console.log(JSON.stringify({local_fixture_owner:owner,requires_isolated_replay:true}));
  }
  console.log(JSON.stringify({status:'passed',tests:tests.length,production_access:false,fixture_transaction:process.argv.includes('--concurrency')?'base_rolled_back_concurrency_committed_requires_isolated_replay':'rolled_back',migration_applied_to:'isolated_local_only',run}));
} catch(error) {
  await c.query('rollback').catch(()=>{});
  throw error;
} finally { await c.end(); }

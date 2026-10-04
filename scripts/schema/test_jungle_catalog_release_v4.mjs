// Rollback-only qualification on the preserved422 upgrade lab. No reset or durable seed.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import pg from 'pg';
import {freezeJungleRelease,executeJungleRelease,assertJungleReleaseTarget} from '../../backend/catalog/jungle_edition_catalog_release_v4.mjs';
import {readJungleExecutionState} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
const root='C:/gv_jungle_edition_20261001',base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',project='jungle-edition-full-425-v35-20261001';
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
for(const [n,h]of Object.entries(read(base+'/full-425-v35/freeze.json').sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+n)),h,n);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:20000});const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];
assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const c=new pg.Client({host:'127.0.0.1',port:54000,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000});await c.connect();await assertJungleReleaseTarget(c,'local_rehearsal');assert.equal((await c.query('select host(inet_server_addr()) address')).rows[0].address,db.NetworkSettings.Networks[project].IPAddress);
const out=base+'/catalog-release-v4/rehearsal-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});fs.copyFileSync(new URL(import.meta.url),out+'/test-source.mjs');
const tables=(await c.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname")).rows;for(const {relname:n}of tables)assert.match(n,/^[a-z_][a-z0-9_]*$/);
const fp=tables.map(({relname:n})=>`select '${n}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${n}" t`).join(' union all ')+' order by table_name';
const before=(await c.query(fp)).rows,ledger=(await c.query('select * from supabase_migrations.schema_migrations order by version')).rows;save('before-footprints.json',before);
assert.equal((await c.query('select count(*)::int n from vault_item_instances')).rows[0].n,5);
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json'),ar=base+'/catalog-authority-v2',artifacts=new Map(read(ar+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(ar,r.path))]));const snapshot=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
const checks=[],pass=n=>checks.push(n);let open=false,commitsIntercepted=0;
// Production engine transaction boundaries map to real savepoints inside a single
// outer transaction. No COMMIT reaches PostgreSQL. This is not durable-commit proof.
const client={connectionParameters:c.connectionParameters,query:async(sql,args)=>{
 if(typeof sql==='string'&&sql.startsWith('begin')){assert.equal(open,false);open=true;return c.query('savepoint engine');}
 if(sql==='rollback'&&open){await c.query('rollback to savepoint engine');open=false;return c.query('release savepoint engine');}
 if(sql==='commit'){assert.equal(open,true);open=false;commitsIntercepted++;return c.query('release savepoint engine');}
 return c.query(sql,args);
}};
save('intent.json',{at:new Date().toISOString(),project,rollbackOnly:true,commitIntercepted:true,productionWrites:0,containerId:db.Id});
try{
 await c.query('begin isolation level serializable');
 const plan=await freezeJungleRelease({client,manifest,artifacts,target:'local_rehearsal'});save('plan.private.json',plan);
 const args={client,plan,manifest,artifacts,expectedFingerprint:plan.fingerprint};const run=mode=>executeJungleRelease({...args,mode});const initial=await readJungleExecutionState(c,plan.rows,plan.schema);
 const unchanged=async()=>assert.deepEqual(await readJungleExecutionState(c,plan.rows,plan.schema),initial);
 assert.equal((await run('preflight')).before,'before');pass('read_only_preflight');
 const rb=await run('rollback');assert.equal(rb.rollbackProven,true);assert.equal(Object.values(rb.writes).reduce((n,v)=>n+v,0),639);save('rollback.json',rb);await unchanged();pass('639_inserts_rolled_back_exactly');
 for(const phase of Object.keys(plan.rows).concat('before_commit')){
  await assert.rejects(executeJungleRelease({...args,mode:'apply',onPhase:async p=>{if(p===phase)throw Error('injected_'+p);}}),/injected_/);await unchanged();pass('failure_after_'+phase);
 }
 await assert.rejects(executeJungleRelease({...args,mode:'apply',onPhase:async p=>{if(p==='before_commit')await c.query("update vault_item_instances set notes='forbidden test change'");}}),/protected_records_drift/);await unchanged();pass('saved_copy_side_effect_rejected_and_rolled_back');
 await assert.rejects(executeJungleRelease({...args,mode:'rollback',onPhase:async p=>{if(p==='card_prints')await c.query('insert into card_prints(id,set_id,game_id,name,number,gv_id,printed_identity_modifier,variant_key,set_code,identity_domain,set_identity_model) select id,set_id,game_id,name,number,gv_id,printed_identity_modifier,variant_key,set_code,identity_domain,set_identity_model from card_prints where id=$1',[plan.rows.card_prints[0].id]);}}),/duplicate key/);await unchanged();pass('real_duplicate_key_rolls_back_partial_inserts');
 const tampered=structuredClone(plan);tampered.rows.jungle_edition_identity_links_v1[0].state='active';delete tampered.fingerprint;tampered.fingerprint=hash(tampered);await assert.rejects(executeJungleRelease({...args,plan:tampered,expectedFingerprint:tampered.fingerprint,mode:'rollback'}));await unchanged();pass('rehashing_active_payload_cannot_bypass_source_authority');
 await assert.rejects(executeJungleRelease({...args,mode:'rollback',artifacts:new Map([...artifacts,['tcgdex:base2-1',Buffer.from('{}')]])}));await unchanged();pass('altered_source_bytes_rejected');
 await assert.rejects(executeJungleRelease({...args,mode:'rollback',onPhase:async p=>{if(p==='jungle_edition_identity_links_v1')await c.query("create function public.jungle_unreviewed_fixture_v2() returns integer language sql as 'select 1'");}}),/schema_or_side_effect_drift/);await unchanged();pass('schema_side_effect_rejected_and_rolled_back');
 await assert.rejects(executeJungleRelease({...args,mode:'apply',onPhase:async p=>{if(p==='before_commit')await c.query("update vendor_receipt_books set revision=revision+1");}}),/protected_records_drift/);await unchanged();pass('receipt_book_side_effect_rejected_and_rolled_back');
 for(const table of ['vendor_sales_catalog_adds','vendor_sales_cart_receipts']){
  assert.equal((await c.query('select count(*)::int n from '+table)).rows[0].n,1);
  await assert.rejects(executeJungleRelease({...args,mode:'apply',onPhase:async p=>{if(p==='before_commit')await c.query("update "+table+" set request=request||'{\"forbidden\":true}'::jsonb");}}),/protected_records_drift/);
  await unchanged();pass(table+'_side_effect_rejected_and_rolled_back');
 }
 const applied=await run('apply');assert.equal(applied.after,'exact');pass('exact_staged_state_inside_outer_transaction');
 assert.equal((await c.query("select count(*)::int n from jungle_edition_identity_links_v1 where state='staged'")).rows[0].n,128);
 assert.equal((await c.query('select bool_and(jungle_edition_link_valid_v1(id,true)) valid from jungle_edition_identity_links_v1')).rows[0].valid,true);pass('128_staged_links_valid');
 assert.equal((await c.query('select count(*)::int n from tcgplayer_jungle_edition_bindings_v1')).rows[0].n,0);assert.equal((await c.query('select count(*)::int n from market_price_current_publication')).rows[0].n,0);pass('no_binding_or_price_publication');
 const retry=await run('apply');assert.ok(Object.values(retry.writes).every(n=>n===0));pass('exact_retry_zero_inserts');assert.equal((await run('readback')).after,'exact');pass('exact_readback');
 const expired=structuredClone(plan);expired.asOf=new Date(Date.now()-7200000).toISOString();delete expired.fingerprint;expired.fingerprint=hash(expired);await assert.rejects(executeJungleRelease({...args,plan:expired,expectedFingerprint:expired.fingerprint,mode:'apply'}),/execution_plan_stale_or_future/);pass('expired_plan_cannot_write');assert.equal((await executeJungleRelease({...args,plan:expired,expectedFingerprint:expired.fingerprint,mode:'readback'})).after,'exact');pass('expired_plan_still_allows_read_only_recovery');
 await assert.rejects(executeJungleRelease({...args,mode:'apply',onPhase:async p=>{if(p==='before_commit')await c.query('delete from card_printing_truth_reviews where id=$1',[plan.rows.card_printing_truth_reviews[0].id]);}}),/partial_or_conflicting_execution/);pass('partial_state_rejected');
 await c.query('rollback');open=false;assert.deepEqual((await c.query(fp)).rows,before);assert.deepEqual((await c.query('select * from supabase_migrations.schema_migrations order by version')).rows,ledger);pass('outer_rollback_preserves_all_public_tables_and_ledger');
 const receipt={at:new Date().toISOString(),status:'passed',checks,checkCount:checks.length,plannedRows:639,stagedLinks:128,protectedTables:tables.length,retainedCopies:5,outerRollbackProven:true,commitsIntercepted,durableCommitProven:false,productionWrites:0,resetOrReseed:false,sourceHashes:Object.fromEntries(['backend/catalog/jungle_edition_catalog_release_v4.mjs','scripts/schema/seed_jungle_catalog_v35.mjs','scripts/schema/qualify_jungle_catalog_durable_v35.mjs'].map(p=>[p,sha(fs.readFileSync(p))]))};save('receipt.json',receipt);fs.writeFileSync(base+'/catalog-release-v4/rollback-latest.json',JSON.stringify({...receipt,out},null,2));console.log(JSON.stringify({...receipt,out}));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});assert.deepEqual((await c.query(fp)).rows,before);throw e;}finally{await c.end();}

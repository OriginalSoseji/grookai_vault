// Rollback-only qualification on the preserved422 upgrade lab. No reset or durable seed.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import pg from 'pg';
import {freezeJungleRelease,executeJungleRelease,assertJungleReleaseTarget} from '../../backend/catalog/jungle_edition_catalog_release_v2.mjs';
import {readJungleExecutionState,buildJungleExecutionRows} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
const root='C:/gv_jungle_edition_20261001',base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',project='jungle-edition-upgrade-421-v23-20261001';
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
for(const [n,h]of Object.entries(read(base+'/full-422-v25/freeze.json').sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+n)),h,n);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:20000});const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];
assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const c=new pg.Client({host:'127.0.0.1',port:65520,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000});await c.connect();await assertJungleReleaseTarget(c,'local_rehearsal');assert.equal((await c.query('select host(inet_server_addr()) address')).rows[0].address,db.NetworkSettings.Networks[project].IPAddress);
const out=base+'/current-source-v29/local-assignments-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});fs.copyFileSync(new URL(import.meta.url),out+'/test-source.mjs');
const tables=(await c.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname")).rows;for(const {relname:n}of tables)assert.match(n,/^[a-z_][a-z0-9_]*$/);
const fp=tables.map(({relname:n})=>`select '${n}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${n}" t`).join(' union all ')+' order by table_name';
const before=(await c.query(fp)).rows,ledger=(await c.query('select * from supabase_migrations.schema_migrations order by version')).rows;save('before-footprints.json',before);
assert.equal((await c.query('select count(*)::int n from vault_item_instances')).rows[0].n,2);
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json'),ar=base+'/catalog-authority-v2',artifacts=new Map(read(ar+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(ar,r.path))]));const original=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
const snapshot=read(base+'/current-source-v29/production-snapshot.json'),review=read(base+'/current-source-v29/refresh/pricing-review.json'),refresh=read(base+'/current-source-v29/refresh/execution-refresh.json');
const {assertJungleExecutionRefreshV1}=await import('../../backend/catalog/jungle_edition_execution_refresh_v1.mjs');assertJungleExecutionRefreshV1(manifest,artifacts,refresh);assert.equal(review.snapshot_sha256,sha(fs.readFileSync(base+'/current-source-v29/production-snapshot.json')));

save('intent.json',{at:new Date().toISOString(),project,rollbackOnly:true,sourceRun:snapshot.sourceRun.id,productionWrites:0,containerId:db.Id});
const insert=async(t,rows)=>{assert.match(t,/^[a-z_][a-z0-9_]*$/);assert.ok(rows.length);const generated=(await c.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated<>'NEVER'",[t])).rows.map(r=>r.column_name);const fields=Object.keys(rows[0]).filter(k=>!generated.includes(k)).map(k=>'"'+k+'"').join(',');await c.query('insert into public.'+t+'('+fields+') select '+fields+' from jsonb_populate_recordset(null::public.'+t+',$1::jsonb)',[JSON.stringify(rows)]);};
try{
 await c.query('begin isolation level serializable');await c.query("set local statement_timeout='90s'");
 assert.equal((await c.query('select count(*)::int n from card_prints where set_id=$1',[manifest.authority.set_id])).rows[0].n,0);
 await c.query("insert into sets(id,code,name,game,identity_model,identity_domain_default) values($1,'base2','Jungle','pokemon','standard','pokemon_eng_standard')",[manifest.authority.set_id]);
 const gameId=(await c.query("select id from games where code='pokemon'")).rows[0].id;
 for(const [t,rows]of [['pokemon_species',snapshot.species],['card_prints',snapshot.cards.map(p=>({...p,game_id:gameId}))],['card_printings',snapshot.printings]])await insert(t,rows);
 const catalog=buildJungleExecutionRows(manifest,artifacts,{asOf:original.at,gameId});for(const [t,rows]of Object.entries(catalog))await insert(t,rows);
 for(const [t,key]of [['tcgcsv_source_sync_runs','sourceRuns'],['tcgcsv_source_categories','sourceCategories'],['tcgcsv_source_groups','sourceGroups'],['tcgcsv_source_products','sourceProducts'],['tcgcsv_source_artifacts','sourceArtifacts'],['tcgcsv_source_price_daily_observations','observations']])await insert(t,snapshot[key]);
 const links=(await c.query('select * from jungle_edition_identity_links_v1 order by id')).rows;assert.equal(links.length,128);
 for(const l of links){const r=review.rows.find(r=>r.card_print_id===l.card_print_id);assert.ok(r?.compatible);await c.query("insert into tcgplayer_jungle_edition_bindings_v1(identity_link_id,product_id,source_subtype,source_product_payload_hash,manifest_sha256,review_ref,state) values($1,$2,$3,$4,$5,$6,'staged')",[l.id,r.product_id,r.source_subtype,r.product_hash,manifest.fingerprint,'local-current-source:'+review.snapshot_sha256]);}
 await c.query("update jungle_edition_identity_links_v1 set state='active'");await c.query("update tcgplayer_jungle_edition_bindings_v1 set state='active'");
 await c.query('set local role service_role');const inserted=(await c.query('select prepare_tcgplayer_jungle_edition_assignments_v1($1) n',[snapshot.sourceRun.id])).rows[0].n;assert.equal(inserted,128);assert.equal((await c.query('select prepare_tcgplayer_jungle_edition_assignments_v1($1) n',[snapshot.sourceRun.id])).rows[0].n,0);await c.query('reset role');
 const assignments=(await c.query("select to_jsonb(t)||jsonb_build_object('assignment_payload_text',assignment_payload::text) value from v_tcgplayer_jungle_edition_current_assignments_v1 t order by source_observation_id")).rows.map(r=>r.value);assert.equal(assignments.length,128);
 const activeLinks=(await c.query('select to_jsonb(t) value from jungle_edition_identity_links_v1 t order by id')).rows.map(r=>r.value);
 await c.query("set local search_path=''");
 const body=(await c.query("select pg_get_viewdef('public.v_tcgplayer_market_qualification_candidates_v2'::regclass,true) body")).rows[0].body.trim().replace(/;$/,'');
 await c.query('set local search_path=public');
 const overlay={version:'JUNGLE_POPULATED_SOURCE_OVERLAY_V1',at:new Date().toISOString(),sourceRun:snapshot.sourceRun.id,snapshotSha256:review.snapshot_sha256,manifestFingerprint:manifest.fingerprint,workerSha256:sha(fs.readFileSync('scripts/workers/tcgplayer_market_publication_worker_v1.mjs')),localRollbackOnly:true,assignments,links:activeLinks};
 assert.equal((await c.query('select count(*)::int n from market_price_current_publication')).rows[0].n,0);
 await c.query('rollback');assert.deepEqual((await c.query(fp)).rows,before);assert.deepEqual((await c.query('select * from supabase_migrations.schema_migrations order by version')).rows,ledger);
 save('edition-overlay.json',overlay);fs.writeFileSync(out+'/candidate-v2-body.sql',body,{flag:'wx'});const receipt={at:new Date().toISOString(),status:'passed',sourceRun:snapshot.sourceRun.id,assignments:128,retryInserts:0,protectedTables:tables.length,retainedCopies:2,rollbackProven:true,productionWrites:0,durableShadow:false,overlaySha256:sha(fs.readFileSync(out+'/edition-overlay.json')),viewBodySha256:sha(Buffer.from(body)),sourceSha256:sha(fs.readFileSync(new URL(import.meta.url)))};save('receipt.json',receipt);console.log(JSON.stringify({...receipt,out}));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack});assert.deepEqual((await c.query(fp)).rows,before);throw e;}finally{await c.end();}

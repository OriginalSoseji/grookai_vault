// Full actual-source fixture and durable worker shadow. Fixed isolated target only.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import readline from 'node:readline';
import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';import pg from 'pg';
import {inspectJungleFullSourceV30} from './inspect_jungle_full_source_v30.mjs';
import {assertJungleExecutionRefreshV1} from '../../backend/catalog/jungle_edition_execution_refresh_v1.mjs';
import {qualifyJungleCatalogDurableV30} from './qualify_jungle_catalog_durable_v30.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',out=base+'/full-source-durable-v30';
const fixture=base+'/full-422-v30',project='jungle-edition-full-422-v30-20261001',port=53400;
assert.equal(process.argv.length,2);const mode='continue-catalog';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex'),quote=s=>'"'+s.replaceAll('"','""')+'"';
const source=read(out+'/receipt.json');assert.equal(source.status,'passed');assert.equal(source.readOnly,true);assert.equal(source.tlsVerified,true);assert.equal(source.sanity.migrations,414);assert.ok(Date.now()-Date.parse(source.sourceRun.finished_at)<36*3600000);
const freeze=read(fixture+'/freeze.json');assert.equal(freeze.project,project);assert.equal(read(fixture+'/replay-result.json').status,'passed');
for(const [name,hash]of Object.entries(freeze.sourceHashes)){assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),hash);assert.equal(sha(fs.readFileSync(fixture+'/supabase/migrations/'+name)),hash);}
const runtimeAttestation=inspectJungleFullSourceV30();
const capacity=()=>{const s=fs.statfsSync('C:/');return Number(s.bavail)*Number(s.bsize);};assert.ok(capacity()>12*1024**3,'At least12GiB free before full durable fixture');
const attempt=out+'/'+mode+'-'+Date.now();fs.mkdirSync(attempt);const save=(n,v)=>fs.writeFileSync(attempt+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
save('intent.json',{at:new Date().toISOString(),project,port,mode,consumed:true,sourceReceiptSha256:sha(fs.readFileSync(out+'/receipt.json')),scriptSha256:sha(fs.readFileSync(new URL(import.meta.url))),freeBytes:capacity(),productionWrites:0});
save('runtime-attestation.json',runtimeAttestation);
const c=new pg.Client({host:'127.0.0.1',port,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000,statement_timeout:120000});await c.connect();
const original=c.query.bind(c);c.query=(...args)=>{assert.ok(capacity()>3*1024**3,'Stop local writes before exhausting disk');return original(...args);};
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json');
const artifactRoot=base+'/catalog-authority-v2',artifacts=new Map(read(artifactRoot+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(artifactRoot,r.path))]));

const previous=out+'/seed-1790976522905';
assert.match(read(previous+'/failure.json').message,/Second client must actually wait/);
const priorReadback=read(previous+'/failure-readback.json');assert.equal(priorReadback.r.links,0);assert.equal(priorReadback.r.bindings,0);assert.equal(priorReadback.r.copies,5);
const copyBefore=read(previous+'/copies-before-catalog-and-binding.private.json');
try{
 const state=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select count(*)::int from auth.users) users,(select count(*)::int from market_price_pipeline_runs) runs,(select count(*)::int from jungle_edition_identity_links_v1) links,(select count(*)::int from tcgplayer_jungle_edition_bindings_v1) bindings,(select count(*)::int from market_price_current_publication) pointers")).rows[0];assert.equal(state.address,runtimeAttestation.address);assert.equal(state.migrations,422);assert.equal(state.workers,'0');assert.equal(state.users,1);for(const k of ['runs','links','bindings','pointers'])assert.equal(state[k],0);assert.ok(!fs.existsSync(out+'/seed-receipt.json'));assert.deepEqual((await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows,copyBefore);
 const {executeJungleRelease}=await import('../../backend/catalog/jungle_edition_catalog_release_v2.mjs');const priorPlan=read(previous+'/catalog-plan.private.json');const unchanged=await executeJungleRelease({client:c,plan:priorPlan,expectedFingerprint:priorPlan.fingerprint,manifest,artifacts,mode:'preflight'});assert.equal(unchanged.before,'before');save('retained-all-table-preflight.json',unchanged);
 const refresh=read(base+'/current-source-v30/refresh/execution-refresh.json');assertJungleExecutionRefreshV1(manifest,artifacts,refresh);assert.equal(refresh.snapshot.sourceRun.id,source.sourceRun.id);
 const review=read(base+'/current-source-v30/refresh/pricing-review.json');assert.equal(review.snapshot_sha256,sha(fs.readFileSync(base+'/current-source-v30/production-snapshot.json')));
 const catalog=await qualifyJungleCatalogDurableV30({client:c,manifest,artifacts,out:attempt});assert.equal(catalog.status,'passed');
 await c.query('begin');const links=(await c.query('select * from jungle_edition_identity_links_v1')).rows;assert.equal(links.length,128);
 for(const l of links){const r=review.rows.find(r=>r.card_print_id===l.card_print_id);assert.ok(r?.compatible);assert.equal((await c.query('select payload_hash from tcgcsv_source_products where product_id=$1',[r.product_id])).rows[0].payload_hash,r.product_hash);await c.query("insert into tcgplayer_jungle_edition_bindings_v1(identity_link_id,product_id,source_subtype,source_product_payload_hash,manifest_sha256,review_ref,state) values($1,$2,$3,$4,$5,$6,'staged')",[l.id,r.product_id,r.source_subtype,r.product_hash,manifest.fingerprint,'local-full-source:'+sha(fs.readFileSync(out+'/receipt.json'))]);}
 await c.query("update jungle_edition_identity_links_v1 set state='active'");await c.query("update tcgplayer_jungle_edition_bindings_v1 set state='active'");assert.equal((await c.query('select count(*)::int n from tcgplayer_jungle_edition_bindings_v1 where tcgplayer_jungle_binding_valid_v1(id,true)')).rows[0].n,128);assert.deepEqual((await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows,copyBefore);await c.query('commit');
 assert.deepEqual((await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows,copyBefore);
 const receipt={at:new Date().toISOString(),status:'passed',project,sourceRows:source.counts.sourceRows,canonicalAdditions:128,activeLocalBindings:128,syntheticLegacyCopies:5,copiesPreservedThroughCatalogAndBinding:true,catalogReceipt:attempt+'/catalog-receipt.json',continuedWithoutResetOrReseed:true,preservedFailure:previous,productionWrites:0,freeBytes:capacity()};save('receipt.json',receipt);fs.writeFileSync(out+'/seed-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}catch(e){await original('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message,stack:e.stack,freeBytes:capacity()});throw e;}finally{await c.end();}

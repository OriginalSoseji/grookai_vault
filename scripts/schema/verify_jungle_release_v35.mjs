// Exact417-to425 schema release qualification. Never applies SQL or catalog rows.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import pg from 'pg';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
import {inspectJungleFullV35} from './inspect_jungle_full_v35.mjs';
import {inspectJungleUpgradeV35} from './inspect_jungle_upgrade_v35.mjs';
const root='C:/gv_jungle_edition_20261001',base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(process.argv.length,3);const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
const sources=Object.fromEntries(fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(fs.readFileSync('supabase/migrations/'+n))]));assert.equal(Object.keys(sources).length,425);assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,425);
const replay=read(base+'/full-425-v35/replay-result.json'),freeze=read(base+'/full-425-v35/freeze.json'),upgrade=read(base+'/upgrade-425-v35/upgrade-result.json');
assert.deepEqual(sources,freeze.sourceHashes);assert.deepEqual(sources,upgrade.sourceHashes);assert.equal(replay.status,'passed');assert.ok(replay.fullReplay&&replay.noOpPush);assert.equal(replay.migrations,425);assert.equal(upgrade.status,'passed');assert.equal(upgrade.baselineMigrations,417);assert.equal(upgrade.migrations,425);assert.equal(upgrade.allExistingRowsUnchanged,true);assert.equal(upgrade.resetsAfterPopulation,0);assert.equal(upgrade.comparison.normalizedBytes,0);
const qualification=read(base+'/release-v35/qualification.json');assert.equal(qualification.status,'passed');assert.equal(qualification.schemaOnly,true);assert.equal(qualification.productionCatalogQualified,false);
for(const [p,h]of Object.entries(qualification.sourceHashes))assert.equal(sha(fs.readFileSync(p)),h,p);
for(const p of qualification.proofs)assert.equal(sha(fs.readFileSync(base+'/'+p.path)),p.sha256,p.path);
assert.equal(qualification.rollbackChecks,26);assert.equal(qualification.actualConcurrentCommit,true);assert.equal(qualification.receiptBookPreserved,true);
if(phase==='PrePush'){
 assert.equal(git('status','--porcelain'),'','Clean committed source required');git('merge-base','--is-ancestor','origin/main','HEAD');
 const hook=read(base+'/release-v35/normal-hook-latest.json');assert.equal(hook.status,'passed');assert.equal(hook.normalHooks,true);assert.equal(hook.head,git('rev-parse','HEAD'));assert.equal(hook.exitCode,0);assert.ok(Date.now()-Date.parse(hook.at)<7200000);assert.equal(sha(fs.readFileSync(hook.out+'/commit.private.log')),hook.logSha256);
}
const prior=read(base+'/implementation-source-v32.json');for(const p of ['scripts/workers/tcgplayer_market_publication_worker_v1.mjs','backend/pricing/tcgplayer_market_publication_policy_v1.mjs','docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json'])assert.equal(sha(fs.readFileSync(p)),prior.files.find(f=>f.path===p).sha256,p);
execFileSync(process.execPath,['--use-system-ca','scripts/schema/audit_jungle_edition_baseline_v12.mjs'],{encoding:'utf8',windowsHide:true,timeout:180000});
const baseline=read(base+'/jungle-sales-desk-baseline-417-latest.json');assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,417);assert.equal(baseline.candidateMigrations,425);assert.equal(baseline.pending.length,8);assert.deepEqual(baseline.sourceHashes,sources);
const out=base+'/release-v35/gate-'+phase+'-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
for(const [port,inspect,copies]of [[54000,inspectJungleFullV35,5],[54020,inspectJungleUpgradeV35,2]]){
 const runtime=inspect(),c=new pg.Client({host:'127.0.0.1',port,user:'postgres',password:'postgres',database:'postgres',options:'-c default_transaction_read_only=on',connectionTimeoutMillis:5000});await c.connect();
 try{
  assert.equal((await c.query('select host(inet_server_addr()) a')).rows[0].a,runtime.address);assert.equal((await c.query('show max_worker_processes')).rows[0].max_worker_processes,'0');assert.equal((await c.query('select count(*)::int n from vault_item_instances')).rows[0].n,copies);
  for(const t of ['market_price_current_publication','tcgplayer_jungle_edition_bindings_v1'])assert.equal((await c.query('select count(*)::int n from '+t)).rows[0].n,0);
  for(const t of ['vendor_receipt_cloud_control','vendor_sales_cart_control'])assert.equal((await c.query('select enabled from '+t)).rows[0].enabled,false);
  const raw=await c.query(snapshotSql),current=raw.find(r=>r.rows?.[0]?.receipt)?.rows[0].receipt;assert.ok(current);assert.deepEqual(current.LEDGER,Object.keys(sources).map(n=>({version:n.split('_')[0]})));save(port+'-schema.private.json',current);await compareSnapshots(current,read(base+'/full-425-v35/replayed.private.json'),{output:out+'/'+port});
  if(port===54000){
   const {executeJungleRelease}=await import('../../backend/catalog/jungle_edition_catalog_release_v4.mjs');
   const ar=base+'/catalog-authority-v2',manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json'),artifacts=new Map(read(ar+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(ar,r.path))]));
   const plan=read(base+'/catalog-release-v4/durable-v35/catalog-plan.private.json'),readback=await executeJungleRelease({client:c,manifest,artifacts,plan,expectedFingerprint:plan.fingerprint,mode:'readback'});assert.equal(readback.after,'exact');save('catalog-readback.json',readback);
   for(const [t,order,file]of [['vendor_receipt_books','owner_id','books'],['vault_item_instances','id','copies'],['vendor_sales_catalog_adds','owner_id,request_id','vendor_sales_catalog_adds'],['vendor_sales_cart_receipts','owner_id,request_id','vendor_sales_cart_receipts']])assert.deepEqual((await c.query('select to_jsonb(t) value from '+t+' t order by '+order)).rows,read(base+'/catalog-release-v4/seed-v35/'+file+'.private.json'));
  }else{
   const before=read(base+'/upgrade-425-v35/before-retained.private.json');
   assert.deepEqual((await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows.map(r=>r.value),before.copies);
   assert.deepEqual((await c.query('select to_jsonb(t) value from vendor_receipt_books t order by owner_id')).rows.map(r=>r.value),before.books);
  }
 }finally{await c.end();}
}
const toolPaths=['scripts/migration_preflight_strict.ps1','scripts/schema/verify_jungle_release_v35.mjs','scripts/release/prepare_jungle_cli_v35.mjs'];
const result={at:new Date().toISOString(),status:'passed',phase,target:'ycdxbpibncqcchqiihfz',migrations:417,candidateMigrations:425,sourceHashes:sources,pending:baseline.pending.map(n=>n.split('_')[0]),sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),toolHashes:Object.fromEntries(toolPaths.map(p=>[p,sha(fs.readFileSync(p))])),baseline:baseline.output,baselineReceiptSha256:sha(fs.readFileSync(baseline.output+'/receipt.json')),productionWrites:0,applyAuthority:false,productionCatalogQualified:false,out};save('receipt.json',result);fs.writeFileSync(base+'/Release-v35-'+phase+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:'passed',phase,migrations:417,candidateMigrations:425,pending:8,productionWrites:0,out}));

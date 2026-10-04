// Exact 425 -> 426 projection repair gate. No apply or view-order normalization.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import pg from 'pg';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
import {inspectJungleFullV37} from './inspect_jungle_full_v37.mjs';
import {inspectJungleUpgradeV37} from './inspect_jungle_upgrade_v37.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',dir=base+'/projection-v37';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(process.argv.length,3);const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
const name='20261004090000_jungle_discovery_projection_order_v1.sql';
const sources=Object.fromEntries(fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync('supabase/migrations/'+n))]));assert.equal(Object.keys(sources).length,426);assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,426);
const prior=read(base+'/full-425-v35/freeze.json');for(const[n,h]of Object.entries(prior.sourceHashes))assert.equal(sources[n],h,n);assert.deepEqual(Object.keys(sources).filter(n=>!prior.sourceHashes[n]),[name]);
const projection=read(dir+'/projection-evidence.json');assert.equal(sources[name],projection.migrationSha256);
const full=read(base+'/full-426-v37/replay-result.json'),upgrade=read(base+'/upgrade-426-v37/upgrade-result.json'),guard=read(dir+'/guard-tests-latest.json');
for(const p of [full,upgrade,guard])assert.equal(p.status,'passed');assert.ok(full.fullReplay&&full.noOpPush);assert.equal(full.migrations,426);assert.equal(upgrade.migrations,426);assert.equal(upgrade.baselineMigrations,425);assert.equal(upgrade.allExistingRowsUnchanged,true);assert.equal(upgrade.productionShapedViewOidPreserved,true);assert.equal(upgrade.comparison.normalizedBytes,0);assert.equal(guard.tests,4);assert.equal(guard.migrationSha256,sources[name]);
assert.deepEqual(sources,read(base+'/full-426-v37/freeze.json').sourceHashes);assert.deepEqual(sources,upgrade.sourceHashes);
const qualification=read(dir+'/qualification.json');for(const[p,h]of Object.entries(qualification.sourceHashes))assert.equal(hash(fs.readFileSync(p)),h,p);for(const[p,h]of Object.entries(qualification.proofHashes))assert.equal(hash(fs.readFileSync(base+'/'+p)),h,p);
if(phase==='PrePush'){
 assert.equal(git('status','--porcelain'),'');git('merge-base','--is-ancestor','origin/main','HEAD');const hook=read(dir+'/normal-hook-latest.json');assert.equal(hook.status,'passed');assert.equal(hook.head,git('rev-parse','HEAD'));assert.equal(hook.normalHooks,true);assert.equal(hook.exitCode,0);assert.ok(Date.now()-Date.parse(hook.at)<7200000);assert.equal(hash(fs.readFileSync(hook.out+'/commit.private.log')),hook.logSha256);
}
const out=dir+'/gate-'+phase+'-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
const clean=read(base+'/full-426-v37/replayed.private.json');
for(const [port,inspect,copies]of [[54200,inspectJungleFullV37,0],[54220,inspectJungleUpgradeV37,2]]){
 const runtime=inspect(),c=new pg.Client({host:'127.0.0.1',port,user:'postgres',password:'postgres',database:'postgres',options:'-c default_transaction_read_only=on'});await c.connect();try{
  assert.equal((await c.query('select host(inet_server_addr()) a')).rows[0].a,runtime.address);assert.equal((await c.query('show max_worker_processes')).rows[0].max_worker_processes,'0');assert.equal((await c.query('select count(*)::int n from vault_item_instances')).rows[0].n,copies);
  const r=await c.query(snapshotSql),current=r.find(r=>r.rows?.[0]?.receipt).rows[0].receipt;assert.deepEqual(current.LEDGER,Object.keys(sources).map(n=>({version:n.split('_')[0]})));await compareSnapshots(current,clean,{output:out+'/'+port});
  if(copies){const old=read(base+'/upgrade-426-v37/before-retained.private.json');for(const[t,key,order]of [['vault_item_instances','copies','id'],['vendor_receipt_books','books','owner_id']])assert.deepEqual((await c.query('select to_jsonb(t) value from '+t+' t order by '+order)).rows.map(r=>r.value),old[key]);}
 }finally{await c.end();}
}
const {query,ref}=await import('../release/storefront_production_live_common_v1.mjs');assert.equal(ref,'ycdxbpibncqcchqiihfz');const remote=(await query(snapshotSql))[0].receipt;save('remote.private.json',remote);assert.deepEqual(remote.LEDGER,Object.keys(prior.sourceHashes).map(n=>({version:n.split('_')[0]})));assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
// This repair makes fresh replay match the already-live projection exactly.
// Only the established three base-table physical-order reconciliation is used.
const comparison=await compareSnapshots(remote,clean,{reconcile:true,output:out+'/production'});
const view=remote.ALL_RELATIONS_QUERY.filter(r=>r.schema==='public'&&r.name==='v_card_prints_discovery_v1').sort((a,b)=>a.position_number-b.position_number);assert.deepEqual(view.map(r=>r.attname),projection.production);
const toolPaths=['scripts/migration_preflight_strict.ps1','scripts/schema/verify_jungle_projection_v37.mjs','scripts/release/prepare_jungle_projection_cli_v37.mjs'];
const result={at:new Date().toISOString(),status:'passed',phase,target:ref,migrations:425,candidateMigrations:426,pending:['20261004090000'],sourceHashes:sources,sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),toolHashes:Object.fromEntries(toolPaths.map(p=>[p,hash(fs.readFileSync(p))])),comparison,productionViewOid:view[0].oid,baseline:out,baselineReceiptSha256:hash(fs.readFileSync(out+'/remote.private.json')),productionWrites:0,applyAuthority:false,out};save('receipt.json',result);fs.writeFileSync(dir+'/Release-'+phase+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:'passed',phase,migrations:425,candidateMigrations:426,securityObjects:comparison.securityObjects,out}));

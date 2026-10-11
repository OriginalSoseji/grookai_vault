// Read-only integrated-source release gate; retains both exact-package databases.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateDealReleaseArguments,dealRelease} from './product_deal_release_scope_v1.mjs';
import {costHistoryRelease} from './product_cost_history_release_scope_v1.mjs';
import {readCostHistoryReleaseState} from './product_cost_history_release_state_v1.mjs';
import {readCostHistoryParent} from './product_cost_history_parent_v1.mjs';
const {root,evidence}=costHistoryRelease;
import {loadCostHistoryEvidence} from './product_cost_history_evidence_v1.mjs';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
export async function verifyProductCostHistory(phase){
 validateDealReleaseArguments([phase]);const target=dealRelease.target;
 const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());assert.equal(git('diff','--name-only'),'','Stage reviewed changes');assert.equal(git('ls-files','--others','--exclude-standard'),'');
 const productEvidence=loadCostHistoryEvidence(),{sourceHashes,packageHashes}=productEvidence;
 const parent=readCostHistoryParent();assert.deepEqual(parent.states,productEvidence.parent.states);
 for(const mode of ['full','upgrade'])assert.deepEqual(await readCostHistoryReleaseState(mode,packageHashes),productEvidence.states[mode]);
 let remoteMain=null;
 if(phase==='PrePush'){
  assert.equal(git('status','--porcelain'),'');remoteMain=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];assert.match(remoteMain,/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',remoteMain,'HEAD');
  const h=read(evidence+'/latest-checks.json');assert.equal(h.status,'passed');assert.equal(h.mode,'commit');assert.equal(h.exitCode,0);assert.equal(h.finalHead,git('rev-parse','HEAD'));assert.equal(h.localReadOnly,true);assert.equal(h.productionWrites,0);
  const age=Date.now()-Date.parse(h.at);assert.ok(age>=0&&age<7200000);assert.equal(sha(h.out+'/checks.private.log'),h.logSha256);assert.deepEqual(h.before,h.after);assert.deepEqual(h.after,productEvidence.states);
 }
 const out=evidence+'/cost-history-gate-'+phase+'-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
 const prior='C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1';
 const preserved=evidence;
 for(const mode of ['full','upgrade']){
  const container='supabase_db_costhist-rel-'+mode+'-436-v1-20261008';save(mode+'-state.json',productEvidence.states[mode]);
  const schema=JSON.parse(execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:snapshotSql,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:96*1024*1024}));
  assert.equal(schema.read_only,'on');assert.deepEqual(schema.LEDGER,Object.keys(packageHashes).map(n=>({version:n.split('_')[0]})));save(mode+'-schema.private.json',schema);
  await compareSnapshots(schema,read(preserved+'/release-full-436-v1/replayed.private.json'),{output:out+'/'+mode+'-parity'});
 }
 assert.ok(fs.readFileSync(root+'/supabase/config.toml','utf8').includes('project_id = "'+target+'"'));
 const {query,ref,dbUrl}=await import('../release/storefront_production_live_common_v1.mjs');assert.equal(ref,target);assert.equal(new URL(dbUrl).hostname,target+'.supabase.co');
 const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');assert.deepEqual(remote.LEDGER,read(prior+'/replayed.private.json').LEDGER);assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);save('remote.private.json',remote);
 const comparison=await compareSnapshots(read(prior+'/replayed.private.json'),remote,{reconcile:true,output:out+'/production'});
 const paths=['scripts/schema/verify_product_cost_history_v1.mjs','scripts/schema/product_cost_history_evidence_v1.mjs','scripts/schema/product_cost_history_parent_v1.mjs','scripts/schema/product_cost_history_release_scope_v1.mjs','scripts/schema/product_cost_history_release_state_v1.mjs','scripts/schema/vendor_billing_schema_v1.mjs','scripts/release/prepare_product_cost_history_cli_v1.mjs','scripts/migration_preflight_strict.ps1','docs/release/PRODUCT_COST_HISTORY_EVIDENCE_V1.json'];
 const result={at:new Date().toISOString(),status:'passed',phase,target,migrations:429,candidateMigrations:436,sourceMigrations:437,pending:[...Object.keys(packageHashes).filter(n=>!Object.hasOwn(read(prior+'/freeze.json').sourceHashes,n))].map(n=>n.split('_')[0]),deferred:[dealRelease.deferred],sourceHashes,packageHashes,sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),remoteMain,toolHashes:Object.fromEntries(paths.map(p=>[p,sha(root+'/'+p)])),comparison,baseline:out,baselineReceiptSha256:sha(out+'/remote.private.json'),productEvidence,productionWrites:0,retainedFixtureResets:0,applyAuthority:false,out};
 save('receipt.json',result);fs.writeFileSync(evidence+'/Release-'+phase+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:'passed',phase,out}));return result;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url)))await verifyProductCostHistory(validateDealReleaseArguments(process.argv.slice(2)));

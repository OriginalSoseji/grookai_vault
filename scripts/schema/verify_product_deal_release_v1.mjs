// Fixed read-only exact429 ->432 combined cost/Buy/Trade gate. No apply operation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dealRelease,dealReleaseSources,validateDealReleaseArguments} from './product_deal_release_scope_v1.mjs';
import {loadDealReleaseEvidence} from './product_deal_release_evidence_v1.mjs';
import {readDealReleaseState} from './product_deal_release_state_v1.mjs';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
const qualifiedProductCommit='5c5dec758d5c59bf6a9cc7f4d768816898c2d4b2';
const qualifiedBackendCommit='2e465a1fba6a3167c462787a6bc20f8c05b91c84';
export async function verifyProductDealRelease(phase){
 validateDealReleaseArguments([phase]);const {root,evidence,target}=dealRelease;
 assert.equal(fs.realpathSync('.').replaceAll(String.fromCharCode(92),'/').toLowerCase(),root.toLowerCase());assert.match(qualifiedProductCommit,/^[a-f0-9]{40}$/);
 const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 assert.equal(git('diff','--name-only'),'','Stage all reviewed changes first');assert.equal(git('ls-files','--others','--exclude-standard'),'');
 git('merge-base','--is-ancestor',qualifiedProductCommit,'HEAD');git('merge-base','--is-ancestor',qualifiedBackendCommit,qualifiedProductCommit);
 assert.equal(git('diff','--name-only',qualifiedProductCommit,'--','apps','backend','lib','test','supabase','pubspec.yaml','pubspec.lock'),'','Qualified product inputs changed');
 assert.equal(git('diff','--name-only',qualifiedBackendCommit,'--','backend','supabase'),'','Qualified backend/schema changed');
 const sourceHashes=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
 const prior='C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1';
 const baselineFreeze=read(prior+'/freeze.json'),packageHashes=dealReleaseSources(sourceHashes,baselineFreeze.sourceHashes);
 const productEvidence=loadDealReleaseEvidence(root,packageHashes);assert.equal(productEvidence.productCommit,qualifiedProductCommit);
 if(phase==='PrePush'){
  assert.equal(git('status','--porcelain'),'');const main=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];assert.match(main,/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',main,'HEAD');
  const latest=read(evidence+'/latest-checks.json');assert.equal(latest.status,'passed');assert.equal(latest.mode,'commit');assert.equal(latest.exitCode,0);assert.equal(latest.finalHead,git('rev-parse','HEAD'));
  const age=Date.now()-Date.parse(latest.at);assert.ok(age>=0&&age<7200000);assert.equal(sha(latest.out+'/checks.private.log'),latest.logSha256);assert.deepEqual(latest.before,latest.after);
 }
 const out=evidence+'/deal-release-gate-'+phase+'-'+Date.now();fs.mkdirSync(out);
 const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
 const sql=(container,input)=>JSON.parse(execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:96*1024*1024}));
 for(const mode of ['full','upgrade']){
  const lab=evidence+'/'+mode+'-432-v1',project='deal-'+mode+'-432-v1-20261008',container='supabase_db_'+project;
  const proof=read(lab+'/'+(mode==='full'?'replay-result.json':'upgrade-result.json'));assert.equal(proof.status,'passed');assert.equal(proof.project,project);assert.equal(proof.migrations,432);assert.equal(proof.productionWrites,0);
  if(mode==='full'){assert.equal(proof.fullReplay,true);assert.equal(proof.noOpPush,true);assert.equal(proof.retainedFixtureResets,0);}
  else {assert.equal(proof.allFixtureRowsUnchanged,true);assert.equal(proof.resetsAfterPopulation,0);assert.equal(proof.retainedCopies,2);assert.equal(proof.retainedReceiptBooks,1);assert.equal(proof.priorReceiptFormatValidated,true);await compareSnapshots(read(lab+'/baseline.private.json'),read(prior+'/replayed.private.json'),{output:out+'/upgrade-baseline'});}
  const state=await readDealReleaseState(mode,packageHashes);assert.deepEqual(state,productEvidence.finalState[mode],'Sealed package fixture changed');save(mode+'-state.json',state);
  const schema=sql(container,snapshotSql);assert.equal(schema.read_only,'on');assert.deepEqual(schema.LEDGER,Object.keys(packageHashes).map(n=>({version:n.split('_')[0]})));save(mode+'-schema.private.json',schema);
  await compareSnapshots(schema,read(evidence+'/full-432-v1/replayed.private.json'),{output:out+'/'+mode+'-parity'});
 }
 assert.ok(fs.readFileSync(root+'/supabase/config.toml','utf8').includes('project_id = "'+target+'"'));
 const {query,ref,dbUrl}=await import('../release/storefront_production_live_common_v1.mjs');assert.equal(ref,target);assert.equal(new URL(dbUrl).hostname,target+'.supabase.co');
 const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');assert.deepEqual(remote.LEDGER,Object.keys(baselineFreeze.sourceHashes).map(n=>({version:n.split('_')[0]})));assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);save('remote.private.json',remote);
 const comparison=await compareSnapshots(read(prior+'/replayed.private.json'),remote,{reconcile:true,output:out+'/production'});
 const toolPaths=['scripts/schema/verify_product_deal_release_v1.mjs','scripts/schema/product_deal_release_scope_v1.mjs','scripts/schema/product_deal_release_evidence_v1.mjs','scripts/schema/product_deal_release_state_v1.mjs','scripts/migration_preflight_strict.ps1','scripts/release/prepare_product_deal_cli_v1.mjs'];
 const result={at:new Date().toISOString(),status:'passed',phase,target,migrations:429,candidateMigrations:432,sourceMigrations:433,pending:Object.keys(dealRelease.added).map(n=>n.split('_')[0]),deferred:[dealRelease.deferred],sourceHashes,packageHashes,sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),toolHashes:Object.fromEntries(toolPaths.map(p=>[p,sha(root+'/'+p)])),comparison,baseline:out,baselineReceiptSha256:sha(out+'/remote.private.json'),productEvidence,productionWrites:0,retainedFixtureResets:0,applyAuthority:false,out};
 save('receipt.json',result);fs.writeFileSync(evidence+'/Release-'+phase+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:'passed',phase,out}));return result;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url)))await verifyProductDealRelease(validateDealReleaseArguments(process.argv.slice(2)));

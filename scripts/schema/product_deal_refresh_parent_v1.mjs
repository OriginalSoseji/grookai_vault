// Draft for the next fixed release tree. Reads preserved qualification only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dealReleaseSources} from './product_deal_release_scope_v1.mjs';
export const refreshRoot='C:/gv_product_deal_refresh_20261008';
export const refreshEvidence='C:/grookai_vault_operator_artifacts/product_deal_refresh_20261008';
export const preservedReleaseRoot='C:/gv_product_deal_release_20261008';
export const preservedReleaseCommit='3e6928b574f072cd8cff2a13c5b5f164ea3ee191';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
export function readRefreshParent(){
  assert.equal(fs.realpathSync('.').replaceAll(String.fromCharCode(92),'/').toLowerCase(),refreshRoot.toLowerCase());
  const git=(...args)=>execFileSync('git',args,{cwd:preservedReleaseRoot,encoding:'utf8',windowsHide:true}).trim();
  assert.equal(git('rev-parse','HEAD'),preservedReleaseCommit);
  assert.equal(git('status','--porcelain'),'','Preserved release source must remain clean');
  const manifest='docs/release/PRODUCT_DEAL_RELEASE_EVIDENCE_V1.json';
  assert.equal(sha(refreshRoot+'/'+manifest),sha(preservedReleaseRoot+'/'+manifest),'Historical manifest cannot be rewritten');
  for(const p of ['scripts/audits/product_deal_cost_rpc_v1.mjs','scripts/audits/product_deal_purchase_rpc_v1.mjs','scripts/audits/product_deal_trade_rpc_v1.mjs','scripts/audits/product_deal_purchase_sql_v1.mjs','scripts/audits/product_deal_trade_sql_v1.mjs','scripts/schema/verify_product_deal_idempotency_v1.mjs','scripts/schema/product_deal_release_state_v1.mjs','scripts/schema/product_deal_release_evidence_v1.mjs','scripts/schema/product_deal_release_scope_v1.mjs','scripts/schema/vendor_billing_schema_v1.mjs','scripts/release/product_deal_shadow_v1.mjs']){
    assert.equal(sha(refreshRoot+'/'+p),sha(preservedReleaseRoot+'/'+p),p+' historical verifier changed');
  }
  const sources=Object.fromEntries(fs.readdirSync(refreshRoot+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(refreshRoot+'/supabase/migrations/'+n)]));
  const baseline=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
  const packageHashes=dealReleaseSources(sources,baseline.sourceHashes);
  const code=`import fs from 'node:fs';import assert from 'node:assert/strict';
    import {loadDealReleaseEvidence} from './scripts/schema/product_deal_release_evidence_v1.mjs';
    import {readDealReleaseState} from './scripts/schema/product_deal_release_state_v1.mjs';
    const m=JSON.parse(fs.readFileSync('docs/release/PRODUCT_DEAL_RELEASE_EVIDENCE_V1.json'));
    const e=loadDealReleaseEvidence(process.cwd().replaceAll(String.fromCharCode(92),'/'),m.packageHashes);
    const full=await readDealReleaseState('full',m.packageHashes),upgrade=await readDealReleaseState('upgrade',m.packageHashes);
    assert.deepEqual(full,e.finalState.full);assert.deepEqual(upgrade,e.finalState.upgrade);
    console.log(JSON.stringify({manifestSha256:e.manifestSha256,artifacts:e.artifacts,packageHashes:m.packageHashes,states:{full,upgrade}}));`;
  const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:preservedReleaseRoot,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:8*1024*1024}));
  assert.deepEqual(result.packageHashes,packageHashes);
  assert.equal(Object.keys(result.artifacts).length,29);
  return {...result,preservedReleaseCommit,sourceHashes:sources,productionWrites:0,localWrites:0};
}

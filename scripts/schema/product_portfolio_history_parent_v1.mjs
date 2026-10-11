// Preserve the exact cost-history436 seal and its complete prior chain.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {portfolioHistoryRelease} from './product_portfolio_history_release_scope_v1.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function readPortfolioHistoryParent(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),portfolioHistoryRelease.root.toLowerCase());
 const prior='C:/gv_product_cost_history_20261008',commit='f19d39f20f35e030fffc9379d0d2eb1d854d6966';
 const git=(...args)=>execFileSync('git',args,{cwd:prior,encoding:'utf8',windowsHide:true}).trim();assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain'),'');
 const manifest='docs/release/PRODUCT_COST_HISTORY_EVIDENCE_V1.json';assert.equal(sha(portfolioHistoryRelease.root+'/'+manifest),sha(prior+'/'+manifest));
 const code=`import assert from 'node:assert/strict';import {loadCostHistoryEvidence} from './scripts/schema/product_cost_history_evidence_v1.mjs';import {readCostHistoryReleaseState} from './scripts/schema/product_cost_history_release_state_v1.mjs';import {readCostHistoryParent} from './scripts/schema/product_cost_history_parent_v1.mjs';
 const e=loadCostHistoryEvidence(),parent=readCostHistoryParent();assert.deepEqual(parent.states,e.parent.states);const actual={full:await readCostHistoryReleaseState('full',e.packageHashes),upgrade:await readCostHistoryReleaseState('upgrade',e.packageHashes)};assert.deepEqual(actual,e.states);console.log(JSON.stringify({manifestSha256:e.manifestSha256,artifacts:e.artifacts,states:actual,parent}));`;
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:prior,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:8*1024*1024}));
 assert.equal(Object.keys(result.artifacts).length,35);for(const state of Object.values(result.states)){assert.equal(state.migrations,436);assert.equal(Object.keys(state.retained).length,39);}
 return {preservedCommit:commit,manifestSha256:result.manifestSha256,states:result.states,priorDeal:result.parent,productionWrites:0,localWrites:0};
}

// Read the qualified parent in its original checkout; never reinterpret its old UI proof.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
export const collectorRoot='C:/gv_product_collector_usability_20261008';
export const collectorEvidence='C:/grookai_vault_operator_artifacts/product_collector_usability_20261008';
export const collectorParent='ee9bc75573516c5216a1ba7b7d54764206f56eae';
export function readCollectorUsabilityParent(){
 assert.equal(fs.realpathSync('.').replaceAll('\\','/'),collectorRoot);
 const cwd='C:/gv_product_collector_home_20261008';
 const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true}).trim();
 assert.equal(git('rev-parse','HEAD'),collectorParent);assert.equal(git('status','--porcelain'),'');
 const code=`import assert from 'node:assert/strict';
 import {loadCollectorHomeEvidence} from './scripts/schema/product_collector_home_evidence_v1.mjs';
 import {readCollectorHomeParent} from './scripts/schema/product_collector_home_parent_v1.mjs';
 const e=loadCollectorHomeEvidence(),parent=readCollectorHomeParent();assert.deepEqual(parent.states,e.states);
 console.log(JSON.stringify({manifestSha256:e.manifestSha256,states:parent.states,parent,productionWrites:0,localWrites:0}));`;
 const proof=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:32*1024*1024}));
 const baseline=JSON.parse(fs.readFileSync(collectorEvidence+'/BASELINE_429.json'));
 assert.equal(baseline.status,'passed');assert.deepEqual(proof,baseline.parentProof);
 return proof;
}

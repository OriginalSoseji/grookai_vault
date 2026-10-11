// One-use selection of actual reviewed runs; never edits the historical manifest.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {refreshRoot,refreshEvidence,readRefreshParent} from '../schema/product_deal_refresh_parent_v1.mjs';
import {refreshProduct,refreshMain,refreshManifest,refreshKeys,assertRefreshProduct,loadRefreshEvidence} from '../schema/product_deal_refresh_evidence_v1.mjs';
assert.equal(process.argv.length,2);assertRefreshProduct();
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const selection=read(refreshEvidence+'/RUNTIME_SELECTION.json');assert.equal(selection.reviewed,true);assert.deepEqual(Object.keys(selection.artifacts).sort(),refreshKeys);
const artifacts={};for(const[k,p]of Object.entries(selection.artifacts)){assert.ok(p.startsWith('C:/grookai_vault_operator_artifacts/'));assert.ok(!p.includes('..'));artifacts[k]={path:p,sha256:sha(p)};}
const parent=readRefreshParent();const {at:parentAt,status:parentStatus,producerSha256:parentProducer,...parentProof}=read(artifacts.parent.path);assert.ok(Number.isFinite(Date.parse(parentAt)));assert.equal(parentStatus,'passed');assert.equal(parentProducer,sha(refreshRoot+'/scripts/schema/product_deal_refresh_parent_v1.mjs'));assert.deepEqual(parentProof,parent);
const producers=['scripts/schema/product_deal_refresh_parent_v1.mjs','scripts/audits/product_deal_refresh_fixture_v1.mjs','scripts/audits/product_deal_refresh_web_runtime_v1.mjs','scripts/audits/product_deal_refresh_device_host_v1.mjs','scripts/schema/audit_product_deal_refresh_baseline_v1.mjs'];
const manifest={version:1,at:new Date().toISOString(),productCommit:refreshProduct,mainCommit:refreshMain,parentManifestSha256:parent.manifestSha256,packageHashes:parent.packageHashes,artifacts,producerHashes:Object.fromEntries(producers.map(p=>[p,sha(refreshRoot+'/'+p)])),productionWrites:0,applyAuthority:false};
fs.writeFileSync(refreshRoot+'/'+refreshManifest,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const result=loadRefreshEvidence();console.log(JSON.stringify({status:'sealed_and_verified',manifestSha256:result.manifestSha256,artifacts:Object.keys(result.artifacts).length,preservedArtifacts:29}));

// Freeze an exact write package from the existing non-executable proposal.
// The user authorized the ongoing catalog repair and explicitly waived micro approvals.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),read=f=>fs.readFileSync(new URL(f,dir)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const proposed=JSON.parse(read('mcd22-proposed-plan.json')),{fingerprint_sha256,...body}=proposed;
assert.equal(proposed.status,'NON_EXECUTABLE_PROPOSAL');assert.equal(sha(JSON.stringify(body)),fingerprint_sha256);
assert.equal(fingerprint_sha256,'e49f07c0b8179915727cfcc23cfd1fa15b5565a31eb1b590198c1caecd30bf3b');
const plan={...body,version:'MCD22_PROMO_RARITY_EXECUTION_PLAN_V1',status:'FROZEN_GUARDED_PACKAGE',
 source_proposal_fingerprint:fingerprint_sha256,authorization:'User provided PROCEED for catalog cleanup and asked to complete without micro approvals.',
 outstanding:'Execution still requires current source and identity revalidation, a successful same-writer rollback proof, atomic raw-first apply, protected-state proofs and durable readback.'};
plan.fingerprint_sha256=sha(JSON.stringify(plan));
fs.writeFileSync(new URL('mcd22-execution-plan.json',dir),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:plan.status,count:plan.scope.count,fingerprint_sha256:plan.fingerprint_sha256}));

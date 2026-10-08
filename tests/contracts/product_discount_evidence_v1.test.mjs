import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDiscountShadow,validateDiscountDevice,validateDiscountCancellation} from '../../scripts/schema/product_discount_evidence_v1.mjs';
function shadow(){
 const hashes={qualified:'bytes'},rows=Object.fromEntries(Array.from({length:31},(_,n)=>['table'+n,{n:1,digest:'same'}]));
 const r={status:'passed',exit:1,project:'discount-rel-shadow-435-v1-20261008',targetProject:'discount-rel-full-435-v1-20261008',productionWrites:0,targetWrites:0,retainedFixtureResets:0,shadowCaptured:true,comparison:{rawBytes:0,normalizedBytes:0,scope:'public',securityObjects:1225}};
 return [r,{project:r.project,targetProject:r.targetProject,targetReadOnly:true,apply:false,sourceHashes:hashes},{before:rows,after:structuredClone(rows)},hashes];
}
test('discount shadow binds exact package and unchanged populated target',()=>assert.doesNotThrow(()=>validateDiscountShadow(...shadow())));
test('discount shadow refuses CLI status without capture, drift, writes, changed rows or source',()=>{
 for(const change of [a=>a[0].shadowCaptured=false,a=>a[0].exit=0,a=>a[0].comparison.rawBytes=1,a=>a[0].comparison.normalizedBytes=1,a=>a[0].targetWrites=1,a=>a[0].retainedFixtureResets=1,a=>a[1].sourceHashes={},a=>a[2].after.table0.n=2,a=>delete a[2].before.table0]){const a=shadow();change(a);assert.throws(()=>validateDiscountShadow(...a));}
});
function device(){
 const build={status:'passed',build:434,nativeFiles:371,globalTrustChanged:false,apkSha256:'A'.repeat(64)};
 const process={status:'passed',primaryAppPathUnchanged:true,apkSha256:build.apkSha256,processIds:['123','456']};
 const first={phase:'discount_pending',owner:'same-owner',pendingRaw:JSON.stringify({id:'same-request',cart:{version:6,discountMinor:2000,taxMinor:100}}),draftRaw:JSON.stringify({version:4}),receipt:{id:'same-request',totalMinor:18100}};
 const second={phase:'discount_recovered',owner:first.owner,exactPendingAndDraftRetained:true,noSecondCompletion:true,pendingClearedAfterReceipt:true,heldKindsRetained:true,accountClosed:true};
 const db={status:'passed',owner:first.owner,requestId:'same-request',receiptCount:2,exactRequest:true,allEntryDisabled:true,productionWrites:0};return [build,process,first,second,db];
}
test('discount physical proof binds APK, two processes and exact recovered sale',()=>assert.doesNotThrow(()=>validateDiscountDevice(...device())));
test('discount proof refuses duplicate completion, changed owner/receipt, entry enabled or substituted APK',()=>{
 for(const change of [a=>a[1].processIds[1]='123',a=>a[1].processIds[0]='invalid',a=>a[1].primaryAppPathUnchanged=false,a=>a[1].apkSha256='B'.repeat(64),a=>a[2].receipt.id='other',a=>a[2].receipt.totalMinor=20100,a=>a[3].owner='another',a=>a[3].noSecondCompletion=false,a=>a[3].accountClosed=false,a=>a[4].receiptCount=3,a=>a[4].allEntryDisabled=false]){const a=device();change(a);assert.throws(()=>validateDiscountDevice(...a));}
});
const race=()=>({productionWrites:0,immutable:true,entryOff:true,ownerIsolated:true,legacyRollback:true,completed:'completed',cancelled:'cancelled',lockEvidence:['vendor_sales_cart_complete_v6','vendor_sales_cart_cancel_v1','vendor_sales_cart_cancel_v1','vendor_sales_cart_complete_v6'].map((name,n)=>({name,pid:n+1,blockers:[n+5]}))});
test('both cancellation race orders require actual blocked database processes',()=>{
 assert.doesNotThrow(()=>validateDiscountCancellation(race()));
 for(const change of [r=>r.lockEvidence.pop(),r=>r.lockEvidence[0].blockers=[],r=>r.lockEvidence[2].blockers=[3],r=>r.cancelled=r.completed,r=>r.legacyRollback=false,r=>r.ownerIsolated=false]){const r=race();change(r);assert.throws(()=>validateDiscountCancellation(r));}
});

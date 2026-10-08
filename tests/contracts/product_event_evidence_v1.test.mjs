import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEventShadow,validateEventDevice} from '../../scripts/schema/product_event_evidence_v1.mjs';
function shadow(){
 const hashes={qualified:'bytes'},rows=Object.fromEntries(Array.from({length:29},(_,n)=>['table'+n,{n:1,digest:'same'}]));
 const r={status:'passed',exit:1,project:'event-shadow-433-v1-20261008',targetProject:'event-release-full-433-v1-20261008',productionWrites:0,targetWrites:0,retainedFixtureResets:0,shadowCaptured:true,comparison:{rawBytes:0,normalizedBytes:0,scope:'public',securityObjects:1212}};
 return [r,{project:r.project,targetProject:r.targetProject,targetReadOnly:true,apply:false,sourceHashes:hashes},{before:rows,after:structuredClone(rows)},hashes];
}
test('completed independent shadow requires unchanged target rows',()=>assert.doesNotThrow(()=>validateEventShadow(...shadow())));
test('CLI status alone, drift, resets, writes, substituted source and changed rows refuse',()=>{
 for(const change of [a=>a[0].shadowCaptured=false,a=>a[0].exit=0,a=>a[0].comparison.rawBytes=1,a=>a[0].comparison.normalizedBytes=1,a=>a[0].targetWrites=1,a=>a[0].retainedFixtureResets=1,a=>a[1].sourceHashes={},a=>a[2].after.table0.n=2,a=>delete a[2].before.table0]){const a=shadow();change(a);assert.throws(()=>validateEventShadow(...a));}
});
function device(){
 const build={status:'passed',build:432,nativeFiles:366,globalTrustChanged:false,apkSha256:'A'.repeat(64)};
 const process={status:'passed',primaryAppPathUnchanged:true,apkSha256:build.apkSha256,processIds:['123','456']};
 const mutations=Array.from({length:10},(_,n)=>({requestId:String(n)}));
 const first={phase:'event_pending',owner:'same-owner',eventId:'same-event',mutations,journal:{pending:mutations.at(-1)}};
 const second={phase:'event_recovered',owner:first.owner,eventId:first.eventId,exactJournalRetained:true,noSecondMutation:true,accountClosed:true};
 const db={status:'passed',owner:first.owner,eventId:first.eventId,requests:10,exactRequests:true,entryDisabled:true,productionWrites:0};return [build,process,first,second,db];
}
test('two device processes bind exact pending payload and database readback',()=>assert.doesNotThrow(()=>validateEventDevice(...device())));
test('device evidence rejects restarted-in-place, duplicate send and changed owner/payload',()=>{
 for(const change of [a=>a[1].processIds[1]='123',a=>a[1].processIds[0]='invalid',a=>a[1].primaryAppPathUnchanged=false,a=>a[2].journal.pending={requestId:'other'},a=>a[3].owner='another',a=>a[3].noSecondMutation=false,a=>a[3].accountClosed=false,a=>a[4].requests=11,a=>a[4].entryDisabled=false]){const a=device();change(a);assert.throws(()=>validateEventDevice(...a));}
});

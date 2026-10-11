import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifiedProductCommit,validateProductQualification,validateShadowQualification} from '../../scripts/schema/product_release_evidence_v1.mjs';

function proof(){
 const rows=Object.fromEntries(Array.from({length:13},(_,i)=>['retained'+i,{digest:String(i),n:i}]));
 const retention={before:structuredClone(rows),after:structuredClone(rows)};
 const state={readonly:'on',workers:'0',migrations:431};
 const identity={owner:'00000000-0000-4000-8000-000000000001',requestId:'00000000-0000-4000-8000-000000000002'};
 return {
  hook:{status:'passed',exitCode:0,mode:'commit',finalHead:qualifiedProductCommit,productionWrites:0,localReadOnly:true,before:state,after:{...state}},
  runtime:{status:'passed',failure:null,cleanup:true,productionRequests:0,reset:false,checks:Array(5).fill('passed')},
  device:{status:'passed',requests:1,amount:'13.27',currency:'USD',archived:true,processRestart:true,productionWrites:0},
  process:{status:'passed',primaryAppPathUnchanged:true,processIds:['100','200']},
  phase1:{...identity,phase:'pending_after_commit',pendingCount:1},
  phase2:{...identity,phase:'recovered_after_process_restart',pendingCount:0},
  deviceRetention:structuredClone(retention),runtimeRetention:structuredClone(retention),
 };
}
test('combined qualification binds successful hook and both recovered product journeys',()=>{
 assert.equal(validateProductQualification(proof()).commit,qualifiedProductCommit);
});
for(const [name,change] of [
 ['wrong source',p=>p.hook.finalHead='a'.repeat(40)],
 ['failed hook',p=>p.hook.exitCode=1],
 ['uncommitted checks',p=>p.hook.mode='check'],
 ['writeable hook database',p=>p.hook.before.readonly='off'],
 ['background workers',p=>p.hook.before.workers='8'],
 ['changed hook data',p=>p.hook.after.copies=99],
 ['uncleaned web fixture',p=>p.runtime.cleanup=false],
 ['production web traffic',p=>p.runtime.productionRequests=1],
 ['reset fixture',p=>p.runtime.reset=true],
 ['duplicate cost request',p=>p.device.requests=2],
 ['wrong confirmed amount',p=>p.device.amount='0'],
 ['no real restart',p=>p.process.processIds=['100','100']],
 ['primary app replaced',p=>p.process.primaryAppPathUnchanged=false],
 ['different recovered request',p=>p.phase2.requestId='00000000-0000-4000-8000-000000000003'],
 ['different recovered owner',p=>p.phase2.owner='00000000-0000-4000-8000-000000000003'],
 ['pending request still unresolved',p=>p.phase2.pendingCount=1],
 ['retained native rows changed',p=>p.deviceRetention.after.retained0.n=9],
 ['retained web rows omitted',p=>delete p.runtimeRetention.before.retained0],
])test('combined qualification rejects '+name,()=>{const p=proof();change(p);assert.throws(()=>validateProductQualification(p));});

function shadowProof(){
 const hashes=Object.fromEntries(Array.from({length:430},(_,i)=>['migration'+i,String(i)]));
 const rows=Object.fromEntries(Array.from({length:15},(_,i)=>['table'+i,{digest:String(i),n:i}]));
 const r={status:'passed',exit:1,project:'cost-shadow-430-v7-20261007',targetProject:'cost-full-430-r2-20261007',shadowCaptured:true,productionWrites:0,targetWrites:0,retainedFixtureResets:0,comparison:{scope:'public',rawBytes:0,normalizedBytes:0,securityObjects:1200}};
 return [r,{project:r.project,targetProject:r.targetProject,targetReadOnly:true,apply:false,sourceHashes:structuredClone(hashes)}, {before:rows,after:structuredClone(rows)}, hashes];
}
test('empty CLI diff requires independent replay, exact source and target retention',()=>validateShadowQualification(...shadowProof()));
for(const [name,change] of [
 ['failed CLI',p=>p[0].status='failed'],
 ['missing independent capture',p=>p[0].shadowCaptured=false],
 ['nonempty raw diff',p=>p[0].comparison.rawBytes=8],
 ['missing security comparison',p=>p[0].comparison.securityObjects=0],
 ['writable target',p=>p[1].targetReadOnly=false],
 ['target mutation',p=>p[0].targetWrites=1],
 ['wrong migration bytes',p=>p[1].sourceHashes.migration0='changed'],
 ['changed retained rows',p=>p[2].after.table0.n=50],
])test('shadow qualification rejects '+name,()=>{const p=shadowProof();change(p);assert.throws(()=>validateShadowQualification(...p));});

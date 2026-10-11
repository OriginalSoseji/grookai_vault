import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {dealRelease,dealReleaseSources,validateDealReleaseArguments,validateDealShadow} from '../../scripts/schema/product_deal_release_scope_v1.mjs';
const dir=new URL('../../supabase/migrations/',import.meta.url);
// This historical contract binds the pre-event release, not later additions.
const sources=Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n.split('_')[0]<='20261008060000').sort().map(n=>[n,createHash('sha256').update(fs.readFileSync(new URL(n,dir))).digest('hex')]));
const baseline=Object.fromEntries(Object.entries(sources).filter(([n])=>n!==dealRelease.deferred&&!Object.hasOwn(dealRelease.added,n)));
test('combined release includes all three exact additions and excludes only deferred delivery',()=>{
 const result=dealReleaseSources(sources,baseline);assert.equal(Object.keys(result).length,432);assert.equal(result[dealRelease.deferred],undefined);
 for(const [n,h]of Object.entries(dealRelease.added))assert.equal(result[n],h);
});
test('changed or missing candidate bytes cannot qualify the package',()=>{
 for(const name of [dealRelease.deferred,...Object.keys(dealRelease.added),Object.keys(baseline)[0]]){
  const changed={...sources,[name]:'0'.repeat(64)};assert.throws(()=>dealReleaseSources(changed,baseline));
  const missing={...sources};delete missing[name];assert.throws(()=>dealReleaseSources(missing,baseline));
 }
});
test('unexpected additions and duplicate migration IDs cannot replace a qualified file',()=>{
 const unexpected={...sources};const name=Object.keys(baseline)[0];delete unexpected[name];unexpected['20991008060000_unexpected.sql']=sources[name];assert.throws(()=>dealReleaseSources(unexpected,baseline));
 const duplicate={...sources};delete duplicate[name];duplicate['20261008060000_duplicate.sql']=sources[name];assert.throws(()=>dealReleaseSources(duplicate,baseline));
});
test('release entry accepts only the two read-only gate phases',()=>{
 for(const phase of ['AuditLinkedSchema','PrePush'])assert.equal(validateDealReleaseArguments([phase]),phase);
 for(const args of [[],['apply'],['PrePush','--yes'],['AuditLinkedSchema','--target','other'],['PrePush','--force']])assert.throws(()=>validateDealReleaseArguments(args));
});
function shadow(){
 const packageHashes=dealReleaseSources(sources,baseline),rows=Object.fromEntries(Array.from({length:23},(_,n)=>['table'+n,{n:1,digest:'retained'}]));
 const receipt={status:'passed',exit:1,project:'deal-shadow-432-v2-20261008',targetProject:'deal-full-432-v1-20261008',productionWrites:0,targetWrites:0,retainedFixtureResets:0,shadowCaptured:true,comparison:{rawBytes:0,normalizedBytes:0,scope:'public',securityObjects:1200}};
 return [receipt,{targetReadOnly:true,apply:false,project:receipt.project,targetProject:receipt.targetProject,sourceHashes:packageHashes},{before:rows,after:structuredClone(rows)},packageHashes];
}
test('independent completed shadow and target retention qualify together',()=>assert.equal(validateDealShadow(...shadow()).retainedTables,23));
test('CLI status alone cannot qualify an uncaptured or drifting shadow',()=>{
 for(const mutate of [p=>p[0].shadowCaptured=false,p=>p[0].exit=0,p=>p[0].comparison.rawBytes=1,p=>p[0].comparison.normalizedBytes=1,p=>p[0].failure={message:'CLI diff error'},p=>p[0].targetProject='old-full-433']){
  const p=shadow();mutate(p);assert.throws(()=>validateDealShadow(...p));
 }
});
test('shadow proof rejects authority, package, and retention substitutions',()=>{
 for(const mutate of [p=>p[0].targetWrites=1,p=>p[0].productionWrites=1,p=>p[0].retainedFixtureResets=1,p=>p[1].targetReadOnly=false,p=>p[1].apply=true,p=>p[1].sourceHashes={},p=>p[2].after.table0.n=2,p=>delete p[2].before.table0]){
  const p=shadow();mutate(p);assert.throws(()=>validateDealShadow(...p));
 }
});

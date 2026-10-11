import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dealRelease} from '../../scripts/schema/product_deal_release_scope_v1.mjs';
import {validateDealRuntime,validateDealDependencyCache,reviewedDealImages} from '../../scripts/schema/product_deal_release_evidence_v1.mjs';
const packageHashes={exact:'package'};
const flags={purchase:['concurrentIdentical','changedRetryRejected','ownerIsolation','lastLineRollback','zeroCost','mixedQuickAndCanonical','featureOffRecovery','legacySaleAfterPurchase'],trade:['concurrentIdentical','concurrentChanged','allEntryDependenciesEnforced','changedRetryAndRecoveryRejected','ownerIsolation','lastLineRollback','foreignOutgoingRollback','explicitAgreedCost','outgoingCostSnapshot','privateOutgoingIdOmitted','zeroCost','mixedUnknownReferences','wholeLineQuickCredit','evenAndPayoutBalances','fiftyDistinctIncoming','featureOffRecovery','legacySaleAndPurchaseAfterNewTrade','mixedBookRoundTrip']};
function proof(kind){
 const base={status:'passed',project:'deal-full-432-v1-20261008',productionWrites:0,packageHashes,producerSha256:'a'.repeat(64)};
 if(kind==='cost')return {...base,releasePackage:true,flagsRestoredOff:true,priorFixturesUnchanged:true,resetsAfterPopulation:0,checks:['50 oversized legacy costs preserve recovery',...Array.from({length:8},(_,n)=>String(n))],fixtureOwnerIds:['owner','other']};
 return {...base,...Object.fromEntries(flags[kind].map(k=>[k,true])),resets:0,retainedTables:13,...(kind==='purchase'?{distinctIncomingCopies:53,saleSnapshots:1,sourceSha256:dealRelease.added['20261008021000_vendor_purchase_v1.sql']}:{sourceSha256:dealRelease.added['20261008060000_vendor_negotiated_trade_v1.sql']})};
}
for(const kind of ['cost','purchase','trade']){
 test(kind+' requires its actual package, producer and passed result',()=>{
  assert.equal(validateDealRuntime(kind,proof(kind),packageHashes).actualAuthRpc,true);
  for(const patch of [{status:'failed'},{project:'product-trade-full-433-v4-20261007'},{productionWrites:1},{packageHashes:{}},{producerSha256:'missing'}])assert.throws(()=>validateDealRuntime(kind,{...proof(kind),...patch},packageHashes));
 });
}
for(const kind of ['purchase','trade'])test(kind+' rejects missing recovery, ownership, rollback or financial proof',()=>{
 for(const flag of flags[kind])for(const replacement of [false,undefined])assert.throws(()=>validateDealRuntime(kind,{...proof(kind),[flag]:replacement},packageHashes),flag);
 for(const patch of [{resets:1},{retainedTables:0},{sourceSha256:'b'.repeat(64)}])assert.throws(()=>validateDealRuntime(kind,{...proof(kind),...patch},packageHashes));
});
test('cost evidence cannot substitute a partial or dirty run',()=>{
 for(const patch of [{failure:{message:'failed'}},{releasePackage:false},{flagsRestoredOff:false},{priorFixturesUnchanged:false},{resetsAfterPopulation:1},{checks:[]},{fixtureOwnerIds:[]}])assert.throws(()=>validateDealRuntime('cost',{...proof('cost'),...patch},packageHashes));
});
test('unknown runtime proof type is rejected',()=>assert.throws(()=>validateDealRuntime('mock',proof('trade'),packageHashes)));

function cacheFixture(){
 const before=[{path:'npm/dependency.js',bytes:4,sha256:'a'.repeat(64)}],manifestSha256=createHash('sha256').update(JSON.stringify(before)).digest('hex');
 return [{status:'passed',sourceUnchanged:true,exactCopy:true,network:'none',certificateChanges:0,entries:1,manifestSha256},{sourceReadOnly:true,productionWrites:0,certificateChanges:0,source:'supabase_edge_runtime_cost-shadow-430-v7-20261007',project:'deal-shadow-432-v2-20261008',target:'supabase_edge_runtime_deal-shadow-432-v2-20261008',sourceQualifiedReceiptSha256:'810766a4b1ddc9301c88b5642a37ea59eabec46a61d5a5a21f3e2583ec4fb1bc'},before,structuredClone(before),{project:'deal-shadow-432-v2-20261008',dependencyCache:{manifestSha256}}];
}
test('qualified cache copy binds identical manifests without certificate changes',()=>assert.equal(validateDealDependencyCache(...cacheFixture()).entries,1));
test('unqualified, writable or certificate-modified cache evidence is rejected',()=>{
 for(const edit of [p=>p[0].sourceUnchanged=false,p=>p[0].certificateChanges=1,p=>p[0].network='host',p=>p[1].sourceReadOnly=false,p=>p[1].target='other',p=>p[1].sourceQualifiedReceiptSha256='b'.repeat(64)]){const p=cacheFixture();edit(p);assert.throws(()=>validateDealDependencyCache(...p));}
});
test('cache file or manifest substitution cannot qualify the shadow dependency',()=>{
 for(const edit of [p=>p[3][0].sha256='b'.repeat(64),p=>p[0].entries=2,p=>p[0].manifestSha256='c'.repeat(64),p=>p[4].dependencyCache.manifestSha256='d'.repeat(64)]){const p=cacheFixture();edit(p);assert.throws(()=>validateDealDependencyCache(...p));}
});

test('review binding accepts the actual browser and device artifact formats',()=>{
 for(const [kind,n,field]of [['webReview',8,'inspected'],['nativeReview',7,'images'],['searchReview',2,'images']]){const rows=Array.from({length:n},(_,i)=>({name:'screen-'+i+'.png',sha256:'a'.repeat(64)}));assert.deepEqual(reviewedDealImages(kind,{status:'reviewed',[field]:rows}),rows);}
});
test('review binding rejects missing, duplicated, unsafe or unreviewed images',()=>{
 const value=()=>({status:'reviewed',images:[{name:'one.png',sha256:'a'.repeat(64)},{name:'two.png',sha256:'b'.repeat(64)}]});
 for(const edit of [r=>r.status='pending',r=>delete r.images,r=>r.images.pop(),r=>r.images[1].name='one.png',r=>r.images[0].name='../other.png',r=>r.images[0].sha256='missing']){const r=value();edit(r);assert.throws(()=>reviewedDealImages('searchReview',r));}
 assert.throws(()=>reviewedDealImages('webReview',{status:'reviewed',images:Array.from({length:8},(_,i)=>({name:'screen-'+i+'.png',sha256:'a'.repeat(64)}))}));
});

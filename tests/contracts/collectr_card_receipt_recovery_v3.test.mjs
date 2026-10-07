import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPriorCollectionGroupsV3,verifyCollectionReadbackV2} from '../../apps/web/src/lib/import/collectionReadbackV2.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(change=()=>{}) {
 const source=[{'Product Name':'Synthetic card',Category:'Pokemon',Set:'Example','Card Number':'1',Variance:'Normal',Quantity:'1',Grade:'Ungraded','Card Condition':'Near Mint'}];
 const csv=[Object.keys(source[0]),Object.values(source[0])].map(r=>r.join(',')).join('\n');
 const selection={sourceIndices:[0],cardId:id(1),gvId:'synthetic',cardPrintingId:id(2)};
 const attempt={version:2,ownerUserId:id(3),requestId:id(4),csvText:csv,targets:[selection],fileName:'synthetic.csv'};
 const receipt={success:true,requestId:id(4),sourceSha256:createHash('sha256').update(csv).digest('hex'),sourceRows:1,reviewRows:0,importedCards:0,importedEntries:0,targets:[{...selection,instanceIds:[id(5)]}]};
 const data={document:source,groups:[{group_key:'a'.repeat(64),source_indices:[0],instance_ids:[id(5)],target:{...selection,desiredQuantity:1}}],copies:[{id:id(5),card_print_id:id(1),card_printing_id:id(6),is_graded:false,condition_label:'LP',acquisition_cost:9,notes:'Later owner edit',archived_at:'2026-10-01'}]};
 change(data,receipt,attempt);
 const client={from:()=>{let after=null;const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:(_,v)=>{after=v;return q;},single:async()=>({data:{source_rows:data.document},error:null}),then:resolve=>Promise.resolve({data:data.groups.filter(g=>after===null||g.group_key>after).sort((a,b)=>a.group_key.localeCompare(b.group_key)),error:null}).then(resolve)};return q;},rpc:async(name)=>{assert.equal(name,'get_collection_import_copies_v2');return{data:data.copies,error:null};}};
 return {data,client,attempt,receipt,verify:options=>verifyCollectionReadbackV2(client,attempt,receipt,options)};
}
test('V3 existing card receipt recovers after a printing edit without changing copies',async()=>{
 const f=fixture(),before=structuredClone(f.data);await f.verify({verifyCurrentMetadata:false});assert.deepEqual(f.data,before);
});
test('V2 still rejects a changed printing',async()=>assert.rejects(fixture().verify(),/could not be confirmed/));
test('newly imported cards still require their exact printing',async()=>assert.rejects(fixture((_,r)=>r.importedCards=1).verify({verifyCurrentMetadata:false}),/could not be confirmed/));
for(const[name,change]of[
 ['missing source document',d=>d.document=[]],['missing immutable target',d=>delete d.groups[0].target],
 ['changed original printing',d=>d.groups[0].target.cardPrintingId=id(6)],['changed original card',d=>d.groups[0].target.cardId=id(9)],
 ['changed original source indices',d=>d.groups[0].target.sourceIndices=[1]],['wrong quantity',d=>d.groups[0].target.desiredQuantity=2],
 ['wrong mapped copy',d=>d.groups[0].instance_ids=[id(9)]],['missing copy',d=>d.copies=[]],
 ['different current card',d=>d.copies[0].card_print_id=id(9)],['duplicate copy',d=>d.copies.push({...d.copies[0]})],
 ['graded copy',d=>d.copies[0].is_graded=true],['wrong review count',(_,r)=>r.reviewRows=1],
])test(`recovery rejects ${name}`,async()=>assert.rejects(fixture(change).verify({verifyCurrentMetadata:false}),/could not be confirmed/));

async function mixed() {
 const f=fixture((d,r,a)=>{
  const source={...d.document[0],'Product Name':'Second card','Card Number':'2'};
  d.document.push(source);a.csvText+='\n'+Object.values(source).join(',');
  r.sourceSha256=createHash('sha256').update(a.csvText).digest('hex');r.sourceRows=2;r.importedCards=1;r.importedEntries=1;
  const selection={sourceIndices:[1],cardId:id(11),gvId:'second',cardPrintingId:id(12)};
  a.targets.push(selection);r.targets.push({...selection,instanceIds:[id(15)]});
 });
 const priorGroups=await readPriorCollectionGroupsV3(f.client,f.attempt);
 f.data.groups.push({group_key:'b'.repeat(64),source_indices:[1],instance_ids:[id(15)],target:{...f.attempt.targets[1],desiredQuantity:1}});
 f.data.copies.push({id:id(15),card_print_id:id(11),card_printing_id:id(12),is_graded:false});
 return {...f,priorGroups,check:()=>f.verify({verifyCurrentMetadata:false,priorGroups})};
}
test('mixed increment confirms old owner-edited printing and exact fresh copy without mutations',async()=>{
 const f=await mixed(),before=structuredClone(f.data);
 assert.equal(f.priorGroups.groups.length,1);await f.check();assert.deepEqual(f.data,before);
});
test('mixed increment reproduces the original failure without pre-write mappings',async()=>{
 const f=await mixed();await assert.rejects(f.verify({verifyCurrentMetadata:false}),/could not be confirmed/);
});
test('mixed receipt recovery confirms already committed copies after a later printing edit',async()=>{
 const f=await mixed();f.data.copies[1].card_printing_id=id(19);
 const priorGroups=await readPriorCollectionGroupsV3(f.client,f.attempt);
 await f.verify({verifyCurrentMetadata:false,priorGroups});
});
test('V2 remains strict even with pre-write mappings',async()=>{
 const f=await mixed();await assert.rejects(f.verify({priorGroups:f.priorGroups}),/could not be confirmed/);
});
for(const[name,change]of[
 ['fresh printing mismatch',f=>f.data.copies[1].card_printing_id=id(19)],
 ['fresh immutable printing mismatch',f=>f.data.groups[1].target.cardPrintingId=id(19)],
 ['old immutable target changed',f=>f.data.groups[0].target.gvId='changed'],
 ['old group key changed',f=>f.data.groups[0].group_key='c'.repeat(64)],
 ['snapshot from another owner',f=>f.priorGroups.ownerUserId=id(90)],
 ['snapshot from another file',f=>f.priorGroups.sourceSha256='f'.repeat(64)],
 ['duplicate snapshot group',f=>f.priorGroups.groups.push(f.priorGroups.groups[0])],
 ['old current parent changed',f=>f.data.copies[0].card_print_id=id(90)],
 ['old current copy now graded',f=>f.data.copies[0].is_graded=true],
 ['missing old copy',f=>f.data.copies.shift()],
])test(`mixed increment rejects ${name}`,async()=>{const f=await mixed();change(f);await assert.rejects(f.check(),/could not be confirmed/);});
test('pre-write snapshot scopes reads to the owner and exact source, then paginates',async()=>{
 const f=fixture();const filters=[],cursors=[];
 const rows=Array.from({length:501},(_,n)=>({...f.data.groups[0],group_key:String(n).padStart(64,'0')}));
 const client={from(table){assert.equal(table,'vault_collection_import_groups_v2');let after=null;const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(k){assert.equal(k,'group_key');return q;},limit(n){assert.equal(n,500);return q;},gt(k,v){assert.equal(k,'group_key');after=v;cursors.push(v);return q;},then(resolve){return Promise.resolve({data:rows.filter(r=>!after||r.group_key>after).slice(0,500),error:null}).then(resolve);}};return q;}};
 const prior=await readPriorCollectionGroupsV3(client,f.attempt);
 assert.equal(prior.groups.length,501);assert.equal(cursors.length,2);
 assert.deepEqual(filters,Array(3).fill([['user_id',f.attempt.ownerUserId],['source_sha256',f.receipt.sourceSha256]]).flat());
});
test('failed pre-write snapshot rejects instead of assuming no old groups',async()=>{
 const f=fixture();f.client.from=()=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:resolve=>Promise.resolve({data:null,error:{message:'unavailable'}}).then(resolve)};return q;};
 await assert.rejects(readPriorCollectionGroupsV3(f.client,f.attempt));
});

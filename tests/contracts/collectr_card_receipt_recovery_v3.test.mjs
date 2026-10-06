import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyCollectionReadbackV2} from '../../apps/web/src/lib/import/collectionReadbackV2.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(change=()=>{}) {
 const source=[{'Product Name':'Synthetic card',Category:'Pokemon',Set:'Example','Card Number':'1',Variance:'Normal',Quantity:'1',Grade:'Ungraded','Card Condition':'Near Mint'}];
 const csv=[Object.keys(source[0]),Object.values(source[0])].map(r=>r.join(',')).join('\n');
 const selection={sourceIndices:[0],cardId:id(1),gvId:'synthetic',cardPrintingId:id(2)};
 const attempt={version:2,ownerUserId:id(3),requestId:id(4),csvText:csv,targets:[selection],fileName:'synthetic.csv'};
 const receipt={success:true,requestId:id(4),sourceSha256:createHash('sha256').update(csv).digest('hex'),sourceRows:1,reviewRows:0,importedCards:0,importedEntries:0,targets:[{...selection,instanceIds:[id(5)]}]};
 const data={document:source,groups:[{group_key:'a'.repeat(64),source_indices:[0],instance_ids:[id(5)],target:{...selection,desiredQuantity:1}}],copies:[{id:id(5),card_print_id:id(1),card_printing_id:id(6),is_graded:false,condition_label:'LP',acquisition_cost:9,notes:'Later owner edit',archived_at:'2026-10-01'}]};
 change(data,receipt,attempt);
 const client={from:()=>{let after=null;const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,gt:(_,v)=>{after=v;return q;},single:async()=>({data:{source_rows:data.document},error:null}),then:resolve=>Promise.resolve({data:data.groups.filter(g=>after===null||g.group_key>after),error:null}).then(resolve)};return q;},rpc:async(name)=>{assert.equal(name,'get_collection_import_copies_v2');return{data:data.copies,error:null};}};
 return {data,verify:options=>verifyCollectionReadbackV2(client,attempt,receipt,options)};
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parseBatchCommit} from '../../apps/web/src/lib/stores/batchCommitInput.ts';
import {freezeBatchSubmission,assertSubmittedItemsRetained} from '../../apps/web/src/lib/stores/batchSubmission.ts';
import {newIntakeBatch,pairAssets,applyBatchDefaults,commitSelection} from '../../apps/web/src/lib/stores/batchIntake.ts';
const payload=()=>({version:1,batch_id:randomUUID(),item_id:randomUUID(),card_id:randomUUID(),printing_id:randomUUID(),condition:'NM',intent:'sell',amount:'12.5',currency:'USD',sections:[],location:'Box B',list:true,front_sha256:'a'.repeat(64),back_sha256:null});
test('normalizes equivalent amounts and section ordering without caller-selected owners or URLs',()=>{
 const a=payload(),x=randomUUID(),y=randomUUID();a.sections=[y,x,x];const b=parseBatchCommit(a);
 assert.equal(b.amount,'12.50');assert.deepEqual(b.sections,[x,y].sort());assert.deepEqual(parseBatchCommit(b),b);
 for(const extra of [{owner_id:randomUUID()},{image_url:'https://example.invalid/private.jpg'},{instance_id:randomUUID()}])assert.throws(()=>parseBatchCommit({...a,...extra}));
});
test('malformed settings, references, hashes and unreviewed sale options fail closed',()=>{
 for(const patch of [{version:2},{list:'true'},{intent:'showcase'},{condition:null},{amount:'1e2'},{amount:'-1'},{amount:'NaN'},{amount:'0'},{amount:'1.001'},{amount:'100000000'},{currency:'$'},{sections:null},{front_sha256:'abc'},{back_sha256:''},{item_id:'not-an-id'},{location:'x'.repeat(121)},{intent:'hold'}])assert.throws(()=>parseBatchCommit({...payload(),...patch}),JSON.stringify(patch));
 assert.equal(parseBatchCommit({...payload(),intent:'hold',list:false,amount:''}).amount,'');
});
test('freezes media bytes and exact settings before network submission; retry ignores later listing choice',async()=>{
 const batch=newIntakeBatch(randomUUID());batch.assets=[{id:'front',name:'scan.jpg',hash:'original',original:new Blob(['original']),preview:new Blob(['derivative']),error:null}];
 batch.items=pairAssets(batch.assets,'front',batch.defaults);const item=batch.items[0];
 Object.assign(item,{confirmed:true,card:{id:randomUUID(),name:'Card',printings:[{id:randomUUID(),printing_gv_id:'GV-PRINT'}]}});item.printing=item.card.printings[0].id;
 const snapshot=await freezeBatchSubmission(batch,item,false);item.submission=snapshot;
 assert.equal(await freezeBatchSubmission(batch,item,true),snapshot);assert.equal(snapshot.request.list,false);
 assert.notEqual(snapshot.request.front_sha256,'original');assert.equal(await snapshot.front.text(),'derivative');
 batch.defaults.condition='LP';assert.equal(applyBatchDefaults(batch,true).items[0].settings.condition,'NM');
 assert.equal(commitSelection(batch,true)[0],item);
 assertSubmittedItemsRetained(batch,{...batch,items:[{...item,error:'timeout',picked:false}]});
 assert.throws(()=>assertSubmittedItemsRetained(batch,{...batch,items:[]}));
 assert.throws(()=>assertSubmittedItemsRetained(batch,{...batch,items:[{...item,settings:{...item.settings,amount:'999'}}]}));
});

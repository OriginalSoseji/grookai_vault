import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {exportBatchBackup,importBatchBackup,BACKUP_LIMIT} from '../../apps/web/src/lib/stores/batchBackup.ts';
import {newIntakeBatch,pairAssets} from '../../apps/web/src/lib/stores/batchIntake.ts';
import {freezeBatchSubmission} from '../../apps/web/src/lib/stores/batchSubmission.ts';
const environment='http://127.0.0.1:26421';
async function fixture(){
 const batch=newIntakeBatch(randomUUID()),bytes=new Blob([new Uint8Array([255,216,255,1,2,3])],{type:'image/jpeg'});
 batch.assets=[{id:randomUUID(),name:'scan.jpg',hash:'a'.repeat(64),original:bytes,preview:bytes,error:null}];
 batch.items=pairAssets(batch.assets,'front',batch.defaults);const item=batch.items[0];
 item.card={id:randomUUID(),gv_id:'GV-PK-TEST-001',name:'Synthetic card',number:'001',set_code:'TEST',image:'https://untrusted.invalid/track',printings:[{id:randomUUID(),printing_gv_id:'GV-PK-TEST-001-NORMAL',finish_label:'Normal'}]};
 item.printing=item.card.printings[0].id;item.confirmed=true;item.submission=await freezeBatchSubmission(batch,item,false);return batch;
}
async function rewrite(file,mutate){const prefix=new Uint8Array(await file.slice(0,13).arrayBuffer()),length=new DataView(prefix.buffer).getUint32(9),header=JSON.parse(await file.slice(13,13+length).text());mutate(header);const next=new TextEncoder().encode(JSON.stringify(header));new DataView(prefix.buffer).setUint32(9,next.length);return new Blob([prefix,next,file.slice(13+length)]);}
test('portable pending backup preserves physical IDs, immutable settings and exact bytes; restore never trusts completion',async()=>{
 const b=await fixture();b.items[0].receipt={id:randomUUID(),gvvi:'GVVI-COMPLETE'};
 const backup=await exportBatchBackup(b,environment),restored=await importBatchBackup(backup,b.storeId,environment);
 assert.equal(restored.id,b.id);assert.equal(restored.items[0].id,b.items[0].id);assert.deepEqual(restored.items[0].submission.request,b.items[0].submission.request);
 assert.deepEqual(await restored.items[0].submission.front.arrayBuffer(),await b.items[0].submission.front.arrayBuffer());assert.equal(restored.items[0].receipt,null);assert.equal(restored.items[0].picked,false);assert.equal(restored.items[0].card.image,null);assert.equal(restored.revision,0);
});
test('drafts, paired backs and incomplete prices survive without automatic confirmation or selection',async()=>{
 const b=await fixture();delete b.items[0].submission;b.items[0].settings.amount='unfinished';b.items[0].back=b.assets[0].id;b.items[0].requiresBack=true;
 const r=await importBatchBackup(await exportBatchBackup(b,environment),b.storeId,environment);assert.equal(r.items[0].settings.amount,'unfinished');assert.equal(r.items[0].back,b.assets[0].id);assert.equal(r.items[0].confirmed,false);assert.equal(r.items[0].picked,false);
});
test('wrong store/environment and unsupported versions fail before restoration',async()=>{
 const b=await fixture(),f=await exportBatchBackup(b,environment);
 await assert.rejects(importBatchBackup(f,randomUUID(),environment),/another store/);await assert.rejects(importBatchBackup(f,b.storeId,'https://other.invalid'),/another store/);
 await assert.rejects(importBatchBackup(await rewrite(f,h=>h.version=2),b.storeId,environment));
});
test('truncation, appended bytes, modified photos and oversized frames fail closed',async()=>{
 const b=await fixture(),f=await exportBatchBackup(b,environment);
 for(const bad of [f.slice(0,f.size-1),new Blob([f,'extra']),new Blob(['invalid'])])await assert.rejects(importBatchBackup(bad,b.storeId,environment));
 const bytes=new Uint8Array(await f.arrayBuffer());bytes[bytes.length-1]^=1;await assert.rejects(importBatchBackup(new Blob([bytes]),b.storeId,environment));
 await assert.rejects(importBatchBackup({size:BACKUP_LIMIT+1},b.storeId,environment));
 await assert.rejects(importBatchBackup(await rewrite(f,h=>h.media[0].size=21*1024*1024),b.storeId,environment));
});
test('tampered submission identity/details, duplicate items and invalid media references cannot resume',async()=>{
 const b=await fixture(),f=await exportBatchBackup(b,environment);
 for(const change of [h=>h.batch.items[0].submission.request.item_id=randomUUID(),h=>h.batch.items[0].settings.condition='HP',h=>h.batch.items.push(h.batch.items[0]),h=>h.batch.items[0].front=randomUUID(),h=>h.batch.assets[0].preview=999,h=>h.media[0].type='image/svg+xml',h=>h.batch.items[0].submission.request.front_sha256='0'.repeat(64)])await assert.rejects(importBatchBackup(await rewrite(f,change),b.storeId,environment));
});
test('restoring separate physical copies with identical media never merges identities',async()=>{
 const b=await fixture(),other={...b.items[0],id:randomUUID(),submission:undefined};other.submission=await freezeBatchSubmission(b,other,false);b.items.push(other);
 const r=await importBatchBackup(await exportBatchBackup(b,environment),b.storeId,environment);assert.equal(r.items.length,2);assert.notEqual(r.items[0].id,r.items[1].id);assert.equal(r.items[0].submission.request.front_sha256,r.items[1].submission.request.front_sha256);
});

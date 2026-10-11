import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {test} from 'node:test';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
const file=new URL('../../apps/web/src/lib/import/collectionImportArchive.ts',import.meta.url);
const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},structuredClone};vm.runInNewContext(output,context);
const {collectionImportArchive:archive,collectionImportArchiveJson:download,readCollectionImportArchive:read}=context.exports;
const corpus=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collection_import_archive_cases.json',import.meta.url)));
for(const item of corpus.cases)test('shared native/web corpus: '+item.name,()=>{
 const run=()=>archive(corpus.ownerId,corpus.sourceSha256,item.document,item.mappings);
 if(item.valid){const saved=JSON.parse(download(run()));assert.deepEqual(saved.sourceRows,item.document.source_rows);}
 else assert.throws(run);
});
const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',sha='a'.repeat(64);
const id=n=>`20000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
function fixture(){return {doc:{user_id:owner,source_sha256:sha,created_at:'2026-10-08T01:00:00.000Z',source_rows:[
  {'Product Name':'Card, "A"','Cost':'0','Unknown field':'  newline\n=literal  '},
  {'Product Name':'Box','Cost':'12.30','Unknown field':'CAD'},
  {'Product Name':'Slab','Cost':'99','Unknown field':'unverified grade'}]},groups:[
  {user_id:owner,source_sha256:sha,group_key:'1'.repeat(64),source_indices:[0],instance_ids:[id(1),id(2)],added_count:1,target:{cardId:id(3),cardPrintingId:id(4),sourceIndices:[0],desiredQuantity:2,acquisitionCost:0}},
  {user_id:owner,source_sha256:sha,group_key:'2'.repeat(64),source_indices:[1],instance_ids:[id(5)],added_count:1,target:{objectKind:'sealed',sealedVariantId:id(6),sourceIndices:[1],desiredQuantity:1,acquisitionCurrency:'CAD'}}]};}
test('mixed card/sealed archive preserves source and separates historical additions/reuse',()=>{
 const {doc,groups}=fixture(),a=archive(owner,sha,doc,groups);
 assert.deepEqual(JSON.parse(JSON.stringify(a.counts)),{sourceRows:3,reconciledRows:2,reviewRows:1,cardCopies:2,sealedCopies:1,addedCopies:2,reusedCopies:1});
 const saved=JSON.parse(download(a));assert.deepEqual(saved.sourceRows,doc.source_rows);assert.deepEqual(saved.reviewIndices,[2]);
 assert.equal(saved.mappings[1].target.acquisitionCurrency,'CAD');assert.match(saved.description,/not a current inventory export/);
 groups[0].target.acquisitionCost=99;assert.equal(a.groups[0].target.acquisitionCost,0);
});
test('all-review document remains a complete source archive with zero owned claims',()=>{
 const {doc}=fixture(),a=archive(owner,sha,doc,[]);assert.equal(a.counts.reviewRows,3);assert.equal(a.counts.cardCopies,0);
});
for(const [name,mutate] of [
 ['foreign document',f=>f.doc.user_id=other],['foreign group',f=>f.groups[0].user_id=other],
 ['wrong source',f=>f.groups[1].source_sha256='b'.repeat(64)],
 ['duplicate row mapping',f=>{f.groups[1].source_indices=[0];f.groups[1].target.sourceIndices=[0];}],
 ['duplicate copy',f=>f.groups[1].instance_ids=[id(1)]],
 ['duplicate group',f=>f.groups[1].group_key=f.groups[0].group_key],
 ['out of range source',f=>{f.groups[0].source_indices=[3];f.groups[0].target.sourceIndices=[3];}],
 ['negative index',f=>{f.groups[0].source_indices=[-1];f.groups[0].target.sourceIndices=[-1];}],
 ['fractional index',f=>{f.groups[0].source_indices=[0.5];f.groups[0].target.sourceIndices=[0.5];}],
 ['target/source disagreement',f=>f.groups[0].target.sourceIndices=[2]],
 ['quantity mismatch',f=>f.groups[0].target.desiredQuantity=3],
 ['too many added copies',f=>f.groups[0].added_count=3],
 ['missing copy identities',f=>f.groups[0].instance_ids=[]],
 ['unsupported object kind',f=>f.groups[0].target.objectKind='fabricated'],
 ['sealed identity missing',f=>delete f.groups[1].target.sealedVariantId],
 ['lossy source value',f=>f.doc.source_rows[0].Cost=0],
 ['missing source field',f=>delete f.doc.source_rows[1]['Unknown field']],
 ['empty source',f=>f.doc.source_rows=[]],
 ['invalid timestamp',f=>f.doc.created_at='yesterday'],
])test('rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>archive(owner,sha,f.doc,f.groups));});
test('read continues after short capped pages through the empty cursor page',async()=>{
 const f=fixture(),calls=[];const result=await read(owner,sha,{isCurrentOwner:()=>true,readDocument:async()=>f.doc,readGroupPage:async after=>{
 calls.push(after);return after===null?[f.groups[0]]:after===f.groups[0].group_key?[f.groups[1]]:[];
 }});assert.equal(calls.length,3);assert.equal(result.counts.reviewRows,1);
});
test('page error cannot produce partial successful totals',async()=>{
 const f=fixture();await assert.rejects(read(owner,sha,{isCurrentOwner:()=>true,readDocument:async()=>f.doc,readGroupPage:async after=>{if(after)throw Error('read failed');return [f.groups[0]];}}),/read failed/);
});
test('repeated cursor fails without looping',async()=>{
 const f=fixture();let calls=0;await assert.rejects(read(owner,sha,{isCurrentOwner:()=>true,readDocument:async()=>f.doc,readGroupPage:async()=>{calls++;return [f.groups[0]];}}));assert.equal(calls,2);
});
test('owner replacement while document is pending blocks all group reads',async()=>{
 const f=fixture();let current=true,pages=0;await assert.rejects(read(owner,sha,{isCurrentOwner:()=>current,readDocument:async()=>{current=false;return f.doc;},readGroupPage:async()=>{pages++;return [];}}),/account changed/);assert.equal(pages,0);
});
test('owner replacement during a group read never returns private source',async()=>{
 const f=fixture();let current=true;await assert.rejects(read(owner,sha,{isCurrentOwner:()=>current,readDocument:async()=>f.doc,readGroupPage:async()=>{current=false;return f.groups;}}),/account changed/);
});
test('invalid source fails before paging',async()=>{
 const f=fixture();f.doc.user_id=other;let calls=0;await assert.rejects(read(owner,sha,{isCurrentOwner:()=>true,readDocument:async()=>f.doc,readGroupPage:async()=>{calls++;return [];}}));assert.equal(calls,0);
});

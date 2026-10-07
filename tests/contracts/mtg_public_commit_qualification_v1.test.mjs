import assert from 'node:assert/strict';import test from 'node:test';
import {assertMtgCommitQualificationTargetV1,assertMtgMappingAllocationV1} from '../../scripts/audits/mtg_public_commit_qualification_v1.mjs';
const before={name:'public.external_mappings_id_seq',last_value:'9007199254740993',is_called:true};
const allocated=[{id:'9007199254740994',source:'scryfall',external_id:'a'},{id:'9007199254740995',source:'scryfall',external_id:'b'}];
const after={...before,last_value:'9007199254740995'};
test('mapping allocation compares bigint IDs exactly and supports an uncalled sequence',()=>{
 assertMtgMappingAllocationV1(before,after,allocated);
 assertMtgMappingAllocationV1({...before,last_value:'1',is_called:false},{...after,last_value:'2'},allocated.map((r,i)=>({...r,id:String(i+1)})));
});
for(const [label,change]of [
 ['gap',r=>r[1].id='9007199254740996'],['duplicate ID',r=>r[1].id=r[0].id],
 ['duplicate owner',r=>r[1].external_id='a'],['zero ID',r=>r[0].id='0'],
])test('rejects '+label,()=>{const rows=structuredClone(allocated);change(rows);assert.throws(()=>assertMtgMappingAllocationV1(before,after,rows));});
test('rejects excess sequence advances, empty allocation and sequence replacement',()=>{
 assert.throws(()=>assertMtgMappingAllocationV1(before,{...after,last_value:'9007199254740996'},allocated));
 assert.throws(()=>assertMtgMappingAllocationV1(before,after,[]));
 assert.throws(()=>assertMtgMappingAllocationV1(before,{...after,name:'another'},allocated));
});
for(const params of [{host:'aws-1-us-east-2.pooler.supabase.com'},{database:'postgres'},{database:'mtg_public_commit_20261007'},{port:54330},{user:'supabase_admin'}])test('rejects an unqualified endpoint '+JSON.stringify(params),async()=>{
 let called=false;await assert.rejects(()=>assertMtgCommitQualificationTargetV1({connectionParameters:{host:'127.0.0.1',port:55000,database:'mtg_public_commit_v2_20261007',user:'postgres',...params},query:async()=>{called=true;}}));assert.equal(called,false);
});
for(const changed of [{db:'postgres'},{address:'10.248.38.2'},{workers:'8'},{isolation:'read committed'},{migrations:428}])test('rejects wrong live clone state '+JSON.stringify(changed),async()=>{
 const client={connectionParameters:{host:'127.0.0.1',port:55000,database:'mtg_public_commit_v2_20261007',user:'postgres'},query:async()=>({rows:[{db:'mtg_public_commit_v2_20261007',address:'10.248.37.2',workers:'0',isolation:'serializable',migrations:429,...changed}]})};await assert.rejects(()=>assertMtgCommitQualificationTargetV1(client));
});

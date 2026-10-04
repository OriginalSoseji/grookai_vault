import test from 'node:test';
import assert from 'node:assert/strict';
import {assertJungleLocalTarget} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';

const local={host:'127.0.0.1',port:64740,database:'postgres',user:'postgres'};
for(const [key,value] of [['host','db.production.invalid'],['host','localhost'],['port',5432],['database','other'],['user','service_role']]){
 test(`reject ${key}=${value} before issuing SQL`,async()=>{
  let queries=0;
  await assert.rejects(()=>assertJungleLocalTarget({connectionParameters:{...local,[key]:value},query:async()=>{queries++;throw new Error('unexpected SQL');}}));
  assert.equal(queries,0);
 });
}
for(const [name,row] of [
 ['wrong lab network',{address:'10.248.2.3',workers:'0',migrations:413}],
 ['enabled background workers',{address:'10.248.3.3',workers:'8',migrations:413}],
 ['old schema',{address:'10.248.3.3',workers:'0',migrations:412}],
 ['new unqualified schema',{address:'10.248.3.3',workers:'0',migrations:414}],
]){
 test(`reject ${name}`,async()=>{
  await assert.rejects(()=>assertJungleLocalTarget({connectionParameters:local,query:async()=>({rows:[row]})}));
 });
}
test('accept the exact isolated local target',async()=>{
 await assertJungleLocalTarget({connectionParameters:local,query:async()=>({rows:[{address:'10.248.3.3',workers:'0',migrations:413}]})});
});

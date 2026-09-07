import test from 'node:test';
import assert from 'node:assert/strict';
import {imageHash,pokemonSealedObjectV1,storageObjectMissingV1,storePokemonSealedObjectV1} from '../../backend/pricing/pokemon_sealed_storage_v1.mjs';
const bytes=Buffer.alloc(2500,7);
const row={status:'verified',local_filename:`${imageHash(bytes)}.jpg`,image:{valid_image:true,placeholder_suspected:false,
  sha256:imageHash(bytes),content_type:'image/jpeg',width:100,height:100,size_bytes:2500}};
const object=pokemonSealedObjectV1(row);
test('namespaced content-addressed object, no path injection',()=>{
  assert.match(object.path,/^sealed\/pokemon\/sha256\//);
  assert.throws(()=>pokemonSealedObjectV1({...row,local_filename:'../secret'}));
});
test('authorization and transport errors never mean absent',()=>{
  assert.equal(storageObjectMissingV1({statusCode:401,message:'Object not found'}),false);
  assert.equal(storageObjectMissingV1({statusCode:400,message:'Invalid token'}),false);
  assert.equal(storageObjectMissingV1({statusCode:400,message:'Object not found'}),true);
});
test('upload absent only, upsert disabled, verify exact bytes',async()=>{
  let stored=false;const events=[];
  const storage={from:()=>({download:async()=>stored?{data:new Blob([bytes])}:{error:{statusCode:404,message:'Object not found'}},
    upload:async(p,b,o)=>{assert.equal(p,object.path);assert.equal(o.upsert,false);stored=true;return{};}})};
  const result=await storePokemonSealedObjectV1({storage,object,bytes,onJournal:async r=>events.push(r.event)});
  assert.equal(result.created_this_attempt,true);assert.deepEqual(events,['absent','created','verified']);
});
test('resume reuses exact existing bytes, never uploads',async()=>{
  const storage={from:()=>({download:async()=>({data:new Blob([bytes])}),upload:()=>assert.fail('Existing object overwritten')})};
  assert.equal((await storePokemonSealedObjectV1({storage,object,bytes,onJournal:async()=>{}})).created_this_attempt,false);
});
test('legacy SDK structured NoSuchKey response is recognized, not arbitrary HTTP 400',async()=>{
  let stored=false;
  const storage={from:()=>({download:async()=>stored?{data:new Blob([bytes])}:{error:{originalError:new Response(
    JSON.stringify({statusCode:'404',code:'NoSuchKey',message:'Object not found'}),{status:400})}},
    upload:async()=>{stored=true;return{};}})};
  assert.equal((await storePokemonSealedObjectV1({storage,object,bytes,onJournal:async()=>{}})).created_this_attempt,true);
});
test('mismatched collision and unauthorized preflight stop without writes',async()=>{
  for(const result of [{data:new Blob([Buffer.alloc(2500,8)])},{error:{statusCode:401,message:'Unauthorized'}}]){
    const storage={from:()=>({download:async()=>result,upload:()=>assert.fail('Unauthorized write'),remove:()=>assert.fail('Unauthorized deletion')})};
    await assert.rejects(()=>storePokemonSealedObjectV1({storage,object,bytes,onJournal:async()=>{}}));
  }
});

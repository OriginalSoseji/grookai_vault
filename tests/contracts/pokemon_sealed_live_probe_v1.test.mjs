import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyPokemonSealedImageServingV1 as probe} from '../../backend/pricing/pokemon_sealed_live_probe_v1.mjs';
const bytes=Buffer.from('image-fixture'),sha=createHash('sha256').update(bytes).digest('hex');
const objectPath=`sealed/pokemon/sha256/${sha.slice(0,2)}/${sha}.jpg`;
const row={variant_id:'fixture',image_storage_bucket:'user-card-images',image_object_path:objectPath,image_bytes:bytes.length,image_content_sha256:sha};
process.env.SUPABASE_URL='https://example.supabase.co';
const caller={functions:{invoke:async(_,request)=>request.body.object_path.startsWith('sealed/mtg/')?{error:{context:{status:400}}}:
  {data:{signed_url:`https://example.supabase.co/storage/v1/object/sign/user-card-images/${objectPath}?token=fixture`}}}};
test('positive authenticated signer and bytes are required',async()=>assert.equal((await probe(caller,[row],async()=>new Response(bytes))).passed,true));
test('missing and mismatched Storage bytes fail',async()=>{
  await assert.rejects(()=>probe(caller,[row],async()=>new Response('missing',{status:404})));
  await assert.rejects(()=>probe(caller,[row],async()=>new Response(Buffer.alloc(bytes.length))));
});
test('bad signer and foreign signed origin fail',async()=>{
  await assert.rejects(()=>probe({functions:{invoke:async()=>({error:{}})}},[row]));
  await assert.rejects(()=>probe({functions:{invoke:async()=>({data:{signed_url:'https://evil.example/image.jpg'}})}},[row]));
});

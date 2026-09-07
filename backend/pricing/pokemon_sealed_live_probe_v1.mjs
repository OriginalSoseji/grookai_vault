import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

// Existing non-founder store-review identity only. Never create an account or
// change its password/profile, and revoke only the newly created test session.
export const POKEMON_SEALED_PROBE_USER_ID='ee6e4992-2485-455d-af86-a8cf96902c8c';
export async function withPokemonSealedProbeSessionV1(backend,action){
  const {data:found,error:lookupError}=await backend.auth.admin.getUserById(POKEMON_SEALED_PROBE_USER_ID);
  assert.ok(!lookupError&&found?.user?.id===POKEMON_SEALED_PROBE_USER_ID,'Store-review identity unavailable');
  assert.equal(found.user.user_metadata?.display_name,'App Review');
  assert.ok(found.user.email?.endsWith('@grookaivault.com'));
  assert.ok(!found.user.app_metadata?.role,'Probe identity must not have an elevated app role');
  const {data:link,error:linkError}=await backend.auth.admin.generateLink({type:'magiclink',email:found.user.email});
  assert.ok(!linkError&&link?.properties?.hashed_token,'Could not create bounded review session');
  const caller=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try{
    const {data,error}=await caller.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'email'});
    assert.ok(!error&&data?.user?.id===POKEMON_SEALED_PROBE_USER_ID,'Review session identity mismatch');
    return await action(caller,data.session);
  }finally{await caller.auth.signOut({scope:'local'});}
}

export async function verifyPokemonSealedImageServingV1(caller,rows,fetcher=fetch){
  assert.ok(rows.length>0,'No image probe candidates');
  const verified=[];
  for(const row of rows.slice(0,3)){
    assert.equal(row.image_storage_bucket,'user-card-images');
    assert.match(row.image_object_path,/^sealed\/pokemon\/sha256\//);
    const {data,error}=await caller.functions.invoke('pokemon-sealed-sign-image-v1',{
      body:{storage_bucket:row.image_storage_bucket,object_path:row.image_object_path}});
    assert.ok(!error&&data?.signed_url,'Authenticated image signer failed');
    const url=new URL(data.signed_url);
    assert.equal(url.origin,new URL(process.env.SUPABASE_URL).origin);
    assert.ok(decodeURIComponent(url.pathname).endsWith(`/user-card-images/${row.image_object_path}`));
    const response=await fetcher(url,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,'Signed image unavailable');
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length,Number(row.image_bytes),'Image size mismatch');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),row.image_content_sha256,'Image hash mismatch');
    verified.push({variant_id:row.variant_id,content_sha256:row.image_content_sha256,bytes:bytes.length});
  }
  const denied=await caller.functions.invoke('pokemon-sealed-sign-image-v1',{
    body:{storage_bucket:'user-card-images',object_path:'sealed/mtg/sha256/00/'+'0'.repeat(64)+'.jpg'}});
  assert.equal(denied.error?.context?.status,400,'Cross-game image request was not denied');
  return {passed:true,authenticated_signer:true,exact_byte_readback:true,cross_game_denied:true,verified};
}

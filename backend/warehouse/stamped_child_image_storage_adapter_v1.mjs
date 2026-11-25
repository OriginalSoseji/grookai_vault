import assert from 'node:assert/strict';
import {PROJECT,BUCKET,stampedChildImageManifestV1 as manifest,assertStampedChildImagePlanV1,assertStampedImageOriginalV1} from './stamped_child_image_intake_v1.mjs';
import {assertStampedIntakeAuthorityV1} from './stamped_child_image_intake_execution_v1.mjs';

// The existing backend SDK supplies authentication. No JWT or user identity is manufactured here.
export function createStampedChildImageStorageAdapterV1(client,{plan,context,revalidate}) {
  assertStampedChildImagePlanV1(plan);assert.ok(typeof revalidate==='function');
  const endpoint=new URL(String(client.supabaseUrl));
  if(context.environment==='owned_local') {
    assert.equal(endpoint.protocol,'http:');assert.equal(endpoint.hostname,'127.0.0.1');assert.notEqual(endpoint.port,'');
  }else{
    assert.equal(context.environment,'production');assert.equal(endpoint.origin,`https://${PROJECT}.supabase.co`);
    assert.equal(endpoint.pathname,'/');assert.equal(endpoint.search,'');assert.equal(endpoint.hash,'');
  }
  const byPath=new Map(plan.rows.map(row=>[row.keys.storagePath,manifest.targets.find(t=>t.printingId===row.candidate.reference_hints_payload.printing_reference)]));
  const target=(bucket,key)=>{assert.equal(bucket,BUCKET);const t=byPath.get(key);assert.ok(t,'Object is outside the exact33 source scope');return t;};
  return {
    projectRef:context.environment==='owned_local'?'owned_local':PROJECT,
    async upload(bucket,key,bytes,options){
      assert.equal(context.mode,'stage_raw','Only the named raw-object attempt can upload');
      assertStampedIntakeAuthorityV1({...context,plan,now:new Date().toISOString()});
      assert.equal(await revalidate(),context.codeFingerprint);
      const t=target(bucket,key);assertStampedImageOriginalV1(t,bytes);
      assert.deepEqual(options,{contentType:'image/jpeg',upsert:false});
      const {data,error}=await client.storage.from(BUCKET).upload(key,bytes,options);
      if(error)throw new Error('Raw image upload failed: '+String(error.message).slice(0,500));
      assert.equal(data?.path,key);return {path:data.path};
    },
    async download(bucket,key){
      const t=target(bucket,key);const {data,error}=await client.storage.from(BUCKET).download(key);
      if(error)throw new Error('Raw image readback failed: '+String(error.message).slice(0,500));
      assert.equal(data?.size,t.bytes,'Stored original byte length changed');
      const bytes=Buffer.from(await data.arrayBuffer());assertStampedImageOriginalV1(t,bytes);return bytes;
    },
  };
}

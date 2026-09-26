import test from 'node:test';
import assert from 'node:assert/strict';
import {productionStoreTarget,storeBatchTarget,STORE_PRODUCTION_DATABASE,STORE_PRODUCTION_ORIGIN} from '../../apps/web/src/lib/stores/storeProductionTarget.mjs';
const valid={GROOKAI_STORE_PRODUCTION_V1:'true',GROOKAI_COLLECTOR_RELEASE_V1:'true',VERCEL_ENV:'production',VERCEL_PROJECT_ID:'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum',SUPABASE_URL:STORE_PRODUCTION_DATABASE,NEXT_PUBLIC_SUPABASE_URL:STORE_PRODUCTION_DATABASE,NEXT_PUBLIC_SITE_URL:STORE_PRODUCTION_ORIGIN};
test('production intake requires every reviewed server binding',()=>{
  assert.equal(productionStoreTarget(valid),true);
  assert.equal(storeBatchTarget('commit',valid),true);assert.equal(storeBatchTarget('cancel',valid),true);
  for(const key of Object.keys(valid)){
    const env={...valid};delete env[key];assert.equal(productionStoreTarget(env),false,key);
    assert.equal(storeBatchTarget('commit',env),false,key);
    assert.equal(productionStoreTarget({...valid,[key]:'forged'}),false,key);
  }
});
test('preview origins, mixed databases and client flags never activate production',()=>{
  for(const key of ['NEXT_PUBLIC_VENDOR_PILOT','NEXT_PUBLIC_VENDOR_DEVICE_QA','NEXT_PUBLIC_COLLECTOR_STAGING','NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB','NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING','NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY','NEXT_PUBLIC_STOREFRONT_LOCAL_TEST','NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST'])assert.equal(productionStoreTarget({...valid,[key]:'true'}),false,key);
  assert.equal(productionStoreTarget({...valid,SITE_URL:'https://grookai-vendor-preview.vercel.app'}),false);
  assert.equal(productionStoreTarget({NEXT_PUBLIC_STORE_PRODUCTION_V1:'true',SUPABASE_URL:STORE_PRODUCTION_DATABASE}),false);
});
test('legacy isolated targets keep their existing operation boundary',()=>{
  for(const url of ['http://127.0.0.1:27621','https://hrtbjchobencariqclab.supabase.co'])assert.equal(storeBatchTarget('cancel',{SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_URL:url}),true);
  const env={SUPABASE_URL:'http://127.0.0.1:26421',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:26421'};
  assert.equal(storeBatchTarget('commit',env),true);assert.equal(storeBatchTarget('cancel',env),false);
  assert.equal(storeBatchTarget('publish',valid),false);
});

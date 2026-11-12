import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {assertCollectorReleaseEnvironment} from '../../apps/web/src/lib/collectorRelease.mjs';
const staging=new URL('../../apps/web/src/lib/collectorStaging.mjs',import.meta.url).href;
function probe(url,extra={}){
 const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('NEXT_PUBLIC_'))delete env[key];
 Object.assign(env,{NEXT_PUBLIC_VENDOR_PRICING_LOCAL_TEST:'true',...extra});
 return spawnSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify(staging)});m.assertCollectorStagingTarget(${JSON.stringify(url)});`],{env,encoding:'utf8',windowsHide:true}).status;
}
test('pricing UI fixtures accept only their exact separate local database',()=>{
 assert.equal(probe('http://127.0.0.1:62341'),0);
 for(const url of ['https://ycdxbpibncqcchqiihfz.supabase.co','http://127.0.0.1:61841','http://localhost:62341','http://127.0.0.1:62341/extra','http://127.0.0.1:62341/?escape=1'])assert.notEqual(probe(url),0);
 for(const flag of ['NEXT_PUBLIC_SQUARE_LOCAL_TEST','NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB','NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING','NEXT_PUBLIC_SALES_CART_LOCAL_TEST'])assert.notEqual(probe('http://127.0.0.1:62341',{[flag]:'true'}),0);
});
test('pricing fixture mode is forbidden in production release configuration',()=>{
 assert.throws(()=>assertCollectorReleaseEnvironment({GROOKAI_COLLECTOR_RELEASE_V1:'true',VERCEL_ENV:'production',VERCEL_PROJECT_ID:'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',NEXT_PUBLIC_VENDOR_PRICING_LOCAL_TEST:'true'}),/test modes/);
});

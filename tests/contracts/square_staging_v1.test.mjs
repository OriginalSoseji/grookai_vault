import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {assertCollectorReleaseEnvironment} from '../../apps/web/src/lib/collectorRelease.mjs';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript');
function staging(env){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../../apps/web/src/lib/collectorStaging.mjs',import.meta.url),'utf8'),
 {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env},URL,Error,require:()=>({vendorPilot:false,VENDOR_PILOT_DATABASE:'https://unused.invalid'})});return exports;}
test('Square local mode accepts only its exact lab and rejects mixed environments',()=>{
 const mode=staging({NEXT_PUBLIC_SQUARE_LOCAL_TEST:'true'});assert.doesNotThrow(()=>mode.assertCollectorStagingTarget('http://127.0.0.1:61841'));
 for(const value of['https://ycdxbpibncqcchqiihfz.supabase.co','http://127.0.0.1:54321','http://localhost:61841','http://127.0.0.1:61841/rest',
   'http://user@127.0.0.1:61841','http://127.0.0.1:61841?test=1'])assert.throws(()=>mode.assertCollectorStagingTarget(value));
 assert.throws(()=>mode.assertCollectorStagingTarget('http://127.0.0.1:61841',true));
 assert.throws(()=>staging({NEXT_PUBLIC_SQUARE_LOCAL_TEST:'true',NEXT_PUBLIC_SALES_CART_LOCAL_TEST:'true'}).assertCollectorStagingTarget('http://127.0.0.1:61841'));
 assert.throws(()=>staging({}).assertCollectorStagingTarget('http://127.0.0.1:61841'));
});
test('Square local mode is forbidden in a production build',()=>{
 assert.throws(()=>assertCollectorReleaseEnvironment({GROOKAI_COLLECTOR_RELEASE_V1:'true',VERCEL_ENV:'production',
  VERCEL_PROJECT_ID:'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum',SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co',NEXT_PUBLIC_SQUARE_LOCAL_TEST:'true'}));
});

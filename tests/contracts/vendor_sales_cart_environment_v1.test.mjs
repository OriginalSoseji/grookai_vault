import test from 'node:test';import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';
import{assertCollectorReleaseEnvironment}from'../../apps/web/src/lib/collectorRelease.mjs';
test('sales cart local proof accepts only its exact loopback database and rejects combined modes',()=>{
 for(const [url,extra,ok]of [
  ['http://127.0.0.1:64801',{},true],['http://127.0.0.1:64701',{},false],
  ['https://ycdxbpibncqcchqiihfz.supabase.co',{},false],['http://127.0.0.1:64801/other',{},false],
  ['http://127.0.0.1:64801',{NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST:'true'},false],
  ['http://127.0.0.1:64801',{NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING:'true'},false],
 ]){
  const script=`import {assertCollectorStagingTarget} from './apps/web/src/lib/collectorStaging.mjs';assertCollectorStagingTarget(${JSON.stringify(url)});`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SALES_CART_LOCAL_TEST:'true',...extra},encoding:'utf8'});
  assert.equal(r.status===0,ok,url);
 }
 assert.throws(()=>assertCollectorReleaseEnvironment({GROOKAI_COLLECTOR_RELEASE_V1:'true',NEXT_PUBLIC_SALES_CART_LOCAL_TEST:'true'}),/test modes/);
});

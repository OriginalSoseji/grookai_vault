import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {assertCollectorReleaseEnvironment} from '../../apps/web/src/lib/collectorRelease.mjs';

test('trade proof accepts only its own loopback database and rejects other modes',()=>{
 const base={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SALES_TRADE_LOCAL_TEST:'true'};
 const cases=[['http://127.0.0.1:65301',{},true],['http://127.0.0.1:65001',{},false],['https://ycdxbpibncqcchqiihfz.supabase.co',{},false],['http://localhost:65301',{},false],['http://127.0.0.1:65301/other',{},false],['http://127.0.0.1:65301?target=prod',{},false]];
 for(const mode of ['NEXT_PUBLIC_SALES_DESK_PRO_LOCAL_TEST','NEXT_PUBLIC_SALES_CART_LOCAL_TEST','NEXT_PUBLIC_RECEIPT_CLOUD_LOCAL_TEST','NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB','NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING','NEXT_PUBLIC_STOREFRONT_LOCAL_TEST','NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST','NEXT_PUBLIC_COLLECTR_IMPORT_LOCAL_TEST'])cases.push(['http://127.0.0.1:65301',{[mode]:'true'},false]);
 for(const [url,extra,valid] of cases){
  const script=`import {assertCollectorStagingTarget} from './apps/web/src/lib/collectorStaging.mjs';assertCollectorStagingTarget(${JSON.stringify(url)});`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...base,...extra},encoding:'utf8'});
  assert.equal(result.status===0,valid,JSON.stringify([url,extra]));
 }
 assert.throws(()=>assertCollectorReleaseEnvironment({GROOKAI_COLLECTOR_RELEASE_V1:'true',NEXT_PUBLIC_SALES_TRADE_LOCAL_TEST:'true'}),/test modes/);
});

test('trade build rejects hosted targets, telemetry and missing staging',()=>{
 for(const extra of [{VERCEL:'1'},{VERCEL_ENV:'preview'},{GROOKAI_DISABLE_TELEMETRY:'0'},{NEXT_PUBLIC_COLLECTOR_STAGING:'false'}]){
  const result=spawnSync(process.execPath,['--input-type=module','-e',"await import('./next.config.mjs')"],{cwd:'apps/web',env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_SALES_TRADE_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',SUPABASE_URL:'http://127.0.0.1:65301',SUPABASE_PUBLISHABLE_KEY:'synthetic-build-only',...extra},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/isolated local staging/);
 }
});

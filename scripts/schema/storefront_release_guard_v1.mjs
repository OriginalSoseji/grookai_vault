import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {sha256} from './column_order_reconciliation_v1.mjs';
import {root,workdir,project,pending,container,localSql} from './storefront_release_schema_v1.mjs';

export const RELEASE_SHA256='639df6d611b5ae41328c3feaa95129acb349007891200f0c8599d14ef015ac98';
export const CONFIG_SHA256='934dc76595b2bac01ee6b5c73d80e7710dc5fc9b6463e15357eb8c40a0dd4211';
export function validatePlan(plan,realPath,config){
  assert.equal(realPath.replaceAll('\\','/').toLowerCase(),'c:/gv_store_release_20260919/.local/integration/release-replay','wrong resolved replay target');
  assert.equal(plan.project,project);assert.equal(plan.network,project);assert.equal(plan.databasePort,16822);
  assert.equal(sha256(config),CONFIG_SHA256,'unexpected replay configuration');
  assert.equal(plan.configSha256,CONFIG_SHA256);
  assert.equal(Object.keys(plan.sourceHashes).length,395);
  assert.equal(plan.sourceHashes[pending],RELEASE_SHA256,'unexpected release source');
}
export function validateSourceHashes(expected,actual){assert.deepEqual(actual,expected,'migration inventory or content changed');}
export function sourceHashes(dir){return Object.fromEntries(fs.readdirSync(dir).filter(n=>/^\d+.*\.sql$/.test(n)).sort().map(n=>[n,sha256(fs.readFileSync(path.join(dir,n)))]));}
export function toolHashes(){return Object.fromEntries([
  'scripts/migration_preflight_strict.ps1','scripts/schema/storefront_release_guard_v1.mjs',
  'scripts/schema/storefront_release_schema_v1.mjs','scripts/schema/verify_storefront_release_v1.mjs',
  'scripts/schema/build_storefront_release_v1.mjs',
  'scripts/schema/column_order_reconciliation_v1.mjs','scripts/schema/audit_collector_schema_baseline_v1.mjs',
  'scripts/audits/storefront_schema_footprint_v1.sql','package.json','package-lock.json',
].map(n=>[n,sha256(fs.readFileSync(path.join(root,n)))]));}
export function guard({full=false}={}){
  execFileSync(process.execPath,[path.join(root,'scripts/schema/build_storefront_release_v1.mjs')],{windowsHide:true});
  const plan=JSON.parse(fs.readFileSync(path.join(workdir,'preparation.json')));
  validatePlan(plan,fs.realpathSync(workdir),fs.readFileSync(path.join(workdir,'supabase/config.toml')));
  assert.ok(!fs.existsSync(path.join(workdir,'supabase/.temp/project-ref')),'local project must not be linked');
  validateSourceHashes(plan.sourceHashes,sourceHashes(path.join(root,'supabase/migrations')));
  const expected={...plan.sourceHashes};if(!full)delete expected[pending];
  validateSourceHashes(expected,sourceHashes(path.join(workdir,'supabase/migrations')));
  const state=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8',windowsHide:true}))[0];
  assert.equal(state.State.Running,true);
  assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project],'database must have only its isolated internal network');
  const network=JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(network.Internal,true);
  const relay=JSON.parse(execFileSync('docker',['inspect','grookai-storefront-release-relay-20260919'],{encoding:'utf8',windowsHide:true}))[0];
  assert.deepEqual(relay.NetworkSettings.Ports['16822/tcp'],[{HostIp:'127.0.0.1',HostPort:'16822'}]);
  assert.equal(localSql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from public.sealed_product_variants)||'|'||(select count(*) from cron.job_run_details);"),'0|0|0|0|0','workers must be disabled and application data empty');
  return plan;
}

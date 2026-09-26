// Fixed new 240xx project. Earlier proof projects are read-only dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const root=fileURLToPath(new URL('../../',import.meta.url));
export const fixture=path.join(root,'.local/integration/vendor-order-notifications-v2');
export const project='grookai-notifications-20260922',container=`supabase_db_${project}`,relay='grookai-notifications-relay-20260922';
export const addition='20260922140000_vendor_order_notifications_v1.sql';
export const pending=['20260919050000_vendor_storefront_release_v1.sql','20260919080000_vendor_stripe_billing_v1.sql','20260919120000_vendor_custom_product_import_v1.sql','20260919130000_vendor_seller_bindings_v1.sql','20260919150000_vendor_stock_reservations_v1.sql','20260919170000_vendor_orders_v1.sql','20260919180000_vendor_checkout_creation_v1.sql','20260919200000_vendor_order_cancel_unstarted_v1.sql','20260919210000_vendor_order_retries_v1.sql','20260920080000_vendor_order_fulfillment_v1.sql','20260920090000_vendor_order_refunds_v1.sql'];
export const output=path.join(root,'docs/audits/vendor_order_notifications_v2');
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>/^\d+.*\.sql$/.test(n)).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
export const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true}).trim();
export const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:48*1024*1024}).trim();
export function sourceState() {
  assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_billing_20260919');
  const prior=JSON.parse(fs.readFileSync('C:/gv_store_billing_20260919/docs/audits/vendor_store_catalog_recovery_v1/replay.json'));
  assert.equal(prior.status,'passed');assert.equal(prior.project,'grookai-store-catalog-20260921');assert.equal(Object.keys(prior.sourceHashes).length,411);
  const source=hashes(path.join(root,'supabase/migrations')),base={...source};
  delete base[addition];
  assert.deepEqual(base,prior.sourceHashes,'Previously proven migrations must remain exact');
  return source;
}
export function guard({full=false}={}) {
  const source=sourceState(),plan=JSON.parse(fs.readFileSync(path.join(fixture,'preparation.json')));
  assert.equal(plan.project,project);assert.equal(plan.databasePort,24022);
  const base={...source};delete base[addition];assert.deepEqual(plan.sourceHashes,base);
  assert.equal(fs.realpathSync(fixture).replaceAll('\\','/').toLowerCase(),'c:/gv_store_billing_20260919/.local/integration/vendor-order-notifications-v2');
  assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
  assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),plan.configSha256);
  const state=JSON.parse(docker('inspect',container))[0];assert.equal(state.State.Running,true);
  assert.equal(state.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.equal(state.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
  assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  const bridge=JSON.parse(docker('inspect',relay))[0];assert.equal(bridge.State.Running,true);
  assert.deepEqual(bridge.NetworkSettings.Ports['24022/tcp'],[{HostIp:'127.0.0.1',HostPort:'24022'}]);
  const expected={...source};if(!full)for(const name of [...pending,addition])delete expected[name];
  if(full)assert.equal(Object.keys(expected).length,412);else assert.equal(Object.keys(expected).length,400);
  assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),expected);
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/),Object.keys(expected).sort().map(n=>n.split('_')[0]));
  assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from public.sealed_product_variants)||'|'||(select count(*) from cron.job_run_details);"),'0|0|0|0|0');
  if(full)assert.equal(sql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from public.vendor_store_rollout;"),'false|false|false');
  if(full)assert.equal(sql("select (select count(*) from vendor_order_reconcile_jobs)||'|'||(select count(*) from vendor_order_reconcile_scopes)||'|'||(select count(*) from vendor_order_reconcile_events)||'|'||(select enabled::text from vendor_order_reconcile_control);"),'0|0|0|false');
  if(full)assert.equal(sql("select (select count(*) from vendor_order_refund_requests)||'|'||(select count(*) from vendor_order_refund_observations)||'|'||(select enabled::text from vendor_order_refunds_control);"),'0|0|false');
  if(full)assert.equal(sql("select (select count(*) from vendor_order_fulfillment_events)||'|'||(select enabled::text from vendor_order_fulfillment_control);"),'0|false');
  if(full)assert.equal(sql("select count(*) from public.vendor_order_signal_associations;"),'0');
  return {project,sourceHashes:source,applied:Object.keys(expected).length};
}

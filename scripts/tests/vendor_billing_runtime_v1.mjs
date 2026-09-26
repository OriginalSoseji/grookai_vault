// Fixed, isolated billing test target. Never accepts a remote connection string.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const root=fileURLToPath(new URL('../../',import.meta.url));
export const fixture=path.join(root,'.local/integration/billing-runtime');
export const project='grookai-vendor-billing-runtime-20260919';
export const container=`supabase_db_${project}`;
export const image='public.ecr.aws/supabase/postgres:17.6.1.113';
export const imageId='sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e';
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const sqlArgs=['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'];
export const sql=input=>execFileSync('docker',sqlArgs,{input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4*1024*1024}).trim();
const inspect=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true}))[0];
export function guardRuntime({empty=true,draft=false}={}) {
  assert.equal(fs.realpathSync(fixture).replaceAll('\\','/').toLowerCase(),'c:/gv_store_billing_20260919/.local/integration/billing-runtime');
  assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),'090f57785f3b6883f5f998e2aee6990d90e389399ffbd2faf890651ddad134b0');
  assert.equal(fs.readFileSync(path.join(fixture,'supabase/.temp/postgres-version'),'utf8'),'17.6.1.113');
  assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
  const state=inspect('inspect',container);
  assert.equal(state.State.Running,true);assert.equal(state.Config.Image,image);assert.equal(state.Image,imageId);
  assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);
  assert.equal(inspect('network','inspect',project).Internal,true);
  const relay=inspect('inspect','grookai-vendor-billing-runtime-relay-20260919');
  assert.equal(relay.State.Running,true);
  assert.deepEqual(Object.keys(relay.NetworkSettings.Networks).sort(),['bridge',project].sort());
  for(const port of [17621,17622,17624])assert.deepEqual(relay.NetworkSettings.Ports[`${port}/tcp`],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
  const plan=JSON.parse(fs.readFileSync(path.join(fixture,'patched-preparation.json')));
  const names=fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>/^\d+.*\.sql$/.test(n)).sort();
  assert.equal(names.length,397);assert.deepEqual(names,Object.keys(plan.sourceHashes).sort());
  for(const name of names) {
    const digest=hash(fs.readFileSync(path.join(root,'supabase/migrations',name)));
    // A rollback-only draft proof may change only the still-unapplied billing
    // migration. The retained replay copies and every prerequisite stay bound.
    if(!draft||name!=='20260919080000_vendor_stripe_billing_v1.sql')assert.equal(digest,plan.sourceHashes[name],`Source changed: ${name}; replay required`);
    assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/migrations',name))),plan.sourceHashes[name]);
  }
  const versions=sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/);
  assert.deepEqual(versions,names.map(n=>n.split('_')[0]));
  assert.equal(sql("select current_setting('max_worker_processes')||'|'||current_setting('supautils.hint_roles')||'|'||(select count(*) from cron.job_run_details)||'|'||(select count(*) from public.card_prints);"),'0|anon, authenticated, service_role|0|0');
  assert.equal(sql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from public.vendor_store_rollout;"),'false|false|false');
  if(empty) assert.equal(sql("select (select count(*) from auth.users)||'|'||(select count(*) from public.vendor_billing_accounts)||'|'||(select count(*) from public.vendor_billing_checkout_attempts)||'|'||(select count(*) from public.vendor_billing_events);"),'0|0|0|0');
  if(empty && sql("select (to_regclass('public.vendor_billing_reconcile_runs') is not null)::text;")==='true')
    assert.equal(sql('select count(*) from public.vendor_billing_reconcile_runs;'),'0');
  if(empty && sql("select (to_regclass('public.vendor_billing_closed_accounts') is not null)::text;")==='true')
    assert.equal(sql("select (select count(*) from public.vendor_billing_closed_accounts)||'|'||(select count(*) from public.vendor_account_financial_holds);"),'0|0');
  return {project,image,imageId:state.Image,migrations:names.length,configSha256:plan.configSha256,sourceHashes:plan.sourceHashes};
}

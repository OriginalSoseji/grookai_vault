// Read-only exact-package attestation shared by sealing and release checks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {inventoryExportRelease} from './product_inventory_export_release_scope_v1.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024});
export async function readInventoryExportReleaseState(mode,packageHashes){
 assert.ok(['full','upgrade'].includes(mode));assert.equal(fs.realpathSync('.').replaceAll(String.fromCharCode(92),'/').toLowerCase(),inventoryExportRelease.root.toLowerCase());
 const project='inv-rel-'+mode+'-438-v1-20261008',lab=inventoryExportRelease.evidence+'/release-'+mode+'-438-v1',port=mode==='full'?36020:36040;
 const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);assert.deepEqual(freeze.sourceHashes,packageHashes);assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
 for(const [name,h]of Object.entries(packageHashes)){assert.equal(sha(lab+'/supabase/migrations/'+name),h,name);assert.equal(sha(inventoryExportRelease.root+'/supabase/migrations/'+name),h,name);}
 const container=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(container.State.Running,true);assert.equal(container.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
 const network=JSON.parse(docker('network','inspect',project))[0];assert.equal(network.Internal,true);assert.equal(network.IPAM.Config[0].Subnet,mode==='full'?'10.246.120.0/24':'10.246.121.0/24');
 const relay=JSON.parse(docker('inspect',project+'-relay'))[0];assert.equal(relay.State.Running,true);for(const p of [port,port+1,port+4])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
 const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:'+port+'/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});await db.connect();
 try{
  const row=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select count(*)::int from vault_item_instances) copies,(select count(*)::int from auth.users) users,(select count(*)::int from cron.job_run_details) jobs,to_regclass('public.vendor_receipt_delivery_control') is null deliveryAbsent,(select count(*) from market_price_current_publication)=0 pointerAbsent,jsonb_build_object('history',(select enabled from portfolio_history_control),'corrections',(select enabled from vendor_sale_cost_correction_control),'discounts',(select enabled from vendor_discount_control),'events',(select enabled from vendor_event_control),'negotiated',(select enabled from vendor_negotiated_trade_control),'trade',(select enabled from vendor_sales_trade_control),'payments',(select enabled from vendor_sales_payment_control),'purchase',(select enabled from vendor_purchase_control),'cart',(select enabled from vendor_sales_cart_control),'cloud',(select enabled from vendor_receipt_cloud_control),'capture',(select capture_enabled from vendor_cost_evidence_control),'edit',(select edit_enabled from vendor_cost_evidence_control)) controls")).rows[0];
  assert.equal(row.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(row.readonly,'on');assert.equal(row.workers,'0');assert.equal(row.migrations,438);assert.equal(row.jobs,0);assert.equal(row.deliveryabsent,true);assert.equal(row.pointerabsent,true);assert.equal(Object.keys(row.controls).length,12);assert.ok(Object.values(row.controls).every(v=>v===false));
  assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version),Object.keys(packageHashes).map(n=>n.split('_')[0]).sort());
  row.exportSecurity=(await db.query("select provolatile,prosecdef,proconfig,has_function_privilege('authenticated',oid,'EXECUTE') authenticated,has_function_privilege('anon',oid,'EXECUTE') anon,has_function_privilege('service_role',oid,'EXECUTE') service from pg_proc where oid='public.vault_inventory_export_v1()'::regprocedure")).rows[0];
  assert.deepEqual(row.exportSecurity,{provolatile:'s',prosecdef:true,proconfig:['search_path=""'],authenticated:true,anon:false,service:false});
  row.retained={};
const tables=(await db.query("select table_schema||'.'||table_name name from information_schema.tables where table_type='BASE TABLE' and (table_schema='public' or (table_schema='auth' and table_name='users') or (table_schema='supabase_migrations' and table_name='schema_migrations')) order by 1")).rows.map(r=>r.name);
  for(const table of tables){assert.match(table,/^[a-z_]+\.[a-z_0-9]+$/);row.retained[table]=(await db.query("select md5(coalesce(jsonb_agg(j order by j::text),'[]'::jsonb)::text) hash from (select to_jsonb(t) j from "+table+" t) r")).rows[0].hash;}
  return row;
 }finally{await db.end();}
}

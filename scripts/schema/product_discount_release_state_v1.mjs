// Read-only exact-package attestation shared by sealing and release checks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {discountRelease} from './product_discount_release_scope_v1.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024});
export async function readDiscountReleaseState(mode,packageHashes){
 assert.ok(['full','upgrade'].includes(mode));assert.equal(fs.realpathSync('.').replaceAll(String.fromCharCode(92),'/').toLowerCase(),discountRelease.root.toLowerCase());
 const project='discount-rel-'+mode+'-435-v1-20261008',lab=discountRelease.evidence+'/release-'+mode+'-435-v1',port=mode==='full'?34860:34880;
 const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);assert.deepEqual(freeze.sourceHashes,packageHashes);assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
 for(const [name,h]of Object.entries(packageHashes)){assert.equal(sha(lab+'/supabase/migrations/'+name),h,name);assert.equal(sha(discountRelease.root+'/supabase/migrations/'+name),h,name);}
 const container=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(container.State.Running,true);assert.equal(container.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
 const network=JSON.parse(docker('network','inspect',project))[0];assert.equal(network.Internal,true);assert.equal(network.IPAM.Config[0].Subnet,mode==='full'?'10.246.98.0/24':'10.246.99.0/24');
 const relay=JSON.parse(docker('inspect',project+'-relay'))[0];assert.equal(relay.State.Running,true);for(const p of [port,port+1,port+4])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
 const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:'+port+'/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});await db.connect();
 try{
  const row=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select count(*)::int from vault_item_instances) copies,(select count(*)::int from auth.users) users,(select count(*)::int from cron.job_run_details) jobs,to_regclass('public.vendor_receipt_delivery_control') is null deliveryAbsent,(select count(*) from market_price_current_publication)=0 pointerAbsent,jsonb_build_object('discounts',(select enabled from vendor_discount_control),'events',(select enabled from vendor_event_control),'negotiated',(select enabled from vendor_negotiated_trade_control),'trade',(select enabled from vendor_sales_trade_control),'payments',(select enabled from vendor_sales_payment_control),'purchase',(select enabled from vendor_purchase_control),'cart',(select enabled from vendor_sales_cart_control),'cloud',(select enabled from vendor_receipt_cloud_control),'capture',(select capture_enabled from vendor_cost_evidence_control),'edit',(select edit_enabled from vendor_cost_evidence_control)) controls")).rows[0];
  assert.equal(row.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(row.readonly,'on');assert.equal(row.workers,'0');assert.equal(row.migrations,435);assert.equal(row.jobs,0);assert.equal(row.deliveryabsent,true);assert.equal(row.pointerabsent,true);assert.equal(Object.keys(row.controls).length,10);assert.ok(Object.values(row.controls).every(v=>v===false));
  assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version),Object.keys(packageHashes).map(n=>n.split('_')[0]).sort());
  row.retained={};
for(const table of ['auth.users','vault_owners','vault_items','vault_item_instances','vault_item_instance_dispositions',
      'vault_copy_cost_requests','vendor_sale_cost_snapshots','vendor_receipt_books','vendor_sales_cart_receipts',
      'card_events','pricing_watch','card_prints','card_printings','sets','card_print_identity','external_mappings',
      'tcgcsv_source_categories','tcgcsv_source_groups','tcgcsv_source_sync_runs','tcgcsv_source_artifacts',
      'tcgcsv_source_products','tcgcsv_source_price_daily_observations','market_evidence_variant_assignments',
      'tcgplayer_jungle_edition_assignments_v1','market_price_pipeline_runs','market_price_pipeline_phase_attempts',
      'market_price_pipeline_candidates','market_price_qualification_decisions','market_price_publication_sets',
      'market_price_publication_snapshots','market_price_publication_events','market_price_current_publication','vendor_event_owners','vendor_events','vendor_event_expenses','vendor_event_assignments','vendor_event_requests','vendor_sales_cart_cancellations']){row.retained[table]=(await db.query("select md5(coalesce(jsonb_agg(j order by j::text),'[]'::jsonb)::text) hash from (select to_jsonb(t) j from "+table+" t) r")).rows[0].hash;}
  return row;
 }finally{await db.end();}
}

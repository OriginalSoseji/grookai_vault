import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
export const root='C:/gv_store_production_20260926',dir=root+'/.local/integration/production-live-v1';
export const ref='ycdxbpibncqcchqiihfz',dbUrl='https://'+ref+'.supabase.co',origin='https://grookaivault.com';
export const save=(name,data)=>fs.writeFileSync(dir+'/'+name,JSON.stringify(data,null,2),{flag:'wx'});
export const read=name=>JSON.parse(fs.readFileSync(dir+'/'+name));
const token=execFileSync('pwsh',['-NoProfile','-File','C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
assert.match(token,/^sbp_/);
export async function management(route,body){const r=await fetch('https://api.supabase.com/v1/projects/'+ref+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});assert.ok(r.ok,`Database management HTTP ${r.status}`);return r.json();}
export async function query(sql){return management('/database/query',{query:sql});}
export async function keys(){const rows=await management('/api-keys?reveal=true');return{anon:rows.find(r=>r.type==='publishable').api_key,service:rows.find(r=>r.type==='secret').api_key};}
export async function rest(route,{key,jwt,body,method}={}){const r=await fetch(dbUrl+route,{method:method??(body?'POST':'GET'),headers:{apikey:key,Authorization:'Bearer '+(jwt??key),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const text=await r.text();return{status:r.status,data:text?JSON.parse(text):null};}
export const stateSql=`select jsonb_build_object(
 'migrations',(select count(*) from supabase_migrations.schema_migrations),
 'stores',(select to_jsonb(t) from vendor_store_rollout t),
 'batch',(select to_jsonb(t) from vendor_batch_intake_control t),
 'scan',(select to_jsonb(t) from vendor_scan_control t),
 'seller',(select to_jsonb(t) from vendor_seller_rollout t),
 'stock',(select to_jsonb(t) from vendor_stock_rollout t),
 'orders',(select to_jsonb(t) from vendor_orders_rollout t),
 'entitlements',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from user_entitlements t),
 'store_count',(select count(*) from vendor_stores),
 'invite_count',(select count(*) from vendor_store_trial_invites),
 'members',(select count(*) from vendor_store_trial_members)
) as state;`;

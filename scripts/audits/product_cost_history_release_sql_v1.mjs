// Read-only SQL/client parity and privilege proof in the isolated full437 lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_cost_history_20261008');assert.equal(fs.realpathSync('.'),fs.realpathSync(root));
const base='C:/grookai_vault_operator_artifacts/product_cost_history_20261008',lab=base+'/release-full-436-v1',project='costhist-rel-full-436-v1-20261008';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,436);assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35260/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});await db.connect();
const out=base+'/release-sql-'+Date.now();fs.mkdirSync(out);fs.copyFileSync(fileURLToPath(import.meta.url),out+'/producer.mjs',fs.constants.COPYFILE_EXCL);
try{
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.readonly,'on');assert.equal(state.workers,'0');assert.equal(state.migrations,436);
 const outcomes=[];
 for(const row of read(root+'test/fixtures/sale_cost_corrections_v1.json').requests){
  let accepted=true,code=null;
  try{await db.query('select public.vendor_sale_cost_correction_validate_v1($1::jsonb)',[JSON.stringify(row.request)]);}catch(error){accepted=false;code=error.code;assert.ok(['22023','22P02','22P05'].includes(code),row.name+': unexpected SQL error '+code);}
  outcomes.push({name:row.name,accepted,code});fs.writeFileSync(out+'/outcomes.json',JSON.stringify(outcomes,null,2));assert.equal(accepted,row.valid,row.name);
 }
 const privileges=[];
 for(const table of ['vendor_sale_cost_correction_control','vendor_sale_cost_correction_requests'])for(const role of ['anon','authenticated','service_role']){
  const p=(await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') allowed,(select relrowsecurity from pg_class where oid=$2::regclass) rls",[role,'public.'+table])).rows[0];assert.equal(p.allowed,false,role+' '+table);assert.equal(p.rls,true);privileges.push({role,table,...p});
 }
 const names=['vendor_sale_cost_correction_immutable_v1','vendor_sale_cost_correction_validate_v1','vendor_sale_cost_receipt_v1','vendor_sale_cost_correction_outcome_v1','vendor_sale_cost_correction_available_v1','vendor_sale_cost_correction_recover_v1','vendor_sale_cost_correction_apply_v1','vendor_sale_cost_correction_cancel_v1','vendor_sale_cost_correction_read_v1','vendor_sale_cost_correction_history_v1'];
 const functions=(await db.query("select p.proname name,p.oid::regprocedure::text signature,p.prosecdef definer,p.proconfig config from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1::text[]) order by p.proname",[names])).rows;assert.equal(functions.length,names.length);
 for(const f of functions){
  const internal=['vendor_sale_cost_correction_immutable_v1','vendor_sale_cost_correction_validate_v1','vendor_sale_cost_receipt_v1','vendor_sale_cost_correction_outcome_v1'].includes(f.name);
  assert.ok(f.config.includes('search_path=""'),f.signature);
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,f.signature])).rows[0].allowed,role==='authenticated'&&!internal,role+' '+f.signature);
 }
 assert.equal((await db.query('select enabled from vendor_sale_cost_correction_control')).rows[0].enabled,false);
 assert.equal((await db.query('select public.vendor_sale_cost_correction_available_v1() enabled')).rows[0].enabled,false);
 for(const sql of ["select public.vendor_sale_cost_correction_apply_v1(null)","select public.vendor_sale_cost_correction_cancel_v1(null)","select public.vendor_sale_cost_correction_recover_v1(null)","select public.vendor_sale_cost_correction_read_v1(null)","select public.vendor_sale_cost_correction_history_v1(null,null)"]){await assert.rejects(db.query(sql),e=>e.code==='28000');}
 const result={status:'passed',at:new Date().toISOString(),cases:outcomes.length,outcomes,privileges,functions,readOnly:true,productionWrites:0,localWrites:0,sourceSha256:freeze.sourceHashes['20261008190000_vendor_sale_cost_corrections_v1.sql'],vectorSha256:hash(fs.readFileSync(root+'test/fixtures/sale_cost_corrections_v1.json'))};
 fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',cases:outcomes.length,out}));
}catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({at:new Date().toISOString(),status:'failed',message:error.message,code:error.code??null,productionWrites:0,localWrites:0},null,2),{flag:'wx'});throw error;}finally{await db.end();}

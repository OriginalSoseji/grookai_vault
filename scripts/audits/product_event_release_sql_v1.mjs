// Read-only request parity and privilege checks in the freshly replayed event lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_event_closeout_20261008');
const base='C:/grookai_vault_operator_artifacts/product_event_closeout_20261008',lab=base+'/release-full-433-v1',project='event-release-full-433-v1-20261008';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,433);
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));assert.equal(Object.keys(freeze.sourceHashes).length,433);assert.ok(!Object.hasOwn(freeze.sourceHashes,'20261005150000_vendor_receipt_delivery_v1.sql'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34300/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});
await db.connect();
try {
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.readonly,'on');assert.equal(state.workers,'0');assert.equal(state.migrations,433);
 const fixtures=read(root+'test/fixtures/vendor_events_v1.json');
 const outcomes=[];
 // One JSON parameter per case: PostgreSQL refuses escaped NUL/unpaired
 // surrogates during JSONB parsing, before the validator can see them.
 const cases=[...fixtures.requestCases];
 for(const name of ['\ud800','\udc00']){const request=structuredClone(cases[0].request);request.operation.name=name;cases.push({name:'unpaired Unicode '+name.charCodeAt(0).toString(16),request,valid:false});}
 for(const row of cases){
  let accepted=true,code=null;
  try{await db.query('select public.vendor_event_request_validate_v1($1::jsonb)',[JSON.stringify(row.request)]);}
  catch(error){accepted=false;code=error.code;assert.ok(['22023','22007','22008','22P02','22P05'].includes(code),row.name+': unexpected SQL error '+code);}
  assert.equal(accepted,row.valid,row.name);outcomes.push({name:row.name,accepted,code});
 }
 const tables=['vendor_event_control','vendor_event_owners','vendor_events','vendor_event_expenses','vendor_event_assignments','vendor_event_requests'];
 const privileges=[];
 for(const role of ['anon','authenticated','service_role'])for(const table of tables){
  const row=(await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') allowed,(select relrowsecurity from pg_class where oid=$2::regclass) rls",[role,'public.'+table])).rows[0];
  assert.equal(row.allowed,false,role+' '+table);assert.equal(row.rls,true);privileges.push({role,table,...row});
 }
 const functions=(await db.query("select p.oid::regprocedure::text signature,p.prosecdef definer,p.proconfig config from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'vendor_event_%' order by p.proname")).rows;
 assert.equal(functions.length,10);
 const publicRpcs=['vendor_event_mutate_v1','vendor_event_request_read_v1','vendor_event_read_v1','vendor_event_history_read_v1'];
 for(const fn of functions){
  const exposed=publicRpcs.some(n=>fn.signature.startsWith(n+'('));
  assert.equal(fn.definer,exposed,fn.signature);assert.ok(fn.config.includes('search_path=""'),fn.signature);
  for(const role of ['anon','authenticated','service_role']){
   const allowed=(await db.query("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,fn.signature])).rows[0].allowed;
   assert.equal(allowed,role==='authenticated'&&exposed,role+' '+fn.signature);
  }
 }
 assert.equal((await db.query('select enabled from vendor_event_control')).rows[0].enabled,false);
 const out=base+'/release-sql-'+Date.now();fs.mkdirSync(out);
 fs.writeFileSync(out+'/result.json',JSON.stringify({at:new Date().toISOString(),status:'passed',outcomes,cases:outcomes.length,privileges,functions,readOnly:true,productionWrites:0,localWrites:0,sourceSha256:freeze.sourceHashes['20261008130000_vendor_events_v1.sql'],vectorsSha256:hash(fs.readFileSync(root+'test/fixtures/vendor_events_v1.json'))},null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'passed',cases:outcomes.length,out}));
}finally{await db.end();}

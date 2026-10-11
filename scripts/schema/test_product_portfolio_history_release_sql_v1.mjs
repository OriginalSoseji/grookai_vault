// Read-only SQL/Node parity in the dedicated fresh portfolio lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {comparePortfolioObservationsV1 as compare,summarizePortfolioObservationV1 as summarize,PORTFOLIO_HISTORY_SCOPE as scope} from '../../backend/vault/portfolio_history_v1.mjs';
const root='C:/gv_product_portfolio_history_20261008',base='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008';
const project='portfolio-rel-full-437-v1-20261008',lab=base+'/release-full-437-v1',migration='20261008220000_portfolio_history_v1.sql';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
assert.equal(read(lab+'/replay-result.json').status,'passed');
const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);assert.equal(sha(root+'/supabase/migrations/'+migration),freeze.sourceHashes[migration]);
const docker=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true}));
const container=docker('inspect','supabase_db_'+project)[0];assert.equal(container.State.Running,true);
assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(docker('network','inspect',project)[0].Internal,true);
const id=n=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
const copy=(n,amount,{kind='raw',currency='USD',key=n,reason='no_qualified_price'}={})=>({copyId:id(n),kind,
  basisKey:createHash('sha256').update(String(key)).digest('hex'),reference:amount===null?null:{amount,currency,provenanceId:id(9000+n),
    observedAt:kind==='sealed'?'2026-10-08':'2026-10-08T09:00:00.000Z',publishedAt:kind==='sealed'?null:'2026-10-08T10:00:00.000Z'},unpricedReason:amount===null?reason:null});
const point=(copies,later=false)=>({version:1,scope,ownerId:id(1000),snapshotId:id(later?1002:1001),sequence:later?'2':'1',
  capturedAt:later?'2026-10-08T12:00:00.000Z':'2026-10-08T11:00:00.000Z',complete:true,ownedCount:copies.length,copies});
const cases=[];
const add=(name,a,b)=>cases.push({name,before:point(a),after:point(b,true)});
add('all_six_components',[copy(1,'10'),copy(2,'8'),copy(3,null),copy(4,'11'),copy(5,'4')],
  [copy(1,'12'),copy(3,'7'),copy(4,null),copy(5,'9',{key:'corrected'}),copy(6,'5')]);
add('subcent_aggregate',[1,2,3].map(n=>copy(n,'0.014')),[1,2,3].map(n=>copy(n,'0.016')));
add('rounding_adjustment',[copy(1,'1'),copy(2,null)],[copy(1,'1.004'),copy(2,'0.004')]);
add('negative_half',[copy(1,'1.005')],[copy(1,'1')]);
add('large_exact',[copy(1,'9007199254740993.000000000000000000000001')],[copy(1,'9007199254740993.000000000000000000000003')]);
add('empty',[],[]);add('all_unpriced',[copy(1,null)],[copy(1,null),copy(2,null)]);
add('remove_all',[copy(1,'5')],[]);add('first_add',[],[copy(1,'5')]);
add('currency_changed',[copy(1,'10',{currency:'EUR'})],[copy(1,'12')]);
add('multiple_currencies',[copy(1,'4',{currency:'EUR'}),copy(2,'5')],[copy(1,'6',{currency:'EUR'}),copy(2,'3')]);
add('slabs_retained',[copy(1,null,{kind:'slab',reason:'unsupported_slab'}),copy(2,'2')],[copy(1,null,{kind:'slab',reason:'unsupported_slab'}),copy(2,'3')]);
add('sealed_opened',[copy(1,'25',{kind:'sealed',key:'sealed'})],[copy(1,null,{kind:'sealed',key:'opened',reason:'ineligible_seal_state'})]);
add('basis_changed_unpriced',[copy(1,null)],[copy(1,null,{key:'new'})]);
add('normalized_decimal',[copy(1,'1.00000')],[copy(1,'2.0000')]);
let seed=5678;const random=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
const fixed=n=>`${Math.floor(n/1000)}.${String(n%1000).padStart(3,'0')}`;
for(let trial=0;trial<200;trial++){
 const a=[],b=[];for(let n=1;n<=30;n++){
  if(random(4))a.push(copy(n,random(3)?fixed(random(100000)+1):null));
  if(random(4))b.push(copy(n,random(3)?fixed(random(100000)+1):null,{key:random(3)?n:'new-'+n}));
 }add('generated_'+trial,a,b);
}
const out=base+'/release-sql-parity-'+Date.now();fs.mkdirSync(out);fs.writeFileSync(out+'/vectors.json',JSON.stringify(cases),{flag:'wx'});
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35620/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});
try{
 await db.connect();await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='30s'");
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.readonly,'on');assert.equal(state.migrations,437);
 for(const c of cases){
  const result=(await db.query('select public.portfolio_history_compare_values_v1($1::jsonb,$2::jsonb) comparison,public.portfolio_history_summary_v1($1::jsonb) summary',[JSON.stringify(c.before),JSON.stringify(c.after)])).rows[0];
  assert.deepEqual(result.comparison,compare(c.before,c.after),c.name);assert.deepEqual(result.summary,summarize(c.before),c.name+' summary');
 }
 for(const role of ['anon','authenticated','service_role'])for(const table of ['portfolio_history_points','portfolio_history_requests','portfolio_history_owners','portfolio_history_control']){
  const r=(await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') allowed",[role,'public.'+table])).rows[0];assert.equal(r.allowed,false,role+' '+table);
 }
 const funcs=(await db.query("select oid::regprocedure::text name,proname from pg_proc where pronamespace='public'::regnamespace and proname like 'portfolio_history_%' order by proname")).rows;
 const allowed=['capabilities','recover','capture','cancel','list','export','compare'].map(n=>'portfolio_history_'+n+'_v1');
 for(const f of funcs)for(const role of ['anon','authenticated','service_role']){
  const r=(await db.query("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,f.name])).rows[0];assert.equal(r.allowed,role==='authenticated'&&allowed.includes(f.proname),role+' '+f.name);
 }
 await db.query('rollback');
 const receipt={status:'passed',at:new Date().toISOString(),project,cases:cases.length,comparisons:cases.length,summaries:cases.length,
  aclFunctions:funcs.length,modelSha256:sha(root+'/backend/vault/portfolio_history_v1.mjs'),sourceSha256:freeze.sourceHashes[migration],
  vectorSha256:sha(out+'/vectors.json'),producerSha256:sha(import.meta.filename),readOnly:true,productionWrites:0,localWrites:0,out};
 fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});fs.writeFileSync(base+'/RELEASE_SQL_PARITY_V1.json',JSON.stringify(receipt,null,2));
 console.log(JSON.stringify({status:'passed',cases:cases.length,out}));
}catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({status:'failed',message:error.message,productionWrites:0,localWrites:0},null,2),{flag:'wx'});throw error;
}finally{await db.query('rollback').catch(()=>{});await db.end();}

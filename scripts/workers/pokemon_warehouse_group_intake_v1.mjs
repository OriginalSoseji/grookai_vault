import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {VERSION,buildGroupDiscoveryIntakePlan,readGroupRawReceipts,verifyGroupPreservation,assertIntakePlan,applyDiscoveryIntakeBatch,verifyDiscoveryIntakeBatch,persistDiscoveryIntakeRun} from '../../backend/catalog/pokemon_warehouse_group_intake_v1.mjs';
import {pokemonCoverageDatabaseTarget,readPokemonWarehouseSnapshot,reconcilePokemonWarehouse} from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import {writeCoverageReport} from '../../backend/catalog/pokemon_warehouse_discovery_runtime_v1.mjs';

// No implicit apply, scheduler activation, canonical promotion or retry.
dotenv.config({path:process.env.DOTENV_CONFIG_PATH||'.env.local',quiet:true});
const args=new Map();
for(const arg of process.argv.slice(2)){
 const m=arg.match(/^--(mode|out-dir|plan|authorization|producer-commit|scope)=(.+)$/);
 assert.ok(m&&!args.has(m[1]),'Usage: --mode=plan|apply|verify --out-dir=<new-directory> [--plan=<file> --authorization=<file> --producer-commit=<sha>]');args.set(m[1],m[2]);
}
const mode=args.get('mode')??'plan';assert.ok(['plan','apply','verify'].includes(mode));assert.ok(args.get('out-dir'));if(mode==='plan')assert.ok(args.get('scope'),'whole_group_scope_required');
if(mode!=='plan')assert.ok(args.get('plan'));
const root=fileURLToPath(new URL('../../',import.meta.url));
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
let authorization,plan;
if(mode!=='plan'){plan=assertIntakePlan(JSON.parse(await fs.readFile(args.get('plan'),'utf8')));}
if(mode==='apply'){
 assert.ok(args.get('authorization')&&args.get('producer-commit'));
 {
  assert.equal(git('rev-parse','HEAD'),args.get('producer-commit'),'producer_commit_mismatch');
  assert.equal(git('status','--porcelain'),'','clean_qualified_producer_required');
  for(const f of ['backend/catalog/pokemon_warehouse_group_intake_v1.mjs','scripts/workers/pokemon_warehouse_group_intake_v1.mjs'])git('ls-files','--error-unmatch',f);
 }
 authorization=JSON.parse(await fs.readFile(args.get('authorization'),'utf8'));
 assert.equal(authorization.approved,true);assert.equal(authorization.plan_fingerprint,plan.fingerprint);
 assert.equal(authorization.producer_commit,args.get('producer-commit'));assert.ok(authorization.operator&&authorization.request);
}
const out=path.resolve(args.get('out-dir'));await fs.mkdir(out,{recursive:false});
const save=(name,data)=>fs.writeFile(path.join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const target=pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL??process.env.DATABASE_URL??process.env.POSTGRES_URL);
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
assert.match(await fs.readFile(path.join(root,'supabase/config.toml'),'utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
const config={connectionString:target.toString(),ssl:{rejectUnauthorized:true,...(process.env.SUPABASE_DB_CA_CERT?{ca:process.env.SUPABASE_DB_CA_CERT}:{})},application_name:`pokemon_group_intake_${mode}_v1`,connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on'};
const db=new pg.Client(config);let connected=false,commitInFlight=false,committedBatches=0;
let jobId=null;
const run={version:VERSION,run_id:randomUUID(),plan_fingerprint:plan?.fingerprint,producer_commit:args.get('producer-commit'),authorization,started_at:new Date().toISOString()};
async function terminalReceipt(status,details){
 const ledger=new pg.Client(config);await ledger.connect();
 try{await ledger.query('begin read write');jobId=await persistDiscoveryIntakeRun(ledger,{jobId,status,payload:{...run,...details,finished_at:new Date().toISOString()}});await ledger.query('commit');return jobId;}finally{await ledger.end();}
}
const counts=async client=>(await client.query(`select (select count(*)::int from card_prints) cards,(select count(*)::int from sets) sets,(select count(*)::int from card_print_traits) traits,(select count(*)::int from card_printings) printings,(select count(*)::int from raw_imports) raws,(select count(*)::int from external_discovery_candidates) discoveries`)).rows[0];
try{
 await db.connect();connected=true;const before=await counts(db);assert.ok(before.cards>=40000&&before.sets>=150&&before.traits>=5000,'canonical_environment_gate');
 await save('start.json',{mode,at:new Date().toISOString(),counts:before,plan_fingerprint:plan?.fingerprint,producer_commit:args.get('producer-commit'),authorization});
 if(mode==='plan'){
  await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='90s'");
  const snapshot=await readPokemonWarehouseSnapshot(db);assert.ok(snapshot.products.length);
  const coverage=reconcilePokemonWarehouse(snapshot,{observedAt:new Date().toISOString()});
  const scope=JSON.parse(await fs.readFile(args.get('scope'),'utf8'));
  assert.deepEqual(Object.keys(scope).sort(),['category_id','expected_product_ids','group_id']);
  assert.ok([3,85].includes(scope.category_id));assert.ok(Number.isSafeInteger(scope.group_id));
  const full=(await db.query('select * from public.tcgcsv_source_products where category_id=$1 and group_id=$2 order by product_id',[scope.category_id,scope.group_id])).rows;
  const discovery=(await db.query('select * from public.external_discovery_candidates where tcgplayer_id=any($1::text[]) order by id',[full.map(p=>String(p.product_id))])).rows;
  const raw_receipts=await readGroupRawReceipts(db,full,discovery);
  plan=buildGroupDiscoveryIntakePlan({observed_at:coverage.observed_at,...scope,products:full,coverage_rows:coverage.rows.filter(r=>r.category_id===scope.category_id&&Number(r.group_id)===scope.group_id),raw_receipts,discovery});assertIntakePlan(plan);await db.query('commit');
  await save('plan.json',plan);const summary={mode,status:'planned',fingerprint:plan.fingerprint,eligible:plan.entries.length,held:plan.held.length,retained:plan.retained.length,group_products:plan.group_input.products.length,coverage:coverage.summary,canonical_writes:0};await save('complete.json',summary);console.log(JSON.stringify(summary));
 }else{
  let inserted=0,existing=0,verified=0;
  if(mode==='apply'){
   await db.query('begin read write');jobId=await persistDiscoveryIntakeRun(db,{status:'running',payload:run});commitInFlight=true;await db.query('commit');commitInFlight=false;
   await save('job.json',{job_id:jobId,...run});
  }
  for(let offset=0;offset<plan.entries.length;offset+=500){
   const batch=plan.entries.slice(offset,offset+500),n=String(offset/500+1).padStart(4,'0');
   if(mode==='apply'){
    await db.query('begin isolation level serializable read write');await db.query("set local statement_timeout='90s'");await db.query("set local lock_timeout='10s'");
    const rows=await applyDiscoveryIntakeBatch(db,plan,batch,{authorization});
    await persistDiscoveryIntakeRun(db,{jobId,status:'running',payload:{...run,last_atomic_batch:Number(n),completed_entries:offset+batch.length}});
    await save(`batch-${n}-pending.json`,{at:new Date().toISOString(),plan_fingerprint:plan.fingerprint,rows,meaning:'Validated transaction, commit not yet acknowledged. Resolve any missing commit receipt through independent readback.'});
    commitInFlight=true;await db.query('commit');committedBatches++;commitInFlight=false;
    await save(`batch-${n}-committed.json`,{at:new Date().toISOString(),rows});
    inserted+=rows.filter(r=>r.status==='inserted_review_only').length;existing+=rows.filter(r=>r.status==='already_succeeded').length;
   }else{
    await db.query('begin isolation level repeatable read read only');const rows=await verifyDiscoveryIntakeBatch(db,plan,batch);await db.query('commit');await save(`batch-${n}-verified.json`,{rows});verified+=rows.length;
   }
   console.log(JSON.stringify({mode,batch:Number(n),inserted,existing,verified,total:plan.entries.length}));
  }
  // Fresh independent connection sees committed state and the full denominator.
  const reader=new pg.Client({...config,application_name:'pokemon_group_independent_readback_v1'});await reader.connect();
  try{
   await reader.query('begin isolation level repeatable read read only');
   await verifyGroupPreservation(reader,plan);
   for(let offset=0;offset<plan.entries.length;offset+=500)await verifyDiscoveryIntakeBatch(reader,plan,plan.entries.slice(offset,offset+500));
   const coverage=reconcilePokemonWarehouse(await readPokemonWarehouseSnapshot(reader),{observedAt:new Date().toISOString()});const after=await counts(reader);await reader.query('commit');
   writeCoverageReport(path.join(out,'coverage.json'),coverage);await save('gamestop.json',coverage.rows.filter(r=>r.retailer==='gamestop'));
   const result={mode,status:'passed',plan_fingerprint:plan.fingerprint,inserted,existing,verified:plan.entries.length,committed_batches:committedBatches,canonical_writes:0,pricing_writes:0,warehouse_promotion_writes:0,before,after,coverage:coverage.summary};
   if(mode==='apply')result.job_id=await terminalReceipt('succeeded',result);
   await save('complete.json',result);console.log(JSON.stringify(result));
  }finally{await reader.end();}
 }
}catch(error){
 if(connected)await db.query('rollback').catch(()=>{});
 const failure={at:new Date().toISOString(),status:'stopped',mode,commit_outcome_unknown:commitInFlight,acknowledged_committed_batches:committedBatches,error_code:error.code??'INTAKE_STOPPED',error_detail:String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted database URL]'),recovery:'Preserve receipts; independently verify committed rows. Never blindly replay a pending batch.'};
 if(mode==='apply'&&jobId!==null){try{failure.job_id=await terminalReceipt('failed',failure);}catch(e){failure.failure_persistence_error=String(e.message);}}
 await save('failure.json',failure);
 throw error;
}finally{await db.end();}

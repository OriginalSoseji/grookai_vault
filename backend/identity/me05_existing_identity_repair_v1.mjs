/**
 * MAINTENANCE-ONLY EXECUTION BOUNDARY
 * Fixed reviewed ME05 scope; never invoked by ingestion or recurring workers.
 * Requires explicit identity maintenance and a separately bound execution intent.
 */
import '../env.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {sha256} from '../pricing/one_piece_canonical_import_staging_v1.mjs';
import {pokemonCoverageDatabaseTarget} from '../catalog/pokemon_warehouse_coverage_v1.mjs';
import {VERSION,validateMe05RecoveryPlan,readMe05RecoveryState,assertMe05RecoveryReadback,assertMe05Projections,applyMe05IdentityRecovery} from '../catalog/me05_identity_recovery_v1.mjs';
import {mappingTransactionState,commitMappingTransaction,rollbackMappingTransaction} from '../pricing/exact_mapping_execution_guard_v1.mjs';
import {installIdentityMaintenanceBoundaryV1} from './identity_maintenance_boundary_v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
assert.equal(process.env.ENABLE_IDENTITY_MAINTENANCE_MODE,'true','explicit identity maintenance required');
assert.equal(process.env.IDENTITY_MAINTENANCE_MODE,'EXPLICIT','explicit maintenance mode required');
const {DRY_RUN,assertMaintenanceWriteAllowed}=installIdentityMaintenanceBoundaryV1(import.meta.url);
assert.equal(DRY_RUN,process.env.IDENTITY_MAINTENANCE_DRY_RUN!=='false');
assertMaintenanceWriteAllowed();
const mode=process.env.ME05_RECOVERY_MODE??'plan';assert.ok(['plan','rollback','apply','verify'].includes(mode));
assert.equal(DRY_RUN,!['rollback','apply'].includes(mode),'maintenance dry-run mode mismatch');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const producer=git('rev-parse','HEAD');assert.equal(producer,process.env.ME05_RECOVERY_PRODUCER,'producer mismatch');
assert.equal(git('status','--porcelain','--untracked-files=no'),'','tracked source must be clean');
const planBytes=fs.readFileSync(path.join(root,'docs/audits/me05_identity_recovery_20261002/plan.json'));
assert.equal(sha256(planBytes),process.env.ME05_RECOVERY_PLAN_SHA256,'frozen plan bytes');
const plan=JSON.parse(planBytes);
const masterBytes=fs.readFileSync(path.join(root,'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_cards_v1.json'));
assert.equal(sha256(masterBytes),plan.master_sha256,'Master artifact drift');
const facts=JSON.parse(masterBytes).cards.filter(c=>c.set_key==='me05');validateMe05RecoveryPlan(plan,facts);
const receipt=process.env.ME05_RECOVERY_RECEIPT;assert.ok(receipt&&path.isAbsolute(receipt));assert.ok(!fs.existsSync(receipt));
const intentPath=process.env.ME05_RECOVERY_INTENT;
if(['rollback','apply'].includes(mode)){
  assert.ok(intentPath);const intent=JSON.parse(fs.readFileSync(intentPath));
  assert.equal(intent.version,VERSION);assert.equal(intent.producer,producer);assert.equal(intent.plan_sha256,sha256(planBytes));
  assert.equal(intent.mode,mode);assert.ok(intent.user_instruction?.length>20);assert.ok(intent.scope==='120 existing ME05 identities; preserve parents, printings, mappings and prices');
  const age=Date.now()-Date.parse(intent.authorized_at);assert.ok(age>=0&&age<86400000,'expired intent');
  if(mode==='apply'){
    const rollback=JSON.parse(fs.readFileSync(process.env.ME05_RECOVERY_ROLLBACK_RECEIPT));
    assert.equal(rollback.status,'rolled_back_verified');assert.equal(rollback.producer,producer);assert.equal(rollback.plan_sha256,sha256(planBytes));
    assert.ok(Date.now()-Date.parse(rollback.finished_at)<3600000,'fresh rollback proof required');
  }
}
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
assert.match(fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
const url=pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL);assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED,'0');
url.port='5432';
const db=new pg.Client({connectionString:url.href,ssl:{rejectUnauthorized:true,ca:fs.readFileSync(process.env.ME05_RECOVERY_CA,'utf8')},
  application_name:VERSION,statement_timeout:120000,connectionTimeoutMillis:15000,
  ...(['plan','verify'].includes(mode)?{options:'-c default_transaction_read_only=on'}:{})});
const state=mappingTransactionState();const result={version:VERSION,mode,producer,plan_sha256:sha256(planBytes),started_at:new Date().toISOString(),transaction:state};
// An existing pending receipt blocks repeat execution, including lost commit responses.
const pending=receipt+'.pending.json';fs.writeFileSync(pending,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
await db.connect();try{
  const sanity=(await db.query('select (select count(*)::int from public.card_prints) cards,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits')).rows[0];
  assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000);result.sanity=sanity;
  if(['plan','verify'].includes(mode)){
    await db.query('begin isolation level repeatable read read only');
    assertMe05RecoveryReadback(plan,await readMe05RecoveryState(db),{after:mode==='verify'});
    if(mode==='plan')await assertMe05Projections(db,plan);
    await db.query('rollback');result.status=mode==='plan'?'plan_verified':'independent_readback_verified';
  }else{
    await db.query('begin isolation level serializable');await db.query("set local lock_timeout='5s'");
    await applyMe05IdentityRecovery(db,plan,facts);
    if(mode==='rollback'){
      await rollbackMappingTransaction(db,state);assertMe05RecoveryReadback(plan,await readMe05RecoveryState(db));result.status='rolled_back_verified';
    }else{
      await commitMappingTransaction(db,state);result.status='committed_pending_independent_readback';
    }
  }
}catch(error){
  if(!['plan','verify'].includes(mode))await rollbackMappingTransaction(db,state).catch(()=>{});
  result.status=state.commit_uncertain?'commit_uncertain':'failed';result.error=error.message;process.exitCode=1;
}finally{
  await db.end();result.finished_at=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}

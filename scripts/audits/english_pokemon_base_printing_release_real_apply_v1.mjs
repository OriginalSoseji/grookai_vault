import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import '../../backend/env.mjs';
import {assertPrintingDatabaseTarget} from '../../backend/catalog/master_index_printing_execution_guard_v1.mjs';
import {buildPrintingAdmissionPlan} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {
  PACKAGE_ID,PROJECT_REF,VERSION,approvalText,assertBefore,assertExact,buildContext,
  codeBinding,connect,loadAuthority,readState,stableHash,writeExclusive,
} from './english_pokemon_base_printing_release_guarded_dry_run_v1.mjs';

const APPLY_VERSION='ENGLISH_POKEMON_BASE_PRINTING_RELEASE_REAL_APPLY_V1';
const sha256=value=>createHash('sha256').update(value).digest('hex');

function parseArgs(argv){
 const options={apply:false};
 for(const token of argv){
  if(token==='--apply'){assert.equal(options.apply,false,'repeated_apply');options.apply=true;continue;}
  const match=/^--(out-dir|expected-head-sha|fingerprint|dry-run-artifact)=(.+)$/.exec(token);
  assert.ok(match&&!options[match[1]],`unknown_or_repeated_argument:${token}`);options[match[1]]=match[2];
 }
 assert.equal(options.apply,true,'--apply is required');
 assert.match(options['expected-head-sha']??'',/^[a-f0-9]{40}$/,'--expected-head-sha is required');
 assert.match(options.fingerprint??'',/^[a-f0-9]{64}$/,'--fingerprint is required');
 assert.ok(options['dry-run-artifact'],'--dry-run-artifact is required');
 assert.ok(options['out-dir'],'--out-dir is required');
 return{expectedHead:options['expected-head-sha'],fingerprint:options.fingerprint,
  dryRunArtifact:path.resolve(options['dry-run-artifact']),outDir:path.resolve(options['out-dir'])};
}

function git(...args){return execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();}

async function loadDryRun(file){
 const bytes=await fs.readFile(file),value=JSON.parse(bytes);
 assert.equal(value.package_id,PACKAGE_ID,'dry_run_package_changed');
 assert.equal(value.rollback_only,true,'dry_run_must_be_rollback_only');
 assert.equal(value.execution_authorized,false,'dry_run_cannot_authorize_execution');
 assert.equal(value.production_project_ref,PROJECT_REF,'dry_run_project_changed');
 assert.equal(value.proof?.rollback_verified,true,'dry_run_rollback_not_verified');
 assert.equal(value.proof?.before_snapshot?.hash_sha256,value.proof?.after_snapshot?.hash_sha256,'dry_run_proof_mismatch');
 return{bytes,value,sha256:sha256(bytes)};
}

async function sanity(client){
 const server=(await client.query('select current_database() database,current_user username')).rows[0];
 assert.deepEqual(server,{database:'postgres',username:'postgres'});
 const counts=(await client.query(`select (select count(*)::integer from public.card_prints) card_prints,(select count(*)::integer from public.sets) sets,(select count(*)::integer from public.card_print_traits) traits`)).rows[0];
 assert.ok(counts.card_prints>=40000&&counts.sets>=150&&counts.traits>=5000,'canonical_environment_invariant_failed');
 return counts;
}

async function insertExact(client,context){
 const rawResult=await client.query(`insert into public.raw_imports(id,source,status,notes,payload,processed_at) values($1::bigint,$2,$3,$4,$5::jsonb,now())`,[context.raw.id,context.raw.source,context.raw.status,context.raw.notes,JSON.stringify(context.raw.payload)]);
 assert.equal(rawResult.rowCount,1,'raw_receipt_insert_count_changed');
 const childResult=await client.query(`insert into public.card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref,created_by)
  select id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref,created_by
  from jsonb_to_recordset($1::jsonb) item(id uuid,card_print_id uuid,finish_key text,printing_gv_id text,is_provisional boolean,provenance_source text,provenance_ref text,created_by text)`,[JSON.stringify(context.children)]);
 assert.equal(childResult.rowCount,141,'child_printing_insert_count_changed');
 const reviewResult=await client.query(`insert into public.card_printing_truth_reviews(id,card_printing_id,review_status,public_visibility,active,reason,confidence,evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,source_report_path,reviewed_by,reviewed_at)
  select id,card_printing_id,review_status,public_visibility,active,reason,confidence,evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,source_report_path,reviewed_by,reviewed_at
  from jsonb_to_recordset($1::jsonb) item(id uuid,card_printing_id uuid,review_status text,public_visibility text,active boolean,reason text,confidence text,evidence_sources_checked text[],evidence_sources_for_finish text[],expected_finish_keys text[],evidence jsonb,source_report_path text,reviewed_by text,reviewed_at timestamptz)`,[JSON.stringify(context.reviews)]);
 assert.equal(reviewResult.rowCount,141,'truth_review_insert_count_changed');
 return{raw_receipts:rawResult.rowCount,printing_inserts:childResult.rowCount,truth_review_inserts:reviewResult.rowCount};
}

async function main(){
 const options=parseArgs(process.argv.slice(2));
 assert.equal(git('rev-parse','HEAD'),options.expectedHead,'source_commit_mismatch');
 assert.equal(git('status','--porcelain'),'','working_tree_must_be_clean');
 const worktree=path.resolve(process.cwd()).toLowerCase(),output=options.outDir.toLowerCase();
 assert.ok(output!==worktree&&!output.startsWith(`${worktree}${path.sep}`),'apply_artifacts_must_stay_outside_worktree');
 const dryRun=await loadDryRun(options.dryRunArtifact);
 assert.equal(dryRun.value.source_commit,options.expectedHead,'dry_run_source_commit_changed');
 assert.equal(dryRun.value.package_fingerprint_sha256,options.fingerprint,'dry_run_fingerprint_changed');
 assert.equal(process.env.GROOKAI_PRODUCTION_APPROVAL,dryRun.value.approval_text,'exact_founder_approval_text_required');
 await fs.mkdir(options.outDir,{recursive:false});
 const publicUrl=new URL(process.env.SUPABASE_URL??'');
 assert.equal(publicUrl.hostname,`${PROJECT_REF}.supabase.co`,'production_project_ref_mismatch');
 const databaseUrl=assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL??'');
 const authority=await loadAuthority(),code=await codeBinding();
 const client=await connect(databaseUrl,'english_pokemon_base_printing_release_real_apply_v1');
 let context,before,afterCommit=null,counts,environmentSanity,writerError=null,commitAttempted=false,commitAcknowledged=false;
 try{
  environmentSanity=await sanity(client);
  const existing=(await client.query(`select id::text,card_print_id::text,finish_key,printing_gv_id from public.card_printings where card_print_id=any($1::uuid[]) order by id`,[authority.manifest.parents.map(row=>row.id)])).rows;
  const plan=buildPrintingAdmissionPlan(authority.manifest,existing);
  assert.equal(plan.inserts.length,141);assert.equal(plan.retained.length,0);
  context=buildContext({authority,plan,expectedHead:options.expectedHead,code});
  assert.equal(context.packageFingerprint,options.fingerprint,'recomputed_package_fingerprint_changed');
  assert.deepEqual(dryRun.value.authority,context.packageAuthority,'dry_run_authority_changed');
  assert.deepEqual(dryRun.value.code,context.code,'dry_run_code_binding_changed');
  const proofHash=dryRun.value.proof.before_snapshot.hash_sha256;
  const exactApproval=approvalText(context,options.expectedHead,proofHash);
  assert.equal(dryRun.value.approval_text,exactApproval,'dry_run_approval_text_changed');
  assert.equal(process.env.GROOKAI_PRODUCTION_APPROVAL,exactApproval,'exact_founder_approval_text_required');
  before=await readState(client,context);assertBefore(before,context);
  assert.equal(before.hash_sha256,proofHash,'production_state_changed_since_dry_run');
  await client.query('begin isolation level serializable');
  await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${PACKAGE_ID}:c72b4744-db4d-565f-9914-e28a2b244f5c`]);
  await client.query("set local lock_timeout='5s'");await client.query("set local statement_timeout='60s'");
  const locked=(await client.query('select id::text from public.card_prints where set_id=$1::uuid order by id for update',['c72b4744-db4d-565f-9914-e28a2b244f5c'])).rows;
  assert.equal(locked.length,141,'locked_parent_count_changed');
  const insideBefore=await readState(client,context);assert.equal(insideBefore.hash_sha256,before.hash_sha256,'precommit_state_drift');assertBefore(insideBefore,context);
  counts=await insertExact(client,context);
  await assertExact(client,context,before);
  commitAttempted=true;await client.query('commit');commitAcknowledged=true;
  afterCommit=await assertExact(client,context,before);
 }catch(error){
  writerError=error;
  if(!commitAttempted)await client.query('rollback').catch(()=>{});
 }finally{await client.end();}
 if(writerError&&!commitAttempted)throw writerError;

 const verify=await connect(databaseUrl,'english_pokemon_base_printing_release_independent_readback_v1');
 let independent,independentOutcome='unknown';
 try{
  await verify.query('begin isolation level repeatable read read only');
  try{independent=await assertExact(verify,context,before);independentOutcome='applied_exact';}
  catch(exactError){
   const candidate=await readState(verify,context);
   if(candidate.hash_sha256===before.hash_sha256){assertBefore(candidate,context);independent=candidate;independentOutcome='not_applied';}
   else{independent=candidate;independentOutcome='unknown_mismatched_state';}
  }
  await verify.query('commit');
 }finally{await verify.end();}

 const status=independentOutcome==='applied_exact'?(commitAcknowledged?'applied_and_verified':'committed_by_independent_readback'):independentOutcome;
 const report={version:APPLY_VERSION,package_id:PACKAGE_ID,generated_at:new Date().toISOString(),production_project_ref:PROJECT_REF,source_commit:options.expectedHead,package_fingerprint_sha256:context?.packageFingerprint??options.fingerprint,manifest_fingerprint_sha256:context?.manifest?.fingerprint??null,dry_run_artifact:options.dryRunArtifact,dry_run_artifact_sha256:dryRun.sha256,dry_run_rollback_proof:`${dryRun.value.proof.before_snapshot.hash_sha256} == ${dryRun.value.proof.after_snapshot.hash_sha256}`,approval_sha256:sha256(process.env.GROOKAI_PRODUCTION_APPROVAL??''),execution:{status,commit_attempted:commitAttempted,commit_acknowledged:commitAcknowledged,writer_error:writerError?String(writerError.message??writerError):null,counts:counts??null,boundaries:context?.packageAuthority?.boundaries??null,environment_sanity:environmentSanity,before_snapshot:before,after_commit_snapshot:afterCommit,independent_readback:independent,independent_outcome:independentOutcome}};
 await writeExclusive(path.join(options.outDir,'real_apply.json'),report);
 if(independentOutcome!=='applied_exact')throw new Error(independentOutcome==='not_applied'?'commit_not_applied_after_independent_readback':'commit_outcome_unknown_after_independent_readback');
 if(afterCommit)assert.equal(independent.hash_sha256,afterCommit.hash_sha256,'independent_readback_mismatch');
 assert.equal(stableHash(context.packageAuthority),options.fingerprint,'final_package_fingerprint_changed');
 process.stdout.write(`${JSON.stringify({package_id:PACKAGE_ID,fingerprint:options.fingerprint,source_commit:options.expectedHead,status,counts,independent_readback:true,output:path.join(options.outDir,'real_apply.json')},null,2)}\n`);
}

main().catch(error=>{console.error(error.stack??error.message);process.exitCode=1;});

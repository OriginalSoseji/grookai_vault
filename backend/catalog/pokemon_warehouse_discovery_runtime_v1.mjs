import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

export const CYCLE_VERSION='POKEMON_WAREHOUSE_DISCOVERY_CYCLE_V1';
export const RELEASE_VERSION='POKEMON_DISCOVERY_RELEASE_V1';
export const RUNTIME_FILES=Object.freeze([
 'backend/catalog/pokemon_warehouse_coverage_v1.mjs',
 'backend/catalog/pokemon_warehouse_discovery_intake_v1.mjs',
 'backend/catalog/pokemon_warehouse_discovery_runtime_v1.mjs',
 'scripts/workers/pokemon_warehouse_discovery_intake_v1.mjs',
 'scripts/workers/pokemon_warehouse_discovery_cycle_v1.mjs',
 'package.json','package-lock.json',
]);
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function claimCycleMarker(state,run){
 const marker=path.join(state,'inflight.json');assert.ok(!fs.existsSync(marker),'previous_cycle_requires_independent_reconciliation');
 fs.writeFileSync(marker,JSON.stringify(run,null,2)+'\n',{flag:'wx',mode:0o600});return marker;
}
export function completeCycleMarker(marker,runId){
 assert.equal(JSON.parse(fs.readFileSync(marker,'utf8')).run_id,runId,'foreign_cycle_marker');fs.unlinkSync(marker);
}
export function dependencyFiles(root){
 const result={};
 function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=path.join(dir,entry.name),relative=path.relative(root,p).split(path.sep).join('/');
  assert.ok(!entry.isSymbolicLink(),'dependency_symlink_forbidden');
  if(entry.isDirectory())visit(p);else if(entry.isFile()&&relative!=='node_modules/.package-lock.json')result[relative]=sha256(fs.readFileSync(p));
 }}
 assert.ok(!fs.lstatSync(path.join(root,'node_modules')).isSymbolicLink());visit(path.join(root,'node_modules'));assert.ok(Object.keys(result).length>0);return result;
}
export function verifyRuntimeRelease(root,manifest,producer){
 assert.equal(manifest.version,RELEASE_VERSION);assert.match(producer,/^[a-f0-9]{40}$/);assert.equal(manifest.producer_commit,producer);
 assert.equal(Number(process.versions.node.split('.')[0]),manifest.node_major,'qualified_node_major_required');
 assert.deepEqual(Object.keys(manifest.files).sort(),[...RUNTIME_FILES].sort(),'exact_runtime_files_required');
 for(const file of RUNTIME_FILES){const target=path.join(root,file);assert.ok(!fs.lstatSync(target).isSymbolicLink(),'runtime_symlink_forbidden');assert.equal(sha256(fs.readFileSync(target)),manifest.files[file],`runtime_drift:${file}`);}
 assert.deepEqual(dependencyFiles(root),manifest.dependencies,'dependency_drift');return manifest;
}
export function authorizeRecurringPlan(policy,plan,{producer,manifestSha}){
 assert.equal(policy.version,CYCLE_VERSION);assert.equal(policy.enabled,true);assert.equal(policy.purpose,'review_only_raw_and_discovery_intake');
 assert.equal(policy.producer_commit,producer);assert.equal(policy.release_manifest_sha256,manifestSha);
 assert.deepEqual(policy.categories,[3,85]);assert.deepEqual(policy.allowed_tables,['raw_imports','external_discovery_candidates','ingestion_jobs']);
 assert.equal(policy.batch_size,500);assert.ok(Number.isInteger(policy.max_new_products)&&policy.max_new_products>0&&policy.max_new_products<=5000);
 assert.ok(policy.authority&&policy.operator);assert.ok(plan.entries.length<=policy.max_new_products,'recurring_scope_ceiling_exceeded');
 assert.ok(plan.entries.every(e=>policy.categories.includes(Number(e.source.category_id))));
 for(const key of ['canonical_writes','pricing_writes','warehouse_promotion_writes'])assert.equal(plan[key],0);
 return {approved:true,producer_commit:producer,plan_fingerprint:plan.fingerprint,operator:policy.operator,request:policy.authority,recurring_policy_sha256:sha256(JSON.stringify(policy)),scope:'review_only_raw_and_discovery_intake'};
}
export async function persistCycleRun(db,{jobId=null,status,payload}){
 assert.ok(['running','succeeded','failed'].includes(status));assert.equal(payload.version,CYCLE_VERSION);assert.ok(payload.run_id&&payload.producer_commit);
 const r=jobId===null
  ?await db.query('insert into public.ingestion_jobs(job_type,status,attempts,last_attempt_at,payload) values($1,$2,1,now(),$3::jsonb) returning id',[CYCLE_VERSION,status,JSON.stringify(payload)])
  :await db.query('update public.ingestion_jobs set status=$2,last_attempt_at=now(),payload=$3::jsonb where id=$1 and job_type=$4 returning id',[jobId,status,JSON.stringify(payload),CYCLE_VERSION]);
 assert.equal(r.rowCount,1);return String(r.rows[0].id);
}
export function compressCompletedCoverage(runDir){
 // Only this successful run's coverage report is replaced, after exact recovery proof.
 const source=path.join(runDir,'apply','coverage.json'),dest=source+'.gz';
 assert.ok(!fs.lstatSync(source).isSymbolicLink());const bytes=fs.readFileSync(source),compressed=gzipSync(bytes,{level:6});
 fs.writeFileSync(dest,compressed,{flag:'wx',mode:0o600});assert.deepEqual(gunzipSync(fs.readFileSync(dest)),bytes);
 const receipt={relative_path:'apply/coverage.json.gz',encoding:'gzip',source_sha256:sha256(bytes),compressed_sha256:sha256(compressed),source_bytes:bytes.length,compressed_bytes:compressed.length};
 fs.writeFileSync(path.join(runDir,'coverage-compression.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});fs.unlinkSync(source);return receipt;
}

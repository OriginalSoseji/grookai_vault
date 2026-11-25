import assert from 'node:assert/strict';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
export const PROJECT='ycdxbpibncqcchqiihfz';
export const RELEASE_VERSION='GAMESTOP_REGISTRY_FIFTEEN_RELEASE_V1';
export const MUTATION_SCOPE=Object.freeze({identity_inserts_maximum:15,audit_rows_per_run:1,updates:0,deletes:0,parent_writes:0,printing_writes:0,review_writes:0,owner_writes:0,image_writes:0,mapping_writes:0,pricing_writes:0,schema_changes:0});
const uuid=s=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s??'');

export function assertGameStopReleaseContext({authority,plan,codeFingerprint,runId,mode,rollbackReceipt,committedReceipt,now}){
 assert.ok(authority,'Exact owner release decision required');const{fingerprint,...body}=authority;assert.equal(hash(body),fingerprint,'Authority fingerprint mismatch');
 assert.equal(authority.version,RELEASE_VERSION);assert.equal(authority.status,'explicit_owner_approval');assert.equal(authority.project_ref,PROJECT);
 assert.equal(authority.plan_fingerprint,plan.fingerprint);assert.match(codeFingerprint??'',/^[a-f0-9]{64}$/);assert.equal(authority.code_fingerprint,codeFingerprint);
 assert.deepEqual(authority.scope,MUTATION_SCOPE);assert.ok(['rollback','apply'].includes(mode));assert.ok(uuid(runId));
 assert.ok(Array.isArray(authority.runs)&&authority.runs.length>=2&&authority.runs.length<=4);assert.equal(new Set(authority.runs.map(r=>r.run_id)).size,authority.runs.length);
 for(const run of authority.runs){assert.ok(uuid(run.run_id));assert.ok(['rollback','apply'].includes(run.mode));assert.ok([0,15].includes(run.expected_identity_inserts));}
 const selected=authority.runs.find(r=>r.run_id===runId);assert.ok(selected,'Run is outside approved scope');assert.equal(selected.mode,mode);
 const approved=Date.parse(authority.approved_at),expires=Date.parse(authority.expires_at),time=Date.parse(now);
 assert.ok(Number.isFinite(time)&&approved<=time&&time<expires&&expires>approved&&expires-approved<=86400000,'Owner authority expired or invalid');
 assert.ok(authority.approval_record_ref?.trim());assert.ok(authority.approval_text?.includes(plan.fingerprint)&&authority.approval_text.includes(codeFingerprint),'Owner decision must bind exact plan and source');
 if(mode==='apply'){
  assert.ok(rollbackReceipt,'Fresh production rollback required');assert.equal(rollbackReceipt.environment,'production');assert.equal(rollbackReceipt.mode,'rollback');
  assert.equal(rollbackReceipt.planFingerprint,plan.fingerprint);assert.equal(rollbackReceipt.codeFingerprint,codeFingerprint);assert.equal(rollbackReceipt.rollbackProven,true);
  assert.equal(rollbackReceipt.committed,false);assert.equal(rollbackReceipt.commitUncertain,false);assert.equal(rollbackReceipt.auditPersisted,true);
  const bound=authority.runs.find(r=>r.run_id===rollbackReceipt.runId);assert.equal(bound?.mode,'rollback');
  assert.equal(rollbackReceipt.inserts,bound.expected_identity_inserts);assert.equal(rollbackReceipt.exactReadback,true);
  const age=time-Date.parse(rollbackReceipt.finishedAt);assert.ok(age>=0&&age<3600000,'Production rollback is stale');
  if(selected.expected_identity_inserts===0){assertGameStopCommittedReceipt(committedReceipt,{plan,codeFingerprint});const original=authority.runs.find(r=>r.run_id===committedReceipt.runId);assert.equal(original?.mode,'apply');assert.equal(original.expected_identity_inserts,15,'Original apply must belong to this release');}
 }
 return Object.freeze({...selected});
}

export function assertGameStopCommittedReceipt(receipt,{plan,codeFingerprint}){
 assert.ok(receipt,'Exact committed apply receipt required');assert.equal(receipt.environment,'production');assert.equal(receipt.mode,'apply');assert.equal(receipt.inserts,15);
 assert.equal(receipt.planFingerprint,plan.fingerprint);assert.equal(receipt.codeFingerprint,codeFingerprint);assert.equal(receipt.committed,true);assert.equal(receipt.commitUncertain,false);assert.equal(receipt.auditPersisted,true);assert.equal(receipt.identityRows?.length,15);
}

export function assertGameStopProductionClient(client){
 const p=client.connectionParameters;assert.equal(p.database,'postgres');assert.equal(Number(p.port),5432);
 assert.equal(p.ssl?.rejectUnauthorized,true);assert.equal(client.connection?.stream?.authorized,true);
 assert.ok((p.host===`db.${PROJECT}.supabase.co`&&p.user==='postgres')||(p.host==='aws-1-us-east-2.pooler.supabase.com'&&p.user===`postgres.${PROJECT}`),'Canonical verified-TLS session required');
 assert.equal(p.application_name,'gamestop_registry_fifteen_maintenance_v1','Dedicated maintenance connection required');
}

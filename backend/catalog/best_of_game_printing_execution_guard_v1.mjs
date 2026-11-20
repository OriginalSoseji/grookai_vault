import assert from 'node:assert/strict';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
import {assertPrintingDatabaseTarget} from './master_index_printing_execution_guard_v1.mjs';

export const PROJECT='ycdxbpibncqcchqiihfz';
export const VERSION='BEST_OF_GAME_PRINTING_EXECUTION_V1';
const expected={retained_parents:22,retained_children:16,children_after:18,bp_children_after:9,raw:1,printing_inserts:2,reviews:2,updates:0};
const boundaries={parent_writes:0,existing_row_updates:0,ownership_writes:0,mapping_writes:0,pricing_writes:0,image_writes:0,deletes:0,other_set_writes:0};
export {assertPrintingDatabaseTarget as assertBestOfGameDatabaseTarget};

export function assertBestOfGameProductionClient(client) {
 const c=client?.connectionParameters;assert.ok(c,'Verified production client required');
 const direct=c.host===`db.${PROJECT}.supabase.co`&&c.user==='postgres';
 const pooler=c.host==='aws-1-us-east-2.pooler.supabase.com'&&c.user===`postgres.${PROJECT}`;
 assert.ok(direct||pooler,'Wrong canonical production target');assert.equal(c.database,'postgres');assert.ok([5432,6543].includes(Number(c.port)));
 assert.equal(c.ssl?.rejectUnauthorized,true,'Verified TLS required');assert.equal(client.connection?.stream?.authorized,true,'Authenticated verified TLS connection required');
}

export function assertBestOfGameExecutionAuthority(authority,{plan,codeFingerprint,mode,now=Date.now()}) {
 assert.ok(['rollback','apply'].includes(mode));assert.equal(plan.version,VERSION);assert.equal(plan.project_ref,PROJECT);
 const {fingerprint:planFingerprint,...planBody}=plan;assert.equal(hash(planBody),planFingerprint);
 assert.deepEqual(plan.expected,expected);assert.deepEqual(plan.boundaries,boundaries);
 assert.ok(authority&&typeof authority==='object','Explicit bounded founder authority required');
 const {fingerprint,...body}=authority;assert.equal(hash(body),fingerprint,'Authority fingerprint mismatch');
 assert.equal(authority.version,'BEST_OF_GAME_PRINTING_EXECUTION_AUTHORITY_V1');assert.equal(authority.status,'explicit_founder_approval');
 assert.equal(authority.project_ref,PROJECT);assert.equal(authority.execution_version,VERSION);
 assert.equal(authority.plan_fingerprint,plan.fingerprint);assert.match(codeFingerprint??'',/^[a-f0-9]{64}$/);assert.equal(authority.code_fingerprint,codeFingerprint);
 assert.deepEqual(authority.expected,expected);assert.deepEqual(authority.boundaries,boundaries);
 assert.ok(Array.isArray(authority.modes)&&authority.modes.length>0&&authority.modes.every(m=>['rollback','apply'].includes(m))&&new Set(authority.modes).size===authority.modes.length&&authority.modes.includes(mode));
 assert.ok(typeof authority.approval_record_ref==='string'&&authority.approval_record_ref.trim());
 assert.ok(typeof authority.approval_text==='string'&&authority.approval_text.includes(plan.fingerprint)&&authority.approval_text.includes(codeFingerprint),'Approval must bind exact plan and code');
 const approved=Date.parse(authority.approved_at),expires=Date.parse(authority.expires_at);
 assert.ok(Number.isFinite(approved)&&approved<=now);assert.ok(Number.isFinite(expires)&&expires>now&&expires>approved&&expires-approved<=86400000,'Authority expires within24 hours');
 return authority;
}

export function assertBestOfGameRollbackReceipt(receipt,{plan,codeFingerprint,now=Date.now()}) {
 assert.ok(receipt,'Fresh production rollback proof required');assert.equal(receipt.version,VERSION);assert.equal(receipt.environment,'production');assert.equal(receipt.project_ref,PROJECT);
 assert.equal(receipt.mode,'rollback');assert.equal(receipt.fingerprint,plan.fingerprint);assert.equal(receipt.code?.fingerprint,codeFingerprint);
 assert.equal(receipt.rollback_proven,true);assert.equal(receipt.exact_readback,true);assert.equal(receipt.committed,false);assert.equal(receipt.commit_uncertain,false);
 const age=now-Date.parse(receipt.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'Production rollback proof stale or future');
}

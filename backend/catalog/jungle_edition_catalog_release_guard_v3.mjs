import assert from 'node:assert/strict';
import {JUNGLE_RELEASE_EXECUTION_V3} from './jungle_edition_catalog_release_v3.mjs';
const PROJECT='ycdxbpibncqcchqiihfz';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';

export function assertJungleReleaseDatabaseTarget(connectionString) {
 const url=new URL(connectionString);
 assert.ok(['postgres:','postgresql:'].includes(url.protocol));
 assert.equal(url.hostname,'aws-1-us-east-2.pooler.supabase.com','Wrong database host');
 assert.equal(decodeURIComponent(url.username),`postgres.${PROJECT}`,'Wrong database project');
 assert.equal(url.pathname,'/postgres');assert.ok(['5432','6543'].includes(url.port));
 // URL options must not override the verified transport or startup behavior.
 for(const key of url.searchParams.keys())assert.ok(['sslmode','sslcert','sslkey','sslrootcert'].includes(key),'Unexpected connection option');
 url.search='';return url;
}

export function assertJungleReleaseExecutionAuthority(authority,{plan,codeFingerprint,mode,now=Date.now()}) {
 assert.ok(['rollback','apply'].includes(mode));assert.equal(plan.target,'production','Local rehearsal never grants production authority');
 const {fingerprint,...body}=authority;assert.equal(hash(body),fingerprint,'Authority fingerprint mismatch');
 assert.equal(authority.version,'JUNGLE_CATALOG_RELEASE_AUTHORITY_V3');
 assert.equal(authority.status,'explicit_founder_approval');
 assert.equal(authority.project_ref,PROJECT);assert.equal(authority.execution_version,JUNGLE_RELEASE_EXECUTION_V3);
 assert.equal(authority.plan_fingerprint,plan.fingerprint);assert.equal(authority.code_fingerprint,codeFingerprint);
 assert.deepEqual(authority.counts,Object.fromEntries(Object.entries(plan.rows).map(([t,rows])=>[t,rows.length])));assert.deepEqual(authority.boundaries,plan.boundaries);
 assert.ok(Array.isArray(authority.modes)&&authority.modes.includes(mode)&&authority.modes.every(m=>['rollback','apply'].includes(m)));
 assert.ok(typeof authority.approval_record_ref==='string'&&authority.approval_record_ref.trim());
 assert.ok(typeof authority.approval_text==='string'&&authority.approval_text.includes(plan.fingerprint)&&authority.approval_text.includes(codeFingerprint),'Approval must bind exact plan and code');
 assert.ok(Number.isFinite(Date.parse(authority.approved_at))&&Date.parse(authority.approved_at)<=now,'Invalid approval time');
 assert.ok(Date.parse(authority.expires_at)>now,'Expired authority');
 return authority;
}

export function assertJungleReleaseRollbackReceipt(receipt,{plan,codeFingerprint,now=Date.now()}) {
 assert.equal(receipt.mode,'rollback');assert.equal(receipt.fingerprint,plan.fingerprint);
 assert.equal(receipt.code.fingerprint,codeFingerprint);assert.equal(receipt.project_ref,PROJECT);
 assert.equal(receipt.rollbackProven,true);assert.equal(receipt.after,'exact');assert.equal(receipt.target,'production');assert.equal(receipt.activation,false);assert.equal(receipt.dependenciesPreserved,true);
 assert.equal(receipt.committed,false);assert.equal(receipt.commitUncertain,false);assert.equal(receipt.rollbackUncertain,false);
 assert.deepEqual(receipt.writes,Object.fromEntries(Object.entries(plan.rows).map(([t,rows])=>[t,rows.length]))); 
 const age=now-Date.parse(receipt.finished_at);assert.ok(Number.isFinite(age)&&age>=0&&age<3600000,'Rollback proof stale or future');
}

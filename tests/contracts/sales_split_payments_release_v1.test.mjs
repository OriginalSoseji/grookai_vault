import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {splitRelease,validateSplitReleaseArguments,splitReleaseSources} from '../../scripts/schema/verify_sales_split_payments_release_v1.mjs';

for(const phase of ['AuditLinkedSchema','PrePush'])test('split release accepts read-only phase '+phase,()=>assert.equal(validateSplitReleaseArguments([phase]),phase));
for(const args of [[],['apply'],['PrePush','--target=other'],['AuditLinkedSchema','PrePush']])test('split release rejects unbounded arguments '+JSON.stringify(args),()=>assert.throws(()=>validateSplitReleaseArguments(args)));
const baseline=Object.fromEntries(Array.from({length:428},(_,i)=>[String(20000101000000+i)+'_synthetic.sql',String(i)]));
const candidate={...baseline,[splitRelease.deferred]:splitRelease.deferredSha256,[splitRelease.migration]:splitRelease.migrationSha256};
test('split release admits only the unchanged complete baseline and exact candidate',()=>splitReleaseSources(candidate,baseline));
for(const [name,change]of [
 ['altered historical SQL',s=>s[Object.keys(baseline)[0]]='changed'],
 ['altered deferred SQL',s=>s[splitRelease.deferred]='changed'],
 ['missing deferred source history',s=>delete s[splitRelease.deferred]],
 ['altered candidate SQL',s=>s[splitRelease.migration]='changed'],
 ['missing historical SQL',s=>delete s[Object.keys(baseline)[0]]],
 ['extra pending migration',s=>s['20261005090000_other.sql']='other'],
 ['renamed pending migration',s=>{delete s[splitRelease.migration];s['20261006140000_other.sql']=splitRelease.migrationSha256;}],
 ['duplicate timestamp',s=>{const key=Object.keys(baseline)[0];delete s[key];s['20261006140000_duplicate.sql']=baseline[key];}],
])test('split release blocks '+name,()=>{const s={...candidate};change(s);assert.throws(()=>splitReleaseSources(s,baseline));});
for(const args of [
 ['-Phase','PrePush','-SalesSplitPaymentsReleaseV1'],
 ['-Phase','PrePush','-SalesSplitPaymentsReleaseV1','-ExpectedLocalOnlyIds','20261005090000'],
 ['-Phase','AuditLinkedSchema','-SalesSplitPaymentsReleaseV1','-JungleProjectionV37'],
 ['-Phase','AuditLinkedSchema','-SalesSplitPaymentsReleaseV1','-AuditOutDir','C:/unexpected'],
])test('PowerShell split gate rejects invalid scope before database access '+args.join(' '),()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1',...args],{encoding:'utf8',timeout:20000,windowsHide:true});
 assert.notEqual(r.status,0);assert.match((r.stdout??'')+(r.stderr??''),/Split payments release permits only/);
});
test('prepared package has no apply operation and its CLI push is a dry run',()=>{
 const text=fs.readFileSync('scripts/release/prepare_sales_split_payments_cli_v1.mjs','utf8');
 assert.match(text,/\['prepare','dry-run'\]\.includes\(mode\)/);
 assert.match(text,/\['db','push','--linked','--include-all','--dry-run','--yes'\]/);
 assert.match(text,/default_transaction_read_only=on/);
 assert.match(text,/Preparation intent consumed; preserve package/);
});

test('exact release package excludes only deferred delivery and retains source history',()=>{assert.deepEqual(splitReleaseSources(candidate,baseline),{...baseline,[splitRelease.migration]:splitRelease.migrationSha256});assert.equal(candidate[splitRelease.deferred],splitRelease.deferredSha256);});

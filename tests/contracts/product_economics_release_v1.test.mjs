import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {costRelease,validateCostReleaseArguments,costReleaseSources} from '../../scripts/schema/verify_product_economics_release_v1.mjs';

for(const phase of ['AuditLinkedSchema','PrePush'])test('cost release accepts read-only phase '+phase,()=>assert.equal(validateCostReleaseArguments([phase]),phase));
for(const args of [[],['apply'],['PrePush','--target=other'],['AuditLinkedSchema','PrePush']])test('cost release rejects unbounded arguments '+JSON.stringify(args),()=>assert.throws(()=>validateCostReleaseArguments(args)));
const baseline=Object.fromEntries(Array.from({length:429},(_,i)=>[String(20000101000000+i)+'_synthetic.sql',String(i)]));
const candidate={...baseline,[costRelease.deferred]:costRelease.deferredSha256,[costRelease.migration]:costRelease.migrationSha256};
test('cost release admits only the unchanged complete baseline and exact candidate',()=>costReleaseSources(candidate,baseline));
for(const [name,change]of [
 ['altered historical SQL',s=>s[Object.keys(baseline)[0]]='changed'],
 ['altered deferred SQL',s=>s[costRelease.deferred]='changed'],
 ['missing deferred source history',s=>delete s[costRelease.deferred]],
 ['altered candidate SQL',s=>s[costRelease.migration]='changed'],
 ['missing historical SQL',s=>delete s[Object.keys(baseline)[0]]],
 ['extra pending migration',s=>s['20261005090000_other.sql']='other'],
 ['renamed pending migration',s=>{delete s[costRelease.migration];s['20261007180000_other.sql']=costRelease.migrationSha256;}],
 ['duplicate timestamp',s=>{const key=Object.keys(baseline)[0];delete s[key];s['20261007180000_duplicate.sql']=baseline[key];}],
])test('cost release blocks '+name,()=>{const s={...candidate};change(s);assert.throws(()=>costReleaseSources(s,baseline));});
for(const args of [
 ['-Phase','PrePush','-ProductEconomicsReleaseV1'],
 ['-Phase','PrePush','-ProductEconomicsReleaseV1','-ExpectedLocalOnlyIds','20261005090000'],
 ['-Phase','AuditLinkedSchema','-ProductEconomicsReleaseV1','-JungleProjectionV37'],
 ['-Phase','AuditLinkedSchema','-ProductEconomicsReleaseV1','-AuditOutDir','C:/unexpected'],
])test('PowerShell cost gate rejects invalid scope before database access '+args.join(' '),()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1',...args],{encoding:'utf8',timeout:20000,windowsHide:true});
 assert.notEqual(r.status,0);assert.match((r.stdout??'')+(r.stderr??''),/ProductEconomicsReleaseV1 requires the exact cost-only scope/);
});
test('prepared package has no apply operation and its CLI push is a dry run',()=>{
 const text=fs.readFileSync('scripts/release/prepare_product_economics_cli_v1.mjs','utf8');
 assert.match(text,/\['prepare','dry-run'\]\.includes\(mode\)/);
 assert.match(text,/\['db','push','--linked','--include-all','--dry-run','--yes'\]/);
 assert.match(text,/default_transaction_read_only=on/);
 assert.match(text,/Preparation intent consumed; preserve package/);
});

test('exact release package excludes only deferred delivery and retains source history',()=>{assert.deepEqual(costReleaseSources(candidate,baseline),{...baseline,[costRelease.migration]:costRelease.migrationSha256});assert.equal(candidate[costRelease.deferred],costRelease.deferredSha256);});

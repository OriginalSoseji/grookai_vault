import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {sealedRelease,validateSealedReleaseArguments,validateSealedMigrationSources} from '../../scripts/schema/verify_collectr_sealed_release_v1.mjs';

for(const phase of ['AuditLinkedSchema','PrePush'])test('sealed release accepts read-only phase '+phase,()=>assert.equal(validateSealedReleaseArguments([phase]),phase));
for(const args of [[],['apply'],['PrePush','--target=other'],['AuditLinkedSchema','PrePush']])test('sealed release rejects unbounded arguments '+JSON.stringify(args),()=>assert.throws(()=>validateSealedReleaseArguments(args)));
const baseline=Object.fromEntries(Array.from({length:426},(_,i)=>[String(20000101000000+i)+'_synthetic.sql',String(i)]));
const candidate={...baseline,[sealedRelease.migration]:sealedRelease.migrationSha256};
test('sealed release admits only the unchanged complete baseline and exact candidate',()=>validateSealedMigrationSources(candidate,baseline));
for(const [name,change]of [
 ['altered historical SQL',s=>s[Object.keys(baseline)[0]]='changed'],
 ['altered candidate SQL',s=>s[sealedRelease.migration]='changed'],
 ['missing historical SQL',s=>delete s[Object.keys(baseline)[0]]],
 ['extra pending migration',s=>s['20261005090000_other.sql']='other'],
 ['renamed pending migration',s=>{delete s[sealedRelease.migration];s['20261005080000_other.sql']=sealedRelease.migrationSha256;}],
 ['duplicate timestamp',s=>{const key=Object.keys(baseline)[0];delete s[key];s['20261005080000_duplicate.sql']=baseline[key];}],
])test('sealed release blocks '+name,()=>{const s={...candidate};change(s);assert.throws(()=>validateSealedMigrationSources(s,baseline));});
for(const args of [
 ['-Phase','PrePush','-CollectrSealedReleaseV1'],
 ['-Phase','PrePush','-CollectrSealedReleaseV1','-ExpectedLocalOnlyIds','20261005090000'],
 ['-Phase','AuditLinkedSchema','-CollectrSealedReleaseV1','-JungleProjectionV37'],
 ['-Phase','AuditLinkedSchema','-CollectrSealedReleaseV1','-AuditOutDir','C:/unexpected'],
])test('PowerShell sealed gate rejects invalid scope before database access '+args.join(' '),()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1',...args],{encoding:'utf8',timeout:20000,windowsHide:true});
 assert.notEqual(r.status,0);assert.match((r.stdout??'')+(r.stderr??''),/Collectr sealed release permits only/);
});
test('prepared package has no apply operation and its CLI push is a dry run',()=>{
 const text=fs.readFileSync('scripts/release/prepare_collectr_sealed_cli_v1.mjs','utf8');
 assert.match(text,/\['prepare','dry-run'\]\.includes\(mode\)/);
 assert.match(text,/\['db','push','--linked','--include-all','--dry-run','--yes'\]/);
 assert.match(text,/default_transaction_read_only=on/);
 assert.match(text,/Preparation intent consumed; preserve package/);
});

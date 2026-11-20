import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const verifier=fileURLToPath(new URL('../../scripts/schema/verify_cross_tcg_market_release_v2.mjs',import.meta.url));

test('release verifier rejects invalid phase, extra arguments and non-owned output before reading credentials',()=>{
 for(const args of [['Apply','--out-dir=outside'],['PrePush','--out-dir=outside'],['AuditLinkedSchema','--out-dir=outside'],['AuditLinkedSchema','--out-dir=outside','--target=other']]){
  const result=spawnSync(process.execPath,[verifier,...args],{cwd:root,encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(result.error,undefined);assert.notEqual(result.status,0);assert.match(result.stderr,/AssertionError/);assert.doesNotMatch(result.stderr,/password authentication failed|Environment mismatch|ENOTFOUND|ECONNREFUSED/);
 }
});

const pwsh=spawnSync('pwsh',['-NoProfile','-Command',"Write-Output 'available'"],{encoding:'utf8',timeout:10000,windowsHide:true});
test('PowerShell scope rejects mixed flags, target overrides and wrong/missing pending IDs before invoking the verifier',{skip:pwsh.error?'PowerShell unavailable on this test platform':false},()=>{
 const script='scripts/migration_preflight_strict.ps1';
 for(const extra of [[],['-ExpectedLocalOnlyIds','20261120063001'],['-ExpectedLocalOnlyIds','20261120063000','-ShroudedAliasDiscoveryReleaseV2'],['-ExpectedLocalOnlyIds','20261120063000','-AuditEnvFile','another-target']]){
  const result=spawnSync('pwsh',['-NoProfile','-File',script,'-Phase','PrePush','-CrossTcgMarketReleaseV2','-AuditOutDir','outside',...extra],{cwd:root,encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(result.error,undefined);assert.notEqual(result.status,0);assert.match(result.stderr,/Cross-TCG Market V2 requires exact512 and canonical511/);
 }
});

test('candidate binding freezes every migration and the real baseline evidence',()=>{
 const binding=JSON.parse(readFileSync(new URL('../../scripts/schema/cross_tcg_market_candidate_v2.json',import.meta.url)));
 assert.equal(binding.version,'CROSS_TCG_MARKET_511_TO_512_V2');assert.equal(Object.keys(binding.history).length,511);assert.deepEqual(Object.keys(binding.candidates),['20261120063000_cross_tcg_market_publication_v2.sql']);assert.equal(Object.keys(binding.baselineProofPins).length,3);
});

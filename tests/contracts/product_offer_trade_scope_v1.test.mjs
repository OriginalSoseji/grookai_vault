import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [name,args]of [
 ['cannot grant PrePush authority',['-Phase','PrePush']],
 ['rejects combined purchase scope',['-Phase','AuditLinkedSchema','-ProductPurchaseBaselineV1']],
 ['rejects combined economics scope',['-Phase','AuditLinkedSchema','-ProductEconomicsBaselineV1']],
 ['rejects caller-selected migration set',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261008021000']],
 ['rejects caller-selected output',['-Phase','AuditLinkedSchema','-AuditOutDir','C:/untrusted-policy-output']],
 ['rejects caller-selected credentials',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/untrusted-policy-env']],
])test('offer/trade baseline '+name,()=>{
 const result=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-ProductOfferTradeBaselineV1',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1024*1024});
 assert.ifError(result.error);assert.notEqual(result.status,0);
 assert.match(result.stdout+result.stderr,/ProductOfferTradeBaselineV1 supports only the read-only linked audit before negotiated trade SQL/);
});

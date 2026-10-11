import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
for(const [name,args]of [
 ['cannot be used as a PrePush authorization',['-Phase','PrePush']],
 ['rejects a combined release scope',['-Phase','AuditLinkedSchema','-ReceiptDeliveryReleaseV1']],
 ['rejects a caller-supplied migration set',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261007180000']],
 ['rejects a caller-supplied evidence destination',['-Phase','AuditLinkedSchema','-AuditOutDir','C:/untrusted-cost-output']],
])test('cost baseline '+name,()=>{
 const result=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-ProductEconomicsBaselineV1',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1024*1024});
 assert.ifError(result.error);assert.notEqual(result.status,0);
 assert.match(result.stdout+result.stderr,/ProductEconomicsBaselineV1 supports only the read-only linked audit/);
});

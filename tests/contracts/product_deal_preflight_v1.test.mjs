import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const script=fileURLToPath(new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url));
for(const [name,args,expected]of [
 ['baseline cannot become PrePush',['-Phase','PrePush','-ProductDealBaselineV1'],'supports only the fixed read-only'],
 ['release requires exact PrePush additions',['-Phase','PrePush','-ProductDealReleaseV1'],'requires exactly cost, purchase and negotiated Trade'],
 ['cost-only scope cannot qualify Buy and Trade',['-Phase','PrePush','-ProductDealReleaseV1','-ExpectedLocalOnlyIds','20261007180000'],'requires exactly cost, purchase and negotiated Trade'],
 ['deferred delivery cannot enter the package',['-Phase','AuditLinkedSchema','-ProductDealReleaseV1','-ExpectedLocalOnlyIds','20261005150000,20261007180000,20261008021000,20261008060000'],'requires exactly cost, purchase and negotiated Trade'],
 ['mixed audit modes are rejected',['-Phase','AuditLinkedSchema','-ProductDealReleaseV1','-ProductDealBaselineV1'],'requires exactly cost, purchase and negotiated Trade'],
])test(name,()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File',script,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});
 assert.ifError(r.error);assert.notEqual(r.status,0);assert.ok((r.stdout+r.stderr).includes(expected));
});

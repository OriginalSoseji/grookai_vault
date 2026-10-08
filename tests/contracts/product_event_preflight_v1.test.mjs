import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),script=fileURLToPath(new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url));
for(const [name,args,expected]of [
 ['release baseline cannot apply or become PrePush',['-Phase','PrePush','-ProductEventReleaseBaselineV1'],'supports only the fixed read-only'],
 ['event PrePush requires four exact additions',['-Phase','PrePush','-ProductEventV1'],'requires exactly cost, purchase, negotiated Trade and events'],
 ['old three-addition scope cannot qualify events',['-Phase','PrePush','-ProductEventV1','-ExpectedLocalOnlyIds','20261007180000,20261008021000,20261008060000'],'requires exactly cost, purchase, negotiated Trade and events'],
 ['event gate refuses delivery',['-Phase','AuditLinkedSchema','-ProductEventV1','-ExpectedLocalOnlyIds','20261005150000,20261007180000,20261008021000,20261008060000,20261008130000'],'requires exactly cost, purchase, negotiated Trade and events'],
 ['event gate refuses mixed authority switches',['-Phase','AuditLinkedSchema','-ProductEventV1','-ProductEventBaselineV1'],'requires exactly cost, purchase, negotiated Trade and events'],
])test(name,()=>{const r=spawnSync('pwsh',['-NoProfile','-File',script,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000});assert.ifError(r.error);assert.notEqual(r.status,0);assert.ok((r.stdout+r.stderr).includes(expected));});

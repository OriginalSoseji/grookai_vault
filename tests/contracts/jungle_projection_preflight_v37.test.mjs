import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
for(const [name,args]of [
 ['missing exact set',['-Phase','PrePush']],
 ['receipt migration cannot join Jungle payload',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261002220000']],
 ['previously applied Jungle foundation',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261001050000']],
 ['mixed audit',['-Phase','AuditLinkedSchema','-JungleReceiptBaselineAudit']],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','must-not-open']],
 ['duplicate IDs',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261004090000,20261004090000']],
])test('Projection preflight rejects '+name+' before connection',()=>{const r=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-JungleProjectionV37',...args],{encoding:'utf8',windowsHide:true,timeout:15000});assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stderr+r.stdout,/Jungle projection permits only 20261004090000/);});
test('CLI preparation has no apply mode',()=>{const r=spawnSync(process.execPath,['scripts/release/prepare_jungle_projection_cli_v37.mjs','apply'],{encoding:'utf8',windowsHide:true,timeout:5000});assert.equal(r.status,1);assert.match(r.stderr,/No apply operation/);});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const output='C:/grookai_vault_operator_artifacts/best_of_game_discovery_20261120/rejected-gate-output';
const cases=[
 ['PrePush',['-Phase','PrePush','-AuditOutDir',output]],
 ['combined authority',['-Phase','AuditLinkedSchema','-BestOfGamePrintingBaselineV1','-AuditOutDir',output]],
 ['expected IDs',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261120081500','-AuditOutDir',output]],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env','-AuditOutDir',output]],
 ['missing output',['-Phase','AuditLinkedSchema']],
];

for(const[label,args]of cases)test('Best of Game discovery baseline rejects '+label+' before launching an auditor',{skip:process.platform!=='win32'},()=>{
 assert.equal(fs.existsSync(output),false);
 const result=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-BestOfGameDiscoveryBaselineV1',...args],{cwd:root,encoding:'utf8',timeout:15000,windowsHide:true});
 assert.ifError(result.error);assert.notEqual(result.status,0);
 assert.match(result.stdout+result.stderr,/Best of Game discovery baseline V1 is read-only at canonical511/);
 assert.equal(fs.existsSync(output),false);
});

const releaseCases=[
 ['missing exact ID',['-Phase','PrePush','-AuditOutDir',output]],
 ['wrong exact ID',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261118181500','-AuditOutDir',output]],
 ['additional ID',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120081500,20261118181500','-AuditOutDir',output]],
 ['combined baseline',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryBaselineV1','-AuditOutDir',output]],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env','-AuditOutDir',output]],
];
for(const[label,args]of releaseCases)test('Best of Game discovery release rejects '+label+' before launching an auditor',{skip:process.platform!=='win32'},()=>{
 assert.equal(fs.existsSync(output),false);
 const result=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-BestOfGameDiscoveryReleaseV1',...args],{cwd:root,encoding:'utf8',timeout:15000,windowsHide:true});
 assert.ifError(result.error);assert.notEqual(result.status,0);
 assert.match(result.stdout+result.stderr,/Best of Game discovery release V1 requires exact candidate20261120081500 at canonical511/);
 assert.equal(fs.existsSync(output),false);
});

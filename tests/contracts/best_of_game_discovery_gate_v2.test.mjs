import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(root+'/scripts/schema/'+name));

test('BOG V2 retains the immutable candidate after the independently applied pricing prefix',()=>{
 const baseline=read('best_of_game_discovery_baseline_binding_v2.json');
 const candidate=read('best_of_game_discovery_candidate_v2.json');
 assert.equal(baseline.baselineMigrations,512);
 assert.equal(candidate.baselineMigrations,512);
 assert.equal(candidate.targetMigrations,513);
 assert.deepEqual(candidate.history,baseline.history);
 assert.equal(Object.keys(candidate.history).length,512);
 assert.deepEqual(candidate.candidates,{'20261120081500_best_of_game_discovery_v1.sql':'6acc40456965cf952a5189ea4e0ad29d965f06d0a93cf4831f914ad81f3b7c5f'});
 assert.equal(candidate.history['20261120063000_cross_tcg_market_publication_v2.sql'],'fb585822adb63ef5f31bf9078ffa869fc8b1f6d1b707075a5c710975b7d6608f');
 assert.equal(candidate.baselineBindingSha256,sha(fs.readFileSync(root+'/scripts/schema/best_of_game_discovery_baseline_binding_v2.json')));
 const sources={...candidate.history,...candidate.candidates};
 // V2's513-byte inventory remains a frozen prefix. V3 declares exactly one
 // forward migration after the independently observed applied513 ledger.
 const forward=read('best_of_game_discovery_candidate_v3.json');
 assert.deepEqual(forward.history,sources);
 assert.equal(forward.baselineMigrations,513);
 assert.equal(forward.targetMigrations,514);
 assert.deepEqual(forward.candidates,{'20261120150500_best_of_game_discovery_policy_cache_v1.sql':'1495a6eca1f54725d5b0fa2d78a495bf6dc8bb365247f0c7ff2ce4f8d81797c0'});
 const failedDraft=read('best_of_game_discovery_candidate_v4.json');
 assert.equal(sha(fs.readFileSync(root+'/docs/audits/best_of_game_discovery_v4_20261120/failed-never-applied/20261120153000_best_of_game_catalog_materialization_v1.sql.failed')),failedDraft.candidates['20261120153000_best_of_game_catalog_materialization_v1.sql']);
 const catalog=read('best_of_game_discovery_candidate_v5.json');
 assert.deepEqual(catalog.history,forward.history);
 assert.equal(catalog.targetMigrations,515);
 assert.deepEqual(catalog.candidates,{...forward.candidates,'20261120153000_best_of_game_catalog_materialization_v1.sql':'d481a297f659321b456845f75defb4517ae6d01d1f36b2b5944925c0fbd4d609'});
 const scoped=read('best_of_game_discovery_candidate_v6.json');
 assert.deepEqual(scoped.history,catalog.history);
 assert.equal(scoped.targetMigrations,516);
 assert.deepEqual(scoped.candidates,{...catalog.candidates,'20261120160000_best_of_game_catalog_column_scope_v1.sql':'2edf452ee104691db9b2f81d82183cb0a4c987838bb305a609134795c0c70d16'});
 assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).sort(),Object.keys({...sources,...scoped.candidates}).sort());
 for(const [file,hash]of Object.entries(sources))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),hash,file);
 for(const [file,hash]of Object.entries(forward.candidates))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),hash,file);
 for(const [file,hash]of Object.entries(catalog.candidates))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),hash,file);
 for(const [file,hash]of Object.entries(scoped.candidates))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),hash,file);
});

const output='C:/grookai_vault_operator_artifacts/best_of_game_discovery_v2_20261120/rejected-gate-output';
const baselineCases=[
 ['PrePush',['-Phase','PrePush','-AuditOutDir',output]],
 ['old baseline',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryBaselineV1','-AuditOutDir',output]],
 ['pricing release',['-Phase','AuditLinkedSchema','-CrossTcgMarketReleaseV2','-AuditOutDir',output]],
 ['candidate IDs',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261120081500','-AuditOutDir',output]],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env','-AuditOutDir',output]],
 ['missing output',['-Phase','AuditLinkedSchema']],
];
const releaseCases=[
 ['missing exact ID',['-Phase','PrePush','-AuditOutDir',output]],
 ['wrong exact ID',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120063000','-AuditOutDir',output]],
 ['additional migration',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120063000,20261120081500','-AuditOutDir',output]],
 ['combined baseline',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryBaselineV2','-AuditOutDir',output]],
 ['pricing authority',['-Phase','AuditLinkedSchema','-CrossTcgMarketReleaseV2','-AuditOutDir',output]],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env','-AuditOutDir',output]],
];
for(const [flag,cases,message]of[
 ['BestOfGameDiscoveryBaselineV2',baselineCases,/Best of Game discovery baseline V2 is read-only at canonical512/],
 ['BestOfGameDiscoveryReleaseV2',releaseCases,/Best of Game discovery release V2 requires exact candidate20261120081500 at canonical512/],
])for(const [label,args]of cases)test(flag+' rejects '+label+' before auditor access',{skip:process.platform!=='win32'},()=>{
 assert.equal(fs.existsSync(output),false);
 const result=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-'+flag,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});
 assert.ifError(result.error);
 assert.notEqual(result.status,0);
 assert.match(result.stdout+result.stderr,message);
 assert.equal(fs.existsSync(output),false);
});

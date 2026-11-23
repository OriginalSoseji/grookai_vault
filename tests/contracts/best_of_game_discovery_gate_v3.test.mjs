import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(root+'/scripts/schema/'+f));
test('BOG V3 binds the applied513 prefix and only the two-definition forward optimization',()=>{
 const baseline=read('best_of_game_discovery_baseline_binding_v3.json'),candidate=read('best_of_game_discovery_candidate_v3.json'),old=read('best_of_game_discovery_candidate_v2.json');
 assert.equal(baseline.version,'BEST_OF_GAME_DISCOVERY_BASELINE_V3');
 assert.deepEqual(baseline.history,{...old.history,...old.candidates});
 assert.deepEqual(candidate.history,baseline.history);
 assert.equal(Object.keys(candidate.history).length,513);
 assert.equal(candidate.baselineBindingSha256,sha(fs.readFileSync(root+'/scripts/schema/best_of_game_discovery_baseline_binding_v3.json')));
 assert.equal(candidate.classificationSha256,old.classificationSha256);
 assert.equal(candidate.collisionMatrixSha256,old.collisionMatrixSha256);
 const file='20261120150500_best_of_game_discovery_policy_cache_v1.sql';
 assert.deepEqual(candidate.candidates,{[file]:'1495a6eca1f54725d5b0fa2d78a495bf6dc8bb365247f0c7ff2ce4f8d81797c0'});
 const sql=fs.readFileSync(root+'/supabase/migrations/'+file,'utf8');
 assert.equal(sha(sql),candidate.candidates[file]);
 assert.deepEqual([...sql.matchAll(/^create or replace (function|view) public\.([a-z0-9_]+)/gm)].map(m=>[m[1],m[2]]),[['function','get_best_of_game_discovery_projection_v1'],['view','v_card_prints_set_family_discovery_v1']]);
 assert.doesNotMatch(sql,/^\s*(insert|update|delete|truncate|grant|revoke|alter|drop|comment)\b/im);
 assert.match(sql,/cardinality\(public\.get_best_of_game_discovery_exclusions_v1\(\)\)=9/);
 assert.match(sql,/with shrouded_policy as materialized/);
 assert.match(sql,/best_of_game_policy as materialized/);
 const source=fs.readFileSync(root+'/supabase/migrations/20261120081500_best_of_game_discovery_v1.sql','utf8');
 const tail=s=>s.slice(s.indexOf('select card."id",',s.indexOf('create or replace view public.v_card_prints_set_family_discovery_v1'))).split(';')[0];
 assert.equal(tail(sql),tail(source),'All36 view columns and both UNION ALL arms stay byte exact');
});
const output='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120/rejected-gate-output';
for(const [label,args]of[
 ['PrePush',['-Phase','PrePush']],
 ['old baseline',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryBaselineV2']],
 ['old release',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryReleaseV2']],
 ['expected IDs',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261120150500']],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env']],
])test('BOG V3 baseline rejects '+label+' before access',{skip:process.platform!=='win32'},()=>{
 assert.equal(fs.existsSync(output),false);
 const v=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-BestOfGameDiscoveryBaselineV3','-AuditOutDir',output,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});
 assert.ifError(v.error);assert.notEqual(v.status,0);
 assert.match(v.stdout+v.stderr,/Best of Game discovery baseline V3 is read-only at canonical513/);
 assert.equal(fs.existsSync(output),false);
});

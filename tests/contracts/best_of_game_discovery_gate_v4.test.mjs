import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import{createHash}from'node:crypto';
import{fileURLToPath}from'node:url';
import{spawnSync}from'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(root+'/scripts/schema/'+f));
test('BOG V4 pins only scalar preparation and the single catalog function fence',()=>{
 const active=read('best_of_game_discovery_candidate_v5.json'),prior=read('best_of_game_discovery_candidate_v3.json');
 assert.equal(active.version,'BEST_OF_GAME_DISCOVERY_CANDIDATE_V5');
 assert.deepEqual(active.history,prior.history);
 assert.equal(active.baselineMigrations,513);assert.equal(active.targetMigrations,515);
 assert.deepEqual(active.candidates,{
  '20261120150500_best_of_game_discovery_policy_cache_v1.sql':'1495a6eca1f54725d5b0fa2d78a495bf6dc8bb365247f0c7ff2ce4f8d81797c0',
  '20261120153000_best_of_game_catalog_materialization_v1.sql':'d481a297f659321b456845f75defb4517ae6d01d1f36b2b5944925c0fbd4d609',
 });
 const files=Object.keys(active.candidates).sort(),bundle=files.map(f=>fs.readFileSync(root+'/supabase/migrations/'+f,'utf8')).join('\n');
 assert.equal(sha(bundle),active.candidateBundleSha256);
 for(const[f,h]of Object.entries({...active.history,...active.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);
 const sql=fs.readFileSync(root+'/supabase/migrations/'+files[1],'utf8');
 assert.deepEqual([...sql.matchAll(/^CREATE OR REPLACE FUNCTION public\.([a-z0-9_]+)/gm)].map(m=>m[1]),['get_public_catalog_sets_v2']);
 assert.doesNotMatch(sql,/^\s*(insert|update|delete|truncate|alter|grant|revoke|drop)\b/im);
 const extract=s=>s.slice(s.indexOf('CREATE OR REPLACE FUNCTION public.get_public_catalog_sets_v2(')).match(/^[\s\S]*?\$function\$[\s\S]*?\$function\$\s*;/)[0];
 const old=extract(fs.readFileSync(root+'/supabase/migrations/20261120081500_best_of_game_discovery_v1.sql','utf8'));
 const next=extract(sql),cte='  countable_cards as materialized (\n    select id,set_id,set_code,gv_id,data_quality_flags\n    from public.v_card_prints_set_family_discovery_v1\n  ),\n';
 assert.equal(next.replace(cte,'').replace('from countable_cards card','from public.v_card_prints_set_family_discovery_v1 card'),old);
 assert.equal((next.match(/CREATE OR REPLACE FUNCTION/g)||[]).length,1);
});
test('BOG V4 preserves the rejected never-applied draft separately from active SQL',()=>{
 const failed=read('best_of_game_discovery_candidate_v4.json'),active=read('best_of_game_discovery_candidate_v5.json');
 assert.equal(failed.candidates['20261120153000_best_of_game_catalog_materialization_v1.sql'],'fe511eba317ab3e12183d9cb9b9598450eb3b67a39d6f9328fde3dc71430ce98');
 assert.equal(active.failedNeverAppliedDraftSha256,failed.candidates['20261120153000_best_of_game_catalog_materialization_v1.sql']);
 assert.equal(sha(fs.readFileSync(root+'/docs/audits/best_of_game_discovery_v4_20261120/failed-never-applied/20261120153000_best_of_game_catalog_materialization_v1.sql.failed')),active.failedNeverAppliedDraftSha256);
});
const out='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120/rejected-gate-output';
for(const[label,args]of[
 ['missing IDs',['-Phase','PrePush']],
 ['only preparation',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120150500']],
 ['only materialization',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120153000']],
 ['old applied migration',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120081500']],
 ['additional migration',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120081500,20261120150500,20261120153000']],
 ['mixed baseline',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryBaselineV3']],
 ['mixed old release',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryReleaseV2']],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env']],
])test('BOG V4 rejects '+label+' before access',{skip:process.platform!=='win32'},()=>{
 assert.equal(fs.existsSync(out),false);
 const v=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-BestOfGameDiscoveryReleaseV4','-AuditOutDir',out,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});
 assert.ifError(v.error);assert.notEqual(v.status,0);
 assert.match(v.stdout+v.stderr,/Best of Game discovery release V4 requires exact forward IDs20261120150500,20261120153000 at canonical513/);
 assert.equal(fs.existsSync(out),false);
});

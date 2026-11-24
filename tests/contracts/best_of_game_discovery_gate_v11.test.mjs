import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{spawnSync}from'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url)),read=f=>JSON.parse(fs.readFileSync(root+'/scripts/schema/'+f)),sha=b=>createHash('sha256').update(b).digest('hex');
test('BOG V11 retains all518 SQL and bounds the new typed card-search branch',()=>{
 const active=read('best_of_game_discovery_candidate_v11.json'),prior=read('best_of_game_discovery_candidate_v10.json');
 assert.equal(active.baselineMigrations,518);assert.equal(active.targetMigrations,519);
 assert.deepEqual(active.history,{...prior.history,...prior.candidates});assert.equal(Object.keys(active.history).length,518);
 assert.deepEqual(active.candidates,{'20261123000500_card_search_typed_scope_v2.sql':'70424426ca5b1a57bd47da5b8cd0273f53beced68688990dee9727496871a3f7'});
 for(const[f,h]of Object.entries({...active.history,...active.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h,f);
 const sql=fs.readFileSync(root+'/supabase/migrations/'+Object.keys(active.candidates)[0],'utf8'),before=fs.readFileSync(root+'/'+active.originalCardSearchFunctionDefinition,'utf8'),oldBody=before.split('$function$')[1],newBody=sql.split('$function$')[1],md5=s=>createHash('md5').update(s).digest('hex');
 assert.equal(sha(before),active.originalCardSearchFunctionDefinitionSha256);assert.equal(md5(oldBody),'d364a536540a45ae94619cccfb643de1');assert.equal(md5(newBody),'4b7444b268ef40f1fabae97d85bd2448');
 const cut=oldBody.lastIndexOf('  return query'),prefix=oldBody.slice(0,cut),suffix=oldBody.slice(cut);assert.ok(newBody.startsWith(prefix));assert.ok(newBody.endsWith(suffix));const branch=newBody.slice(prefix.length,newBody.length-suffix.length);
 assert.ok(branch.startsWith("  if v_game_code = 'pokemon' and v_effective_query is null"));
 assert.ok(branch.includes("v_set_code in('sv08.5','sv8pt5','sv04.5','sv4pt5','swsh10.5','pgo','2021swsh','mcd21','tk-ex-latio','tk1b','sv06.5','sv6pt5','bog','bp')"));
 assert.ok(branch.includes('card.id <> ALL (((select public.get_jungle_edition_discovery_exclusions_v1()))::uuid[])'));
 assert.equal((branch.match(/else array\[\]::uuid\[\] end/g)??[]).length,7);assert.equal((branch.match(/else null::jsonb end/g)??[]).length,2);
 assert.deepEqual([...sql.matchAll(/^CREATE OR REPLACE FUNCTION public\.([a-z0-9_]+)/gm)].map(m=>m[1]),['search_game_card_prints_v5']);assert.doesNotMatch(sql,/^\s*(insert|update|delete|truncate|alter|grant|revoke|drop)\b/im);assert.ok(sql.includes('plan_cache_mode=force_custom_plan'));assert.equal(sha(sql),active.candidateBundleSha256);
 assert.equal(active.predecessorReleaseManifestSha256,'a3bff69f2c43031c5aff1ef72c2507519c1e2d7c433708941df5e1af0415bef9');assert.equal(active.originalProtectedDataBaselineUnchanged,true);assert.equal(active.originalApprovalExpiryUnchanged,'2026-11-23T13:59:40.000Z');assert.equal(active.newExactSqlApprovalRequiredBeforeApply,true);
 const failed=fs.readFileSync(root+'/'+active.failedNeverAppliedCardSearchDraftArchive,'utf8');assert.equal(sha(failed),'31ca93c8b5f4e37e67349b7537d7336aa52a83cb4a02249895eee023ed5c0c32');assert.equal(failed.replace('$function$\n\ncommit;','$function$;\n\ncommit;'),sql);
});
test('BOG V11 rejects output traversal and extra writer arguments before private source or environment access',()=>{for(const args of[['AuditLinkedSchema','--out-dir=C:/wrong/rejected-v11'],['AuditLinkedSchema','--out-dir=C:/grookai_vault_operator_artifacts/best_of_game_card_search_main_519_20261122/../rejected-v11'],['PrePush','--out-dir=C:/rejected-v11','--apply']]){const result=spawnSync(process.execPath,[root+'/scripts/schema/verify_best_of_game_discovery_release_v11.mjs',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});assert.ifError(result.error);assert.notEqual(result.status,0);assert.match(result.stderr,/AssertionError/);assert.doesNotMatch(result.stderr,/\.env\.local|verify-release-operator-v7\.mjs/);}});
const out='C:/grookai_vault_operator_artifacts/best_of_game_card_search_main_519_20261122/rejected-gate-v11-output';for(const[label,args]of[
 ['missing ID',['-Phase','PrePush']],
 ['old three IDs',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120150500,20261120153000,20261120160000']],
 ['applied ID included',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120160000,20261123000500']],
 ['duplicate ID',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261123000500,20261123000500']],
 ['mixed V7',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryReleaseV7']],
 ['mixed baseline',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryBaselineV3']],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-v8-target.env']],
 ['mixed unrelated release',['-Phase','AuditLinkedSchema','-CrossTcgMarketReleaseV2']],
])test('BOG V11 rejects '+label+' before access',{skip:process.platform!=='win32'},()=>{assert.equal(fs.existsSync(out),false);const result=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-BestOfGameDiscoveryReleaseV11','-AuditOutDir',out,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});assert.ifError(result.error);assert.notEqual(result.status,0);const text=(result.stdout+result.stderr).replace(/\r?\n\s*\|\s*/g,' ');assert.match(text,/Best of Game discovery release V11 requires exact forward ID20261123000500 at canonical518/);assert.equal(fs.existsSync(out),false);});

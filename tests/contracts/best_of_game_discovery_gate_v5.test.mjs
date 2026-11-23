import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{spawnSync}from'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(root+'/scripts/schema/'+f));
test('BOG V5 retains both exercised preparations and qualifies only the five input columns',()=>{
 const active=read('best_of_game_discovery_candidate_v6.json'),prior=read('best_of_game_discovery_candidate_v5.json');
 assert.equal(active.version,'BEST_OF_GAME_DISCOVERY_CANDIDATE_V6');assert.equal(active.baselineMigrations,513);assert.equal(active.targetMigrations,516);assert.deepEqual(active.history,prior.history);
 const file='20261120160000_best_of_game_catalog_column_scope_v1.sql';
 assert.deepEqual(active.candidates,{...prior.candidates,[file]:'2edf452ee104691db9b2f81d82183cb0a4c987838bb305a609134795c0c70d16'});
 const names=Object.keys(active.candidates).sort(),bundle=names.map(f=>fs.readFileSync(root+'/supabase/migrations/'+f,'utf8')).join('\n');
 assert.equal(sha(bundle),'579485c0ccdd3a6c1a097a6127547eeb27486e29b6e8c426b29bee80eb382048');assert.equal(active.candidateBundleSha256,sha(bundle));
 for(const[f,h]of Object.entries({...active.history,...active.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);
 const sql=fs.readFileSync(root+'/supabase/migrations/'+file,'utf8');
 assert.deepEqual([...sql.matchAll(/^CREATE OR REPLACE FUNCTION public\.([a-z0-9_]+)/gm)].map(m=>m[1]),['get_public_catalog_sets_v2']);
 assert.doesNotMatch(sql,/^\s*(insert|update|delete|truncate|alter|grant|revoke|drop)\b/im);
 const extract=s=>s.slice(s.indexOf('CREATE OR REPLACE FUNCTION public.get_public_catalog_sets_v2(')).match(/^[\s\S]*?\$function\$[\s\S]*?\$function\$\s*;/)[0];
 const old=extract(fs.readFileSync(root+'/supabase/migrations/20261120153000_best_of_game_catalog_materialization_v1.sql','utf8'));
 const before='    select id,set_id,set_code,gv_id,data_quality_flags\n    from public.v_card_prints_set_family_discovery_v1';
 const after='    select family_card.id,family_card.set_id,family_card.set_code,family_card.gv_id,family_card.data_quality_flags\n    from public.v_card_prints_set_family_discovery_v1 family_card';
 const next=extract(sql);assert.equal(next.split(after).length,2);assert.equal(next.replace(after,before),old);
 const gate=fs.readFileSync(root+'/scripts/schema/verify_best_of_game_discovery_release_v5.mjs','utf8');
 for(const required of ["git(['status','--porcelain'])","merge-base','--is-ancestor","local.ledger,516",'manifest.negativeProofPins','manifest.priorPins','manifest.sourcePins','manifest.operatorPins','manifest.proofPins','local.allThreeReaderRolesSelectOnly,true','square.baselineReplaced,false'])assert.ok(gate.includes(required),required);
});
const out='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120/rejected-gate-output';
for(const[label,args]of[
 ['missing IDs',['-Phase','PrePush']],
 ['only first two',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120150500,20261120153000']],
 ['only scope correction',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120160000']],
 ['additional applied ID',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261120081500,20261120150500,20261120153000,20261120160000']],
 ['mixed baseline',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryBaselineV3']],
 ['mixed superseded release',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryReleaseV4']],
 ['target override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env']],
])test('BOG V5 rejects '+label+' before access',{skip:process.platform!=='win32'},()=>{
 assert.equal(fs.existsSync(out),false);const v=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-BestOfGameDiscoveryReleaseV5','-AuditOutDir',out,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});assert.ifError(v.error);assert.notEqual(v.status,0);
 // PowerShell decorates wrapped exception lines with "|"; the complete exact
 // rejection text must match independently of the terminal's display width.
 const rejection=(v.stdout+v.stderr).replace(/\r?\n\s*\|\s*/g,' ');
 assert.match(rejection,/Best of Game discovery release V5 requires exact forward IDs20261120150500,20261120153000,20261120160000 at canonical513/);assert.equal(fs.existsSync(out),false);
});

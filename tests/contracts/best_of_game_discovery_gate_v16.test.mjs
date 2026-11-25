import {assertSquareForwardSourceV4} from './helpers/square_forward_source_v4.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {stripVTControlCharacters} from 'node:util';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(root+'/scripts/schema/'+name,'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
test('V16 preserves every521 historical migration and bounds the new definition-only payload',()=>{
  const b=read('best_of_game_discovery_candidate_v16.json'),previous=read('best_of_game_discovery_candidate_v15.json');
  assert.equal(b.baselineMigrations,521);assert.equal(b.targetMigrations,522);assert.deepEqual(b.history,{...previous.history,...previous.candidates});
  assert.equal(Object.keys(b.history).length,521);assert.deepEqual(Object.keys(b.candidates),['20261123220000_catalog_direct_visibility_evaluation_v1.sql']);
  for(const [file,hash] of Object.entries({...b.history,...b.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),hash,file);
  // V17 owns the complete current inventory; V16 still pins every historical byte.
  const successor=read('best_of_game_discovery_candidate_v17.json');
  assert.deepEqual(successor.history,{...b.history,...b.candidates});
  assertSquareForwardSourceV4(root,{...successor.history,...successor.candidates});
  assert.equal(b.canonicalRowWrites,0);assert.equal(b.operationalRowWrites,0);assert.equal(b.newIndexes,0);assert.deepEqual(b.changedViews,[]);
  assert.deepEqual(b.changedFunctions,['public.catalog_set_visible_to_request_v1(uuid)','public.catalog_card_print_visible_to_request_v1(uuid)','public.catalog_parent_gv_id_visible_to_request_v1(text)']);
  const sql=fs.readFileSync(root+'/supabase/migrations/'+Object.keys(b.candidates)[0],'utf8');assert.equal(sha(sql),b.candidateBundleSha256);
  assert.equal([...sql.matchAll(/^create or replace function /gm)].length,3);
  assert.doesNotMatch(sql,/^\s*(insert|update|delete|truncate|alter|grant|revoke|drop|create\s+(?:index|view|table|policy))\b/im);
  for(const helper of b.changedHelpers){assert.equal(createHash('md5').update(helper.body).digest('hex'),helper.bodyMd5);assert.ok(sql.includes('$function$'+helper.body+'$function$'));}
});
test('V16 carries the fixed comparison deadline and records the failed521 reliability proof',()=>{
  const b=read('best_of_game_discovery_candidate_v16.json');
  assert.equal(b.predecessorReleaseManifestSha256,'720c551cfcc2f3ef46a938ab202c435ae242ec680f0cf3026d658ea68ef6269f');
  assert.equal(b.runtimeFailureSha256,'30b737f6d02c920a182c1c9d92fd03ea28e08d23f73d1bd76776e5a73d707570');
  assert.equal(b.approvedComparisonOwnerSha256,'ed91ac1a26f6cbc838c13ea8b9f4d022036ec19fd68b28eba2fb00b333c0c8ff');
  assert.equal(b.effectiveComparisonExpiresAt,'2026-11-24T13:59:40.000Z');assert.equal(b.originalExpiredComparisonExpiresAt,'2026-11-23T13:59:40.000Z');
  assert.equal(b.newExactSqlApprovalRequired,true);assert.equal(b.printingAuthorityGranted,false);
});
for(const [phase,args] of [['AuditLinkedSchema',['--out-dir=C:/wrong-artifact-root']],['invalid',['--out-dir=C:/wrong-artifact-root']],['AuditLinkedSchema',['--out-dir=C:/wrong-artifact-root','extra']]])test('V16 rejects unsafe routing before artifact or database access: '+phase+' '+args.length,()=>{
  const result=spawnSync(process.execPath,[root+'/scripts/schema/verify_best_of_game_discovery_release_v16.mjs',phase,...args],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/AssertionError/);
});
const rejected='C:/grookai_vault_operator_artifacts/best_of_game_direct_visibility_522_20261123/rejected-routing-output';
for(const [label,args] of [
  ['missing exact ID',['-Phase','PrePush']],
  ['consumed index ID',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261123190000']],
  ['additional ID',['-Phase','PrePush','-ExpectedLocalOnlyIds','20261123220000,20261123190000']],
  ['mixed old release',['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryReleaseV15']],
  ['environment override',['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unapproved-target.env']],
])test('V16 rejects '+label+' before auditor access',()=>{
  assert.equal(fs.existsSync(rejected),false);
  const result=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-BestOfGameDiscoveryReleaseV16',...args,'-AuditOutDir',rejected],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});
  assert.ifError(result.error);assert.notEqual(result.status,0);
  const diagnostic=stripVTControlCharacters(result.stdout+result.stderr).replace(/\s+/g,' ');assert.match(diagnostic,/V16 requires only ID20261123220000[\s|]+at[\s|]+canonical521/);assert.equal(fs.existsSync(rejected),false);
});

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {splitSealedMigrationStatementsV1 as split} from '../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
assert.equal(root.replaceAll('\\','/'),'C:/gv_intake_release_20261028');
const attempt=process.argv[2];assert.match(attempt??'',/^attempt-\d+$/);
const work='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1';
const project='reviewed-intake-draft-477-20261028',container='supabase_db_'+project;
const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:120000,maxBuffer:64_000_000});
const metadata=fs.readFileSync(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','utf8'),before=JSON.parse(sql(metadata));assert.equal(before.LEDGER.length,477);
assert.equal(sql("select (select count(*) from auth.users)::text||':'||(select count(*) from vault_item_instances)::text||':'||current_setting('max_worker_processes')").trim(),'0:0:0');
const source=fs.readFileSync(root+'/supabase/migrations/20261028020000_collector_reviewed_intake_v1.sql','utf8');
const statements=split(source),strip=s=>s.replace(/^(?:\s*--[^\n]*(?:\n|$))*/,'').trim();assert.equal(strip(statements[0]).toLowerCase(),'begin');assert.equal(strip(statements.at(-1)).toLowerCase(),'commit');
const inner=statements.slice(1,-1);for(const s of inner)assert.doesNotMatch(strip(s),/^(?:begin|commit|rollback|start\s+transaction)\b/i);const body=inner.join(';\n')+';\n';
const select=split(metadata).find(s=>strip(s).toLowerCase().startsWith('select jsonb_build_object'));assert.ok(select);
// Inspector ORDER BY keys can tie (function overloads, privilege rows). Compare
// each result row multiset deterministically, retaining every field, duplicate,
// nested array and byte, including raw definitions and column positions.
const hashedSelect="select jsonb_build_object('sections',(select jsonb_object_agg(key,encode(sha256(convert_to((case when jsonb_typeof(value)='array' then coalesce((select jsonb_agg(catalog_row order by catalog_row::text) from jsonb_array_elements(value) catalog_row),'[]'::jsonb) else value end)::text,'UTF8')),'hex')) from jsonb_each(catalog.receipt)), 'control',(select to_jsonb(c) from public.collector_intake_controls_v1 c where singleton)) from ("+select+") catalog;";
const logs=[],tests=[];
const run=q=>{const r=spawnSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:120000,maxBuffer:64_000_000});assert.ifError(r.error);logs.push((r.stdout??'')+(r.stderr??''));return r;};
const unchanged=()=>assert.ok(isDeepStrictEqual(JSON.parse(sql(metadata)),before),'Rollback changed catalog/security/ledger');
try{
  const activate="do $local_control_fixture$ begin perform set_config('request.jwt.claim.role','service_role',true); if (public.collector_intake_set_control_v1(1,true,'{}')->>'ok')::boolean is distinct from true then raise exception 'local activation fixture failed'; end if; end $local_control_fixture$;";
  const repeated=run('begin;'+body+activate+hashedSelect+body+hashedSelect+'rollback;');assert.equal(repeated.status,0,'repeat apply failed');
  const snapshots=repeated.stdout.trim().split(/\r?\n/).filter(Boolean).map(s=>JSON.parse(s));assert.equal(snapshots.length,2);assert.equal(snapshots[0].control.writes_enabled,true);const differences=Object.keys(snapshots[0].sections).filter(k=>snapshots[0].sections[k]!==snapshots[1].sections[k]);assert.ok(isDeepStrictEqual(snapshots[0],snapshots[1]),'repeat metadata differs in '+differences.join(','));unchanged();tests.push('repeat_preserves_exact_schema_security_and_active_controls');
  const poisons=[
    ['function',"alter function public.collector_intake_can_write_v1() security invoker;",'reviewed_intake_function_drift'],
    ['table',"alter table public.purchase_lots add column local_unexpected text;",'reviewed_intake_table_drift'],
    ['policy',"alter policy vault_intake_private_select on storage.objects using (true);",'reviewed_intake_policy_drift'],
    ['index',"drop index public.purchase_lots_tags_idx;create index purchase_lots_tags_idx on public.purchase_lots(user_id);",'reviewed_intake_index_drift'],
    ['wrong_relation_kind',"drop index public.purchase_lots_tags_idx;create table public.purchase_lots_tags_idx(id int);",'reviewed_intake_index_drift'],
    ['overload',"create function public.vault_intake_request_v1(uuid) returns jsonb language sql as 'select null::jsonb';",'reviewed_intake_function_overload_drift'],
    ['trigger',"alter table public.vault_item_instances disable trigger guard_vault_intake_origin_v1;",'reviewed_intake_trigger_drift'],
    ['bucket',"update storage.buckets set public=true where id='vault-intake-private';",'intake_private_bucket_drift'],
  ];
  for(const [name,poison,error] of poisons){const result=run('begin;'+body+poison+body+'rollback;');assert.notEqual(result.status,0,name+' unexpectedly accepted');assert.match(result.stderr,new RegExp(error));unchanged();tests.push(name+'_drift_rejected_without_persistent_changes');}
}finally{fs.writeFileSync(work+'/guards-'+attempt+'.log',logs.join('\n'),{flag:'wx'});}
const report={at:new Date().toISOString(),pass:true,sourceSha256:createHash('sha256').update(source).digest('hex'),tests,catalogSecurityAndLedgerUnchanged:true,localRollbackOnly:true,remoteWrites:0};
fs.writeFileSync(work+'/guards-'+attempt+'.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({pass:true,tests:tests.length,localRollbackOnly:true,remoteWrites:0}));

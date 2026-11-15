import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import '../../backend/env.mjs';
import {assertPrintingDatabaseTarget} from '../../backend/catalog/master_index_printing_execution_guard_v1.mjs';
import {assertMasterPrintingAuthority} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {assertPrintingManifest,buildPrintingAdmissionPlan,printingManifestHash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const VERSION='ENGLISH_POKEMON_BASE_PRINTING_RELEASE_GUARDED_DRY_RUN_V1';
const PACKAGE_ID='ENGLISH-POKEMON-BASE-PRINTING-RELEASE-V1';
const PROJECT_REF='ycdxbpibncqcchqiihfz';
const SET_ID='c72b4744-db4d-565f-9914-e28a2b244f5c';
const SET_CODE='me06';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const AUTHORITY_DIR=path.join(ROOT,'docs','audits','delta_reign_base_printing_release_v1','authority_20261115_v1');
const MANIFEST_PATH=path.join(AUTHORITY_DIR,'manifest.json');
const ARTIFACT_MAP_PATH=path.join(AUTHORITY_DIR,'artifact_map.json');
const CODE_FILES=[
 'scripts/audits/english_pokemon_base_printing_release_guarded_dry_run_v1.mjs',
 'scripts/audits/english_pokemon_base_printing_authority_v1.mjs',
 'backend/catalog/master_index_printing_execution_guard_v1.mjs',
 'backend/catalog/master_index_printing_authority_v1.mjs',
 'backend/catalog/printing_completeness_gate_v1.mjs',
 'docs/contracts/ENGLISH_POKEMON_BASE_PRINTING_RELEASE_V1.md',
];
const CHILD_FIELDS=['id','card_print_id','finish_key','printing_gv_id','is_provisional','provenance_source','provenance_ref','created_by'];
const REVIEW_FIELDS=['id','card_printing_id','review_status','public_visibility','active','reason','confidence','evidence_sources_checked','evidence_sources_for_finish','expected_finish_keys','evidence','source_report_path','reviewed_by','reviewed_at'];
const sha256=value=>createHash('sha256').update(value).digest('hex');
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
const stableHash=value=>sha256(JSON.stringify(canonical(value)));
function deterministicUuid(seed){const chars=sha256(seed).slice(0,32).split('');chars[12]='5';chars[16]='8';const value=chars.join('');return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20)}`;}
const sortRows=rows=>[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));

function parseArgs(argv){const options={};for(const token of argv){const match=/^--(out-dir|expected-head-sha)=(.+)$/.exec(token);assert.ok(match&&!options[match[1]],`unknown_or_repeated_argument:${token}`);options[match[1]]=match[2];}assert.ok(options['out-dir'],'--out-dir is required');assert.match(options['expected-head-sha']??'',/^[a-f0-9]{40}$/,'--expected-head-sha is required');return{outDir:path.resolve(ROOT,options['out-dir']),expectedHead:options['expected-head-sha']};}
const writeExclusive=(file,value)=>fs.writeFile(file,`${JSON.stringify(value,null,2)}\n`,{flag:'wx'});

async function loadAuthority(){
 const manifestBytes=await fs.readFile(MANIFEST_PATH),manifest=JSON.parse(manifestBytes);
 const map=JSON.parse(await fs.readFile(ARTIFACT_MAP_PATH)),artifacts=new Map(),bindings=[];
 for(const entry of map){assert.ok(!artifacts.has(entry.ref),'duplicate_artifact_ref');const file=path.resolve(AUTHORITY_DIR,entry.path),value=await fs.readFile(file);artifacts.set(entry.ref,value);bindings.push({ref:entry.ref,path:path.relative(ROOT,file).replaceAll('\\','/'),sha256:sha256(value)});}
 assertPrintingManifest(manifest);assertMasterPrintingAuthority(manifest,artifacts);
 assert.equal(manifest.set_code,SET_CODE);assert.equal(manifest.authority.set_id,SET_ID);
 assert.deepEqual(manifest.expected,{parents:141,printings:141,finishes:{normal:83,holo:58}});
 assert.equal(manifest.unresolved_variants.length,87);
 return{manifest,artifacts,bindings,manifestSha256:sha256(manifestBytes)};
}
async function codeBinding(){const files=[];for(const file of CODE_FILES)files.push({file,sha256:sha256(await fs.readFile(path.join(ROOT,file)))});return{files,fingerprint:printingManifestHash(files)};}
function parentProjection(row){return{id:row.id,set_id:row.set_id,gv_id:row.gv_id,name:row.name,printed_coordinate:String(row.number),identity_domain:row.identity_domain,variant_key:row.variant_key,printed_identity_modifier:row.printed_identity_modifier};}
const queryRows=async(client,sql,params=[])=>(await client.query(sql,params)).rows;

async function readState(client,context){
 const parentIds=context.manifest.parents.map(row=>row.id),childIds=context.children.map(row=>row.id),childGvIds=context.children.map(row=>row.printing_gv_id),reviewIds=context.reviews.map(row=>row.id);
 const setRows=await queryRows(client,`select to_jsonb(s) set_row,(select to_jsonb(c) from public.catalog_set_release_controls c where c.set_id=s.id) control_row from public.sets s where s.id=$1::uuid`,[SET_ID]);
 const parents=(await queryRows(client,`select to_jsonb(p) row from public.card_prints p where p.set_id=$1::uuid order by p.id`,[SET_ID])).map(row=>row.row);
 const children=await queryRows(client,`select id::text,card_print_id::text,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref,created_by,image_source,image_path,image_url,image_alt_url,image_status,image_note from public.card_printings where card_print_id=any($1::uuid[]) or id=any($2::uuid[]) or printing_gv_id=any($3::text[]) order by id`,[parentIds,childIds,childGvIds]);
 const reviews=await queryRows(client,`select id::text,card_printing_id::text,review_status,public_visibility,active,reason,confidence,evidence_sources_checked,evidence_sources_for_finish,expected_finish_keys,evidence,source_report_path,reviewed_by,reviewed_at from public.card_printing_truth_reviews where card_printing_id=any($1::uuid[]) or id=any($2::uuid[]) order by id`,[childIds,reviewIds]);
 const raw=await queryRows(client,`select id::text,source,status,notes,payload from public.raw_imports where id=$1::bigint`,[context.raw.id]);
 const mappings=await queryRows(client,`select id::text,external_id,card_print_id::text,active from public.external_mappings where card_print_id=any($1::uuid[]) order by id`,[parentIds]);
 const publication=(await queryRows(client,`select count(*)::integer count from public.market_price_current_publication pointer join public.market_price_publication_snapshots snapshot on snapshot.publication_set_id=pointer.publication_set_id where pointer.singleton and snapshot.card_print_id=any($1::uuid[])`,[parentIds]))[0];
 const footprints=[];
 for(const[table,column,ids]of[['vault_item_instances','card_print_id',parentIds],['binder_custom_slots','card_printing_id',childIds],['vault_item_instance_dispositions','card_print_id',parentIds],['external_printing_mappings','card_printing_id',childIds]]){const value=(await queryRows(client,`select count(*)::integer rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by t.id),'')) digest from public.${table} t where ${column}=any($1::uuid[])`,[ids]))[0];footprints.push({table,...value});}
 const stable={setRows,parents,children,reviews,raw,mappings,publication_count:Number(publication.count),footprints};
 return{...stable,hash_sha256:stableHash(stable)};
}

function assertBefore(state,context){
 assert.equal(state.setRows.length,1);assert.equal(state.setRows[0].set_row.id,SET_ID);assert.equal(state.setRows[0].set_row.code,SET_CODE);assert.equal(state.setRows[0].control_row?.release_status,'hidden');assert.equal(state.setRows[0].control_row?.activated_at,null);
 assert.equal(state.parents.length,141);
 const projected=state.parents.map(parentProjection).sort((a,b)=>a.id.localeCompare(b.id)),expected=[...context.manifest.parents].sort((a,b)=>a.id.localeCompare(b.id));
 assert.deepEqual(projected,expected,'parent_identity_drift');
 assert.ok(state.parents.every(row=>row.data_quality_flags?.app_visibility_v1?.status==='suppressed'),'parent_suppression_drift');
 assert.equal(state.children.length,0,'printing_collision_or_partial_state');assert.equal(state.reviews.length,0,'truth_review_collision_or_partial_state');assert.equal(state.raw.length,0,'raw_receipt_collision');assert.equal(state.mappings.length,0,'mapping_scope_changed');assert.equal(state.publication_count,0,'publication_scope_changed');assert.ok(state.footprints.every(row=>Number(row.rows)===0),'dependent_record_collision');
}

async function assertExact(client,context,before){
 const state=await readState(client,context);
 assert.deepEqual(state.setRows,before.setRows,'set_or_release_control_changed');assert.deepEqual(state.parents,before.parents,'parent_rows_changed');assert.deepEqual(state.mappings,before.mappings,'mapping_rows_changed');assert.equal(state.publication_count,before.publication_count,'publication_rows_changed');assert.deepEqual(state.footprints,before.footprints,'dependent_rows_changed');assert.deepEqual(state.raw,[context.raw]);
 assert.equal(state.children.length,141);assert.equal(state.reviews.length,141);
 const children=state.children.map(row=>Object.fromEntries(CHILD_FIELDS.map(field=>[field,row[field]])));assert.deepEqual(sortRows(children),sortRows(context.children));
 assert.ok(state.children.every(row=>['image_source','image_path','image_url','image_alt_url','image_status','image_note'].every(field=>row[field]===null)),'image_write_detected');
 const reviews=state.reviews.map(row=>({...Object.fromEntries(REVIEW_FIELDS.map(field=>[field,row[field]])),reviewed_at:new Date(row.reviewed_at).toISOString()}));assert.deepEqual(sortRows(reviews),sortRows(context.reviews));
 const counts=await queryRows(client,`select finish_key,count(*)::integer count from public.card_printings where card_print_id=any($1::uuid[]) group by finish_key order by finish_key`,[context.manifest.parents.map(row=>row.id)]);assert.deepEqual(counts,[{finish_key:'holo',count:58},{finish_key:'normal',count:83}]);
 const options=await queryRows(client,`select id::text,card_print_id::text,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0) order by id`,[context.manifest.parents.map(row=>row.id)]);
 assert.equal(options.length,141,'public_option_count_changed');const expectedOptions=sortRows(context.children.map(row=>({id:row.id,card_print_id:row.card_print_id,finish_key:row.finish_key,printing_gv_id:row.printing_gv_id,finish_is_active:true})));assert.deepEqual(options,expectedOptions,'public_option_readback_mismatch');return state;
}
async function connect(databaseUrl,name){const client=new pg.Client({connectionString:databaseUrl.href,ssl:databaseUrl.hostname==='localhost'?false:{rejectUnauthorized:false},application_name:name,statement_timeout:120000,query_timeout:125000});await client.connect();return client;}

async function run(){
 const options=parseArgs(process.argv.slice(2));
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),options.expectedHead,'source_commit_mismatch');assert.equal(execFileSync('git',['status','--porcelain'],{cwd:ROOT,encoding:'utf8'}),'','working_tree_must_be_clean');
 await fs.mkdir(options.outDir,{recursive:false});
 const authority=await loadAuthority(),code=await codeBinding();
 const publicUrl=new URL(process.env.SUPABASE_URL??'');assert.equal(publicUrl.hostname,`${PROJECT_REF}.supabase.co`,'production_project_ref_mismatch');const databaseUrl=assertPrintingDatabaseTarget(process.env.SUPABASE_DB_URL??'');
 const client=await connect(databaseUrl,'english_pokemon_base_printing_release_dry_run_v1');let context,before,transient;
 try{
  const server=(await queryRows(client,'select current_database() database,current_user username'))[0];assert.deepEqual(server,{database:'postgres',username:'postgres'});
  const sanity=(await queryRows(client,`select (select count(*)::integer from public.card_prints) card_prints,(select count(*)::integer from public.sets) sets,(select count(*)::integer from public.card_print_traits) traits`))[0];assert.ok(sanity.card_prints>=40000&&sanity.sets>=150&&sanity.traits>=5000,'canonical_environment_invariant_failed');
  const existing=await queryRows(client,`select id::text,card_print_id::text,finish_key,printing_gv_id from public.card_printings where card_print_id=any($1::uuid[]) order by id`,[authority.manifest.parents.map(row=>row.id)]),plan=buildPrintingAdmissionPlan(authority.manifest,existing);assert.equal(plan.inserts.length,141);assert.equal(plan.retained.length,0);
  const packageAuthority={package_id:PACKAGE_ID,source_commit:options.expectedHead,code_fingerprint:code.fingerprint,manifest_fingerprint:authority.manifest.fingerprint,manifest_sha256:authority.manifestSha256,plan_fingerprint:plan.fingerprint,source_artifacts:authority.bindings,counts:{raw_receipts:1,printing_inserts:141,normal:83,holo:58,truth_review_inserts:141,reverse_holo_review_leads_held:87},boundaries:{parent_writes:0,identity_writes:0,reverse_holo_printing_writes:0,mapping_writes:0,pricing_writes:0,publication_writes:0,image_writes:0,storage_writes:0,vault_writes:0,visibility_activation_writes:0,updates:0,deletes:0,merges:0,migrations:0}},packageFingerprint=stableHash(packageAuthority);
  const rawId=`-${BigInt(`0x${sha256(`${PACKAGE_ID}:${packageFingerprint}`).slice(0,15)}`)}`;
  const sourceRef='docs/audits/delta_reign_base_printing_release_v1/official_checklist_projection_v1.json',sourceProjection=JSON.parse(authority.artifacts.get(sourceRef).toString('utf8')),sourceReportPath=`raw_imports:${rawId}|manifest:${authority.manifest.fingerprint}`;
  const children=plan.inserts.map(row=>({id:row.id,card_print_id:row.card_print_id,finish_key:row.finish_key,printing_gv_id:row.printing_gv_id,is_provisional:false,provenance_source:VERSION,provenance_ref:sourceReportPath,created_by:VERSION}));
  const wanted=new Map(authority.manifest.printings.map(row=>[`${row.card_print_id}|${row.finish_key}`,row]));
  const reviews=children.map(child=>({id:deterministicUuid(`${PACKAGE_ID}:truth-review:${child.id}`),card_printing_id:child.id,review_status:'verified',public_visibility:'visible',active:true,reason:'Exact Delta Reign base printing verified by the official Pokemon checklist; Reverse Holo candidates remain outside this release.',confidence:'high',evidence_sources_checked:[sourceProjection.source_url,sourceRef],evidence_sources_for_finish:[sourceProjection.source_url],expected_finish_keys:[child.finish_key],evidence:{version:VERSION,package_fingerprint:packageFingerprint,manifest_fingerprint:authority.manifest.fingerprint,card_print_id:child.card_print_id,printing_id:child.id,printing_gv_id:child.printing_gv_id,finish_key:child.finish_key,official_checklist_evidence:wanted.get(`${child.card_print_id}|${child.finish_key}`).evidence},source_report_path:sourceReportPath,reviewed_by:VERSION,reviewed_at:sourceProjection.reviewed_at}));
  const raw={id:rawId,source:VERSION,status:'processed',notes:'Official-checklist-bound Delta Reign base printing release; Reverse Holo price subtypes retained as unresolved leads.',payload:{version:VERSION,package_fingerprint:packageFingerprint,manifest:authority.manifest,source_artifacts:authority.bindings,unresolved_reverse_holo_leads:87}};
  context={manifest:authority.manifest,plan,packageAuthority,packageFingerprint,code,children,reviews,raw,sanity};before=await readState(client,context);assertBefore(before,context);
  await client.query('begin isolation level serializable');await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${PACKAGE_ID}:${SET_ID}`]);await client.query("set local lock_timeout='5s'");await client.query("set local statement_timeout='60s'");
  const locked=await queryRows(client,'select id::text from public.card_prints where set_id=$1::uuid order by id for update',[SET_ID]);assert.equal(locked.length,141);const insideBefore=await readState(client,context);assert.equal(insideBefore.hash_sha256,before.hash_sha256,'precommit_state_drift');assertBefore(insideBefore,context);
  assert.equal((await client.query(`insert into public.raw_imports(id,source,status,notes,payload,processed_at) values($1::bigint,$2,$3,$4,$5::jsonb,now())`,[raw.id,raw.source,raw.status,raw.notes,JSON.stringify(raw.payload)])).rowCount,1);
  assert.equal((await client.query(`insert into public.card_printings(${CHILD_FIELDS.join(',')}) select ${CHILD_FIELDS.join(',')} from jsonb_populate_recordset(null::public.card_printings,$1::jsonb)`,[JSON.stringify(children)])).rowCount,141);
  assert.equal((await client.query(`insert into public.card_printing_truth_reviews(${REVIEW_FIELDS.join(',')}) select ${REVIEW_FIELDS.join(',')} from jsonb_populate_recordset(null::public.card_printing_truth_reviews,$1::jsonb)`,[JSON.stringify(reviews)])).rowCount,141);
  transient=await assertExact(client,context,before);await client.query('rollback');
 }catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{await client.end();}
 const verify=await connect(databaseUrl,'english_pokemon_base_printing_release_rollback_verify_v1');let after;try{after=await readState(verify,context);assert.equal(after.hash_sha256,before.hash_sha256,'rollback_absence_proof_failed');assertBefore(after,context);}finally{await verify.end();}
 const approvalText=`Approve real ${PACKAGE_ID} apply only. Source commit: ${options.expectedHead}. Fingerprint: ${context.packageFingerprint}. Manifest: ${context.manifest.fingerprint}. Scope: 1 raw evidence receipt, 141 base child printing inserts (83 Normal, 58 Holo), and 141 verified visible printing truth review inserts for hidden Delta Reign me06. Dry-run rollback proof: ${before.hash_sha256} == ${after.hash_sha256}. The 87 Reverse Holo price-subtype leads remain held. No parent, identity, mapping, pricing, publication, image, Storage, Vault, visibility activation, update, delete, merge, or migration writes.`;
 const report={version:VERSION,package_id:PACKAGE_ID,generated_at:new Date().toISOString(),production_project_ref:PROJECT_REF,source_commit:options.expectedHead,package_fingerprint_sha256:context.packageFingerprint,manifest_fingerprint_sha256:context.manifest.fingerprint,rollback_only:true,execution_authorized:false,authority:context.packageAuthority,code:context.code,environment_sanity:context.sanity,counts:context.packageAuthority.counts,boundaries:context.packageAuthority.boundaries,proof:{before_snapshot:before,transient_snapshot:transient,after_snapshot:after,rollback_verified:before.hash_sha256===after.hash_sha256},approval_text:approvalText};
 await Promise.all([writeExclusive(path.join(options.outDir,'guarded_dry_run.json'),report),writeExclusive(path.join(options.outDir,'rollback_plan.json'),{package_id:PACKAGE_ID,source_commit:options.expectedHead,package_fingerprint:context.packageFingerprint,raw_id:context.raw.id,printing_ids:context.children.map(row=>row.id),review_ids:context.reviews.map(row=>row.id),recovery_policy:'No automatic deletion or replay. Independently read back exact IDs after uncertain commit.'})]);
 process.stdout.write(`${JSON.stringify({package_id:PACKAGE_ID,fingerprint:context.packageFingerprint,manifest:context.manifest.fingerprint,counts:report.counts,rollback_proof:`${before.hash_sha256} == ${after.hash_sha256}`,approval_text:approvalText},null,2)}\n`);
}
run().catch(error=>{console.error(error.stack??error.message);process.exitCode=1;});

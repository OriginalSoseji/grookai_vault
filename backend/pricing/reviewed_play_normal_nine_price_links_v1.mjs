import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {assertWarehouseTransactionContextV1} from '../warehouse/transaction_context_v1.mjs';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {proposedGenericPlayNineIntakeIdV1} from '../warehouse/generic_play_nine_intake_v1.mjs';
import {freezeReviewedPlayNormalWarehouseAuthorityV1} from '../warehouse/reviewed_play_normal_authority_v1.mjs';
import {expectedWarehousePrintingRowsV1} from '../warehouse/printing_admission_v1.mjs';
import {priceLinkCodeBindingV4} from './japanese_reviewed_price_links_v4.mjs';
import {REVIEWED_PLAY_NORMAL_NINE_REGISTRY_V1 as registry,REVIEWED_PLAY_NORMAL_NINE_MARKET_LINKS_V1 as VERSION,
  reviewedPlayNormalNineMappingMetadataV1} from './reviewed_play_normal_nine_registry_v1.mjs';

export const REVIEWED_PLAY_NORMAL_NINE_PRICE_LINK_EXECUTION_V1='reviewed_play_normal_nine_price_links_v1';
const root=fileURLToPath(new URL('../../',import.meta.url));
const targets=registry.targets,products=targets.map(t=>t.product_id),parents=targets.map(t=>t.parent.id),children=targets.map(t=>t.printing.id);
const rawId='-'+BigInt('0x'+hash({version:VERSION,registry:registry.fingerprint}).slice(0,15));
const fields=['id','card_print_id','source','external_id','meta','synced_at','active'];
const rows=async(c,sql,args=[])=>(await c.query(sql,args)).rows;
const jsonRows=async(c,sql,args=[])=>(await rows(c,sql,args)).map(r=>r.row);
const same=(a,b,message)=>assert.equal(hash(a),hash(b),message);
const project=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));

export function reviewedPlayNormalNineCodeBindingV1() {
  const files=new Map(priceLinkCodeBindingV4().files.map(f=>[f.file,f]));
  const add=relative=>{const bytes=fs.readFileSync(path.join(root,relative));files.set(relative,{file:relative,sha256:createHash('sha256').update(bytes).digest('hex')});};
  const walk=relative=>{for(const item of fs.readdirSync(path.join(root,relative),{withFileTypes:true})) {
    assert.ok(!item.isSymbolicLink(),'programme_source_symlink_not_allowed');
    const child=relative+'/'+item.name;if(item.isDirectory())walk(child);
    else if(/\.(mjs|json|md)$/.test(item.name))add(child);
  }};
  for(const directory of ['backend/warehouse','backend/pricing','backend/catalog','backend/identity','backend/lib/contracts',
    'docs/contracts','docs/catalog/reviewed_play_normal_nine_v1','docs/catalog/generic_play_stamp_identity_evidence_v2',
    'docs/catalog/stamp_identity_admission_hold_v1','docs/catalog/reviewed_stamped_reverse_supported_v1'])walk(directory);
  // Original evidence bytes are data dependencies, including binary originals.
  const sources='docs/catalog/generic_play_stamp_identity_evidence_v2/sources';
  for(const file of fs.readdirSync(path.join(root,sources)))add(sources+'/'+file);
  for(const dir of ['fronts','product-fronts'])for(const file of fs.readdirSync(path.join(root,'docs/catalog/reviewed_stamped_reverse_supported_v1',dir)))
    add('docs/catalog/reviewed_stamped_reverse_supported_v1/'+dir+'/'+file);
  for(const file of ['backend/env.mjs','backend/supabase_backend_client.mjs','docs/CONTRACT_INDEX.md',
    'docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md','scripts/audits/warehouse_atomic_batch_local_qualification_v1.mjs',
    'scripts/audits/reviewed_play_normal_nine_price_links_local_qualification_v1.mjs',
    'scripts/audits/reviewed_play_normal_programme_local_qualification_v1.mjs',
    'scripts/audits/reviewed_play_normal_programme_v1.mjs',
    'tests/contracts/generic_play_nine_intake_v1.test.mjs',
    'tests/contracts/reviewed_play_normal_authority_v1.test.mjs',
    'tests/contracts/warehouse_transaction_context_v1.test.mjs',
    'tests/fixtures/generic_play_nine_intake_v1.json',
    'docs/checkpoints/identity/STAMP_BULK_ATOMIC_PROMOTION_20261125.md',
    'tests/contracts/reviewed_play_normal_nine_publication_v1.test.mjs',
    'scripts/audits/reviewed_stamped_reverse_programme_v1.mjs',
    'scripts/audits/reviewed_stamped_reverse_programme_local_qualification_v1.mjs',
    'docs/checkpoints/identity/STAMP_REVERSE_SUPPORTED_BULK_20261125.md',
    'tests/contracts/reviewed_stamped_reverse_authority_v1.test.mjs',
    'tests/contracts/reviewed_stamped_reverse_registry_v1.test.mjs',
    'tests/contracts/reviewed_stamped_reverse_publication_v1.test.mjs'])add(file);
  const result=[...files.values()].sort((a,b)=>a.file.localeCompare(b.file));return {files:result,fingerprint:hash(result)};
}

export async function readReviewedPlayNormalNineSourceV1(c) {
  const source={run:(await jsonRows(c,"select to_jsonb(t)row from public.tcgcsv_source_sync_runs t where sync_mode='current_full_sync'and status='completed'and failed_count=0 order by finished_at desc,created_at desc,id desc limit 1"))[0]};
  assert.ok(source.run,'current_reconciled_source_required');
  source.products=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_products t where product_id=any($1::int[])order by product_id',[products]);
  source.groups=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_groups t where group_id=22880');
  source.categories=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_categories t where category_id=3');
  source.observations=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_price_daily_observations t where product_id=any($1::int[])and last_seen_run_id=$2 order by id',[products,source.run.id]);
  source.artifacts=await jsonRows(c,'select to_jsonb(t)row from public.tcgcsv_source_artifacts t where id=any($1::uuid[])order by id',[[...new Set(source.observations.map(o=>o.source_artifact_id))]]);
  return source;
}
function assertSource(source) {
  assert.equal(source.run.status,'completed');assert.equal(source.run.failed_count,0);assert.equal(source.run.sync_mode,'current_full_sync');
  assert.ok(Number.isFinite(Date.parse(source.run.finished_at)));assert.equal(source.products.length,9);
  assert.equal(source.groups.length,1);assert.equal(source.groups[0].name,registry.group_name);
  assert.equal(source.groups[0].source_active,true);assert.equal(source.groups[0].catalog_metadata_status,'current');
  assert.equal(source.categories.length,1);
  for(const t of targets) {
    const p=source.products.find(p=>p.product_id===t.product_id);assert.ok(p);
    for(const key of ['product_id','category_id','group_id','name'])assert.equal(p[key],t.source_product[key]);
    assert.equal(p.source_active,true);assert.equal(p.catalog_metadata_status,'current');
    const numbers=p.extended_data.filter(e=>e.name==='Number');assert.deepEqual(numbers.map(n=>n.value),[t.source_product.number]);
    const quotes=source.observations.filter(o=>o.product_id===t.product_id&&o.subtype_name==='Normal');assert.equal(quotes.length,1);
    const quote=quotes[0];assert.equal(quote.currency,'USD');assert.ok(Number(quote.market_price)>0);
    assert.equal(quote.last_seen_run_id,source.run.id);assert.equal(quote.observed_on,source.run.observed_on);
    assert.ok(source.artifacts.some(a=>a.id===quote.source_artifact_id),'original_source_artifact_required');
  }
}
export async function readReviewedPlayNormalNineMappingSchemaV1(c) {
  const tables=['external_mappings','raw_imports'];
  const schema={columns:await rows(c,"select table_name,column_name,data_type,is_nullable,column_default,is_identity,is_generated,generation_expression from information_schema.columns where table_schema='public'and table_name=any($1::text[])order by table_name,ordinal_position",[tables]),
    constraints:await rows(c,"select c.relname relation,k.conname name,pg_get_constraintdef(k.oid,true)definition from pg_constraint k join pg_class c on c.oid=k.conrelid where k.conrelid=any($1::regclass[])order by 1,2",[tables.map(t=>'public.'+t)]),
    indexes:await rows(c,"select tablename,indexname,indexdef from pg_indexes where schemaname='public'and tablename=any($1::text[])order by 1,2",[tables]),
    triggers:await rows(c,"select c.relname relation,t.tgname,t.tgtype::int type,t.tgenabled,pg_get_triggerdef(t.oid,true)definition,pg_get_functiondef(t.tgfoid)function_definition from pg_trigger t join pg_class c on c.oid=t.tgrelid where t.tgrelid=any($1::regclass[])and not t.tgisinternal order by 1,2",[tables.map(t=>'public.'+t)]),
    rules:await rows(c,"select schemaname,tablename,rulename,definition from pg_rules where schemaname='public'and tablename=any($1::text[])order by 1,2,3",[tables]),
    policies:await rows(c,"select * from pg_policies where schemaname='public'and tablename=any($1::text[])order by tablename,policyname",[tables]),
    security:await rows(c,"select relname,relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner)owner,relacl::text acl from pg_class where oid=any($1::regclass[])order by relname",[tables.map(t=>'public.'+t)])};
  assert.deepEqual(schema.columns.filter(c=>c.table_name==='external_mappings').map(c=>c.column_name),fields);
  assert.deepEqual(schema.columns.filter(c=>c.table_name==='raw_imports').map(c=>c.column_name),['id','payload','source','status','ingested_at','processed_at','notes']);
  assert.ok(schema.columns.every(c=>c.is_identity==='NO'&&c.is_generated==='NEVER'));
  assert.equal(schema.rules.length,0,'unreviewed_mapping_rewrite_rule');
  assert.ok(schema.triggers.every(t=>(t.type&4)===0),'unreviewed_mapping_insert_trigger');
  return schema;
}

// This exact plan is preparable while its deterministic new canonical targets
// are absent. Execution requires the complete approved warehouse/physical chain.
export function buildReviewedPlayNormalNinePriceLinkPlanV1({source,schema,preparedAt,codeBinding=reviewedPlayNormalNineCodeBindingV1()}) {
  assertSource(source);assert.match(codeBinding.fingerprint,/^[a-f0-9]{64}$/);assert.equal(hash(codeBinding.files),codeBinding.fingerprint);
  const at=new Date(preparedAt).toISOString();assert.equal(at,preparedAt);
  const mappings=targets.map(t=>({id:t.mapping_id,card_print_id:t.parent.id,source:'tcgplayer',external_id:String(t.product_id),
    meta:{...reviewedPlayNormalNineMappingMetadataV1(t),admitted_source_sync_run_id:source.run.id,admitted_source_fingerprint:hash(source)},synced_at:at,active:true}));
  const body={version:VERSION,project_ref:'ycdxbpibncqcchqiihfz',registry_fingerprint:registry.fingerprint,prepared_at:at,
    source_snapshot:source,source_fingerprint:hash(source),schema,schema_fingerprint:hash(schema),code_binding:codeBinding,mappings,audit_raw_id:rawId,
    expected:{parent_mapping_inserts:9,audit_receipts:1},boundaries:{existing_updates:0,deletes:0,canonical_writes:0,printing_writes:0,
      review_writes:0,identity_writes:0,owner_writes:0,source_writes:0,price_writes:0,assignment_writes:0,publication_writes:0,sequence_calls:0}};
  return {...body,fingerprint:hash(body)};
}
function assertPlan(plan) {
  const {fingerprint,...body}=plan;assert.equal(hash(body),fingerprint);
  assert.equal(plan.registry_fingerprint,registry.fingerprint);assert.equal(plan.version,VERSION);
  const rebuilt=buildReviewedPlayNormalNinePriceLinkPlanV1({source:plan.source_snapshot,schema:plan.schema,preparedAt:plan.prepared_at,codeBinding:plan.code_binding});
  same(rebuilt,plan,'price_link_plan_scope_changed');
}
async function mappingState(c,plan) {
  const parentMappings=await jsonRows(c,"select (to_jsonb(t)-'id')||jsonb_build_object('id',t.id::text)row from public.external_mappings t where id=any($1::bigint[])or(source='tcgplayer'and(card_print_id=any($2::uuid[])or external_id=any($3::text[])))order by id",[targets.map(t=>t.mapping_id),parents,products.map(String)]);
  const printingMappings=await jsonRows(c,"select to_jsonb(t)row from public.external_printing_mappings t where active and source in('tcgplayer','tcgplayer_market')and(card_printing_id=any($1::uuid[])or split_part(external_id,':',1)=any($2::text[]))order by id",[children,products.map(String)]);
  assert.equal(printingMappings.length,0,'new_exact_printing_mapping_requires_separate_scope');
  const raw=await jsonRows(c,"select(to_jsonb(t)-'id')||jsonb_build_object('id',t.id::text)row from public.raw_imports t where id=$1::bigint",[rawId]);
  return {parentMappings,raw};
}
function auditRow(plan) {return {id:rawId,source:VERSION,status:'processed',notes:'Nine exact reviewed generic Play Normal product links; no stored price or canonical mutation.',
  payload:{version:VERSION,plan_fingerprint:plan.fingerprint,registry_fingerprint:registry.fingerprint,code_fingerprint:plan.code_binding.fingerprint,
    source_sync_run_id:plan.source_snapshot.run.id,source_fingerprint:plan.source_fingerprint,mapping_ids:targets.map(t=>t.mapping_id)}};}
function classify(plan,state) {
  if(!state.parentMappings.length&&!state.raw.length)return 'before';
  same(state.parentMappings.map(r=>({...project(r,fields),synced_at:new Date(r.synced_at).toISOString()})).sort((a,b)=>a.id.localeCompare(b.id)),
    [...plan.mappings].sort((a,b)=>a.id.localeCompare(b.id)),'mapping_collision_or_partial_state');
  same(state.raw.map(r=>project(r,['id','source','status','notes','payload'])),[auditRow(plan)],'mapping_audit_collision_or_partial_state');return 'exact';
}
async function canonicalState(c,{actorUserId}) {
  const canonical={parents:await jsonRows(c,'select to_jsonb(t)row from public.card_prints t where id=any($1::uuid[])order by id',[parents]),
    identities:await jsonRows(c,'select to_jsonb(t)row from public.card_print_identity t where card_print_id=any($1::uuid[])order by id',[parents]),
    printings:await jsonRows(c,'select to_jsonb(t)row from public.card_printings t where card_print_id=any($1::uuid[])order by id',[parents]),
    reviews:await jsonRows(c,'select to_jsonb(t)row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[])order by id',[children])};
  for(const key of ['parents','identities','printings','reviews'])assert.equal(canonical[key].length,9,'complete_nine_warehouse_physical_chain_required:'+key);
  assert.equal((await rows(c,'select id from public.card_print_identity_aliases where legacy_card_print_id=any($1::uuid[])or canonical_card_print_id=any($1::uuid[])',[parents])).length,0,
    'new_reviewed_parent_alias_requires_separate_reconciliation');
  for(const t of targets) {
    same(project(canonical.parents.find(p=>p.id===t.parent.id)??{},Object.keys(t.parent)),t.parent,'exact_new_parent_required');
    const identity=canonical.identities.find(i=>i.id===t.identity.id);assert.ok(identity?.is_active);assert.equal(identity.card_print_id,t.parent.id);
    same(project(identity,Object.keys(t.identity)),t.identity,'exact_active_identity_required');
    same(project(canonical.printings.find(p=>p.id===t.printing.id)??{},Object.keys(t.printing)),t.printing,'exact_verified_child_required');
    const review=canonical.reviews.find(r=>r.id===t.review.id);assert.ok(review);
    same({...project(review,Object.keys(t.review)),reviewed_at:new Date(review.reviewed_at).toISOString()},t.review,'exact_physical_review_required');
    const expected=expectedWarehousePrintingRowsV1(freezeReviewedPlayNormalWarehouseAuthorityV1({productId:t.product_id,candidateId:t.printing_candidate_id}));
    const raw=await jsonRows(c,"select(to_jsonb(t)-'id')||jsonb_build_object('id',t.id::text)row from public.raw_imports t where id=$1::bigint",[t.printing_evidence_raw_id]);
    same(raw.map(r=>project(r,['id','source','status','notes','payload'])),[expected.raw],'actual_original_printing_evidence_required');
  }
  const ids=targets.flatMap(t=>[proposedGenericPlayNineIntakeIdV1(t.product_id),t.printing_candidate_id]);
  const candidates=await rows(c,`select c.id,c.state,c.promoted_card_print_id,c.promoted_card_printing_id,
    c.founder_approved_by_user_id=$2::uuid and c.founder_approved_at is not null and exists(select 1 from public.canon_warehouse_candidate_events e
      where e.candidate_id=c.id and e.event_type='FOUNDER_APPROVED'and e.actor_type='FOUNDER'and e.actor_user_id=$2::uuid) approval_matches
    from public.canon_warehouse_candidates c where c.id=any($1::uuid[])order by c.id`,[ids,actorUserId]);
  assert.equal(candidates.length,18);assert.ok(candidates.every(c=>c.state==='PROMOTED'&&c.approval_matches),'actual_programme_warehouse_approvals_required');
  for(const t of targets){assert.equal(candidates.find(c=>c.id===proposedGenericPlayNineIntakeIdV1(t.product_id)).promoted_card_print_id,t.parent.id);
    assert.equal(candidates.find(c=>c.id===t.printing_candidate_id).promoted_card_printing_id,t.printing.id);}
  canonical.candidates=candidates;canonical.protected_reference_footprints=[];
  for(const [table,column,ids]of [['vault_item_instances','card_print_id',parents],['vault_item_instance_dispositions','card_print_id',parents],
    ['binder_custom_slots','card_printing_id',children]])
    canonical.protected_reference_footprints.push({table,...(await rows(c,`select count(*)::int rows,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),''order by t.id),''))digest from public.${table} t where ${column}=any($1::uuid[])`,[ids]))[0]});
  return canonical;
}

// Internal composition only: the outer programme owns SERIALIZABLE, approval,
// rollback/commit and durable uncertainty handling. No standalone apply CLI.
export async function applyReviewedPlayNormalNinePriceLinksWithinTransactionV1(c,{plan,actorUserId}) {
  assertPlan(plan);assert.match(actorUserId??'',/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  await assertWarehouseTransactionContextV1(c,{serializable:true});
  same(reviewedPlayNormalNineCodeBindingV1(),plan.code_binding,'complete_programme_source_changed');
  for(const name of ['grookai:tcgcsv:current:v1','tcgplayer_market_publication_v1',VERSION])
    assert.equal((await rows(c,'select pg_try_advisory_xact_lock(hashtext($1)) acquired',[name]))[0].acquired,true,'source_or_publication_writer_active');
  same(await readReviewedPlayNormalNineMappingSchemaV1(c),plan.schema,'mapping_schema_or_effects_changed');
  same(await readReviewedPlayNormalNineSourceV1(c),plan.source_snapshot,'mapping_current_source_changed');
  const canonical=await canonicalState(c,{actorUserId}),before=await mappingState(c,plan),classification=classify(plan,before);
  if(classification==='exact')return {state:'already_applied',mappings:0,audits:0,transaction_owned_by_caller:true};
  await assertExecuteCanonWriteV1({execution_name:REVIEWED_PLAY_NORMAL_NINE_PRICE_LINK_EXECUTION_V1,
    payload_snapshot:{plan_fingerprint:plan.fingerprint,registry_fingerprint:registry.fingerprint,expected:plan.expected},
    contract_assertions:[{ok:true,contract_name:'INGESTION_PIPELINE_CONTRACT_V1',violation_type:'reviewed_raw_first_mapping_scope',reason:'Exact approved warehouse parents/Normal evidence and original source are verified.'}],
    write_target:c,audit_target:c,ledger_target:c,transaction_control:'external',actor_type:'system_worker',actor_id:actorUserId,
    source_worker:VERSION,source_system:'warehouse',
    proofs:[{name:'exact_links_and_all_original_canonical_rows',contract_name:'PRICING_ENGINE_V1',violation_type:'price_link_readback_mismatch',
      async run(client){assert.equal(classify(plan,await mappingState(client,plan)),'exact');same(await canonicalState(client,{actorUserId}),canonical,'canonical_or_warehouse_rows_changed');
        same(await readReviewedPlayNormalNineSourceV1(client),plan.source_snapshot,'source_changed_during_mapping');return {ok:true};}}],
    async write(client){assert.equal((await client.query(`insert into public.external_mappings(${fields.join(',')})
      select ${fields.join(',')} from jsonb_populate_recordset(null::public.external_mappings,$1::jsonb)`,[JSON.stringify(plan.mappings)])).rowCount,9);
      const raw=auditRow(plan);assert.equal((await client.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',
        [raw.id,raw.source,raw.status,raw.notes,JSON.stringify(raw.payload)])).rowCount,1);}});
  return {state:'applied_within_outer_transaction',mappings:9,audits:1,transaction_owned_by_caller:true,plan_fingerprint:plan.fingerprint};
}

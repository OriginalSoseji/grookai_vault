import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {readExecutionSchema} from '../catalog/master_index_printing_execution_v1.mjs';
import {assertExecuteCanonWriteV1} from '../lib/contracts/execute_canon_write_v1.mjs';
import {assertWarehouseTransactionContextV1} from './transaction_context_v1.mjs';
import {loadReviewedStampedReverseAuthorityV1,assertReviewedStampedReverseTargetV1} from './reviewed_stamped_reverse_authority_v1.mjs';
import {prepareWarehouseExistingReviewSetInvariantsV1,assertWarehouseSetInvariantsV1} from './set_invariants_v1.mjs';
import {reviewedPlayNormalNineCodeBindingV1,readReviewedPlayNormalNineMappingSchemaV1} from '../pricing/reviewed_play_normal_nine_price_links_v1.mjs';
import {REVIEWED_STAMPED_REVERSE_REGISTRY_V1 as registry,REVIEWED_STAMPED_REVERSE_PRODUCT_IDS_V1 as productIds,
  REVIEWED_STAMPED_REVERSE_REVIEW_V1,reviewedStampedReverseMappingMetadataV1} from '../pricing/reviewed_stamped_reverse_registry_v1.mjs';

export const REVIEWED_STAMPED_REVERSE_PROGRAMME_V1='REVIEWED_STAMPED_REVERSE_PROGRAMME_V1';
export const REVIEWED_STAMPED_REVERSE_EXECUTION_V1='reviewed_stamped_reverse_programme_v1';
export const REVIEWED_STAMPED_REVERSE_QUALIFICATION_DB_V1='stamped_bulk_supported_review_qualification_v1';
export const REVIEWED_STAMPED_REVERSE_QUALIFICATION_DATABASES_V1=Object.freeze([
  REVIEWED_STAMPED_REVERSE_QUALIFICATION_DB_V1,'stamped_bulk_supported_review_release_qualification_v1']);
const root=fileURLToPath(new URL('../../',import.meta.url));
const targets=registry.targets,parentIds=targets.map(t=>t.parent.id),printingIds=targets.map(t=>t.printing.id);
const reviewIds=targets.map(t=>t.review.id),physicalRawIds=[...new Set(targets.map(t=>t.physical_raw_id))];
const auditId='-'+BigInt('0x'+hash({version:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,registry:registry.fingerprint}).slice(0,15));
const rawIds=[...physicalRawIds,auditId];
const fields=['id','card_print_id','source','external_id','meta','synced_at','active'];
const reviewFields=['id','card_printing_id','review_status','public_visibility','active','confidence','reason',
  'evidence_sources_checked','evidence_sources_for_finish','expected_finish_keys','evidence','source_report_path','reviewed_by','reviewed_at'];
const expected={existing_parents:54,existing_printings:54,verified_review_inserts:54,parent_mapping_inserts:51,
  parent_mapping_updates:2,raw_inserts:24,parent_inserts:0,printing_inserts:0,identity_writes:0,image_writes:0,
  owner_writes:0,source_writes:0,stored_price_writes:0,publication_writes:0,schema_writes:0,sequence_calls:0};
const same=(a,b,why)=>assert.equal(hash(a),hash(b),why);
const rows=async(c,sql,args=[])=>(await c.query(sql,args)).rows;
const json=async(c,sql,args=[])=>(await rows(c,sql,args)).map(r=>r.row);
const project=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));
const sorted=values=>[...values].sort((a,b)=>String(a.id).localeCompare(String(b.id)));

export function reviewedStampedReverseProgrammeCodeBindingV1(){
  const files=new Map(reviewedPlayNormalNineCodeBindingV1().files.map(f=>[f.file,f]));
  const add=relative=>{const file=path.resolve(root,relative);assert.equal(fs.realpathSync(file),file,'reviewed_reverse_producer_symlink');
    files.set(relative,{file:relative,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});};
  const walk=relative=>{for(const item of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
    assert.equal(item.isSymbolicLink(),false);const child=relative+'/'+item.name;if(item.isDirectory())walk(child);else add(child);}};
  walk('docs/catalog/reviewed_stamped_reverse_supported_v1');
  for(const f of ['backend/warehouse/reviewed_stamped_reverse_programme_v1.mjs','backend/warehouse/reviewed_stamped_reverse_authority_v1.mjs',
    'backend/pricing/reviewed_stamped_reverse_registry_v1.mjs',
    'scripts/audits/reviewed_stamped_reverse_programme_v1.mjs',
    'tests/contracts/reviewed_stamped_reverse_authority_v1.test.mjs',
    'tests/contracts/reviewed_stamped_reverse_registry_v1.test.mjs'])add(f);
  const list=[...files.values()].sort((a,b)=>a.file.localeCompare(b.file));return{fingerprint:hash(list),files:list};
}

export async function readReviewedStampedReverseSourceV1(c){
  const run=(await json(c,"select to_jsonb(t)row from public.tcgcsv_source_sync_runs t where sync_mode='current_full_sync'and status='completed'and failed_count=0 order by finished_at desc,created_at desc,id desc limit 1"))[0];
  assert.ok(run,'reviewed_reverse_current_source_required');
  const source={run,products:await json(c,'select to_jsonb(t)row from public.tcgcsv_source_products t where product_id=any($1::int[])order by product_id',[productIds])};
  const groups=[...new Set(targets.filter(t=>t.source_product).map(t=>t.source_product.group_id))].sort((a,b)=>a-b);
  source.groups=await json(c,'select to_jsonb(t)row from public.tcgcsv_source_groups t where group_id=any($1::int[])order by group_id',[groups]);
  source.categories=await json(c,'select to_jsonb(t)row from public.tcgcsv_source_categories t where category_id=3');
  source.observations=await json(c,'select to_jsonb(t)row from public.tcgcsv_source_price_daily_observations t where product_id=any($1::int[])and last_seen_run_id=$2 order by id',[productIds,run.id]);
  source.artifacts=await json(c,'select to_jsonb(t)row from public.tcgcsv_source_artifacts t where id=any($1::uuid[])order by id',[[...new Set(source.observations.map(o=>o.source_artifact_id))]]);
  assert.equal(source.products.length,53);assert.equal(source.categories.length,1);assert.equal(source.groups.length,groups.length);
  for(const g of source.groups){assert.equal(g.category_id,3);assert.equal(g.source_active,true);assert.equal(g.catalog_metadata_status,'current');}
  for(const t of targets.filter(t=>t.source_product)){
    const p=source.products.find(p=>p.product_id===t.source_product.product_id);assert.ok(p);
    for(const key of ['product_id','category_id','group_id','name'])assert.equal(p[key],t.source_product[key],'reviewed_reverse_source_identity_changed:'+key);
    same(p.extended_data.filter(e=>e.name==='Number').map(e=>e.value),[t.source_product.number],'reviewed_reverse_source_number_changed');
    assert.equal(p.source_active,true);assert.equal(p.catalog_metadata_status,'current');
    const quotes=source.observations.filter(o=>o.product_id===p.product_id&&o.subtype_name==='Reverse Holofoil');
    assert.ok(quotes.length<=1,'reviewed_reverse_duplicate_source_quote');
    for(const q of quotes){assert.equal(q.currency,'USD');assert.equal(q.last_seen_run_id,run.id);assert.equal(q.observed_on,run.observed_on);
      assert.ok(source.artifacts.some(a=>a.id===q.source_artifact_id),'reviewed_reverse_original_artifact_required');}
  }
  return source;
}

async function readSchema(c){
  const printing=await readExecutionSchema(c),mapping=await readReviewedPlayNormalNineMappingSchemaV1(c);
  assert.equal(printing.rules.length,0);assert.ok(printing.triggers.every(t=>t.table==='card_printing_truth_reviews'&&
    t.name==='trg_card_printing_truth_reviews_updated_at_v1'&&/BEFORE UPDATE/.test(t.definition)),'reviewed_reverse_unreviewed_printing_trigger');
  assert.equal(mapping.triggers.length,0,'reviewed_reverse_unreviewed_mapping_update_effect');
  const security=await rows(c,"select relname,relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner)owner,relacl::text acl from pg_class where oid=any($1::regclass[])order by relname",[['public.card_printing_truth_reviews','public.card_printings','public.raw_imports','public.external_mappings']]);
  const policies=await rows(c,"select *from pg_policies where schemaname='public'and tablename=any($1::text[])order by tablename,policyname",[['card_printing_truth_reviews','card_printings','raw_imports','external_mappings']]);
  return{printing,mapping,security,policies};
}

async function readState(c){
  const parents=await json(c,'select to_jsonb(t)row from public.card_prints t where id=any($1::uuid[])order by id',[parentIds]);
  const identities=await json(c,'select to_jsonb(t)row from public.card_print_identity t where card_print_id=any($1::uuid[])order by id',[parentIds]);
  const printings=await json(c,'select to_jsonb(t)row from public.card_printings t where card_print_id=any($1::uuid[])or id=any($2::uuid[])order by id',[parentIds,printingIds]);
  const reviews=await json(c,'select to_jsonb(t)row from public.card_printing_truth_reviews t where card_printing_id=any($1::uuid[])or id=any($2::uuid[])order by id',[printingIds,reviewIds]);
  const mappingIds=targets.filter(t=>t.source_product).map(t=>t.proposed_new_mapping_id);
  const mappings=await json(c,`select (to_jsonb(t)-'id')||jsonb_build_object('id',t.id::text)row from public.external_mappings t
    where card_print_id=any($1::uuid[])or id=any($2::bigint[])or(source='tcgplayer'and external_id=any($3::text[]))order by id`,[parentIds,mappingIds,productIds.map(String)]);
  const legacyClaims=await rows(c,'select id,gv_id,tcgplayer_id from public.card_prints where tcgplayer_id::text=any($1::text[])order by id',[productIds.map(String)]);
  const raw=await json(c,"select (to_jsonb(t)-'id')||jsonb_build_object('id',t.id::text)row from public.raw_imports t where id=any($1::bigint[])order by id",[rawIds]);
  const sets=await json(c,'select to_jsonb(t)row from public.sets t where id=any($1::uuid[])order by id',[[...new Set(targets.map(t=>t.parent.set_id))]]);
  const games=await json(c,'select to_jsonb(t)row from public.games t where id=any($1::uuid[])order by id',[[...new Set(parents.map(p=>p.game_id))]]);
  const printingMappings=await json(c,'select to_jsonb(t)row from public.external_printing_mappings t where card_printing_id=any($1::uuid[])order by id',[printingIds]);
  return{parents,identities,printings,reviews,mappings,legacyClaims,raw,sets,games,printingMappings};
}

function assertCanonical(state,authority){
  assert.equal(state.parents.length,54);assert.equal(state.printings.length,54);
  for(const t of targets){const parent=state.parents.find(p=>p.id===t.parent.id),printing=state.printings.find(p=>p.id===t.printing.id);assert.ok(parent&&printing);
    const set=state.sets.find(s=>s.id===parent.set_id),game=state.games.find(g=>g.id===parent.game_id);assert.ok(set&&game);
    assert.equal(parent.set_code,set.code);assert.equal(set.game,game.code);
    assertReviewedStampedReverseTargetV1({authority,parent:{...parent,printed_coordinate:parent.number,game:game.code,language:parent.identity_domain==='pokemon_eng_standard'?'en':null},printing});
    const identities=state.identities.filter(i=>i.card_print_id===parent.id&&i.is_active);assert.equal(identities.length,1);
    assert.equal(identities[0].identity_domain,parent.identity_domain);
    assert.equal(identities[0].id,t.retained_projection.identity_id);
    for(const key of['is_provisional','provenance_source','provenance_ref','created_by'])same(printing[key],t.retained_projection[key],'reviewed_reverse_retained_provenance_changed:'+key);
    if(t.source_product){assert.ok(state.mappings.filter(m=>m.source==='tcgplayer'&&m.external_id===String(t.source_product.product_id)).every(m=>m.card_print_id===parent.id),'reviewed_reverse_product_other_mapping_owner');
      assert.ok(state.legacyClaims.filter(p=>String(p.tcgplayer_id)===String(t.source_product.product_id)).every(p=>p.id===parent.id),'reviewed_reverse_product_other_legacy_claim');}
  }
}

export async function prepareReviewedStampedReverseProgrammePlanV1(c,{preparedAt=new Date().toISOString()}={}){
  assert.ok(Number.isFinite(Date.parse(preparedAt)));
  const sessionTimezone=(await rows(c,"select current_setting('TimeZone') value"))[0].value;
  const mappingSyncedAt=(await rows(c,'select to_jsonb($1::timestamptz) value',[preparedAt]))[0].value;
  const authority=loadReviewedStampedReverseAuthorityV1(),before=await readState(c);assertCanonical(before,authority);
  assert.equal(before.reviews.length,0,'reviewed_reverse_existing_review_requires_adjudication_or_receipt');
  assert.equal(before.raw.length,0,'reviewed_reverse_existing_receipt_requires_readback');
  const schema=await readSchema(c),source=await readReviewedStampedReverseSourceV1(c),codeBinding=reviewedStampedReverseProgrammeCodeBindingV1();
  const mappingMutations=[];
  for(const t of targets.filter(t=>t.source_product)){
    const own=before.mappings.filter(m=>m.card_print_id===t.parent.id&&m.source==='tcgplayer'),identity=before.identities.find(i=>i.card_print_id===t.parent.id&&i.is_active);
    const metadata=reviewedStampedReverseMappingMetadataV1(t,identity);
    if(t.expected_wrong_product_id){assert.equal(own.length,1);assert.equal(own[0].external_id,t.expected_wrong_product_id);assert.equal(own[0].active,true);
      mappingMutations.push({type:'update',before:own[0],after:{...own[0],external_id:String(t.source_product.product_id),
        meta:{...(own[0].meta??{}),...metadata,prior_mapping_row_sha256:hash(own[0])},synced_at:mappingSyncedAt}});
    }else{assert.equal(own.length,0,'reviewed_reverse_unexpected_existing_product_link');
      assert.ok(!before.mappings.some(m=>m.id===t.proposed_new_mapping_id),'reviewed_reverse_mapping_uuid_collision');
      mappingMutations.push({type:'insert',before:null,after:{id:t.proposed_new_mapping_id,card_print_id:t.parent.id,source:'tcgplayer',
        external_id:String(t.source_product.product_id),meta:metadata,synced_at:mappingSyncedAt,active:true}});}
    assert.equal(mappingMutations.at(-1).after.id,t.retained_projection.mapping_id);
  }
  assert.equal(mappingMutations.filter(m=>m.type==='insert').length,51);assert.equal(mappingMutations.filter(m=>m.type==='update').length,2);
  const physicalRaw=[...authority.manifests].map(([code,manifest])=>({id:targets.find(t=>t.set_code===code).physical_raw_id,
    source:REVIEWED_STAMPED_REVERSE_REVIEW_V1,status:'processed',notes:'Exact reviewed existing stamped Reverse facts; no parent, printing, identity, image or owner mutation.',
    payload:{manifest,physical_evidence_fingerprint:authority.index.fingerprint,artifacts:[...authority.artifactsBySet.get(code)].map(([ref,b])=>({ref,base64:Buffer.from(b).toString('base64')}))}}));
  const setProfiles=await prepareWarehouseExistingReviewSetInvariantsV1(c,{targets,manifests:authority.manifests,mappingMutations});
  const body={version:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,project_ref:'ycdxbpibncqcchqiihfz',prepared_at:preparedAt,
    session_timezone:sessionTimezone,
    registry_fingerprint:registry.fingerprint,code_fingerprint:codeBinding.fingerprint,code_binding:codeBinding,before,schema,
    source_snapshot:source,source_fingerprint:hash(source),mapping_mutations:mappingMutations,physical_raw:physicalRaw,
    reviews:targets.map(t=>t.review),set_profiles:setProfiles,audit_raw_id:auditId,expected,
    existing_uuid_reassigned:false,publication_activation:false,held_identity_clearance:false};
  return{...body,fingerprint:hash(body)};
}

function assertPlan(plan){
  const{fingerprint,...body}=plan;assert.equal(hash(body),fingerprint,'reviewed_reverse_plan_fingerprint_changed');
  assert.equal(plan.version,REVIEWED_STAMPED_REVERSE_PROGRAMME_V1);assert.equal(plan.project_ref,'ycdxbpibncqcchqiihfz');
  assert.equal(plan.registry_fingerprint,registry.fingerprint);same(plan.expected,expected,'reviewed_reverse_write_scope_changed');
  assert.equal(plan.audit_raw_id,auditId);assert.equal(plan.existing_uuid_reassigned,false);assert.equal(plan.publication_activation,false);assert.equal(plan.held_identity_clearance,false);
  same(plan.reviews,targets.map(t=>t.review),'reviewed_reverse_review_scope_changed');
  assert.equal(plan.mapping_mutations.length,53);assert.equal(plan.physical_raw.length,23);
}

async function assertDecision(c,plan,decision,{qualification,releaseGate}){
  assert.equal(decision?.version,'REVIEWED_STAMPED_REVERSE_PROGRAMME_OWNER_DECISION_V1');
  assert.equal(decision.decision,'approved');assert.equal(decision.programme_plan_fingerprint,plan.fingerprint);
  assert.equal(decision.code_fingerprint,plan.code_fingerprint);
  assert.match(decision.actor_user_id??'',/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  assert.match(decision.owner_evidence_sha256??'',/^[a-f0-9]{64}$/);
  const at=Date.parse(decision.approved_at),until=Date.parse(decision.expires_at);
  assert.ok(Number.isFinite(at)&&Number.isFinite(until)&&at<=Date.now()+300000&&until>Date.now()&&until-at<=86400000,
    'reviewed_reverse_decision_expired_or_invalid');
  if(qualification){
    assert.ok(['127.0.0.1','localhost','::1'].includes(c.connectionParameters?.host));
    assert.ok(REVIEWED_STAMPED_REVERSE_QUALIFICATION_DATABASES_V1.includes((await rows(c,'select current_database()name'))[0].name));
    assert.equal(decision.actual_owner_decision,false);
    assert.equal(decision.actor_user_id,'00000000-0000-4000-a000-000000000901');
  }else{
    assert.equal(process.env.GROOKAI_PREFLIGHT_ACK,'1','reviewed_reverse_scoped_ack_required');
    assert.equal(decision.actual_owner_decision,true,'reviewed_reverse_actual_owner_decision_required');
    const p=c.connectionParameters;
    assert.ok(String(p?.host).includes('ycdxbpibncqcchqiihfz')||String(p?.user).endsWith('.ycdxbpibncqcchqiihfz'));
    assert.equal(c.connection?.stream?.authorized,true,'reviewed_reverse_verified_production_tls_required');
    const counts=(await rows(c,'select(select count(*)::int from public.card_prints)cards,(select count(*)::int from public.sets)sets,(select count(*)::int from public.card_print_traits)traits'))[0];
    assert.ok(counts.cards>=40000&&counts.sets>=150&&counts.traits>=5000,'Environment mismatch — fix before proceeding.');
    const founder=(await rows(c,`select count(*)::int n,bool_and(actor.id=$1::uuid)matches from(
      select distinct u.id from auth.users u join public.user_entitlements e
      on e.user_id=u.id or(e.user_id is null and lower(e.email)=lower(u.email))where e.is_active and e.role='founder')actor`,[decision.actor_user_id]))[0];
    assert.equal(founder.n,1);assert.equal(founder.matches,true,'reviewed_reverse_actual_founder_required');
    assert.equal(releaseGate?.version,'REVIEWED_STAMPED_REVERSE_PROGRAMME_SOURCE_RELEASE_V1');
    assert.equal(releaseGate.code_fingerprint,plan.code_fingerprint);
    for(const key of['normal_commit_passed','normal_push_passed','hosted_checks_passed','exact_head_review_passed','merged_source_checks_passed','deployed_readback_passed'])
      assert.equal(releaseGate[key],true,'reviewed_reverse_source_release_required:'+key);
    const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
    assert.equal(git(['rev-parse','HEAD']),releaseGate.execution_commit);
    assert.equal(git(['status','--porcelain','--untracked-files=no']),'');
  }
}

function auditRow(plan,decision){
  return{id:auditId,source:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,status:'processed',
    notes:'Exact RAW-first54-review/53-product programme; preserve all existing identities, printings, images and collector rows.',
    payload:{programme_plan:plan,owner_decision:project(decision,['version','decision','programme_plan_fingerprint','code_fingerprint',
      'actor_user_id','approved_at','expires_at','owner_evidence_sha256','actual_owner_decision'])}};
}

function assertPreserved(plan,state){
  for(const key of['parents','identities','printings','sets','games','legacyClaims','printingMappings'])
    same(state[key],plan.before[key],'reviewed_reverse_retained_state_changed:'+key);
  assertCanonical(state,loadReviewedStampedReverseAuthorityV1());
}

async function verifyAfter(c,plan,decision){
  const state=await readState(c);assertPreserved(plan,state);
  assert.equal(state.reviews.length,54,'reviewed_reverse_review_count_mismatch');
  const observedReviews=state.reviews.map(r=>({...project(r,reviewFields),reviewed_at:new Date(r.reviewed_at).toISOString()}));
  same(sorted(observedReviews),sorted(plan.reviews),'reviewed_reverse_review_row_mismatch');
  const replaced=new Map(plan.mapping_mutations.filter(m=>m.type==='update').map(m=>[m.before.id,m.after]));
  const expectedMappings=[...plan.before.mappings.map(m=>replaced.get(m.id)??m),...plan.mapping_mutations.filter(m=>m.type==='insert').map(m=>m.after)];
  same(sorted(state.mappings),sorted(expectedMappings),'reviewed_reverse_exact_mapping_delta_mismatch');
  const expectedRaw=[...plan.physical_raw,auditRow(plan,decision)];assert.equal(state.raw.length,24);
  same(sorted(state.raw.map(r=>project(r,['id','source','status','notes','payload']))),sorted(expectedRaw),'reviewed_reverse_raw_evidence_mismatch');
  await assertWarehouseSetInvariantsV1(c,plan.set_profiles,{after:true});
  same(await readSchema(c),plan.schema,'reviewed_reverse_schema_or_effects_changed');
  const options=await rows(c,'select id,card_print_id,finish_key,printing_gv_id,finish_is_active from public.get_public_card_printing_options_v1($1::uuid[],1000,0)order by id',[parentIds]);
  same(sorted(options),sorted(targets.map(t=>({...t.printing,finish_is_active:true}))),'reviewed_reverse_public_options_mismatch');
  return state;
}

function committedRows(state){
  return{reviews:state.reviews,raw:state.raw,mappings:state.mappings};
}

export async function verifyReviewedStampedReverseProgrammeReceiptV1(c,{plan,receipt}){
  assertPlan(plan);assert.equal(receipt?.version,REVIEWED_STAMPED_REVERSE_PROGRAMME_V1);
  assert.equal(receipt.plan_fingerprint,plan.fingerprint);assert.equal(receipt.code_fingerprint,plan.code_fingerprint);
  const state=await verifyAfter(c,plan,receipt.owner_decision);
  same(committedRows(state),receipt.committed_rows,'reviewed_reverse_frozen_receipt_row_drift');
  return{exact:true,write_count:0,expected};
}

async function applyWithinTransaction(c,{plan,decision,qualification,releaseGate}){
  assertPlan(plan);await assertWarehouseTransactionContextV1(c,{serializable:true});
  await assertDecision(c,plan,decision,{qualification,releaseGate});
  same(reviewedStampedReverseProgrammeCodeBindingV1(),plan.code_binding,'reviewed_reverse_complete_source_changed');
  for(const name of['grookai:tcgcsv:current:v1','tcgplayer_market_publication_v1',REVIEWED_STAMPED_REVERSE_PROGRAMME_V1])
    assert.equal((await rows(c,'select pg_try_advisory_xact_lock(hashtext($1))acquired',[name]))[0].acquired,true,'reviewed_reverse_competing_writer');
  same(await prepareReviewedStampedReverseProgrammePlanV1(c,{preparedAt:plan.prepared_at}),plan,'reviewed_reverse_before_state_changed');
  const age=Date.now()-Date.parse(plan.source_snapshot.run.finished_at);
  assert.ok(age>=-360000&&age<32*3600000,'reviewed_reverse_source_freshness_runway_required');
  await assertWarehouseSetInvariantsV1(c,plan.set_profiles);
  let after;
  await assertExecuteCanonWriteV1({execution_name:REVIEWED_STAMPED_REVERSE_EXECUTION_V1,
    payload_snapshot:{programme_plan_fingerprint:plan.fingerprint,registry_fingerprint:registry.fingerprint,expected},
    contract_assertions:[{ok:true,contract_name:'PRINTING_TRUTH_CONTRACT_V1',violation_type:'reviewed_existing_reverse_scope',
      reason:'Exact physical Master bytes and existing identities are checked; source prices never supply finish authority.'}],
    write_target:c,ledger_target:c,audit_target:c,transaction_control:'external',actor_type:'founder',actor_id:decision.actor_user_id,
    source_worker:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,source_system:'reviewed_master',
    proofs:[{name:'exact_reviews_links_and_all_retained_rows',contract_name:'PRINTING_TRUTH_CONTRACT_V1',violation_type:'reviewed_reverse_post_write_mismatch',
      async run(client){after=await verifyAfter(client,plan,decision);same(await readReviewedStampedReverseSourceV1(client),plan.source_snapshot,'reviewed_reverse_current_source_changed_during_write');
        same(reviewedStampedReverseProgrammeCodeBindingV1(),plan.code_binding,'reviewed_reverse_source_changed_during_write');return{ok:true};}}],
    async write(client){
      // The complete unmodified source frame and bound physical artifacts enter
      // private RAW receipts before any truth review or product correction.
      for(const r of[auditRow(plan,decision),...plan.physical_raw])
        assert.equal((await client.query('insert into public.raw_imports(id,source,status,notes,payload)values($1::bigint,$2,$3,$4,$5::jsonb)',
          [r.id,r.source,r.status,r.notes,JSON.stringify(r.payload)])).rowCount,1);
      assert.equal((await client.query(`insert into public.card_printing_truth_reviews(${reviewFields.join(',')})
        select ${reviewFields.join(',')} from jsonb_populate_recordset(null::public.card_printing_truth_reviews,$1::jsonb)`,[JSON.stringify(plan.reviews)])).rowCount,54);
      for(const m of plan.mapping_mutations.filter(m=>m.type==='update'))
        assert.equal((await client.query(`update public.external_mappings t set external_id=$2,meta=$3::jsonb,synced_at=$4::timestamptz
          where id=$1::bigint and to_jsonb(t)=to_jsonb(jsonb_populate_record(null::public.external_mappings,$5::jsonb))`,
          [m.before.id,m.after.external_id,JSON.stringify(m.after.meta),m.after.synced_at,JSON.stringify(m.before)])).rowCount,1,'reviewed_reverse_mapping_compare_and_swap_failed');
      const inserts=plan.mapping_mutations.filter(m=>m.type==='insert').map(m=>m.after);
      assert.equal((await client.query(`insert into public.external_mappings(${fields.join(',')})select ${fields.join(',')}
        from jsonb_populate_recordset(null::public.external_mappings,$1::jsonb)`,[JSON.stringify(inserts)])).rowCount,51);
    }});
  assert.ok(after);
  return{version:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,
    expected,owner_decision:project(decision,['version','decision','programme_plan_fingerprint','code_fingerprint','actor_user_id',
      'approved_at','expires_at','owner_evidence_sha256','actual_owner_decision']),committed_rows:committedRows(after),
    precommit_proven:true,automatic_retry_allowed:false};
}

export async function runReviewedStampedReverseProgrammeV1({client:c,plan,mode='preflight',decision=null,qualification=false,
  releaseGate=null,rollbackReceipt=null,committedReceipt=null,beforeCommit=async()=>{}}){
  assertPlan(plan);assert.ok(['preflight','rollback','apply','readback'].includes(mode));
  assert.ok(c.connection&&typeof c.connection.once==='function','reviewed_reverse_real_client_required');
  let ready;const listen=m=>{ready=m.status;};c.connection.once('readyForQuery',listen);
  try{await c.query('select 1');}finally{c.connection.removeListener('readyForQuery',listen);}
  assert.equal(ready,'I','reviewed_reverse_dedicated_idle_client_required');
  if(mode==='apply'&&!committedReceipt){
    assert.equal(rollbackReceipt?.version,REVIEWED_STAMPED_REVERSE_PROGRAMME_V1);assert.equal(rollbackReceipt.mode,'rollback');
    assert.equal(rollbackReceipt.plan_fingerprint,plan.fingerprint);assert.equal(rollbackReceipt.code_fingerprint,plan.code_fingerprint);
    assert.equal(rollbackReceipt.rollback_proven,true,'reviewed_reverse_matching_whole_rollback_required');
  }
  let started=false,commitSent=false,committed=false,receipt=null;
  try{
    started=true;await c.query(mode==='preflight'||mode==='readback'||committedReceipt?
      'begin isolation level repeatable read read only':'begin isolation level serializable');
    await c.query("set local lock_timeout='3s'");await c.query("select set_config('TimeZone',$1,true)",[plan.session_timezone]);
    if(committedReceipt){await verifyReviewedStampedReverseProgrammeReceiptV1(c,{plan,receipt:committedReceipt});
      await c.query('rollback');started=false;return{version:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,mode,status:'already_applied',
        write_count:0,committed:false,receipt:committedReceipt,plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,automatic_retry_allowed:false};}
    assert.notEqual(mode,'readback','reviewed_reverse_exact_committed_receipt_required');
    if(mode==='preflight'){
      same(await prepareReviewedStampedReverseProgrammePlanV1(c,{preparedAt:plan.prepared_at}),plan,'reviewed_reverse_preflight_drift');
      await assertWarehouseSetInvariantsV1(c,plan.set_profiles);await c.query('rollback');started=false;
      return{version:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,mode,status:'prepared',committed:false,write_count:0,
        plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,automatic_retry_allowed:false};
    }
    receipt=await applyWithinTransaction(c,{plan,decision,qualification,releaseGate});
    if(mode==='apply'){await beforeCommit(receipt);commitSent=true;await c.query('commit');committed=true;}
    else await c.query('rollback');started=false;
    if(mode==='rollback'){
      same(await prepareReviewedStampedReverseProgrammePlanV1(c,{preparedAt:plan.prepared_at}),plan,'reviewed_reverse_whole_rollback_changed_state');
    }
    return{version:REVIEWED_STAMPED_REVERSE_PROGRAMME_V1,mode,status:committed?'committed':'rolled_back',committed,
      rollback_proven:mode==='rollback',receipt,plan_fingerprint:plan.fingerprint,code_fingerprint:plan.code_fingerprint,automatic_retry_allowed:false};
  }catch(error){error.committed=committed;error.commit_uncertain=commitSent&&!committed;
    error.rollback_uncertain=false;error.proposed_receipt=receipt;error.automatic_retry_allowed=false;
    if(started&&!committed)await c.query('rollback').catch(()=>{error.rollback_uncertain=true;});throw error;
  }
}

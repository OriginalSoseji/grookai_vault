import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planPricingCompletionExactMappingContextV1, preparePricingCompletionExactMappingReadbackV1, MAPPING_CONTEXT_SCOPE_V1 } from '../../backend/pricing/pricing_completion_exact_mapping_context_v1.mjs';
import { validateTcgplayerExactMappingCandidateForApplyV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs';
import { jungleSourcePayloadHashV1 as payloadHash } from '../../backend/pricing/jungle_edition_source_review_v1.mjs';
import { PRICING_COMPLETION_OPERATOR_CA_SHA256_V1 } from '../../backend/pricing/pricing_completion_operator_readback_v1.mjs';

function bindProduct(p) { p.raw_payload={productId:p.product_id,categoryId:p.category_id,groupId:p.group_id,name:p.name,extendedData:p.extended_data};p.payload_hash=payloadHash(p.raw_payload);return p; }

function fixture() {
  const source = { decision_id:'d1',source_observation_id:'o1',source_product_id:1,source_subtype_name:'Normal',decision:'quarantine',
    primary_reason:'missing_active_source_mapping',product_scope_result:'in_scope',source_sync_run_id:'sync',source_price_row_identity:'price1',
    currency:'USD',source_row_hash:'payload',source_artifact_hash:'artifact',category_id:3,group_id:10,
    source_product_name:'Pikachu',source_group_name:'Base Set',observed_payload_hash:'payload' };
  return { sourceRows:[source],binding:{run_id:'run',publication_set_id:'set',source_sync_run_id:'sync',observed_on:'2026-10-13'},context:{
    products:[bindProduct({product_id:1,category_id:3,group_id:10,group_category_id:3,name:'Pikachu',group_name:'Base Set',
      extended_data:[{name:'Number',value:'58/102'}],last_seen_run_id:'sync',source_active:true,catalog_metadata_status:'current'})],
    group_consensus:[{group_id:10,mapping_count:7,mapped_source_product_count:7,set_count:1,set_id:'targetset',set_code:'base1',invalid_target_count:0}],
    targets:[{card_print_id:'target',gv_id:'GV1',game:'pokemon',set_id:'targetset',set_game:'pokemon',set_code:'base1',name:'Pikachu',number:'058',variant_key:'',
      embedded_external_id:null,embedded_source:null,active_standard_identity_count:1,active_tcgplayer_mapping_count:0}],
    observations:[{source_observation_id:'o1',product_id:1,group_id:10,category_id:3,subtype_name:'Normal',currency:'USD',
      source_price_row_identity:'price1',last_seen_run_id:'sync',observed_on:'2026-10-13',payload_hash:'payload'}],
    decisions:[{...source}],source_mappings:[],foreign_embedded_targets:[],
    counts:{products:1,groups:1,targets:1,observations:1,decisions:1,source_mappings:0,foreign_embedded_targets:0,group_mapping_edges:7} }};
}
test('reuses existing exact planner with apply-compatible fingerprints and retained raw support', () => {
  const result = planPricingCompletionExactMappingContextV1(fixture());
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].mapping_method,'exact_group_set_number_name_consensus_v1');
  assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(result.candidates[0]).accepted,true);
  assert.equal(result.productEvidence[0].supporting_gap_rows[0].decision_id,'d1');
  assert.equal(result.executionAuthorized,false);
  assert.equal(result.masterMappingAuthority,'required_not_supplied');
});
test('rejects partial census and missing current supporting observations', () => {
  for (const edit of [f => f.context.targets.pop(),f => f.context.observations.pop(),f => f.context.products.pop(),f => f.context.group_consensus.pop()]) {
    const f=fixture();edit(f);assert.throws(() => planPricingCompletionExactMappingContextV1(f));
  }
});
test('holds inactive source mappings, stale metadata and conflicting number evidence', () => {
  const cases = [
    [f => {f.context.source_mappings.push({id:'m',external_id:'1',active:false});f.context.counts.source_mappings=1;},'existing_source_mapping_requires_separate_authority'],
    [f => {f.context.products[0].source_active=false;},'source_metadata_not_current'],
    [f => {f.context.products[0].extended_data.push({name:'Number',value:'59'});bindProduct(f.context.products[0]);},'conflicting_printed_number_evidence'],
    [f => {f.context.products[0].extended_data=[];bindProduct(f.context.products[0]);},'missing_printed_number_evidence'],
  ];
  for (const [edit,reason] of cases) {const f=fixture();edit(f);assert.equal(planPricingCompletionExactMappingContextV1(f).blocked[0].reason,reason);}
});
test('preserves other held subtypes and blocks product-wide ordinary mapping', () => {
  const f=fixture(); const row={...f.sourceRows[0],decision_id:'d2',source_observation_id:'o2',source_subtype_name:'1st Edition',primary_reason:'unsupported_subtype',product_scope_result:'special_variant_v1_1'};
  f.sourceRows.push(row);f.context.decisions.push({...row});f.context.counts.decisions++;
  f.context.observations.push({...f.context.observations[0],source_observation_id:'o2',subtype_name:'1st Edition'});f.context.counts.observations++;
  const result=planPricingCompletionExactMappingContextV1(f);
  assert.equal(result.blocked[0].reason,'other_held_gap_rows_require_review');assert.equal(result.productEvidence[0].other_held_gap_rows.length,1);
});
test('GameStop retailer variant is held even when previous qualification called it ordinary', () => {
  const f=fixture();f.sourceRows[0].source_product_name=f.context.products[0].name='Dragonite (GameStop)';
  assert.equal(planPricingCompletionExactMappingContextV1(f).blocked[0].reason,'retailer_promo_authority_required');
});
test('embedded direct evidence requires source discriminator and no foreign collision', () => {
  const f=fixture();f.context.targets[0].embedded_external_id='tcgcsv:10:1';
  assert.equal(planPricingCompletionExactMappingContextV1(f).blocked[0].reason,'embedded_identity_source_unverified');
  f.context.targets[0].embedded_source='tcgcsv';
  assert.equal(planPricingCompletionExactMappingContextV1(f).candidates[0].evidence_lane,'embedded_tcgcsv_identity');
  f.context.foreign_embedded_targets.push({card_print_id:'foreign',embedded_external_id:'tcgcsv:10:1'});f.context.counts.foreign_embedded_targets=1;
  assert.equal(planPricingCompletionExactMappingContextV1(f).blocked[0].reason,'foreign_embedded_identity_collision');
});
test('keeps complete target ambiguity and invalid group routes unresolved', () => {
  const f=fixture();f.context.targets.push({...f.context.targets[0],card_print_id:'target2'});f.context.counts.targets++;
  assert.equal(planPricingCompletionExactMappingContextV1(f).blocked[0].reason,'ambiguous_exact_set_number_name_target');
  const g=fixture();g.context.group_consensus[0].invalid_target_count=1;
  assert.equal(planPricingCompletionExactMappingContextV1(g).blocked[0].reason,'group_consensus_incomplete_or_invalid');
});
test('quarantines collisions across the full population before bounded batches', () => {
  const f=fixture();f.sourceRows.push({...f.sourceRows[0],decision_id:'d2',source_observation_id:'o2',source_product_id:2});
  f.context.products.push(bindProduct({...f.context.products[0],product_id:2}));f.context.counts.products++;
  f.context.decisions.push({...f.sourceRows[1]});f.context.counts.decisions++;
  f.context.observations.push({...f.context.observations[0],product_id:2,source_observation_id:'o2'});f.context.counts.observations++;
  const result=planPricingCompletionExactMappingContextV1(f);
  assert.equal(result.candidates.length,0);assert.equal(result.blocked.length,2);
  assert.ok(result.blocked.every(row => row.reason==='multiple_source_products_match_same_canonical_target'));
});
test('payload digest and projection are evidence, not unchecked metadata claims', () => {
  for (const edit of [f=>{f.context.products[0].payload_hash='0'.repeat(64);},f=>{f.context.products[0].raw_payload.name='Wrong';},f=>{f.context.products[0].extended_data=[{name:'Number',value:'99'}];}]) {
    const f=fixture();edit(f);assert.equal(planPricingCompletionExactMappingContextV1(f).blocked[0].reason,'source_payload_hash_or_projection_mismatch');
  }
});
test('orphan observations reject; a published sibling holds the product-wide mapping', () => {
  const f=fixture();f.context.observations.push({...f.context.observations[0],source_observation_id:'other',subtype_name:'Holofoil'});f.context.counts.observations++;
  assert.throws(()=>planPricingCompletionExactMappingContextV1(f),/full_observation_decision_census_mismatch/);
  f.context.decisions.push({...f.context.decisions[0],decision_id:'other',source_observation_id:'other',source_subtype_name:'Holofoil',decision:'publish'});f.context.counts.decisions++;
  assert.equal(planPricingCompletionExactMappingContextV1(f).blocked[0].reason,'other_product_decisions_require_review');
});

const NOW=Date.parse('2026-10-13T20:00:00.000Z');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const bytesHash=b=>createHash('sha256').update(b).digest('hex');
function wrapperFixture() {
  const f=fixture();const sync=uuid(2),run=uuid(1),publication=uuid(3);
  const rows=[],products=[],targets=[],observations=[],decisions=[];
  const group_consensus=Array.from({length:114},(_,i)=>({...f.context.group_consensus[0],group_id:i+1,set_id:uuid(20000+i),set_code:`set${i+1}`}));
  for(let i=0;i<858;i++) {
    const id=i+1,group=i%114+1,name=`Pokemon${id}`;
    products.push(bindProduct({...f.context.products[0],product_id:id,group_id:group,name,last_seen_run_id:sync}));
    targets.push({...f.context.targets[0],card_print_id:uuid(30000+i),gv_id:`GV${id}`,name,set_id:uuid(20000+group-1),set_code:`set${group}`});
    for(let subtype=0;subtype<(i<175?2:1);subtype++) {
      const seq=rows.length,observation=uuid(50000+seq),decision=uuid(60000+seq),subtypeName=subtype?'Holofoil':'Normal',price=`price${seq}`;
      const row={...f.sourceRows[0],decision_id:decision,source_observation_id:observation,source_product_id:id,group_id:group,
        source_subtype_name:subtypeName,source_product_name:name,source_sync_run_id:sync,source_price_row_identity:price,
        source_row_hash:'a'.repeat(64),source_artifact_hash:'b'.repeat(64),observed_payload_hash:'a'.repeat(64),run_id:run,
        card_print_id:null,card_printing_id:null,market_price:'1.00',source_observation_present:true,source_product_present:true,
        observed_product_id:id,observed_subtype_name:subtypeName,observed_price_row_identity:price,observed_currency:'USD'};
      rows.push(row);decisions.push({...row});
      observations.push({...f.context.observations[0],source_observation_id:observation,product_id:id,group_id:group,subtype_name:subtypeName,
        source_price_row_identity:price,last_seen_run_id:sync,payload_hash:'a'.repeat(64)});
    }
  }
  const counts={selected_count:1034,eligible_count:1,publish_count:1,snapshot_count:1,excluded_count:0,quarantined_count:1033,delayed_count:0,suppressed_count:0,unresolved_count:1033};
  const source={version:'FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V1',projectRef:'ycdxbpibncqcchqiihfz',verifiedTls:true,readOnly:true,rollbackAcknowledged:true,
    sqlSha256:'d'.repeat(64),caSha256:PRICING_COMPLETION_OPERATOR_CA_SHA256_V1,capturedAt:new Date(NOW-2000).toISOString(),
    sourceRunId:run,publicationSetId:publication,masterCoverage:'unknown',databaseWrites:0,
    scope:'All non-publish decisions in the exact frozen current pricing run only; no Master census or all-warehouse completeness claim.',records:[
      {kind:'environment',read_only:'on',isolation:'repeatable read',database:'postgres',captured_at:new Date(NOW-3000).toISOString(),server_version:'17.4',cards:171754,sets:3404,traits:32903,migrations:444,latest_migration:'20261012013000'},
      {kind:'source_run',rows:[{id:run,run_key:'fixture',source_sync_run_id:sync,publication_set_id:publication,run_mode:'production',state:'verified',reconciliation_state:'reconciled',publication_state:'published',
        selected_count:1034,eligible_count:1,snapshot_count:1,excluded_count:0,quarantined_count:1033,delayed_count:0,suppressed_count:0,
        source_finished_at:new Date(NOW-10000).toISOString(),completed_at:new Date(NOW-5000).toISOString(),source_status:'completed',sync_mode:'current_full_sync',source_failed_count:0}]},
      {kind:'source_counts',rows:[counts]},{kind:'source_rows',rows},
      {kind:'current_publication',rows:[{run_id:run,publication_set_id:publication,publication_state:'published',state:'verified',reconciliation_state:'reconciled'}]}]};
  const sourceBytes=Buffer.from(JSON.stringify(source));
  const capture={version:'FIXED_OPERATOR_MAPPING_CONTEXT_EXPORT_V1',projectRef:source.projectRef,verifiedTls:true,readOnly:true,rollbackAcknowledged:true,
    capturedAt:new Date(NOW-1000).toISOString(),sqlSha256:'e'.repeat(64),caSha256:source.caSha256,sourceArtifactSha256:bytesHash(sourceBytes),
    sourceRunId:run,publicationSetId:publication,sourceSyncRunId:sync,scope:MAPPING_CONTEXT_SCOPE_V1,masterCoverage:'unknown',databaseWrites:0,
    records:[{kind:'environment',read_only:'on',isolation:'repeatable read',database:'postgres',captured_at:new Date(NOW-1500).toISOString(),migrations:444,cards:171754,sets:3404,traits:32903},
      {kind:'mapping_context',data:{products,group_consensus,targets,observations,decisions,source_mappings:[],foreign_embedded_targets:[],
        counts:{products:858,groups:114,targets:858,observations:1033,decisions:1033,source_mappings:0,foreign_embedded_targets:0,group_mapping_edges:114*7}}},
      {kind:'binding',rows:[{run_id:run,publication_set_id:publication,source_sync_run_id:sync,run_mode:'production',state:'verified',reconciliation_state:'reconciled',publication_state:'published',
        sync_mode:'current_full_sync',source_status:'completed',failed_count:0,finished_at:new Date(NOW-10000).toISOString(),observed_on:'2026-10-13',artifact_hash:'f'.repeat(64)}]}]};
  return {sourceBytes,capture};
}
function wrapperOptions(f) {const contextBytes=Buffer.from(JSON.stringify(f.capture));return {sourceBytes:f.sourceBytes,contextBytes,
  expectedSourceSha256:bytesHash(f.sourceBytes),expectedSourceSqlSha256:'d'.repeat(64),expectedContextSha256:bytesHash(contextBytes),expectedContextSqlSha256:'e'.repeat(64),now:NOW};}
test('byte-bound wrapper validates full frozen shape through the real source validator',async()=>{
  const result=await preparePricingCompletionExactMappingReadbackV1(wrapperOptions(wrapperFixture()));
  assert.equal(result.summary.selectedGapRows,1033);assert.equal(result.candidates.length,858);
  assert.ok(result.reviewBatches.every(batch=>batch.length<=25));assert.equal(result.receipt.liveDatabaseAccess,false);
});
test('wrapper rejects changed bytes, embedded hash claims, stale capture and wrong publication',async()=>{
  const options=wrapperOptions(wrapperFixture());
  await assert.rejects(preparePricingCompletionExactMappingReadbackV1({...options,expectedContextSha256:'0'.repeat(64)}),/external_context_hash_mismatch/);
  for(const edit of [f=>{f.capture.sqlSha256='0'.repeat(64);},f=>{f.capture.sourceArtifactSha256='0'.repeat(64);},
    f=>{f.capture.capturedAt=new Date(NOW-86400001).toISOString();},f=>{f.capture.publicationSetId=uuid(999);},
    f=>{f.capture.records[0].cards='171754';},f=>{f.capture.capturedAt='2026-02-30T20:00:00.000Z';}]) {
    const f=wrapperFixture();edit(f);await assert.rejects(preparePricingCompletionExactMappingReadbackV1(wrapperOptions(f)));
  }
});
test('preserves valid PostgreSQL numeric-offset capture while rejecting invalid calendar or offsets',async()=>{
  const f=wrapperFixture();f.capture.records[0].captured_at='2026-10-13T13:59:58.500000-06:00';
  const result=await preparePricingCompletionExactMappingReadbackV1(wrapperOptions(f));assert.equal(result.candidates.length,858);
  for(const value of ['2026-02-30T13:59:58-06:00','2026-10-13T13:59:58-25:00','2026-10-13T13:59:58-06:99','2026-10-13T13:59:58']) {
    const invalid=wrapperFixture();invalid.capture.records[0].captured_at=value;
    await assert.rejects(preparePricingCompletionExactMappingReadbackV1(wrapperOptions(invalid)));
  }
});
test('rejects altered decision, missing held decision, and wrong observed product', () => {
  for (const edit of [f=>{f.context.decisions[0].currency='EUR';},f=>{f.context.decisions=[];f.context.counts.decisions=0;},f=>{f.context.observations[0].product_id=2;}]) {
    const f=fixture();edit(f);assert.throws(()=>planPricingCompletionExactMappingContextV1(f));
  }
});

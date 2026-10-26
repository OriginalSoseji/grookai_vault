/** Offline preparation only. No database, filesystem, environment or subprocess access. */
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { normalizePricingCompletionOperatorReadbackV1, PRICING_COMPLETION_OPERATOR_CA_SHA256_V1 } from './pricing_completion_operator_readback_v1.mjs';
import { planTcgplayerExactMappingCandidateV1, quarantineTcgplayerTargetCollisionsV1 } from './tcgplayer_market_exact_mapping_plan_policy_v1.mjs';
import { jungleSourcePayloadHashV1 as payloadHash } from './jungle_edition_source_review_v1.mjs';

export const MAPPING_CONTEXT_SCOPE_V1 = '858 source products / 114 groups frozen from 1033 ordinary missing-mapping observations; all Pokemon parents, all active group mapping edges, all scoped source mappings including inactive; preparation only.';
const SHA = /^[a-f0-9]{64}$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function need(ok, code) { if (!ok) throw new Error(`mapping_context:${code}`); }
function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
function fields(value, names) { need(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === names.length && names.every(key => Object.hasOwn(value,key)), 'exact_fields_required'); }
function utc(value, allowNumericOffset=false) {
  const match=typeof value === 'string' && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,7})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  need(match && (allowNumericOffset || ['Z','+00:00'].includes(match[3])), 'utc_timestamp_required');
  need(match[3]==='Z' || (Number(match[5])<=23 && Number(match[6])<=59),'timestamp_offset_invalid');
  // Validate the written local calendar independently before applying its offset.
  const wall=Date.parse(`${match[1]}${match[2] ?? ''}Z`),ms=Date.parse(value);
  need(Number.isFinite(wall) && Number.isFinite(ms) && new Date(wall).toISOString().slice(0,19)===match[1],'utc_calendar_invalid');return ms;
}
function unique(rows, key) {
  need(Array.isArray(rows), `${key}_rows_required`);
  const result = new Map();
  for (const row of rows) {
    need(row && row[key] !== null && row[key] !== undefined && !result.has(row[key]), `${key}_missing_or_duplicate`);
    result.set(row[key], row);
  }
  return result;
}
function sameSet(a, b) { return a.size === b.size && [...a].every(value => b.has(value)); }
function ordinary(row) { return row.category_id === 3 && row.product_scope_result === 'in_scope' && row.primary_reason === 'missing_active_source_mapping'; }
function held(source, reason, detail = {}) { return { disposition: 'blocked', reason, source_product_id: source.source_product_id, ...detail }; }

/** Pure core for already authenticated/validated data. Production callers use the byte-bound wrapper below. */
export function planPricingCompletionExactMappingContextV1({ sourceRows, context, binding }) {
  need(Array.isArray(sourceRows), 'source_rows_required');
  unique(sourceRows, 'decision_id'); unique(sourceRows, 'source_observation_id');
  const selected = sourceRows.filter(ordinary);
  const productIds = new Set(selected.map(row => row.source_product_id));
  const groupIds = new Set(selected.map(row => row.group_id));
  const products = unique(context.products, 'product_id');
  const groups = unique(context.group_consensus, 'group_id');
  const targets = unique(context.targets, 'card_print_id');
  const observations = unique(context.observations, 'source_observation_id');
  const decisions = unique(context.decisions, 'decision_id');
  const decisionsByObservation = unique(context.decisions, 'source_observation_id');
  unique(context.source_mappings, 'id'); unique(context.foreign_embedded_targets, 'card_print_id');
  need(sameSet(productIds, new Set(products.keys())) && sameSet(groupIds, new Set(groups.keys())), 'scope_census_mismatch');
  need(context.counts && Object.values(context.counts).every(integer), 'invalid_counts');
  for (const key of ['products','targets','observations','decisions','source_mappings','foreign_embedded_targets']) need(context[key].length === context.counts[key], `${key}_count_mismatch`);
  need(context.counts.groups === groups.size && context.counts.targets > 0 && context.counts.targets <= 250000, 'target_or_group_census_invalid');
  need(context.counts.group_mapping_edges <= 100000, 'group_edge_cap_exceeded');
  for (const key of ['source_mappings','foreign_embedded_targets','decisions','observations']) need(context.counts[key] <= 10000, `${key}_cap_exceeded`);
  let edges = 0;
  for (const group of groups.values()) {
    need(['mapping_count','mapped_source_product_count','set_count','invalid_target_count'].every(key => integer(group[key])), 'invalid_consensus_count');
    need(group.mapped_source_product_count <= group.mapping_count && group.set_count <= group.mapping_count && group.invalid_target_count <= group.mapping_count, 'contradictory_consensus');
    edges += group.mapping_count;
  }
  need(edges === context.counts.group_mapping_edges, 'group_edges_count_mismatch');
  for (const target of targets.values()) {
    need(target.game === 'pokemon' && integer(target.active_standard_identity_count) && integer(target.active_tcgplayer_mapping_count), 'target_census_invalid');
  }
  for (const row of context.source_mappings) need(productIds.has(Number(row.external_id)) && typeof row.active === 'boolean', 'source_mapping_outside_scope');
  for (const row of context.decisions) need(productIds.has(row.source_product_id) && row.source_sync_run_id === binding.source_sync_run_id, 'decision_outside_scope');
  for (const row of context.observations) need(productIds.has(row.product_id) && row.last_seen_run_id === binding.source_sync_run_id && row.observed_on === binding.observed_on, 'observation_outside_source_run');
  need(sameSet(new Set(observations.keys()), new Set(decisionsByObservation.keys())), 'full_observation_decision_census_mismatch');
  for (const observation of observations.values()) {
    const decision = decisionsByObservation.get(observation.source_observation_id);
    const product = products.get(observation.product_id);
    need(decision.source_product_id === observation.product_id && decision.source_subtype_name === observation.subtype_name
      && decision.source_price_row_identity === observation.source_price_row_identity && decision.currency === observation.currency
      && decision.source_row_hash === observation.payload_hash && observation.group_id === product.group_id
      && observation.category_id === product.category_id, 'full_observation_decision_identity_mismatch');
  }
  const scopedGapRows = sourceRows.filter(row => productIds.has(row.source_product_id));
  const frozenGapIds = new Set(scopedGapRows.map(row => row.decision_id));
  need(sameSet(frozenGapIds, new Set(context.decisions.filter(row => row.decision !== 'publish').map(row => row.decision_id))), 'nonpublish_decision_census_mismatch');
  for (const row of scopedGapRows) {
    const current = decisions.get(row.decision_id);
    need(current && ['source_product_id','source_observation_id','source_subtype_name','decision','primary_reason','product_scope_result','source_sync_run_id','source_price_row_identity','currency','source_row_hash','source_artifact_hash'].every(key => current[key] === row[key]), 'gap_decision_changed');
    const observation = observations.get(row.source_observation_id);
    need(observation && observation.product_id === row.source_product_id && observation.group_id === row.group_id
      && observation.category_id === row.category_id && observation.subtype_name === row.source_subtype_name
      && observation.currency === row.currency && observation.source_price_row_identity === row.source_price_row_identity
      && observation.payload_hash === row.observed_payload_hash, 'gap_observation_changed_or_missing');
  }
  const results = [];
  const productEvidence = [];
  for (const id of [...productIds].sort((a,b) => a-b)) {
    const product = products.get(id);
    const rows = selected.filter(row => row.source_product_id === id);
    const otherRows = scopedGapRows.filter(row => row.source_product_id === id && !ordinary(row));
    const selectedObservationIds = new Set(rows.map(row => row.source_observation_id));
    const otherDecisions = context.decisions.filter(row => row.source_product_id === id && !selectedObservationIds.has(row.source_observation_id));
    const numbers = [...new Set((Array.isArray(product.extended_data) ? product.extended_data : [])
      .filter(field => String(field.name).trim().toLowerCase() === 'number')
      .map(field => typeof field.value === 'string' ? field.value.trim() : '').filter(Boolean))];
    const source = { source_product_id: id, source_product_name: product.name,
      source_group_id: product.group_id, source_group_name: product.group_name,
      printed_number: numbers.length === 1 ? numbers[0] : '', has_printed_number_evidence: numbers.length === 1,
      active_source_mapping_count: context.source_mappings.filter(row => row.external_id === String(id) && row.active).length,
      source_subtypes: rows.map(row => row.source_subtype_name), supporting_gap_observation_ids: rows.map(row => row.source_observation_id), supporting_gap_row_count: rows.length };
    const directId = `tcgcsv:${product.group_id}:${id}`;
    const directTargets = context.targets.filter(row => row.embedded_external_id === directId);
    const consensus = groups.get(product.group_id);
    let result;
    if (/\bgame\s*stop\b/i.test(product.name)) result = held(source, 'retailer_promo_authority_required');
    else if (otherRows.length) result = held(source, 'other_held_gap_rows_require_review');
    else if (otherDecisions.length) result = held(source, 'other_product_decisions_require_review');
    else if (product.category_id !== 3 || product.group_category_id !== 3 || !groupIds.has(product.group_id)) result = held(source, 'source_routing_changed');
    else if (product.source_active !== true || product.catalog_metadata_status !== 'current' || product.last_seen_run_id !== binding.source_sync_run_id) result = held(source, 'source_metadata_not_current');
    else if (!SHA.test(product.payload_hash ?? '') || rows.some(row => row.source_product_name !== product.name || row.group_id !== product.group_id || row.source_group_name !== product.group_name)) result = held(source, 'source_metadata_changed_or_unbound');
    else if (!product.raw_payload || payloadHash(product.raw_payload) !== product.payload_hash
      || product.raw_payload.productId !== product.product_id || product.raw_payload.categoryId !== product.category_id
      || product.raw_payload.groupId !== product.group_id || product.raw_payload.name !== product.name
      || payloadHash(product.raw_payload.extendedData ?? null) !== payloadHash(product.extended_data ?? null)) result = held(source, 'source_payload_hash_or_projection_mismatch');
    else if (context.source_mappings.some(row => row.external_id === String(id))) result = held(source, 'existing_source_mapping_requires_separate_authority');
    else if (numbers.length > 1) result = held(source, 'conflicting_printed_number_evidence');
    else if (context.foreign_embedded_targets.some(row => row.embedded_external_id === directId)) result = held(source, 'foreign_embedded_identity_collision');
    else if (directTargets.some(row => row.embedded_source !== 'tcgcsv')) result = held(source, 'embedded_identity_source_unverified');
    else if (directTargets.some(row => row.set_game !== 'pokemon' || !row.set_code || !row.set_id)) result = held(source, 'target_set_routing_unverified');
    else if (!directTargets.length && (!consensus || consensus.invalid_target_count !== 0)) result = held(source, 'group_consensus_incomplete_or_invalid');
    else result = planTcgplayerExactMappingCandidateV1({ source, directTargets, groupConsensus: consensus,
      setTargets: context.targets.filter(row => row.set_id === consensus?.set_id && row.set_game === 'pokemon') });
    results.push(result);
    productEvidence.push({ source_product_id: id, supporting_gap_rows: rows, other_held_gap_rows: otherRows, other_product_decisions: otherDecisions,
      source_metadata_evidence: { payload_hash: product.payload_hash, raw_payload: product.raw_payload, extended_data: product.extended_data, last_seen_run_id: product.last_seen_run_id } });
  }
  const finalResults = quarantineTcgplayerTargetCollisionsV1(results);
  const candidates = finalResults.filter(row => row.disposition === 'candidate');
  const blocked = finalResults.filter(row => row.disposition !== 'candidate');
  const reviewBatches = [];
  for (let start = 0; start < candidates.length; start += 25) reviewBatches.push(candidates.slice(start,start+25).map(row => row.candidate_fingerprint));
  return { version: 'PRICING_COMPLETION_EXACT_MAPPING_CONTEXT_PLAN_V1', preparationOnly: true, executionAuthorized: false,
    databaseWrites: 0, sourceRunId: binding.run_id, sourceSyncRunId: binding.source_sync_run_id, publicationSetId: binding.publication_set_id,
    summary: { selectedProducts: productIds.size, selectedGroups: groupIds.size, selectedGapRows: selected.length,
      otherHeldGapRows: scopedGapRows.length-selected.length, candidates: candidates.length, blocked: blocked.length },
    candidates, blocked, productEvidence, reviewBatches, masterMappingAuthority: 'required_not_supplied',
    nextAction: 'Review exact physical-card authority, then use the existing bounded canonical-maintenance mapping path with live revalidation. No apply authority is granted by this plan.' };
}

export async function preparePricingCompletionExactMappingReadbackV1({ sourceBytes, contextBytes,
  expectedSourceSha256, expectedSourceSqlSha256, expectedContextSha256, expectedContextSqlSha256, now, maxCaptureAgeMs = 86400000 }) {
  const sourceReceipt = await normalizePricingCompletionOperatorReadbackV1({ readbackBytes: sourceBytes,
    expectedReadbackSha256: expectedSourceSha256, expectedSqlSha256: expectedSourceSqlSha256, now, maxCaptureAgeMs });
  need(contextBytes instanceof Uint8Array && contextBytes.byteLength > 0 && contextBytes.byteLength <= 256*1024*1024, 'original_context_bytes_required');
  need(SHA.test(expectedContextSha256 ?? '') && SHA.test(expectedContextSqlSha256 ?? '') && hash(contextBytes) === expectedContextSha256, 'external_context_hash_mismatch');
  const capture = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(contextBytes));
  const source = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(sourceBytes));
  fields(capture,['version','projectRef','verifiedTls','readOnly','rollbackAcknowledged','capturedAt','sqlSha256','caSha256','sourceArtifactSha256','sourceRunId','publicationSetId','sourceSyncRunId','scope','masterCoverage','databaseWrites','records']);
  need(capture.version === 'FIXED_OPERATOR_MAPPING_CONTEXT_EXPORT_V1' && capture.projectRef === 'ycdxbpibncqcchqiihfz', 'operator_context_identity_mismatch');
  need(capture.sourceArtifactSha256 === expectedSourceSha256 && capture.sqlSha256 === expectedContextSqlSha256
    && capture.caSha256 === PRICING_COMPLETION_OPERATOR_CA_SHA256_V1, 'context_provenance_mismatch');
  need(capture.verifiedTls === true && capture.readOnly === true && capture.rollbackAcknowledged === true && capture.databaseWrites === 0, 'operator_context_claims_invalid');
  need(capture.scope === MAPPING_CONTEXT_SCOPE_V1 && capture.masterCoverage === 'unknown', 'context_scope_mismatch');
  const captured = utc(capture.capturedAt);
  need(Number.isFinite(captured) && captured <= now && now-captured <= maxCaptureAgeMs && captured >= Date.parse(source.capturedAt), 'context_stale_or_out_of_order');
  const records = unique(capture.records,'kind');
  need(records.size === 3 && ['environment','mapping_context','binding'].every(key => records.has(key)), 'context_records_invalid');
  const env = records.get('environment');
  fields(env,['kind','read_only','isolation','database','captured_at','migrations','cards','sets','traits']);
  fields(records.get('mapping_context'),['kind','data']);fields(records.get('binding'),['kind','rows']);
  need(env.read_only === 'on' && env.isolation === 'repeatable read' && env.database === 'postgres' && env.migrations >= 444
    && env.cards >= 40000 && env.sets >= 150 && env.traits >= 5000 && ['migrations','cards','sets','traits'].every(key=>integer(env[key])), 'context_environment_invalid');
  const transactionAt = utc(env.captured_at,true);
  need(transactionAt <= captured && now-transactionAt <= maxCaptureAgeMs, 'context_transaction_time_invalid');
  const bindings = records.get('binding').rows;
  need(Array.isArray(bindings) && bindings.length === 1, 'context_binding_required');
  const binding = bindings[0];
  const sourceRun = source.records.find(row => row.kind === 'source_run').rows[0];
  need(binding.run_id === source.sourceRunId && binding.run_id === capture.sourceRunId
    && binding.publication_set_id === source.publicationSetId && binding.publication_set_id === capture.publicationSetId
    && binding.source_sync_run_id === sourceRun.source_sync_run_id && binding.source_sync_run_id === capture.sourceSyncRunId,
  'context_run_binding_mismatch');
  need(binding.run_mode === 'production' && ['published','verified'].includes(binding.state) && binding.reconciliation_state === 'reconciled'
    && binding.publication_state === 'published' && binding.sync_mode === 'current_full_sync' && binding.source_status === 'completed'
    && binding.failed_count === 0 && Date.parse(binding.finished_at) <= transactionAt, 'context_run_not_eligible');
  const plan = planPricingCompletionExactMappingContextV1({ sourceRows: source.records.find(row => row.kind === 'source_rows').rows,
    context: records.get('mapping_context').data, binding });
  need(plan.summary.selectedProducts === 858 && plan.summary.selectedGroups === 114 && plan.summary.selectedGapRows === 1033, 'frozen_operator_scope_changed');
  return { ...plan, receipt: { sourceArtifactSha256: expectedSourceSha256, contextArtifactSha256: expectedContextSha256,
    contextSqlSha256: expectedContextSqlSha256, operatorCapturedAt: capture.capturedAt, validatedAt: new Date(now).toISOString(),
    sourceReceipt: sourceReceipt.receipt, liveDatabaseAccess: false, remoteRollbackVerifiedByAdapter: false,
    operatorRollbackAcknowledgedClaim: true, authenticityBoundary: 'Externally pinned operator bytes; hashes do not independently authenticate the operator or remote database.' } };
}

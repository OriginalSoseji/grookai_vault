import '../maintenance/source_backed_mapping_review_guard_v1.mjs';
import '../env.mjs';

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { assertLegacyMappingReviewOnly, legacyMappingReviewRecord } from '../maintenance/legacy_mapping_review_only_v1.mjs';

const WORKER_NAME = 'promote_source_backed_justtcg_mapping_v1';
const text = value => value === null || value === undefined ? null : String(value).trim() || null;

function parseArgs(args) {
  const { limit } = assertLegacyMappingReviewOnly(args);
  let inputJson;
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    if (token === '--dry-run' || token.startsWith('--limit=')) continue;
    if (token === '--limit') { index++; continue; }
    assert.ok(token === '--input-json' || token.startsWith('--input-json='), `unknown_argument:${token}`);
    assert.equal(inputJson, undefined, 'duplicate_input_json');
    inputJson = token === '--input-json' ? args[++index] : token.slice('--input-json='.length);
    assert.ok(inputJson && !inputJson.startsWith('--'), 'input_json_required');
  }
  assert.ok(inputJson, 'input_json_required');
  return { inputJson: path.resolve(inputJson), limit };
}

async function loadRows(options) {
  const parsed = JSON.parse(await fs.readFile(options.inputJson, 'utf8'));
  assert.ok(Array.isArray(parsed?.rows), 'review_rows_required');
  assert.ok(parsed.rows.length > 0 && parsed.rows.length <= options.limit, 'review_batch_size_outside_limit');
  for (const row of parsed.rows) {
    assert.ok(row && typeof row === 'object' && !Array.isArray(row), 'review_row_invalid');
    for (const key of ['card_print_id', 'source_candidate_id', 'source_external_id']) {
      assert.ok(typeof row[key] === 'string' && text(row[key]), `review_id_required:${key}`);
      assert.equal(row[key], text(row[key]), `review_id_not_exact:${key}`);
    }
  }
  for (const key of ['card_print_id', 'source_candidate_id', 'source_external_id']) {
    assert.equal(new Set(parsed.rows.map(row => row[key])).size, parsed.rows.length, `duplicate_review_id:${key}`);
  }
  return parsed.rows;
}

async function fetchRows(client, table, columns, key, ids, source) {
  const result = [];
  for (let index = 0; index < ids.length; index += 100) {
    for (let page = 0; ; page++) {
      assert.ok(page < 10, `review_read_limit_exceeded:${table}`);
      let query = client.from(table).select(columns).in(key, ids.slice(index, index + 100))
        .order('id', { ascending: true }).range(page * 100, page * 100 + 99);
      if (source) query = query.eq('source', source);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      assert.ok(Array.isArray(data), `review_read_invalid:${table}`);
      result.push(...data);
      if (data.length < 100) break;
    }
  }
  assert.equal(new Set(result.map(row => row.id)).size, result.length, `review_read_duplicate:${table}`);
  return result;
}

function exactRowsById(rows, selected, label) {
  assert.deepEqual(rows.map(row => row.id).sort(), [...selected].sort(), `${label}_selection_mismatch`);
  return new Map(rows.map(row => [row.id, row]));
}

function reviewRow(row, parent, candidate, parentMappings, externalMappings, index) {
  const drift = [];
  for (const [inputField, liveField] of Object.entries({ gv_id: 'gv_id', effective_set_code: 'set_code',
    set_code: 'set_code', set_id: 'set_id', variant_key: 'variant_key', number: 'number',
    name: 'name', identity_domain: 'identity_domain', print_identity_key: 'print_identity_key',
    printed_identity_modifier: 'printed_identity_modifier' })) {
    if (Object.hasOwn(row, inputField) && row[inputField] !== parent[liveField]) drift.push(inputField);
  }
  let status = 'mapping_candidate_requires_review';
  let reason = 'Source candidate presence does not establish reviewed Master Index mapping authority.';
  if (candidate.source !== 'justtcg' || candidate.upstream_id !== row.source_external_id) {
    status = 'conflict_source_candidate_identity';
    reason = 'Source candidate does not bind the requested provider and external ID.';
  } else if (drift.length) {
    status = 'conflict_input_identity';
    reason = `Requested identity differs from the canonical parent: ${drift.join(', ')}.`;
  } else if (externalMappings.some(mapping => mapping.card_print_id !== parent.id)) {
    status = 'conflict_external_id_claimed_elsewhere';
    reason = 'Active or inactive external-ID history belongs to another parent.';
  } else if (parentMappings.some(mapping => mapping.external_id !== row.source_external_id)) {
    status = 'conflict_existing_card_print_mapping';
    reason = 'Active or inactive parent mapping history contains a different external ID.';
  } else if (parentMappings.some(mapping => mapping.active === true && mapping.external_id === row.source_external_id)) {
    status = 'existing_mapping_requires_review';
    reason = 'An existing mapping is not independent evidence of printing identity.';
  }
  return legacyMappingReviewRecord({ batch_index: row.batch_index ?? index + 1,
    card_print_id: parent.id, gv_id: parent.gv_id, name: parent.name, number: parent.number,
    variant_key: parent.variant_key, set_code: parent.set_code,
    source_external_id: row.source_external_id, status, reason, identity_drift_fields: drift,
    requested_identity: row, canonical_identity: parent, source_candidate: candidate,
    parent_mappings: parentMappings, external_id_mappings: externalMappings });
}

function log(event, payload) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), worker: WORKER_NAME, event, ...payload }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = await loadRows(options);
  const client = createBackendClient();
  const ids = rows.map(row => row.card_print_id);
  const candidateIds = rows.map(row => row.source_candidate_id);
  const parentColumns = 'id,gv_id,name,number,set_id,set_code,variant_key,identity_domain,print_identity_key,printed_identity_modifier';
  const mappingColumns = 'id,card_print_id,source,external_id,active';
  const parents = exactRowsById(await fetchRows(client, 'card_prints', parentColumns, 'id', ids), ids, 'parent');
  const candidates = exactRowsById(await fetchRows(client, 'external_discovery_candidates',
    'id,source,upstream_id,raw_import_id,set_id,name_raw,number_raw,payload', 'id', candidateIds), candidateIds, 'candidate');
  const parentMappings = await fetchRows(client, 'external_mappings', mappingColumns, 'card_print_id', ids, 'justtcg');
  const externalMappings = await fetchRows(client, 'external_mappings', mappingColumns, 'external_id',
    rows.map(row => row.source_external_id), 'justtcg');
  log('run_config', legacyMappingReviewRecord({ mode: 'review-only', input_json: options.inputJson,
    batch_size: rows.length, selected_card_limit: options.limit }));
  const results = rows.map((row, index) => reviewRow(row, parents.get(row.card_print_id), candidates.get(row.source_candidate_id),
    parentMappings.filter(mapping => mapping.card_print_id === row.card_print_id),
    externalMappings.filter(mapping => mapping.external_id === row.source_external_id), index));
  for (const row of results) log('row', row);
  const conflicts = results.filter(row => row.status.startsWith('conflict_')).length;
  log('summary', legacyMappingReviewRecord({ selected_rows: rows.length, reviewed_rows: results.length,
    conflicts, candidates_requiring_review: results.filter(row => row.status === 'mapping_candidate_requires_review').length,
    existing_mappings_requiring_review: results.filter(row => row.status === 'existing_mapping_requires_review').length }));
  if (conflicts) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

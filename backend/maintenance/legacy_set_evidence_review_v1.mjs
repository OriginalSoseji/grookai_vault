import assert from 'node:assert/strict';
import { assertLegacySetReviewOnly } from './legacy_pokemon_ingestion_admission_v1.mjs';
import '../env.mjs';
import { createBackendClient } from '../supabase_backend_client.mjs';

async function readBounded(query, limit, label) {
  const { data, error } = await query.order('id', { ascending: true }).limit(limit + 1)
    .abortSignal(AbortSignal.timeout(15000));
  if (error) throw new Error(`set_review_read_failed:${label}:${error.message}`);
  assert.ok(Array.isArray(data) && data.length <= limit + 1, `invalid_set_review_page:${label}`);
  const ids = data.map(row => row.id == null ? '' : String(row.id));
  assert.ok(ids.every(Boolean) && new Set(ids).size === ids.length, `duplicate_or_missing_set_review_id:${label}`);
  return { rows: data.slice(0, limit), truncated: data.length > limit };
}

export async function collectLegacySetEvidence(client, options) {
  assert.ok(options?.dryRun === true && options.apply !== true, 'set_review_cannot_apply');
  const { setCode, limit } = assertLegacySetReviewOnly([
    '--dry-run', '--set', options.setCode, '--limit', String(options.limit),
  ]);
  const sets = await readBounded(client.from('sets').select('id,code,name,game')
    .eq('game', 'pokemon').eq('code', setCode), 2, 'sets');
  assert.ok(sets.rows.every(row => row.game === 'pokemon' && row.code === setCode), 'set_review_scope_mismatch');
  const rawSets = await readBounded(client.from('raw_imports').select('id,source,status,payload')
    .eq('source', 'tcgdex').eq('payload->>_kind', 'set').eq('payload->>_external_id', setCode), limit, 'raw_sets');
  const rawCards = await readBounded(client.from('raw_imports').select('id,source,status,payload')
    .eq('source', 'tcgdex').eq('payload->>_kind', 'card').eq('payload->>_set_external_id', setCode), limit, 'raw_cards');
  const legacyRawCards = await readBounded(client.from('raw_imports').select('id,source,status,payload')
    .eq('source', 'tcgdex').eq('payload->>_kind', 'card').is('payload->>_set_external_id', null)
    .eq('payload->>set_external_id', setCode), limit, 'legacy_raw_cards');
  const rawIds = [...rawCards.rows, ...legacyRawCards.rows].map(row => String(row.id));
  assert.equal(new Set(rawIds).size, rawIds.length, 'overlapping_set_review_source_pages');
  let parents = { rows: [], truncated: false };
  let printings = { rows: [], truncated: false };
  let mappings = { rows: [], truncated: false };
  if (sets.rows.length === 1 && !sets.truncated) {
    parents = await readBounded(client.from('card_prints')
      .select('id,gv_id,set_id,number,number_plain,name,variant_key,identity_domain,print_identity_key,printed_identity_modifier')
      .eq('set_id', sets.rows[0].id), limit, 'parents');
    assert.ok(parents.rows.every(row => row.set_id === sets.rows[0].id), 'set_review_parent_scope_mismatch');
    if (parents.rows.length) {
      printings = await readBounded(client.from('card_printings').select('*')
        .in('card_print_id', parents.rows.map(row => row.id)), limit, 'printings');
      mappings = await readBounded(client.from('external_mappings')
        .select('id,source,external_id,card_print_id,active')
        .in('card_print_id', parents.rows.map(row => row.id)), limit, 'mappings');
      const parentIds = new Set(parents.rows.map(row => row.id));
      assert.ok([...printings.rows, ...mappings.rows].every(row => parentIds.has(row.card_print_id)),
      'set_review_parent_scope_mismatch');
    }
  }
  const evidence = { sets, raw_sets: rawSets, raw_cards: rawCards,
    legacy_raw_cards: legacyRawCards, parents, printings, mappings };
  return {
    version: 'LEGACY_SET_EVIDENCE_REVIEW_V1', set_code: setCode,
    status: 'requires_master_index_review', write_ready: false, database_writes: 0,
    authority_verified: false, printing_completeness_verified: false,
    catalog_scope: sets.rows.length === 0 ? 'unresolved' : sets.rows.length !== 1 || sets.truncated ? 'ambiguous' : 'unreviewed',
    limit_per_collection: limit, truncated: Object.values(evidence).some(page => page.truncated),
    snapshot_consistency: 'independent_bounded_reads_not_an_apply_snapshot', evidence,
  };
}

export async function runLegacySetEvidenceReview() {
  const options = assertLegacySetReviewOnly();
  if (options.help) {
    console.log('Review only: --set <exact-code> --dry-run [--limit=1..500] [--detail]. Default limit 50 per evidence collection; historical apply and all-auto-safe are retired.');
    return;
  }
  const result = await collectLegacySetEvidence(createBackendClient(), options);
  console.log(JSON.stringify(result));
  if (result.catalog_scope === 'ambiguous') process.exitCode = 2;
}

import assert from 'node:assert/strict';

export const LEGACY_REVIEW_SCRIPTS = [
  'promote_tcgplayer_to_justtcg_mapping_v1.mjs',
  'promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs',
  'promote_justtcg_direct_structure_mapping_v1.mjs',
];

export function assertLegacyMappingReviewOnly(args = process.argv.slice(2), env = process.env) {
  assert.ok(!args.some(arg => /^--apply(?:=|$)/.test(arg)) && env.CANON_MAINTENANCE_DRY_RUN !== 'false',
    'LEGACY_MAPPING_APPLY_RETIRED: reviewed Master Index mapping authority is required; discovery is review-only');
  let limit;
  for (let index = 0; index < args.length; index++) {
    if (args[index] !== '--limit' && !args[index].startsWith('--limit=')) continue;
    assert.equal(limit, undefined, 'duplicate discovery limit');
    const value = args[index] === '--limit' ? args[++index] : args[index].slice('--limit='.length);
    assert.ok(/^\d+$/.test(value ?? ''), 'discovery limit must be an integer');
    limit = Number(value);
    assert.ok(limit >= 1 && limit <= 500, 'discovery limit must be 1..500');
  }
  return { limit: limit ?? 50, write_ready: false, database_writes: 0 };
}

export function legacyMappingReviewRecord(row) {
  return { ...row, version: 'LEGACY_MAPPING_REVIEW_ONLY_V1',
    authority_status: 'requires_source_and_master_index_review', write_ready: false,
    database_writes: 0 };
}

// Imported first by the legacy CLIs so apply cannot reach env/client/provider setup.
const entrypoint = (process.argv[1] ?? '').replaceAll('\\', '/').split('/').pop();
if (LEGACY_REVIEW_SCRIPTS.includes(entrypoint)) assertLegacyMappingReviewOnly();

import assert from 'node:assert/strict';

export function assertLegacyPokemonReviewOnly(args = process.argv.slice(2), env = process.env, { allowScope = false } = {}) {
  assert.ok(args.includes('--dry-run') && !args.some(arg => /^--apply(?:=|$)/.test(arg))
    && env.CANON_MAINTENANCE_DRY_RUN !== 'false',
  'LEGACY_POKEMON_REVIEW_ONLY: explicit --dry-run required; fresh canonical writes require reviewed Master Index execution');
  const options = { dryRun: true, limit: 50, mode: 'backfill', setIds: [], kind: 'all' };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    if (token === '--dry-run') continue;
    const equals = token.indexOf('=');
    const key = equals < 0 ? token : token.slice(0, equals);
    assert.ok(['--limit', '--mode', ...(allowScope ? ['--set', '--kind'] : [])].includes(key), `unknown_review_argument:${key}`);
    assert.ok(key === '--set' || !seen.has(key), `duplicate_review_argument:${key}`);
    seen.add(key);
    const value = equals < 0 ? args[++index] : token.slice(equals + 1);
    assert.ok(value && !value.startsWith('--'), `review_argument_value_required:${key}`);
    if (key === '--limit') {
      assert.ok(/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 500, 'review_limit_must_be_1_to_500');
      options.limit = Number(value);
    } else if (key === '--mode') {
      assert.equal(value, 'backfill', 'review_mode_must_be_backfill');
    } else if (key === '--kind') {
      assert.ok(['all', 'set', 'card'].includes(value), 'review_kind_invalid');
      options.kind = value;
    } else options.setIds.push(value);
  }
  return options;
}

export function assertLegacyNewSetPreparationOnly(args = process.argv.slice(2)) {
  assert.ok(!args.some(arg => /^--apply(?:=|$)/.test(arg)),
    'LEGACY_NEW_SET_APPLY_RETIRED: prepare source evidence here; use a fresh reviewed bounded Master Index executor for mutation');
}

export function assertLegacyPokemonNormalizerRetired() {
  throw new Error('LEGACY_POKEMON_NORMALIZER_RETIRED: this historical writer has no safe dry-run or reviewed atomic admission; preserve raw staging and use the Master Index planner');
}

export function assertLegacySetReviewOnly(args = process.argv.slice(2), env = process.env) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { help: true };
  assert.ok(args.includes('--dry-run') && !args.some(arg => /^--apply(?:=|$)/.test(arg))
    && env.CANON_MAINTENANCE_DRY_RUN !== 'false',
  'LEGACY_SET_SQL_REVIEW_ONLY: explicit --dry-run required; historical SQL apply is retired');
  const result = { dryRun: true, setCode: null, limit: 50, detail: false };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    const equals = token.indexOf('=');
    const key = equals < 0 ? token : token.slice(0, equals);
    assert.ok(['--dry-run', '--set', '--limit', '--detail'].includes(key), `unknown_set_review_argument:${key}`);
    assert.ok(!seen.has(key), `duplicate_set_review_argument:${key}`);
    seen.add(key);
    if (key === '--dry-run' || key === '--detail') {
      assert.equal(equals, -1, `flag_cannot_have_value:${key}`);
      if (key === '--detail') result.detail = true;
      continue;
    }
    const value = equals < 0 ? args[++index] : token.slice(equals + 1);
    assert.ok(value && !value.startsWith('--'), `set_review_value_required:${key}`);
    if (key === '--set') {
      assert.match(value, /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/, 'invalid_set_review_code');
      result.setCode = value;
    } else {
      assert.ok(/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 500, 'set_review_limit_must_be_1_to_500');
      result.limit = Number(value);
    }
  }
  assert.ok(result.setCode, 'set_review_requires_exact_set');
  return result;
}

const entry = (process.argv[1] ?? '').replaceAll('\\', '/').split('/').pop();
if (entry === 'pokemonapi_normalize_worker.mjs') {
  assertLegacyPokemonNormalizerRetired();
}
if (['pokemon_enrichment_worker.mjs', 'pokemonapi_backfill_mappings_worker.mjs', 'tcgdex_normalize_worker.mjs'].includes(entry)) {
  assertLegacyPokemonReviewOnly(undefined, undefined, { allowScope: entry === 'tcgdex_normalize_worker.mjs' });
}
if (entry === 'new_set_release_ingest_v1.mjs') assertLegacyNewSetPreparationOnly();
if (['set_repair_runner.mjs', 'tcgdex_canonize_set.mjs'].includes(entry)) assertLegacySetReviewOnly();

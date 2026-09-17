import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { assertLegacySetReviewOnly } from '../../backend/maintenance/legacy_pokemon_ingestion_admission_v1.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scripts = ['set_repair_runner.mjs', 'tcgdex_canonize_set.mjs'];
const env = { ...process.env, DOTENV_CONFIG_PATH: 'nonexistent-set-review.env',
  SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SECRET_KEY: 'local-test-only', GV_USER_ACCESS_TOKEN: '',
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/forbidden',
  SUPABASE_DB_URL: 'postgresql://test:test@127.0.0.1:1/forbidden', CANON_MAINTENANCE_DRY_RUN: 'true' };

test('legacy set review accepts only one bounded explicit review scope', () => {
  assert.deepEqual(assertLegacySetReviewOnly(['--dry-run', '--set=fixture'], {}),
    { dryRun: true, setCode: 'fixture', limit: 50, detail: false });
  assert.equal(assertLegacySetReviewOnly(['--dry-run', '--set', 'fixture', '--limit', '500', '--detail'], {}).limit, 500);
  for (const args of [[], ['--set', 'fixture'], ['--dry-run'], ['--dry-run', '--all-auto-safe'],
    ['--dry-run', '--set', 'fixture', '--set', 'other'], ['--dry-run', '--set', 'fixture', '--limit=501'],
    ['--dry-run', '--set', 'fixture', '--limit=0'], ['--dry-run', '--set', 'fixture', '--limit=1.5'],
    ['--dry-run', '--set', 'fixture', '--include-reverse=true'], ['--dry-run', '--set', 'fixture,other'],
    ['--dry-run', '--set', 'fixture', '--unknown'], ['--help', '--apply']]) {
    assert.throws(() => assertLegacySetReviewOnly(args, {}));
  }
  assert.throws(() => assertLegacySetReviewOnly(['--dry-run', '--set', 'fixture'], { CANON_MAINTENANCE_DRY_RUN: 'false' }));
});

for (const script of scripts) {
  test(`${script} rejects old SQL write routes before client setup`, async () => {
    for (const args of [[], ['--set', 'fixture', '--apply'], ['--set=fixture', '--apply=false'],
      ['--set', 'fixture', '--dry-run', '--apply'], ['--all-auto-safe', '--dry-run']]) {
      const result = spawnSync(process.execPath, [`backend/tools/${script}`, ...args], {
        cwd: root, env, encoding: 'utf8', timeout: 10000, windowsHide: true,
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /LEGACY_SET_SQL_REVIEW_ONLY|unknown_set_review_argument/);
      assert.doesNotMatch(result.stdout, /using url|connection /);
    }
    const source = await readFile(new URL(`../../backend/tools/${script}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /^main\(\)\.catch/m);
    assert.match(source, /^runLegacySetEvidenceReview\(\)\.catch/m);
    assert.ok(source.indexOf('legacy_pokemon_ingestion_admission_v1.mjs') < source.indexOf("import dotenv"));
  });

  test(`${script} imported execution cannot restore apply`, () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval',
      `process.argv = ['node', 'wrapper.mjs', '--set', 'fixture', '--apply']; await import('./backend/tools/${script}');`],
    { cwd: root, env, encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /LEGACY_SET_SQL_REVIEW_ONLY/);
    assert.doesNotMatch(result.stdout, /using url|connection /);
  });

  test(`${script} help never connects`, () => {
    const result = spawnSync(process.execPath, [`backend/tools/${script}`, '--help'],
      { cwd: root, env, encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Review only:/);
    assert.doesNotMatch(result.stdout, /using url|connection /);
  });
}

async function fixture(script, { ambiguous = false, missing = false, error = false, duplicate = false,
  truncate = false, overlap = false, foreign = false, foreignParent = false, foreignChild = false,
  oversized = false, missingId = false } = {}) {
  const calls = [];
  const source = { id: 10, source: 'tcgdex', status: 'pending', payload: {
    _kind: 'card', _external_id: 'fixture-1', _set_external_id: 'fixture',
    card: { localId: '001', variants: { normal: true, reverse: true, holo: true } },
  } };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams) });
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'GET' || !['sets', 'raw_imports', 'card_prints', 'card_printings', 'external_mappings']
      .some(table => url.pathname === `/rest/v1/${table}`)) {
      res.statusCode = 400; res.end('{"message":"Mutation forbidden"}'); return;
    }
    if (error && url.pathname.endsWith('/raw_imports')) {
      res.statusCode = 400; res.end('{"message":"Fixture read failed"}'); return;
    }
    let rows = [];
    if (url.pathname.endsWith('/sets')) rows = missing ? [] : [
      { id: 'set-1', game: foreign ? 'mtg' : 'pokemon', code: 'fixture', name: 'Fixture' },
      ...(ambiguous ? [{ id: 'set-2', game: 'pokemon', code: 'fixture', name: 'Alias' }] : []),
    ];
    if (url.pathname.endsWith('/raw_imports') && url.searchParams.get('payload->>_kind') === 'eq.card') {
      const legacy = url.searchParams.get('payload->>_set_external_id') === 'is.null';
      rows = legacy ? overlap ? [source] : [{ ...source, id: 11, payload: { _kind: 'card', set_external_id: 'fixture', note: 'preserved legacy source' } }]
        : [source, ...(duplicate ? [source] : []), ...(truncate ? [{ ...source, id: 12 }] : [])];
      if (!legacy && oversized) rows = [source, { ...source, id: 12 }, { ...source, id: 13 }];
      if (!legacy && missingId) rows = [{ ...source, id: null }];
    }
    if (url.pathname.endsWith('/card_prints')) rows = [{ id: 'parent-1', set_id: foreignParent ? 'other-set' : 'set-1', gv_id: 'GV-PK-FIXTURE-001', number: '001' }];
    if (url.pathname.endsWith('/card_printings')) rows = [{ id: 'printing-1', card_print_id: foreignChild ? 'other-parent' : 'parent-1', finish_key: 'normal', gv_id: 'GV-PK-FIXTURE-001-NORMAL' }];
    if (url.pathname.endsWith('/external_mappings')) rows = [{ id: 1, card_print_id: 'parent-1', source: 'tcgdex', external_id: 'fixture-1', active: true }];
    res.end(JSON.stringify(rows));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [`backend/tools/${script}`, '--set', 'fixture', '--dry-run', '--limit=1'], {
        cwd: root, env: { ...env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}` },
        timeout: 15000, windowsHide: true,
      });
      let stdout = '', stderr = '';
      child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
      child.on('error', reject); child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
    });
    assert.ok(calls.every(call => call.method === 'GET'));
    assert.ok(calls.length <= 7);
    assert.ok(calls.every(call => Number(call.query.limit) <= 3 && call.query.order === 'id.asc'));
    const output = result.stdout.split(/\r?\n/).find(line => line.startsWith('{"version"'));
    return { ...result, calls, report: output ? JSON.parse(output) : null, source };
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}

for (const script of scripts) {
  test(`${script} real review preserves raw hints and identities with no checkpoint or printing writes`, async () => {
    const run = await fixture(script);
    assert.equal(run.code, 0, JSON.stringify(run));
    assert.equal(run.report.database_writes, 0);
    assert.equal(run.report.write_ready, false);
    assert.equal(run.report.authority_verified, false);
    assert.equal(run.report.printing_completeness_verified, false);
    assert.deepEqual(run.report.evidence.raw_cards.rows[0], run.source);
    assert.equal(run.report.evidence.legacy_raw_cards.rows[0].payload.note, 'preserved legacy source');
    assert.equal(run.report.evidence.printings.rows[0].gv_id, 'GV-PK-FIXTURE-001-NORMAL');
    assert.equal(run.report.evidence.mappings.rows[0].external_id, 'fixture-1');
    assert.equal(run.report.truncated, false);
    assert.equal(run.calls[0].query.game, 'eq.pokemon');
    assert.equal(run.calls[0].query.code, 'eq.fixture');
    assert.doesNotMatch(run.stdout, /auto-safe|apply-ok|would_create_reverse_printings|CLOSED/);
  });
}

test('ambiguity stays review-only and never selects an arbitrary parent scope', async () => {
  const run = await fixture(scripts[0], { ambiguous: true });
  assert.equal(run.code, 2, JSON.stringify(run));
  assert.equal(run.report.catalog_scope, 'ambiguous');
  assert.deepEqual(run.report.evidence.parents.rows, []);
  assert.equal(run.calls.length, 4);
});

test('a missing catalog set preserves raw evidence without materializing a set or parent', async () => {
  const run = await fixture(scripts[1], { missing: true });
  assert.equal(run.code, 0, JSON.stringify(run));
  assert.equal(run.report.catalog_scope, 'unresolved');
  assert.equal(run.report.evidence.raw_cards.rows.length, 1);
  assert.deepEqual(run.report.evidence.parents.rows, []);
});

test('lookahead reports truncation without claiming complete printing evidence', async () => {
  const run = await fixture(scripts[0], { truncate: true });
  assert.equal(run.code, 0, JSON.stringify(run));
  assert.equal(run.report.truncated, true);
  assert.equal(run.report.evidence.raw_cards.rows.length, 1);
  assert.equal(run.report.printing_completeness_verified, false);
});

for (const [options, expected] of [
  [{ error: true }, /set_review_read_failed/], [{ duplicate: true }, /duplicate_or_missing_set_review_id/],
  [{ overlap: true }, /overlapping_set_review_source_pages/], [{ foreign: true }, /set_review_scope_mismatch/],
  [{ foreignParent: true }, /set_review_parent_scope_mismatch/], [{ foreignChild: true }, /set_review_parent_scope_mismatch/],
  [{ oversized: true }, /invalid_set_review_page/], [{ missingId: true }, /duplicate_or_missing_set_review_id/],
]) {
  test(`read failures and invalid evidence do not become accepted results: ${JSON.stringify(options)}`, async () => {
    const run = await fixture(scripts[1], options);
    assert.equal(run.code, 1, JSON.stringify(run));
    assert.match(run.stderr, expected);
    assert.equal(run.report, null);
    if (options.foreignParent) assert.ok(run.calls.every(call => !/\/(card_printings|external_mappings)$/.test(call.path)));
  });
}

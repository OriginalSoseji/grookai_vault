import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { assertLegacyMappingReviewOnly, legacyMappingReviewRecord, LEGACY_REVIEW_SCRIPTS }
  from '../../backend/maintenance/legacy_mapping_review_only_v1.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = name => fileURLToPath(new URL(`../../backend/pricing/${name}`, import.meta.url));
const env = {
  ...process.env, DOTENV_CONFIG_PATH: 'nonexistent-justtcg-review-test.env',
  SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SECRET_KEY: 'local-test-only',
  GV_USER_ACCESS_TOKEN: '', JUSTTCG_API_KEY: 'local-test-only',
  JUSTTCG_API_BASE_URL: 'http://127.0.0.1:1/provider',
  ENABLE_CANON_MAINTENANCE_MODE: 'true', CANON_MAINTENANCE_MODE: 'EXPLICIT',
  CANON_MAINTENANCE_DRY_RUN: 'true',
  CANON_MAINTENANCE_ENTRYPOINT: 'backend/maintenance/run_canon_maintenance_v1.mjs',
};

test('review discovery defaults to 50 selected cards and accepts only bounded integer limits', () => {
  assert.equal(assertLegacyMappingReviewOnly([], {}).limit, 50);
  assert.equal(assertLegacyMappingReviewOnly(['--limit', '500'], {}).limit, 500);
  for (const args of [['--limit'], ['--limit=0'], ['--limit=501'], ['--limit=1.5'],
    ['--limit=Infinity'], ['--limit=2', '--limit=3']]) {
    assert.throws(() => assertLegacyMappingReviewOnly(args, {}));
  }
});

test('review-only authority flags cannot be overridden by provider data', () => {
  const result = legacyMappingReviewRecord({ write_ready: true, database_writes: 1,
    authority_status: 'verified', version: 'trusted', number: '024', raw: { name: 'Test (Stamped)' } });
  assert.equal(result.write_ready, false);
  assert.equal(result.database_writes, 0);
  assert.equal(result.authority_status, 'requires_source_and_master_index_review');
  assert.equal(result.version, 'LEGACY_MAPPING_REVIEW_ONLY_V1');
  assert.equal(result.number, '024');
  assert.equal(result.raw.name, 'Test (Stamped)');
});

for (const name of LEGACY_REVIEW_SCRIPTS) {
  test(`${name}: real CLI rejects apply before environment/client/provider setup`, () => {
    for (const args of [['--apply'], ['--apply', '--dry-run'], ['--dry-run', '--apply'], ['--apply=false']]) {
      const result = spawnSync(process.execPath, [cli(name), ...args], {
        cwd: root, encoding: 'utf8', timeout: 15000, env: { ...env, SUPABASE_URL: '', JUSTTCG_API_KEY: '' },
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /LEGACY_MAPPING_APPLY_RETIRED/);
      assert.doesNotMatch(result.stdout, /using url|RUN_CONFIG/);
    }
  });

  test(`${name}: maintenance launcher cannot restore retired writes`, () => {
    const result = spawnSync(process.execPath, ['backend/maintenance/run_canon_maintenance_v1.mjs'], {
      cwd: root, encoding: 'utf8', timeout: 15000,
      env: { ...env, CANON_MAINTENANCE_DRY_RUN: 'false', CANON_MAINTENANCE_TASK: name },
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /LEGACY_MAPPING_APPLY_RETIRED/);
    assert.doesNotMatch(result.stdout, /using url|RUN_CONFIG/);
  });

  test(`${name}: no direct mutation implementation or accepted-identity disposition remains`, async () => {
    const source = await readFile(cli(name), 'utf8');
    assert.doesNotMatch(source, /\.(?:upsert|insert|update|delete|rpc)\s*\(/);
    assert.doesNotMatch(source, /SKIP_ALREADY_CORRECT|WOULD_UPSERT|UPSERTED|assertCanonMaintenanceWriteAllowed/);
    assert.ok(source.indexOf('legacy_mapping_review_only_v1.mjs') < source.indexOf("import '../env.mjs'"));
    assert.match(source, /canonical_identity:/);
    assert.match(source, /identity_domain,print_identity_key,printed_identity_modifier/);
    assert.ok(source.indexOf('const conflictingExternalRows') < source.indexOf("status: 'EXISTING_MAPPING_REQUIRES_REVIEW'"));
  });
}

const parent = { id: '11111111-1111-4111-8111-111111111111', name: 'Pikachu', gv_id: 'GV-PK-TEST-024',
  set_id: '22222222-2222-4222-8222-222222222222', set_code: 'test', number: '024', number_plain: '24',
  variant_key: 'stamped', identity_domain: 'pokemon_eng_special', print_identity_key: 'test-stamp',
  printed_identity_modifier: 'stamp' };

async function runFixture({ existing = false, conflict = false, scriptIndex = 0, tcgplayerMapped = false } = {}) {
  const calls = [];
  const provider = { id: 'just-test', tcgplayerId: '123', name: scriptIndex === 2 ? 'Pikachu' : 'Pikachu (Stamped)', number: '024' };
  const tcgdex = { id: 'test-024', pricing: { tcgplayer: { normal: { productId: 123 } } } };
  const target = scriptIndex === 2 ? { ...parent, sets: { name: 'Test Set' } } : parent;
  const mappings = [{ card_print_id: parent.id, source: scriptIndex === 1 ? 'tcgdex' : 'tcgplayer',
    external_id: scriptIndex === 1 ? 'test-024' : '123', active: true },
    ...(tcgplayerMapped ? [{ card_print_id: parent.id, source: 'tcgplayer', external_id: '123', active: true }] : []),
    ...(existing ? [{ card_print_id: parent.id, source: 'justtcg', external_id: provider.id, active: true }] : []),
    ...(conflict ? [{ card_print_id: 'other-parent', source: 'justtcg', external_id: provider.id, active: true }] : [])];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    calls.push({ method: req.method, path: url.pathname });
    res.setHeader('content-type', 'application/json');
    if (url.pathname === '/tcgdex/en/cards/test-024' && req.method === 'GET') {
      res.end(JSON.stringify(tcgdex)); return;
    }
    if (url.pathname === '/provider/sets' && req.method === 'GET') {
      res.end(JSON.stringify({ data: [{ id: 'test-set', name: 'Test Set' }] })); return;
    }
    if (url.pathname === '/provider/cards' && req.method === 'GET' && scriptIndex === 2) {
      res.end(JSON.stringify({ data: [provider] })); return;
    }
    if (url.pathname === '/provider/cards' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      assert.deepEqual(JSON.parse(body), [{ tcgplayerId: '123', game: 'pokemon' }]);
      res.end(JSON.stringify({ data: [provider] })); return;
    }
    if (req.method !== 'GET' || !['/rest/v1/external_mappings', '/rest/v1/card_prints',
      '/rest/v1/justtcg_set_mappings', '/rest/v1/justtcg_identity_overrides'].includes(url.pathname)) {
      res.statusCode = 400; res.end(JSON.stringify({ message: 'Unexpected request' })); return;
    }
    let rows = url.pathname.endsWith('/card_prints') ? [target]
      : url.pathname.endsWith('/external_mappings') ? [...mappings] : [];
    for (const [key, value] of url.searchParams) {
      if (value.startsWith('eq.')) rows = rows.filter(row => String(row[key]) === value.slice(3));
      if (value.startsWith('in.(')) {
        const values = value.slice(4, -1).split(',').map(item => item.replaceAll('"', ''));
        rows = rows.filter(row => values.includes(String(row[key])));
      }
    }
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? rows.length);
    res.end(JSON.stringify(rows.slice(offset, offset + limit)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli(LEGACY_REVIEW_SCRIPTS[scriptIndex]), '--dry-run', '--limit=1'], {
        cwd: root, env: { ...env, SUPABASE_URL: base, JUSTTCG_API_BASE_URL: `${base}/provider`,
          TCGDEX_BASE_URL: `${base}/tcgdex/`, TCGDEX_LANG: 'en', TCGDEX_API_KEY: '' },
        timeout: 15000, windowsHide: true,
      });
      let stdout = '', stderr = '';
      child.stdout.on('data', data => { stdout += data; });
      child.stderr.on('data', data => { stderr += data; });
      child.on('error', reject);
      child.on('close', code => resolve({ code, stdout, stderr }));
    });
    assert.equal(result.code, 0, result.stderr);
    assert.ok(calls.some(call => call.path === '/provider/cards'));
    assert.ok(calls.filter(call => call.path.startsWith('/rest/')).every(call => call.method === 'GET'));
    const records = result.stdout.split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line));
    assert.equal(records.length, 1, result.stdout);
    assert.equal(records[0].write_ready, false);
    assert.equal(records[0].database_writes, 0);
    assert.deepEqual(records[0].canonical_identity, target);
    return records[0];
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test('real read-only CLI preserves raw identity and provider evidence, never promoting agreement', async () => {
  const row = await runFixture();
  assert.equal(row.status, 'MAPPING_CANDIDATE_REQUIRES_REVIEW');
  assert.equal(row.provider_evidence.number, '024');
  assert.equal(row.provider_evidence.name, 'Pikachu (Stamped)');
});

test('existing matching mapping remains review-only', async () => {
  assert.equal((await runFixture({ existing: true })).status, 'EXISTING_MAPPING_REQUIRES_REVIEW');
});

test('existing same-parent match cannot hide another owner of the external ID', async () => {
  assert.equal((await runFixture({ existing: true, conflict: true })).status, 'SKIP_CONFLICTING_EXISTING_JUSTTCG_MAPPING');
});

test('TCGdex bridge preserves the actual bucket payload as unreviewed evidence', async () => {
  const row = await runFixture({ scriptIndex: 1 });
  assert.equal(row.status, 'MAPPING_CANDIDATE_REQUIRES_REVIEW');
  assert.equal(row.name, 'Pikachu');
  assert.equal(row.tcgdex_evidence.pricing.tcgplayer.normal.productId, 123);
  assert.equal(row.provider_evidence.number, '024');
});

test('direct structural agreement emits review evidence without inserting set or card mappings', async () => {
  const row = await runFixture({ scriptIndex: 2 });
  assert.equal(row.status, 'MAPPING_CANDIDATE_REQUIRES_REVIEW');
  assert.equal(row.provider_evidence.number, '024');
  assert.equal(row.mapping_evidence.set_alignment_method, 'exact_raw_name');
});

test('an existing TCGPlayer mapping does not hide a TCGdex association from review', async () => {
  assert.equal((await runFixture({ scriptIndex: 1, existing: true, tcgplayerMapped: true })).status,
    'EXISTING_MAPPING_REQUIRES_REVIEW');
});

for (const scriptIndex of [1, 2]) {
  test(`${LEGACY_REVIEW_SCRIPTS[scriptIndex]} includes already-mapped cards for evidence review`, async () => {
    assert.equal((await runFixture({ scriptIndex, existing: true })).status, 'EXISTING_MAPPING_REQUIRES_REVIEW');
  });
  test(`${LEGACY_REVIEW_SCRIPTS[scriptIndex]} checks other owners even for existing same-parent mappings`, async () => {
    assert.match((await runFixture({ scriptIndex, existing: true, conflict: true })).status,
      /^SKIP_CONFLICTING_EXISTING_JUSTTCG_/);
  });
  test(`${LEGACY_REVIEW_SCRIPTS[scriptIndex]} preserves external-ID conflicts without writes`, async () => {
    assert.match((await runFixture({ scriptIndex, conflict: true })).status, /^SKIP_CONFLICTING_EXISTING_JUSTTCG_/);
  });
}

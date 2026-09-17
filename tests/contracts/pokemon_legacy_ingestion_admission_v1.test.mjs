import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { ensurePokemonApiMapping } from '../../backend/pokemon/pokemonapi_mapping_helpers.mjs';
import { assertLegacyPokemonReviewOnly } from '../../backend/maintenance/legacy_pokemon_ingestion_admission_v1.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, DOTENV_CONFIG_PATH: 'nonexistent-pokemon-admission.env',
  SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SECRET_KEY: 'local-test-only',
  SUPABASE_DB_URL: 'postgresql://local:local@127.0.0.1:1/local', GV_USER_ACCESS_TOKEN: '',
  CANON_MAINTENANCE_DRY_RUN: 'true' };
const reviewScripts = ['pokemon_enrichment_worker.mjs', 'pokemonapi_backfill_mappings_worker.mjs',
  'tcgdex_normalize_worker.mjs'];

for (const [alias, worker, limit] of [
  ['tcgdex:normalize', 'tcgdex_normalize_worker.mjs', 50],
  ['pokemon:enrich', 'pokemon_enrichment_worker.mjs', 50],
  ['pokemon:backfill-mappings', 'pokemonapi_backfill_mappings_worker.mjs', 50],
  ['pokemon:backfill-mappings:dry', 'pokemonapi_backfill_mappings_worker.mjs', 200],
]) {
  test(`${alias} configured command admits bounded read-only evidence review`, async () => {
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
    const [executable, path, ...args] = pkg.scripts[alias].split(/\s+/);
    assert.equal(executable, 'node');
    assert.equal(path, `backend/pokemon/${worker}`);
    const scope = { allowScope: worker === 'tcgdex_normalize_worker.mjs' };
    assert.equal(assertLegacyPokemonReviewOnly(args, env, scope).limit, limit);
    assert.throws(() => assertLegacyPokemonReviewOnly([...args, '--apply'], env, scope));
    if (!alias.endsWith(':dry')) {
      assert.equal(assertLegacyPokemonReviewOnly([...args, '--limit=25'], env, scope).limit, 25);
    }
    const calls = [];
    const server = createServer((req, res) => {
      calls.push({ method: req.method, path: new URL(req.url, 'http://localhost').pathname });
      res.setHeader('content-type', 'application/json');
      if (req.method !== 'GET' || !req.url.startsWith('/rest/v1/raw_imports?')) {
        res.statusCode = 400; res.end('{"message":"Unexpected request"}'); return;
      }
      res.end('[]');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path, ...args], {
          cwd: root, env: { ...env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}` },
          windowsHide: true, timeout: 15000,
        });
        let stdout = '', stderr = '';
        child.stdout.on('data', data => { stdout += data; });
        child.stderr.on('data', data => { stderr += data; });
        child.on('error', reject);
        child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
      });
      assert.equal(result.code, 0, JSON.stringify({ alias, ...result, calls }));
      assert.ok(calls.length > 0);
      assert.ok(calls.every(call => call.method === 'GET' && call.path === '/rest/v1/raw_imports'));
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  });
}

for (const name of reviewScripts) {
  test(`${name} rejects implicit or explicit mutation before client setup`, () => {
    for (const args of [[], ['--apply'], ['--dry-run', '--apply'], ['--apply=false'], ['--dry-run=false']]) {
      const result = spawnSync(process.execPath, [`backend/pokemon/${name}`, ...args], {
        cwd: root, env, encoding: 'utf8', timeout: 15000,
      });
      assert.equal(result.status, 1, name);
      assert.match(result.stderr, /LEGACY_POKEMON_REVIEW_ONLY/);
      assert.doesNotMatch(result.stdout, /using url|starting|\[tcgdex\]\[normalize\] start/);
    }
  });
}

test('PokemonAPI normalizer without a real dry-run cannot accept a dry-run flag', () => {
  const source = 'backend/pokemon/pokemonapi_normalize_worker.mjs';
  for (const args of [[], ['--dry-run'], ['--apply']]) {
    const result = spawnSync(process.execPath, [source, ...args], { cwd: root, env, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /LEGACY_POKEMON_NORMALIZER_RETIRED/);
    assert.doesNotMatch(result.stdout, /using url/);
  }
});

test('shared PokemonAPI helper cannot silently write or swallow failures', async () => {
  const calls = [];
  const client = { from(table) { calls.push(table); return { upsert: async () => ({ error: null }) }; } };
  await assert.rejects(ensurePokemonApiMapping(client, 'parent', 'external'), /MASTER_INDEX_MAPPING_AUTHORITY_REQUIRED/);
  assert.deepEqual(calls, []);
});

test('importing the retired normalizer under another entry point cannot bypass admission', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval',
    "await import('./backend/pokemon/pokemonapi_normalize_worker.mjs')"], { cwd: root, env, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /LEGACY_POKEMON_NORMALIZER_RETIRED/);
  assert.doesNotMatch(result.stdout, /using url/);
});

async function enrichmentFixture({ readError = false, mapped = false } = {}) {
  const calls = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams) });
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'GET') { res.statusCode = 400; res.end(JSON.stringify({ message: 'Writes forbidden' })); return; }
    if (url.pathname === '/rest/v1/raw_imports') {
      res.end(JSON.stringify([{ id: 1, payload: { id: 'fixture-24', number: '24', hp: '60',
        set: { id: 'fixture-set' }, _kind: 'card', name: 'Fixture' } }]));
    } else if (url.pathname === '/rest/v1/external_mappings') {
      if (readError) { res.statusCode = 400; res.end(JSON.stringify({ message: 'Fixture mapping read failed' })); }
      else res.end(JSON.stringify(mapped ? [{ card_print_id: 'fixture-parent' }] : []));
    } else if (url.pathname === '/rest/v1/sets') res.end(JSON.stringify([{ id: 'fixture-set-id', code: 'fixture-set' }]));
    else if (url.pathname === '/rest/v1/card_prints') res.end(JSON.stringify([{ id: 'fixture-parent' }]));
    else { res.statusCode = 400; res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['backend/pokemon/pokemon_enrichment_worker.mjs', '--dry-run', '--limit=1'], {
        cwd: root, env: { ...env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}` },
        windowsHide: true, timeout: 15000,
      });
      let stdout = '', stderr = '';
      child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
      child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }));
    });
    return { ...result, calls };
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}

test('real enrichment dry-run never attempts mapping or trait mutations for an unmapped card', async () => {
  const result = await enrichmentFixture();
  assert.equal(result.code, 0, result.stderr);
  assert.ok(result.calls.length > 0);
  assert.ok(result.calls.every(call => call.method === 'GET'), JSON.stringify(result.calls));
  assert.match(result.stdout, /requires_master_index_review/);
  assert.match(result.stdout, /database_writes.*0/);
});

test('enrichment mapping read failure cannot be converted to fallback success', async () => {
  const result = await enrichmentFixture({ readError: true });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Fixture mapping read failed/);
  assert.ok(result.calls.every(call => call.method === 'GET'));
  assert.ok(!result.calls.some(call => call.path === '/rest/v1/sets'));
});

test('enrichment excludes inactive mappings and still treats an active match as review evidence', async () => {
  const result = await enrichmentFixture({ mapped: true });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.calls.find(call => call.path === '/rest/v1/external_mappings').query.active, 'eq.true');
  assert.match(result.stdout, /requires_master_index_review/);
  assert.ok(result.calls.every(call => call.method === 'GET'));
});

test('new-set legacy apply stops before manifest, source acquisition or other writes', () => {
  for (const args of [['--apply'], ['--apply', '--identity-only'], ['--apply', '--dry-run'], ['--apply=false']]) {
    const result = spawnSync(process.execPath, ['scripts/ingest/new_set_release_ingest_v1.mjs', ...args,
      '--manifest', 'nonexistent-admission-fixture.json'], { cwd: root, env, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /LEGACY_NEW_SET_APPLY_RETIRED/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
  }
});

test('remote import wrapper rejects before staging or old normalizer invocation', async () => {
  const source = await readFile(new URL('../../scripts/import_pokemon_remote.ps1', import.meta.url), 'utf8');
  assert.ok(source.indexOf("throw 'LEGACY_REMOTE_POKEMON_IMPORT_RETIRED") < source.indexOf("Require-Env 'SUPABASE_URL'"));
  assert.ok(source.includes("throw 'LEGACY_REMOTE_POKEMON_IMPORT_RETIRED"));
  const result = spawnSync('pwsh', ['-NoProfile', '-File', 'scripts/import_pokemon_remote.ps1'], {
    cwd: root, env, encoding: 'utf8', timeout: 15000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /LEGACY_REMOTE_POKEMON_IMPORT_RETIRED/);
  assert.doesNotMatch(result.stdout, /START|Target SUPABASE_URL/);
});

async function reviewFixture({ script = 'tcgdex_normalize_worker.mjs', args = ['--kind=card'],
  missingSet = false, ambiguous = false, readError = false, duplicate = false, newParent = false } = {}) {
  const calls = [];
  const payload = { _kind: 'card', _external_id: 'fixture-24', _set_external_id: 'fixture',
    id: 'fixture-24', number: '24', name: 'Fixture', set: { id: 'fixture' },
    variants: { normal: true, reverse: true, holo: true, unexpected_finish: 'preserve me' } };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const query = Object.fromEntries(url.searchParams);
    calls.push({ method: req.method, path: url.pathname, query });
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'GET') { res.statusCode = 400; res.end('{"message":"Writes forbidden"}'); return; }
    if (url.pathname === '/rest/v1/raw_imports') {
      const set = query['payload->>_kind'] === 'eq.set';
      const rows = [1, duplicate ? 1 : 2].map(id => ({ id,
        payload: set ? { _kind: 'set', _external_id: 'fixture', name: 'Fixture set' } : payload }));
      res.end(JSON.stringify(rows.slice(Number(query.offset ?? 0), Number(query.offset ?? 0) + Number(query.limit ?? 2))));
    } else if (url.pathname === '/rest/v1/sets') {
      if (readError) { res.statusCode = 400; res.end('{"message":"Fixture set read failed"}'); }
      else res.end(JSON.stringify(missingSet ? [] : [{ id: 'fixture-set', code: 'fixture', source: {} }]));
    } else if (url.pathname === '/rest/v1/card_prints') {
      res.end(JSON.stringify(newParent ? [] : ambiguous ? [{ id: 'parent-a' }, { id: 'parent-b' }] : [{ id: 'parent-a' }]));
    } else { res.statusCode = 400; res.end('{"message":"Unexpected fixture read"}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [`backend/pokemon/${script}`, '--dry-run', '--limit=2', ...args], {
        cwd: root, env: { ...env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}` },
        windowsHide: true, timeout: 10000,
      });
      let stdout = '', stderr = '';
      child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
      child.on('error', reject); child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
    });
    const records = result.stdout.split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line));
    return { ...result, calls, records, payload };
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

for (const options of [{}, { newParent: true }]) {
  test(`TCGdex bounded review preserves source hints without creating ${options.newParent ? 'new' : 'existing'} parent printings`, async () => {
    const result = await reviewFixture(options);
    assert.equal(result.code, 0, result.stderr);
    assert.ok(result.calls.every(call => call.method === 'GET'));
    const rows = result.records.filter(row => row.raw_import_id != null);
    assert.deepEqual(rows.map(row => row.raw_import_id), [1, 2]);
    assert.ok(rows.every(row => row.write_ready === false && row.database_writes === 0));
    assert.deepEqual(rows[0].source_payload, result.payload);
    assert.deepEqual(rows[0].source_finish_hints, result.payload.variants);
    assert.equal(result.records.at(-1).cards.processed, 2);
    assert.equal(result.records.at(-1).cards.reviewed, 2);
    assert.equal(result.calls.filter(call => call.path.endsWith('/raw_imports') && call.query.select !== 'id').length, 1);
  });
}

for (const options of [{ missingSet: true }, { ambiguous: true }, { readError: true }]) {
  test(`TCGdex review terminates and accounts for every failed row ${JSON.stringify(options)}`, async () => {
    const result = await reviewFixture(options);
    assert.equal(result.signal, null, 'Must finish, not time out on unchanged pending rows');
    assert.equal(result.code, 1);
    const summary = result.records.at(-1);
    assert.equal(summary.cards.processed, 2);
    assert.equal(summary.cards.errors + summary.cards.conflicts, 2);
    assert.deepEqual(result.records.filter(row => row.raw_import_id != null).map(row => row.raw_import_id), [1, 2]);
    assert.ok(result.calls.every(call => call.method === 'GET'));
  });
}

test('TCGdex all-kind limit bounds sets and cards together', async () => {
  const result = await reviewFixture({ args: ['--kind=all'] });
  assert.equal(result.code, 0, result.stderr);
  const summary = result.records.at(-1);
  assert.equal(summary.sets.processed + summary.cards.processed, 2);
  assert.equal(summary.cards.skipped, true);
  assert.ok(result.calls.every(call => call.method === 'GET'));
});

test('TCGdex rejects duplicate selected raw IDs before resolving candidates', async () => {
  const result = await reviewFixture({ duplicate: true });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /duplicate_or_missing_review_raw_id/);
  assert.ok(!result.calls.some(call => call.path.endsWith('/sets')));
});

test('PokemonAPI backfill emits review evidence without a mapping request', async () => {
  const result = await reviewFixture({ script: 'pokemonapi_backfill_mappings_worker.mjs', args: [] });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(result.records.map(row => row.raw_import_id), [1, 2]);
  assert.ok(result.calls.every(call => call.method === 'GET'));
  assert.ok(!result.calls.some(call => call.path.endsWith('/external_mappings')));
  assert.deepEqual(result.records[0].source_payload, result.payload);
});

test('PokemonAPI backfill preserves unresolved evidence and rejects repeated raw IDs', async () => {
  const unresolved = await reviewFixture({ script: 'pokemonapi_backfill_mappings_worker.mjs', args: [], ambiguous: true });
  assert.equal(unresolved.code, 0, unresolved.stderr);
  assert.deepEqual(unresolved.records.map(row => row.outcome), ['unresolved_parent', 'unresolved_parent']);
  assert.match(unresolved.stdout, /candidates=0, unmatched=2/);
  assert.ok(unresolved.calls.every(call => call.method === 'GET'));
  const duplicate = await reviewFixture({ script: 'pokemonapi_backfill_mappings_worker.mjs', args: [], duplicate: true });
  assert.equal(duplicate.code, 1);
  assert.match(duplicate.stderr, /duplicate_or_missing_review_raw_id/);
});

test('operational discovery does not advertise the retired new-set writer', async () => {
  const { CONTRACT_RUNTIME_CATALOG_V1 } = await import('../../backend/lib/contracts/runtime_contract_catalog_v1.mjs');
  const entries = Object.values(CONTRACT_RUNTIME_CATALOG_V1);
  assert.ok(entries.length > 0);
  assert.ok(entries.every(entry => !entry.enforcement_points?.worker?.includes('scripts/ingest/new_set_release_ingest_v1.mjs')));
  const playbook = await readFile(new URL('../../docs/playbooks/NEW_POKEMON_SET_RELEASE_INGESTION_PLAYBOOK_V1.md', import.meta.url), 'utf8');
  assert.match(playbook, /Legacy apply retired/);
});

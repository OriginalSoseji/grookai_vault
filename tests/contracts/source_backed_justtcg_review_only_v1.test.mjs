import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const script = 'backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs';
const env = { ...process.env, DOTENV_CONFIG_PATH: 'nonexistent-source-review-test.env',
  SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SECRET_KEY: 'local-test-only',
  SUPABASE_DB_URL: 'postgresql://local:local@127.0.0.1:1/local', DATABASE_URL: '',
  GV_USER_ACCESS_TOKEN: '', CANON_MAINTENANCE_DRY_RUN: 'true' };
const parent = { id: '11111111-1111-4111-8111-111111111111', gv_id: 'GV-PK-TEST-024',
  name: 'Fixture', number: '024', set_code: 'test', variant_key: null,
  set_id: '33333333-3333-4333-8333-333333333333', identity_domain: 'pokemon_eng_standard',
  printed_identity_modifier: null, print_identity_key: null };
const input = { card_print_id: parent.id, gv_id: parent.gv_id,
  source_candidate_id: '22222222-2222-4222-8222-222222222222',
  source_external_id: 'provider-fixture', effective_set_code: 'test', variant_key: null };
const candidate = { id: input.source_candidate_id, source: 'justtcg', upstream_id: input.source_external_id,
  raw_import_id: 123, name_raw: 'Fixture (Stamped)', number_raw: '024', set_id: 'provider-set',
  payload: { name: 'Fixture (Stamped)', number: '024', arbitrary_detail: 'preserved' } };

async function fixture({ overrides = {}, mappings = [], args = [], rows } = {}) {
  const folder = await mkdtemp(path.join(tmpdir(), 'grookai-source-review-'));
  const file = path.join(folder, 'input.json');
  await writeFile(file, JSON.stringify({ rows: rows ?? [{ ...input, ...overrides }] }));
  const calls = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    calls.push({ method: req.method, path: url.pathname });
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'GET') { res.statusCode = 400; res.end('{}'); return; }
    let data;
    if (url.pathname === '/rest/v1/card_prints') data = [parent];
    else if (url.pathname === '/rest/v1/external_discovery_candidates') data = [candidate];
    else if (url.pathname === '/rest/v1/external_mappings') data = [...mappings];
    else { res.statusCode = 400; res.end('{}'); return; }
    for (const [key, value] of url.searchParams) {
      if (value.startsWith('eq.')) data = data.filter(row => String(row[key]) === value.slice(3));
      if (value.startsWith('in.(')) {
        const selected = value.slice(4, -1).split(',').map(item => item.replaceAll('"', ''));
        data = data.filter(row => selected.includes(String(row[key])));
      }
    }
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? data.length);
    res.end(JSON.stringify(data.slice(offset, offset + limit)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script, '--dry-run', `--input-json=${file}`, ...args], {
        cwd: root, env: { ...env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}` },
        windowsHide: true, timeout: 15000,
      });
      let stdout = '', stderr = '';
      child.stdout.on('data', value => { stdout += value; });
      child.stderr.on('data', value => { stderr += value; });
      child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }));
    });
    assert.ok(calls.every(call => call.method === 'GET'), JSON.stringify(calls));
    const records = result.stdout.split(/\r?\n/).filter(line => line.startsWith('{"ts":'))
      .map(line => JSON.parse(line));
    return { ...result, calls, row: records.find(row => row.event === 'row') };
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    assert.ok(path.resolve(folder).startsWith(`${path.resolve(tmpdir())}${path.sep}grookai-source-review-`));
    await rm(folder, { recursive: true, force: true });
  }
}

test('source-backed apply is rejected before environment or input access, regardless of flag order', () => {
  for (const args of [['--apply'], ['--apply=false'], ['--apply', '--dry-run'], ['--dry-run', '--apply']]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, env, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /LEGACY_MAPPING_APPLY_RETIRED/);
    assert.doesNotMatch(result.stdout, /using url|run_config/);
  }
});

test('source-backed candidate retains raw input, parent and source without claiming write authority', async () => {
  const result = await fixture();
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.row.status, 'mapping_candidate_requires_review');
  assert.equal(result.row.write_ready, false);
  assert.equal(result.row.database_writes, 0);
  assert.deepEqual(result.row.canonical_identity, parent);
  assert.deepEqual(result.row.requested_identity, input);
  assert.deepEqual(result.row.source_candidate, candidate);
});

for (const [field, value] of [['gv_id', 'GV-PK-WRONG-999'], ['variant_key', 'unproven_stamp'],
  ['effective_set_code', 'wrong'], ['number', '999'], ['set_id', 'wrong-set']]) {
  test(`source-backed ${field} drift is a conflict, including null live variant`, async () => {
    const result = await fixture({ overrides: { [field]: value } });
    assert.equal(result.code, 1);
    assert.equal(result.row.status, 'conflict_input_identity');
    assert.equal(result.row.gv_id, parent.gv_id);
    assert.equal(result.row.requested_identity[field], value);
  });
}

const exact = { id: 'mapping-1', card_print_id: parent.id, external_id: input.source_external_id,
  source: 'justtcg', active: true };
test('existing matching mapping is still review-only', async () => {
  const result = await fixture({ mappings: [exact] });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.row.status, 'existing_mapping_requires_review');
  assert.equal(result.row.write_ready, false);
});

for (const active of [true, false]) {
  test(`existing match cannot hide ${active ? 'active' : 'inactive'} external owner conflict`, async () => {
    const result = await fixture({ mappings: [exact, { ...exact, id: 'mapping-2', card_print_id: 'other', active }] });
    assert.equal(result.code, 1);
    assert.equal(result.row.status, 'conflict_external_id_claimed_elsewhere');
    assert.equal(result.row.external_id_mappings.length, 2);
  });
}

test('source-backed review rejects oversize batch before client access without truncation', async () => {
  const result = await fixture({ rows: [input, { ...input, card_print_id: 'other', source_external_id: 'other' }], args: ['--limit=1'] });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /review_batch_size/);
  assert.equal(result.calls.length, 0);
});

test('conflicting external owner on a later page is not silently truncated', async () => {
  const mappings = Array.from({ length: 100 }, (_, index) => ({ ...exact, id: `m-${index}` }));
  mappings.push({ ...exact, id: 'later-owner', card_print_id: 'other' });
  const result = await fixture({ mappings });
  assert.equal(result.code, 1);
  assert.equal(result.row.status, 'conflict_external_id_claimed_elsewhere');
  assert.equal(result.row.external_id_mappings.length, 101);
});

test('source candidate ID does not authorize a different provider identity', async () => {
  const result = await fixture({ overrides: { source_external_id: 'wrong-provider-identity' } });
  assert.equal(result.code, 1);
  assert.equal(result.row.status, 'conflict_source_candidate_identity');
});

test('existing exact mapping does not hide a different inactive mapping on the parent', async () => {
  const result = await fixture({ mappings: [exact, { ...exact, id: 'old', external_id: 'different', active: false }] });
  assert.equal(result.code, 1);
  assert.equal(result.row.status, 'conflict_existing_card_print_mapping');
});

test('write-mode environment cannot bypass source-backed review admission', () => {
  const result = spawnSync(process.execPath, [script, '--dry-run'], { cwd: root,
    env: { ...env, CANON_MAINTENANCE_DRY_RUN: 'false' }, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /LEGACY_MAPPING_APPLY_RETIRED/);
  assert.doesNotMatch(result.stdout, /using url|run_config/);
});

test('empty batch cannot be reported as a successful review', async () => {
  const result = await fixture({ rows: [] });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /review_batch_size/);
  assert.equal(result.calls.length, 0);
});

test('source-backed CLI has no direct database mutation implementation', async () => {
  const source = await readFile(path.join(root, script), 'utf8');
  assert.doesNotMatch(source, /\.(?:upsert|insert|update|delete|rpc)\s*\(/);
  assert.doesNotMatch(source, /assertExecuteCanonWriteV1|already_correct|would_upsert/);
});

test('all historical Prize Pack callers reject replay before environment, files or clients', async () => {
  const directory = path.join(root, 'backend/warehouse');
  const callers = [];
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.mjs')) continue;
    const source = await readFile(path.join(directory, name), 'utf8');
    if (!source.includes("'backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs'")) continue;
    callers.push(name);
    assert.ok(source.startsWith("import '../maintenance/retired_prize_pack_replay_v1.mjs';"), name);
    for (const args of [[], ['--dry-run'], ['--apply']]) {
      const result = spawnSync(process.execPath, [path.join(directory, name), ...args], {
        cwd: root, env, encoding: 'utf8', timeout: 15000,
      });
      assert.equal(result.status, 1, name);
      assert.match(result.stderr, /HISTORICAL_PRIZE_PACK_REPLAY_RETIRED/, name);
      assert.doesNotMatch(result.stdout, /using url|batch_start|batch_complete/, name);
    }
  }
  assert.equal(callers.length, 10);
});

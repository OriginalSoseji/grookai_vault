import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseArgs, collectProductIdDetails, evaluateProductIds, runReadOnlyBridge,
} from '../../backend/pokemon/promote_tcgdex_tcgplayer_bridge_v1.mjs';

const script = fileURLToPath(new URL('../../backend/pokemon/promote_tcgdex_tcgplayer_bridge_v1.mjs', import.meta.url));
const parent = { id: 'parent-1', name: 'Pikachu', gv_id: 'GV-PK-PGO-27', set_id: 'set-1', number_plain: '27', variant_key: null };
const payload = { id: 'pgo-27', pricing: { tcgplayer: { normal: { productId: 276946 }, 'reverse-holofoil': { productId: 276946 } } } };

function fixture({ extraMappings = [], parents = [parent], source = payload, sourceError, count = 1 } = {}) {
  const calls = [];
  const mappings = Array.from({ length: count }, (_, i) => ({
    source: 'tcgdex', card_print_id: i ? `parent-${i + 1}` : parent.id,
    external_id: i ? `pgo-${i + 27}` : 'pgo-27', active: true,
  })).concat(extraMappings);
  const supabase = {
    from(table) {
      assert.ok(['external_mappings', 'card_prints'].includes(table));
      calls.push(table);
      let rows = table === 'external_mappings' ? [...mappings] : [...parents];
      const query = {
        select() { return query; },
        eq(key, value) { rows = rows.filter(row => row[key] === value); return query; },
        in(key, values) { rows = rows.filter(row => values.includes(row[key])); return query; },
        order() { return query; },
        range(start, end) { rows = rows.slice(start, end + 1); return query; },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject); },
      };
      return new Proxy(query, { get(target, key) {
        if (['upsert', 'insert', 'update', 'delete', 'rpc'].includes(key)) assert.fail(`Forbidden write: ${key}`);
        return target[key];
      } });
    },
  };
  const tcgdexClient = { async fetchTcgdexCardById(id) {
    calls.push(`source:${id}`);
    if (sourceError) throw sourceError;
    return source;
  } };
  return { supabase, tcgdexClient, calls };
}

test('CLI is bounded and fail-closed, regardless of apply/dry-run flag order', () => {
  assert.equal(parseArgs([]).limit, 50);
  assert.equal(parseArgs(['--dry-run', '--limit=2']).limit, 2);
  for (const args of [['--apply'], ['--apply', '--dry-run'], ['--dry-run', '--apply'], ['--apply=false']]) {
    assert.throws(() => parseArgs(args), /DIRECT_MAPPING_APPLY_RETIRED/);
  }
  for (const args of [['--limit'], ['--limit=0'], ['--limit=501'], ['--limit=1.5'], ['--limit=Infinity'], ['--output'], ['--unknown']]) {
    assert.throws(() => parseArgs(args));
  }
});

test('real CLI rejects legacy apply before environment, credentials or network setup', () => {
  const result = spawnSync(process.execPath, [script, '--apply', '--dry-run'], {
    encoding: 'utf8', env: { ...process.env, DOTENV_CONFIG_PATH: 'nonexistent-bridge-test.env',
      SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', TCGDEX_BASE_URL: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DIRECT_MAPPING_APPLY_RETIRED/);
  assert.doesNotMatch(result.stderr, /missing|SUPABASE|TCGDEX_BASE_URL/);
});

test('bucket agreement is a candidate, never printing authority', () => {
  const details = collectProductIdDetails(payload);
  assert.deepEqual(details.productIds, ['276946', '276946']);
  assert.equal(details.observedVariantPaths.length, 2);
  assert.equal(evaluateProductIds(details.productIds).result, 'REVIEW_REQUIRED');
  assert.equal(evaluateProductIds(['1', '2']).result, 'AMBIGUOUS');
});

test('malformed product IDs cannot be hidden by an otherwise agreeing bucket', () => {
  for (const value of [{}, true, 0, -2, 1.2, 'NaN', '123junk', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => collectProductIdDetails({ pricing: { tcgplayer: {
      normal: { productId: 123 }, holofoil: { productId: value },
    } } }), /INVALID_PROVIDER_PRODUCT_ID/);
  }
});

test('read-only discovery preserves source evidence and target identity without writing', async () => {
  const report = await runReadOnlyBridge(fixture());
  assert.equal(report.summary.review_required, 1);
  assert.equal(report.summary.database_writes, 0);
  const row = report.rows[0];
  assert.equal(row.status, 'REVIEW_REQUIRED');
  assert.equal(row.write_ready, false);
  assert.deepEqual(row.targetIdentity, parent);
  assert.deepEqual(row.source_payload, payload);
  assert.equal(row.source_payload_sha256, createHash('sha256').update(JSON.stringify(payload)).digest('hex'));
  assert.equal(row.source_serialization, 'parsed_json_utf8_not_original_response_bytes');
});

test('an existing mapping does not validate itself', async () => {
  const report = await runReadOnlyBridge(fixture({ extraMappings: [
    { source: 'tcgplayer', card_print_id: parent.id, external_id: '276946', active: true },
  ] }));
  assert.equal(report.rows[0].status, 'EXISTING_MAPPING_REQUIRES_REVIEW');
  assert.equal(report.summary.existing_mapping_requires_review, 1);
  assert.equal(report.summary.already_correct, undefined);
});

test('conflicting ownership is checked even when target already has the same active mapping', async () => {
  const report = await runReadOnlyBridge(fixture({ extraMappings: [
    { source: 'tcgplayer', card_print_id: parent.id, external_id: '276946', active: true },
    { source: 'tcgplayer', card_print_id: 'other-parent', external_id: '276946', active: false },
  ] }));
  assert.equal(report.rows[0].status, 'SKIP_CONFLICTING_EXISTING_TCGPLAYER_MAPPING');
  assert.equal(report.rows[0].external_id_mappings.length, 2);
});

test('different active product mapping is preserved as conflict evidence', async () => {
  const report = await runReadOnlyBridge(fixture({ extraMappings: [
    { source: 'tcgplayer', card_print_id: parent.id, external_id: '999', active: true },
  ] }));
  assert.equal(report.summary.conflicting_existing, 1);
  assert.equal(report.rows[0].active_card_mappings[0].external_id, '999');
});

test('different finish bucket IDs remain ambiguous, not selected by precedence', async () => {
  const report = await runReadOnlyBridge(fixture({ source: {
    ...payload, pricing: { tcgplayer: { normal: { productId: 1 }, holofoil: { productId: 2 } } },
  } }));
  assert.equal(report.summary.ambiguous, 1);
  assert.equal(report.rows[0].candidateProductId, null);
});

test('no IDs does not invent a mapping', async () => {
  const report = await runReadOnlyBridge(fixture({ source: { id: 'pgo-27' } }));
  assert.equal(report.summary.no_product_id, 1);
});

test('wrong source identity and missing target fail while retaining provider evidence', async () => {
  for (const [options, reason] of [[{ source: { ...payload, id: 'wrong' } }, 'SOURCE_ID_MISMATCH'], [{ parents: [] }, 'TARGET_IDENTITY_MISSING']]) {
    const report = await runReadOnlyBridge(fixture(options));
    assert.equal(report.summary.errors, 1);
    assert.equal(report.rows[0].reason, reason);
    assert.ok(report.rows[0].source_payload_sha256);
  }
});

test('source access failures remain errors, not no-product findings; sensitive messages are not copied', async () => {
  const sourceError = Object.assign(new Error('private request details'), { status: 403 });
  const report = await runReadOnlyBridge(fixture({ sourceError }));
  assert.equal(report.summary.errors, 1);
  assert.equal(report.summary.no_product_id, 0);
  assert.equal(report.rows[0].http_status, 403);
  assert.equal(report.rows[0].error_phase, 'source_fetch');
  assert.doesNotMatch(JSON.stringify(report), /private request/);
});

test('artifact failure stops before another provider call', async () => {
  const services = fixture({ count: 2 });
  await assert.rejects(runReadOnlyBridge({ ...services, onRow: async () => { throw new Error('disk full'); } }), /disk full/);
  assert.equal(services.calls.filter(call => call.startsWith('source:')).length, 1);
});

test('a bounded discovery sample cannot silently become a full catalog run', async () => {
  const services = fixture({ count: 2 });
  const report = await runReadOnlyBridge({ ...services, limit: 1 });
  assert.equal(report.summary.inspected, 1);
  assert.equal(report.rows.length, 1);
  await assert.rejects(runReadOnlyBridge({ ...services, limit: null }), /Invalid bridge limit/);
});

test('selection persistence fails before any source calls', async () => {
  const services = fixture();
  await assert.rejects(runReadOnlyBridge({ ...services, onSelection: async () => { throw new Error('selection disk full'); } }), /selection disk full/);
  assert.equal(services.calls.filter(call => call.startsWith('source:')).length, 0);
});

test('real CLI saves immutable evidence using only GETs and refuses artifact overwrite', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'grookai-bridge-review-'));
  const output = path.join(root, 'run');
  const requests = [];
  let selectionBeforeSource = false;
  const server = createServer(async (req, res) => {
    requests.push({ method: req.method, url: req.url });
    const url = new URL(req.url, 'http://localhost');
    let body;
    if (url.pathname === '/v2/en/cards/pgo-27') {
      const selection = JSON.parse(await readFile(path.join(output, 'selection.json'), 'utf8'));
      selectionBeforeSource = selection.cards[0].cardPrintId === parent.id;
      body = payload;
    } else if (url.pathname === '/rest/v1/card_prints') {
      body = [parent];
    } else if (url.pathname === '/rest/v1/external_mappings') {
      body = url.searchParams.get('source') === 'eq.tcgdex'
        ? [{ card_print_id: parent.id, external_id: 'pgo-27', active: true }] : [];
    } else {
      res.writeHead(404); res.end('{}'); return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { ...process.env, DOTENV_CONFIG_PATH: path.join(root, 'absent.env'),
    SUPABASE_URL: base, SUPABASE_SECRET_KEY: 'sb_secret_local_fixture_only',
    GV_USER_ACCESS_TOKEN: '', TCGDEX_BASE_URL: `${base}/v2`, TCGDEX_LANG: 'en', TCGDEX_API_KEY: '' };
  async function invoke() {
    const child = spawn(process.execPath, [script, '--dry-run', '--limit=1', '--output', output], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; });
    child.stderr.on('data', chunk => { text += chunk; });
    return new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', code => resolve({ code, text }));
    });
  }
  const result = await invoke();
  assert.equal(result.code, 0, result.text);
  assert.ok(selectionBeforeSource);
  assert.ok(requests.length >= 4);
  assert.ok(requests.every(request => request.method === 'GET'));
  const before = await readFile(path.join(output, 'row-0001.json'), 'utf8');
  assert.equal(JSON.parse(before).status, 'REVIEW_REQUIRED');
  const summary = JSON.parse(await readFile(path.join(output, 'summary.json'), 'utf8'));
  assert.equal(summary.inspected, 1);
  assert.equal(summary.database_writes, 0);
  assert.equal(summary.catalog_completeness_verified, false);
  assert.deepEqual((await readdir(output)).sort(), ['row-0001.json', 'run_plan.json', 'selection.json', 'summary.json']);
  const count = requests.length;
  const again = await invoke();
  assert.equal(again.code, 1);
  assert.match(again.text, /EEXIST/);
  assert.equal(requests.length, count);
  assert.equal(await readFile(path.join(output, 'row-0001.json'), 'utf8'), before);
});

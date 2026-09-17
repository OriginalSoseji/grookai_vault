import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal } from '../fixtures/warehouse_printing_authority_v1.mjs';
import { fixture, reviewFixture } from '../fixtures/master_mapping_authority_v1.mjs';
import { tcgplayerExactMappingCandidateFingerprintV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs';
import { buildTcgplayerExactMappingMetaV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs';
import { assertMasterMappingBatchAuthority, freezeMasterMappingAuthority } from '../../backend/pricing/master_index_mapping_authority_v1.mjs';
import { packageMasterMappingAuthority } from '../../scripts/ingest/master_index_mapping_package_v1.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const pack = f => freezeMasterMappingAuthority(f.selected, [f]);

test('file packager preserves reviewed bytes, refuses overwrite, and never creates a review', async t => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const base = path.join(root, 'artifacts', 'master-mapping-contract-tests');
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(path.join(base, 'package-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const f = fixture();
  const selectedPath = path.join(dir, 'selected.jsonl');
  const scopesPath = path.join(dir, 'scopes.json');
  await writeFile(selectedPath, `${JSON.stringify(f.selected[0])}\n`);
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(f.manifest));
  const map = [];
  for (const [ref, bytes] of f.artifacts) {
    const name = `artifact-${map.length}.json`;
    await writeFile(path.join(dir, name), bytes);
    map.push({ ref, path: name });
  }
  await writeFile(path.join(dir, 'map.json'), JSON.stringify(map));
  await writeFile(scopesPath, JSON.stringify([{ manifest: 'manifest.json', artifact_map: 'map.json' }]));
  const out = path.join(dir, 'out');
  const args = [`--selected=${selectedPath}`, `--scopes=${scopesPath}`, `--out-dir=${out}`];
  const receipt = await packageMasterMappingAuthority(args);
  const bytes = readFileSync(path.join(out, 'master_authority.json'));
  assert.equal(receipt.authority_file_sha256, digest(bytes));
  assert.equal(receipt.execution_authorized, false);
  assert.deepEqual(JSON.parse(bytes), pack(f));
  await assert.rejects(packageMasterMappingAuthority(args), /EEXIST/);
  assert.deepEqual(readFileSync(path.join(out, 'master_authority.json')), bytes);
  const reviewPath = path.join(dir, map.find(row => row.ref === 'review').path);
  await writeFile(reviewPath, '{}');
  await assert.rejects(packageMasterMappingAuthority([...args.slice(0, 2), `--out-dir=${out}-invalid`]));
  assert.equal(readFileSync(reviewPath, 'utf8'), '{}');
});

test('reviewed source and exact selected identity survive an evidence-package JSON round trip', () => {
  const f = fixture(), bundle = JSON.parse(JSON.stringify(pack(f)));
  const proof = assertMasterMappingBatchAuthority(f.selected, bundle, f);
  assert.equal(proof.execution_authorized, false);
  assert.equal(proof.bindings[0].candidate_fingerprint, f.selected[0].candidate_fingerprint);
  assert.equal(proof.bindings[0].master_manifest_fingerprint, f.manifest.fingerprint);
  assert.deepEqual(bundle, pack(f));
});

test('structurally valid mapping fixture cannot enter execution without a Master Index package', () => {
  const f = fixture();
  assert.throws(() => assertMasterMappingBatchAuthority(f.selected, null), /master_mapping_authority_required/);
});

test('packaging cannot silently discard unbound source bytes', () => {
  const f = fixture();
  f.artifacts.set('unreviewed-extra', Buffer.from('unreviewed'));
  assert.throws(() => pack(f), /mapping_unbound_artifacts/);
});

test('adding a mapping assertion without a new real review cannot inherit printing-only approval', () => {
  const f = fixture();
  f.manifest.external_mapping_assertions[0].external_id = '999';
  f.manifest = seal(f.manifest);
  assert.throws(() => pack(f), /review_projection_mismatch/);
});

for (const field of ['id', 'set_id', 'gv_id', 'name', 'identity_domain', 'variant_key', 'printed_identity_modifier', 'number']) {
  test(`live parent ${field} drift is rejected`, () => {
    const f = fixture(), bundle = pack(f);
    f.liveTargets[0].parent_snapshot[field] = 'different';
    assert.throws(() => assertMasterMappingBatchAuthority(f.selected, bundle, f), /mapping_live/);
  });
}

test('missing live modifier is not silently converted to null', () => {
  const f = fixture(), bundle = pack(f);
  delete f.liveTargets[0].parent_snapshot.printed_identity_modifier;
  assert.throws(() => assertMasterMappingBatchAuthority(f.selected, bundle, f), /field_missing/);
});

test('raw printed number drift cannot hide behind equivalent normalized coordinates', () => {
  const f = fixture(), bundle = pack(f);
  f.liveTargets[0].parent_snapshot.number = '001/010';
  assert.throws(() => assertMasterMappingBatchAuthority(f.selected, bundle, f), /mapping_live_raw_number_drift/);
});

for (const duplicate of ['parent', 'product']) {
  test(`shared admission independently rejects duplicate ${duplicate} identities`, () => {
    const f = fixture();
    const second = structuredClone(f.selected[0]);
    if (duplicate === 'parent') second.source_product_id = 124;
    else second.target.card_print_id = '33333333-3333-4333-8333-333333333333';
    delete second.candidate_fingerprint;
    second.candidate_fingerprint = tcgplayerExactMappingCandidateFingerprintV1(second);
    f.selected.push(second);
    assert.throws(() => pack(f), new RegExp(`duplicate_mapping_${duplicate}`));
  });
}

for (const defect of ['missing', 'file_hash', 'unreviewed_assertion']) {
  test(`real dry-run CLI rejects ${defect} authority before opening a DB connection`, async t => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const base = path.join(root, 'artifacts', 'master-mapping-contract-tests');
    await mkdir(base, { recursive: true });
    const dir = await mkdtemp(path.join(base, 'admission-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const f = fixture();
    const candidates = `${JSON.stringify(f.selected[0])}\n`;
    const candidatePath = path.join(dir, 'candidates.jsonl');
    await writeFile(candidatePath, candidates);
    await writeFile(path.join(dir, 'summary.json'), JSON.stringify({ status: 'passed', counts: { candidates: 1 } }));
    await writeFile(path.join(dir, 'run_plan.json'), JSON.stringify({ mode: 'read_only_dry_run', commit_sha: 'a'.repeat(40) }));
    let connections = 0;
    const server = createServer(socket => { connections += 1; socket.destroy(); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(SUPABASE|DATABASE|POSTGRES|PG|TCGPLAYER_EXACT_MAPPING|CANON_MAINTENANCE|ENABLE_CANON|NODE_OPTIONS|DOTENV)/i.test(key)));
    Object.assign(env, {
      DOTENV_CONFIG_PATH: path.join(dir, 'no-env-file'),
      ENABLE_CANON_MAINTENANCE_MODE: 'true', CANON_MAINTENANCE_MODE: 'EXPLICIT',
      CANON_MAINTENANCE_ENTRYPOINT: 'backend/maintenance/run_canon_maintenance_v1.mjs',
      CANON_MAINTENANCE_DRY_RUN: 'true',
      TCGPLAYER_EXACT_MAPPING_PLAN_PATH: candidatePath,
      TCGPLAYER_EXACT_MAPPING_LIMIT: '1',
      TCGPLAYER_EXACT_MAPPING_EXPECTED_SHA256: digest(candidates),
      TCGPLAYER_EXACT_MAPPING_OUTPUT_ROOT: path.join(dir, 'output'),
      DATABASE_URL: `postgresql://test:test@127.0.0.1:${server.address().port}/test`,
    });
    if (defect !== 'missing') {
      let bundle = pack(f);
      if (defect === 'unreviewed_assertion') {
        bundle.scopes[0].manifest.external_mapping_assertions[0].external_id = '999';
        bundle.scopes[0].manifest = seal(bundle.scopes[0].manifest);
        bundle = seal(bundle);
      }
      const bytes = JSON.stringify(bundle);
      env.TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_PATH = path.join(dir, 'authority.json');
      env.TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_SHA256 = defect === 'file_hash' ? '0'.repeat(64) : digest(bytes);
      await writeFile(env.TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_PATH, bytes);
    }
    const child = spawn(process.execPath, ['backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs', '--dry-run'], { cwd: root, env, windowsHide: true });
    let output = '';
    child.stdout.on('data', bytes => { output += bytes; });
    child.stderr.on('data', bytes => { output += bytes; });
    const timeout = setTimeout(() => child.kill(), 20000);
    const result = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolve({ code, signal }));
    }).finally(() => clearTimeout(timeout));
    assert.equal(result.signal, null, output);
    assert.equal(result.code, 1, output);
    const expected = { missing: /TCGPLAYER_EXACT_MAPPING_MASTER_AUTHORITY_PATH_REQUIRED/,
      file_hash: /MASTER_AUTHORITY_FILE_HASH_MISMATCH/, unreviewed_assertion: /review_projection_mismatch/ };
    assert.match(output, expected[defect]);
    assert.equal(connections, 0, 'invalid authority must never reach the database socket');
  });
}

test('null base variant may match normalized candidate but live identity must retain null', () => {
  const f = fixture();
  f.manifest.parents[0].variant_key = null;
  f.liveTargets[0].parent_snapshot.variant_key = null;
  reviewFixture(f);
  const bundle = pack(f);
  assertMasterMappingBatchAuthority(f.selected, bundle, f);
  f.liveTargets[0].parent_snapshot.variant_key = '';
  assert.throws(() => assertMasterMappingBatchAuthority(f.selected, bundle, f), /parent_drift/);
});

for (const defect of ['bytes', 'missing_bytes', 'extra_bytes', 'duplicate_ref', 'encoding', 'selection', 'duplicate_scope', 'fingerprint']) {
  test(`envelope rehash cannot authorize ${defect}`, () => {
    const f = fixture(); let bundle = pack(f);
    if (defect === 'bytes') bundle.scopes[0].artifacts[0].base64 = Buffer.from('changed').toString('base64');
    if (defect === 'missing_bytes') bundle.scopes[0].artifacts.pop();
    if (defect === 'extra_bytes') bundle.scopes[0].artifacts.push({ ref: 'extra', base64: 'YQ==' });
    if (defect === 'duplicate_ref') bundle.scopes[0].artifacts.push(bundle.scopes[0].artifacts[0]);
    if (defect === 'encoding') bundle.scopes[0].artifacts[0].base64 += '\n';
    if (defect === 'selection') bundle.candidate_fingerprints = [];
    if (defect === 'duplicate_scope') bundle.scopes.push(bundle.scopes[0]);
    bundle = seal(bundle);
    if (defect === 'fingerprint') bundle.fingerprint = '0'.repeat(64);
    assert.throws(() => assertMasterMappingBatchAuthority(f.selected, bundle, f));
  });
}

for (const defect of ['external_id', 'card_print_id', 'candidate_fingerprint', 'source_ref', 'source_sha256', 'source']) {
  test(`review must bind the exact mapping ${defect}`, () => {
    const f = fixture();
    f.manifest.external_mapping_assertions[0][defect] = 'wrong';
    reviewFixture(f);
    assert.throws(() => pack(f));
  });
}

test('ordinary checklist evidence cannot stand in for exact external mapping evidence', () => {
  const f = fixture();
  f.manifest.authority.source_artifacts.find(row => row.ref === 'mapping-source').kind = 'checked_checklist';
  reviewFixture(f);
  assert.throws(() => pack(f), /mapping_assertion_source_not_authoritative/);
});

test('duplicate assertions and live selection mismatch fail', () => {
  const f = fixture(), bundle = pack(f);
  assert.throws(() => assertMasterMappingBatchAuthority(f.selected, bundle, { liveTargets: [] }), /live_selection_mismatch/);
  f.manifest.external_mapping_assertions.push(f.manifest.external_mapping_assertions[0]);
  reviewFixture(f);
  assert.throws(() => pack(f), /exact_reviewed_mapping_assertion_required/);
});

test('persisted metadata contains the exact Master Index and mapping evidence binding', () => {
  const f = fixture(), proof = assertMasterMappingBatchAuthority(f.selected, pack(f));
  const meta = buildTcgplayerExactMappingMetaV1(f.selected[0], {
    master_authority_fingerprint: proof.fingerprint, master_authority_bindings: proof.bindings,
  });
  assert.equal(meta.master_authority_fingerprint, proof.fingerprint);
  assert.deepEqual(meta.master_authority_binding, proof.bindings[0]);
});

test('writer gates before connection, inside transaction, before commit and verifies provenance readback', () => {
  const source = readFileSync(new URL('../../backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs', import.meta.url), 'utf8');
  const main = source.slice(source.indexOf('async function main()'));
  assert.ok(main.indexOf('assertMasterMappingBatchAuthority(selection.selected, masterAuthority)') < main.indexOf('await client.connect()'));
  assert.ok(main.indexOf('liveTargets: live.targets') < main.indexOf('insert into public.external_mappings'));
  assert.ok(main.indexOf('MASTER_AUTHORITY_CHANGED_BEFORE_COMMIT') < main.indexOf('await commitMappingTransaction(client, transaction)'));
  assert.match(source, /to_jsonb\(card\) as parent_snapshot/);
  assert.match(source, /mapping_master_authority_readback_mismatch/);
});

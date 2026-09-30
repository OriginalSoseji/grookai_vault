import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CATALOG_EVIDENCE_VERSION, CATALOG_SCOPE, classifyCatalogEvidence, readCatalogEvidence } from '../../backend/operations/background_catalog_evidence_v1.mjs';
import { runCatalogWorker, auditCatalog } from '../../scripts/workers/background_catalog_readonly_worker_v1.mjs';
import { collectCatalogReport } from '../../backend/operations/background_catalog_queries_v1.mjs';

const component = 'one-piece-expansion', sha = 'a'.repeat(40), now = new Date('2026-09-30T12:00:00Z');
const report = () => ({ schema_version: CATALOG_EVIDENCE_VERSION, component, scope: CATALOG_SCOPE,
  observed_at: '2026-09-30T11:59:30Z', database_writes: 0, transaction_read_only: true,
  tls_verified: true, catalog_completeness_proven: false, catalog_rows: 100, findings: [],
  metrics: { cards: 100 }, coverage: { unmapped_cards: 5 } });
const receipt = () => ({ schema_version: CATALOG_EVIDENCE_VERSION, component,
  producer_commit_sha: sha, started_at: '2026-09-30T11:59:00Z', completed_at: '2026-09-30T11:59:50Z',
  status: 'completed', preflight: { free_bytes: 20_000_000_000, launch_status: 'healthy', launch_observed_at: '2026-09-30T11:50:00Z' } });
const options = { component, expectedCommit: sha, now, timerState: 'active', serviceResult: 'success' };

test('supervision can pass while reporting coverage gaps without claiming complete catalog', () => {
  assert.equal(classifyCatalogEvidence(receipt(), report(), options).status, 'healthy');
  assert.equal(report().catalog_completeness_proven, false);
});
test('worker failures, runtime mismatch, inactive timer and failed service cannot be hidden', () => {
  for (const patch of [{ status: 'failed' }, { producer_commit_sha: 'b'.repeat(40) }, { component: 'funko-catalog' }]) {
    assert.equal(classifyCatalogEvidence({ ...receipt(), ...patch }, report(), options).status, 'failed');
  }
  for (const patch of [{ timerState: 'inactive' }, { serviceResult: 'exit-code' }]) {
    assert.equal(classifyCatalogEvidence(receipt(), report(), { ...options, ...patch }).status, 'failed');
  }
});
test('running, stale, invalid-time and integrity findings remain visible', () => {
  assert.equal(classifyCatalogEvidence({ ...receipt(), status: 'running' }, null, options).status, 'degraded');
  assert.equal(classifyCatalogEvidence(receipt(), report(), { ...options, now: new Date('2026-10-01T12:00:00Z') }).status, 'stale');
  assert.equal(classifyCatalogEvidence(receipt(), { ...report(), observed_at: '2026-10-01T12:00:00Z' }, options).status, 'failed');
  assert.equal(classifyCatalogEvidence(receipt(), { ...report(), findings: [{ code: 'missing_set', count: 1 }] }, options).status, 'degraded');
});
test('missing read-only, TLS, capacity or launch proof and false completeness claims fail closed', () => {
  for (const patch of [{ database_writes: 1 }, { transaction_read_only: false }, { tls_verified: false },
    { catalog_completeness_proven: true }, { catalog_rows: 0 }, { findings: undefined }]) {
    assert.equal(classifyCatalogEvidence(receipt(), { ...report(), ...patch }, options).status, 'failed');
  }
  for (const preflight of [undefined, { ...receipt().preflight, free_bytes: 1 }, { ...receipt().preflight, launch_status: 'failed' }]) {
    assert.equal(classifyCatalogEvidence({ ...receipt(), preflight }, report(), options).status, 'failed');
  }
});
test('unknown catalogs are rejected before any query', async () => {
  await assert.rejects(collectCatalogReport({ query: () => { throw new Error('must not query'); } }, 'funko-catalog'), /Unsupported/);
});
test('database session is verified read-only and always closed on errors', async () => {
  const statements = []; let closed = false;
  const client = { connection: { stream: { authorized: true } }, connect: async () => {}, end: async () => { closed = true; },
    query: async sql => { statements.push(sql); return { rows: [{ read_only: 'off', session_read_only: 'on' }] }; } };
  await assert.rejects(auditCatalog(client, component), /not read-only/);
  assert.equal(closed, true); assert.match(statements[0], /repeatable read read only/); assert.equal(statements.length, 2);
  closed = false; client.connection.stream.authorized = false;
  await assert.rejects(auditCatalog(client, component), /TLS/); assert.equal(closed, true);
});
test('successful and failed attempts are immutable; changed artifacts and pointers are rejected', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-worker-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'RELEASE_COMMIT_SHA'), sha);
  const oldMode = process.env.CATALOG_AUTOMATION_MODE;
  process.env.CATALOG_AUTOMATION_MODE = 'shadow-only';
  t.after(() => { if (oldMode === undefined) delete process.env.CATALOG_AUTOMATION_MODE; else process.env.CATALOG_AUTOMATION_MODE = oldMode; });
  const preflight = () => ({ free_bytes: 20_000_000_000, launch_status: 'healthy', launch_observed_at: new Date().toISOString() });
  const first = await runCatalogWorker({ component, root: dir, output: dir, preflight,
    execute: async () => ({ ...report(), observed_at: new Date().toISOString() }) });
  const lane = path.join(dir, component), freshOptions = { ...options, now: new Date() };
  assert.equal((await readCatalogEvidence(lane, freshOptions)).status, 'healthy');
  const artifact = path.join(lane, 'runs', first.run_id, 'report.json');
  await fs.appendFile(artifact, ' ');
  await assert.rejects(readCatalogEvidence(lane, freshOptions), /hash mismatch/);
  await assert.rejects(runCatalogWorker({ component, root: dir, output: dir, preflight,
    execute: async () => { throw new Error('secret-value-must-not-persist'); } }), /secret-value/);
  const failed = await fs.readFile(path.join(lane, 'latest.json'), 'utf8');
  assert.doesNotMatch(failed, /secret-value/);
  assert.equal((await readCatalogEvidence(lane, { ...freshOptions, now: new Date() })).status, 'failed');
  const modified = JSON.parse(failed); modified.error_code = 'tampered';
  await fs.writeFile(path.join(lane, 'latest.json'), JSON.stringify(modified));
  await assert.rejects(readCatalogEvidence(lane, freshOptions), /immutable receipt/);
  assert.ok(await fs.stat(path.join(lane, 'runs', first.run_id, 'receipt.json')));
});
test('failed preflight never reaches database execution and is saved', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-preflight-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'RELEASE_COMMIT_SHA'), sha);
  const old = process.env.CATALOG_AUTOMATION_MODE; process.env.CATALOG_AUTOMATION_MODE = 'shadow-only';
  try {
    let called = false;
    await assert.rejects(runCatalogWorker({ component, output: dir, root: dir,
      preflight: () => { throw new Error('low capacity'); }, execute: async () => { called = true; } }), /low capacity/);
    assert.equal(called, false);
    assert.equal(JSON.parse(await fs.readFile(path.join(dir, component, 'latest.json'))).status, 'failed');
  } finally { if (old === undefined) delete process.env.CATALOG_AUTOMATION_MODE; else process.env.CATALOG_AUTOMATION_MODE = old; }
});

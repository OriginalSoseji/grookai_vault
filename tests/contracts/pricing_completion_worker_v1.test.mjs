import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { runPricingCompletionCycleV1 } from '../../backend/pricing/pricing_completion_worker_v1.mjs';
import { openPricingCompletionQueueV1 } from '../../backend/pricing/pricing_completion_queue_v1.mjs';

// This suite executes the candidate CLI only inside the separately isolated test
// environment. The controller must not run it under the credentialed host account.
const CLI = fileURLToPath(new URL('../../scripts/workers/pricing_completion_worker_v1.mjs', import.meta.url));
const SHA = value => createHash('sha256').update(value).digest('hex');
function fixture(t, count = 3) {
  const root = mkdtempSync(join(tmpdir(), 'pricing-worker-contract-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const inputDirectory = join(root, 'input');
  const stateDirectory = join(root, 'state');
  const outputDirectory = join(root, 'output');
  mkdirSync(inputDirectory);
  const now = Date.now();
  const report = {
    policy_version: 'TCGPLAYER_PRICING_BACKLOG_POLICY_V1', status: 'incomplete', findings: [],
    run: { id: 'worker-fixture-run-1', completed_at: new Date(now - 60000).toISOString() },
    counts: { selected: count + 7, eligible: 5, snapshots: 5, published: 5,
      non_published: count + 2, excluded: 2, quarantined: count, delayed: 0, suppressed: 0, primary_reason_rows: count + 2 },
    lanes: [{ lane_id: 'identity_mapping', backlog_count: count }, { lane_id: 'variant_support', backlog_count: 2 }],
    primary_reasons: [
      { primary_reason: 'missing_active_source_mapping', decision: 'quarantine', lane_id: 'identity_mapping', count },
      { primary_reason: 'special_variant_v1_1', decision: 'exclude', lane_id: 'variant_support', count: 2 },
    ],
  };
  const rows = Array.from({ length: count }, (_, i) => ({
    source_observation_id: `obs-${i}`, source_category_id: 3, source_product_id: 214239 + i,
    source_group_id: 42, source_group_name: 'Promos', source_product_name: `Dragonite fixture ${i}`,
    source_subtype_name: 'Holofoil', source_category_name: 'Pokemon',
    primary_gap_reason: 'missing_active_source_mapping', decision: 'quarantine',
    product_scope_result: 'in_scope', agent_key: 'pokemon-tcgplayer-identity-repair-v1',
  }));
  const reportText = JSON.stringify(report) + '\n';
  const rowText = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
  writeFileSync(join(inputDirectory, 'summary.json'), reportText);
  writeFileSync(join(inputDirectory, 'identity_mapping_gaps.jsonl'), rowText);
  const manifest = { schema_version: 'PRICING_COMPLETION_FILES_V1',
    report: { path: 'summary.json', sha256: SHA(reportText) },
    identity_gaps: { path: 'identity_mapping_gaps.jsonl', sha256: SHA(rowText) } };
  const input = join(inputDirectory, 'manifest.json');
  writeFileSync(input, JSON.stringify(manifest));
  return { root, inputDirectory, input, stateDirectory, outputDirectory, now, manifest,
    options: { input, stateDirectory, outputDirectory, now, batchSize: 2 } };
}
function cli(f, args = []) {
  // Never forward NODE_OPTIONS, application settings, or credential variables.
  const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(name => process.env[name])
    .map(name => [name, process.env[name]]));
  // The qualified Linux test root denies executable writable memory. Child
  // processes must retain the same JIT-free bounded-heap convention explicitly.
  return spawnSync(process.execPath, ['--jitless', '--max-old-space-size=768', CLI, ...args], { cwd: f.root, env, encoding: 'utf8', timeout: 20000, windowsHide: true });
}
function cliArgs(f) {
  return ['--prepare-only', `--input=${f.input}`, `--state-dir=${f.stateDirectory}`,
    `--out-dir=${f.outputDirectory}`, '--batch-size=2'];
}
function json(path) { return JSON.parse(readFileSync(path, 'utf8')); }

test('worker processes bounded real-file batches, resumes and never marks preparation complete', t => {
  const f = fixture(t);
  const first = runPricingCompletionCycleV1(f.options);
  assert.equal(first.preparedItems, 2);
  assert.equal(first.queue.total, 3);
  assert.equal(first.queue.counts.review_needed, 2);
  assert.equal(first.queue.counts.pending, 1);
  assert.equal(first.queue.counts.resolved, 0);
  assert.equal(first.queue.unresolved, 3);
  assert.equal(first.completionAllowed, false);
  assert.equal(first.activeProductionExecutors, 0);
  assert.equal(first.productionWrites, 0);
  assert.equal(first.pricePublications, 0);
  assert.equal(first.intakeSummary.sourceReportedUnresolved, 5);
  assert.equal(first.coverage.masterToPrice.status, 'unknown');
  const packetsBefore = readdirSync(f.outputDirectory).filter(name => name.startsWith('packet-'));
  assert.equal(packetsBefore.length, 1);
  const packet = json(join(f.outputDirectory, packetsBefore[0]));
  assert.equal(first.inputDigest,SHA(readFileSync(f.input)));
  assert.equal(packet.inputDigest,first.inputDigest);
  assert.equal(packet.productionAuthority, false);
  assert.equal(packet.requiresFreshReadback, true);
  assert.equal(packet.items.length, 2);
  assert.ok(packet.items.every(item => item.identity.currency === 'XXX' && item.identity.condition === 'UNKNOWN'));
  assert.ok(packet.items.every(item => item.sourceDigest && item.evidence && item.nextAction));
  const firstPacketBytes = readFileSync(join(f.outputDirectory, packetsBefore[0]), 'utf8');
  const second = runPricingCompletionCycleV1({ ...f.options, now: f.now + 60000 });
  assert.equal(second.preparedItems, 1);
  assert.equal(second.queue.counts.review_needed, 3);
  const third = runPricingCompletionCycleV1({ ...f.options, now: f.now + 120000 });
  assert.equal(third.preparedItems, 0);
  assert.equal(third.queue.unresolved, 3);
  assert.equal(third.queue.counts.resolved, 0);
  assert.equal(readdirSync(f.outputDirectory).filter(name => name.startsWith('packet-')).length, 2);
  assert.equal(readFileSync(join(f.outputDirectory, packetsBefore[0]), 'utf8'), firstPacketBytes);
  assert.equal(json(join(f.outputDirectory, 'latest.json')).runId, third.runId);
  const reopened = openPricingCompletionQueueV1({ directory: f.stateDirectory });
  assert.equal(reopened.summary().unresolved, 3);
  assert.ok(reopened.snapshot().items.every(item => item.attempts === 1));
});

test('worker retains stale evidence without implying current pricing or completion', t => {
  const f = fixture(t, 1);
  const result = runPricingCompletionCycleV1({ ...f.options, now: f.now + 2 * 86400000 });
  assert.equal(result.freshness, 'stale');
  assert.equal(result.state, 'blocked_execution_capability');
  assert.equal(result.completionAllowed, false);
  assert.equal(result.queue.unresolved, 1);
});

test('packet publication failure leaves durable claims and restart respects lease backoff', t => {
  const f=fixture(t,2);const originalLink=fs.linkSync;let injected=false;
  fs.linkSync=function(from,to){if(to.startsWith(f.outputDirectory)){injected=true;throw new Error('packet_publish_fault');}return originalLink.call(this,from,to);};
  try{assert.throws(()=>runPricingCompletionCycleV1(f.options),/packet_publish_fault/);}
  finally{fs.linkSync=originalLink;}
  assert.equal(injected,true);
  const queue=openPricingCompletionQueueV1({directory:f.stateDirectory});
  const retained=queue.snapshot();assert.equal(retained.revision,2);
  assert.ok(retained.items.every(item=>item.state==='leased'&&item.history.at(-1).action==='claimed'));
  assert.equal(existsSync(join(f.stateDirectory,'writer.lock')),false);
  assert.equal(existsSync(join(f.outputDirectory,'latest.json')),false);
  const expiresAt=Math.max(...retained.items.map(item=>item.lease.expiresAt));
  const expiry=runPricingCompletionCycleV1({...f.options,now:expiresAt});
  assert.equal(expiry.preparedItems,0);assert.equal(expiry.queue.counts.retry,2);
  const retryAt=Math.max(...queue.snapshot().items.map(item=>item.nextAttemptAt));
  const resumed=runPricingCompletionCycleV1({...f.options,now:retryAt});
  assert.equal(resumed.preparedItems,2);assert.equal(resumed.queue.counts.review_needed,2);
  assert.equal(resumed.queue.counts.resolved,0);
  assert.ok(queue.snapshot().items.every(item=>item.totalAttempts===2));
});

test('malformed manifests and digest mismatch fail before queue or output creation', t => {
  for (const corrupt of [
    f => writeFileSync(f.input, '{invalid'),
    f => writeFileSync(f.input, JSON.stringify({ ...f.manifest, executor: 'untrusted.mjs' })),
    f => writeFileSync(join(f.inputDirectory, 'summary.json'), '{}'),
    f => writeFileSync(f.input, JSON.stringify({ ...f.manifest, report: { ...f.manifest.report, path: '../outside.json' } })),
  ]) {
    const f = fixture(t);
    corrupt(f);
    assert.throws(() => runPricingCompletionCycleV1(f.options));
    assert.equal(existsSync(f.stateDirectory), false);
    assert.equal(existsSync(f.outputDirectory), false);
  }
});

test('overlapping source/state/output directories are rejected before mutation', t => {
  const f = fixture(t);
  const overlaps = [
    { stateDirectory: f.inputDirectory },
    { outputDirectory: f.inputDirectory },
    { stateDirectory: join(f.inputDirectory, 'child-state') },
    { outputDirectory: f.stateDirectory },
    { stateDirectory: f.root },
    { outputDirectory: join(f.stateDirectory, 'child-output') },
  ];
  if (process.platform === 'win32') overlaps.push({ stateDirectory: f.inputDirectory.toUpperCase() });
  const originalFiles = readdirSync(f.inputDirectory);
  for (const overlap of overlaps) assert.throws(() => runPricingCompletionCycleV1({ ...f.options, ...overlap }), /must_be_disjoint/);
  assert.deepEqual(readdirSync(f.inputDirectory), originalFiles);
  assert.equal(existsSync(f.stateDirectory), false);
  assert.equal(existsSync(f.outputDirectory), false);
});

test('CLI requires prepare-only and rejects production/executor flags before creating state', t => {
  const f = fixture(t);
  const absent = cli(f, cliArgs(f).filter(arg => arg !== '--prepare-only'));
  assert.equal(absent.status, 1);
  assert.match(absent.stderr, /prepare-only_required/);
  for (const forbidden of ['--apply', '--publish', '--executor=other.mjs', '--production', '--prepare-only=true']) {
    const result = cli(f, [...cliArgs(f), forbidden]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown_or_duplicate_argument/);
  }
  assert.equal(existsSync(f.stateDirectory), false);
  assert.equal(existsSync(f.outputDirectory), false);
});

test('CLI one-shot publishes preparation status only and reports durable blocked backlog', t => {
  const f = fixture(t);
  const result = cli(f, cliArgs(f));
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  const stdout = JSON.parse(result.stdout.trim());
  assert.equal(stdout.preparedItems, 2);
  assert.equal(stdout.unresolved, 3);
  assert.equal(stdout.state, 'blocked_execution_capability');
  const heartbeat = json(join(f.outputDirectory, 'heartbeat.json'));
  assert.equal(heartbeat.state, 'blocked_execution_capability');
  assert.equal(heartbeat.productionExecutionEnabled, false);
  const latest = json(join(f.outputDirectory, 'latest.json'));
  assert.equal(latest.mode, 'prepare_only');
  assert.equal(latest.pricePublications, 0);
  assert.equal(latest.queue.completionVerifierConfigured, false);
});

test('CLI PAUSE prevents queue ingestion and produces explicit disabled heartbeat', t => {
  const f = fixture(t);
  mkdirSync(f.stateDirectory);
  writeFileSync(join(f.stateDirectory, 'PAUSE'), 'operator hold');
  const result = cli(f, cliArgs(f));
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(existsSync(join(f.stateDirectory, 'queue.json')), false);
  assert.equal(existsSync(join(f.outputDirectory, 'latest.json')), false);
  assert.deepEqual(readdirSync(f.outputDirectory), ['heartbeat.json']);
  const heartbeat = json(join(f.outputDirectory, 'heartbeat.json'));
  assert.equal(heartbeat.state, 'paused');
  assert.equal(heartbeat.productionExecutionEnabled, false);
  assert.equal(readFileSync(join(f.stateDirectory, 'PAUSE'), 'utf8'), 'operator hold');
});

test('CLI failure persists failure heartbeat and exits without queue ingestion', t => {
  const f = fixture(t);
  writeFileSync(join(f.inputDirectory, 'summary.json'), '{}');
  const result = cli(f, cliArgs(f));
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  const heartbeat = json(join(f.outputDirectory, 'heartbeat.json'));
  assert.equal(heartbeat.state, 'failed');
  assert.equal(heartbeat.productionExecutionEnabled, false);
  assert.match(heartbeat.error, /input_digest_mismatch/);
  assert.equal(existsSync(join(f.stateDirectory, 'queue.json')), false);
});

test('CLI PAUSE cannot bypass input/output isolation validation', t => {
  const f = fixture(t);
  mkdirSync(f.stateDirectory);
  writeFileSync(join(f.stateDirectory, 'PAUSE'), 'operator hold');
  const result = cli(f, cliArgs(f).map(arg => arg.startsWith('--out-dir=') ? `--out-dir=${f.inputDirectory}` : arg));
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must_be_disjoint/);
  assert.equal(existsSync(join(f.inputDirectory, 'heartbeat.json')), false);
  assert.equal(existsSync(join(f.stateDirectory, 'queue.json')), false);
});

test('CLI rejects a string-valued watch flag instead of entering an unintended background loop', t => {
  const f = fixture(t);
  const result = cli(f, [...cliArgs(f), '--watch=false']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /watch_requires_boolean_flag/);
  assert.equal(existsSync(f.stateDirectory), false);
  assert.equal(existsSync(f.outputDirectory), false);
});

test('typed snapshot worker includes both exact source and Master printing gaps', t => {
  const f = fixture(t);
  const observedAt = new Date(f.now - 60000).toISOString();
  const sourceRunId = 'typed-fixture-run-1';
  const snapshot = {
    schemaVersion: 'pricing-completion-input-v1', sourceRunId, observedAt,
    observations: [
      { identity: { kind: 'source', provider: 'tcgplayer', category: '3', productId: '214239',
        subtype: 'Holofoil', currency: 'USD', condition: 'NM' },
      reason: 'missing_active_source_mapping', sourceRunId, scope: 'source/group/42', evidence: { observationId: 'source-1' } },
      { identity: { kind: 'source', provider: 'tcgplayer', category: '1', productId: '214239',
        subtype: 'Holofoil', currency: 'USD', condition: 'NM' },
      reason: 'missing_active_source_mapping', sourceRunId, scope: 'source/group/42', evidence: { observationId: 'source-2' } },
      { identity: { kind: 'master', printingId: 'exact-master-printing-1', currency: 'USD', condition: 'NM' },
        reason: 'missing_published_price', sourceRunId, scope: 'master/set/swshp', evidence: { masterEvidenceDigest: 'a'.repeat(64) } },
    ],
    coverage: {
      sourceToMaster: { status: 'complete', sourceRunId, observedAt, expectedUnresolved: 2, evidenceRef: 'source-enumeration-fixture',
        lanes: Object.fromEntries(['identity_mapping', 'catalog_evidence', 'exact_printing', 'source_price', 'finish_assignment', 'variant_support']
          .map(lane => [lane, { status: 'complete', expectedUnresolved: lane === 'identity_mapping' ? 2 : 0 }])) },
      masterToPrice: { status: 'complete', sourceRunId, observedAt, expectedUnresolved: 1, evidenceRef: 'master-enumeration-fixture' },
    },
  };
  const bytes = JSON.stringify(snapshot);
  writeFileSync(join(f.inputDirectory, 'snapshot.json'), bytes);
  writeFileSync(f.input, JSON.stringify({ schema_version: 'PRICING_COMPLETION_SNAPSHOT_FILES_V1',
    snapshot: { path: 'snapshot.json', sha256: SHA(bytes) } }));
  const result = runPricingCompletionCycleV1({ ...f.options, batchSize: 3 });
  assert.equal(result.preparedItems, 3);
  assert.equal(result.queue.unresolved, 3);
  // Category remains a hard packet boundary even when producer scope/owner/reason
  // are identical. Pokemon and Magic must never share a repair packet.
  assert.equal(result.packets.length, 3);
  const packets = readdirSync(f.outputDirectory).filter(name => name.startsWith('packet-')).map(name => json(join(f.outputDirectory, name)));
  const sourcePackets = packets.filter(packet => packet.direction === 'source');
  assert.deepEqual(new Set(sourcePackets.map(packet => packet.category)), new Set(['1', '3']));
  assert.ok(sourcePackets.every(packet => packet.items.length === 1));
  assert.equal(result.coverage.sourceToMaster.status, 'complete');
  assert.equal(result.coverage.masterToPrice.status, 'complete');
  assert.equal(result.intakeSummary.status, 'incomplete');
  assert.equal(result.intakeSummary.unknownIdentityDimensions, 0);
  assert.equal(result.completionAllowed, false);
  const items = openPricingCompletionQueueV1({ directory: f.stateDirectory }).snapshot().items;
  assert.deepEqual(new Set(items.map(item => item.identity.kind)), new Set(['master', 'source']));
  assert.ok(items.every(item => item.state === 'review_needed'));
  assert.equal(result.inputDigest,SHA(readFileSync(f.input)));
  assert.ok(packets.every(packet=>packet.inputDigest===result.inputDigest));
  assert.equal(items.find(item=>item.identity.printingId==='exact-master-printing-1').evidence.masterEvidenceDigest,'a'.repeat(64));
  assert.equal(result.intakeSummary.importedUnresolved,3);
});

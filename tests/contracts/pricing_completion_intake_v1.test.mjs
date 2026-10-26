import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  importPricingBacklogV1,
  normalizePricingCompletionSnapshotV1,
  pricingCompletionIntakeKeyV1,
  PRICING_COMPLETION_INPUT_V1,
  PRICING_COMPLETION_LANES_V1,
} from '../../backend/pricing/pricing_completion_intake_v1.mjs';

const OBSERVED = '2026-10-13T12:00:00.000Z';
const NOW = Date.parse('2026-10-13T13:00:00.000Z');
const sha = (value) => createHash('sha256').update(value).digest('hex');

function gap(overrides = {}) {
  return {
    source_observation_id: 'obs-1', source_category_id: 3, source_product_id: 123,
    source_group_id: 42, source_group_name: 'Promos', source_product_name: 'Dragonite',
    source_subtype_name: 'Holofoil', source_category_name: 'Pokemon',
    primary_gap_reason: 'missing_active_source_mapping', decision: 'quarantine',
    product_scope_result: 'in_scope', agent_key: 'pokemon-tcgplayer-identity-repair-v1',
    ...overrides,
  };
}
function report(n = 1) {
  return {
    policy_version: 'TCGPLAYER_PRICING_BACKLOG_POLICY_V1', status: 'incomplete', findings: [],
    run: { id: 'run-1', completed_at: OBSERVED },
    counts: { selected: n + 7, eligible: 5, snapshots: 5, published: 5, non_published: n + 2, excluded: 2, quarantined: n, delayed: 0, suppressed: 0, primary_reason_rows: n + 2 },
    lanes: [{ lane_id: 'identity_mapping', backlog_count: n }, { lane_id: 'variant_support', backlog_count: 2 }],
    primary_reasons: [
      { primary_reason: 'missing_active_source_mapping', decision: 'quarantine', lane_id: 'identity_mapping', count: n },
      { primary_reason: 'special_variant_v1_1', decision: 'exclude', lane_id: 'variant_support', count: 2 },
    ],
  };
}
function encoded(r = report(), rows = [gap()]) {
  const reportText = `${JSON.stringify(r)}\n`;
  const identityGapsText = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  return { reportText, identityGapsText, artifactHashes: { 'summary.json': sha(reportText), 'identity_mapping_gaps.jsonl': sha(identityGapsText) } };
}
function observation(identity, reason = 'missing_active_source_mapping') {
  return { identity, reason, sourceRunId: 'run-1', scope: 'test/group', evidence: { sourceObservationId: 'obs-1' } };
}
const sourceIdentity = { kind: 'source', provider: 'tcgplayer', category: '3', productId: '123', subtype: 'First Edition Holofoil', currency: 'USD', condition: 'NM' };
function typed(observations = []) {
  const sourceRows = observations.filter((row) => row.identity.kind === 'source');
  const masterRows = observations.filter((row) => row.identity.kind === 'master');
  return {
    schemaVersion: PRICING_COMPLETION_INPUT_V1, sourceRunId: 'run-1', observedAt: OBSERVED, observations,
    coverage: {
      sourceToMaster: { status: 'complete', sourceRunId: 'run-1', observedAt: OBSERVED, expectedUnresolved: sourceRows.length, evidenceRef: 'fixture-source', lanes: Object.fromEntries(PRICING_COMPLETION_LANES_V1.map((lane) => [lane, { status: 'complete', expectedUnresolved: lane === 'identity_mapping' ? sourceRows.length : 0 }])) },
      masterToPrice: { status: 'complete', sourceRunId: 'run-1', observedAt: OBSERVED, expectedUnresolved: masterRows.length, evidenceRef: 'fixture-master' },
    },
  };
}

test('market quote scope requires explicit basis without asserting physical condition', () => {
  const row = observation({...sourceIdentity,condition:'NOT_CONDITION_SPECIFIC'});
  assert.throws(() => normalizePricingCompletionSnapshotV1(typed([row]),{now:NOW}),/market quote scope/);
  row.evidence.priceBasis = 'TCGPLAYER_MARKET';
  row.evidence.physicalConditionVerified = false;
  const normalized = normalizePricingCompletionSnapshotV1(typed([row]),{now:NOW});
  assert.equal(normalized.observations[0].evidence.identityDimensionsVerified,true);
  assert.equal(normalized.observations[0].evidence.physicalConditionVerified,false);
  row.evidence.physicalConditionVerified = true;
  assert.throws(() => normalizePricingCompletionSnapshotV1(typed([row]),{now:NOW}),/market quote scope/);
});

test('legacy intake preserves partial coverage and never invents ownership or price dimensions', () => {
  const result = importPricingBacklogV1(encoded(), { now: NOW });
  assert.equal(result.summary.complete, false);
  assert.equal(result.summary.status, 'partial');
  assert.equal(result.summary.sourceReportedUnresolved, 3);
  assert.equal(result.summary.masterReportedUnresolved, null);
  assert.equal(result.summary.unknownIdentityDimensions, 1);
  assert.equal(result.coverage.sourceToMaster.lanes.variant_support.status, 'unknown');
  assert.equal(result.coverage.sourceToMaster.lanes.variant_support.expectedUnresolved, 2);
  assert.equal(result.coverage.masterToPrice.status, 'unknown');
  const [row] = result.observations;
  assert.equal(row.identity.currency, 'XXX');
  assert.equal(row.identity.condition, 'UNKNOWN');
  assert.equal(row.evidence.priorityMetadata.owned, null);
  assert.equal(row.priority, 0);
  assert.match(row.nextAction, /Enrich missing currency\/condition/);
  assert.equal(row.evidence.identityDimensionsVerified, false);
  assert.equal(row.owner, 'pokemon-tcgplayer-identity-repair-v1');
});

test('historical snapshot is retained as stale and cannot establish completion', () => {
  const result = importPricingBacklogV1(encoded(), { now: NOW + 2 * 86400000 });
  assert.equal(result.freshness, 'stale');
  assert.equal(result.summary.status, 'stale');
  assert.equal(result.summary.complete, false);
});

test('digest binding rejects mixing a new summary with an old gap export', () => {
  const input = encoded();
  input.identityGapsText = input.identityGapsText.replace('obs-1', 'obs-2');
  assert.throws(() => importPricingBacklogV1(input, { now: NOW }), /digest mismatch/);
});

test('malformed counts and partitions are rejected rather than coerced', () => {
  for (const value of [-1, 1.5, '8', null]) {
    const r = report(); r.counts.selected = value;
    assert.throws(() => importPricingBacklogV1(encoded(r), { now: NOW }), /safe integer/);
  }
  const r = report(); r.counts.selected++;
  assert.throws(() => importPricingBacklogV1(encoded(r), { now: NOW }), /reconcile/);
  const r2 = report(); r2.primary_reasons[0].count++;
  assert.throws(() => importPricingBacklogV1(encoded(r2), { now: NOW }), /partition backlog/);
});

test('unknown primary reason blocks intake instead of silently resolving or dropping rows', () => {
  const r = report(); r.primary_reasons[0].primary_reason = 'new_reason';
  assert.throws(() => importPricingBacklogV1(encoded(r), { now: NOW }), /unknown primary reason/);
  assert.throws(() => importPricingBacklogV1(encoded(report(), [gap({ primary_gap_reason: 'new_reason' })]), { now: NOW }), /unknown primary reason/);
});

test('edition-bound authority holds route to review without authorizing or merging editions', () => {
  const reason = 'edition_bound_pricing_authority_required';
  const first = observation(sourceIdentity, reason);
  const unlimited = observation({...sourceIdentity,subtype:'Unlimited Holofoil'}, reason);
  const input = typed([first, unlimited]);
  input.coverage.sourceToMaster.lanes.identity_mapping.expectedUnresolved = 0;
  input.coverage.sourceToMaster.lanes.variant_support.expectedUnresolved = 2;
  const result = normalizePricingCompletionSnapshotV1(input, {now:NOW});
  assert.equal(result.observations.length, 2);
  assert.equal(result.summary.importedUnresolved, 2);
  assert.equal(result.summary.complete, false);
  assert.equal(result.summary.actualProductionRepairs, 0);
  assert.equal(result.coverage.sourceToMaster.lanes.variant_support.importedUnresolved, 2);
  assert.equal(new Set(result.observations.map(row => pricingCompletionIntakeKeyV1(row.identity))).size, 2);
  for (const row of result.observations) {
    assert.equal(row.reason, reason);
    assert.equal(row.owner, 'tcgplayer-edition-authority-review-v1');
    assert.match(row.nextAction, /without inferring bindings or publishing prices/);
    assert.equal(row.evidence.sourceObservationId, 'obs-1');
    assert.equal(Object.hasOwn(row.evidence, 'editionAssignmentId'), false);
    assert.equal(Object.hasOwn(row.evidence, 'verifiedPrice'), false);
  }
  first.reason = 'edition_bound_pricing_authority_optional';
  assert.throws(() => normalizePricingCompletionSnapshotV1(input, {now:NOW}), /unknown primary reason/);
});

test('duplicate source identities reject even when observation IDs differ', () => {
  const input = encoded(report(2), [gap(), gap({ source_observation_id: 'obs-2' })]);
  assert.throws(() => importPricingBacklogV1(input, { now: NOW }), /duplicate stable identity/);
});

test('identity remains stable through new runs and observation IDs but evidence version changes', () => {
  const first = importPricingBacklogV1(encoded(), { now: NOW });
  const nextReport = report(); nextReport.run.id = 'run-2';
  const second = importPricingBacklogV1(encoded(nextReport, [gap({ source_observation_id: 'obs-2' })]), { now: NOW });
  assert.equal(pricingCompletionIntakeKeyV1(first.observations[0].identity), pricingCompletionIntakeKeyV1(second.observations[0].identity));
  assert.notEqual(first.observations[0].versionDigest, second.observations[0].versionDigest);
  assert.notEqual(first.contentDigest, second.contentDigest);
});

test('source editions/finishes and master exact printing IDs are distinct', () => {
  const unlimited = { ...sourceIdentity, subtype: 'Unlimited Holofoil' };
  assert.notEqual(pricingCompletionIntakeKeyV1(sourceIdentity), pricingCompletionIntakeKeyV1(unlimited));
  const master1 = { kind: 'master', printingId: 'exact-first-edition-printing', currency: 'USD', condition: 'NM' };
  const master2 = { ...master1, printingId: 'exact-unlimited-printing' };
  const input = typed([observation(sourceIdentity), observation(unlimited), observation(master1, 'missing_published_price'), observation(master2, 'missing_published_price')]);
  const result = normalizePricingCompletionSnapshotV1(input, { now: NOW });
  assert.equal(result.observations.length, 4);
  assert.equal(result.summary.status, 'incomplete');
  assert.equal(new Set(result.observations.map((row) => pricingCompletionIntakeKeyV1(row.identity))).size, 4);
});

test('entire unsupported population stays unresolved and counted', () => {
  const result = importPricingBacklogV1(encoded(report(), [gap({ product_scope_result: 'unsupported_product_kind' })]), { now: NOW });
  assert.equal(result.summary.unsupportedUnresolved, 1);
  assert.equal(result.summary.importedUnresolved, 1);
  assert.equal(result.summary.actualProductionRepairs, 0);
  assert.equal(result.summary.complete, false);
});

test('unsupported product kind routes to explicit product-scope review', () => {
  const row = observation(sourceIdentity, 'unsupported_product_kind');
  row.evidence.productScopeResult = 'unsupported_product_kind';
  row.evidence.priceBasis = 'TCGPLAYER_MARKET';
  row.evidence.physicalConditionVerified = false;
  const input = typed([row]);
  input.coverage.sourceToMaster.lanes.identity_mapping.expectedUnresolved = 0;
  input.coverage.sourceToMaster.lanes.variant_support.expectedUnresolved = 1;
  const result = normalizePricingCompletionSnapshotV1(input, { now: NOW });
  assert.equal(result.observations[0].owner, 'tcgplayer-product-scope-review-v1');
  assert.match(result.observations[0].nextAction, /outside card-price publication/);
  assert.equal(result.summary.unsupportedUnresolved, 1);
  assert.equal(result.summary.complete, false);
});

test('zero source gaps cannot hide unknown Master Index coverage', () => {
  const input = typed(); input.coverage.masterToPrice = { status: 'unknown' };
  const result = normalizePricingCompletionSnapshotV1(input, { now: NOW });
  assert.equal(result.summary.complete, false);
  assert.equal(result.summary.masterReportedUnresolved, null);
});

test('only fresh exhaustive two-direction zero-gap snapshots can report complete', () => {
  assert.equal(normalizePricingCompletionSnapshotV1(typed(), { now: NOW }).summary.complete, true);
  const stale = typed(); stale.coverage.masterToPrice.observedAt = '2026-10-10T12:00:00.000Z';
  assert.equal(normalizePricingCompletionSnapshotV1(stale, { now: NOW }).summary.complete, false);
  const partial = typed(); partial.coverage.sourceToMaster.status = 'partial';
  assert.equal(normalizePricingCompletionSnapshotV1(partial, { now: NOW }).summary.complete, false);
});

test('complete claims require every lane and a reconciled unresolved enumeration', () => {
  const input = typed(); delete input.coverage.sourceToMaster.lanes.finish_assignment;
  assert.throws(() => normalizePricingCompletionSnapshotV1(input, { now: NOW }), /missing a lane/);
  const input2 = typed(); input2.coverage.masterToPrice.expectedUnresolved = 1;
  assert.throws(() => normalizePricingCompletionSnapshotV1(input2, { now: NOW }), /count mismatch/);
});

test('owned and retailer priority require evidence and do not derive from card name', () => {
  const row = observation(sourceIdentity);
  row.priorityMetadata = { owned: true, retailer: 'GameStop', evidenceRef: 'fixture-owned-retailer-record' };
  assert.equal(normalizePricingCompletionSnapshotV1(typed([row]), { now: NOW }).observations[0].priority, 100);
  delete row.priorityMetadata.evidenceRef;
  assert.throws(() => normalizePricingCompletionSnapshotV1(typed([row]), { now: NOW }), /priority evidenceRef/);
});

test('legacy dimensions require evidence bound to source run and input digest', () => {
  const input = encoded();
  input.dimensionEvidence = { currency: 'USD', condition: 'NM', sourceRunId: 'run-1', identityGapsDigest: input.artifactHashes['identity_mapping_gaps.jsonl'], evidenceRef: 'fixture-raw-source-dimensions' };
  const result = importPricingBacklogV1(input, { now: NOW });
  assert.equal(result.observations[0].evidence.identityDimensionsVerified, true);
  input.dimensionEvidence.sourceRunId = 'other-run';
  assert.throws(() => importPricingBacklogV1(input, { now: NOW }), /dimension evidence source run mismatch/);
});

test('future time, missing run and reason/direction disagreement fail closed', () => {
  assert.throws(() => normalizePricingCompletionSnapshotV1(typed(), { now: NOW - 7200000 }), /future/);
  const badRun = typed([observation(sourceIdentity)]); badRun.observations[0].sourceRunId = 'other';
  assert.throws(() => normalizePricingCompletionSnapshotV1(badRun, { now: NOW }), /source run/);
  const badDirection = typed([observation(sourceIdentity, 'missing_published_price')]);
  assert.throws(() => normalizePricingCompletionSnapshotV1(badDirection, { now: NOW }), /identity direction/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildDiscoveryReportV1,
  classifySourceGroupV1,
  normalizeSetNameV1,
  reconcileSourceGroupV1
} from '../../scripts/workers/pokemon_new_set_discovery_monitor_v1.mjs';

const NOW = new Date('2026-08-24T04:00:00.000Z');
const SOURCE_RUN = {
  id: 'source-run-1',
  run_key: 'TCGCSV-2026-08-23',
  status: 'completed',
  failed_count: 0,
  finished_at: '2026-08-23T08:40:00.000Z'
};

test('normalization removes expansion prefixes without losing the set name', () => {
  assert.equal(normalizeSetNameV1('ME06: Delta Reign'), 'delta reign');
  assert.equal(normalizeSetNameV1('Pokemon TCG: Delta Reign'), 'delta reign');
});

test('explicit source group ID is the strongest canonical evidence', () => {
  const result = reconcileSourceGroupV1({ group_id: 24688, name: 'ME05: Pitch Black' }, [
    { id: 'set-1', code: 'me05', name: 'Mega Evolution: Pitch Black', tcgcsv_group_id: '24688' }
  ]);
  assert.equal(result.status, 'canonical_exact');
  assert.equal(result.authority, 'source_group_id');
});

test('duplicate names require release-date disambiguation', () => {
  const result = reconcileSourceGroupV1({ group_id: 1, name: 'ME02: Phantasmal Flames', published_on: '2025-11-14' }, [
    { id: 'set-a', code: 'me02', name: 'Phantasmal Flames', release_date: null },
    { id: 'set-b', code: 'me2', name: 'Phantasmal Flames', release_date: '2025-11-14' }
  ]);
  assert.equal(result.status, 'canonical_exact');
  assert.deepEqual(result.canonical_set_ids, ['set-b']);
});

test('abbreviation alone never creates a canonical match', () => {
  const result = reconcileSourceGroupV1({ group_id: 2, name: 'Unknown Release', abbreviation: 'PR' }, [
    { id: 'set-a', code: 'PR', name: 'Alternate Art Promos' }
  ]);
  assert.equal(result.status, 'unmatched');
});

test('new unmatched expansion is review-required while ancillary rows stay backlog', () => {
  const expansion = classifySourceGroupV1(
    { group_id: 24831, category_id: 3, name: 'ME06: Delta Reign', source_active: true },
    { status: 'unmatched', canonical_set_ids: [], canonical_set_codes: [] },
    { seen_group_fingerprints: {} }
  );
  const promo = classifySourceGroupV1(
    { group_id: 2332, category_id: 3, name: 'Professor Program Promos', source_active: true },
    { status: 'unmatched', canonical_set_ids: [], canonical_set_codes: [] },
    { seen_group_fingerprints: {} }
  );
  assert.equal(expansion.discovery_lane, 'review_required');
  assert.equal(promo.discovery_lane, 'candidate_backlog');
});

test('fresh terminal source evidence produces a reconciled report', () => {
  const report = buildDiscoveryReportV1({
    groups: [{ group_id: 24831, category_id: 3, name: 'ME06: Delta Reign', source_active: true }],
    canonicalSets: [],
    sourceRun: SOURCE_RUN,
    previousState: { seen_group_fingerprints: {} },
    now: NOW
  });
  assert.equal(report.status, 'succeeded');
  assert.equal(report.counts.review_required, 1);
  assert.equal(report.findings.length, 0);
});

test('stale or partial source evidence fails closed', () => {
  const stale = buildDiscoveryReportV1({ groups: [], canonicalSets: [], sourceRun: SOURCE_RUN, now: new Date('2026-08-26T04:00:00.000Z') });
  const partial = buildDiscoveryReportV1({ groups: [], canonicalSets: [], sourceRun: { ...SOURCE_RUN, status: 'partial_success' }, now: NOW });
  assert.equal(stale.status, 'failed');
  assert.ok(stale.findings.includes('source_sync_stale'));
  assert.equal(partial.status, 'failed');
});

test('runtime and service preserve read-only, alerting, and canonical boundaries', () => {
  const worker = fs.readFileSync('scripts/workers/pokemon_new_set_discovery_monitor_v1.mjs', 'utf8');
  const service = fs.readFileSync('deploy/systemd/grookai-pokemon-new-set-discovery.service', 'utf8');
  assert.match(worker, /begin read only/i);
  assert.doesNotMatch(worker, /\b(insert|update|delete|truncate)\s+(?:into\s+|from\s+)?public\./i);
  assert.match(service, /OnFailure=grookai-operations-webhook@%n\.service/);
  assert.match(service, /ProtectSystem=strict/);
  assert.match(service, /\/opt\/grookai_pricing_current/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSourceExhaustionRows,
  buildTargetedSourceQueue,
} from '../../scripts/audits/japanese_master_index_v4/coverage_gap_report_v1.mjs';

function coverage(overrides = {}) {
  return {
    registry_key: 'jpn-test',
    targeted_followup_required: true,
    targeted_followup_reasons: ['candidate_conflicts'],
    fresh_assertion_count: 3,
    novel_index_candidate_count: 1,
    source_isolated_candidate_count: 0,
    unresolved_assertion_count: 0,
    conflict_count: 1,
    ...overrides,
  };
}

function workItem(overrides = {}) {
  return {
    work_item_key: 'targeted:jpn-test:bulbapedia',
    lane_id: 'bulbapedia_jp_card_lists',
    registry_key: 'jpn-test',
    disposition: 'targeted_after_primary_delta',
    source_container_id: 'Test set',
    source_container_url: 'https://example.invalid/test',
    source_native_name: 'Test set',
    source_expected_card_count: 100,
    ...overrides,
  };
}

test('targeted queue admits only measured targeted-after-delta work', () => {
  const rows = buildTargetedSourceQueue({
    workItems: [
      workItem(),
      workItem({
        work_item_key: 'scheduled:jpn-test:primary',
        disposition: 'scheduled',
      }),
      workItem({
        work_item_key: 'targeted:jpn-clean:bulbapedia',
        registry_key: 'jpn-clean',
      }),
    ],
    coverageRows: [
      coverage(),
      coverage({
        registry_key: 'jpn-clean',
        targeted_followup_required: false,
        targeted_followup_reasons: [],
        conflict_count: 0,
      }),
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].targeted_work_item_key, 'targeted:jpn-test:bulbapedia');
  assert.equal(rows[0].priority, 'high');
});

test('targeted queue severity is evidence-derived and deterministic', () => {
  const rows = buildTargetedSourceQueue({
    workItems: [
      workItem({
        work_item_key: 'targeted:jpn-high',
        registry_key: 'jpn-high',
      }),
      workItem({
        work_item_key: 'targeted:jpn-medium',
        registry_key: 'jpn-medium',
      }),
      workItem({
        work_item_key: 'targeted:jpn-corroboration',
        registry_key: 'jpn-corroboration',
      }),
    ],
    coverageRows: [
      coverage({ registry_key: 'jpn-high' }),
      coverage({
        registry_key: 'jpn-medium',
        fresh_assertion_count: 0,
        conflict_count: 0,
      }),
      coverage({
        registry_key: 'jpn-corroboration',
        conflict_count: 0,
      }),
    ],
  });

  assert.deepEqual(
    rows.map((row) => [row.registry_key, row.priority]),
    [
      ['jpn-high', 'high'],
      ['jpn-medium', 'medium'],
      ['jpn-corroboration', 'corroboration'],
    ],
  );
});

test('targeted queue defers announced releases beyond the as-of date', () => {
  const workItems = [
    workItem({
      registry_key: 'jpn-current',
      source_release_date: 'July 1, 2026',
    }),
    workItem({
      work_item_key: 'targeted:jpn-future',
      registry_key: 'jpn-future',
      source_release_date: 'September 16, 2026',
    }),
  ];
  const coverageRows = [
    coverage({ registry_key: 'jpn-current' }),
    coverage({ registry_key: 'jpn-future' }),
  ];
  const current = buildTargetedSourceQueue({
    workItems,
    coverageRows,
    generatedAt: '2026-07-26T00:00:00.000Z',
  });
  const deferred = buildTargetedSourceQueue({
    workItems,
    coverageRows,
    generatedAt: '2026-07-26T00:00:00.000Z',
    futureOnly: true,
  });

  assert.deepEqual(
    current.map((row) => row.registry_key),
    ['jpn-current'],
  );
  assert.deepEqual(
    deferred.map((row) => row.registry_key),
    ['jpn-future'],
  );
});

test('source exhaustion distinguishes findings, incomplete, and manual lanes', () => {
  const rows = buildSourceExhaustionRows({
    acquisitionPlan: {
      content: {
        source_inventory: [
          {
            lane_id: 'primary-with-findings',
            automatic_status: 'scheduled',
            disposition_counts: { scheduled: 2 },
          },
          {
            lane_id: 'primary-incomplete',
            automatic_status: 'scheduled',
            disposition_counts: { scheduled: 2 },
          },
          {
            lane_id: 'manual-only',
            automatic_status: 'blocked_without_written_permission',
            disposition_counts: { preserved_manual_only: 1 },
          },
        ],
      },
    },
    unionManifest: {
      content: {
        source_statuses: [
          {
            lane_id: 'primary-with-findings',
            complete: true,
            assertion_count: 20,
            harvested_container_count: 2,
          },
          {
            lane_id: 'primary-incomplete',
            complete: false,
            assertion_count: 10,
            harvested_container_count: 1,
          },
        ],
      },
    },
    healthByLane: new Map([
      ['primary-with-findings', {
        summary: {
          container_status_counts: {
            complete: 1,
            fetch_failed: 1,
          },
        },
      }],
    ]),
  });

  assert.deepEqual(
    Object.fromEntries(rows.map((row) => [
      row.lane_id,
      row.exhaustion_status,
    ])),
    {
      'manual-only': 'preserved_manual_only',
      'primary-incomplete': 'primary_harvest_incomplete',
      'primary-with-findings':
        'primary_exhausted_with_explicit_findings',
    },
  );
});

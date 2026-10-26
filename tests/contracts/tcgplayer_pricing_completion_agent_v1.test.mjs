import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildTcgplayerPricingCompletionAgentV1,
  buildTcgplayerIdentityProductQueueV1,
  buildPokemonPricingMappingReviewWorkItemV1,
  selectPokemonPricingMappingReviewBatchV1,
  summarizeTcgplayerPricingCompletionRunV1,
  TCGPLAYER_PRICING_COMPLETION_AGENT_KEY,
} from '../../backend/operations/tcgplayer_pricing_completion_agent_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function report() {
  return {
    status: 'incomplete',
    run: {
      id: 'e3d1a366-d6b4-40b1-8565-07588d191b5d',
      run_key: 'production-run',
      source_sync_run_id: '44617b3d-77b6-4ddf-89a2-50726183564c',
    },
    counts: { selected: 208305, published: 165497, non_published: 42808 },
    identity_mapping_worklist: {
      status: 'ready',
      counts: { backlog_rows: 31401, source_products: 15733, source_groups: 518 },
      categories: [
        {
          source_category_id: 1, source_category_name: 'Magic',
          agent_key: 'mtg-tcgplayer-identity-repair-v1',
          backlog_rows: 30200, source_products: 14999, source_groups: 400,
        },
        {
          source_category_id: 3, source_category_name: 'Pokemon',
          agent_key: 'pokemon-tcgplayer-identity-repair-v1',
          backlog_rows: 1201, source_products: 734, source_groups: 118,
        },
      ],
      top_groups: [{
        source_category_id: 1,
        source_category_name: 'Magic',
        source_group_id: 2576,
        source_group_name: 'Secret Lair Drop Series',
        backlog_rows: 1982,
        source_products: 1811,
      }],
      pokemon_top_groups: [{
        source_category_id: 3,
        source_category_name: 'Pokemon',
        source_group_id: 2782,
        source_group_name: "McDonald's 25th Anniversary Promos",
        backlog_rows: 50,
        source_products: 25,
      }],
    },
  };
}

function productQueue() {
  return buildTcgplayerIdentityProductQueueV1([
    {
      primary_gap_reason: 'missing_active_source_mapping',
      source_observation_id: 'observation-2', source_product_id: 99,
      source_product_name: 'Lightning Bolt', source_category_id: 1,
      source_category_name: 'Magic', source_group_id: 2576,
      source_group_name: 'Secret Lair Drop Series', source_subtype_name: 'Foil',
      product_scope_result: 'in_scope', agent_key: 'mtg-tcgplayer-identity-repair-v1',
    },
    {
      primary_gap_reason: 'missing_active_source_mapping',
      source_observation_id: 'observation-1', source_product_id: 99,
      source_product_name: 'Lightning Bolt', source_category_id: 1,
      source_category_name: 'Magic', source_group_id: 2576,
      source_group_name: 'Secret Lair Drop Series', source_subtype_name: 'Normal',
      product_scope_result: 'in_scope', agent_key: 'mtg-tcgplayer-identity-repair-v1',
    },
  ]);
}

function exactPlan() {
  return {
    status: 'passed',
    counts: { candidates: 25, projected_gap_rows: 50, blocked: 709 },
    candidates: [{
      source_product_id: 232318,
      source_group_id: 2782,
      source_group_name: "McDonald's 25th Anniversary Promos",
      supporting_gap_row_count: 2,
    }],
  };
}

test('pricing completion agent is a scheduled registered operations agent', () => {
  const agent = buildTcgplayerPricingCompletionAgentV1();
  assert.equal(agent.agent_key, TCGPLAYER_PRICING_COMPLETION_AGENT_KEY);
  assert.equal(agent.domain, 'pricing');
  assert.equal(agent.schedule_kind, 'cron');
  assert.equal(agent.schedule_expression, '*/15 * * * *');
  assert.equal(agent.heartbeat_interval_seconds, 900);
  assert.equal(agent.stale_after_seconds, 3600);
  assert.equal(agent.execution_platform, 'github_actions');
  assert.match(agent.source_locator, /tcgplayer-pricing-completion-agent\.yml$/);
});

test('agent heartbeat summarizes backlog and preserves the next exact group', () => {
  const summary = summarizeTcgplayerPricingCompletionRunV1(report(), {
    exactPlan: exactPlan(), identityProductQueue: productQueue(),
  });
  assert.equal(summary.completion_status, 'incomplete');
  assert.equal(summary.non_published_count, 42808);
  assert.equal(summary.identity_mapping_backlog_count, 31401);
  assert.equal(summary.next_group.source_group_id, 2782);
  assert.equal(summary.next_group.source_products, 1);
  assert.equal(summary.verified_mapping_candidates, 25);
  assert.equal(summary.verified_projected_gap_rows, 50);
  assert.equal(summary.identity_repair_lanes.mtg.queued_products, 1);
  assert.equal(summary.identity_repair_lanes.mtg.source_products, 14999);
  assert.equal(summary.completion_reached, false);
  assert.equal(summary.canonical_writes, false);
  assert.equal(summary.publication_writes, false);
});

test('agent refuses invalid or unreconciled backlog evidence', () => {
  assert.throws(
    () => summarizeTcgplayerPricingCompletionRunV1({ ...report(), status: 'invalid' }),
    /report is invalid/,
  );
  assert.throws(
    () => summarizeTcgplayerPricingCompletionRunV1({
      ...report(),
      identity_mapping_worklist: { ...report().identity_mapping_worklist, status: 'invalid' },
    }),
    /worklist is invalid/,
  );
});

test('agent reports the largest cross-category group without granting mapping authority', () => {
  const input = report();
  input.identity_mapping_worklist.top_groups = [{
    source_category_id: 1,
    source_category_name: 'Magic',
    source_group_id: 2576,
    source_group_name: 'Secret Lair Drop Series',
    backlog_rows: 1982,
    source_products: 1811,
  }];
  const summary = summarizeTcgplayerPricingCompletionRunV1(input, { exactPlan: exactPlan() });
  assert.equal(summary.next_group.source_group_id, 2782);
  assert.equal(summary.largest_unreviewed_group.source_group_id, 2576);
});

test('agent holds unreviewed groups when no verified mapping candidate exists', () => {
  const emptyPlan = {
    status: 'passed',
    counts: { candidates: 0, projected_gap_rows: 0, blocked: 734 },
    candidates: [],
  };
  const summary = summarizeTcgplayerPricingCompletionRunV1(report(), {
    exactPlan: emptyPlan, identityProductQueue: productQueue(),
  });
  assert.equal(summary.next_group, null);
  assert.equal(summary.largest_unreviewed_group.source_group_id, 2576);
  assert.equal(summary.next_action, 'advance_mtg_identity_repair_queue');
});

test('product queue deduplicates observations while preserving subtype evidence', () => {
  const queue = productQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].source_product_id, 99);
  assert.deepEqual(queue[0].source_subtypes, ['Foil', 'Normal']);
  assert.deepEqual(queue[0].supporting_gap_observation_ids, ['observation-1', 'observation-2']);
  assert.equal(queue[0].supporting_gap_row_count, 2);
  assert.equal(queue[0].mapping_authority, false);
});

test('product queue excludes variant and unsupported product lanes', () => {
  const queue = buildTcgplayerIdentityProductQueueV1([{
    source_product_id: 100, source_category_id: 3,
    product_scope_result: 'special_variant_v1_1',
  }, {
    source_product_id: 101, source_category_id: 1,
    product_scope_result: 'unsupported_product_kind',
  }]);
  assert.deepEqual(queue, []);
});

test('Pokemon review leads become one bounded review-only founder item', () => {
  const item = buildPokemonPricingMappingReviewWorkItemV1({
    candidates: [{
      source_product_id: 90353,
      source_product_name: 'Victory Cup - BW31 (1st Place)',
      source_group_id: 1407,
      source_group_name: 'Black and White Promos',
      printed_number: 'BW31',
      source_subtypes: ['Holofoil'],
      supporting_gap_observation_ids: ['4998c2d8-461d-43d7-83e2-799d4547bde0'],
      review_targets: [{
        card_print_id: '644215b9-ff1a-480f-9ed6-8548a47c92da',
        gv_id: 'GV-PK-PR-BLW-BW31',
        set_id: '61bceb95-9799-4349-963f-d9e6f8a3c69b',
        set_code: 'bwp',
        set_name: 'BW Black Star Promos',
        canonical_name: 'Victory Cup',
        canonical_number: 'BW31',
        variant_key: '',
        candidate_score: 91,
        candidate_evidence: { number_exact: true, name_exact: false },
      }],
    }],
    sourcePricingRunId: '0ddded9d-3bdc-4ea0-8f15-40fdce61b647',
    sourceSyncRunId: '7ca0463c-98e1-430c-9a28-aa94b23de778',
    sourceCompletedAt: '2026-10-25T11:49:45.943Z',
    sourceCommitSha: 'a'.repeat(40),
    sourceRunUri: 'https://github.com/example/repo/actions/runs/1',
    expiresAt: '2026-11-01T11:49:45.943Z',
  });
  assert.equal(item.work_item_key, 'pokemon-pricing-mapping-review:7ca0463c-98e1-430c-9a28-aa94b23de778');
  assert.equal(item.scope.candidate_count, 1);
  assert.equal(item.command_policy.execution_enabled, false);
  assert.equal(item.plan_payload.review_candidates[0].review_targets.length, 1);
  assert.equal(item.plan_payload.review_boundary.mapping_writes, false);
  assert.match(item.plan_fingerprint, /^[a-f0-9]{64}$/);
});

test('Pokemon review item rejects ambiguous multi-target and oversized batches', () => {
  const base = {
    source_product_id: 1,
    review_targets: [{ card_print_id: 'one' }],
  };
  const args = {
    sourcePricingRunId: 'run', sourceSyncRunId: 'sync', sourceCompletedAt: '2026-10-25T11:49:45.943Z',
  };
  assert.throws(() => buildPokemonPricingMappingReviewWorkItemV1({
    ...args,
    candidates: [{ ...base, review_targets: [{ card_print_id: 'one' }, { card_print_id: 'two' }] }],
  }), /one proposed target/);
  assert.throws(() => buildPokemonPricingMappingReviewWorkItemV1({
    ...args,
    candidates: Array.from({ length: 51 }, (_, index) => ({
      ...base, source_product_id: index + 1,
    })),
  }), /exceeds 50/);
});

test('Pokemon review selection holds ambiguity and collisions without failing measurement', () => {
  const candidate = (product, parent, targetCount = 1) => ({
    source_product_id: product,
    review_targets: Array.from({ length: targetCount }, (_, index) => ({
      card_print_id: index === 0 ? parent : `${parent}-${index}`,
      gv_id: `GV-${parent}-${index}`,
      set_id: 'set-id',
      set_code: 'set-code',
      canonical_name: `Card ${product}`,
      canonical_number: String(product),
    })),
  });
  const rows = [
    candidate(4, 'parent-4', 2),
    candidate(3, 'parent-1'),
    candidate(2, 'parent-2'),
    candidate(1, 'parent-1'),
    candidate(2, 'parent-other'),
    candidate(5, 'parent-5'),
  ];
  const result = selectPokemonPricingMappingReviewBatchV1(rows, 2);
  assert.deepEqual(result.selected.map((row) => row.source_product_id), [1, 2]);
  assert.equal(result.selected_count, 2);
  assert.equal(result.held_count, 4);
  assert.deepEqual(result.held_by_reason, {
    batch_limit: 1,
    duplicate_source_product: 1,
    duplicate_target_parent: 1,
    not_single_target: 1,
  });
});

test('scheduled workflow measures production without treating backlog as a crash', () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, '.github/workflows/tcgplayer-pricing-completion-agent.yml'),
    'utf8',
  );
  assert.match(workflow, /cron: "\*\/15 \* \* \* \*"/);
  assert.match(workflow, /tcgplayer_pricing_completion_agent_v1\.mjs/);
  assert.match(workflow, /PGOPTIONS: "-c default_transaction_read_only=on"/);
  assert.doesNotMatch(workflow, /--require-complete/);
  assert.doesNotMatch(workflow, /--apply|publication_production/);
  const worker = fs.readFileSync(
    path.join(ROOT, 'scripts/workers/tcgplayer_pricing_completion_agent_v1.mjs'),
    'utf8',
  );
  assert.match(worker, /mtg_identity_product_queue\.jsonl/);
  assert.match(worker, /pokemon_identity_product_queue\.jsonl/);
  assert.match(worker, /sha256: sha256\(mtgIdentityQueueJsonl\)/);
  assert.match(worker, /ollama_identity_candidate_queue\.jsonl/);
  assert.match(worker, /--candidate-only/);
  assert.match(worker, /mtg_ollama_identity_candidate_queue\.jsonl/);
  assert.match(worker, /pokemon_ollama_identity_candidate_queue\.jsonl/);
  assert.match(worker, /operations_publish_work_item_v1/);
  assert.match(worker, /buildPokemonPricingMappingReviewWorkItemV1/);
});

test('local V2 consumer uses hosted candidate evidence without database secrets', () => {
  const runner = fs.readFileSync(
    path.join(ROOT, 'scripts/ops/run_continuous_pricing_triage_v2.ps1'),
    'utf8',
  );
  assert.match(runner, /ollama_identity_candidate_queue\.jsonl/);
  assert.match(runner, /GrookaiOllamaPricingTriageV2/);
  assert.doesNotMatch(runner, /\.env\.local|SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL/);
  assert.doesNotMatch(runner, /candidate_enrichment/);
  assert.match(runner, /if \(\$hasMutex\) \{[\s\S]*ollama\.exe stop[\s\S]*ReleaseMutex\(\)/);
});

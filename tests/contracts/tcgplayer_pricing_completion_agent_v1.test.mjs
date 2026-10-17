import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildTcgplayerPricingCompletionAgentV1,
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
  const summary = summarizeTcgplayerPricingCompletionRunV1(report(), { exactPlan: exactPlan() });
  assert.equal(summary.completion_status, 'incomplete');
  assert.equal(summary.non_published_count, 42808);
  assert.equal(summary.identity_mapping_backlog_count, 31401);
  assert.equal(summary.next_group.source_group_id, 2782);
  assert.equal(summary.next_group.source_products, 1);
  assert.equal(summary.verified_mapping_candidates, 25);
  assert.equal(summary.verified_projected_gap_rows, 50);
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

test('agent does not route a non-Pokemon top group', () => {
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
});

test('agent holds unreviewed groups when no verified mapping candidate exists', () => {
  const emptyPlan = {
    status: 'passed',
    counts: { candidates: 0, projected_gap_rows: 0, blocked: 734 },
    candidates: [],
  };
  const summary = summarizeTcgplayerPricingCompletionRunV1(report(), { exactPlan: emptyPlan });
  assert.equal(summary.next_group, null);
  assert.equal(summary.largest_unreviewed_group.source_group_id, 2782);
  assert.equal(summary.next_action, 'expand_reviewed_pokemon_set_authority');
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
});

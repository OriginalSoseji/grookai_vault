import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const INPUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'post_reconcile_integrity_v1',
  'post_reconcile_duplicate_parent_readiness_v1.json',
);
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconcile_integrity_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'post_reconcile_dependency_transfer_strategy_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'post_reconcile_dependency_transfer_strategy_v1.md');

const TABLE_POLICIES = {
  'public.card_print_identity.card_print_id': {
    policy: 'delete_duplicate_identity_after_canonical_identity_guard',
    bucket: 'core_identity',
    dry_run_candidate: true,
  },
  'public.card_print_species.card_print_id': {
    policy: 'copy_to_canonical_then_delete_duplicate_with_conflict_guard',
    bucket: 'species_traits',
    dry_run_candidate: true,
  },
  'public.card_print_traits.card_print_id': {
    policy: 'copy_to_canonical_then_delete_duplicate_with_conflict_guard',
    bucket: 'species_traits',
    dry_run_candidate: true,
  },
  'public.card_printings.card_print_id': {
    policy: 'dedupe_same_finish_or_transfer_missing_finish_with_printing_gv_rewrite',
    bucket: 'child_printings',
    dry_run_candidate: true,
  },
  'public.external_mappings.card_print_id': {
    policy: 'transfer_to_canonical_or_drop_duplicate_source_external_id_collision',
    bucket: 'source_mappings',
    dry_run_candidate: true,
  },
  'public.external_discovery_candidates.card_print_id': {
    policy: 'transfer_to_canonical_preserving_source_payload',
    bucket: 'source_mappings',
    dry_run_candidate: true,
  },
  'public.card_embeddings.card_print_id': {
    policy: 'delete_duplicate_embedding_after_canonical_embedding_guard_or_recompute_later',
    bucket: 'derived_search_index',
    dry_run_candidate: true,
  },
  'public.card_fingerprint_index.card_print_id': {
    policy: 'transfer_or_delete_duplicate_index_row_after_canonical_guard',
    bucket: 'derived_search_index',
    dry_run_candidate: true,
  },
  'public.scanner_fingerprint_index.card_print_id': {
    policy: 'transfer_to_canonical_unless_unique_conflict_then_delete_duplicate_index_row',
    bucket: 'derived_search_index',
    dry_run_candidate: true,
  },
  'public.justtcg_variants.card_print_id': {
    policy: 'transfer_to_canonical_with_variant_identity_collision_guard',
    bucket: 'market_data',
    dry_run_candidate: true,
  },
  'public.justtcg_variant_prices_latest.card_print_id': {
    policy: 'transfer_to_canonical_after_variant_owner_transfer',
    bucket: 'market_data',
    dry_run_candidate: true,
  },
  'public.justtcg_variant_price_snapshots.card_print_id': {
    policy: 'bulk_transfer_to_canonical_after_variant_owner_transfer',
    bucket: 'market_data',
    dry_run_candidate: true,
  },
  'public.card_print_price_curves.card_print_id': {
    policy: 'transfer_to_canonical_or recompute_after_apply_if_collision',
    bucket: 'market_data',
    dry_run_candidate: true,
  },
  'public.ebay_active_prices_latest.card_print_id': {
    policy: 'transfer_to_canonical_or_drop_duplicate_latest_if_canonical_exists',
    bucket: 'market_data',
    dry_run_candidate: true,
  },
  'public.ebay_active_price_snapshots.card_print_id': {
    policy: 'transfer_to_canonical_preserving_snapshots',
    bucket: 'market_data',
    dry_run_candidate: true,
  },
  'public.pricing_jobs.card_print_id': {
    policy: 'transfer_to_canonical_preserving_job_history',
    bucket: 'market_data',
    dry_run_candidate: true,
  },
  'public.pricing_watch.card_print_id': {
    policy: 'transfer_to_canonical_or_dedupe_same_owner_watch',
    bucket: 'user_sensitive',
    dry_run_candidate: true,
  },
  'public.vault_item_instances.card_print_id': {
    policy: 'transfer_to_canonical_preserving_user_instance',
    bucket: 'user_sensitive',
    dry_run_candidate: true,
  },
  'public.vault_items.card_id': {
    policy: 'transfer_to_canonical_preserving_user_item',
    bucket: 'user_sensitive',
    dry_run_candidate: true,
  },
  'public.card_feed_events.card_print_id': {
    policy: 'preserve_append_only_feed_history_or_repoint_if_allowed_by_feed_governance',
    bucket: 'append_only_user_history',
    dry_run_candidate: false,
  },
  'public.card_interactions.card_print_id': {
    policy: 'transfer_to_canonical_preserving_interaction_history',
    bucket: 'user_sensitive',
    dry_run_candidate: true,
  },
  'public.card_interaction_outcomes.card_print_id': {
    policy: 'transfer_to_canonical_preserving_outcome_history',
    bucket: 'user_sensitive',
    dry_run_candidate: true,
  },
  'public.card_signals.card_print_id': {
    policy: 'transfer_to_canonical_preserving_signal_history',
    bucket: 'user_sensitive',
    dry_run_candidate: true,
  },
  'public.slab_certs.card_print_id': {
    policy: 'transfer_to_canonical_preserving_cert',
    bucket: 'user_sensitive',
    dry_run_candidate: true,
  },
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function summarize(groups) {
  const bySet = new Map();
  const byDependency = new Map();
  const byBucket = new Map();
  for (const group of groups) {
    const set = bySet.get(group.set_code) ?? {
      set_code: group.set_code,
      groups: 0,
      duplicate_child_rows: 0,
      dry_run_candidate_groups: 0,
      append_only_blocked_groups: 0,
    };
    set.groups += 1;
    set.duplicate_child_rows += group.duplicate_child_rows.length;
    if (group.strategy_status === 'ready_for_transfer_dry_run') set.dry_run_candidate_groups += 1;
    if (group.strategy_status === 'blocked_append_only_policy') set.append_only_blocked_groups += 1;
    bySet.set(group.set_code, set);

    for (const dependency of group.dependency_plan) {
      const dep = byDependency.get(dependency.key) ?? {
        key: dependency.key,
        bucket: dependency.bucket,
        policy: dependency.policy,
        groups: 0,
        rows: 0,
      };
      dep.groups += 1;
      dep.rows += dependency.count;
      byDependency.set(dependency.key, dep);

      const bucket = byBucket.get(dependency.bucket) ?? { bucket: dependency.bucket, groups: new Set(), rows: 0 };
      bucket.groups.add(group.normalized_key);
      bucket.rows += dependency.count;
      byBucket.set(dependency.bucket, bucket);
    }
  }
  return {
    by_set: [...bySet.values()].sort((a, b) => b.groups - a.groups || a.set_code.localeCompare(b.set_code)),
    by_dependency: [...byDependency.values()].sort((a, b) => b.rows - a.rows || a.key.localeCompare(b.key)),
    by_bucket: [...byBucket.values()]
      .map((bucket) => ({ bucket: bucket.bucket, groups: bucket.groups.size, rows: bucket.rows }))
      .sort((a, b) => b.rows - a.rows || a.bucket.localeCompare(b.bucket)),
  };
}

function buildMarkdown(report) {
  const setLines = report.by_set.map((row) =>
    `| ${row.set_code} | ${row.groups} | ${row.dry_run_candidate_groups} | ${row.append_only_blocked_groups} | ${row.duplicate_child_rows} |`,
  ).join('\n');
  const bucketLines = report.by_bucket.map((row) =>
    `| ${row.bucket} | ${row.groups} | ${row.rows} |`,
  ).join('\n');
  const dependencyLines = report.by_dependency.map((row) =>
    `| ${row.key} | ${row.bucket} | ${row.rows} | ${row.policy} |`,
  ).join('\n');
  const blockedLines = report.blocked_groups.slice(0, 40).map((group) =>
    `| ${group.set_code} | ${group.normalized_key} | ${group.blocking_reasons.join('; ')} |`,
  ).join('\n');

  return `# Post Reconcile Dependency Transfer Strategy V1

Read-only strategy for the remaining duplicate-parent groups after POST-REC-01.

## Safety

- db_writes_performed: ${report.safety.db_writes_performed}
- migrations_created: ${report.safety.migrations_created}
- cleanup_performed: ${report.safety.cleanup_performed}
- quarantine_performed: ${report.safety.quarantine_performed}

## Summary

- source_duplicate_groups: ${report.summary.source_duplicate_groups}
- strategy_groups: ${report.summary.strategy_groups}
- ready_for_transfer_dry_run: ${report.summary.ready_for_transfer_dry_run}
- blocked_append_only_policy: ${report.summary.blocked_append_only_policy}
- unknown_dependency_policy_groups: ${report.summary.unknown_dependency_policy_groups}
- duplicate_child_rows: ${report.summary.duplicate_child_rows}

## Set Breakdown

| Set | Groups | Transfer dry-run candidates | Append-only blocked | Duplicate child rows |
| --- | ---: | ---: | ---: | ---: |
${setLines || '| none | 0 | 0 | 0 | 0 |'}

## Dependency Buckets

| Bucket | Groups | Rows |
| --- | ---: | ---: |
${bucketLines || '| none | 0 | 0 |'}

## Dependency Policies

| Dependency | Bucket | Rows | Policy |
| --- | --- | ---: | --- |
${dependencyLines || '| none | - | 0 | - |'}

## Blocked Groups

| Set | Group | Reason |
| --- | --- | --- |
${blockedLines || '| none | - | - |'}

## Recommended Buckets

1. POST-REC-02A: transfer-ready duplicate cleanup excluding append-only feed rows.
2. POST-REC-02B: append-only feed governance decision for the remaining feed-linked SVP rows.
3. POST-REC-02C: rerun integrity gates and promote the duplicate-parent uniqueness gate into preflight.
`;
}

async function main() {
  const readiness = await readJson(INPUT_JSON);
  const groups = (readiness.blocked_groups ?? []).map((group) => {
    const dependencyPlan = group.duplicate_parent_dependencies.map((dependency) => {
      const policy = TABLE_POLICIES[dependency.key] ?? {
        policy: 'unknown_dependency_policy_manual_review_required',
        bucket: 'unknown',
        dry_run_candidate: false,
      };
      return {
        ...dependency,
        policy: policy.policy,
        bucket: policy.bucket,
        dry_run_candidate: policy.dry_run_candidate,
      };
    });
    const unknown = dependencyPlan.filter((dependency) => dependency.bucket === 'unknown');
    const appendOnly = dependencyPlan.filter((dependency) => dependency.bucket === 'append_only_user_history');
    const strategyStatus = unknown.length > 0
      ? 'blocked_unknown_dependency_policy'
      : appendOnly.length > 0
        ? 'blocked_append_only_policy'
        : 'ready_for_transfer_dry_run';
    const blockingReasons = [
      ...(unknown.length > 0 ? ['unknown_dependency_policy'] : []),
      ...(appendOnly.length > 0 ? ['append_only_feed_policy_required'] : []),
    ];
    return {
      normalized_key: group.normalized_key,
      set_code: group.set_code,
      canonical_parent_id: group.canonical_parent_id,
      canonical_gv_id: group.canonical_gv_id,
      duplicate_parent_id: group.duplicate_parent_id,
      duplicate_gv_id: group.duplicate_gv_id,
      duplicate_child_rows: group.duplicate_child_rows,
      dependency_plan: dependencyPlan,
      strategy_status: strategyStatus,
      blocking_reasons: blockingReasons,
    };
  });

  const conn = connectionString();
  const schema_check = { connected: false, unknown_tables: [] };
  if (conn) {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      schema_check.connected = true;
      for (const key of Object.keys(TABLE_POLICIES)) {
        const [, table] = key.split('.');
        const { rows } = await client.query(
          `select to_regclass($1) is not null as exists`,
          [`public.${table}`],
        );
        if (!rows[0]?.exists) schema_check.unknown_tables.push(table);
      }
    } finally {
      await client.end().catch(() => {});
    }
  }

  const readyGroups = groups.filter((group) => group.strategy_status === 'ready_for_transfer_dry_run');
  const blockedGroups = groups.filter((group) => group.strategy_status !== 'ready_for_transfer_dry_run');
  const summaryTables = summarize(groups);
  const report = {
    generated_at: new Date().toISOString(),
    source_readiness: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    summary: {
      source_duplicate_groups: readiness.summary?.source_duplicate_groups ?? null,
      strategy_groups: groups.length,
      ready_for_transfer_dry_run: readyGroups.length,
      blocked_append_only_policy: groups.filter((group) => group.strategy_status === 'blocked_append_only_policy').length,
      unknown_dependency_policy_groups: groups.filter((group) => group.strategy_status === 'blocked_unknown_dependency_policy').length,
      duplicate_child_rows: groups.reduce((sum, group) => sum + group.duplicate_child_rows.length, 0),
    },
    schema_check,
    ...summaryTables,
    ready_groups: readyGroups,
    blocked_groups: blockedGroups,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    summary: report.summary,
    by_set: report.by_set,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

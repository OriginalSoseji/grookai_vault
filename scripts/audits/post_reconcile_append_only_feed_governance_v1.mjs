import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconcile_integrity_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'post_reconcile_dependency_transfer_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'post_reconcile_append_only_feed_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'post_reconcile_append_only_feed_governance_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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

async function queryFeedGovernance(client, duplicateIds) {
  const triggerResult = await client.query(`
      select tgname, tgenabled, pg_get_triggerdef(oid) as definition
      from pg_trigger
      where tgrelid = 'public.card_feed_events'::regclass
        and not tgisinternal
      order by tgname
    `);
  const functionResult = await client.query(`
      select pg_get_functiondef('public.card_feed_events_block_mutation_v1()'::regprocedure) as definition
    `);
  const feedResult = await client.query(`
      select id, card_print_id, event_type, surface, source_bucket, feed_request_id, position, created_at
      from public.card_feed_events
      where card_print_id = any($1::uuid[])
      order by card_print_id, created_at, id
    `, [duplicateIds]);
  return {
    triggers: triggerResult.rows,
    block_function_contains_append_only_error: /card_feed_events is append-only/.test(
      functionResult.rows[0]?.definition ?? '',
    ),
    feed_events: feedResult.rows,
  };
}

function buildGroups(source) {
  return (source.blocked_groups ?? [])
    .filter((group) => group.strategy_status === 'blocked_append_only_policy')
    .map((group) => ({
      normalized_key: group.normalized_key,
      set_code: group.set_code,
      canonical_parent_id: group.canonical_parent_id,
      canonical_gv_id: group.canonical_gv_id,
      duplicate_parent_id: group.duplicate_parent_id,
      duplicate_gv_id: group.duplicate_gv_id,
      duplicate_child_rows: group.duplicate_child_rows,
      dependency_plan: group.dependency_plan,
      blocking_reasons: group.blocking_reasons,
    }));
}

function summarize(groups, feedEvents) {
  return {
    blocked_groups: groups.length,
    duplicate_parent_rows: groups.length,
    duplicate_child_rows: groups.reduce((sum, group) => sum + group.duplicate_child_rows.length, 0),
    feed_event_rows: feedEvents.length,
    target_sets: [...new Set(groups.map((group) => group.set_code))].sort(),
  };
}

function buildMarkdown(report) {
  const groupLines = report.groups.map((group) => {
    const feedCount = report.feed_events.filter((event) => event.card_print_id === group.duplicate_parent_id).length;
    return `| ${group.set_code} | ${group.normalized_key} | ${group.canonical_gv_id} | ${group.duplicate_gv_id} | ${group.duplicate_child_rows.length} | ${feedCount} |`;
  }).join('\n');

  const triggerLines = report.feed_governance.triggers.map((trigger) =>
    `| ${trigger.tgname} | ${trigger.tgenabled} | \`${trigger.definition.replaceAll('|', '\\|')}\` |`,
  ).join('\n');

  return `# POST-REC-03 Append-Only Feed Governance V1

Audit-only governance report for the final post-reconciliation duplicate parent groups.

## Safety

- db_writes_performed: ${report.safety.db_writes_performed}
- migrations_created: ${report.safety.migrations_created}
- cleanup_performed: ${report.safety.cleanup_performed}
- quarantine_performed: ${report.safety.quarantine_performed}
- apply_sql_generated: ${report.safety.apply_sql_generated}

## Summary

- blocked_groups: ${report.summary.blocked_groups}
- duplicate_parent_rows: ${report.summary.duplicate_parent_rows}
- duplicate_child_rows: ${report.summary.duplicate_child_rows}
- feed_event_rows: ${report.summary.feed_event_rows}
- target_sets: ${report.summary.target_sets.join(', ')}
- governance_fingerprint: \`${report.governance_fingerprint_sha256}\`

## Remaining Groups

| Set | Group | Canonical GV ID | Duplicate GV ID | Duplicate child rows | Feed rows |
| --- | --- | --- | --- | ---: | ---: |
${groupLines || '| none | - | - | - | 0 | 0 |'}

## Feed Mutation Guard

| Trigger | Enabled | Definition |
| --- | --- | --- |
${triggerLines || '| none | - | - |'}

The feed mutation blocker raises the append-only error: ${report.feed_governance.block_function_contains_append_only_error}.

## Governance Decision

These rows are not ready for an apply package under the current contract. The duplicate parent rows are tied to append-only user-history events. Generic dependency transfer would require updating or deleting rows in \`card_feed_events\`, which the database intentionally blocks.

Recommended choices:

1. Keep as governed exceptions and teach the post-reconcile uniqueness gate to report them separately from actionable duplicate defects.
2. Add a future feed-correction event model that preserves the original event and records canonical remap intent without mutating old feed rows.
3. Add a founder-approved maintenance-only migration that explicitly allows canonical feed remap, then dry-run and apply a tiny follow-up cleanup package.

Do not silently delete the duplicate parents while the feed rows exist. The foreign key is \`ON DELETE CASCADE\`, and that would conflict with the append-only history contract.
`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const groups = buildGroups(source);
  const duplicateIds = groups.map((group) => group.duplicate_parent_id);
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let feedGovernance;
  try {
    feedGovernance = await queryFeedGovernance(client, duplicateIds);
  } finally {
    await client.end().catch(() => {});
  }

  const report = {
    generated_at: new Date().toISOString(),
    source_strategy: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_sql_generated: false,
    },
    summary: summarize(groups, feedGovernance.feed_events),
    governance_status: 'blocked_by_append_only_feed_contract',
    recommended_next_step: 'Create a governed exception gate or design a feed-correction event model before any cleanup apply.',
    groups,
    feed_events: feedGovernance.feed_events,
    feed_governance: {
      triggers: feedGovernance.triggers,
      block_function_contains_append_only_error: feedGovernance.block_function_contains_append_only_error,
    },
  };
  report.governance_fingerprint_sha256 = sha256(stableJson({
    governance_status: report.governance_status,
    groups: report.groups,
    feed_events: report.feed_events,
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    summary: report.summary,
    governance_status: report.governance_status,
    governance_fingerprint_sha256: report.governance_fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

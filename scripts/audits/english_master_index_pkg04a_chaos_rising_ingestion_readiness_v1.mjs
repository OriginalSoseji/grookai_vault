import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHAOS_DIR = path.join(DEFAULT_OUTPUT_DIR, 'chaos_rising');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'english_master_index_pkg04a_chaos_rising_ingestion_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'english_master_index_pkg04a_chaos_rising_ingestion_readiness_v1.md');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(filePath, data) {
  await fs.writeFile(filePath, data);
}

function buildReport({ chaosPackage, readiness }) {
  const summary = chaosPackage.summary ?? {};
  const blockers = chaosPackage.blockers ?? [];
  const setSourceProbe = {
    command: 'node backend\\sets\\tcgdex_import_sets_worker.mjs --set me04 --dry-run',
    command_scoped_tls_retry_used: true,
    command_scoped_tls_retry_reason: 'Local Windows certificate chain failed with UNABLE_TO_VERIFY_LEAF_SIGNATURE.',
    observed_fetched_sets: 1,
    observed_would_upsert_sets: 1,
    observed_created: 0,
    observed_updated: 0,
    observed_skipped_missing_id: 0,
    db_writes_performed: false,
    note: 'Do not make NODE_TLS_REJECT_UNAUTHORIZED=0 a default. Use only as a temporary local operator workaround if certificate trust is not fixed.',
  };
  const cardSourceProbe = {
    command: 'node backend\\pokemon\\tcgdex_import_cards_worker.mjs --set me04 --detail --dry-run',
    command_scoped_tls_retry_used: true,
    command_scoped_tls_retry_reason: 'Local Windows certificate chain failed with UNABLE_TO_VERIFY_LEAF_SIGNATURE.',
    observed_fetched_cards: 122,
    observed_would_upsert_cards: 122,
    observed_created: 0,
    observed_updated: 0,
    observed_skipped_missing_id: 0,
    db_writes_performed: false,
    note: 'Do not make NODE_TLS_REJECT_UNAUTHORIZED=0 a default. Use only as a temporary local operator workaround if certificate trust is not fixed.',
  };

  const expectedComplete = (
    summary.master_index_cards === 122
    && summary.master_index_printings === 247
    && summary.live_set_rows === 1
    && summary.live_card_print_rows === 122
    && summary.live_card_printing_rows === 247
  );
  const expectedPreIngestion = (
    summary.master_index_cards === 122
    && summary.master_index_printings === 247
    && setSourceProbe.observed_fetched_sets === 1
    && cardSourceProbe.observed_fetched_cards === 122
    && summary.live_set_rows === 0
    && summary.live_card_print_rows === 0
    && summary.live_card_printing_rows === 0
  );

  const reportStatus = expectedComplete
    ? 'pkg04a_chaos_rising_completed_live_matches_master_index_no_write'
    : (
        expectedPreIngestion
          ? 'pkg04a_chaos_rising_ingestion_readiness_ready_for_operator_raw_import_decision_no_write'
          : 'pkg04a_chaos_rising_ingestion_readiness_blocked_review_required_no_write'
      );

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg04a_chaos_rising_ingestion_readiness_v1',
    package_id: 'PKG-04A-CHAOS-RISING-INGESTION-READINESS',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    report_status: reportStatus,
    write_ready_now: 0,
    package_scope: {
      set_key: 'me04',
      set_name: 'Chaos Rising',
      source_aliases: ['me04', 'me4'],
      master_index_cards: summary.master_index_cards,
      master_index_printings: summary.master_index_printings,
      master_index_printings_by_finish: summary.master_index_printings_by_finish,
      live_set_rows: summary.live_set_rows,
      live_card_print_rows: summary.live_card_print_rows,
      live_card_printing_rows: summary.live_card_printing_rows,
      tcgdex_raw_import_rows: summary.tcgdex_raw_import_rows,
      chaos_rising_missing_printings: expectedComplete
        ? 0
        : (readiness.summary?.chaos_rising_missing_printings ?? null),
    },
    source_probes: {
      set: setSourceProbe,
      cards: cardSourceProbe,
    },
    current_blockers: blockers,
    required_operator_sequence: [
      {
        step: 'raw_set_import',
        command: 'node backend\\sets\\tcgdex_import_sets_worker.mjs --set me04',
        write_scope: 'raw_imports set row for me04 only',
        safety_requirement: 'Operator approval required. Confirm dry-run fetched=1 and wouldUpsert=1 immediately before real import.',
        durable_write: true,
        canonical_write: false,
      },
      {
        step: 'raw_card_import',
        command: 'node backend\\pokemon\\tcgdex_import_cards_worker.mjs --set me04 --detail',
        write_scope: 'raw_imports card rows for me04 only',
        safety_requirement: 'Operator approval required. Confirm dry-run fetched=122 and wouldUpsert=122 immediately before real import.',
        durable_write: true,
        canonical_write: false,
      },
      {
        step: 'scoped_normalize_dry_run',
        command: 'node backend\\pokemon\\tcgdex_normalize_worker.mjs --set me04 --dry-run',
        write_scope: 'none',
        safety_requirement: 'Must show 122 parent card_print insert simulations and no unrelated set/card processing.',
        durable_write: false,
        canonical_write: false,
      },
      {
        step: 'scoped_normalize_apply',
        command: 'node backend\\pokemon\\tcgdex_normalize_worker.mjs --set me04',
        write_scope: 'sets/card_prints/card_printings/external_mappings/traits for me04 only',
        safety_requirement: 'Requires explicit approval after dry-run artifact, rollback plan, and post-apply verification gates.',
        durable_write: true,
        canonical_write: true,
      },
      {
        step: 'post_apply_master_index_verification',
        command: 'node scripts\\audits\\english_master_index_chaos_rising_completion_package_v1.mjs',
        write_scope: 'none',
        safety_requirement: 'Must reach 122 live parents, 247 live child printings, 247/247 verified_by_index, and 0 unsupported/name mismatch.',
        durable_write: false,
        canonical_write: false,
      },
    ],
    safety_gaps_closed_this_step: [
      {
        gap: 'tcgdex_normalize_worker_unscoped_pending_processing',
        closure: 'Added --set filtering for pending set and card raw_import rows.',
        default_behavior_changed: false,
      },
      {
        gap: 'tcgdex_import_sets_worker_broad_only_execution',
        closure: 'Added --set support so Chaos Rising raw set import can be bounded to me04.',
        default_behavior_changed: false,
      },
    ],
    stop_rules: [
      'Do not run scoped_normalize_apply until raw imports exist and scoped_normalize_dry_run passes.',
      'Do not run broad normalization for Chaos Rising.',
      'Do not use direct SQL inserts for Chaos Rising unless standard ingestion is proven unusable and a separate approval exists.',
      'Do not make insecure TLS behavior the default.',
      'Do not create migrations for this package.',
    ],
  };
}

function buildMarkdown(report) {
  const scopeRows = Object.entries(report.package_scope).map(([key, value]) => [
    key,
    typeof value === 'object' ? JSON.stringify(value) : value,
  ]);
  const sequenceRows = report.required_operator_sequence.map((step) => [
    step.step,
    step.command,
    step.write_scope,
    step.durable_write,
    step.canonical_write,
    step.safety_requirement,
  ]);
  const blockers = report.current_blockers.map((row) => [
    row.blocker,
    row.severity,
    row.required_resolution,
  ]);
  return `# PKG-04A Chaos Rising Ingestion Readiness V1

This is a no-write readiness package for Chaos Rising. It does not authorize raw imports, canonical normalization, migrations, cleanup, quarantine, or apply execution.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- apply_paths_executed: ${report.apply_paths_executed}
- write_ready_now: ${report.write_ready_now}

## Status

- report_status: ${report.report_status}
- package_id: ${report.package_id}

## Scope

${markdownTable(['field', 'value'], scopeRows)}

## Source Probe

| Field | Value |
| --- | --- |
| set command | \`${report.source_probes.set.command}\` |
| fetched_sets | ${report.source_probes.set.observed_fetched_sets} |
| would_upsert_sets | ${report.source_probes.set.observed_would_upsert_sets} |
| set_probe_db_writes_performed | ${report.source_probes.set.db_writes_performed} |
| card command | \`${report.source_probes.cards.command}\` |
| fetched_cards | ${report.source_probes.cards.observed_fetched_cards} |
| would_upsert_cards | ${report.source_probes.cards.observed_would_upsert_cards} |
| card_probe_db_writes_performed | ${report.source_probes.cards.db_writes_performed} |
| command_scoped_tls_retry_used | ${report.source_probes.cards.command_scoped_tls_retry_used} |
| tls_note | ${report.source_probes.cards.note} |

## Current Blockers

${markdownTable(['blocker', 'severity', 'required_resolution'], blockers)}

## Required Operator Sequence

${markdownTable(['step', 'command', 'write_scope', 'durable_write', 'canonical_write', 'safety_requirement'], sequenceRows)}

## Safety Gaps Closed This Step

${report.safety_gaps_closed_this_step.map((row) => `- ${row.gap}: ${row.closure}`).join('\n')}

## Stop Rules

${report.stop_rules.map((item) => `- ${item}`).join('\n')}
`;
}

async function main() {
  const chaosPackage = await readJson(path.join(CHAOS_DIR, 'chaos_rising_completion_package_v1.json'));
  const readiness = await readJson(path.join(OUTPUT_DIR, 'english_master_index_post_pkg02_write_class_readiness_v1.json'));
  const report = buildReport({ chaosPackage, readiness });
  await writeJson(OUTPUT_JSON, report);
  await writeMarkdown(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated_files: [
      path.relative(process.cwd(), OUTPUT_JSON).replaceAll('\\', '/'),
      path.relative(process.cwd(), OUTPUT_MD).replaceAll('\\', '/'),
    ],
    report_status: report.report_status,
    package_scope: report.package_scope,
    write_ready_now: report.write_ready_now,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

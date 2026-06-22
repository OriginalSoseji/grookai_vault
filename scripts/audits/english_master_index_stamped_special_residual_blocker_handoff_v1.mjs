import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_next_action_queue_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_residual_blocker_handoff_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_stamped_special_residual_blocker_handoff_v1.md',
);

const ACTION_GUIDANCE = {
  league_finish_exact_source: {
    evidence_needed: 'Exact source tying the league placement/stamp variant to the specific finish for the exact set, number, and name.',
    suggested_sources: ['Pokumon card pages', 'PokeScope', 'sealed league/product evidence', 'clear front/back scan with source URL'],
    write_path: 'Parent identity + active child printing only after exact finish proof.',
  },
  display_metadata_no_write: {
    evidence_needed: 'No child-printing evidence needed; these belong outside canonical printings unless a source proves a distinct physical card lane.',
    suggested_sources: ['Product metadata model', 'variant-origin display copy'],
    write_path: 'No card_print/card_printing write. Optional future product/display metadata only.',
  },
  small_custom_stamp_exact_source: {
    evidence_needed: 'Exact event/stamp page or scan that proves the custom stamp exists on that exact card and finish.',
    suggested_sources: ['Pokumon', 'collector references', 'tournament/event pages', 'authenticated listings with stable proof'],
    write_path: 'Parent identity + active child printing after source-backed finish proof.',
  },
  prize_pack_second_source: {
    evidence_needed: 'Second independent source for Prize Pack stamp card/finish, not generic Prize Pack assumptions.',
    suggested_sources: ['Official Prize Pack lists', 'Pokumon', 'TCGplayer product titles where exact', 'PriceCharting exact product rows'],
    write_path: 'Parent identity + active child printing after second-source confirmation.',
  },
  event_staff_exact_source: {
    evidence_needed: 'Exact event/staff source proving stamp label and finish for the exact card.',
    suggested_sources: ['Pokumon', 'event archives', 'collector references', 'PSA/CGC pop or cert pages only with exact visible front'],
    write_path: 'Parent identity + active child printing after exact finish proof.',
  },
  closed_stale_no_write: {
    evidence_needed: 'None currently. Row is stale/closed for write purposes.',
    suggested_sources: [],
    write_path: 'No write.',
  },
  second_source_needed: {
    evidence_needed: 'One more independent source that agrees on exact set, number, name, stamp/variant, and finish.',
    suggested_sources: ['Different collector reference than the existing source', 'official/checklist source', 'stable marketplace product page with exact title/image proof'],
    write_path: 'Dry-run package only after second-source agreement.',
  },
  generic_stamped_suppressed_no_write: {
    evidence_needed: 'Specific stamp label and exact finish. Generic “stamped” is intentionally suppressed.',
    suggested_sources: ['Exact stamp family pages', 'source image labels', 'product checklists'],
    write_path: 'No write until generic stamped becomes a deterministic variant label.',
  },
  prerelease_exact_finish_source: {
    evidence_needed: 'Exact prerelease/staff prerelease finish evidence for the card, not era or set assumptions.',
    suggested_sources: ['Prerelease product/source pages', 'Pokumon', 'PokeScope', 'verified scans'],
    write_path: 'Parent identity + active child printing after exact finish proof.',
  },
  professor_program_exact_finish_source: {
    evidence_needed: 'Exact Professor Program stamp and finish evidence for the exact card.',
    suggested_sources: ['Professor Program references', 'Pokumon', 'collector checklists', 'verified scans'],
    write_path: 'Parent identity + active child printing after exact finish proof.',
  },
  base_parent_blocked_no_write: {
    evidence_needed: 'Resolve base parent/base finish dependency before variant parent can be safely modeled.',
    suggested_sources: ['Master Index base-card evidence', 'canonical DB dependency audit'],
    write_path: 'Dependency first; no variant write now.',
  },
  halloween_base_parent_or_finish_resolution: {
    evidence_needed: 'Resolve whether the Halloween row is a product/display lane, base parent issue, or exact stamped printing with finish.',
    suggested_sources: ['Trick or Trade product/checklist evidence', 'sealed product evidence', 'exact card scans'],
    write_path: 'No write until lane and finish are deterministic.',
  },
  manual_conflict_still_blocked: {
    evidence_needed: 'Human adjudication of conflicting taxonomy before evidence acquisition can produce a write package.',
    suggested_sources: ['Existing evidence packet', 'operator review'],
    write_path: 'No write until conflict is resolved.',
  },
  regional_championship_taxonomy_governance: {
    evidence_needed: 'Evidence exists; govern exact Regional Championships variant key and crosshatch active-finish mapping before packaging.',
    suggested_sources: ['DV1 regional championship evidence packet', 'Bulbapedia', 'TCGplayer', 'PriceCharting', 'CardTrader'],
    write_path: 'No write until taxonomy maps generic league_stamp to exact regional_championships_stamp and active finish behavior.',
  },
  regional_championship_active_finish_adjudication: {
    evidence_needed: 'Regional Championships identity is governed; active child finish remains blocked until exact finish handling is adjudicated.',
    suggested_sources: ['REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1', 'DV1 regional championship evidence packet', 'Bulbapedia', 'TCGplayer', 'PriceCharting', 'CardTrader'],
    write_path: 'No write until active finish mapping is approved. Crosshatch stays evidence/display metadata and must not become a finish key by inference.',
  },
  regional_championship_future_dry_run_candidate: {
    evidence_needed: 'Evidence and active finish adjudication are sufficient for rollback-only dry-run preparation.',
    suggested_sources: ['REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1', 'Regional Championship active finish adjudication report'],
    write_path: 'Prepare a separate guarded dry-run package only. No real apply without explicit approval.',
  },
};

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function executionGroup(row) {
  const bucket = row.action_bucket || '';
  if (
    bucket === 'display_metadata_no_write' ||
    bucket === 'closed_stale_no_write' ||
    bucket === 'generic_stamped_suppressed_no_write'
  ) {
    return 'no_write_governance';
  }
  if (bucket === 'base_parent_blocked_no_write' || bucket === 'halloween_base_parent_or_finish_resolution') {
    return 'dependency_blocked';
  }
  if (bucket === 'manual_conflict_still_blocked' || bucket === 'manual_conflict_adjudication') {
    return 'manual_adjudication';
  }
  if (bucket === 'regional_championship_future_dry_run_candidate') {
    return 'future_dry_run_ready';
  }
  if (
    bucket === 'regional_championship_taxonomy_governance' ||
    bucket === 'regional_championship_active_finish_adjudication'
  ) {
    return 'manual_adjudication';
  }
  return 'evidence_blocked';
}

function finalStatus(row) {
  return row.final_status || row.queue_status || row.action_bucket || 'unknown';
}

function groupRows(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key] || 'unknown';
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  return [...groups.entries()]
    .sort(([leftKey, leftRows], [rightKey, rightRows]) => rightRows.length - leftRows.length || leftKey.localeCompare(rightKey))
    .map(([group_key, group_rows]) => ({
      group_key,
      row_count: group_rows.length,
      guidance: ACTION_GUIDANCE[group_key] ?? {
        evidence_needed: 'Review row details and source packet.',
        suggested_sources: [],
        write_path: 'No write until deterministic.',
      },
      by_final_status: countBy(group_rows, finalStatus),
      by_set: countBy(group_rows, (row) => row.set_key),
      examples: group_rows.slice(0, 12),
    }));
}

function topEntries(counts, limit = 12) {
  return Object.entries(counts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, limit);
}

function buildMarkdown(report) {
  return `# Stamped/Special Residual Blocker Handoff V1

Audit-only handoff for the remaining stamped/special rows after source exhaustion.

## Summary

${markdownTable(['metric', 'value'], [
    ['residual_rows', report.summary.residual_rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['evidence_blocked_rows', report.summary.by_execution_group.evidence_blocked ?? 0],
    ['no_write_governance_rows', report.summary.by_execution_group.no_write_governance ?? 0],
    ['dependency_blocked_rows', report.summary.by_execution_group.dependency_blocked ?? 0],
    ['manual_adjudication_rows', report.summary.by_execution_group.manual_adjudication ?? 0],
    ['future_dry_run_ready_rows', report.summary.by_execution_group.future_dry_run_ready ?? 0],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## What This Means

- These rows are not approved for DB writes.
- Generic \`stamped\` remains suppressed and is not canonical truth.
- Display-only metadata rows should not become card_print/card_printing rows unless new evidence proves a physical printing lane.
- Evidence-blocked rows need exact set + number + name + stamp/variant + finish evidence with source URL.

## Execution Groups

${markdownTable(
    ['group', 'rows', 'meaning'],
    Object.entries(report.summary.by_execution_group).map(([group, count]) => [
      group,
      count,
      report.execution_group_meanings[group] ?? 'See row-level action bucket.',
    ]),
  )}

## Action Buckets

${markdownTable(
    ['bucket', 'rows', 'evidence needed', 'write path'],
    report.action_buckets.map((bucket) => [
      bucket.group_key,
      bucket.row_count,
      bucket.guidance.evidence_needed,
      bucket.guidance.write_path,
    ]),
  )}

## Largest Set Clusters

${markdownTable(['set', 'rows'], topEntries(report.summary.by_set))}

## Largest Variant Clusters

${markdownTable(['variant', 'rows'], topEntries(report.summary.by_variant_key))}

## Bucket Examples

${report.action_buckets.map((bucket) => `### ${bucket.group_key}

Rows: ${bucket.row_count}

Suggested sources: ${bucket.guidance.suggested_sources.length ? bucket.guidance.suggested_sources.join(', ') : 'none'}

${markdownTable(
    ['set', 'number', 'card', 'variant', 'stamp', 'status', 'next action'],
    bucket.examples.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.stamp_label,
      finalStatus(row),
      row.next_action || row.recommended_action,
    ]),
  )}`).join('\n\n')}
`;
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = input.rows ?? [];

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_residual_blocker_handoff_v1',
    input_report: path.relative(ROOT, INPUT_JSON).replaceAll('\\', '/'),
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
    },
    execution_group_meanings: {
      evidence_blocked: 'Exact source evidence is insufficient for a write package.',
      no_write_governance: 'Governance says this should not become a canonical printing row now.',
      dependency_blocked: 'A base parent, base finish, or existing dependency must be resolved first.',
      manual_adjudication: 'A human taxonomy/event-label decision is required before packaging.',
      future_dry_run_ready: 'Evidence is ready for a separate rollback-only dry-run package. This still does not authorize real apply.',
    },
    summary: {
      residual_rows: rows.length,
      write_ready_now: 0,
      by_execution_group: countBy(rows, executionGroup),
      by_action_bucket: countBy(rows, (row) => row.action_bucket),
      by_final_status: countBy(rows, finalStatus),
      by_set: countBy(rows, (row) => row.set_key),
      by_variant_key: countBy(rows, (row) => row.variant_key),
    },
    action_buckets: groupRows(rows, 'action_bucket'),
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary: report.summary,
    action_buckets: report.action_buckets.map((bucket) => ({
      group_key: bucket.group_key,
      row_count: bucket.row_count,
      by_final_status: bucket.by_final_status,
      by_set: bucket.by_set,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    residual_rows: report.summary.residual_rows,
    write_ready_now: report.summary.write_ready_now,
    by_execution_group: report.summary.by_execution_group,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const MASTER_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join('docs', 'audits', 'english_master_index_source_exhaustion_v1');

const OUT_BASENAME = 'english_master_index_sv03_stamped_lane_closure_v1';
const OUT_JSON = path.join(MASTER_DIR, `${OUT_BASENAME}.json`);
const OUT_MD = path.join(MASTER_DIR, `${OUT_BASENAME}.md`);
const MIRROR_JSON = path.join(SOURCE_DIR, `${OUT_BASENAME}.json`);
const MIRROR_MD = path.join(SOURCE_DIR, `${OUT_BASENAME}.md`);

const INPUTS = {
  collision_audit: path.join(MASTER_DIR, 'english_master_index_sv03_existing_stamped_parent_collision_audit_v1.json'),
  source_adjudication: path.join(MASTER_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_source_adjudication_v1.json'),
  identity_apply: path.join(MASTER_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_real_apply_v1.json'),
  town_store_apply: path.join(MASTER_DIR, 'english_master_index_sv03_town_store_stamped_child_insert_real_apply_v1.json'),
  ex_holo_apply: path.join(MASTER_DIR, 'english_master_index_sv03_play_pokemon_ex_holo_child_insert_real_apply_v1.json'),
};

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

function normalizedNumber(row) {
  return String(row.source_number_plain ?? row.number_plain ?? row.source_card_number ?? row.number ?? '')
    .replace(/^0+/, '') || '0';
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function rowKey(row) {
  return `${normalizedNumber(row)}|${normalizeName(row.card_name ?? row.name)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function sourceUrls(row) {
  return [...new Set((row?.evidence_rows ?? []).map((item) => item.source_url).filter(Boolean))].sort();
}

function buildRows(collisionAudit, sourceAdjudication) {
  const adjudicatedByKey = new Map((sourceAdjudication.rows ?? []).map((row) => [rowKey(row), row]));
  return (collisionAudit.rows ?? []).map((row) => {
    const adjudicated = adjudicatedByKey.get(rowKey(row));
    const currentTargetChildSatisfied = row.target_child_finish_count === 1;
    const identitySatisfied = row.active_identity_count === 1 && row.existing_parent_printed_identity_modifier === row.target_variant_key;
    const forbiddenStampedChildAbsent = row.forbidden_stamped_child_count === 0;
    const closed = currentTargetChildSatisfied && identitySatisfied && forbiddenStampedChildAbsent;
    const closureReason = adjudicated?.adjudication_status
      ?? (row.evidence_tier === 'multi_lane' ? 'multi_lane_source_backed_target_finish_already_satisfied' : 'current_db_target_finish_satisfied_after_approved_apply');
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.source_card_number,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      existing_parent_id: row.existing_parent_id,
      expected_target_child_id: row.expected_target_child_id,
      current_target_child_satisfied: currentTargetChildSatisfied,
      active_identity_satisfied: identitySatisfied,
      forbidden_stamped_child_absent: forbiddenStampedChildAbsent,
      historical_collision_status: row.collision_status,
      historical_blockers: row.blockers ?? [],
      evidence_tier_before_adjudication: row.evidence_tier,
      adjudication_status: adjudicated?.adjudication_status ?? null,
      exact_finish_sources_after_adjudication: adjudicated?.source_counts?.exact_finish_sources ?? null,
      exact_stamp_sources_after_adjudication: adjudicated?.source_counts?.exact_stamp_sources ?? null,
      evidence_urls_after_adjudication: sourceUrls(adjudicated),
      closure_status: closed ? 'closed_verified_in_db' : 'still_open',
      closure_reason: closureReason,
    };
  });
}

function sumWriteCounts(...artifacts) {
  const totals = {
    parent_rows_updated: 0,
    parent_rows_written_after_identity_backfill: 0,
    identity_rows_inserted: 0,
    identity_rows_written_after_identity_backfill: 0,
    child_rows_inserted: 0,
    delete_rows: 0,
    merge_rows: 0,
  };
  for (const artifact of artifacts) {
    const counts = artifact.write_counts ?? {};
    if (artifact.package_id === 'SV03-EXISTING-STAMPED-PARENT-IDENTITY-BACKFILL') {
      totals.parent_rows_updated += counts.parent_rows_updated ?? 0;
      totals.identity_rows_inserted += counts.identity_rows_inserted ?? 0;
    } else {
      totals.parent_rows_written_after_identity_backfill += counts.parent_rows_written ?? 0;
      totals.identity_rows_written_after_identity_backfill += counts.identity_rows_written ?? 0;
    }
    totals.child_rows_inserted += counts.child_rows_inserted ?? 0;
    totals.delete_rows += counts.delete_rows ?? 0;
    totals.merge_rows += counts.merge_rows ?? 0;
  }
  return totals;
}

function packageRows(...artifacts) {
  return artifacts.map((artifact) => ({
    package_id: artifact.package_id,
    package_fingerprint_sha256: artifact.package_fingerprint_sha256,
    apply_status: artifact.apply_status,
    committed: artifact.committed,
    write_counts: artifact.write_counts,
    stop_findings: artifact.stop_findings ?? [],
  }));
}

function buildMarkdown(report) {
  return `# English Master Index SV03 Stamped Lane Closure V1

Generated: ${report.generated_at}

This closes the SV03 Play Pokemon stamped lane after the approved identity backfill and child-finish insert packages. This report performs no database writes; it only consolidates existing apply artifacts and the current post-apply collision audit.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['closed_rows', report.summary.closed_rows],
    ['open_rows', report.summary.open_rows],
    ['missing_target_child_finish', report.summary.missing_target_child_finish],
    ['forbidden_stamped_child_finishes', report.summary.forbidden_stamped_child_finishes],
    ['identity_rows_backfilled', report.summary.identity_rows_backfilled],
    ['child_rows_inserted', report.summary.child_rows_inserted],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Safety

${markdownTable(['check', 'value'], Object.entries(report.safety_confirmation))}

## Packages Consolidated

${markdownTable(
    ['package', 'status', 'fingerprint', 'writes', 'stop_findings'],
    report.packages.map((pkg) => [
      pkg.package_id,
      pkg.apply_status,
      `\`${pkg.package_fingerprint_sha256}\``,
      JSON.stringify(pkg.write_counts),
      pkg.stop_findings.length,
    ]),
  )}

## Rows

${markdownTable(
    ['number', 'card', 'variant', 'finish', 'closure_status', 'closure_reason', 'historical_blockers'],
    report.rows.map((row) => [
      row.card_number,
      row.card_name,
      row.target_variant_key,
      row.target_finish_key,
      row.closure_status,
      row.closure_reason,
      row.historical_blockers.join(', ') || 'none',
    ]),
  )}

## Interpretation

The older collision audit still carries historical blocker labels for product-family-only evidence. Those blockers are no longer actionable for Toedscruel ex and Tyranitar ex because the source adjudication report captured exact independent holo evidence before the approved child inserts. Current DB state shows all three target stamped parents have active identity rows and the required active child finish, with no child \`finish_key=stamped\`.
`;
}

async function main() {
  const [
    collisionAudit,
    sourceAdjudication,
    identityApply,
    townStoreApply,
    exHoloApply,
  ] = await Promise.all([
    readJson(INPUTS.collision_audit),
    readJson(INPUTS.source_adjudication),
    readJson(INPUTS.identity_apply),
    readJson(INPUTS.town_store_apply),
    readJson(INPUTS.ex_holo_apply),
  ]);

  const rows = buildRows(collisionAudit, sourceAdjudication);
  const writes = sumWriteCounts(identityApply, townStoreApply, exHoloApply);
  const packages = packageRows(identityApply, townStoreApply, exHoloApply);
  const payload = {
    rows,
    writes,
    packages: packages.map((pkg) => ({
      package_id: pkg.package_id,
      package_fingerprint_sha256: pkg.package_fingerprint_sha256,
      apply_status: pkg.apply_status,
    })),
  };
  const report = {
    version: OUT_BASENAME,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_reads_performed: false,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifacts: Object.fromEntries(Object.entries(INPUTS).map(([key, value]) => [key, value.replaceAll('\\', '/')])),
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      target_rows: rows.length,
      closed_rows: rows.filter((row) => row.closure_status === 'closed_verified_in_db').length,
      open_rows: rows.filter((row) => row.closure_status !== 'closed_verified_in_db').length,
      missing_target_child_finish: rows.filter((row) => !row.current_target_child_satisfied).length,
      forbidden_stamped_child_finishes: rows.filter((row) => !row.forbidden_stamped_child_absent).length,
      identity_rows_backfilled: writes.identity_rows_inserted,
      child_rows_inserted: writes.child_rows_inserted,
      parent_writes_after_identity_backfill: writes.parent_rows_written_after_identity_backfill,
      identity_writes_after_identity_backfill: writes.identity_rows_written_after_identity_backfill,
      delete_rows: writes.delete_rows,
      merge_rows: writes.merge_rows,
      write_ready_now: 0,
      by_closure_status: countBy(rows, (row) => row.closure_status),
      by_finish: countBy(rows, (row) => row.target_finish_key),
    },
    packages,
    rows,
    safety_confirmation: {
      audit_only: true,
      db_writes_performed_by_this_report: false,
      durable_db_writes_performed_by_this_report: false,
      prior_approved_apply_artifacts_consolidated: true,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      write_ready_now: 0,
    },
  };

  if (report.summary.open_rows !== 0) {
    throw new Error(`SV03 stamped lane is not closed: ${report.summary.open_rows} open rows`);
  }
  if (report.summary.forbidden_stamped_child_finishes !== 0) {
    throw new Error('SV03 stamped lane contains forbidden stamped child finishes');
  }
  if (report.summary.parent_writes_after_identity_backfill !== 0 || report.summary.identity_writes_after_identity_backfill !== 0) {
    throw new Error('Unexpected parent or identity writes after identity backfill phase');
  }
  if (report.summary.delete_rows !== 0 || report.summary.merge_rows !== 0) {
    throw new Error('Unexpected deletes or merges in SV03 stamped lane');
  }

  const markdown = buildMarkdown(report);
  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, markdown);
  await writeJson(MIRROR_JSON, report);
  await writeText(MIRROR_MD, markdown);

  console.log(JSON.stringify({
    output_json: OUT_JSON,
    mirror_json: MIRROR_JSON,
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();

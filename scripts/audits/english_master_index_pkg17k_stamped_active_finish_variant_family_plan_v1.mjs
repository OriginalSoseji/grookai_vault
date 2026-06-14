import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const PKG17B_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.json');
const PKG17H_JSON = path.join(SOURCE_DIR, 'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1', 'pkg17h_prize_pack_active_finish_current_queue_acquisition_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17k_stamped_active_finish_variant_family_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg17k_stamped_active_finish_variant_family_plan_v1.md');

const PACKAGE_ID = 'PKG-17K-STAMPED-ACTIVE-FINISH-VARIANT-FAMILY-PLAN';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
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
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function familyForVariant(variantKey) {
  const key = String(variantKey ?? '').toLowerCase();
  if (key.includes('prize_pack')) return 'prize_pack';
  if (key.includes('league')) return 'league';
  if (key.includes('battle_academy')) return 'battle_academy';
  if (key.includes('prerelease')) return 'prerelease';
  if (key.includes('professor')) return 'professor_program';
  if (key.includes('jack_o_lantern') || key.includes('pumpkin')) return 'halloween';
  if (key.includes('staff')) return 'staff';
  if (key.includes('regional') || key.includes('championship') || key.includes('finalist')) return 'championship_event';
  if (key.includes('player_rewards')) return 'player_rewards';
  if (key === 'stamped' || key === 'unknown') return 'generic_or_unknown';
  return 'small_custom_stamp_family';
}

function recommendedSourcePath(family) {
  switch (family) {
    case 'league':
      return 'Target official Play! Pokemon league material, PriceCharting exact product titles, and collector checklist pages; require exact active finish per card.';
    case 'prize_pack':
      return 'Remain blocked until a third independent source resolves Standard Set versus Standard Set Foil conflict at card level.';
    case 'battle_academy':
      return 'Keep out of canonical finish writes; route toward display metadata strategy unless exact separate physical printing evidence exists.';
    case 'prerelease':
      return 'Target Build & Battle checklist/source pages and product scans; exact promo stamp plus active finish required.';
    case 'professor_program':
      return 'Target professor-program product/checklist sources and PriceCharting exact titles; exact finish required.';
    case 'halloween':
      return 'Target official Trick or Trade/checklist references and product scans; beware reused base cards and pumpkin stamp display identity.';
    case 'staff':
    case 'championship_event':
      return 'Target event staff/championship checklist evidence; manual review likely required because source titles often omit active finish.';
    case 'player_rewards':
      return 'Target Player Rewards checklist pages and collector references; exact crosshatch/stamp plus active finish required.';
    case 'generic_or_unknown':
      return 'First acquire exact stamp label; generic stamped rows cannot advance to active finish proof.';
    default:
      return 'Use source-specific manual acquisition; no family-wide inference allowed.';
  }
}

function readinessStatus(family, count, prizePackSummary) {
  if (family === 'battle_academy') return 'governance_blocked_display_metadata';
  if (family === 'generic_or_unknown') return 'blocked_exact_stamp_label_needed';
  if (family === 'prize_pack' && prizePackSummary?.ready_two_source_exact_active_finish === 0) return 'blocked_conflicting_or_single_source_prize_pack_finish';
  if (count >= 10) return 'source_acquisition_high_priority';
  return 'source_acquisition_low_volume';
}

function renderMarkdown(report) {
  return `# PKG-17K Stamped Active Finish Variant Family Plan V1

Audit-only plan for the remaining stamped rows that still need exact active child finish evidence.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['active_finish_rows', report.summary.active_finish_rows],
    ['family_count', report.summary.family_count],
    ['high_priority_source_acquisition_rows', report.summary.high_priority_source_acquisition_rows],
    ['blocked_or_governance_rows', report.summary.blocked_or_governance_rows],
    ['write_ready_now', report.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Family Plan

${markdownTable(
    ['priority', 'family', 'rows', 'status', 'top variants', 'top sets', 'recommended source path'],
    report.family_plan.map((row) => [
      row.priority,
      row.family,
      row.row_count,
      row.readiness_status,
      row.top_variant_keys.map((item) => `${item.key}=${item.count}`).join(', '),
      row.top_sets.map((item) => `${item.key}=${item.count}`).join(', '),
      row.recommended_source_path,
    ]),
  )}

## Rules

- No child \`finish_key=stamped\`.
- No family-wide finish inference.
- No Prize Pack promotion while sources conflict on Standard Set versus Standard Set Foil.
- No Battle Academy canonical finish write until display metadata strategy is resolved.
`;
}

async function main() {
  const [pkg17a, pkg17b, pkg17h] = await Promise.all([
    readJson(PKG17A_JSON),
    readJsonIfExists(PKG17B_JSON),
    readJsonIfExists(PKG17H_JSON),
  ]);
  const activeRows = (pkg17a.rows ?? []).filter((row) => row.queue_status === 'active_finish_required');
  const families = [];
  for (const [family, rows] of Object.entries(Object.groupBy(activeRows, (row) => familyForVariant(row.variant_key)))) {
    const status = readinessStatus(family, rows.length, pkg17h?.summary);
    families.push({
      family,
      row_count: rows.length,
      readiness_status: status,
      top_variant_keys: Object.entries(countBy(rows, (row) => row.variant_key)).slice(0, 8).map(([key, count]) => ({ key, count })),
      top_sets: Object.entries(countBy(rows, (row) => row.set_key)).slice(0, 8).map(([key, count]) => ({ key, count })),
      sample_rows: rows.slice(0, 20),
      recommended_source_path: recommendedSourcePath(family),
    });
  }
  families.sort((left, right) => (
    Number(right.row_count) - Number(left.row_count) || String(left.family).localeCompare(String(right.family))
  ));
  const familyPlan = families.map((row, index) => ({ priority: index + 1, ...row }));
  const payload = {
    pkg17a_fingerprint: pkg17a.fingerprint_sha256,
    pkg17b_fingerprint: pkg17b?.fingerprint_sha256 ?? null,
    pkg17h_fingerprint: pkg17h?.fingerprint_sha256 ?? null,
    familyPlan,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg17k_stamped_active_finish_variant_family_plan_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: path.relative(ROOT, PKG17A_JSON).replaceAll('\\', '/'),
      stamped_active_finish_source_acquisition: pkg17b ? path.relative(ROOT, PKG17B_JSON).replaceAll('\\', '/') : null,
      prize_pack_current_queue_acquisition: pkg17h ? path.relative(ROOT, PKG17H_JSON).replaceAll('\\', '/') : null,
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      active_finish_rows: activeRows.length,
      family_count: familyPlan.length,
      high_priority_source_acquisition_rows: familyPlan
        .filter((row) => row.readiness_status === 'source_acquisition_high_priority')
        .reduce((sum, row) => sum + row.row_count, 0),
      blocked_or_governance_rows: familyPlan
        .filter((row) => row.readiness_status.startsWith('blocked') || row.readiness_status.startsWith('governance'))
        .reduce((sum, row) => sum + row.row_count, 0),
      by_family: countBy(activeRows, (row) => familyForVariant(row.variant_key)),
      by_variant_key: countBy(activeRows, (row) => row.variant_key),
      by_set: countBy(activeRows, (row) => row.set_key),
    },
    family_plan: familyPlan,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
    top_family: report.family_plan[0] ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});

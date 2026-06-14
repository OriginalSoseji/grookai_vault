import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG17A_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json');
const PKG17I_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17i_stamped_remaining_blocker_triage_v1.json');
const PKG17K_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17k_stamped_active_finish_variant_family_plan_v1.json');
const PKG17O_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg17o_league_preserved_evidence_absorption_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18_stamped_completion_governance_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18_stamped_completion_governance_plan_v1.md');

const PACKAGE_ID = 'PKG-18-STAMPED-COMPLETION-GOVERNANCE-PLAN';

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

function topEntries(counts, limit = 12) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function variantFamily(row) {
  const key = String(row.variant_key ?? '').toLowerCase();
  const stamp = String(row.stamp_label ?? '').toLowerCase();
  const text = `${key} ${stamp}`;
  if (!key || key === 'unknown' || key === 'stamped') return 'generic_or_unknown';
  if (text.includes('battle_academy')) return 'battle_academy';
  if (text.includes('prize_pack')) return 'prize_pack';
  if (text.includes('league')) return 'league';
  if (text.includes('jack_o_lantern') || text.includes('pumpkin')) return 'halloween';
  if (text.includes('professor')) return 'professor_program';
  if (text.includes('prerelease')) return 'prerelease';
  if (text.includes('player_rewards') || text.includes('crosshatch')) return 'player_rewards_crosshatch';
  if (text.includes('staff') || text.includes('championship') || text.includes('finalist')) return 'championship_or_staff';
  if (text.includes('wotc') || text.includes('e3')) return 'wotc_legacy_stamp';
  return 'small_custom_stamp';
}

function primaryGovernanceRule(row) {
  const family = variantFamily(row);
  const status = row.queue_status;
  if (status === 'blocked_conflicting_finish_observation') return 'manual_conflict_adjudication_rule';
  if (status === 'blocked_second_independent_source_needed') return 'second_source_rule_preserved';
  if (status === 'base_parent_missing') return 'base_parent_required_before_stamped_identity_rule';
  if (status === 'base_parent_ambiguous') return 'canonical_base_parent_selection_rule';
  if (family === 'generic_or_unknown') return 'generic_stamped_suppression_rule';
  if (family === 'battle_academy') return 'battle_academy_display_metadata_rule';
  if (family === 'prize_pack') return 'prize_pack_finish_label_mapping_rule';
  if (family === 'league' || family === 'player_rewards_crosshatch') return 'league_crosshatch_finish_alias_rule';
  if (family === 'championship_or_staff') return 'event_staff_stamp_hierarchy_rule';
  if (family === 'halloween') return 'halloween_stamp_display_identity_rule';
  if (family === 'professor_program') return 'professor_program_stamp_identity_rule';
  if (family === 'prerelease') return 'prerelease_stamp_identity_rule';
  if (family === 'wotc_legacy_stamp') return 'wotc_legacy_stamp_identity_rule';
  return 'small_custom_stamp_source_rule';
}

function ruleEffect(ruleId) {
  switch (ruleId) {
    case 'generic_stamped_suppression_rule':
      return {
        determinism: 'deterministic_blocking_rule',
        can_reduce_queue_without_source: true,
        write_effect: 'none',
        description: 'Generic stamped claims are not canonical identity. They remain blocked until exact stamp label is known.',
      };
    case 'battle_academy_display_metadata_rule':
      return {
        determinism: 'deterministic_display_metadata_rule',
        can_reduce_queue_without_source: true,
        write_effect: 'defer_card_printing_writes',
        description: 'Battle Academy deck marks are display/deck metadata unless exact separate physical printing evidence proves otherwise. Never create child finish_key=stamped.',
      };
    case 'base_parent_required_before_stamped_identity_rule':
      return {
        determinism: 'deterministic_ordering_rule',
        can_reduce_queue_without_source: true,
        write_effect: 'requires_base_parent_package_first',
        description: 'Stamped identity may only attach to an existing canonical unstamped base parent.',
      };
    case 'canonical_base_parent_selection_rule':
      return {
        determinism: 'deterministic_resolution_rule_after_readback',
        can_reduce_queue_without_source: true,
        write_effect: 'readiness_or_dependency_transfer_only',
        description: 'When multiple base parents exist, select the canonical unstamped base parent by set, number, name, empty variant, active identity, and matching base finish lane.',
      };
    case 'league_crosshatch_finish_alias_rule':
      return {
        determinism: 'bounded_alias_rule',
        can_reduce_queue_without_source: false,
        write_effect: 'can_unlock_bulk_readiness_when exact sources exist',
        description: 'For League/Player Rewards contexts, Crosshatch Holo is a governed source label that may map to the active reverse lane only when exact set/card/stamp evidence exists.',
      };
    case 'prize_pack_finish_label_mapping_rule':
      return {
        determinism: 'needs_governed_mapping',
        can_reduce_queue_without_source: false,
        write_effect: 'blocked_until_standard_set_vs_foil_mapping',
        description: 'Prize Pack source labels must map Standard Set, Standard Set Foil, H, and Reverse Holo to active finishes at card level before promotion.',
      };
    case 'event_staff_stamp_hierarchy_rule':
      return {
        determinism: 'variant_normalization_rule',
        can_reduce_queue_without_source: false,
        write_effect: 'can_unlock_bulk_identity_after second source',
        description: 'Event and staff stamps normalize into controlled hierarchy: event stamp, staff event stamp, league staff stamp, finalist placement.',
      };
    default:
      return {
        determinism: 'source_required_rule',
        can_reduce_queue_without_source: false,
        write_effect: 'no_write_without_exact_sources',
        description: 'Keep source-law requirements active; use rule only for classification and package routing.',
      };
  }
}

function completionLane(row) {
  const ruleId = primaryGovernanceRule(row);
  if (ruleId === 'generic_stamped_suppression_rule') return 'lane_a_governance_suppression_no_write';
  if (ruleId === 'battle_academy_display_metadata_rule') return 'lane_b_display_metadata_strategy_no_printing_write';
  if (ruleId === 'base_parent_required_before_stamped_identity_rule' || ruleId === 'canonical_base_parent_selection_rule') return 'lane_c_base_parent_resolution';
  if (ruleId === 'manual_conflict_adjudication_rule') return 'lane_g_conflict_adjudication';
  if (ruleId === 'second_source_rule_preserved') return 'lane_f_second_source_acquisition';
  if (ruleId === 'prize_pack_finish_label_mapping_rule') return 'lane_d_prize_pack_finish_mapping';
  if (ruleId === 'league_crosshatch_finish_alias_rule') return 'lane_e_variant_family_finish_acquisition';
  return 'lane_e_variant_family_finish_acquisition';
}

function buildRows(queueRows) {
  return queueRows.map((row) => {
    const ruleId = primaryGovernanceRule(row);
    const effect = ruleEffect(ruleId);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      queue_status: row.queue_status,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      finish_key: row.finish_key,
      variant_family: variantFamily(row),
      governance_rule_id: ruleId,
      completion_lane: completionLane(row),
      deterministic_rule_class: effect.determinism,
      can_reduce_queue_without_source: effect.can_reduce_queue_without_source,
      write_effect: effect.write_effect,
      recommended_action: effect.description,
      blockers: row.blockers ?? [],
    };
  });
}

function buildGovernanceRules(rows) {
  return Object.entries(Object.groupBy(rows, (row) => row.governance_rule_id))
    .map(([ruleId, ruleRows]) => {
      const effect = ruleEffect(ruleId);
      return {
        rule_id: ruleId,
        row_count: ruleRows.length,
        determinism: effect.determinism,
        can_reduce_queue_without_source: effect.can_reduce_queue_without_source,
        write_effect: effect.write_effect,
        description: effect.description,
        by_status: countBy(ruleRows, (row) => row.queue_status),
        by_variant_family: countBy(ruleRows, (row) => row.variant_family),
        top_variant_keys: topEntries(countBy(ruleRows, (row) => row.variant_key), 10),
        top_sets: topEntries(countBy(ruleRows, (row) => row.set_key), 10),
      };
    })
    .sort((left, right) => Number(right.row_count) - Number(left.row_count) || left.rule_id.localeCompare(right.rule_id));
}

function buildBulkLanes(rows) {
  return Object.entries(Object.groupBy(rows, (row) => row.completion_lane))
    .map(([laneId, laneRows]) => ({
      lane_id: laneId,
      row_count: laneRows.length,
      write_authorized_now: false,
      recommended_next_artifact: artifactForLane(laneId),
      by_rule: countBy(laneRows, (row) => row.governance_rule_id),
      by_status: countBy(laneRows, (row) => row.queue_status),
      top_variant_keys: topEntries(countBy(laneRows, (row) => row.variant_key), 10),
      top_sets: topEntries(countBy(laneRows, (row) => row.set_key), 10),
    }))
    .sort((left, right) => laneOrder(left.lane_id) - laneOrder(right.lane_id));
}

function laneOrder(laneId) {
  return {
    lane_a_governance_suppression_no_write: 1,
    lane_b_display_metadata_strategy_no_printing_write: 2,
    lane_c_base_parent_resolution: 3,
    lane_d_prize_pack_finish_mapping: 4,
    lane_e_variant_family_finish_acquisition: 5,
    lane_f_second_source_acquisition: 6,
    lane_g_conflict_adjudication: 7,
  }[laneId] ?? 99;
}

function artifactForLane(laneId) {
  switch (laneId) {
    case 'lane_a_governance_suppression_no_write':
      return 'PKG-18A generic-stamped suppression report; remove these from write queues until exact label evidence exists.';
    case 'lane_b_display_metadata_strategy_no_printing_write':
      return 'PKG-18B Battle Academy display metadata contract; no card_printing writes.';
    case 'lane_c_base_parent_resolution':
      return 'PKG-18C base parent canonical selection/readiness; split insert vs ambiguity readback.';
    case 'lane_d_prize_pack_finish_mapping':
      return 'PKG-18D Prize Pack finish label mapping adjudication; then bulk readiness if conflicts close.';
    case 'lane_e_variant_family_finish_acquisition':
      return 'PKG-18E variant-family source acquisition in bulk; produce large guarded packages only for exact two-source rows.';
    case 'lane_f_second_source_acquisition':
      return 'PKG-18F second-source acquisition for existing single-source rows.';
    case 'lane_g_conflict_adjudication':
      return 'PKG-18G manual conflict adjudication report; no writes until resolved.';
    default:
      return 'Manual planning required.';
  }
}

function renderMarkdown(report) {
  return `# PKG-18 Stamped Completion Governance Plan V1

Audit-only rule and lane plan for completing the remaining stamped reconciliation work in the fewest safe bulk steps.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['remaining_queue_rows', report.summary.remaining_queue_rows],
    ['governance_rules', report.summary.governance_rules],
    ['bulk_lanes', report.summary.bulk_lanes],
    ['deterministic_no_source_rows', report.summary.deterministic_no_source_rows],
    ['source_required_rows', report.summary.source_required_rows],
    ['manual_conflict_rows', report.summary.manual_conflict_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Bulk Lanes

${markdownTable(
    ['order', 'lane', 'rows', 'write now', 'next artifact', 'top variants'],
    report.bulk_lanes.map((lane, index) => [
      index + 1,
      lane.lane_id,
      lane.row_count,
      lane.write_authorized_now,
      lane.recommended_next_artifact,
      lane.top_variant_keys.map((item) => `${item.key}=${item.count}`).join(', '),
    ]),
  )}

## Governance Rules

${markdownTable(
    ['rule', 'rows', 'determinism', 'reduce without source', 'write effect', 'description'],
    report.governance_rules.map((rule) => [
      rule.rule_id,
      rule.row_count,
      rule.determinism,
      rule.can_reduce_queue_without_source,
      rule.write_effect,
      rule.description,
    ]),
  )}

## Least-Step Completion Path

1. Adopt PKG-18A/18B suppression and display metadata rules to remove non-printing-truth rows from write queues.
2. Run PKG-18C base-parent readiness once for all parent blockers.
3. Run PKG-18D Prize Pack adjudication once; only exact mapped rows move forward.
4. Run PKG-18E/18F bulk source acquisition across all variant families, then create large guarded dry-run buckets from exact two-source rows.
5. Leave PKG-18G conflicts blocked until manual adjudication.

## Hard Rules

- No child \`finish_key=stamped\`.
- No generic stamped identity writes.
- No family-wide finish inference without exact evidence.
- No real apply is authorized by this plan.
`;
}

async function main() {
  const [pkg17a, pkg17i, pkg17k, pkg17o] = await Promise.all([
    readJson(PKG17A_JSON),
    readJsonIfExists(PKG17I_JSON),
    readJsonIfExists(PKG17K_JSON),
    readJsonIfExists(PKG17O_JSON),
  ]);
  const rows = buildRows(pkg17a.rows ?? []);
  const governanceRules = buildGovernanceRules(rows);
  const bulkLanes = buildBulkLanes(rows);
  const deterministicNoSourceRows = rows.filter((row) => ruleEffect(row.governance_rule_id).can_reduce_queue_without_source).length;
  const manualConflictRows = rows.filter((row) => row.governance_rule_id === 'manual_conflict_adjudication_rule').length;
  const payload = {
    pkg17a_fingerprint: pkg17a.fingerprint_sha256,
    pkg17i_fingerprint: pkg17i?.fingerprint_sha256 ?? null,
    pkg17k_fingerprint: pkg17k?.fingerprint_sha256 ?? null,
    pkg17o_fingerprint: pkg17o?.fingerprint_sha256 ?? null,
    governanceRules,
    bulkLanes,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18_stamped_completion_governance_plan_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_remaining_action_queue: rel(PKG17A_JSON),
      blocker_triage: pkg17i ? rel(PKG17I_JSON) : null,
      variant_family_plan: pkg17k ? rel(PKG17K_JSON) : null,
      league_absorption: pkg17o ? rel(PKG17O_JSON) : null,
    },
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      remaining_queue_rows: rows.length,
      governance_rules: governanceRules.length,
      bulk_lanes: bulkLanes.length,
      deterministic_no_source_rows: deterministicNoSourceRows,
      source_required_rows: rows.length - deterministicNoSourceRows - manualConflictRows,
      manual_conflict_rows: manualConflictRows,
      by_queue_status: countBy(rows, (row) => row.queue_status),
      by_variant_family: countBy(rows, (row) => row.variant_family),
      by_governance_rule: countBy(rows, (row) => row.governance_rule_id),
      by_completion_lane: countBy(rows, (row) => row.completion_lane),
    },
    governance_rules: governanceRules,
    bulk_lanes: bulkLanes,
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
    first_bulk_lane: report.bulk_lanes[0] ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});

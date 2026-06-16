import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_remaining_blocker_resolution_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'card_row_enrichment_remaining_blocker_resolution_plan_v1.md');

const INPUTS = {
  cleanup_plan: path.join(OUTPUT_DIR, 'card_row_enrichment_cleanup_plan_v1.json'),
  identity_provenance: path.join(OUTPUT_DIR, 'card_row_identity_provenance_plan_v1.json'),
  core_identity_readiness: path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json'),
  external_mapping_readiness: path.join(OUTPUT_DIR, 'enrich12b_external_id_payload_mapping_readiness_v1.json'),
  external_mapping_adjudication: path.join(OUTPUT_DIR, 'enrich07_external_mapping_collision_adjudication_v1.json'),
  residual_source_audit: path.join(OUTPUT_DIR, 'enrich12_residual_source_audit_v1.json'),
  no_child_parent_adjudication: path.join(OUTPUT_DIR, 'card_row_enrichment_no_child_parent_adjudication_v1.json'),
  active_identity_candidates: path.join(OUTPUT_DIR, 'active_identity_backfill_candidates_v1.json'),
  parent_gv_candidates: path.join(OUTPUT_DIR, 'parent_gv_id_backfill_candidates_v1.json'),
  child_gv_candidates: path.join(OUTPUT_DIR, 'child_printing_gv_id_backfill_candidates_v1.json'),
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

function countRowsBy(rows, key) {
  const counts = {};
  for (const row of rows ?? []) {
    const value = row[key] ?? 'missing';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function countBlockers(rows) {
  const counts = {};
  for (const row of rows ?? []) {
    for (const blocker of row.blockers ?? []) counts[blocker] = (counts[blocker] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

const [
  cleanup,
  identity,
  core,
  externalReadiness,
  externalAdjudication,
  residual,
  noChild,
  activeIdentity,
  parentGv,
  childGv,
] = await Promise.all([
  readJson(INPUTS.cleanup_plan),
  readJson(INPUTS.identity_provenance),
  readJson(INPUTS.core_identity_readiness),
  readJson(INPUTS.external_mapping_readiness),
  readJson(INPUTS.external_mapping_adjudication),
  readJson(INPUTS.residual_source_audit),
  readJson(INPUTS.no_child_parent_adjudication),
  readJson(INPUTS.active_identity_candidates),
  readJson(INPUTS.parent_gv_candidates),
  readJson(INPUTS.child_gv_candidates),
]);

const activeRows = activeIdentity.rows ?? [];
const parentGvRows = parentGv.rows ?? [];
const childGvRows = childGv.rows ?? [];

const blockerLanes = [
  {
    lane: 'core_identity',
    rows: cleanup.totals?.core_identity_gap_rows ?? 0,
    status: 'blocked_governance_required',
    reason: 'Pocket-like exclusions, proposed identity collisions, and subset alias governance have zero ready rows.',
    next_action: 'Split into Pocket cleanup/exclusion decision, collision ownership adjudication, and subset alias governance packages.',
    write_ready_now: false,
  },
  {
    lane: 'parent_gv_id',
    rows: cleanup.totals?.parent_gv_id_candidates ?? 0,
    status: 'blocked_by_core_identity_and_collisions',
    reason: 'All parent GV-ID candidates are blocked by missing set_code/number or existing GV-ID collisions.',
    next_action: 'Resolve core identity and duplicate/collision ownership before another parent GV-ID package.',
    write_ready_now: false,
  },
  {
    lane: 'child_printing_gv_id',
    rows: cleanup.totals?.child_printing_gv_id_candidates ?? 0,
    status: 'blocked_by_parent_gv_id',
    reason: 'All remaining child printing GV-ID candidates are missing parent gv_id.',
    next_action: 'Resume after parent GV-ID blockers are reduced.',
    write_ready_now: false,
  },
  {
    lane: 'active_identity',
    rows: cleanup.totals?.active_identity_candidates ?? 0,
    status: 'blocked_projection_or_duplicate_hash',
    reason: 'Projection is not ready for 7 rows and 2 rows collide in the identity hash batch.',
    next_action: 'Resolve identity projection readiness and duplicate hash ownership before insert package.',
    write_ready_now: false,
  },
  {
    lane: 'external_mapping',
    rows: cleanup.totals?.external_mapping_gap_rows ?? 0,
    status: 'blocked_by_existing_owner_collision',
    reason: 'Payload mapping candidates are all blocked by existing source/external ownership or variant/base ownership ambiguity.',
    next_action: 'Build source-specific transfer/adjudication plans; do not bulk insert mappings.',
    write_ready_now: false,
  },
  {
    lane: 'no_child_parent',
    rows: cleanup.totals?.no_child_printing_parent_rows ?? 0,
    status: 'blocked_dependency_bearing',
    reason: 'Every childless parent has dependencies; zero empty-delete and zero source-mapped child-insert targets are currently ready.',
    next_action: 'Resolve duplicate/mapping ownership first, then reassess whether a child insert or non-delete preservation package exists.',
    write_ready_now: false,
  },
  {
    lane: 'traits',
    rows: cleanup.totals?.trait_gaps ?? 0,
    status: 'source_exhausted_for_current_rules',
    reason: 'Active source-mapped retry lanes are cleared; residual rows need new source/rule acquisition.',
    next_action: 'Add rule/source acquisition for unmapped trait gaps only where exact identity is preserved.',
    write_ready_now: false,
  },
  {
    lane: 'species',
    rows: cleanup.totals?.species_gaps ?? 0,
    status: 'rule_unmapped',
    reason: 'Species name-rule dry-run scanned all missing-species parents and produced zero targets.',
    next_action: 'Design a richer species extraction/adjudication rule; do not infer species from card names yet.',
    write_ready_now: false,
  },
  {
    lane: 'catalog_metadata',
    rows: cleanup.totals?.catalog_metadata_gaps ?? 0,
    status: 'source_exhausted_for_current_rules',
    reason: 'Source-mapped null-only catalog metadata retry lanes are cleared.',
    next_action: 'Find additional exact source mappings or payload evidence before another metadata package.',
    write_ready_now: false,
  },
  {
    lane: 'child_display_image',
    rows: identity.totals?.child_display_image_gap_rows_deferred ?? 0,
    status: 'explicitly_deferred',
    reason: 'Deferred by scope; do not mix image cleanup with row enrichment.',
    next_action: 'Resume Image Truth separately.',
    write_ready_now: false,
  },
];

const report = {
  version: 'CARD_ROW_ENRICHMENT_REMAINING_BLOCKER_RESOLUTION_PLAN_V1',
  generated_at: new Date().toISOString(),
  mode: 'read_only_report_only',
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  summary: {
    write_ready_packages_now: blockerLanes.filter((lane) => lane.write_ready_now).length,
    remaining_blocker_lanes: blockerLanes.length,
    next_best_work: 'governance_adjudication_for_core_identity_and_external_mapping_collisions',
  },
  blocker_lanes: blockerLanes,
  source_snapshots: {
    cleanup_totals: cleanup.totals,
    core_identity_summary: core.summary,
    external_mapping_readiness_totals: externalReadiness.totals,
    external_mapping_adjudication_summary: externalAdjudication.summary,
    residual_source_totals: residual.totals,
    no_child_parent_summary: noChild.summary,
    active_identity_classifications: countRowsBy(activeRows, 'classification'),
    active_identity_blockers: countBlockers(activeRows),
    parent_gv_classifications: countRowsBy(parentGvRows, 'classification'),
    parent_gv_blockers: countBlockers(parentGvRows),
    child_gv_classifications: countRowsBy(childGvRows, 'classification'),
    child_gv_blockers: countBlockers(childGvRows),
  },
};

report.fingerprint_sha256 = sha256(stableJson({
  blocker_lanes: report.blocker_lanes,
  source_snapshots: report.source_snapshots,
}));

await writeJson(OUTPUT_JSON, report);

const md = [
  '# Card Row Enrichment Remaining Blocker Resolution Plan V1',
  '',
  'Consolidated read-only plan for the enrichment rows that remain after the current guarded apply sequence.',
  '',
  '## Safety',
  '',
  '- DB writes performed: false',
  '- Migrations created: false',
  '- Cleanup performed: false',
  '- This report is not apply authority.',
  '',
  '## Summary',
  '',
  `- Write-ready packages now: ${report.summary.write_ready_packages_now}`,
  `- Remaining blocker lanes: ${report.summary.remaining_blocker_lanes}`,
  `- Next best work: \`${report.summary.next_best_work}\``,
  '',
  '## Blocker Lanes',
  '',
  table(blockerLanes, [
    { label: 'lane', value: (row) => row.lane },
    { label: 'rows', value: (row) => row.rows },
    { label: 'status', value: (row) => row.status },
    { label: 'write_ready_now', value: (row) => row.write_ready_now },
    { label: 'next_action', value: (row) => row.next_action },
  ]),
  '',
  '## Key Blocker Counts',
  '',
  `- Core identity classifications: \`${JSON.stringify(core.summary?.by_classification ?? {})}\``,
  `- External payload readiness: \`${JSON.stringify(externalReadiness.by_readiness_status ?? {})}\``,
  `- No-child parent classifications: \`${JSON.stringify(noChild.summary?.by_adjudication_classification ?? {})}\``,
  `- Active identity blockers: \`${JSON.stringify(report.source_snapshots.active_identity_blockers)}\``,
  `- Parent GV-ID blockers: \`${JSON.stringify(report.source_snapshots.parent_gv_blockers)}\``,
  `- Child GV-ID blockers: \`${JSON.stringify(report.source_snapshots.child_gv_blockers)}\``,
  '',
  '## Conclusion',
  '',
  'No guarded write package is currently ready. The next phase should be governance/adjudication work, not another apply attempt.',
  '',
  `Fingerprint: \`${report.fingerprint_sha256}\``,
  '',
].join('\n');

await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
}, null, 2));

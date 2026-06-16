import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const CLEANUP_PLAN_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_cleanup_plan_v1.json');
const STATUS_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_status_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'card_row_identity_provenance_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'card_row_identity_provenance_plan_v1.md');

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function countValue(object, key, fallback = 0) {
  const value = object?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function summarizeBucket(bucket) {
  return {
    total: countValue(bucket, 'total'),
    by_classification: bucket?.by_classification ?? {},
    by_blocker: bucket?.by_blocker ?? {},
    by_set_top_25: bucket?.by_set_top_25 ?? {},
    samples: bucket?.samples ?? [],
  };
}

function topEntries(object, limit = 10) {
  return Object.entries(object ?? {})
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

function classifyReadiness(readyCount, candidateCount, blockers) {
  if (readyCount > 0) return 'write_ready_after_guarded_dry_run';
  if (candidateCount > 0) return 'blocked_no_write_ready_rows';
  if (Object.keys(blockers ?? {}).length > 0) return 'blocked_no_candidates';
  return 'not_applicable';
}

async function main() {
  const cleanup = await readJson(CLEANUP_PLAN_JSON);
  const status = await readJson(STATUS_JSON);

  const parentGv = summarizeBucket(cleanup.deterministic_ready_buckets?.parent_gv_id);
  const childGv = summarizeBucket(cleanup.deterministic_ready_buckets?.child_printing_gv_id);
  const activeIdentity = summarizeBucket(cleanup.deterministic_ready_buckets?.active_identity);
  const coreIdentity = summarizeBucket(cleanup.blocked_or_source_needed_buckets?.core_identity);

  const totals = {
    english_physical_parent_rows: cleanup.totals?.english_physical_parent_rows ?? status.english_physical_parent_rows,
    english_physical_child_printing_rows: status.english_physical_child_printing_rows,
    parent_gv_id_candidates: cleanup.totals?.parent_gv_id_candidates ?? parentGv.total,
    parent_gv_id_ready: cleanup.totals?.parent_gv_id_ready ?? 0,
    child_printing_gv_id_candidates: cleanup.totals?.child_printing_gv_id_candidates ?? childGv.total,
    child_printing_gv_id_ready: cleanup.totals?.child_printing_gv_id_ready ?? 0,
    active_identity_candidates: cleanup.totals?.active_identity_candidates ?? activeIdentity.total,
    active_identity_ready: cleanup.totals?.active_identity_ready ?? 0,
    core_identity_gap_rows: cleanup.totals?.core_identity_gap_rows ?? coreIdentity.total,
    child_provenance_gap_rows: status.english_physical_child_gap_counts?.provenance ?? 0,
    child_display_image_gap_rows_deferred: status.english_physical_child_gap_counts?.display_image ?? 0,
  };

  const lanes = [
    {
      lane: 'parent_gv_id',
      status: classifyReadiness(totals.parent_gv_id_ready, totals.parent_gv_id_candidates, parentGv.by_blocker),
      candidate_rows: totals.parent_gv_id_candidates,
      ready_rows: totals.parent_gv_id_ready,
      blockers: parentGv.by_blocker,
      next_action: 'Resolve missing parent set_code/number and adjudicate proposed GV-ID collisions before another apply package.',
      write_scope_if_later_approved: ['card_prints.gv_id'],
    },
    {
      lane: 'child_printing_gv_id',
      status: classifyReadiness(totals.child_printing_gv_id_ready, totals.child_printing_gv_id_candidates, childGv.by_blocker),
      candidate_rows: totals.child_printing_gv_id_candidates,
      ready_rows: totals.child_printing_gv_id_ready,
      blockers: childGv.by_blocker,
      next_action: 'Blocked behind parent gv_id. Do not backfill printing_gv_id until parent gv_id is stable.',
      write_scope_if_later_approved: ['card_printings.printing_gv_id'],
    },
    {
      lane: 'active_identity',
      status: classifyReadiness(totals.active_identity_ready, totals.active_identity_candidates, activeIdentity.by_blocker),
      candidate_rows: totals.active_identity_candidates,
      ready_rows: totals.active_identity_ready,
      blockers: activeIdentity.by_blocker,
      next_action: 'Resolve projection blockers and identity hash duplicates before inserting active identities.',
      write_scope_if_later_approved: ['card_print_identity inserts'],
    },
    {
      lane: 'core_identity',
      status: 'blocked_source_or_set_resolution_required',
      candidate_rows: totals.core_identity_gap_rows,
      ready_rows: 0,
      blockers: coreIdentity.by_blocker,
      next_action: 'Resolve set_code/number identity for unresolved English physical rows. This is upstream of GV-ID and external mapping cleanup.',
      write_scope_if_later_approved: ['card_prints set_code/number identity fields only after source proof'],
    },
    {
      lane: 'child_provenance',
      status: 'deferred_enrichment_not_canon_blocker',
      candidate_rows: totals.child_provenance_gap_rows,
      ready_rows: 0,
      blockers: { provenance_source_policy_needed: totals.child_provenance_gap_rows },
      next_action: 'Define provenance source policy separately. Missing provenance does not mean the reconciled printing is wrong.',
      write_scope_if_later_approved: ['card_printings provenance metadata only after source policy'],
    },
    {
      lane: 'child_display_image',
      status: 'explicitly_deferred_by_current_scope',
      candidate_rows: totals.child_display_image_gap_rows_deferred,
      ready_rows: 0,
      blockers: { deferred_child_image_printing_work: totals.child_display_image_gap_rows_deferred },
      next_action: 'Skip for this cleanup pass per current scope.',
      write_scope_if_later_approved: [],
    },
  ];

  const plan = {
    version: 'CARD_ROW_IDENTITY_PROVENANCE_PLAN_V1',
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    child_image_printing_work_deferred: true,
    source_artifacts: {
      cleanup_plan_json: CLEANUP_PLAN_JSON,
      cleanup_plan_fingerprint_sha256: cleanup.fingerprint_sha256 ?? null,
      status_json: STATUS_JSON,
      status_fingerprint: status.fingerprint ?? null,
    },
    totals,
    lanes,
    dependency_order: [
      'core_identity',
      'parent_gv_id',
      'child_printing_gv_id',
      'active_identity',
      'external_mapping',
      'traits_species_catalog_metadata',
      'child_provenance',
      'child_display_image_deferred',
    ],
    decisions: [
      'printing_gv_id backfill is blocked until parent gv_id is stable.',
      'parent gv_id backfill is blocked when parent set_code/number is missing or the proposed gv_id collides.',
      'active identity inserts are blocked when the projection is not ready or identity hashes duplicate.',
      'child provenance is enrichment metadata, not evidence that the canonical printing is wrong.',
      'child display image cleanup remains deferred in this pass.',
    ],
    recommended_next_step: {
      package_id: 'ENRICH-13-CORE-IDENTITY-SET-CODE-RESOLUTION-READINESS',
      mode: 'audit_only_readiness',
      reason: 'Core identity is the upstream blocker for parent gv_id, child printing_gv_id, and some active identity residuals.',
      writes_authorized: false,
    },
  };

  plan.fingerprint_sha256 = sha256(stableJson({
    version: plan.version,
    generated_at: plan.generated_at,
    totals: plan.totals,
    lanes: plan.lanes.map((lane) => ({
      lane: lane.lane,
      status: lane.status,
      candidate_rows: lane.candidate_rows,
      ready_rows: lane.ready_rows,
      blockers: lane.blockers,
    })),
    recommended_next_step: plan.recommended_next_step,
  }));

  const laneRows = lanes.map((lane) => ({
    lane: lane.lane,
    status: lane.status,
    candidates: lane.candidate_rows,
    ready: lane.ready_rows,
    top_blockers: topEntries(lane.blockers, 3).map((entry) => `${entry.key}=${entry.value}`).join(', '),
    next_action: lane.next_action,
  }));

  const md = [
    '# Card Row Identity Provenance Plan V1',
    '',
    'Read-only readiness plan for the remaining identity, GV-ID, active identity, and provenance enrichment gaps.',
    '',
    '## Safety',
    '',
    '- DB writes performed: false',
    '- Migrations created: false',
    '- Cleanup performed: false',
    '- Child image printing work: deferred',
    '- This report is not apply authority.',
    '',
    '## Summary',
    '',
    markdownTable(Object.entries(totals).map(([metric, value]) => ({ metric, value })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Readiness Lanes',
    '',
    markdownTable(laneRows, [
      { label: 'lane', value: (row) => row.lane },
      { label: 'status', value: (row) => row.status },
      { label: 'candidates', value: (row) => row.candidates },
      { label: 'ready', value: (row) => row.ready },
      { label: 'top blockers', value: (row) => row.top_blockers },
    ]),
    '',
    '## Dependency Order',
    '',
    plan.dependency_order.map((item, index) => `${index + 1}. ${item}`).join('\n'),
    '',
    '## Decisions',
    '',
    plan.decisions.map((decision) => `- ${decision}`).join('\n'),
    '',
    '## Recommended Next Step',
    '',
    `Next report-only package: \`${plan.recommended_next_step.package_id}\`.`,
    '',
    plan.recommended_next_step.reason,
    '',
    `Fingerprint: \`${plan.fingerprint_sha256}\``,
    '',
  ].join('\n');

  await writeJson(OUTPUT_JSON, plan);
  await writeText(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    fingerprint_sha256: plan.fingerprint_sha256,
    totals,
    recommended_next_step: plan.recommended_next_step,
  }, null, 2));
}

await main();

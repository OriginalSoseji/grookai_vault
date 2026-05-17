import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const IN_PATH = path.join(
  ROOT,
  'docs',
  'plans',
  'pokemon_db_remediation_v1',
  'gv_id_generation_backfill_evidence_20260517.json',
);
const OUT_DIR = path.join(ROOT, 'docs', 'plans', 'pokemon_db_remediation_v1');
const POLICY_MD_PATH = path.join(OUT_DIR, 'gv_id_namespace_source_policy_20260517.md');
const POLICY_JSON_PATH = path.join(OUT_DIR, 'gv_id_namespace_source_policy_matrix_20260517.json');
const MEP_MD_PATH = path.join(OUT_DIR, 'gv_id_mep_collision_manual_pack_20260517.md');
const MEP_JSON_PATH = path.join(OUT_DIR, 'gv_id_mep_collision_manual_matrix_20260517.json');

const SET_POLICIES = {
  A3a: {
    decision: 'NOT_APPROVED_FOR_PUBLIC_GV_ID_BACKFILL',
    policy_class: 'SOURCE_DOMAIN_POLICY_BLOCKED',
    approved_for_future_write_plan: false,
    public_identity_verdict: 'Generated GV-PK-A3A-* IDs are not acceptable under current public physical identity rules.',
    namespace_verdict: 'Do not approve A3A as a public GV-ID namespace without a source-domain contract.',
    source_policy: 'TCGdex-only / pocket-style source lane is not enough to mint canonical public GV-PK identity.',
    route_policy: 'No stable gv_id, no public card route.',
    required_next: [
      'Classify source domain explicitly before any public identity work.',
      'Decide whether this source family belongs in physical Pokemon public vault/search.',
      'If included later, create a separate source-domain identity contract instead of treating builder output as approval.',
    ],
  },
  'P-A': {
    decision: 'NOT_APPROVED_FOR_PUBLIC_GV_ID_BACKFILL',
    policy_class: 'SOURCE_DOMAIN_POLICY_BLOCKED',
    approved_for_future_write_plan: false,
    public_identity_verdict: 'Generated GV-PK-P-A-* IDs are not acceptable under current public physical identity rules.',
    namespace_verdict: 'Do not approve P-A as a public GV-ID namespace without a source-domain contract.',
    source_policy: 'Live source evidence is TCGdex-only and includes tcgp path signals; treat as source-domain blocked, not physical canon.',
    route_policy: 'No stable gv_id, no public card route.',
    required_next: [
      'Classify source domain explicitly before any public identity work.',
      'Decide whether TCG Pocket promo-style rows belong in Grookai public card routes.',
      'If included later, create a separate source-domain identity contract instead of reusing physical public GV-PK rules.',
    ],
  },
  fut2020: {
    decision: 'NOT_APPROVED_YET_NAMESPACE_CONTRACT_REQUIRED',
    policy_class: 'PHYSICAL_SPECIAL_COLLECTION_REVIEW',
    approved_for_future_write_plan: false,
    public_identity_verdict: 'Pokemon Futsal 2020 appears eligible in principle, but GV-PK-FUT2020-* is not approved yet.',
    namespace_verdict: 'Require explicit FUT2020 namespace approval and printed-number token policy before any write plan.',
    source_policy: 'Physical/special collection lane; no same-set public namespace exists yet.',
    route_policy: 'No stable gv_id, no public card route until namespace approval.',
    required_next: [
      'Prove printed number token policy: 1-5 versus 001-005.',
      'Approve namespace token FUT2020 or another printed-set abbreviation.',
      'Regenerate collision evidence from live DB after approval and before a write plan.',
    ],
  },
};

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function countBy(rows, getKey) {
  const counts = new Map();
  for (const row of rows) {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function groupBy(rows, getKey) {
  const groups = new Map();
  for (const row of rows) {
    const key = getKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function renderTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

function compactRow(row) {
  return {
    card_print_id: row.card_print_id,
    name: row.name,
    number: row.number,
    number_plain: row.number_plain,
    proposed_gv_id: row.proposed_gv_id,
    set_code: row.set_code,
    set_name: row.set_name,
    namespace_token: row.namespace_decision?.set_token ?? null,
    image_url: row.image_url,
    active_identity_rows: row.active_identity_rows?.length ?? 0,
    external_mapping_count: row.external_mappings?.length ?? 0,
    warnings: row.warnings ?? [],
  };
}

function buildPolicyMatrix(source) {
  const policyRows = source.rows.filter((row) => row.status === 'POLICY_REVIEW');
  const groups = groupBy(policyRows, (row) => row.set_code);
  const set_decisions = [...groups.entries()].map(([setCode, rows]) => {
    const policy = SET_POLICIES[setCode];
    if (!policy) {
      throw new Error(`Missing set policy for ${setCode}`);
    }
    return {
      set_code: setCode,
      set_name: rows[0]?.set_name ?? null,
      row_count: rows.length,
      proposed_namespace_tokens: [...new Set(rows.map((row) => row.namespace_decision?.set_token).filter(Boolean))].sort(),
      sample_proposed_gv_ids: rows.slice(0, 8).map((row) => row.proposed_gv_id),
      source_signals: {
        printed_set_abbrev_present: rows.some((row) => Boolean(cleanText(row.printed_set_abbrev))),
        same_set_existing_gv_id_count: rows[0]?.same_set_existing_gv_id_count ?? 0,
        namespace_existing_gv_id_count: rows[0]?.namespace_existing_gv_id_count ?? 0,
        identity_domains: [...new Set(rows.map((row) => row.identity_domain).filter(Boolean))].sort(),
        warning_counts: countBy(rows.flatMap((row) => row.warnings ?? []), (value) => value),
      },
      ...policy,
      row_ids: rows.map((row) => row.card_print_id).sort(),
    };
  }).sort((left, right) => left.set_code.localeCompare(right.set_code));

  const row_decisions = policyRows
    .map((row) => ({
      ...compactRow(row),
      policy_class: SET_POLICIES[row.set_code].policy_class,
      decision: SET_POLICIES[row.set_code].decision,
      approved_for_future_write_plan: SET_POLICIES[row.set_code].approved_for_future_write_plan,
      route_policy: SET_POLICIES[row.set_code].route_policy,
    }))
    .sort((left, right) => left.set_code.localeCompare(right.set_code) || String(left.number_plain).localeCompare(String(right.number_plain), undefined, { numeric: true }));

  return {
    status: 'NO_WRITE_GV_ID_NAMESPACE_SOURCE_POLICY_DEFINED',
    generated_at: new Date().toISOString(),
    source_matrix: path.relative(ROOT, IN_PATH).replace(/\\/g, '/'),
    scope: {
      source_rows: policyRows.length,
      public_gate: 'no stable gv_id, no public card route',
      no_write: true,
    },
    summary: {
      total_policy_review_rows: policyRows.length,
      approved_for_future_write_plan_rows: row_decisions.filter((row) => row.approved_for_future_write_plan).length,
      not_approved_rows: row_decisions.filter((row) => !row.approved_for_future_write_plan).length,
      policy_class_counts: countBy(row_decisions, (row) => row.policy_class),
      decision_counts: countBy(row_decisions, (row) => row.decision),
      recommended_immediate_writes: 0,
    },
    set_decisions,
    row_decisions,
  };
}

function buildMepMatrix(source) {
  const rows = source.rows
    .filter((row) => row.set_code === 'mep' && row.status === 'BLOCKED')
    .sort((left, right) => Number(left.number_plain ?? left.number) - Number(right.number_plain ?? right.number));

  return {
    status: 'NO_WRITE_MEP_COLLISION_MANUAL_PACK',
    generated_at: new Date().toISOString(),
    source_matrix: path.relative(ROOT, IN_PATH).replace(/\\/g, '/'),
    scope: {
      set_code: 'mep',
      set_name: rows[0]?.set_name ?? 'MEP Black Star Promos',
      row_count: rows.length,
      no_write: true,
    },
    summary: {
      blocked_rows: rows.length,
      duplicate_public_owner_rows: rows.filter((row) => row.semantic_duplicate_public_owners?.length > 0).length,
      padding_convention_collision_rows: rows.filter((row) => row.padding_collision_owners?.length > 0).length,
      recommended_gv_id_writes: 0,
      recommended_next_mode: 'DUPLICATE_RESOLUTION_DESIGN_ONLY',
    },
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      missing_row_name: row.name,
      missing_row_number: row.number,
      missing_row_number_plain: row.number_plain,
      generated_but_rejected_gv_id: row.proposed_gv_id,
      blockers: row.blockers,
      semantic_duplicate_public_owner: row.semantic_duplicate_public_owners?.[0] ?? null,
      padding_collision_owner: row.padding_collision_owners?.[0] ?? null,
      reference_summary: row.reference_summary,
      external_mappings: row.external_mappings,
      active_identity_rows: row.active_identity_rows,
      manual_decision_required: 'Choose duplicate survivor and preservation path; do not mint a second public gv_id.',
    })),
    required_future_design: [
      'Select canonical survivor per printed card.',
      'Preserve existing public MEP gv_id owners unless proven wrong.',
      'Move or preserve mappings/references only after FK/reference audit.',
      'No deletes until duplicate reference migration is proven.',
      'Do not assign unpadded GV-PK-MEP-1 style IDs while padded GV-PK-MEP-001 public owners exist.',
    ],
  };
}

function renderPolicyMarkdown(matrix) {
  const lines = [];
  lines.push('# GV-ID Namespace / Source Policy - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write policy decision for the 208 Lane A rows that had collision-free generated `gv_id` candidates but no approved namespace/source policy. This document does not authorize Supabase writes, migrations, generated ID backfills, public route exposure, public view loosening, card movement, set changes, missing-card backfill, image work, or variant work.');
  lines.push('');
  lines.push('## Public Gate');
  lines.push('');
  lines.push('The public web gate remains strict: no stable approved `gv_id`, no public `/card/[gv_id]` route. Builder output is evidence, not approval.');
  lines.push('');
  lines.push('## Policy Summary');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Policy-review rows', matrix.summary.total_policy_review_rows],
      ['Approved for future write plan', matrix.summary.approved_for_future_write_plan_rows],
      ['Not approved', matrix.summary.not_approved_rows],
      ['Recommended immediate writes', matrix.summary.recommended_immediate_writes],
    ],
  ));
  lines.push('');
  lines.push('## Set Decisions');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Rows', 'Namespace', 'Decision', 'Class', 'Approved', 'Verdict'],
    matrix.set_decisions.map((row) => [
      row.set_code,
      row.row_count,
      row.proposed_namespace_tokens.join(', '),
      row.decision,
      row.policy_class,
      row.approved_for_future_write_plan,
      row.public_identity_verdict,
    ]),
  ));
  lines.push('');
  lines.push('## Decisions');
  lines.push('');
  lines.push('- `A3a` and `P-A`: do not mint public `GV-PK-*` identities under the current physical public identity rules. Treat as source-domain policy blocked until the source family is explicitly classified and a separate inclusion contract exists.');
  lines.push('- `fut2020`: physical/special collection appears eligible in principle, but the namespace and printed-number token are not approved. Do not write `GV-PK-FUT2020-*` until a namespace contract decides `FUT2020` and `1-5` versus `001-005`.');
  lines.push('- The generated IDs stay useful as evidence only. They must not be written without a future regenerated matrix and explicit approval.');
  lines.push('');
  lines.push('## Required Next Gates');
  lines.push('');
  lines.push('- Keep `A3a` and `P-A` out of public card routes unless a future source-domain contract explicitly includes them.');
  lines.push('- For `fut2020`, create a namespace-token and printed-number-token contract before drafting any write plan.');
  lines.push('- Regenerate live evidence before any future write-plan candidate.');
  lines.push('- Future writes, if separately approved, must update only `card_prints.gv_id` and must not loosen public web gates.');
  lines.push('');
  lines.push('## Confirmation');
  lines.push('');
  lines.push('- Supabase writes: none.');
  lines.push('- Migrations: none.');
  lines.push('- Data changes: none.');
  lines.push('- Public web gates loosened: no.');
  return `${lines.join('\n')}\n`;
}

function renderMepMarkdown(matrix) {
  const lines = [];
  lines.push('# MEP GV-ID Collision Manual Pack - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write manual evidence pack for the 10 `mep` rows blocked by duplicate public owners and padding-convention collisions. This document does not authorize Supabase writes, migrations, deletes, generated ID backfills, reference movement, card movement, or public route exposure.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Blocked rows', matrix.summary.blocked_rows],
      ['Duplicate public owner rows', matrix.summary.duplicate_public_owner_rows],
      ['Padding convention collision rows', matrix.summary.padding_convention_collision_rows],
      ['Recommended gv_id writes', matrix.summary.recommended_gv_id_writes],
    ],
  ));
  lines.push('');
  lines.push('## Collision Rows');
  lines.push('');
  lines.push(renderTable(
    ['Missing row', 'Number', 'Rejected generated ID', 'Existing public owner', 'Existing owner number'],
    matrix.rows.map((row) => [
      row.missing_row_name,
      row.missing_row_number,
      row.generated_but_rejected_gv_id,
      row.semantic_duplicate_public_owner?.gv_id ?? '',
      row.semantic_duplicate_public_owner?.number ?? '',
    ]),
  ));
  lines.push('');
  lines.push('## Manual Resolution Policy');
  lines.push('');
  lines.push('- Do not assign `GV-PK-MEP-1` through `GV-PK-MEP-10`; existing public owners already use padded `GV-PK-MEP-001` through `GV-PK-MEP-010`.');
  lines.push('- Treat these as duplicate-resolution candidates, not missing-GV-ID candidates.');
  lines.push('- Select canonical survivors by existing public `gv_id`, mappings, references, images, and active identity evidence.');
  lines.push('- No deletes until reference migration and rollback are separately proven.');
  lines.push('');
  lines.push('## Required Future Design');
  lines.push('');
  for (const item of matrix.required_future_design) {
    lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('## Confirmation');
  lines.push('');
  lines.push('- Supabase writes: none.');
  lines.push('- Migrations: none.');
  lines.push('- Data changes: none.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const source = JSON.parse(await fs.readFile(IN_PATH, 'utf8'));
  const policyMatrix = buildPolicyMatrix(source);
  const mepMatrix = buildMepMatrix(source);

  await fs.writeFile(POLICY_JSON_PATH, JSON.stringify(policyMatrix, null, 2) + '\n');
  await fs.writeFile(POLICY_MD_PATH, renderPolicyMarkdown(policyMatrix));
  await fs.writeFile(MEP_JSON_PATH, JSON.stringify(mepMatrix, null, 2) + '\n');
  await fs.writeFile(MEP_MD_PATH, renderMepMarkdown(mepMatrix));

  console.log(JSON.stringify({
    policy_status: policyMatrix.status,
    policy_rows: policyMatrix.summary.total_policy_review_rows,
    policy_approved_rows: policyMatrix.summary.approved_for_future_write_plan_rows,
    mep_status: mepMatrix.status,
    mep_rows: mepMatrix.summary.blocked_rows,
    recommended_immediate_writes: 0,
  }, null, 2));
}

await main();

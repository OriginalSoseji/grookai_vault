import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

import { buildCardPrintGvIdV1 } from '../../backend/warehouse/buildCardPrintGvIdV1.mjs';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const SOURCE_MATRIX_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'pokemon_post_lane_a_247_audit_20260517',
  'gv_id_public_coverage_matrix_20260517.json',
);
const OUT_DIR = path.join(ROOT, 'docs', 'plans', 'pokemon_db_remediation_v1');
const MATRIX_PATH = path.join(OUT_DIR, 'gv_id_generation_backfill_evidence_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'gv_id_generation_backfill_evidence_20260517.md');
const EXPECTED_MISSING_GV_ID_ROWS = 218;

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeNumberDigits(value) {
  const text = cleanText(value);
  if (!text) return null;
  const digits = text.replace(/\D/g, '').replace(/^0+/, '');
  return digits || '0';
}

function normalizeTextKey(value) {
  return cleanText(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function quoteRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function countBy(rows, getKey) {
  const counts = new Map();
  for (const row of rows) {
    const key = getKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
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

function loadMissingGvIdRows(sourceMatrix) {
  const rows = (sourceMatrix.rows ?? []).filter((row) => !cleanText(row.gv_id));
  if (rows.length !== EXPECTED_MISSING_GV_ID_ROWS) {
    throw new Error(`Expected ${EXPECTED_MISSING_GV_ID_ROWS} missing-gv_id rows, found ${rows.length}.`);
  }

  return rows.map((row) => ({
    card_print_id: row.card_print_id,
    source_set_code: row.set_code ?? row.execution_set_code,
    source_set_name: row.set_name ?? row.execution_set_name,
    source_name: row.name,
    source_number: row.number,
    source_number_plain: row.number_plain,
  }));
}

async function loadLiveRows(client, sourceRows) {
  const { rows } = await client.query(
    `
      with expected as (
        select *
        from jsonb_to_recordset($1::jsonb) as e(
          card_print_id uuid,
          source_set_code text,
          source_set_name text,
          source_name text,
          source_number text,
          source_number_plain text
        )
      )
      select
        e.card_print_id::text,
        e.source_set_code,
        e.source_set_name,
        e.source_name,
        e.source_number,
        e.source_number_plain,
        cp.id::text as live_card_print_id,
        cp.gv_id,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.image_url,
        cp.representative_image_url,
        cp.image_status,
        cp.set_code as card_print_set_code,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.identity_domain,
        s.id::text as set_id,
        s.code as set_code,
        s.name as set_name,
        s.printed_set_abbrev,
        s.printed_total,
        s.release_date,
        s.identity_model as set_identity_model,
        coalesce(ident.active_identity_rows, '[]'::jsonb) as active_identity_rows,
        coalesce(map.external_mappings, '[]'::jsonb) as external_mappings,
        coalesce(ref.reference_summary, '{}'::jsonb) as reference_summary
      from expected e
      left join public.card_prints cp
        on cp.id = e.card_print_id
      left join public.sets s
        on s.id = cp.set_id
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', cpi.id,
            'identity_domain', cpi.identity_domain,
            'set_code_identity', cpi.set_code_identity,
            'printed_number', cpi.printed_number,
            'identity_key_version', cpi.identity_key_version,
            'identity_key_hash', cpi.identity_key_hash
          )
          order by cpi.created_at, cpi.id
        ) as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id = cp.id
          and cpi.is_active = true
      ) ident on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'source', em.source,
            'external_id', em.external_id,
            'active', em.active
          )
          order by em.source, em.external_id
        ) as external_mappings
        from public.external_mappings em
        where em.card_print_id = cp.id
      ) map on true
      left join lateral (
        select jsonb_build_object(
          'vault_items', (select count(*)::int from public.vault_items vi where vi.card_id = cp.id),
          'vault_item_instances', (select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id),
          'pricing_watch', (select count(*)::int from public.pricing_watch pw where pw.card_print_id = cp.id),
          'justtcg_variants', (select count(*)::int from public.justtcg_variants jv where jv.card_print_id = cp.id)
        ) as reference_summary
      ) ref on true
      order by lower(coalesce(s.code, e.source_set_code)), cp.number_plain nulls last, cp.number nulls last, cp.name nulls last
    `,
    [JSON.stringify(sourceRows)],
  );

  return rows;
}

async function loadExistingContext(client, rows) {
  const setIds = [...new Set(rows.map((row) => row.set_id).filter(Boolean))];
  const namespaceTokens = [...new Set(rows.map((row) => row.namespace_decision?.set_token).filter(Boolean))];

  const { rows: sameSetRows } = await client.query(
    `
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.set_id::text,
        s.code as set_code,
        s.name as set_name
      from public.card_prints cp
      join public.sets s
        on s.id = cp.set_id
      where cp.set_id = any($1::uuid[])
        and cp.gv_id is not null
      order by s.code, cp.gv_id
    `,
    [setIds],
  );

  const namespaceRowsByToken = new Map();
  for (const token of namespaceTokens) {
    const prefix = `GV-PK-${token}-`;
    const { rows: namespaceRows } = await client.query(
      `
        select
          cp.id::text,
          cp.gv_id,
          cp.name,
          cp.number,
          cp.number_plain,
          cp.set_id::text,
          s.code as set_code,
          s.name as set_name
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
        where cp.gv_id like $1
        order by cp.gv_id
        limit 250
      `,
      [`${prefix}%`],
    );
    namespaceRowsByToken.set(token, namespaceRows);
  }

  const proposedGvIds = rows.map((row) => row.proposed_gv_id).filter(Boolean);
  const { rows: exactCollisionRows } = await client.query(
    `
      select id::text, gv_id, name, number, number_plain, set_id::text
      from public.card_prints
      where gv_id = any($1::text[])
      order by gv_id
    `,
    [proposedGvIds],
  );

  return {
    sameSetRows,
    namespaceRowsByToken,
    exactCollisionRows,
  };
}

function buildCandidate(row) {
  let namespaceDecision = null;
  try {
    const proposedGvId = buildCardPrintGvIdV1({
      setCode: row.card_print_set_code ?? row.set_code,
      printedSetAbbrev: row.printed_set_abbrev,
      number: row.number,
      numberPlain: row.number_plain,
      variantKey: row.variant_key,
      onNamespaceDecision(decision) {
        namespaceDecision = decision;
      },
    });
    return {
      proposed_gv_id: proposedGvId,
      namespace_decision: namespaceDecision,
      builder_status: 'PASS',
      builder_error: null,
    };
  } catch (error) {
    return {
      proposed_gv_id: null,
      namespace_decision: namespaceDecision,
      builder_status: 'FAIL',
      builder_error: error instanceof Error ? error.message : 'unknown_builder_error',
    };
  }
}

function findSemanticDuplicateOwners(row, sameSetRows) {
  const nameKey = normalizeTextKey(row.name);
  const numberKey = normalizeNumberDigits(row.number_plain ?? row.number);
  if (!nameKey || !numberKey) return [];

  return sameSetRows.filter((candidate) => {
    if (candidate.id === row.card_print_id) return false;
    if (!candidate.gv_id) return false;
    return (
      normalizeTextKey(candidate.name) === nameKey &&
      normalizeNumberDigits(candidate.number_plain ?? candidate.number) === numberKey
    );
  });
}

function findPaddingCollision(row, namespaceRows) {
  const token = row.namespace_decision?.set_token;
  const proposed = row.proposed_gv_id;
  if (!token || !proposed) return null;

  const numberKey = normalizeNumberDigits(row.number_plain ?? row.number);
  if (!numberKey) return null;

  const prefixPattern = new RegExp(`^GV-PK-${quoteRegexLiteral(token)}-([0-9]+)$`, 'i');
  const matches = namespaceRows
    .map((candidate) => {
      const match = candidate.gv_id?.match(prefixPattern);
      if (!match) return null;
      return {
        ...candidate,
        numeric_token: match[1],
        numeric_key: normalizeNumberDigits(match[1]),
      };
    })
    .filter(Boolean)
    .filter((candidate) => candidate.numeric_key === numberKey);

  return matches.length > 0 ? matches : null;
}

function classifyRow(row) {
  const blockers = [];
  const warnings = [];

  if (row.builder_status !== 'PASS') {
    blockers.push('BUILDER_FAILED');
  }
  if (row.exact_collision_owner) {
    blockers.push('EXACT_GV_ID_COLLISION');
  }
  if (row.semantic_duplicate_public_owners.length > 0) {
    blockers.push('DUPLICATE_PUBLIC_OWNER');
  }
  if (row.padding_collision_owners.length > 0) {
    blockers.push('PADDING_CONVENTION_COLLISION');
  }
  if (!row.same_set_existing_gv_id_count && !row.namespace_existing_gv_id_count) {
    warnings.push('NEW_NAMESPACE_NO_EXISTING_PUBLIC_GV_ID_PATTERN');
  }
  if (!row.active_identity_rows.length) {
    warnings.push('NO_ACTIVE_CARD_PRINT_IDENTITY');
  }
  if (!row.image_url) {
    warnings.push('MISSING_IMAGE_URL');
  }
  if (row.card_print_set_code !== row.set_code) {
    warnings.push('CARD_PRINT_SET_CODE_NOT_DISPLAY_AUTHORITY');
  }

  if (blockers.length > 0) {
    return {
      status: 'BLOCKED',
      blockers,
      warnings,
      recommended_action: 'Do not backfill gv_id. Resolve duplicate/padding/public-owner evidence first.',
    };
  }

  if (warnings.includes('NEW_NAMESPACE_NO_EXISTING_PUBLIC_GV_ID_PATTERN')) {
    return {
      status: 'POLICY_REVIEW',
      blockers,
      warnings,
      recommended_action: 'Do not backfill yet. Approve namespace policy and source-domain inclusion first.',
    };
  }

  return {
    status: 'CANDIDATE_COLLISION_FREE_REVIEW',
    blockers,
    warnings,
    recommended_action: 'Candidate is collision-free by live evidence but still requires explicit write-plan authorization.',
  };
}

function withEvidence(liveRows, context) {
  const sameSetRowsBySetId = groupBy(context.sameSetRows, (row) => row.set_id);
  const exactCollisionByGvId = new Map(context.exactCollisionRows.map((row) => [row.gv_id, row]));

  return liveRows.map((liveRow) => {
    const candidate = buildCandidate(liveRow);
    return {
      ...liveRow,
      ...candidate,
    };
  }).map((row) => {
    const sameSetRows = sameSetRowsBySetId.get(row.set_id) ?? [];
    const namespaceRows = context.namespaceRowsByToken.get(row.namespace_decision?.set_token) ?? [];
    const exactCollisionOwner = row.proposed_gv_id ? exactCollisionByGvId.get(row.proposed_gv_id) ?? null : null;
    const semanticDuplicateOwners = findSemanticDuplicateOwners(row, sameSetRows);
    const paddingCollisionOwners = findPaddingCollision(row, namespaceRows) ?? [];
    const rowWithEvidence = {
      card_print_id: row.card_print_id,
      current_gv_id: cleanText(row.gv_id),
      name: cleanText(row.name),
      number: cleanText(row.number),
      number_plain: cleanText(row.number_plain),
      set_id: cleanText(row.set_id),
      set_code: cleanText(row.set_code),
      set_name: cleanText(row.set_name),
      printed_set_abbrev: cleanText(row.printed_set_abbrev),
      card_print_set_code: cleanText(row.card_print_set_code),
      variant_key: cleanText(row.variant_key),
      printed_identity_modifier: cleanText(row.printed_identity_modifier),
      identity_domain: cleanText(row.identity_domain),
      set_identity_model: cleanText(row.set_identity_model),
      image_url: cleanText(row.image_url),
      representative_image_url: cleanText(row.representative_image_url),
      image_status: cleanText(row.image_status),
      active_identity_rows: Array.isArray(row.active_identity_rows) ? row.active_identity_rows : [],
      external_mappings: Array.isArray(row.external_mappings) ? row.external_mappings : [],
      reference_summary: row.reference_summary ?? {},
      proposed_gv_id: row.proposed_gv_id,
      namespace_decision: row.namespace_decision,
      builder_status: row.builder_status,
      builder_error: row.builder_error,
      exact_collision_owner: exactCollisionOwner,
      semantic_duplicate_public_owners: semanticDuplicateOwners.map((owner) => ({
        card_print_id: owner.id,
        gv_id: owner.gv_id,
        name: owner.name,
        number: owner.number,
        number_plain: owner.number_plain,
      })),
      padding_collision_owners: paddingCollisionOwners.map((owner) => ({
        card_print_id: owner.id,
        gv_id: owner.gv_id,
        name: owner.name,
        number: owner.number,
        number_plain: owner.number_plain,
        numeric_token: owner.numeric_token,
      })),
      same_set_existing_gv_id_count: sameSetRows.length,
      same_set_existing_gv_id_samples: sameSetRows.slice(0, 10).map((sample) => ({
        card_print_id: sample.id,
        gv_id: sample.gv_id,
        name: sample.name,
        number: sample.number,
        number_plain: sample.number_plain,
      })),
      namespace_existing_gv_id_count: namespaceRows.length,
      namespace_existing_gv_id_samples: namespaceRows.slice(0, 10).map((sample) => ({
        card_print_id: sample.id,
        gv_id: sample.gv_id,
        set_code: sample.set_code,
        name: sample.name,
        number: sample.number,
        number_plain: sample.number_plain,
      })),
      public_gate: 'NO_STABLE_GV_ID_NO_PUBLIC_CARD_ROUTE',
    };
    return {
      ...rowWithEvidence,
      ...classifyRow(rowWithEvidence),
    };
  });
}

function summarizeRows(rows) {
  const statusCounts = Object.fromEntries([...countBy(rows, (row) => row.status).entries()].sort());
  const blockerCounts = {};
  const warningCounts = {};
  for (const row of rows) {
    for (const blocker of row.blockers) blockerCounts[blocker] = (blockerCounts[blocker] ?? 0) + 1;
    for (const warning of row.warnings) warningCounts[warning] = (warningCounts[warning] ?? 0) + 1;
  }

  return {
    total_missing_gv_id_rows: rows.length,
    builder_pass_rows: rows.filter((row) => row.builder_status === 'PASS').length,
    builder_failed_rows: rows.filter((row) => row.builder_status !== 'PASS').length,
    proposed_gv_id_distinct_count: new Set(rows.map((row) => row.proposed_gv_id).filter(Boolean)).size,
    internal_proposed_gv_id_duplicates: rows.length - new Set(rows.map((row) => row.proposed_gv_id).filter(Boolean)).size,
    exact_gv_id_collision_rows: rows.filter((row) => row.exact_collision_owner).length,
    semantic_duplicate_public_owner_rows: rows.filter((row) => row.semantic_duplicate_public_owners.length > 0).length,
    padding_convention_collision_rows: rows.filter((row) => row.padding_collision_owners.length > 0).length,
    policy_review_rows: rows.filter((row) => row.status === 'POLICY_REVIEW').length,
    blocked_rows: rows.filter((row) => row.status === 'BLOCKED').length,
    collision_free_but_not_authorized_rows: rows.filter((row) => row.status === 'POLICY_REVIEW' || row.status === 'CANDIDATE_COLLISION_FREE_REVIEW').length,
    recommended_immediate_writes: 0,
    status_counts: statusCounts,
    blocker_counts: Object.fromEntries(Object.entries(blockerCounts).sort()),
    warning_counts: Object.fromEntries(Object.entries(warningCounts).sort()),
  };
}

function buildSetBreakdown(rows) {
  return [...groupBy(rows, (row) => row.set_code ?? 'unknown').entries()]
    .map(([setCode, setRows]) => {
      const summary = summarizeRows(setRows);
      const namespaceTokens = [...new Set(setRows.map((row) => row.namespace_decision?.set_token).filter(Boolean))].sort();
      return {
        set_code: setCode,
        set_name: setRows[0]?.set_name ?? null,
        rows: setRows.length,
        proposed_namespace_tokens: namespaceTokens,
        builder_pass_rows: summary.builder_pass_rows,
        blocked_rows: summary.blocked_rows,
        policy_review_rows: summary.policy_review_rows,
        exact_gv_id_collision_rows: summary.exact_gv_id_collision_rows,
        semantic_duplicate_public_owner_rows: summary.semantic_duplicate_public_owner_rows,
        padding_convention_collision_rows: summary.padding_convention_collision_rows,
        same_set_existing_gv_id_count: setRows[0]?.same_set_existing_gv_id_count ?? 0,
        namespace_existing_gv_id_count: setRows[0]?.namespace_existing_gv_id_count ?? 0,
        representative_proposed_gv_ids: setRows.slice(0, 5).map((row) => row.proposed_gv_id),
        recommended_action:
          summary.blocked_rows > 0
            ? 'Do not backfill; resolve duplicate public-owner/padding evidence first.'
            : 'Do not backfill yet; approve namespace/source-domain policy first.',
      };
    })
    .sort((left, right) => left.set_code.localeCompare(right.set_code));
}

function renderMarkdown(matrix) {
  const lines = [];
  const counts = matrix.counts;

  lines.push('# GV-ID Generation Backfill Evidence - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write evidence pack for the 218 Lane A rows that still lack public `gv_id`. This is not a write plan and authorizes no Supabase writes, migrations, inserts, updates, deletes, generated ID backfill execution, public view rewrites, deploys, card movement, set changes, missing-card backfill, or variant changes.');
  lines.push('');
  lines.push('## Product Gate');
  lines.push('');
  lines.push('The public web gate stays strict: no stable `gv_id`, no public `/card/[gv_id]` route. This evidence pack does not recommend loosening public queries or exposing rows without stable IDs.');
  lines.push('');
  lines.push('## Source Evidence');
  lines.push('');
  lines.push('- `docs/audits/pokemon_post_lane_a_247_audit_20260517/gv_id_public_coverage_matrix_20260517.json`');
  lines.push('- `backend/warehouse/buildCardPrintGvIdV1.mjs`');
  lines.push('- Live Supabase read-only transaction for collision, duplicate-owner, namespace, identity, mapping, and reference evidence.');
  lines.push('');
  lines.push('## Headline Counts');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Rows audited', counts.total_missing_gv_id_rows],
      ['Builder produced candidate', counts.builder_pass_rows],
      ['Builder failed', counts.builder_failed_rows],
      ['Distinct proposed gv_id values', counts.proposed_gv_id_distinct_count],
      ['Internal proposed gv_id duplicates', counts.internal_proposed_gv_id_duplicates],
      ['Exact live gv_id collisions', counts.exact_gv_id_collision_rows],
      ['Semantic duplicate public-owner rows', counts.semantic_duplicate_public_owner_rows],
      ['Padding convention collision rows', counts.padding_convention_collision_rows],
      ['Namespace/source policy review rows', counts.policy_review_rows],
      ['Blocked rows', counts.blocked_rows],
      ['Recommended immediate writes', counts.recommended_immediate_writes],
    ],
  ));
  lines.push('');
  lines.push('## Set Breakdown');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Name', 'Rows', 'Namespace', 'Status', 'Duplicate owners', 'Padding collisions', 'Existing set GV IDs', 'Action'],
    matrix.set_breakdown.map((row) => [
      row.set_code,
      row.set_name,
      row.rows,
      row.proposed_namespace_tokens.join(', '),
      row.blocked_rows > 0 ? 'BLOCKED' : 'POLICY_REVIEW',
      row.semantic_duplicate_public_owner_rows,
      row.padding_convention_collision_rows,
      row.same_set_existing_gv_id_count,
      row.recommended_action,
    ]),
  ));
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  lines.push('- `mep` is not a simple missing-`gv_id` lane. The 10 missing rows duplicate existing public MEP rows that already own padded `GV-PK-MEP-001` through `GV-PK-MEP-010`; those rows need duplicate-resolution design, not ID minting.');
  lines.push('- `A3a`, `P-A`, and `fut2020` have collision-free candidate strings from the current builder, but no established same-set public GV-ID pattern. They require namespace/source-domain policy approval before any write plan.');
  lines.push('- The existing public gate is correct: rows without `gv_id` should remain absent from `/card/[gv_id]` routes until stable IDs are explicitly approved and assigned.');
  lines.push('');
  lines.push('## Candidate Policy');
  lines.push('');
  lines.push('Candidate strings in the JSON matrix are evidence only. They are not approved IDs. A future write plan must prove exact candidate equality against a freshly regenerated matrix, prove zero live drift, prove no semantic duplicate public owners, and explicitly choose namespace policy for each included set.');
  lines.push('');
  lines.push('## Required Future Gates');
  lines.push('');
  lines.push('- Regenerate this matrix from live DB immediately before any future write plan.');
  lines.push('- Exclude all `BLOCKED` rows.');
  lines.push('- Require explicit namespace approval for `A3a`, `P-A`, and `fut2020` before they can move from policy review to write-plan candidate.');
  lines.push('- Resolve `mep` duplicate ownership before any `mep` GV-ID backfill is considered.');
  lines.push('- Verify proposed `gv_id` values are exact-match collision-free and semantically collision-free after padding/number normalization.');
  lines.push('- Update only `card_prints.gv_id` in any future approved transaction; do not touch routes, public view filters, card numbers, mappings, raw imports, sets, images, missing cards, or variants.');
  lines.push('- Post-verify exact changed row count, unique GV-ID ownership, public card route readiness, and no related table changes.');
  lines.push('');
  lines.push('## Confirmation');
  lines.push('');
  lines.push('- Supabase writes: none.');
  lines.push('- Migrations: none.');
  lines.push('- Data changes: none.');
  lines.push('- Public web gates loosened: no.');
  lines.push('- Deploy: none.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const sourceMatrix = JSON.parse(await fs.readFile(SOURCE_MATRIX_PATH, 'utf8'));
  const sourceRows = loadMissingGvIdRows(sourceMatrix);

  const client = new pg.Client({
    connectionString,
    application_name: 'gv_id_generation_backfill_evidence_v1:readonly',
    statement_timeout: 120000,
  });

  let liveRows;
  let context;
  await client.connect();
  try {
    await client.query('begin transaction read only');
    const rawLiveRows = await loadLiveRows(client, sourceRows);
    const withCandidates = rawLiveRows.map((row) => ({ ...row, ...buildCandidate(row) }));
    context = await loadExistingContext(client, withCandidates);
    liveRows = withEvidence(rawLiveRows, context);
    await client.query('rollback');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original error.
    }
    throw error;
  } finally {
    await client.end();
  }

  const counts = summarizeRows(liveRows);
  const matrix = {
    status: 'NO_WRITE_GV_ID_GENERATION_BACKFILL_EVIDENCE_ONLY',
    generated_at: new Date().toISOString(),
    source_matrix: path.relative(ROOT, SOURCE_MATRIX_PATH).replace(/\\/g, '/'),
    scope: {
      total_missing_gv_id_rows: EXPECTED_MISSING_GV_ID_ROWS,
      public_gate: 'no stable gv_id, no public card route',
      builder: 'backend/warehouse/buildCardPrintGvIdV1.mjs',
      no_write: true,
    },
    counts,
    set_breakdown: buildSetBreakdown(liveRows),
    rows: liveRows,
    future_write_boundary: {
      eligible_for_immediate_execution: false,
      reason: 'Evidence pack only. Namespace policy and duplicate-owner blockers must be resolved before any write plan.',
      allowed_future_column_if_separately_authorized: 'public.card_prints.gv_id',
      explicitly_out_of_scope: [
        'public route gate loosening',
        'public view filter loosening',
        'card number changes',
        'card movement',
        'set changes',
        'external mapping changes',
        'raw import changes',
        'image changes',
        'missing-card backfill',
        'variant changes',
      ],
    },
  };

  await fs.writeFile(MATRIX_PATH, JSON.stringify(matrix, null, 2) + '\n');
  await fs.writeFile(REPORT_PATH, renderMarkdown(matrix));

  console.log(JSON.stringify({
    status: matrix.status,
    rows: counts.total_missing_gv_id_rows,
    builder_pass_rows: counts.builder_pass_rows,
    blocked_rows: counts.blocked_rows,
    policy_review_rows: counts.policy_review_rows,
    recommended_immediate_writes: counts.recommended_immediate_writes,
  }, null, 2));
}

await main();

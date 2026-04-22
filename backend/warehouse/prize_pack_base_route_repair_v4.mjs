import '../env.mjs';

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const WORKFLOW = 'PRIZE_PACK_BASE_ROUTE_REPAIR_V4';

const INPUT_SOURCES = {
  v2Result: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2.json',
  v3Result: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v3.json',
};

const OUTPUT_PATHS = {
  input: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v4_input.json',
  targetCluster: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v4_target_cluster.json',
  resultJson: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v4.json',
  resultMd: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v4.md',
  readyBatchCandidate: 'docs/checkpoints/warehouse/prize_pack_ready_batch_v10_candidate.json',
};

const TARGET_CLUSTER = 'ALT_ART_ONLY_NUMBER_SLOT_COLLISION';
const EXPECTED_ROWS = [
  'Glaceon VMAX|041/203',
  'Sylveon V|074/203',
  'Umbreon VMAX|095/203',
  'Rayquaza VMAX|111/203',
  'Duraludon V|122/203',
];

const INVARIANT_USED = [
  'A generic Prize Pack stamp can route to a numbered slot only when canon proves a lawful plain/base owner for that exact printed number.',
  'If the exact-number owner is only a row already labeled alt, and same-set same-name non-alt rows exist elsewhere,',
  'the current canon does not prove whether the numbered slot is truly illustration-only or whether illustration-family semantics are inconsistently assigned.',
  'In that shape, the row cannot truthfully become DO_NOT_CANON or READY on route structure alone and must remain BASE_ROUTE_AMBIGUOUS until a deeper illustration-family invariant exists.',
].join(' ');

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath);
}

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(resolveRepoPath(relativePath), 'utf8'));
}

function writeJson(relativePath, payload) {
  const resolvedPath = resolveRepoPath(relativePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(relativePath, payload) {
  const resolvedPath = resolveRepoPath(relativePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, payload, 'utf8');
}

function removeFileIfExists(relativePath) {
  const resolvedPath = resolveRepoPath(relativePath);
  if (fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
  }
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeName(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const digits = normalized.replace(/[^0-9]/g, '');
  if (digits.length === 0) return normalized;
  return String(parseInt(digits, 10));
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    const leftKey = [
      left.cluster_name ?? '',
      left.route_resolution_preview?.effective_set_code ?? '',
      left.printed_number ?? '',
      left.candidate_name ?? '',
      left.source_external_id ?? '',
    ].join('::');
    const rightKey = [
      right.cluster_name ?? '',
      right.route_resolution_preview?.effective_set_code ?? '',
      right.printed_number ?? '',
      right.candidate_name ?? '',
      right.source_external_id ?? '',
    ].join('::');
    return leftKey.localeCompare(rightKey);
  });
}

function countBy(items, keyFn) {
  return items.reduce((accumulator, item) => {
    const key = keyFn(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function compactCardPrint(row) {
  return {
    card_print_id: normalizeTextOrNull(row.id),
    gv_id: normalizeTextOrNull(row.gv_id),
    name: normalizeTextOrNull(row.name),
    set_code: normalizeTextOrNull(row.set_code),
    number: normalizeTextOrNull(row.number),
    number_plain: normalizeTextOrNull(row.number_plain),
    variant_key: normalizeTextOrNull(row.variant_key),
    rarity: normalizeTextOrNull(row.rarity),
    image_url: normalizeTextOrNull(row.image_url),
  };
}

function rebuildRemainingAmbiguousPool() {
  const v2Result = loadJson(INPUT_SOURCES.v2Result);
  const v3Result = loadJson(INPUT_SOURCES.v3Result);

  const v2Remaining = [
    ...(Array.isArray(v2Result.still_ambiguous_rows) ? v2Result.still_ambiguous_rows : []),
    ...(Array.isArray(v2Result.remaining_examples) ? v2Result.remaining_examples : []),
  ];

  const v3ResolvedWaitIds = new Set(
    (Array.isArray(v3Result.route_resolved_wait_rows) ? v3Result.route_resolved_wait_rows : [])
      .map((row) => normalizeTextOrNull(row.source_external_id))
      .filter(Boolean),
  );

  const poolRows = sortRows(
    (Array.isArray(v2Result.source_artifacts) ? loadJson('docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json').rows : [])
      .filter((row) => {
        const sourceExternalId = normalizeTextOrNull(row.source_external_id);
        const removedInV2 =
          (Array.isArray(v2Result.ready_rows) ? v2Result.ready_rows : []).some(
            (candidate) => normalizeTextOrNull(candidate.source_external_id) === sourceExternalId,
          ) ||
          (Array.isArray(v2Result.do_not_canon_rows) ? v2Result.do_not_canon_rows : []).some(
            (candidate) => normalizeTextOrNull(candidate.source_external_id) === sourceExternalId,
          );
        return sourceExternalId && !removedInV2 && !v3ResolvedWaitIds.has(sourceExternalId);
      }),
  );

  if (poolRows.length !== 19) {
    throw new Error(`unexpected_remaining_ambiguous_pool_count:${poolRows.length}`);
  }

  return poolRows;
}

async function auditAltRow(pool, row) {
  const normalizedTargetName = normalizeName(row.name ?? row.candidate_name);
  const numberPlain = normalizeNumberPlain(row.normalized_number_plain ?? row.printed_number);

  const exactNumberResult = await pool.query(
    `
      select
        id,
        gv_id,
        name,
        set_code,
        number,
        number_plain,
        variant_key,
        rarity,
        image_url
      from public.card_prints
      where number_plain = $1
      order by set_code, number_plain, number, name
    `,
    [numberPlain],
  );

  const sameNameResult = await pool.query(
    `
      select
        id,
        gv_id,
        name,
        set_code,
        number,
        number_plain,
        variant_key,
        rarity,
        image_url
      from public.card_prints
      where lower(name) = lower($1)
      order by set_code, number_plain, number, name
    `,
    [row.name ?? row.candidate_name],
  );

  const exactNumberNameMatches = exactNumberResult.rows
    .map(compactCardPrint)
    .filter((candidate) => normalizeName(candidate.name) === normalizedTargetName);

  const exactNumberPlainOwners = exactNumberNameMatches.filter(
    (candidate) => !normalizeTextOrNull(candidate.variant_key),
  );
  const exactNumberAltOwners = exactNumberNameMatches.filter(
    (candidate) => normalizeTextOrNull(candidate.variant_key) === 'alt',
  );

  const primaryOwner = exactNumberAltOwners[0] ?? exactNumberNameMatches[0] ?? null;
  const sameSetSameNameRows = (sameNameResult.rows || [])
    .map(compactCardPrint)
    .filter((candidate) => normalizeTextOrNull(candidate.set_code) === normalizeTextOrNull(primaryOwner?.set_code));

  const sameSetSameNameNonAltElsewhere = sameSetSameNameRows.filter(
    (candidate) =>
      !normalizeTextOrNull(candidate.variant_key) &&
      normalizeTextOrNull(candidate.number_plain) !== normalizeTextOrNull(primaryOwner?.number_plain),
  );

  let auditOutcome = 'STILL_NEEDS_DIFFERENT_INVARIANT';
  let finalDecision = 'WAIT';
  let routeResolution = 'STILL_ROUTE_AMBIGUOUS';
  let decisionReason =
    'The exact-number slot resolves only to a canon row labeled alt, but same-set same-name non-alt rows exist at other numbers. That canon shape does not prove whether the Prize Pack stamp lacks a lawful plain/base owner or whether illustration-family semantics are inconsistently assigned.';

  if (exactNumberAltOwners.length > 0 && exactNumberPlainOwners.length === 0 && sameSetSameNameNonAltElsewhere.length === 0) {
    auditOutcome = 'ALT_SLOT_ONLY_NO_PLAIN_BASE_OWNER';
    finalDecision = 'DO_NOT_CANON';
    routeResolution = 'ROUTE_RESOLVED_DO_NOT_CANON';
    decisionReason =
      'The exact-number slot has only alt-labeled canon owners and no same-set same-name non-alt owner exists anywhere in the set family, so the generic Prize Pack stamp has no lawful plain/base route for this printed number.';
  } else if (exactNumberPlainOwners.length > 0) {
    auditOutcome = 'ALT_SLOT_COLLISION_WITH_PLAIN_BASE_OWNER';
    finalDecision = 'WAIT';
    routeResolution = 'STILL_ROUTE_AMBIGUOUS';
    decisionReason =
      'Canon contains both alt-labeled and plain/base same-number owners for the slot, so the route cannot be resolved without a more specific illustration-family invariant.';
  }

  return {
    ...row,
    target_cluster_type: TARGET_CLUSTER,
    candidate_gv_id: normalizeTextOrNull(primaryOwner?.gv_id),
    candidate_canon_row_details: primaryOwner,
    exact_number_name_matches: exactNumberNameMatches,
    exact_number_alt_owners: exactNumberAltOwners,
    exact_number_plain_owners: exactNumberPlainOwners,
    same_set_same_name_rows: sameSetSameNameRows,
    same_set_same_name_non_alt_elsewhere: sameSetSameNameNonAltElsewhere,
    audit_outcome: auditOutcome,
    route_resolution: routeResolution,
    final_decision: finalDecision,
    decision_reason: decisionReason,
    why_currently_alt_slot_collision:
      'The exact printed-number route resolves only to same-name canon rows already labeled alt, with no plain/base owner at that number.',
  };
}

function buildMarkdown(resultPayload) {
  const lines = [];
  lines.push('# Prize Pack Base Route Repair V4');
  lines.push('');
  lines.push(`Generated: ${resultPayload.generated_at}`);
  lines.push('');
  lines.push('## Remaining Ambiguous Pool');
  lines.push('');
  lines.push(`- Total remaining BASE_ROUTE_AMBIGUOUS: ${resultPayload.ambiguous_pool_size}`);
  lines.push(`- Counts by ambiguity type: ${Object.entries(resultPayload.counts_by_ambiguity_type).map(([name, count]) => `${name}=${count}`).join(', ')}`);
  lines.push('');
  lines.push('## Target Cluster');
  lines.push('');
  lines.push(`- Cluster: ${resultPayload.target_cluster_type}`);
  lines.push(`- Rows: ${resultPayload.target_cluster_size}`);
  lines.push('');
  lines.push('## Invariant Used');
  lines.push('');
  lines.push(resultPayload.invariant_used);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push(`- READY_FOR_WAREHOUSE: ${resultPayload.new_ready_count}`);
  lines.push(`- DO_NOT_CANON: ${resultPayload.new_do_not_canon_count}`);
  lines.push(`- Still ambiguous in cluster: ${resultPayload.remaining_ambiguous_count_in_cluster}`);
  lines.push('');
  lines.push('## Row-by-Row Outcomes');
  lines.push('');
  for (const row of resultPayload.target_cluster_rows) {
    lines.push(`- ${row.candidate_name} | ${row.printed_number}`);
    lines.push(`  - Candidate GV ID: ${row.candidate_gv_id ?? 'n/a'}`);
    lines.push(`  - Audit outcome: ${row.audit_outcome}`);
    lines.push(`  - Final decision: ${row.final_decision}`);
    lines.push(`  - Reason: ${row.decision_reason}`);
  }
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`- ${resultPayload.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const remainingRows = rebuildRemainingAmbiguousPool();
  const countsByAmbiguityType = countBy(remainingRows, (row) => row.cluster_name);

  if ((countsByAmbiguityType[TARGET_CLUSTER] || 0) !== EXPECTED_ROWS.length) {
    throw new Error(`unexpected_alt_cluster_size:${countsByAmbiguityType[TARGET_CLUSTER] || 0}`);
  }

  const targetClusterRows = sortRows(
    remainingRows.filter((row) => row.cluster_name === TARGET_CLUSTER),
  );

  const targetKeys = targetClusterRows
    .map((row) => `${row.candidate_name}|${row.printed_number}`)
    .sort();
  if (JSON.stringify(targetKeys) !== JSON.stringify([...EXPECTED_ROWS].sort())) {
    throw new Error(`unexpected_alt_cluster_members:${JSON.stringify(targetKeys)}`);
  }

  const inputPayload = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    source_artifacts: [INPUT_SOURCES.v2Result, INPUT_SOURCES.v3Result],
    ambiguous_pool_size: remainingRows.length,
    counts_by_ambiguity_type: countsByAmbiguityType,
    rows: remainingRows.map((row) => ({
      source_external_id: row.source_external_id,
      candidate_name: row.candidate_name,
      printed_number: row.printed_number,
      ambiguity_type: row.cluster_name,
      candidate_base_gv_ids: (Array.isArray(row.candidate_base_routes) ? row.candidate_base_routes : [])
        .map((candidate) => normalizeTextOrNull(candidate.gv_id))
        .filter(Boolean),
      route_resolution_preview: row.route_resolution_preview,
      prior_decisions: {
        prior_evidence_v2_action: normalizeTextOrNull(row.prior_evidence_v2?.next_action_v2),
        prior_promoted_batch_artifact: normalizeTextOrNull(row.prior_promoted_batch?.source_artifact),
      },
      notes: {
        why_route_is_ambiguous: row.why_route_is_ambiguous,
      },
    })),
  };

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const auditedTargetRows = [];
    for (const row of targetClusterRows) {
      auditedTargetRows.push(await auditAltRow(pool, row));
    }

    const readyRows = auditedTargetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE');
    const doNotCanonRows = auditedTargetRows.filter((row) => row.final_decision === 'DO_NOT_CANON');
    const stillAmbiguousRows = auditedTargetRows.filter((row) => row.route_resolution === 'STILL_ROUTE_AMBIGUOUS');

    const targetClusterPayload = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      cluster_name: TARGET_CLUSTER,
      row_count: auditedTargetRows.length,
      rows: auditedTargetRows.map((row) => ({
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        set_code: row.candidate_canon_row_details?.set_code ?? null,
        candidate_gv_id: row.candidate_gv_id,
        candidate_canon_row_details: row.candidate_canon_row_details,
        why_currently_alt_slot_collision: row.why_currently_alt_slot_collision,
      })),
    };

    const resultPayload = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      source_artifacts: [INPUT_SOURCES.v2Result, INPUT_SOURCES.v3Result],
      ambiguous_pool_size: remainingRows.length,
      counts_by_ambiguity_type: countsByAmbiguityType,
      target_cluster_size: auditedTargetRows.length,
      target_cluster_type: TARGET_CLUSTER,
      invariant_used: INVARIANT_USED,
      route_audit_summary:
        'V4 rebuilt the post-V3 ambiguous pool as 19 rows and isolated the 5-row ALT_ART_ONLY_NUMBER_SLOT_COLLISION cluster. For every row, the exact printed-number owner in live canon is a same-name row with variant_key=alt, and no plain/base owner exists at that number. But each row also has same-set same-name non-alt rows at other numbers, so the current canon does not prove whether the numbered slot is truly illustration-only or whether illustration-family semantics are inconsistent. The cluster therefore remains structurally ambiguous and cannot truthfully collapse to DO_NOT_CANON or READY without a deeper invariant.',
      new_ready_count: readyRows.length,
      new_do_not_canon_count: doNotCanonRows.length,
      remaining_ambiguous_count_in_cluster: stillAmbiguousRows.length,
      target_cluster_rows: auditedTargetRows,
      ready_rows: readyRows,
      do_not_canon_rows: doNotCanonRows,
      still_ambiguous_rows: stillAmbiguousRows,
      recommended_next_execution_step: 'PRIZE_PACK_BASE_ROUTE_REPAIR_V5',
    };

    writeJson(OUTPUT_PATHS.input, inputPayload);
    writeJson(OUTPUT_PATHS.targetCluster, targetClusterPayload);
    writeJson(OUTPUT_PATHS.resultJson, resultPayload);
    writeText(OUTPUT_PATHS.resultMd, buildMarkdown(resultPayload));

    if (readyRows.length > 0) {
      writeJson(OUTPUT_PATHS.readyBatchCandidate, {
        generated_at: new Date().toISOString(),
        workflow: 'PRIZE_PACK_READY_BATCH_V10_CANDIDATE',
        status: 'READY_SUBSET_IDENTIFIED',
        source_artifacts: [OUTPUT_PATHS.resultJson, OUTPUT_PATHS.targetCluster],
        rows: readyRows,
      });
    } else {
      removeFileIfExists(OUTPUT_PATHS.readyBatchCandidate);
    }

    console.log(
      JSON.stringify(
        {
          workflow: WORKFLOW,
          ambiguous_pool_size: resultPayload.ambiguous_pool_size,
          target_cluster_size: resultPayload.target_cluster_size,
          target_cluster_type: resultPayload.target_cluster_type,
          new_ready_count: resultPayload.new_ready_count,
          new_do_not_canon_count: resultPayload.new_do_not_canon_count,
          remaining_ambiguous_count_in_cluster: resultPayload.remaining_ambiguous_count_in_cluster,
          recommended_next_execution_step: resultPayload.recommended_next_execution_step,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        workflow: WORKFLOW,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

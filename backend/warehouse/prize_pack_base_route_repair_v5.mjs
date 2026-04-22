import '../env.mjs';

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const WORKFLOW = 'PRIZE_PACK_BASE_ROUTE_REPAIR_V5';

const INPUT_SOURCES = {
  v4: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v4.json',
  v9Input: 'docs/checkpoints/warehouse/prize_pack_evidence_v9_nonblocked_input.json',
  rule: 'docs/contracts/PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1.md',
};

const OUTPUT_PATHS = {
  json: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v5.json',
  md: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v5.md',
  readyBatchCandidate: 'docs/checkpoints/warehouse/prize_pack_ready_batch_v10_candidate.json',
};

const TARGET_CLUSTER = 'ALT_ART_ONLY_NUMBER_SLOT_COLLISION';

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
  const compact = normalized.replace(/[⁄∕]/g, '/').replace(/\s+/g, '');
  const left = compact.includes('/') ? compact.split('/', 1)[0] : compact;
  const digits = left.replace(/[^0-9]/g, '');
  if (digits.length === 0) return normalized;
  return String(parseInt(digits, 10));
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

function buildEvidenceMap() {
  const payload = loadJson(INPUT_SOURCES.v9Input);
  return new Map(
    (Array.isArray(payload.rows) ? payload.rows : [])
      .map((row) => [normalizeTextOrNull(row.source_external_id), row])
      .filter(([key]) => Boolean(key)),
  );
}

function buildRemainingAmbiguousSummary(v4Payload) {
  const remainingAfterV5 = {
    EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED:
      (v4Payload.counts_by_ambiguity_type?.EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED || 0),
    SPECIAL_IDENTITY_FAMILY_COLLISION:
      (v4Payload.counts_by_ambiguity_type?.SPECIAL_IDENTITY_FAMILY_COLLISION || 0),
  };

  return {
    counts_by_ambiguity_type_after_v5: remainingAfterV5,
    remaining_ambiguous_pool_after_v5:
      Object.values(remainingAfterV5).reduce((sum, count) => sum + count, 0),
  };
}

async function auditRow(pool, row, evidenceRow) {
  const targetName = normalizeTextOrNull(row.name ?? row.candidate_name);
  const targetSetCode = normalizeTextOrNull(row.candidate_canon_row_details?.set_code);
  const targetNumberPlain = normalizeNumberPlain(row.normalized_number_plain ?? row.printed_number);

  const exactOwnerResult = await pool.query(
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
        and lower(set_code) = lower($2)
        and number_plain = $3
      order by number, gv_id
    `,
    [targetName, targetSetCode, targetNumberPlain],
  );

  const sameSetSameNameResult = await pool.query(
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
        and lower(set_code) = lower($2)
      order by number_plain, number, gv_id
    `,
    [targetName, targetSetCode],
  );

  const exactOwners = exactOwnerResult.rows.map(compactCardPrint);
  const exactOwner = exactOwners[0] ?? null;
  const sameSetSameNameRows = sameSetSameNameResult.rows.map(compactCardPrint);
  const sameSetOtherNumbers = sameSetSameNameRows.filter(
    (candidate) => normalizeTextOrNull(candidate.number_plain) !== targetNumberPlain,
  );

  if (exactOwners.length !== 1 || !exactOwner) {
    return {
      ...row,
      audit_outcome: 'STILL_NEEDS_DIFFERENT_INVARIANT',
      route_resolution: 'STILL_ROUTE_AMBIGUOUS',
      final_decision: 'WAIT',
      rebucketed_blocker_class: 'BASE_ROUTE_AMBIGUOUS',
      decision_reason:
        'Printed-identity precedence could not be applied because the exact same-name same-number canon owner was not uniquely provable in live canon.',
      exact_same_name_same_number_owners: exactOwners,
      same_set_same_name_rows: sameSetSameNameRows,
    };
  }

  const knownSeriesAppearances = Array.isArray(evidenceRow?.known_series_appearances)
    ? evidenceRow.known_series_appearances
    : [];
  const evidenceTier = normalizeTextOrNull(evidenceRow?.evidence_tier) ?? 'TIER_4';

  let finalDecision = 'WAIT';
  let rebucketedBlockerClass = 'NO_SERIES_CONFIRMATION';
  let routeResolution = 'ROUTE_RESOLVED_WAIT';
  let decisionReason =
    'Printed identity is now resolved by the exact same-name same-number canon owner, so BASE_ROUTE_AMBIGUOUS is closed. Prize Pack evidence is still missing, so the row returns to WAIT under NO_SERIES_CONFIRMATION.';

  if (knownSeriesAppearances.length === 1) {
    finalDecision = 'READY_FOR_WAREHOUSE';
    rebucketedBlockerClass = null;
    routeResolution = 'ROUTE_RESOLVED_READY';
    decisionReason =
      'Printed identity is resolved by the exact same-name same-number canon owner, and the row already has one corroborated Prize Pack series appearance, so it becomes READY_FOR_WAREHOUSE.';
  } else if (knownSeriesAppearances.length > 1) {
    finalDecision = 'DO_NOT_CANON';
    rebucketedBlockerClass = null;
    routeResolution = 'ROUTE_RESOLVED_DO_NOT_CANON';
    decisionReason =
      'Printed identity is resolved by the exact same-name same-number canon owner, but the row already appears across multiple Prize Pack series without a printed distinction, so it becomes DO_NOT_CANON.';
  }

  return {
    ...row,
    audit_outcome: 'PRINTED_IDENTITY_PRECEDENCE_APPLIED',
    route_resolution: routeResolution,
    final_decision: finalDecision,
    rebucketed_blocker_class: rebucketedBlockerClass,
    decision_reason: decisionReason,
    exact_same_name_same_number_owners: exactOwners,
    exact_printed_identity_owner: exactOwner,
    same_set_same_name_rows: sameSetSameNameRows,
    same_set_same_name_other_numbers: sameSetOtherNumbers,
    printed_identity_proof: {
      exact_owner_gv_id: exactOwner.gv_id,
      exact_owner_number: exactOwner.number,
      exact_owner_variant_key: exactOwner.variant_key,
      other_same_set_numbers: sameSetOtherNumbers.map((candidate) => ({
        gv_id: candidate.gv_id,
        number: candidate.number,
        variant_key: candidate.variant_key,
      })),
    },
    evidence_state_after_route_fix: {
      evidence_tier: evidenceTier,
      known_series_appearances: knownSeriesAppearances,
      missing_series_checked: Array.isArray(evidenceRow?.missing_series_checked)
        ? evidenceRow.missing_series_checked
        : [],
    },
  };
}

function buildMarkdown(resultPayload) {
  const lines = [];
  lines.push('# Prize Pack Base Route Repair V5');
  lines.push('');
  lines.push(`Generated: ${resultPayload.generated_at}`);
  lines.push('');
  lines.push('## Rule');
  lines.push('');
  lines.push(`- Contract: ${resultPayload.rule_contract}`);
  lines.push(`- Invariant: ${resultPayload.invariant_used}`);
  lines.push('');
  lines.push('## Re-evaluation');
  lines.push('');
  lines.push(`- Target cluster: ${resultPayload.target_cluster_type}`);
  lines.push(`- Rows investigated: ${resultPayload.target_cluster_size}`);
  lines.push(`- READY_FOR_WAREHOUSE: ${resultPayload.new_ready_count}`);
  lines.push(`- DO_NOT_CANON: ${resultPayload.new_do_not_canon_count}`);
  lines.push(`- Route-resolved WAIT: ${resultPayload.route_resolved_wait_count}`);
  lines.push(`- Remaining ambiguous in cluster: ${resultPayload.remaining_ambiguous_count_in_cluster}`);
  lines.push('');
  lines.push('## Row Outcomes');
  lines.push('');
  for (const row of resultPayload.target_cluster_rows) {
    lines.push(`- ${row.candidate_name} | ${row.printed_number}`);
    lines.push(`  - Exact owner: ${row.exact_printed_identity_owner?.gv_id ?? 'n/a'} (${row.exact_printed_identity_owner?.number ?? 'n/a'})`);
    lines.push(`  - Final decision: ${row.final_decision}`);
    lines.push(`  - Rebucketed blocker: ${row.rebucketed_blocker_class ?? 'n/a'}`);
    lines.push(`  - Reason: ${row.decision_reason}`);
  }
  lines.push('');
  lines.push('## Remaining Structural Ambiguity');
  lines.push('');
  for (const [name, count] of Object.entries(resultPayload.remaining_ambiguous_pool.counts_by_ambiguity_type_after_v5)) {
    lines.push(`- ${name}: ${count}`);
  }
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`- ${resultPayload.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const v4Payload = loadJson(INPUT_SOURCES.v4);
  const evidenceMap = buildEvidenceMap();
  const targetClusterRows = Array.isArray(v4Payload.target_cluster_rows) ? v4Payload.target_cluster_rows : [];

  if (targetClusterRows.length !== 5) {
    throw new Error(`unexpected_target_cluster_size:${targetClusterRows.length}`);
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const reEvaluatedRows = [];
    for (const row of targetClusterRows) {
      reEvaluatedRows.push(
        await auditRow(pool, row, evidenceMap.get(normalizeTextOrNull(row.source_external_id))),
      );
    }

    const readyRows = reEvaluatedRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE');
    const doNotCanonRows = reEvaluatedRows.filter((row) => row.final_decision === 'DO_NOT_CANON');
    const routeResolvedWaitRows = reEvaluatedRows.filter((row) => row.route_resolution === 'ROUTE_RESOLVED_WAIT');
    const stillAmbiguousRows = reEvaluatedRows.filter((row) => row.route_resolution === 'STILL_ROUTE_AMBIGUOUS');
    const remainingAmbiguousPool = buildRemainingAmbiguousSummary(v4Payload);

    const resultPayload = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      source_artifacts: [INPUT_SOURCES.v4, INPUT_SOURCES.v9Input],
      rule_contract: 'docs/contracts/PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1.md',
      target_cluster_type: TARGET_CLUSTER,
      target_cluster_size: reEvaluatedRows.length,
      invariant_used:
        'When a same-name exact printed-number canon row exists, that row is the lawful printed identity anchor for routing even if current canon stores a non-null variant_key such as alt. Prize Pack evidence still controls READY vs WAIT vs DO_NOT_CANON after route resolution.',
      route_audit_summary:
        'All 5 rows now have one exact same-name same-number canon owner in live canon: GV-PK-EVS-41, GV-PK-EVS-74, GV-PK-EVS-95, GV-PK-EVS-111, and GV-PK-EVS-122. Under PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1, those exact-number owners are lawful printed identities regardless of the current alt label, so BASE_ROUTE_AMBIGUOUS is closed for all five rows. Because none of the five currently has corroborated Prize Pack series evidence, all five rebucket to WAIT under NO_SERIES_CONFIRMATION rather than READY_FOR_WAREHOUSE.',
      target_cluster_rows: reEvaluatedRows,
      ready_rows: readyRows,
      do_not_canon_rows: doNotCanonRows,
      route_resolved_wait_rows: routeResolvedWaitRows,
      still_ambiguous_rows: stillAmbiguousRows,
      new_ready_count: readyRows.length,
      new_do_not_canon_count: doNotCanonRows.length,
      route_resolved_wait_count: routeResolvedWaitRows.length,
      remaining_ambiguous_count_in_cluster: stillAmbiguousRows.length,
      remaining_ambiguous_pool: remainingAmbiguousPool,
      recommended_next_execution_step: 'PRIZE_PACK_BASE_ROUTE_REPAIR_V6',
    };

    writeJson(OUTPUT_PATHS.json, resultPayload);
    writeText(OUTPUT_PATHS.md, buildMarkdown(resultPayload));

    if (readyRows.length > 0) {
      writeJson(OUTPUT_PATHS.readyBatchCandidate, {
        generated_at: new Date().toISOString(),
        workflow: 'PRIZE_PACK_READY_BATCH_V10_CANDIDATE',
        status: 'READY_SUBSET_IDENTIFIED',
        source_artifacts: [OUTPUT_PATHS.json],
        rows: readyRows,
      });
    } else {
      removeFileIfExists(OUTPUT_PATHS.readyBatchCandidate);
    }

    console.log(
      JSON.stringify(
        {
          workflow: WORKFLOW,
          target_cluster_size: resultPayload.target_cluster_size,
          new_ready_count: resultPayload.new_ready_count,
          new_do_not_canon_count: resultPayload.new_do_not_canon_count,
          route_resolved_wait_count: resultPayload.route_resolved_wait_count,
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

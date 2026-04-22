import '../env.mjs';

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const WORKFLOW = 'PRIZE_PACK_BASE_ROUTE_REPAIR_V6';

const INPUT_SOURCES = {
  v2Input: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json',
  v2: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2.json',
  v3: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v3.json',
  v4: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v4.json',
  v5: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v5.json',
  v11Input: 'docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked_input.json',
  v11Evidence: 'docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked.json',
  v11Batch: 'docs/checkpoints/warehouse/prize_pack_ready_batch_v11_nonblocked.json',
};

const OUTPUT_PATHS = {
  input: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v6_input.json',
  targetCluster: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v6_target_cluster.json',
  json: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v6.json',
  md: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v6.md',
  readyBatchCandidate: 'docs/checkpoints/warehouse/prize_pack_ready_batch_v12_candidate.json',
};

const TARGET_CLUSTER = 'EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED';
const REMAINING_CLUSTER = 'SPECIAL_IDENTITY_FAMILY_COLLISION';

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

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
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
  };
}

function getClusterRowIds(payload, clusterName) {
  const cluster = (payload.cluster_summaries || []).find((entry) => entry.cluster_name === clusterName);
  if (!cluster) return new Set();
  return new Set(
    (cluster.rows || [])
      .map((row) => normalizeTextOrNull(row.source_external_id))
      .filter(Boolean),
  );
}

function getRowIds(rows) {
  return new Set(
    (rows || [])
      .map((row) => normalizeTextOrNull(row.source_external_id))
      .filter(Boolean),
  );
}

function unionSets(...sets) {
  const union = new Set();
  for (const set of sets) {
    for (const value of set) {
      union.add(value);
    }
  }
  return union;
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = normalizeTextOrNull(value) ?? 'UNKNOWN';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildCurrentPrizePackState(v11Batch) {
  const status = v11Batch.post_batch_prize_pack_status || {};
  return {
    promoted_prize_pack_total: Number(status.promoted_prize_pack_total_after_v11 ?? 365),
    remaining_wait_rows: Number(status.remaining_wait_rows ?? 131),
    do_not_canon_rows: Number(status.do_not_canon_rows ?? 174),
    blocked_by_official_acquisition_rows: Number(status.blocked_by_official_acquisition_rows ?? 88),
  };
}

function buildInputRows({ v2Input, currentEvidenceRows, exactIds, specialIds }) {
  const currentBySourceExternalId = new Map(
    (currentEvidenceRows || [])
      .map((row) => [normalizeTextOrNull(row.source_external_id), row])
      .filter(([key]) => Boolean(key)),
  );

  return (v2Input.rows || [])
    .filter((row) => exactIds.has(row.source_external_id) || specialIds.has(row.source_external_id))
    .map((row) => {
      const currentRow = currentBySourceExternalId.get(normalizeTextOrNull(row.source_external_id)) || {};
      const ambiguityType = exactIds.has(row.source_external_id)
        ? TARGET_CLUSTER
        : REMAINING_CLUSTER;
      return {
        source: row.source,
        source_set_id: row.source_set_id,
        source_external_id: row.source_external_id,
        candidate_name: row.candidate_name,
        name: row.name,
        printed_number: row.printed_number,
        normalized_number_plain: row.normalized_number_plain,
        set_code: normalizeTextOrNull(currentRow.effective_set_code),
        source_family: normalizeTextOrNull(currentRow.source_family) ?? normalizeTextOrNull(row.source_set_id),
        proposed_variant_key: row.proposed_variant_key,
        candidate_base_gv_ids: (row.candidate_base_routes || [])
          .map((candidate) => normalizeTextOrNull(candidate.gv_id))
          .filter(Boolean),
        candidate_base_routes: row.candidate_base_routes || [],
        ambiguity_type: ambiguityType,
        why_it_is_still_not_route_resolved:
          ambiguityType === TARGET_CLUSTER
            ? 'This row survived V2-V5 because the exact-name-number unique-route cluster had not yet been explicitly adjudicated into the evidence lane.'
            : 'This row survived V2-V5 because the special identity family collision cluster has not yet been targeted by a bounded route invariant.',
        prior_route_repair_history: [
          'PRIZE_PACK_BASE_ROUTE_REPAIR_V2',
          'PRIZE_PACK_BASE_ROUTE_REPAIR_V3',
          'PRIZE_PACK_BASE_ROUTE_REPAIR_V4',
          'PRIZE_PACK_BASE_ROUTE_REPAIR_V5',
        ],
        blocked_by_official_acquisition: Boolean(currentRow.blocked_by_official_acquisition),
        current_blocker_class: normalizeTextOrNull(currentRow.current_blocker_class) ?? row.current_blocker_class,
        evidence_tier: normalizeTextOrNull(currentRow.evidence_tier),
        known_series_appearances: Array.isArray(currentRow.known_series_appearances)
          ? currentRow.known_series_appearances
          : [],
        missing_series_checked: Array.isArray(currentRow.missing_series_checked)
          ? currentRow.missing_series_checked
          : [],
      };
    });
}

async function auditExactClusterRow(pool, row) {
  const expectedRoute = Array.isArray(row.candidate_base_routes) && row.candidate_base_routes.length === 1
    ? row.candidate_base_routes[0]
    : null;

  const targetSetCode = normalizeTextOrNull(expectedRoute?.set_code);
  const targetNumberPlain =
    normalizeTextOrNull(expectedRoute?.number_plain) ??
    normalizeNumberPlain(row.normalized_number_plain ?? row.printed_number);
  const targetName = normalizeTextOrNull(row.name ?? row.candidate_name);
  const normalizedTargetName = normalizeName(targetName);

  if (!targetSetCode || !targetNumberPlain || !normalizedTargetName) {
    return {
      ...row,
      route_resolution: 'STILL_ROUTE_AMBIGUOUS',
      final_decision: 'WAIT',
      rebucketed_blocker_class: 'BASE_ROUTE_AMBIGUOUS',
      decision_reason:
        'The stored route preview does not provide enough deterministic set+number+name information to close route ambiguity.',
      route_notes:
        'Missing one or more route preview fields needed for exact same-set same-number owner audit.',
      same_set_same_number_candidates: [],
      normalized_name_matches: [],
      exact_printed_identity_owner: null,
      special_identity_family_signals: [],
      prior_adjudication_inheritance: [],
    };
  }

  const sameSetSameNumberResult = await pool.query(
    `
      select
        id,
        gv_id,
        name,
        set_code,
        number,
        number_plain,
        variant_key,
        rarity
      from public.card_prints
      where lower(set_code) = lower($1)
        and number_plain = $2
      order by gv_id
    `,
    [targetSetCode, targetNumberPlain],
  );

  const sameSetSameNumberCandidates = sameSetSameNumberResult.rows.map(compactCardPrint);
  const normalizedNameMatches = sameSetSameNumberCandidates.filter(
    (candidate) => normalizeName(candidate.name) === normalizedTargetName,
  );
  const exactOwner = normalizedNameMatches[0] ?? null;

  const evidenceSeries = Array.isArray(row.known_series_appearances)
    ? row.known_series_appearances
    : [];

  if (
    !expectedRoute ||
    normalizedNameMatches.length !== 1 ||
    normalizeTextOrNull(exactOwner?.gv_id) !== normalizeTextOrNull(expectedRoute.gv_id)
  ) {
    return {
      ...row,
      route_resolution: 'STILL_ROUTE_AMBIGUOUS',
      final_decision: 'WAIT',
      rebucketed_blocker_class: 'BASE_ROUTE_AMBIGUOUS',
      decision_reason:
        'Live canon did not prove exactly one normalized same-name same-number owner that matches the stored route preview, so route ambiguity remains open.',
      route_notes:
        'The exact-name-number unique-route cluster can only close when one normalized same-set same-number owner survives live canon audit.',
      same_set_same_number_candidates: sameSetSameNumberCandidates,
      normalized_name_matches: normalizedNameMatches,
      exact_printed_identity_owner: exactOwner,
      special_identity_family_signals: normalizedNameMatches
        .filter((candidate) => Boolean(normalizeTextOrNull(candidate.variant_key)))
        .map((candidate) => ({
          gv_id: candidate.gv_id,
          variant_key: candidate.variant_key,
        })),
      prior_adjudication_inheritance: [],
    };
  }

  let routeResolution = 'ROUTE_RESOLVED_WAIT';
  let finalDecision = 'WAIT';
  let rebucketedBlockerClass = 'NO_SERIES_CONFIRMATION';
  let decisionReason =
    'Live canon proves exactly one normalized same-name same-number owner for this set slot, so structural route ambiguity is closed. No corroborated Prize Pack series evidence is present yet, so the row returns to WAIT under NO_SERIES_CONFIRMATION.';

  if (evidenceSeries.length > 1) {
    routeResolution = 'ROUTE_RESOLVED_DO_NOT_CANON';
    finalDecision = 'DO_NOT_CANON';
    rebucketedBlockerClass = null;
    decisionReason =
      'Live canon proves exactly one lawful printed owner, and the carried evidence already shows the same generic stamp identity across multiple Prize Pack series, so the row becomes DO_NOT_CANON.';
  } else if (evidenceSeries.length === 1 && !row.blocked_by_official_acquisition) {
    routeResolution = 'ROUTE_RESOLVED_READY';
    finalDecision = 'READY_FOR_WAREHOUSE';
    rebucketedBlockerClass = null;
    decisionReason =
      'Live canon proves exactly one lawful printed owner, and the carried evidence already confirms one Prize Pack series appearance, so the row becomes READY_FOR_WAREHOUSE.';
  }

  return {
    ...row,
    route_resolution: routeResolution,
    final_decision: finalDecision,
    rebucketed_blocker_class: rebucketedBlockerClass,
    decision_reason: decisionReason,
    route_notes:
      'The stored route preview and the live same-set same-number audit agree on one normalized printed identity owner.',
    same_set_same_number_candidates: sameSetSameNumberCandidates,
    normalized_name_matches: normalizedNameMatches,
    exact_printed_identity_owner: exactOwner,
    special_identity_family_signals: [],
    prior_adjudication_inheritance: [],
  };
}

function buildMarkdown(resultPayload) {
  const lines = [];
  lines.push('# Prize Pack Base Route Repair V6');
  lines.push('');
  lines.push(`Generated: ${resultPayload.generated_at}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(`- Current promoted Prize Pack total: ${resultPayload.current_prize_pack_state.promoted_prize_pack_total}`);
  lines.push(`- Current WAIT rows: ${resultPayload.current_prize_pack_state.remaining_wait_rows}`);
  lines.push(`- Current DO_NOT_CANON rows: ${resultPayload.current_prize_pack_state.do_not_canon_rows}`);
  lines.push(`- Current acquisition-blocked rows: ${resultPayload.current_prize_pack_state.blocked_by_official_acquisition_rows}`);
  lines.push('');
  lines.push('## Structural Pool');
  lines.push('');
  for (const [name, count] of Object.entries(resultPayload.counts_by_ambiguity_type)) {
    lines.push(`- ${name}: ${count}`);
  }
  lines.push('');
  lines.push('## Target Cluster');
  lines.push('');
  lines.push(`- Cluster: ${resultPayload.target_cluster_type}`);
  lines.push(`- Rows investigated: ${resultPayload.target_cluster_size}`);
  lines.push(`- Shared route question: ${resultPayload.target_cluster_question}`);
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`- WAIT / NO_SERIES_CONFIRMATION: ${resultPayload.new_wait_no_series_count}`);
  lines.push(`- DO_NOT_CANON: ${resultPayload.new_do_not_canon_count}`);
  lines.push(`- READY_FOR_WAREHOUSE: ${resultPayload.new_ready_count}`);
  lines.push(`- Remaining structurally ambiguous in cluster: ${resultPayload.remaining_structural_ambiguity_count_in_cluster}`);
  lines.push('');
  lines.push('## Row Outcomes');
  lines.push('');
  for (const row of resultPayload.target_cluster_rows) {
    lines.push(`- ${row.candidate_name} | ${row.printed_number}`);
    lines.push(`  - Owner: ${row.exact_printed_identity_owner?.gv_id ?? 'n/a'}`);
    lines.push(`  - Final decision: ${row.final_decision}`);
    lines.push(`  - Rebucketed blocker: ${row.rebucketed_blocker_class ?? 'n/a'}`);
    lines.push(`  - Reason: ${row.decision_reason}`);
  }
  lines.push('');
  lines.push('## Remaining Structural Ambiguity After V6');
  lines.push('');
  for (const [name, count] of Object.entries(resultPayload.remaining_structural_ambiguity_after_v6.counts_by_ambiguity_type_after_v6)) {
    lines.push(`- ${name}: ${count}`);
  }
  lines.push('');
  lines.push('## Next Step');
  lines.push('');
  lines.push(`- ${resultPayload.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const v2Input = loadJson(INPUT_SOURCES.v2Input);
  const v2 = loadJson(INPUT_SOURCES.v2);
  const v3 = loadJson(INPUT_SOURCES.v3);
  const v4 = loadJson(INPUT_SOURCES.v4);
  const v5 = loadJson(INPUT_SOURCES.v5);
  const v11Input = loadJson(INPUT_SOURCES.v11Input);
  const v11Evidence = loadJson(INPUT_SOURCES.v11Evidence);
  const v11Batch = loadJson(INPUT_SOURCES.v11Batch);

  const exactIds = getClusterRowIds(v2, TARGET_CLUSTER);
  const specialIds = getClusterRowIds(v2, REMAINING_CLUSTER);

  const resolvedIds = unionSets(
    getRowIds(v2.do_not_canon_rows),
    getRowIds(v3.route_resolved_wait_rows),
    getRowIds(v5.route_resolved_wait_rows),
    getRowIds(v3.do_not_canon_rows),
    getRowIds(v3.ready_rows),
    getRowIds(v5.do_not_canon_rows),
    getRowIds(v5.ready_rows),
  );

  const inputRows = buildInputRows({
    v2Input,
    currentEvidenceRows: v11Input.rows || [],
    exactIds,
    specialIds,
  }).filter((row) => !resolvedIds.has(row.source_external_id));

  const countsByAmbiguityType = countBy(inputRows.map((row) => row.ambiguity_type));
  const expectedRemainingPool =
    Number(v5.remaining_ambiguous_pool?.remaining_ambiguous_pool_after_v5 ?? 14);
  const expectedExact =
    Number(v5.remaining_ambiguous_pool?.counts_by_ambiguity_type_after_v5?.[TARGET_CLUSTER] ?? 13);
  const expectedSpecial =
    Number(v5.remaining_ambiguous_pool?.counts_by_ambiguity_type_after_v5?.[REMAINING_CLUSTER] ?? 1);

  if (inputRows.length !== expectedRemainingPool) {
    throw new Error(`ambiguous_pool_count_mismatch:${inputRows.length}:${expectedRemainingPool}`);
  }
  if ((countsByAmbiguityType[TARGET_CLUSTER] ?? 0) !== expectedExact) {
    throw new Error(`exact_cluster_count_mismatch:${countsByAmbiguityType[TARGET_CLUSTER] ?? 0}:${expectedExact}`);
  }
  if ((countsByAmbiguityType[REMAINING_CLUSTER] ?? 0) !== expectedSpecial) {
    throw new Error(`special_cluster_count_mismatch:${countsByAmbiguityType[REMAINING_CLUSTER] ?? 0}:${expectedSpecial}`);
  }

  const currentPrizePackState = buildCurrentPrizePackState(v11Batch);
  const inputPayload = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    source_artifacts: Object.values(INPUT_SOURCES),
    current_prize_pack_state: currentPrizePackState,
    ambiguous_pool: {
      total: inputRows.length,
      counts_by_ambiguity_type: countsByAmbiguityType,
      nonblocked: inputRows.filter((row) => !row.blocked_by_official_acquisition).length,
      acquisition_blocked_overlap: inputRows.filter((row) => row.blocked_by_official_acquisition).length,
    },
    rows: inputRows,
  };
  writeJson(OUTPUT_PATHS.input, inputPayload);

  const targetClusterRows = inputRows.filter((row) => row.ambiguity_type === TARGET_CLUSTER);
  if (targetClusterRows.length !== expectedExact) {
    throw new Error(`target_cluster_row_count_mismatch:${targetClusterRows.length}:${expectedExact}`);
  }
  if (targetClusterRows.some((row) => row.blocked_by_official_acquisition)) {
    throw new Error('target_cluster_contains_acquisition_blocked_rows');
  }

  const targetClusterQuestion =
    'Does the exact or canon-normalized name + printed-number pair already resolve to exactly one lawful canon owner, such that route ambiguity is closed and the row should move back to the evidence lane under NO_SERIES_CONFIRMATION?';

  const targetClusterPayload = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    target_cluster: {
      cluster_name: TARGET_CLUSTER,
      row_count: targetClusterRows.length,
      shared_route_question: targetClusterQuestion,
      candidate_route_patterns: [
        'One stored candidate base route',
        'Same-set same-number live canon owner',
        'Normalized printed-name match including diacritic normalization',
      ],
      excluded_acquisition_blocked_count: inputRows.filter(
        (row) => row.ambiguity_type !== TARGET_CLUSTER && row.blocked_by_official_acquisition,
      ).length,
    },
    rows: targetClusterRows,
  };
  writeJson(OUTPUT_PATHS.targetCluster, targetClusterPayload);

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const auditedRows = [];
    for (const row of targetClusterRows) {
      auditedRows.push(await auditExactClusterRow(pool, row));
    }

    const waitRows = auditedRows.filter(
      (row) => row.route_resolution === 'ROUTE_RESOLVED_WAIT',
    );
    const doNotCanonRows = auditedRows.filter(
      (row) => row.route_resolution === 'ROUTE_RESOLVED_DO_NOT_CANON',
    );
    const readyRows = auditedRows.filter(
      (row) => row.route_resolution === 'ROUTE_RESOLVED_READY',
    );
    const stillAmbiguousRows = auditedRows.filter(
      (row) => row.route_resolution === 'STILL_ROUTE_AMBIGUOUS',
    );

    const remainingStructuralAmbiguityAfterV6 = {
      counts_by_ambiguity_type_after_v6: {
        [REMAINING_CLUSTER]: expectedSpecial,
      },
      remaining_ambiguous_pool_after_v6: expectedSpecial,
    };

    const routeAuditSummary =
      `V6 rebuilt the true post-V5 structural pool as ${inputRows.length} rows by carrying forward only the two unresolved ambiguity families from V5. ` +
      `It selected the ${TARGET_CLUSTER} cluster (${targetClusterRows.length} rows) and audited live canon by set_code + number_plain, then filtered those rows by normalized printed-name match. ` +
      `All ${waitRows.length + doNotCanonRows.length + readyRows.length} audited rows now resolve to exactly one lawful same-set same-number canon owner, so structural ambiguity is closed for the entire cluster. ` +
      `${waitRows.length} rows move to WAIT under NO_SERIES_CONFIRMATION because no corroborated Prize Pack series evidence is carried yet; ${doNotCanonRows.length} rows move to DO_NOT_CANON; ${readyRows.length} rows become READY_FOR_WAREHOUSE. ` +
      `${stillAmbiguousRows.length} rows remain structurally ambiguous in the cluster.`;

    const resultPayload = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      source_artifacts: Object.values(INPUT_SOURCES).concat([
        OUTPUT_PATHS.input,
        OUTPUT_PATHS.targetCluster,
      ]),
      current_prize_pack_state: currentPrizePackState,
      ambiguous_pool_size: inputRows.length,
      counts_by_ambiguity_type: countsByAmbiguityType,
      target_cluster_size: targetClusterRows.length,
      target_cluster_type: TARGET_CLUSTER,
      target_cluster_question: targetClusterQuestion,
      invariant_used:
        'If live canon and the stored route preview agree on exactly one same-set same-number owner whose normalized printed name matches the source row, then BASE_ROUTE_AMBIGUOUS is closed. Evidence still determines READY vs DO_NOT_CANON vs WAIT after route resolution.',
      route_audit_evidence_used: [
        'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json candidate route previews',
        'docs/checkpoints/warehouse/prize_pack_base_route_repair_v5.json remaining structural pool counts',
        'docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked_input.json carried evidence state',
        'Live canon public.card_prints same-set same-number owner audit with normalized-name matching',
      ],
      route_audit_summary: routeAuditSummary,
      target_cluster_rows: auditedRows,
      route_resolved_wait_rows: waitRows,
      do_not_canon_rows: doNotCanonRows,
      ready_rows: readyRows,
      still_ambiguous_rows: stillAmbiguousRows,
      new_wait_no_series_count: waitRows.length,
      new_do_not_canon_count: doNotCanonRows.length,
      new_ready_count: readyRows.length,
      remaining_structural_ambiguity_count_in_cluster: stillAmbiguousRows.length,
      remaining_structural_ambiguity_after_v6: remainingStructuralAmbiguityAfterV6,
      recommended_next_execution_step:
        waitRows.length > 0
          ? 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V12_NONBLOCKED'
          : expectedSpecial > 0
            ? 'PRIZE_PACK_BASE_ROUTE_REPAIR_V7'
            : 'MANUAL_BROWSER_DOWNLOAD_AND_LOCAL_JSON_IMPORT_FOR_PRIZE_PACK_V1',
    };

    if (readyRows.length > 0) {
      const readyBatchPayload = {
        generated_at: new Date().toISOString(),
        workflow: WORKFLOW,
        source_artifact: OUTPUT_PATHS.json,
        row_count: readyRows.length,
        rows: readyRows.map((row) => ({
          source: row.source,
          source_set_id: row.source_set_id,
          source_external_id: row.source_external_id,
          name: row.name,
          candidate_name: row.candidate_name,
          printed_number: row.printed_number,
          normalized_number_plain: row.normalized_number_plain,
          variant_key: row.proposed_variant_key,
          governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
          evidence_class: 'CONFIRMED_IDENTITY',
          evidence_tier: row.evidence_tier,
          confirmed_series_coverage: row.known_series_appearances,
          effective_set_code: row.exact_printed_identity_owner?.set_code ?? null,
          effective_set_name: null,
          underlying_base_proof: {
            base_gv_id: row.exact_printed_identity_owner?.gv_id ?? null,
            base_route: row.exact_printed_identity_owner?.gv_id ?? null,
            unique_base_route: true,
          },
          reference_hints_payload: {
            provenance: row.source,
            source_family: row.source_family,
            evidence_class: 'CONFIRMED_IDENTITY',
            evidence_tier: row.evidence_tier,
            confirmed_series_coverage: row.known_series_appearances,
            underlying_base_proof: {
              base_gv_id: row.exact_printed_identity_owner?.gv_id ?? null,
              base_route: row.exact_printed_identity_owner?.gv_id ?? null,
            },
            effective_routed_set_code: row.exact_printed_identity_owner?.set_code ?? null,
            governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
          },
        })),
      };
      writeJson(OUTPUT_PATHS.readyBatchCandidate, readyBatchPayload);
    } else {
      removeFileIfExists(OUTPUT_PATHS.readyBatchCandidate);
    }

    writeJson(OUTPUT_PATHS.json, resultPayload);
    writeText(OUTPUT_PATHS.md, buildMarkdown(resultPayload));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      workflow: WORKFLOW,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});

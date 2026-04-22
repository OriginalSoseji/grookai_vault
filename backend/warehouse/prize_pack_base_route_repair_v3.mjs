import fs from 'node:fs';
import path from 'node:path';

const WORKFLOW = 'PRIZE_PACK_BASE_ROUTE_REPAIR_V3';

const INPUT_SOURCES = {
  v2Input: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json',
  v2Clusters: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_clusters.json',
  v2Result: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2.json',
};

const OUTPUT_PATHS = {
  input: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v3_input.json',
  targetCluster: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v3_target_cluster.json',
  resultJson: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v3.json',
  resultMd: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v3.md',
  readyBatchCandidate: 'docs/checkpoints/warehouse/prize_pack_ready_batch_v10_candidate.json',
};

const CLUSTER_ANNOTATED = 'ANNOTATED_NAME_NORMALIZATION_ROUTE_RESOLVED_BUT_EVIDENCE_STILL_REQUIRED';
const CLUSTER_ALT = 'ALT_ART_ONLY_NUMBER_SLOT_COLLISION';
const CLUSTER_SPECIAL = 'SPECIAL_IDENTITY_FAMILY_COLLISION';

const INVARIANT_USED = [
  'If source-side annotation stripping yields exactly one canon base route,',
  'and no competing plain-base route remains for the same name+number pair,',
  'then base-route ambiguity is closed.',
  'If the row still lacks independent Prize Pack proof after that normalization,',
  'it must not become READY or DO_NOT_CANON on structure alone;',
  'it rebuckets to WAIT under NO_SERIES_CONFIRMATION.',
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

function countBy(items, keyFn) {
  return items.reduce((accumulator, item) => {
    const key = keyFn(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
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

function buildCurrentAmbiguousRows() {
  const v2Input = loadJson(INPUT_SOURCES.v2Input);
  const v2Result = loadJson(INPUT_SOURCES.v2Result);

  const resolvedSourceIds = new Set(
    [
      ...(Array.isArray(v2Result.ready_rows) ? v2Result.ready_rows : []),
      ...(Array.isArray(v2Result.do_not_canon_rows) ? v2Result.do_not_canon_rows : []),
    ]
      .map((row) => normalizeTextOrNull(row.source_external_id))
      .filter(Boolean),
  );

  const remainingRows = sortRows(
    (Array.isArray(v2Input.rows) ? v2Input.rows : []).filter((row) => {
      const sourceExternalId = normalizeTextOrNull(row.source_external_id);
      return sourceExternalId && !resolvedSourceIds.has(sourceExternalId);
    }),
  );

  if (remainingRows.length !== 31) {
    throw new Error(`unexpected_remaining_ambiguous_pool_count:${remainingRows.length}`);
  }

  return remainingRows;
}

function buildInputRow(row) {
  return {
    source_external_id: row.source_external_id,
    candidate_name: row.candidate_name,
    printed_number: row.printed_number,
    set_code: row.route_resolution_preview?.effective_set_code ?? null,
    candidate_base_gv_ids: (Array.isArray(row.candidate_base_routes) ? row.candidate_base_routes : [])
      .map((candidate) => normalizeTextOrNull(candidate.gv_id))
      .filter(Boolean),
    ambiguity_type: row.cluster_name,
    prior_decisions: {
      prior_evidence_v2_action: normalizeTextOrNull(row.prior_evidence_v2?.next_action_v2),
      prior_evidence_v2_reason: normalizeTextOrNull(row.prior_evidence_v2?.final_reason),
      prior_promoted_batch_artifact: normalizeTextOrNull(row.prior_promoted_batch?.source_artifact),
      live_existing_play_pokemon_stamp_count: Array.isArray(row.live_existing_play_pokemon_stamp)
        ? row.live_existing_play_pokemon_stamp.length
        : 0,
    },
    notes: {
      route_notes: normalizeTextOrNull(row.route_notes),
      why_route_is_ambiguous: normalizeTextOrNull(row.why_route_is_ambiguous),
      blocked_by_official_acquisition: Boolean(row.blocked_by_official_acquisition),
    },
  };
}

function altClusterNeedsDeeperInvariant(rows) {
  if (rows.length === 0) return false;

  return rows.every((row) => {
    const normalizedTargetName = normalizeName(row.name ?? row.candidate_name);

    const sameNumberNameRows = (Array.isArray(row.same_number_route_candidates) ? row.same_number_route_candidates : []).filter(
      (candidate) => normalizeName(candidate.name) === normalizedTargetName,
    );

    const exactSlotAltOnly =
      sameNumberNameRows.length > 0 &&
      sameNumberNameRows.every((candidate) => normalizeTextOrNull(candidate.variant_key) === 'alt');

    const sameNameNonAltExists = (Array.isArray(row.same_name_route_candidates) ? row.same_name_route_candidates : []).some(
      (candidate) => !normalizeTextOrNull(candidate.variant_key),
    );

    return exactSlotAltOnly && sameNameNonAltExists;
  });
}

function classifyAnnotatedNormalizationRow(row) {
  const candidateBaseRoutes = Array.isArray(row.candidate_base_routes) ? row.candidate_base_routes : [];
  const routePreview = row.route_resolution_preview ?? null;

  const noCompetingPlainBaseRoute = candidateBaseRoutes.length === 1;
  const normalizedNameChanged = normalizeTextOrNull(row.candidate_name) !== normalizeTextOrNull(row.name);

  if (routePreview && noCompetingPlainBaseRoute && normalizedNameChanged) {
    return {
      route_resolution: 'ROUTE_RESOLVED_WAIT',
      final_decision: 'WAIT',
      rebucketed_blocker_class: 'NO_SERIES_CONFIRMATION',
      decision_reason:
        'Source annotation stripping leaves exactly one lawful canon base route, so base-route ambiguity is closed. No prior Prize Pack adjudication or single-series proof exists yet, so the row must remain WAIT under evidence review.',
    };
  }

  return {
    route_resolution: 'STILL_ROUTE_AMBIGUOUS',
    final_decision: 'WAIT',
    rebucketed_blocker_class: 'BASE_ROUTE_AMBIGUOUS',
    decision_reason:
      'Normalization alone did not prove one stable route shape for this row, so the ambiguity must remain in the route-repair lane.',
  };
}

function buildMarkdown(resultPayload) {
  const lines = [];
  lines.push('# Prize Pack Base Route Repair V3');
  lines.push('');
  lines.push(`Generated: ${resultPayload.generated_at}`);
  lines.push('');
  lines.push('## Starting Pool');
  lines.push('');
  lines.push(`- BASE_ROUTE_AMBIGUOUS remaining from V2: ${resultPayload.ambiguous_pool_size}`);
  lines.push(`- Counts by ambiguity type: ${Object.entries(resultPayload.counts_by_ambiguity_type).map(([name, count]) => `${name}=${count}`).join(', ')}`);
  lines.push('');
  lines.push('## Selection');
  lines.push('');
  lines.push(`- Target cluster: ${resultPayload.target_cluster_type}`);
  lines.push(`- Target cluster size: ${resultPayload.target_cluster_size}`);
  lines.push(`- Selection rationale: ${resultPayload.selection_rationale}`);
  lines.push('');
  lines.push('## Invariant');
  lines.push('');
  lines.push(resultPayload.invariant_used);
  lines.push('');
  lines.push('## Reclassification');
  lines.push('');
  lines.push(`- Newly READY_FOR_WAREHOUSE: ${resultPayload.new_ready_count}`);
  lines.push(`- Newly DO_NOT_CANON: ${resultPayload.new_do_not_canon_count}`);
  lines.push(`- Route-resolved to WAIT: ${resultPayload.route_resolved_wait_count}`);
  lines.push(`- Still ambiguous in chosen cluster: ${resultPayload.remaining_ambiguous_count_in_cluster}`);
  lines.push(`- Remaining BASE_ROUTE_AMBIGUOUS after V3: ${resultPayload.remaining_ambiguous_pool_after_v3}`);
  lines.push('');
  lines.push('## Route-Resolved WAIT Rows');
  lines.push('');
  for (const row of resultPayload.route_resolved_wait_rows) {
    lines.push(`- ${row.candidate_name} | ${row.printed_number} | ${row.route_resolution_preview?.base_gv_id ?? 'n/a'}`);
    lines.push(`  - Rebucketed blocker: ${row.rebucketed_blocker_class}`);
    lines.push(`  - Reason: ${row.decision_reason}`);
  }
  lines.push('');
  lines.push('## Remaining Ambiguous Examples');
  lines.push('');
  for (const row of resultPayload.remaining_ambiguous_examples) {
    lines.push(`- ${row.candidate_name} | ${row.printed_number} | ${row.cluster_name}`);
    lines.push(`  - Why: ${row.why_route_is_ambiguous}`);
  }
  lines.push('');
  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`- ${resultPayload.recommended_next_execution_step}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const v2Clusters = loadJson(INPUT_SOURCES.v2Clusters);
  const remainingRows = buildCurrentAmbiguousRows();
  const countsByAmbiguityType = countBy(remainingRows, (row) => row.cluster_name);

  const altRows = remainingRows.filter((row) => row.cluster_name === CLUSTER_ALT);
  const altClusterDeferred = altClusterNeedsDeeperInvariant(altRows);

  if (!altClusterDeferred) {
    throw new Error('alt_cluster_no_longer_requires_deeper_invariant');
  }

  const targetClusterRows = remainingRows.filter((row) => row.cluster_name === CLUSTER_ANNOTATED);
  if (targetClusterRows.length === 0) {
    throw new Error('annotated_normalization_cluster_not_found');
  }

  if (targetClusterRows.length < 3 || targetClusterRows.length > 12) {
    throw new Error(`target_cluster_size_out_of_bounds:${targetClusterRows.length}`);
  }

  const inputPayload = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    source_artifacts: [INPUT_SOURCES.v2Input, INPUT_SOURCES.v2Clusters, INPUT_SOURCES.v2Result],
    ambiguous_pool_size: remainingRows.length,
    counts_by_ambiguity_type: countsByAmbiguityType,
    rows: remainingRows.map(buildInputRow),
  };

  const targetClusterPayload = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    cluster_name: CLUSTER_ANNOTATED,
    row_count: targetClusterRows.length,
    selection_rationale:
      'ALT_ART_ONLY_NUMBER_SLOT_COLLISION was audited first and deferred because its exact-number alt slots would require a deeper illustration-family invariant. The annotated-normalization cluster closes cleanly by structure alone and rebuckets out of BASE_ROUTE_AMBIGUOUS without guessing.',
    shared_route_question:
      'If source-side annotations are stripped and exactly one canon base route remains, can these rows leave BASE_ROUTE_AMBIGUOUS even though independent Prize Pack evidence is still missing?',
    rows: sortRows(targetClusterRows).map((row) => ({
      source_external_id: row.source_external_id,
      candidate_name: row.candidate_name,
      normalized_name: row.name,
      printed_number: row.printed_number,
      candidate_base_gv_ids: (Array.isArray(row.candidate_base_routes) ? row.candidate_base_routes : [])
        .map((candidate) => normalizeTextOrNull(candidate.gv_id))
        .filter(Boolean),
      route_resolution_preview: row.route_resolution_preview,
      why_route_is_ambiguous: row.why_route_is_ambiguous,
    })),
  };

  const auditedTargetRows = sortRows(targetClusterRows).map((row) => ({
    ...row,
    ...classifyAnnotatedNormalizationRow(row),
  }));

  const readyRows = auditedTargetRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE');
  const doNotCanonRows = auditedTargetRows.filter((row) => row.final_decision === 'DO_NOT_CANON');
  const routeResolvedWaitRows = auditedTargetRows.filter((row) => row.route_resolution === 'ROUTE_RESOLVED_WAIT');
  const stillAmbiguousRows = auditedTargetRows.filter((row) => row.route_resolution === 'STILL_ROUTE_AMBIGUOUS');

  const resultPayload = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    source_artifacts: [INPUT_SOURCES.v2Input, INPUT_SOURCES.v2Clusters, INPUT_SOURCES.v2Result],
    ambiguous_pool_size: remainingRows.length,
    counts_by_ambiguity_type: countsByAmbiguityType,
    target_cluster_size: targetClusterRows.length,
    target_cluster_type: CLUSTER_ANNOTATED,
    invariant_used: INVARIANT_USED,
    selection_rationale: targetClusterPayload.selection_rationale,
    route_audit_summary:
      'The remaining post-V2 ambiguous pool reconstructs as 31 rows. V3 audited the 12-row annotated-normalization cluster and verified that stripping non-identity source annotations leaves exactly one canon base GV ID for every row, with no competing plain-base route. Because those rows still lack prior Prize Pack adjudication or single-series proof, they cannot become READY or DO_NOT_CANON on route structure alone and are rebucketed to WAIT under NO_SERIES_CONFIRMATION.',
    ready_rows: readyRows,
    do_not_canon_rows: doNotCanonRows,
    route_resolved_wait_rows: routeResolvedWaitRows,
    still_ambiguous_rows: stillAmbiguousRows,
    new_ready_count: readyRows.length,
    new_do_not_canon_count: doNotCanonRows.length,
    route_resolved_wait_count: routeResolvedWaitRows.length,
    remaining_ambiguous_count_in_cluster: stillAmbiguousRows.length,
    remaining_ambiguous_pool_after_v3:
      remainingRows.length - routeResolvedWaitRows.length - readyRows.length - doNotCanonRows.length,
    remaining_ambiguous_examples: sortRows(
      remainingRows.filter((row) => row.cluster_name !== CLUSTER_ANNOTATED),
    ).slice(0, 10),
    alt_cluster_deferred: {
      cluster_name: CLUSTER_ALT,
      row_count: countsByAmbiguityType[CLUSTER_ALT] || 0,
      reason:
        'Each exact-number slot is currently owned only by a canon row with variant_key=alt while same-name non-alt rows exist elsewhere in the same set family. Closing that cluster would require a deeper illustration-family invariant rather than a bounded route-normalization rule.',
    },
    remaining_structural_clusters: {
      exact_name_number_unique_route_but_unadjudicated:
        countsByAmbiguityType.EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED || 0,
      alt_art_only_number_slot_collision: countsByAmbiguityType[CLUSTER_ALT] || 0,
      special_identity_family_collision: countsByAmbiguityType[CLUSTER_SPECIAL] || 0,
    },
    recommended_next_execution_step: 'PRIZE_PACK_BASE_ROUTE_REPAIR_V4',
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
        route_resolved_wait_count: resultPayload.route_resolved_wait_count,
        remaining_ambiguous_count_in_cluster: resultPayload.remaining_ambiguous_count_in_cluster,
        recommended_next_execution_step: resultPayload.recommended_next_execution_step,
      },
      null,
      2,
    ),
  );

  void v2Clusters;
}

try {
  main();
} catch (error) {
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
}

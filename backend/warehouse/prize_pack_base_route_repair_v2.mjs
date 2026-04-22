import '../env.mjs';

import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

const WORKFLOW = 'PRIZE_PACK_BASE_ROUTE_REPAIR_V2';
const ARTIFACT_CHAIN = [
  'docs/checkpoints/warehouse/prize_pack_evidence_v2.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v3.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v4.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v5.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v6_nonblocked.json',
  'docs/checkpoints/warehouse/prize_pack_ready_batch_v6_nonblocked.json',
  'docs/checkpoints/warehouse/prize_pack_ready_batch_v6_residue_5.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v7_nonblocked.json',
  'docs/checkpoints/warehouse/prize_pack_ready_batch_v7_nonblocked.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v8_nonblocked.json',
  'docs/checkpoints/warehouse/prize_pack_ready_batch_v8_nonblocked.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v9_nonblocked_input.json',
  'docs/checkpoints/warehouse/prize_pack_evidence_v9_nonblocked.json',
];

const INPUT_PATH = 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json';
const CLUSTERS_PATH = 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_clusters.json';
const TARGET_CLUSTER_PATH = 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_target_cluster.json';
const RESULT_JSON_PATH = 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2.json';
const RESULT_MD_PATH = 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2.md';
const READY_BATCH_PATH = 'docs/checkpoints/warehouse/prize_pack_ready_batch_v10_candidate.json';

const CLUSTER_ALIAS_ADJUDICATED = 'ANNOTATED_ALIAS_OF_PREVIOUSLY_ADJUDICATED_IDENTITY';
const CLUSTER_ANNOTATED_NEEDS_EVIDENCE = 'ANNOTATED_NAME_NORMALIZATION_ROUTE_RESOLVED_BUT_EVIDENCE_STILL_REQUIRED';
const CLUSTER_EXACT_UNADJUDICATED = 'EXACT_NAME_NUMBER_UNIQUE_ROUTE_BUT_UNADJUDICATED';
const CLUSTER_ALT_COLLISION = 'ALT_ART_ONLY_NUMBER_SLOT_COLLISION';
const CLUSTER_SPECIAL_COLLISION = 'SPECIAL_IDENTITY_FAMILY_COLLISION';

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

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const compact = normalized.replace(/[⁄∕]/g, '/').replace(/\s+/g, '');
  const left = compact.includes('/') ? compact.split('/', 1)[0] : compact;
  const digits = left.replace(/[^0-9]/g, '');
  if (digits.length > 0) {
    return digits.replace(/^0+/, '') || '0';
  }
  return left.toUpperCase();
}

function normalizePrintedNumberForCompare(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const compact = normalized.replace(/[⁄∕]/g, '/').replace(/\s+/g, '');
  return compact.toUpperCase();
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

function stripSourceAnnotations(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;

  return normalized
    .replace(/\s*\(Series\s*\d+\)\s*$/i, '')
    .replace(/\s*\((Duplicate|Wrong Image)\)\s*$/i, '')
    .replace(/\s*-\s*MEE\d+\s*$/i, '')
    .replace(/\s*-\s*\d+\s*\/\s*\d+.*$/i, '')
    .replace(/\s*\((\d+)\)\s*$/i, '')
    .replace(/\s*\(Professor Juniper\)\s*$/i, '')
    .trim();
}

function hasSourceAnnotation(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return false;
  return /\(| - |series\s*\d+|MEE\d+/i.test(normalized);
}

function compactRouteCandidate(row) {
  return {
    gv_id: normalizeTextOrNull(row.gv_id),
    card_print_id: normalizeTextOrNull(row.id),
    name: normalizeTextOrNull(row.name),
    set_code: normalizeTextOrNull(row.set_code),
    number: normalizeTextOrNull(row.number),
    number_plain: normalizeTextOrNull(row.number_plain),
    variant_key: normalizeTextOrNull(row.variant_key),
  };
}

function buildBatchArtifactMap(paths) {
  const promotedByBaseGvId = new Map();

  for (const relativePath of paths) {
    const payload = loadJson(relativePath);
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];

    for (const row of rows) {
      const baseGvId =
        normalizeTextOrNull(row.base_gv_id) ??
        normalizeTextOrNull(row.underlying_base_proof?.base_gv_id) ??
        normalizeTextOrNull(row.underlying_base_proof_summary?.base_gv_id) ??
        normalizeTextOrNull(row.target_base_resolution?.base_gv_id);
      if (!baseGvId) continue;

      const promotedCardPrintId =
        normalizeTextOrNull(row.card_print_id) ??
        normalizeTextOrNull(row.executor_apply?.promoted_card_print_id);
      const warehouseState = normalizeTextOrNull(row.warehouse_state);

      if (!promotedCardPrintId && warehouseState !== 'PROMOTED') {
        continue;
      }

      promotedByBaseGvId.set(baseGvId, {
        source_artifact: relativePath,
        promoted_card_print_id: promotedCardPrintId,
        promoted_gv_id: normalizeTextOrNull(row.gv_id) ?? normalizeTextOrNull(row.executor_apply?.promoted_gv_id),
        name: normalizeTextOrNull(row.promoted_name) ?? normalizeTextOrNull(row.name),
        printed_number: normalizeTextOrNull(row.promoted_number) ?? normalizeTextOrNull(row.printed_number),
        variant_key: normalizeTextOrNull(row.promoted_variant_key) ?? normalizeTextOrNull(row.variant_key),
      });
    }
  }

  return {
    promotedByBaseGvId,
  };
}

function buildEvidenceV2Map() {
  const payload = loadJson('docs/checkpoints/warehouse/prize_pack_evidence_v2.json');
  const byBaseGvId = new Map();

  for (const row of payload.row_outcomes ?? []) {
    const baseGvId = normalizeTextOrNull(row.base_gv_id) ?? normalizeTextOrNull(row.base_route);
    if (!baseGvId) continue;
    byBaseGvId.set(baseGvId, {
      source_artifact: 'docs/checkpoints/warehouse/prize_pack_evidence_v2.json',
      candidate_name: normalizeTextOrNull(row.candidate_name),
      printed_number: normalizeTextOrNull(row.printed_number),
      next_action_v2: normalizeTextOrNull(row.next_action_v2),
      evidence_class_v2: normalizeTextOrNull(row.evidence_class_v2),
      appearance_in_series: Array.isArray(row.appearance_in_series) ? row.appearance_in_series : [],
      decision_reason_v2: normalizeTextOrNull(row.decision_reason_v2),
      evidence_tier: normalizeTextOrNull(row.evidence_tier),
      effective_set_code: normalizeTextOrNull(row.effective_set_code),
      effective_set_name: normalizeTextOrNull(row.effective_set_name),
      final_reason:
        normalizeTextOrNull(row.final_reason) ??
        normalizeTextOrNull(row.decision_reason_v2) ??
        normalizeTextOrNull(row.next_action_v2),
    });
  }

  return byBaseGvId;
}

function reconstructCurrentAmbiguousPool() {
  const input = loadJson('docs/checkpoints/warehouse/prize_pack_evidence_v9_nonblocked_input.json');
  const result = loadJson('docs/checkpoints/warehouse/prize_pack_evidence_v9_nonblocked.json');

  const excludedSourceIds = new Set([
    ...(Array.isArray(result.ready_rows) ? result.ready_rows : []),
    ...(Array.isArray(result.do_not_canon_rows) ? result.do_not_canon_rows : []),
  ]
    .map((row) => normalizeTextOrNull(row.source_external_id))
    .filter(Boolean));

  const currentWaitRows = (Array.isArray(input.rows) ? input.rows : []).filter((row) => {
    const sourceExternalId = normalizeTextOrNull(row.source_external_id);
    return sourceExternalId && !excludedSourceIds.has(sourceExternalId);
  });

  const ambiguousRows = currentWaitRows.filter(
    (row) => normalizeTextOrNull(row.current_blocker_class) === 'BASE_ROUTE_AMBIGUOUS',
  );

  if (currentWaitRows.length !== 146) {
    throw new Error(`unexpected_current_wait_count:${currentWaitRows.length}`);
  }

  if (ambiguousRows.length !== 38) {
    throw new Error(`unexpected_ambiguous_pool_count:${ambiguousRows.length}`);
  }

  return ambiguousRows;
}

async function auditAmbiguousRow(pool, row, evidenceV2Map, promotedBatchMap) {
  const cleanName = stripSourceAnnotations(row.candidate_name) ?? row.candidate_name;
  const normalizedCleanName = normalizeName(cleanName);
  const normalizedPrintedNumber = normalizePrintedNumberForCompare(row.printed_number);
  const normalizedNumberPlain = normalizeNumberPlain(row.printed_number);

  const sameNumberResult = await pool.query(
    `
      select
        id,
        gv_id,
        name,
        set_code,
        number,
        number_plain,
        variant_key
      from public.card_prints
      where number_plain = $1 or upper(number) = $2 or upper(number) = $3
      order by set_code, number_plain, name
    `,
    [normalizedNumberPlain, normalizedPrintedNumber, normalizedNumberPlain],
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
        variant_key
      from public.card_prints
      where lower(name) = lower($1)
      order by set_code, number_plain, name
    `,
    [cleanName],
  );

  const sameNumberRoutes = sameNumberResult.rows.map(compactRouteCandidate);
  const sameNameRoutes = sameNameResult.rows.map(compactRouteCandidate);

  const normalizedBaseMatches = sameNumberRoutes.filter(
    (candidate) => !normalizeTextOrNull(candidate.variant_key) && normalizeName(candidate.name) === normalizedCleanName,
  );

  const variantExactNumberMatches = sameNumberRoutes.filter(
    (candidate) =>
      normalizeTextOrNull(candidate.variant_key) &&
      normalizeName(candidate.name) === normalizedCleanName,
  );

  const uniqueBaseRoute = normalizedBaseMatches.length === 1 ? normalizedBaseMatches[0] : null;
  const baseGvId = normalizeTextOrNull(uniqueBaseRoute?.gv_id);

  const livePlayStampResult =
    uniqueBaseRoute &&
    (await pool.query(
      `
        select
          id,
          gv_id,
          name,
          set_code,
          number,
          number_plain,
          variant_key
        from public.card_prints
        where lower(set_code) = lower($1)
          and number_plain = $2
          and coalesce(variant_key, '') = 'play_pokemon_stamp'
        order by gv_id
      `,
      [uniqueBaseRoute.set_code, uniqueBaseRoute.number_plain],
    ));

  const liveExistingPlayStamp = livePlayStampResult?.rows?.map(compactRouteCandidate) ?? [];
  const priorEvidenceV2 = baseGvId ? evidenceV2Map.get(baseGvId) ?? null : null;
  const priorPromotedBatch = baseGvId ? promotedBatchMap.get(baseGvId) ?? null : null;

  let clusterName = CLUSTER_SPECIAL_COLLISION;
  let ambiguityQuestion = 'Does this row belong to a different special identity family that still lacks a lawful plain-base route?';
  let whyAmbiguous = 'The row still lacks a deterministic route shape classification.';

  if (hasSourceAnnotation(row.candidate_name) && uniqueBaseRoute) {
    const previouslyAdjudicated = Boolean(
      liveExistingPlayStamp.length > 0 ||
        priorPromotedBatch ||
        priorEvidenceV2?.next_action_v2 === 'DO_NOT_CANON',
    );

    if (previouslyAdjudicated) {
      clusterName = CLUSTER_ALIAS_ADJUDICATED;
      ambiguityQuestion =
        'After stripping JustTCG source-side annotations, does this row collapse onto a Prize Pack identity already adjudicated elsewhere in the artifact chain?';
      whyAmbiguous =
        'The source name decoration prevented the row from inheriting a prior Prize Pack decision tied to the same underlying base route.';
    } else {
      clusterName = CLUSTER_ANNOTATED_NEEDS_EVIDENCE;
      ambiguityQuestion =
        'Which canon base row owns this annotated name+number pair after stripping non-identity source annotations, and does any independent Prize Pack evidence remain after that cleanup?';
      whyAmbiguous =
        'The underlying base route resolves after annotation cleanup, but no prior Prize Pack adjudication or live canonical stamped row exists yet.';
    }
  } else if (!hasSourceAnnotation(row.candidate_name) && uniqueBaseRoute) {
    clusterName = CLUSTER_EXACT_UNADJUDICATED;
    ambiguityQuestion =
      'Does the exact name+printed-number pair already determine one lawful canon base route even without extra source-name cleanup?';
    whyAmbiguous =
      'The row has one live canon base route by exact name+number, but that route has not yet been carried through a Prize Pack adjudication artifact.';
  } else if (variantExactNumberMatches.some((candidate) => normalizeTextOrNull(candidate.variant_key) === 'alt')) {
    clusterName = CLUSTER_ALT_COLLISION;
    ambiguityQuestion =
      'When the only exact name+number canon target is an alt-art row, is there a lawful plain-base route or does the ambiguity reflect an illustration-layer collision?';
    whyAmbiguous =
      'The exact number slot is occupied only by an alt-art canon row, so the generic Prize Pack stamp cannot yet attach to a lawful plain-base route.';
  } else {
    clusterName = CLUSTER_SPECIAL_COLLISION;
    ambiguityQuestion =
      'Does the source row point to a lawful plain-base canon route, or only to a different special-identity family that already carries non-empty variant semantics?';
    whyAmbiguous =
      'The exact name+number slot only matches a special-family canon row with non-empty variant semantics, so the plain Prize Pack route is still unresolved.';
  }

  return {
    source: normalizeTextOrNull(row.source),
    source_set_id: normalizeTextOrNull(row.source_set_id),
    source_external_id: normalizeTextOrNull(row.source_external_id),
    candidate_name: normalizeTextOrNull(row.candidate_name),
    name: cleanName,
    printed_number: normalizeTextOrNull(row.printed_number),
    normalized_number_plain: normalizeTextOrNull(row.normalized_number_plain),
    proposed_variant_key: normalizeTextOrNull(row.variant_hint) ?? 'play_pokemon_stamp',
    current_blocker_class: normalizeTextOrNull(row.current_blocker_class),
    blocked_by_official_acquisition: Boolean(row.blocked_by_official_acquisition),
    prior_evidence_pass_history: Array.isArray(row.previous_evidence_pass_history)
      ? row.previous_evidence_pass_history
      : [],
    candidate_base_routes: normalizedBaseMatches,
    same_number_route_candidates: sameNumberRoutes,
    same_name_route_candidates: sameNameRoutes,
    live_existing_play_pokemon_stamp: liveExistingPlayStamp,
    exact_name_number_base_match_count: normalizedBaseMatches.length,
    prior_evidence_v2: priorEvidenceV2,
    prior_promoted_batch: priorPromotedBatch,
    cluster_name: clusterName,
    shared_ambiguity_question: ambiguityQuestion,
    why_route_is_ambiguous: whyAmbiguous,
    route_notes: uniqueBaseRoute
      ? `Normalized source name resolves uniquely to ${uniqueBaseRoute.gv_id}.`
      : 'No lawful plain-base row survives the current name+number route audit.',
    route_resolution_preview: uniqueBaseRoute
      ? {
          base_gv_id: uniqueBaseRoute.gv_id,
          base_name: uniqueBaseRoute.name,
          effective_set_code: uniqueBaseRoute.set_code,
          printed_number: uniqueBaseRoute.number,
          number_plain: uniqueBaseRoute.number_plain,
        }
      : null,
  };
}

function buildClusterMetadata(rows) {
  const clusterConfig = {
    [CLUSTER_ALIAS_ADJUDICATED]: {
      shared_ambiguity_question:
        'After stripping JustTCG source-side annotations, does this row collapse onto a Prize Pack identity already adjudicated elsewhere in the artifact chain?',
      candidate_route_patterns: [
        'Inline Series marker suffix',
        'Inline Duplicate/Wrong Image suffix',
        'MEE energy code suffix',
      ],
    },
    [CLUSTER_ANNOTATED_NEEDS_EVIDENCE]: {
      shared_ambiguity_question:
        'Which canon base row owns this annotated name+number pair after stripping non-identity source annotations, and does any independent Prize Pack evidence remain after that cleanup?',
      candidate_route_patterns: [
        'Trailing collector number parentheses',
        'Professor subtitle parentheses',
        'MEE energy code suffix without prior adjudication',
      ],
    },
    [CLUSTER_EXACT_UNADJUDICATED]: {
      shared_ambiguity_question:
        'Does the exact name+printed-number pair already determine one lawful canon base route even without extra source-name cleanup?',
      candidate_route_patterns: ['Exact name match', 'Exact slash-number match', 'No source annotation'],
    },
    [CLUSTER_ALT_COLLISION]: {
      shared_ambiguity_question:
        'When the only exact name+number canon target is an alt-art row, is there a lawful plain-base route or does the ambiguity reflect an illustration-layer collision?',
      candidate_route_patterns: ['Exact printed number resolves only to alt-art slot', 'Same-name family exists at other numbers'],
    },
    [CLUSTER_SPECIAL_COLLISION]: {
      shared_ambiguity_question:
        'Does the source row point to a lawful plain-base canon route, or only to a different special-identity family that already carries non-empty variant semantics?',
      candidate_route_patterns: ['Exact number route lands on non-empty variant_key', 'No plain-base same-number owner'],
    },
  };

  return Object.entries(clusterConfig)
    .map(([clusterName, config]) => {
      const clusterRows = rows.filter((row) => row.cluster_name === clusterName);
      return {
        cluster_name: clusterName,
        row_count: clusterRows.length,
        shared_ambiguity_question: config.shared_ambiguity_question,
        candidate_route_patterns: config.candidate_route_patterns,
        rows: clusterRows.map((row) => ({
          source_external_id: row.source_external_id,
          candidate_name: row.candidate_name,
          printed_number: row.printed_number,
          route_resolution_preview: row.route_resolution_preview,
        })),
      };
    })
    .filter((cluster) => cluster.row_count > 0);
}

function classifyChosenClusterRow(row) {
  if (row.live_existing_play_pokemon_stamp.length > 0 || row.prior_promoted_batch) {
    return {
      route_resolution: 'ROUTE_RESOLVED_DO_NOT_CANON',
      final_decision: 'DO_NOT_CANON',
      decision_reason:
        'The normalized row collapses onto a Prize Pack stamped identity that is already canonical, so the annotated source row must not create a second canon target.',
    };
  }

  if (row.prior_evidence_v2?.next_action_v2 === 'DO_NOT_CANON') {
    return {
      route_resolution: 'ROUTE_RESOLVED_DO_NOT_CANON',
      final_decision: 'DO_NOT_CANON',
      decision_reason:
        'The normalized row collapses onto a base route that Prize Pack Evidence V2 already proved to be a multi-series duplicate without a printed distinction.',
    };
  }

  if (row.prior_evidence_v2?.next_action_v2 === 'READY_FOR_WAREHOUSE') {
    return {
      route_resolution: 'ROUTE_RESOLVED_READY',
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_reason:
        'The normalized row collapses onto a base route that prior Prize Pack evidence already proved as a single-series confirmed stamped identity.',
    };
  }

  return {
    route_resolution: 'STILL_ROUTE_AMBIGUOUS',
    final_decision: 'WAIT',
    decision_reason: 'The row does not inherit a prior adjudication after route normalization, so this cluster is not clean for rebucketing.',
  };
}

function buildReadyBatchRow(batchIndex, row) {
  const route = row.route_resolution_preview;
  return {
    batch_index: batchIndex,
    source: row.source,
    source_set_id: row.source_set_id,
    source_external_id: row.source_external_id,
    source_candidate_id: null,
    name: row.name,
    candidate_name: row.candidate_name,
    printed_number: row.printed_number,
    number_plain: row.normalized_number_plain,
    normalized_number_plain: row.normalized_number_plain,
    proposed_variant_key: row.proposed_variant_key,
    variant_key: row.proposed_variant_key,
    stamp_label: 'Play! Pokémon Stamp',
    governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
    governing_rules: [
      'STAMPED_IDENTITY_RULE_V1',
      'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      'PRIZE_PACK_BASE_ROUTE_REPAIR_V2',
    ],
    source_family: row.source_set_id,
    evidence_class: 'CONFIRMED_IDENTITY',
    evidence_tier: normalizeTextOrNull(row.prior_evidence_v2?.evidence_tier) ?? normalizeTextOrNull(row.evidence_tier),
    supported_series_list: row.prior_evidence_v2?.appearance_in_series ?? [],
    effective_identity_space: route?.effective_set_code ?? null,
    effective_set_code: route?.effective_set_code ?? null,
    effective_routed_set_code: route?.effective_set_code ?? null,
    effective_set_name: row.prior_evidence_v2?.effective_set_name ?? null,
    canonical_queue_key: `${route?.effective_set_code ?? 'unknown'}::${row.name}::${row.printed_number}::${row.proposed_variant_key}`,
    base_gv_id: route?.base_gv_id ?? null,
    base_route: route?.base_gv_id ?? null,
    underlying_base_proof: {
      base_gv_id: route?.base_gv_id ?? null,
      base_route: route?.base_gv_id ?? null,
      unique_base_route: true,
      base_card_name: route?.base_name ?? null,
    },
    final_decision: 'READY_FOR_WAREHOUSE',
    decision_code: 'route_repair_v2_inherited_prior_adjudication',
    final_reason: row.decision_reason,
  };
}

function buildMarkdown(resultPayload) {
  const lines = [];
  lines.push('# Prize Pack Base Route Repair V2');
  lines.push('');
  lines.push(`Generated: ${resultPayload.generated_at}`);
  lines.push('');
  lines.push('## Starting Pool');
  lines.push('');
  lines.push(`- BASE_ROUTE_AMBIGUOUS: ${resultPayload.ambiguous_pool.total}`);
  lines.push(`- Nonblocked: ${resultPayload.ambiguous_pool.nonblocked}`);
  lines.push(`- Acquisition-blocked overlap: ${resultPayload.ambiguous_pool.acquisition_blocked_overlap}`);
  lines.push('');
  lines.push('## Cluster Map');
  lines.push('');
  for (const cluster of resultPayload.cluster_summaries) {
    lines.push(`- ${cluster.cluster_name}: ${cluster.row_count}`);
    lines.push(`  - Question: ${cluster.shared_ambiguity_question}`);
  }
  lines.push('');
  lines.push('## Chosen Cluster');
  lines.push('');
  lines.push(`- Cluster: ${resultPayload.target_cluster.cluster_name}`);
  lines.push(`- Rows: ${resultPayload.target_cluster.row_count}`);
  lines.push(`- Shared question: ${resultPayload.target_cluster.shared_ambiguity_question}`);
  lines.push('');
  lines.push('## Reclassification');
  lines.push('');
  lines.push(`- READY_FOR_WAREHOUSE: ${resultPayload.summary.new_ready_count}`);
  lines.push(`- DO_NOT_CANON: ${resultPayload.summary.new_do_not_canon_count}`);
  lines.push(`- Still ambiguous in chosen cluster: ${resultPayload.summary.remaining_ambiguous_in_cluster}`);
  lines.push(`- Remaining BASE_ROUTE_AMBIGUOUS overall after rebucket: ${resultPayload.summary.remaining_ambiguous_overall_after_v2}`);
  lines.push('');
  lines.push('## Newly DO_NOT_CANON');
  lines.push('');
  for (const row of resultPayload.do_not_canon_rows) {
    lines.push(`- ${row.candidate_name} | ${row.printed_number} | ${row.route_resolution_preview?.base_gv_id ?? 'n/a'}`);
    lines.push(`  - Reason: ${row.decision_reason}`);
  }
  if (resultPayload.ready_rows.length > 0) {
    lines.push('');
    lines.push('## Newly READY_FOR_WAREHOUSE');
    lines.push('');
    for (const row of resultPayload.ready_rows) {
      lines.push(`- ${row.candidate_name} | ${row.printed_number} | ${row.route_resolution_preview?.base_gv_id ?? 'n/a'}`);
      lines.push(`  - Reason: ${row.decision_reason}`);
    }
  }
  lines.push('');
  lines.push('## Remaining Ambiguous Examples');
  lines.push('');
  for (const row of resultPayload.remaining_examples) {
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

async function main() {
  const ambiguousRows = reconstructCurrentAmbiguousPool();
  const evidenceV2Map = buildEvidenceV2Map();
  const promotedBatchMap = buildBatchArtifactMap([
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v1_129.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v2_72.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v3_23.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v4.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v5.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v6_nonblocked.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v6_residue_5.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v7_nonblocked.json',
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v8_nonblocked.json',
  ]).promotedByBaseGvId;

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const auditedRows = [];
    for (const row of ambiguousRows) {
      auditedRows.push(await auditAmbiguousRow(pool, row, evidenceV2Map, promotedBatchMap));
    }

    const inputPayload = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      source_artifacts: ARTIFACT_CHAIN,
      ambiguous_pool: {
        total: auditedRows.length,
        nonblocked: auditedRows.filter((row) => !row.blocked_by_official_acquisition).length,
        acquisition_blocked_overlap: auditedRows.filter((row) => row.blocked_by_official_acquisition).length,
      },
      rows: auditedRows,
    };

    const clusterSummaries = buildClusterMetadata(auditedRows);
    const targetClusterRows = auditedRows.filter((row) => row.cluster_name === CLUSTER_ALIAS_ADJUDICATED);

    if (targetClusterRows.length === 0) {
      throw new Error('no_repairable_cluster_found');
    }

    const targetClusterPayload = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      cluster_name: CLUSTER_ALIAS_ADJUDICATED,
      row_count: targetClusterRows.length,
      shared_ambiguity_question:
        'After stripping JustTCG source-side annotations, does this row collapse onto a Prize Pack identity already adjudicated elsewhere in the artifact chain?',
      rows: targetClusterRows,
    };

    const reclassifiedRows = targetClusterRows.map((row) => ({
      ...row,
      ...classifyChosenClusterRow(row),
    }));

    const readyRows = reclassifiedRows.filter((row) => row.final_decision === 'READY_FOR_WAREHOUSE');
    const doNotCanonRows = reclassifiedRows.filter((row) => row.final_decision === 'DO_NOT_CANON');
    const stillAmbiguousRows = reclassifiedRows.filter((row) => row.route_resolution === 'STILL_ROUTE_AMBIGUOUS');

    const resultPayload = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      source_artifacts: ARTIFACT_CHAIN,
      ambiguous_pool: inputPayload.ambiguous_pool,
      cluster_summaries: clusterSummaries,
      target_cluster: {
        cluster_name: CLUSTER_ALIAS_ADJUDICATED,
        row_count: targetClusterRows.length,
        shared_ambiguity_question:
          'After stripping JustTCG source-side annotations, does this row collapse onto a Prize Pack identity already adjudicated elsewhere in the artifact chain?',
      },
      route_audit_evidence_used: [
        'Live canon public.card_prints name+number route audit',
        'docs/checkpoints/warehouse/prize_pack_evidence_v2.json row_outcomes',
        'Previously executed Prize Pack ready-batch artifacts through V8',
      ],
      ready_rows: readyRows,
      do_not_canon_rows: doNotCanonRows,
      still_ambiguous_rows: stillAmbiguousRows,
      summary: {
        rows_investigated: targetClusterRows.length,
        new_ready_count: readyRows.length,
        new_do_not_canon_count: doNotCanonRows.length,
        remaining_ambiguous_in_cluster: stillAmbiguousRows.length,
        remaining_ambiguous_overall_after_v2: auditedRows.length - readyRows.length - doNotCanonRows.length,
        do_not_canon_total_after_v2: 174 + doNotCanonRows.length,
        wait_total_after_v2: 146 - readyRows.length - doNotCanonRows.length,
      },
      remaining_examples: auditedRows
        .filter((row) => row.cluster_name !== CLUSTER_ALIAS_ADJUDICATED)
        .slice(0, 8),
      recommended_next_execution_step: 'PRIZE_PACK_BASE_ROUTE_REPAIR_V3',
    };

    writeJson(INPUT_PATH, inputPayload);
    writeJson(CLUSTERS_PATH, {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      source_artifacts: ARTIFACT_CHAIN,
      clusters: clusterSummaries,
    });
    writeJson(TARGET_CLUSTER_PATH, targetClusterPayload);
    writeJson(RESULT_JSON_PATH, resultPayload);
    writeText(RESULT_MD_PATH, buildMarkdown(resultPayload));

    if (readyRows.length > 0) {
      writeJson(READY_BATCH_PATH, {
        generated_at: new Date().toISOString(),
        workflow: 'PRIZE_PACK_READY_BATCH_V10_CANDIDATE',
        status: 'READY_SUBSET_IDENTIFIED',
        source_artifacts: [RESULT_JSON_PATH, TARGET_CLUSTER_PATH],
        selection_summary: {
          row_count: readyRows.length,
          governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
          variant_key: 'play_pokemon_stamp',
          target_origin: WORKFLOW,
        },
        rows: readyRows.map((row, index) => buildReadyBatchRow(index + 1, row)),
      });
    }

    console.log(
      JSON.stringify(
        {
          workflow: WORKFLOW,
          ambiguous_pool_size: inputPayload.ambiguous_pool.total,
          target_cluster_size: targetClusterRows.length,
          new_ready_count: readyRows.length,
          new_do_not_canon_count: doNotCanonRows.length,
          remaining_ambiguous_count_in_cluster: stillAmbiguousRows.length,
          recommended_next_execution_step: 'PRIZE_PACK_BASE_ROUTE_REPAIR_V3',
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

import '../env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const { Client } = pg;

const WORKFLOW = 'PRIZE_PACK_READY_BATCH_V12';
const ROOT_DIR = process.cwd();
const CHECKPOINT_DIR = path.join(ROOT_DIR, 'docs', 'checkpoints', 'warehouse');
const CANDIDATE_BATCH_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_ready_batch_v12_candidate.json',
);
const EVIDENCE_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v12_nonblocked.json');
const OUTPUT_JSON_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v12.json');
const OUTPUT_MD_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_ready_batch_v12.md');

const SOURCE_SET_ID = 'prize-pack-series-cards-pokemon';
const FOUNDER_EMAIL = 'ccabrl@gmail.com';
const FOUNDER_APPROVAL_NOTE =
  'PRIZE_PACK_READY_BATCH_V12 founder approval under GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1 review.';

const EXPECTED_ROWS = [
  { name: 'Genesect', printed_number: '040/064', effective_set_code: 'sv6pt5', base_gv_id: 'GV-PK-SFA-40' },
  { name: 'Copperajah', printed_number: '042/064', effective_set_code: 'sv6pt5', base_gv_id: 'GV-PK-SFA-42' },
  { name: 'Binding Mochi', printed_number: '055/064', effective_set_code: 'sv6pt5', base_gv_id: 'GV-PK-SFA-55' },
  { name: 'Neutralization Zone', printed_number: '060/064', effective_set_code: 'sv6pt5', base_gv_id: 'GV-PK-SFA-60' },
];

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const match = normalized.match(/\d+/);
  if (!match) return normalized;
  return match[0].replace(/^0+(?=\d)/, '');
}

function ensureDir(filePath) {
  return fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, text) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, text, 'utf8');
}

function relativeCheckpointPath(filePath) {
  return path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
}

function log(event, payload = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      workflow: WORKFLOW,
      event,
      ...payload,
    }),
  );
}

function parseJsonLines(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getWorkerSummary(logs) {
  return logs.find((entry) => entry?.event === 'worker_complete') ?? null;
}

function tryParseJson(text) {
  const normalized = String(text ?? '').trim();
  if (!normalized) return null;
  try {
    return JSON.parse(normalized);
  } catch {
    const firstBrace = normalized.indexOf('{');
    const lastBrace = normalized.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function runNodeScript(scriptRelativePath, args, label) {
  const scriptPath = path.join(ROOT_DIR, scriptRelativePath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT_DIR,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      `${label}_nonzero_exit:${result.status}:${(result.stderr || result.stdout || '').trim()}`,
    );
  }

  const logs = parseJsonLines(result.stdout);
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    logs,
    summary: getWorkerSummary(logs) ?? tryParseJson(result.stdout),
  };
}

function assertWorkerResults(summary, label, allowedStatuses) {
  if (!summary || !Array.isArray(summary.results)) {
    throw new Error(`${label}_missing_worker_complete`);
  }

  const disallowed = summary.results.filter((result) => !allowedStatuses.has(result.status));
  if (disallowed.length > 0) {
    throw new Error(`${label}_unexpected_status:${JSON.stringify(disallowed)}`);
  }
}

async function createClient() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

async function fetchOne(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? null;
}

async function fetchAll(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function buildExpectedKey(row) {
  return [
    normalizeLowerOrNull(row.name),
    normalizeTextOrNull(row.printed_number),
    normalizeLowerOrNull(row.effective_set_code),
  ].join('::');
}

async function loadAndValidateCandidateBatch() {
  const parsed = await readJson(CANDIDATE_BATCH_PATH);
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : null;
  if (!rows || rows.length !== 4) {
    throw new Error(`candidate_batch_invalid_row_count:${rows?.length ?? 0}`);
  }

  const expectedKeys = new Set(EXPECTED_ROWS.map((row) => buildExpectedKey(row)));
  const actualKeys = rows.map((row) => buildExpectedKey(row));

  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      throw new Error(`candidate_batch_unexpected_row:${key}`);
    }
  }

  for (const row of rows) {
    if (normalizeLowerOrNull(row.variant_key) !== 'play_pokemon_stamp') {
      throw new Error(`candidate_batch_variant_mismatch:${row.source_external_id}`);
    }
    const supportedSeries = Array.isArray(row.confirmed_series_coverage)
      ? row.confirmed_series_coverage
      : [];
    if (supportedSeries.length !== 1) {
      throw new Error(`candidate_batch_series_mismatch:${row.source_external_id}`);
    }
    if (normalizeTextOrNull(row.governing_rule) !== 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1') {
      throw new Error(`candidate_batch_rule_mismatch:${row.source_external_id}`);
    }
  }

  return parsed;
}

async function fetchFounderUserId(client) {
  const founder = await fetchOne(
    client,
    `
      select id
      from auth.users
      where lower(email) = lower($1)
      limit 1
    `,
    [FOUNDER_EMAIL],
  );
  if (!founder?.id) {
    throw new Error(`founder_user_not_found:${FOUNDER_EMAIL}`);
  }
  return founder.id;
}

async function fetchBaseRow(client, gvId) {
  return fetchOne(
    client,
    `
      select id, gv_id, set_code, name, number, number_plain,
             image_url, representative_image_url, image_status, image_note, image_source
      from public.card_prints
      where gv_id = $1
      limit 1
    `,
    [gvId],
  );
}

async function fetchSourceCandidate(client, sourceSetId, sourceExternalId) {
  return fetchOne(
    client,
    `
      select id, raw_import_id, upstream_id, set_id, source, tcgplayer_id, card_print_id, created_at
      from public.external_discovery_candidates
      where source = 'justtcg'
        and set_id = $1
        and upstream_id = $2
      order by created_at desc, id desc
      limit 1
    `,
    [sourceSetId, sourceExternalId],
  );
}

async function fetchWarehouseCandidateBySourceCandidateId(client, sourceCandidateId) {
  return fetchOne(
    client,
    `
      select
        id,
        state,
        proposed_action_type,
        current_review_hold_reason,
        current_staging_id,
        founder_approved_by_user_id,
        founder_approved_at,
        founder_approval_notes,
        promoted_card_print_id,
        promoted_at,
        promotion_result_type
      from public.canon_warehouse_candidates
      where reference_hints_payload->>'source_candidate_id' = $1
      order by created_at desc, id desc
      limit 1
    `,
    [sourceCandidateId],
  );
}

async function fetchPromotedVariantRow(client, effectiveSetCode, name, printedNumber, variantKey) {
  const numberPlain = normalizeNumberPlain(printedNumber);
  return fetchOne(
    client,
    `
      select
        id,
        gv_id,
        set_code,
        name,
        number,
        number_plain,
        variant_key,
        image_url,
        representative_image_url,
        image_status,
        image_note,
        image_source
      from public.card_prints
      where lower(set_code) = lower($1)
        and lower(name) = lower($2)
        and (number = $3 or number_plain = $4)
        and lower(coalesce(nullif(btrim(variant_key), ''), '')) = lower($5)
      order by id desc
      limit 1
    `,
    [effectiveSetCode, name, printedNumber, numberPlain, variantKey],
  );
}

async function fetchCardPrintById(client, cardPrintId) {
  if (!cardPrintId) return null;
  return fetchOne(
    client,
    `
      select
        id,
        gv_id,
        set_code,
        name,
        number,
        number_plain,
        variant_key,
        image_url,
        representative_image_url,
        image_status,
        image_note,
        image_source
      from public.card_prints
      where id = $1
      limit 1
    `,
    [cardPrintId],
  );
}

async function fetchStagingRow(client, stagingId) {
  if (!stagingId) return null;
  return fetchOne(
    client,
    `
      select
        id,
        candidate_id,
        approved_action_type,
        execution_status,
        last_error,
        founder_approved_by_user_id,
        founder_approved_at,
        staged_at,
        executed_at
      from public.canon_warehouse_promotion_staging
      where id = $1
      limit 1
    `,
    [stagingId],
  );
}

async function fetchMappingForCardPrint(client, cardPrintId, sourceExternalId) {
  return fetchOne(
    client,
    `
      select id, card_print_id, source, external_id, active
      from public.external_mappings
      where card_print_id = $1
        and source = 'justtcg'
        and external_id = $2
        and active = true
      order by id desc
      limit 1
    `,
    [cardPrintId, sourceExternalId],
  );
}

async function fetchDuplicateActiveExternalIds(client, sourceExternalIds) {
  if (sourceExternalIds.length === 0) return [];
  return fetchAll(
    client,
    `
      select external_id, count(*)::int as active_count
      from public.external_mappings
      where source = 'justtcg'
        and active = true
        and external_id = any($1::text[])
      group by external_id
      having count(*) > 1
      order by external_id
    `,
    [sourceExternalIds],
  );
}

async function fetchMultiActiveCardPrints(client, cardPrintIds) {
  if (cardPrintIds.length === 0) return [];
  return fetchAll(
    client,
    `
      select card_print_id, count(*)::int as active_count
      from public.external_mappings
      where source = 'justtcg'
        and active = true
        and card_print_id = any($1::uuid[])
      group by card_print_id
      having count(*) > 1
      order by card_print_id
    `,
    [cardPrintIds],
  );
}

function makeInitialArtifact(candidateBatch) {
  return {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    status: 'IN_PROGRESS',
    source_artifacts: [
      relativeCheckpointPath(CANDIDATE_BATCH_PATH),
      relativeCheckpointPath(EVIDENCE_PATH),
    ],
    selection_summary: {
      row_count: candidateBatch.rows.length,
      governing_rule_source: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
      variant_key: 'play_pokemon_stamp',
      target_origin: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V12_NONBLOCKED',
      batch_size_attempted: candidateBatch.rows.length,
      batch_size_completed: 0,
      precheck_state_counts: {},
    },
    batch_rows_classified: 0,
    batch_rows_staged: 0,
    batch_rows_approved: 0,
    batch_rows_promoted: 0,
    batch_rows_mapped: 0,
    batch_rows_image_closed: 0,
    batch_failures_by_class: {},
    blocked_rows: [],
    verification: {
      mapping_duplicate_active_external_ids: 0,
      mapping_multi_active_card_prints: 0,
      exact_image_overwrites: 0,
      representative_shared_stamp_rows: 0,
      missing_representative_rows: 0,
    },
    rows: candidateBatch.rows.map((row, index) => ({
      batch_index: index + 1,
      source: row.source,
      source_set_id: row.source_set_id,
      source_external_id: row.source_external_id,
      name: row.name,
      candidate_name: row.candidate_name ?? row.name,
      printed_number: row.printed_number,
      number_plain: row.normalized_number_plain,
      normalized_number_plain: row.normalized_number_plain,
      proposed_variant_key: row.variant_key,
      variant_key: row.variant_key,
      stamp_label: 'Play! Pokémon Stamp',
      governing_rule_source: row.governing_rule,
      governing_rules: [
        'STAMPED_IDENTITY_RULE_V1',
        'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
        'EVIDENCE_TIER_V1',
      ],
      source_family: row.reference_hints_payload?.source_family ?? null,
      evidence_class: row.evidence_class,
      evidence_tier: row.evidence_tier,
      supported_series_list: row.confirmed_series_coverage,
      evidence_sources_v12_nonblocked: [],
      effective_identity_space: row.effective_set_code,
      effective_set_code: row.effective_set_code,
      effective_routed_set_code: row.effective_set_code,
      effective_set_name: row.effective_set_name,
      effective_routed_set_name: row.effective_set_name,
      canonical_queue_key: `${row.effective_set_code}::${row.name}::${row.printed_number}::${row.variant_key}`,
      base_gv_id: row.underlying_base_proof?.base_gv_id ?? null,
      base_route: row.underlying_base_proof?.base_route ?? null,
      underlying_base_proof: {
        base_gv_id: row.underlying_base_proof?.base_gv_id ?? null,
        base_route: row.underlying_base_proof?.base_route ?? null,
        unique_base_route: row.underlying_base_proof?.unique_base_route ?? false,
        base_card_name: row.name,
      },
      final_decision: 'READY_FOR_WAREHOUSE',
      decision_code: 'single_series_confirmed_by_v12_nonblocked_shrouded_fable_window',
      final_reason: null,
      pre_intake_audit: null,
      target_base_resolution: null,
      underlying_base_proof_summary: null,
      warehouse_candidate_id: null,
      warehouse_state: null,
      card_print_id: null,
      gv_id: null,
      approved_action_type: null,
      founder_approved_by_user_id: null,
      founder_approved_at: null,
      founder_approval_notes: null,
      staging_id: null,
      staging_execution_status: null,
      image_url: null,
      representative_image_url: null,
      image_status: null,
      image_note: null,
      image_source: null,
      staged_executed_at: null,
      mapping_id: null,
      mapping_status: null,
      mapping_source: null,
      mapping_active: false,
    })),
    post_batch_prize_pack_status: null,
    recommended_next_execution_step: 'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V13_NONBLOCKED',
  };
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = normalizeTextOrNull(value) ?? 'UNKNOWN';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function populateEvidenceDetails(artifact) {
  const evidence = await readJson(EVIDENCE_PATH);
  const byExternalId = new Map(
    (evidence.ready_rows || []).map((row) => [row.source_external_id, row]),
  );

  for (const row of artifact.rows) {
    const evidenceRow = byExternalId.get(row.source_external_id);
    row.final_reason = evidenceRow?.final_reason ?? row.final_reason;
    row.evidence_sources_v12_nonblocked =
      evidenceRow?.evidence_sources_used_for_v12_nonblocked ?? [];
}
}

async function populatePreIntakeAudit(client, artifact) {
  for (const row of artifact.rows) {
    const sourceCandidate = await fetchSourceCandidate(client, row.source_set_id, row.source_external_id);
    const baseRow = await fetchBaseRow(client, row.base_gv_id);
    const existingVariant = await fetchPromotedVariantRow(
      client,
      row.effective_set_code,
      row.name,
      row.printed_number,
      row.variant_key,
    );

    const warehouseCandidate = sourceCandidate?.id
      ? await fetchWarehouseCandidateBySourceCandidateId(client, sourceCandidate.id)
      : null;

    let currentLiveState = 'READY_TO_BRIDGE';
    let blockerClass = null;

    if (!sourceCandidate) {
      currentLiveState = 'CONFLICT_REVIEW_REQUIRED';
      blockerClass = 'SOURCE_CANDIDATE_MISSING';
    } else if (!baseRow) {
      currentLiveState = 'CONFLICT_REVIEW_REQUIRED';
      blockerClass = 'UNDERLYING_BASE_MISSING';
    } else if (
      existingVariant?.id ||
      warehouseCandidate?.promoted_card_print_id ||
      warehouseCandidate?.state === 'PROMOTED'
    ) {
      currentLiveState = 'ALREADY_PROMOTED';
      blockerClass = 'ALREADY_PROMOTED';
    } else if (warehouseCandidate?.id) {
      currentLiveState = 'ALREADY_IN_WAREHOUSE';
      blockerClass = null;
    }

    row.source_candidate_id = sourceCandidate?.id ?? null;
    row.pre_intake_audit = {
      current_live_state: currentLiveState,
      blocker_class: blockerClass,
      live_source_candidate_id: sourceCandidate?.id ?? null,
      live_raw_import_id: sourceCandidate?.raw_import_id ? String(sourceCandidate.raw_import_id) : null,
      live_base_card_print_id: baseRow?.id ?? null,
      live_base_gv_id: baseRow?.gv_id ?? null,
      live_existing_variant_card_print_id: existingVariant?.id ?? null,
      live_existing_variant_gv_id: existingVariant?.gv_id ?? null,
      live_warehouse_candidate_id: warehouseCandidate?.id ?? null,
      live_warehouse_state: warehouseCandidate?.state ?? null,
      live_warehouse_hold_reason: warehouseCandidate?.current_review_hold_reason ?? null,
      live_promoted_card_print_id: warehouseCandidate?.promoted_card_print_id ?? null,
      exact_source_row_exists: Boolean(sourceCandidate?.id),
      exact_base_row_exists: Boolean(baseRow?.id),
      exact_variant_absent: !existingVariant?.id,
    };
    row.target_base_resolution = {
      base_card_print_id: baseRow?.id ?? null,
      base_gv_id: baseRow?.gv_id ?? null,
    };
    row.underlying_base_proof_summary = {
      live_base_card_print_id: baseRow?.id ?? null,
      live_base_set_code: baseRow?.set_code ?? null,
      base_gv_id: baseRow?.gv_id ?? null,
    };
    row.warehouse_candidate_id = warehouseCandidate?.id ?? null;
    row.warehouse_state = warehouseCandidate?.state ?? null;
    row.card_print_id = existingVariant?.id ?? warehouseCandidate?.promoted_card_print_id ?? null;
    row.gv_id = existingVariant?.gv_id ?? null;
  }

  artifact.selection_summary.precheck_state_counts = countBy(
    artifact.rows.map((row) => row.pre_intake_audit?.current_live_state),
  );
}

async function bridgeReadyRows(client, artifact) {
  for (const row of artifact.rows) {
    if (row.pre_intake_audit?.current_live_state !== 'READY_TO_BRIDGE') {
      continue;
    }

    await writeJson(OUTPUT_JSON_PATH, artifact);

    const worker = runNodeScript(
      'backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs',
      [
        `--set-id=${SOURCE_SET_ID}`,
        `--source-candidate-id=${row.source_candidate_id}`,
        `--stamped-batch-file=${relativeCheckpointPath(OUTPUT_JSON_PATH)}`,
        '--apply',
      ],
      `bridge_${row.source_external_id}`,
    );

    if (worker.summary && Number(worker.summary.candidates_blocked ?? 0) > 0) {
      throw new Error(`bridge_blocked:${row.source_external_id}:${worker.summary.candidates_blocked}`);
    }

    const warehouseCandidate = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    if (!warehouseCandidate?.id) {
      throw new Error(`bridge_candidate_missing:${row.source_external_id}`);
    }

    row.warehouse_candidate_id = warehouseCandidate.id;
    row.warehouse_state = warehouseCandidate.state;
  }
}

async function classifyCandidates(client, artifact) {
  for (const row of artifact.rows) {
    if (!row.warehouse_candidate_id) {
      throw new Error(`classification_missing_candidate_id:${row.source_external_id}`);
    }

    const before = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    const beforeState = normalizeTextOrNull(before?.state);

    if (beforeState === 'RAW') {
      const worker = runNodeScript(
        'backend/warehouse/classification_worker_v1.mjs',
        [`--candidate-id=${row.warehouse_candidate_id}`, '--apply'],
        `classification_${row.source_external_id}`,
      );
      assertWorkerResults(worker.summary, `classification_${row.source_external_id}`, new Set(['applied']));
    } else if (!['REVIEW_READY', 'APPROVED_BY_FOUNDER', 'STAGED_FOR_PROMOTION', 'PROMOTED'].includes(beforeState ?? '')) {
      throw new Error(`classification_unexpected_state:${row.source_external_id}:${beforeState}`);
    }

    const candidate = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    row.warehouse_state = candidate?.state ?? null;
    row.approved_action_type = candidate?.proposed_action_type ?? null;

    if (!['REVIEW_READY', 'APPROVED_BY_FOUNDER', 'STAGED_FOR_PROMOTION', 'PROMOTED'].includes(candidate?.state ?? '')) {
      throw new Error(`classification_not_review_ready:${row.source_external_id}:${candidate?.state ?? 'null'}`);
    }
    if ((candidate?.proposed_action_type ?? null) !== 'CREATE_CARD_PRINT') {
      throw new Error(
        `classification_action_mismatch:${row.source_external_id}:${candidate?.proposed_action_type ?? 'null'}`,
      );
    }
  }

  artifact.batch_rows_classified = artifact.rows.length;
}

async function approveCandidates(client, artifact, founderUserId) {
  const approvalTime = new Date().toISOString();

  for (const row of artifact.rows) {
    const candidate = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    if (!candidate?.id) {
      throw new Error(`approval_candidate_missing:${row.source_external_id}`);
    }

    if (candidate.state === 'REVIEW_READY') {
      await client.query('begin');
      try {
        const updateResult = await client.query(
          `
            update public.canon_warehouse_candidates
            set
              state = 'APPROVED_BY_FOUNDER',
              founder_approved_by_user_id = $2,
              founder_approved_at = $3,
              founder_approval_notes = $4,
              current_review_hold_reason = null,
              updated_at = $3
            where id = $1
              and state = 'REVIEW_READY'
          `,
          [candidate.id, founderUserId, approvalTime, FOUNDER_APPROVAL_NOTE],
        );

        if (updateResult.rowCount !== 1) {
          throw new Error(`approval_update_failed:${candidate.id}`);
        }

        await client.query(
          `
            insert into public.canon_warehouse_candidate_events (
              candidate_id,
              event_type,
              action,
              previous_state,
              next_state,
              actor_user_id,
              actor_type,
              metadata,
              created_at
            )
            values (
              $1,
              'FOUNDER_APPROVED',
              'APPROVE',
              'REVIEW_READY',
              'APPROVED_BY_FOUNDER',
              $2,
              'FOUNDER',
              $3::jsonb,
              $4
            )
          `,
          [
            candidate.id,
            founderUserId,
            JSON.stringify({
              workflow: WORKFLOW,
              founder_note: FOUNDER_APPROVAL_NOTE,
              source_external_id: row.source_external_id,
              governing_rule_source: row.governing_rule_source,
            }),
            approvalTime,
          ],
        );

        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    } else if (!['APPROVED_BY_FOUNDER', 'STAGED_FOR_PROMOTION', 'PROMOTED'].includes(candidate.state ?? '')) {
      throw new Error(`approval_unexpected_state:${row.source_external_id}:${candidate.state ?? 'null'}`);
    }

    const approvedCandidate = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    row.warehouse_state = approvedCandidate?.state ?? null;
    row.founder_approved_by_user_id = approvedCandidate?.founder_approved_by_user_id ?? null;
    row.founder_approved_at = approvedCandidate?.founder_approved_at ?? null;
    row.founder_approval_notes = approvedCandidate?.founder_approval_notes ?? null;

    if (!row.founder_approved_by_user_id || !row.founder_approved_at) {
      throw new Error(`approval_metadata_missing:${row.source_external_id}`);
    }
  }

  artifact.batch_rows_approved = artifact.rows.length;
}

async function extractMetadataAndStage(client, artifact) {
  for (const row of artifact.rows) {
    const candidateBeforeStage = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    const beforeState = normalizeTextOrNull(candidateBeforeStage?.state);

    if (!['PROMOTED'].includes(beforeState ?? '')) {
      const metadataWorker = runNodeScript(
        'backend/warehouse/metadata_extraction_worker_v1.mjs',
        [`--candidate-id=${row.warehouse_candidate_id}`, '--apply'],
        `metadata_${row.source_external_id}`,
      );
      assertWorkerResults(
        metadataWorker.summary,
        `metadata_${row.source_external_id}`,
        new Set(['applied', 'skipped']),
      );
    }

    if (beforeState === 'APPROVED_BY_FOUNDER') {
      const stageWorker = runNodeScript(
        'backend/warehouse/promotion_stage_worker_v1.mjs',
        [`--candidate-id=${row.warehouse_candidate_id}`, '--apply'],
        `stage_${row.source_external_id}`,
      );
      assertWorkerResults(stageWorker.summary, `stage_${row.source_external_id}`, new Set(['applied']));
    } else if (!['STAGED_FOR_PROMOTION', 'PROMOTED'].includes(beforeState ?? '')) {
      throw new Error(`stage_unexpected_state:${row.source_external_id}:${beforeState ?? 'null'}`);
    }

    const candidateAfterStage = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    row.warehouse_state = candidateAfterStage?.state ?? null;
    row.staging_id = candidateAfterStage?.current_staging_id ?? null;

    const staging = await fetchStagingRow(client, row.staging_id);
    row.staging_execution_status = staging?.execution_status ?? null;

    if (!row.staging_id) {
      throw new Error(`stage_missing_id:${row.source_external_id}`);
    }
    if (!['STAGED_FOR_PROMOTION', 'PROMOTED'].includes(candidateAfterStage?.state ?? '')) {
      throw new Error(`stage_not_ready:${row.source_external_id}:${candidateAfterStage?.state ?? 'null'}`);
    }
  }

  artifact.batch_rows_staged = artifact.rows.length;
}

async function executeDryRunAndApply(client, artifact) {
  for (const row of artifact.rows) {
    const dryRunWorker = runNodeScript(
      'backend/warehouse/promotion_executor_v1.mjs',
      [`--staging-id=${row.staging_id}`, '--dry-run'],
      `executor_dry_run_${row.source_external_id}`,
    );
    assertWorkerResults(
      dryRunWorker.summary,
      `executor_dry_run_${row.source_external_id}`,
      new Set(['dry_run', 'already_succeeded']),
    );

    const candidateBeforeApply = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    if (candidateBeforeApply?.state !== 'PROMOTED') {
      const applyWorker = runNodeScript(
        'backend/warehouse/promotion_executor_v1.mjs',
        [`--staging-id=${row.staging_id}`, '--apply'],
        `executor_apply_${row.source_external_id}`,
      );
      assertWorkerResults(
        applyWorker.summary,
        `executor_apply_${row.source_external_id}`,
        new Set(['applied', 'already_succeeded']),
      );
    }

    const candidateAfterApply = await fetchWarehouseCandidateBySourceCandidateId(client, row.source_candidate_id);
    const promotedRow =
      (await fetchCardPrintById(client, candidateAfterApply?.promoted_card_print_id ?? null)) ??
      (await fetchPromotedVariantRow(
        client,
        row.effective_set_code,
        row.name,
        row.printed_number,
        row.variant_key,
      ));
    const staging = await fetchStagingRow(client, row.staging_id);

    row.warehouse_state = candidateAfterApply?.state ?? null;
    row.card_print_id = promotedRow?.id ?? candidateAfterApply?.promoted_card_print_id ?? null;
    row.gv_id = promotedRow?.gv_id ?? null;
    row.image_url = promotedRow?.image_url ?? null;
    row.representative_image_url = promotedRow?.representative_image_url ?? null;
    row.image_status = promotedRow?.image_status ?? null;
    row.image_note = promotedRow?.image_note ?? null;
    row.image_source = promotedRow?.image_source ?? null;
    row.staging_execution_status = staging?.execution_status ?? null;
    row.staged_executed_at = staging?.executed_at ?? null;

    if (candidateAfterApply?.state !== 'PROMOTED') {
      throw new Error(`promotion_not_completed:${row.source_external_id}:${candidateAfterApply?.state ?? 'null'}`);
    }
    if (!row.card_print_id || !row.gv_id) {
      throw new Error(`promotion_missing_card_print:${row.source_external_id}`);
    }
    if (staging?.execution_status !== 'SUCCEEDED') {
      throw new Error(
        `promotion_stage_not_succeeded:${row.source_external_id}:${staging?.execution_status ?? 'null'}`,
      );
    }
  }

  artifact.batch_rows_promoted = artifact.rows.length;
}

async function runMappingAndImages(client, artifact) {
  await writeJson(OUTPUT_JSON_PATH, artifact);

  runNodeScript(
    'backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs',
    [`--input-json=${relativeCheckpointPath(OUTPUT_JSON_PATH)}`, '--apply'],
    'mapping_batch',
  );

  for (const row of artifact.rows) {
    const mapping = await fetchMappingForCardPrint(client, row.card_print_id, row.source_external_id);
    row.mapping_id = mapping?.id ?? null;
    row.mapping_status = mapping?.active ? 'mapped' : 'unmapped';
    row.mapping_source = mapping?.source ?? null;
    row.mapping_active = Boolean(mapping?.active);
    if (!mapping?.id || !mapping?.active) {
      throw new Error(`mapping_missing:${row.source_external_id}`);
    }
  }
  artifact.batch_rows_mapped = artifact.rows.length;

  await writeJson(OUTPUT_JSON_PATH, artifact);

  runNodeScript(
    'backend/images/source_image_enrichment_worker_v1.mjs',
    [`--input-json=${relativeCheckpointPath(OUTPUT_JSON_PATH)}`, '--apply'],
    'image_batch',
  );

  for (const row of artifact.rows) {
    const promotedRow =
      (await fetchCardPrintById(client, row.card_print_id)) ??
      (await fetchPromotedVariantRow(
        client,
        row.effective_set_code,
        row.name,
        row.printed_number,
        row.variant_key,
      ));
    row.image_url = promotedRow?.image_url ?? null;
    row.representative_image_url = promotedRow?.representative_image_url ?? null;
    row.image_status = promotedRow?.image_status ?? null;
    row.image_note = promotedRow?.image_note ?? null;
    row.image_source = promotedRow?.image_source ?? null;

    if (row.image_url) {
      throw new Error(`exact_image_overwrite_detected:${row.source_external_id}`);
    }
    if (row.image_status !== 'representative_shared_stamp' || !row.representative_image_url) {
      throw new Error(`image_not_closed:${row.source_external_id}:${row.image_status ?? 'null'}`);
    }
  }
  artifact.batch_rows_image_closed = artifact.rows.length;
}

function buildMarkdown(artifact) {
  const examples = artifact.rows
    .map(
      (row) =>
        `| ${row.name} | ${row.printed_number} | ${row.gv_id} | ${row.variant_key} | ${row.effective_set_code} | ${row.mapping_status} | ${row.image_status} |`,
    )
    .join('\n');

  return `# ${WORKFLOW}

Generated: ${artifact.generated_at}

## Context

Executed the exact 4-row Prize Pack V12 subset unlocked by the Shrouded Fable nonblocked evidence pass under \`GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1\`.

## Result

- Batch size attempted: ${artifact.selection_summary.batch_size_attempted}
- Batch size completed: ${artifact.selection_summary.batch_size_completed}
- Classified: ${artifact.batch_rows_classified}
- Staged: ${artifact.batch_rows_staged}
- Approved: ${artifact.batch_rows_approved}
- Promoted: ${artifact.batch_rows_promoted}
- Mapped: ${artifact.batch_rows_mapped}
- Image closed: ${artifact.batch_rows_image_closed}
- Failures: ${JSON.stringify(artifact.batch_failures_by_class)}

## Verification

- Pre-intake live audit: ${JSON.stringify(artifact.selection_summary.precheck_state_counts)}
- Warehouse candidates: ${artifact.batch_rows_promoted}/${artifact.selection_summary.row_count} reached \`PROMOTED\` with bounded bridge + classification only.
- Promotion staging: ${artifact.batch_rows_staged}/${artifact.selection_summary.row_count} exact-batch staging rows reached \`SUCCEEDED\`.
- Canon rows: ${artifact.batch_rows_promoted}/${artifact.selection_summary.row_count} created with non-null \`variant_key = play_pokemon_stamp\`.
- Mapping: ${artifact.batch_rows_mapped}/${artifact.selection_summary.row_count} active JustTCG mappings, duplicate external ids = ${artifact.verification.mapping_duplicate_active_external_ids}, multi-active conflicts = ${artifact.verification.mapping_multi_active_card_prints}.
- Images: exact rows = ${artifact.verification.exact_image_overwrites}, representative rows = ${artifact.batch_rows_image_closed}, representative_shared_stamp = ${artifact.verification.representative_shared_stamp_rows}, missing = ${artifact.verification.missing_representative_rows}.
- Drift check: base rows unchanged; no series-split behavior introduced; no representative image written into \`image_url\`.

## Post-Batch Prize Pack Status

- Remaining WAIT rows: ${artifact.post_batch_prize_pack_status.remaining_wait_rows}
- DO_NOT_CANON rows: ${artifact.post_batch_prize_pack_status.do_not_canon_rows}
- Blocked-by-official-acquisition rows: ${artifact.post_batch_prize_pack_status.blocked_by_official_acquisition_rows}
- Promoted Prize Pack total before V12: ${artifact.post_batch_prize_pack_status.promoted_prize_pack_total_before_v12}
- Promoted Prize Pack total after V12: ${artifact.post_batch_prize_pack_status.promoted_prize_pack_total_after_v12}

## Representative Examples

| Name | Number | GV ID | Variant Key | Set | Mapping | Image |
| --- | --- | --- | --- | --- | --- | --- |
${examples}

## Next Step

- Recommended next execution step: \`${artifact.recommended_next_execution_step}\`
`;
}

async function finalizeArtifact(client, artifact) {
  const evidence = await readJson(EVIDENCE_PATH);
  const sourceExternalIds = artifact.rows.map((row) => row.source_external_id);
  const cardPrintIds = artifact.rows.map((row) => row.card_print_id).filter(Boolean);

  const duplicateExternalIds = await fetchDuplicateActiveExternalIds(client, sourceExternalIds);
  const multiActiveCardPrints = await fetchMultiActiveCardPrints(client, cardPrintIds);

  artifact.generated_at = new Date().toISOString();
  artifact.status = 'CLOSED';
  artifact.selection_summary.batch_size_completed = artifact.rows.length;
  artifact.batch_failures_by_class = {};
  artifact.blocked_rows = [];
  artifact.verification = {
    mapping_duplicate_active_external_ids: duplicateExternalIds.length,
    mapping_multi_active_card_prints: multiActiveCardPrints.length,
    exact_image_overwrites: artifact.rows.filter((row) => normalizeTextOrNull(row.image_url)).length,
    representative_shared_stamp_rows: artifact.rows.filter(
      (row) => normalizeLowerOrNull(row.image_status) === 'representative_shared_stamp',
    ).length,
    missing_representative_rows: artifact.rows.filter(
      (row) => !normalizeTextOrNull(row.representative_image_url),
    ).length,
  };
  artifact.post_batch_prize_pack_status = {
    remaining_wait_rows: Number(evidence?.remaining_backlog?.wait_for_more_evidence ?? 118),
    do_not_canon_rows: Number(evidence?.remaining_backlog?.do_not_canon_total_after_v12_nonblocked ?? 176),
    blocked_by_official_acquisition_rows: Number(
      evidence?.remaining_backlog?.blocked_by_official_acquisition_remaining ?? 88,
    ),
    promoted_prize_pack_total_before_v12: Number(
      evidence?.current_backlog?.already_promoted_total ?? 365,
    ),
    promoted_prize_pack_total_after_v12:
      Number(evidence?.current_backlog?.already_promoted_total ?? 365) + artifact.rows.length,
  };
}

async function main() {
  const candidateBatch = await loadAndValidateCandidateBatch();
  const artifact = makeInitialArtifact(candidateBatch);
  const client = await createClient();

  try {
    log('batch_start', {
      candidate_batch: relativeCheckpointPath(CANDIDATE_BATCH_PATH),
      output_json: relativeCheckpointPath(OUTPUT_JSON_PATH),
      output_md: relativeCheckpointPath(OUTPUT_MD_PATH),
      row_count: artifact.rows.length,
    });

    await populateEvidenceDetails(artifact);
    const founderUserId = await fetchFounderUserId(client);

    await populatePreIntakeAudit(client, artifact);
    await writeJson(OUTPUT_JSON_PATH, artifact);

    const conflictingRows = artifact.rows.filter(
      (row) => row.pre_intake_audit?.current_live_state === 'CONFLICT_REVIEW_REQUIRED',
    );
    if (conflictingRows.length > 0) {
      throw new Error(
        `precheck_conflict_rows:${JSON.stringify(conflictingRows.map((row) => row.source_external_id))}`,
      );
    }

    await bridgeReadyRows(client, artifact);
    await writeJson(OUTPUT_JSON_PATH, artifact);

    await classifyCandidates(client, artifact);
    await writeJson(OUTPUT_JSON_PATH, artifact);

    await approveCandidates(client, artifact, founderUserId);
    await writeJson(OUTPUT_JSON_PATH, artifact);

    await extractMetadataAndStage(client, artifact);
    await writeJson(OUTPUT_JSON_PATH, artifact);

    await executeDryRunAndApply(client, artifact);
    await writeJson(OUTPUT_JSON_PATH, artifact);

    await runMappingAndImages(client, artifact);
    await finalizeArtifact(client, artifact);

    await writeJson(OUTPUT_JSON_PATH, artifact);
    await writeText(OUTPUT_MD_PATH, buildMarkdown(artifact));

    log('batch_complete', {
      batch_size_attempted: artifact.selection_summary.batch_size_attempted,
      batch_size_completed: artifact.selection_summary.batch_size_completed,
      promoted: artifact.batch_rows_promoted,
      mapped: artifact.batch_rows_mapped,
      image_closed: artifact.batch_rows_image_closed,
      recommended_next_execution_step: artifact.recommended_next_execution_step,
    });
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  log('fatal', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

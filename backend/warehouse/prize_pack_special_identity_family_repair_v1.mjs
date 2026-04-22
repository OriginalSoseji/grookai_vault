import '../env.mjs';

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const WORKFLOW = 'PRIZE_PACK_SPECIAL_IDENTITY_FAMILY_REPAIR_V1';
const SOURCE_EXTERNAL_ID =
  'pokemon-prize-pack-series-cards-team-rocket-s-mewtwo-ex-double-rare';
const TARGET_NAME = "Team Rocket's Mewtwo ex";
const TARGET_PRINTED_NUMBER = '079/217';
const VARIANT_KEY = 'play_pokemon_stamp';

const INPUT_SOURCES = {
  v2Input: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json',
  v6Input: 'docs/checkpoints/warehouse/prize_pack_base_route_repair_v6_input.json',
  v17Input: 'docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked_input.json',
  v17Evidence: 'docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked.json',
  seriesEvidence: 'docs/checkpoints/warehouse/prize_pack_series_evidence_sources_v2.json',
  waitInspection: 'docs/checkpoints/warehouse/prize_pack_wait_inspection_v1.json',
};

const OUTPUT_PATHS = {
  input: 'docs/checkpoints/warehouse/prize_pack_special_identity_family_repair_v1_input.json',
  json: 'docs/checkpoints/warehouse/prize_pack_special_identity_family_repair_v1.json',
  md: 'docs/checkpoints/warehouse/prize_pack_special_identity_family_repair_v1.md',
  readyBatchCandidate:
    'docs/checkpoints/warehouse/prize_pack_ready_batch_v13_special_family_candidate.json',
};

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
  if (!row) return null;
  return {
    card_print_id: normalizeTextOrNull(row.id),
    gv_id: normalizeTextOrNull(row.gv_id),
    name: normalizeTextOrNull(row.name),
    set_code: normalizeTextOrNull(row.set_code),
    number: normalizeTextOrNull(row.number),
    number_plain: normalizeTextOrNull(row.number_plain),
    variant_key: normalizeTextOrNull(row.variant_key),
    rarity: normalizeTextOrNull(row.rarity),
    printed_set_abbrev: normalizeTextOrNull(row.printed_set_abbrev),
    printed_total: row.printed_total === null || row.printed_total === undefined
      ? null
      : Number(row.printed_total),
    identity_domain: normalizeTextOrNull(row.identity_domain),
    printed_identity_modifier: normalizeTextOrNull(row.printed_identity_modifier),
    set_identity_model: normalizeTextOrNull(row.set_identity_model),
    print_identity_key: normalizeTextOrNull(row.print_identity_key),
    external_ids: row.external_ids ?? null,
  };
}

function findRowsBySourceExternalId(payload) {
  const rows = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (normalizeTextOrNull(value.source_external_id) === SOURCE_EXTERNAL_ID) {
      rows.push(value);
    }
    for (const item of Object.values(value)) {
      if (item && typeof item === 'object') visit(item);
    }
  };
  visit(payload);
  return rows;
}

function findSeriesEvidenceRows(seriesEvidence) {
  const rows = [];
  const targetName = normalizeName(TARGET_NAME);
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (normalizeName(value.name) === targetName) {
      rows.push(value);
    }
    for (const item of Object.values(value)) {
      if (item && typeof item === 'object') visit(item);
    }
  };
  visit(seriesEvidence);
  return rows;
}

async function fetchSourceCandidate(pool) {
  const result = await pool.query(
    `
      select
        id,
        source,
        raw_import_id,
        upstream_id,
        tcgplayer_id,
        set_id,
        name_raw,
        number_raw,
        normalized_name,
        normalized_number_left,
        normalized_number_plain,
        normalized_printed_total,
        match_status,
        candidate_bucket,
        resolved_set_code,
        card_print_id,
        payload
      from public.external_discovery_candidates
      where source = 'justtcg'
        and upstream_id = $1
      order by created_at desc, id desc
      limit 1
    `,
    [SOURCE_EXTERNAL_ID],
  );
  return result.rows[0] ?? null;
}

async function fetchExactNameRows(pool) {
  const result = await pool.query(
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
        printed_set_abbrev,
        printed_total,
        identity_domain,
        printed_identity_modifier,
        set_identity_model,
        print_identity_key,
        external_ids
      from public.card_prints
      where regexp_replace(lower(unaccent(name)), '[^a-z0-9]+', ' ', 'g') = $1
      order by set_code, number_plain, gv_id
    `,
    [normalizeName(TARGET_NAME)],
  );
  return result.rows.map(compactCardPrint);
}

async function fetchSameNumberMewtwoRows(pool) {
  const result = await pool.query(
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
        printed_set_abbrev,
        printed_total,
        identity_domain,
        printed_identity_modifier,
        set_identity_model,
        print_identity_key,
        external_ids
      from public.card_prints
      where number_plain in ('079', '79')
        and lower(name) like '%mewtwo%'
      order by set_code, number_plain, gv_id
    `,
  );
  return result.rows.map(compactCardPrint);
}

function buildInputPayload({ artifacts, sourceCandidate, exactNameRows, sameNumberMewtwoRows, seriesEvidenceRows }) {
  const v17Rows = findRowsBySourceExternalId(artifacts.v17Input);
  const v6Rows = findRowsBySourceExternalId(artifacts.v6Input);
  const v2Rows = findRowsBySourceExternalId(artifacts.v2Input);
  const waitRows = findRowsBySourceExternalId(artifacts.waitInspection);

  const row = v17Rows[0] ?? v6Rows[0] ?? v2Rows[0] ?? waitRows[0] ?? null;
  if (!row) {
    throw new Error('special_family_row_not_reconstructed');
  }

  if (
    normalizeName(row.candidate_name ?? row.name ?? row.card_print_candidate_name) !==
      normalizeName(TARGET_NAME) ||
    normalizeTextOrNull(row.printed_number) !== TARGET_PRINTED_NUMBER
  ) {
    throw new Error(
      `special_family_row_identity_mismatch:${row.candidate_name ?? row.name}:${row.printed_number}`,
    );
  }

  const payload = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    source_artifacts: Object.values(INPUT_SOURCES),
    row_identity: {
      candidate_name: TARGET_NAME,
      printed_number: TARGET_PRINTED_NUMBER,
      source_family:
        normalizeTextOrNull(row.source_family) ??
        normalizeTextOrNull(row.source_set_id) ??
        'prize-pack-series-cards-pokemon',
      source_external_id: SOURCE_EXTERNAL_ID,
      proposed_variant_key: VARIANT_KEY,
      current_blocker_class:
        normalizeTextOrNull(row.current_blocker_class) ?? 'SPECIAL_IDENTITY_FAMILY_COLLISION',
    },
    artifact_materialization: {
      v17_input_rows: v17Rows,
      v6_route_rows: v6Rows,
      v2_route_rows: v2Rows,
      wait_inspection_rows: waitRows,
    },
    live_source_candidate: sourceCandidate
      ? {
          id: sourceCandidate.id,
          source: sourceCandidate.source,
          raw_import_id: String(sourceCandidate.raw_import_id ?? ''),
          upstream_id: sourceCandidate.upstream_id,
          tcgplayer_id: sourceCandidate.tcgplayer_id,
          set_id: sourceCandidate.set_id,
          name_raw: sourceCandidate.name_raw,
          number_raw: sourceCandidate.number_raw,
          normalized_name: sourceCandidate.normalized_name,
          normalized_number_left: sourceCandidate.normalized_number_left,
          normalized_number_plain: sourceCandidate.normalized_number_plain,
          normalized_printed_total: sourceCandidate.normalized_printed_total,
          match_status: sourceCandidate.match_status,
          candidate_bucket: sourceCandidate.candidate_bucket,
          resolved_set_code: sourceCandidate.resolved_set_code,
          card_print_id: sourceCandidate.card_print_id,
          rarity: sourceCandidate.payload?.rarity ?? null,
        }
      : null,
    candidate_canon_owners: {
      exact_name_rows: exactNameRows,
      same_number_mewtwo_rows: sameNumberMewtwoRows,
    },
    prior_evidence_pass_history: [
      'PRIZE_PACK_EVIDENCE_V1',
      'PRIZE_PACK_EVIDENCE_V2',
      'PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V3-V17_NONBLOCKED',
    ],
    prior_route_repair_history: [
      'PRIZE_PACK_BASE_ROUTE_REPAIR_V2',
      'PRIZE_PACK_BASE_ROUTE_REPAIR_V3',
      'PRIZE_PACK_BASE_ROUTE_REPAIR_V4',
      'PRIZE_PACK_BASE_ROUTE_REPAIR_V5',
      'PRIZE_PACK_BASE_ROUTE_REPAIR_V6',
    ],
    accessible_series_evidence_rows_for_same_name: seriesEvidenceRows,
  };

  writeJson(OUTPUT_PATHS.input, payload);
  return payload;
}

function auditSpecialFamily(inputPayload) {
  const numberPlain = normalizeNumberPlain(TARGET_PRINTED_NUMBER);
  const printedTotal = Number(TARGET_PRINTED_NUMBER.split('/')[1]);
  const exactOwners = inputPayload.candidate_canon_owners.exact_name_rows.filter((row) => {
    const rowNumberPlain = normalizeNumberPlain(row.number_plain ?? row.number);
    return (
      normalizeName(row.name) === normalizeName(TARGET_NAME) &&
      rowNumberPlain === numberPlain &&
      Number(row.printed_total ?? printedTotal) === printedTotal
    );
  });

  const exactOwner = exactOwners.length === 1 ? exactOwners[0] : null;
  const specialFamilySignals = [];

  if (TARGET_NAME.toLowerCase().startsWith('team rocket')) {
    specialFamilySignals.push('printed_name_contains_team_rocket_ownership_family');
  }
  if (exactOwner?.printed_set_abbrev) {
    specialFamilySignals.push(`printed_set_abbrev=${exactOwner.printed_set_abbrev}`);
  }
  if (exactOwner?.set_code) {
    specialFamilySignals.push(`canon_set_code=${exactOwner.set_code}`);
  }
  if (exactOwner?.rarity) {
    specialFamilySignals.push(`rarity=${exactOwner.rarity}`);
  }

  const lawfulBaseOwnerExists = Boolean(
    exactOwner &&
      exactOwner.identity_domain === 'pokemon_eng_standard' &&
      exactOwner.set_identity_model === 'standard',
  );

  const accessibleExactSeriesEvidence =
    inputPayload.accessible_series_evidence_rows_for_same_name.filter((row) => {
      const evidenceNumber = normalizeNumberPlain(row.number_plain ?? row.printed_number ?? row.number);
      return (
        normalizeName(row.name) === normalizeName(TARGET_NAME) &&
        evidenceNumber === numberPlain
      );
    });

  let diagnosis = 'SPECIAL_FAMILY_EVIDENCE_INSUFFICIENT';
  let familyRouteResolution = 'STILL_WAIT_SPECIAL_FAMILY';
  let finalState = 'WAIT';
  let rebucketedBlockerClass = 'SPECIAL_IDENTITY_FAMILY_COLLISION';
  let finalReason =
    'The row has not been proven to have a lawful exact printed owner, and accessible evidence is insufficient.';

  if (exactOwners.length !== 1) {
    diagnosis = 'SPECIAL_FAMILY_REQUIRES_NEW_IDENTITY_INVARIANT';
    familyRouteResolution = 'STILL_WAIT_SPECIAL_FAMILY';
    finalState = 'WAIT';
    rebucketedBlockerClass = 'SPECIAL_IDENTITY_FAMILY_COLLISION';
    finalReason =
      exactOwners.length === 0
        ? "No exact same-name same-number canon owner exists for Team Rocket's Mewtwo ex 079/217."
        : `Multiple exact same-name same-number canon owners exist (${exactOwners.length}), so choosing one would be guesswork.`;
  } else if (!lawfulBaseOwnerExists) {
    diagnosis = 'SPECIAL_FAMILY_HAS_NO_LAWFUL_BASE_OWNER';
    familyRouteResolution = 'ROUTE_RESOLVED_DO_NOT_CANON';
    finalState = 'DO_NOT_CANON';
    rebucketedBlockerClass = null;
    finalReason =
      'The exact owner exists but does not satisfy the current standard printed identity owner signals required for a generic Play! Pokemon stamp anchor.';
  } else if (accessibleExactSeriesEvidence.length === 1) {
    diagnosis = 'SPECIAL_FAMILY_HAS_LAWFUL_BASE_OWNER';
    familyRouteResolution = 'ROUTE_RESOLVED_READY';
    finalState = 'READY_FOR_WAREHOUSE';
    rebucketedBlockerClass = null;
    finalReason =
      'Live canon proves one lawful exact printed owner and accessible evidence confirms one exact Prize Pack series appearance.';
  } else if (accessibleExactSeriesEvidence.length > 1) {
    diagnosis = 'SPECIAL_FAMILY_HAS_LAWFUL_BASE_OWNER';
    familyRouteResolution = 'ROUTE_RESOLVED_DO_NOT_CANON';
    finalState = 'DO_NOT_CANON';
    rebucketedBlockerClass = null;
    finalReason =
      'Live canon proves one lawful exact printed owner, but accessible evidence places the same generic stamp identity in multiple series.';
  } else {
    diagnosis = 'SPECIAL_FAMILY_HAS_LAWFUL_BASE_OWNER';
    familyRouteResolution = 'STILL_WAIT_SPECIAL_FAMILY';
    finalState = 'WAIT';
    rebucketedBlockerClass = 'NO_SERIES_CONFIRMATION';
    finalReason =
      'Live canon proves one lawful exact printed owner (GV-PK-ASC-079), so the special-family structural collision is closed. The row still lacks exact Prize Pack series evidence; the reachable evidence row is name-level for DRI 081, not ASC 079/217.';
  }

  return {
    special_family_row: inputPayload.row_identity,
    exact_structural_question:
      'Does this Prize Pack row land inside a special printed-identity family where the current canon has no lawful plain/base owner for a generic Play! Pokemon stamp?',
    diagnosis,
    family_route_resolution: familyRouteResolution,
    final_state: finalState,
    rebucketed_blocker_class: rebucketedBlockerClass,
    final_reason: finalReason,
    family_audit_summary: {
      exact_owner_count: exactOwners.length,
      exact_owner: exactOwner,
      lawful_base_owner_exists: lawfulBaseOwnerExists,
      special_family_signals: specialFamilySignals,
      all_same_name_canon_rows: inputPayload.candidate_canon_owners.exact_name_rows,
      same_number_mewtwo_rows: inputPayload.candidate_canon_owners.same_number_mewtwo_rows,
      accessible_same_name_series_evidence:
        inputPayload.accessible_series_evidence_rows_for_same_name,
      accessible_exact_series_evidence_count: accessibleExactSeriesEvidence.length,
      accessible_exact_series_evidence: accessibleExactSeriesEvidence,
      current_contract_interpretation: [
        'STAMPED_IDENTITY_RULE_V1 requires one known underlying base printed identity before a stamped row can be ready.',
        'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1 allows a generic Play! Pokemon stamp only after the base route is deterministic and the series evidence reduces to one known series.',
        'PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1 prevents non-null variant_key labels from invalidating an exact printed-number owner by themselves.',
      ],
    },
  };
}

function buildMarkdown(result) {
  const owner = result.family_audit_summary.exact_owner;
  const seriesEvidence = result.family_audit_summary.accessible_same_name_series_evidence
    .map((row) => `- ${row.name} | ${row.set_token ?? 'unknown'} ${row.number_plain ?? 'unknown'} | ${row.raw_line ?? ''}`)
    .join('\n') || '- none';

  return `# Prize Pack Special Identity Family Repair V1

Generated: ${result.generated_at}

## Scope

- Exact row: ${TARGET_NAME} | ${TARGET_PRINTED_NUMBER}
- Source external id: ${SOURCE_EXTERNAL_ID}
- Proposed variant key: ${VARIANT_KEY}
- No canon, promotion, mapping, image, or rule writes were attempted.

## Structural Question

Does this Prize Pack row land inside a special printed-identity family where the current canon has no lawful plain/base owner for a generic Play! Pokemon stamp?

## Diagnosis

- Diagnosis: ${result.diagnosis}
- Final state: ${result.final_state}
- Rebucketed blocker: ${result.rebucketed_blocker_class ?? 'n/a'}
- Family route resolution: ${result.family_route_resolution}
- Reason: ${result.final_reason}

## Family Audit

- Exact owner count: ${result.family_audit_summary.exact_owner_count}
- Exact owner GV ID: ${owner?.gv_id ?? 'n/a'}
- Exact owner set_code: ${owner?.set_code ?? 'n/a'}
- Exact owner number: ${owner?.number ?? 'n/a'}
- Exact owner variant_key: ${owner?.variant_key ?? 'n/a'}
- Exact owner rarity: ${owner?.rarity ?? 'n/a'}
- Exact owner printed_set_abbrev: ${owner?.printed_set_abbrev ?? 'n/a'}
- Exact owner printed_total: ${owner?.printed_total ?? 'n/a'}
- Lawful base owner exists: ${result.family_audit_summary.lawful_base_owner_exists ? 'YES' : 'NO'}
- Special-family signals: ${result.family_audit_summary.special_family_signals.join(', ') || 'none'}

## Accessible Series Evidence

Same-name accessible evidence rows:

${seriesEvidence}

Exact evidence count for ${TARGET_PRINTED_NUMBER}: ${result.family_audit_summary.accessible_exact_series_evidence_count}

## Verification

- No guessed family decision: the route diagnosis uses one exact same-name same-number live canon owner.
- No READY batch was created unless both route and exact series evidence were satisfied.
- Series 2 official acquisition lane was not touched.

## Next Step

- ${result.recommended_next_execution_step}
`;
}

async function main() {
  const artifacts = Object.fromEntries(
    Object.entries(INPUT_SOURCES).map(([key, filePath]) => [key, loadJson(filePath)]),
  );

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const [sourceCandidate, exactNameRows, sameNumberMewtwoRows] = await Promise.all([
      fetchSourceCandidate(pool),
      fetchExactNameRows(pool),
      fetchSameNumberMewtwoRows(pool),
    ]);

    const seriesEvidenceRows = findSeriesEvidenceRows(artifacts.seriesEvidence);
    const inputPayload = buildInputPayload({
      artifacts,
      sourceCandidate,
      exactNameRows,
      sameNumberMewtwoRows,
      seriesEvidenceRows,
    });

    const audit = auditSpecialFamily(inputPayload);
    const newReadyCount = audit.final_state === 'READY_FOR_WAREHOUSE' ? 1 : 0;
    const newDoNotCanonCount = audit.final_state === 'DO_NOT_CANON' ? 1 : 0;

    const result = {
      generated_at: new Date().toISOString(),
      workflow: WORKFLOW,
      source_artifacts: Object.values(INPUT_SOURCES).concat([OUTPUT_PATHS.input]),
      ...audit,
      new_ready_count: newReadyCount,
      new_do_not_canon_count: newDoNotCanonCount,
      ready_batch_candidate_created: newReadyCount > 0,
      recommended_next_execution_step:
        newReadyCount > 0
          ? 'PRIZE_PACK_READY_BATCH_V13_SPECIAL_FAMILY'
          : 'MANUAL_BROWSER_DOWNLOAD_AND_LOCAL_JSON_IMPORT_FOR_PRIZE_PACK_V1_SERIES_2_REAL_BROWSER_REQUIRED',
    };

    if (newReadyCount > 0) {
      writeJson(OUTPUT_PATHS.readyBatchCandidate, {
        generated_at: new Date().toISOString(),
        workflow: WORKFLOW,
        source_artifact: OUTPUT_PATHS.json,
        row_count: 1,
        rows: [
          {
            source: 'justtcg',
            source_set_id: 'prize-pack-series-cards-pokemon',
            source_external_id: SOURCE_EXTERNAL_ID,
            name: TARGET_NAME,
            candidate_name: TARGET_NAME,
            printed_number: TARGET_PRINTED_NUMBER,
            normalized_number_plain: '079',
            variant_key: VARIANT_KEY,
            governing_rule: 'GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1',
            evidence_class: 'CONFIRMED_IDENTITY',
            evidence_tier: 'TIER_3',
            confirmed_series_coverage:
              result.family_audit_summary.accessible_exact_series_evidence.map((row) => row.series),
            effective_set_code: result.family_audit_summary.exact_owner?.set_code ?? null,
            underlying_base_proof: {
              base_gv_id: result.family_audit_summary.exact_owner?.gv_id ?? null,
              base_route: result.family_audit_summary.exact_owner?.gv_id ?? null,
              unique_base_route: true,
            },
          },
        ],
      });
    } else {
      removeFileIfExists(OUTPUT_PATHS.readyBatchCandidate);
    }

    writeJson(OUTPUT_PATHS.json, result);
    writeText(OUTPUT_PATHS.md, buildMarkdown(result));
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

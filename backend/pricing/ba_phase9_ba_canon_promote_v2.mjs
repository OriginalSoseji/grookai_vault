/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical data outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';

import { installCanonMaintenanceBoundaryV1 } from '../maintenance/canon_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_CANON_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
  );
}

if (process.env.CANON_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
  );
}

if (process.env.CANON_MAINTENANCE_ENTRYPOINT !== 'backend/maintenance/run_canon_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from backend/maintenance/run_canon_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.CANON_MAINTENANCE_DRY_RUN !== 'false';
const { assertCanonMaintenanceWriteAllowed } = installCanonMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('CANON MAINTENANCE: DRY RUN');
}

void assertCanonMaintenanceWriteAllowed;
const { Client } = pg;

const PHASE_NAME = 'BA_PHASE9_BA_CANON_PROMOTION_V2';
const APPLY_FLAG = '--apply';
const DRY_RUN_FLAG = '--dry-run';
const BA_SET_CODES = ['ba-2020', 'ba-2022', 'ba-2024'];
const IDENTITY_DOMAIN = 'pokemon_ba';
const IDENTITY_KEY_VERSION = 'pokemon_ba:v1';
const EXPECTED_CANDIDATE_COUNT = 328;
const REQUIRED_IDENTITY_KEY = [
  'ba_set_code',
  'printed_number',
  'normalized_printed_name',
  'source_name_raw',
];
const REQUIRED_APPROVED_DOMAINS = [
  'pokemon_eng_standard',
  'pokemon_ba',
  'pokemon_eng_special_print',
  'pokemon_jpn',
];
const REQUIRED_EXCLUDED_NONCANON_DOMAINS = ['tcg_pocket'];

function buildPaths() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const checkpointsDir = path.join(repoRoot, 'docs', 'checkpoints');

  return {
    repoRoot,
    checkpointsDir,
    subsystemContract: path.join(repoRoot, 'docs', 'contracts', 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md'),
    baContract: path.join(repoRoot, 'docs', 'contracts', 'BATTLE_ACADEMY_CANON_CONTRACT_V1.md'),
    phase5Candidates: path.join(checkpointsDir, 'ba_phase5_promotion_candidates_v1.json'),
    phase8Verification: path.join(checkpointsDir, 'ba_phase8_identity_subsystem_verification_v1.json'),
    phase8aVerification: path.join(checkpointsDir, 'ba_phase8a_identity_subsystem_verification_v1.json'),
    phase8aExclusionReport: path.join(checkpointsDir, 'ba_phase8a_noncanon_domain_exclusion_report_v1.json'),
    phase8BaStorageReadiness: path.join(checkpointsDir, 'ba_phase8_ba_storage_readiness_v1.json'),
    report: path.join(checkpointsDir, 'ba_phase9_ba_promotion_report_v2.json'),
  };
}

function parseEnvBlock(text) {
  const env = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUpperHyphenToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function deriveNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }
  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  return digitsOnly.length > 0 ? digitsOnly : null;
}

function normalizeVariantKeyForComparison(value) {
  return normalizeTextOrNull(value) ?? '';
}

function buildBaGvId(candidate) {
  const numberToken = normalizeUpperHyphenToken(candidate.printed_number);
  const nameToken = normalizeUpperHyphenToken(candidate.normalized_printed_name);
  const sourceToken = normalizeUpperHyphenToken(candidate.source_name_raw);

  if (!numberToken || !nameToken || !sourceToken) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: missing gv_id inputs for ${candidate.ba_row_id}.`,
    );
  }

  return `GV-PK-BA-${numberToken}-${nameToken}-${sourceToken}`;
}

function parseArgs(argv) {
  return {
    apply: argv.includes(APPLY_FLAG),
    dryRun: argv.includes(DRY_RUN_FLAG) || !argv.includes(APPLY_FLAG),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function mustGetLocalDbUrl(repoRoot) {
  const output = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const env = parseEnvBlock(output);
  const dbUrl = normalizeTextOrNull(env.DB_URL);
  if (!dbUrl) {
    throw new Error('local DB_URL not available from `supabase status -o env`');
  }
  return dbUrl;
}

async function withClient(connectionString, fn) {
  const client = new Client({
    connectionString,
    ssl: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function loadAuthorities(paths) {
  const [
    subsystemContractText,
    baContractText,
    phase5Candidates,
    phase8Verification,
    phase8aVerification,
    phase8aExclusionReport,
    phase8BaStorageReadiness,
  ] = await Promise.all([
    readText(paths.subsystemContract),
    readText(paths.baContract),
    readJson(paths.phase5Candidates),
    readJson(paths.phase8Verification),
    readJson(paths.phase8aVerification),
    readJson(paths.phase8aExclusionReport),
    readJson(paths.phase8BaStorageReadiness),
  ]);

  return {
    subsystemContractText,
    baContractText,
    phase5Candidates,
    phase8Verification,
    phase8aVerification,
    phase8aExclusionReport,
    phase8BaStorageReadiness,
  };
}

function validateAuthorities(authorities) {
  const mismatches = [];
  const candidateCount = authorities.phase5Candidates?.summary_counts?.promotion_eligible_candidate_count ?? null;
  if (candidateCount !== EXPECTED_CANDIDATE_COUNT) {
    mismatches.push({
      field: 'phase5_promotion_candidate_count',
      expected: EXPECTED_CANDIDATE_COUNT,
      actual: candidateCount,
    });
  }

  const keyFields = authorities.phase5Candidates?.candidate_identity_key_v1?.key_fields ?? null;
  if (JSON.stringify(keyFields) !== JSON.stringify(REQUIRED_IDENTITY_KEY)) {
    mismatches.push({
      field: 'phase5_identity_key',
      expected: REQUIRED_IDENTITY_KEY,
      actual: keyFields,
    });
  }

  if (!String(authorities.baContractText).includes('(ba_set_code, printed_number, normalized_printed_name, source_name_raw)')) {
    mismatches.push({
      field: 'ba_contract_identity_law',
      expected: '(ba_set_code, printed_number, normalized_printed_name, source_name_raw)',
      actual: 'missing',
    });
  }

  const subsystemText = String(authorities.subsystemContractText);
  if (
    !subsystemText.includes('`card_prints` remains the durable canonical card object')
    || !subsystemText.includes('`gv_id` remains stored on `card_prints`')
    || !subsystemText.includes('`card_print_identity` becomes the printed-identity authority object')
  ) {
    mismatches.push({
      field: 'subsystem_contract_boundary',
      expected: 'card_prints parent + card_print_identity authority',
      actual: 'missing',
    });
  }

  if (authorities.phase8aVerification?.all_passed !== true) {
    mismatches.push({
      field: 'phase8a_verification',
      expected: true,
      actual: authorities.phase8aVerification?.all_passed ?? null,
    });
  }

  const approvedDomains = authorities.phase8aVerification?.approved_canonical_identity_domains ?? [];
  if (JSON.stringify(approvedDomains) !== JSON.stringify(REQUIRED_APPROVED_DOMAINS)) {
    mismatches.push({
      field: 'approved_canonical_identity_domains',
      expected: REQUIRED_APPROVED_DOMAINS,
      actual: approvedDomains,
    });
  }

  const excludedDomains = authorities.phase8aVerification?.explicitly_excluded_noncanon_domains ?? [];
  if (JSON.stringify(excludedDomains) !== JSON.stringify(REQUIRED_EXCLUDED_NONCANON_DOMAINS)) {
    mismatches.push({
      field: 'explicitly_excluded_noncanon_domains',
      expected: REQUIRED_EXCLUDED_NONCANON_DOMAINS,
      actual: excludedDomains,
    });
  }

  const blockedUnknown = authorities.phase8aExclusionReport?.blocked_unknown_domain_count ?? null;
  if (blockedUnknown !== 0) {
    mismatches.push({
      field: 'phase8a_blocked_unknown_domain_count',
      expected: 0,
      actual: blockedUnknown,
    });
  }

  const excludedBreakdown = authorities.phase8aExclusionReport?.excluded_breakdown_by_domain ?? [];
  const hasTcgPocketExclusion = excludedBreakdown.some(
    (row) => row.domain === 'tcg_pocket' && Number(row.row_count ?? 0) > 0,
  );
  if (!hasTcgPocketExclusion) {
    mismatches.push({
      field: 'phase8a_tcg_pocket_exclusion',
      expected: 'present',
      actual: excludedBreakdown,
    });
  }

  const baSetCount = authorities.phase8BaStorageReadiness?.schema_alignment?.ba_set_count ?? null;
  if (baSetCount !== 3) {
    mismatches.push({
      field: 'ba_set_count',
      expected: 3,
      actual: baSetCount,
    });
  }

  if (authorities.phase8BaStorageReadiness?.candidate_projection?.total_candidates !== EXPECTED_CANDIDATE_COUNT) {
    mismatches.push({
      field: 'phase8_ba_storage_candidate_count',
      expected: EXPECTED_CANDIDATE_COUNT,
      actual: authorities.phase8BaStorageReadiness?.candidate_projection?.total_candidates ?? null,
    });
  }

  if (authorities.phase8BaStorageReadiness?.candidate_projection?.storage_blocker_removed_at_schema_level !== true) {
    mismatches.push({
      field: 'phase8_ba_storage_blocker_removed',
      expected: true,
      actual: authorities.phase8BaStorageReadiness?.candidate_projection?.storage_blocker_removed_at_schema_level ?? null,
    });
  }

  if (mismatches.length > 0) {
    throw new Error(`[ba-phase9-ba-canon-promote-v2] STOP: authority mismatch: ${JSON.stringify(mismatches)}.`);
  }
}

function normalizeCandidateRow(row) {
  const displayName =
    normalizeTextOrNull(row.raw_printed_name)
    ?? normalizeTextOrNull(row.normalized_printed_name);
  const printedNumber = normalizeTextOrNull(row.printed_number);
  const normalizedPrintedName = normalizeTextOrNull(row.normalized_printed_name);
  const sourceNameRaw = normalizeTextOrNull(row.source_name_raw);
  const baSetCode = normalizeTextOrNull(row.ba_set_code);

  if (
    row.promotion_candidate_status !== 'PROMOTION_ELIGIBLE_CANDIDATE'
    || !baSetCode
    || !printedNumber
    || !normalizedPrintedName
    || !sourceNameRaw
    || !displayName
  ) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: invalid promotion candidate row ${JSON.stringify({
        ba_row_id: row.ba_row_id ?? null,
        upstream_id: row.upstream_id ?? null,
      })}.`,
    );
  }

  const underlyingIds = Array.isArray(row.underlying_candidate_ids)
    ? row.underlying_candidate_ids.filter((value) => normalizeTextOrNull(value))
    : [];

  const identityPayload = {};
  if (Number.isInteger(row.parsed_printed_total)) {
    identityPayload.printed_total = row.parsed_printed_total;
  }
  if (underlyingIds.length === 1) {
    identityPayload.underlying_card_print_id = underlyingIds[0];
  }

  return {
    ba_row_id: row.ba_row_id,
    upstream_id: row.upstream_id,
    ba_set_code: baSetCode,
    printed_number: printedNumber,
    normalized_printed_name: normalizedPrintedName,
    source_name_raw: sourceNameRaw,
    display_name: displayName,
    raw_printed_name: normalizeTextOrNull(row.raw_printed_name),
    parsed_printed_total: Number.isInteger(row.parsed_printed_total) ? row.parsed_printed_total : null,
    identity_payload: identityPayload,
    gv_id: buildBaGvId({
      ba_row_id: row.ba_row_id,
      printed_number: printedNumber,
      normalized_printed_name: normalizedPrintedName,
      source_name_raw: sourceNameRaw,
    }),
  };
}

async function attachIdentityHashes(client, candidates) {
  const payload = candidates.map((candidate) => ({
    ba_row_id: candidate.ba_row_id,
    ba_set_code: candidate.ba_set_code,
    printed_number: candidate.printed_number,
    normalized_printed_name: candidate.normalized_printed_name,
    source_name_raw: candidate.source_name_raw,
    identity_payload: candidate.identity_payload,
  }));

  const { rows } = await client.query(
    `
      select
        ord::int as ord,
        public.card_print_identity_hash_v1(
          $2::text,
          $3::text,
          item ->> 'ba_set_code',
          item ->> 'printed_number',
          item ->> 'normalized_printed_name',
          item ->> 'source_name_raw',
          coalesce(item -> 'identity_payload', '{}'::jsonb)
        ) as identity_key_hash
      from jsonb_array_elements($1::jsonb) with ordinality as source(item, ord)
      order by ord
    `,
    [JSON.stringify(payload), IDENTITY_DOMAIN, IDENTITY_KEY_VERSION],
  );

  if (rows.length !== candidates.length) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: expected ${candidates.length} BA hashes, got ${rows.length}.`,
    );
  }

  return candidates.map((candidate, index) => ({
    ...candidate,
    identity_key_hash: rows[index].identity_key_hash,
  }));
}

async function loadLocalState(client) {
  const [
    baSetsResult,
    gamesResult,
    baCardPrintsResult,
    baIdentitiesResult,
    mappingsFkResult,
    cardPrintNumberPlainResult,
    cardPrintIndexesResult,
  ] = await Promise.all([
    client.query(
      `
        select id, code, name, game
        from public.sets
        where code = any($1::text[])
        order by code
      `,
      [BA_SET_CODES],
    ),
    client.query(
      `
        select id, code, name, slug
        from public.games
        order by code nulls last, name nulls last, id
      `,
    ),
    client.query(
      `
        select id, game_id, set_id, set_code, number, number_plain, variant_key, name, gv_id
        from public.card_prints
        where set_code = any($1::text[])
           or gv_id like 'GV-PK-BA-%'
        order by set_code, number, gv_id nulls last, id
      `,
      [BA_SET_CODES],
    ),
    client.query(
      `
        select
          cpi.id as identity_id,
          cpi.card_print_id,
          cpi.identity_domain,
          cpi.identity_key_version,
          cpi.set_code_identity,
          cpi.printed_number,
          cpi.normalized_printed_name,
          cpi.source_name_raw,
          cpi.identity_payload,
          cpi.identity_key_hash,
          cpi.is_active,
          cp.game_id,
          cp.set_id,
          cp.set_code,
          cp.number,
          cp.number_plain,
          cp.variant_key,
          cp.name,
          cp.gv_id
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.identity_domain = $1
           or cp.set_code = any($2::text[])
           or cp.gv_id like 'GV-PK-BA-%'
        order by cpi.identity_key_hash, cpi.id
      `,
      [IDENTITY_DOMAIN, BA_SET_CODES],
    ),
    client.query(
      `
        select pg_get_constraintdef(oid) as definition
        from pg_constraint
        where conname = 'external_mappings_card_print_id_fkey'
          and connamespace = 'public'::regnamespace
      `,
    ),
    client.query(
      `
        select
          column_name,
          is_generated,
          generation_expression
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'card_prints'
          and column_name = 'number_plain'
      `,
    ),
    client.query(
      `
        select indexname, indexdef
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'card_prints'
          and indexname in ('uq_card_prints_identity', 'card_prints_gv_id_uq')
        order by indexname
      `,
    ),
  ]);

  return {
    baSets: baSetsResult.rows,
    games: gamesResult.rows,
    baCardPrints: baCardPrintsResult.rows,
    baIdentities: baIdentitiesResult.rows,
    mappingsFk: mappingsFkResult.rows[0] ?? null,
    numberPlainColumn: cardPrintNumberPlainResult.rows[0] ?? null,
    cardPrintIndexes: cardPrintIndexesResult.rows,
  };
}

function resolveGameRowForSet(setRow, gameRows) {
  const setGame = normalizeTextOrNull(setRow?.game);
  if (!setGame) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: set ${setRow?.code ?? '<unknown>'} is missing sets.game and cannot resolve card_prints.game_id.`,
    );
  }

  const target = setGame.toLowerCase();
  const matches = gameRows.filter((row) => {
    const code = normalizeTextOrNull(row.code)?.toLowerCase() ?? null;
    const name = normalizeTextOrNull(row.name)?.toLowerCase() ?? null;
    const slug = normalizeTextOrNull(row.slug)?.toLowerCase() ?? null;
    return code === target || name === target || slug === target;
  });

  if (matches.length !== 1) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: set ${setRow.code} with sets.game=${JSON.stringify(
        setGame,
      )} resolved ${matches.length} game rows; expected exactly one.`,
    );
  }

  return matches[0];
}

function buildCardPrintsLegacyUniquenessBlockers(candidates, localState) {
  const blockers = [];
  const collisionMap = new Map();

  for (const candidate of candidates) {
    const key = `${candidate.ba_set_code}::${candidate.printed_number}`;
    collisionMap.set(key, (collisionMap.get(key) ?? 0) + 1);
  }

  const duplicateGroups = [...collisionMap.entries()]
    .filter(([, rowCount]) => rowCount > 1)
    .map(([key, rowCount]) => ({ key, row_count: rowCount }));
  const duplicateRowCount = duplicateGroups.reduce((total, row) => total + row.row_count, 0);

  const numberPlainIsGenerated =
    normalizeTextOrNull(localState.numberPlainColumn?.is_generated) === 'ALWAYS';
  const numberPlainGenerationExpression =
    normalizeTextOrNull(localState.numberPlainColumn?.generation_expression);
  const hasLegacyIdentityUniqueIndex = localState.cardPrintIndexes.some(
    (row) => row.indexname === 'uq_card_prints_identity',
  );

  if (
    numberPlainIsGenerated
    && numberPlainGenerationExpression?.includes('regexp_replace(number')
    && hasLegacyIdentityUniqueIndex
    && duplicateGroups.length > 0
  ) {
    blockers.push({
      code: 'LEGACY_CARD_PRINTS_UNIQUENESS_BLOCKS_BA_PARENT_INSERTS',
      message:
        'card_prints.number_plain is generated from number and uq_card_prints_identity still enforces (game_id, set_id, number_plain, variant_key), so lawful BA same-number rows collide before identity-subsystem uniqueness can apply.',
      detail: {
        number_plain_generation_expression: numberPlainGenerationExpression,
        duplicate_group_count: duplicateGroups.length,
        duplicate_row_count: duplicateRowCount,
        sample_duplicate_groups: duplicateGroups.slice(0, 20),
      },
    });
  }

  return blockers;
}

function getSingleOrThrow(map, key, label) {
  const rows = map.get(key) ?? [];
  if (rows.length > 1) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: duplicate ${label} for ${key}: ${JSON.stringify(rows)}.`,
    );
  }
  return rows[0] ?? null;
}

function groupRows(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(row);
  }
  return map;
}

function validateExistingBASurface(candidates, localState) {
  const plannedGvIds = new Set(candidates.map((candidate) => candidate.gv_id));
  const plannedHashes = new Set(candidates.map((candidate) => candidate.identity_key_hash));

  const strayCardPrints = localState.baCardPrints.filter(
    (row) => !plannedGvIds.has(normalizeTextOrNull(row.gv_id)),
  );
  if (strayCardPrints.length > 0) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: stray BA card_print rows exist outside the 328 approved candidates: ${JSON.stringify(
        strayCardPrints.slice(0, 10),
      )}.`,
    );
  }

  const strayActiveIdentities = localState.baIdentities.filter(
    (row) => row.is_active === true && !plannedHashes.has(normalizeTextOrNull(row.identity_key_hash)),
  );
  if (strayActiveIdentities.length > 0) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: stray BA active identity rows exist outside the 328 approved candidates: ${JSON.stringify(
        strayActiveIdentities.slice(0, 10),
      )}.`,
    );
  }
}

function assertExistingIdentityMatches(candidate, existingIdentity, expectedSetId, expectedGameId) {
  const mismatches = [];
  const expectedNumberPlain = deriveNumberPlain(candidate.printed_number);
  if (existingIdentity.identity_domain !== IDENTITY_DOMAIN) {
    mismatches.push(['identity_domain', existingIdentity.identity_domain, IDENTITY_DOMAIN]);
  }
  if (existingIdentity.identity_key_version !== IDENTITY_KEY_VERSION) {
    mismatches.push(['identity_key_version', existingIdentity.identity_key_version, IDENTITY_KEY_VERSION]);
  }
  if (existingIdentity.set_code_identity !== candidate.ba_set_code) {
    mismatches.push(['set_code_identity', existingIdentity.set_code_identity, candidate.ba_set_code]);
  }
  if (existingIdentity.printed_number !== candidate.printed_number) {
    mismatches.push(['printed_number', existingIdentity.printed_number, candidate.printed_number]);
  }
  if (existingIdentity.normalized_printed_name !== candidate.normalized_printed_name) {
    mismatches.push([
      'normalized_printed_name',
      existingIdentity.normalized_printed_name,
      candidate.normalized_printed_name,
    ]);
  }
  if (existingIdentity.source_name_raw !== candidate.source_name_raw) {
    mismatches.push(['source_name_raw', existingIdentity.source_name_raw, candidate.source_name_raw]);
  }
  if (normalizeTextOrNull(existingIdentity.set_code) !== candidate.ba_set_code) {
    mismatches.push(['card_print.set_code', existingIdentity.set_code, candidate.ba_set_code]);
  }
  if (normalizeTextOrNull(existingIdentity.number) !== candidate.printed_number) {
    mismatches.push(['card_print.number', existingIdentity.number, candidate.printed_number]);
  }
  if (normalizeTextOrNull(existingIdentity.gv_id) !== candidate.gv_id) {
    mismatches.push(['card_print.gv_id', existingIdentity.gv_id, candidate.gv_id]);
  }
  if (normalizeVariantKeyForComparison(existingIdentity.variant_key) !== '') {
    mismatches.push(['card_print.variant_key', existingIdentity.variant_key, '']);
  }
  if (normalizeTextOrNull(existingIdentity.number_plain) !== expectedNumberPlain) {
    mismatches.push(['card_print.number_plain', existingIdentity.number_plain, expectedNumberPlain]);
  }
  if (normalizeTextOrNull(existingIdentity.set_id) !== expectedSetId) {
    mismatches.push(['card_print.set_id', existingIdentity.set_id, expectedSetId]);
  }
  if (normalizeTextOrNull(existingIdentity.game_id) !== expectedGameId) {
    mismatches.push(['card_print.game_id', existingIdentity.game_id, expectedGameId]);
  }

  if (mismatches.length > 0) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: existing BA identity mismatch for ${candidate.ba_row_id}: ${JSON.stringify(
        mismatches,
      )}.`,
    );
  }
}

function assertExistingCardPrintMatches(candidate, existingCardPrint, expectedSetId, expectedGameId) {
  const mismatches = [];
  const expectedNumberPlain = deriveNumberPlain(candidate.printed_number);
  if (normalizeTextOrNull(existingCardPrint.set_code) !== candidate.ba_set_code) {
    mismatches.push(['set_code', existingCardPrint.set_code, candidate.ba_set_code]);
  }
  if (normalizeTextOrNull(existingCardPrint.number) !== candidate.printed_number) {
    mismatches.push(['number', existingCardPrint.number, candidate.printed_number]);
  }
  if (normalizeTextOrNull(existingCardPrint.gv_id) !== candidate.gv_id) {
    mismatches.push(['gv_id', existingCardPrint.gv_id, candidate.gv_id]);
  }
  if (normalizeVariantKeyForComparison(existingCardPrint.variant_key) !== '') {
    mismatches.push(['variant_key', existingCardPrint.variant_key, '']);
  }
  if (normalizeTextOrNull(existingCardPrint.number_plain) !== expectedNumberPlain) {
    mismatches.push(['number_plain', existingCardPrint.number_plain, expectedNumberPlain]);
  }
  if (normalizeTextOrNull(existingCardPrint.set_id) !== expectedSetId) {
    mismatches.push(['set_id', existingCardPrint.set_id, expectedSetId]);
  }
  if (normalizeTextOrNull(existingCardPrint.game_id) !== expectedGameId) {
    mismatches.push(['game_id', existingCardPrint.game_id, expectedGameId]);
  }

  if (mismatches.length > 0) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: existing BA card_print mismatch for ${candidate.ba_row_id}: ${JSON.stringify(
        mismatches,
      )}.`,
    );
  }
}

function planPromotion(candidates, localState) {
  const setByCode = new Map(localState.baSets.map((row) => {
    const gameRow = resolveGameRowForSet(row, localState.games);
    return [row.code, {
      ...row,
      game_id: gameRow.id,
      game_name: gameRow.name,
      game_code: gameRow.code,
      game_slug: gameRow.slug,
    }];
  }));
  const expectedSetCodes = BA_SET_CODES.filter((code) => !setByCode.has(code));
  if (expectedSetCodes.length > 0) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: BA sets missing locally: ${JSON.stringify(expectedSetCodes)}.`,
    );
  }

  validateExistingBASurface(candidates, localState);

  const legacyUniquenessBlockers = buildCardPrintsLegacyUniquenessBlockers(candidates, localState);
  if (legacyUniquenessBlockers.length > 0) {
    return {
      candidate_count: candidates.length,
      insert_card_prints_count: 0,
      insert_identity_rows_count: 0,
      skipped_existing_count: 0,
      blockers: legacyUniquenessBlockers,
      operations: [],
    };
  }

  const identitiesByHash = groupRows(localState.baIdentities.filter((row) => row.is_active === true), (row) =>
    normalizeTextOrNull(row.identity_key_hash),
  );
  const cardPrintsByGvId = groupRows(localState.baCardPrints, (row) => normalizeTextOrNull(row.gv_id));
  const activeIdentityByCardPrintId = groupRows(localState.baIdentities.filter((row) => row.is_active === true), (row) =>
    normalizeTextOrNull(row.card_print_id),
  );

  const operations = [];
  let insertCardPrints = 0;
  let insertIdentities = 0;
  let skippedExisting = 0;

  for (const candidate of candidates) {
    const expectedSet = setByCode.get(candidate.ba_set_code);
    const expectedSetId = expectedSet.id;
    const expectedGameId = expectedSet.game_id;
    const existingIdentity = getSingleOrThrow(identitiesByHash, candidate.identity_key_hash, 'identity_key_hash');
    const existingCardPrint = getSingleOrThrow(cardPrintsByGvId, candidate.gv_id, 'gv_id');

    if (existingIdentity) {
      assertExistingIdentityMatches(candidate, existingIdentity, expectedSetId, expectedGameId);
      operations.push({
        type: 'already_present',
        candidate,
        card_print_id: existingIdentity.card_print_id,
        identity_id: existingIdentity.identity_id,
      });
      skippedExisting += 1;
      continue;
    }

    if (existingCardPrint) {
      assertExistingCardPrintMatches(candidate, existingCardPrint, expectedSetId, expectedGameId);
      const activeIdentity = getSingleOrThrow(
        activeIdentityByCardPrintId,
        normalizeTextOrNull(existingCardPrint.id),
        'active_identity.card_print_id',
      );

      if (activeIdentity) {
        throw new Error(
          `[ba-phase9-ba-canon-promote-v2] STOP: card_print ${existingCardPrint.id} already has an unrelated active identity row.`,
        );
      }

      operations.push({
        type: 'insert_identity_only',
        candidate,
        game_id: expectedGameId,
        card_print_id: existingCardPrint.id,
        set_id: expectedSetId,
      });
      insertIdentities += 1;
      continue;
    }

    operations.push({
      type: 'insert_both',
      candidate,
      game_id: expectedGameId,
      set_id: expectedSetId,
    });
    insertCardPrints += 1;
    insertIdentities += 1;
  }

  return {
    candidate_count: candidates.length,
    insert_card_prints_count: insertCardPrints,
    insert_identity_rows_count: insertIdentities,
    skipped_existing_count: skippedExisting,
    blockers: [],
    operations,
  };
}

async function applyPromotion(client, plan) {
  const insertedCardPrints = [];
  const insertedIdentities = [];
  const reusedCardPrintIds = [];

  await client.query('begin');
  try {
    for (const operation of plan.operations) {
      const candidate = operation.candidate;
      let cardPrintId = operation.card_print_id ?? null;

      if (operation.type === 'insert_both') {
        const insertCardPrintResult = await client.query(
          `
            insert into public.card_prints (
              game_id,
              set_id,
              set_code,
              number,
              variant_key,
              name,
              printed_total,
              gv_id
            )
            values ($1, $2, $3, $4, '', $5, $6, $7)
            returning id
          `,
          [
            operation.game_id,
            operation.set_id,
            candidate.ba_set_code,
            candidate.printed_number,
            candidate.display_name,
            candidate.parsed_printed_total,
            candidate.gv_id,
          ],
        );
        cardPrintId = insertCardPrintResult.rows[0]?.id ?? null;
        if (!cardPrintId) {
          throw new Error(
            `[ba-phase9-ba-canon-promote-v2] STOP: failed to insert BA card_print for ${candidate.ba_row_id}.`,
          );
        }
        insertedCardPrints.push({
          ba_row_id: candidate.ba_row_id,
          card_print_id: cardPrintId,
          gv_id: candidate.gv_id,
        });
      } else if (operation.type === 'insert_identity_only') {
        reusedCardPrintIds.push({
          ba_row_id: candidate.ba_row_id,
          card_print_id: cardPrintId,
          gv_id: candidate.gv_id,
        });
      }

      if (operation.type !== 'already_present') {
        const insertIdentityResult = await client.query(
          `
            insert into public.card_print_identity (
              card_print_id,
              identity_domain,
              set_code_identity,
              printed_number,
              normalized_printed_name,
              source_name_raw,
              identity_payload,
              identity_key_version,
              identity_key_hash,
              is_active
            )
            values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, true)
            returning id
          `,
          [
            cardPrintId,
            IDENTITY_DOMAIN,
            candidate.ba_set_code,
            candidate.printed_number,
            candidate.normalized_printed_name,
            candidate.source_name_raw,
            JSON.stringify(candidate.identity_payload),
            IDENTITY_KEY_VERSION,
            candidate.identity_key_hash,
          ],
        );
        const identityId = insertIdentityResult.rows[0]?.id ?? null;
        if (!identityId) {
          throw new Error(
            `[ba-phase9-ba-canon-promote-v2] STOP: failed to insert BA identity row for ${candidate.ba_row_id}.`,
          );
        }
        insertedIdentities.push({
          ba_row_id: candidate.ba_row_id,
          identity_id: identityId,
          card_print_id: cardPrintId,
          identity_key_hash: candidate.identity_key_hash,
        });
      }
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  return {
    inserted_card_prints: insertedCardPrints,
    inserted_identity_rows: insertedIdentities,
    reused_card_prints_for_identity_only: reusedCardPrintIds,
  };
}

function buildReport({ mode, authorities, candidates, localState, plan, applyResult }) {
  const insertedCardPrints = applyResult?.inserted_card_prints ?? [];
  const insertedIdentityRows = applyResult?.inserted_identity_rows ?? [];
  const reusedCardPrints = applyResult?.reused_card_prints_for_identity_only ?? [];

  return {
    generated_at: new Date().toISOString(),
    phase: PHASE_NAME,
    mode,
    identity_law: {
      identity_domain: IDENTITY_DOMAIN,
      identity_key_version: IDENTITY_KEY_VERSION,
      identity_key_fields: REQUIRED_IDENTITY_KEY,
    },
    authority_lock: {
      promotion_candidate_count: authorities.phase5Candidates.summary_counts.promotion_eligible_candidate_count,
      tcg_pocket_excluded_noncanon_domain_count:
        authorities.phase8aExclusionReport.excluded_noncanon_domain_count,
      ba_sets_registered_locally: localState.baSets.map((row) => row.code),
    },
    plan_summary: {
      total_candidates: plan.candidate_count,
      insert_card_prints_count: plan.insert_card_prints_count,
      insert_identity_rows_count: plan.insert_identity_rows_count,
      skipped_existing_count: plan.skipped_existing_count,
      blocker_count: plan.blockers.length,
    },
    execution_summary: {
      inserted_card_prints: insertedCardPrints.length,
      inserted_identity_rows: insertedIdentityRows.length,
      skipped_existing: plan.skipped_existing_count,
      reused_existing_card_prints_for_identity_only: reusedCardPrints.length,
    },
    gv_id_sample: candidates.slice(0, 10).map((candidate) => ({
      ba_row_id: candidate.ba_row_id,
      gv_id: candidate.gv_id,
    })),
    blockers: plan.blockers,
    verification_results: null,
  };
}

async function runPromotion(options = {}) {
  const paths = buildPaths();
  const authorities = await loadAuthorities(paths);
  validateAuthorities(authorities);

  const localDbUrl = mustGetLocalDbUrl(paths.repoRoot);
  return withClient(localDbUrl, async (client) => {
    const normalizedCandidates = (authorities.phase5Candidates.rows ?? []).map(normalizeCandidateRow);
    if (normalizedCandidates.length !== EXPECTED_CANDIDATE_COUNT) {
      throw new Error(
        `[ba-phase9-ba-canon-promote-v2] STOP: expected ${EXPECTED_CANDIDATE_COUNT} normalized BA candidates, got ${normalizedCandidates.length}.`,
      );
    }

    const candidates = await attachIdentityHashes(client, normalizedCandidates);
    const localState = await loadLocalState(client);
    const plan = planPromotion(candidates, localState);
    const applyResult = options.apply && plan.blockers.length === 0
      ? await applyPromotion(client, plan)
      : null;
    const report = buildReport({
      mode: options.apply ? 'apply' : 'dry-run',
      authorities,
      candidates,
      localState,
      plan,
      applyResult,
    });

    await writeJson(paths.report, report);

    return {
      paths,
      authorities,
      candidates,
      localState,
      plan,
      applyResult,
      report,
    };
  });
}

function printSummary(result) {
  console.log(`[ba-phase9-ba-canon-promote-v2] mode=${result.report.mode}`);
  console.log(`[ba-phase9-ba-canon-promote-v2] total_candidates=${result.plan.candidate_count}`);
  console.log(`[ba-phase9-ba-canon-promote-v2] insert_card_prints_count=${result.plan.insert_card_prints_count}`);
  console.log(`[ba-phase9-ba-canon-promote-v2] insert_identity_rows_count=${result.plan.insert_identity_rows_count}`);
  console.log(`[ba-phase9-ba-canon-promote-v2] skipped_existing_count=${result.plan.skipped_existing_count}`);
  console.log(`[ba-phase9-ba-canon-promote-v2] blocker_count=${result.plan.blockers.length}`);
  if (result.plan.blockers.length > 0) {
    console.log(JSON.stringify(result.plan.blockers, null, 2));
  }
  console.log(`[ba-phase9-ba-canon-promote-v2] report_path=${result.paths.report}`);
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runPromotion({ apply: options.apply });
  printSummary(result);

  if (result.plan.blockers.length > 0) {
    throw new Error(
      `[ba-phase9-ba-canon-promote-v2] STOP: ${result.plan.blockers[0].code}.`,
    );
  }
}

export {
  APPLY_FLAG,
  BA_SET_CODES,
  DRY_RUN_FLAG,
  EXPECTED_CANDIDATE_COUNT,
  IDENTITY_DOMAIN,
  IDENTITY_KEY_VERSION,
  PHASE_NAME,
  REQUIRED_IDENTITY_KEY,
  attachIdentityHashes,
  buildBaGvId,
  buildPaths,
  loadAuthorities,
  normalizeCandidateRow,
  normalizeTextOrNull,
  planPromotion,
  runPromotion,
  validateAuthorities,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  runCli().catch((error) => {
    console.error('[ba-phase9-ba-canon-promote-v2] Fatal error:', error);
    process.exit(1);
  });
}


import '../env.mjs';

import fs from 'fs';
import path from 'path';
import https from 'https';
import pg from 'pg';

import { normalizeCardNameV1 } from '../identity/normalizeCardNameV1.mjs';
import { derivePerfectOrderVariantIdentity } from '../identity/perfect_order_variant_identity_rule_v1.mjs';

const PHASE = 'MISSING_SPECIAL_CASES_AUDIT_V1';
const OUTPUT_JSON_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'warehouse',
  'missing_special_cases_audit_v1.json',
);
const OUTPUT_MARKDOWN_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'warehouse',
  'missing_special_cases_audit_v1.md',
);

const PRODUCT_NOISE_RE =
  /\b(code card|jumbo|oversized|playmat|binder|sleeve|deck box|coin|pin collection|figure collection|booster box|elite trainer box|etb|collection box|blister pack)\b/i;
const TRAINER_KIT_DECK_SLOT_RE = /\benergy\s*\(#\d+\)\b/i;
const FINISH_ONLY_RE =
  /\b(cosmos holo|cosmo holo|cracked ice|reverse holo|line holo|sheen holo|water web holo|metal card)\b/i;
const STAMPED_RE =
  /\b(staff|stamped|stamp|prerelease|league|league promo|league challenge|league cup|city championships|regional championships|nationals|worlds|professor program|prize pack|battle road|\d(?:st|nd|rd|th)\s+place)\b/i;
const PROMO_STYLE_RE =
  /\b(promo|exclusive|holiday calendar|build-a-bear|toys r us|comic con|mcdonald|burger king|countdown calendar|first partner pack|japanese exclusive|battle academy)\b/i;
const SPECIAL_RARITY_RE =
  /\b(shiny vault|galarian gallery|trainer gallery|gallery|rare shining|shiny rare|illustration rare|special illustration rare|hyper rare|gold rare|radiant collection)\b/i;
const SPECIAL_SET_RE =
  /(promo|gallery|shiny|prize-pack|jumbo|alternate-art|deck-exclusives|blister-exclusives|perfect-order|miscellaneous-cards-products)/i;
const ALPHA_NUMBER_RE = /[A-Za-z]/;

const SOURCE_SURFACES = Object.freeze([
  {
    lane: 'discovery candidate generation',
    files: [
      'backend/ingestion/controlled_growth_ingestion_worker_v1.mjs',
      'backend/ingestion/controlled_growth_non_canonical_filter_worker_v1.mjs',
      'backend/warehouse/justtcg_discovery_worker_v1.mjs',
      'public.external_discovery_candidates',
      'public.raw_imports',
    ],
  },
  {
    lane: 'external source normalization',
    files: [
      'backend/pokemon/pokemonapi_normalize_worker.mjs',
      'backend/pokemon/tcgdex_normalize_worker.mjs',
      'public.raw_imports',
      'public.external_mappings',
      'public.card_prints',
    ],
  },
  {
    lane: 'warehouse bridge',
    files: [
      'backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs',
      'public.external_discovery_candidates',
      'public.canon_warehouse_candidates',
      'public.canon_warehouse_candidate_events',
    ],
  },
  {
    lane: 'source-backed intake',
    files: [
      'backend/warehouse/classification_worker_v1.mjs',
      'backend/warehouse/metadata_extraction_worker_v1.mjs',
      'backend/warehouse/promotion_stage_worker_v1.mjs',
      'backend/warehouse/promotion_executor_v1.mjs',
      'backend/warehouse/source_identity_contract_v1.mjs',
      'public.canon_warehouse_candidates',
      'public.canon_warehouse_promotion_staging',
    ],
  },
  {
    lane: 'variant identity resolution',
    files: [
      'backend/identity/perfect_order_variant_identity_rule_v1.mjs',
      'backend/identity/identity_slot_audit_v1.mjs',
      'backend/identity/identity_resolution_v1.mjs',
      'public.card_prints',
      'public.card_print_identity',
    ],
  },
]);

const PRIORITY_LABELS = Object.freeze({
  PRIORITY_1_READY_FOR_WAREHOUSE_NOW: 'Priority 1 - Ready for warehouse now',
  PRIORITY_2_NEEDS_RULE_OR_MANUAL_REVIEW: 'Priority 2 - Needs one bounded rule first',
  PRIORITY_3_MAPPING_OR_ROUTING: 'Priority 3 - Mapping/routing cleanup only',
  PRIORITY_4_FUTURE_PRINTING_LAYER: 'Priority 4 - Future printing layer',
  PRIORITY_5_REJECT_OR_NOISE: 'Priority 5 - Reject/noise',
});

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, text) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, text);
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLower(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : '';
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function normalizePrintedNumber(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized.replace(/[‐‑–—]/g, '-').replace(/[⁄∕]/g, '/').replace(/\s+/g, '').toUpperCase();
}

function extractLeftCollectorToken(value) {
  const normalized = normalizePrintedNumber(value);
  if (!normalized) return null;
  return normalized.includes('/') ? normalized.split('/', 1)[0] : normalized;
}

function normalizeDigitsKey(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return null;
  return digits.replace(/^0+/, '') || '0';
}

function normalizeNumberPlain(value) {
  return extractLeftCollectorToken(value);
}

function normalizeNameKey(value) {
  const normalized = normalizeCardNameV1(value).corrected_name;
  const safe = normalizeTextOrNull(normalized);
  return safe ? safe.toLowerCase() : null;
}

function stripKnownModifiers(value) {
  let name = normalizeTextOrNull(value) ?? '';
  name = name.replace(/\[[^\]]+\]/g, ' ');
  name = name.replace(/\((?:cosmos holo|cosmo holo|cracked ice|reverse holo|line holo|sheen holo|water web holo|metal card)\)/gi, ' ');
  name = name.replace(/\((?:shiny|shiny holo rare|shiny rare|secret|secret rare|illustration rare|special illustration rare|hyper rare|gold rare|rare shining|radiant collection)\)/gi, ' ');
  name = name.replace(/\((?:staff|stamped|stamp|prerelease|league[^)]*|city championships|regional championships|nationals|worlds|battle road[^)]*|holiday calendar|build-a-bear[^)]*|toys r us[^)]*|comic con|japanese exclusive[^)]*|battle academy[^)]*|perfect order stamped|journey together stamped|surging sparks stamped|stellar crown stamp)\)/gi, ' ');
  name = name.replace(/\((?:team plasma|delta species|supporter|item|stadium|pokemon tool|basic pokemon|stage 1|stage 2)\)/gi, ' ');
  name = name.replace(/\((?:\d+[A-Za-z]?\/[A-Za-z0-9.-]+)\)/g, ' ');
  name = name.replace(/\((?:[A-Z]{0,4}\d+[A-Z]?|\d+[A-Z]?)\)/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  name = name.replace(/\s*-\s*[0-9A-Za-z]+(?:\/[A-Za-z0-9.-]+)?(?:\s*\([^)]*\))?(?:\s*\[[^\]]+\])?\s*$/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name || normalizeTextOrNull(value);
}

function buildEvidenceText(values) {
  return values.map((value) => normalizeTextOrNull(value)).filter(Boolean).join(' | ');
}

async function dohResolveHost(hostname) {
  const pathName = `/resolve?name=${encodeURIComponent(hostname)}&type=A`;
  const payload = await new Promise((resolve, reject) => {
    const request = https.request(
      {
        host: '8.8.8.8',
        port: 443,
        path: pathName,
        method: 'GET',
        servername: 'dns.google',
        headers: {
          Host: 'dns.google',
        },
        rejectUnauthorized: true,
        timeout: 10000,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (response.statusCode !== 200) {
            reject(new Error(`DOH_RESOLVE_FAILED:${response.statusCode}:${body}`));
            return;
          }
          resolve(body);
        });
      },
    );

    request.on('timeout', () => request.destroy(new Error('DOH_RESOLVE_TIMEOUT')));
    request.on('error', reject);
    request.end();
  });

  const parsed = JSON.parse(payload);
  const answers = Array.isArray(parsed?.Answer) ? parsed.Answer : [];
  const address = answers.find((answer) => Number(answer?.type) === 1 && normalizeTextOrNull(answer?.data));
  if (!address?.data) {
    throw new Error(`DOH_NO_A_RECORD:${hostname}`);
  }
  return String(address.data);
}

async function createClient() {
  const dbUrl = normalizeTextOrNull(process.env.SUPABASE_DB_URL);
  if (!dbUrl) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const parsed = new URL(dbUrl);
  const hostIp = await dohResolveHost(parsed.hostname);

  const client = new pg.Client({
    host: hostIp,
    port: Number(parsed.port || 5432),
    database: parsed.pathname.replace(/^\//, ''),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ssl: {
      rejectUnauthorized: false,
      servername: parsed.hostname,
    },
    application_name: PHASE,
  });

  await client.connect();
  return client;
}

async function queryRows(client, text, params = []) {
  const result = await client.query(text, params);
  return result.rows;
}

function deriveCandidateType(row) {
  if (row.source === 'justtcg') {
    return 'justtcg_discovery_unresolved';
  }
  if (row.source === 'pokemonapi') {
    return 'pokemonapi_raw_unmapped';
  }
  if (row.source === 'tcgdex') {
    return 'tcgdex_raw_unmapped';
  }
  return 'unknown';
}

function deriveSpecialSignals(row) {
  const text = [
    row.candidate_name,
    row.source_external_id,
    row.source_set_id,
    row.set_name,
    row.rarity,
  ]
    .map((value) => normalizeTextOrNull(value))
    .filter(Boolean)
    .join(' | ');

  const lowerText = text.toLowerCase();
  const printedNumber = normalizeTextOrNull(row.printed_number) ?? '';
  const exactPrintedNumber = normalizePrintedNumber(row.printed_number);

  const perfectOrderIdentity = derivePerfectOrderVariantIdentity({
    sourceSetId: row.source_set_id,
    numberPlain: row.normalized_number_plain,
    normalizedNameKey: normalizeNameKey(stripKnownModifiers(row.candidate_name)),
    rawRarity: row.rarity,
    upstreamId: row.source_external_id,
  });

  const specialSignals = {
    isProductNoise: PRODUCT_NOISE_RE.test(lowerText) || TRAINER_KIT_DECK_SLOT_RE.test(lowerText),
    isFinishOnly: FINISH_ONLY_RE.test(lowerText),
    isStamped: STAMPED_RE.test(lowerText),
    isPromoStyle: PROMO_STYLE_RE.test(lowerText),
    isSpecialRarity: SPECIAL_RARITY_RE.test(lowerText),
    isSpecialSet: SPECIAL_SET_RE.test(lowerText),
    isAlphaNumber: ALPHA_NUMBER_RE.test(printedNumber),
    exactPrintedNumber,
    perfectOrderIdentity,
  };

  specialSignals.hasAuditSignal =
    specialSignals.isProductNoise ||
    specialSignals.isFinishOnly ||
    specialSignals.isStamped ||
    specialSignals.isPromoStyle ||
    specialSignals.isSpecialRarity ||
    specialSignals.isSpecialSet ||
    specialSignals.isAlphaNumber ||
    Boolean(perfectOrderIdentity);

  return specialSignals;
}

function bucketIdentity(signals) {
  if (signals.isFinishOnly) return 'FINISH_ONLY_NOT_CANON';
  if (signals.perfectOrderIdentity?.applies) return 'SAME_NUMBER_COLLISION';
  if (signals.isStamped) return 'STAMPED_IDENTITY';
  if (signals.isSpecialRarity) return 'SPECIAL_RARITY_IDENTITY';
  if (signals.isPromoStyle || signals.isAlphaNumber) return 'PROMO_STYLE_IDENTITY';
  return 'INSUFFICIENT_EVIDENCE';
}

function chooseCanonicalSetHint(row, justtcgMappingsBySetId, setsByCode) {
  if (row.source === 'justtcg') {
    const mapping = justtcgMappingsBySetId.get(row.source_set_id) ?? null;
    if (mapping?.uniqueSetCode) {
      return mapping.uniqueSetCode;
    }

    const payloadHint = normalizeTextOrNull(row.canonical_set_hint);
    if (payloadHint && setsByCode.has(payloadHint)) {
      return payloadHint;
    }
    return null;
  }

  const directHint = normalizeTextOrNull(row.canonical_set_hint) ?? normalizeTextOrNull(row.source_set_id);
  if (directHint && setsByCode.has(directHint)) {
    return directHint;
  }

  return null;
}

function uniqueRows(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return [...map.values()];
}

function filterRowsByVariantKey(rows, variantKey) {
  const normalizedVariantKey = normalizeTextOrNull(variantKey);
  if (!normalizedVariantKey || rows.length <= 1) {
    return rows;
  }

  const filtered = rows.filter(
    (row) => normalizeTextOrNull(row.variant_key) === normalizedVariantKey,
  );
  return filtered.length > 0 ? filtered : rows;
}

function pickUnderlyingMatch(exactRows, plainRows, globalExactRows, globalPlainRows) {
  if (exactRows.length === 1) {
    return { type: 'exact_set', row: exactRows[0] };
  }
  if (plainRows.length === 1) {
    return { type: 'plain_set', row: plainRows[0] };
  }
  if (globalExactRows.length === 1) {
    return { type: 'exact_global', row: globalExactRows[0] };
  }
  if (globalPlainRows.length === 1) {
    return { type: 'plain_global', row: globalPlainRows[0] };
  }
  return null;
}

function buildCollisionGroupKey(setCodeHint, row, baseNameKey) {
  if (!setCodeHint || !row.normalized_number_plain || !baseNameKey) {
    return null;
  }
  return `${setCodeHint}::${row.normalized_number_plain}::${baseNameKey}`;
}

function classifyTopLevelState({
  row,
  signals,
  identityBucket,
  setCodeHint,
  setStats,
  exactSetRows,
  plainSetRows,
  globalExactRows,
  globalPlainRows,
  underlyingMatch,
}) {
  if (signals.isProductNoise) {
    return {
      topLevelState: 'PRODUCT_OR_NOISE',
      blockingReason: 'non_canonical_product_or_deck_slot_surface',
    };
  }

  if (signals.isFinishOnly) {
    if (underlyingMatch) {
      return {
        topLevelState: 'ALREADY_IN_CANON',
        blockingReason: 'finish_only_surface_attaches_to_existing_canon',
      };
    }
    return {
      topLevelState: 'AMBIGUOUS_IDENTITY',
      blockingReason: 'finish_only_surface_without_unique_underlying_match',
    };
  }

  if (signals.isStamped && exactSetRows.length === 1) {
    return {
      topLevelState: 'CANON_MISSING_PLAUSIBLE',
      blockingReason: 'same_set_base_match_exists_but_special_identity_row_is_missing',
    };
  }

  if (exactSetRows.length === 1) {
    return {
      topLevelState: 'ALREADY_IN_CANON',
      blockingReason: 'exact_canonical_match_exists',
    };
  }

  if (setCodeHint && setStats && setStats.cardPrintCount === 0) {
    return {
      topLevelState: 'AMBIGUOUS_IDENTITY',
      blockingReason: 'canonical_set_absent_from_canon_outside_special_pass',
    };
  }

  if (signals.perfectOrderIdentity?.applies) {
    if (
      underlyingMatch &&
      normalizeTextOrNull(underlyingMatch.row?.variant_key) ===
        normalizeTextOrNull(signals.perfectOrderIdentity.variant_key)
    ) {
      return {
        topLevelState: 'ALREADY_IN_CANON',
        blockingReason: 'exact_variant_canonical_match_exists',
      };
    }
    if (plainSetRows.length >= 1 || exactSetRows.length >= 1) {
      return {
        topLevelState: 'CANON_MISSING_PLAUSIBLE',
        blockingReason: 'same_number_collision_requires_variant_identity_lane',
      };
    }
    return {
      topLevelState: 'AMBIGUOUS_IDENTITY',
      blockingReason: 'same_number_collision_missing_canonical_set_route',
    };
  }

  if (plainSetRows.length === 1 && identityBucket !== 'INSUFFICIENT_EVIDENCE') {
    return {
      topLevelState: 'CANON_MISSING_PLAUSIBLE',
      blockingReason: 'same_set_base_match_exists_but_special_identity_row_is_missing',
    };
  }

  if (underlyingMatch && identityBucket === 'INSUFFICIENT_EVIDENCE') {
    return {
      topLevelState: 'ALIAS_OR_ROUTING_GAP',
      blockingReason: 'underlying_canon_exists_but_source_route_is_missing',
    };
  }

  if (underlyingMatch && identityBucket !== 'INSUFFICIENT_EVIDENCE') {
    return {
      topLevelState: 'CANON_MISSING_PLAUSIBLE',
      blockingReason: 'unique_underlying_canon_match_supports_missing_special_identity',
    };
  }

  if (setCodeHint && setStats && setStats.cardPrintCount > 0 && identityBucket !== 'INSUFFICIENT_EVIDENCE') {
    return {
      topLevelState: 'CANON_MISSING_PLAUSIBLE',
      blockingReason: 'canonical_set_exists_but_special_identity_row_is_missing',
    };
  }

  if (globalExactRows.length > 1 || globalPlainRows.length > 1) {
    return {
      topLevelState: 'AMBIGUOUS_IDENTITY',
      blockingReason: 'multiple_possible_underlying_canonical_rows',
    };
  }

  return {
    topLevelState: 'AMBIGUOUS_IDENTITY',
    blockingReason: 'insufficient_source_or_routing_evidence',
  };
}

function classifySuggestedNextAction({
  row,
  topLevelState,
  identityBucket,
  setCodeHint,
  setStats,
  signals,
  exactSetRows,
  underlyingMatch,
}) {
  if (topLevelState === 'PRODUCT_OR_NOISE') {
    return 'REJECT_AS_PRODUCT_NOISE';
  }

  if (identityBucket === 'FINISH_ONLY_NOT_CANON') {
    return 'FUTURE_PRINTING_LAYER';
  }

  if (topLevelState === 'ALREADY_IN_CANON') {
    return 'MAPPING_REPAIR';
  }

  if (topLevelState === 'ALIAS_OR_ROUTING_GAP') {
    return 'ALIAS_REPAIR';
  }

  if (topLevelState === 'CANON_MISSING_PLAUSIBLE') {
    if (identityBucket === 'SAME_NUMBER_COLLISION') {
      return 'NEW_VARIANT_RULE_REQUIRED';
    }
    if (identityBucket === 'STAMPED_IDENTITY') {
      return underlyingMatch ? 'NEW_VARIANT_RULE_REQUIRED' : 'MANUAL_REVIEW_REQUIRED';
    }
    if (identityBucket === 'SPECIAL_RARITY_IDENTITY') {
      if (setCodeHint && setStats?.cardPrintCount > 0 && exactSetRows.length === 0) {
        return 'WAREHOUSE_INTAKE';
      }
      return 'NEW_VARIANT_RULE_REQUIRED';
    }
    if (identityBucket === 'PROMO_STYLE_IDENTITY') {
      if (setCodeHint && setStats?.cardPrintCount > 0) {
        return 'WAREHOUSE_INTAKE';
      }
      return 'MANUAL_REVIEW_REQUIRED';
    }
    return 'MANUAL_REVIEW_REQUIRED';
  }

  if (topLevelState === 'AMBIGUOUS_IDENTITY') {
    if (signals.isStamped || signals.perfectOrderIdentity?.applies) {
      return 'NEW_VARIANT_RULE_REQUIRED';
    }
    if (setCodeHint && !setStats) {
      return 'ALIAS_REPAIR';
    }
    return 'MANUAL_REVIEW_REQUIRED';
  }

  return 'MANUAL_REVIEW_REQUIRED';
}

function classifyPriority(nextAction) {
  if (nextAction === 'WAREHOUSE_INTAKE') {
    return 'PRIORITY_1_READY_FOR_WAREHOUSE_NOW';
  }
  if (nextAction === 'NEW_VARIANT_RULE_REQUIRED' || nextAction === 'MANUAL_REVIEW_REQUIRED') {
    return 'PRIORITY_2_NEEDS_RULE_OR_MANUAL_REVIEW';
  }
  if (nextAction === 'MAPPING_REPAIR' || nextAction === 'ALIAS_REPAIR') {
    return 'PRIORITY_3_MAPPING_OR_ROUTING';
  }
  if (nextAction === 'FUTURE_PRINTING_LAYER') {
    return 'PRIORITY_4_FUTURE_PRINTING_LAYER';
  }
  return 'PRIORITY_5_REJECT_OR_NOISE';
}

function incrementCount(map, key) {
  map.set(key, normalizeCount(map.get(key)) + 1);
}

function mapToSortedObject(map) {
  return Object.fromEntries(
    [...map.entries()].sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return String(left[0]).localeCompare(String(right[0]));
    }),
  );
}

function buildMarkdownReport(summary) {
  const lines = [];
  lines.push('# missing_special_cases_audit_v1');
  lines.push('');
  lines.push('## context');
  lines.push('');
  lines.push('Read-only audit of source-present, special/identity-bearing rows that are unresolved upstream and not yet deterministically attached to Grookai canon.');
  lines.push('');
  lines.push('## why this audit was run');
  lines.push('');
  lines.push('- Perfect Order proved the source-backed warehouse path can carry identity-bearing collisions safely.');
  lines.push('- The remaining backlog still mixes stamped promos, gallery/shiny subsets, promo-style aliases, finish-only surfaces, and product noise.');
  lines.push('- This pass buckets that backlog without writing canon or promotion state.');
  lines.push('');
  lines.push('## audited source lanes');
  lines.push('');
  for (const surface of summary.sourcesAudited) {
    lines.push(`- ${surface.lane}: ${surface.files.join(', ')}`);
  }
  lines.push('');
  lines.push('## backlog counts by top-level state');
  lines.push('');
  for (const [key, value] of Object.entries(summary.topLevelStateCounts)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  lines.push('## backlog counts by identity bucket');
  lines.push('');
  for (const [key, value] of Object.entries(summary.identityBucketCounts)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  lines.push('## priority buckets');
  lines.push('');
  for (const [key, value] of Object.entries(summary.priorityBucketCounts)) {
    lines.push(`- ${PRIORITY_LABELS[key] ?? key}: ${value}`);
  }
  lines.push('');
  lines.push('## highest-value missing-card classes');
  lines.push('');
  for (const row of summary.topPriorityExamples.slice(0, 10)) {
    lines.push(`- ${row.source} | ${row.source_set_id} | ${row.candidate_name} | ${row.identity_bucket} | ${row.suggested_next_action}`);
  }
  lines.push('');
  lines.push('## exact blockers');
  lines.push('');
  for (const [key, value] of Object.entries(summary.blockingReasonCounts)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  lines.push('## recommended next execution order');
  lines.push('');
  summary.recommendedNextExecutionOrder.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });
  lines.push('');
  lines.push('## representative examples');
  lines.push('');
  for (const row of summary.representativeExamples) {
    lines.push(`- ${row.source} | ${row.source_set_id} | ${row.candidate_name} | ${row.top_level_state} | ${row.identity_bucket ?? 'null'} | ${row.suggested_next_action}`);
  }
  lines.push('');
  lines.push('## verification');
  lines.push('');
  lines.push('- backlog rows are read-only and reproducible from source lanes');
  lines.push('- no canon writes occurred');
  lines.push('- no promotion executor or global mutation ran');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const client = await createClient();

  try {
    const sets = await queryRows(
      client,
      `
        select id, code, name, printed_total
        from public.sets
      `,
    );

    const cardPrints = await queryRows(
      client,
      `
        select cp.id, cp.set_id, s.code as set_code, cp.name, cp.number, cp.number_plain, cp.variant_key, cp.gv_id
        from public.card_prints cp
        join public.sets s on s.id = cp.set_id
      `,
    );

    const justtcgSetMappings = await queryRows(
      client,
      `
        select
          jsm.justtcg_set_id,
          jsm.active,
          s.code as grookai_set_code
        from public.justtcg_set_mappings jsm
        join public.sets s
          on s.id = jsm.grookai_set_id
        where jsm.active = true
      `,
    );

    const justtcgCandidates = await queryRows(
      client,
      `
        select
          'justtcg'::text as source,
          edc.id::text as source_row_id,
          edc.set_id as source_set_id,
          edc.upstream_id as source_external_id,
          edc.name_raw as candidate_name,
          edc.number_raw as printed_number,
          edc.normalized_number_plain,
          coalesce(ri.payload->>'rarity', edc.payload->>'rarity') as rarity,
          coalesce(ri.payload->>'set_name', edc.payload->>'set_name') as set_name,
          edc.candidate_bucket,
          edc.match_status,
          coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '<none>') as classification,
          coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '<none>') as classification_reason,
          coalesce(edc.resolved_set_code, edc.payload->'_grookai_ingestion_v1'->'candidate_set_mapping'->>0) as canonical_set_hint
        from public.external_discovery_candidates edc
        left join public.raw_imports ri
          on ri.id = edc.raw_import_id
        where edc.source = 'justtcg'
          and edc.match_status in ('UNMATCHED', 'AMBIGUOUS')
      `,
    );

    const pokemonapiCandidates = await queryRows(
      client,
      `
        select
          'pokemonapi'::text as source,
          ri.id::text as source_row_id,
          ri.payload->'set'->>'id' as source_set_id,
          coalesce(ri.payload->>'_external_id', ri.payload->>'id') as source_external_id,
          ri.payload->>'name' as candidate_name,
          ri.payload->>'number' as printed_number,
          regexp_replace(coalesce(ri.payload->>'number', ''), '\\D', '', 'g') as normalized_number_plain,
          ri.payload->>'rarity' as rarity,
          ri.payload->'set'->>'name' as set_name,
          null::text as candidate_bucket,
          null::text as match_status,
          null::text as classification,
          null::text as classification_reason,
          ri.payload->'set'->>'id' as canonical_set_hint
        from public.raw_imports ri
        left join public.external_mappings em
          on em.source = 'pokemonapi'
         and em.external_id = coalesce(ri.payload->>'_external_id', ri.payload->>'id')
         and coalesce(em.active, true) = true
        where ri.source = 'pokemonapi'
          and ri.payload->>'_kind' = 'card'
          and em.id is null
      `,
    );

    const tcgdexCandidates = await queryRows(
      client,
      `
        select
          'tcgdex'::text as source,
          ri.id::text as source_row_id,
          coalesce(ri.payload->'card'->'set'->>'id', ri.payload->>'_set_external_id') as source_set_id,
          coalesce(ri.payload->>'_external_id', ri.payload->'card'->>'id') as source_external_id,
          ri.payload->'card'->>'name' as candidate_name,
          coalesce(ri.payload->'card'->>'localId', ri.payload->'card'->>'number') as printed_number,
          regexp_replace(coalesce(coalesce(ri.payload->'card'->>'localId', ri.payload->'card'->>'number'), ''), '\\D', '', 'g') as normalized_number_plain,
          ri.payload->'card'->>'rarity' as rarity,
          coalesce(ri.payload->'card'->'set'->>'name', ri.payload->>'set_name') as set_name,
          null::text as candidate_bucket,
          null::text as match_status,
          null::text as classification,
          null::text as classification_reason,
          coalesce(ri.payload->'card'->'set'->>'id', ri.payload->>'_set_external_id') as canonical_set_hint
        from public.raw_imports ri
        left join public.external_mappings em
          on em.source = 'tcgdex'
         and em.external_id = coalesce(ri.payload->>'_external_id', ri.payload->'card'->>'id')
         and coalesce(em.active, true) = true
        where ri.source = 'tcgdex'
          and ri.payload->>'_kind' = 'card'
          and em.id is null
      `,
    );

    const setsByCode = new Map();
    const setStatsByCode = new Map();
    for (const row of sets) {
      setsByCode.set(row.code, row);
      setStatsByCode.set(row.code, {
        code: row.code,
        name: row.name,
        cardPrintCount: 0,
        gvCount: 0,
      });
    }

    const canonicalRows = [];
    const exactSetIndex = new Map();
    const plainSetIndex = new Map();
    const exactGlobalIndex = new Map();
    const plainGlobalIndex = new Map();

    for (const row of cardPrints) {
      const normalizedNameKey = normalizeNameKey(row.name);
      const exactNumber = normalizePrintedNumber(row.number);
      const tokenKey = normalizeNumberPlain(row.number);
      const digitsKey = normalizeDigitsKey(row.number_plain ?? row.number);

      const canonical = {
        ...row,
        normalizedNameKey,
        exactNumber,
        tokenKey,
        digitsKey,
      };
      canonicalRows.push(canonical);

      const setStats = setStatsByCode.get(row.set_code);
      if (setStats) {
        setStats.cardPrintCount += 1;
        if (normalizeTextOrNull(row.gv_id)) {
          setStats.gvCount += 1;
        }
      }

      if (row.set_code && tokenKey && normalizedNameKey) {
        const key = `${row.set_code}::${tokenKey}::${normalizedNameKey}`;
        if (!exactSetIndex.has(key)) exactSetIndex.set(key, []);
        exactSetIndex.get(key).push(canonical);
      }
      if (row.set_code && tokenKey && normalizedNameKey) {
        const key = `${row.set_code}::${tokenKey}::${normalizedNameKey}`;
        if (!plainSetIndex.has(key)) plainSetIndex.set(key, []);
        plainSetIndex.get(key).push(canonical);
      }
      if (tokenKey && normalizedNameKey) {
        const key = `${tokenKey}::${normalizedNameKey}`;
        if (!exactGlobalIndex.has(key)) exactGlobalIndex.set(key, []);
        exactGlobalIndex.get(key).push(canonical);
      }
      if (digitsKey && normalizedNameKey) {
        const key = `${digitsKey}::${normalizedNameKey}`;
        if (!plainGlobalIndex.has(key)) plainGlobalIndex.set(key, []);
        plainGlobalIndex.get(key).push(canonical);
      }
    }

    const justtcgMappingsBySetId = new Map();
    for (const row of justtcgSetMappings) {
      if (!justtcgMappingsBySetId.has(row.justtcg_set_id)) {
        justtcgMappingsBySetId.set(row.justtcg_set_id, {
          setCodes: new Set(),
        });
      }
      justtcgMappingsBySetId.get(row.justtcg_set_id).setCodes.add(row.grookai_set_code);
    }
    for (const mapping of justtcgMappingsBySetId.values()) {
      const setCodes = [...mapping.setCodes];
      mapping.uniqueSetCode = setCodes.length === 1 ? setCodes[0] : null;
      mapping.mappingState =
        setCodes.length === 0 ? 'no_active_mapping' : setCodes.length === 1 ? 'unique_active_mapping' : 'ambiguous_active_mapping';
    }

    const rawCandidates = [...justtcgCandidates, ...pokemonapiCandidates, ...tcgdexCandidates];
    const auditCandidates = [];

    for (const row of rawCandidates) {
      const specialSignals = deriveSpecialSignals(row);
      if (!specialSignals.hasAuditSignal && !(row.source === 'justtcg' && row.classification === 'NON_CANONICAL')) {
        continue;
      }

      const baseName = stripKnownModifiers(row.candidate_name);
      const baseNameKey = normalizeNameKey(baseName);
      const setCodeHint = chooseCanonicalSetHint(row, justtcgMappingsBySetId, setsByCode);
      const setStats = setCodeHint ? setStatsByCode.get(setCodeHint) ?? null : null;
      const candidateTokenKey = normalizeNumberPlain(row.printed_number);
      const candidateDigitsKey = normalizeDigitsKey(candidateTokenKey);
      let exactSetRows = setCodeHint && candidateTokenKey && baseNameKey
        ? uniqueRows(exactSetIndex.get(`${setCodeHint}::${candidateTokenKey}::${baseNameKey}`) ?? [])
        : [];
      let plainSetRows = setCodeHint && candidateTokenKey && baseNameKey
        ? uniqueRows(plainSetIndex.get(`${setCodeHint}::${candidateTokenKey}::${baseNameKey}`) ?? [])
        : [];
      let globalExactRows = candidateTokenKey && baseNameKey
        ? uniqueRows(exactGlobalIndex.get(`${candidateTokenKey}::${baseNameKey}`) ?? [])
        : [];
      let globalPlainRows = candidateDigitsKey && baseNameKey
        ? uniqueRows(plainGlobalIndex.get(`${candidateDigitsKey}::${baseNameKey}`) ?? [])
        : [];
      if (specialSignals.perfectOrderIdentity?.variant_key) {
        exactSetRows = filterRowsByVariantKey(exactSetRows, specialSignals.perfectOrderIdentity.variant_key);
        plainSetRows = filterRowsByVariantKey(plainSetRows, specialSignals.perfectOrderIdentity.variant_key);
        globalExactRows = filterRowsByVariantKey(globalExactRows, specialSignals.perfectOrderIdentity.variant_key);
        globalPlainRows = filterRowsByVariantKey(globalPlainRows, specialSignals.perfectOrderIdentity.variant_key);
      }
      const underlyingMatch = pickUnderlyingMatch(exactSetRows, plainSetRows, globalExactRows, globalPlainRows);
      const identityBucket = bucketIdentity(specialSignals);
      const { topLevelState, blockingReason } = classifyTopLevelState({
        row,
        signals: specialSignals,
        identityBucket,
        setCodeHint,
        setStats,
        exactSetRows,
        plainSetRows,
        globalExactRows,
        globalPlainRows,
        underlyingMatch,
      });
      const suggestedNextAction = classifySuggestedNextAction({
        row,
        topLevelState,
        identityBucket,
        setCodeHint,
        setStats,
        signals: specialSignals,
        exactSetRows,
        underlyingMatch,
      });
      const priorityBucket = classifyPriority(suggestedNextAction);
      const collisionGroupKey =
        identityBucket === 'SAME_NUMBER_COLLISION'
          ? specialSignals.perfectOrderIdentity?.collision_group_key ??
            buildCollisionGroupKey(setCodeHint, row, baseNameKey)
          : null;

      auditCandidates.push({
        source: row.source,
        source_set_id: row.source_set_id,
        source_external_id: row.source_external_id,
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        normalized_number_plain: candidateTokenKey,
        candidate_type: deriveCandidateType(row),
        top_level_state: topLevelState,
        identity_bucket:
          topLevelState === 'CANON_MISSING_PLAUSIBLE' || topLevelState === 'AMBIGUOUS_IDENTITY'
            ? identityBucket
            : identityBucket === 'FINISH_ONLY_NOT_CANON'
              ? identityBucket
              : null,
        suggested_next_action: suggestedNextAction,
        blocking_reason: blockingReason,
        collision_group_key: collisionGroupKey,
        evidence_summary: buildEvidenceText([
          `base_name=${baseName}`,
          setCodeHint ? `set_hint=${setCodeHint}` : null,
          setStats ? `set_card_prints=${setStats.cardPrintCount}` : null,
          specialSignals.perfectOrderIdentity?.status ? `perfect_order=${specialSignals.perfectOrderIdentity.status}` : null,
          exactSetRows.length ? `exact_set_matches=${exactSetRows.length}` : null,
          plainSetRows.length ? `plain_set_matches=${plainSetRows.length}` : null,
          globalExactRows.length ? `global_exact_matches=${globalExactRows.length}` : null,
          globalPlainRows.length ? `global_plain_matches=${globalPlainRows.length}` : null,
          row.classification_reason ? `staging_reason=${row.classification_reason}` : null,
          row.rarity ? `rarity=${row.rarity}` : null,
        ]),
        priority_bucket: priorityBucket,
      });
    }

    const topLevelStateCounts = new Map();
    const identityBucketCounts = new Map();
    const priorityBucketCounts = new Map();
    const blockingReasonCounts = new Map();

    for (const row of auditCandidates) {
      incrementCount(topLevelStateCounts, row.top_level_state);
      incrementCount(priorityBucketCounts, row.priority_bucket);
      incrementCount(blockingReasonCounts, row.blocking_reason);
      if (row.identity_bucket) {
        incrementCount(identityBucketCounts, row.identity_bucket);
      }
    }

    const representativeExamples = [];
    const seenExampleKeys = new Set();
    for (const candidate of [...auditCandidates].sort((left, right) => {
      const leftPriority = PRIORITY_LABELS[left.priority_bucket] ? Object.keys(PRIORITY_LABELS).indexOf(left.priority_bucket) : 99;
      const rightPriority = PRIORITY_LABELS[right.priority_bucket] ? Object.keys(PRIORITY_LABELS).indexOf(right.priority_bucket) : 99;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return `${left.source}:${left.source_set_id}:${left.source_external_id}`.localeCompare(
        `${right.source}:${right.source_set_id}:${right.source_external_id}`,
      );
    })) {
      const key = `${candidate.top_level_state}::${candidate.identity_bucket ?? 'null'}::${candidate.priority_bucket}`;
      if (seenExampleKeys.has(key)) continue;
      representativeExamples.push(candidate);
      seenExampleKeys.add(key);
      if (representativeExamples.length >= 18) break;
    }

    const topPriorityExamples = [...auditCandidates]
      .filter((row) => row.priority_bucket === 'PRIORITY_1_READY_FOR_WAREHOUSE_NOW')
      .slice(0, 12);

    const recommendedNextExecutionOrder = [
      'Handle Priority 3 mapping/routing cleanup first so alias-only source rows stop inflating the special backlog.',
      'Take the stamped-identity backlog next, starting with rows that already have a same-set or unique underlying canonical match.',
      'Queue Priority 1 promo-style and special-rarity rows that already resolve to an existing canonical set for warehouse intake.',
      'Work the remaining manual-review promo/special-rarity rows after routing cleanup so bounded alias fixes can collapse the queue.',
      'Defer finish-only surfaces to the future printing layer and rerun this audit after each completed bucket.',
    ];

    const summary = {
      generatedAt: new Date().toISOString(),
      filesChanged: [
        'backend/warehouse/missing_special_cases_audit_v1.mjs',
        'docs/checkpoints/warehouse/missing_special_cases_audit_v1.json',
        'docs/checkpoints/warehouse/missing_special_cases_audit_v1.md',
      ],
      sourcesAudited: SOURCE_SURFACES,
      candidateCount: auditCandidates.length,
      topLevelStateCounts: mapToSortedObject(topLevelStateCounts),
      identityBucketCounts: mapToSortedObject(identityBucketCounts),
      priorityBucketCounts: mapToSortedObject(priorityBucketCounts),
      blockingReasonCounts: mapToSortedObject(blockingReasonCounts),
      topPriorityExamples,
      representativeExamples,
      recommendedNextExecutionOrder,
      backlog: auditCandidates,
    };

    writeJson(OUTPUT_JSON_PATH, summary);
    writeText(OUTPUT_MARKDOWN_PATH, buildMarkdownReport(summary));

    console.log(
      JSON.stringify(
        {
          phase: PHASE,
          candidate_count: auditCandidates.length,
          json_output: OUTPUT_JSON_PATH,
          markdown_output: OUTPUT_MARKDOWN_PATH,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[${PHASE}]`, error);
  process.exitCode = 1;
});

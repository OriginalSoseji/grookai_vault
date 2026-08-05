import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  inspectImageBuffer,
  SELF_HOSTED_IMAGE_PREFIX,
} from './image_acquisition_readiness_v1.mjs';
import { buildWriterV2Plan } from './payload_writer_v2.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';

export const IMAGE_SOURCE_REMEDIATION_VERSION =
  'JPN-MASTER-INDEX-V4-IMAGE-SOURCE-REMEDIATION-V1';
export const EXPECTED_LOW_RESOLUTION_ROWS = 53;
export const EXPECTED_OFFICIAL_MATCH_COUNTS = Object.freeze({
  unique: 31,
  ambiguous: 8,
  none: 14,
});
export const EXPECTED_SEREBII_DETAIL_ROWS = 32;
export const EXPECTED_REMEDIATION_DISPOSITIONS = Object.freeze({
  ready_high_resolution_source: 36,
  review_ambiguous_official_image: 6,
  review_usable_below_high_resolution_threshold: 7,
  blocked_invalid_higher_resolution_source: 1,
  blocked_no_higher_resolution_exact_source: 3,
});
export const EXPECTED_CANDIDATE_QUALITY_COUNTS = Object.freeze({
  high: 71,
  invalid: 1,
  usable: 7,
});

const READINESS_ROOT =
  'docs/audits/japanese_master_index_v4/image_acquisition_readiness_v1';
const READINESS_ARTIFACT = `${READINESS_ROOT}/jpn_image_acquisition_readiness_v1.json`;
const OFFICIAL_ASSERTIONS =
  'docs/audits/japanese_master_index_v4/cards/official_jp_card_assertions_v1.json.gz';
const SEREBII_ASSERTIONS =
  'docs/audits/japanese_master_index_v4/cards/serebii_jp_card_assertions_v1.json.gz';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/image_source_remediation_v1';
const DEFAULT_CACHE_DIR =
  '.tmp/jpn_master_index_v4_image_source_remediation_v1';
const EXPECTED_READINESS_FINGERPRINT =
  '0cd2ef5619f4e90247aa5222ee5ca0d5645ddd005f5060a6bdae8c8fec5aaaa8';
const EXPECTED_OFFICIAL_FINGERPRINT =
  '0ce5133d8ea8298e721a0e477dcbd4cd433914eaad00897c67556ca6bdfbcc8e';
const EXPECTED_SEREBII_FINGERPRINT =
  '7110fdcc0657fc705b5c1591397c2a08717b5f0359748e72d8d89b22c9762371';
const MAX_IMAGE_BYTES = 8_388_608;
const MAX_PAGE_BYTES = 1_048_576;
const FETCH_TIMEOUT_MS = 45_000;
const ALLOWED_HOSTS = new Set([
  'www.pokemon-card.com',
  'www.serebii.net',
]);
const USER_AGENT = 'Grookai Japanese V4 Image Source Remediation/1.0';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeSet(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeNumber(value) {
  return String(value ?? '')
    .trim()
    .replace(/^0+(?=\d)/, '')
    .toLowerCase();
}

export function isSerebiiUrl(value) {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'serebii.net' || hostname.endsWith('.serebii.net');
  } catch {
    return false;
  }
}

function normalizePathSegment(value, fallback = 'unknown') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = clean(keyFn(row)) ?? 'none';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) =>
      left.localeCompare(right)),
  );
}

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  const options = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    cacheDir: DEFAULT_CACHE_DIR,
    concurrency: 6,
    timeoutMs: FETCH_TIMEOUT_MS,
  };
  for (const argument of argv) {
    if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else if (argument.startsWith('--cache-dir=')) {
      options.cacheDir = argument.slice('--cache-dir='.length);
    } else if (argument.startsWith('--concurrency=')) {
      options.concurrency = Number.parseInt(
        argument.slice('--concurrency='.length),
        10,
      );
    } else if (argument.startsWith('--timeout-ms=')) {
      options.timeoutMs = Number.parseInt(
        argument.slice('--timeout-ms='.length),
        10,
      );
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1
    || options.concurrency > 10) {
    throw new Error('Concurrency must be between 1 and 10.');
  }
  const cacheRoot = path.resolve('.tmp');
  const resolvedCache = path.resolve(options.cacheDir);
  if (!resolvedCache.startsWith(`${cacheRoot}${path.sep}`)) {
    throw new Error('Remediation cache must remain under .tmp.');
  }
  options.cacheDir = resolvedCache;
  return options;
}

async function mapLimit(rows, limit, worker) {
  const output = new Array(rows.length);
  let next = 0;
  async function run() {
    while (next < rows.length) {
      const index = next;
      next += 1;
      output[index] = await worker(rows[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, rows.length) }, run));
  return output;
}

async function loadDataset(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count
    || contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error(`Dataset verification failed: ${descriptor.dataset_key}`);
  }
  return rows;
}

function assertAllowedUrl(value, expectedHost = null) {
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(host)) {
    throw new Error(`Unapproved remediation URL: ${value}`);
  }
  if (expectedHost && host !== expectedHost) {
    throw new Error(`Unexpected remediation host: ${host}`);
  }
  return parsed.toString();
}

async function fetchResponse(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(assertAllowedUrl(url), {
      headers: { 'user-agent': USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function ogImageUrl(html, pageUrl) {
  const meta = html.match(
    /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  ) ?? html.match(
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i,
  );
  if (!meta?.[1]) return null;
  return new URL(meta[1], pageUrl).toString();
}

export function classifyOfficialMatches(matches) {
  if (matches.length === 0) return 'none';
  if (matches.length === 1) return 'unique';
  return 'ambiguous';
}

export function chooseRemediation({ officialMatchCount, officialCandidates, serebiiCandidate }) {
  const exactOfficial = officialMatchCount === 1
    ? officialCandidates.find((row) => row.valid_image && row.quality_band === 'high')
    : null;
  const exactSerebii = serebiiCandidate?.valid_image
    && serebiiCandidate.quality_band === 'high'
    ? serebiiCandidate
    : null;
  if (exactOfficial) {
    return {
      disposition: 'ready_high_resolution_source',
      selected_candidate_id: exactOfficial.candidate_id,
      selected_authority: exactOfficial.authority,
    };
  }
  if (exactSerebii) {
    return {
      disposition: 'ready_high_resolution_source',
      selected_candidate_id: exactSerebii.candidate_id,
      selected_authority: exactSerebii.authority,
    };
  }
  if (officialMatchCount > 1) {
    return {
      disposition: 'review_ambiguous_official_image',
      selected_candidate_id: null,
      selected_authority: null,
    };
  }
  if (serebiiCandidate?.valid_image) {
    return {
      disposition: 'review_usable_below_high_resolution_threshold',
      selected_candidate_id: null,
      selected_authority: null,
    };
  }
  if (serebiiCandidate) {
    return {
      disposition: 'blocked_invalid_higher_resolution_source',
      selected_candidate_id: null,
      selected_authority: null,
    };
  }
  return {
    disposition: 'blocked_no_higher_resolution_exact_source',
    selected_candidate_id: null,
    selected_authority: null,
  };
}

async function fetchSerebiiFullImage(assertion, timeoutMs) {
  const pageUrl = assertAllowedUrl(assertion.source_url, 'www.serebii.net');
  const response = await fetchResponse(pageUrl, timeoutMs);
  const declared = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
  if (declared > MAX_PAGE_BYTES) throw new Error('Serebii page exceeded size ceiling.');
  const html = await response.text();
  if (Buffer.byteLength(html) > MAX_PAGE_BYTES) {
    throw new Error('Serebii page exceeded size ceiling.');
  }
  const imageUrl = ogImageUrl(html, pageUrl);
  if (!imageUrl) throw new Error(`Serebii og:image missing: ${pageUrl}`);
  const parsed = new URL(assertAllowedUrl(imageUrl, 'www.serebii.net'));
  if (parsed.pathname.includes('/card/th/')) {
    throw new Error(`Serebii detail page returned a thumbnail: ${imageUrl}`);
  }
  return {
    page_url: pageUrl,
    page_http_status: response.status,
    page_content_sha256: sha256(html),
    image_url: parsed.toString(),
  };
}

async function fetchImage(candidate, options) {
  try {
    const response = await fetchResponse(candidate.source_image_url, options.timeoutMs);
    const declared = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
    if (declared > MAX_IMAGE_BYTES) throw new Error('Image exceeded size ceiling.');
    const buffer = Buffer.from(await response.arrayBuffer());
    const observed = inspectImageBuffer(buffer, response.headers.get('content-type'));
    const extension = observed.format;
    let localCachePath = null;
    let localCacheSha256 = null;
    if (observed.valid_image && extension) {
      localCachePath = path.join(
        options.cacheDir,
        normalizePathSegment(candidate.gv_id),
        `${candidate.candidate_id}.${extension}`,
      );
      await fs.mkdir(path.dirname(localCachePath), { recursive: true });
      await fs.writeFile(localCachePath, buffer);
      localCacheSha256 = sha256(await fs.readFile(localCachePath));
      if (localCacheSha256 !== observed.sha256) {
        throw new Error(`Local cache hash mismatch: ${candidate.candidate_id}`);
      }
    }
    return {
      ...candidate,
      http_status: response.status,
      ...observed,
      local_cache_path: localCachePath
        ? path.relative(process.cwd(), localCachePath).replaceAll('\\', '/')
        : null,
      local_cache_sha256: localCacheSha256,
      fetch_error: null,
    };
  } catch (error) {
    return {
      ...candidate,
      http_status: null,
      valid_image: false,
      quality_band: 'invalid',
      fetch_error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function buildScope() {
  const { artifact: readiness } = await readVerifiedArtifact(READINESS_ARTIFACT);
  if (readiness.content_fingerprint_sha256 !== EXPECTED_READINESS_FINGERPRINT) {
    throw new Error('Image-readiness artifact changed.');
  }
  const [canaryRows, manifestRows] = await Promise.all([
    loadDataset(readiness.content.canary_dataset),
    loadDataset(readiness.content.manifest_dataset),
  ]);
  const lowRows = canaryRows.filter((row) => row.status === 'review_low_resolution');
  if (lowRows.length !== EXPECTED_LOW_RESOLUTION_ROWS) {
    throw new Error('Low-resolution scope changed.');
  }

  const [{ artifact: official }, { artifact: serebii }, writer] = await Promise.all([
    readVerifiedArtifact(OFFICIAL_ASSERTIONS),
    readVerifiedArtifact(SEREBII_ASSERTIONS),
    buildWriterV2Plan(),
  ]);
  if (official.content_fingerprint_sha256 !== EXPECTED_OFFICIAL_FINGERPRINT
    || serebii.content_fingerprint_sha256 !== EXPECTED_SEREBII_FINGERPRINT) {
    throw new Error('Preserved source assertion artifacts changed.');
  }
  const manifestById = new Map(manifestRows.map((row) => [row.card_print_id, row]));
  const cardById = new Map(
    writer.payload.rows.card_print_rows.map((row) => [row.id, row]),
  );
  const identityByCard = new Map(
    writer.payload.rows.identity_rows.map((row) => [row.card_print_id, row]),
  );
  const officialRows = official.content.assertions;
  const serebiiByKey = new Map(
    serebii.content.assertions.map((row) => [row.assertion_key, row]),
  );

  const scope = lowRows.map((low) => {
    const manifest = manifestById.get(low.card_print_id);
    const card = cardById.get(low.card_print_id);
    const identity = identityByCard.get(low.card_print_id);
    if (!manifest || !card || !identity) {
      throw new Error(`Remediation authority missing: ${low.gv_id}`);
    }
    const setAbbrev = card.printed_set_abbrev
      ?? card.set_code.replace(/^jpn-/i, '');
    const officialMatches = officialRows.filter((row) =>
      normalizeSet(row.source_set_code) === normalizeSet(setAbbrev)
      && normalizeNumber(row.card_number_raw) === normalizeNumber(card.number)
      && row.printed_name === identity.source_name_raw);
    const fallbackUrl = manifest.fallback_source?.url ?? null;
    const serebiiMatches = (card.external_ids?.japanese_master_index_v4
      ?.source_assertion_keys ?? [])
      .map((key) => serebiiByKey.get(key))
      .filter(Boolean)
      .filter((row) => fallbackUrl && row.image_urls?.includes(fallbackUrl));
    if (isSerebiiUrl(fallbackUrl) && serebiiMatches.length !== 1) {
      throw new Error(`Serebii assertion mismatch: ${low.gv_id}`);
    }
    return {
      card_print_id: low.card_print_id,
      gv_id: low.gv_id,
      name: low.name,
      set_code: low.set_code,
      printed_set_abbrev: setAbbrev,
      number: low.number,
      printed_name_ja: identity.source_name_raw,
      current_low_resolution_source: low.selected_source,
      official_matches: officialMatches,
      serebii_assertion: serebiiMatches[0] ?? null,
    };
  });

  const officialCounts = countBy(scope, (row) =>
    classifyOfficialMatches(row.official_matches));
  if (stableJson(officialCounts) !== stableJson(EXPECTED_OFFICIAL_MATCH_COUNTS)) {
    throw new Error(`Official match distribution changed: ${stableJson(officialCounts)}`);
  }
  if (scope.filter((row) => row.serebii_assertion).length
    !== EXPECTED_SEREBII_DETAIL_ROWS) {
    throw new Error('Serebii detail-page scope changed.');
  }
  return { scope, readiness, official, serebii };
}

function officialCandidate(scopeRow, assertion, matchCount) {
  const imageUrl = assertion.image_urls?.[0];
  if (!imageUrl) throw new Error(`Official image missing: ${assertion.assertion_key}`);
  return {
    candidate_id: sha256(`${scopeRow.gv_id}|official|${assertion.assertion_key}`)
      .slice(0, 24),
    gv_id: scopeRow.gv_id,
    authority: matchCount === 1
      ? 'official_exact_set_number_printed_name_unique'
      : 'official_exact_set_number_printed_name_ambiguous',
    source_id: assertion.source_id,
    source_assertion_key: assertion.assertion_key,
    source_page_url: assertion.source_url,
    source_image_url: assertAllowedUrl(imageUrl, 'www.pokemon-card.com'),
    official_match_count: matchCount,
    requires_human_selection: matchCount > 1,
  };
}

async function prepareCandidates(scope, options) {
  const serebiiPageResults = await mapLimit(
    scope.filter((row) => row.serebii_assertion),
    options.concurrency,
    async (row) => {
      try {
        const page = await fetchSerebiiFullImage(row.serebii_assertion, options.timeoutMs);
        return { gv_id: row.gv_id, ...page, error: null };
      } catch (error) {
        return {
          gv_id: row.gv_id,
          page_url: row.serebii_assertion.source_url,
          image_url: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
  const pageByGv = new Map(serebiiPageResults.map((row) => [row.gv_id, row]));
  const candidates = [];
  for (const row of scope) {
    for (const assertion of row.official_matches) {
      candidates.push(officialCandidate(row, assertion, row.official_matches.length));
    }
    const page = pageByGv.get(row.gv_id);
    if (row.serebii_assertion && page?.image_url) {
      candidates.push({
        candidate_id: sha256(
          `${row.gv_id}|serebii|${row.serebii_assertion.assertion_key}`,
        ).slice(0, 24),
        gv_id: row.gv_id,
        authority: 'preserved_serebii_exact_row_detail_page',
        source_id: row.serebii_assertion.source_id,
        source_assertion_key: row.serebii_assertion.assertion_key,
        source_page_url: page.page_url,
        source_page_http_status: page.page_http_status,
        source_page_content_sha256: page.page_content_sha256,
        source_image_url: page.image_url,
        official_match_count: row.official_matches.length,
        requires_human_selection: false,
      });
    }
  }
  const observed = await mapLimit(
    candidates,
    options.concurrency,
    (candidate) => fetchImage(candidate, options),
  );
  return { observed, serebiiPageResults };
}

function targetPath(row, candidate) {
  return `${SELF_HOSTED_IMAGE_PREFIX}/`
    + `${normalizePathSegment(row.set_code)}/`
    + `${normalizePathSegment(row.gv_id)}/`
    + `${candidate.sha256.slice(0, 24)}.${candidate.format}`;
}

function buildRemediationRows(scope, candidates, pageResults) {
  const candidatesByGv = new Map();
  for (const candidate of candidates) {
    if (!candidatesByGv.has(candidate.gv_id)) candidatesByGv.set(candidate.gv_id, []);
    candidatesByGv.get(candidate.gv_id).push(candidate);
  }
  const pageByGv = new Map(pageResults.map((row) => [row.gv_id, row]));
  return scope.map((row, index) => {
    const rowCandidates = (candidatesByGv.get(row.gv_id) ?? [])
      .sort((left, right) => left.candidate_id.localeCompare(right.candidate_id));
    const officialCandidates = rowCandidates.filter((candidate) =>
      candidate.source_id === 'official_jp_cards');
    const serebiiCandidate = rowCandidates.find((candidate) =>
      candidate.source_id === 'serebii_jp_cards') ?? null;
    const decision = chooseRemediation({
      officialMatchCount: row.official_matches.length,
      officialCandidates,
      serebiiCandidate,
    });
    const selected = rowCandidates.find((candidate) =>
      candidate.candidate_id === decision.selected_candidate_id) ?? null;
    return {
      position: index + 1,
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      printed_set_abbrev: row.printed_set_abbrev,
      number: row.number,
      printed_name_ja: row.printed_name_ja,
      current_low_resolution_source: row.current_low_resolution_source,
      official_match_state: classifyOfficialMatches(row.official_matches),
      official_match_count: row.official_matches.length,
      serebii_detail_evidence_present: Boolean(row.serebii_assertion),
      serebii_page_observation: pageByGv.get(row.gv_id) ?? null,
      candidate_sources: rowCandidates,
      disposition: decision.disposition,
      selected_candidate: selected,
      proposed_target_storage_path: selected ? targetPath(row, selected) : null,
      source_identity_basis: selected?.authority ?? null,
      human_visual_identity_confirmation: 'not_performed',
      database_write_performed: false,
      storage_access_performed: false,
      storage_write_performed: false,
    };
  });
}

function summarize(rows, candidates, pageResults) {
  const ready = rows.filter((row) =>
    row.disposition === 'ready_high_resolution_source');
  return {
    scope_rows: rows.length,
    disposition_counts: countBy(rows, (row) => row.disposition),
    selected_authority_counts: countBy(ready, (row) =>
      row.selected_candidate?.authority),
    official_match_counts: countBy(rows, (row) => row.official_match_state),
    serebii_detail_rows: rows.filter((row) =>
      row.serebii_detail_evidence_present).length,
    serebii_page_fetch_failures: pageResults.filter((row) => row.error).length,
    candidate_image_rows: candidates.length,
    candidate_quality_counts: countBy(candidates, (row) =>
      row.valid_image ? row.quality_band : 'invalid'),
    valid_high_resolution_candidates: candidates.filter((row) =>
      row.valid_image && row.quality_band === 'high').length,
    invalid_candidate_rows: candidates.filter((row) => !row.valid_image).length,
    candidate_fetch_exceptions: candidates.filter((row) => row.fetch_error).length,
    ready_rows: ready.length,
    review_rows: rows.filter((row) =>
      row.disposition.startsWith('review_')).length,
    blocked_rows: rows.filter((row) =>
      row.disposition.startsWith('blocked_')).length,
    database_reads: 0,
    database_writes: 0,
    storage_reads: 0,
    storage_writes: 0,
  };
}

function markdown(report) {
  const summary = report.summary;
  return `# Japanese Master Index V4 Image Source Remediation V1

Generated: ${report.generated_at}

## Result

- Low-resolution rows reviewed: ${summary.scope_rows}
- Ready high-resolution sources: ${summary.ready_rows}
- Review rows: ${summary.review_rows}
- Blocked rows: ${summary.blocked_rows}
- Candidate images fetched: ${summary.candidate_image_rows}
- Valid high-resolution candidates: ${summary.valid_high_resolution_candidates}
- Serebii detail pages used: ${summary.serebii_detail_rows}
- Database reads/writes: 0 / 0
- Storage reads/writes: 0 / 0

## Decision

Only unique exact official matches or full images discovered from an already
preserved exact Serebii detail-page assertion can become remediation-ready.
Multiple official images for one set/number/printed-name identity remain in
review unless an independent exact source selects one. Missing source evidence
remains blocked. No image was selected by English name alone.

These rows are acquisition candidates only. They do not authorize Storage
uploads, database image pointers, public visibility, child printings, or
human visual-identity confirmation.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const { scope, readiness, official, serebii } = await buildScope();
  const { observed, serebiiPageResults } = await prepareCandidates(scope, options);
  const rows = buildRemediationRows(scope, observed, serebiiPageResults);
  const summary = summarize(rows, observed, serebiiPageResults);
  const expectedDispositions = EXPECTED_REMEDIATION_DISPOSITIONS;
  const dispositionClean = stableJson(summary.disposition_counts)
    === stableJson(expectedDispositions);
  const candidateClean = summary.candidate_image_rows === 79
    && stableJson(summary.candidate_quality_counts)
      === stableJson(EXPECTED_CANDIDATE_QUALITY_COUNTS)
    && summary.candidate_fetch_exceptions === 0
    && summary.serebii_page_fetch_failures === 0;
  const status = dispositionClean && candidateClean
    ? 'source_remediation_complete'
    : 'source_remediation_requires_follow_up';
  const retrieval = {
    access_mode: 'verified_local_evidence_plus_bounded_https_source_remediation',
    database_reads: false,
    database_writes: false,
    storage_access: false,
    storage_writes: false,
    source_fetches: true,
    local_cache_writes: true,
  };
  const rowDataset = await writeShardedRows({
    outputRoot: options.outputRoot,
    datasetKey: 'jpn_image_source_remediation_rows_v1',
    packageId: `${IMAGE_SOURCE_REMEDIATION_VERSION}-ROWS`,
    rows,
    generatedAt,
    retrieval,
  });
  const report = {
    remediation_version: IMAGE_SOURCE_REMEDIATION_VERSION,
    generated_at: generatedAt,
    status,
    source: {
      readiness_fingerprint_sha256: readiness.content_fingerprint_sha256,
      official_assertions_fingerprint_sha256:
        official.content_fingerprint_sha256,
      serebii_assertions_fingerprint_sha256:
        serebii.content_fingerprint_sha256,
    },
    summary,
    row_dataset: rowDataset,
    local_cache: {
      root: path.relative(process.cwd(), options.cacheDir).replaceAll('\\', '/'),
      committed: false,
      purpose: 'source_validation_only',
    },
    execution_boundary: {
      database_reads: false,
      database_writes: false,
      storage_reads: false,
      storage_writes: false,
      image_pointer_writes: false,
      child_printing_writes: false,
      family_promotion: false,
      scanner_writes: false,
    },
  };
  await writeJsonArtifact(
    path.join(options.outputRoot, 'jpn_image_source_remediation_v1.json'),
    buildArtifact({
      packageId: IMAGE_SOURCE_REMEDIATION_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_image_source_remediation_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status,
    summary,
    output_root: options.outputRoot,
  }));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

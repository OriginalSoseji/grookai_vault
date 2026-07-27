import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  loadVerifiedDatasetFromManifest,
} from '../japanese_master_index_v4/artifact_rows_v1.mjs';
import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-DUPLICATE-ADJUDICATION-V1';
const GENERATED_AT = '2026-07-27T05:45:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_duplicate_adjudication';
const IDENTITY_DELTA =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_identity_resolution/'
  + 'jpn_v5_official_product_identity_delta_v1.jsonl';
const CANDIDATE_MANIFEST =
  'docs/audits/japanese_master_index_v4/index/'
  + 'candidate_union_manifest_v1.json';

function parseArgs(argv) {
  const result = { outputRoot: DEFAULT_OUTPUT_ROOT, quiet: false };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
    } else if (value === '--quiet') {
      result.quiet = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return result;
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizedName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('ja');
}

function normalizedNumber(value) {
  const result = String(value ?? '').trim().replace(/^0+(?=\d)/, '');
  return result || null;
}

function imageBasename(value) {
  return decodeURIComponent(
    new URL(value).pathname.split('/').at(-1),
  ).toLowerCase();
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stableJson(value));
}

async function writeJsonl(filePath, rows) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(
    filePath,
    rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
  );
}

async function fileProof(filePath) {
  const value = await fsp.readFile(filePath);
  return {
    bytes: value.byteLength,
    row_count: filePath.endsWith('.jsonl')
      ? value.toString('utf8').split('\n').filter(Boolean).length
      : null,
    sha256: crypto.createHash('sha256').update(value).digest('hex'),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }
  const identityRows = readJsonl(IDENTITY_DELTA);
  const reviewRows = identityRows.filter((row) =>
    row.resolution_disposition
      === 'duplicate_candidate_cluster_exact_image_review');
  const { rows: candidates } = await loadVerifiedDatasetFromManifest({
    manifestPath: CANDIDATE_MANIFEST,
    datasetKey: 'identity_candidate_rows_v1',
  });
  const candidateByKey = new Map(
    candidates.map((row) => [row.candidate_key, row]),
  );

  const adjudications = reviewRows.map((identity) => {
    const officialImageKey = imageBasename(identity.image_url);
    const cluster = identity.matched_v4_candidate_keys.map((key) => {
      const candidate = candidateByKey.get(key);
      if (!candidate) throw new Error(`Candidate missing: ${key}`);
      const imageKeys = new Set(
        (candidate.image_urls ?? []).map(imageBasename),
      );
      return {
        candidate_key: key,
        registry_keys: candidate.registry_keys ?? [],
        printed_name_candidates:
          candidate.printed_name_ja_candidates ?? [],
        printed_number: candidate.number_core ?? null,
        exact_official_image_present: imageKeys.has(officialImageKey),
      };
    });
    const conflictingNames = cluster
      .flatMap((row) => row.printed_name_candidates)
      .filter(Boolean)
      .filter((value) =>
        normalizedName(value) !== normalizedName(identity.printed_name_ja));
    const conflictingNumbers = cluster
      .map((row) => row.printed_number)
      .filter(Boolean)
      .filter((value) =>
        normalizedNumber(value)
          !== normalizedNumber(identity.printed_number));
    const blockers = [
      cluster.some((row) => !row.exact_official_image_present)
        ? 'candidate_without_exact_official_image'
        : null,
      conflictingNames.length > 0
        ? 'conflicting_known_japanese_name'
        : null,
      conflictingNumbers.length > 0
        ? 'conflicting_known_printed_number'
        : null,
    ].filter(Boolean);
    return {
      official_card_id: identity.official_card_id,
      canonical_identity_key:
        `official_jp_card:${identity.official_card_id}`,
      canonical_registry_key: identity.canonical_registry_key,
      printed_name_ja: identity.printed_name_ja,
      printed_number: identity.printed_number,
      governed_unnumbered_key: identity.governed_unnumbered_key,
      official_image_url: identity.image_url,
      superseded_candidate_keys:
        identity.matched_v4_candidate_keys,
      candidate_cluster: cluster,
      conflicting_name_values: [...new Set(conflictingNames)].sort(),
      conflicting_number_values:
        [...new Set(conflictingNumbers)].sort(),
      safe_to_merge: blockers.length === 0,
      blockers,
      merge_reason:
        'same official card ID and exact image, with no known name or '
        + 'number conflict',
    };
  }).sort((left, right) =>
    Number(left.official_card_id) - Number(right.official_card_id));

  const safe = adjudications.filter((row) => row.safe_to_merge);
  const directResolutionCount =
    identityRows.length - adjudications.length;
  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: safe.length === adjudications.length
      ? 'duplicate_candidate_clusters_adjudicated'
      : 'duplicate_candidate_clusters_still_blocked',
    reviewed_cluster_count: adjudications.length,
    safe_merge_cluster_count: safe.length,
    blocked_cluster_count: adjudications.length - safe.length,
    superseded_candidate_row_count:
      safe.reduce(
        (sum, row) => sum + row.superseded_candidate_keys.length,
        0,
    ),
    official_product_lane: {
      exact_identity_count: identityRows.length,
      direct_resolution_count: directResolutionCount,
      duplicate_cluster_resolution_count: safe.length,
      integration_ready_identity_count:
        directResolutionCount + safe.length,
    },
    boundary: {
      source_fetches: false,
      database_access: false,
      storage_access: false,
      production_writes: false,
      source_evidence_replaced: false,
      blocked_clusters_auto_merged: 0,
    },
    next_gate: safe.length === adjudications.length
      ? `build_v5_working_index_overlay_for_${identityRows.length}_resolved_identities`
      : 'manual_review_blocked_duplicate_clusters',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const paths = {
    adjudications: path.join(
      outputRoot,
      'jpn_v5_official_product_duplicate_adjudications_v1.jsonl',
    ),
    report: path.join(
      outputRoot,
      'jpn_v5_official_product_duplicate_adjudication_report_v1.json',
    ),
    attestation: path.join(
      outputRoot,
      'jpn_v5_official_product_duplicate_adjudication_no_write_v1.json',
    ),
  };
  await writeJsonl(paths.adjudications, adjudications);
  await writeJson(paths.report, report);
  await writeJson(paths.attestation, {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    ...report.boundary,
  });
  const proofs = {};
  for (const [key, filePath] of Object.entries(paths)) {
    proofs[key] = await fileProof(filePath);
  }
  await writeJson(
    path.join(
      outputRoot,
      'jpn_v5_official_product_duplicate_adjudication_fingerprints_v1.json',
    ),
    {
      generator_version: GENERATOR_VERSION,
      generated_at: GENERATED_AT,
      files: proofs,
      aggregate_sha256: contentFingerprint(proofs),
    },
  );
  if (!args.quiet) console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

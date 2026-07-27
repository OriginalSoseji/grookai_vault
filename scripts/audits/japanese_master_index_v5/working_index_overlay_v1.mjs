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
  'JPN-MASTER-INDEX-V5-WORKING-INDEX-OVERLAY-V1';
const GENERATED_AT = '2026-07-27T06:00:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/working_index_overlay';
const IDENTITY_DELTA =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_identity_resolution/'
  + 'jpn_v5_official_product_identity_delta_v1.jsonl';
const DUPLICATE_ADJUDICATIONS =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_duplicate_adjudication/'
  + 'jpn_v5_official_product_duplicate_adjudications_v1.jsonl';
const CANDIDATE_MANIFEST =
  'docs/audits/japanese_master_index_v4/index/'
  + 'candidate_union_manifest_v1.json';
const FINAL_MANIFEST =
  'docs/audits/japanese_master_index_v4/final/'
  + 'jpn_master_build_manifest_v1.json';

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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(keyFn(row));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function roundedPercent(numerator, denominator) {
  return Number(((numerator / denominator) * 100).toFixed(2));
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
  const identities = readJsonl(IDENTITY_DELTA);
  const duplicateAdjudications = readJsonl(DUPLICATE_ADJUDICATIONS);
  const duplicateByCardId = new Map(
    duplicateAdjudications.map((row) => [row.official_card_id, row]),
  );
  const { rows: candidates } = await loadVerifiedDatasetFromManifest({
    manifestPath: CANDIDATE_MANIFEST,
    datasetKey: 'identity_candidate_rows_v1',
  });
  const { rows: masterRows } = await loadVerifiedDatasetFromManifest({
    manifestPath: FINAL_MANIFEST,
    datasetKey: 'master_card_resolution_rows_v1',
  });
  const candidateByKey = new Map(
    candidates.map((row) => [row.candidate_key, row]),
  );
  const masterByKey = new Map(
    masterRows.map((row) => [row.jpn_card_identity_key, row]),
  );

  const overlayRows = identities.map((identity) => {
    const matchedCandidates = identity.matched_v4_candidate_keys.map((key) => {
      const candidate = candidateByKey.get(key);
      if (!candidate) throw new Error(`Missing V4 candidate: ${key}`);
      return candidate;
    });
    const matchedMaster = identity.matched_v4_candidate_keys
      .map((key) => masterByKey.get(key))
      .filter(Boolean);
    const duplicate = duplicateByCardId.get(identity.official_card_id);
    if (identity.matched_v4_candidate_count > 1 && !duplicate?.safe_to_merge) {
      throw new Error(
        `Duplicate cluster not adjudicated: ${identity.official_card_id}`,
      );
    }
    const action = matchedCandidates.length === 0
      ? 'add_new_official_identity'
      : matchedCandidates.length === 1
        ? 'upgrade_existing_candidate_with_official_identity'
        : 'collapse_duplicate_candidates_to_official_identity';
    const canonicalIdentityKey = matchedCandidates.length === 1
      ? matchedCandidates[0].candidate_key
      : `jpn-v5-official-card:${identity.official_card_id}`;
    const englishNames = unique([
      ...matchedCandidates.flatMap(
        (row) => row.english_name_candidates ?? [],
      ),
      ...matchedMaster.map((row) => row.collector_facing_name_en),
    ]);
    const cardDomains = unique([
      ...matchedCandidates.map((row) => row.card_domain),
      ...matchedMaster.map((row) => row.card_domain),
    ]);
    const familyStatuses = unique(
      matchedMaster.map((row) => row.family_status),
    );
    const cardDomain = cardDomains.length === 1
      ? cardDomains[0]
      : identity.category
        ? 'pokemon'
        : null;
    const familyReady = cardDomain !== 'pokemon'
      || familyStatuses.includes('linked')
      || familyStatuses.includes('not_applicable');
    const promotionBlockers = [
      englishNames.length === 0
        ? 'collector_facing_english_name_missing'
        : null,
      !familyReady ? 'family_relationship_unresolved' : null,
    ].filter(Boolean);
    return {
      v5_identity_key: canonicalIdentityKey,
      official_card_id: identity.official_card_id,
      canonical_registry_key: identity.canonical_registry_key,
      source_product_registry_keys:
        identity.source_product_registry_keys,
      identity_action: action,
      superseded_v4_candidate_keys:
        matchedCandidates.length > 1
          ? matchedCandidates.map((row) => row.candidate_key)
          : [],
      upgraded_v4_candidate_key:
        matchedCandidates.length === 1
          ? matchedCandidates[0].candidate_key
          : null,
      printed_name_ja: identity.printed_name_ja,
      printed_number: identity.printed_number,
      printed_number_denominator:
        identity.printed_number_denominator,
      governed_unnumbered_key:
        identity.governed_unnumbered_key,
      collector_facing_name_en: englishNames[0] ?? null,
      image_url: identity.image_url,
      card_domain: cardDomain,
      base_identity_coverage_status: 'resolved',
      official_source_present: true,
      exact_image_or_card_id_present: true,
      promotion_status: promotionBlockers.length === 0
        ? 'promotion_evidence_ready'
        : 'base_identity_ready_promotion_blocked',
      promotion_blockers: promotionBlockers,
    };
  }).sort((left, right) =>
    left.v5_identity_key.localeCompare(right.v5_identity_key));
  if (new Set(overlayRows.map((row) => row.v5_identity_key)).size
      !== overlayRows.length) {
    throw new Error('V5 overlay identity keys are not unique');
  }

  const supersessions = overlayRows
    .flatMap((row) => row.superseded_v4_candidate_keys.map((key) => ({
      superseded_v4_candidate_key: key,
      canonical_v5_identity_key: row.v5_identity_key,
      official_card_id: row.official_card_id,
      reason: 'same_official_card_id_and_exact_image',
    })))
    .sort((left, right) =>
      left.superseded_v4_candidate_key.localeCompare(
        right.superseded_v4_candidate_key,
      ));
  const addedCount = overlayRows.filter((row) =>
    row.identity_action === 'add_new_official_identity').length;
  const collapsedSourceCount = supersessions.length;
  const collapsedIdentityCount = overlayRows.filter((row) =>
    row.identity_action
      === 'collapse_duplicate_candidates_to_official_identity').length;
  const v4WorkingCount = 71_992;
  const projectedWorkingCount =
    v4WorkingCount
    + addedCount
    - (collapsedSourceCount - collapsedIdentityCount);
  const covered = 7_933 + overlayRows.length;
  const expected = 21_666 + overlayRows.length;
  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'v5_working_base_identity_overlay_built',
    overlay_identity_count: overlayRows.length,
    identity_action_counts: countBy(
      overlayRows,
      (row) => row.identity_action,
    ),
    superseded_v4_candidate_count: supersessions.length,
    v4_working_identity_count: v4WorkingCount,
    projected_v5_working_identity_count: projectedWorkingCount,
    base_identity_coverage: {
      covered_slots: covered,
      expected_slots: expected,
      percent: roundedPercent(covered, expected),
    },
    promotion_readiness: {
      promotion_evidence_ready:
        overlayRows.filter((row) =>
          row.promotion_status === 'promotion_evidence_ready').length,
      base_identity_ready_promotion_blocked:
        overlayRows.filter((row) =>
          row.promotion_status
            === 'base_identity_ready_promotion_blocked').length,
      blocker_counts: countBy(
        overlayRows.flatMap((row) =>
          row.promotion_blockers.map((blocker) => ({ blocker }))),
        (row) => row.blocker,
      ),
    },
    boundary: {
      source_fetches: false,
      database_access: false,
      storage_access: false,
      production_writes: false,
      v4_artifacts_mutated: false,
      promotion_executed: false,
    },
    next_gate:
      'recompute_release_census_and_continue_next_zero_inventory_batch',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const paths = {
    overlay: path.join(
      outputRoot,
      'jpn_v5_working_base_identity_overlay_v1.jsonl',
    ),
    supersessions: path.join(
      outputRoot,
      'jpn_v5_candidate_supersessions_v1.jsonl',
    ),
    report: path.join(
      outputRoot,
      'jpn_v5_working_index_overlay_report_v1.json',
    ),
    attestation: path.join(
      outputRoot,
      'jpn_v5_working_index_overlay_no_write_v1.json',
    ),
  };
  await writeJsonl(paths.overlay, overlayRows);
  await writeJsonl(paths.supersessions, supersessions);
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
      'jpn_v5_working_index_overlay_fingerprints_v1.json',
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

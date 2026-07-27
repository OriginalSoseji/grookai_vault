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
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-IDENTITY-RESOLUTION-V1';
const GENERATED_AT = '2026-07-27T05:30:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_identity_resolution';
const LINK_ASSERTIONS =
  'docs/audits/japanese_master_index_v5/official_product_links/parsed/'
  + 'jpn_v5_official_product_link_card_assertions_v1.jsonl';
const DETAIL_PAGE_ASSERTIONS =
  'docs/audits/japanese_master_index_v5/official_product_detail_pages/parsed/'
  + 'jpn_v5_official_product_detail_card_assertions_v1.jsonl';
const DETAILS =
  'docs/audits/japanese_master_index_v5/official_product_details/'
  + 'jpn_v5_official_product_card_details_v1.jsonl';
const SEARCH_ASSERTIONS =
  'docs/audits/japanese_master_index_v5/official_product_search/'
  + 'official_jp_card_assertions_v1.json';
const DETAIL_SEARCH_ASSERTIONS =
  'docs/audits/japanese_master_index_v5/official_product_detail_search/'
  + 'official_jp_card_assertions_v1.json';
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

function readVerifiedArtifact(filePath) {
  const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
}

function imageBasename(value) {
  const pathname = new URL(value).pathname;
  return decodeURIComponent(pathname.split('/').at(-1)).toLowerCase();
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

function mostFrequent(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .sort(([leftKey, leftCount], [rightKey, rightCount]) =>
      rightCount - leftCount || leftKey.localeCompare(rightKey))
    .at(0)?.[0] ?? null;
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
  const assertions = [
    ...readJsonl(LINK_ASSERTIONS),
    ...readJsonl(DETAIL_PAGE_ASSERTIONS),
  ];
  const details = readJsonl(DETAILS);
  const searchAssertionSources = [
    {
      evidenceOrigin: 'v5_official_product_search',
      rows: readVerifiedArtifact(SEARCH_ASSERTIONS).content.assertions,
    },
    {
      evidenceOrigin: 'v5_official_product_detail_search',
      rows: readVerifiedArtifact(DETAIL_SEARCH_ASSERTIONS).content.assertions,
    },
  ];
  const searchAssertions = searchAssertionSources.flatMap(
    (source) => source.rows.map((row) => ({
      ...row,
      evidence_origin: source.evidenceOrigin,
    })),
  );
  for (const row of searchAssertions) {
    assertions.push({
      registry_key: row.registry_key,
      source_external_id: row.source_external_id,
      source_set_code: row.source_set_code,
      image_urls: row.image_urls,
      source_fields: row.source_fields,
    });
  }
  const detailByCardId = new Map(
    details.map((row) => [row.card_id, row]),
  );
  for (const row of searchAssertions) {
    const prior = detailByCardId.get(row.source_external_id);
    const imageUrl = row.image_urls?.[0] ?? null;
    if (prior) {
      const priorImage = prior.detail.image_url;
      if (prior.detail.printed_name !== row.printed_name
          || imageBasename(priorImage) !== imageBasename(imageUrl)) {
        throw new Error(
          `Conflicting official detail for card ${row.source_external_id}`,
        );
      }
      continue;
    }
    detailByCardId.set(row.source_external_id, {
      card_id: row.source_external_id,
      evidence_origin: row.evidence_origin,
      detail: {
        printed_name: row.printed_name,
        image_url: imageUrl,
        card_number_raw: row.card_number_raw,
        card_number_numerator: row.card_number_numerator,
        card_number_denominator: row.card_number_denominator,
        source_set_code: row.source_set_code,
        rarity: row.rarity,
        illustrator: row.illustrator,
        hp: row.hp,
        category: row.category,
        source_product_name: row.source_product_name,
        source_product_url: row.related_urls?.[0] ?? null,
        source_fields: row.source_fields,
      },
      product_registry_keys: [row.registry_key],
      raw_snapshot_ref: row.raw_snapshot_ref,
      raw_snapshot_sha256: row.raw_snapshot_sha256,
      retrieved_at: row.retrieved_at,
    });
  }
  const { rows: candidates } = await loadVerifiedDatasetFromManifest({
    manifestPath: CANDIDATE_MANIFEST,
    datasetKey: 'identity_candidate_rows_v1',
  });
  const { rows: masterRows } = await loadVerifiedDatasetFromManifest({
    manifestPath: FINAL_MANIFEST,
    datasetKey: 'master_card_resolution_rows_v1',
  });
  const masterByCandidate = new Map(
    masterRows.map((row) => [row.jpn_card_identity_key, row]),
  );

  const candidatesByImage = new Map();
  for (const candidate of candidates) {
    for (const imageUrl of new Set(candidate.image_urls ?? [])) {
      const key = imageBasename(imageUrl);
      const values = candidatesByImage.get(key) ?? new Map();
      values.set(candidate.candidate_key, candidate);
      candidatesByImage.set(key, values);
    }
  }

  const assertionsByCardId = new Map();
  for (const assertion of assertions) {
    const values = assertionsByCardId.get(assertion.source_external_id) ?? [];
    values.push(assertion);
    assertionsByCardId.set(assertion.source_external_id, values);
  }
  if (detailByCardId.size !== assertionsByCardId.size) {
    throw new Error(
      `Detail coverage mismatch: ${detailByCardId.size} != `
      + `${assertionsByCardId.size}`,
    );
  }

  const productCodeVotes = new Map();
  for (const assertion of assertions) {
    const detail = detailByCardId.get(assertion.source_external_id)?.detail;
    const code = detail?.source_set_code ?? assertion.source_set_code;
    if (!code) continue;
    const values = productCodeVotes.get(assertion.registry_key) ?? [];
    values.push(code);
    productCodeVotes.set(assertion.registry_key, values);
  }
  const productCode = new Map(
    [...productCodeVotes].map(([registryKey, values]) => [
      registryKey,
      mostFrequent(values),
    ]),
  );

  const canonicalRegistryVotes = new Map();
  for (const [cardId, cardAssertions] of assertionsByCardId) {
    const detail = detailByCardId.get(cardId).detail;
    const imageUrl = detail.image_url ?? cardAssertions[0].image_urls[0];
    const matches = [
      ...(candidatesByImage.get(imageBasename(imageUrl))?.values() ?? []),
    ];
    const code = detail.source_set_code
      ?? mostFrequent(
        cardAssertions.map((row) => productCode.get(row.registry_key)),
      );
    for (const candidate of matches) {
      for (const registryKey of candidate.registry_keys ?? []) {
        const values = canonicalRegistryVotes.get(code) ?? [];
        values.push(registryKey);
        canonicalRegistryVotes.set(code, values);
      }
    }
  }
  const canonicalRegistryByCode = new Map(
    [...canonicalRegistryVotes].map(([code, values]) => [
      code,
      mostFrequent(values),
    ]),
  );

  const identityRows = [];
  for (const [cardId, cardAssertions] of assertionsByCardId) {
    const detailRecord = detailByCardId.get(cardId);
    const detail = detailRecord.detail;
    const imageUrl = detail.image_url ?? cardAssertions[0].image_urls[0];
    const matchedCandidates = [
      ...(candidatesByImage.get(imageBasename(imageUrl))?.values() ?? []),
    ].sort((left, right) =>
      left.candidate_key.localeCompare(right.candidate_key));
    const effectiveCode = detail.source_set_code
      ?? mostFrequent(
        cardAssertions.map((row) => productCode.get(row.registry_key)),
      );
    const canonicalRegistryKey = canonicalRegistryByCode.get(effectiveCode)
      ?? null;
    const currentMasterAdmissible = matchedCandidates.some((candidate) =>
      masterByCandidate.get(candidate.candidate_key)?.final_disposition
        === 'master_admissible');
    const complete = Boolean(
      detail.printed_name
      && imageUrl
      && cardId
      && canonicalRegistryKey,
    );
    const resolutionDisposition = matchedCandidates.length === 0
      ? 'new_official_identity'
      : matchedCandidates.length === 1
        ? 'existing_candidate_exact_image_upgrade'
        : 'duplicate_candidate_cluster_exact_image_review';
    identityRows.push({
      official_card_id: cardId,
      canonical_registry_key: canonicalRegistryKey,
      effective_source_set_code: effectiveCode,
      source_product_registry_keys: cardAssertions
        .map((row) => row.registry_key)
        .sort(),
      printed_name_ja: detail.printed_name,
      printed_number: detail.card_number_raw,
      printed_number_denominator: detail.card_number_denominator,
      governed_unnumbered_key: detail.card_number_raw
        ? null
        : `official_card_id:${cardId}`,
      image_url: imageUrl,
      category: detail.category,
      illustrator: detail.illustrator,
      matched_v4_candidate_keys:
        matchedCandidates.map((row) => row.candidate_key),
      matched_v4_candidate_count: matchedCandidates.length,
      current_master_admissible: currentMasterAdmissible,
      resolution_disposition: resolutionDisposition,
      base_identity_coverage_resolved: complete,
      promotion_ready:
        complete && matchedCandidates.length <= 1,
      promotion_blockers: [
        !complete ? 'exact_identity_fields_incomplete' : null,
        matchedCandidates.length > 1
          ? 'duplicate_candidate_cluster_requires_canonical_selection'
          : null,
      ].filter(Boolean),
      official_source_url: detailRecord.raw_snapshot_ref,
      official_source_sha256: detailRecord.raw_snapshot_sha256,
    });
  }
  identityRows.sort((left, right) =>
    Number(left.official_card_id) - Number(right.official_card_id));

  const productRows = [...productCode].map(([registryKey, code]) => {
    const productAssertions = assertions.filter((row) =>
      row.registry_key === registryKey);
    return {
      product_registry_key: registryKey,
      canonical_release_registry_key:
        canonicalRegistryByCode.get(code) ?? null,
      effective_source_set_code: code,
      exact_official_identity_count:
        new Set(
          productAssertions.map((row) => row.source_external_id),
        ).size,
      physical_card_count: productAssertions.reduce(
        (sum, row) => sum + (row.source_fields.deck_quantity ?? 0),
        0,
      ) || null,
      disposition: 'merge_product_membership_into_canonical_release_scope',
      product_membership_preserved: true,
      denominator_counting_rule:
        'count_unique_official_card_id_once_per_canonical_release_union',
    };
  }).sort((left, right) =>
    left.product_registry_key.localeCompare(right.product_registry_key));

  const scopeRows = [...canonicalRegistryByCode]
    .map(([code, registryKey]) => {
      const scoped = identityRows.filter((row) =>
        row.effective_source_set_code === code);
      return {
        canonical_release_registry_key: registryKey,
        source_set_code: code,
        official_unique_identity_count: scoped.length,
        coverage_resolved_count:
          scoped.filter((row) => row.base_identity_coverage_resolved).length,
        promotion_ready_count:
          scoped.filter((row) => row.promotion_ready).length,
        duplicate_candidate_review_count:
          scoped.filter((row) => !row.promotion_ready).length,
      };
    })
    .sort((left, right) =>
      left.canonical_release_registry_key.localeCompare(
        right.canonical_release_registry_key,
      ));

  const newlyCovered = identityRows.filter((row) =>
    row.base_identity_coverage_resolved
    && !row.current_master_admissible).length;
  const priorCovered = 7_933;
  const priorExpected = 21_666;
  const projectedCovered = priorCovered + newlyCovered;
  const projectedExpected = priorExpected + identityRows.length;
  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'official_product_identity_delta_resolved',
    official_unique_identity_count: identityRows.length,
    currently_master_admissible_count:
      identityRows.filter((row) => row.current_master_admissible).length,
    newly_covered_base_identity_count: newlyCovered,
    promotion_ready_identity_count:
      identityRows.filter((row) => row.promotion_ready).length,
    duplicate_candidate_review_count:
      identityRows.filter((row) => !row.promotion_ready).length,
    resolution_disposition_counts:
      countBy(identityRows, (row) => row.resolution_disposition),
    product_scope_disposition_count: productRows.length,
    canonical_release_scope_count: scopeRows.length,
    coverage_projection: {
      prior: {
        covered_slots: priorCovered,
        expected_slots: priorExpected,
        percent: roundedPercent(priorCovered, priorExpected),
      },
      official_product_delta: {
        covered_slots: newlyCovered,
        expected_slots: identityRows.length,
      },
      projected: {
        covered_slots: projectedCovered,
        expected_slots: projectedExpected,
        percent: roundedPercent(projectedCovered, projectedExpected),
      },
      denominator_rule:
        'unique official card ID counted once in its canonical release union',
    },
    boundary: {
      source_fetches: false,
      database_access: false,
      storage_access: false,
      production_writes: false,
      source_evidence_replaced: false,
      duplicate_candidates_auto_merged: 0,
    },
    next_gate:
      'integrate_245_direct_resolutions_and_adjudicate_8_duplicate_clusters',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const paths = {
    identities: path.join(
      outputRoot,
      'jpn_v5_official_product_identity_delta_v1.jsonl',
    ),
    products: path.join(
      outputRoot,
      'jpn_v5_official_product_scope_dispositions_v1.jsonl',
    ),
    scopes: path.join(
      outputRoot,
      'jpn_v5_official_release_scope_coverage_v1.jsonl',
    ),
    report: path.join(
      outputRoot,
      'jpn_v5_official_product_identity_resolution_report_v1.json',
    ),
    attestation: path.join(
      outputRoot,
      'jpn_v5_official_product_identity_resolution_no_write_v1.json',
    ),
  };
  await writeJsonl(paths.identities, identityRows);
  await writeJsonl(paths.products, productRows);
  await writeJsonl(paths.scopes, scopeRows);
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
      'jpn_v5_official_product_identity_resolution_fingerprints_v1.json',
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

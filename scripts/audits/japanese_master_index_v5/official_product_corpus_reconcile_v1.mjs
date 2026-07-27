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
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-CORPUS-RECONCILE-V1';
const GENERATED_AT = '2026-07-27T04:30:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/product_corpus_reconciliation';
const CORPUS_ROOT =
  'docs/audits/japanese_master_index_v5/product_corpus';
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
    .replace(/[\s・･.．]/g, '')
    .toLocaleLowerCase('ja');
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row[key]);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts].sort(([left], [right]) => left.localeCompare(right)),
  );
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

function reconciliationDisposition({
  globalMatchCount,
  sameRegistryMatchCount,
}) {
  if (sameRegistryMatchCount === 1) {
    return 'same_release_name_match_needs_print_confirmation';
  }
  if (sameRegistryMatchCount > 1) {
    return 'same_release_name_ambiguous_needs_image_or_number';
  }
  if (globalMatchCount === 0) {
    return 'novel_official_slot_needs_image_or_number';
  }
  if (globalMatchCount === 1) {
    return 'single_name_match_other_release_needs_print_confirmation';
  }
  return 'ambiguous_name_match_needs_image_or_number';
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const assertions = readJsonl(
    path.join(
      CORPUS_ROOT,
      'jpn_v5_official_product_card_assertions_corpus_v1.jsonl',
    ),
  );
  const products = readJsonl(
    path.join(
      CORPUS_ROOT,
      'jpn_v5_official_product_source_rows_corpus_v1.jsonl',
    ),
  );
  const { rows: candidates } = await loadVerifiedDatasetFromManifest({
    manifestPath: CANDIDATE_MANIFEST,
    datasetKey: 'identity_candidate_rows_v1',
  });

  const candidatesByName = new Map();
  for (const candidate of candidates) {
    for (const printedName of candidate.printed_name_ja_candidates ?? []) {
      const key = normalizedName(printedName);
      if (!key) continue;
      const values = candidatesByName.get(key) ?? [];
      values.push(candidate);
      candidatesByName.set(key, values);
    }
  }

  const rows = assertions.map((assertion) => {
    const matches = candidatesByName.get(
      normalizedName(assertion.printed_name),
    ) ?? [];
    const sameRegistryMatches = matches.filter((candidate) =>
      (candidate.registry_keys ?? []).includes(assertion.registry_key));
    const disposition = reconciliationDisposition({
      globalMatchCount: matches.length,
      sameRegistryMatchCount: sameRegistryMatches.length,
    });
    return {
      assertion_key: assertion.assertion_key,
      registry_key: assertion.registry_key,
      printed_name: assertion.printed_name,
      source_slot: assertion.unnumbered_label,
      source_url: assertion.source_url,
      global_exact_name_match_count: matches.length,
      same_registry_exact_name_match_count: sameRegistryMatches.length,
      possible_candidate_keys: matches
        .slice(0, 25)
        .map((candidate) => candidate.candidate_key),
      possible_candidate_count_capped:
        matches.length > 25,
      disposition,
      strict_identity_admitted: false,
      admission_blockers: [
        'printed_number_missing',
        'governed_unnumbered_image_missing',
        sameRegistryMatches.length === 0
          ? 'same_release_identity_link_missing'
          : null,
        matches.length > 1 ? 'name_match_ambiguous' : null,
      ].filter(Boolean),
      next_evidence_lane:
        'official_product_detail_or_card_list_then_independent_corroboration',
    };
  }).sort((left, right) =>
    left.registry_key.localeCompare(right.registry_key)
    || left.assertion_key.localeCompare(right.assertion_key));

  const rowsByRegistry = new Map();
  for (const row of rows) {
    const values = rowsByRegistry.get(row.registry_key) ?? [];
    values.push(row);
    rowsByRegistry.set(row.registry_key, values);
  }
  const queue = products
    .filter((product) =>
      product.named_card_slot_count > 0 || product.link_card_list)
    .map((product) => {
      const productRows = rowsByRegistry.get(product.release_key) ?? [];
      const novelCount = productRows.filter((row) =>
        row.disposition ===
          'novel_official_slot_needs_image_or_number').length;
      const priority = product.link_card_list
        ? 0
        : product.link_detail_page && novelCount > 0
          ? 1
          : product.link_detail_page
            ? 2
            : 3;
      return {
        registry_key: product.release_key,
        product_name: product.product_name,
        release_date: product.release_date,
        priority,
        named_card_slot_count: product.named_card_slot_count,
        novel_name_slot_count: novelCount,
        link_card_list: product.link_card_list,
        link_detail_page: product.link_detail_page,
        next_evidence_lane: product.link_card_list
          ? 'official_card_list'
          : product.link_detail_page
            ? 'official_product_detail'
            : 'historical_product_archive',
      };
    })
    .sort((left, right) =>
      left.priority - right.priority
      || left.registry_key.localeCompare(right.registry_key));

  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'official_product_slots_reconciled_without_admission',
    source_product_count: products.length,
    acquired_official_assertion_count: rows.length,
    strict_identity_admission_count: 0,
    disposition_counts: countBy(rows, 'disposition'),
    followup_product_count: queue.length,
    linked_official_card_list_count:
      queue.filter((row) => row.link_card_list).length,
    linked_official_product_detail_count:
      queue.filter((row) => row.link_detail_page).length,
    bounded_coverage_before: {
      covered_slots: 7_933,
      expected_slots: 21_666,
      percent: 36.61,
    },
    bounded_coverage_after: {
      covered_slots: 7_933,
      expected_slots: 21_666,
      percent: 36.61,
    },
    coverage_change_reason:
      'official names are acquired evidence, but exact printing admission '
      + 'still requires a printed number or governed unnumbered image key',
    boundary: {
      source_fetches: false,
      database_access: false,
      storage_access: false,
      production_writes: false,
      source_evidence_replaced: false,
      name_only_identity_merges: 0,
    },
    next_gate:
      'harvest_official_card_lists_and_product_details_in_bounded_batches',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const paths = {
    reconciliation: path.join(
      outputRoot,
      'jpn_v5_official_product_assertion_reconciliation_v1.jsonl',
    ),
    queue: path.join(
      outputRoot,
      'jpn_v5_official_product_evidence_followup_queue_v1.jsonl',
    ),
    report: path.join(
      outputRoot,
      'jpn_v5_official_product_corpus_reconciliation_report_v1.json',
    ),
    attestation: path.join(
      outputRoot,
      'jpn_v5_official_product_corpus_reconciliation_no_write_v1.json',
    ),
  };
  await writeJsonl(paths.reconciliation, rows);
  await writeJsonl(paths.queue, queue);
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
      'jpn_v5_official_product_corpus_reconciliation_fingerprints_v1.json',
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

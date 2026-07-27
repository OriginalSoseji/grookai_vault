import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-BATCH-EXTRACT-V1';
const GENERATED_AT = '2026-07-27T04:00:00.000Z';
const DEFAULT_BATCH_KEY = 'zero_inventory_acquisition:001';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/product_batch_001';
const CORPUS_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/product_corpus';
const RAW_ROOT =
  'docs/audits/japanese_master_index_v4/sets/raw';

function parseArgs(argv) {
  const result = {
    allProducts: false,
    batchKey: DEFAULT_BATCH_KEY,
    outputRoot: null,
    quiet: false,
  };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
    } else if (value.startsWith('--batch-key=')) {
      result.batchKey = value.slice('--batch-key='.length);
    } else if (value === '--all-products') {
      result.allProducts = true;
    } else if (value === '--quiet') {
      result.quiet = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (result.allProducts && result.batchKey !== DEFAULT_BATCH_KEY) {
    throw new Error('--all-products and --batch-key cannot be combined');
  }
  result.outputRoot ??= result.allProducts
    ? CORPUS_OUTPUT_ROOT
    : result.batchKey === DEFAULT_BATCH_KEY
      ? DEFAULT_OUTPUT_ROOT
      : `docs/audits/japanese_master_index_v5/product_batch_${
        result.batchKey.split(':').at(-1)
      }`;
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readArtifact(filePath) {
  const artifact = readJson(filePath);
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
}

function loadJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizedProductCoordinate(value = '') {
  return String(value)
    .replace(/\s+/g, '')
    .replace(/[&＆]/g, '&');
}

function collectProductObjects(value, sourceFile, result) {
  if (Array.isArray(value)) {
    for (const row of value) collectProductObjects(row, sourceFile, result);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.productTitle) {
    result.push({ ...value, source_file: sourceFile });
    return;
  }
  for (const child of Object.values(value)) {
    collectProductObjects(child, sourceFile, result);
  }
}

function loadOfficialProductRows() {
  const rows = [];
  const files = fs.readdirSync(RAW_ROOT)
    .filter((name) =>
      /^official_jp_products_.*_v1\.json$/.test(name)
      && !name.endsWith('.http.json'))
    .sort();
  for (const name of files) {
    collectProductObjects(
      readJson(path.join(RAW_ROOT, name)),
      path.join(RAW_ROOT, name).replaceAll('\\', '/'),
      rows,
    );
  }
  return rows;
}

function directCardLine(line) {
  if (/^\s*※/.test(line)) return false;
  if (/拡張パック|カードファイル|カードボックス|カードスタンド|カード収納/
    .test(line)) {
    return false;
  }
  return /(?:プロモカード|キラカード|ジャンボカード)/.test(line);
}

function finishLabels(line) {
  const labels = [];
  if (/キラ/.test(line)) labels.push('foil');
  if (/プレミアム/.test(line)) labels.push('premium');
  if (/スペシャル/.test(line)) labels.push('special');
  if (/オリジナル/.test(line)) labels.push('original');
  if (/ジャンボ/.test(line)) labels.push('jumbo');
  return labels;
}

function productUrl(value, fallback) {
  if (!value) return fallback;
  if (/^https?:\/\//.test(value)) return value;
  return new URL(value, 'https://www.pokemon-card.com').toString();
}

function extractAssertions(releaseKey, scope, raw) {
  const assertions = [];
  for (const [lineIndex, lineValue] of String(raw.description ?? '')
    .split('\n')
    .entries()) {
    const line = lineValue.trim();
    if (!directCardLine(line)) continue;
    const names = [...line.matchAll(/「([^」]+)」/g)]
      .map((match) => match[1].trim())
      .filter(Boolean);
    for (const [nameIndex, printedName] of names.entries()) {
      const slot = `${lineIndex + 1}.${nameIndex + 1}`;
      assertions.push({
        assertion_key:
          `official_jp_product_contents:${releaseKey}:${slot}`,
        assertion_version: GENERATOR_VERSION,
        source_id: 'official_jp_product_contents',
        source_family: 'pokemon_card_official_jp',
        source_kind: 'official_product_contents',
        registry_key: releaseKey,
        language: 'ja',
        printed_name: printedName,
        card_number_raw: null,
        card_number_prefix: null,
        card_number_numerator: null,
        card_number_denominator: null,
        card_number_suffix: null,
        unnumbered_label: `official_product_slot_${slot}`,
        identity_modifiers: [
          `official_product:${releaseKey}`,
          `source_slot:${slot}`,
        ],
        finish_labels: finishLabels(line),
        image_urls: [],
        release_date: scope.source_release_date,
        source_product_name: scope.source_native_name,
        source_product_id: scope.source_set_id,
        source_url: productUrl(
          raw.link_detailPage || raw.link_cardList,
          scope.source_url,
        ),
        source_fields: {
          contents_line: line,
          contents_line_number: lineIndex + 1,
          quoted_name_index: nameIndex + 1,
          declared_single_copy:
            /(?:1|１|各1|各１)\s*枚/.test(line),
        },
        raw_snapshot_ref: raw.source_file,
        raw_snapshot_sha256: crypto.createHash('sha256')
          .update(fs.readFileSync(raw.source_file))
          .digest('hex'),
      });
    }
  }
  return assertions;
}

function quantityMentions(description) {
  const result = [];
  for (const [lineIndex, lineValue] of String(description ?? '')
    .split('\n')
    .entries()) {
    const line = lineValue.trim();
    if (!line || /カードボックス|カードファイル|カード収納/.test(line)) {
      continue;
    }
    for (const match of line.matchAll(/(?:カード)?\s*[×／(（]?\s*(\d+)\s*枚/g)) {
      result.push({
        line_number: lineIndex + 1,
        count: Number(match[1]),
        context: line,
      });
    }
  }
  return result;
}

function dispositionFor(raw, assertions) {
  const description = String(raw.description ?? '');
  if (assertions.length > 0) {
    return 'official_named_card_slots_extracted';
  }
  if (raw.link_cardList) {
    return 'official_card_list_followup_available';
  }
  if (/すべて過去に発売された商品からの再録/.test(description)) {
    return 'official_explicit_reprint_only_product';
  }
  if (/拡張パック/.test(description)
      && !/(?:構築|ハーフ)?デッキ/.test(description)
      && !/(?:^|\n)\s*(?:キラ)?カード\s*[×／]/.test(description)) {
    return 'official_packaging_only_no_direct_identity';
  }
  if (/拡張パック/.test(raw.productTitle)
      && /ランダムに封入/.test(description)) {
    return 'official_random_booster_release_followup';
  }
  return 'official_identity_manifest_followup_required';
}

function countBy(values, keyFn) {
  const counts = new Map();
  for (const value of values) {
    const key = String(keyFn(value));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts].sort(([a], [b]) => a.localeCompare(b)),
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

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoots = new Set([
    path.resolve(DEFAULT_OUTPUT_ROOT),
    path.resolve(CORPUS_OUTPUT_ROOT),
    path.resolve(
      `docs/audits/japanese_master_index_v5/product_batch_${
        args.batchKey.split(':').at(-1)
      }`,
    ),
  ]);
  if (!canonicalRoots.has(outputRoot)
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const batches = readJson(
    'docs/audits/japanese_master_index_v5/acquisition_waves/'
    + 'jpn_v5_acquisition_batches_v1.json',
  );
  const workpacks = loadJsonl(
    'docs/audits/japanese_master_index_v5/acquisition_waves/'
    + 'jpn_v5_release_workpacks_v1.jsonl',
  );
  const scope = readArtifact(
    'docs/audits/japanese_master_index_v4/sets/'
    + 'jpn_official_product_scope_v1.json',
  ).content.products;
  const rawProducts = loadOfficialProductRows();
  const workByKey = new Map(workpacks.map((row) => [row.work_key, row]));
  const scopeByKey = new Map(scope.map((row) => [row.registry_key, row]));
  let selectedWorkKeys;
  let runKey;
  if (args.allProducts) {
    selectedWorkKeys = batches
      .filter((row) => row.wave_key === 'zero_inventory_acquisition')
      .flatMap((row) => row.work_keys)
      .filter((workKey) =>
        workByKey.get(workKey)?.registry_entry_kind === 'official_product');
    runKey = 'all_zero_inventory_official_products';
  } else {
    const batch = batches.find((row) => row.batch_key === args.batchKey);
    if (!batch) throw new Error(`Missing batch: ${args.batchKey}`);
    selectedWorkKeys = batch.work_keys;
    runKey = args.batchKey;
  }

  const sourceRows = [];
  const assertions = [];
  const dispositions = [];
  for (const workKey of selectedWorkKeys) {
    const work = workByKey.get(workKey);
    if (!work) throw new Error(`Missing workpack: ${workKey}`);
    if (work.registry_entry_kind !== 'official_product') {
      throw new Error(`Batch contains non-product work: ${work.release_key}`);
    }
    const productScope = scopeByKey.get(work.release_key);
    if (!productScope) {
      throw new Error(`Missing product scope: ${work.release_key}`);
    }
    const matches = rawProducts.filter((row) =>
      normalizedProductCoordinate(row.productTitle)
        === normalizedProductCoordinate(productScope.source_native_name)
      && normalizedProductCoordinate(row.releaseDate)
        === normalizedProductCoordinate(productScope.source_release_date));
    if (matches.length !== 1) {
      throw new Error(
        `Expected one raw product match for ${work.release_key}; `
        + `received ${matches.length}`,
      );
    }
    const raw = matches[0];
    const productAssertions = extractAssertions(
      work.release_key,
      productScope,
      raw,
    );
    assertions.push(...productAssertions);
    const disposition = dispositionFor(raw, productAssertions);
    sourceRows.push({
      release_key: work.release_key,
      product_name: productScope.source_native_name,
      release_date: productScope.source_release_date,
      source_container_kind: productScope.source_container_kind,
      description: raw.description,
      link_card_list: productUrl(raw.link_cardList, null),
      link_detail_page: productUrl(raw.link_detailPage, null),
      raw_snapshot_ref: raw.source_file,
      raw_snapshot_sha256: crypto.createHash('sha256')
        .update(fs.readFileSync(raw.source_file))
        .digest('hex'),
      named_card_slot_count: productAssertions.length,
      quantity_mentions: quantityMentions(raw.description),
      explicit_reprint_only:
        /すべて過去に発売された商品からの再録/.test(raw.description),
    });
    dispositions.push({
      release_key: work.release_key,
      disposition,
      named_card_slot_count: productAssertions.length,
      next_evidence_lane: disposition ===
          'official_named_card_slots_extracted'
        ? 'identity_reconciliation_and_corroboration'
        : disposition === 'official_card_list_followup_available'
          ? 'official_card_list_page'
          : disposition === 'official_random_booster_release_followup'
            ? 'release_container_alias_reconciliation'
            : disposition ===
                'official_identity_manifest_followup_required'
              ? 'historical_product_or_deck_manifest'
              : 'base_identity_scope_complete',
    });
  }

  assertions.sort((a, b) =>
    a.registry_key.localeCompare(b.registry_key)
    || a.assertion_key.localeCompare(b.assertion_key));
  sourceRows.sort((a, b) => a.release_key.localeCompare(b.release_key));
  dispositions.sort((a, b) => a.release_key.localeCompare(b.release_key));
  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    batch_key: runKey,
    status: 'offline_source_evidence_extracted',
    source_product_count: sourceRows.length,
    exact_raw_product_match_count: sourceRows.length,
    official_named_card_assertion_count: assertions.length,
    products_with_named_card_assertions:
      new Set(assertions.map((row) => row.registry_key)).size,
    disposition_counts: countBy(
      dispositions,
      (row) => row.disposition,
    ),
    boundary: {
      source_fetches: false,
      database_access: false,
      storage_access: false,
      production_writes: false,
      source_evidence_replaced: false,
    },
    next_gate:
      `reconcile_${assertions.length}_official_unnumbered_assertions`
      + '_and_follow_card_list_urls',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const outputToken = args.allProducts
    ? 'corpus'
    : `batch_${args.batchKey.split(':').at(-1)}`;
  const paths = {
    sourceRows: path.join(
      outputRoot,
      `jpn_v5_official_product_source_rows_${outputToken}_v1.jsonl`,
    ),
    assertions: path.join(
      outputRoot,
      `jpn_v5_official_product_card_assertions_${outputToken}_v1.jsonl`,
    ),
    dispositions: path.join(
      outputRoot,
      `jpn_v5_official_product_dispositions_${outputToken}_v1.jsonl`,
    ),
    report: path.join(
      outputRoot,
      `jpn_v5_official_product_${outputToken}_report_v1.json`,
    ),
    attestation: path.join(
      outputRoot,
      `jpn_v5_official_product_${outputToken}_no_write_v1.json`,
    ),
  };
  await writeJsonl(paths.sourceRows, sourceRows);
  await writeJsonl(paths.assertions, assertions);
  await writeJsonl(paths.dispositions, dispositions);
  await writeJson(paths.report, report);
  await writeJson(paths.attestation, {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    ...report.boundary,
    raw_snapshots_preserved: true,
  });
  const proofs = {};
  for (const [key, filePath] of Object.entries(paths)) {
    proofs[key] = await fileProof(filePath);
  }
  await writeJson(
    path.join(
      outputRoot,
      `jpn_v5_official_product_${outputToken}_fingerprints_v1.json`,
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

import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import {
  parseOfficialJapaneseCardDetail,
} from '../japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs';
import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-CARD-DETAIL-HARVEST-V1';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/official_product_details';
const LINK_ASSERTIONS =
  'docs/audits/japanese_master_index_v5/official_product_links/parsed/'
  + 'jpn_v5_official_product_link_card_assertions_v1.jsonl';
const V4_OFFICIAL_ASSERTIONS =
  'docs/audits/japanese_master_index_v4/cards/'
  + 'official_jp_card_assertions_v1.json.gz';
const REQUEST_DELAY_MS = 750;

function parseArgs(argv) {
  const result = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    offline: false,
    quiet: false,
  };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
    } else if (value === '--offline') {
      result.offline = true;
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

function readV4OfficialAssertions() {
  const artifact = JSON.parse(
    zlib.gunzipSync(fs.readFileSync(V4_OFFICIAL_ASSERTIONS)).toString('utf8'),
  );
  return artifact.content.assertions;
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function detailUrl(cardId) {
  return `https://www.pokemon-card.com/card-search/details.php/card/${
    cardId
  }/regu/all`;
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

async function captureCard({
  cardId,
  offline,
  outputRoot,
}) {
  const bodyPath = path.join(outputRoot, 'raw', `card_${cardId}_v1.html`);
  const metadataPath = path.join(
    outputRoot,
    'raw',
    `card_${cardId}_v1.http.json`,
  );
  const bodyExists = fs.existsSync(bodyPath);
  const metadataExists = fs.existsSync(metadataPath);
  if (bodyExists && metadataExists) {
    const body = await fsp.readFile(bodyPath);
    const metadata = JSON.parse(await fsp.readFile(metadataPath, 'utf8'));
    if (metadata.body_sha256 !== hash(body)) {
      throw new Error(`Snapshot hash mismatch: ${bodyPath}`);
    }
    return {
      body,
      bodyPath,
      metadata,
      networkRequest: false,
    };
  }
  if (bodyExists !== metadataExists) {
    throw new Error(`Incomplete snapshot for official card ${cardId}`);
  }
  if (offline) {
    throw new Error(`Offline snapshot missing for official card ${cardId}`);
  }

  const url = detailUrl(cardId);
  let response;
  let body;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ja,en;q=0.8',
        'user-agent':
          'GrookaiVault-JapaneseMasterIndex/5.0 '
          + '(evidence acquisition; contact hello@grookaivault.com)',
      },
      redirect: 'follow',
    });
    body = Buffer.from(await response.arrayBuffer());
    if (response.ok) break;
    if (![429, 500, 502, 503, 504].includes(response.status)
        || attempt === 3) {
      throw new Error(`Official card ${cardId} returned ${response.status}`);
    }
    await sleep(attempt * 2_000);
  }
  const metadata = {
    generator_version: GENERATOR_VERSION,
    capture_mode: 'live_fetch',
    fetched_at: new Date().toISOString(),
    request_url: url,
    final_url: response.url,
    http_status: response.status,
    response_headers: {
      cache_control: response.headers.get('cache-control'),
      content_length: response.headers.get('content-length'),
      content_type: response.headers.get('content-type'),
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified'),
    },
    body_bytes: body.byteLength,
    body_sha256: hash(body),
  };
  await fsp.mkdir(path.dirname(bodyPath), { recursive: true });
  await fsp.writeFile(bodyPath, body);
  await writeJson(metadataPath, metadata);
  return {
    body,
    bodyPath,
    metadata,
    networkRequest: true,
  };
}

async function fileProof(filePath) {
  const value = await fsp.readFile(filePath);
  return {
    bytes: value.byteLength,
    row_count: filePath.endsWith('.jsonl')
      ? value.toString('utf8').split('\n').filter(Boolean).length
      : null,
    sha256: hash(value),
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
  const linkAssertions = readJsonl(LINK_ASSERTIONS);
  const linkByCardId = new Map();
  for (const row of linkAssertions) {
    const values = linkByCardId.get(row.source_external_id) ?? [];
    values.push(row);
    linkByCardId.set(row.source_external_id, values);
  }
  const v4ByCardId = new Map(
    readV4OfficialAssertions()
      .map((row) => [row.source_external_id, row]),
  );
  const cardIds = [...linkByCardId.keys()]
    .sort((left, right) => Number(left) - Number(right));

  const details = [];
  const failures = [];
  let networkRequestCount = 0;
  for (const [index, cardId] of cardIds.entries()) {
    const existing = v4ByCardId.get(cardId);
    if (existing) {
      details.push({
        card_id: cardId,
        evidence_origin: 'v4_preserved_official_assertion',
        detail: {
          printed_name: existing.printed_name,
          image_url: existing.image_urls?.[0] ?? null,
          card_number_raw: existing.card_number_raw,
          card_number_numerator: existing.card_number_numerator,
          card_number_denominator: existing.card_number_denominator,
          source_set_code: existing.source_set_code,
          rarity: existing.rarity,
          illustrator: existing.illustrator,
          hp: existing.hp,
          category: existing.category,
          source_product_name: existing.source_product_name,
          source_product_url: existing.related_urls?.[0] ?? null,
          source_fields: existing.source_fields,
        },
        product_registry_keys: linkByCardId.get(cardId)
          .map((row) => row.registry_key)
          .sort(),
        raw_snapshot_ref: existing.raw_snapshot_ref,
        raw_snapshot_sha256: existing.raw_snapshot_sha256,
        retrieved_at: existing.retrieved_at,
      });
      continue;
    }
    try {
      if (networkRequestCount > 0) await sleep(REQUEST_DELAY_MS);
      const captured = await captureCard({
        cardId,
        offline: args.offline,
        outputRoot,
      });
      if (captured.networkRequest) networkRequestCount += 1;
      const detail = parseOfficialJapaneseCardDetail(
        captured.body,
        cardId,
      );
      details.push({
        card_id: cardId,
        evidence_origin:
          captured.metadata.capture_mode ?? 'live_fetch',
        detail,
        product_registry_keys: linkByCardId.get(cardId)
          .map((row) => row.registry_key)
          .sort(),
        raw_snapshot_ref: path.relative(
          process.cwd(),
          captured.bodyPath,
        ).replaceAll('\\', '/'),
        raw_snapshot_sha256: captured.metadata.body_sha256,
        retrieved_at: captured.metadata.fetched_at,
      });
    } catch (error) {
      failures.push({
        card_id: cardId,
        error_name: error.name,
        error_message: error.message,
      });
    }
    if (!args.quiet && ((index + 1) % 20 === 0
        || index + 1 === cardIds.length)) {
      console.log(
        `[jpn-v5][official-detail] ${index + 1}/${cardIds.length} `
        + `success=${details.length} failed=${failures.length}`,
      );
    }
  }

  details.sort((left, right) => Number(left.card_id) - Number(right.card_id));
  failures.sort((left, right) => Number(left.card_id) - Number(right.card_id));
  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at:
      details.map((row) => row.retrieved_at).sort().at(-1) ?? null,
    status: failures.length === 0
      ? 'official_product_card_details_complete'
      : 'official_product_card_details_partial',
    requested_unique_card_id_count: cardIds.length,
    reused_v4_official_detail_count:
      details.filter((row) =>
        row.evidence_origin === 'v4_preserved_official_assertion').length,
    preserved_or_fetched_detail_count: details.length,
    numbered_detail_count:
      details.filter((row) => row.detail.card_number_raw).length,
    failed_detail_count: failures.length,
    snapshot_origin_live_fetch_count:
      details.filter((row) => row.evidence_origin === 'live_fetch').length,
    minimum_request_delay_ms: REQUEST_DELAY_MS,
    boundary: {
      approved_source_host: 'www.pokemon-card.com',
      database_access: false,
      storage_access: false,
      production_writes: false,
      pricing_access: false,
    },
    next_gate:
      failures.length === 0
        ? 'merge_detail_facts_into_product_assertions_and_resolve_candidates'
        : 'retry_only_failed_detail_ids',
  };

  await fsp.mkdir(outputRoot, { recursive: true });
  const paths = {
    details: path.join(
      outputRoot,
      'jpn_v5_official_product_card_details_v1.jsonl',
    ),
    failures: path.join(
      outputRoot,
      'jpn_v5_official_product_card_detail_failures_v1.jsonl',
    ),
    report: path.join(
      outputRoot,
      'jpn_v5_official_product_card_detail_report_v1.json',
    ),
  };
  await writeJsonl(paths.details, details);
  await writeJsonl(paths.failures, failures);
  await writeJson(paths.report, report);
  const proofs = {};
  for (const [key, filePath] of Object.entries(paths)) {
    proofs[key] = await fileProof(filePath);
  }
  await writeJson(
    path.join(
      outputRoot,
      'jpn_v5_official_product_card_detail_fingerprints_v1.json',
    ),
    {
      generator_version: GENERATOR_VERSION,
      generated_at: report.generated_at,
      files: proofs,
      aggregate_sha256: contentFingerprint(proofs),
    },
  );
  if (!args.quiet) {
    console.log(JSON.stringify({
      ...report,
      network_request_count_this_run: networkRequestCount,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

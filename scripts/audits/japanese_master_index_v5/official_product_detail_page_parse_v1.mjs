import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-DETAIL-PAGE-PARSE-V1';
const GENERATED_AT = '2026-07-27T21:00:00.000Z';
const DETAIL_ROOT =
  'docs/audits/japanese_master_index_v5/official_product_detail_pages';
const MANIFEST_PATH = path.join(
  DETAIL_ROOT,
  'jpn_v5_official_product_detail_page_manifest_v1.json',
);
const DEFAULT_OUTPUT_ROOT = path.join(DETAIL_ROOT, 'parsed');

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

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&apos;', "'");
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function numericSearchIds(html) {
  const decoded = decodeHtml(html);
  return [...new Set(
    [...decoded.matchAll(/[?&]pg=(?<id>[^&"'#\s<>]+)/gi)]
      .map((match) => match.groups.id)
      .filter((value) => /^\d+$/.test(value)),
  )].sort((left, right) => Number(left) - Number(right));
}

function nonNumericSearchValues(html) {
  const decoded = decodeHtml(html);
  return [...new Set(
    [...decoded.matchAll(/[?&]pg=(?<id>[^&"'\s<>]*)/gi)]
      .map((match) => match.groups.id)
      .filter((value) => value && !/^\d+$/.test(value)),
  )].sort();
}

function directCardIds(html) {
  return [...new Set(
    [...String(html).matchAll(
      /card-search\/details\.php\/card\/(?<id>\d+)/gi,
    )].map((match) => match.groups.id),
  )].sort((left, right) => Number(left) - Number(right));
}

function directOfficialCardImages(html) {
  const rows = [];
  for (const match of String(html).matchAll(
    /<img\b(?<attrs>[^>]*\bsrc=["'](?<url>\/assets\/images\/card_images\/large\/(?<set>[^/"']*)\/(?<file>[^"']+))["'][^>]*)>/gi,
  )) {
    const id = match.groups.file.match(/^(?<id>\d{6})_/)?.groups?.id;
    if (!id) continue;
    const alt = match.groups.attrs.match(
      /\balt=["'](?<value>[^"']*)["']/i,
    )?.groups?.value;
    rows.push({
      card_id: String(Number(id)),
      printed_name: decodeHtml(alt).trim() || null,
      source_set_code: match.groups.set || null,
      image_url: new URL(
        decodeHtml(match.groups.url),
        'https://www.pokemon-card.com',
      ).toString(),
    });
  }
  return [...new Map(
    rows.map((row) => [row.card_id, row]),
  ).values()].sort((left, right) =>
    Number(left.card_id) - Number(right.card_id));
}

function coordinateCardImages(html) {
  const rows = [];
  for (const match of String(html).matchAll(/<img\b(?<attrs>[^>]+)>/gi)) {
    const source = match.groups.attrs.match(
      /\bsrc=["'](?<value>[^"']+)["']/i,
    )?.groups?.value;
    const printedName = match.groups.attrs.match(
      /\balt=["'](?<value>[^"']*)["']/i,
    )?.groups?.value;
    if (!source || !printedName) continue;
    const coordinate = source.match(
      /(?:^|[_/])SP[_-](?<number>\d+)[_-]/i,
    );
    if (!coordinate) continue;
    rows.push({
      printed_name: decodeHtml(printedName).trim(),
      source_set_code: 'S-P',
      card_number_raw: String(Number(coordinate.groups.number)),
      image_url: new URL(
        decodeHtml(source),
        'https://www.pokemon-card.com',
      ).toString(),
    });
  }
  return [...new Map(
    rows.map((row) => [
      `${row.source_set_code}:${row.card_number_raw}:${row.printed_name}`,
      row,
    ]),
  ).values()].sort((left, right) =>
    Number(left.card_number_raw) - Number(right.card_number_raw));
}

function normalizedCardSubject(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/(?:V-UNION|VSTAR|VMAX|ex|V)$/i, '');
}

function productsForCoordinate(products, coordinate) {
  if (products.length === 1) return products;
  const subject = normalizedCardSubject(coordinate.printed_name);
  return products.filter((product) =>
    product.product_name.normalize('NFKC').replace(/\s+/g, '')
      .includes(subject));
}

function cardLikeAssets(html) {
  return [...new Set(
    [...String(html).matchAll(
      /(?:src|href)=["'](?<url>[^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/gi,
    )]
      .map((match) => decodeHtml(match.groups.url))
      .filter((value) =>
        /(?:\bSP[_-]\d+|card-\d+|promo-card|_CARD_|V-UNION)/i.test(value)),
  )].sort();
}

function searchScopeDisposition(sourceUrl) {
  const pathname = new URL(sourceUrl).pathname.toLowerCase();
  if (pathname.startsWith('/products/s/')) {
    return {
      disposition: 'product_search_ids_verified',
      reason: 'official_constructed_product_page_search_links',
    };
  }
  if (pathname === '/ex/svc/') {
    return {
      disposition: 'product_search_ids_verified',
      reason: 'official_product_page_card_list_link',
    };
  }
  if (pathname === '/ex/sv2a/') {
    return {
      disposition: 'release_wide_search_id_not_product_specific',
      reason:
        'official_search_link_describes_the_full_sv2a_release_not_card_file_products',
    };
  }
  return {
    disposition: 'no_verified_product_search_id',
    reason: 'page_requires_product_specific_image_or_section_adjudication',
  };
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stableJson(value));
}

async function writeJsonl(filePath, rows) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(
    filePath,
    rows.map((row) => JSON.stringify(row)).join('\n')
      + (rows.length > 0 ? '\n' : ''),
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const searchFollowups = [];
  const cardAssertions = [];
  const coordinateFollowups = [];
  const productResults = [];
  for (const snapshot of manifest.snapshots) {
    const body = fs.readFileSync(snapshot.body_path);
    if (sha256(body) !== snapshot.metadata.body_sha256) {
      throw new Error(`Snapshot hash mismatch: ${snapshot.body_path}`);
    }
    const html = body.toString('utf8');
    const searchIds = numericSearchIds(html);
    const invalidSearchValues = nonNumericSearchValues(html);
    const pageCardIds = directCardIds(html);
    const directImages = directOfficialCardImages(html);
    const coordinateImages = coordinateCardImages(html);
    const pageCardAssets = cardLikeAssets(html);
    const scope = searchScopeDisposition(snapshot.source_url);

    for (const product of snapshot.products) {
      const assignedSearchIds =
        scope.disposition === 'product_search_ids_verified'
          ? searchIds
          : [];
      for (const searchId of assignedSearchIds) {
        searchFollowups.push({
          followup_key:
            `official_product_detail_search:${product.registry_key}:${searchId}`,
          generator_version: GENERATOR_VERSION,
          registry_key: product.registry_key,
          product_name: product.product_name,
          release_date: product.release_date,
          source_url: snapshot.source_url
            + (product.source_fragment ?? ''),
          source_page_url: snapshot.source_url,
          source_fragment: product.source_fragment,
          official_search_product_id: searchId,
          disposition: 'official_search_api_followup_ready',
          disposition_reason: scope.reason,
          raw_snapshot_ref: snapshot.body_path,
          raw_snapshot_sha256: snapshot.metadata.body_sha256,
          retrieved_at: snapshot.metadata.fetched_at,
        });
      }
      for (const card of directImages) {
        cardAssertions.push({
          assertion_key:
            `official_jp_product_detail:${product.registry_key}:`
            + `${card.card_id}`,
          assertion_version: GENERATOR_VERSION,
          source_id: 'official_jp_product_detail',
          source_family: 'pokemon_card_official_jp',
          source_kind: 'official_product_embedded_card_image',
          source_external_id: card.card_id,
          source_url: snapshot.source_url
            + (product.source_fragment ?? ''),
          source_container_id: product.registry_key,
          source_product_id: product.registry_key,
          registry_key: product.registry_key,
          language: 'ja',
          printed_name: card.printed_name,
          card_number_raw: null,
          card_number_numerator: null,
          card_number_denominator: null,
          source_set_code: card.source_set_code,
          unnumbered_label: `official_card_id:${card.card_id}`,
          identity_modifiers: [
            `official_product:${product.registry_key}`,
            `official_card_id:${card.card_id}`,
          ],
          image_urls: [card.image_url],
          source_product_name: product.product_name,
          source_fields: {
            parser_lane: 'official_product_embedded_card_image',
            image_reference_only: false,
          },
          raw_snapshot_ref: snapshot.body_path,
          raw_snapshot_sha256: snapshot.metadata.body_sha256,
          retrieved_at: snapshot.metadata.fetched_at,
        });
      }
      productResults.push({
        registry_key: product.registry_key,
        product_name: product.product_name,
        source_url: snapshot.source_url,
        source_fragment: product.source_fragment,
        disposition: assignedSearchIds.length > 0
          ? 'official_search_api_followup_ready'
          : scope.disposition,
        disposition_reason: scope.reason,
        numeric_search_ids_on_page: searchIds,
        assigned_official_search_product_ids: assignedSearchIds,
        nonnumeric_search_values_on_page: invalidSearchValues,
        direct_card_ids_on_page: pageCardIds,
        direct_official_card_image_ids:
          directImages.map((row) => row.card_id),
        coordinate_card_slots: coordinateImages
          .filter((row) =>
            productsForCoordinate(snapshot.products, row)
              .some((candidate) =>
                candidate.registry_key === product.registry_key))
          .map((row) => ({
            printed_name: row.printed_name,
            source_set_code: row.source_set_code,
            card_number_raw: row.card_number_raw,
            image_url: row.image_url,
          })),
        card_like_asset_urls_on_page: pageCardAssets,
        raw_snapshot_ref: snapshot.body_path,
        raw_snapshot_sha256: snapshot.metadata.body_sha256,
      });
    }
    for (const coordinate of coordinateImages) {
      const assignedProducts = productsForCoordinate(
        snapshot.products,
        coordinate,
      );
      if (assignedProducts.length !== 1) continue;
      const [product] = assignedProducts;
      coordinateFollowups.push({
        followup_key:
          `official_product_coordinate:${product.registry_key}:`
          + `${coordinate.source_set_code}:${coordinate.card_number_raw}`,
        generator_version: GENERATOR_VERSION,
        registry_key: product.registry_key,
        product_name: product.product_name,
        release_date: product.release_date,
        printed_name: coordinate.printed_name,
        source_set_code: coordinate.source_set_code,
        card_number_raw: coordinate.card_number_raw,
        page_image_url: coordinate.image_url,
        source_url: snapshot.source_url
          + (product.source_fragment ?? ''),
        raw_snapshot_ref: snapshot.body_path,
        raw_snapshot_sha256: snapshot.metadata.body_sha256,
        retrieved_at: snapshot.metadata.fetched_at,
        disposition: 'official_coordinate_search_followup_ready',
        disposition_reason:
          'official_product_image_encodes_set_and_printed_number',
      });
    }
  }

  searchFollowups.sort((left, right) =>
    left.registry_key.localeCompare(right.registry_key)
    || Number(left.official_search_product_id)
      - Number(right.official_search_product_id));
  cardAssertions.sort((left, right) =>
    left.registry_key.localeCompare(right.registry_key)
    || Number(left.source_external_id) - Number(right.source_external_id));
  coordinateFollowups.sort((left, right) =>
    left.source_set_code.localeCompare(right.source_set_code)
    || Number(left.card_number_raw) - Number(right.card_number_raw)
    || left.registry_key.localeCompare(right.registry_key));
  productResults.sort((left, right) =>
    left.registry_key.localeCompare(right.registry_key));

  const summary = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'official_product_detail_pages_adjudicated',
    manifest_fingerprint_sha256: contentFingerprint(manifest),
    source_page_count: manifest.snapshots.length,
    source_product_count: productResults.length,
    verified_product_count: new Set(
      searchFollowups.map((row) => row.registry_key),
    ).size,
    verified_search_collection_count: searchFollowups.length,
    exact_embedded_official_card_count:
      new Set(cardAssertions.map((row) => row.source_external_id)).size,
    coordinate_search_followup_count: coordinateFollowups.length,
    release_wide_search_id_exclusion_count: productResults.filter(
      (row) =>
        row.disposition === 'release_wide_search_id_not_product_specific',
    ).length,
    unresolved_product_count: productResults.filter(
      (row) => row.disposition !== 'official_search_api_followup_ready',
    ).length,
    product_results: productResults,
    boundary: {
      database_access: false,
      storage_access: false,
      production_writes: false,
      pricing_access: false,
      identity_promotions: false,
    },
  };
  await writeJson(
    path.join(
      outputRoot,
      'jpn_v5_official_product_detail_page_parse_summary_v1.json',
    ),
    summary,
  );
  await writeJsonl(
    path.join(
      outputRoot,
      'jpn_v5_official_product_detail_search_followups_v1.jsonl',
    ),
    searchFollowups,
  );
  await writeJsonl(
    path.join(
      outputRoot,
      'jpn_v5_official_product_detail_card_assertions_v1.jsonl',
    ),
    cardAssertions,
  );
  await writeJsonl(
    path.join(
      outputRoot,
      'jpn_v5_official_product_coordinate_search_followups_v1.jsonl',
    ),
    coordinateFollowups,
  );

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: summary.status,
      source_pages: summary.source_page_count,
      source_products: summary.source_product_count,
      verified_products: summary.verified_product_count,
      verified_search_collections: summary.verified_search_collection_count,
      exact_embedded_official_cards:
        summary.exact_embedded_official_card_count,
      coordinate_search_followups:
        summary.coordinate_search_followup_count,
      release_wide_exclusions:
        summary.release_wide_search_id_exclusion_count,
      unresolved_products: summary.unresolved_product_count,
      database_writes: false,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

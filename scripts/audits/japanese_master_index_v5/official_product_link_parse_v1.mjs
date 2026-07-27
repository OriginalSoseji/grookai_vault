import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-LINK-PARSE-V1';
const GENERATED_AT = '2026-07-27T05:00:00.000Z';
const LINK_ROOT =
  'docs/audits/japanese_master_index_v5/official_product_links';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/official_product_links/parsed';

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
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function stripHtml(value) {
  return decodeHtml(
    String(value ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function absoluteOfficialUrl(value) {
  return value
    ? new URL(decodeHtml(value), 'https://www.pokemon-card.com').toString()
    : null;
}

function selectedDeckCards(html) {
  const selections = new Map();
  for (const match of html.matchAll(
    /<input\b[^>]*name="deck_[^"]+"[^>]*value="(?<value>[^"]*)"/gi,
  )) {
    for (const token of match.groups.value.split('-').filter(Boolean)) {
      const [cardId, quantity, variant] = token.split('_');
      if (!/^\d+$/.test(cardId)) continue;
      const previous = selections.get(cardId);
      if (previous) {
        previous.quantity += Number(quantity);
      } else {
        selections.set(cardId, {
          card_id: cardId,
          quantity: Number(quantity),
          variant: variant ?? null,
        });
      }
    }
  }

  const displayNames = new Map();
  const printedNames = new Map();
  const images = new Map();
  for (const match of html.matchAll(
    /PCGDECK\.searchItemName\[(?<id>\d+)\]='(?<value>(?:\\'|[^'])*)';/g,
  )) {
    displayNames.set(match.groups.id, match.groups.value.replaceAll("\\'", "'"));
  }
  for (const match of html.matchAll(
    /PCGDECK\.searchItemNameAlt\[(?<id>\d+)\]='(?<value>(?:\\'|[^'])*)';/g,
  )) {
    printedNames.set(match.groups.id, match.groups.value.replaceAll("\\'", "'"));
  }
  for (const match of html.matchAll(
    /PCGDECK\.searchItemCardPict\[(?<id>\d+)\]='(?<value>[^']+)';/g,
  )) {
    images.set(match.groups.id, absoluteOfficialUrl(match.groups.value));
  }

  return [...selections.values()].map((selection) => {
    const displayName = displayNames.get(selection.card_id) ?? null;
    const coordinate = displayName?.match(
      /\((?<set>[A-Za-z0-9]+)\s+(?<number>\d+)\/(?<total>\d+)\)$/,
    );
    return {
      ...selection,
      printed_name: printedNames.get(selection.card_id)
        ?? displayName?.replace(/\([^()]+\)$/, '').trim()
        ?? null,
      display_name: displayName,
      source_set_code: coordinate?.groups?.set ?? null,
      card_number_raw: coordinate?.groups?.number ?? null,
      card_number_numerator:
        coordinate ? Number(coordinate.groups.number) : null,
      card_number_denominator:
        coordinate ? Number(coordinate.groups.total) : null,
      image_url: images.get(selection.card_id) ?? null,
    };
  }).sort((left, right) =>
    Number(left.card_id) - Number(right.card_id));
}

function starterSectionCards(html, fragment) {
  const sectionId = String(fragment ?? '').replace(/^#/, '');
  const startPattern = new RegExp(
    `<h2\\b[^>]*id="${sectionId}"[^>]*>`,
    'i',
  );
  const start = startPattern.exec(html);
  if (!start) throw new Error(`Starter section missing: ${fragment}`);
  const afterStart = start.index + start[0].length;
  const next = /<h2\b[^>]*id="V\d+"[^>]*>/gi;
  next.lastIndex = afterStart;
  const nextMatch = next.exec(html);
  const section = html.slice(
    afterStart,
    nextMatch?.index ?? html.length,
  );

  const quantities = new Map();
  for (const match of section.matchAll(
    /<td>\s*<a\b[^>]*href="#(?<anchor>[a-z]+\d+)"[^>]*>[\s\S]*?<\/a>\s*<\/td>\s*<td>(?<quantity>\d+)<\/td>/gi,
  )) {
    quantities.set(match.groups.anchor, Number(match.groups.quantity));
  }

  const cards = [];
  const heading = /<h3\b[^>]*id="(?<anchor>[a-z]+\d+)"[^>]*>(?<name>[\s\S]*?)<\/h3>/gi;
  const headings = [...section.matchAll(heading)];
  for (const [index, match] of headings.entries()) {
    const end = headings[index + 1]?.index ?? section.length;
    const cardBody = section.slice(match.index, end);
    const image = cardBody.match(
      /<img\b[^>]*src="(?<url>[^"]*\/card_images\/large\/[^"]+)"/i,
    )?.groups?.url;
    if (!image) continue;
    const cardId = image.match(
      /\/0*(?<id>\d+)_[^/]+?\.(?:jpe?g|png|webp)(?:[?#].*)?$/i,
    )?.groups?.id;
    if (!cardId) throw new Error(`Starter card id missing: ${image}`);
    cards.push({
      card_id: cardId,
      quantity: quantities.get(match.groups.anchor) ?? null,
      variant: null,
      printed_name: stripHtml(match.groups.name),
      display_name: stripHtml(match.groups.name),
      source_set_code: 'SA',
      card_number_raw: null,
      card_number_numerator: null,
      card_number_denominator: null,
      image_url: absoluteOfficialUrl(image),
    });
  }
  return cards;
}

function assertionFor({
  card,
  product,
  snapshot,
  parserLane,
}) {
  return {
    assertion_key:
      `official_jp_product_link:${product.registry_key}:${card.card_id}`,
    assertion_version: GENERATOR_VERSION,
    source_id: 'official_jp_product_link',
    source_family: 'pokemon_card_official_jp',
    source_kind: 'official_product_card_list',
    source_external_id: card.card_id,
    source_url: snapshot.source_url
      + (product.source_fragment ?? ''),
    source_container_id: product.registry_key,
    source_product_id: product.registry_key,
    registry_key: product.registry_key,
    language: 'ja',
    printed_name: card.printed_name,
    card_number_raw: card.card_number_raw,
    card_number_numerator: card.card_number_numerator,
    card_number_denominator: card.card_number_denominator,
    source_set_code: card.source_set_code,
    unnumbered_label: card.card_number_raw
      ? null
      : `official_card_id:${card.card_id}`,
    identity_modifiers: [
      `official_product:${product.registry_key}`,
      `official_card_id:${card.card_id}`,
    ],
    image_urls: [card.image_url].filter(Boolean),
    source_product_name: product.product_name,
    source_fields: {
      parser_lane: parserLane,
      deck_quantity: card.quantity,
      deck_variant: card.variant,
      display_name: card.display_name,
      image_reference_only: true,
    },
    raw_snapshot_ref: snapshot.body_path,
    raw_snapshot_sha256: snapshot.metadata.body_sha256,
    retrieved_at: snapshot.metadata.fetched_at,
  };
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

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }
  const manifest = JSON.parse(fs.readFileSync(
    path.join(
      LINK_ROOT,
      'jpn_v5_official_product_link_snapshot_manifest_v1.json',
    ),
    'utf8',
  ));

  const assertions = [];
  const productResults = [];
  const followups = [];
  for (const snapshot of manifest.snapshots) {
    const html = fs.readFileSync(snapshot.body_path, 'utf8');
    if (new URL(snapshot.source_url).pathname === '/deck/deck.html') {
      const cards = selectedDeckCards(html);
      if (snapshot.products.length !== 1 || cards.length === 0) {
        throw new Error(`Deck parse contract failed: ${snapshot.source_url}`);
      }
      const product = snapshot.products[0];
      assertions.push(...cards.map((card) => assertionFor({
        card,
        product,
        snapshot,
        parserLane: 'official_deck_builder',
      })));
      productResults.push({
        registry_key: product.registry_key,
        parser_lane: 'official_deck_builder',
        unique_card_identity_count: cards.length,
        physical_card_count: cards.reduce(
          (sum, card) => sum + card.quantity,
          0,
        ),
        numbered_card_count:
          cards.filter((card) => card.card_number_raw).length,
      });
      continue;
    }
    if (new URL(snapshot.source_url).pathname === '/products/s/sa.html') {
      for (const product of snapshot.products) {
        const cards = starterSectionCards(
          html,
          product.source_fragment,
        );
        assertions.push(...cards.map((card) => assertionFor({
          card,
          product,
          snapshot,
          parserLane: 'official_static_starter_page',
        })));
        productResults.push({
          registry_key: product.registry_key,
          parser_lane: 'official_static_starter_page',
          unique_card_identity_count: cards.length,
          physical_card_count: cards.reduce(
            (sum, card) => sum + (card.quantity ?? 0),
            0,
          ),
          numbered_card_count: 0,
        });
      }
      continue;
    }
    const productId = html.match(
      /\/card-search\/index\.php\?[^"]*\bpg=(?<id>\d+)/i,
    )?.groups?.id;
    for (const product of snapshot.products) {
      followups.push({
        registry_key: product.registry_key,
        source_url: snapshot.source_url,
        official_search_product_id: productId ?? null,
        disposition: productId
          ? 'official_search_api_followup_ready'
          : 'official_page_requires_manual_parser',
      });
    }
  }

  assertions.sort((left, right) =>
    left.registry_key.localeCompare(right.registry_key)
    || Number(left.source_external_id) - Number(right.source_external_id));
  productResults.sort((left, right) =>
    left.registry_key.localeCompare(right.registry_key));
  followups.sort((left, right) =>
    left.registry_key.localeCompare(right.registry_key));

  const report = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'official_product_card_lists_parsed',
    parsed_product_count: productResults.length,
    assertion_count: assertions.length,
    unique_official_card_id_count:
      new Set(assertions.map((row) => row.source_external_id)).size,
    numbered_assertion_count:
      assertions.filter((row) => row.card_number_raw).length,
    governed_unnumbered_assertion_count:
      assertions.filter((row) => row.unnumbered_label).length,
    parser_lane_counts: countBy(productResults, 'parser_lane'),
    followup_count: followups.length,
    physical_quantity_is_identity_count: false,
    boundary: {
      source_fetches: false,
      database_access: false,
      storage_access: false,
      production_writes: false,
      source_evidence_replaced: false,
    },
    next_gate:
      'resolve_official_card_ids_and_images_against_v4_working_index',
  };

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });
  const paths = {
    assertions: path.join(
      outputRoot,
      'jpn_v5_official_product_link_card_assertions_v1.jsonl',
    ),
    productResults: path.join(
      outputRoot,
      'jpn_v5_official_product_link_parse_results_v1.jsonl',
    ),
    followups: path.join(
      outputRoot,
      'jpn_v5_official_product_link_followups_v1.jsonl',
    ),
    report: path.join(
      outputRoot,
      'jpn_v5_official_product_link_parse_report_v1.json',
    ),
  };
  await writeJsonl(paths.assertions, assertions);
  await writeJsonl(paths.productResults, productResults);
  await writeJsonl(paths.followups, followups);
  await writeJson(paths.report, report);
  const proofs = {};
  for (const [key, filePath] of Object.entries(paths)) {
    proofs[key] = await fileProof(filePath);
  }
  await writeJson(
    path.join(
      outputRoot,
      'jpn_v5_official_product_link_parse_fingerprints_v1.json',
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

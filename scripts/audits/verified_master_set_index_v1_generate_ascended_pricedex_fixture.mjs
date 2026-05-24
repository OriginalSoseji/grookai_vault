#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const PRICEDEX_URL = 'https://www.thepricedex.com/set/me2pt5/ascended-heroes/price-list';
const OUTPUT_FILE = 'docs/audits/verified_master_set_index_v1/source_fixtures/ascended_heroes/pricedex_tcgplayer_bulk_sources.generated.json';

const FINISH_BY_VARIANT = new Map([
  ['normal', 'normal'],
  ['holofoil', 'holo'],
  ['reverseHolofoil', 'reverse'],
  ['cosmosHolofoil', 'cosmos'],
]);

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    outputFile: args.includes('--output-file')
      ? args[args.indexOf('--output-file') + 1]
      : OUTPUT_FILE,
  };
}

function extractNextData(html) {
  const match = html.match(/id="__NEXT_DATA__" type="application\/json">(?<json>.*?)<\/script>/s);
  if (!match?.groups?.json) throw new Error('Unable to find __NEXT_DATA__ in ThePriceDex page.');
  return JSON.parse(match.groups.json);
}

function variantParam(purchaseUrl) {
  try {
    return new URL(purchaseUrl).searchParams.get('variant') ?? '';
  } catch {
    return '';
  }
}

function finishForVariant(variant) {
  const marketplace = variant.marketplaces?.find((entry) => entry.name === 'tcgplayer');
  const queryVariant = variantParam(marketplace?.purchaseUrl);
  if (queryVariant === 'rocketReverseHolofoil') return 'rocket_reverse';
  if (queryVariant && /ballReverseHolofoil$/i.test(queryVariant)) return 'pokeball';
  return FINISH_BY_VARIANT.get(variant.name) ?? null;
}

function paddedNumber(value) {
  return String(value).padStart(3, '0');
}

function tcgplayerUrl(productId) {
  return `https://www.tcgplayer.com/product/${productId}`;
}

function evidenceLabel(source, card, finishKey, productId = null) {
  const number = paddedNumber(card.number);
  if (source === 'pricedex') {
    return `ThePriceDex exact variant index identifies ${card.name} #${number}/217 with ${finishKey} finish.`;
  }
  return `TCGplayer marketplace product ${productId} is linked for ${card.name} #${number}/217 with ${finishKey} finish.`;
}

function buildRecords(cards) {
  const records = [];

  for (const card of cards) {
    for (const variant of card.variants ?? []) {
      const finishKey = finishForVariant(variant);
      if (!finishKey) continue;

      const tcgplayer = variant.marketplaces?.find((entry) => entry.name === 'tcgplayer');
      if (!tcgplayer?.productId) {
        throw new Error(`Missing TCGplayer productId for ${card.number} ${card.name} ${variant.name}`);
      }

      const common = {
        set_name: 'Ascended Heroes',
        card_number: paddedNumber(card.number),
        card_name: card.name,
        finish_key: finishKey,
        rarity: card.rarity ?? null,
        evidence_type: 'finish_presence',
      };

      records.push({
        source_key: 'pricedex_ascended_heroes_variant_index',
        source_kind: 'marketplace_checklist',
        source_url: PRICEDEX_URL,
        ...common,
        evidence_label: evidenceLabel('pricedex', card, finishKey),
        notes: 'Generated from ThePriceDex embedded exact card variant index. No page dump stored.',
      });

      records.push({
        source_key: `tcgplayer_product_${tcgplayer.productId}`,
        source_kind: 'marketplace_checklist',
        source_url: tcgplayerUrl(tcgplayer.productId),
        ...common,
        evidence_label: evidenceLabel('tcgplayer', card, finishKey, tcgplayer.productId),
        notes: 'Generated from ThePriceDex marketplace metadata linking the exact variant to a TCGplayer product ID.',
      });
    }
  }

  return records;
}

function summarize(records) {
  const counts = new Map();
  for (const record of records) {
    counts.set(record.finish_key, (counts.get(record.finish_key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort().map(([key, count]) => [key, count / 2]));
}

async function main() {
  const options = parseArgs();
  const response = await fetch(PRICEDEX_URL, { headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error(`ThePriceDex fetch failed: ${response.status} ${response.statusText}`);
  const data = extractNextData(await response.text());
  const cards = data?.props?.pageProps?.initialCards ?? [];
  const records = buildRecords(cards);
  const fixture = {
    fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
    source_key: 'pricedex_tcgplayer_ascended_heroes_bulk_sources',
    source_kind: 'marketplace_checklist',
    source_url: PRICEDEX_URL,
    source_status: 'available_generated',
    set_key: 'ascended_heroes',
    set_name: 'Ascended Heroes',
    retrieved_at: new Date().toISOString(),
    raw_snapshot_ref: 'generated_fixture:no_page_dump',
    generation_note: 'Generated exact rows from ThePriceDex card variant index and its linked TCGplayer product IDs. Review source URLs before relying on cleanup.',
    records,
  };

  const summary = summarize(records);
  if (options.dryRun) {
    console.log(JSON.stringify({ records: records.length, finish_counts: summary }, null, 2));
    return;
  }

  await fs.mkdir(path.dirname(options.outputFile), { recursive: true });
  await fs.writeFile(options.outputFile, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(JSON.stringify({ output_file: options.outputFile, records: records.length, finish_counts: summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

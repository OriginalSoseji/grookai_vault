import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  buildArtifact,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-DETAIL-SEARCH-PLAN-V1';
const GENERATED_AT = '2026-07-27T21:15:00.000Z';
const FOLLOWUPS =
  'docs/audits/japanese_master_index_v5/official_product_detail_pages/parsed/'
  + 'jpn_v5_official_product_detail_search_followups_v1.jsonl';
const DEFAULT_OUTPUT =
  'docs/audits/japanese_master_index_v5/official_product_detail_search/'
  + 'jpn_v5_official_product_detail_search_plan_v1.json';

function parseArgs(argv) {
  const result = { output: DEFAULT_OUTPUT, quiet: false };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output=')) {
      result.output = value.slice('--output='.length);
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

async function main() {
  const args = parseArgs(process.argv);
  const output = path.resolve(args.output);
  const canonical = path.resolve(DEFAULT_OUTPUT);
  if (output !== canonical
      && !output.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const workItems = readJsonl(FOLLOWUPS)
    .map((row) => ({
      acquisition_tier: 1,
      card_detail_strategy: 'official_card_search_pagination_and_detail',
      checkpoint_key:
        `official_jp_cards:${row.official_search_product_id}`,
      disposition: 'scheduled',
      disposition_reason: row.disposition_reason,
      lane_id: 'official_jp_cards',
      live_parent_rows: 0,
      live_public_rows: 0,
      max_concurrency: 1,
      registry_key: row.registry_key,
      registry_scope_status: 'admitted_official_card_product',
      request_delay_ms: 750,
      source_assertion_key:
        `official_jp_product_detail_search:`
        + `${row.registry_key}:${row.official_search_product_id}`,
      source_container_id: row.official_search_product_id,
      source_container_url: row.source_url,
      source_expected_card_count: null,
      source_family: 'pokemon_card_official_jp',
      source_native_code: null,
      source_native_japanese_name: row.product_name,
      source_native_name: row.product_name,
      source_release_date: row.release_date,
      strategy: 'official_card_search_container',
      work_item_key: row.followup_key,
    }))
    .sort((left, right) =>
      Number(left.source_container_id) - Number(right.source_container_id));

  const artifact = buildArtifact({
    packageId: GENERATOR_VERSION,
    generatedAt: GENERATED_AT,
    retrieval: {
      mode: 'offline_plan',
      source_followup_path: FOLLOWUPS,
    },
    content: {
      generator_version: GENERATOR_VERSION,
      contract:
        'Only product-specific numeric search collections adjudicated from '
        + 'preserved official Japanese product pages are scheduled.',
      work_items: workItems,
      execution_boundary: {
        database_reads: false,
        database_writes: false,
        source_fetches: false,
        storage_writes: false,
        plan_only: true,
      },
    },
  });
  await fsp.mkdir(path.dirname(output), { recursive: true });
  await fsp.writeFile(output, stableJson(artifact));

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: 'official_product_detail_search_plan_ready',
      work_item_count: workItems.length,
      product_count: new Set(
        workItems.map((row) => row.registry_key),
      ).size,
      search_collection_ids:
        workItems.map((row) => row.source_container_id),
      database_writes: false,
      source_fetches: false,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  buildArtifact,
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-SEARCH-PLAN-V1';
const GENERATED_AT = '2026-07-27T07:00:00.000Z';
const DEFAULT_OUTPUT =
  'docs/audits/japanese_master_index_v5/official_product_search/'
  + 'jpn_v5_official_product_search_plan_v1.json';
const FOLLOWUPS =
  'docs/audits/japanese_master_index_v5/official_product_links/parsed/'
  + 'jpn_v5_official_product_link_followups_v1.jsonl';
const V4_PLAN =
  'docs/audits/japanese_master_index_v4/cards/card_acquisition_plan_v1.json';

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

function readVerifiedArtifact(filePath) {
  const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
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

  const v4Plan = readVerifiedArtifact(V4_PLAN);
  const v4ByRegistryKey = new Map(
    v4Plan.content.work_items
      .filter((row) => row.lane_id === 'official_jp_cards')
      .map((row) => [row.registry_key, row]),
  );
  const followups = readJsonl(FOLLOWUPS)
    .filter((row) =>
      row.disposition === 'official_search_api_followup_ready')
    .sort((left, right) =>
      left.registry_key.localeCompare(right.registry_key));

  const workItems = followups.map((followup) => {
    const prior = v4ByRegistryKey.get(followup.registry_key);
    if (!prior) {
      throw new Error(
        `V4 official work item missing: ${followup.registry_key}`,
      );
    }
    if (!/^\d+$/.test(followup.official_search_product_id)) {
      throw new Error(
        `Invalid official product ID: ${followup.official_search_product_id}`,
      );
    }
    return {
      ...prior,
      source_container_id: followup.official_search_product_id,
      source_container_url: followup.source_url,
      source_assertion_key:
        `official_jp_product_search:${followup.official_search_product_id}`,
      checkpoint_key:
        `official_jp_cards:${followup.official_search_product_id}`,
      disposition: 'scheduled',
      disposition_reason:
        'v5_verified_official_search_product_id_from_product_page',
      request_delay_ms: 750,
      original_v4_source_container_id: prior.source_container_id,
      v5_followup_disposition: followup.disposition,
    };
  });

  const content = {
    generator_version: GENERATOR_VERSION,
    contract:
      'Governed official products with verified numeric search IDs are '
      + 'queried through the existing read-only Official JP card adapter.',
    work_items: workItems,
    execution_boundary: {
      database_reads: false,
      database_writes: false,
      source_fetches: false,
      storage_writes: false,
      plan_only: true,
    },
  };
  const artifact = buildArtifact({
    packageId: GENERATOR_VERSION,
    generatedAt: GENERATED_AT,
    retrieval: {
      mode: 'offline_plan',
      source_followup_path: FOLLOWUPS,
      source_v4_plan_path: V4_PLAN,
    },
    content,
  });
  await fsp.mkdir(path.dirname(output), { recursive: true });
  await fsp.writeFile(output, stableJson(artifact));

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: 'official_product_search_plan_ready',
      work_item_count: workItems.length,
      product_ids: workItems.map((row) => row.source_container_id),
      database_writes: false,
      source_fetches: false,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

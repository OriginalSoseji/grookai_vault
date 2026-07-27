#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildArtifact,
  contentFingerprint,
  sha256,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

const GENERATOR_VERSION = 'JPN-MASTER-INDEX-CARD-ACQUISITION-PLAN-V1';
const ROOT = path.resolve('docs/audits/japanese_master_index_v4');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'cards');
const DEFAULT_SET_ASSERTIONS_PATH = path.join(
  ROOT,
  'sets',
  'source_set_assertions_v1.json',
);
const DEFAULT_REGISTRY_PATH = path.join(
  ROOT,
  'sets',
  'jpn_set_registry_v1.json',
);
const DEFAULT_POLICY_PATH = path.join(ROOT, 'sets', 'source_policy_v1.json');
const DEFAULT_OFFICIAL_SCOPE_PATH = path.join(
  ROOT,
  'sets',
  'jpn_official_product_scope_v1.json',
);
const DEFAULT_BASELINE_MANIFEST_PATH = path.join(
  ROOT,
  'baseline',
  'live_jpn_source_manifest_v1.json',
);

const SOURCE_LANES = Object.freeze([
  {
    lane_id: 'official_jp_cards',
    source_set_id: 'official_jp_products',
    source_family: 'pokemon_card_official_jp',
    independence_group: 'official_pokemon_japan',
    authority_class: 'primary_official',
    acquisition_tier: 1,
    strategy: 'official_card_search_container',
    card_detail_strategy: 'official_card_search_pagination_and_detail',
    request_delay_ms: 500,
    max_concurrency: 1,
    automatic_status: 'admitted_bounded',
    work_scope: 'official_card_list_linked_only',
  },
  {
    lane_id: 'tcgdex_ja_cards',
    source_set_id: 'tcgdex_ja_sets',
    source_family: 'tcgdex_ja',
    independence_group: 'tcgdex_open_source_api',
    authority_class: 'structured_community_api',
    acquisition_tier: 1,
    strategy: 'tcgdex_set_then_card_details',
    card_detail_strategy: 'bounded_cached_api_get',
    request_delay_ms: 125,
    max_concurrency: 2,
    automatic_status: 'admitted_bounded',
    work_scope: 'all_mapped_release_assertions',
  },
  {
    lane_id: 'limitless_jp_cards',
    source_set_id: 'limitless_jp_sets',
    source_family: 'limitless_tcg_jp',
    independence_group: 'limitless_collector_database',
    authority_class: 'structured_collector_database',
    acquisition_tier: 1,
    strategy: 'limitless_japanese_set_checklist',
    card_detail_strategy: 'set_page_rows_first',
    request_delay_ms: 750,
    max_concurrency: 1,
    automatic_status: 'admitted_bounded',
    work_scope: 'all_mapped_release_assertions',
  },
  {
    lane_id: 'artofpkm_jp_cards',
    source_set_id: 'artofpkm_jp_sets',
    source_family: 'artofpkm_jp',
    independence_group: 'artofpkm_collector_archive',
    authority_class: 'collector_archive',
    acquisition_tier: 1,
    strategy: 'artofpkm_set_checklist',
    card_detail_strategy: 'set_page_rows_first',
    request_delay_ms: 750,
    max_concurrency: 1,
    automatic_status: 'admitted_bounded',
    work_scope: 'all_mapped_release_assertions',
  },
  {
    lane_id: 'tcgcollector_jp_manual',
    source_set_id: 'tcgcollector_jp_sets',
    source_family: 'tcgcollector_jp',
    independence_group: 'tcgcollector_collector_database',
    authority_class: 'structured_collector_database',
    acquisition_tier: 2,
    strategy: 'manual_review_only',
    card_detail_strategy: 'none',
    request_delay_ms: null,
    max_concurrency: 0,
    automatic_status: 'blocked_without_written_permission',
    work_scope: 'preserved_evidence_and_manual_review_only',
  },
  {
    lane_id: 'serebii_jp_cards',
    source_set_id: 'serebii_jp_sets',
    source_family: 'serebii_jp',
    independence_group: 'serebii_editorial_archive',
    authority_class: 'editorial_checklist',
    acquisition_tier: 2,
    strategy: 'serebii_set_checklist',
    card_detail_strategy: 'set_page_rows_first',
    request_delay_ms: 1000,
    max_concurrency: 1,
    automatic_status: 'admitted_bounded',
    work_scope: 'all_mapped_release_assertions',
  },
  {
    lane_id: 'bulbapedia_jp_card_lists',
    source_set_id: 'bulbapedia_jp_expansions',
    source_family: 'bulbapedia_jp_card_list',
    preserved_source_keys: [
      'bulbapedia_jp_card_list',
      'bulbapedia_pikachu_tcg',
    ],
    independence_group: 'bulbapedia_community_wiki',
    authority_class: 'community_reference',
    acquisition_tier: 2,
    strategy: 'bulbapedia_card_list_article',
    card_detail_strategy: 'article_tables_only',
    request_delay_ms: 5000,
    max_concurrency: 1,
    automatic_status: 'admitted_targeted',
    work_scope: 'mapped_historical_and_gap_targets',
  },
  {
    lane_id: 'pokeguardian_release_reports',
    source_set_id: 'pokeguardian_jp_sets',
    source_family: 'pokeguardian_jp',
    independence_group: 'pokeguardian_editorial_reporting',
    authority_class: 'release_report',
    acquisition_tier: 2,
    strategy: 'pokeguardian_release_articles',
    card_detail_strategy: 'article_assertions_only',
    request_delay_ms: 1500,
    max_concurrency: 1,
    automatic_status: 'admitted_targeted',
    work_scope: 'main_list_and_gap_articles_only',
  },
  {
    lane_id: 'pokellector_jp_manual',
    source_set_id: 'pokellector_jp_sets',
    source_family: 'pokellector_jp',
    independence_group: 'pokellector_collector_database',
    authority_class: 'collector_database',
    acquisition_tier: 2,
    strategy: 'manual_review_only',
    card_detail_strategy: 'none',
    request_delay_ms: null,
    max_concurrency: 0,
    automatic_status: 'blocked_without_written_permission',
    work_scope: 'manual_evidence_preservation_only',
  },
]);

const NON_REGISTRY_LANES = Object.freeze([
  {
    lane_id: 'historical_distribution_archives',
    source_family: 'historical_distribution_archives',
    independence_group: 'historical_primary_and_editorial_archives',
    authority_class: 'mixed_historical_evidence',
    acquisition_tier: 3,
    automatic_status: 'gap_targeted_after_primary_harvest',
    work_scope:
      'deck_product_campaign_tournament_magazine_movie_vending_gap_targets',
  },
  {
    lane_id: 'bounded_marketplace_review',
    source_family: 'bounded_marketplace_review',
    independence_group: 'marketplace_listing_evidence',
    authority_class: 'corroborating_marketplace_evidence',
    acquisition_tier: 3,
    automatic_status: 'gap_targeted_after_primary_harvest',
    work_scope: 'unresolved_historical_identity_only',
  },
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    outputDir: DEFAULT_OUTPUT_DIR,
    generatedAt: new Date().toISOString(),
    setAssertionsPath: DEFAULT_SET_ASSERTIONS_PATH,
    registryPath: DEFAULT_REGISTRY_PATH,
    policyPath: DEFAULT_POLICY_PATH,
    officialScopePath: DEFAULT_OFFICIAL_SCOPE_PATH,
    baselineManifestPath: DEFAULT_BASELINE_MANIFEST_PATH,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output-dir' && argv[index + 1]) {
      options.outputDir = path.resolve(argv[++index]);
    } else if (token === '--generated-at' && argv[index + 1]) {
      options.generatedAt = new Date(argv[++index]).toISOString();
    } else {
      throw new Error(`Unknown or incomplete argument: ${token}`);
    }
  }
  return options;
}

async function readArtifactContent(artifactPath) {
  const raw = await fs.readFile(artifactPath, 'utf8');
  const artifact = JSON.parse(raw);
  if (
    artifact.content_fingerprint_sha256 !== contentFingerprint(artifact.content)
  ) {
    throw new Error(`Artifact fingerprint mismatch: ${artifactPath}`);
  }
  return {
    artifact,
    content: artifact.content,
    sha256: sha256(raw),
  };
}

function assertionKey(row) {
  return `${row.source_id}:${row.source_set_id}`;
}

function workItemKey(lane, assertion, registryKey) {
  return contentFingerprint({
    lane_id: lane.lane_id,
    source_assertion_key: assertionKey(assertion),
    registry_key: registryKey,
  });
}

function buildRegistryAssertionMap(registryEntries) {
  const map = new Map();
  for (const entry of registryEntries) {
    for (const key of entry.source_assertion_keys ?? []) {
      if (map.has(key)) {
        throw new Error(
          `Source assertion maps to multiple registry rows: ${key}`,
        );
      }
      map.set(key, entry);
    }
  }
  return map;
}

function buildPolicyMap(policies) {
  return new Map(policies.map((row) => [row.source_id, row]));
}

function buildOfficialScopeMap(products) {
  return new Map(products.map((row) => [row.source_assertion_key, row]));
}

function planDisposition({ lane, assertion, registryEntry, officialScope }) {
  if (lane.automatic_status === 'blocked_without_written_permission') {
    return {
      disposition: 'manual_review_only',
      reason: 'source_terms_block_automated_access',
    };
  }
  if (!registryEntry) {
    return {
      disposition: 'blocked',
      reason: 'source_assertion_not_mapped_to_registry',
    };
  }
  if (
    registryEntry.scope_status === 'baseline_only' ||
    !String(registryEntry.scope_status ?? '').startsWith('admitted_')
  ) {
    return {
      disposition: 'not_scheduled',
      reason: `registry_scope:${registryEntry.scope_status ?? 'unknown'}`,
    };
  }
  if (lane.source_set_id === 'official_jp_products') {
    if (officialScope?.source_scope_disposition !== 'card_list_linked') {
      return {
        disposition: 'release_context_only',
        reason: `official_scope:${officialScope?.source_scope_disposition ?? 'missing'}`,
      };
    }
  }
  if (lane.automatic_status === 'admitted_targeted') {
    return {
      disposition: 'targeted_after_primary_delta',
      reason: lane.work_scope,
    };
  }
  return {
    disposition: 'scheduled',
    reason: lane.work_scope,
  };
}

export function buildCardAcquisitionPlan({
  setAssertions,
  registryEntries,
  policies,
  officialProducts,
  storedSources,
}) {
  const assertionMap = buildRegistryAssertionMap(registryEntries);
  const policyMap = buildPolicyMap(policies);
  const officialScopeMap = buildOfficialScopeMap(officialProducts);
  const assertionsBySource = new Map();
  for (const assertion of setAssertions) {
    if (!assertionsBySource.has(assertion.source_id)) {
      assertionsBySource.set(assertion.source_id, []);
    }
    assertionsBySource.get(assertion.source_id).push(assertion);
  }

  const workItems = [];
  const sourceInventory = [];
  for (const lane of SOURCE_LANES) {
    const assertions = assertionsBySource.get(lane.source_set_id) ?? [];
    const policy = policyMap.get(lane.source_set_id) ?? null;
    const laneItems = assertions.map((assertion) => {
      const sourceAssertionKey = assertionKey(assertion);
      const registryEntry = assertionMap.get(sourceAssertionKey) ?? null;
      const officialScope = officialScopeMap.get(sourceAssertionKey) ?? null;
      const disposition = planDisposition({
        lane,
        assertion,
        registryEntry,
        officialScope,
      });
      return {
        work_item_key: workItemKey(
          lane,
          assertion,
          registryEntry?.registry_key ?? null,
        ),
        lane_id: lane.lane_id,
        source_family: lane.source_family,
        source_assertion_key: sourceAssertionKey,
        source_container_id: assertion.source_set_id,
        source_container_url: assertion.source_url,
        source_native_code: assertion.source_native_code,
        source_native_name: assertion.source_native_name,
        source_native_japanese_name: assertion.source_native_japanese_name,
        source_expected_card_count: assertion.source_expected_card_count,
        source_release_date: assertion.source_release_date,
        registry_key: registryEntry?.registry_key ?? null,
        registry_scope_status: registryEntry?.scope_status ?? null,
        live_parent_rows: registryEntry?.live_parent_rows ?? 0,
        live_public_rows: registryEntry?.live_public_rows ?? 0,
        disposition: disposition.disposition,
        disposition_reason: disposition.reason,
        acquisition_tier: lane.acquisition_tier,
        strategy: lane.strategy,
        card_detail_strategy: lane.card_detail_strategy,
        request_delay_ms: lane.request_delay_ms,
        max_concurrency: lane.max_concurrency,
        checkpoint_key: `${lane.lane_id}:${assertion.source_set_id}`,
      };
    });
    workItems.push(...laneItems);

    const dispositionCounts = {};
    for (const item of laneItems) {
      dispositionCounts[item.disposition] =
        (dispositionCounts[item.disposition] ?? 0) + 1;
    }
    const preservedSourceKeys = lane.preserved_source_keys ?? [
      lane.source_family,
    ];
    const stored = storedSources.filter((row) =>
      preservedSourceKeys.includes(row.source_key),
    );
    sourceInventory.push({
      ...lane,
      preserved_source_keys: preservedSourceKeys,
      source_policy: policy,
      set_assertion_count: assertions.length,
      work_item_count: laneItems.length,
      disposition_counts: dispositionCounts,
      preserved_live_evidence_rows: stored.reduce(
        (sum, row) => sum + row.evidence_rows,
        0,
      ),
      preserved_live_card_rows: stored.reduce(
        (sum, row) => sum + row.card_rows,
        0,
      ),
      preservation_rule:
        'Fresh acquisition is unioned with preserved evidence; source loss never resets prior evidence.',
    });
  }

  for (const lane of NON_REGISTRY_LANES) {
    sourceInventory.push({
      ...lane,
      source_policy: null,
      set_assertion_count: 0,
      work_item_count: 0,
      disposition_counts: {
        [lane.automatic_status]: 1,
      },
      preserved_live_evidence_rows: 0,
      preserved_live_card_rows: 0,
      preservation_rule:
        'Evidence is added only for deterministic residual targets and never replaces primary-source assertions.',
    });
  }

  workItems.sort(
    (left, right) =>
      left.acquisition_tier - right.acquisition_tier ||
      left.lane_id.localeCompare(right.lane_id) ||
      left.source_assertion_key.localeCompare(right.source_assertion_key),
  );
  sourceInventory.sort(
    (left, right) =>
      left.acquisition_tier - right.acquisition_tier ||
      left.lane_id.localeCompare(right.lane_id),
  );

  const dispositionCounts = {};
  for (const item of workItems) {
    dispositionCounts[item.disposition] =
      (dispositionCounts[item.disposition] ?? 0) + 1;
  }
  const representedKeys = new Set(
    workItems.map((row) => row.source_assertion_key),
  );
  const expectedKeys = new Set(
    SOURCE_LANES.flatMap((lane) =>
      (assertionsBySource.get(lane.source_set_id) ?? []).map(assertionKey),
    ),
  );
  const missingRepresentations = [...expectedKeys]
    .filter((key) => !representedKeys.has(key))
    .sort();

  return {
    generator_version: GENERATOR_VERSION,
    contract:
      'Every card-capable release assertion receives a scheduled, targeted, blocked, release-context-only, or manual-review disposition.',
    execution_boundary: {
      database_reads: false,
      database_writes: false,
      storage_writes: false,
      source_fetches: false,
      plan_only: true,
    },
    summary: {
      source_lane_count: sourceInventory.length,
      registry_backed_lane_count: SOURCE_LANES.length,
      independent_source_group_count: new Set(
        sourceInventory.map((row) => row.independence_group),
      ).size,
      work_item_count: workItems.length,
      represented_source_assertion_count: representedKeys.size,
      expected_source_assertion_count: expectedKeys.size,
      missing_source_assertion_representation_count:
        missingRepresentations.length,
      disposition_counts: Object.entries(dispositionCounts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([disposition, count]) => ({ disposition, count })),
      preserved_live_evidence_rows: storedSources.reduce(
        (sum, row) => sum + Number(row.evidence_rows ?? 0),
        0,
      ),
      preserved_live_card_rows_sum: storedSources.reduce(
        (sum, row) => sum + Number(row.card_rows ?? 0),
        0,
      ),
    },
    source_inventory: sourceInventory,
    work_items: workItems,
    missing_source_assertion_representations: missingRepresentations,
  };
}

function markdown(plan) {
  const lines = [
    '# Japanese Master Index V4 Card Acquisition Plan',
    '',
    `Generator: \`${plan.generator_version}\``,
    '',
    'This is a deterministic, no-fetch, no-database-write plan. It does not promote card identities.',
    '',
    '## Summary',
    '',
    '| Measure | Count |',
    '| --- | ---: |',
    `| Source lanes | ${plan.summary.source_lane_count.toLocaleString('en-US')} |`,
    `| Independent source groups | ${plan.summary.independent_source_group_count.toLocaleString('en-US')} |`,
    `| Registry-backed work items | ${plan.summary.work_item_count.toLocaleString('en-US')} |`,
    `| Preserved live evidence rows | ${plan.summary.preserved_live_evidence_rows.toLocaleString('en-US')} |`,
    `| Missing assertion dispositions | ${plan.summary.missing_source_assertion_representation_count.toLocaleString('en-US')} |`,
    '',
    '## Source Lanes',
    '',
    '| Tier | Lane | Authority | Set assertions | Preserved rows | Dispositions |',
    '| ---: | --- | --- | ---: | ---: | --- |',
  ];
  for (const lane of plan.source_inventory) {
    lines.push(
      `| ${lane.acquisition_tier} | ${lane.lane_id} | ${lane.authority_class} | ${lane.set_assertion_count.toLocaleString('en-US')} | ${lane.preserved_live_evidence_rows.toLocaleString('en-US')} | ${Object.entries(
        lane.disposition_counts,
      )
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')} |`,
    );
  }
  lines.push(
    '',
    '## Guardrails',
    '',
    '- Pokellector remains manual-only without written permission.',
    '- Fresh source loss cannot remove preserved evidence.',
    '- Editorial and marketplace lanes are targeted after primary-source deltas, not bulk-crawled.',
    '- Every adapter must preserve raw snapshots and replay offline before its assertions enter the union.',
    '- This plan contains no database credentials and performs no network requests.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

export async function runCardAcquisitionPlan(options) {
  const [
    setAssertionsArtifact,
    registryArtifact,
    policyArtifact,
    officialScopeArtifact,
    baselineManifestArtifact,
  ] = await Promise.all([
    readArtifactContent(options.setAssertionsPath),
    readArtifactContent(options.registryPath),
    readArtifactContent(options.policyPath),
    readArtifactContent(options.officialScopePath),
    readArtifactContent(options.baselineManifestPath),
  ]);
  const plan = buildCardAcquisitionPlan({
    setAssertions: setAssertionsArtifact.content.assertions,
    registryEntries: registryArtifact.content.registry_entries,
    policies: policyArtifact.content.policies,
    officialProducts: officialScopeArtifact.content.products,
    storedSources: baselineManifestArtifact.content.stored_sources,
  });
  const retrieval = {
    mode: 'offline_plan',
    generator_version: GENERATOR_VERSION,
    dependencies: [
      options.setAssertionsPath,
      options.registryPath,
      options.policyPath,
      options.officialScopePath,
      options.baselineManifestPath,
    ].map((dependencyPath, index) => ({
      path: dependencyPath.replaceAll('\\', '/'),
      sha256: [
        setAssertionsArtifact,
        registryArtifact,
        policyArtifact,
        officialScopeArtifact,
        baselineManifestArtifact,
      ][index].sha256,
    })),
  };
  const artifact = buildArtifact({
    packageId: GENERATOR_VERSION,
    generatedAt: options.generatedAt,
    retrieval,
    content: plan,
  });
  await fs.mkdir(options.outputDir, { recursive: true });
  const jsonResult = await writeJsonArtifact(
    path.join(options.outputDir, 'card_acquisition_plan_v1.json'),
    artifact,
  );
  const markdownPath = path.join(
    options.outputDir,
    'card_acquisition_plan_v1.md',
  );
  await fs.writeFile(markdownPath, markdown(plan), 'utf8');
  const manifestContent = {
    generator_version: GENERATOR_VERSION,
    plan_path: jsonResult.path,
    plan_sha256: jsonResult.sha256,
    plan_content_fingerprint_sha256: jsonResult.content_fingerprint_sha256,
    markdown_path: markdownPath.replaceAll('\\', '/'),
    markdown_sha256: sha256(await fs.readFile(markdownPath)),
    dependency_fingerprints: retrieval.dependencies,
  };
  const manifest = buildArtifact({
    packageId: `${GENERATOR_VERSION}-MANIFEST`,
    generatedAt: options.generatedAt,
    retrieval: { mode: 'offline_plan_manifest' },
    content: manifestContent,
  });
  await writeJsonArtifact(
    path.join(options.outputDir, 'card_acquisition_plan_manifest_v1.json'),
    manifest,
  );
  return { plan, artifact, manifest };
}

async function main() {
  const options = parseArgs();
  const result = await runCardAcquisitionPlan(options);
  console.log(
    `[jpn-master-index][cards-plan] work_items=${result.plan.summary.work_item_count}`,
  );
  console.log(
    `[jpn-master-index][cards-plan] preserved_evidence=${result.plan.summary.preserved_live_evidence_rows}`,
  );
  console.log(
    `[jpn-master-index][cards-plan] missing_dispositions=${result.plan.summary.missing_source_assertion_representation_count}`,
  );
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

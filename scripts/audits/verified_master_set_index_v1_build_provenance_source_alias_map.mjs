import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const GENERATED_FILES = [
  'english_master_index_provenance_source_alias_map_v1.json',
  'english_master_index_provenance_source_alias_map_v1.md',
  'english_master_index_missing_set_code_recovery_lanes_v1.json',
  'english_master_index_missing_set_code_recovery_lanes_v1.md',
];

function normalize(value) {
  return String(value ?? '').trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function addCount(target, key, count = 1) {
  const normalized = normalize(key) || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 50) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), data);
}

function tcgdexCardUrl(externalId) {
  return externalId ? `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(externalId)}` : null;
}

function tcgdexSetUrl(sourceAlias) {
  return sourceAlias ? `https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(sourceAlias)}` : null;
}

function pokemonTcgSetUrl(sourceAlias) {
  return sourceAlias ? `https://api.pokemontcg.io/v2/sets/${encodeURIComponent(sourceAlias)}` : null;
}

function sourceSetAliasForMapping(mapping) {
  const source = normalizeLower(mapping.source);
  const externalId = normalize(mapping.external_id);
  if (source === 'tcgdex') {
    const index = externalId.lastIndexOf('-');
    return index > 0 ? externalId.slice(0, index) : null;
  }
  return null;
}

function isPocketAlias(alias) {
  const normalized = normalize(alias);
  return /^A\d+[a-z]?$/i.test(normalized) || /^P-A$/i.test(normalized);
}

function buildAliasLookup(sets) {
  const bySourceAlias = new Map();
  for (const set of sets.sets ?? []) {
    for (const [sourceKey, alias] of Object.entries(set.source_aliases ?? {})) {
      if (!alias) continue;
      bySourceAlias.set(`${sourceKey}:${normalizeLower(alias)}`, {
        internal_set_key: set.key,
        set_name: set.set_name,
        source_key: sourceKey,
        source_alias: alias,
        source_status: set.source_status?.[sourceKey] ?? null,
        source_url: sourceKey === 'tcgdex' ? tcgdexSetUrl(alias) : pokemonTcgSetUrl(alias),
      });
    }
  }
  return bySourceAlias;
}

function laneForQueueItem({ item, aliasLookup }) {
  const mappingLeads = [];
  const pocketAliases = [];
  const matchedAliases = [];
  const unmatchedAliases = [];
  const numericMarketplaceIds = [];

  for (const mapping of item.external_mappings ?? []) {
    const source = normalize(mapping.source);
    const sourceAlias = sourceSetAliasForMapping(mapping);
    const sourceKey = source === 'tcgdex' ? 'tcgdex' : source;
    const lookupKey = `${sourceKey}:${normalizeLower(sourceAlias)}`;
    const matchedSet = sourceAlias ? aliasLookup.get(lookupKey) : null;
    const lead = {
      source,
      external_id: mapping.external_id ?? null,
      external_id_pattern: mapping.external_id_pattern ?? null,
      source_set_alias: sourceAlias,
      source_card_url: source === 'tcgdex' ? tcgdexCardUrl(mapping.external_id) : null,
      source_set_url: source === 'tcgdex' ? tcgdexSetUrl(sourceAlias) : null,
      matched_master_index_set: matchedSet,
      active: mapping.active ?? null,
    };
    mappingLeads.push(lead);

    if (sourceAlias && isPocketAlias(sourceAlias)) pocketAliases.push(sourceAlias);
    if (matchedSet) matchedAliases.push(matchedSet);
    if (sourceAlias && !matchedSet && !isPocketAlias(sourceAlias)) unmatchedAliases.push(sourceAlias);
    if (mapping.external_id_pattern === 'numeric_marketplace_id') numericMarketplaceIds.push(mapping.external_id);
  }

  const uniqueMatchedSetKeys = uniqueSorted(matchedAliases.map((alias) => alias.internal_set_key));
  const uniquePocketAliases = uniqueSorted(pocketAliases);
  const uniqueUnmatchedAliases = uniqueSorted(unmatchedAliases);

  if (uniqueMatchedSetKeys.length && uniquePocketAliases.length) {
    return {
      lane: 'mixed_physical_and_pocket_review',
      recommended_next_action: 'Review mixed provenance manually. Do not create an alias or mutate rows until physical and Pocket evidence are separated.',
      mappingLeads,
    };
  }
  if (uniqueMatchedSetKeys.length) {
    return {
      lane: 'physical_tcg_alias_recovery_candidate',
      recommended_next_action: 'Use matched source aliases as source-acquisition leads. Confirm card number/name/finish against the Verified Master Set Index before any future controlled repair.',
      mappingLeads,
    };
  }
  if (uniquePocketAliases.length && !uniqueUnmatchedAliases.length) {
    return {
      lane: 'pocket_scope_exclusion_candidate',
      recommended_next_action: 'Keep outside the English physical TCG master index unless product scope is explicitly expanded. This is not a physical set alias.',
      mappingLeads,
    };
  }
  if (numericMarketplaceIds.length && !mappingLeads.some((lead) => lead.source_set_alias)) {
    return {
      lane: 'marketplace_id_lookup_required',
      recommended_next_action: 'Resolve marketplace IDs to exact source URLs and cross-check with a second source before any set identity decision.',
      mappingLeads,
    };
  }
  if (uniqueUnmatchedAliases.length) {
    return {
      lane: 'source_alias_not_in_master_index',
      recommended_next_action: 'Verify whether the source alias is out of scope, newly missing from the master index, or a source-family alias requiring governance.',
      mappingLeads,
    };
  }
  return {
    lane: 'manual_provenance_review',
    recommended_next_action: 'Manual source acquisition is required because current evidence does not expose a usable source set alias.',
    mappingLeads,
  };
}

function buildArtifacts({ queueArtifact, sets }) {
  const aliasLookup = buildAliasLookup(sets);
  const lanes = [];
  const byLane = {};
  const bySourceAlias = {};
  const byMatchedSet = {};
  const byPocketAlias = {};
  const byUnmatchedAlias = {};
  const sourceAliasRows = new Map();

  for (const item of queueArtifact.queues ?? []) {
    const laneInfo = laneForQueueItem({ item, aliasLookup });
    const matchedSets = uniqueSorted(laneInfo.mappingLeads.map((lead) => lead.matched_master_index_set?.internal_set_key));
    const sourceAliases = uniqueSorted(laneInfo.mappingLeads.map((lead) => lead.source_set_alias));
    const pocketAliases = sourceAliases.filter((alias) => isPocketAlias(alias));
    const unmatchedAliases = laneInfo.mappingLeads
      .filter((lead) => lead.source_set_alias && !lead.matched_master_index_set && !isPocketAlias(lead.source_set_alias))
      .map((lead) => lead.source_set_alias);

    addCount(byLane, laneInfo.lane);
    for (const alias of sourceAliases) addCount(bySourceAlias, alias);
    for (const setKey of matchedSets) addCount(byMatchedSet, setKey);
    for (const alias of pocketAliases) addCount(byPocketAlias, alias);
    for (const alias of unmatchedAliases) addCount(byUnmatchedAlias, alias);

    for (const lead of laneInfo.mappingLeads) {
      if (!lead.source_set_alias) continue;
      const key = `${lead.source}:${lead.source_set_alias}`;
      if (!sourceAliasRows.has(key)) {
        sourceAliasRows.set(key, {
          source: lead.source,
          source_set_alias: lead.source_set_alias,
          source_set_url: lead.source_set_url,
          lane: null,
          card_print_count: 0,
          printing_count: 0,
          matched_master_index_set: lead.matched_master_index_set,
          pocket_scope_candidate: isPocketAlias(lead.source_set_alias),
          sample_cards: [],
        });
      }
      const row = sourceAliasRows.get(key);
      row.lane = row.matched_master_index_set
        ? 'physical_tcg_alias_recovery_candidate'
        : row.pocket_scope_candidate
          ? 'pocket_scope_exclusion_candidate'
          : 'source_alias_not_in_master_index';
      row.card_print_count += 1;
      row.printing_count += Number(item.printing_count ?? 0);
      if (row.sample_cards.length < 10) {
        row.sample_cards.push({
          card_print_id: item.card_print_id,
          card_name: item.card_name,
          finish_profile: item.finish_profile,
          external_id: lead.external_id,
          source_card_url: lead.source_card_url,
        });
      }
    }

    lanes.push({
      card_print_id: item.card_print_id,
      card_name: item.card_name,
      finish_profile: item.finish_profile,
      printing_count: item.printing_count,
      lane: laneInfo.lane,
      matched_master_index_sets: matchedSets,
      source_set_aliases: sourceAliases,
      pocket_aliases: pocketAliases,
      unmatched_source_aliases: uniqueSorted(unmatchedAliases),
      mapping_leads: laneInfo.mappingLeads,
      recommended_next_action: laneInfo.recommended_next_action,
      mutation_authority: 'not mutation authority',
      alias_authority: 'not alias authority',
    });
  }

  const sourceAliasMap = [...sourceAliasRows.values()]
    .sort((left, right) => (
      left.lane.localeCompare(right.lane)
      || right.card_print_count - left.card_print_count
      || left.source_set_alias.localeCompare(right.source_set_alias)
    ));
  const summary = {
    queue_items: lanes.length,
    printing_rows_represented: lanes.reduce((total, row) => total + Number(row.printing_count ?? 0), 0),
    source_alias_rows: sourceAliasMap.length,
    by_lane: byLane,
    by_source_alias: Object.fromEntries(topEntries(bySourceAlias, 100)),
    by_matched_set: Object.fromEntries(topEntries(byMatchedSet, 100)),
    by_pocket_alias: Object.fromEntries(topEntries(byPocketAlias, 100)),
    by_unmatched_alias: Object.fromEntries(topEntries(byUnmatchedAlias, 100)),
  };

  return {
    sourceAliasMap: {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_provenance_source_alias_map_v1',
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      summary,
      guardrails: [
        'source alias match is recovery evidence only',
        'Pocket-style aliases are not English physical TCG alias authority',
        'numeric marketplace IDs require URL lookup and second-source confirmation',
        'no DB mutation, quarantine, cleanup, or migration is authorized by this map',
      ],
      source_aliases: sourceAliasMap,
    },
    recoveryLanes: {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_missing_set_code_recovery_lanes_v1',
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      summary,
      lanes,
    },
  };
}

function buildSourceAliasMarkdown(artifact) {
  const laneRows = topEntries(artifact.summary.by_lane, 20).map(([lane, count]) => [lane, count]);
  const matchedRows = topEntries(artifact.summary.by_matched_set, 30).map(([setKey, count]) => [setKey, count]);
  const pocketRows = topEntries(artifact.summary.by_pocket_alias, 30).map(([alias, count]) => [alias, count]);
  const sourceRows = artifact.source_aliases.slice(0, 80).map((row) => [
    row.source,
    row.source_set_alias,
    row.lane,
    row.matched_master_index_set?.internal_set_key ?? '',
    row.matched_master_index_set?.set_name ?? '',
    row.card_print_count,
    row.printing_count,
  ]);

  return `# English Master Index Provenance Source Alias Map V1

This is an audit-only source-alias map for \`missing_set_code\` provenance leads. It does not infer Grookai set identity and does not authorize DB mutation.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}

## Summary

- queue_items: ${artifact.summary.queue_items}
- printing_rows_represented: ${artifact.summary.printing_rows_represented}
- source_alias_rows: ${artifact.summary.source_alias_rows}

## Recovery Lanes

${markdownTable(['lane', 'card prints'], laneRows)}

## Matched Physical Master Sets

${markdownTable(['set_key', 'card prints'], matchedRows)}

## Pocket Scope Aliases

${markdownTable(['source_alias', 'card prints'], pocketRows)}

## Source Alias Map

${markdownTable(['source', 'source_alias', 'lane', 'matched_set', 'matched_name', 'card_prints', 'printing_rows'], sourceRows)}

## Guardrails

${artifact.guardrails.map((guardrail) => `- ${guardrail}`).join('\n')}
`;
}

function buildRecoveryLanesMarkdown(artifact) {
  const rows = artifact.lanes.slice(0, 120).map((row) => [
    row.card_print_id,
    row.card_name,
    row.finish_profile,
    row.lane,
    row.matched_master_index_sets.join(', '),
    row.source_set_aliases.join(', '),
    row.recommended_next_action,
  ]);

  return `# Missing Set Code Recovery Lanes V1

This report splits \`missing_set_code\` card prints into recovery lanes. Every row remains audit-only and not mutation-safe.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}

## Summary

- queue_items: ${artifact.summary.queue_items}
- printing_rows_represented: ${artifact.summary.printing_rows_represented}
- source_alias_rows: ${artifact.summary.source_alias_rows}

## Top Lane Items

${markdownTable(['card_print_id', 'card_name', 'finish_profile', 'lane', 'matched_sets', 'source_aliases', 'next_action'], rows)}
`;
}

async function main() {
  const queueArtifact = await readJson('english_master_index_missing_set_code_provenance_queue_v1.json');
  const sets = await readJson('english_master_index_sets_v1.json');
  const artifacts = buildArtifacts({ queueArtifact, sets });

  await writeJson('english_master_index_provenance_source_alias_map_v1.json', artifacts.sourceAliasMap);
  await writeMarkdown('english_master_index_provenance_source_alias_map_v1.md', buildSourceAliasMarkdown(artifacts.sourceAliasMap));
  await writeJson('english_master_index_missing_set_code_recovery_lanes_v1.json', artifacts.recoveryLanes);
  await writeMarkdown('english_master_index_missing_set_code_recovery_lanes_v1.md', buildRecoveryLanesMarkdown(artifacts.recoveryLanes));

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    queue_items: artifacts.recoveryLanes.summary.queue_items,
    by_lane: artifacts.recoveryLanes.summary.by_lane,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

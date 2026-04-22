import 'dotenv/config';
import fs from 'fs/promises';
import { Client } from 'pg';

const INPUT_PATH = 'docs/checkpoints/warehouse/stamped_identity_rule_apply_v1.json';
const OUTPUT_JSON_PATH = 'docs/checkpoints/warehouse/stamped_manual_review_clusters_v1.json';
const OUTPUT_MD_PATH = 'docs/checkpoints/warehouse/stamped_manual_review_clusters_v1.md';

const EVENT_KEYWORD_RE =
  /\b(battle road|worlds|world championships?|city championships|regional championships|origins game fair|e-league|sdcc|comic con|e3)\b/i;

const CLUSTER_DEFS = Object.freeze({
  PRIZE_PACK_FAMILY_ONLY: {
    title: 'Prize Pack Family-Only Rows',
    disposition: 'NEEDS_EXTERNAL_EVIDENCE',
    rule_name: null,
    summary:
      'Source family alone is not enough to create stamped identity. Rows still need explicit printed series or stamp evidence before lawful canon routing.',
  },
  PRIZE_PACK_SERIES_MARKER: {
    title: 'Prize Pack Series Marker Rows',
    disposition: 'EXTENSION_OF_EXISTING_RULE',
    rule_name: 'PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1',
    summary:
      'Explicit "Prize Pack Series N" markers are identity-bearing and can route to a unique underlying base row by stripped name plus printed number and total.',
  },
  MISC_EXPANSION_NAME_STAMP_OVERLAYS: {
    title: 'Expansion-Name Stamp Overlays',
    disposition: 'NEW_IDENTITY_RULE',
    rule_name: 'EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1',
    summary:
      'Explicit expansion-name stamp phrases route through the named expansion first, then resolve the unique base card by stripped name plus printed number and total.',
  },
  EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS: {
    title: 'Event And Prerelease Base-Route Overlays',
    disposition: 'EXTENSION_OF_EXISTING_RULE',
    rule_name: 'EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1',
    summary:
      'Explicit event or prerelease overlays can reuse the existing stamped rule when the underlying base row is globally unique by stripped name plus printed number and total.',
  },
  BATTLE_ACADEMY_OVERLAY: {
    title: 'Battle Academy Overlay Rows',
    disposition: 'NOT_CANON',
    rule_name: 'BATTLE_ACADEMY_CANON_CONTRACT_V1',
    summary:
      'These rows belong to the Battle Academy curated-product overlay domain and must not be forced through the stamped backlog.',
  },
  MEGA_EVOLUTION_PROMO_STAFF_PRERELEASE: {
    title: 'Mega Evolution Promo Staff/Prerelease Rows',
    disposition: 'NEEDS_EXTERNAL_EVIDENCE',
    rule_name: null,
    summary:
      'The current backlog proves stamped modifiers exist, but it does not yet prove whether the underlying identity space is a promo family or routed expansion base row.',
  },
  PROFESSOR_PROGRAM_FAMILY_HINT_ONLY: {
    title: 'Professor Program Family-Hint Rows',
    disposition: 'NEEDS_EXTERNAL_EVIDENCE',
    rule_name: null,
    summary:
      'Professor Program source-family hints do not capture enough printed evidence to create stamped identity without a stronger external proof surface.',
  },
});

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalApostrophes(value) {
  return String(value ?? '').replace(/[’‘]/g, "'");
}

function normalizeNameForMatch(value) {
  return canonicalApostrophes(collapseWhitespace(value)).toLowerCase();
}

function normalizeNumberPlainToken(value) {
  const token = String(value ?? '').trim();
  if (!token) {
    return null;
  }
  if (/^\d+$/.test(token)) {
    return String(Number(token));
  }
  return token.toUpperCase();
}

function extractPrintedTotal(value) {
  const match = String(value ?? '').match(/\/(\d+)/);
  return match ? String(Number(match[1])) : null;
}

function getStampRoot(stampLabel) {
  const root = String(stampLabel ?? '')
    .replace(/\s+Stamp$/i, '')
    .trim();
  if (/^Prismatic Evolution$/i.test(root)) {
    return 'Prismatic Evolutions';
  }
  return root;
}

function stripOverlayDescriptor(candidateName, stampLabel) {
  let value = String(candidateName ?? '');
  const stampRoot = getStampRoot(stampLabel);

  value = value.replace(/\s-\s*[A-Za-z0-9./]+(?:\s.*)?$/i, '');
  value = value.replace(/\s*\[[^\]]+\]/g, '');
  value = value.replace(/\s*\(([^()]+)\)/g, (full, inner) => {
    const normalizedInner = canonicalApostrophes(inner).toLowerCase();
    if (
      /stamp|stamped|prerelease|staff|exclusive/i.test(inner) ||
      EVENT_KEYWORD_RE.test(inner) ||
      /^#?\d+(?:\/\d+)?$/i.test(inner) ||
      /^\d+\/\d+$/i.test(inner)
    ) {
      return '';
    }
    if (stampRoot && normalizedInner.includes(canonicalApostrophes(stampRoot).toLowerCase())) {
      return '';
    }
    return full;
  });

  return collapseWhitespace(value).replace(/[\s-]+$/, '');
}

function identifyCluster(row) {
  if (row.source_set_id === 'prize-pack-series-cards-pokemon' && row.stamp_pattern_family === 'prize_pack_family_only') {
    return 'PRIZE_PACK_FAMILY_ONLY';
  }
  if (row.source_set_id === 'prize-pack-series-cards-pokemon' && row.stamp_pattern_family === 'prize_pack_series_marker') {
    return 'PRIZE_PACK_SERIES_MARKER';
  }
  if (row.source_set_id === 'miscellaneous-cards-products-pokemon' && row.stamp_pattern_family === 'explicit_named_stamp') {
    return 'MISC_EXPANSION_NAME_STAMP_OVERLAYS';
  }
  if (
    (row.source_set_id === 'miscellaneous-cards-products-pokemon' &&
      (row.stamp_pattern_family === 'explicit_event_stamp' || row.stamp_pattern_family === 'prerelease_marker')) ||
    (row.source_set_id === 'deck-exclusives-pokemon' && row.stamp_pattern_family === 'prerelease_marker')
  ) {
    return 'EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS';
  }
  if (
    (row.source_set_id === 'battle-academy-pokemon' || row.source_set_id === 'battle-academy-2022-pokemon') &&
    (row.stamp_pattern_family === 'battle_academy_mascot_stamp' || row.stamp_pattern_family === 'explicit_named_stamp')
  ) {
    return 'BATTLE_ACADEMY_OVERLAY';
  }
  if (row.source_set_id === 'me-mega-evolution-promo-pokemon') {
    return 'MEGA_EVOLUTION_PROMO_STAFF_PRERELEASE';
  }
  if (row.source_set_id === 'professor-program-promos-pokemon' && row.stamp_pattern_family === 'family_hint_only') {
    return 'PROFESSOR_PROGRAM_FAMILY_HINT_ONLY';
  }
  throw new Error(`Unclassified manual-review row: ${row.source_set_id} / ${row.stamp_pattern_family} / ${row.source_external_id}`);
}

async function buildSetCodeLookup(client) {
  const setRows = await client.query('select code, name, printed_total from public.sets order by code');
  const lookup = new Map();
  for (const row of setRows.rows) {
    const key = canonicalApostrophes(row.name).toLowerCase();
    if (!lookup.has(key)) {
      lookup.set(key, []);
    }
    lookup.get(key).push({
      code: row.code,
      name: row.name,
      printed_total: row.printed_total,
    });
  }
  return lookup;
}

async function matchBaseRows(client, { baseName, numberPlain, printedTotal, setCodes = null }) {
  if (!baseName || !numberPlain) {
    return [];
  }

  const query = await client.query(
    `
      select
        cp.id,
        cp.gv_id,
        cp.set_code,
        cp.name,
        cp.number,
        cp.number_plain,
        s.name as set_name,
        s.printed_total as set_printed_total
      from public.card_prints cp
      join public.sets s on s.code = cp.set_code
      where ($1::text[] is null or cp.set_code = any($1::text[]))
        and (ltrim(cp.number_plain, '0') = ltrim($2, '0') or cp.number_plain = $2)
        and ($3::text is null or s.printed_total::text = $3 or cp.printed_total::text = $3)
      order by cp.set_code, cp.number
    `,
    [setCodes, numberPlain, printedTotal],
  );

  const normalizedBaseName = normalizeNameForMatch(baseName);
  return query.rows.filter((row) => normalizeNameForMatch(row.name) === normalizedBaseName);
}

function buildBaseProof(baseRow) {
  if (!baseRow) {
    return null;
  }
  return {
    gv_id: baseRow.gv_id,
    set_code: baseRow.set_code,
    set_name: baseRow.set_name,
    base_name: baseRow.name,
    base_number: baseRow.number,
    base_number_plain: baseRow.number_plain,
  };
}

async function resolveRow(client, setLookup, row, clusterId) {
  const cluster = CLUSTER_DEFS[clusterId];
  const baseName = stripOverlayDescriptor(row.candidate_name, row.stamp_label);
  const numberPlain = normalizeNumberPlainToken(row.normalized_number_plain);
  const printedTotal = extractPrintedTotal(row.printed_number);

  if (clusterId === 'BATTLE_ACADEMY_OVERLAY') {
    return {
      rebucket: 'REJECTED',
      reason: 'Battle Academy rows are governed by the separate Battle Academy canon contract.',
      base_proof: null,
    };
  }

  if (clusterId === 'PRIZE_PACK_FAMILY_ONLY') {
    return {
      rebucket: 'STILL_MANUAL',
      reason: 'Prize Pack family rows still lack an explicit printed series or stamp phrase.',
      base_proof: null,
    };
  }

  if (clusterId === 'MEGA_EVOLUTION_PROMO_STAFF_PRERELEASE') {
    return {
      rebucket: 'STILL_MANUAL',
      reason: 'Mega Evolution promo rows still need authoritative proof for promo-family identity space versus routed base-set reuse.',
      base_proof: null,
    };
  }

  if (clusterId === 'PROFESSOR_PROGRAM_FAMILY_HINT_ONLY') {
    return {
      rebucket: 'STILL_MANUAL',
      reason: 'Professor Program family hints do not include enough printed modifier evidence to define stamped identity.',
      base_proof: null,
    };
  }

  if (clusterId === 'PRIZE_PACK_SERIES_MARKER') {
    const matches = await matchBaseRows(client, {
      baseName,
      numberPlain,
      printedTotal,
    });
    if (matches.length === 1) {
      return {
        rebucket: 'READY_FOR_WAREHOUSE',
        reason: 'Explicit Prize Pack series marker plus stripped base name and printed number/total resolve to a unique underlying base row.',
        base_proof: buildBaseProof(matches[0]),
      };
    }
    return {
      rebucket: 'STILL_MANUAL',
      reason: 'Prize Pack series marker was explicit, but the underlying base route did not reduce to exactly one canonical row.',
      base_proof: null,
    };
  }

  if (clusterId === 'MISC_EXPANSION_NAME_STAMP_OVERLAYS') {
    const root = getStampRoot(row.stamp_label);
    const routedSets = setLookup.get(canonicalApostrophes(root).toLowerCase()) ?? [];
    const matches =
      routedSets.length === 0
        ? []
        : await matchBaseRows(client, {
            baseName,
            numberPlain,
            printedTotal,
            setCodes: routedSets.map((setRow) => setRow.code),
          });
    if (matches.length === 1) {
      return {
        rebucket: 'READY_FOR_WAREHOUSE',
        reason: 'Explicit expansion-name stamp routed to a unique base row inside the named expansion.',
        base_proof: buildBaseProof(matches[0]),
      };
    }
    return {
      rebucket: 'STILL_MANUAL',
      reason: routedSets.length === 0
        ? 'Stamp label did not map to an authoritative canonical set name.'
        : 'Expansion-name stamp did not resolve to exactly one matching base row after normalized number and printed-total routing.',
      base_proof: null,
    };
  }

  if (clusterId === 'EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS') {
    const matches = await matchBaseRows(client, {
      baseName,
      numberPlain,
      printedTotal,
    });
    if (matches.length === 1) {
      return {
        rebucket: 'READY_FOR_WAREHOUSE',
        reason: 'Explicit event/prerelease overlay resolved to a unique base row by stripped name plus printed number and total.',
        base_proof: buildBaseProof(matches[0]),
      };
    }
    return {
      rebucket: 'STILL_MANUAL',
      reason: 'Event/prerelease overlay still needs a unique underlying base route.',
      base_proof: null,
    };
  }

  throw new Error(`Unsupported cluster: ${clusterId}`);
}

function summarizeClusters(rowOutcomes) {
  const summaries = [];
  for (const [clusterId, cluster] of Object.entries(CLUSTER_DEFS)) {
    const rows = rowOutcomes.filter((row) => row.cluster_id === clusterId);
    const rebucketCounts = {
      READY_FOR_WAREHOUSE: rows.filter((row) => row.rebucket === 'READY_FOR_WAREHOUSE').length,
      STILL_MANUAL: rows.filter((row) => row.rebucket === 'STILL_MANUAL').length,
      REJECTED: rows.filter((row) => row.rebucket === 'REJECTED').length,
    };
    summaries.push({
      cluster_id: clusterId,
      title: cluster.title,
      disposition: cluster.disposition,
      rule_name: cluster.rule_name,
      row_count: rows.length,
      rebucket_counts: rebucketCounts,
      summary: cluster.summary,
      representative_rows: rows.slice(0, 5).map((row) => ({
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        stamp_label: row.stamp_label,
        rebucket: row.rebucket,
      })),
      ready_examples: rows
        .filter((row) => row.rebucket === 'READY_FOR_WAREHOUSE')
        .slice(0, 5)
        .map((row) => ({
          candidate_name: row.candidate_name,
          printed_number: row.printed_number,
          stamp_label: row.stamp_label,
          effective_set_code: row.base_proof?.set_code ?? null,
          effective_set_name: row.base_proof?.set_name ?? null,
        })),
      blocked_examples: rows
        .filter((row) => row.rebucket !== 'READY_FOR_WAREHOUSE')
        .slice(0, 3)
        .map((row) => ({
          candidate_name: row.candidate_name,
          printed_number: row.printed_number,
          stamp_label: row.stamp_label,
          blocker_detail: row.blocker_detail,
        })),
    });
  }
  return summaries;
}

function buildNextExecutableBatches(rowOutcomes) {
  const readyRows = rowOutcomes.filter((row) => row.rebucket === 'READY_FOR_WAREHOUSE');
  const grouped = new Map();

  for (const row of readyRows) {
    if (!grouped.has(row.cluster_id)) {
      grouped.set(row.cluster_id, []);
    }
    grouped.get(row.cluster_id).push(row);
  }

  const batches = [];
  for (const [clusterId, rows] of grouped.entries()) {
    const cluster = CLUSTER_DEFS[clusterId];
    batches.push({
      batch_name: `STAMPED_MANUAL_REVIEW_${clusterId}_READY_BATCH_V1`,
      cluster_id: clusterId,
      title: cluster.title,
      row_count: rows.length,
      rule_name: cluster.rule_name,
      representative_rows: rows.slice(0, 5).map((row) => ({
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        stamp_label: row.stamp_label,
        effective_set_code: row.base_proof?.set_code ?? null,
      })),
    });
  }

  return batches.sort((left, right) => right.row_count - left.row_count);
}

function buildMarkdownReport({ sourceCounts, clusterSummaries, rebucketCounts, nextExecutableBatches }) {
  const lines = [];

  lines.push('# CHECKPOINT - Stamped Manual Review Clusters V1');
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(`- Source artifact: \`${INPUT_PATH}\``);
  lines.push(`- Manual-review input rows: \`${sourceCounts.manual_review_rows}\``);
  lines.push(`- Output JSON: \`${OUTPUT_JSON_PATH}\``);
  lines.push(`- Output MD: \`${OUTPUT_MD_PATH}\``);
  lines.push('');
  lines.push('## Cluster Summary');
  lines.push('');
  lines.push('| Cluster | Disposition | Rule | Rows | Ready | Still Manual | Rejected |');
  lines.push('|---|---|---|---:|---:|---:|---:|');
  for (const cluster of clusterSummaries) {
    lines.push(
      `| ${cluster.title} | \`${cluster.disposition}\` | ${cluster.rule_name ? `\`${cluster.rule_name}\`` : '-'} | ${cluster.row_count} | ${cluster.rebucket_counts.READY_FOR_WAREHOUSE} | ${cluster.rebucket_counts.STILL_MANUAL} | ${cluster.rebucket_counts.REJECTED} |`,
    );
  }
  lines.push('');
  lines.push('## Rebucket Result');
  lines.push('');
  lines.push(`- \`READY_FOR_WAREHOUSE = ${rebucketCounts.READY_FOR_WAREHOUSE}\``);
  lines.push(`- \`STILL_MANUAL = ${rebucketCounts.STILL_MANUAL}\``);
  lines.push(`- \`REJECTED = ${rebucketCounts.REJECTED}\``);
  lines.push('');
  lines.push('## Rule Outcomes');
  lines.push('');
  for (const cluster of clusterSummaries) {
    lines.push(`### ${cluster.title}`);
    lines.push('');
    lines.push(`- Disposition: \`${cluster.disposition}\``);
    lines.push(`- Rule: ${cluster.rule_name ? `\`${cluster.rule_name}\`` : 'none; evidence still missing'}`);
    lines.push(`- Summary: ${cluster.summary}`);
    if (cluster.ready_examples.length > 0) {
      lines.push('- Representative ready examples:');
      for (const example of cluster.ready_examples) {
        lines.push(
          `  - ${example.candidate_name} | ${example.printed_number} | ${example.stamp_label ?? 'no stamp label'} | ${example.effective_set_code ?? 'n/a'} (${example.effective_set_name ?? 'n/a'})`,
        );
      }
    }
    if (cluster.blocked_examples.length > 0) {
      lines.push('- Representative blocked examples:');
      for (const example of cluster.blocked_examples) {
        lines.push(
          `  - ${example.candidate_name} | ${example.printed_number} | ${example.stamp_label ?? 'no stamp label'} | ${example.blocker_detail}`,
        );
      }
    }
    lines.push('');
  }
  lines.push('## Next Executable Batches');
  lines.push('');
  for (const batch of nextExecutableBatches) {
    lines.push(`- \`${batch.batch_name}\` - ${batch.row_count} rows - ${batch.rule_name ?? 'existing rule surface'}`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const audit = JSON.parse(raw);
  const manualRows = audit.rows.filter((row) => row.result_bucket === 'STAMPED_MANUAL_REVIEW');

  if (manualRows.length !== 745) {
    throw new Error(`Expected 745 manual-review rows, found ${manualRows.length}`);
  }

  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();

  try {
    const setLookup = await buildSetCodeLookup(client);
    const rowOutcomes = [];

    for (const row of manualRows) {
      const clusterId = identifyCluster(row);
      const cluster = CLUSTER_DEFS[clusterId];
      const resolution = await resolveRow(client, setLookup, row, clusterId);

      rowOutcomes.push({
        source: row.source,
        source_set_id: row.source_set_id,
        source_external_id: row.source_external_id,
        candidate_name: row.candidate_name,
        printed_number: row.printed_number,
        normalized_number_plain: row.normalized_number_plain,
        stamp_label: row.stamp_label,
        variant_key: row.variant_key,
        stamp_pattern_family: row.stamp_pattern_family,
        cluster_id: clusterId,
        cluster_title: cluster.title,
        cluster_disposition: cluster.disposition,
        proposed_rule_name: cluster.rule_name,
        rebucket: resolution.rebucket,
        blocker_detail: resolution.reason,
        base_proof: resolution.base_proof,
      });
    }

    const rebucketCounts = rowOutcomes.reduce(
      (acc, row) => {
        acc[row.rebucket] += 1;
        return acc;
      },
      {
        READY_FOR_WAREHOUSE: 0,
        STILL_MANUAL: 0,
        REJECTED: 0,
      },
    );

    const clusterSummaries = summarizeClusters(rowOutcomes);
    const nextExecutableBatches = buildNextExecutableBatches(rowOutcomes);

    const output = {
      generated_at: new Date().toISOString(),
      source_artifact: INPUT_PATH,
      manual_review_input_count: manualRows.length,
      cluster_count: clusterSummaries.length,
      rebucket_counts: rebucketCounts,
      clusters: clusterSummaries,
      next_executable_batches: nextExecutableBatches,
      row_outcomes: rowOutcomes,
    };

    await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    await fs.writeFile(
      OUTPUT_MD_PATH,
      buildMarkdownReport({
        sourceCounts: { manual_review_rows: manualRows.length },
        clusterSummaries,
        rebucketCounts,
        nextExecutableBatches,
      }),
      'utf8',
    );

    console.log(
      JSON.stringify(
        {
          manual_review_input_count: manualRows.length,
          cluster_count: clusterSummaries.length,
          rebucket_counts: rebucketCounts,
          next_executable_batches: nextExecutableBatches.map((batch) => ({
            batch_name: batch.batch_name,
            row_count: batch.row_count,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[stamped-manual-review-clusters-v1] fatal:', error);
  process.exitCode = 1;
});

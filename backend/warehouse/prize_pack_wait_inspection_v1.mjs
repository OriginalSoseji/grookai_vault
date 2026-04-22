import '../env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const INPUT_JSON_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_evidence_v2.json',
);
const OUTPUT_JSON_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_wait_inspection_v1.json',
);
const OUTPUT_MD_PATH = path.join(
  repoRoot,
  'docs',
  'checkpoints',
  'warehouse',
  'prize_pack_wait_inspection_v1.md',
);

const BLOCKER_CLASS_ORDER = [
  'NO_SERIES_CONFIRMATION',
  'INSUFFICIENT_SOURCE_CORROBORATION',
  'BASE_ROUTE_AMBIGUOUS',
  'MULTI_SERIES_DUPLICATE',
  'IMAGE_UNVERIFIED',
];

const BLOCKER_CLASS_DETAILS = {
  NO_SERIES_CONFIRMATION: {
    priority: 300,
    evidence_missing:
      'Independent checklist or trusted set-list confirmation that ties this card to a specific Prize Pack series.',
  },
  INSUFFICIENT_SOURCE_CORROBORATION: {
    priority: 500,
    evidence_missing:
      'Coverage proving the card is absent from unsupported earlier Prize Pack series, so the single matched series is truly unique.',
  },
  BASE_ROUTE_AMBIGUOUS: {
    priority: 100,
    evidence_missing:
      'A unique underlying base-card route. Series evidence is unsafe until the base identity is singular.',
  },
  MULTI_SERIES_DUPLICATE: {
    priority: 50,
    evidence_missing:
      'A printed, visual, or provenance-backed identity signal that distinguishes otherwise duplicated multi-series reprints.',
  },
  IMAGE_UNVERIFIED: {
    priority: 25,
    evidence_missing:
      'Visual confirmation that the stamped row carries the expected identity-bearing mark.',
  },
};

const CLUSTER_NAME_OVERRIDES = {
  SOURCE_PLUS_UNIQUE_BASE_ONLY: 'SOURCE_PLUS_UNIQUE_BASE_ONLY',
  SECONDARY_SINGLE_SERIES_LIKELY: 'SECONDARY_SINGLE_SERIES_LIKELY',
  BASE_ROUTE_AMBIGUOUS_OR_MISSING: 'BASE_ROUTE_AMBIGUOUS',
};

const EVIDENCE_TIER_WEIGHT = {
  TIER_1: 40,
  TIER_2: 30,
  TIER_3: 20,
  TIER_4: 10,
};

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLower(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNumberPlain(value) {
  const digits = String(value ?? '').match(/\d+/g);
  if (!digits || digits.length === 0) return null;
  return String(parseInt(digits[0], 10));
}

function toTitleCaseFromSnake(value) {
  return String(value ?? '')
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function numberLeftFromPrintedNumber(value) {
  const printedNumber = normalizeText(value);
  if (!printedNumber) return null;
  const [left] = printedNumber.split('/');
  return normalizeText(left);
}

function buildSearchQuery(row) {
  const parts = [
    normalizeText(row.card_print_candidate_name),
    normalizeText(row.printed_number),
    'Prize Pack',
    'Play! Pokemon',
  ].filter(Boolean);
  return parts.join(' ');
}

function buildGoogleSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function buildBulbapediaSearchUrl(query) {
  return `https://bulbapedia.bulbagarden.net/w/index.php?search=${encodeURIComponent(query)}`;
}

function buildTcgdexApiUrl(row) {
  const setCode = normalizeLower(row.set_code);
  const numberLeft = normalizeText(row.printed_number_left);
  if (!setCode || !numberLeft) return null;
  return `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(`${setCode}-${numberLeft}`)}`;
}

function buildJustTcgUrl(sourceRow) {
  const candidateSources = [
    sourceRow?.payload?.url,
    sourceRow?.payload?.card_url,
    sourceRow?.payload?.href,
    sourceRow?.payload?.canonical_url,
    sourceRow?.raw_payload?.url,
    sourceRow?.raw_payload?.card_url,
    sourceRow?.raw_payload?.href,
    sourceRow?.raw_payload?.canonical_url,
  ];

  for (const candidate of candidateSources) {
    const normalized = normalizeText(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function mapDecisionReasonToBlockerClass(row) {
  switch (row.decision_reason_v2) {
    case 'no_external_series_confirmation_yet':
      return 'NO_SERIES_CONFIRMATION';
    case 'single_series_match_but_series_1_to_3_coverage_not_resolved_for_this_base_set':
      return 'INSUFFICIENT_SOURCE_CORROBORATION';
    case 'base_route_ambiguous_or_missing':
      return 'BASE_ROUTE_AMBIGUOUS';
    case 'appears_in_multiple_prize_pack_series_without_distinguishing_marker':
      return 'MULTI_SERIES_DUPLICATE';
    default:
      return row.image_availability === 'no_external_visual_evidence_attached'
        ? 'IMAGE_UNVERIFIED'
        : 'INSUFFICIENT_SOURCE_CORROBORATION';
  }
}

function buildWhyBlocked(row, blockerClass) {
  switch (blockerClass) {
    case 'NO_SERIES_CONFIRMATION':
      return 'The row already resolves to one base card, but there is no independent external checklist or official source confirming the Prize Pack series appearance yet.';
    case 'INSUFFICIENT_SOURCE_CORROBORATION':
      return 'One supported series source matches this card, but the current evidence window does not rule out unsupported earlier Prize Pack series for the same base card.';
    case 'BASE_ROUTE_AMBIGUOUS':
      return 'The stamped family row does not yet resolve to one unique base card, so any series evidence would still attach to an ambiguous identity.';
    case 'MULTI_SERIES_DUPLICATE':
      return 'The same base card appears in multiple Prize Pack series with no printed series marker or other proved identity-bearing distinction.';
    case 'IMAGE_UNVERIFIED':
      return 'The row still lacks enough visual or corroborating evidence to confirm the stamped identity without guessing.';
    default:
      return 'The row remains blocked because the current evidence does not deterministically resolve a lawful stamped identity.';
  }
}

function buildEvidencePresent(row, baseRow, sourceRow) {
  const present = [];
  if (row.base_card_id) {
    present.push(`Unique base route: ${row.base_card_id}`);
  }
  if (row.appearance_in_series?.length > 0) {
    present.push(`Series evidence: ${row.appearance_in_series.join(', ')}`);
  }
  if (row.evidence_tier) {
    present.push(`Evidence tier: ${row.evidence_tier}`);
  }
  if ((row.evidence_sources || []).length > 0) {
    present.push(
      `Evidence sources: ${row.evidence_sources
        .map((source) => source.source_name || source.source_type || 'unknown_source')
        .join(', ')}`,
    );
  }
  if (sourceRow?.tcgplayer_id) {
    present.push(`Source tcgplayer_id: ${sourceRow.tcgplayer_id}`);
  }
  if (baseRow?.image_url || baseRow?.representative_image_url) {
    present.push('Base-card image available');
  }
  return present;
}

function buildPriorityScore(row, blockerClass) {
  const blockerPriority = BLOCKER_CLASS_DETAILS[blockerClass]?.priority ?? 0;
  const evidenceTierWeight = EVIDENCE_TIER_WEIGHT[row.evidence_tier] ?? 0;
  const sourceCountBonus = (row.evidence_sources?.length ?? 0) * 3;
  const seriesBonus = (row.appearance_in_series?.length ?? 0) * 20;
  const baseRouteBonus = row.base_card_id ? 25 : 0;
  const duplicateBonus = Number(row.duplicate_occurrence_count ?? 0) * 2;
  const imageBonus =
    row.image_url && row.image_source ? 8 : row.image_availability === 'trusted_visual_set_list_available' ? 5 : 0;
  return (
    blockerPriority +
    evidenceTierWeight +
    sourceCountBonus +
    seriesBonus +
    baseRouteBonus +
    duplicateBonus +
    imageBonus
  );
}

function compareRows(left, right) {
  if (right.priority_score !== left.priority_score) {
    return right.priority_score - left.priority_score;
  }
  if ((right.evidence_sources?.length ?? 0) !== (left.evidence_sources?.length ?? 0)) {
    return (right.evidence_sources?.length ?? 0) - (left.evidence_sources?.length ?? 0);
  }
  if ((right.appearance_in_series?.length ?? 0) !== (left.appearance_in_series?.length ?? 0)) {
    return (right.appearance_in_series?.length ?? 0) - (left.appearance_in_series?.length ?? 0);
  }
  const leftName = normalizeText(left.card_print_candidate_name) ?? '';
  const rightName = normalizeText(right.card_print_candidate_name) ?? '';
  const nameCmp = leftName.localeCompare(rightName);
  if (nameCmp !== 0) return nameCmp;
  const leftNumber = normalizeText(left.printed_number) ?? '';
  const rightNumber = normalizeText(right.printed_number) ?? '';
  return leftNumber.localeCompare(rightNumber);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Prize Pack WAIT Inspection V1');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(
    'This surface makes the full Prize Pack `WAIT_FOR_MORE_EVIDENCE` lane directly inspectable. It does not change canon or rules. It only exposes what the system knows, what it is missing, and where to research next.',
  );
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`- total_rows: ${report.summary.total_rows}`);
  for (const blockerClass of BLOCKER_CLASS_ORDER) {
    lines.push(`- ${blockerClass}: ${report.summary.blocker_class_counts[blockerClass] ?? 0}`);
  }
  lines.push('');
  lines.push('## Cluster Counts');
  lines.push('');
  for (const cluster of report.summary.cluster_counts) {
    lines.push(`- ${cluster.cluster_name}: ${cluster.row_count}`);
  }
  lines.push('');
  lines.push('## Top 20 Highest-Value Rows');
  lines.push('');
  for (const row of report.top_20_highest_value_rows) {
    lines.push(
      `- ${row.card_print_candidate_name} | ${row.printed_number} | ${row.blocker_class} | tier=${row.evidence_tier} | series=${
        row.appearance_in_series.length > 0 ? row.appearance_in_series.join(', ') : 'none'
      } | base=${row.base_card_id ?? 'unresolved'}`,
    );
  }
  lines.push('');

  for (const cluster of report.summary.cluster_counts) {
    lines.push(`## Cluster: ${cluster.cluster_name}`);
    lines.push('');
    lines.push(
      `Rows: ${cluster.row_count} | blocker classes: ${cluster.blocker_classes.join(', ')}`,
    );
    lines.push('');
    const clusterRows = report.rows.filter((row) => row.cluster_name === cluster.cluster_name);
    for (const row of clusterRows) {
      const evidencePresent = row.evidence_present.length > 0 ? row.evidence_present.join('; ') : 'none';
      const evidenceMissing = row.evidence_missing.length > 0 ? row.evidence_missing.join('; ') : 'none';
      lines.push(`### ${row.card_print_candidate_name} | ${row.printed_number}`);
      lines.push('');
      lines.push(`- Base card: ${row.base_card_id ?? 'unresolved'}${row.base_card_name ? ` | ${row.base_card_name}` : ''}`);
      lines.push(`- Set code: ${row.set_code ?? 'unresolved'}`);
      lines.push(`- Why blocked: ${row.why_blocked}`);
      lines.push(`- Evidence present: ${evidencePresent}`);
      lines.push(`- Evidence missing: ${evidenceMissing}`);
      lines.push(
        `- Links: JustTCG=${row.research_links.justtcg_url ?? 'n/a'} | TCGdex=${
          row.research_links.tcgdex_url ?? 'n/a'
        } | Google=${row.research_links.google_search_url} | Bulbapedia=${row.research_links.bulbapedia_search_url}`,
      );
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

async function fetchSourceRows(client, sourceExternalIds) {
  if (sourceExternalIds.length === 0) return new Map();
  const { rows } = await client.query(
    `
      select
        edc.upstream_id,
        edc.tcgplayer_id,
        edc.payload,
        ri.payload as raw_payload
      from public.external_discovery_candidates edc
      left join public.raw_imports ri
        on ri.id = edc.raw_import_id
      where edc.source = 'justtcg'
        and edc.upstream_id = any($1::text[])
    `,
    [sourceExternalIds],
  );
  return new Map(rows.map((row) => [row.upstream_id, row]));
}

async function fetchBaseRows(client, baseGvIds) {
  if (baseGvIds.length === 0) return new Map();
  const { rows } = await client.query(
    `
      select
        gv_id,
        id,
        name,
        set_code,
        number,
        number_plain,
        image_url,
        representative_image_url,
        image_source,
        image_status
      from public.card_prints
      where gv_id = any($1::text[])
    `,
    [baseGvIds],
  );
  return new Map(rows.map((row) => [row.gv_id, row]));
}

async function main() {
  const input = JSON.parse(await fs.readFile(INPUT_JSON_PATH, 'utf8'));
  const waitRows = (input.row_outcomes ?? []).filter(
    (row) => row.evidence_class_v2 === 'STILL_UNPROVEN' && row.next_action_v2 === 'WAIT',
  );

  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();

  try {
    const sourceRowsByExternalId = await fetchSourceRows(
      client,
      [...new Set(waitRows.map((row) => row.source_external_id).filter(Boolean))],
    );
    const baseRowsByGvId = await fetchBaseRows(
      client,
      [...new Set(waitRows.map((row) => row.base_gv_id).filter(Boolean))],
    );

    const inspectionRows = waitRows.map((row) => {
      const sourceRow = sourceRowsByExternalId.get(row.source_external_id) ?? null;
      const baseRow = row.base_gv_id ? baseRowsByGvId.get(row.base_gv_id) ?? null : null;
      const blockerClass = mapDecisionReasonToBlockerClass(row);
      const clusterName = CLUSTER_NAME_OVERRIDES[row.cluster_id] ?? row.cluster_id;
      const searchQuery = buildSearchQuery({
        card_print_candidate_name: row.normalized_base_name ?? row.candidate_name,
        printed_number: row.printed_number,
      });
      const printedNumberLeft = numberLeftFromPrintedNumber(row.printed_number);
      const imageUrl = normalizeText(baseRow?.image_url) ?? normalizeText(baseRow?.representative_image_url);
      const imageSource = normalizeLower(baseRow?.image_source) ?? null;
      const evidenceSources = Array.isArray(row.evidence_sources_v2) ? row.evidence_sources_v2 : [];
      const evidencePresent = buildEvidencePresent(
        {
          base_card_id: row.base_gv_id ?? null,
          appearance_in_series: row.appearance_in_series ?? [],
          evidence_tier: row.evidence_tier,
          evidence_sources: evidenceSources,
          duplicate_occurrence_count: row.duplicate_occurrence_count ?? 0,
          image_availability: row.image_availability,
        },
        baseRow,
        sourceRow,
      );
      const evidenceMissing = [BLOCKER_CLASS_DETAILS[blockerClass]?.evidence_missing].filter(Boolean);

      const inspectionRow = {
        card_print_candidate_name: row.normalized_base_name ?? row.candidate_name,
        printed_number: row.printed_number,
        printed_number_left: printedNumberLeft,
        set_code: row.effective_set_code ?? null,
        base_card_id: row.base_gv_id ?? null,
        base_card_name: baseRow?.name ?? row.normalized_base_name ?? row.candidate_name,
        base_card_print_id: baseRow?.id ?? null,
        source_set_family: row.source_set_id,
        source_external_id: row.source_external_id,
        source_tcgplayer_id: normalizeText(sourceRow?.tcgplayer_id ?? sourceRow?.payload?.tcgplayerId),
        variant_hint: 'play_pokemon_stamp',
        stamp_label: 'Play! Pokémon Stamp',
        evidence_sources: evidenceSources,
        evidence_tier: row.evidence_tier,
        appearance_in_series: row.appearance_in_series ?? [],
        image_url: imageUrl,
        image_source: imageSource,
        image_availability: row.image_availability ?? null,
        why_blocked: buildWhyBlocked(row, blockerClass),
        blocker_class: blockerClass,
        cluster_name: clusterName,
        decision_reason_v2: row.decision_reason_v2,
        blocker_detail: normalizeText(row.blocker),
        unique_base_route: row.unique_base_route === true,
        duplicate_occurrence_count: Number(row.duplicate_occurrence_count ?? 0),
        earliest_possible_series: row.earliest_possible_series ?? null,
        full_supported_coverage: row.full_supported_coverage === true,
        evidence_present: evidencePresent,
        evidence_missing: evidenceMissing,
        research_links: {
          justtcg_url: buildJustTcgUrl(sourceRow),
          tcgdex_url: buildTcgdexApiUrl({
            set_code: row.effective_set_code,
            printed_number_left: printedNumberLeft,
          }),
          google_search_url: buildGoogleSearchUrl(searchQuery),
          bulbapedia_search_url: buildBulbapediaSearchUrl(searchQuery),
        },
        research_query: searchQuery,
        priority_score: 0,
      };

      inspectionRow.priority_score = buildPriorityScore(inspectionRow, blockerClass);
      return inspectionRow;
    });

    inspectionRows.sort(compareRows);

    const blockerClassCounts = Object.fromEntries(
      BLOCKER_CLASS_ORDER.map((blockerClass) => [
        blockerClass,
        inspectionRows.filter((row) => row.blocker_class === blockerClass).length,
      ]),
    );

    const clusterCounts = [...new Set(inspectionRows.map((row) => row.cluster_name))]
      .map((clusterName) => {
        const clusterRows = inspectionRows.filter((row) => row.cluster_name === clusterName);
        return {
          cluster_name: clusterName,
          row_count: clusterRows.length,
          blocker_classes: [...new Set(clusterRows.map((row) => row.blocker_class))],
        };
      })
      .sort((left, right) => right.row_count - left.row_count);

    const report = {
      generated_at: new Date().toISOString(),
      workflow: 'EVIDENCE_INSPECTION_SURFACE_V1',
      source_artifacts: {
        prize_pack_evidence_v2: 'docs/checkpoints/warehouse/prize_pack_evidence_v2.json',
      },
      summary: {
        total_rows: inspectionRows.length,
        blocker_class_counts: blockerClassCounts,
        cluster_counts: clusterCounts,
      },
      top_20_highest_value_rows: inspectionRows.slice(0, 20),
      rows: inspectionRows,
    };

    await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');

    console.log(
      JSON.stringify(
        {
          generated_at: report.generated_at,
          total_rows: report.summary.total_rows,
          blocker_class_counts: report.summary.blocker_class_counts,
          cluster_counts: report.summary.cluster_counts,
          top_20_count: report.top_20_highest_value_rows.length,
          output_json: path.relative(repoRoot, OUTPUT_JSON_PATH),
          output_md: path.relative(repoRoot, OUTPUT_MD_PATH),
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
  console.error(error);
  process.exitCode = 1;
});

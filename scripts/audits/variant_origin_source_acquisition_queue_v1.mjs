import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const IN_GAPS_JSON = path.join(ROOT, 'docs', 'audits', 'variant_origin_index_v1', 'variant_origin_source_gaps_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'variant_origin_index_v1');
const OUT_JSON = path.join(OUT_DIR, 'variant_origin_source_acquisition_queue_v1.json');
const OUT_MD = path.join(OUT_DIR, 'variant_origin_source_acquisition_queue_v1.md');

const VERSION = 'VARIANT_ORIGIN_SOURCE_ACQUISITION_QUEUE_V1';

const SOURCE_TARGETS = [
  {
    match: /pikachu_jack_o_lantern|snowflake|holiday/i,
    lane: 'seasonal_stamp_campaign',
    priority: 1,
    recommended_sources: [
      'official Pokemon news/product pages',
      'Pokemon Center product pages or archived campaign pages',
      'Bulbapedia miscellaneous promotional card pages',
      'PriceCharting exact product pages only as supporting evidence',
    ],
  },
  {
    match: /eb_games|gamestop/i,
    lane: 'retailer_exclusive_stamp',
    priority: 1,
    recommended_sources: [
      'official retailer campaign/product pages',
      'official Pokemon news pages',
      'Bulbapedia promotional card pages',
      'PriceCharting exact product pages only as supporting evidence',
    ],
  },
  {
    match: /diamond_pearl|ultra_prism|forbidden_light|celestial_storm|lost_thunder|cosmic_eclipse|scarlet_and_violet|obsidian_flames|paradox_rift|twilight_masquerade|stellar_crown|destined_rivals|black_bolt|white_flare|shrouded_fable|prismatic_evolution|astral_radiance|lost_origin|silver_tempest|rebel_clash|darkness_ablaze|vivid_voltage|brilliant_stars|mega_evolution|phantasmal_flames|chaos_rising/i,
    lane: 'set_logo_or_expansion_stamp',
    priority: 2,
    recommended_sources: [
      'official Pokemon prerelease or promo campaign pages',
      'Bulbapedia expansion promotional/release pages',
      'TCGplayer or PriceCharting exact stamped product pages as supporting evidence',
      'retailer pages where the stamp was retailer-distributed',
    ],
  },
  {
    match: /detective_pikachu|pikachu_stamp|generations_geodude|dragon_vault|jr_stamp_rally/i,
    lane: 'media_or_product_promotion_stamp',
    priority: 2,
    recommended_sources: [
      'official Pokemon movie/product campaign pages',
      'Bulbapedia movie/product promotional pages',
      'collector reference pages with exact card/stamp context',
      'PriceCharting exact product pages only as supporting evidence',
    ],
  },
  {
    match: /^[a-z0-9!?★☆]{1,4}$/i,
    lane: 'suffix_or_printed_number_scope_decision',
    priority: 3,
    recommended_sources: [
      'set checklist page proving the printed suffix or special number',
      'card-specific source page for exact set/name/number',
      'governance decision on whether this belongs in public origin copy or printed identity docs',
    ],
  },
  {
    match: /trainer_subject|name_suffix/i,
    lane: 'semantic_identity_scope_decision',
    priority: 3,
    recommended_sources: [
      'card-specific checklist page proving exact parenthetical/name subject',
      'governance decision on whether this is public origin copy or search/display metadata',
    ],
  },
];

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeToken(row) {
  return String(row.variant_key ?? row.printed_identity_modifier ?? 'unkeyed')
    .trim()
    .toLowerCase()
    .replace(/^number_prefix:/, 'number_prefix_')
    .replace(/^name_suffix:/, 'name_suffix_')
    .replace(/^trainer_subject:/, 'trainer_subject_')
    .replace(/[^a-z0-9!?★☆]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unkeyed';
}

function classifyQueue(row) {
  const token = `${row.variant_key ?? ''} ${row.printed_identity_modifier ?? ''}`.trim();
  const match = SOURCE_TARGETS.find((target) => target.match.test(token));
  if (match) return match;

  return {
    lane: row.family_key === 'retailer_or_product_stamp_needs_origin_source'
      ? 'other_stamp_origin_source_needed'
      : 'manual_origin_mapping_needed',
    priority: 4,
    recommended_sources: [
      'card-specific official/checklist source',
      'collector reference with exact card identity and variant label',
      'marketplace exact product page only as supporting evidence',
    ],
  };
}

function markdownTable(headers, rows) {
  const clean = (value) => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => clean(row[header])).join(' | ')} |`),
  ].join('\n');
}

function buildQueue(rows) {
  const groups = new Map();

  for (const row of rows) {
    const token = normalizeToken(row);
    const target = classifyQueue(row);
    const key = `${target.priority}:${target.lane}:${token}`;
    const current = groups.get(key) ?? {
      queue_key: key,
      token,
      lane: target.lane,
      priority: target.priority,
      family_key: row.family_key,
      family_label: row.family_label,
      recommended_sources: target.recommended_sources,
      row_count: 0,
      set_codes: new Set(),
      sample_cards: [],
      rows: [],
      promotion_status: 'blocked_until_exact_origin_source',
    };

    current.row_count += 1;
    current.set_codes.add(row.set_code);
    if (current.sample_cards.length < 8) {
      current.sample_cards.push(`${row.name} ${row.set_code} ${row.number}`);
    }
    current.rows.push(row);
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      set_codes: [...group.set_codes].sort(),
    }))
    .sort((a, b) => a.priority - b.priority || b.row_count - a.row_count || a.token.localeCompare(b.token));
}

function renderMarkdown(report) {
  const lines = [
    '# Variant Origin Source Acquisition Queue V1',
    '',
    'Read-only queue for remaining parent-level variant origin explanations. This does not promote public copy and does not mutate DB rows.',
    '',
    '```text',
    `db_writes_performed: ${report.db_writes_performed}`,
    `migrations_created: ${report.migrations_created}`,
    `cleanup_performed: ${report.cleanup_performed}`,
    `quarantine_performed: ${report.quarantine_performed}`,
    '```',
    '',
    '## Summary',
    '',
    `- Gap rows queued: ${report.summary.gap_rows_queued}`,
    `- Queue groups: ${report.summary.queue_groups}`,
    `- Priority 1 groups: ${report.summary.priority_1_groups}`,
    `- Priority 2 groups: ${report.summary.priority_2_groups}`,
    `- Scope-decision groups: ${report.summary.scope_decision_groups}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Queue Groups',
    '',
    markdownTable(
      ['priority', 'lane', 'token', 'row_count', 'sets', 'promotion_status'],
      report.queue.map((group) => ({
        priority: group.priority,
        lane: group.lane,
        token: group.token,
        row_count: group.row_count,
        sets: group.set_codes.join(', '),
        promotion_status: group.promotion_status,
      })),
    ),
    '',
    '## Source Targets',
    '',
  ];

  for (const group of report.queue) {
    lines.push(`### ${group.token}`);
    lines.push('');
    lines.push(`- Lane: \`${group.lane}\``);
    lines.push(`- Priority: ${group.priority}`);
    lines.push(`- Rows: ${group.row_count}`);
    lines.push(`- Sets: ${group.set_codes.join(', ')}`);
    lines.push(`- Status: \`${group.promotion_status}\``);
    lines.push(`- Sample cards: ${group.sample_cards.join('; ')}`);
    lines.push('- Recommended source targets:');
    for (const source of group.recommended_sources) lines.push(`  - ${source}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const gapReport = JSON.parse(await fs.readFile(IN_GAPS_JSON, 'utf8'));
  const rows = gapReport.rows ?? [];
  const queue = buildQueue(rows);

  const report = {
    generated_at: new Date().toISOString(),
    version: VERSION,
    mode: 'read_only_source_acquisition_queue',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    input_gap_fingerprint_sha256: gapReport.fingerprint_sha256,
    summary: {
      gap_rows_queued: rows.length,
      queue_groups: queue.length,
      priority_1_groups: queue.filter((group) => group.priority === 1).length,
      priority_2_groups: queue.filter((group) => group.priority === 2).length,
      scope_decision_groups: queue.filter((group) => group.lane.includes('scope_decision')).length,
    },
    queue,
  };
  report.fingerprint_sha256 = sha256(report);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    gap_rows_queued: report.summary.gap_rows_queued,
    queue_groups: report.summary.queue_groups,
    priority_1_groups: report.summary.priority_1_groups,
    priority_2_groups: report.summary.priority_2_groups,
    scope_decision_groups: report.summary.scope_decision_groups,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

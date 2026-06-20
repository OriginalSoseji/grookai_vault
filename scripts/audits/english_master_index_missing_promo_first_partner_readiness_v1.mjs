import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'missing_promo_first_partner_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'missing_promo_first_partner_readiness_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-01A-FIRST-PARTNER-AND-ANCIENT-MEW-READINESS';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

const FIRST_PARTNER_TARGETS = [
  { series: 'First Partner Illustration Collection Series 2', number: '046', name: 'Chikorita' },
  { series: 'First Partner Illustration Collection Series 2', number: '047', name: 'Cyndaquil' },
  { series: 'First Partner Illustration Collection Series 2', number: '048', name: 'Totodile' },
  { series: 'First Partner Illustration Collection Series 2', number: '049', name: 'Snivy' },
  { series: 'First Partner Illustration Collection Series 2', number: '050', name: 'Tepig' },
  { series: 'First Partner Illustration Collection Series 2', number: '051', name: 'Oshawott' },
  { series: 'First Partner Illustration Collection Series 2', number: '052', name: 'Grookey' },
  { series: 'First Partner Illustration Collection Series 2', number: '053', name: 'Scorbunny' },
  { series: 'First Partner Illustration Collection Series 2', number: '054', name: 'Sobble' },
  { series: 'First Partner Illustration Collection Series 3', number: '055', name: 'Treecko' },
  { series: 'First Partner Illustration Collection Series 3', number: '056', name: 'Torchic' },
  { series: 'First Partner Illustration Collection Series 3', number: '057', name: 'Mudkip' },
  { series: 'First Partner Illustration Collection Series 3', number: '058', name: 'Chespin' },
  { series: 'First Partner Illustration Collection Series 3', number: '059', name: 'Fennekin' },
  { series: 'First Partner Illustration Collection Series 3', number: '060', name: 'Froakie' },
  { series: 'First Partner Illustration Collection Series 3', number: '061', name: 'Sprigatito' },
  { series: 'First Partner Illustration Collection Series 3', number: '062', name: 'Fuecoco' },
  { series: 'First Partner Illustration Collection Series 3', number: '063', name: 'Quaxly' },
].map((row) => ({
  ...row,
  set_key: 'mep',
  set_name: 'MEP Black Star Promos',
  finish_key: 'holo',
  rarity: 'None',
  variant_key: '',
  printed_identity_modifier: null,
  gv_id: `GV-PK-MEP-${row.number}`,
  printing_gv_id: `GV-PK-MEP-${row.number}-HOLO`,
  evidence_urls: [
    'https://bulbapedia.bulbagarden.net/wiki/MEP_Black_Star_Promos_(TCG)',
    'https://www.pokemon.com/us/pokemon-tcg/product-gallery/first-partner-illustration-collection-series-2',
    'https://www.pokemon.com/us/pokemon-tcg/product-gallery/first-partner-illustration-collection-series-3',
  ],
  sources: ['bulbapedia_set_list', 'official_pokemon_product_gallery'],
}));

const BLOCKED_TARGETS = [
  {
    candidate_key: 'ancient-mew-the-power-of-one-promo',
    name: 'Ancient Mew',
    status: 'blocked_set_lane_unresolved',
    reason: 'Ancient Mew is externally documented, but the current DB does not have a governed Movie 2000 / miscellaneous promotional set lane. Do not force it into basep/wp until set governance is explicit.',
    evidence_urls: [
      'https://bulbapedia.bulbagarden.net/wiki/Ancient_Mew_(The_Power_of_One_promo)',
      'https://www.pricecharting.com/game/pokemon-promo/ancient-mew',
    ],
  },
];

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function packageFingerprint(rows, blockedRows) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    ready_rows: rows.map((row) => ({
      set_key: row.set_key,
      number: row.number,
      name: row.name,
      finish_key: row.finish_key,
      gv_id: row.gv_id,
      printing_gv_id: row.printing_gv_id,
    })),
    blocked_rows: blockedRows.map((row) => ({
      candidate_key: row.candidate_key,
      status: row.status,
      reason: row.reason,
    })),
  }));
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const setResult = await client.query(
      `select id::text as set_id, code, name, identity_domain_default
       from public.sets
       where lower(code) = 'mep'`,
    );
    const setRows = setResult.rows;

    const targetJson = JSON.stringify(FIRST_PARTNER_TARGETS);
    const precheck = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           set_key text,
           number text,
           name text,
           finish_key text,
           gv_id text,
           printing_gv_id text
         )
       ),
       projected as (
         select
           target.*,
           public.card_print_identity_backfill_projection_v1(
             s.source, target.set_key, s.code, target.number, regexp_replace(target.number, '^0+', ''), target.name,
             ''::text, s.printed_total, s.printed_set_abbrev
           ) as projection
         from target
         left join public.sets s on lower(s.code) = target.set_key
       )
       select
         target.set_key,
         target.number,
         target.name,
         target.finish_key,
         target.gv_id,
         target.printing_gv_id,
         (select count(*)::int from public.sets s where lower(s.code) = target.set_key) as live_set_rows,
         (select count(*)::int from public.finish_keys fk where fk.key = target.finish_key and fk.is_active = true) as active_finish_rows,
         (select count(*)::int from public.card_prints cp where cp.set_code = target.set_key and cp.number = target.number and lower(cp.name) = lower(target.name) and coalesce(cp.variant_key, '') = '' and cp.printed_identity_modifier is null) as parent_exact_rows,
         (select count(*)::int from public.card_prints cp where cp.gv_id = target.gv_id) as gv_id_collision_rows,
         (select count(*)::int from public.card_printings cpr where cpr.printing_gv_id = target.printing_gv_id) as printing_gv_id_collision_rows,
         (select count(*)::int from public.card_prints cp join public.card_printings cpr on cpr.card_print_id = cp.id where cp.set_code = target.set_key and cp.number = target.number and lower(cp.name) = lower(target.name) and cpr.finish_key = target.finish_key) as child_exact_rows,
         projection->>'status' as identity_projection_status,
         (select count(*)::int from public.card_print_identity cpi where cpi.is_active = true and cpi.identity_domain = projection->>'identity_domain' and cpi.identity_key_version = projection->>'identity_key_version' and cpi.identity_key_hash = projection->>'identity_key_hash') as identity_hash_collision_rows
       from projected target
       order by target.number`,
      [targetJson],
    );

    const rows = precheck.rows.map((row) => {
      const blockers = [];
      if (Number(row.live_set_rows) !== 1) blockers.push('live_mep_set_not_resolved_once');
      if (Number(row.active_finish_rows) !== 1) blockers.push('holo_finish_not_active');
      if (Number(row.parent_exact_rows) !== 0) blockers.push('parent_already_exists');
      if (Number(row.child_exact_rows) !== 0) blockers.push('child_finish_already_exists');
      if (Number(row.gv_id_collision_rows) !== 0) blockers.push('gv_id_collision');
      if (Number(row.printing_gv_id_collision_rows) !== 0) blockers.push('printing_gv_id_collision');
      if (row.identity_projection_status !== 'ready') blockers.push('identity_projection_not_ready');
      if (Number(row.identity_hash_collision_rows) !== 0) blockers.push('identity_hash_collision');
      const source = FIRST_PARTNER_TARGETS.find((target) => target.number === row.number);
      return {
        ...source,
        db_precheck: row,
        readiness_status: blockers.length ? 'blocked' : 'ready_for_guarded_dry_run',
        blockers,
      };
    });

    const readyRows = rows.filter((row) => row.readiness_status === 'ready_for_guarded_dry_run');
    const blockedRows = [
      ...rows.filter((row) => row.readiness_status !== 'ready_for_guarded_dry_run'),
      ...BLOCKED_TARGETS,
    ];
    const fingerprint = packageFingerprint(readyRows, blockedRows);

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      fingerprint_sha256: fingerprint,
      source_scope: {
        english_physical_only: true,
        no_db_writes: true,
        no_migrations: true,
        no_cleanup: true,
        no_external_mapping_inserts: true,
      },
      live_set_rows: setRows,
      summary: {
        total_first_partner_candidates: rows.length,
        ready_for_guarded_dry_run: readyRows.length,
        blocked_first_partner_candidates: rows.length - readyRows.length,
        blocked_special_promos: BLOCKED_TARGETS.length,
        by_series: countBy(rows, (row) => row.series),
        by_readiness_status: countBy(rows, (row) => row.readiness_status),
      },
      ready_rows: readyRows,
      blocked_rows: blockedRows,
      ancient_mew_governance: {
        status: 'blocked_until_set_lane_governed',
        recommendation: 'Create a separate Ancient Mew / Movie 2000 miscellaneous promo set-lane decision before any parent insert.',
      },
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    };

    const md = [
      '# Missing Promo First Partner Readiness V1',
      '',
      `- package_id: \`${PACKAGE_ID}\``,
      `- fingerprint: \`${fingerprint}\``,
      `- ready_for_guarded_dry_run: ${readyRows.length}`,
      `- blocked_rows: ${blockedRows.length}`,
      '',
      '## Ready Rows',
      '',
      markdownTable(
        ['set', 'number', 'name', 'series', 'finish', 'gv_id'],
        readyRows.map((row) => [row.set_key, row.number, row.name, row.series, row.finish_key, row.gv_id]),
      ),
      '',
      '## Blocked Rows',
      '',
      markdownTable(
        ['candidate', 'status', 'reason/blockers'],
        blockedRows.map((row) => [
          row.candidate_key ?? `${row.set_key}-${row.number}-${row.name}`,
          row.status ?? row.readiness_status,
          row.reason ?? (row.blockers ?? []).join(', '),
        ]),
      ),
      '',
      '## Safety',
      '',
      '- db_writes_performed: false',
      '- migrations_created: false',
      '- cleanup_performed: false',
      '- quarantine_performed: false',
      '- Ancient Mew is not insert-ready until its set lane is governed.',
      '',
    ].join('\n');

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, `${md}\n`);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      fingerprint_sha256: fingerprint,
      ready_for_guarded_dry_run: readyRows.length,
      blocked_rows: blockedRows.length,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

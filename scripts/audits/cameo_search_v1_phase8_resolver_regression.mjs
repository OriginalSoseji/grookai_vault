import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const JSON_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase8_resolver_regression_20260520.json');
const MD_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase8_resolver_regression_20260520.md');
const PHASE7_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase7_search_integration_dry_run_20260520.json');

const PROBES = [
  { query: 'pikachu', type: 'plain_identity' },
  { query: 'pikachu cameo', type: 'cameo' },
  { query: 'aerodactyl cameo', type: 'cameo' },
  { query: 'acerola cameo', type: 'cameo' },
  { query: 'GV-PK-CRE-30', type: 'exact_identity' },
];

function sslForConnectionString(connectionString) {
  if (/sslmode=(disable|allow|prefer)/i.test(connectionString)) return false;
  if (/localhost|127\.0\.0\.1|host\.docker\.internal/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function hasRawUuid(value) {
  return /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(JSON.stringify(value));
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# CAMEO_SEARCH_V1 Phase 8 Resolver Regression');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Regression checks for the DB search RPC after the cameo search document integration migration is replayed or applied.');
  lines.push('');
  lines.push('## Results');
  lines.push('');
  for (const probe of report.probes) {
    lines.push(`- \`${probe.query}\`: ${probe.skipped ? 'SKIPPED' : (probe.passed ? 'PASS' : 'FAIL')}; top=${probe.top_result?.display_name ?? 'none'}; label=${probe.top_result?.display_discriminator ?? 'none'}`);
  }
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const [key, value] of Object.entries(report.checks)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No UI changes.');
  lines.push('- No Species Dex changes.');
  lines.push('- No scanner changes.');
  lines.push('- No pricing changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    ssl: sslForConnectionString(connectionString),
    statement_timeout: 120000,
    application_name: 'cameo_search_v1_phase8_resolver_regression',
  });

  await client.connect();
  try {
    let phase7 = null;
    try {
      phase7 = JSON.parse(await fs.readFile(PHASE7_PATH, 'utf8'));
    } catch {
      phase7 = null;
    }
    await client.query('begin transaction read only');
    const dataCounts = await client.query(`
      select
        (select count(*)::int from public.v_print_identity_search_documents_v1) as search_documents,
        (select count(*)::int from public.v_card_print_cameos_public_v1) as public_cameos,
        (select count(*)::int from public.pokemon_species) as pokemon_species
    `);
    const columns = await client.query(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'v_print_identity_search_documents_v1'
        and column_name in ('cameo_search_text', 'cameo_labels')
      order by column_name
    `);
    const publicColumns = await client.query(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'v_card_print_cameos_public_v1'
      order by ordinal_position
    `);
    const dex = await client.query(`
      select
        ps.slug,
        count(distinct cps.card_print_id)::int as total_print_count
      from public.pokemon_species ps
      join public.card_print_species cps
        on cps.species_id = ps.id
       and cps.active
       and cps.counts_for_completion
      where ps.slug in ('pikachu', 'charizard')
      group by ps.slug
      order by ps.slug
    `);
    const probes = [];
    const hasSearchData = dataCounts.rows[0]?.search_documents > 0;
    for (const probe of PROBES) {
      const result = await client.query(
        `
          select *
          from public.search_print_identity_v1(
            q => $1,
            set_code_in => null,
            number_in => null,
            object_type_in => null,
            limit_in => 25,
            offset_in => 0
          )
        `,
        [probe.query],
      );
      const rows = result.rows;
      const top = rows[0] ?? null;
      const cameoRows = rows.filter((row) => String(row.display_discriminator ?? '').startsWith('Cameo'));
      const passed = !hasSearchData
        ? true
        : probe.type === 'cameo'
        ? cameoRows.length > 0
          && cameoRows.every((row) => row.route_path === `/card/${row.parent_gv_id}`)
          && !hasRawUuid(cameoRows)
        : top !== null
          && !String(top.display_discriminator ?? '').startsWith('Cameo')
          && !hasRawUuid(rows);
      probes.push({
        query: probe.query,
        type: probe.type,
        result_count: rows.length,
        cameo_result_count: cameoRows.length,
        top_result: top,
        passed,
        skipped: !hasSearchData,
        skip_reason: !hasSearchData ? 'local replay database has schema but no search/cameo seed rows' : null,
        sample_results: rows.slice(0, 5),
      });
    }
    await client.query('commit');

    const rawUuidColumns = publicColumns.rows.filter((row) => row.data_type === 'uuid');
    const report = {
      generated_at: new Date().toISOString(),
      mode: 'READ_ONLY_REGRESSION',
      migration_under_test: '20260520160000_cameo_search_document_integration_v1.sql',
      data_counts: dataCounts.rows[0],
      data_mode: hasSearchData ? 'SEEDED_REGRESSION' : 'STRUCTURAL_REPLAY_REGRESSION',
      phase7_semantic_dry_run: phase7 ? {
        generated_at: phase7.generated_at,
        ready_for_future_migration: Boolean(phase7.ready_for_future_migration),
        checks: phase7.checks,
      } : null,
      search_document_cameo_columns: columns.rows,
      public_cameo_view_raw_uuid_columns: rawUuidColumns,
      dex_denominator_snapshot: dex.rows,
      probes,
      checks: {
        cameo_columns_present: columns.rows.length === 2,
        probe_checks_pass: probes.every((probe) => probe.passed),
        no_public_cameo_uuid_columns: rawUuidColumns.length === 0,
        species_dex_snapshot_present_or_local_empty: dex.rows.length === 2 || !hasSearchData,
        phase7_semantic_dry_run_passed: Boolean(phase7?.ready_for_future_migration),
      },
      confirmations: {
        db_writes: false,
        ui_changes: false,
        species_dex_changes: false,
        scanner_changes: false,
        pricing_changes: false,
      },
    };
    report.passed = Object.values(report.checks).every(Boolean);

    await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(MD_PATH, buildMarkdown(report));
    console.log(JSON.stringify({
      status: report.passed ? 'pass' : 'blocked',
      json_path: path.relative(ROOT, JSON_PATH),
      md_path: path.relative(ROOT, MD_PATH),
      checks: report.checks,
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback failure after read-only errors
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

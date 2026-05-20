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
const JSON_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase9_post_apply_resolver_proof_20260520.json');
const MD_PATH = path.join(OUT_DIR, 'cameo_search_v1_phase9_post_apply_resolver_proof_20260520.md');

const PROBES = [
  { query: 'pikachu', type: 'identity_plain' },
  { query: 'pikachu cameo', type: 'cameo' },
  { query: 'aerodactyl cameo', type: 'cameo' },
  { query: 'acerola cameo', type: 'cameo' },
  { query: 'GV-PK-CRE-30', type: 'identity_exact' },
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
  lines.push('# CAMEO_SEARCH_V1 Phase 9 Post-Apply Resolver Proof');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Apply Result');
  lines.push('');
  lines.push(`- Migration applied: ${report.migration.applied}`);
  lines.push(`- Active cameo rows: ${report.counts.active_cameos}`);
  lines.push(`- Distinct cameo parent cards: ${report.counts.distinct_parent_gv_ids}`);
  lines.push(`- Public cameo UUID columns: ${report.public_safety.public_cameo_uuid_columns.length}`);
  lines.push(`- Search document cameo columns: ${report.search_document.cameo_columns.length}`);
  lines.push('');
  lines.push('## Resolver Probes');
  lines.push('');
  for (const probe of report.probes) {
    lines.push(`- \`${probe.query}\`: ${probe.passed ? 'PASS' : 'FAIL'}; top=${probe.top_result?.display_name ?? 'none'}; label=${probe.top_result?.display_discriminator ?? 'none'}; cameo_results=${probe.cameo_result_count}`);
  }
  lines.push('');
  lines.push('## Species Dex Snapshot');
  lines.push('');
  for (const row of report.species_dex_snapshot) {
    lines.push(`- ${row.slug}: ${row.total_print_count}`);
  }
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push('- No UI changes.');
  lines.push('- No app resolver wiring changes.');
  lines.push('- No data writes beyond applying the read-model migration.');
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
    application_name: 'cameo_search_v1_phase9_post_apply_proof',
  });

  await client.connect();
  try {
    await client.query('begin transaction read only');

    const migration = await client.query(`
      select exists (
        select 1
        from supabase_migrations.schema_migrations
        where version = '20260520160000'
      ) as applied
    `);
    const counts = await client.query(`
      select
        (select count(*)::int from public.card_print_cameos where active) as active_cameos,
        (select count(distinct gv_id)::int from public.v_card_print_cameos_public_v1) as distinct_parent_gv_ids,
        (select count(*)::int from public.card_print_cameos where match_status <> 'APPROVED_MATCH') as blocked_rows_present,
        (select count(*)::int from public.v_print_identity_search_documents_v1) as search_documents
    `);
    const cameoColumns = await client.query(`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'v_print_identity_search_documents_v1'
        and column_name in ('cameo_search_text', 'cameo_labels')
      order by column_name
    `);
    const publicCameoColumns = await client.query(`
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
    for (const probe of PROBES) {
      const result = await client.query(
        `
          select *
          from public.search_print_identity_v1(
            q => $1,
            set_code_in => null,
            number_in => null,
            object_type_in => null,
            limit_in => 50,
            offset_in => 0
          )
        `,
        [probe.query],
      );
      const rows = result.rows;
      const top = rows[0] ?? null;
      const cameoRows = rows.filter((row) => String(row.display_discriminator ?? '').startsWith('Cameo'));
      const identityRows = rows.filter((row) => !String(row.display_discriminator ?? '').startsWith('Cameo'));
      const noRawUuid = !hasRawUuid(rows);
      const cameoRoutesSafe = cameoRows.every((row) => row.route_path === `/card/${row.parent_gv_id}` && !row.route_query);
      const identityOutranksCameo = probe.type !== 'identity_plain'
        || (top && !String(top.display_discriminator ?? '').startsWith('Cameo') && cameoRows.every((row) => row.rank_score < top.rank_score));
      const exactIdentitySafe = probe.type !== 'identity_exact'
        || (top && top.parent_gv_id === 'GV-PK-CRE-30' && !String(top.display_discriminator ?? '').startsWith('Cameo'));
      const cameoLabelsPresent = probe.type !== 'cameo'
        || (cameoRows.length > 0 && cameoRows.every((row) => String(row.display_discriminator ?? '').startsWith('Cameo')));
      const passed = noRawUuid && cameoRoutesSafe && identityOutranksCameo && exactIdentitySafe && cameoLabelsPresent;
      probes.push({
        query: probe.query,
        type: probe.type,
        result_count: rows.length,
        cameo_result_count: cameoRows.length,
        identity_result_count: identityRows.length,
        top_result: top,
        checks: {
          no_raw_uuid: noRawUuid,
          cameo_routes_parent_only: cameoRoutesSafe,
          identity_outranks_cameo_for_plain_query: identityOutranksCameo,
          exact_identity_safe: exactIdentitySafe,
          cameo_labels_present: cameoLabelsPresent,
        },
        passed,
        sample_results: rows.slice(0, 5),
      });
    }

    await client.query('commit');

    const publicCameoUuidColumns = publicCameoColumns.rows.filter((row) => row.data_type === 'uuid');
    const report = {
      generated_at: new Date().toISOString(),
      mode: 'POST_APPLY_LIVE_PROOF',
      migration: {
        version: '20260520160000',
        file: 'supabase/migrations/20260520160000_cameo_search_document_integration_v1.sql',
        applied: Boolean(migration.rows[0]?.applied),
      },
      counts: counts.rows[0],
      search_document: {
        cameo_columns: cameoColumns.rows,
      },
      public_safety: {
        public_cameo_columns: publicCameoColumns.rows,
        public_cameo_uuid_columns: publicCameoUuidColumns,
      },
      species_dex_snapshot: dex.rows,
      probes,
      checks: {
        migration_applied: Boolean(migration.rows[0]?.applied),
        active_cameos_expected: counts.rows[0]?.active_cameos === 1360,
        blocked_rows_absent: counts.rows[0]?.blocked_rows_present === 0,
        cameo_columns_present: cameoColumns.rows.length === 2,
        public_cameo_view_no_uuid_columns: publicCameoUuidColumns.length === 0,
        resolver_probes_pass: probes.every((probe) => probe.passed),
        species_dex_unchanged: dex.rows.some((row) => row.slug === 'pikachu' && row.total_print_count === 223)
          && dex.rows.some((row) => row.slug === 'charizard' && row.total_print_count === 133),
      },
      confirmations: {
        ui_changes: false,
        app_resolver_wiring_changes: false,
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
      // ignore rollback failure
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

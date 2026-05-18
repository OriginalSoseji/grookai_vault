import '../../backend/env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'grookai_dex_v1');
const OUT_JSON = path.join(OUT_DIR, 'grookai_dex_v1_checkpoint_20260518.json');
const OUT_MD = path.join(OUT_DIR, 'grookai_dex_v1_checkpoint_20260518.md');
const SAMPLE_USER_ID = process.env.GROOKAI_DEX_SMOKE_USER_ID ?? '03e80d15-a2bb-4d3c-abd1-2de03e55787b';
const SAMPLE_SPECIES = ['pikachu', 'charizard'];

function createClient() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required.');
  }

  return new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'grookai_dex_checkpoint_v1',
    statement_timeout: 60000,
    ssl: { rejectUnauthorized: false },
  });
}

async function queryOne(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? {};
}

async function main() {
  const client = createClient();
  await client.connect();

  try {
    const counts = await queryOne(client, `
      select
        (select count(*)::int from public.pokemon_species) as species_count,
        (select count(*)::int from public.card_print_species) as mapping_count,
        (select count(*)::int from public.card_print_species where active and counts_for_completion) as completion_mapping_count,
        (select count(*)::int from public.v_grookai_dex_species_v1) as species_view_count,
        (select count(*)::int from public.v_grookai_dex_card_prints_v1) as card_print_view_count
    `);

    const speciesRows = await client.query(
      `
        select slug, display_name, total_print_count
        from public.v_grookai_dex_species_v1
        where slug = any($1::text[])
        order by slug
      `,
      [SAMPLE_SPECIES],
    );

    const userRows = await client.query(
      `
        with target_species as (
          select id, slug, display_name
          from public.pokemon_species
          where slug = any($2::text[])
        ),
        denominator as (
          select ts.slug, cps.card_print_id
          from target_species ts
          join public.card_print_species cps
            on cps.species_id = ts.id
          where cps.active = true
            and cps.counts_for_completion = true
        ),
        owned as (
          select d.slug, vii.card_print_id, count(vii.id)::int as copy_count
          from denominator d
          join public.vault_item_instances vii
            on vii.card_print_id = d.card_print_id
           and vii.user_id = $1::uuid
           and vii.archived_at is null
          group by d.slug, vii.card_print_id
        )
        select
          d.slug,
          count(distinct d.card_print_id)::int as total_print_count,
          count(distinct owned.card_print_id)::int as owned_print_count,
          coalesce(sum(owned.copy_count), 0)::int as owned_copy_count,
          (count(distinct d.card_print_id) - count(distinct owned.card_print_id))::int as missing_print_count
        from denominator d
        left join owned
          on owned.slug = d.slug
         and owned.card_print_id = d.card_print_id
        group by d.slug
        order by d.slug
      `,
      [SAMPLE_USER_ID, SAMPLE_SPECIES],
    );

    const report = {
      contract: 'GROOKAI_DEX_V1',
      generated_at: new Date().toISOString(),
      sample_user_id: SAMPLE_USER_ID,
      counts,
      species_samples: speciesRows.rows,
      user_progress_samples: userRows.rows,
      status: counts.species_count === 1025 && counts.mapping_count > 0 ? 'CHECKPOINT_CREATED' : 'CHECKPOINT_INCOMPLETE',
      notes: [
        'Feature flag remains off by default.',
        'No scanner, pricing, or DB remediation changes are part of this checkpoint.',
      ],
    };

    const lines = [
      '# Grookai Dex V1 Checkpoint',
      '',
      `Generated: ${report.generated_at}`,
      `Status: ${report.status}`,
      '',
      '## Remote Counts',
      '',
      `- Species rows: ${counts.species_count}`,
      `- Mapping rows: ${counts.mapping_count}`,
      `- Completion mapping rows: ${counts.completion_mapping_count}`,
      `- Species view rows: ${counts.species_view_count}`,
      `- Card-print view rows: ${counts.card_print_view_count}`,
      '',
      '## Species Samples',
      '',
      ...speciesRows.rows.map((row) => `- ${row.display_name} (${row.slug}): ${row.total_print_count}`),
      '',
      '## Known User Progress Samples',
      '',
      `Sample user: ${SAMPLE_USER_ID}`,
      '',
      ...userRows.rows.map(
        (row) =>
          `- ${row.slug}: ${row.owned_print_count}/${row.total_print_count} unique prints, ${row.owned_copy_count} copies, ${row.missing_print_count} missing`,
      ),
      '',
      '## Flag State',
      '',
      '- Public flag is not enabled by this checkpoint.',
      '- Routes remain guarded by `GROOKAI_DEX_V1_ENABLED` / `NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED`.',
    ];

    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(OUT_MD, `${lines.join('\n')}\n`, 'utf8');

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[grookai-dex:checkpoint] fatal:', error);
  process.exitCode = 1;
});

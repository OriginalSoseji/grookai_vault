import {
  SPECIES_AUDIT_JSON_PATH,
  SPECIES_AUDIT_MD_PATH,
  loadSpeciesSeed,
  parseArgs,
  validateSpeciesSeed,
  writeJson,
  writeText,
} from './grookai_dex_common_v1.mjs';
import '../env.mjs';
import pg from 'pg';

const { Client } = pg;

function createPgClient() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('[grookai-dex:species] SUPABASE_DB_URL is required for apply.');
  }

  return new Client({
    connectionString,
    application_name: 'grookai_dex_species_worker_v1',
    statement_timeout: 120000,
    ssl: { rejectUnauthorized: false },
  });
}

async function applySpecies(seedBundle) {
  const client = createPgClient();
  await client.connect();
  let written = 0;

  try {
    await client.query('begin');
    for (const row of seedBundle.species) {
      await client.query(
        `
          insert into public.pokemon_species (
            national_dex_number,
            canonical_name,
            display_name,
            slug,
            source,
            source_ref,
            active
          )
          values ($1, $2, $3, $4, 'grookai_dex_seed_v1', $5::jsonb, true)
          on conflict (slug) do update
          set
            national_dex_number = excluded.national_dex_number,
            canonical_name = excluded.canonical_name,
            display_name = excluded.display_name,
            source = excluded.source,
            source_ref = excluded.source_ref,
            active = true,
            updated_at = now()
        `,
        [
          row.nationalDexNumber,
          row.canonicalName,
          row.displayName,
          row.slug,
          JSON.stringify({
            source: seedBundle.metadata.source ?? null,
            sourceUrl: seedBundle.metadata.sourceUrl ?? null,
          }),
        ],
      );
      written += 1;
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  return written;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Grookai Dex Species Dry Run');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Status: ${report.status}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Species rows: ${report.summary.species_count}`);
  lines.push(`- Expected species rows: ${report.summary.expected_species_count}`);
  lines.push(`- First National Dex number: ${report.summary.first_national_dex_number}`);
  lines.push(`- Last National Dex number: ${report.summary.last_national_dex_number}`);
  lines.push(`- Errors: ${report.errors.length}`);
  lines.push(`- Warnings: ${report.warnings.length}`);
  lines.push('');
  if (report.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const error of report.errors) {
      lines.push(`- ${error}`);
    }
    lines.push('');
  }
  if (report.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }
  lines.push('## Apply Gate');
  lines.push('');
  lines.push(report.apply_allowed ? 'Apply is allowed by this species gate.' : 'Apply is blocked by this species gate.');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const seedBundle = await loadSpeciesSeed();
  const validation = validateSpeciesSeed(seedBundle);
  const errors = [...validation.errors];
  const warnings = [...validation.warnings];

  if (options.failOnWarnings && warnings.length > 0) {
    errors.push('warnings_present_with_fail_on_warnings');
  }

  let rowsWritten = 0;
  if (options.apply && errors.length === 0) {
    rowsWritten = await applySpecies(seedBundle);
  }

  const dexNumbers = seedBundle.species.map((row) => row.nationalDexNumber);
  const report = {
    contract: 'GROOKAI_DEX_V1',
    generated_at: new Date().toISOString(),
    mode: options.apply ? 'apply' : 'dry-run',
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    apply_allowed: errors.length === 0,
    summary: {
      species_count: seedBundle.species.length,
      rows_written: rowsWritten,
      expected_species_count: seedBundle.metadata.expectedSpeciesCount ?? null,
      source: seedBundle.metadata.source ?? null,
      source_url: seedBundle.metadata.sourceUrl ?? null,
      first_national_dex_number: Math.min(...dexNumbers),
      last_national_dex_number: Math.max(...dexNumbers),
    },
    warnings,
    errors,
    sample: seedBundle.species.slice(0, 5),
  };

  await writeJson(SPECIES_AUDIT_JSON_PATH, report);
  await writeText(SPECIES_AUDIT_MD_PATH, buildMarkdown(report));

  console.log(`[grookai-dex:species] status=${report.status}`);
  console.log(`[grookai-dex:species] species_count=${report.summary.species_count}`);
  console.log(`[grookai-dex:species] audit_json=${SPECIES_AUDIT_JSON_PATH}`);
  console.log(`[grookai-dex:species] audit_md=${SPECIES_AUDIT_MD_PATH}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[grookai-dex:species] fatal:', error);
  process.exitCode = 1;
});

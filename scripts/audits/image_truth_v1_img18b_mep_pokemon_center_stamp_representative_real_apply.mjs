import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const DRY_RUN_JSON = path.join(
  OUTPUT_DIR,
  'image_truth_img18a_mep_pokemon_center_stamp_representative_dry_run_v1.json',
);
const RESULT_JSON = path.join(
  OUTPUT_DIR,
  'image_truth_img18b_mep_pokemon_center_stamp_representative_real_apply_result_v1.json',
);
const RESULT_MD = path.join(
  OUTPUT_DIR,
  'image_truth_img18b_mep_pokemon_center_stamp_representative_real_apply_result_v1.md',
);
const PACKAGE_ID = 'IMG-18B-MEP-POKEMON-CENTER-STAMP-REPRESENTATIVE-CHILD-IMAGE-REAL-APPLY';
const EXPECTED_DRY_RUN_PACKAGE_ID = 'IMG-18A-MEP-POKEMON-CENTER-STAMP-REPRESENTATIVE-CHILD-IMAGE-DRY-RUN';

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null, sqlHash: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--sql-hash') args.sqlHash = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

async function fetchChildRow(client, cardPrintingId) {
  const result = await client.query(
    `
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.printing_gv_id,
        cpi.finish_key,
        cpi.image_source,
        cpi.image_path,
        cpi.image_url,
        cpi.image_alt_url,
        cpi.image_status,
        cpi.image_note,
        cp.gv_id as parent_gv_id,
        cp.name as card_name,
        cp.set_code,
        cp.number,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source as parent_image_source,
        cp.image_path as parent_image_path,
        cp.image_url as parent_image_url,
        cp.image_alt_url as parent_image_alt_url,
        cp.representative_image_url as parent_representative_image_url,
        cp.image_status as parent_image_status,
        cp.image_note as parent_image_note
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cpi.id = $1
      limit 1
    `,
    [cardPrintingId],
  );
  return result.rows[0] ?? null;
}

function parentSnapshot(row) {
  return {
    parent_gv_id: row?.parent_gv_id ?? null,
    card_name: row?.card_name ?? null,
    set_code: row?.set_code ?? null,
    number: row?.number ?? null,
    variant_key: row?.variant_key ?? null,
    printed_identity_modifier: row?.printed_identity_modifier ?? null,
    parent_image_source: clean(row?.parent_image_source),
    parent_image_path: clean(row?.parent_image_path),
    parent_image_url: clean(row?.parent_image_url),
    parent_image_alt_url: clean(row?.parent_image_alt_url),
    parent_representative_image_url: clean(row?.parent_representative_image_url),
    parent_image_status: clean(row?.parent_image_status),
    parent_image_note: clean(row?.parent_image_note),
  };
}

function validateDryRun(dryRun, args) {
  if (dryRun.package_id !== EXPECTED_DRY_RUN_PACKAGE_ID) {
    throw new Error(`Dry-run package mismatch: ${dryRun.package_id}`);
  }
  if (dryRun.db_writes_performed !== false) throw new Error('Dry-run report is not read-only.');
  if (dryRun.migrations_created !== false) throw new Error('Dry-run report created migrations.');
  if (dryRun.storage_uploads_performed !== false) throw new Error('Dry-run report performed storage uploads.');
  if (dryRun.summary?.ready_rows !== 4) throw new Error('Dry-run ready row count is not 4.');
  if (dryRun.summary?.blocked_rows !== 0) throw new Error('Dry-run blocked row count is not 0.');
  if (dryRun.summary?.planned_child_image_updates !== 4) throw new Error('Dry-run planned update count is not 4.');
  if (dryRun.summary?.exact_stamped_image_claim !== false) {
    throw new Error('Dry-run would claim exact stamped image coverage.');
  }
  if (args.fingerprint !== dryRun.fingerprint) {
    throw new Error(`Fingerprint mismatch. Expected ${dryRun.fingerprint}.`);
  }
  if (args.sqlHash !== dryRun.sql_hash) {
    throw new Error(`SQL hash mismatch. Expected ${dryRun.sql_hash}.`);
  }
}

function validatePlannedRow(row) {
  const errors = [];
  if (!row.ready) errors.push('dry_run_row_not_ready');
  if (row.violations?.length > 0) errors.push('dry_run_row_has_violations');
  if (row.variant_key !== 'pokemon_center_stamp') errors.push('variant_key_mismatch');
  if (row.printed_identity_modifier !== 'pokemon_center_stamp') errors.push('printed_identity_modifier_mismatch');
  if (row.finish_key !== 'holo') errors.push('finish_key_mismatch');
  if (row.planned_update?.image_source !== 'identity') errors.push('planned_image_source_mismatch');
  if (!clean(row.planned_update?.image_path)) errors.push('planned_image_path_missing');
  if (clean(row.planned_update?.image_url)) errors.push('planned_image_url_should_be_null');
  if (clean(row.planned_update?.image_alt_url)) errors.push('planned_image_alt_url_should_be_null');
  if (row.planned_update?.image_status !== 'representative_shared_stamp') errors.push('planned_image_status_mismatch');
  if (!String(row.planned_update?.image_note ?? '').includes('not_exact_stamped_image')) {
    errors.push('planned_note_missing_not_exact_disclaimer');
  }
  return errors;
}

function validateCurrentBefore(row, current) {
  const errors = [];
  if (!current) {
    errors.push('target_missing');
    return errors;
  }
  if (current.card_print_id !== row.card_print_id) errors.push('card_print_id_mismatch');
  if (current.printing_gv_id !== row.printing_gv_id) errors.push('printing_gv_id_mismatch');
  if (current.finish_key !== row.finish_key) errors.push('finish_key_mismatch');
  if (current.variant_key !== 'pokemon_center_stamp') errors.push('current_variant_key_mismatch');
  if (current.printed_identity_modifier !== 'pokemon_center_stamp') {
    errors.push('current_printed_identity_modifier_mismatch');
  }
  if (clean(current.image_path)) errors.push('current_child_image_path_already_present');
  if (clean(current.image_url)) errors.push('current_child_image_url_already_present');
  if (clean(current.image_alt_url)) errors.push('current_child_image_alt_url_already_present');
  return errors;
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildMarkdown(report) {
  return `# ${PACKAGE_ID}

Generated: ${report.generated_at}

## Safety

- dry_run_fingerprint: \`${report.dry_run_fingerprint}\`
- sql_hash: \`${report.sql_hash}\`
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- storage_uploads_performed: ${report.storage_uploads_performed}
- parent_writes_performed: ${report.parent_writes_performed}
- deletes_performed: ${report.deletes_performed}
- merges_performed: ${report.merges_performed}
- exact_stamped_image_claim: ${report.exact_stamped_image_claim}

## Summary

- child_image_rows_updated: ${report.summary.child_image_rows_updated}
- target_rows: ${report.summary.target_rows}
- post_verify_matching_rows: ${report.post_verify.matching_rows}
- post_verify_missing_display_rows_for_targets: ${report.post_verify.missing_display_rows_for_targets}
- apply_proof_hash: \`${report.apply_proof_hash}\`

## Updated Rows

${markdownTable(report.updated_rows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'image status', value: (row) => row.image_status },
  { label: 'source base printing', value: (row) => row.source_base_printing_gv_id },
])}

## Notes

These are representative images only. They are same set/number/name base MEP images used to avoid broken display for Pokemon Center stamped identities until exact stamped imagery is acquired.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.apply) throw new Error('Refusing to run without --apply.');

  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');
  const dryRun = JSON.parse(await fs.readFile(DRY_RUN_JSON, 'utf8'));
  validateDryRun(dryRun, args);

  const plannedRows = dryRun.rows ?? [];
  if (plannedRows.length !== 4) throw new Error('Dry-run row count is not 4.');

  const planErrors = plannedRows.flatMap((row) => validatePlannedRow(row).map((error) => ({
    card_printing_id: row.card_printing_id,
    error,
  })));
  if (planErrors.length > 0) {
    throw new Error(`Plan validation failed: ${JSON.stringify(planErrors)}`);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('begin');

    const updatedRows = [];
    for (const row of plannedRows) {
      const before = await fetchChildRow(client, row.card_printing_id);
      const parentBeforeHash = proofHash(parentSnapshot(before));
      const beforeErrors = validateCurrentBefore(row, before);
      if (beforeErrors.length > 0) {
        throw new Error(`Pre-apply validation failed for ${row.printing_gv_id}: ${beforeErrors.join(',')}`);
      }

      const update = await client.query(
        `
          update public.card_printings
             set image_source = $2,
                 image_path = $3,
                 image_url = $4,
                 image_alt_url = $5,
                 image_status = $6,
                 image_note = $7
           where id = $1
             and image_path is null
             and image_url is null
             and image_alt_url is null
          returning id, image_source, image_path, image_url, image_alt_url, image_status, image_note
        `,
        [
          row.card_printing_id,
          row.planned_update.image_source,
          row.planned_update.image_path,
          row.planned_update.image_url,
          row.planned_update.image_alt_url,
          row.planned_update.image_status,
          row.planned_update.image_note,
        ],
      );
      if (update.rowCount !== 1) {
        throw new Error(`Expected one child image update for ${row.printing_gv_id}, got ${update.rowCount}.`);
      }

      const after = await fetchChildRow(client, row.card_printing_id);
      const parentAfterHash = proofHash(parentSnapshot(after));
      if (parentBeforeHash !== parentAfterHash) {
        throw new Error(`Parent fields changed for ${row.printing_gv_id}.`);
      }
      if (after.image_source !== row.planned_update.image_source) throw new Error('post_image_source_mismatch');
      if (after.image_path !== row.planned_update.image_path) throw new Error('post_image_path_mismatch');
      if (clean(after.image_url)) throw new Error('post_image_url_should_be_empty');
      if (clean(after.image_alt_url)) throw new Error('post_image_alt_url_should_be_empty');
      if (after.image_status !== row.planned_update.image_status) throw new Error('post_image_status_mismatch');
      if (after.image_note !== row.planned_update.image_note) throw new Error('post_image_note_mismatch');

      updatedRows.push({
        card_printing_id: row.card_printing_id,
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        printing_gv_id: row.printing_gv_id,
        parent_gv_id: row.parent_gv_id,
        source_base_printing_gv_id: row.source_base_printing_gv_id,
        image_source: after.image_source,
        image_path: after.image_path,
        image_status: after.image_status,
        parent_fields_unchanged: true,
      });
    }

    const postVerify = await client.query(
      `
        select
          count(*) filter (
            where cpi.image_source = 'identity'
              and cpi.image_path is not null
              and cpi.image_url is null
              and cpi.image_alt_url is null
              and cpi.image_status = 'representative_shared_stamp'
          )::int as matching_rows,
          count(*) filter (
            where cpi.image_path is null
              and cpi.image_url is null
              and cpi.image_alt_url is null
          )::int as missing_display_rows_for_targets
        from public.card_printings cpi
        where cpi.id = any($1::uuid[])
      `,
      [plannedRows.map((row) => row.card_printing_id)],
    );

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      dry_run_fingerprint: dryRun.fingerprint,
      sql_hash: dryRun.sql_hash,
      db_writes_performed: true,
      migrations_created: false,
      storage_uploads_performed: false,
      parent_writes_performed: false,
      deletes_performed: false,
      merges_performed: false,
      exact_stamped_image_claim: false,
      summary: {
        target_rows: plannedRows.length,
        child_image_rows_updated: updatedRows.length,
      },
      post_verify: {
        matching_rows: Number(postVerify.rows[0]?.matching_rows ?? 0),
        missing_display_rows_for_targets: Number(postVerify.rows[0]?.missing_display_rows_for_targets ?? 0),
      },
      updated_rows: updatedRows,
    };
    report.apply_proof_hash = proofHash({
      package_id: report.package_id,
      dry_run_fingerprint: report.dry_run_fingerprint,
      sql_hash: report.sql_hash,
      summary: report.summary,
      post_verify: report.post_verify,
      updated_rows: report.updated_rows,
    });

    if (report.post_verify.matching_rows !== 4) throw new Error('Post-verify matching rows is not 4.');
    if (report.post_verify.missing_display_rows_for_targets !== 0) {
      throw new Error('Post-verify still has missing display rows for targets.');
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(RESULT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(RESULT_MD, buildMarkdown(report));
    await client.query('commit');

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      apply_proof_hash: report.apply_proof_hash,
      summary: report.summary,
      post_verify: report.post_verify,
      outputs: [RESULT_JSON, RESULT_MD],
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original failure.
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

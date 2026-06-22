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
  'image_truth_img_cc01_poke_card_creator_child_image_dry_run_v1.json',
);
const RESULT_JSON = path.join(
  OUTPUT_DIR,
  'image_truth_img_cc01_poke_card_creator_child_image_real_apply_result_v1.json',
);
const RESULT_MD = path.join(
  OUTPUT_DIR,
  'image_truth_img_cc01_poke_card_creator_child_image_real_apply_result_v1.md',
);

const PACKAGE_ID = 'IMG-CC-01-POKE-CARD-CREATOR-CHILD-IMAGE-REAL-APPLY';
const EXPECTED_DRY_RUN_PACKAGE_ID = 'IMG-CC-01-POKE-CARD-CREATOR-CHILD-IMAGE-DRY-RUN';
const EXPECTED_FINGERPRINT = 'd1d167145b8121243a3a79d45b3e7690f37f5198fa568f1957b644ab1d99196e';
const EXPECTED_SQL_HASH = '9f342859493e79fb555e2647a7cb5ae9aea5240ee13a0d3f5aec2728696e5dd1';
const EXPECTED_DRY_RUN_PROOF = '051a4f031879a731f218ca2725a7401f3109bbc4e5e53e7db4594dbc9348a711';
const EXPECTED_READY_ROWS = 5;

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
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

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function validateDryRun(dryRun) {
  const errors = [];
  if (dryRun.package_id !== EXPECTED_DRY_RUN_PACKAGE_ID) errors.push('package_id_mismatch');
  if (dryRun.fingerprint !== EXPECTED_FINGERPRINT) errors.push('fingerprint_mismatch');
  if (dryRun.sql_hash !== EXPECTED_SQL_HASH) errors.push('sql_hash_mismatch');
  if (dryRun.summary?.ready_rows !== EXPECTED_READY_ROWS) errors.push('ready_rows_mismatch');
  if (dryRun.summary?.blocked_rows !== 0) errors.push('blocked_rows_not_zero');
  if (dryRun.summary?.planned_child_image_updates !== EXPECTED_READY_ROWS) {
    errors.push('planned_child_image_updates_mismatch');
  }
  if (dryRun.db_writes_performed !== false) errors.push('dry_run_db_writes_not_false');
  if (dryRun.migrations_created !== false) errors.push('dry_run_migrations_not_false');
  if (dryRun.storage_uploads_performed !== false) errors.push('dry_run_storage_uploads_not_false');
  if (dryRun.parent_writes_performed !== false) errors.push('dry_run_parent_writes_not_false');
  if (dryRun.deletes_performed !== false) errors.push('dry_run_deletes_not_false');
  if (dryRun.merges_performed !== false) errors.push('dry_run_merges_not_false');
  if (dryRun.dry_run_proof?.before_hash !== EXPECTED_DRY_RUN_PROOF) errors.push('before_hash_mismatch');
  if (dryRun.dry_run_proof?.after_rollback_hash !== EXPECTED_DRY_RUN_PROOF) errors.push('after_hash_mismatch');
  if (dryRun.dry_run_proof?.rollback_restored !== true) errors.push('rollback_not_restored');

  const readyRows = (dryRun.rows ?? []).filter((row) => row.ready);
  if (readyRows.length !== EXPECTED_READY_ROWS) errors.push('ready_row_array_mismatch');
  for (const row of readyRows) {
    if (row.finish_key !== 'normal') errors.push(`finish_key_mismatch:${row.printing_gv_id}`);
    if (row.planned_update?.image_status !== 'exact_parent_image') {
      errors.push(`image_status_mismatch:${row.printing_gv_id}`);
    }
    if (!clean(row.planned_update?.image_url) && !clean(row.planned_update?.image_path)) {
      errors.push(`planned_image_missing:${row.printing_gv_id}`);
    }
    if (row.mapping_active !== true || row.counts_for_completion !== true) {
      errors.push(`dex_mapping_not_ready:${row.printing_gv_id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Dry-run validation failed: ${errors.join(', ')}`);
  }
  return readyRows;
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

async function fetchCurrentRows(client, rows) {
  const ids = rows.map((row) => row.card_printing_id);
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
        cp.set_code,
        cp.number,
        cp.name as card_name
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cpi.id = any($1::uuid[])
      order by cp.number_plain nulls last, cp.number
    `,
    [ids],
  );
  return result.rows;
}

async function fetchProofSnapshot(client, rows) {
  const ids = rows.map((row) => row.card_printing_id);
  const result = await client.query(
    `
      select
        id,
        card_print_id,
        printing_gv_id,
        finish_key,
        image_source,
        image_path,
        image_url,
        image_alt_url,
        image_status,
        image_note
      from public.card_printings
      where id = any($1::uuid[])
      order by id
    `,
    [ids],
  );
  return result.rows;
}

function buildMarkdown(report) {
  return `# ${PACKAGE_ID}

Generated: ${report.generated_at}

## Safety

- dry_run_fingerprint: \`${report.dry_run_fingerprint}\`
- sql_hash: \`${report.sql_hash}\`
- dry_run_proof: \`${report.dry_run_proof}\`
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- storage_uploads_performed: ${report.storage_uploads_performed}
- parent_writes_performed: ${report.parent_writes_performed}
- deletes_performed: ${report.deletes_performed}
- merges_performed: ${report.merges_performed}

## Summary

- child_image_rows_updated: ${report.summary.child_image_rows_updated}
- target_rows: ${report.summary.target_rows}
- post_verify_matching_rows: ${report.post_verify.matching_rows}
- post_verify_missing_rows: ${report.post_verify.missing_rows}
- apply_proof_hash: \`${report.apply_proof_hash}\`

## Updated Rows

${markdownTable(report.updated_rows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'status', value: (row) => row.image_status },
])}
`;
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const dryRun = JSON.parse(await fs.readFile(DRY_RUN_JSON, 'utf8'));
  const readyRows = validateDryRun(dryRun);
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const beforeRows = await fetchProofSnapshot(client, readyRows);
    const beforeHash = proofHash(beforeRows);
    if (beforeHash !== EXPECTED_DRY_RUN_PROOF) {
      throw new Error(`Current pre-apply hash mismatch: ${beforeHash}`);
    }

    await client.query('begin');
    await client.query(`
      create temp table img_cc01_targets (
        card_printing_id uuid primary key,
        image_source text not null,
        image_path text,
        image_url text,
        image_alt_url text,
        image_status text not null,
        image_note text not null
      ) on commit drop
    `);
    await client.query(
      `
        insert into img_cc01_targets (
          card_printing_id,
          image_source,
          image_path,
          image_url,
          image_alt_url,
          image_status,
          image_note
        )
        select
          card_printing_id,
          image_source,
          image_path,
          image_url,
          image_alt_url,
          image_status,
          image_note
        from jsonb_to_recordset($1::jsonb) as target(
          card_printing_id uuid,
          image_source text,
          image_path text,
          image_url text,
          image_alt_url text,
          image_status text,
          image_note text
        )
      `,
      [
        JSON.stringify(
          readyRows.map((row) => ({
            card_printing_id: row.card_printing_id,
            image_source: row.planned_update.image_source,
            image_path: row.planned_update.image_path,
            image_url: row.planned_update.image_url,
            image_alt_url: row.planned_update.image_alt_url,
            image_status: row.planned_update.image_status,
            image_note: row.planned_update.image_note,
          })),
        ),
      ],
    );

    const guard = await client.query(`
      select
        (select count(*)::int from img_cc01_targets) as target_rows,
        (
          select count(*)::int
          from public.card_printings cpi
          join img_cc01_targets target on target.card_printing_id = cpi.id
          where cpi.image_path is null
            and cpi.image_url is null
            and cpi.image_alt_url is null
        ) as writable_rows
    `);
    if (guard.rows[0].target_rows !== EXPECTED_READY_ROWS || guard.rows[0].writable_rows !== EXPECTED_READY_ROWS) {
      throw new Error(`Apply guard failed: ${JSON.stringify(guard.rows[0])}`);
    }

    const updateResult = await client.query(`
      update public.card_printings cpi
         set image_source = target.image_source,
             image_path = target.image_path,
             image_url = target.image_url,
             image_alt_url = target.image_alt_url,
             image_status = target.image_status,
             image_note = target.image_note
        from img_cc01_targets target
       where cpi.id = target.card_printing_id
         and cpi.image_path is null
         and cpi.image_url is null
         and cpi.image_alt_url is null
    `);

    const postVerify = await client.query(`
      select
        count(*)::int as target_rows,
        count(*) filter (where cpi.image_status = 'exact_parent_image')::int as matching_rows,
        count(*) filter (
          where cpi.image_path is null
            and cpi.image_url is null
            and cpi.image_alt_url is null
        )::int as missing_rows
      from public.card_printings cpi
      join img_cc01_targets target on target.card_printing_id = cpi.id
    `);

    if (updateResult.rowCount !== EXPECTED_READY_ROWS) {
      throw new Error(`Expected ${EXPECTED_READY_ROWS} updates, got ${updateResult.rowCount}`);
    }
    if (postVerify.rows[0].matching_rows !== EXPECTED_READY_ROWS || postVerify.rows[0].missing_rows !== 0) {
      throw new Error(`Post-verify failed: ${JSON.stringify(postVerify.rows[0])}`);
    }

    await client.query('commit');

    const updatedRows = await fetchCurrentRows(client, readyRows);
    const applyProofHash = proofHash({
      updated_rows: updatedRows.map((row) => ({
        printing_gv_id: row.printing_gv_id,
        image_source: row.image_source,
        image_path: row.image_path,
        image_url: row.image_url,
        image_alt_url: row.image_alt_url,
        image_status: row.image_status,
      })),
      post_verify: postVerify.rows[0],
    });

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      dry_run_fingerprint: EXPECTED_FINGERPRINT,
      sql_hash: EXPECTED_SQL_HASH,
      dry_run_proof: EXPECTED_DRY_RUN_PROOF,
      summary: {
        target_rows: EXPECTED_READY_ROWS,
        child_image_rows_updated: updateResult.rowCount,
      },
      post_verify: postVerify.rows[0],
      updated_rows: updatedRows,
      apply_proof_hash: applyProofHash,
      db_writes_performed: true,
      migrations_created: false,
      storage_uploads_performed: false,
      parent_writes_performed: false,
      deletes_performed: false,
      merges_performed: false,
      global_apply_performed: false,
    };

    await fs.writeFile(RESULT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(RESULT_MD, buildMarkdown(report));
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      apply_status: 'committed',
      output_json: RESULT_JSON,
      output_md: RESULT_MD,
      child_image_rows_updated: updateResult.rowCount,
      post_verify: postVerify.rows[0],
      apply_proof_hash: applyProofHash,
      db_writes_performed: true,
      migrations_created: false,
    }, null, 2));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

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
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'image_truth_img_finish01b_mep_cosmos_finish_update_guarded_dry_run_v1.json');
const APPLY_JSON = path.join(OUTPUT_DIR, 'image_truth_img_finish01b_mep_cosmos_finish_update_real_apply_result_v1.json');
const APPLY_MD = path.join(OUTPUT_DIR, 'image_truth_img_finish01b_mep_cosmos_finish_update_real_apply_result_v1.md');

const PACKAGE_ID = 'IMG-FINISH-01B-MEP-COSMOS-FINISH-UPDATE';
const APPROVED_FINGERPRINT = '0281e5ea0b40896e7a9d171e823a6f02b25953cb0a6064a1ab2d362f18feb692';
const APPROVED_DRY_RUN_PROOF_HASH = 'a6a014f5aadee2a1f9ce40a1f97612ab4ec0916a7415f15df2cb176e82f1c8b1';
const APPROVAL_TEXT = 'Approve real IMG-FINISH-01B-MEP-COSMOS-FINISH-UPDATE apply only. Fingerprint: 0281e5ea0b40896e7a9d171e823a6f02b25953cb0a6064a1ab2d362f18feb692. Scope: 4 child card_printing finish_key updates for MEP Black Star Promos #018 Cottonee, #019 Whimsicott, #020 Sneasel, and #021 Weavile from holo to cosmos. Dry-run proof: a6a014f5aadee2a1f9ce40a1f97612ab4ec0916a7415f15df2cb176e82f1c8b1 == a6a014f5aadee2a1f9ce40a1f97612ab4ec0916a7415f15df2cb176e82f1c8b1. No image writes. No parent writes. No deletes. No merges. No migrations. No global apply.';

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
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
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
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

async function fetchTargets(client, ids) {
  const result = await client.query(
    `
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.image_source,
        cpi.image_path,
        cpi.image_url,
        cpi.image_alt_url,
        cp.set_code,
        cp.number,
        cp.name as card_name,
        cp.printed_identity_modifier,
        array_remove(array_agg(distinct sibling.finish_key order by sibling.finish_key), null) as sibling_finish_keys
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      left join public.card_printings sibling on sibling.card_print_id = cpi.card_print_id
      where cpi.id = any($1::uuid[])
      group by
        cpi.id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.image_source,
        cpi.image_path,
        cpi.image_url,
        cpi.image_alt_url,
        cp.set_code,
        cp.number,
        cp.name,
        cp.printed_identity_modifier
      order by cp.number
    `,
    [ids],
  );
  return result.rows;
}

function assertDryRunApproval(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.package_fingerprint !== APPROVED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.dry_run_proof_hash !== APPROVED_DRY_RUN_PROOF_HASH) findings.push('dry_run_proof_hash_mismatch');
  if (dryRun.ready_for_real_apply !== true) findings.push('dry_run_not_ready_for_real_apply');
  if (dryRun.package_scope?.target_rows !== 4) findings.push('target_rows_not_4');
  if (dryRun.package_scope?.parent_writes !== 0) findings.push('parent_writes_not_zero');
  if (dryRun.package_scope?.image_writes !== 0) findings.push('image_writes_not_zero');
  if (dryRun.package_scope?.deletes !== 0) findings.push('deletes_not_zero');
  if (dryRun.package_scope?.merges !== 0) findings.push('merges_not_zero');
  if (dryRun.package_scope?.migrations !== 0) findings.push('migrations_not_zero');
  if ((dryRun.dry_run_proof?.targets ?? []).length !== 4) findings.push('dry_run_targets_not_4');
  if ((dryRun.dry_run_proof?.targets ?? []).some((row) => row.before_finish_key !== 'holo' || row.after_finish_key !== 'cosmos')) {
    findings.push('target_finish_scope_mismatch');
  }
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (findings.length > 0) {
    throw new Error(`Approval gate failed: ${findings.join(', ')}`);
  }
}

function validateBeforeRows(beforeRows, expectedIds) {
  const findings = [];
  if (beforeRows.length !== expectedIds.length) findings.push('before_row_count_mismatch');
  for (const row of beforeRows) {
    if (row.set_code !== 'mep') findings.push(`set_code_mismatch:${row.card_printing_id}`);
    if (row.finish_key !== 'holo') findings.push(`finish_not_holo:${row.card_printing_id}`);
    if (row.sibling_finish_keys.includes('cosmos')) findings.push(`cosmos_sibling_exists:${row.card_printing_id}`);
    if (row.image_path || row.image_url || row.image_alt_url || row.image_source) {
      findings.push(`image_field_present:${row.card_printing_id}`);
    }
  }
  if (findings.length > 0) {
    throw new Error(`Pre-apply target validation failed: ${findings.join(', ')}`);
  }
}

function validateAfterRows(afterRows, expectedIds) {
  const findings = [];
  if (afterRows.length !== expectedIds.length) findings.push('after_row_count_mismatch');
  for (const row of afterRows) {
    if (row.set_code !== 'mep') findings.push(`set_code_mismatch:${row.card_printing_id}`);
    if (row.finish_key !== 'cosmos') findings.push(`finish_not_cosmos:${row.card_printing_id}`);
    if (!row.sibling_finish_keys.includes('cosmos')) findings.push(`cosmos_sibling_missing:${row.card_printing_id}`);
    if (row.sibling_finish_keys.includes('holo')) findings.push(`holo_sibling_still_present:${row.card_printing_id}`);
    if (row.image_path || row.image_url || row.image_alt_url || row.image_source) {
      findings.push(`image_field_present_after:${row.card_printing_id}`);
    }
  }
  if (findings.length > 0) {
    throw new Error(`Post-apply target validation failed: ${findings.join(', ')}`);
  }
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');
  }

  const dryRun = JSON.parse(await fs.readFile(DRY_RUN_JSON, 'utf8'));
  assertDryRunApproval(dryRun);

  const targets = dryRun.dry_run_proof.targets;
  const targetIds = targets.map((row) => row.card_printing_id);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let beforeRows = [];
  let updateRows = [];
  let afterRows = [];
  let committed = false;

  try {
    await client.query('begin');
    beforeRows = await fetchTargets(client, targetIds);
    validateBeforeRows(beforeRows, targetIds);

    const updateResult = await client.query(
      `
        update public.card_printings target
        set finish_key = 'cosmos'
        where target.id = any($1::uuid[])
          and target.finish_key = 'holo'
          and not exists (
            select 1
            from public.card_printings sibling
            where sibling.card_print_id = target.card_print_id
              and sibling.finish_key = 'cosmos'
          )
        returning id as card_printing_id, card_print_id, finish_key
      `,
      [targetIds],
    );
    updateRows = updateResult.rows;
    if (updateRows.length !== 4) {
      throw new Error(`Update row count mismatch: ${updateRows.length}`);
    }

    afterRows = await fetchTargets(client, targetIds);
    validateAfterRows(afterRows, targetIds);

    await client.query('commit');
    committed = true;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch (_) {}
    throw error;
  } finally {
    await client.end();
  }

  const proof = {
    package_id: PACKAGE_ID,
    package_fingerprint: APPROVED_FINGERPRINT,
    approved_dry_run_proof_hash: APPROVED_DRY_RUN_PROOF_HASH,
    committed,
    db_updated_rows: updateRows.length,
    image_writes: 0,
    parent_writes: 0,
    deletes: 0,
    merges: 0,
    migrations: 0,
    rows: afterRows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      image_source: row.image_source,
      image_path: row.image_path,
      image_url: row.image_url,
      image_alt_url: row.image_alt_url,
    })),
  };

  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'real_apply',
    approval_text: APPROVAL_TEXT,
    package_fingerprint: APPROVED_FINGERPRINT,
    approved_dry_run_proof_hash: APPROVED_DRY_RUN_PROOF_HASH,
    db_writes_performed: true,
    db_updated_rows: updateRows.length,
    storage_uploads_performed: false,
    image_writes: 0,
    parent_writes: 0,
    deletes: 0,
    merges: 0,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    committed,
    proof_hash: proofHash(proof),
    proof,
    before_rows: beforeRows,
    after_rows: afterRows,
  };

  await fs.writeFile(APPLY_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(APPLY_MD, `# Image Truth IMG-FINISH-01B MEP Cosmos Finish Update Real Apply Result V1

Generated: ${report.generated_at}

Status: real apply completed for the explicitly approved four-row finish update only.

## Summary

| Field | Value |
| --- | --- |
| package_id | ${PACKAGE_ID} |
| package_fingerprint | ${APPROVED_FINGERPRINT} |
| approved_dry_run_proof_hash | ${APPROVED_DRY_RUN_PROOF_HASH} |
| committed | ${committed} |
| db_updated_rows | ${updateRows.length} |
| image_writes | 0 |
| parent_writes | 0 |
| deletes | 0 |
| merges | 0 |
| migrations_created | false |
| proof_hash | ${report.proof_hash} |

## Applied Rows

${markdownTable(afterRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'image_source', value: (row) => row.image_source ?? '-' },
  { label: 'image_path', value: (row) => row.image_path ?? '-' },
])}

## Explicit Non-Actions

- storage_uploads_performed: false
- image_writes: 0
- parent_writes: 0
- deletes: 0
- merges: 0
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false
`);

  console.log(JSON.stringify({
    generated: [APPLY_JSON, APPLY_MD],
    committed,
    db_updated_rows: updateRows.length,
    proof_hash: report.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

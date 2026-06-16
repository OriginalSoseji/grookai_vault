import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'image_truth_img03b_pkmncards_representative_storage_readiness_v1.json');
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_img03c_pkmncards_representative_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_img03c_pkmncards_representative_upload_apply_plan_v1.md');
const APPLY_JSON = path.join(OUTPUT_DIR, 'image_truth_img03c_pkmncards_representative_upload_apply_result_v1.json');
const APPLY_MD = path.join(OUTPUT_DIR, 'image_truth_img03c_pkmncards_representative_upload_apply_result_v1.md');
const PACKAGE_ID = 'IMG-03C-PKMNCARDS-REPRESENTATIVE-MISSING-DISPLAY-CHILD-IMAGE-UPLOAD-APPLY';

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++i] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function sha256Hex(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
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

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function createStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function storageObjectExists(supabase, bucket, storagePath) {
  const slashIndex = storagePath.lastIndexOf('/');
  const folder = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
  const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: 100,
      search: fileName,
    });
    if (!error) return (data ?? []).some((entry) => entry.name === fileName);
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }
  throw new Error(`storage_probe_failed:${storagePath}:${lastError?.message ?? 'unknown_error'}`);
}

async function fetchTarget(client, row) {
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
        cpi.image_status,
        cpi.image_note,
        cp.name,
        cp.number,
        cp.set_code,
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
    [row.card_printing_id],
  );
  return result.rows[0] ?? null;
}

function validateTarget(row, current) {
  const errors = [];
  if (!current) return ['target_card_printing_not_found'];
  if (current.card_print_id !== row.card_print_id) errors.push('card_print_id_mismatch');
  if (normalizeKey(current.set_code) !== normalizeKey(row.set_code)) errors.push('set_code_mismatch');
  if (normalizeNumber(current.number) !== normalizeNumber(row.number)) errors.push('number_mismatch');
  if (normalizeKey(current.name) !== normalizeKey(row.card_name)) errors.push('card_name_mismatch');
  if (normalizeKey(current.finish_key) !== normalizeKey(row.finish_key)) errors.push('finish_key_mismatch');
  if (clean(current.image_path)) errors.push('child_image_path_already_present');
  if (clean(current.image_url)) errors.push('child_image_url_already_present');
  if (clean(current.image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

function parentSnapshot(row) {
  return {
    parent_image_source: clean(row.parent_image_source),
    parent_image_path: clean(row.parent_image_path),
    parent_image_url: clean(row.parent_image_url),
    parent_image_alt_url: clean(row.parent_image_alt_url),
    parent_representative_image_url: clean(row.parent_representative_image_url),
    parent_image_status: clean(row.parent_image_status),
    parent_image_note: clean(row.parent_image_note),
  };
}

async function buildPlan(readiness) {
  if (readiness.ready_for_upload_then_apply !== true) {
    throw new Error('IMG-03B readiness is not ready_for_upload_then_apply.');
  }

  const supabase = createStorageClient();
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = [];

  try {
    for (const sourceRow of readiness.rows) {
      const buffer = await fs.readFile(sourceRow.local_nonproduction_asset_path);
      const localSha256 = sha256Hex(buffer);
      const localSizeBytes = buffer.length;
      const storageExists = await storageObjectExists(
        supabase,
        sourceRow.storage_bucket,
        sourceRow.planned_storage_path,
      );
      const current = await fetchTarget(client, sourceRow);
      const targetErrors = validateTarget(sourceRow, current);
      const localErrors = [];
      if (localSha256 !== sourceRow.expected_sha256) localErrors.push('local_sha256_mismatch');
      if (localSizeBytes !== sourceRow.expected_size_bytes) localErrors.push('local_size_mismatch');
      if (storageExists) localErrors.push('planned_storage_object_already_exists');

      const imageNote = `${PACKAGE_ID}:${sourceRow.source_key}:${sourceRow.source_url}`;
      rows.push({
        ...sourceRow,
        image_source: 'identity',
        image_path: sourceRow.planned_storage_path,
        image_status: 'representative_shared',
        image_note: imageNote,
        local_sha256: localSha256,
        local_size_bytes: localSizeBytes,
        storage_object_already_exists: storageExists,
        parent_before_hash: current ? proofHash(parentSnapshot(current)) : null,
        validation_errors: [...localErrors, ...targetErrors],
      });
    }
  } finally {
    await client.end();
  }

  const proof = {
    package_id: PACKAGE_ID,
    source_readiness_proof_hash: readiness.proof_hash,
    storage_bucket: readiness.storage_bucket,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      card_name: row.card_name,
      number: row.number,
      finish_key: row.finish_key,
      source_url: row.source_url,
      storage_bucket: row.storage_bucket,
      image_path: row.image_path,
      local_sha256: row.local_sha256,
      local_size_bytes: row.local_size_bytes,
      image_source: row.image_source,
      image_status: row.image_status,
      image_note: row.image_note,
      validation_errors: row.validation_errors,
    })),
  };

  return {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'plan_only',
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_readiness_report: READINESS_JSON,
    source_readiness_proof_hash: readiness.proof_hash,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    storage_bucket: readiness.storage_bucket,
    source_rows: rows.length,
    ready_rows: rows.filter((row) => row.validation_errors.length === 0).length,
    blocked_rows: rows.filter((row) => row.validation_errors.length > 0).length,
    ready_for_real_apply: rows.length > 0 && rows.every((row) => row.validation_errors.length === 0),
    rows,
    proof,
    fingerprint: proofHash(proof),
  };
}

async function applyPlan(plan, fingerprint) {
  if (fingerprint !== plan.fingerprint) {
    throw new Error(`fingerprint_mismatch: expected ${plan.fingerprint}`);
  }
  if (plan.ready_for_real_apply !== true) {
    throw new Error('plan_not_ready_for_real_apply');
  }

  const supabase = createStorageClient();
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  const uploaded = [];
  const appliedRows = [];
  let committed = false;

  for (const row of plan.rows) {
    const buffer = await fs.readFile(row.local_nonproduction_asset_path);
    const { error } = await supabase.storage.from(row.storage_bucket).upload(row.image_path, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error(`storage_upload_failed:${row.image_path}:${error.message}`);
    uploaded.push(row.image_path);
  }

  await client.connect();
  try {
    await client.query('begin');
    for (const row of plan.rows) {
      const before = await fetchTarget(client, row);
      const errors = validateTarget(row, before);
      if (errors.length > 0) throw new Error(`target_validation_failed:${row.card_printing_id}:${errors.join(',')}`);
      const parentBeforeHash = proofHash(parentSnapshot(before));

      const result = await client.query(
        `
          update public.card_printings
          set
            image_source = $2,
            image_path = $3,
            image_status = $4,
            image_note = $5
          where id = $1
            and image_path is null
            and (image_url is null or btrim(image_url) = '')
            and (image_alt_url is null or btrim(image_alt_url) = '')
          returning id, image_source, image_path, image_status, image_note
        `,
        [row.card_printing_id, row.image_source, row.image_path, row.image_status, row.image_note],
      );
      if (result.rowCount !== 1) throw new Error(`db_update_rowcount_mismatch:${row.card_printing_id}`);
      const after = await fetchTarget(client, row);
      const parentAfterHash = proofHash(parentSnapshot(after));
      if (parentBeforeHash !== parentAfterHash) throw new Error(`parent_image_changed:${row.card_printing_id}`);
      appliedRows.push(result.rows[0]);
    }
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

  const result = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'real_apply',
    db_writes_performed: true,
    storage_uploads_performed: true,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    fingerprint: plan.fingerprint,
    storage_uploaded_rows: uploaded.length,
    db_updated_rows: appliedRows.length,
    committed,
    uploaded_storage_paths: uploaded,
    rows: plan.rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      set_code: row.set_code,
      card_name: row.card_name,
      number: row.number,
      finish_key: row.finish_key,
      image_path: row.image_path,
      source_url: row.source_url,
    })),
  };
  result.proof_hash = proofHash({
    package_id: PACKAGE_ID,
    fingerprint: plan.fingerprint,
    storage_uploaded_rows: result.storage_uploaded_rows,
    db_updated_rows: result.db_updated_rows,
    committed: result.committed,
    rows: result.rows,
  });
  return result;
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
  return `# Image Truth V1 IMG-03C PKMNCards Representative Upload Apply ${report.mode === 'real_apply' ? 'Result' : 'Plan'}

## Safety

- mode: ${report.mode}
- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- target_table: ${report.target_table}
- parent_overwrite_allowed: ${report.parent_overwrite_allowed}
- storage_bucket: ${report.storage_bucket ?? 'user-card-images'}
- image_status: representative_shared

## Summary

- package_id: ${PACKAGE_ID}
- source_rows: ${report.source_rows ?? report.rows.length}
- ready_rows: ${report.ready_rows ?? report.db_updated_rows}
- blocked_rows: ${report.blocked_rows ?? 0}
- ready_for_real_apply: ${report.ready_for_real_apply ?? report.committed}
- fingerprint: \`${report.fingerprint}\`
- proof_hash: \`${report.proof_hash ?? '-'}\`

## Rows

${markdownTable(report.rows, [
  { label: 'status', value: (row) => row.validation_errors?.length ? row.validation_errors.join(', ') : 'ready' },
  { label: 'set', value: (row) => row.set_code },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'image_path', value: (row) => row.image_path },
  { label: 'source', value: (row) => row.source_url },
])}

## Approval Command

\`\`\`powershell
node scripts/audits/image_truth_v1_img03c_pkmncards_representative_upload_apply.mjs --apply --fingerprint ${report.fingerprint}
\`\`\`
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  const plan = await buildPlan(readiness);

  if (!args.apply) {
    await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`);
    await fs.writeFile(PLAN_MD, buildMarkdown(plan));
    console.log(JSON.stringify({
      generated: [PLAN_JSON, PLAN_MD],
      source_rows: plan.source_rows,
      ready_rows: plan.ready_rows,
      blocked_rows: plan.blocked_rows,
      ready_for_real_apply: plan.ready_for_real_apply,
      fingerprint: plan.fingerprint,
    }, null, 2));
    return;
  }

  const result = await applyPlan(plan, args.fingerprint);
  await fs.writeFile(APPLY_JSON, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(APPLY_MD, buildMarkdown(result));
  console.log(JSON.stringify({
    generated: [APPLY_JSON, APPLY_MD],
    storage_uploaded_rows: result.storage_uploaded_rows,
    db_updated_rows: result.db_updated_rows,
    committed: result.committed,
    proof_hash: result.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

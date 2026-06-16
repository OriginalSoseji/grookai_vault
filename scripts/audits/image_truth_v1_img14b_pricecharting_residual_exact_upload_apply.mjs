import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const PROBE_JSON = path.join(OUTPUT_DIR, 'image_truth_img14a_pricecharting_residual_exact_probe_v1.json');
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_img14b_pricecharting_residual_exact_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_img14b_pricecharting_residual_exact_upload_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'image_truth_img14b_pricecharting_residual_exact_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'image_truth_img14b_pricecharting_residual_exact_upload_apply_result_v1.md');
const STORAGE_BUCKET = 'user-card-images';
const PACKAGE_ID = 'IMG-14B-PRICECHARTING-RESIDUAL-EXACT-CHILD-IMAGE-UPLOAD-APPLY';

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null, useExistingPlan: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--use-existing-plan') args.useExistingPlan = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function requireDbUrl() {
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? null;
  if (!url) throw new Error('Missing database URL.');
  return url;
}

function createStorageClient() {
  if (!process.env.SUPABASE_URL) throw new Error('Missing SUPABASE_URL.');
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function normalizeFinish(value) {
  const finish = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (finish === 'reverse_holo') return 'reverse';
  if (finish === 'cosmos_holo') return 'cosmos';
  return finish;
}

function sha256Hex(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort((a, b) => a.localeCompare(b)).reduce((acc, key) => {
    acc[key] = canonicalizeJson(value[key]);
    return acc;
  }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

async function storageObjectExists(supabase, storagePath) {
  const slashIndex = storagePath.lastIndexOf('/');
  const folder = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
  const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 100, search: fileName });
  if (error) throw new Error(`storage_probe_failed:${storagePath}:${error.message}`);
  return (data ?? []).some((entry) => entry.name === fileName);
}

async function fetchTarget(client, cardPrintingId) {
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
        cp.set_code,
        cp.number,
        cp.name as card_name,
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
    parent_image_source: clean(row?.parent_image_source),
    parent_image_path: clean(row?.parent_image_path),
    parent_image_url: clean(row?.parent_image_url),
    parent_image_alt_url: clean(row?.parent_image_alt_url),
    parent_representative_image_url: clean(row?.parent_representative_image_url),
    parent_image_status: clean(row?.parent_image_status),
    parent_image_note: clean(row?.parent_image_note),
  };
}

function validateTarget(expected, row) {
  const errors = [];
  if (!row) return ['target_card_printing_not_found'];
  if (String(row.set_code).toLowerCase() !== String(expected.set_code).toLowerCase()) errors.push('set_code_mismatch');
  if (normalizeNumber(row.number) !== normalizeNumber(expected.number)) errors.push('number_mismatch');
  if (normalizeText(row.card_name) !== normalizeText(expected.card_name)) errors.push('card_name_mismatch');
  if (normalizeFinish(row.finish_key) !== normalizeFinish(expected.finish_key)) errors.push('finish_key_mismatch');
  if (clean(row.image_path)) errors.push('child_image_path_already_present');
  if (clean(row.image_url)) errors.push('child_image_url_already_present');
  if (clean(row.image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

async function validateAsset(row) {
  const assetPath = row.asset?.local_nonproduction_asset_path;
  if (!assetPath) return ['asset_path_missing'];
  let buffer;
  try {
    buffer = await fs.readFile(assetPath);
  } catch {
    return ['asset_file_missing'];
  }
  const errors = [];
  const sha = sha256Hex(buffer);
  if (sha !== row.asset.normalized_sha256) errors.push('asset_sha256_mismatch');
  if (buffer.length !== Number(row.asset.normalized_size_bytes)) errors.push('asset_size_mismatch');
  return errors;
}

function exactRowsFromProbe(probe) {
  if (probe.package_id !== 'IMG-14A-PRICECHARTING-RESIDUAL-EXACT-VARIANT-PROBE') {
    throw new Error('probe_package_mismatch');
  }
  return (probe.rows ?? []).filter((row) => row.status === 'exact_ready_for_guarded_dry_run');
}

function imageNote(row) {
  return `${PACKAGE_ID}:pricecharting_exact:${row.source_url}`;
}

async function buildPlan() {
  const probe = JSON.parse(await fs.readFile(PROBE_JSON, 'utf8'));
  const candidates = exactRowsFromProbe(probe);
  const supabase = createStorageClient();
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  const rows = [];
  let rollbackCompleted = false;

  await client.connect();
  try {
    await client.query('begin');
    for (const candidate of candidates) {
      const validationErrors = [];
      validationErrors.push(...await validateAsset(candidate));
      if (!candidate.asset?.proposed_storage_path) validationErrors.push('proposed_storage_path_missing');
      if (!candidate.image_alt) validationErrors.push('image_alt_missing');
      if (!candidate.asset_url) validationErrors.push('asset_url_missing');

      const before = await fetchTarget(client, candidate.card_printing_id);
      validationErrors.push(...validateTarget(candidate, before));

      let storageExists = false;
      if (candidate.asset?.proposed_storage_path) {
        storageExists = await storageObjectExists(supabase, candidate.asset.proposed_storage_path);
        if (storageExists) validationErrors.push('planned_storage_object_already_exists');
      }

      const parentBeforeHash = before ? proofHash(parentSnapshot(before)) : null;
      let mutationPreview = null;
      let parentUnchanged = false;
      if (validationErrors.length === 0) {
        const update = await client.query(
          `
            update public.card_printings
            set image_source = $2, image_path = $3, image_status = $4, image_note = $5
            where id = $1
              and image_path is null
              and (image_url is null or btrim(image_url) = '')
              and (image_alt_url is null or btrim(image_alt_url) = '')
            returning id, image_source, image_path, image_status, image_note
          `,
          [candidate.card_printing_id, 'identity', candidate.asset.proposed_storage_path, 'exact', imageNote(candidate)],
        );
        const after = await fetchTarget(client, candidate.card_printing_id);
        parentUnchanged = parentBeforeHash === proofHash(parentSnapshot(after));
        if (update.rowCount === 1 && parentUnchanged) mutationPreview = update.rows[0];
        else validationErrors.push('rollback_update_not_verified');
      }

      rows.push({
        card_printing_id: candidate.card_printing_id,
        card_print_id: candidate.card_print_id,
        set_code: candidate.set_code,
        number: candidate.number,
        card_name: candidate.card_name,
        finish_key: candidate.finish_key,
        source_url: candidate.source_url,
        source_key: candidate.source_key,
        asset_url: candidate.asset_url,
        image_alt: candidate.image_alt,
        image_source: 'identity',
        image_status: 'exact',
        image_path: candidate.asset?.proposed_storage_path ?? null,
        asset: candidate.asset,
        storage_object_already_exists: storageExists,
        parent_image_fields_unchanged: parentUnchanged,
        validation_errors: validationErrors,
        dry_run_status: validationErrors.length === 0 ? 'rollback_update_verified' : 'blocked',
        mutation_preview: mutationPreview,
      });
    }
    await client.query('rollback');
    rollbackCompleted = true;
  } catch (error) {
    try {
      await client.query('rollback');
      rollbackCompleted = true;
    } catch (_) {
      // Preserve the original error.
    }
    throw error;
  } finally {
    await client.end();
  }

  const readyRows = rows.filter((row) => row.validation_errors.length === 0);
  const proof = {
    package_id: PACKAGE_ID,
    source_probe_report: PROBE_JSON,
    source_probe_fingerprint: probe.fingerprint,
    storage_bucket: STORAGE_BUCKET,
    rollback_completed: rollbackCompleted,
    rows: readyRows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_url: row.source_url,
      asset_url: row.asset_url,
      image_alt: row.image_alt,
      image_path: row.image_path,
      normalized_sha256: row.asset.normalized_sha256,
      normalized_size_bytes: row.asset.normalized_size_bytes,
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
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    storage_bucket: STORAGE_BUCKET,
    source_probe_fingerprint: probe.fingerprint,
    source_rows: rows.length,
    ready_rows: readyRows.length,
    blocked_rows: rows.length - readyRows.length,
    rollback_completed: rollbackCompleted,
    ready_for_real_apply: readyRows.length > 0 && rollbackCompleted,
    rows,
    proof,
    fingerprint: proofHash(proof),
  };
}

async function applyPlan(plan, fingerprint) {
  if (fingerprint !== plan.fingerprint) throw new Error(`fingerprint_mismatch: expected ${plan.fingerprint}`);
  if (plan.ready_for_real_apply !== true) throw new Error('plan_not_ready_for_real_apply');
  const rows = plan.rows.filter((row) => row.validation_errors.length === 0);
  const supabase = createStorageClient();
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  const uploaded = [];
  const appliedRows = [];

  for (const row of rows) {
    const buffer = await fs.readFile(row.asset.local_nonproduction_asset_path);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(row.image_path, buffer, {
      contentType: row.asset.content_type,
      upsert: false,
    });
    if (error) throw new Error(`storage_upload_failed:${row.image_path}:${error.message}`);
    uploaded.push(row.image_path);
  }

  await client.connect();
  let committed = false;
  try {
    await client.query('begin');
    for (const row of rows) {
      const before = await fetchTarget(client, row.card_printing_id);
      const errors = validateTarget(row, before);
      if (errors.length > 0) throw new Error(`target_validation_failed:${row.card_printing_id}:${errors.join(',')}`);
      const parentBeforeHash = proofHash(parentSnapshot(before));
      const update = await client.query(
        `
          update public.card_printings
          set image_source = $2, image_path = $3, image_status = $4, image_note = $5
          where id = $1
            and image_path is null
            and (image_url is null or btrim(image_url) = '')
            and (image_alt_url is null or btrim(image_alt_url) = '')
          returning id, image_source, image_path, image_status, image_note
        `,
        [row.card_printing_id, row.image_source, row.image_path, row.image_status, imageNote(row)],
      );
      if (update.rowCount !== 1) throw new Error(`db_update_rowcount_mismatch:${row.card_printing_id}`);
      const after = await fetchTarget(client, row.card_printing_id);
      if (parentBeforeHash !== proofHash(parentSnapshot(after))) throw new Error(`parent_image_changed:${row.card_printing_id}`);
      appliedRows.push(update.rows[0]);
    }
    await client.query('commit');
    committed = true;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch (_) {
      // Preserve original error.
    }
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
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      image_status: row.image_status,
      image_path: row.image_path,
      source_url: row.source_url,
    })),
  };
  result.proof_hash = proofHash({
    package_id: PACKAGE_ID,
    fingerprint: result.fingerprint,
    storage_uploaded_rows: result.storage_uploaded_rows,
    db_updated_rows: result.db_updated_rows,
    committed: result.committed,
    rows: result.rows,
  });
  return result;
}

function markdownTable(rows) {
  if (rows.length === 0) return '_None._';
  const columns = [
    ['status', (row) => row.validation_errors?.length ? row.validation_errors.join(', ') : 'ready'],
    ['set', (row) => row.set_code],
    ['number', (row) => row.number],
    ['card', (row) => row.card_name],
    ['finish', (row) => row.finish_key],
    ['image_alt', (row) => row.image_alt ?? '-'],
    ['source', (row) => row.source_url],
  ];
  return [
    `| ${columns.map(([label]) => label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map(([, value]) => String(value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth IMG-14B PriceCharting Residual Exact Upload Apply ${report.mode === 'real_apply' ? 'Result' : 'Plan'}

## Safety

- mode: ${report.mode}
- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- target_table: card_printings
- parent_overwrite_allowed: false
- image_status: exact

## Summary

- package_id: ${PACKAGE_ID}
- source_probe_fingerprint: \`${report.source_probe_fingerprint ?? '-'}\`
- source_rows: ${report.source_rows ?? report.rows.length}
- ready_rows: ${report.ready_rows ?? report.db_updated_rows}
- blocked_rows: ${report.blocked_rows ?? 0}
- ready_for_real_apply: ${report.ready_for_real_apply ?? report.committed}
- fingerprint: \`${report.fingerprint}\`
- proof_hash: \`${report.proof_hash ?? '-'}\`

## Rows

${markdownTable(report.rows)}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = args.apply && args.useExistingPlan
    ? JSON.parse(await fs.readFile(PLAN_JSON, 'utf8'))
    : await buildPlan();

  if (!args.useExistingPlan) {
    await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`);
    await fs.writeFile(PLAN_MD, buildMarkdown(plan));
  }

  if (!args.apply) {
    console.log(JSON.stringify({
      generated: [PLAN_JSON, PLAN_MD],
      source_probe_fingerprint: plan.source_probe_fingerprint,
      source_rows: plan.source_rows,
      ready_rows: plan.ready_rows,
      blocked_rows: plan.blocked_rows,
      ready_for_real_apply: plan.ready_for_real_apply,
      fingerprint: plan.fingerprint,
    }, null, 2));
    return;
  }

  if (!args.useExistingPlan) {
    throw new Error('real_apply_requires_frozen_plan: rerun with --apply --use-existing-plan after approval');
  }

  const result = await applyPlan(plan, args.fingerprint);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(RESULT_MD, buildMarkdown(result));
  console.log(JSON.stringify({
    generated: [RESULT_JSON, RESULT_MD],
    storage_uploaded_rows: result.storage_uploaded_rows,
    db_updated_rows: result.db_updated_rows,
    committed: result.committed,
    proof_hash: result.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

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
const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_AUDIT = path.join(OUTPUT_DIR, 'image_truth_img20b_trainer_kit_residual_tcgcollector_audit_v1.json');
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_final_image_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_final_image_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_final_image_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_final_image_apply_result_v1.md');
const STAGING_DIR = path.join(ROOT, 'tmp', 'nonproduction_image_staging', 'image_truth_v1', 'trainer-kit-final');
const STORAGE_BUCKET = 'user-card-images';
const PACKAGE_ID = 'IMG-TRAINER-KIT-FINAL-IMAGE-REPAIR-V1';
const EXPECTED_PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const EXPECTED_EXACT_ROWS = 58;
const EXPECTED_REPRESENTATIVE_ROWS = 11;
const FETCH_CONCURRENCY = 6;

const COVERED_EXACT_KEYS = new Set(['tk-hs-g:20', 'tk-hs-r:19']);
const REPRESENTATIVE_TARGETS = [
  ['GV-PK-TK-1', '1', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-3', '3', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-5', '5', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-7', '7', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-8', '8', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-9', '9', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-10', '10', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-12', '12', 'Lightning Energy', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-24', '24', 'Psychic Energy', 'GV-PK-TK-tk-sm-r-20'],
  ['GV-PK-TK-27', '27', 'Psychic Energy', 'GV-PK-TK-tk-sm-r-20'],
  ['GV-PK-TK-28', '28', 'Psychic Energy', 'GV-PK-TK-tk-sm-r-20'],
].map(([gvId, number, name, referenceGvId]) => ({
  gv_id: gvId,
  set_code: 'tk-sm-r',
  number,
  name,
  reference_gv_id: referenceGvId,
}));

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().replace(/^0+(?=\d)/, '');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = canonicalize(value[key]);
    return out;
  }, {});
}

function proofHash(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function requireDbUrl() {
  const value = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
  if (!value) throw new Error('Missing production database URL.');
  return value;
}

function createStorageClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error('Missing Supabase storage credentials.');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

async function environmentSanity(client, dbUrl) {
  const result = await client.query(`
    select
      (select count(*)::int from public.card_prints) as card_prints,
      (select count(*)::int from public.sets) as sets,
      (select count(*)::int from public.card_print_traits) as card_print_traits
  `);
  const counts = result.rows[0];
  const parsed = new URL(dbUrl);
  const dbIdentity = `${decodeURIComponent(parsed.username)}@${parsed.hostname}`;
  const databaseProjectRef = dbIdentity.includes(EXPECTED_PROJECT_REF) ? EXPECTED_PROJECT_REF : null;
  const httpProjectRef = clean(process.env.SUPABASE_URL)
    ? new URL(process.env.SUPABASE_URL).hostname.split('.')[0]
    : null;
  return {
    expected_project_ref: EXPECTED_PROJECT_REF,
    database_project_ref: databaseProjectRef,
    http_project_ref: httpProjectRef,
    project_ref_verified: databaseProjectRef === EXPECTED_PROJECT_REF
      && (httpProjectRef == null || httpProjectRef === EXPECTED_PROJECT_REF),
    card_prints: counts.card_prints,
    sets: counts.sets,
    card_print_traits: counts.card_print_traits,
    invariants_passed: Number(counts.card_prints) >= 40_000
      && Number(counts.sets) >= 150
      && Number(counts.card_print_traits) >= 5_000,
  };
}

async function loadExactTargets() {
  const audit = JSON.parse(await fs.readFile(SOURCE_AUDIT, 'utf8'));
  const sourceProofBySet = new Map(
    audit.summary.tcgcollector_source_proof.map((row) => [row.set_code, row]),
  );
  const rows = audit.examples.residual_tcgcollector_rows
    .filter((row) => ['tk-hs-g', 'tk-hs-r'].includes(row.set_code))
    .filter((row) => !COVERED_EXACT_KEYS.has(`${row.set_code}:${normalizeNumber(row.number)}`))
    .map((row) => ({
      ...row,
      number: normalizeNumber(row.number),
      source_set_url: sourceProofBySet.get(row.set_code)?.source_url ?? null,
      source_probe_status: sourceProofBySet.get(row.set_code)?.source_probe_status ?? null,
    }))
    .sort((left, right) => left.set_code.localeCompare(right.set_code)
      || Number(left.number) - Number(right.number));
  if (rows.length !== EXPECTED_EXACT_ROWS) {
    throw new Error(`exact_source_count_mismatch:${rows.length}`);
  }
  for (const row of rows) {
    if (row.source_match !== true
      || !row.source_image_url?.startsWith('https://static.tcgcollector.com/content/images/')
      || !row.source_href?.startsWith('https://www.tcgcollector.com/cards/')
      || !row.source_set_url?.startsWith('https://www.tcgcollector.com/sets/')
      || row.source_probe_status !== 'ok:preserved_html') {
      throw new Error(`source_proof_invalid:${row.gv_id}`);
    }
  }
  return { audit, rows };
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Grookai Trainer Kit Exact Image Repair/1.0' },
    signal: AbortSignal.timeout(90_000),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`source_image_http_${response.status}:${url}`);
  const contentType = clean(response.headers.get('content-type'));
  if (!contentType?.startsWith('image/') || buffer.length < 20_000) {
    throw new Error(`invalid_source_image:${contentType}:${buffer.length}:${url}`);
  }
  return { buffer, content_type: contentType, final_url: response.url };
}

async function mapConcurrent(values, limit, worker) {
  const output = new Array(values.length);
  let cursor = 0;
  async function run() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(values[index], index);
    }
  }
  const settled = await Promise.allSettled(
    Array.from({ length: Math.min(limit, values.length) }, run),
  );
  const failure = settled.find((entry) => entry.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  return output;
}

async function stageExactAssets(targets) {
  await fs.mkdir(STAGING_DIR, { recursive: true });
  return mapConcurrent(targets, FETCH_CONCURRENCY, async (target) => {
    const fetched = await fetchBuffer(target.source_image_url);
    const hash = sha256(fetched.buffer);
    const fileName = `${target.set_code}-${target.number}-${hash.slice(0, 16)}.jpg`;
    const localPath = path.join(STAGING_DIR, fileName);
    await fs.writeFile(localPath, fetched.buffer);
    const storagePath = [
      'warehouse-derived',
      'self-hosted-images-v1',
      'card_prints',
      target.set_code,
      target.gv_id.toLowerCase(),
      `${hash.slice(0, 24)}.jpg`,
    ].join('/');
    return {
      ...target,
      source_final_url: fetched.final_url,
      source_content_type: fetched.content_type,
      source_sha256: hash,
      source_size_bytes: fetched.buffer.length,
      local_path: path.relative(ROOT, localPath).replaceAll('\\', '/'),
      image_path: storagePath,
    };
  });
}

async function storageObjectExists(supabase, storagePath) {
  const slash = storagePath.lastIndexOf('/');
  const folder = storagePath.slice(0, slash);
  const name = storagePath.slice(slash + 1);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, {
    limit: 100,
    search: name,
  });
  if (error) throw new Error(`storage_probe_failed:${storagePath}:${error.message}`);
  return (data ?? []).some((entry) => entry.name === name);
}

async function fetchCard(client, gvId) {
  const result = await client.query(`
    select id::text, gv_id, set_code, number, name, variant_key,
           image_source, image_path, image_url, image_alt_url,
           representative_image_url, image_status, image_note
      from public.card_prints
     where gv_id = $1
     limit 1
  `, [gvId]);
  return result.rows[0] ?? null;
}

function blankImageFields(row) {
  return !clean(row?.image_path)
    && !clean(row?.image_url)
    && !clean(row?.image_alt_url)
    && !clean(row?.representative_image_url);
}

function validateIdentity(target, row) {
  const errors = [];
  if (!row) return ['target_not_found'];
  if (row.gv_id !== target.gv_id) errors.push('gv_id_mismatch');
  if (normalize(row.set_code) !== normalize(target.set_code)) errors.push('set_code_mismatch');
  if (normalizeNumber(row.number) !== normalizeNumber(target.number)) errors.push('number_mismatch');
  if (normalize(row.name) !== normalize(target.name)) errors.push('name_mismatch');
  if (!blankImageFields(row)) errors.push('target_image_fields_not_blank');
  return errors;
}

function exactNote(row) {
  return [
    `${PACKAGE_ID}:exact_numbered_trainer_kit_card`,
    `source_page:${row.source_href}`,
    `source_set:${row.source_set_url}`,
    `source_title:${row.source_title}`,
    `source_image:${row.source_image_url}`,
    'visual_review:numbered_card_fronts_confirmed_for_both_source_sets',
  ].join('; ');
}

function representativeNote(row) {
  return [
    `${PACKAGE_ID}:representative_energy_image`,
    `reference_card:${row.reference_gv_id}`,
    'exact_deck_position_image_not_available_in_preserved_source_listing',
  ].join('; ');
}

async function rollbackRehearsal(client, exactRows, representativeRows) {
  await client.query('begin');
  try {
    for (const row of exactRows) {
      const result = await client.query(`
        update public.card_prints
           set image_source = 'identity', image_path = $2, image_status = 'exact', image_note = $3
         where id = $1::uuid
           and image_path is null
           and (image_url is null or btrim(image_url) = '')
           and (image_alt_url is null or btrim(image_alt_url) = '')
           and (representative_image_url is null or btrim(representative_image_url) = '')
      `, [row.card_print_id, row.image_path, row.image_note]);
      if (result.rowCount !== 1) throw new Error(`rollback_exact_rowcount:${row.gv_id}:${result.rowCount}`);
    }
    for (const row of representativeRows) {
      const result = await client.query(`
        update public.card_prints
           set image_source = 'identity', image_path = $2, representative_image_url = null,
               image_status = 'representative_shared', image_note = $3
         where id = $1::uuid
           and image_path is null
           and (image_url is null or btrim(image_url) = '')
           and (image_alt_url is null or btrim(image_alt_url) = '')
           and (representative_image_url is null or btrim(representative_image_url) = '')
      `, [row.card_print_id, row.image_path, row.image_note]);
      if (result.rowCount !== 1) throw new Error(`rollback_rep_rowcount:${row.gv_id}:${result.rowCount}`);
    }
  } finally {
    await client.query('rollback');
  }
}

async function buildPlan() {
  const { audit, rows: sourceRows } = await loadExactTargets();
  const exactAssets = await stageExactAssets(sourceRows);
  const dbUrl = requireDbUrl();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const supabase = createStorageClient();
  await client.connect();
  try {
    const sanity = await environmentSanity(client, dbUrl);
    if (!sanity.project_ref_verified || !sanity.invariants_passed) {
      throw new Error(`environment_mismatch:${JSON.stringify(sanity)}`);
    }

    const exactRows = [];
    for (const asset of exactAssets) {
      const dbRow = await fetchCard(client, asset.gv_id);
      const validationErrors = validateIdentity({ ...asset, name: asset.name }, dbRow);
      const storageExists = await storageObjectExists(supabase, asset.image_path);
      if (storageExists) validationErrors.push('planned_storage_object_already_exists');
      exactRows.push({
        ...asset,
        card_print_id: dbRow?.id ?? null,
        image_source: 'identity',
        image_status: 'exact',
        image_note: exactNote(asset),
        storage_object_already_exists: storageExists,
        validation_errors: validationErrors,
      });
    }

    const representativeRows = [];
    for (const target of REPRESENTATIVE_TARGETS) {
      const [dbRow, reference] = await Promise.all([
        fetchCard(client, target.gv_id),
        fetchCard(client, target.reference_gv_id),
      ]);
      const validationErrors = validateIdentity(target, dbRow);
      if (!reference) validationErrors.push('representative_reference_not_found');
      else if (!clean(reference.image_path) || reference.image_source !== 'identity') {
        validationErrors.push('representative_reference_has_no_storage_pointer');
      }
      if (reference?.set_code !== target.set_code || normalize(reference?.name) !== normalize(target.name)) {
        validationErrors.push('representative_reference_identity_mismatch');
      }
      representativeRows.push({
        ...target,
        card_print_id: dbRow?.id ?? null,
        reference_image_status: reference?.image_status ?? null,
        image_path: reference?.image_path ?? null,
        image_source: 'identity',
        image_status: 'representative_shared',
        image_note: representativeNote(target),
        validation_errors: validationErrors,
      });
    }

    const allErrors = [...exactRows, ...representativeRows]
      .flatMap((row) => row.validation_errors.map((error) => `${row.gv_id}:${error}`));
    let rollbackCompleted = false;
    if (allErrors.length === 0) {
      await rollbackRehearsal(client, exactRows, representativeRows);
      rollbackCompleted = true;
    }
    const proof = {
      package_id: PACKAGE_ID,
      source_audit_package_id: audit.package_id,
      source_audit_proof_hash: audit.proof_hash,
      exact_rows: exactRows.map((row) => ({
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        set_code: row.set_code,
        number: row.number,
        name: row.name,
        source_href: row.source_href,
        source_image_url: row.source_image_url,
        source_sha256: row.source_sha256,
        source_size_bytes: row.source_size_bytes,
        image_path: row.image_path,
        image_status: row.image_status,
        image_note: row.image_note,
        validation_errors: row.validation_errors,
      })),
      representative_rows: representativeRows.map((row) => ({
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        set_code: row.set_code,
        number: row.number,
        name: row.name,
        reference_gv_id: row.reference_gv_id,
        image_path: row.image_path,
        image_status: row.image_status,
        image_note: row.image_note,
        validation_errors: row.validation_errors,
      })),
      rollback_completed: rollbackCompleted,
    };
    const fingerprint = proofHash(proof);
    return {
      generated_at: new Date().toISOString(),
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      environment_sanity: sanity,
      source_audit: path.relative(ROOT, SOURCE_AUDIT).replaceAll('\\', '/'),
      source_audit_proof_hash: audit.proof_hash,
      exact_rows: exactRows,
      representative_rows: representativeRows,
      exact_row_count: exactRows.length,
      representative_row_count: representativeRows.length,
      target_row_count: exactRows.length + representativeRows.length,
      rollback_completed: rollbackCompleted,
      validation_errors: allErrors,
      ready_for_apply: exactRows.length === EXPECTED_EXACT_ROWS
        && representativeRows.length === EXPECTED_REPRESENTATIVE_ROWS
        && rollbackCompleted && allErrors.length === 0,
      db_writes_performed: false,
      storage_uploads_performed: false,
      migrations_created: false,
      deletes_or_merges_performed: false,
      proof,
      fingerprint,
    };
  } finally {
    await client.end();
  }
}

async function uploadExactAssets(supabase, rows) {
  const uploaded = [];
  await mapConcurrent(rows, FETCH_CONCURRENCY, async (row) => {
    const buffer = await fs.readFile(path.join(ROOT, row.local_path));
    if (sha256(buffer) !== row.source_sha256 || buffer.length !== row.source_size_bytes) {
      throw new Error(`staged_asset_mismatch:${row.gv_id}`);
    }
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(row.image_path, buffer, {
      contentType: row.source_content_type,
      upsert: false,
    });
    if (error) throw new Error(`storage_upload_failed:${row.gv_id}:${error.message}`);
    uploaded.push(row.image_path);
  });
  return uploaded;
}

async function applyPlan(plan, fingerprint) {
  if (!plan.ready_for_apply) throw new Error(`plan_not_ready:${plan.validation_errors.join(',')}`);
  if (fingerprint !== plan.fingerprint) throw new Error(`fingerprint_mismatch:expected:${plan.fingerprint}`);
  const supabase = createStorageClient();
  const uploaded = [];
  let committed = false;
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  try {
    uploaded.push(...await uploadExactAssets(supabase, plan.exact_rows));
    await client.connect();
    await client.query('begin');
    for (const row of plan.exact_rows) {
      const current = await fetchCard(client, row.gv_id);
      const errors = validateIdentity(row, current);
      if (errors.length) throw new Error(`apply_validation:${row.gv_id}:${errors.join(',')}`);
      const result = await client.query(`
        update public.card_prints
           set image_source = $2, image_path = $3, image_status = $4, image_note = $5
         where id = $1::uuid
           and image_path is null
           and (image_url is null or btrim(image_url) = '')
           and (image_alt_url is null or btrim(image_alt_url) = '')
           and (representative_image_url is null or btrim(representative_image_url) = '')
      `, [row.card_print_id, row.image_source, row.image_path, row.image_status, row.image_note]);
      if (result.rowCount !== 1) throw new Error(`apply_exact_rowcount:${row.gv_id}:${result.rowCount}`);
    }
    for (const row of plan.representative_rows) {
      const current = await fetchCard(client, row.gv_id);
      const errors = validateIdentity(row, current);
      if (errors.length) throw new Error(`apply_validation:${row.gv_id}:${errors.join(',')}`);
      const result = await client.query(`
        update public.card_prints
           set image_source = $2, image_path = $3, representative_image_url = null,
               image_status = $4, image_note = $5
         where id = $1::uuid
           and image_path is null
           and (image_url is null or btrim(image_url) = '')
           and (image_alt_url is null or btrim(image_alt_url) = '')
           and (representative_image_url is null or btrim(representative_image_url) = '')
      `, [row.card_print_id, row.image_source, row.image_path, row.image_status, row.image_note]);
      if (result.rowCount !== 1) throw new Error(`apply_rep_rowcount:${row.gv_id}:${result.rowCount}`);
    }
    await client.query('commit');
    committed = true;

    const readback = [];
    for (const row of [...plan.exact_rows, ...plan.representative_rows]) {
      readback.push(await fetchCard(client, row.gv_id));
    }
    const failedReadback = readback.filter((row) => !clean(row.image_path)
      && !clean(row.image_url) && !clean(row.image_alt_url) && !clean(row.representative_image_url));
    if (failedReadback.length) throw new Error(`post_commit_readback_failed:${failedReadback.map((r) => r.gv_id).join(',')}`);

    const result = {
      generated_at: new Date().toISOString(),
      package_id: PACKAGE_ID,
      mode: 'real_apply',
      fingerprint: plan.fingerprint,
      committed,
      storage_bucket: STORAGE_BUCKET,
      storage_uploaded_rows: uploaded.length,
      exact_db_updated_rows: plan.exact_rows.length,
      representative_db_updated_rows: plan.representative_rows.length,
      db_updated_rows: readback.length,
      post_commit_readback_rows: readback.length,
      remaining_target_rows_without_display_image: failedReadback.length,
      db_writes_performed: true,
      storage_uploads_performed: true,
      migrations_created: false,
      deletes_or_merges_performed: false,
      readback,
      uploaded_storage_paths: uploaded.sort(),
    };
    result.proof_hash = proofHash({
      package_id: result.package_id,
      fingerprint: result.fingerprint,
      committed: result.committed,
      storage_uploaded_rows: result.storage_uploaded_rows,
      exact_db_updated_rows: result.exact_db_updated_rows,
      representative_db_updated_rows: result.representative_db_updated_rows,
      remaining_target_rows_without_display_image: result.remaining_target_rows_without_display_image,
    });
    return result;
  } catch (error) {
    if (!committed) {
      try { await client.query('rollback'); } catch {}
      if (uploaded.length) {
        const { error: cleanupError } = await supabase.storage.from(STORAGE_BUCKET).remove(uploaded);
        if (cleanupError) throw new AggregateError([error, cleanupError], 'apply_and_cleanup_failed');
      }
    }
    throw error;
  } finally {
    try { await client.end(); } catch {}
  }
}

function escapeCell(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function table(rows, columns) {
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => escapeCell(column.value(row))).join(' | ')} |`),
  ].join('\n');
}

function render(report) {
  const isPlan = report.mode === 'plan_only';
  const exactRows = isPlan ? report.exact_rows : report.readback.filter((row) => row.image_status === 'exact');
  const repRows = isPlan ? report.representative_rows : report.readback.filter((row) => row.image_status === 'representative_shared');
  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Fingerprint: \`${report.fingerprint}\`
- Exact rows: ${isPlan ? report.exact_row_count : report.exact_db_updated_rows}
- Representative rows: ${isPlan ? report.representative_row_count : report.representative_db_updated_rows}
- Ready/committed: ${isPlan ? report.ready_for_apply : report.committed}
- Storage uploads: ${report.storage_uploaded_rows ?? 0}
- DB updates: ${report.db_updated_rows ?? 0}
- Proof hash: \`${report.proof_hash ?? '-'}\`

## Exact rows

${table(exactRows, [
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'card', value: (row) => row.name },
    { label: 'gv_id', value: (row) => row.gv_id },
    { label: 'status', value: (row) => row.image_status },
  ])}

## Representative energy rows

${table(repRows, [
    { label: 'number', value: (row) => row.number },
    { label: 'card', value: (row) => row.name },
    { label: 'gv_id', value: (row) => row.gv_id },
    { label: 'status', value: (row) => row.image_status },
  ])}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = await buildPlan();
  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_MD, render(plan), 'utf8');
  if (!args.apply) {
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      exact_rows: plan.exact_row_count,
      representative_rows: plan.representative_row_count,
      ready_for_apply: plan.ready_for_apply,
      validation_errors: plan.validation_errors,
      fingerprint: plan.fingerprint,
    }, null, 2));
    return;
  }
  const result = await applyPlan(plan, args.fingerprint);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, render(result), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    storage_uploaded_rows: result.storage_uploaded_rows,
    db_updated_rows: result.db_updated_rows,
    remaining_target_rows_without_display_image: result.remaining_target_rows_without_display_image,
    committed: result.committed,
    proof_hash: result.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

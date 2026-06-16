import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;
const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const EVIDENCE_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_cosmos_source_evidence_v1.json');
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_img10a_mep_cosmos_tcgplayer_representative_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_img10a_mep_cosmos_tcgplayer_representative_upload_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'image_truth_img10a_mep_cosmos_tcgplayer_representative_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'image_truth_img10a_mep_cosmos_tcgplayer_representative_upload_apply_result_v1.md');
const STAGING_ASSET_DIR = path.join('tmp', 'nonproduction_image_staging', 'image_truth_v1', 'img10a');
const STORAGE_BUCKET = 'user-card-images';
const PACKAGE_ID = 'IMG-10A-MEP-COSMOS-TCGPLAYER-REPRESENTATIVE-CHILD-IMAGE-UPLOAD-APPLY';

const TARGETS = [
  { number: '018', card_name: 'Cottonee', card_printing_id: '51ef414d-6a4a-4538-b2e2-d98506117619' },
  { number: '019', card_name: 'Whimsicott', card_printing_id: '30be20e8-4e02-46de-ba0b-feddefc3ce90' },
  { number: '020', card_name: 'Sneasel', card_printing_id: '244bfdb6-7e01-4933-b85a-aa89e7548363' },
  { number: '021', card_name: 'Weavile', card_printing_id: 'aeda9f7c-40b5-486a-8043-491c7330aacc' },
];

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

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? null;
}

function createStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
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

function tcgplayerProductId(url) {
  return String(url ?? '').match(/\/product\/(\d+)/)?.[1] ?? null;
}

async function fetchBuffer(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; nonproduction-staging)',
        accept: 'image/*,*/*;q=0.8',
      },
    });
    if (response.ok && String(response.headers.get('content-type') ?? '').toLowerCase().includes('image/')) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch {
    // Fall through to Windows PowerShell.
  }

  if (process.platform === 'win32') {
    await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
    const tempPath = path.join(STAGING_ASSET_DIR, `${sha256Hex(url).slice(0, 16)}.download`);
    const command = [
      '& {',
      'param($u,$o)',
      '$ProgressPreference = "SilentlyContinue";',
      '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
      'Invoke-WebRequest -Uri $u -OutFile $o -UseBasicParsing -TimeoutSec 30;',
      '}',
    ].join(' ');
    await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command, url, tempPath], {
      timeout: 45000,
      maxBuffer: 1024 * 1024,
    });
    const buffer = await fs.readFile(tempPath);
    await fs.rm(tempPath, { force: true });
    return buffer;
  }

  throw new Error(`asset_fetch_failed:${url}`);
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
    parent_image_source: clean(row.parent_image_source),
    parent_image_path: clean(row.parent_image_path),
    parent_image_url: clean(row.parent_image_url),
    parent_image_alt_url: clean(row.parent_image_alt_url),
    parent_representative_image_url: clean(row.parent_representative_image_url),
    parent_image_status: clean(row.parent_image_status),
    parent_image_note: clean(row.parent_image_note),
  };
}

function validateTarget(expected, row) {
  const errors = [];
  if (!row) return ['target_card_printing_not_found'];
  if (String(row.set_code).toLowerCase() !== 'mep') errors.push('set_code_mismatch');
  if (normalizeNumber(row.number) !== normalizeNumber(expected.number)) errors.push('number_mismatch');
  if (normalizeText(row.card_name) !== normalizeText(expected.card_name)) errors.push('card_name_mismatch');
  if (String(row.finish_key).toLowerCase() !== 'cosmos') errors.push('finish_key_not_cosmos');
  if (clean(row.image_path)) errors.push('child_image_path_already_present');
  if (clean(row.image_url)) errors.push('child_image_url_already_present');
  if (clean(row.image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

function targetEvidence(evidenceJson, target) {
  const row = (evidenceJson.rows ?? []).find((entry) => {
    return normalizeNumber(entry.number) === normalizeNumber(target.number)
      && normalizeText(entry.card_name) === normalizeText(target.card_name);
  });
  if (!row) throw new Error(`missing_evidence_row:${target.number}:${target.card_name}`);
  const tcgplayer = row.evidence?.find((entry) => entry.source_key === 'tcgcsv_tcgplayer_catalog_live' && tcgplayerProductId(entry.source_url));
  if (!tcgplayer) throw new Error(`missing_tcgplayer_evidence:${target.number}:${target.card_name}`);
  return tcgplayer;
}

async function normalizeAsset(row) {
  const productId = tcgplayerProductId(row.source_url);
  const assetUrl = `https://product-images.tcgplayer.com/${productId}.jpg`;
  const buffer = await fetchBuffer(assetUrl);
  const normalizedSha256 = sha256Hex(buffer);
  const fileName = `mep_${normalizeNumber(row.number)}_cosmos_${row.card_printing_id.slice(0, 8)}_${normalizedSha256.slice(0, 16)}.jpg`;
  const localAssetPath = path.join(STAGING_ASSET_DIR, fileName);
  await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
  await fs.writeFile(localAssetPath, buffer);
  return {
    asset_url: assetUrl,
    local_nonproduction_asset_path: localAssetPath.replaceAll('\\', '/'),
    normalized_sha256: normalizedSha256,
    normalized_size_bytes: buffer.length,
    planned_normalized_front_storage_path: [
      'warehouse-derived',
      'image-truth-v1',
      'img10a-mep-cosmos-tcgplayer-representative',
      'mep',
      row.card_printing_id,
      `${normalizedSha256.slice(0, 24)}.jpg`,
    ].join('/'),
  };
}

async function buildPlan() {
  const evidence = JSON.parse(await fs.readFile(EVIDENCE_JSON, 'utf8'));
  const connectionString = requireDbUrl();
  if (!connectionString) throw new Error('Missing database URL.');
  const supabase = createStorageClient();
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = [];
  let rollbackCompleted = false;

  try {
    await client.query('begin');
    for (const target of TARGETS) {
      const evidenceRow = targetEvidence(evidence, target);
      const sourceRow = {
        ...target,
        set_code: 'mep',
        set_name: 'MEP Black Star Promos',
        finish_key: 'cosmos',
        source_key: evidenceRow.source_key,
        source_kind: evidenceRow.source_kind,
        source_url: evidenceRow.source_url,
        evidence_label: evidenceRow.evidence_label,
      };
      const asset = await normalizeAsset(sourceRow);
      const storageExists = await storageObjectExists(supabase, asset.planned_normalized_front_storage_path);
      const before = await fetchTarget(client, target.card_printing_id);
      const validationErrors = validateTarget(target, before);
      if (storageExists) validationErrors.push('planned_storage_object_already_exists');
      const parentBeforeHash = before ? proofHash(parentSnapshot(before)) : null;
      let mutationPreview = null;
      let parentUnchanged = false;
      if (validationErrors.length === 0) {
        const note = `${PACKAGE_ID}:${sourceRow.source_key}:${sourceRow.source_url}`;
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
          [target.card_printing_id, 'identity', asset.planned_normalized_front_storage_path, 'representative_shared', note],
        );
        const after = await fetchTarget(client, target.card_printing_id);
        parentUnchanged = parentBeforeHash === proofHash(parentSnapshot(after));
        if (update.rowCount === 1 && parentUnchanged) mutationPreview = update.rows[0];
        else validationErrors.push('rollback_update_not_verified');
      }
      rows.push({
        ...sourceRow,
        target_table: 'card_printings',
        parent_overwrite_allowed: false,
        image_confidence: 'representative',
        image_status: 'representative_shared',
        image_source: 'identity',
        image_path: asset.planned_normalized_front_storage_path,
        image_note: `${PACKAGE_ID}:${sourceRow.source_key}:${sourceRow.source_url}`,
        asset,
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
    } catch (_) {}
    throw error;
  } finally {
    await client.end();
  }

  const proof = {
    package_id: PACKAGE_ID,
    source_evidence_report: EVIDENCE_JSON,
    storage_bucket: STORAGE_BUCKET,
    rollback_completed: rollbackCompleted,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_url: row.source_url,
      asset_url: row.asset.asset_url,
      image_path: row.image_path,
      normalized_sha256: row.asset.normalized_sha256,
      normalized_size_bytes: row.asset.normalized_size_bytes,
      validation_errors: row.validation_errors,
    })),
  };

  const plan = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'plan_only',
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_evidence_report: EVIDENCE_JSON,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    storage_bucket: STORAGE_BUCKET,
    source_rows: rows.length,
    ready_rows: rows.filter((row) => row.validation_errors.length === 0).length,
    blocked_rows: rows.filter((row) => row.validation_errors.length > 0).length,
    rollback_completed: rollbackCompleted,
    ready_for_real_apply: rows.length === TARGETS.length && rows.every((row) => row.validation_errors.length === 0) && rollbackCompleted,
    rows,
    proof,
    fingerprint: proofHash(proof),
  };
  return plan;
}

async function applyPlan(plan, fingerprint) {
  if (fingerprint !== plan.fingerprint) throw new Error(`fingerprint_mismatch: expected ${plan.fingerprint}`);
  if (plan.ready_for_real_apply !== true) throw new Error('plan_not_ready_for_real_apply');
  const supabase = createStorageClient();
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  const uploaded = [];
  const appliedRows = [];
  for (const row of plan.rows) {
    const buffer = await fs.readFile(row.asset.local_nonproduction_asset_path);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(row.image_path, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error(`storage_upload_failed:${row.image_path}:${error.message}`);
    uploaded.push(row.image_path);
  }
  await client.connect();
  let committed = false;
  try {
    await client.query('begin');
    for (const row of plan.rows) {
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
        [row.card_printing_id, row.image_source, row.image_path, row.image_status, row.image_note],
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
    rows: plan.rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
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
    ['number', (row) => row.number],
    ['card', (row) => row.card_name],
    ['finish', (row) => row.finish_key],
    ['image_path', (row) => row.image_path],
    ['source', (row) => row.source_url],
  ];
  return [
    `| ${columns.map(([label]) => label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map(([, value]) => String(value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth IMG-10A MEP Cosmos TCGplayer Representative Upload Apply ${report.mode === 'real_apply' ? 'Result' : 'Plan'}

## Safety

- mode: ${report.mode}
- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- target_table: card_printings
- parent_overwrite_allowed: false
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

${markdownTable(report.rows)}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = await buildPlan();
  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`);
  await fs.writeFile(PLAN_MD, buildMarkdown(plan));
  if (!args.apply) {
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

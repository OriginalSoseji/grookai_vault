import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;
const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const ASSET_MANIFEST_JSON = path.join(OUTPUT_DIR, 'image_truth_missing_display_asset_manifest_v1.json');
const STAGING_ASSET_DIR = path.join('tmp', 'nonproduction_image_staging', 'image_truth_v1', 'img03a');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'image_truth_img03a_pkmncards_representative_missing_display_dry_run_v1.json');
const DRY_RUN_MD = path.join(OUTPUT_DIR, 'image_truth_img03a_pkmncards_representative_missing_display_dry_run_v1.md');

const PACKAGE_ID = 'IMG-03A-PKMNCARDS-REPRESENTATIVE-MISSING-DISPLAY-CHILD-IMAGE-DRY-RUN';

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

async function fetchBuffer(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; nonproduction-staging)',
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch {
    // Fall through to PowerShell on Windows, which uses the OS certificate store.
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

  throw new Error('asset_fetch_failed');
}

async function normalizeAsset(row) {
  const sourceBuffer = await fetchBuffer(row.asset_url);
  const sourceSha256 = sha256Hex(sourceBuffer);
  const normalizedBuffer = sourceBuffer;
  const normalizedSha256 = sha256Hex(normalizedBuffer);
  const fileName = `${row.set_code}_${normalizeNumber(row.number)}_${row.finish_key}_${row.card_printing_id.slice(0, 8)}_${normalizedSha256.slice(0, 16)}.jpg`
    .replace(/[^A-Za-z0-9_.-]+/g, '_');
  const localAssetPath = path.join(STAGING_ASSET_DIR, fileName);
  await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
  await fs.writeFile(localAssetPath, normalizedBuffer);

  const plannedStoragePath = [
    'warehouse-derived',
    'image-truth-v1',
    'img03a-pkmncards-representative',
    row.set_code,
    row.card_printing_id,
    `${normalizedSha256.slice(0, 24)}.jpg`,
  ].join('/');

  return {
    source_sha256: sourceSha256,
    normalized_sha256: normalizedSha256,
    normalized_size_bytes: normalizedBuffer.length,
    local_nonproduction_asset_path: localAssetPath.replaceAll('\\', '/'),
    planned_normalized_front_storage_path: plannedStoragePath,
  };
}

async function fetchCurrentTarget(client, row) {
  const result = await client.query(
    `
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.image_source as child_image_source,
        cpi.image_path as child_image_path,
        cpi.image_url as child_image_url,
        cpi.image_alt_url as child_image_alt_url,
        cpi.image_status as child_image_status,
        cpi.image_note as child_image_note,
        cp.id as parent_card_print_id,
        cp.name as card_name,
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
  if (!current) {
    errors.push('target_card_printing_not_found');
    return errors;
  }
  if (current.card_print_id !== row.card_print_id) errors.push('card_print_id_mismatch');
  if (normalizeKey(current.set_code) !== normalizeKey(row.set_code)) errors.push('set_code_mismatch');
  if (normalizeNumber(current.number) !== normalizeNumber(row.number)) errors.push('number_mismatch');
  if (normalizeKey(current.card_name) !== normalizeKey(row.card_name)) errors.push('card_name_mismatch');
  if (normalizeKey(current.finish_key) !== normalizeKey(row.finish_key)) errors.push('finish_key_mismatch');
  if (clean(current.child_image_path)) errors.push('child_image_path_already_present');
  if (clean(current.child_image_url)) errors.push('child_image_url_already_present');
  if (clean(current.child_image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

function parentImageSnapshot(row) {
  return {
    parent_card_print_id: row.parent_card_print_id,
    parent_image_source: clean(row.parent_image_source),
    parent_image_path: clean(row.parent_image_path),
    parent_image_url: clean(row.parent_image_url),
    parent_image_alt_url: clean(row.parent_image_alt_url),
    parent_representative_image_url: clean(row.parent_representative_image_url),
    parent_image_status: clean(row.parent_image_status),
    parent_image_note: clean(row.parent_image_note),
  };
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

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for rollback-only dry-run.');
  }

  const manifest = JSON.parse(await fs.readFile(ASSET_MANIFEST_JSON, 'utf8'));
  const sourceRows = (manifest.rows ?? [])
    .filter((row) => row.image_scope === 'english_physical')
    .filter((row) => row.target_table === 'card_printings')
    .filter((row) => row.parent_overwrite_allowed === false)
    .filter((row) => row.asset_status === 'representative_image_url_preserved')
    .filter((row) => row.image_confidence === 'representative')
    .filter((row) => row.source_key === 'pkmncards')
    .filter((row) => clean(row.asset_url));

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const rows = [];
  let rollbackCompleted = false;
  try {
    await client.query('begin');

    for (const sourceRow of sourceRows) {
      const normalizedAsset = await normalizeAsset(sourceRow);
      const before = await fetchCurrentTarget(client, sourceRow);
      const validationErrors = validateTarget(sourceRow, before);
      if (validationErrors.length > 0) {
        rows.push({
          ...sourceRow,
          dry_run_status: 'blocked',
          validation_errors: validationErrors,
          normalized_asset: normalizedAsset,
        });
        continue;
      }

      const parentBefore = parentImageSnapshot(before);
      const note = `${PACKAGE_ID}:${sourceRow.source_key}:${sourceRow.source_url}`;
      const updateResult = await client.query(
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
          returning
            id,
            card_print_id,
            image_source,
            image_path,
            image_url,
            image_alt_url,
            image_status,
            image_note
        `,
        [
          sourceRow.card_printing_id,
          'identity',
          normalizedAsset.planned_normalized_front_storage_path,
          'representative_shared',
          note,
        ],
      );

      const after = await fetchCurrentTarget(client, sourceRow);
      const parentAfter = parentImageSnapshot(after);
      const parentUnchanged = proofHash(parentBefore) === proofHash(parentAfter);
      const updated = updateResult.rows[0] ?? null;
      rows.push({
        ...sourceRow,
        dry_run_status: updated && parentUnchanged ? 'rollback_update_verified' : 'blocked',
        validation_errors: updated ? [] : ['card_printing_update_not_returned'],
        target_table: 'card_printings',
        parent_overwrite_allowed: false,
        parent_image_fields_unchanged: parentUnchanged,
        mutation_preview: updated
          ? {
              type: 'update_card_printing_identity_image',
              card_printing_id: sourceRow.card_printing_id,
              image_source: updated.image_source,
              image_path: updated.image_path,
              image_url: clean(updated.image_url),
              image_alt_url: clean(updated.image_alt_url),
              image_status: updated.image_status,
              image_note: updated.image_note,
            }
          : null,
        before_child_image_fields: {
          image_source: clean(before.child_image_source),
          image_path: clean(before.child_image_path),
          image_url: clean(before.child_image_url),
          image_alt_url: clean(before.child_image_alt_url),
          image_status: clean(before.child_image_status),
          image_note: clean(before.child_image_note),
        },
        normalized_asset: normalizedAsset,
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

  const readyRows = rows.filter((row) => row.dry_run_status === 'rollback_update_verified');
  const blockedRows = rows.filter((row) => row.dry_run_status !== 'rollback_update_verified');
  const proof = {
    package_id: PACKAGE_ID,
    row_count: rows.length,
    ready_row_count: readyRows.length,
    blocked_row_count: blockedRows.length,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    rollback_completed: rollbackCompleted,
    rows: readyRows.map((row) => ({
      card_printing_id: row.card_printing_id,
      planned_normalized_front_storage_path: row.normalized_asset?.planned_normalized_front_storage_path,
      normalized_sha256: row.normalized_asset?.normalized_sha256,
      source_url: row.source_url,
      asset_url: row.asset_url,
      image_alt: row.image_alt,
      image_confidence: row.image_confidence,
      mutation_preview: row.mutation_preview,
    })),
  };

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    rollback_only_dry_run: true,
    db_writes_persisted: false,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    package_id: PACKAGE_ID,
    source_manifest: ASSET_MANIFEST_JSON,
    nonproduction_staging_asset_dir: STAGING_ASSET_DIR.replaceAll('\\', '/'),
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    source_rows: sourceRows.length,
    normalized_asset_rows: rows.length,
    rollback_update_verified_rows: readyRows.length,
    blocked_rows: blockedRows.length,
    dry_run_ready_for_real_apply: readyRows.length === sourceRows.length && blockedRows.length === 0 && rollbackCompleted,
    rollback_completed: rollbackCompleted,
    proof_hash: proofHash(proof),
    proof,
    rows,
  };

  await fs.writeFile(DRY_RUN_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(DRY_RUN_MD, `# Image Truth IMG-03A PKMNCards Representative Missing-Display Dry Run V1

Generated: ${report.generated_at}

Status: rollback-only dry run. No persisted DB writes. No migrations. No production image promotion.

This package is representative display coverage, not exact finish/variant imagery.

## Scope

- package_id: ${PACKAGE_ID}
- target_table: card_printings
- parent_overwrite_allowed: false
- source rows: ${report.source_rows}
- normalized asset rows: ${report.normalized_asset_rows}
- rollback update verified rows: ${report.rollback_update_verified_rows}
- blocked rows: ${report.blocked_rows}
- rollback_completed: ${report.rollback_completed}
- dry_run_ready_for_real_apply: ${report.dry_run_ready_for_real_apply}
- proof_hash: ${report.proof_hash}

## Rows

${markdownTable(rows, [
  { label: 'status', value: (row) => row.dry_run_status },
  { label: 'set', value: (row) => row.set_code },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'confidence', value: (row) => row.image_confidence },
  { label: 'parent unchanged', value: (row) => row.parent_image_fields_unchanged },
  { label: 'planned image path', value: (row) => row.normalized_asset?.planned_normalized_front_storage_path ?? '-' },
  { label: 'source', value: (row) => row.source_url },
])}

## Explicit Non-Actions

- db_writes_persisted: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent image fields changed: false
`);

  console.log(JSON.stringify({
    generated: [DRY_RUN_JSON, DRY_RUN_MD],
    nonproduction_staging_asset_dir: report.nonproduction_staging_asset_dir,
    source_rows: report.source_rows,
    rollback_update_verified_rows: report.rollback_update_verified_rows,
    blocked_rows: report.blocked_rows,
    dry_run_ready_for_real_apply: report.dry_run_ready_for_real_apply,
    proof_hash: report.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

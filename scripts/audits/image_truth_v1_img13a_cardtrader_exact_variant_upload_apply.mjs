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
const SOURCE_LANES_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_source_lanes_v1.json');
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_img13a_cardtrader_exact_variant_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_img13a_cardtrader_exact_variant_upload_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'image_truth_img13a_cardtrader_exact_variant_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'image_truth_img13a_cardtrader_exact_variant_upload_apply_result_v1.md');
const STAGING_ASSET_DIR = path.join('tmp', 'nonproduction_image_staging', 'image_truth_v1', 'img13a');
const STORAGE_BUCKET = 'user-card-images';
const PACKAGE_ID = 'IMG-13A-CARDTRADER-EXACT-VARIANT-CHILD-IMAGE-UPLOAD-APPLY';

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null, useExistingPlan: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++i] ?? null;
    else if (arg === '--use-existing-plan') args.useExistingPlan = true;
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

function normalizeFinish(value) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'reverse_holo') return 'reverse';
  if (normalized === 'cosmos_holo') return 'cosmos';
  if (normalized === 'poke_ball_reverse') return 'pokeball';
  if (normalized === 'master_ball_reverse') return 'masterball';
  return normalized;
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

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function fetchHtmlWithPowerShell(url) {
  if (process.platform !== 'win32') return null;
  const encodedUrl = Buffer.from(url, 'utf8').toString('base64');
  const command = [
    `$u = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("${encodedUrl}"));`,
    '$ProgressPreference = "SilentlyContinue";',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
    '$response = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 25;',
    '[Console]::Out.Write($response.Content);',
  ].join(' ');
  const result = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
    maxBuffer: 5 * 1024 * 1024,
    timeout: 35000,
  });
  return result.stdout;
}

async function fetchHtmlWithCurl(url) {
  if (process.platform !== 'win32') return null;
  const result = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--location',
    '--silent',
    '--show-error',
    '--max-time',
    '35',
    '--user-agent',
    'GrookaiImageTruthAudit/1.0 (+audit-only; cardtrader-exact-variant)',
    url,
  ], {
    maxBuffer: 5 * 1024 * 1024,
    timeout: 45000,
  });
  return result.stdout;
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; cardtrader-exact-variant)',
        accept: 'text/html',
      },
    });
    if (response.ok) return await response.text();
  } catch {
    // Fall through to PowerShell.
  }
  let html = null;
  try {
    html = await fetchHtmlWithCurl(url);
  } catch {
    // Fall through to PowerShell.
  }
  if (!html) html = await fetchHtmlWithPowerShell(url);
  if (!html) throw new Error(`html_fetch_failed:${url}`);
  return html;
}

async function fetchBufferWithCurl(url) {
  if (process.platform !== 'win32') return null;
  const result = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--location',
    '--silent',
    '--show-error',
    '--max-time',
    '40',
    '--user-agent',
    'GrookaiImageTruthAudit/1.0 (+audit-only; nonproduction-staging)',
    url,
  ], {
    encoding: 'buffer',
    maxBuffer: 8 * 1024 * 1024,
    timeout: 50000,
  });
  return result.stdout;
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
    // Fall through to PowerShell.
  }

  try {
    const buffer = await fetchBufferWithCurl(url);
    if (buffer?.length > 0) return buffer;
  } catch {
    // Fall through to PowerShell.
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

function extractTitle(html) {
  return clean(String(html ?? '').match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, ' '));
}

function extractImages(html) {
  const images = [];
  const imgRegex = /<img\b[^>]*>/gi;
  const attrRegex = /\b(src|alt)=["']([^"']*)["']/gi;
  for (const [tag] of String(html ?? '').matchAll(imgRegex)) {
    const image = {};
    for (const [, key, value] of tag.matchAll(attrRegex)) image[key.toLowerCase()] = decodeHtml(value);
    if (image.src) images.push(image);
  }
  return images;
}

function extractMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`, 'i'),
    new RegExp(`<meta[^>]+itemprop=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']${escaped}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const value = String(html ?? '').match(pattern)?.[1];
    if (value) return decodeHtml(value);
  }
  return null;
}

function expectedFinishPhrases(row) {
  const finish = normalizeFinish(row.finish_key);
  const url = String(row.best_source?.source_url ?? '').toLowerCase();
  if (finish === 'reverse') return ['reverse holo'];
  if (finish === 'cosmos') return url.includes('reverse-cosmos') ? ['reverse cosmos holo', 'cosmos holo'] : ['cosmos holo'];
  if (finish === 'cracked_ice') return ['cracked ice holo'];
  if (finish === 'holo') return ['holo'];
  if (finish === 'normal') return [];
  return [finish.replace(/_/g, ' ')];
}

function cardTraderFinishProofPhrases(row) {
  const finish = normalizeFinish(row.finish_key);
  if (finish === 'cracked_ice') return ['cracked ice holo'];
  if (finish === 'cosmos') return ['cosmos holo'];
  if (finish === 'holo') return ['holo'];
  if (finish === 'reverse') return ['reverse'];
  if (finish === 'normal') return String(row.best_source?.source_url ?? '').includes('non-holo') ? ['non holo'] : [];
  return [finish.replace(/_/g, ' ')];
}

function exactTextMatches(row, text) {
  const normalized = normalizeText(text);
  if (!normalized.includes(normalizeText(row.card_name))) return false;
  if (!normalized.includes(normalizeNumber(row.number))) return false;
  const phrases = expectedFinishPhrases(row);
  return phrases.every((phrase) => normalized.includes(normalizeText(phrase)));
}

function findExactCardTraderImage(row, html) {
  const title = extractTitle(html);
  const sourceUrl = String(row.best_source?.source_url ?? '');
  const ogImage = extractMetaContent(html, 'og:image') ?? extractMetaContent(html, 'image') ?? extractMetaContent(html, 'twitter:image');
  const metaName = extractMetaContent(html, 'og:title') ?? extractMetaContent(html, 'name') ?? title;
  const proofText = [sourceUrl, ogImage, metaName].filter(Boolean).join(' ');
  if (!exactTextMatches({ ...row, finish_key: '' }, proofText)) {
    return { status: 'blocked', reason: 'cardtrader_identity_not_exact', title, asset_url: null, image_alt: null };
  }
  const normalizedProof = normalizeText(proofText);
  const finishPhrases = cardTraderFinishProofPhrases(row);
  if (!finishPhrases.every((phrase) => normalizedProof.includes(normalizeText(phrase)))) {
    return { status: 'blocked', reason: 'cardtrader_finish_not_exact', title, asset_url: null, image_alt: null };
  }
  if (!ogImage || !String(ogImage).includes('/uploads/blueprints/image/')) {
    return { status: 'blocked', reason: 'cardtrader_exact_image_not_found', title, asset_url: null, image_alt: null };
  }
  return {
    status: 'exact_image_found',
    reason: 'cardtrader_url_and_image_metadata_exact',
    title,
    asset_url: ogImage,
    image_alt: metaName,
  };
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
  if (String(row.set_code).toLowerCase() !== String(expected.set_code).toLowerCase()) errors.push('set_code_mismatch');
  if (normalizeNumber(row.number) !== normalizeNumber(expected.number)) errors.push('number_mismatch');
  if (normalizeText(row.card_name) !== normalizeText(expected.card_name)) errors.push('card_name_mismatch');
  if (normalizeFinish(row.finish_key) !== normalizeFinish(expected.finish_key)) errors.push('finish_key_mismatch');
  if (clean(row.image_path)) errors.push('child_image_path_already_present');
  if (clean(row.image_url)) errors.push('child_image_url_already_present');
  if (clean(row.image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

async function normalizeAsset(row, assetUrl) {
  const buffer = await fetchBuffer(assetUrl);
  const normalizedSha256 = sha256Hex(buffer);
  const extension = assetUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const fileName = `${row.set_code}_${normalizeNumber(row.number)}_${normalizeFinish(row.finish_key)}_${row.card_printing_id.slice(0, 8)}_${normalizedSha256.slice(0, 16)}.${extension}`
    .replace(/[^A-Za-z0-9_.-]+/g, '_');
  const localAssetPath = path.join(STAGING_ASSET_DIR, fileName);
  await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
  await fs.writeFile(localAssetPath, buffer);
  return {
    local_nonproduction_asset_path: localAssetPath.replaceAll('\\', '/'),
    normalized_sha256: normalizedSha256,
    normalized_size_bytes: buffer.length,
    content_type: extension === 'png' ? 'image/png' : 'image/jpeg',
    planned_normalized_front_storage_path: [
      'warehouse-derived',
      'image-truth-v1',
      'img13a-cardtrader-exact-variant',
      row.set_code,
      row.card_printing_id,
      `${normalizedSha256.slice(0, 24)}.${extension}`,
    ].join('/'),
  };
}

async function buildPlan() {
  const laneReport = JSON.parse(await fs.readFile(SOURCE_LANES_JSON, 'utf8'));
  const candidates = [
    ...(laneReport.representative_only_unless_visual_manually_verified ?? []),
    ...(laneReport.source_evidence_available_no_exact_asset_extractor ?? []),
  ]
    .filter((row) => String(row.best_source?.source_key ?? '').startsWith('cardtrader_'))
    .sort((a, b) => String(a.set_code).localeCompare(String(b.set_code)) || String(a.number).localeCompare(String(b.number)));
  const supabase = createStorageClient();
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = [];
  let rollbackCompleted = false;

  try {
    await client.query('begin');
    for (const candidate of candidates) {
      let probe;
      let asset = null;
      const validationErrors = [];
      try {
        const html = await fetchHtml(candidate.best_source.source_url);
        probe = findExactCardTraderImage(candidate, html);
        if (probe.status === 'exact_image_found') asset = await normalizeAsset(candidate, probe.asset_url);
        else validationErrors.push(probe.reason);
      } catch (error) {
        probe = { status: 'blocked', reason: `probe_failed:${error.message}`, asset_url: null, image_alt: null, title: null };
        validationErrors.push(probe.reason);
      }

      const before = await fetchTarget(client, candidate.card_printing_id);
      validationErrors.push(...validateTarget(candidate, before));
      let storageExists = false;
      if (asset) {
        storageExists = await storageObjectExists(supabase, asset.planned_normalized_front_storage_path);
        if (storageExists) validationErrors.push('planned_storage_object_already_exists');
      }

      const parentBeforeHash = before ? proofHash(parentSnapshot(before)) : null;
      let mutationPreview = null;
      let parentUnchanged = false;
      if (validationErrors.length === 0) {
        const note = `${PACKAGE_ID}:cardtrader_exact:${candidate.best_source.source_url}`;
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
          [candidate.card_printing_id, 'identity', asset.planned_normalized_front_storage_path, 'exact', note],
        );
        const after = await fetchTarget(client, candidate.card_printing_id);
        parentUnchanged = parentBeforeHash === proofHash(parentSnapshot(after));
        if (update.rowCount === 1 && parentUnchanged) mutationPreview = update.rows[0];
        else validationErrors.push('rollback_update_not_verified');
      }

      rows.push({
        ...candidate,
        source_url: candidate.best_source.source_url,
        probe_status: probe.status,
        probe_reason: probe.reason,
        page_title: probe.title,
        image_alt: probe.image_alt,
        asset_url: probe.asset_url,
        image_source: 'identity',
        image_status: 'exact',
        image_path: asset?.planned_normalized_front_storage_path ?? null,
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

  const readyRows = rows.filter((row) => row.validation_errors.length === 0);
  const proof = {
    package_id: PACKAGE_ID,
    source_readiness_report: SOURCE_LANES_JSON,
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
        [row.card_printing_id, row.image_source, row.image_path, row.image_status, `${PACKAGE_ID}:cardtrader_exact:${row.source_url}`],
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
  return `# Image Truth IMG-13A CardTrader Exact Variant Upload Apply ${report.mode === 'real_apply' ? 'Result' : 'Plan'}

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

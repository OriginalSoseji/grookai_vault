import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
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
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_img19a_mep_first_partner_exact_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_img19a_mep_first_partner_exact_upload_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'image_truth_img19a_mep_first_partner_exact_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'image_truth_img19a_mep_first_partner_exact_upload_apply_result_v1.md');
const STAGING_ASSET_DIR = path.join('tmp', 'nonproduction_image_staging', 'image_truth_v1', 'img19a');
const STORAGE_BUCKET = 'user-card-images';
const PACKAGE_ID = 'IMG-19A-MEP-FIRST-PARTNER-BULBAPEDIA-EXACT-CHILD-IMAGE-UPLOAD-APPLY';

const TARGETS = [
  ['046', 'Chikorita', 'https://archives.bulbagarden.net/media/upload/4/41/ChikoritaMEPPromo46.jpg'],
  ['047', 'Cyndaquil', 'https://archives.bulbagarden.net/media/upload/f/fb/CyndaquilMEPPromo47.jpg'],
  ['048', 'Totodile', 'https://archives.bulbagarden.net/media/upload/8/8c/TotodileMEPPromo48.jpg'],
  ['049', 'Snivy', 'https://archives.bulbagarden.net/media/upload/2/2f/SnivyMEPPromo49.jpg'],
  ['050', 'Tepig', 'https://archives.bulbagarden.net/media/upload/c/c2/TepigMEPPromo50.jpg'],
  ['051', 'Oshawott', 'https://archives.bulbagarden.net/media/upload/0/02/OshawottMEPPromo51.jpg'],
  ['052', 'Grookey', 'https://archives.bulbagarden.net/media/upload/4/48/GrookeyMEPPromo52.jpg'],
  ['053', 'Scorbunny', 'https://archives.bulbagarden.net/media/upload/e/e5/ScorbunnyMEPPromo53.jpg'],
  ['054', 'Sobble', 'https://archives.bulbagarden.net/media/upload/3/37/SobbleMEPPromo54.jpg'],
  ['055', 'Treecko', 'https://archives.bulbagarden.net/media/upload/3/38/TreeckoMEPPromo55.jpg'],
  ['056', 'Torchic', 'https://archives.bulbagarden.net/media/upload/a/a8/TorchicMEPPromo56.jpg'],
  ['057', 'Mudkip', 'https://archives.bulbagarden.net/media/upload/6/63/MudkipMEPPromo57.jpg'],
  ['058', 'Chespin', 'https://archives.bulbagarden.net/media/upload/b/bb/ChespinMEPPromo58.jpg'],
  ['059', 'Fennekin', 'https://archives.bulbagarden.net/media/upload/5/5b/FennekinMEPPromo59.jpg'],
  ['060', 'Froakie', 'https://archives.bulbagarden.net/media/upload/5/50/FroakieMEPPromo60.jpg'],
  ['061', 'Sprigatito', 'https://archives.bulbagarden.net/media/upload/d/d6/SprigatitoMEPPromo61.jpg'],
  ['062', 'Fuecoco', 'https://archives.bulbagarden.net/media/upload/8/81/FuecocoMEPPromo62.jpg'],
  ['063', 'Quaxly', 'https://archives.bulbagarden.net/media/upload/d/d9/QuaxlyMEPPromo63.jpg'],
].map(([number, cardName, assetUrl]) => ({
  set_code: 'mep',
  set_name: 'MEP Black Star Promos',
  number,
  card_name: cardName,
  finish_key: 'holo',
  source_key: 'bulbapedia_archives',
  source_kind: 'collector_reference_image_archive',
  source_url: `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(`${cardName}_(MEP_Promo_${Number(number)})`)}`,
  asset_url: assetUrl,
  evidence_label: `Bulbapedia Archives exact front image for ${cardName} MEP Promo ${Number(number)}`,
}));

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
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
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

async function fetchBuffer(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+nonproduction-staging)',
        accept: 'image/jpeg,image/*,*/*;q=0.8',
      },
    });
    if (response.ok && String(response.headers.get('content-type') ?? '').toLowerCase().includes('image/')) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch {
    // Fall through to PowerShell on Windows for local TLS-chain issues.
  }

  if (process.platform === 'win32') {
    await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
    const tempPath = path.join(STAGING_ASSET_DIR, `${sha256Hex(url).slice(0, 16)}.download`);
    const command = [
      '& {',
      'param($u,$o)',
      '$ProgressPreference = "SilentlyContinue";',
      '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
      'Invoke-WebRequest -Uri $u -OutFile $o -UseBasicParsing -TimeoutSec 45;',
      '}',
    ].join(' ');
    await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command, url, tempPath], {
      timeout: 60000,
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

async function fetchTarget(client, target) {
  const result = await client.query(
    `
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.printing_gv_id,
        cpi.image_source,
        cpi.image_path,
        cpi.image_url,
        cpi.image_alt_url,
        cpi.image_status,
        cpi.image_note,
        cp.gv_id,
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
      where lower(cp.set_code) = 'mep'
        and cp.number = $1
        and lower(cp.name) = lower($2)
        and lower(cpi.finish_key) = lower($3)
      limit 1
    `,
    [target.number, target.card_name, target.finish_key],
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
  if (String(row.finish_key).toLowerCase() !== expected.finish_key) errors.push('finish_key_mismatch');
  if (clean(row.image_path)) errors.push('child_image_path_already_present');
  if (clean(row.image_url)) errors.push('child_image_url_already_present');
  if (clean(row.image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

async function normalizeAsset(row) {
  const buffer = await fetchBuffer(row.asset_url);
  const normalizedSha256 = sha256Hex(buffer);
  const fileName = `mep_${normalizeNumber(row.number)}_${row.finish_key}_${normalizedSha256.slice(0, 16)}.jpg`;
  const localAssetPath = path.join(STAGING_ASSET_DIR, fileName);
  await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
  await fs.writeFile(localAssetPath, buffer);
  return {
    local_nonproduction_asset_path: localAssetPath.replaceAll('\\', '/'),
    normalized_sha256: normalizedSha256,
    normalized_size_bytes: buffer.length,
    content_type: 'image/jpeg',
  };
}

function plannedStoragePath(row, asset) {
  return [
    'warehouse-derived',
    'image-truth-v1',
    'img19a-mep-first-partner-bulbapedia-exact',
    'mep',
    row.card_printing_id,
    `${asset.normalized_sha256.slice(0, 24)}.jpg`,
  ].join('/');
}

async function buildPlan() {
  const connectionString = requireDbUrl();
  if (!connectionString) throw new Error('Missing database URL.');
  const supabase = createStorageClient();
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = [];

  try {
    await client.query('begin');
    for (const target of TARGETS) {
      const before = await fetchTarget(client, target);
      const asset = await normalizeAsset(target);
      const rowForPath = before ? { ...before } : { card_printing_id: `missing-${target.number}` };
      const storagePath = plannedStoragePath(rowForPath, asset);
      const storageExists = await storageObjectExists(supabase, storagePath);
      const validationErrors = validateTarget(target, before);
      if (storageExists) validationErrors.push('planned_storage_object_already_exists');
      const parentBeforeHash = before ? proofHash(parentSnapshot(before)) : null;
      let mutationPreview = null;
      let parentUnchanged = false;
      if (validationErrors.length === 0) {
        const note = `${PACKAGE_ID}:${target.source_key}:${target.source_url}`;
        const updated = await client.query(
          `update public.card_printings
             set image_source = 'identity',
                 image_path = $2,
                 image_url = null,
                 image_alt_url = $3,
                 image_status = 'exact',
                 image_note = $4
           where id = $1
           returning id as card_printing_id, image_source, image_path, image_url, image_alt_url, image_status, image_note`,
          [before.card_printing_id, storagePath, target.asset_url, note],
        );
        const after = await fetchTarget(client, target);
        mutationPreview = updated.rows[0] ?? null;
        parentUnchanged = parentBeforeHash === proofHash(parentSnapshot(after));
        if (!parentUnchanged) validationErrors.push('parent_image_fields_changed');
      }

      rows.push({
        ...target,
        card_printing_id: before?.card_printing_id ?? null,
        card_print_id: before?.card_print_id ?? null,
        gv_id: before?.gv_id ?? null,
        printing_gv_id: before?.printing_gv_id ?? null,
        image_source: 'identity',
        image_path: storagePath,
        image_url: null,
        image_alt_url: target.asset_url,
        image_status: 'exact',
        image_note: `${PACKAGE_ID}:${target.source_key}:${target.source_url}`,
        storage_bucket: STORAGE_BUCKET,
        ...asset,
        planned_storage_path: storagePath,
        storage_object_already_exists: storageExists,
        parent_before_hash: parentBeforeHash,
        parent_unchanged_inside_dry_run: validationErrors.includes('parent_image_fields_changed') ? false : parentUnchanged,
        mutation_preview: mutationPreview,
        validation_errors: validationErrors,
      });
    }
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  const proof = {
    package_id: PACKAGE_ID,
    storage_bucket: STORAGE_BUCKET,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      printing_gv_id: row.printing_gv_id,
      set_code: row.set_code,
      card_name: row.card_name,
      number: row.number,
      finish_key: row.finish_key,
      source_url: row.source_url,
      asset_url: row.asset_url,
      image_path: row.image_path,
      image_alt_url: row.image_alt_url,
      local_sha256: row.normalized_sha256,
      local_size_bytes: row.normalized_size_bytes,
      image_source: row.image_source,
      image_status: row.image_status,
      image_note: row.image_note,
      validation_errors: row.validation_errors,
    })),
  };

  const plan = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'plan_only_dry_run_rolled_back',
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    storage_bucket: STORAGE_BUCKET,
    source_kind: 'collector_reference_image_archive',
    source_rows: rows.length,
    ready_rows: rows.filter((row) => row.validation_errors.length === 0).length,
    blocked_rows: rows.filter((row) => row.validation_errors.length > 0).length,
    ready_for_real_apply: rows.length > 0 && rows.every((row) => row.validation_errors.length === 0),
    rows,
    proof,
    fingerprint: proofHash(proof),
  };
  plan.recommended_approval_text = plan.ready_for_real_apply
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${plan.fingerprint}. Scope: ${plan.ready_rows} exact child image uploads/updates for MEP First Partner Series 2/3 cards from Bulbapedia Archives exact front-image proof. No parent writes. No deletes. No merges. No migrations. No global apply.`
    : null;
  return plan;
}

async function applyPlan(plan, fingerprint) {
  if (fingerprint !== plan.fingerprint) throw new Error(`fingerprint_mismatch: expected ${plan.fingerprint}`);
  if (plan.ready_for_real_apply !== true) throw new Error('plan_not_ready_for_real_apply');

  const supabase = createStorageClient();
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const uploaded = [];
  const updated = [];

  try {
    await client.query('begin');
    for (const row of plan.rows) {
      const buffer = await fs.readFile(row.local_nonproduction_asset_path);
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(row.image_path, buffer, {
        contentType: row.content_type,
        upsert: false,
      });
      if (uploadError) throw new Error(`storage_upload_failed:${row.image_path}:${uploadError.message}`);
      uploaded.push(row.image_path);

      const before = await fetchTarget(client, row);
      const validationErrors = validateTarget(row, before);
      if (validationErrors.length > 0) throw new Error(`target_validation_failed:${row.card_printing_id}:${validationErrors.join(',')}`);
      const parentBeforeHash = proofHash(parentSnapshot(before));
      const update = await client.query(
        `update public.card_printings
           set image_source = 'identity',
               image_path = $2,
               image_url = null,
               image_alt_url = $3,
               image_status = 'exact',
               image_note = $4
         where id = $1
         returning id::text as card_printing_id, image_source, image_path, image_url, image_alt_url, image_status, image_note`,
        [row.card_printing_id, row.image_path, row.image_alt_url, row.image_note],
      );
      const after = await fetchTarget(client, row);
      if (parentBeforeHash !== proofHash(parentSnapshot(after))) throw new Error(`parent_image_fields_changed:${row.card_printing_id}`);
      updated.push(update.rows[0]);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    for (const storagePath of uploaded.reverse()) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => {});
    }
    throw error;
  } finally {
    await client.end();
  }

  return {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    fingerprint: plan.fingerprint,
    db_writes_performed: true,
    storage_uploads_performed: true,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    parent_writes: false,
    deletes: false,
    merges: false,
    updated_rows: updated.length,
    uploaded_objects: uploaded.length,
    updated,
    uploaded_storage_paths: uploaded,
    pass: updated.length === plan.rows.length && uploaded.length === plan.rows.length,
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| number | card | gv_id | printing_gv_id | status | image source |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.number} | ${row.card_name} | ${row.gv_id ?? ''} | ${row.printing_gv_id ?? ''} | ${row.validation_errors.length ? row.validation_errors.join(', ') : 'ready'} | ${row.asset_url} |`),
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = await buildPlan();
  await writeJson(PLAN_JSON, plan);
  await writeText(PLAN_MD, [
    '# IMG-19A MEP First Partner Exact Image Upload Apply Plan',
    '',
    `- package_id: \`${PACKAGE_ID}\``,
    `- fingerprint: \`${plan.fingerprint}\``,
    `- ready_rows: ${plan.ready_rows}`,
    `- blocked_rows: ${plan.blocked_rows}`,
    `- ready_for_real_apply: ${plan.ready_for_real_apply}`,
    '- db_writes_performed: false',
    '- storage_uploads_performed: false',
    '- parent_writes: false',
    '- migrations_created: false',
    '',
    '## Rows',
    '',
    markdownTable(plan.rows),
    '',
    '## Approval Text',
    '',
    plan.recommended_approval_text ? `\`${plan.recommended_approval_text}\`` : '_Not ready._',
    '',
  ].join('\n'));

  if (!args.apply) {
    console.log(JSON.stringify({
      output_json: PLAN_JSON,
      output_md: PLAN_MD,
      ready_for_real_apply: plan.ready_for_real_apply,
      ready_rows: plan.ready_rows,
      blocked_rows: plan.blocked_rows,
      fingerprint: plan.fingerprint,
      recommended_approval_text: plan.recommended_approval_text,
    }, null, 2));
    return;
  }

  const result = await applyPlan(plan, args.fingerprint);
  await writeJson(RESULT_JSON, result);
  await writeText(RESULT_MD, [
    '# IMG-19A MEP First Partner Exact Image Upload Apply Result',
    '',
    `- package_id: \`${PACKAGE_ID}\``,
    `- fingerprint: \`${result.fingerprint}\``,
    `- pass: ${result.pass}`,
    `- uploaded_objects: ${result.uploaded_objects}`,
    `- updated_rows: ${result.updated_rows}`,
    '- parent_writes: false',
    '- deletes: false',
    '- merges: false',
    '- migrations_created: false',
    '',
  ].join('\n'));
  console.log(JSON.stringify({
    output_json: RESULT_JSON,
    output_md: RESULT_MD,
    pass: result.pass,
    updated_rows: result.updated_rows,
    uploaded_objects: result.uploaded_objects,
  }, null, 2));
}

await main();

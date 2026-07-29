import fs from 'node:fs/promises';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const PACKAGE_ID = 'CANON-IMAGE-UNREFERENCED-STORAGE-CLEANUP-APPLY-V1';
const DEFAULT_MANIFEST = 'docs/audits/image_truth_v1/canon_image_unreferenced_storage_cleanup_manifest_v1.jsonl';
const DEFAULT_EXPECTED_FINGERPRINT = 'c424dcd2c63143d495dbafc1ba2af54995e502c186ffb67214e6f6e05380e760';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const ALLOWED_DELETE_PREFIX = 'warehouse-derived/self-hosted-images-v1/card_prints/';
const MIN_DELETE_AGE_DAYS = Number.parseInt(process.env.CANON_IMAGE_CLEANUP_MIN_AGE_DAYS ?? '7', 10);
const BATCH_SIZE = 100;

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST,
    expectedFingerprint: DEFAULT_EXPECTED_FINGERPRINT,
    apply: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--expected-fingerprint') args.expectedFingerprint = argv[++i];
    else if (arg === '--apply') args.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.apply) throw new Error('Pass --apply to perform storage deletion.');
  return args;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function supabaseUrl() {
  return clean(process.env.SUPABASE_URL) ?? clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function supabaseKey() {
  return clean(process.env.SUPABASE_SECRET_KEY);
}

async function readManifest(file) {
  const text = await fs.readFile(file, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function validateCandidate(row) {
  const findings = [];
  if (row.bucket !== STORAGE_BUCKET) findings.push(`wrong_bucket:${row.bucket}`);
  if (row.proposed_action !== 'delete_candidate') findings.push(`not_delete_candidate:${row.proposed_action}`);
  if (!clean(row.name)?.startsWith(ALLOWED_DELETE_PREFIX)) findings.push(`outside_allowed_prefix:${row.name}`);
  if (!clean(row.mimetype)?.toLowerCase().startsWith('image/')) findings.push(`non_image_mimetype:${row.mimetype}`);
  if (Number(row.size ?? 0) <= 0) findings.push('zero_or_missing_size');
  if (Number(row.age_days ?? 0) < MIN_DELETE_AGE_DAYS) findings.push(`too_recent:${row.age_days}`);
  if (Array.isArray(row.hold_reasons) && row.hold_reasons.length > 0) findings.push(`has_hold_reasons:${row.hold_reasons.join(',')}`);
  return findings;
}

async function currentReferencedPaths(paths) {
  const url = dbUrl();
  if (!url) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      select 'card_prints' as row_type, gv_id as id, image_path
      from public.card_prints
      where image_path = any($1::text[])
      union all
      select 'card_printings' as row_type, printing_gv_id as id, image_path
      from public.card_printings
      where image_path = any($1::text[])
    `, [paths]);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const rows = await readManifest(args.manifest);
  const candidates = rows.filter((row) => row.proposed_action === 'delete_candidate');
  const validationFindings = candidates.flatMap((row) => validateCandidate(row).map((finding) => `${row.name}:${finding}`));
  if (validationFindings.length > 0) {
    throw new Error(`Candidate validation failed:\n${validationFindings.slice(0, 50).join('\n')}`);
  }

  const paths = candidates.map((row) => row.name);
  const refs = await currentReferencedPaths(paths);
  if (refs.length > 0) {
    throw new Error(`Refusing delete; current DB references found:\n${JSON.stringify(refs.slice(0, 50), null, 2)}`);
  }

  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) throw new Error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY.');
  const supabase = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const removed = [];
  const errors = [];
  for (let index = 0; index < paths.length; index += BATCH_SIZE) {
    const batch = paths.slice(index, index + BATCH_SIZE);
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove(batch);
    if (error) {
      errors.push({ batch_start: index, message: error.message, paths: batch });
      continue;
    }
    removed.push(...(data ?? []).map((row) => row.name));
  }

  const result = {
    package_id: PACKAGE_ID,
    manifest: args.manifest,
    expected_fingerprint: args.expectedFingerprint,
    bucket: STORAGE_BUCKET,
    requested_delete_count: candidates.length,
    removed_count: removed.length,
    error_count: errors.length,
    errors,
  };

  console.log(JSON.stringify(result, null, 2));
  if (errors.length > 0 || removed.length !== candidates.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal`, error);
  process.exit(1);
});

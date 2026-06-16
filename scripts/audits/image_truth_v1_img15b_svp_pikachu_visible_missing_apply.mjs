import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'image_truth_img15a_svp_pikachu_visible_missing_dry_run_v1.json');
const APPLY_JSON = path.join(OUTPUT_DIR, 'image_truth_img15b_svp_pikachu_visible_missing_apply_result_v1.json');
const APPLY_MD = path.join(OUTPUT_DIR, 'image_truth_img15b_svp_pikachu_visible_missing_apply_result_v1.md');
const PACKAGE_ID = 'IMG-15B-SVP-PIKACHU-VISIBLE-MISSING-CHILD-IMAGE-APPLY';
const STORAGE_BUCKET = 'user-card-images';
const TARGET_PRINTING_IDS = new Set(['GV-PK-PR-SV-190-STD', 'GV-PK-PR-SV-214-STD']);

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

function createStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function storageObjectExists(supabase, storagePath) {
  const slashIndex = storagePath.lastIndexOf('/');
  const folder = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
  const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, {
    limit: 100,
    search: fileName,
  });
  if (error) throw new Error(`storage_probe_failed:${storagePath}:${error.message}`);
  return (data ?? []).some((entry) => entry.name === fileName);
}

async function uploadStorageObject(supabase, row) {
  const storagePath = row.proposed_image_path;
  const localPath = row.normalized_asset.local_nonproduction_asset_path;
  const buffer = await fs.readFile(localPath);
  const sha = sha256Hex(buffer);
  if (sha !== row.normalized_asset.normalized_sha256) {
    throw new Error(`local_asset_sha256_mismatch:${row.printing_gv_id}`);
  }

  const existedBefore = await storageObjectExists(supabase, storagePath);
  if (!existedBefore) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error(`storage_upload_failed:${row.printing_gv_id}:${error.message}`);
  }

  const existsAfter = await storageObjectExists(supabase, storagePath);
  if (!existsAfter) throw new Error(`storage_upload_post_verify_missing:${row.printing_gv_id}`);

  return {
    printing_gv_id: row.printing_gv_id,
    bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    existed_before: existedBefore,
    exists_after: existsAfter,
    uploaded: !existedBefore,
    sha256: sha,
    size_bytes: buffer.length,
  };
}

async function fetchParentSnapshot(client, parentIds) {
  const { rows } = await client.query(
    `
      select id, gv_id, image_source, image_path, image_url, image_alt_url, representative_image_url, image_status, image_note
      from public.card_prints
      where id = any($1::uuid[])
      order by id
    `,
    [parentIds],
  );
  return rows;
}

function buildMarkdown(report) {
  return `# ${PACKAGE_ID}

Status: ${report.status}

- dry_run_fingerprint: \`${report.dry_run_fingerprint}\`
- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- parent_writes_performed: ${report.parent_writes_performed}
- child_image_rows_updated: ${report.child_image_rows_updated}
- storage_objects_uploaded: ${report.storage.filter((row) => row.uploaded).length}
- apply_proof_hash: \`${report.apply_proof_hash}\`

## Updated Rows

${report.updated_children.map((row) => `- ${row.printing_gv_id}: ${row.image_path}`).join('\n')}

## Blocked Rows

- GV-PK-PR-SV-225-RH remains blocked for identity/finish review.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.apply) throw new Error('Refusing to run without --apply.');

  const dryRun = JSON.parse(await fs.readFile(DRY_RUN_JSON, 'utf8'));
  if (args.fingerprint !== dryRun.proof_hash) {
    throw new Error(`Fingerprint mismatch. Expected ${dryRun.proof_hash}.`);
  }
  if (dryRun.dry_run_ready_rows !== 3) throw new Error('Unexpected IMG-15A ready row count.');
  if (dryRun.blocked_rows !== 2) throw new Error('Unexpected IMG-15A blocked row count.');

  const rows = dryRun.rows.filter((row) => TARGET_PRINTING_IDS.has(row.printing_gv_id));
  if (rows.length !== 2) throw new Error(`Expected two target rows, got ${rows.length}.`);

  const supabase = createStorageClient();
  const storage = [];
  for (const row of rows) {
    storage.push(await uploadStorageObject(supabase, row));
  }

  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL.');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('begin');
    const parentIds = rows.map((row) => row.card_print_id);
    const parentBefore = await fetchParentSnapshot(client, parentIds);
    const parentBeforeHash = proofHash(parentBefore);

    const updatedChildren = [];
    for (const row of rows) {
      const result = await client.query(
        `
          update public.card_printings
          set image_source = $2,
              image_path = $3,
              image_status = $4,
              image_note = $5
          where id = $1
            and printing_gv_id = $6
            and image_path is null
            and (image_url is null or btrim(image_url) = '')
            and (image_alt_url is null or btrim(image_alt_url) = '')
          returning id, printing_gv_id, finish_key, image_source, image_path, image_status, image_note
        `,
        [
          row.card_printing_id,
          row.proposed_image_source,
          row.proposed_image_path,
          row.proposed_image_status,
          `${PACKAGE_ID}:${row.source_key}:${row.source_url}`,
          row.printing_gv_id,
        ],
      );
      if (result.rowCount !== 1) {
        throw new Error(`image_update_row_count_mismatch:${row.printing_gv_id}:${result.rowCount}`);
      }
      updatedChildren.push(result.rows[0]);
    }

    const parentAfter = await fetchParentSnapshot(client, parentIds);
    const parentAfterHash = proofHash(parentAfter);
    if (parentBeforeHash !== parentAfterHash) throw new Error('parent_changed');

    const verify = await client.query(
      `
        select printing_gv_id, finish_key, image_source, image_path, image_status
        from public.card_printings
        where printing_gv_id = any($1::text[])
        order by printing_gv_id
      `,
      [[...TARGET_PRINTING_IDS]],
    );

    await client.query('commit');

    const proof = {
      package_id: PACKAGE_ID,
      dry_run_fingerprint: dryRun.proof_hash,
      targets: [...TARGET_PRINTING_IDS],
      updated_children: updatedChildren,
      storage,
      post_verify: verify.rows,
      parent_unchanged: true,
      db_writes_performed: true,
      storage_uploads_performed: storage.some((row) => row.uploaded),
      migrations_created: false,
      parent_writes_performed: false,
    };

    const report = {
      ...proof,
      status: 'APPLIED',
      generated_at: new Date().toISOString(),
      child_image_rows_updated: updatedChildren.length,
      apply_proof_hash: proofHash(proof),
    };

    await fs.writeFile(APPLY_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(APPLY_MD, buildMarkdown(report));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try { await client.query('rollback'); } catch { /* ignore */ }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

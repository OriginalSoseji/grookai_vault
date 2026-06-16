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
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'image_truth_img16a_svp085_finish_cleanup_image_dry_run_v1.json');
const APPLY_JSON = path.join(OUTPUT_DIR, 'image_truth_img16b_svp085_finish_cleanup_image_real_apply_result_v1.json');
const APPLY_MD = path.join(OUTPUT_DIR, 'image_truth_img16b_svp085_finish_cleanup_image_real_apply_result_v1.md');
const PACKAGE_ID = 'IMG-16B-SVP085-FINISH-CLEANUP-IMAGE-REAL-APPLY';
const STORAGE_BUCKET = 'user-card-images';

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

async function uploadStorageObject(row) {
  const supabase = createStorageClient();
  const storagePath = row.supported_child_image.proposed_image_path;
  const localPath = row.supported_child_image.local_asset_path;
  const buffer = await fs.readFile(localPath);
  const sha = sha256Hex(buffer);
  if (sha !== row.supported_child_image.local_asset_sha256) {
    throw new Error('local_asset_sha256_mismatch');
  }

  const existedBefore = await storageObjectExists(supabase, storagePath);
  if (!existedBefore) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error(`storage_upload_failed:${error.message}`);
  }

  const existsAfter = await storageObjectExists(supabase, storagePath);
  if (!existsAfter) throw new Error('storage_upload_post_verify_missing');

  return {
    bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    existed_before: existedBefore,
    exists_after: existsAfter,
    uploaded: !existedBefore,
    sha256: sha,
    size_bytes: buffer.length,
  };
}

async function fetchParent(client, parentId) {
  const result = await client.query(
    `
      select id, gv_id, name, set_code, number, rarity, printed_identity_modifier,
             image_source, image_path, image_url, image_alt_url, representative_image_url, image_status, image_note
      from public.card_prints
      where id = $1
      limit 1
    `,
    [parentId],
  );
  return result.rows[0] ?? null;
}

function parentSnapshot(parent) {
  return {
    id: parent?.id ?? null,
    gv_id: parent?.gv_id ?? null,
    name: parent?.name ?? null,
    set_code: parent?.set_code ?? null,
    number: parent?.number ?? null,
    rarity: parent?.rarity ?? null,
    printed_identity_modifier: parent?.printed_identity_modifier ?? null,
    image_source: clean(parent?.image_source),
    image_path: clean(parent?.image_path),
    image_url: clean(parent?.image_url),
    image_alt_url: clean(parent?.image_alt_url),
    representative_image_url: clean(parent?.representative_image_url),
    image_status: clean(parent?.image_status),
    image_note: clean(parent?.image_note),
  };
}

async function dependencyCount(client, childIds) {
  const fks = await client.query(
    `
      select tc.table_schema, tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and ccu.table_schema = 'public'
        and ccu.table_name = 'card_printings'
        and ccu.column_name = 'id'
      order by tc.table_name, kcu.column_name
    `,
  );

  const rows = [];
  for (const fk of fks.rows) {
    const result = await client.query(
      `select count(*)::int as count from ${fk.table_schema}.${fk.table_name} where ${fk.column_name} = any($1::uuid[])`,
      [childIds],
    );
    rows.push({ ...fk, count: Number(result.rows[0]?.count ?? 0) });
  }
  return rows;
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
  return `# Image Truth V1 IMG-16B SVP085 Finish Cleanup + Image Real Apply

## Safety

- package_id: ${report.package_id}
- dry_run_fingerprint: \`${report.dry_run_fingerprint}\`
- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- parent_writes_performed: ${report.parent_writes_performed}

## Summary

- unsupported_children_deleted: ${report.unsupported_children_deleted}
- supported_child_image_updated: ${report.supported_child_image_updated}
- storage_uploaded: ${report.storage.uploaded}
- storage_exists_after: ${report.storage.exists_after}
- parent_unchanged: ${report.parent_unchanged}
- post_verify_holo_reverse_rows: ${report.post_verify.holo_reverse_rows}
- post_verify_normal_image_rows: ${report.post_verify.normal_image_rows}
- apply_proof_hash: \`${report.apply_proof_hash}\`

## Deleted Unsupported Children

${markdownTable(report.deleted_children, [
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'finish', value: (row) => row.finish_key },
])}

## Updated Supported Child

${markdownTable(report.updated_children, [
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'image source', value: (row) => row.image_source },
  { label: 'image status', value: (row) => row.image_status },
  { label: 'image path', value: (row) => row.image_path },
])}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.apply) throw new Error('Refusing to run without --apply.');

  const dryRun = JSON.parse(await fs.readFile(DRY_RUN_JSON, 'utf8'));
  if (args.fingerprint !== dryRun.proof_hash) {
    throw new Error(`Fingerprint mismatch. Expected ${dryRun.proof_hash}.`);
  }
  if (dryRun.unsupported_children_deleted_in_dry_run !== 2) throw new Error('Dry-run delete proof is not 2.');
  if (dryRun.supported_child_image_updated_in_dry_run !== 1) throw new Error('Dry-run image update proof is not 1.');
  if (dryRun.dependency_rows_on_delete_candidates !== 0) throw new Error('Dry-run dependency proof is not zero.');
  if (dryRun.parent_unchanged_in_dry_run !== true) throw new Error('Dry-run parent unchanged proof failed.');

  const supported = dryRun.supported_child_image;
  const storage = await uploadStorageObject({
    supported_child_image: {
      proposed_image_path: supported.proposed_image_path,
      local_asset_path: dryRun.local_asset_path ?? dryRun.supported_child_image.local_asset?.local_nonproduction_asset_path ?? 'tmp/nonproduction_image_staging/image_truth_v1/img15a-svp-pikachu-visible-missing/svp_85_normal_2e805b83_5d1a419870158d9f.jpg',
      local_asset_sha256: dryRun.local_asset.sha256,
    },
  });

  const connectionString = requireDbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const unsupportedChildIds = dryRun.unsupported_children.map((row) => row.child_id);
    await client.query('begin');
    const parentBefore = await fetchParent(client, dryRun.unsupported_children[0] ? '50386954-ded6-4909-8d17-6b391aeb53e4' : null);
    const parentBeforeHash = proofHash(parentSnapshot(parentBefore));
    const deps = await dependencyCount(client, unsupportedChildIds);
    const dependencyRows = deps.reduce((sum, row) => sum + row.count, 0);
    if (dependencyRows !== 0) throw new Error('dependency_rows_present_before_apply');

    const deleteResult = await client.query(
      `
        delete from public.card_printings
        where id = any($1::uuid[])
        returning id, printing_gv_id, finish_key
      `,
      [unsupportedChildIds],
    );

    const updateResult = await client.query(
      `
        update public.card_printings
        set image_source = $2,
            image_path = $3,
            image_status = $4,
            image_note = $5
        where id = $1
          and image_path is null
          and (image_url is null or btrim(image_url) = '')
          and (image_alt_url is null or btrim(image_alt_url) = '')
        returning id, printing_gv_id, finish_key, image_source, image_path, image_url, image_alt_url, image_status, image_note
      `,
      [
        supported.child_id,
        'identity',
        supported.proposed_image_path,
        'exact',
        `${PACKAGE_ID}:pkmncards:https://pkmncards.com/card/pikachu-with-grey-felt-hat-scarlet-violet-promos-svp-085/`,
      ],
    );

    if (deleteResult.rowCount !== 2) throw new Error(`delete_row_count_mismatch:${deleteResult.rowCount}`);
    if (updateResult.rowCount !== 1) throw new Error(`image_update_row_count_mismatch:${updateResult.rowCount}`);

    const parentAfter = await fetchParent(client, parentBefore.id);
    const parentAfterHash = proofHash(parentSnapshot(parentAfter));
    if (parentBeforeHash !== parentAfterHash) throw new Error('parent_changed');

    const postVerify = await client.query(
      `
        select
          count(*) filter (where finish_key in ('holo','reverse'))::int as holo_reverse_rows,
          count(*) filter (
            where id = $1
              and finish_key = 'normal'
              and image_source = 'identity'
              and image_path = $2
              and image_status = 'exact'
          )::int as normal_image_rows
        from public.card_printings
        where card_print_id = $3
      `,
      [supported.child_id, supported.proposed_image_path, parentBefore.id],
    );

    await client.query('commit');

    const proof = {
      package_id: PACKAGE_ID,
      dry_run_fingerprint: dryRun.proof_hash,
      deleted_children: deleteResult.rows,
      updated_children: updateResult.rows,
      storage,
      parent_unchanged: parentBeforeHash === parentAfterHash,
      post_verify: postVerify.rows[0],
      db_writes_performed: true,
      storage_uploads_performed: storage.uploaded,
      migrations_created: false,
      parent_writes_performed: false,
    };

    const report = {
      ...proof,
      generated_at: new Date().toISOString(),
      unsupported_children_deleted: deleteResult.rowCount,
      supported_child_image_updated: updateResult.rowCount,
      apply_proof_hash: proofHash(proof),
    };

    await fs.writeFile(APPLY_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(APPLY_MD, buildMarkdown(report));
    console.log(JSON.stringify({
      output_json: APPLY_JSON,
      output_md: APPLY_MD,
      unsupported_children_deleted: report.unsupported_children_deleted,
      supported_child_image_updated: report.supported_child_image_updated,
      storage_uploaded: report.storage.uploaded,
      post_verify: report.post_verify,
      apply_proof_hash: report.apply_proof_hash,
      migrations_created: report.migrations_created,
      parent_writes_performed: report.parent_writes_performed,
    }, null, 2));
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

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const PACKAGE_ID = 'jpn_pikachu_promo_first_batch_v1';
const FINALIZE_PACKAGE_ID = 'jpn_pikachu_promo_first_batch_end_to_end_v1';
const STORAGE_BUCKET = 'user-card-images';
const ROOT = process.cwd();
const OUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'master_identity_graph_v1',
  'jpn_pikachu_promo_end_to_end_v1',
);
const ASSET_DIR = path.join(OUT_DIR, 'assets');
const RESULT_JSON = path.join(OUT_DIR, 'jpn_pikachu_promo_end_to_end_apply_v1.json');
const RESULT_MD = path.join(OUT_DIR, 'jpn_pikachu_promo_end_to_end_apply_v1.md');

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function supabaseClient() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(input).digest('hex');
}

function deterministicUuid(seed) {
  const bytes = crypto.createHash('sha256').update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function extensionForContentType(contentType, url) {
  const normalized = clean(contentType)?.split(';')[0]?.toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  const ext = path.extname(new URL(url).pathname).replace('.', '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  return null;
}

function publicStorageUrl(storagePath) {
  const url = clean(process.env.SUPABASE_URL);
  if (!url) throw new Error('Missing SUPABASE_URL.');
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}

function httpsGetBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          'user-agent': 'Mozilla/5.0 GrookaiVaultImageIngestion/1.0',
          accept: 'text/html,image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume();
          const redirected = new URL(response.headers.location, url).toString();
          httpsGetBuffer(redirected).then(resolve, reject);
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          buffer: Buffer.concat(chunks),
          finalUrl: url,
        }));
      },
    );
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error(`timeout:${url}`));
    });
  });
}

function extractOgImage(html, sourceUrl) {
  const metaMatches = [...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter(Boolean);
  const first = metaMatches[0];
  if (!first) return null;
  return new URL(first, sourceUrl).toString();
}

async function promisePool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function queryTargets(client) {
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.gv_id,
       cp.name,
       cp.set_code,
       cp.number,
       cp.image_url,
       cp.image_path,
       cp.image_status,
       cpi.id::text as card_print_identity_id,
       e.evidence_payload ->> 'source_url' as tcgcollector_url
     from public.card_prints cp
     join public.card_print_identity cpi
       on cpi.card_print_id = cp.id
      and cpi.is_active = true
     join public.card_print_identity_source_evidence e
       on e.card_print_id = cp.id
      and e.card_print_identity_id = cpi.id
      and e.active = true
      and e.source_key = 'tcgcollector_jp'
     where cp.external_ids -> 'master_identity_graph_jpn' ->> 'supplemental_package_id' = $1
     order by cp.gv_id`,
    [PACKAGE_ID],
  );
  return result.rows;
}

async function acquireOneImage(target) {
  const page = await httpsGetBuffer(target.tcgcollector_url);
  if (page.status !== 200) {
    return { ...target, status: 'page_fetch_failed', errors: [`page_status:${page.status}`] };
  }
  const html = page.buffer.toString('utf8');
  const imageUrl = extractOgImage(html, target.tcgcollector_url);
  if (!imageUrl) return { ...target, status: 'image_url_missing', errors: ['og_image_missing'] };

  const image = await httpsGetBuffer(imageUrl);
  const contentType = clean(image.headers['content-type']);
  const ext = extensionForContentType(contentType, imageUrl);
  if (image.status !== 200) {
    return { ...target, status: 'image_fetch_failed', source_image_url: imageUrl, errors: [`image_status:${image.status}`] };
  }
  if (!ext || !contentType?.toLowerCase().startsWith('image/')) {
    return { ...target, status: 'image_validation_failed', source_image_url: imageUrl, errors: [`content_type:${contentType}`] };
  }
  if (image.buffer.length < 5000) {
    return { ...target, status: 'image_validation_failed', source_image_url: imageUrl, errors: [`image_too_small:${image.buffer.length}`] };
  }

  const assetSha = sha256(image.buffer);
  const fileName = `${assetSha.slice(0, 24)}.${ext}`;
  const localPath = path.join(ASSET_DIR, `${target.gv_id}.${ext}`);
  const storagePath = `warehouse-derived/self-hosted-images-v1/pokemon-jpn/${target.set_code}/${target.gv_id.toLowerCase()}/${fileName}`;
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, image.buffer);

  return {
    ...target,
    status: 'exact_candidate_staged',
    source_image_url: imageUrl,
    content_type: contentType,
    size_bytes: image.buffer.length,
    sha256: assetSha,
    local_asset_path: path.relative(ROOT, localPath).replaceAll('\\', '/'),
    storage_bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    public_url: publicStorageUrl(storagePath),
  };
}

async function uploadImages(imageRows) {
  const supabase = supabaseClient();
  const results = [];
  for (const row of imageRows) {
    if (row.status !== 'exact_candidate_staged') {
      results.push({ gv_id: row.gv_id, status: 'skipped_not_staged', uploaded: false });
      continue;
    }
    const slash = row.storage_path.lastIndexOf('/');
    const folder = row.storage_path.slice(0, slash);
    const file = row.storage_path.slice(slash + 1);
    const existing = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 100, search: file });
    if (existing.error) throw new Error(`storage_probe_failed:${row.gv_id}:${existing.error.message}`);
    if ((existing.data ?? []).some((entry) => entry.name === file)) {
      results.push({ gv_id: row.gv_id, status: 'skipped_existing_object', uploaded: false, storage_path: row.storage_path });
      continue;
    }
    const buffer = await fs.readFile(path.join(ROOT, row.local_asset_path));
    if (sha256(buffer) !== row.sha256) throw new Error(`local_asset_hash_mismatch:${row.gv_id}`);
    const upload = await supabase.storage.from(STORAGE_BUCKET).upload(row.storage_path, buffer, {
      upsert: false,
      contentType: row.content_type,
    });
    if (upload.error) throw new Error(`storage_upload_failed:${row.gv_id}:${upload.error.message}`);
    results.push({
      gv_id: row.gv_id,
      status: 'uploaded',
      uploaded: true,
      storage_path: row.storage_path,
      sha256: row.sha256,
      size_bytes: buffer.length,
      content_type: row.content_type,
    });
  }
  return results;
}

async function speciesId(client) {
  const result = await client.query(
    `select id::text
     from public.pokemon_species
     where slug = 'pikachu'
       and active = true
     limit 1`,
  );
  if (result.rowCount !== 1) throw new Error('pikachu_species_row_not_found');
  return result.rows[0].id;
}

async function preflightDb(client, rows) {
  const cardPrintIds = rows.map((row) => row.card_print_id);
  const printingGvIds = rows.map((row) => `${row.gv_id}-STD`);
  const result = await client.query(
    `select
       (select count(*)::int
        from public.card_printings cpr
        where cpr.card_print_id = any($1::uuid[])) as existing_child_rows,
       (select count(*)::int
        from public.card_printings cpr
        where cpr.printing_gv_id = any($2::text[])) as existing_printing_gv_rows,
       (select count(*)::int
        from public.card_print_species cps
        where cps.card_print_id = any($1::uuid[])
          and cps.active = true) as existing_active_species_rows`,
    [cardPrintIds, printingGvIds],
  );
  return result.rows[0];
}

async function applyDbFinalization(client, imageRows) {
  const readyRows = imageRows.filter((row) => row.status === 'exact_candidate_staged');
  const pikachuSpeciesId = await speciesId(client);
  const preflight = await preflightDb(client, readyRows);
  const stopFindings = [];
  if (readyRows.length !== 134) stopFindings.push(`ready_image_rows_not_134:${readyRows.length}`);
  if (preflight.existing_child_rows !== 0) stopFindings.push(`existing_child_rows:${preflight.existing_child_rows}`);
  if (preflight.existing_printing_gv_rows !== 0) stopFindings.push(`existing_printing_gv_rows:${preflight.existing_printing_gv_rows}`);
  if (preflight.existing_active_species_rows !== 0) stopFindings.push(`existing_active_species_rows:${preflight.existing_active_species_rows}`);
  if (stopFindings.length > 0) {
    return { applied: false, preflight, stop_findings: stopFindings };
  }

  const payload = readyRows.map((row) => ({
    card_print_id: row.card_print_id,
    card_print_identity_id: row.card_print_identity_id,
    child_printing_id: deterministicUuid(`${FINALIZE_PACKAGE_ID}:child:${row.gv_id}`),
    species_link_id: deterministicUuid(`${FINALIZE_PACKAGE_ID}:species:${row.gv_id}`),
    gv_id: row.gv_id,
    printing_gv_id: `${row.gv_id}-STD`,
    set_code: row.set_code,
    number: row.number,
    name: row.name,
    image_url: row.public_url,
    image_path: row.storage_path,
    image_note: `Exact Japanese Pikachu promo image self-hosted from TCGCollector evidence page ${row.tcgcollector_url}.`,
    source_image_url: row.source_image_url,
    sha256: row.sha256,
  }));

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table jpn_pikachu_finalize_targets (
         card_print_id uuid primary key,
         card_print_identity_id uuid not null,
         child_printing_id uuid not null,
         species_link_id uuid not null,
         gv_id text not null,
         printing_gv_id text not null,
         set_code text not null,
         number text,
         name text not null,
         image_url text not null,
         image_path text not null,
         image_note text not null,
         source_image_url text not null,
         sha256 text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into jpn_pikachu_finalize_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         card_print_identity_id uuid,
         child_printing_id uuid,
         species_link_id uuid,
         gv_id text,
         printing_gv_id text,
         set_code text,
         number text,
         name text,
         image_url text,
         image_path text,
         image_note text,
         source_image_url text,
         sha256 text
       )`,
      [JSON.stringify(payload)],
    );

    const parentUpdate = await client.query(
      `update public.card_prints cp
       set
         image_url = t.image_url,
         image_path = t.image_path,
         image_source = 'identity',
         image_status = 'exact',
         image_note = t.image_note,
         data_quality_flags = coalesce(cp.data_quality_flags, '{}'::jsonb)
           || jsonb_build_object(
             'jpn_pikachu_promo_end_to_end_v1',
             jsonb_build_object(
               'finalized_at', now(),
               'source_image_url', t.source_image_url,
               'self_hosted_sha256', t.sha256
             )
           )
       from jpn_pikachu_finalize_targets t
       where cp.id = t.card_print_id
         and cp.external_ids -> 'master_identity_graph_jpn' ->> 'supplemental_package_id' = $1
       returning cp.id::text`,
      [PACKAGE_ID],
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_status, image_note
       )
       select
         child_printing_id,
         card_print_id,
         'normal',
         false,
         'jpn_pikachu_promo_first_batch_v1',
         'tcgcollector_jp|' || source_image_url,
         $1,
         printing_gv_id,
         'identity',
         image_path,
         image_url,
         'exact',
         image_note
       from jpn_pikachu_finalize_targets
       returning id::text`,
      [FINALIZE_PACKAGE_ID],
    );

    const speciesInsert = await client.query(
      `insert into public.card_print_species (
         id, card_print_id, species_id, role, counts_for_completion, source, confidence, evidence, active
       )
       select
         species_link_id,
         card_print_id,
         $1::uuid,
         'primary',
         true,
         'jpn_pikachu_promo_end_to_end_v1',
         0.96,
         jsonb_build_object(
           'package_id', $2::text,
           'source', 'two_source_jpn_pikachu_promo_ingestion',
           'tcgcollector_image_url', source_image_url,
           'gv_id', gv_id
         ),
         true
       from jpn_pikachu_finalize_targets
       returning id::text`,
      [pikachuSpeciesId, FINALIZE_PACKAGE_ID],
    );

    const reviewUpdate = await client.query(
      `update public.card_print_family_review_queue q
       set
         review_status = 'approved_for_family_link_promotion',
         family_link_promotion_allowed = true,
         reviewed_by = $1,
         reviewed_at = now()
       from jpn_pikachu_finalize_targets t
       where q.card_print_id = t.card_print_id
         and q.card_print_identity_id = t.card_print_identity_id
         and q.active = true
         and q.normalized_family_candidate = 'pikachu'
       returning q.id::text`,
      [FINALIZE_PACKAGE_ID],
    );

    const proof = await client.query(
      `select
         (select count(*)::int from public.card_prints cp join jpn_pikachu_finalize_targets t on t.card_print_id = cp.id where cp.image_status = 'exact' and cp.image_source = 'identity' and cp.image_path = t.image_path and cp.image_url = t.image_url) as finalized_parent_images,
         (select count(*)::int from public.card_printings cpr join jpn_pikachu_finalize_targets t on t.child_printing_id = cpr.id where cpr.finish_key = 'normal' and cpr.printing_gv_id = t.printing_gv_id and cpr.image_status = 'exact') as finalized_child_printings,
         (select count(*)::int from public.card_print_species cps join jpn_pikachu_finalize_targets t on t.species_link_id = cps.id where cps.active = true and cps.species_id = $1::uuid) as finalized_species_links,
         (select count(*)::int from public.card_print_family_review_queue q join jpn_pikachu_finalize_targets t on t.card_print_id = q.card_print_id where q.review_status = 'approved_for_family_link_promotion' and q.family_link_promotion_allowed = true) as approved_review_rows`,
      [pikachuSpeciesId],
    );

    if (parentUpdate.rowCount !== 134) throw new Error(`parent_update_count:${parentUpdate.rowCount}`);
    if (childInsert.rowCount !== 134) throw new Error(`child_insert_count:${childInsert.rowCount}`);
    if (speciesInsert.rowCount !== 134) throw new Error(`species_insert_count:${speciesInsert.rowCount}`);
    if (reviewUpdate.rowCount !== 134) throw new Error(`review_update_count:${reviewUpdate.rowCount}`);

    await client.query('commit');
    return {
      applied: true,
      preflight,
      stop_findings: [],
      writes: {
        parent_image_updates: parentUpdate.rowCount,
        child_printing_inserts: childInsert.rowCount,
        species_link_inserts: speciesInsert.rowCount,
        family_review_updates: reviewUpdate.rowCount,
      },
      proof: proof.rows[0],
      payload_fingerprint_sha256: sha256(payload),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function renderMarkdown(report) {
  return `# Japanese Pikachu Promo End-to-End Apply v1

- Generated: ${report.generated_at}
- Apply status: ${report.apply_status}
- Targets: ${report.counts.targets}
- Images staged: ${report.counts.images_staged}
- Storage uploaded: ${report.counts.storage_uploaded}
- Storage existing: ${report.counts.storage_existing}
- Parent image updates: ${report.db_apply?.writes?.parent_image_updates ?? 0}
- Child printing inserts: ${report.db_apply?.writes?.child_printing_inserts ?? 0}
- Species link inserts: ${report.db_apply?.writes?.species_link_inserts ?? 0}
- Family review updates: ${report.db_apply?.writes?.family_review_updates ?? 0}
- Stop findings: ${(report.stop_findings ?? []).length}
- Payload fingerprint: \`${report.db_apply?.payload_fingerprint_sha256 ?? 'not_applied'}\`

## Scope

Only rows tagged with \`${PACKAGE_ID}\` were finalized. This package uploaded exact TCGCollector evidence images to Supabase Storage and made the same 134 rows public-visible through normal child card_printings.
`;
}

async function main() {
  const conn = dbUrl();
  if (!conn) throw new Error('Missing database connection string.');
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await fs.mkdir(OUT_DIR, { recursive: true });
    const targets = await queryTargets(client);
    if (targets.length !== 134) throw new Error(`expected_134_targets_found_${targets.length}`);

    const imageRows = await promisePool(targets, 6, acquireOneImage);
    const stagedRows = imageRows.filter((row) => row.status === 'exact_candidate_staged');
    const imageStopFindings = imageRows
      .filter((row) => row.status !== 'exact_candidate_staged')
      .map((row) => `${row.gv_id}:${row.status}:${(row.errors ?? []).join(',')}`);
    if (stagedRows.length !== 134) {
      throw new Error(`image_acquisition_incomplete:${stagedRows.length}/134:${imageStopFindings.slice(0, 10).join(';')}`);
    }

    const uploadResults = await uploadImages(stagedRows);
    const failedUploads = uploadResults.filter((row) => !['uploaded', 'skipped_existing_object'].includes(row.status));
    if (failedUploads.length > 0) {
      throw new Error(`storage_upload_failures:${failedUploads.map((row) => row.gv_id).join(',')}`);
    }

    const dbApply = await applyDbFinalization(client, stagedRows);
    const report = {
      package_id: FINALIZE_PACKAGE_ID,
      generated_at: new Date().toISOString(),
      apply_status: dbApply.applied ? 'applied_committed' : 'blocked_before_db_apply',
      source_package_id: PACKAGE_ID,
      counts: {
        targets: targets.length,
        images_staged: stagedRows.length,
        storage_uploaded: uploadResults.filter((row) => row.status === 'uploaded').length,
        storage_existing: uploadResults.filter((row) => row.status === 'skipped_existing_object').length,
      },
      stop_findings: [...imageStopFindings, ...(dbApply.stop_findings ?? [])],
      db_apply: dbApply,
      image_manifest: stagedRows.map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        tcgcollector_url: row.tcgcollector_url,
        source_image_url: row.source_image_url,
        storage_path: row.storage_path,
        public_url: row.public_url,
        sha256: row.sha256,
        size_bytes: row.size_bytes,
        content_type: row.content_type,
      })),
      upload_results: uploadResults,
      pass: dbApply.applied && imageStopFindings.length === 0,
    };

    await fs.writeFile(RESULT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(RESULT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      status: report.apply_status,
      pass: report.pass,
      counts: report.counts,
      writes: report.db_apply.writes,
      proof: report.db_apply.proof,
      payload_fingerprint_sha256: report.db_apply.payload_fingerprint_sha256,
      result_json: path.relative(ROOT, RESULT_JSON),
      result_md: path.relative(ROOT, RESULT_MD),
    }, null, 2));
    if (!report.pass) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

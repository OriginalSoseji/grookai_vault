import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SUMMARY_JSON = path.join(OUT_DIR, 'canon_image_unreferenced_storage_cleanup_plan_v1.json');
const MANIFEST_JSONL = path.join(OUT_DIR, 'canon_image_unreferenced_storage_cleanup_manifest_v1.jsonl');
const SUMMARY_MD = path.join(OUT_DIR, 'canon_image_unreferenced_storage_cleanup_plan_v1.md');
const PACKAGE_ID = 'CANON-IMAGE-UNREFERENCED-STORAGE-CLEANUP-PLAN-V1';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const MIN_DELETE_AGE_DAYS = Number.parseInt(process.env.CANON_IMAGE_CLEANUP_MIN_AGE_DAYS ?? '7', 10);
const CANON_IMAGE_PREFIXES = [
  'warehouse-derived/self-hosted-images-v1/',
  'warehouse-derived/image-truth-v1/',
];
const RETAIN_PROOF_PREFIXES = [
  'warehouse-derived/image-truth-v1/',
];
const SUSPICIOUS_PATTERNS = [
  /PitchBlack/i,
  /card-placeholder/i,
  /placeholder-small/i,
  /\/images\/card-placeholder/i,
];

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

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = clean(fn(row)) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function sumBy(rows, fn) {
  return rows.reduce((total, row) => total + Number(fn(row) ?? 0), 0);
}

function topEntries(counts, limit = 40) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(row[column] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function isCanonPath(value) {
  const name = clean(value);
  return Boolean(name && CANON_IMAGE_PREFIXES.some((prefix) => name.startsWith(prefix)));
}

function isRetainProofPath(value) {
  const name = clean(value);
  return Boolean(name && RETAIN_PROOF_PREFIXES.some((prefix) => name.startsWith(prefix)));
}

function isSuspicious(value) {
  const name = clean(value) ?? '';
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(name));
}

function ageDays(updatedAt) {
  const time = Date.parse(updatedAt);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, (Date.now() - time) / (24 * 60 * 60 * 1000));
}

function classifyObject(object) {
  const reasons = [];
  const age = ageDays(object.updated_at ?? object.created_at);
  const mimetype = clean(object.mimetype)?.toLowerCase() ?? '';
  const size = Number(object.size ?? 0);

  if (isSuspicious(object.name)) reasons.push('suspicious_pattern_review_first');
  if (isRetainProofPath(object.name)) reasons.push('retain_image_truth_proof_artifact');
  if (age === null || age < MIN_DELETE_AGE_DAYS) reasons.push('hold_recent_object');
  if (!mimetype.startsWith('image/')) reasons.push('hold_non_image_metadata');
  if (size <= 0) reasons.push('hold_zero_or_unknown_size');

  if (reasons.length > 0) {
    return { proposed_action: 'hold', hold_reasons: reasons, age_days: age };
  }
  return { proposed_action: 'delete_candidate', hold_reasons: [], age_days: age };
}

async function query(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function buildMarkdown(summary) {
  return `# Canon Image Unreferenced Storage Cleanup Plan V1

- Generated: ${summary.generated_at}
- Package: ${summary.package_id}
- Storage bucket: ${summary.storage_bucket}
- Minimum delete age: ${summary.minimum_delete_age_days} days
- Fingerprint: \`${summary.fingerprint}\`

## Summary

- Canon storage objects scanned: ${summary.metrics.canon_storage_objects_scanned}
- Referenced canon image paths: ${summary.metrics.referenced_canon_image_paths}
- Unreferenced canon storage objects: ${summary.metrics.unreferenced_canon_storage_objects}
- Delete candidates: ${summary.metrics.delete_candidates}
- Hold objects: ${summary.metrics.hold_objects}
- Estimated delete-candidate bytes: ${summary.metrics.delete_candidate_bytes}
- Estimated hold bytes: ${summary.metrics.hold_bytes}

## Proposed Action Counts

${markdownTable(topEntries(summary.counts.by_proposed_action), ['key', 'count'])}

## Hold Reasons

${markdownTable(topEntries(summary.counts.by_hold_reason), ['key', 'count'])}

## By Top Folder

${markdownTable(topEntries(summary.counts.by_top_folder), ['key', 'count'])}

## Delete Candidate Samples

${markdownTable(summary.samples.delete_candidates, ['name', 'size', 'mimetype', 'updated_at', 'age_days'])}

## Hold Samples

${markdownTable(summary.samples.holds, ['name', 'size', 'mimetype', 'updated_at', 'hold_reasons'])}

## Notes

This is a dry-run cleanup plan. It performs no storage deletes. Deletion should only be run from the generated manifest after reviewing the hold reasons and delete-candidate sample.
`;
}

async function main() {
  const url = dbUrl();
  if (!url) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let referencedRows;
  let storageObjects;
  try {
    referencedRows = await query(client, `
      select image_path from public.card_prints where nullif(trim(coalesce(image_path, '')), '') is not null
      union
      select image_path from public.card_printings where nullif(trim(coalesce(image_path, '')), '') is not null
    `);
    storageObjects = await query(client, `
      select
        name,
        updated_at,
        created_at,
        metadata->>'mimetype' as mimetype,
        nullif(metadata->>'size', '')::bigint as size
      from storage.objects
      where bucket_id = $1
        and (
          name like 'warehouse-derived/self-hosted-images-v1/%'
          or name like 'warehouse-derived/image-truth-v1/%'
        )
      order by name
    `, [STORAGE_BUCKET]);
  } finally {
    await client.end();
  }

  const referencedPaths = new Set(
    referencedRows
      .map((row) => clean(row.image_path))
      .filter((imagePath) => imagePath && isCanonPath(imagePath)),
  );
  const unreferenced = storageObjects
    .filter((object) => isCanonPath(object.name) && !referencedPaths.has(object.name))
    .map((object) => {
      const classification = classifyObject(object);
      return {
        bucket: STORAGE_BUCKET,
        name: object.name,
        size: Number(object.size ?? 0),
        mimetype: object.mimetype ?? null,
        created_at: object.created_at ?? null,
        updated_at: object.updated_at ?? null,
        age_days: classification.age_days === null ? null : Number(classification.age_days.toFixed(3)),
        proposed_action: classification.proposed_action,
        hold_reasons: classification.hold_reasons,
      };
    });

  const deleteCandidates = unreferenced.filter((row) => row.proposed_action === 'delete_candidate');
  const holds = unreferenced.filter((row) => row.proposed_action === 'hold');
  const holdReasonRows = holds.flatMap((row) => row.hold_reasons.map((reason) => ({ reason })));
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    storage_bucket: STORAGE_BUCKET,
    minimum_delete_age_days: MIN_DELETE_AGE_DAYS,
    metrics: {
      canon_storage_objects_scanned: storageObjects.length,
      referenced_canon_image_paths: referencedPaths.size,
      unreferenced_canon_storage_objects: unreferenced.length,
      delete_candidates: deleteCandidates.length,
      hold_objects: holds.length,
      delete_candidate_bytes: sumBy(deleteCandidates, (row) => row.size),
      hold_bytes: sumBy(holds, (row) => row.size),
    },
    counts: {
      by_proposed_action: countBy(unreferenced, (row) => row.proposed_action),
      by_hold_reason: countBy(holdReasonRows, (row) => row.reason),
      by_top_folder: countBy(unreferenced, (row) => row.name.split('/').slice(0, 3).join('/')),
      delete_candidates_by_top_folder: countBy(deleteCandidates, (row) => row.name.split('/').slice(0, 3).join('/')),
      holds_by_top_folder: countBy(holds, (row) => row.name.split('/').slice(0, 3).join('/')),
    },
    samples: {
      delete_candidates: deleteCandidates.slice(0, 100).map((row) => ({
        name: row.name,
        size: row.size,
        mimetype: row.mimetype,
        updated_at: row.updated_at,
        age_days: row.age_days,
      })),
      holds: holds.slice(0, 100).map((row) => ({
        name: row.name,
        size: row.size,
        mimetype: row.mimetype,
        updated_at: row.updated_at,
        hold_reasons: row.hold_reasons.join(','),
      })),
    },
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
  };
  summary.fingerprint = proofHash(summary);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(MANIFEST_JSONL, `${unreferenced.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, buildMarkdown(summary), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    fingerprint: summary.fingerprint,
    metrics: summary.metrics,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal`, error);
  process.exit(1);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const CACHE_DIR = path.join(ROOT, 'temp', 'image_truth_wh08a_mcdonalds');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh08a_mcdonalds_back_image_audit_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh08a_mcdonalds_back_image_audit_summary_v1.md');
const FINDINGS_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh08a_mcdonalds_back_image_audit_findings_v1.jsonl');
const PACKAGE_ID = 'IMG-HOST-WH-08A-MCDONALDS-BACK-IMAGE-AUDIT';
const STORAGE_BUCKET = 'user-card-images';
const MCD_SET_CODES = [
  '2021swsh',
  '2023sv',
  '2024sv',
  'mcd11',
  'mcd12',
  'mcd14',
  'mcd15',
  'mcd16',
  'mcd17',
  'mcd18',
  'mcd19',
  'mcd21',
  'mcd22',
];

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function requireSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE
    ?? process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or Supabase key.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeJson(value))).digest('hex');
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 50) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function cacheFileName(row) {
  const ext = path.extname(row.image_path).toLowerCase() || '.img';
  return `${row.set_code}__${row.gv_id.replace(/[^A-Za-z0-9_-]+/g, '_')}${ext}`;
}

async function fetchRows() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `select
         cp.id::text,
         cp.gv_id,
         cp.name,
         cp.set_code,
         s.name as set_name,
         cp.number,
         cp.image_source,
         cp.image_path,
         cp.image_status,
         cp.image_note
       from public.card_prints cp
       left join public.sets s on s.code = cp.set_code
       where cp.set_code = any($1::text[])
       order by cp.set_code, cp.number_plain nulls last, cp.number`,
      [MCD_SET_CODES],
    );
    return result.rows;
  } finally {
    await client.end();
  }
}

async function downloadImages(rows) {
  const supabase = requireSupabaseClient();
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const downloads = [];
  const failures = [];

  for (const row of rows) {
    const imagePath = clean(row.image_path);
    if (!imagePath) {
      failures.push({ gv_id: row.gv_id, reason: 'missing_image_path' });
      continue;
    }

    const targetPath = path.join(CACHE_DIR, cacheFileName(row));
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(imagePath);
      if (error || !data) {
        failures.push({ gv_id: row.gv_id, image_path: imagePath, reason: error?.message ?? 'download_failed' });
        continue;
      }
      const bytes = Buffer.from(await data.arrayBuffer());
      await fs.writeFile(targetPath, bytes);
      downloads.push({
        ...row,
        local_path: targetPath,
        file_sha256: sha256Hex(bytes),
        file_size_bytes: bytes.length,
      });
    } catch (error) {
      failures.push({
        gv_id: row.gv_id,
        image_path: imagePath,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { downloads, failures };
}

async function classifyImages(downloads) {
  const payload = downloads.map((row) => ({
    id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    image_path: row.image_path,
    image_status: row.image_status,
    local_path: row.local_path,
    file_sha256: row.file_sha256,
    file_size_bytes: row.file_size_bytes,
  }));

  const classifier = String.raw`
import colorsys, json, sys
from PIL import Image, ImageStat

rows = json.load(sys.stdin)
findings = []
for row in rows:
    finding = dict(row)
    try:
        image = Image.open(row["local_path"]).convert("RGB")
        width, height = image.size
        sample = image.resize((80, 112))
        pixels = list(sample.getdata())
        total = len(pixels)
        blue = 0
        yellow = 0
        red = 0
        white = 0
        dark = 0
        saturation_sum = 0.0
        value_sum = 0.0
        hue_blue_sum = 0.0
        center = sample.crop((24, 34, 56, 78))
        center_pixels = list(center.getdata())
        center_red = 0
        center_white = 0
        for r, g, b in pixels:
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            saturation_sum += s
            value_sum += v
            if 0.53 <= h <= 0.72 and s >= 0.28 and v >= 0.18:
                blue += 1
                hue_blue_sum += h
            if 0.10 <= h <= 0.19 and s >= 0.35 and v >= 0.45:
                yellow += 1
            if (h <= 0.04 or h >= 0.96) and s >= 0.35 and v >= 0.35:
                red += 1
            if s <= 0.16 and v >= 0.74:
                white += 1
            if v < 0.18:
                dark += 1
        for r, g, b in center_pixels:
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            if (h <= 0.04 or h >= 0.96) and s >= 0.35 and v >= 0.35:
                center_red += 1
            if s <= 0.16 and v >= 0.74:
                center_white += 1

        metrics = {
            "width": width,
            "height": height,
            "aspect_ratio": round(width / height, 4) if height else None,
            "blue_ratio": round(blue / total, 4),
            "yellow_ratio": round(yellow / total, 4),
            "red_ratio": round(red / total, 4),
            "white_ratio": round(white / total, 4),
            "dark_ratio": round(dark / total, 4),
            "avg_saturation": round(saturation_sum / total, 4),
            "avg_value": round(value_sum / total, 4),
            "center_red_ratio": round(center_red / len(center_pixels), 4),
            "center_white_ratio": round(center_white / len(center_pixels), 4),
        }
        score = 0
        if metrics["blue_ratio"] >= 0.36:
            score += 3
        elif metrics["blue_ratio"] >= 0.28:
            score += 2
        if metrics["yellow_ratio"] >= 0.08:
            score += 1
        if metrics["red_ratio"] >= 0.035:
            score += 1
        if metrics["white_ratio"] >= 0.045:
            score += 1
        if metrics["center_red_ratio"] >= 0.025 and metrics["center_white_ratio"] >= 0.025:
            score += 2
        if metrics["aspect_ratio"] is not None and 0.66 <= metrics["aspect_ratio"] <= 0.75:
            score += 1
        classification = "likely_back" if score >= 6 else "review" if score >= 4 else "likely_front"
        finding.update({"classification": classification, "back_score": score, "metrics": metrics, "error": None})
    except Exception as exc:
        finding.update({"classification": "error", "back_score": None, "metrics": {}, "error": str(exc)})
    findings.append(finding)

json.dump(findings, sys.stdout)
`;

  return new Promise((resolve, reject) => {
    const child = spawn('py', ['-c', classifier], {
      cwd: ROOT,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`classifier_failed:${code}:${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function renderMarkdown(summary, findings) {
  const likelyBackRows = findings
    .filter((row) => row.classification === 'likely_back')
    .slice(0, 50)
    .map((row) => `| ${row.gv_id} | ${row.set_code} | ${row.name} | ${row.number} | ${row.back_score} | ${row.metrics.blue_ratio} | ${row.metrics.center_red_ratio} | ${row.metrics.center_white_ratio} |`)
    .join('\n') || '| _None_ |  |  |  |  |  |  |  |';
  const reviewRows = findings
    .filter((row) => row.classification === 'review')
    .slice(0, 50)
    .map((row) => `| ${row.gv_id} | ${row.set_code} | ${row.name} | ${row.number} | ${row.back_score} | ${row.metrics.blue_ratio} | ${row.metrics.center_red_ratio} | ${row.metrics.center_white_ratio} |`)
    .join('\n') || '| _None_ |  |  |  |  |  |  |  |';

  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- McDonald's rows scanned: ${summary.rows_scanned}
- Images downloaded: ${summary.images_downloaded}
- Download failures: ${summary.download_failures}
- Likely back images: ${summary.likely_back_images}
- Review images: ${summary.review_images}
- Likely front images: ${summary.likely_front_images}
- Classifier errors: ${summary.classifier_errors}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## Classifications

${markdownTable(topEntries(summary.classifications))}

## Likely Back Candidates

| gv_id | set | name | number | score | blue | center red | center white |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
${likelyBackRows}

## Review Candidates

| gv_id | set | name | number | score | blue | center red | center white |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
${reviewRows}
`;
}

async function main() {
  const rows = await fetchRows();
  const { downloads, failures } = await downloadImages(rows);
  const findings = await classifyImages(downloads);
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_visual_heuristic_audit_no_write',
    rows_scanned: rows.length,
    images_downloaded: downloads.length,
    download_failures: failures.length,
    likely_back_images: findings.filter((row) => row.classification === 'likely_back').length,
    review_images: findings.filter((row) => row.classification === 'review').length,
    likely_front_images: findings.filter((row) => row.classification === 'likely_front').length,
    classifier_errors: findings.filter((row) => row.classification === 'error').length,
    classifications: countBy(findings, (row) => row.classification),
    sets: countBy(findings, (row) => row.set_code),
    download_failure_samples: failures.slice(0, 25),
    likely_back_samples: findings.filter((row) => row.classification === 'likely_back').slice(0, 50),
    review_samples: findings.filter((row) => row.classification === 'review').slice(0, 50),
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    rows_scanned: summary.rows_scanned,
    images_downloaded: summary.images_downloaded,
    download_failures: summary.download_failures,
    classifications: summary.classifications,
    likely_back: findings
      .filter((row) => row.classification === 'likely_back')
      .map((row) => ({ gv_id: row.gv_id, image_path: row.image_path, back_score: row.back_score })),
    review: findings
      .filter((row) => row.classification === 'review')
      .map((row) => ({ gv_id: row.gv_id, image_path: row.image_path, back_score: row.back_score })),
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(FINDINGS_JSONL, findings.map((row) => JSON.stringify(row)).join('\n') + (findings.length ? '\n' : ''), 'utf8');
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary, findings), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    findings_jsonl: path.relative(ROOT, FINDINGS_JSONL),
    fingerprint: summary.fingerprint,
    rows_scanned: summary.rows_scanned,
    images_downloaded: summary.images_downloaded,
    likely_back_images: summary.likely_back_images,
    review_images: summary.review_images,
    download_failures: summary.download_failures,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

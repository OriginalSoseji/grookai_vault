import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const RESOLVER_FILE = path.join(ROOT, 'apps', 'web', 'src', 'lib', 'canon', 'resolveCardImageFieldsV1.ts');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh05a_trainer_kit_runtime_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh05a_trainer_kit_runtime_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh05a_trainer_kit_runtime_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-05A-TRAINER-KIT-RUNTIME-REPLACEMENT-UPLOAD-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const USER_AGENT = 'Grookai Trainer Kit Self Hosted Image Audit/1.0';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function normalizePathSegment(value, fallback = 'unknown') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function numericCardNumber(row) {
  const number = clean(row.number);
  if (number && /^\d+$/.test(number)) return String(Number(number));
  const numberPlain = clean(row.number_plain);
  if (numberPlain && /^\d+$/.test(numberPlain)) return String(Number(numberPlain));
  return null;
}

function paddedCardNumber(row) {
  return numericCardNumber(row)?.padStart(3, '0') ?? null;
}

function slugForMalieTrainerKitImage(value) {
  const normalized = clean(value);
  if (!normalized) return null;
  const slug = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return slug || null;
}

function balancedObjectLiteral(source, constantName) {
  const marker = `const ${constantName}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing ${constantName} in resolver.`);
  const equalsIndex = source.indexOf('=', markerIndex);
  const firstBrace = source.indexOf('{', equalsIndex);
  if (equalsIndex < 0 || firstBrace < 0) throw new Error(`Could not parse ${constantName}.`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = firstBrace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(firstBrace, index + 1);
    }
  }
  throw new Error(`Unterminated ${constantName}.`);
}

function parseResolverObject(source, constantName) {
  const literal = balancedObjectLiteral(source, constantName);
  return Function(`"use strict"; return (${literal});`)();
}

async function readResolverSourceMaps() {
  const source = await fs.readFile(RESOLVER_FILE, 'utf8');
  return {
    pokemonTcgAliases: parseResolverObject(source, 'POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES'),
    maliePlans: parseResolverObject(source, 'MALIE_TRAINER_KIT_SET_IMAGE_PLANS'),
    tcgCollectorUrls: parseResolverObject(source, 'TCGCOLLECTOR_TRAINER_KIT_IMAGE_URLS'),
  };
}

function pokemonTcgExactUrl(row, maps) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const pokemonSetCode = setCode ? maps.pokemonTcgAliases[setCode] : null;
  const number = numericCardNumber(row);
  if (!pokemonSetCode || !number) return null;
  return `https://images.pokemontcg.io/${encodeURIComponent(pokemonSetCode)}/${encodeURIComponent(number)}_hires.png`;
}

function malieRepresentativeUrl(row, maps) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const plan = setCode ? maps.maliePlans[setCode] : null;
  const number = paddedCardNumber(row);
  const slug = slugForMalieTrainerKitImage(row.name);
  if (!plan || !number || !slug) return null;
  return `https://cdn.malie.io/file/malie-io/art/cards/jpg/en_US/${encodeURIComponent(plan.series)}/${encodeURIComponent(plan.code)}-${encodeURIComponent(plan.folder)}/en_US-${encodeURIComponent(plan.code)}-${encodeURIComponent(number)}-${encodeURIComponent(slug)}.jpg`;
}

function tcgCollectorRepresentativeUrl(row, maps) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const number = numericCardNumber(row);
  return setCode && number ? maps.tcgCollectorUrls[setCode]?.[number] ?? null : null;
}

function sourceBackedReplacement(row, maps) {
  const pokemonUrl = pokemonTcgExactUrl(row, maps);
  if (pokemonUrl) {
    return {
      source_url: pokemonUrl,
      source_lane: 'external_pokemontcg',
      proposed_image_status: 'exact',
      proposed_display_image_kind: 'exact',
      proposed_image_note:
        `Self-hosted exact Trainer Kit replacement planned by ${PACKAGE_ID}; source URL is PokemonTCG.`,
    };
  }

  const malieUrl = malieRepresentativeUrl(row, maps);
  if (malieUrl) {
    return {
      source_url: malieUrl,
      source_lane: 'external_malie',
      proposed_image_status: 'representative_shared',
      proposed_display_image_kind: 'representative',
      proposed_image_note:
        `Self-hosted representative Trainer Kit image planned by ${PACKAGE_ID}; source URL is Malie and exact image claim is not changed.`,
    };
  }

  const tcgCollectorUrl = tcgCollectorRepresentativeUrl(row, maps);
  if (tcgCollectorUrl) {
    return {
      source_url: tcgCollectorUrl,
      source_lane: 'external_tcgcollector',
      proposed_image_status: 'representative_shared',
      proposed_display_image_kind: 'representative',
      proposed_image_note:
        `Self-hosted representative Trainer Kit image planned by ${PACKAGE_ID}; source URL is TCG Collector and exact image claim is not changed.`,
    };
  }

  return null;
}

function extensionFor(contentType, url) {
  const type = String(contentType ?? '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  try {
    const ext = path.posix.extname(new URL(url).pathname).replace(/^\./, '').toLowerCase();
    if (/^(png|webp|gif|jpe?g)$/.test(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    // Fall through.
  }
  return 'bin';
}

function pngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof && offset + 8 < buffer.length) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: 'jpg',
      };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3), format: 'webp' };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, format: 'webp' };
  }
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: 'webp' };
  }
  return { width: null, height: null, format: 'webp' };
}

function imageDimensions(buffer) {
  return pngDimensions(buffer) ?? jpegDimensions(buffer) ?? webpDimensions(buffer) ?? null;
}

function looksLikeHtml(buffer) {
  const prefix = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trim().toLowerCase();
  return prefix.startsWith('<!doctype html') || prefix.startsWith('<html') || prefix.includes('<body');
}

async function queryTrainerKitRows() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      select
        cp.id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.image_source,
        cp.image_status,
        cp.image_url,
        cp.image_alt_url,
        cp.image_path,
        cp.representative_image_url,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      where cp.set_code like 'tk-%'
      order by cp.set_code,
        nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\\D', '', 'g'), '')::int nulls last,
        cp.number,
        cp.name
    `);
    return result.rows;
  } finally {
    await client.end();
  }
}

function fetchImageBuffer(url) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      agent,
      headers: { 'user-agent': USER_AGENT },
      timeout: 30000,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location) {
          const redirectedUrl = new URL(location, url).toString();
          fetchImageBuffer(redirectedUrl).then(resolve, reject);
          return;
        }
        resolve({
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          finalUrl: url,
          contentType: Array.isArray(response.headers['content-type'])
            ? response.headers['content-type'][0]
            : response.headers['content-type'] ?? null,
          contentLength: Array.isArray(response.headers['content-length'])
            ? response.headers['content-length'][0]
            : response.headers['content-length'] ?? null,
          buffer: Buffer.concat(chunks),
        });
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error('request_timeout'));
    });
    request.on('error', reject);
  });
}

async function fetchImage(candidate) {
  try {
    const response = await fetchImageBuffer(candidate.source_url);
    const contentType = response.contentType;
    const contentLength = response.contentLength;
    const buffer = response.buffer;
    const dimensions = imageDimensions(buffer);
    const warnings = [];
    if (!response.ok) warnings.push(`http_${response.status}`);
    if (looksLikeHtml(buffer)) warnings.push('html_response_body');
    if (!contentType?.toLowerCase().startsWith('image/')) warnings.push('non_image_content_type');
    if (!dimensions) warnings.push('dimensions_unreadable');
    if (buffer.length < 1024) warnings.push('very_small_image_payload');

    const sha = sha256Hex(buffer);
    const extension = extensionFor(contentType, response.finalUrl);
    const targetStoragePath = [
      'warehouse-derived',
      'self-hosted-images-v1',
      'card_prints',
      normalizePathSegment(candidate.set_code),
      normalizePathSegment(candidate.gv_id ?? candidate.id),
      `${sha.slice(0, 24)}.${extension}`,
    ].join('/');

    return {
      ...candidate,
      checked_at: new Date().toISOString(),
      fetch_ok: response.ok && warnings.length === 0,
      failure_reason: response.ok && warnings.length === 0 ? null : warnings.join(',') || `http_${response.status}`,
      http_status: response.status,
      source_final_url: response.finalUrl,
      source_content_type: contentType,
      source_content_length_header: contentLength,
      source_size_bytes: buffer.length,
      source_sha256: sha,
      source_dimensions: dimensions,
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: response.ok && warnings.length === 0 ? targetStoragePath : null,
      validation_warnings: warnings,
    };
  } catch (error) {
    return {
      ...candidate,
      checked_at: new Date().toISOString(),
      fetch_ok: false,
      failure_reason: error instanceof Error ? error.message : String(error),
      http_status: null,
      source_final_url: null,
      source_content_type: null,
      source_content_length_header: null,
      source_size_bytes: null,
      source_sha256: null,
      source_dimensions: null,
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: null,
      validation_warnings: ['fetch_failed'],
    };
  }
}

async function mapLimit(rows, limit, worker) {
  const output = new Array(rows.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next;
      next += 1;
      output[index] = await worker(rows[index], index);
    }
  });
  await Promise.all(workers);
  return output;
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function duplicateGroups(rows, keyFn) {
  const buckets = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const bucket = buckets.get(key) ?? [];
    bucket.push(row);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .filter(([, bucket]) => bucket.length > 1)
    .map(([key, bucket]) => ({ key, count: bucket.length }));
}

function proposedDbPlan(row) {
  return {
    target_table: 'card_prints',
    target_row_id: row.card_print_id,
    current_image_source: row.current_image_source,
    current_image_path: row.current_image_path,
    current_image_status: row.current_image_status,
    current_image_note: row.current_image_note,
    proposed_image_source: 'identity',
    proposed_image_path: row.target_storage_path,
    proposed_image_status: row.proposed_image_status,
    proposed_image_note: row.proposed_image_note,
    allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
    parent_overwrite_allowed: true,
    exact_image_claim_change: false,
  };
}

function manifestRow(row) {
  return {
    package_id: PACKAGE_ID,
    source_audit_package_ids: [
      'IMG-20A-TRAINER-KIT-MALIE-REPRESENTATIVE-FALLBACK-AUDIT',
      'IMG-20B-TRAINER-KIT-RESIDUAL-TCGCOLLECTOR-FALLBACK-AUDIT',
    ],
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    source_lane: row.source_lane,
    source_url: row.source_url,
    source_final_url: row.source_final_url,
    source_content_type: row.source_content_type,
    source_size_bytes: row.source_size_bytes,
    source_sha256: row.source_sha256,
    source_dimensions: row.source_dimensions,
    target_storage_bucket: row.target_storage_bucket,
    target_storage_path: row.target_storage_path,
    proposed_image_source: 'identity',
    proposed_image_status: row.proposed_image_status,
    proposed_display_image_kind: row.proposed_display_image_kind,
    proposed_image_note: row.proposed_image_note,
    storage_upload_performed: false,
    db_write_performed: false,
    exact_image_claim_change: false,
    proposed_db_plan: proposedDbPlan(row),
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function main() {
  const maps = await readResolverSourceMaps();
  const rows = await queryTrainerKitRows();
  const candidates = rows
    .filter((row) => !clean(row.image_path))
    .map((row) => {
      const replacement = sourceBackedReplacement(row, maps);
      if (!replacement) return null;
      return {
        card_print_id: row.id,
        gv_id: clean(row.gv_id),
        name: clean(row.name),
        set_code: clean(row.set_code),
        set_name: clean(row.set_name),
        number: clean(row.number),
        number_plain: clean(row.number_plain),
        current_image_source: clean(row.image_source),
        current_image_path: clean(row.image_path),
        current_image_status: clean(row.image_status),
        current_image_note: clean(row.image_note),
        ...replacement,
      };
    })
    .filter(Boolean);

  const checkedRows = await mapLimit(candidates, 8, fetchImage);
  const readyRows = checkedRows.filter((row) => row.fetch_ok && row.target_storage_path);
  const manifestRows = readyRows.map(manifestRow);
  const duplicateTargetPaths = duplicateGroups(manifestRows, (row) => row.target_storage_path);
  const conflictingTargetPaths = duplicateTargetPaths.filter((group) => {
    const hashes = new Set(manifestRows
      .filter((row) => row.target_storage_path === group.key)
      .map((row) => row.source_sha256));
    return hashes.size > 1;
  });
  const duplicateTargetRows = duplicateGroups(manifestRows, (row) => row.card_print_id);
  const stopFindings = [];
  if (checkedRows.some((row) => !row.fetch_ok)) stopFindings.push('source_fetch_failures');
  if (conflictingTargetPaths.length > 0) stopFindings.push('conflicting_duplicate_target_storage_paths');
  if (duplicateTargetRows.length > 0) stopFindings.push('duplicate_card_print_targets');

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_JSONL, manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : ''), 'utf8');

  const summaryBase = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_upload_manifest_dry_run',
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    source_resolver_file: path.relative(ROOT, RESOLVER_FILE),
    target_storage_bucket: STORAGE_BUCKET,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    trainer_kit_rows_total: rows.length,
    trainer_kit_rows_missing_image_path: rows.filter((row) => !clean(row.image_path)).length,
    source_backed_candidate_rows: candidates.length,
    fetch_checked_rows: checkedRows.length,
    fetch_ready_rows: readyRows.length,
    upload_manifest_rows: manifestRows.length,
    failed_fetch_rows: checkedRows.length - readyRows.length,
    duplicate_target_path_groups: duplicateTargetPaths.length,
    conflicting_target_path_groups: conflictingTargetPaths.length,
    duplicate_card_print_target_groups: duplicateTargetRows.length,
    stop_findings: stopFindings,
    ready_for_storage_upload_apply: stopFindings.length === 0,
    by_source_lane: countBy(manifestRows, (row) => row.source_lane),
    by_set_code: countBy(manifestRows, (row) => row.set_code),
    by_display_image_kind: countBy(manifestRows, (row) => row.proposed_display_image_kind),
    by_image_status: countBy(manifestRows, (row) => row.proposed_image_status),
    failures: checkedRows
      .filter((row) => !row.fetch_ok)
      .slice(0, 40)
      .map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        source_lane: row.source_lane,
        failure_reason: row.failure_reason,
        source_url: row.source_url,
      })),
    sample_manifest_rows: manifestRows.slice(0, 20),
  };
  const summary = {
    ...summaryBase,
    proof_hash: proofHash(summaryBase),
  };

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, [
    `# ${PACKAGE_ID}`,
    '',
    `- Generated: ${summary.generated_at}`,
    `- Mode: ${summary.mode}`,
    `- Proof hash: \`${summary.proof_hash}\``,
    `- Manifest: \`${summary.manifest_jsonl}\``,
    `- Trainer Kit rows: ${summary.trainer_kit_rows_total}`,
    `- Missing image_path rows: ${summary.trainer_kit_rows_missing_image_path}`,
    `- Source-backed candidate rows: ${summary.source_backed_candidate_rows}`,
    `- Upload manifest rows: ${summary.upload_manifest_rows}`,
    `- Failed fetch rows: ${summary.failed_fetch_rows}`,
    `- Ready for storage upload apply: ${summary.ready_for_storage_upload_apply}`,
    '',
    '## By Source Lane',
    '',
    markdownTable(Object.entries(summary.by_source_lane).map(([key, count]) => ({ key, count })), [
      { label: 'Source lane', value: (row) => row.key },
      { label: 'Rows', value: (row) => row.count },
    ]),
    '',
    '## By Set',
    '',
    markdownTable(Object.entries(summary.by_set_code).map(([key, count]) => ({ key, count })), [
      { label: 'Set', value: (row) => row.key },
      { label: 'Rows', value: (row) => row.count },
    ]),
    '',
    '## Policy',
    '',
    '- Write scope: none.',
    '- Storage scope: none.',
    '- DB scope: none.',
    '- Exact image claims: no exact-image claim changes; representative rows remain representative_shared.',
    '- Future apply scope should upload manifest objects, then update card_prints image_source/image_path/image_status/image_note only.',
    '',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    proof_hash: summary.proof_hash,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    upload_manifest_rows: summary.upload_manifest_rows,
    failed_fetch_rows: summary.failed_fetch_rows,
    ready_for_storage_upload_apply: summary.ready_for_storage_upload_apply,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] failed`, error);
  process.exitCode = 1;
});

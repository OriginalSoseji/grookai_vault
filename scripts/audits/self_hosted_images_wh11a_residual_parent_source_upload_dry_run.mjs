import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh11a_residual_parent_source_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh11a_residual_parent_source_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh11a_residual_parent_source_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-11A-RESIDUAL-PARENT-SOURCE-UPLOAD-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const USER_AGENT = 'Grookai WH11A Residual Parent Image Audit/1.0';
const FETCH_TIMEOUT_MS = Number.parseInt(process.env.IMG_HOST_WH11A_FETCH_TIMEOUT_MS ?? '30000', 10);
const FETCH_CONCURRENCY = Math.max(1, Math.min(Number.parseInt(process.env.IMG_HOST_WH11A_FETCH_CONCURRENCY ?? '4', 10), 8));

const POKEMONTCG_SET_ALIASES = {
  bwp: ['bwp'],
  ecard2: ['ecard2'],
  ecard3: ['ecard3'],
  pl2: ['pl2'],
  sm115: ['sma'],
  svp: ['svp'],
  swshp: ['swshp'],
  xyp: ['xyp'],
};

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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 30) {
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

function normalizePathSegment(value, fallback = 'unknown') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function normalizeComparable(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toUpperCase().replace(/^0+(\d)/, '$1');
}

function pokemonTcgNumberCandidates(row) {
  const raw = clean(row.number) ?? clean(row.number_plain);
  if (!raw) return [];
  const candidates = new Set([raw.toUpperCase(), normalizeNumber(raw)]);
  const hMatch = raw.match(/^H0*(\d+)$/i);
  if (hMatch) candidates.add(`H${Number(hMatch[1])}`);
  const promoMatch = raw.match(/^([A-Z]+)0+(\d+)$/i);
  if (promoMatch) candidates.add(`${promoMatch[1].toUpperCase()}${Number(promoMatch[2])}`);
  return [...candidates].filter(Boolean);
}

function apiUrlFor(setId, number) {
  const query = `set.id:${setId} number:${number}`;
  return `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=25`;
}

function officialMepAssetUrl(row) {
  const normalized = normalizeNumber(row.number);
  if (!/^\d+$/.test(normalized)) return null;
  return `https://assets.pokemon.com/static-assets/content-assets/cms2/img/cards/web/MEP/MEP_EN_${Number(normalized)}.png`;
}

function imageExtensionFor(contentType, finalUrl) {
  const type = clean(contentType)?.split(';')[0].trim().toLowerCase();
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  try {
    const ext = path.extname(new URL(finalUrl).pathname).replace(/^\./, '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    // Ignore URL parsing fallback failures.
  }
  return 'img';
}

function isImageContentType(value) {
  return clean(value)?.toLowerCase().startsWith('image/') ?? false;
}

async function fetchBuffer(url, redirectCount = 0) {
  if (redirectCount > 5) throw new Error(`too_many_redirects:${url}`);
  const parsed = new URL(url);
  const client = parsed.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const request = client.get(parsed, {
      headers: { 'user-agent': USER_AGENT },
      timeout: FETCH_TIMEOUT_MS,
      rejectUnauthorized: false,
    }, (response) => {
      const statusCode = response.statusCode ?? 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
        response.resume();
        fetchBuffer(new URL(location, parsed).toString(), redirectCount + 1).then(resolve, reject);
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          final_url: url,
          content_type: response.headers['content-type'] ?? null,
          size_bytes: buffer.length,
          sha256: sha256Hex(buffer),
          text: buffer.toString('utf8'),
          transport_note: 'tls_verification_disabled_for_source_validation',
        });
      });
    });
    request.on('timeout', () => request.destroy(new Error(`timeout:${url}`)));
    request.on('error', reject);
  });
}

async function fetchJson(url) {
  const result = await fetchBuffer(url);
  if (!result.ok) throw new Error(`api_status_${result.status}:${url}`);
  return JSON.parse(result.text);
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

async function fetchRows(client) {
  const result = await client.query(`
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.rarity,
      cp.variant_key,
      cp.image_source,
      cp.image_status,
      cp.image_note,
      cp.image_path,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url
    from public.card_prints cp
    where cp.image_path is null
      and (
        cp.set_code = 'mep'
        or cp.set_code = any($1::text[])
      )
    order by cp.set_code, cp.number_plain nulls last, cp.number, cp.name, cp.gv_id
  `, [Object.keys(POKEMONTCG_SET_ALIASES)]);
  return result.rows;
}

function selectPokemonTcgMatch(row, cards, setId) {
  const expectedName = normalizeComparable(row.name);
  const expectedNumbers = new Set(pokemonTcgNumberCandidates(row).map(normalizeNumber));
  const matches = cards.filter((card) => (
    card?.set?.id === setId
    && normalizeComparable(card.name) === expectedName
    && expectedNumbers.has(normalizeNumber(card.number))
    && clean(card.images?.large)
  ));
  if (matches.length !== 1) return { card: null, matches };
  return { card: matches[0], matches };
}

async function acquirePokemonTcg(row) {
  const setAliases = POKEMONTCG_SET_ALIASES[row.set_code] ?? [];
  const attempts = [];
  for (const setId of setAliases) {
    for (const number of pokemonTcgNumberCandidates(row)) {
      const apiUrl = apiUrlFor(setId, number);
      try {
        const payload = await fetchJson(apiUrl);
        const { card, matches } = selectPokemonTcgMatch(row, payload.data ?? [], setId);
        attempts.push({ route: 'pokemontcg', set_id: setId, number, api_url: apiUrl, api_count: payload.count ?? null, exact_match_count: matches.length, selected_card_id: card?.id ?? null });
        if (!card) continue;
        const image = await fetchBuffer(card.images.large);
        if (!isImageContentType(image.content_type) || image.size_bytes <= 1024) {
          attempts[attempts.length - 1].image_fetch_status = image.status;
          attempts[attempts.length - 1].image_fetch_content_type = image.content_type;
          continue;
        }
        return { row, route: 'pokemontcg', upstream_id: card.id, upstream_set_id: setId, source_url: card.images.large, source_api_url: apiUrl, image, attempts };
      } catch (error) {
        attempts.push({ route: 'pokemontcg', set_id: setId, number, api_url: apiUrl, error: String(error?.message ?? error) });
      }
    }
  }
  return { row, route: null, image: null, attempts };
}

async function acquireOfficialMep(row) {
  const sourceUrl = officialMepAssetUrl(row);
  const attempts = [];
  if (!sourceUrl) return { row, route: null, image: null, attempts: [{ route: 'mep_official_asset', error: 'non_numeric_mep_number' }] };
  try {
    const image = await fetchBuffer(sourceUrl);
    const valid = image.ok && isImageContentType(image.content_type) && image.size_bytes > 1024;
    attempts.push({ route: 'mep_official_asset', source_url: sourceUrl, status: image.status, content_type: image.content_type, size_bytes: image.size_bytes });
    if (!valid) return { row, route: null, image: null, attempts };
    return {
      row,
      route: 'mep_official_asset',
      upstream_id: `pokemon-assets:mep:${normalizeNumber(row.number)}`,
      upstream_set_id: 'mep',
      source_url: sourceUrl,
      source_api_url: null,
      image,
      attempts,
    };
  } catch (error) {
    attempts.push({ route: 'mep_official_asset', source_url: sourceUrl, error: String(error?.message ?? error) });
    return { row, route: null, image: null, attempts };
  }
}

async function acquireForRow(row) {
  if (row.set_code === 'mep') return acquireOfficialMep(row);
  return acquirePokemonTcg(row);
}

function proposedStatus(row, route) {
  const current = clean(row.image_status);
  if (current) return current;
  return route === 'mep_official_asset' && String(row.variant_key ?? '').trim()
    ? 'representative_shared_stamp'
    : current;
}

function proposedNote(row, route) {
  return clean(row.image_note);
}

function toManifestRow(acquired) {
  const row = acquired.row;
  const image = acquired.image;
  const ext = imageExtensionFor(image.content_type, image.final_url);
  const targetStoragePath = [
    'warehouse-derived',
    'self-hosted-images-v1',
    'card_prints',
    normalizePathSegment(row.set_code),
    normalizePathSegment(row.gv_id),
    `${image.sha256.slice(0, 24)}.${ext}`,
  ].join('/');

  return {
    package_id: PACKAGE_ID,
    audit_key: `card_prints:${row.id}:${acquired.route}:${acquired.upstream_id}`,
    source_table: 'card_prints',
    source_row_id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    rarity: row.rarity,
    variant_key: row.variant_key,
    source_route: acquired.route,
    upstream_source: acquired.route === 'pokemontcg' ? 'pokemontcg' : 'pokemon_official_assets',
    upstream_card_id: acquired.upstream_id,
    upstream_set_id: acquired.upstream_set_id,
    source_api_url: acquired.source_api_url,
    source_image_value: acquired.source_url,
    source_final_url: image.final_url,
    source_http_status: image.status,
    source_content_type: image.content_type,
    source_size_bytes: image.size_bytes,
    source_sha256: image.sha256,
    transport_note: image.transport_note,
    target_storage_bucket: STORAGE_BUCKET,
    target_storage_path: targetStoragePath,
    upload_performed: false,
    db_write_performed: false,
    exact_image_claim_change: false,
    proposed_db_plan: {
      target_table: 'card_prints',
      target_row_id: row.id,
      proposed_image_source: 'identity',
      proposed_image_path: targetStoragePath,
      proposed_image_status: proposedStatus(row, acquired.route),
      proposed_image_note: proposedNote(row, acquired.route),
      allowed_future_columns: ['image_source', 'image_path'],
      preserved_columns: ['image_status', 'image_note'],
      blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
      parent_overwrite_allowed: true,
    },
  };
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let rows;
  try {
    rows = await fetchRows(client);
  } finally {
    await client.end();
  }

  const acquired = await mapLimit(rows, FETCH_CONCURRENCY, acquireForRow);
  const matched = acquired.filter((entry) => entry.route && entry.image);
  const unmatched = acquired.filter((entry) => !entry.route || !entry.image);
  const manifestRows = matched.map(toManifestRow);
  const targetPathCounts = countBy(manifestRows, (row) => row.target_storage_path);
  const duplicateTargetPaths = Object.entries(targetPathCounts).filter(([, count]) => count > 1);
  const stopFindings = [
    ...(duplicateTargetPaths.length ? ['duplicate_target_storage_paths'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_JSONL, `${manifestRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    candidate_parent_rows: rows.length,
    matched_manifest_rows: manifestRows.length,
    unmatched_parent_rows: unmatched.length,
    unique_upload_objects: new Set(manifestRows.map((row) => row.target_storage_path)).size,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    target_storage_bucket: STORAGE_BUCKET,
    planned_db_columns_after_upload: ['card_prints.image_source', 'card_prints.image_path'],
    preserved_db_columns_after_upload: ['card_prints.image_status', 'card_prints.image_note'],
    by_set_code: countBy(manifestRows, (row) => row.set_code),
    by_source_route: countBy(manifestRows, (row) => row.source_route),
    by_current_image_status: countBy(manifestRows, (row) => row.proposed_db_plan.proposed_image_status ?? 'null'),
    unmatched_by_set_code: countBy(unmatched, (entry) => entry.row.set_code),
    stop_findings: stopFindings,
    ready_for_storage_apply_package: stopFindings.length === 0 && manifestRows.length > 0,
    samples: {
      manifest_rows: manifestRows.slice(0, 10),
      unmatched_rows: unmatched.slice(0, 40).map((entry) => ({
        gv_id: entry.row.gv_id,
        name: entry.row.name,
        set_code: entry.row.set_code,
        number: entry.row.number,
        image_status: entry.row.image_status,
        attempts: entry.attempts,
      })),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    matched_manifest_rows: summary.matched_manifest_rows,
    unique_upload_objects: summary.unique_upload_objects,
    target_storage_bucket: summary.target_storage_bucket,
    planned_db_columns_after_upload: summary.planned_db_columns_after_upload,
    preserved_db_columns_after_upload: summary.preserved_db_columns_after_upload,
    manifest_rows: manifestRows.map((row) => ({
      source_row_id: row.source_row_id,
      gv_id: row.gv_id,
      source_route: row.source_route,
      upstream_card_id: row.upstream_card_id,
      source_image_value: row.source_image_value,
      source_sha256: row.source_sha256,
      source_size_bytes: row.source_size_bytes,
      target_storage_path: row.target_storage_path,
      proposed_db_plan: row.proposed_db_plan,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Candidate parent rows: ${summary.candidate_parent_rows}
- Matched manifest rows: ${summary.matched_manifest_rows}
- Unmatched parent rows: ${summary.unmatched_parent_rows}
- Unique upload objects: ${summary.unique_upload_objects}
- Target storage bucket: ${summary.target_storage_bucket}
- Planned DB columns after upload: ${summary.planned_db_columns_after_upload.join(', ')}
- Preserved DB columns after upload: ${summary.preserved_db_columns_after_upload.join(', ')}
- Ready for storage apply package: ${summary.ready_for_storage_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## By Set

${markdownTable(topEntries(summary.by_set_code))}

## By Source Route

${markdownTable(topEntries(summary.by_source_route))}

## Current Image Status

${markdownTable(topEntries(summary.by_current_image_status))}

## Unmatched By Set

${markdownTable(topEntries(summary.unmatched_by_set_code))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_storage_apply_package: summary.ready_for_storage_apply_package,
    matched_manifest_rows: summary.matched_manifest_rows,
    unmatched_parent_rows: summary.unmatched_parent_rows,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

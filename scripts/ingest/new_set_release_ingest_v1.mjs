import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

import dotenv from 'dotenv';
import pg from 'pg';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const DEFAULT_MANIFEST = path.join('data', 'set_ingest', '20260714_abyss_eye_pitch_black_new_sets_v1.json');
const ENGLISH_MASTER_INDEX = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'english_master_index_sets_v1.json',
);
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
const STORAGE_PREFIX = 'warehouse-derived/self-hosted-images-v1';
const PACKAGE_ID = 'NEW-POKEMON-SET-RELEASE-INGESTION-V1';
const USER_AGENT = 'Grookai New Set Release Ingestion/1.0';

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST,
    dryRun: false,
    apply: false,
    selfHostImages: false,
    updateMasterIndexes: false,
    readbacks: false,
    skipTests: false,
    setKeys: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--apply') args.apply = true;
    else if (arg === '--self-host-images') args.selfHostImages = true;
    else if (arg === '--update-master-indexes') args.updateMasterIndexes = true;
    else if (arg === '--readbacks') args.readbacks = true;
    else if (arg === '--skip-tests') args.skipTests = true;
    else if (arg === '--set') args.setKeys.push(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.apply === args.dryRun) {
    throw new Error('Pass exactly one of --dry-run or --apply.');
  }
  return args;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(text).digest('hex');
}

function deterministicUuid(seed) {
  const bytes = crypto.createHash('sha256').update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function htmlDecode(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value) {
  return htmlDecode(String(value ?? '').replace(/<[^>]+>/g, ' '));
}

function patternMatches(value, pattern) {
  const text = clean(value);
  if (!text) return false;
  return new RegExp(pattern, 'i').test(text);
}

function imageIdentityFindingsForRow(set, row) {
  const guard = set.image_identity_guard ?? {};
  const findings = [];
  for (const pattern of guard.reject_url_patterns ?? []) {
    if (patternMatches(row.image_url, pattern)) findings.push(`image_url_rejected_pattern:${pattern}`);
    if (patternMatches(row.preview_image_url, pattern)) findings.push(`preview_image_url_rejected_pattern:${pattern}`);
  }
  for (const pattern of guard.reject_source_title_patterns ?? []) {
    if (patternMatches(row.source_title, pattern)) findings.push(`source_title_rejected_pattern:${pattern}`);
  }
  return findings;
}

function imageIdentityFindingsForRows(set, rows) {
  return rows.flatMap((row) => {
    const rowFindings = imageIdentityFindingsForRow(set, row);
    return rowFindings.map((finding) => `image_identity_mismatch:${String(row.number ?? 'unknown').padStart(3, '0')}:${finding}`);
  });
}

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function outputDir(releaseSlug) {
  return path.join(ROOT, 'docs', 'audits', 'new_set_release_ingestion_v1', releaseSlug);
}

function checkpointPath(releaseSlug) {
  return path.join(ROOT, 'docs', 'checkpoints', `${releaseSlug}_new_set_ingestion_completion_v1.md`);
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value, 'utf8');
}

async function fetchText(url) {
  const parsed = new URL(url);
  const client = parsed.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.get(parsed, {
      headers: {
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'user-agent': USER_AGENT,
      },
      timeout: 45000,
      rejectUnauthorized: false,
    }, (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        fetchText(new URL(response.headers.location, parsed).toString()).then(resolve, reject);
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: status >= 200 && status < 300,
          status,
          url,
          contentType: response.headers['content-type'] ?? null,
          text,
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout:${url}`)));
    req.on('error', reject);
  });
}

async function fetchBuffer(url, redirectCount = 0) {
  if (redirectCount > 5) throw new Error(`too_many_redirects:${url}`);
  const parsed = new URL(url);
  const client = parsed.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.get(parsed, {
      headers: { 'user-agent': USER_AGENT },
      timeout: 45000,
      rejectUnauthorized: false,
    }, (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume();
        fetchBuffer(new URL(response.headers.location, parsed).toString(), redirectCount + 1).then(resolve, reject);
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          ok: status >= 200 && status < 300,
          status,
          contentType: response.headers['content-type'] ?? null,
          buffer,
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout:${url}`)));
    req.on('error', reject);
  });
}

function validateManifest(manifest) {
  const findings = [];
  if (!clean(manifest.release_slug)) findings.push('missing_release_slug');
  if (!Array.isArray(manifest.sets) || manifest.sets.length === 0) findings.push('missing_sets');
  for (const set of manifest.sets ?? []) {
    for (const key of ['target_key', 'name', 'language', 'region', 'release_date', 'canonical_set_code', 'source_route']) {
      if (!clean(set[key])) findings.push(`${set.target_key ?? 'unknown'}:missing_${key}`);
    }
    if (!set.source_ids || typeof set.source_ids !== 'object') findings.push(`${set.target_key}:missing_source_ids`);
    if (!Array.isArray(set.source_urls) || set.source_urls.length === 0) findings.push(`${set.target_key}:missing_source_urls`);
    if (!set.expected_counts || typeof set.expected_counts !== 'object') findings.push(`${set.target_key}:missing_expected_counts`);
    if (set.target_key === 'pitch_black_en') {
      const serialized = JSON.stringify(set).toLowerCase();
      if (serialized.includes('black bolt') && !(set.reject_source_ids?.names ?? []).includes('Black Bolt')) {
        findings.push('pitch_black_black_bolt_guard_missing');
      }
    }
  }
  return findings;
}

async function discoverTcgdex(set) {
  const base = clean(process.env.TCGDEX_BASE_URL) ?? 'https://api.tcgdex.net/v2';
  const lang = set.language === 'ja' ? 'ja' : 'en';
  const configured = clean(set.source_ids?.tcgdex);
  const result = {
    set_key: set.target_key,
    lang,
    configured_id: configured,
    available: false,
    matched_id: null,
    matched_name: null,
    count: null,
    findings: [],
  };

  if (configured) {
    const url = `${base.replace(/\/$/, '')}/${lang}/sets/${encodeURIComponent(configured)}`;
    const res = await fetchText(url);
    result.probe_url = url;
    result.status = res.status;
    if (res.ok) {
      const body = JSON.parse(res.text);
      result.available = true;
      result.matched_id = body.id ?? configured;
      result.matched_name = body.name ?? null;
      result.count = body.cardCount ?? null;
    } else {
      result.findings.push(`configured_tcgdex_id_unavailable:${configured}:${res.status}`);
    }
    return result;
  }

  const listUrl = `${base.replace(/\/$/, '')}/${lang}/sets`;
  try {
    const res = await fetchText(listUrl);
    result.probe_url = listUrl;
    result.status = res.status;
    if (!res.ok) {
      result.findings.push(`tcgdex_sets_unavailable:${res.status}`);
      return result;
    }
    const sets = JSON.parse(res.text);
    const targetName = set.name.toLowerCase();
    const rejectNames = new Set((set.reject_source_ids?.names ?? []).map((name) => name.toLowerCase()));
    const candidates = Array.isArray(sets)
      ? sets.filter((row) => String(row?.name ?? '').toLowerCase() === targetName)
      : [];
    const rejected = Array.isArray(sets)
      ? sets.filter((row) => rejectNames.has(String(row?.name ?? '').toLowerCase()))
      : [];
    if (rejected.length > 0) {
      result.rejected_candidates = rejected.map((row) => ({ id: row.id, name: row.name }));
    }
    if (candidates.length === 1) {
      result.available = true;
      result.matched_id = candidates[0].id ?? null;
      result.matched_name = candidates[0].name ?? null;
      result.count = candidates[0].cardCount ?? null;
    } else {
      result.findings.push(`tcgdex_exact_name_match_count:${candidates.length}`);
    }
  } catch (error) {
    result.findings.push(`tcgdex_probe_error:${error?.message ?? error}`);
  }
  return result;
}

function parseLimitlessSetMeta(html) {
  const heading = html.match(/<div class="infobox-heading sm">[\s\S]*?<\/div>/)?.[0] ?? '';
  const line = stripTags(html.match(/<div class="infobox-line">([\s\S]*?)<\/div>/)?.[1] ?? '');
  const title = stripTags(heading);
  const image = heading.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;
  const countMatch = line.match(/([0-9]+)\s+Cards/i);
  return {
    title,
    line,
    logo_url: image,
    card_count: countMatch ? Number(countMatch[1]) : null,
  };
}

function parseLimitlessCardLinks(html, sourceUrl) {
  const rows = [];
  const pattern = /<a href="(\/cards\/jp\/M5\/([0-9]+))">\s*<img[^>]+src="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    rows.push({
      source_url: new URL(match[1], sourceUrl).toString(),
      source_card_id: `limitless:jp/M5/${match[2]}`,
      number: match[2],
      image_url: htmlDecode(match[3]),
    });
  }
  return rows;
}

function parseLimitlessCardDetail(html, fallback) {
  const title = htmlDecode(html.match(/<title>(.*?)<\/title>/)?.[1] ?? '');
  const titleMatch = title.match(/^(.*?)\s+-\s+Abyss Eye \(M5\) #([0-9]+)/);
  const name = stripTags(html.match(/<span class="card-text-name">([\s\S]*?)<\/span>/)?.[1] ?? titleMatch?.[1] ?? '');
  const imageUrl = html.match(/<img class="card shadow resp-w" src="([^"]+)"/)?.[1] ?? fallback.image_url;
  const fullImageUrl = html.match(/data-src="([^"]+)"/)?.[1] ?? imageUrl;
  const rarity = stripTags(html.match(/#\s*[0-9]+\s+·\s*([^<]+)<\/span>/)?.[1] ?? '');
  const artist = stripTags(html.match(/Illustrated by\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '');
  const regulationMark = stripTags(html.match(/<div class="regulation-mark">\s*([^•<]+)\s*Regulation Mark/i)?.[1] ?? '');
  const typeLine = stripTags(html.match(/<p class="card-text-title">([\s\S]*?)<\/p>/)?.[1] ?? '');
  const category = stripTags(html.match(/<p class="card-text-type">([\s\S]*?)<\/p>/)?.[1] ?? '');
  return {
    ...fallback,
    name,
    number: titleMatch?.[2] ?? fallback.number,
    rarity: clean(rarity),
    artist: clean(artist),
    regulation_mark: clean(regulationMark),
    image_url: clean(fullImageUrl),
    preview_image_url: clean(imageUrl),
    source_title: title,
    type_line: clean(typeLine),
    category: clean(category),
  };
}

function parsePokellectorCardLinks(html, sourceUrl) {
  const rows = [];
  const pattern = /<a href="([^"]*Card-([0-9]+))"[^>]*name="card([0-9]+)"[^>]*title="([^"]+)"[\s\S]*?<img class="card lazyload" data-src="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    rows.push({
      source_url: new URL(match[1], sourceUrl).toString(),
      source_card_id: `pokellector:M5:${match[2]}`,
      number: match[2],
      pokellector_card_id: match[3],
      source_title: htmlDecode(match[4]),
      preview_image_url: htmlDecode(match[5]),
    });
  }
  return rows;
}

function parsePokellectorCardDetail(html, fallback) {
  const title = htmlDecode(html.match(/<title>(.*?)<\/title>/)?.[1] ?? fallback.source_title ?? '');
  const ogImage = html.match(/<meta property="og:image"\s+content="([^"]+)"/)?.[1] ?? null;
  const itemImage = html.match(/<meta itemprop="image" content="([^"]+)"/)?.[1] ?? null;
  const cardImage = html.match(/<div class="content cardinfo"[\s\S]*?<img src="([^"]+)"/)?.[1] ?? null;
  return {
    ...fallback,
    image_url: clean(ogImage) ?? clean(itemImage) ?? clean(cardImage) ?? clean(fallback.preview_image_url),
    preview_image_url: clean(cardImage) ?? clean(itemImage) ?? clean(ogImage) ?? clean(fallback.preview_image_url),
    source_title: clean(title),
    source: 'pokellector',
    external_id: fallback.source_card_id,
  };
}

async function acquirePokellectorAbyssEyeImages(set, outDir) {
  const sourceUrl = 'https://jp.pokellector.com/Abyss-Eye-Expansion/';
  const res = await fetchText(sourceUrl);
  const evidenceDir = path.join(outDir, 'raw_sources', set.target_key);
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, 'pokellector_abyss_eye.html'), res.text, 'utf8');
  if (!res.ok) {
    return { source: 'pokellector', available: false, rows: [], findings: [`pokellector_index_unavailable:${res.status}`] };
  }

  const links = parsePokellectorCardLinks(res.text, sourceUrl);
  const rows = [];
  for (const link of links.filter((row) => Number(row.number) > 81)) {
    const number = String(link.number).padStart(3, '0');
    const detail = await fetchText(link.source_url);
    await fs.writeFile(path.join(evidenceDir, `pokellector_${number}.html`), detail.text, 'utf8');
    if (!detail.ok) {
      rows.push({ ...link, number, detail_status: detail.status, detail_error: true });
      continue;
    }
    rows.push(parsePokellectorCardDetail(detail.text, { ...link, number }));
  }

  const result = {
    source: 'pokellector',
    available: true,
    index_url: sourceUrl,
    row_count: rows.length,
    rows,
    findings: imageIdentityFindingsForRows(set, rows),
  };
  await writeJson(path.join(evidenceDir, 'pokellector_abyss_eye_secret_images_v1.json'), result);
  return result;
}

function applyReviewedImageOverrides(set, rows) {
  const overrides = new Map((set.image_overrides ?? []).map((override) => [String(override.number).padStart(3, '0'), override]));
  return rows.map((row) => {
    const number = String(row.number).padStart(3, '0');
    const override = overrides.get(number);
    if (!override) return row;
    return {
      ...row,
      image_url: override.image_url,
      preview_image_url: override.preview_image_url ?? override.image_url,
      source_url: override.source_url ?? row.source_url,
      source: override.source ?? row.source,
      external_id: `${override.source ?? 'image_override'}:${number}`,
      source_title: `${set.name} ${number}/081 reviewed image override`,
      image_override_note: override.note ?? null,
    };
  });
}

function applyFallbackImages(set, rows, fallbackRows) {
  const fallbackByNumber = new Map(
    fallbackRows
      .filter((row) => imageIdentityFindingsForRow(set, row).length === 0 && clean(row.image_url))
      .map((row) => [String(row.number).padStart(3, '0'), row]),
  );

  return rows.map((row) => {
    const number = String(row.number).padStart(3, '0');
    const shouldReplace = !clean(row.image_url) || imageIdentityFindingsForRow(set, row).length > 0;
    const fallback = shouldReplace ? fallbackByNumber.get(number) : null;
    if (!fallback) return row;
    return {
      ...row,
      image_url: fallback.image_url,
      preview_image_url: fallback.preview_image_url ?? fallback.image_url,
      image_source_url: fallback.source_url,
      image_source: fallback.source,
      image_external_id: fallback.external_id,
      image_source_title: fallback.source_title,
      source_title: fallback.source_title ?? row.source_title,
    };
  });
}

function parseBulbapediaSecretRows(html, sourceUrl) {
  const rows = [];
  const rowPattern = /<tr>([\s\S]*?)<\/tr>/g;
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const rowHtml = match[1];
    const numberRaw = stripTags(rowHtml.match(/<td[^>]*>\s*([0-9]{3}\/081)\s*<\/td>/)?.[1] ?? '');
    const numberMatch = numberRaw.match(/^([0-9]{3})\/081$/);
    if (!numberMatch || Number(numberMatch[1]) <= 81) continue;

    const nameAnchor = rowHtml.match(/<td[^>]*>\s*<a href="([^"]+)"[^>]*title="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const rarityTitle = [...rowHtml.matchAll(/<a href="\/wiki\/Rarity" title="([^"]+)"/g)].at(-1)?.[1] ?? null;
    const typeTitle = rowHtml.match(/<th[^>]*>[\s\S]*?<a href="[^"]+" title="([^"]+)"/)?.[1] ?? null;
    const href = nameAnchor?.[1] ?? null;
    const sourceCardNumber = numberMatch[1];
    const name = htmlDecode(nameAnchor?.[2] ?? '')
      .replace(/\s*\(Abyss Eye [0-9]+\)\s*$/, '')
      .trim() || stripTags(nameAnchor?.[3] ?? '');
    rows.push({
      source_url: href ? new URL(href, sourceUrl).toString() : sourceUrl,
      source_card_id: `bulbapedia:Abyss_Eye:${numberRaw}`,
      external_id: `bulbapedia:Abyss_Eye:${numberRaw}`,
      number: sourceCardNumber,
      printed_number: numberRaw,
      name,
      rarity: clean(rarityTitle),
      regulation_mark: 'J',
      type_line: clean(typeTitle),
      category: null,
      source: 'bulbapedia',
    });
  }
  return rows;
}

async function acquireBulbapediaAbyssEyeSecrets(set, outDir) {
  const sourceUrl = 'https://bulbapedia.bulbagarden.net/wiki/Abyss_Eye_(TCG)';
  const res = await fetchText(sourceUrl);
  const evidenceDir = path.join(outDir, 'raw_sources', set.target_key);
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, 'bulbapedia_abyss_eye.html'), res.text, 'utf8');

  if (!res.ok) {
    return {
      set_key: set.target_key,
      source: 'bulbapedia',
      available: false,
      findings: [`bulbapedia_index_unavailable:${res.status}`],
      rows: [],
    };
  }

  const baseRows = parseBulbapediaSecretRows(res.text, sourceUrl);
  const rows = [];
  for (const row of baseRows) {
    const detail = await fetchText(row.source_url);
    await fs.writeFile(path.join(evidenceDir, `bulbapedia_${row.number}.html`), detail.text, 'utf8');
    const ogImage = detail.text.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null;
    const title = htmlDecode(detail.text.match(/<title>(.*?)<\/title>/)?.[1] ?? '');
    rows.push({
      ...row,
      image_url: clean(ogImage),
      preview_image_url: clean(ogImage),
      source_title: clean(title),
      set_code: set.canonical_set_code,
      set_name: set.name,
      language: set.language,
    });
  }

  const result = {
    set_key: set.target_key,
    source: 'bulbapedia',
    available: true,
    index_url: sourceUrl,
    expected_secret: set.expected_counts?.secret ?? null,
    row_count: rows.length,
    rows,
    findings: [],
  };
  if (result.expected_secret !== null && result.row_count !== result.expected_secret) {
    result.findings.push(`bulbapedia_secret_count_mismatch:${result.row_count}/${result.expected_secret}`);
  }
  if (rows.some((row) => !clean(row.name) || !clean(row.number) || !clean(row.image_url))) {
    result.findings.push('bulbapedia_missing_required_card_fields');
  }
  await writeJson(path.join(evidenceDir, 'bulbapedia_abyss_eye_secret_cards_v1.json'), result);
  return result;
}

async function acquireLimitlessM5(set, outDir) {
  const sourceUrl = 'https://limitlesstcg.com/cards/jp/M5?show=all';
  const indexRes = await fetchText(sourceUrl);
  const evidenceDir = path.join(outDir, 'raw_sources', set.target_key);
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, 'limitless_index.html'), indexRes.text, 'utf8');

  if (!indexRes.ok) {
    return {
      set_key: set.target_key,
      source: 'limitless',
      available: false,
      findings: [`limitless_index_unavailable:${indexRes.status}`],
      rows: [],
    };
  }

  const meta = parseLimitlessSetMeta(indexRes.text);
  const links = parseLimitlessCardLinks(indexRes.text, sourceUrl);
  const rows = [];
  for (const link of links) {
    const detail = await fetchText(link.source_url);
    await fs.writeFile(path.join(evidenceDir, `${String(link.number).padStart(3, '0')}.html`), detail.text, 'utf8');
    if (!detail.ok) {
      rows.push({ ...link, detail_status: detail.status, detail_error: true });
      continue;
    }
    rows.push(parseLimitlessCardDetail(detail.text, link));
  }

  const normalizedRows = rows.map((row) => ({
    ...row,
    set_code: set.canonical_set_code,
    set_name: set.name,
    language: set.language,
    source: 'limitless',
    external_id: row.source_card_id,
  }));
  const result = {
    set_key: set.target_key,
    source: 'limitless',
    available: true,
    index_url: sourceUrl,
    meta,
    expected_total: set.expected_counts?.official ?? set.expected_counts?.total ?? null,
    row_count: normalizedRows.length,
    rows: normalizedRows,
    findings: [],
  };
  if (result.expected_total !== null && result.row_count !== result.expected_total) {
    result.findings.push(`limitless_count_mismatch:${result.row_count}/${result.expected_total}`);
  }
  if (normalizedRows.some((row) => !clean(row.name) || !clean(row.number) || !clean(row.image_url))) {
    result.findings.push('limitless_missing_required_card_fields');
  }
  result.findings.push(...imageIdentityFindingsForRows(set, normalizedRows));

  await writeJson(path.join(evidenceDir, 'limitless_m5_cards_v1.json'), result);
  return result;
}

async function acquireAbyssEye(set, outDir) {
  const main = await acquireLimitlessM5(set, outDir);
  const secrets = await acquireBulbapediaAbyssEyeSecrets(set, outDir);
  const pokellectorImages = await acquirePokellectorAbyssEyeImages(set, outDir);
  const secretRows = applyReviewedImageOverrides(
    set,
    applyFallbackImages(set, secrets.rows ?? [], pokellectorImages.rows ?? []),
  );
  const rows = [...(main.rows ?? []), ...secretRows];
  const duplicateNumbers = rows
    .map((row) => row.number)
    .filter((number, index, all) => all.indexOf(number) !== index);
  const imageIdentityFindings = imageIdentityFindingsForRows(set, rows);
  const result = {
    set_key: set.target_key,
    source: 'limitless+bulbapedia',
    available: main.available && secrets.available,
    index_url: [main.index_url, secrets.index_url, pokellectorImages.index_url].filter(Boolean),
    meta: main.meta,
    expected_total: set.expected_counts?.total ?? null,
    row_count: rows.length,
    rows,
    findings: [
      ...(main.findings ?? []),
      ...(secrets.findings ?? []),
      ...imageIdentityFindings,
      ...(duplicateNumbers.length ? [`duplicate_numbers:${[...new Set(duplicateNumbers)].join(',')}`] : []),
      ...(set.expected_counts?.total != null && rows.length !== set.expected_counts.total
        ? [`combined_count_mismatch:${rows.length}/${set.expected_counts.total}`]
        : []),
    ],
    source_parts: {
      main_set_rows: main.row_count,
      secret_rows: secrets.row_count,
      pokellector_secret_image_rows: pokellectorImages.row_count,
      reviewed_image_overrides: set.image_overrides?.length ?? 0,
    },
  };
  await writeJson(path.join(outDir, 'raw_sources', set.target_key, 'abyss_eye_combined_cards_v1.json'), result);
  return result;
}

async function runCommand(command, args, envPatch = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: process.platform === 'win32',
      env: { ...process.env, ...envPatch },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => resolve({ command, args, code, stdout, stderr }));
  });
}

async function updateEnglishMasterIndex(set, outDir, apply) {
  const index = await readJson(ENGLISH_MASTER_INDEX);
  const existingIndex = (index.sets ?? []).findIndex((row) => row.key === set.canonical_set_code);
  const entry = {
    key: set.canonical_set_code,
    set_name: set.name,
    pokemontcg: null,
    tcgdex: set.source_ids?.tcgdex ?? null,
    manual_aliases: [],
    release_date: set.release_date,
    source_aliases: {
      pokemontcg_api: null,
      tcgdex: set.source_ids?.tcgdex ?? null,
      official_pokemon_checklist: set.source_ids?.pokemon_official ?? null,
      bulbapedia: 'Pitch_Black_(TCG)',
      bulbapedia_set_list: 'Pitch_Black_(TCG)',
    },
    source_status: {
      pokemontcg_api: 'unavailable',
      tcgdex: set.source_ids?.tcgdex ? 'candidate_url' : 'unavailable',
      official_pokemon_checklist: 'candidate_url',
      bulbapedia: 'candidate_url',
      bulbapedia_set_list: 'candidate_url',
    },
    source_totals: {
      pokemontcg_api: { printed_total: null, total: null },
      tcgdex: { official: null, total: null },
      official_pokemon_checklist: {
        official: set.expected_counts?.official ?? null,
        total: set.expected_counts?.total ?? null,
      },
    },
    new_set_release_ingestion_v1: {
      package_id: PACKAGE_ID,
      release_slug: path.basename(outDir),
      source_urls: set.source_urls,
      status: 'candidate_pending_card_level_source',
      reject_names: set.reject_source_ids?.names ?? [],
    },
  };

  const next = {
    ...index,
    generated_at: new Date().toISOString(),
    sets: [...(index.sets ?? [])],
  };
  if (existingIndex >= 0) next.sets[existingIndex] = { ...next.sets[existingIndex], ...entry };
  else next.sets.push(entry);

  const previewPath = path.join(outDir, 'english_master_index_sets_v1.preview.json');
  await writeJson(previewPath, next);
  if (apply) {
    await writeJson(ENGLISH_MASTER_INDEX, next);
  }
  return {
    set_key: set.target_key,
    applied: apply,
    active_path: path.relative(ROOT, ENGLISH_MASTER_INDEX),
    preview_path: path.relative(ROOT, previewPath),
    existing: existingIndex >= 0,
  };
}

async function writeJapaneseCandidateIndex(set, acquisition, outDir) {
  const artifact = {
    version: 'JAPANESE_CANDIDATE_SET_INDEX_V1',
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes: false,
    status: 'candidate_source_backed_not_master_verified',
    playbook: 'NEW_POKEMON_SET_RELEASE_INGESTION_PLAYBOOK_V1',
    set: {
      key: set.canonical_set_code,
      set_name: set.name,
      language: set.language,
      printed_set_abbrev: set.printed_set_abbrev,
      release_date: set.release_date,
      source_aliases: {
        limitless: set.source_ids?.limitless ?? null,
        tcgdex: set.source_ids?.tcgdex ?? null,
      },
      source_urls: set.source_urls,
      source_totals: {
        limitless: { total: acquisition?.row_count ?? null },
        expected: set.expected_counts ?? {},
      },
      rows: acquisition?.rows?.map((row) => ({
        number: row.number,
        name: row.name,
        rarity: row.rarity,
        image_url: row.image_url,
        source_url: row.source_url,
        external_id: row.external_id,
      })) ?? [],
    },
  };
  const file = path.join(outDir, 'japanese_candidate_set_index_v1.json');
  await writeJson(file, artifact);
  return { set_key: set.target_key, path: path.relative(ROOT, file), rows: artifact.set.rows.length };
}

async function dbColumns(client, table) {
  const result = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [table],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

function pickColumns(row, columns) {
  return Object.fromEntries(Object.entries(row).filter(([key, value]) => columns.has(key) && value !== undefined));
}

async function ensureSet(client, set, acquisition, columns) {
  const source = {
    new_set_release_ingestion_v1: {
      package_id: PACKAGE_ID,
      target_key: set.target_key,
      source_route: set.source_route,
      source_urls: set.source_urls,
      source_ids: set.source_ids,
      expected_counts: set.expected_counts,
      acquired_rows: acquisition?.row_count ?? null,
    },
  };
  const existing = await client.query('select id from public.sets where code = $1 limit 1', [set.canonical_set_code]);
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await client.query(
      `update public.sets
       set name = $2,
           release_date = $3::date,
           source = coalesce(source, '{}'::jsonb) || $4::jsonb,
           updated_at = now()
       where id = $1::uuid`,
      [id, set.name, set.release_date, JSON.stringify(source)],
    );
    return { id, created: false };
  }

  const row = pickColumns({
    id: deterministicUuid(`${PACKAGE_ID}:set:${set.canonical_set_code}`),
    game: 'pokemon',
    code: set.canonical_set_code,
    name: set.name,
    release_date: set.release_date,
    source,
    logo_url: acquisition?.meta?.logo_url ?? null,
    symbol_url: acquisition?.meta?.logo_url ?? null,
    printed_set_abbrev: set.printed_set_abbrev,
    printed_total: set.expected_counts?.total ?? set.expected_counts?.official ?? null,
    identity_domain_default: set.language === 'ja' ? 'pokemon_jpn' : 'pokemon',
    identity_model: 'standard',
  }, columns);
  const keys = Object.keys(row);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  const values = keys.map((key) => (typeof row[key] === 'object' && row[key] !== null ? JSON.stringify(row[key]) : row[key]));
  const casts = keys.map((key, index) => {
    if (key === 'id') return `$${index + 1}::uuid`;
    if (key === 'source') return `$${index + 1}::jsonb`;
    if (key === 'release_date') return `$${index + 1}::date`;
    return `$${index + 1}`;
  });
  await client.query(`insert into public.sets (${keys.join(', ')}) values (${casts.join(', ')})`, values);
  return { id: row.id, created: true };
}

async function ensureCardPrint(client, set, setId, card, columns) {
  const numberPadded = String(card.number).padStart(3, '0');
  const existing = await client.query(
    `select id from public.card_prints
     where (
         set_id = $1::uuid
         and coalesce(variant_key, '') = ''
         and (number = $2 or number = $3 or number_plain = $2 or number_plain = $3)
       )
       or gv_id = $4
     limit 1`,
    [setId, card.number, numberPadded, `GV-PK-${set.canonical_set_code.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${numberPadded}`],
  );
  const externalIds = {
    new_set_release_ingestion_v1: {
      package_id: PACKAGE_ID,
      source: card.source,
      external_id: card.external_id,
      source_url: card.source_url,
      image_url: card.image_url,
    },
  };
  const flags = {
    new_set_release_ingestion_v1: {
      release_slug: set.target_key,
      source_route: set.source_route,
      source_title: card.source_title ?? null,
    },
  };
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await client.query(
      `update public.card_prints
       set name = $2,
           rarity = coalesce($3, rarity),
           artist = coalesce($4, artist),
           regulation_mark = coalesce($5, regulation_mark),
           external_ids = coalesce(external_ids, '{}'::jsonb) || $6::jsonb,
           data_quality_flags = coalesce(data_quality_flags, '{}'::jsonb) || $7::jsonb,
           set_id = $8::uuid,
           set_code = $9,
           number = $10,
           variant_key = '',
           updated_at = now()
       where id = $1::uuid`,
      [
        id,
        card.name,
        card.rarity,
        card.artist,
        card.regulation_mark,
        JSON.stringify(externalIds),
        JSON.stringify(flags),
        setId,
        set.canonical_set_code,
        numberPadded,
      ],
    );
    return { id, created: false };
  }

  const row = pickColumns({
    id: deterministicUuid(`${PACKAGE_ID}:card:${set.canonical_set_code}:${numberPadded}`),
    game_id: 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5',
    set_id: setId,
    name: card.name,
    number: numberPadded,
    variant_key: '',
    rarity: card.rarity,
    image_url: card.image_url,
    external_ids: externalIds,
    set_code: set.canonical_set_code,
    artist: card.artist,
    regulation_mark: card.regulation_mark,
    image_alt_url: card.preview_image_url,
    image_source: 'ptcg',
    variants: {},
    print_identity_key: `${set.canonical_set_code}:${numberPadded}`,
    ai_metadata: {
      new_set_release_ingestion_v1: {
        type_line: card.type_line,
        category: card.category,
        source_title: card.source_title,
      },
    },
    data_quality_flags: flags,
    image_status: 'ok',
    printed_set_abbrev: set.printed_set_abbrev,
    printed_total: set.expected_counts?.total ?? set.expected_counts?.official ?? null,
    gv_id: `GV-PK-${set.canonical_set_code.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${numberPadded}`,
    identity_domain: set.language === 'ja' ? 'pokemon_jpn' : 'pokemon',
    set_identity_model: 'standard',
  }, columns);
  const keys = Object.keys(row);
  const values = keys.map((key) => (typeof row[key] === 'object' && row[key] !== null ? JSON.stringify(row[key]) : row[key]));
  const casts = keys.map((key, index) => {
    if (['id', 'game_id', 'set_id'].includes(key)) return `$${index + 1}::uuid`;
    if (['external_ids', 'variants', 'ai_metadata', 'data_quality_flags', 'image_res'].includes(key)) return `$${index + 1}::jsonb`;
    return `$${index + 1}`;
  });
  await client.query(`insert into public.card_prints (${keys.join(', ')}) values (${casts.join(', ')})`, values);
  return { id: row.id, created: true };
}

async function ensureExternalMapping(client, cardPrintId, source, externalId, meta) {
  await client.query(
    `insert into public.external_mappings (card_print_id, source, external_id, meta, active, synced_at)
     values ($1::uuid, $2, $3, $4::jsonb, true, now())
     on conflict (source, external_id)
     do update set card_print_id = excluded.card_print_id, meta = excluded.meta, active = true, synced_at = now()`,
    [cardPrintId, source, externalId, JSON.stringify(meta)],
  );
}

async function storageUploadAndPoint(client, supabase, set, cardRows, cardIds, columns) {
  const results = [];
  const canWriteImagePath = columns.has('image_path') && columns.has('image_source');
  if (!canWriteImagePath) {
    return cardRows.map((row) => ({ number: row.number, uploaded: false, status: 'missing_image_path_columns' }));
  }

  for (const row of cardRows) {
    const id = cardIds.get(row.external_id);
    if (!id || !row.image_url) {
      results.push({ number: row.number, uploaded: false, status: 'missing_id_or_image_url' });
      continue;
    }
    const identityFindings = imageIdentityFindingsForRow(set, row);
    if (identityFindings.length > 0) {
      results.push({
        number: row.number,
        uploaded: false,
        status: `image_identity_rejected:${identityFindings.join(',')}`,
      });
      continue;
    }
    const current = await client.query(
      `select image_source, image_path
       from public.card_prints
       where id = $1::uuid
       limit 1`,
      [id],
    );
    const currentImage = current.rows[0] ?? null;
    if (currentImage?.image_source === 'identity' && clean(currentImage?.image_path)) {
      results.push({
        number: row.number,
        uploaded: false,
        status: 'skipped_existing_identity_path',
        storage_path: currentImage.image_path,
      });
      continue;
    }
    const extMatch = new URL(row.image_url).pathname.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch?.[1]?.toLowerCase() ?? 'png';
    const storagePath = `${STORAGE_PREFIX}/${set.canonical_set_code}/${String(row.number).padStart(3, '0')}.${ext}`;
    const exists = await supabase.storage.from(STORAGE_BUCKET).list(path.dirname(storagePath).replace(/\\/g, '/'), {
      search: path.basename(storagePath),
      limit: 1,
    });
    if (!exists.error && exists.data?.some((object) => object.name === path.basename(storagePath))) {
      await client.query(
        `update public.card_prints set image_source = 'identity', image_path = $2, updated_at = now() where id = $1::uuid`,
        [id, storagePath],
      );
      results.push({ number: row.number, uploaded: false, status: 'skipped_existing_object', storage_path: storagePath });
      continue;
    }
    const image = await fetchBuffer(row.image_url);
    if (!image.ok || image.buffer.length === 0 || !String(image.contentType ?? '').startsWith('image/')) {
      results.push({ number: row.number, uploaded: false, status: `image_fetch_failed:${image.status}`, storage_path: storagePath });
      continue;
    }
    const upload = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, image.buffer, {
      contentType: image.contentType ?? 'image/png',
      upsert: false,
    });
    if (upload.error) {
      results.push({ number: row.number, uploaded: false, status: `upload_failed:${upload.error.message}`, storage_path: storagePath });
      continue;
    }
    await client.query(
      `update public.card_prints set image_source = 'identity', image_path = $2, updated_at = now() where id = $1::uuid`,
      [id, storagePath],
    );
    results.push({
      number: row.number,
      uploaded: true,
      status: 'uploaded',
      storage_path: storagePath,
      sha256: sha256(image.buffer),
      bytes: image.buffer.length,
    });
  }
  return results;
}

async function applyManualSeedSet(set, acquisition, args) {
  if (!acquisition?.available || acquisition.findings?.length || !Array.isArray(acquisition.rows) || acquisition.rows.length === 0) {
    return {
      set_key: set.target_key,
      applied: false,
      stop_findings: ['manual_seed_acquisition_not_ready', ...(acquisition?.findings ?? [])],
    };
  }
  const dbUrl = connectionString();
  if (!dbUrl) {
    return { set_key: set.target_key, applied: false, stop_findings: ['missing_SUPABASE_DB_URL'] };
  }
  if (args.selfHostImages && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)) {
    return { set_key: set.target_key, applied: false, stop_findings: ['missing_SUPABASE_URL_or_SUPABASE_SECRET_KEY_for_storage'] };
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const setColumns = await dbColumns(client, 'sets');
    const cardColumns = await dbColumns(client, 'card_prints');
    await client.query('begin');
    const setResult = await ensureSet(client, set, acquisition, setColumns);
    const cardIds = new Map();
    let insertedCards = 0;
    let updatedCards = 0;
    for (const card of acquisition.rows) {
      const result = await ensureCardPrint(client, set, setResult.id, card, cardColumns);
      if (result.created) insertedCards += 1;
      else updatedCards += 1;
      cardIds.set(card.external_id, result.id);
      await ensureExternalMapping(client, result.id, card.source ?? 'limitless', card.external_id, {
        source_url: card.source_url,
        image_url: card.image_url,
        set_key: set.target_key,
        package_id: PACKAGE_ID,
      });
    }
    let imageResults = [];
    if (args.selfHostImages) {
      const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
        auth: { persistSession: false },
      });
      imageResults = await storageUploadAndPoint(client, supabase, set, acquisition.rows, cardIds, cardColumns);
    }
    await client.query('commit');
    return {
      set_key: set.target_key,
      applied: true,
      set_created: setResult.created,
      set_id: setResult.id,
      inserted_cards: insertedCards,
      updated_cards: updatedCards,
      mappings_upserted: acquisition.rows.length,
      image_results: imageResults,
      stop_findings: imageResults.filter((row) => row.status?.includes('failed')).map((row) => `image:${row.number}:${row.status}`),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { set_key: set.target_key, applied: false, stop_findings: [`db_apply_error:${error?.message ?? error}`] };
  } finally {
    await client.end();
  }
}

async function runTcgdexRoute(set, tcgdex, args) {
  if (!tcgdex.available || !tcgdex.matched_id) {
    return { set_key: set.target_key, applied: false, skipped: true, reason: 'tcgdex_unavailable' };
  }
  const modeFlag = args.apply ? [] : ['--dry-run'];
  const envPatch = { TCGDEX_BASE_URL: process.env.TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2', TCGDEX_LANG: tcgdex.lang };
  const commands = [
    ['node', ['backend/sets/tcgdex_import_sets_worker.mjs', '--mode=full', '--set', tcgdex.matched_id, ...modeFlag]],
    ['node', ['backend/pokemon/tcgdex_import_cards_worker.mjs', '--mode=full', '--set', tcgdex.matched_id, '--detail', ...modeFlag]],
    ['node', ['backend/pokemon/tcgdex_normalize_worker.mjs', '--mode=backfill', '--set', tcgdex.matched_id, ...modeFlag]],
  ];
  if (args.apply) {
    commands.push(['node', ['backend/tools/tcgdex_canonize_set.mjs', '--set', tcgdex.matched_id, '--apply']]);
  } else {
    commands.push(['node', ['backend/tools/tcgdex_canonize_set.mjs', '--set', tcgdex.matched_id, '--dry-run', '--detail']]);
  }
  const results = [];
  for (const [cmd, cmdArgs] of commands) {
    const result = await runCommand(cmd, cmdArgs, envPatch);
    results.push(result);
    if (result.code !== 0) break;
  }
  return {
    set_key: set.target_key,
    applied: args.apply,
    tcgdex_set_id: tcgdex.matched_id,
    command_results: results.map((row) => ({
      command: `${row.command} ${row.args.join(' ')}`,
      code: row.code,
      stdout_tail: row.stdout.slice(-1200),
      stderr_tail: row.stderr.slice(-1200),
    })),
    stop_findings: results.filter((row) => row.code !== 0).map((row) => `tcgdex_command_failed:${row.args[0]}:${row.code}`),
  };
}

async function readbackSet(set) {
  const dbUrl = connectionString();
  if (!dbUrl) return { set_key: set.target_key, skipped: true, reason: 'missing_SUPABASE_DB_URL' };
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `select
         s.id,
         s.code,
         s.name,
         count(cp.id)::int as card_print_count,
         count(cp.id) filter (where cp.image_source = 'identity' and nullif(cp.image_path, '') is not null)::int as identity_image_count,
         count(em.id)::int as mapping_count
       from public.sets s
       left join public.card_prints cp on cp.set_id = s.id
       left join public.external_mappings em on em.card_print_id = cp.id and em.active = true
       where s.code = $1
       group by s.id, s.code, s.name`,
      [set.canonical_set_code],
    );
    return { set_key: set.target_key, row: result.rows[0] ?? null };
  } finally {
    await client.end();
  }
}

function renderCompletion(report) {
  const setRows = report.sets.map((set) => `| ${set.target_key} | ${set.name} | ${set.language} | ${set.canonical_set_code} | ${set.status} |`).join('\n');
  const stops = report.stop_findings.length ? report.stop_findings.map((row) => `- ${row}`).join('\n') : '- none';
  return `# New Set Ingestion Completion: ${report.release_slug}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Playbook: ${report.playbook}
- Manifest: \`${report.manifest_path}\`
- Overall status: ${report.status}

## Sets

| key | name | language | code | status |
| --- | --- | --- | --- | --- |
${setRows}

## Stop Findings

${stops}

## Artifacts

- Summary JSON: \`${report.summary_json}\`
- Source snapshots: \`${report.source_snapshot_dir}\`
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifestPath = path.resolve(ROOT, args.manifest);
  const manifest = await readJson(manifestPath);
  const selectedSets = args.setKeys.length
    ? manifest.sets.filter((set) => args.setKeys.includes(set.target_key) || args.setKeys.includes(set.canonical_set_code))
    : manifest.sets;
  const outDir = outputDir(manifest.release_slug);
  await fs.mkdir(outDir, { recursive: true });

  const report = {
    package_id: PACKAGE_ID,
    playbook: manifest.playbook,
    release_slug: manifest.release_slug,
    generated_at: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    manifest_path: path.relative(ROOT, manifestPath),
    source_snapshot_dir: path.relative(ROOT, path.join(outDir, 'raw_sources')),
    summary_json: path.relative(ROOT, path.join(outDir, 'summary_v1.json')),
    sets: [],
    phases: {
      validation: null,
      tcgdex_discovery: [],
      acquisitions: [],
      master_indexes: [],
      db_apply: [],
      readbacks: [],
      tests: [],
    },
    stop_findings: [],
    status: 'unknown',
  };

  const validationFindings = validateManifest({ ...manifest, sets: selectedSets });
  report.phases.validation = { findings: validationFindings };
  report.stop_findings.push(...validationFindings);

  const acquisitions = new Map();
  const tcgdexDiscoveries = new Map();
  for (const set of selectedSets) {
    const tcgdex = await discoverTcgdex(set);
    tcgdexDiscoveries.set(set.target_key, tcgdex);
    report.phases.tcgdex_discovery.push(tcgdex);

    if (set.source_route === 'limitless_manifest_seed') {
      const acquisition = set.target_key === 'abyss_eye_jp'
        ? await acquireAbyssEye(set, outDir)
        : await acquireLimitlessM5(set, outDir);
      acquisitions.set(set.target_key, acquisition);
      report.phases.acquisitions.push({ ...acquisition, rows: undefined });
      if (acquisition.findings?.length) report.stop_findings.push(...acquisition.findings.map((finding) => `${set.target_key}:${finding}`));
    } else if (!tcgdex.available) {
      report.stop_findings.push(`${set.target_key}:card_level_source_unavailable`);
    }
  }

  if (args.updateMasterIndexes) {
    for (const set of selectedSets) {
      if (set.region === 'english') {
        report.phases.master_indexes.push(await updateEnglishMasterIndex(set, outDir, args.apply));
      } else if (set.region === 'japanese') {
        report.phases.master_indexes.push(await writeJapaneseCandidateIndex(set, acquisitions.get(set.target_key), outDir));
      }
    }
  }

  if (args.apply && report.stop_findings.length === 0) {
    for (const set of selectedSets) {
      const tcgdex = tcgdexDiscoveries.get(set.target_key);
      if (tcgdex?.available) {
        report.phases.db_apply.push(await runTcgdexRoute(set, tcgdex, args));
      } else if (set.source_route === 'limitless_manifest_seed') {
        report.phases.db_apply.push(await applyManualSeedSet(set, acquisitions.get(set.target_key), args));
      } else {
        report.phases.db_apply.push({ set_key: set.target_key, applied: false, stop_findings: ['no_apply_route'] });
      }
    }
  } else if (!args.apply) {
    for (const set of selectedSets) {
      report.phases.db_apply.push({ set_key: set.target_key, applied: false, dry_run: true });
    }
  }

  for (const applyResult of report.phases.db_apply) {
    report.stop_findings.push(...(applyResult.stop_findings ?? []).map((finding) => `${applyResult.set_key}:${finding}`));
  }

  if (args.readbacks) {
    for (const set of selectedSets) {
      report.phases.readbacks.push(await readbackSet(set));
    }
  }

  if (!args.skipTests) {
    const testResult = await runCommand('node', ['--test', 'tests/contracts/new_pokemon_set_release_ingestion_playbook_v1.test.mjs']);
    report.phases.tests.push({
      command: 'node --test tests/contracts/new_pokemon_set_release_ingestion_playbook_v1.test.mjs',
      code: testResult.code,
      stdout_tail: testResult.stdout.slice(-1200),
      stderr_tail: testResult.stderr.slice(-1200),
    });
    if (testResult.code !== 0) report.stop_findings.push('contract_test_failed:new_pokemon_set_release_ingestion_playbook_v1');
  }

  for (const set of selectedSets) {
    const acquisition = acquisitions.get(set.target_key);
    const applyResult = report.phases.db_apply.find((row) => row.set_key === set.target_key);
    const readback = report.phases.readbacks.find((row) => row.set_key === set.target_key);
    report.sets.push({
      target_key: set.target_key,
      name: set.name,
      language: set.language,
      canonical_set_code: set.canonical_set_code,
      acquired_rows: acquisition?.row_count ?? null,
      db_applied: applyResult?.applied ?? false,
      readback: readback?.row ?? null,
      status: applyResult?.applied ? 'applied' : (acquisition?.available ? 'acquired_not_applied' : 'pending_source'),
    });
  }

  report.status = report.stop_findings.length === 0 ? 'complete' : 'blocked';
  await writeJson(path.join(outDir, 'summary_v1.json'), report);
  await writeText(checkpointPath(manifest.release_slug), renderCompletion(report));

  console.log(JSON.stringify({
    status: report.status,
    release_slug: report.release_slug,
    stop_findings: report.stop_findings,
    summary_json: report.summary_json,
    completion_report: path.relative(ROOT, checkpointPath(manifest.release_slug)),
  }, null, 2));

  if (report.status !== 'complete') process.exitCode = 2;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal`, error);
  process.exit(1);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh01a_results_v1.jsonl');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh04a_tcgdex_failed_replacement_source_audit_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh04a_tcgdex_failed_replacement_source_audit_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh04a_tcgdex_failed_replacement_source_audit_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-04A-TCGDEX-FAILED-REPLACEMENT-SOURCE-AUDIT';
const USER_AGENT = 'Grookai TCGdex Replacement Source Audit/1.0';

const POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES = {
  'tk-ex-latia': 'tk1a',
  'tk-ex-latio': 'tk1b',
  'tk-ex-m': 'tk2b',
  'tk-ex-p': 'tk2a',
  tk2b: 'tk2b',
};

const MALIE_TRAINER_KIT_SET_IMAGE_PLANS = {
  'tk-bw-z': { series: 'BW', code: 'TK5A', folder: 'TK_Zoroark' },
  'tk-bw-e': { series: 'BW', code: 'TK5B', folder: 'TK_Excadrill' },
  'tk-xy-n': { series: 'XY', code: 'TK6A', folder: 'TK_Noivern' },
  'tk-xy-sy': { series: 'XY', code: 'TK6B', folder: 'TK_Sylveon' },
  'tk-xy-b': { series: 'XY', code: 'TK7A', folder: 'TK_Bisharp' },
  'tk-xy-w': { series: 'XY', code: 'TK7B', folder: 'TK_Wigglytuff' },
  'tk-xy-latio': { series: 'XY', code: 'TK8A', folder: 'TK_Latios' },
  'tk-xy-latia': { series: 'XY', code: 'TK8B', folder: 'TK_Latias' },
  'tk-xy-p': { series: 'XY', code: 'TK9A', folder: 'TK_PikachuLibre' },
  'tk-xy-su': { series: 'XY', code: 'TK9B', folder: 'TK_Suicune' },
  'tk-sm-l': { series: 'SM', code: 'TK10A', folder: 'TK_Lycanroc' },
  'tk-sm-r': { series: 'SM', code: 'TK10B', folder: 'TK_AlolanRaichu' },
};

const TCGCOLLECTOR_TRAINER_KIT_IMAGE_URLS = {
  'tk-dp-l': {
    1: 'https://static.tcgcollector.com/content/images/93/16/8d/93168dd5a846add1c3cb102f8a6f77ff8f9c1aab4885151da791a58248d87ba9.jpg',
    2: 'https://static.tcgcollector.com/content/images/ef/b9/02/efb902c49990f5975121559159a3f4d1fd74a4cea5a9a9257be8856fd3693ba2.jpg',
    3: 'https://static.tcgcollector.com/content/images/b3/a3/0a/b3a30aabb684331e0dcf77938e48f38824e512b1c8ac57d528549eb4a2c4aa2f.jpg',
    4: 'https://static.tcgcollector.com/content/images/eb/39/d1/eb39d12f1690546838338c7e97eff8e5f16e4f26fe405187766f8a60be282ed6.jpg',
    5: 'https://static.tcgcollector.com/content/images/90/8f/9b/908f9b744a59f41c2126f109b27397c0049bf8612e07f52607ac86fef59aa258.jpg',
    6: 'https://static.tcgcollector.com/content/images/49/27/91/49279116e712e0b16f02847c5dc3354916add33110accea1bbe32b937a0ee7a5.jpg',
    7: 'https://static.tcgcollector.com/content/images/bb/98/e1/bb98e184e7e48cd9620650e821fcc0241fe7d2a4b5f816122411936fb1056bb0.jpg',
    8: 'https://static.tcgcollector.com/content/images/a8/55/d1/a855d14fb345de77b171e51b20ce74f635bf10f188143fe3c9b30f74962c1044.jpg',
    9: 'https://static.tcgcollector.com/content/images/25/77/46/257746f616f3977b577257231919e358d49b9b840b7fd89266f417dd98d56748.jpg',
    10: 'https://static.tcgcollector.com/content/images/e2/e9/50/e2e95036f95fae4d7c165194a57082c2cad59cd0e5b8a3d37f0ff6c341a0323f.jpg',
    11: 'https://static.tcgcollector.com/content/images/a1/ce/08/a1ce08c821befe062de15577892f75c460f8d6cdf05f32121d84dd8e390e3278.jpg',
  },
  'tk-dp-m': {
    1: 'https://static.tcgcollector.com/content/images/f3/b8/b6/f3b8b66529d080a6a929725a18cbc16da8c450e165eb4dfe0711c27a55779857.jpg',
    2: 'https://static.tcgcollector.com/content/images/52/62/46/5262464272705ad039f0bf93f591851ed4bb2be8e0d788bf459a6dfabf038aec.jpg',
    3: 'https://static.tcgcollector.com/content/images/0b/21/5d/0b215d49b514b815fc0ff225ac5736a4a82e218fa4ce14cb4fe627b25b79f9ef.jpg',
    4: 'https://static.tcgcollector.com/content/images/86/33/7e/86337e4b3228e16682d288fca2dfffeb71915a6a29249b14465961c89b5f1ae2.jpg',
    5: 'https://static.tcgcollector.com/content/images/05/aa/eb/05aaeb129e27e1e2baefb17bb34fd534dfe264d6fbada0f163deff8deb8f6374.jpg',
    6: 'https://static.tcgcollector.com/content/images/04/d4/0f/04d40fad994ac8ee95301512f4502883852e9dd194ab28304947d5a5bdac2082.jpg',
    7: 'https://static.tcgcollector.com/content/images/2a/48/9d/2a489d5bfcfd30881d065fb1f853a02c508e574fdf982a2fecfec97dc650ae2e.jpg',
    8: 'https://static.tcgcollector.com/content/images/7a/66/ba/7a66baab8e91c12cf8bce2a97a318d91021fd977cdc16fdfb060ef0d1a1c5c09.jpg',
    9: 'https://static.tcgcollector.com/content/images/10/2b/b4/102bb4502de579a480dd7fc584f4c2dca034a4b6c305c6ef50f3f2020e5dcdb2.jpg',
    10: 'https://static.tcgcollector.com/content/images/03/3f/07/033f07092a580df9b082e7112456d568e0585d8e7eee23f0467ec4b8e2a21b90.jpg',
    11: 'https://static.tcgcollector.com/content/images/e8/79/cd/e879cde72f570f31d00039df520d4242cf437a885f1d85e55580bf597625aa03.jpg',
    12: 'https://static.tcgcollector.com/content/images/23/df/a7/23dfa7003966804257a9b93b26c995acf3066976a711a1a7b60cee15a38835b7.jpg',
  },
  'tk-hs-g': {
    20: 'https://static.tcgcollector.com/content/images/57/c4/81/57c481f36dcb032ffd7f4dac803b26d5e907bc89b760b405844e742a8209d6e8.jpg',
  },
  'tk-hs-r': {
    19: 'https://static.tcgcollector.com/content/images/f4/75/e5/f475e52be4dcd901f984a255bd6c05ddff1c73970a5e1fafd9012ed8535865ce.jpg',
  },
};

function parseArgs(argv) {
  const args = {
    resume: true,
    limit: Number.parseInt(process.env.TCGDEX_REPLACEMENT_AUDIT_LIMIT ?? '0', 10),
    concurrency: Number.parseInt(process.env.TCGDEX_REPLACEMENT_AUDIT_CONCURRENCY ?? '8', 10),
    timeoutMs: Number.parseInt(process.env.TCGDEX_REPLACEMENT_AUDIT_TIMEOUT_MS ?? '25000', 10),
    maxHours: Number.parseFloat(process.env.TCGDEX_REPLACEMENT_AUDIT_MAX_HOURS ?? '8'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--no-resume') args.resume = false;
    else if (arg === '--limit') args.limit = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--concurrency') args.concurrency = Number.parseInt(argv[++index] ?? '8', 10);
    else if (arg === '--timeout-ms') args.timeoutMs = Number.parseInt(argv[++index] ?? '25000', 10);
    else if (arg === '--max-hours') args.maxHours = Number.parseFloat(argv[++index] ?? '8');
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.concurrency = Math.max(1, Math.min(args.concurrency || 8, 20));
  args.timeoutMs = Math.max(5000, args.timeoutMs || 25000);
  args.maxHours = Math.max(0.05, args.maxHours || 8);
  return args;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function lower(value) {
  return clean(value)?.toLowerCase() ?? null;
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

function numberText(row) {
  const number = clean(row.number);
  if (!number) return null;
  return number;
}

function numericNumber(row) {
  const value = numberText(row);
  return value && /^\d+$/.test(value) ? String(Number(value)) : null;
}

function paddedNumericNumber(row) {
  const value = numericNumber(row);
  return value ? value.padStart(3, '0') : null;
}

function slugForMalie(value) {
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

function looksLikeHtml(buffer) {
  const prefix = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trim().toLowerCase();
  return prefix.startsWith('<!doctype html') || prefix.startsWith('<html') || prefix.includes('<body');
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

function isTcgpSet(row) {
  const setCode = clean(row.set_code);
  return Boolean(setCode && /^(A|B|P-A|PROMO-A)\d*/i.test(setCode) && clean(row.gv_id)?.startsWith('GV-TCGP-'));
}

function tcgdexHighUrlCandidate(row) {
  const raw = clean(row.raw_image_value);
  if (!raw?.startsWith('https://assets.tcgdex.net/')) return null;
  if (/\.(webp|png|jpe?g)(\?.*)?$/i.test(raw)) return null;
  return `${raw.replace(/\/+$/, '')}/high.webp`;
}

function malieTrainerKitCandidate(row) {
  const setCode = lower(row.set_code);
  const plan = setCode ? MALIE_TRAINER_KIT_SET_IMAGE_PLANS[setCode] : null;
  const number = paddedNumericNumber(row);
  const nameSlug = slugForMalie(row.name);
  if (!plan || !number || !nameSlug) return null;
  return `https://cdn.malie.io/file/malie-io/art/cards/jpg/en_US/${encodeURIComponent(plan.series)}/${encodeURIComponent(plan.code)}-${encodeURIComponent(plan.folder)}/en_US-${encodeURIComponent(plan.code)}-${encodeURIComponent(number)}-${encodeURIComponent(nameSlug)}.jpg`;
}

function sourceBackedCandidates(row) {
  const setCode = lower(row.set_code);
  const number = numericNumber(row);
  const candidates = [];

  if (setCode === '2021swsh' && number && Number(number) >= 1 && Number(number) <= 25) {
    candidates.push({
      candidate_source_lane: 'replacement_pokemontcg_mcd21',
      candidate_url: `https://images.pokemontcg.io/mcd21/${encodeURIComponent(number)}_hires.png`,
      proposed_image_source: 'pokemonapi',
      proposed_image_status: 'exact',
      proposed_display_image_kind: 'exact',
      exact_image_claim_change: false,
      replacement_confidence: 'high',
    });
  }

  const trainerKitPokemonTcgSetCode = setCode ? POKEMON_TCG_TRAINER_KIT_SET_CODE_ALIASES[setCode] : null;
  if (trainerKitPokemonTcgSetCode && number) {
    candidates.push({
      candidate_source_lane: 'replacement_pokemontcg_trainer_kit',
      candidate_url: `https://images.pokemontcg.io/${encodeURIComponent(trainerKitPokemonTcgSetCode)}/${encodeURIComponent(number)}_hires.png`,
      proposed_image_source: 'pokemonapi',
      proposed_image_status: 'exact',
      proposed_display_image_kind: 'exact',
      exact_image_claim_change: false,
      replacement_confidence: 'high',
    });
  }

  const malieUrl = malieTrainerKitCandidate(row);
  if (malieUrl) {
    candidates.push({
      candidate_source_lane: 'replacement_malie_trainer_kit',
      candidate_url: malieUrl,
      proposed_image_source: 'external',
      proposed_image_status: 'representative_shared',
      proposed_display_image_kind: 'representative',
      exact_image_claim_change: false,
      replacement_confidence: 'medium_representative_only',
    });
  }

  const tcgCollectorUrl = setCode && number ? TCGCOLLECTOR_TRAINER_KIT_IMAGE_URLS[setCode]?.[number] : null;
  if (tcgCollectorUrl) {
    candidates.push({
      candidate_source_lane: 'replacement_tcgcollector_trainer_kit',
      candidate_url: tcgCollectorUrl,
      proposed_image_source: 'external',
      proposed_image_status: 'representative_shared',
      proposed_display_image_kind: 'representative',
      exact_image_claim_change: false,
      replacement_confidence: 'medium_representative_only',
    });
  }

  return candidates;
}

function candidateRows(row) {
  const candidates = [];
  const tcgdexUrl = tcgdexHighUrlCandidate(row);
  if (tcgdexUrl) {
    candidates.push({
      candidate_source_lane: 'tcgdex_high_suffix_repair',
      candidate_url: tcgdexUrl,
      proposed_image_source: 'tcgdex',
      proposed_image_status: row.image_status ?? 'exact',
      proposed_display_image_kind: row.field_name === 'representative_image_url' ? 'representative' : 'exact',
      exact_image_claim_change: false,
      replacement_confidence: isTcgpSet(row) ? 'tcg_pocket_review_required' : 'high_url_repair',
    });
  }
  candidates.push(...sourceBackedCandidates(row));
  return candidates;
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

async function loadCompletedKeys() {
  const completed = new Set();
  try {
    const raw = await fs.readFile(RESULT_JSONL, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed?.audit_key) completed.add(parsed.audit_key);
      } catch {
        // Ignore partial lines from interrupted runs.
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return completed;
}

async function validateCandidate(candidate, timeoutMs) {
  try {
    const response = await fetch(candidate.candidate_url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': USER_AGENT },
    });
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const buffer = Buffer.from(await response.arrayBuffer());
    const sha = sha256Hex(buffer);
    const dimensions = imageDimensions(buffer);
    const warnings = [];
    if (!response.ok) warnings.push(`http_${response.status}`);
    if (looksLikeHtml(buffer)) warnings.push('html_response_body');
    if (!contentType?.toLowerCase().startsWith('image/')) warnings.push('non_image_content_type');
    if (!dimensions) warnings.push('dimensions_unreadable');
    if (buffer.length < 1024) warnings.push('very_small_image_payload');
    return {
      ...candidate,
      fetch_ok: response.ok && warnings.length === 0,
      failure_reason: response.ok && warnings.length === 0 ? null : warnings.join(',') || `http_${response.status}`,
      http_status: response.status,
      final_url: response.url,
      content_type: contentType,
      content_length_header: contentLength,
      size_bytes: buffer.length,
      sha256: sha,
      dimensions,
      extension: extensionFor(contentType, response.url),
      validation_warnings: warnings,
    };
  } catch (error) {
    return {
      ...candidate,
      fetch_ok: false,
      failure_reason: error instanceof Error ? error.message : String(error),
      http_status: null,
      final_url: null,
      content_type: null,
      content_length_header: null,
      size_bytes: null,
      sha256: null,
      dimensions: null,
      extension: null,
      validation_warnings: ['fetch_failed'],
    };
  }
}

function storagePathFor(row, candidate) {
  if (!candidate.fetch_ok || !candidate.sha256) return null;
  const identity = String(row.printing_gv_id ?? row.gv_id ?? row.source_row_id ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
  const setCode = String(row.set_code ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
  return [
    'warehouse-derived',
    'self-hosted-images-v1',
    row.source_table,
    setCode,
    identity,
    `${candidate.sha256.slice(0, 24)}.${candidate.extension ?? 'bin'}`,
  ].join('/');
}

async function auditRow(row, timeoutMs) {
  const candidates = candidateRows(row);
  const attempts = [];
  for (const candidate of candidates) {
    const validated = await validateCandidate(candidate, timeoutMs);
    attempts.push(validated);
    if (validated.fetch_ok) break;
  }
  const selected = attempts.find((attempt) => attempt.fetch_ok) ?? null;
  return {
    package_id: PACKAGE_ID,
    audit_key: row.audit_key,
    checked_at: new Date().toISOString(),
    source_table: row.source_table,
    source_row_id: row.source_row_id,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    gv_id: row.gv_id,
    printing_gv_id: row.printing_gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    field_name: row.field_name,
    original_image_status: row.image_status,
    original_image_source: row.image_source,
    original_failed_url: row.raw_image_value,
    original_failure_reason: row.failure_reason,
    source_lane: row.source_lane,
    is_tcg_pocket: isTcgpSet(row),
    candidate_count: candidates.length,
    replacement_found: Boolean(selected),
    replacement_route: selected?.candidate_source_lane ?? (candidates.length ? 'candidate_failed_validation' : 'no_candidate_rule'),
    replacement_confidence: selected?.replacement_confidence ?? null,
    proposed_image_source: selected?.proposed_image_source ?? null,
    proposed_image_status: selected?.proposed_image_status ?? null,
    proposed_display_image_kind: selected?.proposed_display_image_kind ?? null,
    proposed_url: selected?.candidate_url ?? null,
    proposed_final_url: selected?.final_url ?? null,
    proposed_storage_path: selected ? storagePathFor(row, selected) : null,
    proposed_sha256: selected?.sha256 ?? null,
    proposed_content_type: selected?.content_type ?? null,
    proposed_size_bytes: selected?.size_bytes ?? null,
    proposed_dimensions: selected?.dimensions ?? null,
    exact_image_claim_change: selected?.exact_image_claim_change ?? false,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    candidate_attempts: attempts.map((attempt) => ({
      candidate_source_lane: attempt.candidate_source_lane,
      candidate_url: attempt.candidate_url,
      fetch_ok: attempt.fetch_ok,
      failure_reason: attempt.failure_reason,
      http_status: attempt.http_status,
      content_type: attempt.content_type,
      size_bytes: attempt.size_bytes,
      dimensions: attempt.dimensions,
      sha256: attempt.sha256,
      replacement_confidence: attempt.replacement_confidence,
      proposed_image_status: attempt.proposed_image_status,
      proposed_display_image_kind: attempt.proposed_display_image_kind,
    })),
  };
}

async function processQueue(rows, args) {
  const startedAt = Date.now();
  const maxMs = args.maxHours * 60 * 60 * 1000;
  const completed = args.resume ? await loadCompletedKeys() : new Set();
  if (!args.resume) {
    await fs.rm(RESULT_JSONL, { force: true });
  }
  const pending = rows.filter((row) => !completed.has(row.audit_key));
  let index = 0;
  let processed = 0;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  async function worker() {
    while (index < pending.length) {
      if (Date.now() - startedAt > maxMs) return;
      const row = pending[index++];
      const result = await auditRow(row, args.timeoutMs);
      await fs.appendFile(RESULT_JSONL, `${JSON.stringify(result)}\n`);
      processed += 1;
      if (processed % 250 === 0) {
        console.log(`[${PACKAGE_ID}] processed ${processed}/${pending.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));
  return { processed_this_run: processed, skipped_completed: completed.size, pending_before_run: pending.length };
}

async function writeSummary(args, runStats) {
  const resultRows = await readJsonl(RESULT_JSONL);
  const totalRows = resultRows.length;
  const replacements = resultRows.filter((row) => row.replacement_found);
  const physicalReplacements = replacements.filter((row) => !row.is_tcg_pocket);
  const tcgPocketReplacements = replacements.filter((row) => row.is_tcg_pocket);
  const summaryBase = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_replacement_source_audit',
    source_result_jsonl: path.relative(ROOT, SOURCE_JSONL),
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    exact_image_claim_changes_performed: false,
    args,
    run_stats: runStats,
    total_result_rows: totalRows,
    replacement_found_rows: replacements.length,
    replacement_missing_rows: totalRows - replacements.length,
    physical_replacement_found_rows: physicalReplacements.length,
    tcg_pocket_review_replacement_found_rows: tcgPocketReplacements.length,
    by_replacement_route: countBy(resultRows, (row) => row.replacement_route),
    by_replacement_confidence: countBy(resultRows, (row) => row.replacement_confidence ?? 'none'),
    by_set_code_top: topEntries(countBy(resultRows, (row) => row.set_code ?? 'unknown'), 30),
    replacement_by_set_code_top: topEntries(countBy(replacements, (row) => row.set_code ?? 'unknown'), 30),
    unresolved_by_set_code_top: topEntries(countBy(resultRows.filter((row) => !row.replacement_found), (row) => row.set_code ?? 'unknown'), 30),
  };
  const summary = {
    ...summaryBase,
    proof_hash: proofHash(summaryBase),
  };
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(SUMMARY_MD, [
    `# ${PACKAGE_ID}`,
    '',
    `- Generated: ${summary.generated_at}`,
    '- Mode: read_only_replacement_source_audit',
    `- Proof hash: \`${summary.proof_hash}\``,
    `- Source JSONL: \`${summary.source_result_jsonl}\``,
    `- Result JSONL: \`${summary.result_jsonl}\``,
    '- DB writes performed: false',
    '- Storage uploads performed: false',
    '- Migrations created: false',
    '- Exact image claim changes performed: false',
    '',
    '## Counts',
    '',
    `- Total result rows: ${summary.total_result_rows}`,
    `- Replacement found rows: ${summary.replacement_found_rows}`,
    `- Replacement missing rows: ${summary.replacement_missing_rows}`,
    `- Physical replacement found rows: ${summary.physical_replacement_found_rows}`,
    `- TCG Pocket review replacement found rows: ${summary.tcg_pocket_review_replacement_found_rows}`,
    '',
    '## By Replacement Route',
    '',
    markdownTable(topEntries(summary.by_replacement_route, 30)),
    '',
    '## By Replacement Confidence',
    '',
    markdownTable(topEntries(summary.by_replacement_confidence, 30)),
    '',
    '## Top Replacement Sets',
    '',
    markdownTable(summary.replacement_by_set_code_top),
    '',
    '## Top Unresolved Sets',
    '',
    markdownTable(summary.unresolved_by_set_code_top),
    '',
    '## Policy',
    '',
    '- Read-only source replacement audit.',
    '- No uploads, database writes, migrations, deletes, merges, identity writes, or price writes.',
    '- Candidate rows require a later upload dry-run and explicit apply approval before storage or DB changes.',
    '- TCG Pocket rows are counted separately for review and should not be applied into English physical beta lanes without explicit product approval.',
  ].join('\n'));
  return summary;
}

async function main() {
  const args = parseArgs(process.argv);
  const rows = (await readJsonl(SOURCE_JSONL))
    .filter((row) => row.fetch_ok === false && row.source_lane === 'external_tcgdex')
    .slice(0, args.limit > 0 ? args.limit : undefined);
  const runStats = await processQueue(rows, args);
  const summary = await writeSummary(args, runStats);
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    proof_hash: summary.proof_hash,
    total_result_rows: summary.total_result_rows,
    replacement_found_rows: summary.replacement_found_rows,
    physical_replacement_found_rows: summary.physical_replacement_found_rows,
    tcg_pocket_review_replacement_found_rows: summary.tcg_pocket_review_replacement_found_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

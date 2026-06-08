import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';

import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAP_FACTS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pricecharting_acquisition_v1';
const CACHE_DIR = path.join(REPORT_DIR, 'cache');
const API_CACHE_DIR = path.join(REPORT_DIR, 'api_cache');
const PRICECHARTING_API_BASE_URL = 'https://www.pricecharting.com';

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_DELAY_MS = 250;
const DEFAULT_API_DELAY_MS = 1100;

const SUPPORTED_FINISH_SEARCH = new Map([
  ['reverse', ['reverse holo', 'reverse holofoil']],
  ['holo', ['holo', 'holofoil']],
  ['first_edition_holo', ['1st edition holo', 'first edition holo']],
  ['first_edition_normal', ['1st edition', 'first edition']],
  ['pokeball', ['poke ball reverse', 'pokeball reverse', 'poke ball']],
  ['masterball', ['master ball reverse', 'masterball reverse', 'master ball']],
  ['stamped', ['stamped', 'stamp']],
  ['cosmos', ['cosmos holo', 'cosmos']],
  ['cracked_ice', ['cracked ice holo', 'cracked ice']],
  ['rocket_reverse', ['rocket reverse', 'team rocket reverse']],
]);

async function loadLocalEnvFile() {
  let raw;
  try {
    raw = await fs.readFile('.env.local', 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function parseArgs(argv) {
  const options = {
    maxFacts: null,
    sets: null,
    concurrency: DEFAULT_CONCURRENCY,
    delayMs: DEFAULT_DELAY_MS,
    dryRun: false,
    refreshCache: false,
    useApi: false,
    apiOnly: false,
    apiTokenEnv: 'PRICECHARTING_API_TOKEN',
    allowInsecurePricechartingTls: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--max-facts') {
      options.maxFacts = Number(next);
      index += 1;
    } else if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
      index += 1;
    } else if (arg === '--concurrency') {
      options.concurrency = Math.max(1, Number(next));
      index += 1;
    } else if (arg === '--delay-ms') {
      options.delayMs = Math.max(0, Number(next));
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else if (arg === '--use-api') {
      options.useApi = true;
    } else if (arg === '--api-only') {
      options.useApi = true;
      options.apiOnly = true;
    } else if (arg === '--api-token-env') {
      options.apiTokenEnv = next;
      index += 1;
    } else if (arg === '--allow-insecure-pricecharting-tls') {
      options.allowInsecurePricechartingTls = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (options.useApi) {
    options.concurrency = 1;
    options.delayMs = Math.max(options.delayMs, DEFAULT_API_DELAY_MS);
  }
  return options;
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&eacute;/g, 'e')
    .replace(/&Eacute;/g, 'E')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bfemale\b/g, 'f')
    .replace(/\bmale\b/g, 'm')
    .replace(/\bnidoran f\b/g, 'nidoran')
    .replace(/\bnidoran m\b/g, 'nidoran')
    .replace(/\s+/g, ' ')
    .trim();
}

function priceChartingSetSlug(setName) {
  return String(setName ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[''.:’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function priceChartingSlug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[''.:’]/g, '')
    .replace(/#/g, ' ')
    .replace(/[\[\]]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function finishSearchLabels(finishKey) {
  return SUPPORTED_FINISH_SEARCH.get(normalizeFinishKey(finishKey)) ?? [];
}

function buildQueries(fact) {
  const labels = finishSearchLabels(fact.finish_key);
  if (labels.length === 0) return [];
  const number = normalizeNumber(fact.card_number);
  return labels.map((label) => [
    'Pokemon',
    fact.set_name,
    fact.card_name,
    number,
    label,
  ].filter(Boolean).join(' '));
}

async function fetchHtml(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Grookai Master Index Audit/1.0',
        },
        signal: AbortSignal.timeout(12000),
      });
      const html = await response.text();
      if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
      return html;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(750 * attempt);
    }
  }
  throw lastError;
}

function requestJsonWithHttps(url, redactedUrl, options) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Grookai Master Index Audit/1.0',
      },
      rejectUnauthorized: !options.allowInsecurePricechartingTls,
      timeout: 12000,
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        let payload;
        try {
          payload = JSON.parse(body);
        } catch (error) {
          reject(new Error(`JSON parse failed for ${redactedUrl}: ${error.message}`));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300 || payload?.status === 'error') {
          reject(new Error(`Fetch failed ${response.statusCode}: ${redactedUrl} ${payload?.['error-message'] ?? ''}`.trim()));
          return;
        }
        resolve(payload);
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error(`Fetch timeout: ${redactedUrl}`));
    });
    request.on('error', reject);
    request.end();
  });
}

async function fetchJson(url, redactedUrl, options, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Grookai Master Index Audit/1.0',
          },
          signal: AbortSignal.timeout(12000),
        });
        const payload = await response.json();
        if (!response.ok || payload?.status === 'error') {
          throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${redactedUrl} ${payload?.['error-message'] ?? ''}`.trim());
        }
        return payload;
      } catch (error) {
        if (!options.allowInsecurePricechartingTls || error?.cause?.code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          throw error;
        }
      }
      return await requestJsonWithHttps(url, redactedUrl, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(750 * attempt);
    }
  }
  throw lastError;
}

function cacheKeyForFact(fact) {
  return crypto.createHash('sha256').update(JSON.stringify({
    set_key: fact.set_key,
    card_number: normalizeNumber(fact.card_number),
    card_name: fact.card_name,
    finish_key: normalizeFinishKey(fact.finish_key),
  })).digest('hex');
}

async function readCachedResult(fact, options) {
  if (options.refreshCache) return null;
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${cacheKeyForFact(fact)}.json`), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeCachedResult(fact, result, options) {
  if (options.dryRun) return;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(path.join(CACHE_DIR, `${cacheKeyForFact(fact)}.json`), `${JSON.stringify(result, null, 2)}\n`);
}

async function readCachedApiResult(fact, query, options) {
  if (options.refreshCache) return null;
  try {
    const key = crypto.createHash('sha256').update(JSON.stringify({
      fact_cache_key: cacheKeyForFact(fact),
      query,
      lane: 'pricecharting_api_products_v1',
    })).digest('hex');
    const raw = await fs.readFile(path.join(API_CACHE_DIR, `${key}.json`), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeCachedApiResult(fact, query, result, options) {
  if (options.dryRun) return;
  const key = crypto.createHash('sha256').update(JSON.stringify({
    fact_cache_key: cacheKeyForFact(fact),
    query,
    lane: 'pricecharting_api_products_v1',
  })).digest('hex');
  await fs.mkdir(API_CACHE_DIR, { recursive: true });
  await fs.writeFile(path.join(API_CACHE_DIR, `${key}.json`), `${JSON.stringify(result, null, 2)}\n`);
}

async function loadCachedValidatedEvidence() {
  let entries;
  try {
    entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const rows = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(CACHE_DIR, entry.name), 'utf8');
    const normalized = normalizeCachedValidation(JSON.parse(raw));
    if (normalized.status !== 'validated') continue;
    rows.push({
      ...normalized,
      status: 'validated',
      cache_status: 'preserved_validated_cache',
    });
  }
  return rows;
}

function parsePriceChartingPage(html) {
  const title = decodeHtmlEntities(String(html).match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim();
  const canonical = decodeHtmlEntities(String(html).match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '').trim();
  const normalizeProductUrl = (url) => {
    const value = decodeHtmlEntities(url);
    if (/^https:\/\/www\.pricecharting\.com\/game\/pokemon-/i.test(value)) return value;
    if (/^\/game\/pokemon-/i.test(value)) return `https://www.pricecharting.com${value}`;
    return null;
  };
  const productMatch = [...String(html).matchAll(/href="([^"]*\/game\/pokemon-[^"]+)"/g)]
    .map((match) => normalizeProductUrl(match[1]))
    .find(Boolean);
  return {
    title,
    source_url: productMatch || canonical || null,
    canonical_url: canonical || null,
    product_url: productMatch || null,
  };
}

function parseTitle(title) {
  const match = String(title ?? '').match(/^(.*?)\s+#([^|]+?)\s+Prices\s+\|\s+Pokemon\s+(.+?)\s+\|\s+Pokemon Cards/i);
  if (!match) return null;
  const nameWithVariant = match[1].trim();
  const variantMatch = nameWithVariant.match(/^(.*?)\s+\[([^\]]+)\]$/);
  return {
    card_name: variantMatch ? variantMatch[1].trim() : nameWithVariant,
    variant_label: variantMatch ? variantMatch[2].trim() : null,
    card_number: match[2].trim(),
    set_name: match[3].trim(),
  };
}

function finishMatchesTitle(finishKey, variantLabel) {
  const label = comparable(variantLabel);
  if (!label) return false;
  const aliases = finishSearchLabels(finishKey).map(comparable);
  if (normalizeFinishKey(finishKey) === 'reverse') {
    return aliases.some((alias) => label === alias || label.includes(alias));
  }
  return aliases.some((alias) => label === alias || label.includes(alias));
}

function validateResult(fact, parsed) {
  if (!parsed?.title || !parsed?.source_url) {
    return { ok: false, reason: 'missing_title_or_url' };
  }
  const titleParts = parseTitle(parsed.title);
  if (!titleParts) return { ok: false, reason: 'title_pattern_not_supported' };
  if (/\bjumbo\b/i.test(titleParts.variant_label ?? '') || /\bjumbo\b/i.test(parsed.title)) {
    return { ok: false, reason: 'product_scope_jumbo_not_canonical_set_finish' };
  }
  const numberMatches = normalizeNumber(titleParts.card_number) === normalizeNumber(fact.card_number);
  const nameMatches = comparable(titleParts.card_name) === comparable(fact.card_name);
  const setMatches = comparable(titleParts.set_name) === comparable(fact.set_name)
    || parsed.source_url.includes(`/pokemon-${priceChartingSetSlug(fact.set_name)}/`);
  const finishMatches = finishMatchesTitle(fact.finish_key, titleParts.variant_label);
  if (!numberMatches) return { ok: false, reason: `number_mismatch:${titleParts.card_number}` };
  if (!nameMatches) return { ok: false, reason: `name_mismatch:${titleParts.card_name}` };
  if (!setMatches) return { ok: false, reason: `set_mismatch:${titleParts.set_name}` };
  if (!finishMatches) return { ok: false, reason: `finish_not_exact:${titleParts.variant_label ?? 'none'}` };
  return { ok: true, titleParts };
}

function getProductField(product, keys) {
  for (const key of keys) {
    const value = product?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return null;
}

function normalizePriceChartingSetName(value) {
  return comparable(value)
    .replace(/^pokemon\s+/, '')
    .replace(/\s+pokemon cards$/, '')
    .replace(/\s+cards$/, '')
    .trim();
}

function apiSetMatches(fact, consoleName) {
  const sourceSet = normalizePriceChartingSetName(consoleName);
  const expectedSet = normalizePriceChartingSetName(fact.set_name);
  if (!sourceSet || sourceSet === 'pokemon' || sourceSet === 'pokemon cards') return false;
  return sourceSet === expectedSet || sourceSet.includes(expectedSet) || expectedSet.includes(sourceSet);
}

function parseApiProductName(productName) {
  const value = String(productName ?? '').trim();
  const variantBeforeNumberMatch = value.match(/^(.*?)\s+\[([^\]]+)\]\s+#\s*([A-Za-z0-9./-]+)$/);
  if (variantBeforeNumberMatch) {
    return {
      card_name: variantBeforeNumberMatch[1].trim(),
      card_number: variantBeforeNumberMatch[3].trim(),
      variant_label: variantBeforeNumberMatch[2].trim(),
    };
  }
  const numberMatch = value.match(/^(.*?)\s+#\s*([A-Za-z0-9./-]+)(?:\s+\[([^\]]+)\])?/);
  if (!numberMatch) return null;
  return {
    card_name: numberMatch[1].trim(),
    card_number: numberMatch[2].trim(),
    variant_label: numberMatch[3]?.trim() ?? null,
  };
}

function priceChartingProductUrl(product, id) {
  const rawUrl = getProductField(product, ['product-url', 'productUrl', 'url', 'image-url']);
  if (/^https:\/\/www\.pricecharting\.com\/game\/pokemon-/i.test(rawUrl ?? '')) return rawUrl;
  if (/^\/game\/pokemon-/i.test(rawUrl ?? '')) return `https://www.pricecharting.com${rawUrl}`;
  const productName = getProductField(product, ['product-name', 'productName', 'name']);
  const consoleName = getProductField(product, ['console-name', 'consoleName', 'console']);
  if (/^pokemon\b/i.test(consoleName ?? '') && productName) {
    return `${PRICECHARTING_API_BASE_URL}/game/${priceChartingSlug(consoleName)}/${priceChartingSlug(productName)}`;
  }
  if (id) return `${PRICECHARTING_API_BASE_URL}/api/product?id=${encodeURIComponent(id)}`;
  return null;
}

function validateApiProduct(fact, product) {
  const productName = getProductField(product, ['product-name', 'productName', 'name']);
  const consoleName = getProductField(product, ['console-name', 'consoleName', 'console']);
  const id = getProductField(product, ['id', 'product-id', 'productId']);
  const sourceUrl = priceChartingProductUrl(product, id);
  if (!productName || !consoleName || !sourceUrl) {
    return { ok: false, reason: 'missing_api_product_name_console_or_url' };
  }
  if (/\bjumbo\b/i.test(productName)) {
    return { ok: false, reason: 'product_scope_jumbo_not_canonical_set_finish' };
  }
  const parsed = parseApiProductName(productName);
  if (!parsed) return { ok: false, reason: 'api_product_name_pattern_not_supported' };
  const numberMatches = normalizeNumber(parsed.card_number) === normalizeNumber(fact.card_number);
  const nameMatches = comparable(parsed.card_name) === comparable(fact.card_name);
  const setMatches = apiSetMatches(fact, consoleName);
  const finishMatches = finishMatchesTitle(fact.finish_key, parsed.variant_label)
    || finishSearchLabels(fact.finish_key).map(comparable).some((alias) => alias && comparable(productName).includes(alias));
  if (!numberMatches) return { ok: false, reason: `number_mismatch:${parsed.card_number}` };
  if (!nameMatches) return { ok: false, reason: `name_mismatch:${parsed.card_name}` };
  if (!setMatches) return { ok: false, reason: `set_mismatch:${consoleName}` };
  if (!finishMatches) return { ok: false, reason: `finish_not_exact:${parsed.variant_label ?? 'none'}` };
  return {
    ok: true,
    titleParts: {
      ...parsed,
      set_name: consoleName,
      pricecharting_product_id: id,
    },
    source_url: sourceUrl,
    title: `${productName} | ${consoleName}`,
  };
}

function apiProductsFromPayload(payload) {
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function tryFactViaApi(fact, options) {
  const apiToken = process.env[options.apiTokenEnv];
  const queries = buildQueries(fact);
  if (queries.length === 0) {
    return {
      status: 'skipped_unsupported_finish',
      fact,
      attempts: [],
      source_lane: 'pricecharting_api',
    };
  }
  if (!apiToken) {
    return {
      status: 'api_unavailable_missing_token',
      fact,
      attempts: queries.map((query) => ({
        query,
        source_lane: 'pricecharting_api',
        url: `${PRICECHARTING_API_BASE_URL}/api/products?q=${encodeURIComponent(query)}`,
        error: `missing_token_env:${options.apiTokenEnv}`,
      })),
      source_lane: 'pricecharting_api',
    };
  }

  const attempts = [];
  let bestContext = null;
  for (const query of queries) {
    const cached = await readCachedApiResult(fact, query, options);
    const apiUrl = new URL('/api/products', PRICECHARTING_API_BASE_URL);
    apiUrl.searchParams.set('t', apiToken);
    apiUrl.searchParams.set('q', query);
    const redactedUrl = `${PRICECHARTING_API_BASE_URL}/api/products?q=${encodeURIComponent(query)}`;
    try {
      await sleep(options.delayMs);
      const payload = cached ?? await fetchJson(apiUrl, redactedUrl, options);
      if (!cached) await writeCachedApiResult(fact, query, payload, options);
      const products = apiProductsFromPayload(payload).slice(0, 20);
      let queryContext = null;
      for (const product of products) {
        const validation = validateApiProduct(fact, product);
        attempts.push({
          query,
          url: redactedUrl,
          source_lane: 'pricecharting_api',
          cache_status: cached ? 'hit' : 'miss',
          product_id: getProductField(product, ['id', 'product-id', 'productId']),
          product_name: getProductField(product, ['product-name', 'productName', 'name']),
          console_name: getProductField(product, ['console-name', 'consoleName', 'console']),
          validation,
        });
        if (validation.ok) {
          return {
            status: 'validated',
            fact,
            query,
            search_url: redactedUrl,
            source_url: validation.source_url,
            title: validation.title,
            title_parts: validation.titleParts,
            validation_source: 'pricecharting_api_products',
            source_lane: 'pricecharting_api',
            attempts,
          };
        }
        const productTitle = `${getProductField(product, ['product-name', 'productName', 'name']) ?? ''} | ${getProductField(product, ['console-name', 'consoleName', 'console']) ?? ''}`;
        const contextValidation = titleHasExpectedFact(fact, {
          title: productTitle,
          source_url: priceChartingProductUrl(product, getProductField(product, ['id', 'product-id', 'productId'])) ?? redactedUrl,
        });
        if (!queryContext && contextValidation.ok) {
          queryContext = {
            status: 'manual_review_context',
            fact,
            query,
            search_url: redactedUrl,
            source_url: priceChartingProductUrl(product, getProductField(product, ['id', 'product-id', 'productId'])) ?? redactedUrl,
            title: productTitle,
            context_reason: 'PriceCharting API product candidate contains expected set, card number, card name, and finish, but exact product validation did not pass.',
            source_lane: 'pricecharting_api',
            attempts,
          };
        }
      }
      if (!bestContext && queryContext) bestContext = queryContext;
    } catch (error) {
      attempts.push({
        query,
        url: redactedUrl,
        source_lane: 'pricecharting_api',
        error: String(error.message ?? error),
      });
    }
  }
  if (bestContext) {
    return {
      ...bestContext,
      attempts,
    };
  }
  return {
    status: 'api_no_validated_match',
    fact,
    attempts,
    source_lane: 'pricecharting_api',
  };
}

function titleHasExpectedFact(fact, parsed) {
  if (!parsed?.title || !parsed?.source_url) {
    return { ok: false, reason: 'missing_title_or_url' };
  }
  if (/\bjumbo\b/i.test(parsed.title)) {
    return { ok: false, reason: 'product_scope_jumbo_not_canonical_set_finish' };
  }
  const title = comparable(parsed.title);
  const setName = comparable(fact.set_name);
  const cardName = comparable(fact.card_name);
  const number = comparable(normalizeNumber(fact.card_number));
  const aliases = finishSearchLabels(fact.finish_key).map(comparable);
  const setMatches = setName && title.includes(setName);
  const nameMatches = cardName && title.includes(cardName);
  const numberMatches = number && new RegExp(`(^|\\D)${number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\D|$)`).test(title);
  const finishMatches = aliases.some((alias) => alias && title.includes(alias));
  if (!setMatches) return { ok: false, reason: 'context_set_not_in_title' };
  if (!nameMatches) return { ok: false, reason: 'context_name_not_in_title' };
  if (!numberMatches) return { ok: false, reason: 'context_number_not_in_title' };
  if (!finishMatches) return { ok: false, reason: 'context_finish_not_in_title' };
  return { ok: true };
}

async function tryFact(fact, options) {
  const queries = buildQueries(fact);
  if (queries.length === 0) {
    return {
      status: 'skipped_unsupported_finish',
      fact,
      attempts: [],
    };
  }

  const attempts = [];
  let bestContext = null;
  let apiResult = null;
  if (options.useApi) {
    apiResult = await tryFactViaApi(fact, options);
    attempts.push(...(apiResult.attempts ?? []));
    if (apiResult.status === 'validated') return apiResult;
    if (options.apiOnly) return apiResult;
    if (apiResult.status === 'manual_review_context') bestContext = apiResult;
  }
  for (const query of queries) {
    const url = `https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=prices`;
    try {
      await sleep(options.delayMs);
      const html = await fetchHtml(url);
      const parsed = parsePriceChartingPage(html);
      const validation = validateResult(fact, parsed);
      const contextValidation = validation.ok ? { ok: true } : titleHasExpectedFact(fact, parsed);
      attempts.push({ query, url, parsed, validation });
      if (validation.ok) {
        return {
          status: 'validated',
          fact,
          query,
          search_url: url,
          source_url: parsed.source_url,
          title: parsed.title,
          title_parts: validation.titleParts,
          source_lane: 'pricecharting_html',
          attempts,
        };
      }
      if (parsed.product_url) {
        try {
          await sleep(options.delayMs);
          const productHtml = await fetchHtml(parsed.product_url);
          const productParsed = parsePriceChartingPage(productHtml);
          const productValidation = validateResult(fact, {
            ...productParsed,
            source_url: productParsed.source_url ?? parsed.product_url,
          });
          attempts.push({
            query,
            url: parsed.product_url,
            parsed: productParsed,
            validation: productValidation,
            source_from: 'search_result_product_link',
          });
          if (productValidation.ok) {
            return {
              status: 'validated',
              fact,
              query,
              search_url: url,
              source_url: productParsed.source_url ?? parsed.product_url,
              title: productParsed.title,
              title_parts: productValidation.titleParts,
              validation_source: 'product_link_from_search_result',
              source_lane: 'pricecharting_html',
              attempts,
            };
          }
        } catch (error) {
          attempts.push({
            query,
            url: parsed.product_url,
            error: String(error.message ?? error),
            source_from: 'search_result_product_link',
          });
        }
      }
      if (!bestContext && contextValidation.ok) {
        bestContext = {
          status: 'manual_review_context',
          fact,
          query,
          search_url: url,
          source_url: parsed.source_url,
          title: parsed.title,
          context_reason: 'PriceCharting search title contains expected set, card number, card name, and finish, but no exact product-page title pattern was validated.',
          source_lane: 'pricecharting_html',
          attempts,
        };
      }
    } catch (error) {
      attempts.push({ query, url, error: String(error.message ?? error) });
    }
  }
  if (bestContext) {
    return {
      ...bestContext,
      attempts,
    };
  }
  return {
    status: 'no_validated_match',
    fact,
    attempts,
    source_lane: 'pricecharting_html',
  };
}

function factSortKey(fact) {
  return [
    String(fact.set_key ?? ''),
    normalizeNumber(fact.card_number),
    String(fact.finish_key ?? ''),
    String(fact.card_name ?? ''),
  ].join('|');
}

async function loadTargetFacts(options) {
  const artifact = JSON.parse(await fs.readFile(GAP_FACTS_PATH, 'utf8'));
  const facts = (artifact.facts ?? [])
    .filter((fact) => fact.fact_type === 'printing_finish')
    .filter((fact) => ['candidate_unconfirmed', 'human_source_verified'].includes(fact.status))
    .filter((fact) => finishSearchLabels(fact.finish_key).length > 0)
    .filter((fact) => {
      if (!options.sets) return true;
      return options.sets.has(normalizeText(fact.set_key)) || options.sets.has(normalizeText(fact.set_name));
    })
    .sort((a, b) => factSortKey(a).localeCompare(factSortKey(b), undefined, { numeric: true }));
  return Number.isFinite(options.maxFacts) && options.maxFacts > 0 ? facts.slice(0, options.maxFacts) : facts;
}

function groupBySet(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.fact.set_key;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function evidenceRowKey(row) {
  return [
    row.source_lane ?? 'pricecharting_html',
    row.status,
    row.fact?.set_key ?? '',
    normalizeNumber(row.fact?.card_number),
    comparable(row.fact?.card_name),
    normalizeFinishKey(row.fact?.finish_key),
    row.source_url ?? '',
  ].join('|');
}

function dedupeEvidenceRows(rows) {
  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const key = evidenceRowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

async function writeFixtures(evidenceRows, retrievedAt, dryRun) {
  if (dryRun) return [];
  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(FIXTURE_DIR, { recursive: true });
  const files = [];
  for (const [setKey, rows] of groupBySet(evidenceRows).entries()) {
    const first = rows[0].fact;
    const fixture = {
      source_key: `pricecharting_${setKey}`,
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/',
      set_key: first.set_key,
      set_name: first.set_name,
      retrieved_at: retrievedAt,
      raw_snapshot_ref: `pricecharting_acquisition:${setKey}:${retrievedAt}`,
      records: rows.map((row) => ({
        source_key: row.status === 'validated'
          ? (row.source_lane === 'pricecharting_api' ? 'pricecharting_api_product' : 'pricecharting_product_page')
          : (row.source_lane === 'pricecharting_api' ? 'pricecharting_api_result_review' : 'pricecharting_search_result_review'),
        source_kind: 'marketplace_checklist',
        source_url: row.source_url,
        set_name: row.fact.set_name,
        card_number: row.fact.card_number,
        card_name: row.fact.card_name,
        finish_key: row.fact.finish_key,
        evidence_type: row.status === 'validated' ? 'finish_presence' : 'finish_context_search_title',
        evidence_label: row.status === 'validated'
          ? `${row.source_lane === 'pricecharting_api' ? 'PriceCharting API product' : 'PriceCharting product title'}: ${row.title}`
          : `${row.source_lane === 'pricecharting_api' ? 'PriceCharting API candidate' : 'PriceCharting search title'}: ${row.title}`,
        notes: row.status === 'validated'
          ? 'Exact finish evidence accepted only because PriceCharting evidence matched set, card number, card name, and finish label.'
          : 'Manual-review context only. Candidate evidence matched expected terms, but this does not promote finish truth without exact validation.',
      })),
    };
    const file = path.join(FIXTURE_DIR, `${setKey}.json`);
    await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
    files.push(file);
  }
  return files;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

function normalizeCachedValidation(result) {
  if (result?.status !== 'validated') return result;
  if (/\bjumbo\b/i.test(result.title ?? '') || /\bjumbo\b/i.test(result.title_parts?.variant_label ?? '')) {
    return {
      ...result,
      status: 'rejected_product_scope',
      rejection_reason: 'product_scope_jumbo_not_canonical_set_finish',
    };
  }
  return result;
}

function normalizeCachedContext(result) {
  if (result?.status !== 'no_validated_match') return result;
  for (const attempt of result.attempts ?? []) {
    const contextValidation = titleHasExpectedFact(result.fact, attempt.parsed);
    if (contextValidation.ok) {
      return {
        ...result,
        status: 'manual_review_context',
        query: attempt.query,
        search_url: attempt.url,
        source_url: attempt.parsed.source_url,
        title: attempt.parsed.title,
        context_reason: 'PriceCharting search title contains expected set, card number, card name, and finish, but no exact product-page title pattern was validated.',
      };
    }
  }
  return result;
}

async function writeReports({ results, fixtureFiles, generatedAt, options }) {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const apiAttempts = results.flatMap((row) => row.attempts ?? []).filter((attempt) => attempt.source_lane === 'pricecharting_api');
  const apiQueryUrls = new Set(apiAttempts.map((attempt) => attempt.url).filter((url) => url?.includes('/api/products')));
  const cachedApiQueryUrls = new Set(apiAttempts.filter((attempt) => attempt.cache_status === 'hit').map((attempt) => attempt.url).filter(Boolean));
  const payload = {
    version: 'english_master_index_pricecharting_finish_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    api_only: options.apiOnly,
    rule: 'PriceCharting evidence is accepted only when product title exactly validates set, card number, card name, and finish label.',
    context_rule: 'Search-result titles that match set, card number, card name, and finish are preserved only as manual-review context and do not become finish_presence.',
    api_rule: 'PriceCharting API evidence is optional, token-gated, redacted in reports, rate-limited to one request per second, and never allowed to reduce preserved HTML/cache evidence.',
    api: {
      enabled: options.useApi,
      token_env: options.apiTokenEnv,
      token_present: Boolean(process.env[options.apiTokenEnv]),
      rate_limit_delay_ms: options.useApi ? options.delayMs : null,
      api_cache_dir: options.dryRun ? null : API_CACHE_DIR,
      query_calls_attempted_or_cached: apiQueryUrls.size,
      cached_query_calls: cachedApiQueryUrls.size,
      product_candidates_reviewed: apiAttempts.filter((attempt) => attempt.product_id || attempt.product_name).length,
      token_redacted: true,
      tls_verification: options.allowInsecurePricechartingTls
        ? 'disabled_for_pricecharting_api_by_explicit_flag'
        : 'default_node_ca',
    },
    summary: {
      attempted_facts: results.length,
      by_status: countBy(results, (row) => row.status),
      by_source_lane_status: countBy(results, (row) => `${row.source_lane ?? 'pricecharting_html'}|${row.status}`),
      preserved_validated_cache_records: results.filter((row) => row.cache_status === 'preserved_validated_cache').length,
      validated_by_set: countBy(results.filter((row) => row.status === 'validated'), (row) => `${row.fact.set_key}|${row.fact.set_name}`),
      manual_review_context_by_set: countBy(results.filter((row) => row.status === 'manual_review_context'), (row) => `${row.fact.set_key}|${row.fact.set_name}`),
      fixture_files_written: fixtureFiles.length,
    },
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    results,
  };
  await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_finish_acquisition_v1.json'), `${JSON.stringify(payload, null, 2)}\n`);
  const statusRows = Object.entries(payload.summary.by_status).map(([status, count]) => [status, count]);
  const sourceLaneRows = Object.entries(payload.summary.by_source_lane_status).map(([status, count]) => [status, count]);
  const setRows = Object.entries(payload.summary.validated_by_set).map(([key, count]) => {
    const [setKey, setName] = key.split('|');
    return [setKey, setName, count];
  });
  const sampleRows = results.slice(0, 200).map((row) => [
    row.status,
    row.fact.set_key,
    row.fact.card_number,
    row.fact.card_name,
    row.fact.finish_key,
    row.source_url ?? '',
    row.attempts?.at(-1)?.validation?.reason ?? '',
  ]);
  const contextRows = Object.entries(payload.summary.manual_review_context_by_set).map(([key, count]) => {
    const [setKey, setName] = key.split('|');
    return [setKey, setName, count];
  });
  const markdown = [
    '# PriceCharting Finish Acquisition V1',
    '',
    'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Summary',
    '',
    `API enabled: ${payload.api.enabled}`,
    `API token env: ${payload.api.token_env}`,
    `API token present: ${payload.api.token_present}`,
    `API token redacted: ${payload.api.token_redacted}`,
    `API rate limit delay ms: ${payload.api.rate_limit_delay_ms ?? ''}`,
    '',
    markdownTable(['status', 'count'], statusRows),
    '',
    '## Source Lane Status',
    '',
    markdownTable(['source_lane_status', 'count'], sourceLaneRows),
    '',
    '## Validated By Set',
    '',
    markdownTable(['set_key', 'set_name', 'validated finish facts'], setRows),
    '',
    '## Manual Review Context By Set',
    '',
    'These rows are preserved as evidence context only. They do not promote finish truth.',
    '',
    markdownTable(['set_key', 'set_name', 'context facts'], contextRows),
    '',
    '## Sample Attempts',
    '',
    markdownTable(['status', 'set', 'number', 'name', 'finish', 'source_url', 'reason'], sampleRows),
    '',
  ].join('\n');
  await fs.writeFile(path.join(REPORT_DIR, 'pricecharting_finish_acquisition_v1.md'), markdown);
  return payload;
}

async function main() {
  await loadLocalEnvFile();
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const facts = await loadTargetFacts(options);
  const priorValidatedEvidence = await loadCachedValidatedEvidence();
  console.log(`[pricecharting] target facts ${facts.length}`);
  const results = await mapWithConcurrency(facts, options.concurrency, async (fact, index) => {
    if ((index + 1) % 25 === 0 || index === 0) {
      console.log(`[pricecharting] ${index + 1}/${facts.length} ${fact.set_key} ${fact.card_number} ${fact.card_name} ${fact.finish_key}`);
    }
    const cached = options.useApi ? null : await readCachedResult(fact, options);
    if (cached) return { ...cached, cache_status: 'hit' };
    const result = await tryFact(fact, options);
    await writeCachedResult(fact, result, options);
    return { ...result, cache_status: 'miss' };
  });
  const normalizedResults = results.map(normalizeCachedValidation);
  const contextNormalizedResults = normalizedResults.map(normalizeCachedContext);
  const cachedValidatedEvidence = await loadCachedValidatedEvidence();
  const allResults = dedupeEvidenceRows([...contextNormalizedResults, ...priorValidatedEvidence, ...cachedValidatedEvidence]);
  const validated = allResults.filter((row) => row.status === 'validated');
  const manualReviewContext = allResults.filter((row) => row.status === 'manual_review_context');
  const fixtureFiles = await writeFixtures([...validated, ...manualReviewContext], generatedAt, options.dryRun);
  const report = await writeReports({ results: allResults, fixtureFiles, generatedAt, options });
  console.log(`[pricecharting] validated ${validated.length}`);
  console.log(`[pricecharting] manual review context ${manualReviewContext.length}`);
  console.log(`[pricecharting] wrote report to ${REPORT_DIR}`);
  console.log(`[pricecharting] fixtures ${report.summary.fixture_files_written}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

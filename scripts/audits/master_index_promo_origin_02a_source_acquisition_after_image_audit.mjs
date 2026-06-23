import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_promo_origin_v1');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'master_index_promo_origin_02a_source_acquisition_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'master_index_promo_origin_02a_source_acquisition_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'master_index_promo_origin_02a_source_acquisition_summary_v1.md');
const PACKAGE_ID = 'MASTER-INDEX-PROMO-ORIGIN-02A-SOURCE-ACQUISITION-AFTER-IMAGE-AUDIT';
const USER_AGENT = 'Grookai Master Index Promo Origin Audit/1.0 (read-only source acquisition)';

function parseArgs(argv) {
  const args = {
    resume: true,
    rowLimit: Number.parseInt(process.env.PROMO_ORIGIN_ROW_LIMIT ?? '0', 10),
    concurrency: Number.parseInt(process.env.PROMO_ORIGIN_CONCURRENCY ?? '2', 10),
    delayMs: Number.parseInt(process.env.PROMO_ORIGIN_DELAY_MS ?? '750', 10),
    timeoutMs: Number.parseInt(process.env.PROMO_ORIGIN_TIMEOUT_MS ?? '30000', 10),
    maxHours: Number.parseFloat(process.env.PROMO_ORIGIN_MAX_HOURS ?? '8'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--no-resume') args.resume = false;
    else if (arg === '--row-limit') args.rowLimit = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--concurrency') args.concurrency = Number.parseInt(argv[++index] ?? '2', 10);
    else if (arg === '--delay-ms') args.delayMs = Number.parseInt(argv[++index] ?? '750', 10);
    else if (arg === '--timeout-ms') args.timeoutMs = Number.parseInt(argv[++index] ?? '30000', 10);
    else if (arg === '--max-hours') args.maxHours = Number.parseFloat(argv[++index] ?? '8');
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.concurrency = Math.max(1, Math.min(args.concurrency || 2, 4));
  args.delayMs = Math.max(250, args.delayMs || 750);
  args.timeoutMs = Math.max(5000, args.timeoutMs || 30000);
  args.maxHours = Math.max(0.05, args.maxHours || 8);
  return args;
}

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/pokemon/g, 'pokemon')
    .replace(/&/g, ' and ')
    .replace(/['`"._]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function promoFamily(row) {
  const setCode = String(row.set_code ?? '').toLowerCase();
  const setName = normalizeText(row.set_name);
  const variant = normalizeText(row.variant_key);
  const modifier = normalizeText(row.printed_identity_modifier);
  const haystack = `${setCode} ${setName} ${variant} ${modifier}`;

  if (setCode === 'basep') return { key: 'wizards_black_star_promos', label: 'Wizards Black Star Promos' };
  if (setCode === 'np') return { key: 'nintendo_black_star_promos', label: 'Nintendo Black Star Promos' };
  if (setCode === 'dpp') return { key: 'dp_black_star_promos', label: 'DP Black Star Promos' };
  if (setCode === 'hsp' || setCode === 'hgssp') return { key: 'hgss_black_star_promos', label: 'HGSS Black Star Promos' };
  if (setCode === 'bwp') return { key: 'bw_black_star_promos', label: 'BW Black Star Promos' };
  if (setCode === 'xyp') return { key: 'xy_black_star_promos', label: 'XY Black Star Promos' };
  if (setCode === 'smp' || setCode === 'sma') return { key: 'sm_black_star_promos', label: 'SM Black Star Promos' };
  if (setCode === 'swshp') return { key: 'swsh_black_star_promos', label: 'Sword & Shield Black Star Promos' };
  if (setCode === 'svp') return { key: 'sv_black_star_promos', label: 'Scarlet & Violet Black Star Promos' };
  if (/^pop\d+$/.test(setCode)) return { key: 'pop_series', label: 'POP Series Organized Play' };
  if (/^mcd\d+|^\d{4}(bw|xy|sm|swsh|sv)$/.test(setCode) || setName.includes('mcdonald')) return { key: 'mcdonalds_promo', label: "McDonald's promotional collection" };
  if (setCode === 'mep') return { key: 'mega_evolution_promos', label: 'Mega Evolution Promos' };
  if (setCode === 'bp') return { key: 'best_of_game', label: 'Best of Game promos' };
  if (haystack.includes('prerelease') || haystack.includes('staff')) return { key: 'prerelease_or_staff_stamp', label: 'Prerelease or Staff stamped promo' };
  if (haystack.includes('promo')) return { key: 'promo_marked_variant', label: 'Promo-marked variant' };
  return { key: 'promo_like_manual_review', label: 'Promo-like row needing source review' };
}

function likelyDistribution(row, family) {
  if (family.key === 'pop_series') return 'Pokemon Organized Play booster/reward packs.';
  if (family.key === 'mcdonalds_promo') return "McDonald's restaurant promotion collection.";
  if (family.key.includes('black_star_promos')) return 'Black Star promo release lane; exact product/event origin requires card-level evidence.';
  if (family.key === 'prerelease_or_staff_stamp') return 'Prerelease event or staff distribution; exact event/product evidence required.';
  if (family.key === 'mega_evolution_promos') return 'Mega Evolution promo lane; product/event origin requires card-level evidence.';
  if (family.key === 'best_of_game') return 'Best of Game promotional program.';
  return 'Distribution origin requires source acquisition.';
}

function buildQueries(row, family) {
  const name = clean(row.name) ?? '';
  const number = clean(row.number) ?? '';
  const setName = clean(row.set_name) ?? clean(row.set_code) ?? '';
  const queries = [
    `${name} ${number} ${setName}`,
    `${name} ${number} ${family.label}`,
  ];
  if (family.key.includes('black_star_promos')) queries.push(`${name} ${number} Black Star Promo Bulbapedia`);
  if (family.key === 'pop_series') queries.push(`${name} ${number} POP Series Bulbapedia`);
  if (family.key === 'mcdonalds_promo') queries.push(`${name} ${number} McDonald's Pokemon card`);
  return Array.from(new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()).filter(Boolean))).slice(0, 3);
}

async function fetchJson(url, timeoutMs) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': USER_AGENT, accept: 'application/json,text/html;q=0.8,*/*;q=0.5' },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`http_${response.status}:${text.slice(0, 120)}`);
  }
  return JSON.parse(text);
}

async function bulbapediaSearch(query, timeoutMs) {
  const url = new URL('https://bulbapedia.bulbagarden.net/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', '5');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  try {
    const json = await fetchJson(url.toString(), timeoutMs);
    return {
      ok: true,
      source: 'bulbapedia_search_api',
      query,
      url: url.toString(),
      results: (json.query?.search ?? []).map((entry) => ({
        title: entry.title,
        pageid: entry.pageid,
        snippet: stripHtml(entry.snippet),
      })),
    };
  } catch (error) {
    return {
      ok: false,
      source: 'bulbapedia_search_api',
      query,
      url: url.toString(),
      error: error instanceof Error ? error.message : String(error),
      results: [],
    };
  }
}

async function queryPromoRows(limit) {
  const connectionString = dbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('set default_transaction_read_only = on');
  try {
    const result = await client.query(`
      select
        cp.id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        s.release_date,
        cp.number,
        cp.number_plain,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.external_ids,
        cp.tcgplayer_id,
        coalesce(
          jsonb_agg(
            distinct jsonb_build_object(
              'source', em.source,
              'external_id', em.external_id,
              'meta', em.meta
            )
          ) filter (where em.active = true),
          '[]'::jsonb
        ) as external_mappings
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      left join public.external_mappings em on em.card_print_id = cp.id
      where coalesce(cp.variant_key,'') ilike '%promo%'
         or coalesce(cp.rarity,'') ilike '%promo%'
         or coalesce(cp.set_code,'') ilike '%promo%'
         or coalesce(cp.printed_identity_modifier,'') ilike '%promo%'
         or cp.set_code in ('basep','bwp','xyp','sma','smp','swshp','svp','dpp','hsp','hgssp','pop1','pop2','pop3','pop4','pop5','pop6','pop7','pop8','pop9','mep','np','bp')
      group by cp.id, s.name, s.release_date
      order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name, cp.id
      ${limit > 0 ? 'limit $1' : ''}
    `, limit > 0 ? [limit] : []);
    return result.rows;
  } finally {
    await client.end();
  }
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
        // Ignore partial interrupted writes.
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return completed;
}

async function appendJsonl(row) {
  await fs.appendFile(RESULT_JSONL, `${JSON.stringify(row)}\n`, 'utf8');
}

async function processRow(row, args) {
  const family = promoFamily(row);
  const queries = buildQueries(row, family);
  const evidence = [];
  for (const query of queries) {
    evidence.push(await bulbapediaSearch(query, args.timeoutMs));
    await sleep(args.delayMs);
  }
  const okSearches = evidence.filter((entry) => entry.ok);
  const resultCount = evidence.reduce((sum, entry) => sum + entry.results.length, 0);
  const confidence = resultCount >= 3 ? 'source_candidates_found' : resultCount > 0 ? 'thin_source_candidates' : 'manual_review_no_search_hits';
  const auditKey = `${row.id}:${sha256Hex(`${row.gv_id ?? ''}:${row.set_code ?? ''}:${row.number ?? ''}`).slice(0, 16)}`;

  return {
    audit_key: auditKey,
    package_id: PACKAGE_ID,
    checked_at: new Date().toISOString(),
    card_print_id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    release_date: row.release_date,
    number: row.number,
    number_plain: row.number_plain,
    rarity: row.rarity,
    variant_key: row.variant_key,
    printed_identity_modifier: row.printed_identity_modifier,
    external_ids: row.external_ids,
    tcgplayer_id: row.tcgplayer_id,
    external_mappings: row.external_mappings,
    proposed_promo_family: family,
    proposed_distribution_summary: likelyDistribution(row, family),
    proposed_public_copy_draft: `${row.name} ${row.set_name ?? row.set_code ?? 'promo'} #${row.number ?? 'unknown'} is in the ${family.label} lane. ${likelyDistribution(row, family)}`,
    confidence,
    source_queries: queries,
    source_acquisition: evidence,
    successful_source_queries: okSearches.length,
    source_candidate_count: resultCount,
    db_writes_performed: false,
    migrations_created: false,
  };
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function markdownTable(entries) {
  if (entries.length === 0) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...entries.map(([key, count]) => `| ${String(key).replace(/\|/g, '\\|')} | ${count} |`),
  ].join('\n');
}

async function readAllResults() {
  try {
    const raw = await fs.readFile(RESULT_JSONL, 'utf8');
    return raw
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeSummary({ args, startedAt, endedAt, endReason, queriedRows, skippedRows, processedRows }) {
  const rows = await readAllResults();
  const summary = {
    package_id: PACKAGE_ID,
    mode: 'read_only_source_acquisition',
    started_at: startedAt,
    ended_at: endedAt,
    end_reason: endReason,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    image_writes_performed: false,
    args,
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    queried_promo_rows: queriedRows.length,
    skipped_already_completed_this_run: skippedRows,
    processed_this_run: processedRows.length,
    total_result_rows: rows.length,
    by_family: countBy(rows, (row) => row.proposed_promo_family?.key),
    by_confidence: countBy(rows, (row) => row.confidence),
    by_set_code: countBy(rows, (row) => row.set_code),
    source_candidate_rows: rows.filter((row) => Number(row.source_candidate_count ?? 0) > 0).length,
    manual_review_rows: rows.filter((row) => row.confidence === 'manual_review_no_search_hits').length,
    sample_manual_review: rows
      .filter((row) => row.confidence === 'manual_review_no_search_hits')
      .slice(0, 50)
      .map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        family: row.proposed_promo_family?.key,
      })),
  };
  summary.proof_hash = proofHash({
    package_id: summary.package_id,
    total_result_rows: summary.total_result_rows,
    by_family: summary.by_family,
    by_confidence: summary.by_confidence,
    by_set_code: summary.by_set_code,
    source_candidate_rows: summary.source_candidate_rows,
    manual_review_rows: summary.manual_review_rows,
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.ended_at}
- Mode: ${summary.mode}
- Proof hash: \`${summary.proof_hash}\`
- Result JSONL: \`${summary.result_jsonl}\`
- DB writes performed: ${summary.db_writes_performed}
- Migrations created: ${summary.migrations_created}
- Image writes performed: ${summary.image_writes_performed}
- End reason: ${summary.end_reason}

## Counts

- Queried promo rows: ${summary.queried_promo_rows}
- Processed this run: ${summary.processed_this_run}
- Total result rows: ${summary.total_result_rows}
- Rows with source candidates: ${summary.source_candidate_rows}
- Manual review rows: ${summary.manual_review_rows}

## Promo Families

${markdownTable(Object.entries(summary.by_family))}

## Confidence

${markdownTable(Object.entries(summary.by_confidence))}

## Policy

- Read-only source acquisition.
- No database writes.
- No migrations.
- No image changes.
- Public copy is draft only and requires a later reviewed apply path.
`, 'utf8');
  return summary;
}

async function main() {
  const args = parseArgs(process.argv);
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + args.maxHours * 60 * 60 * 1000;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const completed = args.resume ? await loadCompletedKeys() : new Set();
  const queriedRows = await queryPromoRows(args.rowLimit);
  const withKeys = queriedRows.map((row) => ({
    ...row,
    audit_key: `${row.id}:${sha256Hex(`${row.gv_id ?? ''}:${row.set_code ?? ''}:${row.number ?? ''}`).slice(0, 16)}`,
  }));
  const queue = withKeys.filter((row) => !completed.has(row.audit_key));
  const skippedRows = withKeys.length - queue.length;
  const processedRows = [];
  let cursor = 0;
  let endReason = 'queue_exhausted';

  async function worker() {
    while (cursor < queue.length) {
      if (Date.now() > deadline) {
        endReason = 'max_hours_reached';
        return;
      }
      const index = cursor;
      cursor += 1;
      const row = queue[index];
      const result = await processRow(row, args);
      processedRows.push(result);
      await appendJsonl(result);
      if (processedRows.length % 25 === 0) {
        console.log(JSON.stringify({
          package_id: PACKAGE_ID,
          processed_this_run: processedRows.length,
          remaining_this_run: queue.length - cursor,
          latest_gv_id: result.gv_id,
          latest_confidence: result.confidence,
        }));
      }
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));
  const endedAt = new Date().toISOString();
  const summary = await writeSummary({ args, startedAt, endedAt, endReason, queriedRows: withKeys, skippedRows, processedRows });
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    result_jsonl: path.relative(ROOT, RESULT_JSONL),
    proof_hash: summary.proof_hash,
    processed_this_run: summary.processed_this_run,
    total_result_rows: summary.total_result_rows,
    manual_review_rows: summary.manual_review_rows,
    end_reason: summary.end_reason,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

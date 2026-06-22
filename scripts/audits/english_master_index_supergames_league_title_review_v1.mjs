import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const CATEGORY_URL = 'https://www.supergamesinc.com/catalog/pokemon_singles-pokemon_league__championship_cards/5846';
const QUEUE_PATH = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json',
);
const OUT_DIR = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/supergames_league_title_review_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'supergames_league_title_review_v1.json');
const OUT_MD = path.join(OUT_DIR, 'supergames_league_title_review_v1.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&raquo;/g, '»')
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '-');
}

function stripTags(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function comparable(value) {
  return decodeHtml(value)
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, (m) => m.replace(/[\[\]]/g, ' '))
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(g|gl|fb|c|ex|lv x)\b/g, (m) => m.trim())
    .replace(/\s+/g, ' ')
    .trim();
}

function numberComparable(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^0+/, '')
    .trim();
}

function inferFinish(title) {
  const c = comparable(title);
  if (c.includes('reverse holo')) return { finish_key: 'reverse', confidence: 'explicit_active_finish' };
  if (c.includes('non holo') || c.includes('regular')) return { finish_key: 'normal', confidence: 'explicit_active_finish' };
  if (c.includes('holo')) return { finish_key: 'holo', confidence: 'holo_pattern_needs_adjudication' };
  return { finish_key: null, confidence: 'finish_not_present_in_title' };
}

function stampCompatible(row, title) {
  const c = comparable(title);
  const stamp = comparable(row.stamp_label || row.variant_key);
  if (stamp.includes('league cup staff')) return c.includes('league cup') && c.includes('staff');
  if (stamp.includes('staff')) return c.includes('staff');
  if (stamp.includes('league')) {
    return (c.includes('league promo') || c.includes('pokemon league') || c.includes('league stamped')) && !c.includes('staff');
  }
  return c.includes(stamp);
}

function parseTitle(title) {
  const clean = stripTags(title);
  const match = clean.match(/^(?<name>.+?)\s+-\s+(?<number>[A-Za-z0-9]+[a-z]?)\/(?<total>[A-Za-z0-9]+[a-z]?)(?:\s+-\s+(?<rest>.+))?$/i);
  if (!match) return null;
  return {
    title: clean,
    card_name: match.groups.name.trim(),
    card_number: match.groups.number.trim(),
    set_total: match.groups.total.trim(),
    title_tail: (match.groups.rest || '').trim(),
  };
}

function extractProducts(html) {
  const products = new Map();
  const anchorRegex = /<a[^>]+href="(?<href>[^"]+)"[^>]*>(?<body>.*?)<\/a>/gis;
  for (const match of html.matchAll(anchorRegex)) {
    const href = decodeHtml(match.groups.href);
    if (!href.includes('/catalog/pokemon_singles-pokemon_league__championship_cards/')) continue;
    if (!/\/\d+$/.test(href)) continue;
    const text = stripTags(match.groups.body);
    if (!text || text.length < 8) continue;
    const url = href.startsWith('http') ? href : `https://www.supergamesinc.com${href}`;
    products.set(`${url}|${text}`, { source_url: url, title: text });
  }
  return [...products.values()];
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiSourceAudit/1.0 (+audit-only; no purchase automation)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } catch (error) {
    const script = [
      '$ProgressPreference = "SilentlyContinue";',
      `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;`,
      `$r = Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -TimeoutSec 30;`,
      '$r.Content',
    ].join(' ');
    try {
      return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch (fallbackError) {
      throw new Error(`${error.message}; powershell_fallback_failed:${fallbackError.status ?? 'unknown'}`);
    }
  }
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function mdTable(rows, columns) {
  if (!rows.length) return '_None._\n';
  return [
    `| ${columns.map((c) => c.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((c) => String(c.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n') + '\n';
}

const queue = readJson(QUEUE_PATH);
const targetRows = (queue.rows || queue.queue || queue.items || []).filter(
  (row) => row.action_bucket === 'league_finish_exact_source',
);

const pages = [];
for (let page = 1; page <= 5; page += 1) {
  const url = page === 1 ? CATEGORY_URL : `${CATEGORY_URL}?page=${page}&sort_by_price=0`;
  try {
    const html = await fetchText(url);
    pages.push({ page, url, status: 'fetched', products: extractProducts(html) });
  } catch (error) {
    pages.push({ page, url, status: `fetch_failed:${error.message}`, products: [] });
  }
}

const products = pages.flatMap((page) => page.products.map((product) => ({ ...product, page: page.page })));
const parsedProducts = products.map((product) => ({ ...product, parsed: parseTitle(product.title), finish: inferFinish(product.title) }));

const results = [];
for (const product of parsedProducts) {
  if (!product.parsed) {
    results.push({
      status: 'blocked_unparseable_product_title',
      source_url: product.source_url,
      source_title: product.title,
      page: product.page,
    });
    continue;
  }

  const nameKey = comparable(product.parsed.card_name);
  const numberKey = numberComparable(product.parsed.card_number);
  const rowMatches = targetRows.filter((row) => {
    return comparable(row.card_name) === nameKey
      && numberComparable(row.card_number) === numberKey
      && stampCompatible(row, product.title);
  });

  if (rowMatches.length === 0) {
    results.push({
      status: 'blocked_no_current_queue_match',
      source_url: product.source_url,
      source_title: product.title,
      parsed: product.parsed,
      source_finish_key: product.finish.finish_key,
      source_finish_confidence: product.finish.confidence,
      page: product.page,
    });
    continue;
  }

  if (rowMatches.length > 1) {
    results.push({
      status: 'blocked_ambiguous_current_queue_match',
      source_url: product.source_url,
      source_title: product.title,
      parsed: product.parsed,
      source_finish_key: product.finish.finish_key,
      source_finish_confidence: product.finish.confidence,
      matched_rows: rowMatches.map((row) => ({
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        stamp_label: row.stamp_label,
      })),
      page: product.page,
    });
    continue;
  }

  const [row] = rowMatches;
  const status = product.finish.confidence === 'explicit_active_finish'
    ? 'review_exact_title_active_finish_missing_explicit_set_name'
    : 'blocked_title_finish_not_active_finish_proof';
  results.push({
    status,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    source_url: product.source_url,
    source_title: product.title,
    source_finish_key: product.finish.finish_key,
    source_finish_confidence: product.finish.confidence,
    evidence_label: `Super Games product title: ${product.title}`,
    notes: status === 'review_exact_title_active_finish_missing_explicit_set_name'
      ? 'Product title proves name, card number, stamp family, and active finish, but does not consistently name the set; keep as review evidence until set binding is adjudicated.'
      : 'Product title does not prove active finish safely enough for Master Index promotion.',
    page: product.page,
  });
}

const reviewRows = results.filter((row) => row.status === 'review_exact_title_active_finish_missing_explicit_set_name');
const packet = {
  version: 'supergames_league_title_review_v1',
  generated_at: new Date().toISOString(),
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_key: 'supergames_league_championship_titles',
  source_kind: 'marketplace_checklist',
  source_url: CATEGORY_URL,
  rule:
    'Super Games product titles may be used as review evidence only unless the title/page proves exact set + card number + card name + stamp/variant + active finish.',
  target_rows: targetRows.length,
  pages: pages.map((page) => ({ page: page.page, url: page.url, status: page.status, product_count: page.products.length })),
  products_loaded: products.length,
  parsed_products: parsedProducts.filter((product) => product.parsed).length,
  review_rows: reviewRows.length,
  summary: {
    by_status: countBy(results, (row) => row.status),
    review_by_set: countBy(reviewRows, (row) => `${row.set_key}|${row.set_name}`),
    review_by_finish: countBy(reviewRows, (row) => row.source_finish_key),
  },
  review_rows_detail: reviewRows,
  blocked_title_finish_not_active_finish_proof: results.filter(
    (row) => row.status === 'blocked_title_finish_not_active_finish_proof',
  ),
  blocked_no_current_queue_match_with_explicit_finish: results.filter(
    (row) => row.status === 'blocked_no_current_queue_match' && row.source_finish_confidence === 'explicit_active_finish',
  ),
  blocked_sample: results.filter((row) => row.status !== 'review_exact_title_active_finish_missing_explicit_set_name').slice(0, 75),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(packet, null, 2) + '\n');

const md = `# Super Games League Title Review V1

Generated: ${packet.generated_at}

This is audit-only source acquisition. It does not create fixtures, write-ready rows, DB writes, migrations, cleanup, or quarantine.

## Summary

- Target current queue rows: ${packet.target_rows}
- Products loaded: ${packet.products_loaded}
- Parsed product titles: ${packet.parsed_products}
- Review rows with explicit active finish but missing explicit set name: ${packet.review_rows}
- db_writes_performed: false
- migrations_created: false

## Rule

${packet.rule}

## Review Rows

${mdTable(packet.review_rows_detail, [
  { label: 'Set', value: (row) => `${row.set_key} / ${row.set_name}` },
  { label: 'Card', value: (row) => `${row.card_number} ${row.card_name}` },
  { label: 'Stamp', value: (row) => row.stamp_label },
  { label: 'Finish', value: (row) => row.source_finish_key },
  { label: 'Evidence', value: (row) => row.source_title },
  { label: 'URL', value: (row) => row.source_url },
])}

## Status Counts

${mdTable(Object.entries(packet.summary.by_status).map(([status, count]) => ({ status, count })), [
  { label: 'Status', value: (row) => row.status },
  { label: 'Rows', value: (row) => row.count },
])}
`;

fs.writeFileSync(OUT_MD, md);

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUT_JSON),
  output_md: path.relative(ROOT, OUT_MD),
  target_rows: packet.target_rows,
  products_loaded: packet.products_loaded,
  review_rows: packet.review_rows,
  by_status: packet.summary.by_status,
}, null, 2));

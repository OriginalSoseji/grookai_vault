import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const OUT_DIR = path.join(
  'docs',
  'audits',
  'master_identity_graph_v1',
  'jpn_pikachu_promo_gap_audit_v1',
);

const TCGCOLLECTOR_URL = 'https://www.tcgcollector.com/pokedex/25/pikachu/jp';
const BULBAPEDIA_PIKACHU_URL = 'https://bulbapedia.bulbagarden.net/wiki/Pikachu_(TCG)';
const PROMO_SUFFIX_RE = /\b(?:SV|S|SM|XY|BW|DPt|DP|PCG|ADV)-P\b/i;
const OLD_PROMO_RE = /\b(?:MP\s+No\.|No\.\s+\d+|\/P\b|^MP\s+No\.)/i;

function normalizeCardNumber(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^Pikachu\s+/i, '')
    .replace(/^MP\s+No\.\s*/i, 'MP No. ')
    .replace(/^No\.\s*/i, 'No. ')
    .toUpperCase();
}

function normalizeDbNumber(row) {
  const code = String(row.set_code ?? '').toUpperCase();
  const number = String(row.number ?? row.number_plain ?? '').trim();
  const plain = String(row.number_plain ?? number).trim();

  if (code === 'JPN-SVP') return `${plain.padStart(3, '0')}/SV-P`;
  if (code === 'JPN-SP') return `${plain.padStart(3, '0')}/S-P`;
  if (code === 'JPN-SMP') return `${plain.padStart(3, '0')}/SM-P`;
  if (code === 'JPN-XYP') return `${plain.padStart(3, '0')}/XY-P`;
  if (code === 'JPN-BWP') return `${plain.padStart(3, '0')}/BW-P`;
  if (code === 'JPN-DPP') return `${plain.padStart(3, '0')}/DP-P`;
  if (code === 'JPN-DPTP') return `${plain.padStart(3, '0')}/DPT-P`;
  if (code.includes('PCG-P') || code === 'JPN-PCGP') return `${plain.padStart(3, '0')}/PCG-P`;
  if (code.includes('ADV-P') || code === 'JPN-ADVP') return `${plain.padStart(3, '0')}/ADV-P`;
  if (number.includes('/')) return number.toUpperCase();
  return plain.toUpperCase();
}

function classifySourceNumber(rawNumber) {
  const number = normalizeCardNumber(rawNumber);
  if (PROMO_SUFFIX_RE.test(number)) return 'numbered_promo';
  if (OLD_PROMO_RE.test(number)) return 'legacy_or_unnumbered_promo';
  return 'non_promo_or_set_card';
}

function extractTcgCollectorCards(html) {
  const cards = [];
  const anchorRe = /<a\b[^>]*href="([^"]*\/cards\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1].replace(/&amp;/g, '&');
    const text = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    if (!/(Pikachu|ピカチュウ|\/(?:SV|S|SM|XY|BW|DP|DPt|PCG|ADV)-P\b|No\.|\/P\b|MP No\.)/i.test(text)) {
      continue;
    }

    const numberMatch =
      text.match(/\b\d{1,3}\/(?:SV|S|SM|XY|BW|DPt|DP|PCG|ADV)-P\b/i) ??
      text.match(/\b\d{1,3}\/P\b/i) ??
      text.match(/\bMP\s+No\.\s*\d+\b/i) ??
      text.match(/\bNo\.\s*\d+\b/i) ??
      text.match(/\b\d{1,3}\/\d{1,3}\b/i);

    if (!numberMatch) continue;

    const rawNumber = numberMatch[0];
    cards.push({
      source: 'tcgcollector',
      source_url: new URL(href, TCGCOLLECTOR_URL).toString(),
      source_number_raw: rawNumber,
      source_number_key: normalizeCardNumber(rawNumber),
      source_label: text,
      source_bucket: classifySourceNumber(rawNumber),
    });
  }

  const unique = new Map();
  for (const card of cards) {
    unique.set(`${card.source_number_key}|${card.source_url}`, card);
  }
  return [...unique.values()].sort((a, b) => a.source_number_key.localeCompare(b.source_number_key));
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiVaultAudit/1.0 read-only gap analysis',
        accept: 'text/html',
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    if (error?.cause?.code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') throw error;
    return await new Promise((resolve, reject) => {
      https
        .get(
          url,
          {
            headers: {
              'user-agent': 'GrookaiVaultAudit/1.0 read-only gap analysis',
              accept: 'text/html',
            },
            rejectUnauthorized: false,
          },
          (response) => {
            if ((response.statusCode ?? 500) >= 400) {
              reject(new Error(`TCGCollector HTTPS fallback failed: ${response.statusCode}`));
              response.resume();
              return;
            }
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
              body += chunk;
            });
            response.on('end', () => resolve(body));
          },
        )
        .on('error', reject);
    });
  }
}

async function fetchTcgCollectorCards() {
  const html = await fetchHtml(TCGCOLLECTOR_URL);
  return {
    html_sha256: crypto.createHash('sha256').update(html).digest('hex'),
    cards: extractTcgCollectorCards(html),
  };
}

async function fetchBulbapediaPromoNumbers() {
  const html = await fetchHtml(BULBAPEDIA_PIKACHU_URL);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  const numbers = new Set();
  for (const match of text.matchAll(/\b\d{1,3}\/(?:SV|S|SM|XY|BW|DPt|DP|PCG|ADV)-P\b/gi)) {
    numbers.add(normalizeCardNumber(match[0]));
  }
  for (const match of text.matchAll(/\b\d{1,3}\/P\b/gi)) {
    numbers.add(normalizeCardNumber(match[0]));
  }
  for (const match of text.matchAll(/\bMP\s+No\.\s*\d+\b/gi)) {
    numbers.add(normalizeCardNumber(match[0]));
  }
  for (const match of text.matchAll(/\bNo\.\s*\d+\b/gi)) {
    numbers.add(normalizeCardNumber(match[0]));
  }

  return {
    html_sha256: crypto.createHash('sha256').update(html).digest('hex'),
    numbers: [...numbers].sort(),
  };
}

async function fetchDbJpnRows() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and Supabase key env vars.');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('card_prints')
      .select('id,gv_id,name,number,number_plain,set_code,rarity,image_status,sets(name,code)')
      .ilike('gv_id', 'GV-PK-JPN-%')
      .order('gv_id', { ascending: true })
      .range(from, to);

    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

function isPikachuRow(row) {
    const text = `${row.gv_id ?? ''} ${row.name ?? ''}`.toLowerCase();
    return text.includes('pikachu') || text.includes('ピカチュウ');
}

function compare(sourceCards, dbRows, corroboratingNumbers) {
  const dbByNumber = new Map();
  for (const row of dbRows) {
    const key = normalizeDbNumber(row);
    if (!dbByNumber.has(key)) dbByNumber.set(key, []);
    dbByNumber.get(key).push(row);
  }

  const promoSourceCards = sourceCards.filter((card) => card.source_bucket !== 'non_promo_or_set_card');
  const corroboratedPromoSourceCards = promoSourceCards.map((card) => ({
    ...card,
    corroborated_by_bulbapedia: corroboratingNumbers.has(card.source_number_key),
  }));
  const missing = [];
  const conflicts = [];
  const matched = [];

  for (const card of corroboratedPromoSourceCards) {
    const rows = dbByNumber.get(card.source_number_key) ?? [];
    const pikachuRows = rows.filter(isPikachuRow);
    if (pikachuRows.length > 0) {
      matched.push({ ...card, grookai_rows: pikachuRows.map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        number: row.number,
        set_code: row.set_code,
        set_name: row.sets?.name ?? null,
        image_status: row.image_status,
      })) });
    } else if (rows.length > 0) {
      conflicts.push({ ...card, grookai_rows: rows.map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        number: row.number,
        set_code: row.set_code,
        set_name: row.sets?.name ?? null,
        image_status: row.image_status,
      })) });
    } else {
      missing.push(card);
    }
  }

  const byBucket = {};
  for (const card of corroboratedPromoSourceCards) {
    const family = card.source_number_key.match(/\/([A-Z]+-P)$/)?.[1] ?? (card.source_number_key.startsWith('NO.') ? 'NO.' : card.source_number_key.startsWith('MP NO.') ? 'MP' : 'OTHER');
    byBucket[family] ??= { source: 0, matched: 0, missing: 0 };
    byBucket[family].source += 1;
    const rows = dbByNumber.get(card.source_number_key) ?? [];
    if (rows.some(isPikachuRow)) byBucket[family].matched += 1;
    else if (rows.length > 0) {
      byBucket[family].conflicts ??= 0;
      byBucket[family].conflicts += 1;
    }
    else byBucket[family].missing += 1;
  }

  return {
    source_promo_count: promoSourceCards.length,
    source_promo_corroborated_count: corroboratedPromoSourceCards.filter((card) => card.corroborated_by_bulbapedia).length,
    db_jpn_row_count: dbRows.length,
    db_jpn_pikachu_count: dbRows.filter(isPikachuRow).length,
    matched_count: matched.length,
    missing_count: missing.length,
    conflict_count: conflicts.length,
    by_bucket: byBucket,
    missing,
    conflicts,
    matched,
    two_source_actionable: [...missing, ...conflicts].filter((card) => card.corroborated_by_bulbapedia),
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Japanese Pikachu Promo Gap Audit v1');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- TCGCollector source cards parsed: ${report.source.tcgcollector.total_cards}`);
  lines.push(`- TCGCollector promo-like Pikachu cards parsed: ${report.comparison.source_promo_count}`);
  lines.push(`- TCGCollector promo-like cards also present on Bulbapedia Pikachu page: ${report.comparison.source_promo_corroborated_count}`);
  lines.push(`- Grookai Japanese rows scanned: ${report.comparison.db_jpn_row_count}`);
  lines.push(`- Grookai Japanese Pikachu rows found: ${report.comparison.db_jpn_pikachu_count}`);
  lines.push(`- Promo-like source cards matched by number: ${report.comparison.matched_count}`);
  lines.push(`- Promo-like source cards with non-Pikachu Grookai occupants: ${report.comparison.conflict_count}`);
  lines.push(`- Promo-like source cards missing by number: ${report.comparison.missing_count}`);
  lines.push(`- Two-source actionable missing/conflict candidates: ${report.comparison.two_source_actionable.length}`);
  lines.push('');
  lines.push('## Coverage By Promo Bucket');
  lines.push('');
  lines.push('| Bucket | Source | Matched | Conflicts | Missing |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const [bucket, row] of Object.entries(report.comparison.by_bucket).sort()) {
    lines.push(`| ${bucket} | ${row.source} | ${row.matched} | ${row.conflicts ?? 0} | ${row.missing} |`);
  }
  lines.push('');
  lines.push('## Promo Number Conflicts');
  lines.push('');
  lines.push('| Number | Bulbapedia corroborated | Source label | Current Grookai occupant(s) | URL |');
  lines.push('|---|---|---|---|---|');
  for (const card of report.comparison.conflicts) {
    const occupants = card.grookai_rows.map((row) => `${row.gv_id} ${row.name}`).join('<br>');
    lines.push(`| ${card.source_number_raw} | ${card.corroborated_by_bulbapedia ? 'yes' : 'no'} | ${card.source_label.replaceAll('|', '\\|')} | ${occupants.replaceAll('|', '\\|')} | ${card.source_url} |`);
  }
  lines.push('');
  lines.push('## Missing Promo-Like Candidates');
  lines.push('');
  lines.push('| Number | Bucket | Bulbapedia corroborated | Source label | URL |');
  lines.push('|---|---|---|---|---|');
  for (const card of report.comparison.missing) {
    lines.push(`| ${card.source_number_raw} | ${card.source_bucket} | ${card.corroborated_by_bulbapedia ? 'yes' : 'no'} | ${card.source_label.replaceAll('|', '\\|')} | ${card.source_url} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This is read-only. It does not write DB rows, upload images, or promote family links.');
  lines.push('- Matching here is intentionally strict by visible promo number. Name/artwork/source corroboration is still required before any DB payload.');
  lines.push('- Old Japanese unnumbered promo lanes need separate identity handling because `No. ###` and `MP No. ###` are not globally unique on their own.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const source = await fetchTcgCollectorCards();
  const bulbapedia = await fetchBulbapediaPromoNumbers();
  const dbRows = await fetchDbJpnRows();
  const comparison = compare(source.cards, dbRows, new Set(bulbapedia.numbers));
  const report = {
    generated_at: generatedAt,
    source: {
      tcgcollector: {
        url: TCGCOLLECTOR_URL,
        html_sha256: source.html_sha256,
        total_cards: source.cards.length,
      },
      bulbapedia_pikachu: {
        url: BULBAPEDIA_PIKACHU_URL,
        html_sha256: bulbapedia.html_sha256,
        promo_number_count: bulbapedia.numbers.length,
      },
    },
    comparison,
    source_cards: source.cards,
  };

  const jsonPath = path.join(OUT_DIR, 'jpn_pikachu_promo_gap_audit_v1.json');
  const mdPath = path.join(OUT_DIR, 'jpn_pikachu_promo_gap_audit_v1.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, toMarkdown(report));

  console.log(JSON.stringify({
    status: 'ok',
    generated_at: generatedAt,
    json_path: jsonPath,
    md_path: mdPath,
    source_promo_count: comparison.source_promo_count,
    matched_count: comparison.matched_count,
    conflict_count: comparison.conflict_count,
    missing_count: comparison.missing_count,
    two_source_actionable_count: comparison.two_source_actionable.length,
    by_bucket: comparison.by_bucket,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

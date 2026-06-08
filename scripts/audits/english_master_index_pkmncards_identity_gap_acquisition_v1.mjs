import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const GAP_FACTS_PATH = 'docs/audits/english_master_index_source_exhaustion_v1/english_master_index_remaining_gap_facts_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_identity_gap_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pkmncards_identity_gap_acquisition_v1';
const execFileAsync = promisify(execFile);

const PKMNCARDS_SET_ALIASES = {
  fut2020: ['Pokemon Futsal Promos 2020', 'FUT20'],
  ex4: ['Team Magma vs Team Aqua', 'MA', 'EX4'],
  pl2: ['Rising Rivals', 'RR', 'PL2'],
  swshp: ['Sword Shield Promos', 'SWSH Promos', 'SWSH'],
  swsh2: ['Rebel Clash', 'RCL', 'SWSH2'],
  'swsh4.5': ['Shining Fates', 'SHF'],
  cel25: ['Celebrations', 'CEL'],
  svp: ['Scarlet Violet Promos', 'SVP'],
  'sv10.5b': ['Black Bolt', 'BLK'],
};

function parseArgs(argv) {
  const options = {
    allowInsecureTls: false,
    maxFacts: null,
    dryRun: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--allow-insecure-tls') {
      options.allowInsecureTls = true;
    } else if (arg === '--max-facts') {
      options.maxFacts = Number(next);
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripAccents(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function comparable(value) {
  return normalizeText(stripAccents(value))
    .replace(/\bstar\b/g, 'star')
    .replace(/[★☆]/g, ' star ')
    .replace(/\{star\}/g, ' star ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bteam aqua s\b/g, 'team aqua')
    .replace(/\bteam magma s\b/g, 'team magma')
    .replace(/\bgalactic s\b/g, 'galactic')
    .replace(/\bboss s orders\b/g, 'boss orders')
    .replace(/\bbosss orders\b/g, 'boss orders')
    .replace(/\bprofessor s research\b/g, 'professor research')
    .replace(/\be4\s+lv\s+x\b/g, '4 lv x')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesCompatible(expected, actual) {
  const left = comparable(expected);
  const right = comparable(actual);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function setCompatible(expected, actual) {
  const left = comparable(expected);
  const right = comparable(actual);
  if (!left || !right) return false;
  const compactLeft = left.replace(/\b(black star|promos|promo)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const compactRight = right.replace(/\b(black star|promos|promo)\b/g, ' ').replace(/\s+/g, ' ').trim();
  return left === right
    || left.includes(right)
    || right.includes(left)
    || compactLeft === compactRight
    || compactLeft.includes(compactRight)
    || compactRight.includes(compactLeft);
}

function cardSearchName(fact) {
  return String(fact.card_name ?? '')
    .replace(/\{star\}/gi, 'star')
    .replace(/_/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[’']/g, '')
    .replace(/[★☆]/g, 'star')
    .replace(/\{star\}/g, 'star')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pkmnCardsNameVariants(fact) {
  const base = cardSearchName(fact);
  return [...new Set([
    base,
    base.replace(/\bTeam Aqua's\b/i, 'Team Aqua'),
    base.replace(/\bTeam Magma's\b/i, 'Team Magma'),
    base.replace(/\bTeam Galactic's\b/i, 'Team Galactics'),
    base.replace(/\s+star\b/i, ''),
  ].map((value) => value.trim()).filter(Boolean))];
}

function queryForFact(fact) {
  const aliases = PKMNCARDS_SET_ALIASES[fact.set_key] ?? [fact.set_name];
  const cardName = cardSearchName(fact);
  const cardNumber = normalizeNumber(fact.card_number);
  return [
    `${cardName} ${aliases[0]} ${cardNumber}`,
    `${cardName} ${aliases[0]}`,
    `${cardName} ${aliases.slice(1).join(' ')} ${cardNumber}`.trim(),
    `${cardName} ${cardNumber}`,
  ].filter(Boolean);
}

function searchUrls(fact) {
  return [...new Set(queryForFact(fact).map((query) => `https://pkmncards.com/?s=${encodeURIComponent(query)}`))];
}

function namePageUrls(fact) {
  return pkmnCardsNameVariants(fact).map((name) => `https://pkmncards.com/name/${slug(name)}/`);
}

function directCardUrls(fact) {
  const aliases = PKMNCARDS_SET_ALIASES[fact.set_key] ?? [fact.set_name];
  const primarySet = aliases[0];
  const codes = aliases.slice(1);
  const rawNumber = normalizeNumber(fact.card_number);
  const numbers = [...new Set([
    rawNumber,
    /^\d+$/.test(rawNumber) ? rawNumber.padStart(3, '0') : rawNumber,
  ])];
  const urls = [];
  for (const name of pkmnCardsNameVariants(fact)) {
    for (const code of codes) {
      for (const number of numbers) {
        urls.push(`https://pkmncards.com/card/${slug(`${name} ${primarySet} ${code} ${number}`)}/`);
      }
    }
  }
  return [...new Set(urls)];
}

function setAliasesForFact(fact) {
  return [fact.set_name, ...(PKMNCARDS_SET_ALIASES[fact.set_key] ?? [])];
}

function sourceSetCompatible(fact, actual) {
  return setAliasesForFact(fact).some((alias) => setCompatible(alias, actual));
}

function titleCandidateNameCompatible(fact, actual) {
  const cardName = String(fact.card_name ?? '').replace(/\{star\}/gi, 'star').replace(/_/g, '');
  return namesCompatible(cardName, actual);
}

function fetchText(url, options) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'user-agent': 'Grookai audit-only source acquisition; no page dumps stored',
        accept: 'text/html,application/xhtml+xml',
      },
      timeout: 30000,
      rejectUnauthorized: !options.allowInsecureTls,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          url,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    request.on('timeout', () => request.destroy(new Error(`timeout fetching ${url}`)));
    request.on('error', reject);
  });
}

async function fetchTextWithFallback(url, options) {
  try {
    return await fetchText(url, options);
  } catch (error) {
    try {
      const { stdout } = await execFileAsync('curl.exe', [
        '--ssl-no-revoke',
        '--silent',
        '--show-error',
        '--location',
        '--max-time',
        '60',
        '--user-agent',
        'Grookai audit-only source acquisition; no page dumps stored',
        url,
      ], {
        encoding: 'buffer',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 70000,
      });
      return {
        status: 200,
        url,
        body: Buffer.from(stdout).toString('utf8'),
        tls_workaround: 'curl_ssl_no_revoke',
      };
    } catch (curlError) {
      throw new Error(`${String(error.message ?? error)} | curl: ${String(curlError.message ?? curlError)}`);
    }
  }
}

function extractCardUrls(html) {
  const urls = new Set();
  const absolute = html.match(/https:\/\/pkmncards\.com\/card\/[^"'<>\s]+/g) ?? [];
  for (const url of absolute) urls.add(url.replace(/\\\//g, '/').replace(/\/?$/, '/'));
  const relative = html.match(/href=["'](\/card\/[^"']+)["']/g) ?? [];
  for (const href of relative) {
    const [, rel] = href.match(/href=["']([^"']+)["']/) ?? [];
    if (rel) urls.add(new URL(rel, 'https://pkmncards.com').toString());
  }
  return [...urls].filter((url) => /^https:\/\/pkmncards\.com\/card\/[^/]+\/$/.test(url)).slice(0, 8);
}

function pageTitle(html) {
  const jsonName = html.match(/"name"\s*:\s*"([^"]+?‹ PkmnCards)"/)?.[1];
  const title = jsonName ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '';
  return decodeHtml(title).replace(/\s+‹\s+PkmnCards\s*$/i, '').trim();
}

function parseTitle(title) {
  const match = title.match(/^(?<name>.+?)\s+·\s+(?<set>.+?)\s+\([^)]*\)\s+#(?<number>[A-Za-z0-9?]+)/)
    ?? title.match(/^(?<name>.+?)\s+·\s+(?<set>.+?)\s+#(?<number>[A-Za-z0-9?]+)/);
  if (!match?.groups) return null;
  return {
    card_name: match.groups.name.trim(),
    set_name: match.groups.set.trim(),
    card_number: normalizeNumber(match.groups.number),
  };
}

function validateCandidate(fact, parsed) {
  if (!parsed) return { ok: false, reason: 'title_unparseable' };
  const cardOk = titleCandidateNameCompatible(fact, parsed.card_name);
  const setOk = sourceSetCompatible(fact, parsed.set_name);
  const numberOk = normalizeNumber(fact.card_number) === normalizeNumber(parsed.card_number);
  return {
    ok: cardOk && setOk && numberOk,
    reason: cardOk && setOk && numberOk ? 'exact_identity_validated' : 'candidate_not_exact_identity_match',
    checks: {
      card_name: cardOk,
      set_name: setOk,
      card_number: numberOk,
    },
  };
}

async function loadFacts(options) {
  const artifact = await readJson(GAP_FACTS_PATH);
  const facts = (artifact.facts ?? [])
    .filter((fact) => fact.gap_type === 'card_identity_second_source_needed')
    .filter((fact) => fact.card_number && fact.card_name && fact.set_name);
  return Number.isFinite(options.maxFacts) && options.maxFacts > 0 ? facts.slice(0, options.maxFacts) : facts;
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const facts = await loadFacts(options);
  const results = [];
  const recordsBySet = new Map();
  let curlTlsFallbackUsed = false;

  for (const fact of facts) {
    const searches = searchUrls(fact);
    let status = 'no_exact_match';
    let accepted = null;
    let candidates = [];
    try {
      const urls = [];
      for (const search of searches) {
        const searchResponse = await fetchTextWithFallback(search, options);
        if (searchResponse.tls_workaround) curlTlsFallbackUsed = true;
        for (const url of extractCardUrls(searchResponse.body)) {
          if (!urls.includes(url)) urls.push(url);
        }
        if (urls.length > 0) break;
      }
      for (const namePage of namePageUrls(fact)) {
        if (urls.length > 0) break;
        const nameResponse = await fetchTextWithFallback(namePage, options);
        if (nameResponse.tls_workaround) curlTlsFallbackUsed = true;
        if (nameResponse.status >= 200 && nameResponse.status < 300) {
          for (const url of extractCardUrls(nameResponse.body)) {
            if (!urls.includes(url)) urls.push(url);
          }
        }
      }
      for (const direct of directCardUrls(fact)) {
        if (!urls.includes(direct)) urls.push(direct);
      }
      for (const url of urls) {
        const page = await fetchTextWithFallback(url, options);
        if (page.tls_workaround) curlTlsFallbackUsed = true;
        if (page.status < 200 || page.status >= 300) continue;
        const title = pageTitle(page.body);
        const parsed = parseTitle(title);
        const validation = validateCandidate(fact, parsed);
        candidates.push({ url, title, parsed, validation });
        if (validation.ok && !accepted) {
          accepted = { url, title, parsed, validation };
          status = 'generated';
        }
      }
      if (!urls.length) status = 'no_search_results';
    } catch (error) {
      status = 'source_error';
      candidates = [{ error: error.message }];
    }

    if (accepted) {
      const record = {
        source_key: 'pkmncards_identity_gap',
        source_kind: 'collector_reference',
        source_url: accepted.url,
        set_key: fact.set_key,
        set_name: fact.set_name,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: null,
        evidence_type: 'card_identity',
        evidence_label: `PKMNCards card page: ${accepted.title}`,
        notes: 'Exact card identity evidence accepted because PKMNCards matched set, card number, and card name.',
      };
      const rows = recordsBySet.get(fact.set_key) ?? [];
      rows.push(record);
      recordsBySet.set(fact.set_key, rows);
    }

    results.push({
      status,
      fact,
      search_urls: searches,
      accepted,
      reviewed_candidates: candidates.slice(0, 5),
    });
  }

  if (!options.dryRun) {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    for (const [setKey, records] of recordsBySet) {
      await fs.writeFile(path.join(FIXTURE_DIR, `${setKey}.json`), `${JSON.stringify({
        source_key: `pkmncards_identity_gap_${setKey}`,
        source_kind: 'collector_reference',
        source_url: 'https://pkmncards.com/',
        set_key: setKey,
        set_name: records[0]?.set_name,
        retrieved_at: generatedAt,
        raw_snapshot_ref: `pkmncards_identity_gap:${setKey}:${generatedAt}`,
        records,
      }, null, 2)}\n`);
    }
  }

  const byStatus = {};
  for (const row of results) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  const report = {
    version: 'english_master_index_pkmncards_identity_gap_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    tls_workaround_used: options.allowInsecureTls,
    curl_tls_fallback_used: curlTlsFallbackUsed,
    tls_workaround_note: options.allowInsecureTls
      ? 'Local Node TLS could not verify pkmncards.com in this environment; insecure TLS was enabled only by explicit flag for audit-only fetches.'
      : curlTlsFallbackUsed
        ? 'Node TLS fetch failed for pkmncards.com in this Windows environment; curl.exe --ssl-no-revoke was used as an audit-only fetch fallback. TLS verification behavior was not disabled in Node by default.'
      : null,
    source_key: 'pkmncards_identity_gap',
    fixture_dir: FIXTURE_DIR,
    summary: {
      attempted_facts: facts.length,
      records_generated: [...recordsBySet.values()].reduce((sum, rows) => sum + rows.length, 0),
      fixture_files_written: recordsBySet.size,
      by_status: byStatus,
    },
    results,
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORT_DIR, 'pkmncards_identity_gap_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(REPORT_DIR, 'pkmncards_identity_gap_acquisition_v1.md'), [
    '# PKMNCards Identity Gap Acquisition V1',
    '',
    'Audit-only targeted acquisition for remaining card identity second-source gaps.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['Metric', 'Value'],
      [
        ['attempted_facts', report.summary.attempted_facts],
        ['records_generated', report.summary.records_generated],
        ['fixture_files_written', report.summary.fixture_files_written],
        ['tls_workaround_used', String(report.tls_workaround_used)],
      ],
    ),
    '',
    '## Status Counts',
    '',
    markdownTable(['Status', 'Count'], Object.entries(byStatus)),
    '',
    '## Generated Evidence',
    '',
    markdownTable(
      ['Set', 'Number', 'Card', 'URL'],
      results
        .filter((row) => row.status === 'generated')
        .map((row) => [row.fact.set_key, row.fact.card_number, row.fact.card_name, row.accepted?.url]),
    ),
    '',
    'No DB writes, migrations, cleanup, or quarantine occurred.',
    '',
  ].join('\n'));

  console.log(JSON.stringify(report.summary, null, 2));
}

await main();

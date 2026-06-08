import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const QUEUE_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_remaining_finish_second_source_queue_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_gengar_sve_reverse_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/gengar_sve_reverse_acquisition_v1';

const TARGETS = new Map([
  ['2', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-fire-energy-reverse-holo-sve-002',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['4', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-lightning-energy-reverse-holo-sve-004',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['7', {
    source_key: 'facetofacegames_sve_reverse_product',
    source_kind: 'marketplace_checklist',
    source_url: 'https://facetofacegames.com/products/basic-darkness-energy-007-common-sve-007-reverse-holo',
    validation: 'facetoface_exact_product_title',
  }],
  ['8', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-metal-energy-reverse-holo-sve-008',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['9', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-grass-energy-reverse-holo-sve-009',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['10', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-fire-energy-reverse-holo-sve-010',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['11', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-water-energy-reverse-holo-sve-011',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['12', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-lightning-energy-reverse-holo-sve-012',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['13', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-psychic-energy-reverse-holo-sve-013',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['14', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-fighting-energy-reverse-holo-sve-014',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
  ['15', {
    source_key: 'pokesov_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.pokesov.cz/basic-darkness-energy-sve-015/',
    validation: 'pokesov_exact_variant',
  }],
  ['16', {
    source_key: 'gengar_sve_reverse_variant',
    source_kind: 'marketplace_checklist',
    source_url: 'https://www.gengar.cz/p/basic-metal-energy-reverse-holo-sve-016',
    validation: 'gengar_exact_title_or_reverse_option',
  }],
]);

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
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

function isLocalTlsFailure(error) {
  const message = String(error?.cause?.code ?? error?.message ?? error);
  return /UNABLE_TO_VERIFY|CERT|certificate|REVOCATION/i.test(message);
}

async function fetchViaCurl(url) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '45',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    '--header',
    'Accept: text/html,application/xhtml+xml',
    url,
  ], {
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'buffer',
  });
  return stdout.toString('utf8');
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Grookai Master Index Audit/1.0',
      },
      signal: AbortSignal.timeout(45000),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
    return { html: text, transport: 'node_fetch' };
  } catch (error) {
    if (!isLocalTlsFailure(error) && !/fetch failed|ECONNRESET|UND_ERR|network/i.test(String(error?.message ?? error))) {
      throw error;
    }
    return { html: await fetchViaCurl(url), transport: 'curl_tls_fallback' };
  }
}

function htmlTitle(html) {
  return (html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i)?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/&ndash;/g, '-')
    .replace(/&amp;/g, '&');
}

function plainText(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ndash;/g, '-')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function padded(number) {
  return normalizeNumber(number).padStart(3, '0');
}

function titleHasFact(title, fact) {
  const normalizedTitle = normalizeText(title);
  return normalizedTitle.includes(normalizeText(fact.card_name))
    && normalizedTitle.includes(normalizeText(`sve ${padded(fact.card_number)}`))
    && normalizedTitle.includes('reverse holo');
}

function validatesGengar({ title, html }, fact) {
  const text = plainText(html);
  const hasSet = html.includes('Scarlet-Violet-Energies') || text.includes('Scarlet & Violet Energies');
  const hasReverseOption = html.includes(`${padded(fact.card_number)}/Near Mint-reverse_holo-en`)
    || html.includes('/Near Mint-reverse_holo-en')
    || titleHasFact(title, fact);
  return {
    ok: titleHasFact(title, fact) && hasSet && hasReverseOption,
    checks: {
      title_has_fact: titleHasFact(title, fact),
      has_set: hasSet,
      has_reverse_option: hasReverseOption,
    },
  };
}

function validatesFaceToFace({ title, html }, fact) {
  const text = plainText(html);
  return {
    ok: titleHasFact(title, fact)
      && text.includes('Finish: Reverse Holo')
      && text.includes(`Collector #: ${padded(fact.card_number)}`),
    checks: {
      title_has_fact: titleHasFact(title, fact),
      has_reverse_finish_label: text.includes('Finish: Reverse Holo'),
      has_collector_number: text.includes(`Collector #: ${padded(fact.card_number)}`),
    },
  };
}

function validatesPokesov({ title, html }, fact) {
  const text = plainText(html);
  return {
    ok: normalizeText(title).includes(normalizeText(fact.card_name))
      && normalizeText(title).includes(normalizeText(`sve ${padded(fact.card_number)}`))
      && text.includes('Varianta: Reverse Holo'),
    checks: {
      title_has_card_and_number: normalizeText(title).includes(normalizeText(fact.card_name))
        && normalizeText(title).includes(normalizeText(`sve ${padded(fact.card_number)}`)),
      has_reverse_variant_label: text.includes('Varianta: Reverse Holo'),
    },
  };
}

function validateEvidence(target, page, fact) {
  if (target.validation === 'gengar_exact_title_or_reverse_option') return validatesGengar(page, fact);
  if (target.validation === 'facetoface_exact_product_title') return validatesFaceToFace(page, fact);
  if (target.validation === 'pokesov_exact_variant') return validatesPokesov(page, fact);
  return { ok: false, checks: { unknown_validation: target.validation } };
}

function sourceAuthority(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function fixtureRecord(fact, target, generatedAt) {
  return {
    source_key: target.source_key,
    source_kind: target.source_kind,
    source_url: target.source_url,
    set_key: fact.set_key,
    set_name: fact.set_name,
    card_number: fact.card_number,
    card_name: fact.card_name,
    finish_key: 'reverse',
    rarity: null,
    evidence_type: 'finish_presence',
    evidence_label: `${sourceAuthority(target.source_url)} exact SVE reverse page: ${fact.card_name} ${padded(fact.card_number)}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `gengar_sve_reverse:${target.source_key}:${fact.set_key}:${normalizeNumber(fact.card_number)}:${generatedAt}`,
    notes: 'Audit-only exact marketplace/checklist evidence. Accepted only after validating source page title or variant metadata for exact SVE number, card name, and reverse holo finish.',
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const queue = await readJson(QUEUE_PATH);
  const targetFacts = (queue.rows ?? [])
    .filter((row) => row.set_key === 'sve')
    .filter((row) => normalizeText(row.finish_key) === 'reverse')
    .filter((row) => TARGETS.has(normalizeNumber(row.card_number)))
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true }));

  const missingTargets = [...TARGETS.keys()].filter((number) => !targetFacts.some((fact) => normalizeNumber(fact.card_number) === number));
  if (missingTargets.length > 0) {
    throw new Error(`Target facts missing from remaining queue: ${missingTargets.join(', ')}`);
  }

  const results = [];
  for (const fact of targetFacts) {
    const target = TARGETS.get(normalizeNumber(fact.card_number));
    const fetched = await fetchHtml(target.source_url);
    const page = { title: htmlTitle(fetched.html), html: fetched.html };
    const validation = validateEvidence(target, page, fact);
    results.push({
      status: validation.ok ? 'validated' : 'blocked',
      fact,
      source_key: target.source_key,
      source_kind: target.source_kind,
      source_url: target.source_url,
      transport: fetched.transport,
      page_title: page.title,
      validation,
    });
  }

  const validated = results.filter((row) => row.status === 'validated');
  const blocked = results.filter((row) => row.status !== 'validated');
  const fixtureFile = path.join(FIXTURE_DIR, 'sve.json');
  if (blocked.length > 0) {
    throw new Error(`SVE reverse evidence validation failed for ${blocked.map((row) => row.fact.card_number).join(', ')}`);
  }

  if (!options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    await fs.writeFile(fixtureFile, `${JSON.stringify({
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: 'gengar_sve_reverse_v1',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.gengar.cz/',
      source_status: 'available_generated',
      set_key: 'sve',
      set_name: 'Scarlet & Violet Energies',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:gengar_sve_reverse:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records: validated.map((row) => fixtureRecord(row.fact, TARGETS.get(normalizeNumber(row.fact.card_number)), generatedAt)),
    }, null, 2)}\n`);
  }

  const report = {
    version: 'english_master_index_gengar_sve_reverse_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_file: options.dryRun ? null : fixtureFile,
    rule: 'Only exact SVE reverse facts from the remaining second-source queue are accepted. No other SVE finishes or card numbers are inferred.',
    tls_note: results.some((row) => row.transport === 'curl_tls_fallback')
      ? 'Local Node TLS validation failed for one or more source pages; this script used curl.exe --ssl-no-revoke as a command-level fallback. No insecure TLS behavior is made default.'
      : 'Default Node TLS verification succeeded.',
    summary: {
      target_facts: targetFacts.length,
      validated: validated.length,
      blocked: blocked.length,
      by_source_key: Object.fromEntries([...new Set(validated.map((row) => row.source_key))].sort().map((key) => [
        key,
        validated.filter((row) => row.source_key === key).length,
      ])),
    },
    results,
  };

  if (!options.dryRun) {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'gengar_sve_reverse_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(REPORT_DIR, 'gengar_sve_reverse_acquisition_v1.md'), [
      '# Gengar SVE Reverse Acquisition V1',
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      `Generated: ${generatedAt}`,
      '',
      '## Summary',
      '',
      markdownTable(
        ['Metric', 'Value'],
        [
          ['target_facts', report.summary.target_facts],
          ['validated', report.summary.validated],
          ['blocked', report.summary.blocked],
          ['fixture_file', report.fixture_file],
          ['tls_note', report.tls_note],
        ],
      ),
      '',
      '## Validated Rows',
      '',
      markdownTable(
        ['Number', 'Name', 'Finish', 'Source', 'URL'],
        validated.map((row) => [
          row.fact.card_number,
          row.fact.card_name,
          row.fact.finish_key,
          row.source_key,
          row.source_url,
        ]),
      ),
      '',
    ].join('\n'));
  }

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[gengar-sve-reverse] failed:', error);
  process.exitCode = 1;
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const QUEUE_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_remaining_finish_second_source_queue_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokescope_sv02_stamp_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokescope_sv02_stamp_acquisition_v1';

const TARGETS = new Map([
  ['36', { source_url: 'https://pokescope.app/card/sv2-36/' }],
  ['39', { source_url: 'https://pokescope.app/card/sv2-39/' }],
  ['67', { source_url: 'https://pokescope.app/card/sv2-67/' }],
  ['76', { source_url: 'https://pokescope.app/card/sv2-76/' }],
  ['82', { source_url: 'https://pokescope.app/card/sv2-82/' }],
  ['172', { source_url: 'https://pokescope.app/card/sv2-172/' }],
  ['183', { source_url: 'https://pokescope.app/card/sv2-183/' }],
]);

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
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
    '90',
    '--user-agent',
    'Grookai Master Index Audit/1.0',
    '--header',
    'Accept: text/html,application/xhtml+xml',
    url,
  ], {
    timeout: 120000,
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

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&ndash;/g, '-')
    .replace(/&#160;|&nbsp;/g, ' ');
}

function htmlTitle(html) {
  return decodeHtml(html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i)?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainText(html) {
  return decodeHtml(String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function validatePokeScope({ text, title, rawHtml }, fact) {
  const comparable = normalizeText(`${title} ${text} ${rawHtml}`);
  const compactComparable = comparable.replace(/\s+/g, '');
  const number = normalizeNumber(fact.card_number);
  const hasIdentity = comparable.includes(normalizeText(fact.card_name))
    && comparable.includes('paldea evolved')
    && (comparable.includes(normalizeText(`sv2-${number}`)) || comparable.includes(normalizeText(`#${number}`)));
  const hasIdentifier = comparable.includes(normalizeText(`sv2-${number}`))
    || comparable.includes(normalizeText(`productID sv2-${number}`))
    || comparable.includes(normalizeText(`sku sv2-${number}`))
    || comparable.includes(normalizeText(`cardid sv2-${number}`));
  const hasStampVariant = compactComparable.includes('stamp');
  const notNotFound = !normalizeText(title).includes('not found');
  return {
    ok: hasIdentity && hasIdentifier && hasStampVariant && notNotFound,
    checks: {
      has_identity: hasIdentity,
      has_identifier: hasIdentifier,
      has_stamp_variant: hasStampVariant,
      not_not_found: notNotFound,
    },
  };
}

function sourceAuthority(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function fixtureRecord(fact, target, generatedAt) {
  return {
    source_key: 'pokescope_sv02_stamp',
    source_kind: 'marketplace_checklist',
    source_url: target.source_url,
    set_key: fact.set_key,
    set_name: fact.set_name,
    card_number: fact.card_number,
    card_name: fact.card_name,
    finish_key: 'stamped',
    rarity: fact.rarity ?? null,
    evidence_type: 'finish_presence',
    evidence_label: `${sourceAuthority(target.source_url)} exact Paldea Evolved stamped variant evidence: ${fact.card_name} ${fact.card_number}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pokescope_sv02_stamp:${fact.set_key}:${normalizeNumber(fact.card_number)}:stamped:${generatedAt}`,
    notes: 'Audit-only exact marketplace/checklist evidence. Accepted only after validating PokeScope page identity and explicit embedded stamp variant evidence.',
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const queue = await readJson(QUEUE_PATH);
  const targetFacts = (queue.rows ?? [])
    .filter((row) => row.set_key === 'sv02')
    .filter((row) => TARGETS.has(normalizeNumber(row.card_number)))
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true }));

  const missing = [...TARGETS.keys()].filter((number) => !targetFacts.some((fact) => normalizeNumber(fact.card_number) === number));
  if (missing.length > 0) throw new Error(`Target facts missing from remaining queue: ${missing.join(', ')}`);

  const results = [];
  for (const fact of targetFacts) {
    const target = TARGETS.get(normalizeNumber(fact.card_number));
    if (normalizeText(fact.finish_key) !== 'stamped') {
      throw new Error(`Target finish mismatch for ${fact.card_number}: queue=${fact.finish_key}, target=stamped`);
    }
    const fetched = await fetchHtml(target.source_url);
    const title = htmlTitle(fetched.html);
    const text = plainText(fetched.html);
    const validation = validatePokeScope({ title, text, rawHtml: fetched.html }, fact);
    results.push({
      status: validation.ok ? 'validated' : 'blocked',
      fact,
      source_key: 'pokescope_sv02_stamp',
      source_kind: 'marketplace_checklist',
      source_url: target.source_url,
      transport: fetched.transport,
      page_title: title,
      validation,
    });
  }

  const validated = results.filter((row) => row.status === 'validated');
  const blocked = results.filter((row) => row.status !== 'validated');
  if (blocked.length > 0) {
    console.error(JSON.stringify(blocked.map((row) => ({
      card_number: row.fact.card_number,
      card_name: row.fact.card_name,
      finish_key: row.fact.finish_key,
      source_url: row.source_url,
      page_title: row.page_title,
      validation: row.validation,
    })), null, 2));
    throw new Error(`SV02 stamped evidence validation failed for ${blocked.map((row) => row.fact.card_number).join(', ')}`);
  }

  const fixtureFile = path.join(FIXTURE_DIR, 'sv02.json');
  if (!options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    await fs.writeFile(fixtureFile, `${JSON.stringify({
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: 'pokescope_sv02_stamp_v1',
      source_kind: 'marketplace_checklist',
      source_url: 'https://pokescope.app/',
      source_status: 'available_generated',
      set_key: 'sv02',
      set_name: 'Paldea Evolved',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pokescope_sv02_stamp:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records: validated.map((row) => fixtureRecord(row.fact, TARGETS.get(normalizeNumber(row.fact.card_number)), generatedAt)),
    }, null, 2)}\n`);
  }

  const report = {
    version: 'english_master_index_pokescope_sv02_stamp_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_file: options.dryRun ? null : fixtureFile,
    rule: 'Only exact SV02 remaining queue rows are accepted. Stamped finish is not inferred from set membership or rarity.',
    tls_note: results.some((row) => row.transport === 'curl_tls_fallback')
      ? 'Local Node TLS validation failed for one or more source pages; this script used curl.exe --ssl-no-revoke as a command-level fallback. No insecure TLS behavior is made default.'
      : 'Default Node TLS verification succeeded.',
    summary: {
      target_facts: targetFacts.length,
      validated: validated.length,
      blocked: blocked.length,
      by_source_key: { pokescope_sv02_stamp: validated.length },
    },
    results,
  };

  if (!options.dryRun) {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'pokescope_sv02_stamp_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(REPORT_DIR, 'pokescope_sv02_stamp_acquisition_v1.md'), [
      '# PokeScope SV02 Stamp Acquisition V1',
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
  console.error('[pokescope-sv02-stamp] failed:', error);
  process.exitCode = 1;
});

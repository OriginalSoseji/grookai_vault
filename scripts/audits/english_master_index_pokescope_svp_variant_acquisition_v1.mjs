import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const execFileAsync = promisify(execFile);

const QUEUE_PATH = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_remaining_finish_second_source_queue_v1.json';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokescope_svp_variant_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/pokescope_svp_variant_acquisition_v1';

const TARGETS = new Map([
  ['45', { source_key: 'pokescope_svp_variant', source_url: 'https://pokescope.app/card/svp-45/', finish_label: 'Staff Stamp', finish_key: 'stamped' }],
  ['107', { source_key: 'pokescope_svp_variant', source_url: 'https://pokescope.app/card/svp-107/', finish_label: 'Pikachu Stamp', finish_key: 'stamped' }],
  ['108', { source_key: 'pokescope_svp_variant', source_url: 'https://pokescope.app/card/svp-108/', finish_label: 'Pikachu Stamp', finish_key: 'stamped' }],
  ['109', { source_key: 'pokescope_svp_variant', source_url: 'https://pokescope.app/card/svp-109/', finish_label: 'Pikachu Stamp', finish_key: 'stamped' }],
  ['114', { source_key: 'pokescope_svp_variant', source_url: 'https://pokescope.app/card/svp-114/', finish_label: 'Stamp', finish_key: 'stamped' }],
  ['148', { source_key: 'pokescope_svp_variant', source_url: 'https://pokescope.app/card/svp-148/', finish_label: 'Pikachu Stamp', finish_key: 'stamped' }],
  ['193', { source_key: 'pokescope_svp_variant', source_url: 'https://pokescope.app/card/svp-193/', finish_label: 'Holofoil', finish_key: 'holo' }],
  ['225', { source_key: 'pricecharting_svp_winner_variant', source_url: 'https://www.pricecharting.com/game/pokemon-promo/pikachu-world-championships-winner-225', finish_label: 'World Championships Winner', finish_key: 'stamped' }],
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

function textHasCardIdentity(text, title, fact, rawHtml = '') {
  const comparable = normalizeText(`${title} ${text} ${rawHtml}`);
  return comparable.includes(normalizeText(fact.card_name))
    && (comparable.includes(normalizeText(`svp ${normalizeNumber(fact.card_number)}`))
      || comparable.includes(normalizeText(`#${normalizeNumber(fact.card_number)}`)))
    && comparable.includes('scarlet violet black star promos');
}

function validatesPokeScope({ text, title, rawHtml }, fact, target) {
  const comparable = normalizeText(`${title} ${text} ${rawHtml}`);
  const compactComparable = comparable.replace(/\s+/g, '');
  const compactFinishLabel = normalizeText(target.finish_label).replace(/\s+/g, '');
  const hasIdentity = textHasCardIdentity(text, title, fact, rawHtml);
  const hasIdentifier = comparable.includes(normalizeText(`svp-${normalizeNumber(fact.card_number)}`))
    || comparable.includes(normalizeText(`productID svp-${normalizeNumber(fact.card_number)}`))
    || comparable.includes(normalizeText(`sku svp-${normalizeNumber(fact.card_number)}`))
    || comparable.includes(normalizeText(`cardid svp-${normalizeNumber(fact.card_number)}`));
  const hasVariant = compactComparable.includes(compactFinishLabel);
  const hasFinish = target.finish_key === 'holo'
    ? compactComparable.includes('holofoil')
    : compactComparable.includes('stamp')
      || /\b(stamp|stamped|staff|winner|quarter|finalist|championship)\b/i.test(`${text} ${rawHtml}`);
  return {
    ok: hasIdentity && hasIdentifier && hasVariant && hasFinish,
    checks: { has_identity: hasIdentity, has_identifier: hasIdentifier, has_variant: hasVariant, has_finish: hasFinish },
  };
}

function validatesPriceCharting({ text, title }, fact, target) {
  const comparable = normalizeText(`${title} ${text}`);
  return {
    ok: comparable.includes(normalizeText(fact.card_name))
      && comparable.includes(normalizeText(`#${normalizeNumber(fact.card_number)}`))
      && comparable.includes('pokemon promo')
      && comparable.includes(normalizeText(target.finish_label)),
    checks: {
      has_card_name: comparable.includes(normalizeText(fact.card_name)),
      has_number: comparable.includes(normalizeText(`#${normalizeNumber(fact.card_number)}`)),
      has_promo_context: comparable.includes('pokemon promo'),
      has_variant: comparable.includes(normalizeText(target.finish_label)),
    },
  };
}

function validateEvidence(page, fact, target) {
  if (target.source_key === 'pokescope_svp_variant') return validatesPokeScope(page, fact, target);
  if (target.source_key === 'pricecharting_svp_winner_variant') return validatesPriceCharting(page, fact, target);
  return { ok: false, checks: { unknown_source: target.source_key } };
}

function sourceAuthority(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

function fixtureRecord(fact, target, generatedAt) {
  return {
    source_key: target.source_key,
    source_kind: 'marketplace_checklist',
    source_url: target.source_url,
    set_key: fact.set_key,
    set_name: fact.set_name,
    card_number: fact.card_number,
    card_name: fact.card_name,
    finish_key: target.finish_key,
    rarity: 'Promo',
    evidence_type: 'finish_presence',
    evidence_label: `${sourceAuthority(target.source_url)} exact SVP variant evidence: ${fact.card_name} ${fact.card_number} ${target.finish_label}`,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `pokescope_svp_variant:${target.source_key}:${fact.set_key}:${normalizeNumber(fact.card_number)}:${target.finish_key}:${generatedAt}`,
    notes: 'Audit-only exact marketplace/checklist evidence. Accepted only after validating source page identity and explicit variant/finish label.',
  };
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const queue = await readJson(QUEUE_PATH);
  const targetFacts = (queue.rows ?? [])
    .filter((row) => row.set_key === 'svp')
    .filter((row) => TARGETS.has(normalizeNumber(row.card_number)))
    .sort((a, b) => normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true }));

  const skippedAlreadyClosed = [...TARGETS.keys()]
    .filter((number) => !targetFacts.some((fact) => normalizeNumber(fact.card_number) === number))
    .map((number) => ({
      card_number: number,
      status: 'skipped_not_in_current_queue',
      reason: 'The static PokeScope/PriceCharting target is no longer present in the current remaining queue; no evidence fixture is generated.',
      source_url: TARGETS.get(number)?.source_url ?? null,
      source_key: TARGETS.get(number)?.source_key ?? null,
    }));

  const results = [];
  for (const fact of targetFacts) {
    const target = TARGETS.get(normalizeNumber(fact.card_number));
    if (normalizeText(fact.finish_key) !== normalizeText(target.finish_key)) {
      throw new Error(`Target finish mismatch for ${fact.card_number}: queue=${fact.finish_key}, target=${target.finish_key}`);
    }
    const fetched = await fetchHtml(target.source_url);
    const title = htmlTitle(fetched.html);
    const text = plainText(fetched.html);
    const validation = validateEvidence({ title, text, rawHtml: fetched.html }, fact, target);
    results.push({
      status: validation.ok ? 'validated' : 'blocked',
      fact,
      source_key: target.source_key,
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
    throw new Error(`SVP variant evidence validation failed for ${blocked.map((row) => row.fact.card_number).join(', ')}`);
  }

  const fixtureFile = path.join(FIXTURE_DIR, 'svp.json');
  if (!options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    await fs.writeFile(fixtureFile, `${JSON.stringify({
      fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
      source_key: 'pokescope_svp_variant_v1',
      source_kind: 'marketplace_checklist',
      source_url: 'https://pokescope.app/',
      source_status: 'available_generated',
      set_key: 'svp',
      set_name: 'Scarlet & Violet Black Star Promos',
      retrieved_at: generatedAt,
      raw_snapshot_ref: `generated_fixture:pokescope_svp_variant:${generatedAt}`,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      records: validated.map((row) => fixtureRecord(row.fact, TARGETS.get(normalizeNumber(row.fact.card_number)), generatedAt)),
    }, null, 2)}\n`);
  }

  const report = {
    version: 'english_master_index_pokescope_svp_variant_acquisition_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_file: options.dryRun ? null : fixtureFile,
    rule: 'Only exact SVP remaining queue rows are accepted. No promo finish is inferred from set membership or card rarity.',
    tls_note: results.some((row) => row.transport === 'curl_tls_fallback')
      ? 'Local Node TLS validation failed for one or more source pages; this script used curl.exe --ssl-no-revoke as a command-level fallback. No insecure TLS behavior is made default.'
      : 'Default Node TLS verification succeeded.',
    summary: {
      target_facts: targetFacts.length,
      skipped_not_in_current_queue: skippedAlreadyClosed.length,
      validated: validated.length,
      blocked: blocked.length,
      by_source_key: Object.fromEntries([...new Set(validated.map((row) => row.source_key))].sort().map((key) => [
        key,
        validated.filter((row) => row.source_key === key).length,
      ])),
    },
    results,
    skipped_rows: skippedAlreadyClosed,
  };

  if (!options.dryRun) {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'pokescope_svp_variant_acquisition_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(REPORT_DIR, 'pokescope_svp_variant_acquisition_v1.md'), [
      '# PokeScope SVP Variant Acquisition V1',
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
          ['skipped_not_in_current_queue', report.summary.skipped_not_in_current_queue],
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
  console.error('[pokescope-svp-variant] failed:', error);
  process.exitCode = 1;
});

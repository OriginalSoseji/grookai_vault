import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const QUEUE_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pokescope_live_league_variant_acquisition_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'pokescope_live_league_variant_acquisition_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'pokescope_live_league_variant_acquisition_v1.md');

const SOURCE_KEY = 'pokescope_live_league_variant';
const USER_AGENT = 'GrookaiVaultAudit/1.0 (+https://grookaivault.com; audit-only source verification)';
const execFileAsync = promisify(execFile);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function compactNumber(value) {
  return normalizeNumber(value).toLowerCase().replace(/^0+/, '');
}

function pageUrl(row) {
  return `https://pokescope.app/card/${row.set_key}-${compactNumber(row.card_number)}/`;
}

function compactText(value) {
  return normalizeText(String(value ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

function includesToken(text, value) {
  return compactText(text).includes(compactText(value));
}

function classifyPage(row, sourceUrl, html, error = null) {
  if (error) {
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      source_key: SOURCE_KEY,
      source_kind: 'collector_reference',
      source_url: sourceUrl,
      source_result: 'source_unavailable',
      evidence_type: 'source_attempt',
      evidence_label: error,
      finish_key: null,
      promotable: false,
      notes: 'PokeScope fetch failed; no evidence accepted.',
    };
  }

  const text = compactText(html);
  const hasCardName = includesToken(text, row.card_name);
  const hasSetName = includesToken(text, row.set_name);
  const numberToken = compactNumber(row.card_number);
  const hasNumber = html.includes(`${numberToken}/`) || text.includes(`#${numberToken}`) || new RegExp(`\\b${numberToken}\\s+\\/\\s+\\d+\\b|\\b${numberToken}\\s+\\d+\\b`).test(text);
  const hasLeagueStamp = includesToken(text, 'League Stamp');
  const hasCrosshatchLeague = includesToken(text, 'Crosshatch (League Promo)');
  const hasReverseHolofoil = includesToken(text, 'Reverse Holofoil');

  if (!hasCardName || !hasSetName || !hasNumber) {
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      source_key: SOURCE_KEY,
      source_kind: 'collector_reference',
      source_url: sourceUrl,
      source_result: 'identity_not_confirmed',
      evidence_type: 'source_attempt',
      evidence_label: 'PokeScope page did not confirm exact set/card identity strongly enough.',
      finish_key: null,
      promotable: false,
      notes: `identity flags: card_name=${hasCardName}, set_name=${hasSetName}, number=${hasNumber}`,
    };
  }

  if (hasLeagueStamp || hasCrosshatchLeague) {
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      source_key: SOURCE_KEY,
      source_kind: 'collector_reference',
      source_url: sourceUrl,
      source_result: 'variant_supported_finish_unresolved',
      evidence_type: 'variant_presence',
      evidence_label: hasLeagueStamp
        ? 'PokeScope page lists League Stamp as a card variant.'
        : 'PokeScope page includes Crosshatch (League Promo) wording.',
      finish_key: null,
      observed_finish_terms: {
        reverse_holofoil_present_elsewhere_on_page: hasReverseHolofoil,
        crosshatch_league_present: hasCrosshatchLeague,
      },
      promotable: false,
      notes: 'Useful variant evidence only. The page does not safely bind League Stamp to an active Grookai finish key, so this must not create a child printing package by itself.',
    };
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    source_key: SOURCE_KEY,
    source_kind: 'collector_reference',
    source_url: sourceUrl,
    source_result: 'identity_supported_variant_not_found',
    evidence_type: 'source_attempt',
    evidence_label: 'PokeScope page confirmed the card identity but did not expose League Stamp text.',
    finish_key: null,
    promotable: false,
    notes: 'No variant/finish evidence accepted.',
  };
}

async function fetchPage(url) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (fetchError) {
    const command = [
      '$ProgressPreference = "SilentlyContinue";',
      '$headers = @{ "User-Agent" = "Mozilla/5.0 GrookaiVaultAudit" };',
      `$response = Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -Headers $headers -TimeoutSec 30;`,
      '$response.Content',
    ].join(' ');
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
      maxBuffer: 8 * 1024 * 1024,
    });
    if (!stdout) throw fetchError;
    return stdout;
  }
}

function renderMarkdown(report) {
  return `# PokeScope Live League Variant Acquisition V1

Audit-only pass against current \`league_finish_exact_source\` residual rows.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['source_attempts', report.summary.source_attempts],
    ['variant_supported_finish_unresolved', report.summary.by_source_result.variant_supported_finish_unresolved ?? 0],
    ['identity_supported_variant_not_found', report.summary.by_source_result.identity_supported_variant_not_found ?? 0],
    ['identity_not_confirmed', report.summary.by_source_result.identity_not_confirmed ?? 0],
    ['source_unavailable', report.summary.by_source_result.source_unavailable ?? 0],
    ['promotable_rows', report.summary.promotable_rows],
    ['write_ready_now', report.write_ready_now],
    ['db_writes_performed', report.db_writes_performed],
    ['migrations_created', report.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Accepted Evidence Boundary

PokeScope can support that a card has a League Stamp or Crosshatch League Promo variant.

This report does not promote any row because it does not safely bind the variant to an active Grookai child finish key.

## Rows With Variant Evidence But No Finish Binding

${markdownTable(
    ['set', 'number', 'card', 'source result', 'source url', 'notes'],
    report.rows
      .filter((row) => row.source_result === 'variant_supported_finish_unresolved')
      .map((row) => [row.set_key, row.card_number, row.card_name, row.source_result, row.source_url, row.notes]),
  )}

## Other Attempts

${markdownTable(
    ['result', 'set', 'number', 'card', 'source url', 'notes'],
    report.rows
      .filter((row) => row.source_result !== 'variant_supported_finish_unresolved')
      .slice(0, 80)
      .map((row) => [row.source_result, row.set_key, row.card_number, row.card_name, row.source_url, row.notes]),
  )}

## Safety

- No DB writes.
- No migrations.
- No dry-run package generated.
- No promotion from variant presence alone.
`;
}

async function main() {
  const queue = await readJson(QUEUE_JSON);
  const targets = (queue.rows ?? []).filter((row) => row.action_bucket === 'league_finish_exact_source');
  const rows = [];

  for (const row of targets) {
    const sourceUrl = pageUrl(row);
    try {
      const html = await fetchPage(sourceUrl);
      rows.push(classifyPage(row, sourceUrl, html));
    } catch (error) {
      rows.push(classifyPage(row, sourceUrl, '', String(error.message || error)));
    }
  }

  const bySourceResult = {};
  for (const row of rows) bySourceResult[row.source_result] = (bySourceResult[row.source_result] ?? 0) + 1;

  const report = {
    generated_at: new Date().toISOString(),
    version: 'pokescope_live_league_variant_acquisition_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      queue_json: rel(QUEUE_JSON),
    },
    summary: {
      target_rows: targets.length,
      source_attempts: rows.length,
      promotable_rows: rows.filter((row) => row.promotable).length,
      by_source_result: bySourceResult,
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson(rows));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

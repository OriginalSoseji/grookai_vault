import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

export const WORKER_VERSION = 'POKEMON_NEW_SET_DISCOVERY_MONITOR_V1';
export const DEFAULT_STATE_DIR = '/var/lib/grookai/new-set-discovery';
const DEFAULT_MAX_SOURCE_AGE_HOURS = 36;
const POKEMON_TCGPLAYER_CATEGORY_ID = 3;
const PRODUCT_OR_PROMO_PATTERN = /(?:promo|collection|blister|trainer kit|pop series|burger king|miscellaneous|world championship|league|deck|tin|box|pack)/i;
const EXPANSION_PREFIX_PATTERN = /^(?:me(?:\d+(?:\.\d+)?)?|sv\d*(?:\.\d+)?|swsh\d*(?:\.\d+)?|sm\d*(?:\.\d+)?|xy\d*(?:\.\d+)?|bw\d*(?:\.\d+)?|hgss\d*(?:\.\d+)?|dp\d*(?:\.\d+)?)\s*[:\-]\s*/i;

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function sha256(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function normalizeSetNameV1(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(EXPANSION_PREFIX_PATTERN, '')
    .replace(/\bpokemon\b/gi, '')
    .replace(/\btcg\b/gi, '')
    .replace(/\btrading card game\b/gi, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function comparableSetNames(value) {
  const normalized = normalizeSetNameV1(value);
  const values = new Set(normalized ? [normalized] : []);
  if (normalized.endsWith(' base set') && normalized.length > ' base set'.length) {
    values.add(normalized.slice(0, -' base set'.length).trim());
  }
  return [...values];
}

function parseDate(value) {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function datesNear(left, right, toleranceDays = 3) {
  const a = parseDate(left);
  const b = parseDate(right);
  if (!a || !b) return false;
  return Math.abs(a.getTime() - b.getTime()) <= toleranceDays * 86_400_000;
}

function numericIds(row) {
  return [row.tcgcsv_group_id, row.tcgplayer_group_id, row.source_tcgcsv_group_id]
    .map((value) => Number.parseInt(value, 10))
    .filter(Number.isInteger);
}

function canonicalNames(row) {
  return [row.name, row.tcgdex_name, row.pokemonapi_name, ...(Array.isArray(row.source_aliases) ? row.source_aliases : [])]
    .flatMap(comparableSetNames)
    .filter(Boolean);
}

export function reconcileSourceGroupV1(group, canonicalSets) {
  const groupId = Number(group.group_id);
  const idMatches = canonicalSets.filter((row) => numericIds(row).includes(groupId));
  if (idMatches.length === 1) {
    return {
      status: 'canonical_exact',
      authority: 'source_group_id',
      canonical_set_ids: [idMatches[0].id],
      canonical_set_codes: [idMatches[0].code]
    };
  }
  if (idMatches.length > 1) {
    return {
      status: 'canonical_ambiguous',
      authority: 'duplicate_source_group_id',
      canonical_set_ids: idMatches.map((row) => row.id),
      canonical_set_codes: idMatches.map((row) => row.code)
    };
  }

  const normalizedGroupNames = comparableSetNames(group.name);
  const nameMatches = canonicalSets.filter((row) => canonicalNames(row).some((name) => normalizedGroupNames.includes(name)));
  if (nameMatches.length === 1) {
    return {
      status: 'canonical_exact',
      authority: 'normalized_name',
      canonical_set_ids: [nameMatches[0].id],
      canonical_set_codes: [nameMatches[0].code]
    };
  }
  if (nameMatches.length > 1) {
    const dateMatches = nameMatches.filter((row) => datesNear(group.published_on, row.release_date));
    if (dateMatches.length === 1) {
      return {
        status: 'canonical_exact',
        authority: 'normalized_name_and_release_date',
        canonical_set_ids: [dateMatches[0].id],
        canonical_set_codes: [dateMatches[0].code]
      };
    }
    return {
      status: 'canonical_ambiguous',
      authority: 'duplicate_normalized_name',
      canonical_set_ids: nameMatches.map((row) => row.id),
      canonical_set_codes: nameMatches.map((row) => row.code)
    };
  }
  return {
    status: 'unmatched',
    authority: null,
    canonical_set_ids: [],
    canonical_set_codes: []
  };
}

export function classifySourceGroupV1(group, reconciliation, previousState = null) {
  const name = clean(group.name) ?? `TCGPlayer group ${group.group_id}`;
  const kind = PRODUCT_OR_PROMO_PATTERN.test(name)
    ? 'ancillary_or_product'
    : EXPANSION_PREFIX_PATTERN.test(name)
      ? 'expansion'
      : group.is_supplemental
        ? 'supplemental'
        : 'unknown';
  const evidenceFingerprint = sha256({
    group_id: group.group_id,
    name: group.name,
    abbreviation: group.abbreviation,
    published_on: group.published_on,
    is_supplemental: group.is_supplemental,
    source_active: group.source_active
  });
  const previousFingerprint = previousState?.seen_group_fingerprints?.[String(group.group_id)] ?? null;
  const previouslySeen = Boolean(previousFingerprint);
  const changedSinceMonitor = previousFingerprint !== evidenceFingerprint;
  let lane = 'canonical_reconciled';
  if (reconciliation.status === 'canonical_ambiguous') lane = 'review_required';
  else if (reconciliation.status === 'unmatched' && kind === 'expansion') lane = 'review_required';
  else if (reconciliation.status === 'unmatched') lane = 'candidate_backlog';

  return {
    group_id: Number(group.group_id),
    category_id: Number(group.category_id),
    name,
    abbreviation: clean(group.abbreviation),
    published_on: clean(group.published_on),
    first_seen_at: clean(group.first_seen_at),
    last_seen_at: clean(group.last_seen_at),
    source_active: Boolean(group.source_active),
    is_supplemental: Boolean(group.is_supplemental),
    group_kind: kind,
    discovery_lane: lane,
    first_seen_by_monitor: !previouslySeen,
    changed_since_monitor: changedSinceMonitor,
    evidence_fingerprint_sha256: evidenceFingerprint,
    reconciliation
  };
}

export function buildDiscoveryReportV1({ groups, canonicalSets, sourceRun, previousState, now = new Date(), maxSourceAgeHours = DEFAULT_MAX_SOURCE_AGE_HOURS }) {
  const sourceTerminalAt = sourceRun?.finished_at ?? sourceRun?.started_at ?? sourceRun?.created_at ?? null;
  const sourceAgeHours = sourceTerminalAt ? Math.max(0, (now.getTime() - Date.parse(sourceTerminalAt)) / 3_600_000) : null;
  const sourceRunHealthy = Boolean(
    sourceRun
      && ['completed', 'skipped_no_change'].includes(sourceRun.status)
      && Number(sourceRun.failed_count ?? 0) === 0
      && Number.isFinite(sourceAgeHours)
      && sourceAgeHours <= maxSourceAgeHours
  );
  const rows = groups
    .filter((group) => group.source_active !== false)
    .map((group) => classifySourceGroupV1(group, reconcileSourceGroupV1(group, canonicalSets), previousState))
    .sort((left, right) => left.group_id - right.group_id);
  const reviewRows = rows.filter((row) => row.discovery_lane === 'review_required');
  const newReviewRows = reviewRows.filter((row) => row.changed_since_monitor);
  const ambiguousRows = rows.filter((row) => row.reconciliation.status === 'canonical_ambiguous');
  const candidateFingerprint = sha256(reviewRows.map((row) => ({ group_id: row.group_id, name: row.name, lane: row.discovery_lane })));
  const findings = [];
  if (!sourceRun) findings.push('source_sync_missing');
  else if (!['completed', 'skipped_no_change'].includes(sourceRun.status)) findings.push(`source_sync_not_terminal:${sourceRun.status}`);
  if (Number(sourceRun?.failed_count ?? 0) > 0) findings.push(`source_sync_failures:${sourceRun.failed_count}`);
  if (!Number.isFinite(sourceAgeHours) || sourceAgeHours > maxSourceAgeHours) findings.push('source_sync_stale');

  return {
    schema_version: WORKER_VERSION,
    observed_at: now.toISOString(),
    status: sourceRunHealthy ? 'succeeded' : 'failed',
    monitor_bootstrap: !previousState,
    source: {
      category_id: POKEMON_TCGPLAYER_CATEGORY_ID,
      run_id: sourceRun?.id ?? null,
      run_key: sourceRun?.run_key ?? null,
      status: sourceRun?.status ?? null,
      terminal_at: sourceTerminalAt,
      age_hours: sourceAgeHours,
      max_age_hours: maxSourceAgeHours,
      artifact_hash: sourceRun?.artifact_hash ?? null,
      git_commit_sha: sourceRun?.git_commit_sha ?? null
    },
    counts: {
      source_groups: rows.length,
      canonical_sets_considered: canonicalSets.length,
      canonical_exact: rows.filter((row) => row.reconciliation.status === 'canonical_exact').length,
      canonical_ambiguous: ambiguousRows.length,
      review_required: reviewRows.length,
      newly_observed_review_required: newReviewRows.length,
      candidate_backlog: rows.filter((row) => row.discovery_lane === 'candidate_backlog').length
    },
    candidate_fingerprint_sha256: candidateFingerprint,
    findings,
    review_required: reviewRows,
    canonical_ambiguities: ambiguousRows,
    candidate_backlog: rows.filter((row) => row.discovery_lane === 'candidate_backlog'),
    reconciled_groups: rows.filter((row) => row.discovery_lane === 'canonical_reconciled')
  };
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const maxSourceAgeHours = Number(value('--max-source-age-hours') ?? process.env.POKEMON_NEW_SET_DISCOVERY_MAX_SOURCE_AGE_HOURS ?? DEFAULT_MAX_SOURCE_AGE_HOURS);
  if (!Number.isFinite(maxSourceAgeHours) || maxSourceAgeHours <= 0) throw new Error('--max-source-age-hours must be positive');
  return {
    stateDir: path.resolve(value('--state-dir') ?? process.env.POKEMON_NEW_SET_DISCOVERY_STATE_DIR ?? DEFAULT_STATE_DIR),
    maxSourceAgeHours,
    notify: argv.includes('--notify'),
    dryRun: argv.includes('--dry-run')
  };
}

async function readJsonOrNull(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeAtomic(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, 'utf8');
  await fs.rename(temporary, file);
}

async function writeJson(file, value) {
  await writeAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

function reportMarkdown(report) {
  const rows = report.review_required.map((row) => `| ${row.group_id} | ${row.name.replaceAll('|', '\\|')} | ${row.group_kind} | ${row.reconciliation.status} | ${row.changed_since_monitor ? 'yes' : 'no'} |`);
  return [
    '# Pokemon New-Set Discovery Monitor V1',
    '',
    `Observed: ${report.observed_at}`,
    '',
    `Status: **${report.status.toUpperCase()}**`,
    '',
    `Source sync: \`${report.source.run_key ?? 'missing'}\` (${report.source.status ?? 'missing'}, ${report.source.age_hours === null ? 'unknown' : report.source.age_hours.toFixed(2)} hours old)`,
    '',
    `Review required: ${report.counts.review_required}`,
    '',
    '| Group | Name | Kind | Reconciliation | New or changed |',
    '| ---: | --- | --- | --- | --- |',
    ...(rows.length ? rows : ['| - | None | - | - | - |']),
    '',
    'This monitor is read-only. A candidate is evidence for governed staging, never canonical promotion authority.',
    ''
  ].join('\n');
}

function connectionString() {
  return clean(process.env.SUPABASE_DB_URL)
    ?? clean(process.env.DATABASE_URL)
    ?? clean(process.env.POSTGRES_URL);
}

async function collectDatabaseEvidence(client) {
  await client.query('begin read only');
  try {
    await client.query("set local statement_timeout = '30s'");
    await client.query("set local lock_timeout = '5s'");
    const sourceRun = (await client.query(`
      select id, run_key, status, failed_count, artifact_hash, git_commit_sha,
             started_at, finished_at, created_at
        from public.tcgcsv_source_sync_runs
       where sync_mode = 'current_full_sync'
       order by created_at desc, id desc
       limit 1
    `)).rows[0] ?? null;
    const groups = (await client.query(`
      select group_id, category_id, name, abbreviation, is_supplemental,
             published_on, first_seen_at, last_seen_at, source_active
        from public.tcgcsv_source_groups
       where category_id = $1
       order by group_id
    `, [POKEMON_TCGPLAYER_CATEGORY_ID])).rows;
    const canonicalSets = (await client.query(`
      select id, code, name, release_date, identity_domain_default,
             source #>> '{new_set_release_ingestion_v1,source_ids,tcgcsv_group_id}' as tcgcsv_group_id,
             source ->> 'tcgplayer_group_id' as tcgplayer_group_id,
             source #>> '{source_ids,tcgcsv_group_id}' as source_tcgcsv_group_id,
             source #>> '{tcgdex,name}' as tcgdex_name,
             source #>> '{pokemonapi,name}' as pokemonapi_name,
             case when jsonb_typeof(source -> 'source_aliases') = 'array'
                  then source -> 'source_aliases' else '[]'::jsonb end as source_aliases
        from public.sets
       where game = 'pokemon'
         and coalesce(identity_domain_default, '') not ilike '%jpn%'
         and source ->> 'canonical_name_ja' is null
       order by id
    `)).rows.map((row) => ({
      ...row,
      source_aliases: Array.isArray(row.source_aliases) ? row.source_aliases : []
    }));
    await client.query('rollback');
    return { sourceRun, groups, canonicalSets };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function notify(report, runDir, previousState) {
  const alertCandidates = report.review_required.filter((row) => row.changed_since_monitor);
  const newFingerprint = sha256(alertCandidates.map((row) => ({
    group_id: row.group_id,
    evidence_fingerprint_sha256: row.evidence_fingerprint_sha256,
    reconciliation: row.reconciliation.status
  })));
  if (previousState?.last_alerted_candidate_fingerprint_sha256 === newFingerprint) {
    const receipt = { status: 'suppressed_duplicate', candidate_fingerprint_sha256: newFingerprint };
    await writeJson(path.join(runDir, 'notification_receipt.json'), receipt);
    return receipt;
  }
  const url = clean(process.env.GROOKAI_OPERATIONS_WEBHOOK_URL);
  const token = clean(process.env.GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN);
  if (!url || !token) throw new Error('operations webhook URL and bearer token are required with --notify');
  const payload = buildNotificationPayloadV1({
    report,
    alertCandidates,
    candidateFingerprint: newFingerprint
  });
  await writeJson(path.join(runDir, 'notification_payload.json'), payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const receipt = { status: response.ok ? 'delivered' : 'delivery_failed', http_status: response.status, delivered_at: new Date().toISOString() };
    await writeJson(path.join(runDir, 'notification_receipt.json'), receipt);
    if (!response.ok) throw new Error(`operations webhook returned HTTP ${response.status}`);
    return receipt;
  } finally {
    clearTimeout(timer);
  }
}

export function buildNotificationPayloadV1({
  report,
  alertCandidates,
  candidateFingerprint,
  hostname = os.hostname(),
  deployedCommitSha = clean(process.env.GROOKAI_DEPLOYED_COMMIT_SHA ?? process.env.GITHUB_SHA)
}) {
  return {
    notification_version: WORKER_VERSION,
    notification_id: sha256(`new_set_discovery|${candidateFingerprint}`),
    event: 'pokemon_new_set_discovery_candidate',
    severity: 'warning',
    created_at: report.observed_at,
    host: hostname,
    unit: 'grookai-pokemon-new-set-discovery.service',
    commit_sha: deployedCommitSha,
    candidate_fingerprint_sha256: candidateFingerprint,
    review_required_count: alertCandidates.length,
    candidates: alertCandidates.map((row) => ({ group_id: row.group_id, name: row.name, kind: row.group_kind }))
  };
}

export async function runPokemonNewSetDiscoveryMonitorV1({ argv = process.argv.slice(2), now = new Date() } = {}) {
  const args = parseArgs(argv);
  const databaseUrl = connectionString();
  if (!databaseUrl) throw new Error('SUPABASE_DB_URL or DATABASE_URL is required');
  const previousState = await readJsonOrNull(path.join(args.stateDir, 'state.json'));
  const client = new Client({ connectionString: databaseUrl, application_name: 'pokemon_new_set_discovery_monitor_v1' });
  await client.connect();
  let evidence;
  try {
    evidence = await collectDatabaseEvidence(client);
  } finally {
    await client.end();
  }
  const report = buildDiscoveryReportV1({ ...evidence, previousState, now, maxSourceAgeHours: args.maxSourceAgeHours });
  const stamp = report.observed_at.replace(/[:.]/g, '-');
  const runDir = path.join(args.stateDir, 'runs', stamp);
  await fs.mkdir(runDir, { recursive: true });
  const reportContent = `${JSON.stringify(report, null, 2)}\n`;
  await writeAtomic(path.join(runDir, 'report.json'), reportContent);
  await writeAtomic(path.join(runDir, 'REPORT.md'), reportMarkdown(report));
  const reportHash = sha256(reportContent);
  await writeAtomic(path.join(runDir, 'report.json.sha256'), `${reportHash}  report.json\n`);
  await writeAtomic(path.join(args.stateDir, 'latest.json'), reportContent);

  let notification = { status: 'not_requested' };
  if (args.notify && report.status === 'succeeded' && report.monitor_bootstrap && !args.dryRun) {
    notification = { status: 'bootstrap_suppressed' };
    await writeJson(path.join(runDir, 'notification_receipt.json'), notification);
  } else if (args.notify && report.status === 'succeeded' && report.counts.newly_observed_review_required > 0 && !args.dryRun) {
    notification = await notify(report, runDir, previousState);
  }
  const seen = Object.fromEntries([
    ...report.review_required,
    ...report.candidate_backlog,
    ...report.reconciled_groups
  ].map((row) => [String(row.group_id), row.evidence_fingerprint_sha256]));
  const state = {
    schema_version: WORKER_VERSION,
    last_attempt_at: report.observed_at,
    last_success_at: report.status === 'succeeded' ? report.observed_at : previousState?.last_success_at ?? null,
    last_source_sync_run_id: report.source.run_id,
    last_candidate_fingerprint_sha256: report.candidate_fingerprint_sha256,
    last_alerted_candidate_fingerprint_sha256: notification.status === 'delivered'
      ? report.candidate_fingerprint_sha256
      : previousState?.last_alerted_candidate_fingerprint_sha256 ?? null,
    seen_group_fingerprints: seen,
    latest_report_path: path.join(runDir, 'report.json'),
    latest_report_sha256: reportHash
  };
  await writeJson(path.join(args.stateDir, 'state.json'), state);
  process.stdout.write(`${JSON.stringify({ status: report.status, counts: report.counts, notification, run_dir: runDir }, null, 2)}\n`);
  if (report.status !== 'succeeded') process.exitCode = 1;
  return { report, state, notification, runDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runPokemonNewSetDiscoveryMonitorV1().catch((error) => {
    console.error(`[pokemon-new-set-discovery] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}

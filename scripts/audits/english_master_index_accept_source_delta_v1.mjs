import fs from 'node:fs/promises';
import path from 'node:path';

import { normalizeFinishKey, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const DELTA_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1';
const FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_source_delta_acceptance_v1';
const REPORT_DIR = 'docs/audits/english_master_index_source_exhaustion_v1/source_delta_acceptance_v1';

const ACCEPTED_STATUSES = new Set([
  'candidate_second_source',
  'candidate_human_finish_evidence',
  'candidate_second_finish_source',
  'suppressed_claim_review_evidence',
]);

function parseArgs(argv) {
  const options = { sources: null, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--sources') {
      options.sources = new Set(next.split(',').map((value) => normalizeText(value)).filter(Boolean));
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

async function listDeltaFiles() {
  const files = await fs.readdir(DELTA_DIR);
  return files.filter((file) => file.endsWith('_source_delta_audit_v1.json')).sort();
}

function recordKey(row) {
  return [
    row.source_key,
    row.evidence_type,
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    normalizeFinishKey(row.finish_key) ?? '',
  ].join('|');
}

function recordFromMatch(match, generatedAt, deltaFile) {
  return {
    source_key: match.candidate_source_key,
    source_kind: match.candidate_source_kind,
    source_url: match.candidate_url,
    set_key: match.set_key,
    set_name: match.set_name,
    card_number: match.card_number,
    card_name: match.card_name,
    finish_key: match.fact_type === 'card_identity' ? null : normalizeFinishKey(match.finish_key),
    rarity: null,
    evidence_type: match.fact_type === 'card_identity' ? 'card_identity' : 'finish_presence',
    evidence_label: match.evidence_label,
    language: 'en',
    retrieved_at: generatedAt,
    raw_snapshot_ref: `accepted_delta:${deltaFile}:${match.candidate_source_key}:${match.set_key}:${match.card_number}:${normalizeFinishKey(match.finish_key) ?? 'identity'}`,
    notes: `Accepted from source delta audit with status ${match.delta_status}. This is exact gap-matched evidence only; broad source fixture rows remain excluded from direct promotion.`,
  };
}

async function readExistingFixtureRecords(sourceKey) {
  const file = path.join(FIXTURE_DIR, `${sourceKey}.json`);
  try {
    const payload = await readJson(file);
    return Array.isArray(payload.records) ? payload.records : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();
  const records = [];
  const sourceSummaries = [];
  for (const file of await listDeltaFiles()) {
    const payload = await readJson(path.join(DELTA_DIR, file));
    const sourceKey = normalizeText(payload.source_key);
    if (options.sources && !options.sources.has(sourceKey)) continue;
    const useful = (payload.useful_matches ?? []).filter((match) => ACCEPTED_STATUSES.has(match.delta_status));
    for (const match of useful) records.push(recordFromMatch(match, generatedAt, file));
    if (useful.length) {
      sourceSummaries.push({
        source_key: payload.source_key,
        accepted_matches: useful.length,
        statuses: [...new Set(useful.map((match) => match.delta_status))].sort(),
      });
    }
  }
  const deduped = [...new Map(records.map((record) => [recordKey(record), record])).values()]
    .sort((a, b) => String(a.source_key).localeCompare(String(b.source_key))
      || String(a.set_key).localeCompare(String(b.set_key))
      || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name))
      || String(a.finish_key ?? '').localeCompare(String(b.finish_key ?? '')));

  const bySource = new Map();
  for (const record of deduped) {
    if (!bySource.has(record.source_key)) bySource.set(record.source_key, []);
    bySource.get(record.source_key).push(record);
  }
  const fixtureFiles = [];
  const preservedExistingCounts = new Map();
  if (!options.dryRun) {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    for (const [sourceKey, sourceRecords] of bySource.entries()) {
      const existingRecords = await readExistingFixtureRecords(sourceKey);
      preservedExistingCounts.set(sourceKey, existingRecords.length);
      const mergedRecords = [...new Map([...existingRecords, ...sourceRecords].map((record) => [recordKey(record), record])).values()]
        .sort((a, b) => String(a.source_key).localeCompare(String(b.source_key))
          || String(a.set_key).localeCompare(String(b.set_key))
          || normalizeNumber(a.card_number).localeCompare(normalizeNumber(b.card_number), undefined, { numeric: true })
          || String(a.card_name).localeCompare(String(b.card_name))
          || String(a.finish_key ?? '').localeCompare(String(b.finish_key ?? '')));
      const file = path.join(FIXTURE_DIR, `${sourceKey}.json`);
      const fixture = {
        fixture_version: 'VERIFIED_MASTER_SET_INDEX_V1_HUMAN_SOURCE_FIXTURE_GENERATED',
        source_key: `${sourceKey}_accepted_delta_v1`,
        source_kind: mergedRecords[0]?.source_kind ?? 'collector_reference',
        source_url: mergedRecords[0]?.source_url ?? 'accepted_delta',
        source_status: 'available_generated_accepted_delta',
        set_key: 'accepted_delta',
        set_name: `${sourceKey} accepted delta`,
        retrieved_at: generatedAt,
        raw_snapshot_ref: `generated_fixture:accepted_delta:${sourceKey}:${generatedAt}`,
        audit_only: true,
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        quarantine_performed: false,
        generation_note: 'Generated from source delta audit useful matches only. Existing accepted delta rows are preserved to avoid source-reset evidence loss.',
        records: mergedRecords,
      };
      await fs.writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
      fixtureFiles.push(file);
    }
  }

  const report = {
    version: 'english_master_index_accept_source_delta_v1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    dry_run: options.dryRun,
    fixture_dir: options.dryRun ? null : FIXTURE_DIR,
    fixture_files: fixtureFiles,
    summary: {
      accepted_records: deduped.length,
      sources_with_accepted_records: bySource.size,
      accepted_statuses: [...new Set(deduped.map((record) => record.notes.match(/status ([^.]+)/)?.[1]).filter(Boolean))].sort(),
      preserved_existing_records: [...preservedExistingCounts.values()].reduce((sum, count) => sum + count, 0),
    },
    sources: sourceSummaries,
  };
  if (!options.dryRun) {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORT_DIR, 'source_delta_acceptance_v1.json'), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(path.join(REPORT_DIR, 'source_delta_acceptance_v1.md'), [
      '# Source Delta Acceptance V1',
      '',
      'Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.',
      '',
      'Only useful source-delta matches are written as accepted fixture evidence. Broad source dumps remain excluded unless separately preserved from the promoted Master Index.',
      '',
      `Generated: ${generatedAt}`,
      '',
      `- Accepted records: ${deduped.length}`,
      `- Sources with accepted records: ${bySource.size}`,
      '',
    ].join('\n'));
  }
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error('[source-delta-acceptance] failed:', error);
  process.exitCode = 1;
});

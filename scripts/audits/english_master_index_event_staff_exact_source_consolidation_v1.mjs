import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'english_master_index_post_collexy_residual_action_plan_v1.json',
);
const FIXTURE_ROOT = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'source_fixtures',
);
const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_source_exhaustion_v1',
  'event_staff_exact_source_consolidation_v1',
);
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'event_staff_exact_source_consolidation_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'event_staff_exact_source_consolidation_v1.md');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, '20260622_event_staff_exact_source_consolidation_checkpoint_v1.md');

const SOURCE_DIR_ALLOWLIST = [
  'generated_event_staff_exact_source_evidence_v1',
  'generated_collexy_governed_stamp_finish_v1',
  'generated_binderbuilder_v1',
  'generated_cardtrader_v1',
  'generated_elitefourum_alternate_v1',
  'generated_bulbapedia_card_pages_v1',
  'generated_pokecardvalues_stamped_finish_v1',
  'generated_pricecharting_stamp_label_v1',
  'generated_pokumon_stamped_special_candidate_acquisition_v1',
  'generated_tcgcsv_stamped_subtype_v1',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

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

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&amp;|&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  return String(value ?? '')
    .trim()
    .replace(/^#/, '')
    .replace(/^0+([0-9])/, '$1')
    .toUpperCase();
}

function keyFor(row) {
  return [
    String(row.set_key ?? '').toLowerCase(),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
  ].join('|');
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listJsonFiles(full));
    if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
  }
  return files;
}

function extractRows(json) {
  if (Array.isArray(json?.records)) return json.records;
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json)) return json;
  return [];
}

function loadFixtureRecords() {
  const records = [];
  for (const dirName of SOURCE_DIR_ALLOWLIST) {
    const dir = path.join(FIXTURE_ROOT, dirName);
    for (const file of listJsonFiles(dir)) {
      let json;
      try {
        json = readJson(file);
      } catch {
        continue;
      }
      for (const row of extractRows(json)) {
        if (!row?.card_name || !row?.card_number) continue;
        const text = normalizeText([
          row.variant_key,
          row.stamp_label,
          row.finish_key,
          row.evidence_label,
          row.notes,
          row.raw_snapshot_ref,
          row.source_key,
        ].filter(Boolean).join(' '));
        if (!/(staff|finalist|champion|championship|world|regional|tropical)/.test(text)) continue;
        records.push({
          ...row,
          fixture_file: path.relative(ROOT, file).replace(/\\/g, '/'),
          fixture_dir: dirName,
          evidence_text_normalized: text,
          match_key: keyFor(row),
        });
      }
    }
  }
  return records;
}

function usableFinishKey(value) {
  const finish = String(value ?? '').trim().toLowerCase();
  if (!finish || finish === 'stamped' || finish === 'stamp') return null;
  return finish;
}

function expectedTokens(row) {
  const variant = normalizeText(`${row.variant_key} ${row.stamp_label}`);
  if (variant.includes('quarter finalist')) return ['quarter', 'finalist'];
  if (variant.includes('finalist')) return ['finalist'];
  if (variant.includes('regional championships staff')) return ['regional', 'staff'];
  if (variant.includes('regional championships')) return ['regional'];
  if (variant.includes('world championships')) return ['world'];
  if (variant.includes('asia championship')) return ['asia', 'championship'];
  if (variant.includes('league cup staff')) return ['league', 'cup', 'staff'];
  if (variant.includes('staff')) return ['staff'];
  return variant.split(' ').filter((token) => token.length > 3);
}

function isVariantRelevant(row, record) {
  const text = record.evidence_text_normalized;
  return expectedTokens(row).every((token) => text.includes(token));
}

function classifySourceKind(record) {
  const joined = normalizeText(`${record.source_kind ?? ''} ${record.source_key ?? ''} ${record.fixture_file ?? ''}`);
  if (joined.includes('bulbapedia') || joined.includes('elitefourum') || joined.includes('binderbuilder')) return 'human_checklist';
  if (joined.includes('tcgcsv') || joined.includes('tcgplayer')) return 'structured_catalog';
  if (joined.includes('pricecharting') || joined.includes('cardtrader') || joined.includes('pokecardvalues') || joined.includes('pokumon')) return 'marketplace_or_collector_reference';
  return record.source_kind || 'unknown';
}

function toFixtureMatches(matches) {
  return matches.map((record) => ({
    source_key: record.source_key,
    source_kind: record.source_kind,
    source_url: record.source_url,
    finish_key: usableFinishKey(record.finish_key),
    evidence_label: record.evidence_label,
    fixture_file: record.fixture_file,
  }));
}

function classifyRow(row, recordsByKey) {
  const matches = (recordsByKey.get(keyFor(row)) ?? []).filter((record) => isVariantRelevant(row, record));
  const finishKeys = [...new Set(matches.map((record) => usableFinishKey(record.finish_key)).filter(Boolean))].sort();
  const sourceFamilies = [...new Set(matches.map(classifySourceKind))].sort();
  const hasHumanOrCollector = sourceFamilies.some((family) => ['human_checklist', 'marketplace_or_collector_reference'].includes(family));
  if (matches.length === 0) {
    return {
      ...row,
      consolidation_status: 'still_blocked_no_preserved_event_staff_fixture',
      candidate_finish_keys: [],
      source_families: [],
      fixture_matches: [],
      recommended_next_action: 'Manual source acquisition still required for exact event/staff stamp and finish.',
    };
  }
  if (finishKeys.length === 0) {
    return {
      ...row,
      consolidation_status: 'identity_supported_finish_unproven_no_write',
      candidate_finish_keys: [],
      source_families: sourceFamilies,
      fixture_matches: toFixtureMatches(matches),
      recommended_next_action: 'Event/staff identity supported, but exact active finish remains unavailable.',
    };
  }
  if (finishKeys.length > 1) {
    return {
      ...row,
      consolidation_status: 'conflicting_event_staff_finish_candidates_no_write',
      candidate_finish_keys: finishKeys,
      source_families: sourceFamilies,
      fixture_matches: toFixtureMatches(matches),
      recommended_next_action: 'Manual finish adjudication required before any truth promotion.',
    };
  }
  if (!hasHumanOrCollector) {
    return {
      ...row,
      consolidation_status: 'structured_only_event_staff_finish_candidate_no_write',
      candidate_finish_keys: finishKeys,
      source_families: sourceFamilies,
      fixture_matches: toFixtureMatches(matches),
      recommended_next_action: 'Need human/checklist/collector source before master truth.',
    };
  }
  return {
    ...row,
    consolidation_status: 'preserved_event_staff_finish_candidate_no_write',
    candidate_finish_keys: finishKeys,
    source_families: sourceFamilies,
    fixture_matches: toFixtureMatches(matches),
    recommended_next_action: 'Run source-delta/readiness only; no DB write until current snapshot proves row is still missing and non-conflicting.',
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Event/Staff Exact Source Consolidation V1');
  lines.push('');
  lines.push('Audit-only consolidation for `event_staff_exact_finish_missing_or_absorbed` rows.');
  lines.push('');
  lines.push('- DB writes performed: false');
  lines.push('- Migrations created: false');
  lines.push('- Dry-run package prepared: false');
  lines.push('- Cleanup performed: false');
  lines.push('- Quarantine performed: false');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Target rows: ${report.summary.target_rows}`);
  lines.push(`- Preserved fixture records considered: ${report.summary.preserved_fixture_records_considered}`);
  lines.push(`- Write-ready created: ${report.summary.write_ready_created}`);
  lines.push('');
  lines.push('## By Status');
  lines.push('');
  for (const [status, count] of Object.entries(report.summary.by_status)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');
  lines.push('## Candidate Rows');
  lines.push('');
  const candidates = report.rows.filter((row) => row.consolidation_status === 'preserved_event_staff_finish_candidate_no_write');
  if (candidates.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Set | Number | Card | Variant | Finish | Sources |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const row of candidates) {
      const sources = row.fixture_matches.slice(0, 4).map((match) => `[${match.source_key}](${match.source_url})`).join('<br>');
      lines.push(`| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label} | ${row.candidate_finish_keys.join(', ')} | ${sources} |`);
    }
  }
  lines.push('');
  lines.push('## Blocked / Review Rows');
  lines.push('');
  lines.push('| Set | Number | Card | Status | Next Action |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.rows.filter((entry) => entry.consolidation_status !== 'preserved_event_staff_finish_candidate_no_write')) {
    lines.push(`| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.consolidation_status} | ${row.recommended_next_action} |`);
  }
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function appendCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  const rel = path.basename(CHECKPOINT_FILE);
  const line = `- 2026-06-22: Event/staff exact source consolidation checkpoint — reconciles preserved source evidence against 19 current event/staff rows with no DB writes. See docs/checkpoints/master_index/${rel}.`;
  if (!current.includes(rel)) writeText(indexPath, `${current.trimEnd()}\n${line}\n`);
}

function writeCheckpoint(report) {
  const lines = [];
  lines.push('# Event/Staff Exact Source Consolidation Checkpoint V1');
  lines.push('');
  lines.push('- Date: 2026-06-22');
  lines.push('- Mode: audit only');
  lines.push('- DB writes performed: false');
  lines.push('- Migrations created: false');
  lines.push('- Cleanup performed: false');
  lines.push('- Quarantine performed: false');
  lines.push('- Dry-run package prepared: false');
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`- Target rows: ${report.summary.target_rows}`);
  lines.push(`- Preserved fixture records considered: ${report.summary.preserved_fixture_records_considered}`);
  for (const [status, count] of Object.entries(report.summary.by_status)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- Report: ${path.relative(ROOT, OUTPUT_MD).replace(/\\/g, '/')}`);
  lines.push(`- JSON: ${path.relative(ROOT, OUTPUT_JSON).replace(/\\/g, '/')}`);
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  writeText(CHECKPOINT_FILE, `${lines.join('\n')}\n`);
  appendCheckpointIndex();
}

function main() {
  const plan = readJson(PLAN_PATH);
  const targetRows = (plan.rows ?? []).filter((row) => row.blocker_class === 'event_staff_exact_finish_missing_or_absorbed');
  const fixtureRecords = loadFixtureRecords();
  const recordsByKey = new Map();
  for (const record of fixtureRecords) {
    if (!recordsByKey.has(record.match_key)) recordsByKey.set(record.match_key, []);
    recordsByKey.get(record.match_key).push(record);
  }
  const rows = targetRows.map((row) => classifyRow(row, recordsByKey));
  const seed = {
    version: 'event_staff_exact_source_consolidation_v1',
    generated_at: new Date().toISOString(),
    input_plan: path.relative(ROOT, PLAN_PATH).replace(/\\/g, '/'),
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      dry_run_package_prepared: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_executed: false,
    },
    source_fixture_dirs_considered: SOURCE_DIR_ALLOWLIST,
    summary: {
      target_rows: targetRows.length,
      preserved_fixture_records_considered: fixtureRecords.length,
      by_status: countBy(rows, (row) => row.consolidation_status),
      by_candidate_finish: countBy(
        rows.filter((row) => row.candidate_finish_keys?.length === 1),
        (row) => row.candidate_finish_keys[0],
      ),
      write_ready_created: 0,
    },
    rows,
  };
  const report = { ...seed, fingerprint_sha256: sha256(stableJson(seed)) };
  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeCheckpoint(report);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`fingerprint_sha256=${report.fingerprint_sha256}`);
}

main();

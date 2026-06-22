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
  'exact_finish_binding_consolidation_v1',
);
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'exact_finish_binding_consolidation_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'exact_finish_binding_consolidation_v1.md');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, '20260622_exact_finish_binding_consolidation_checkpoint_v1.md');

const SOURCE_DIR_ALLOWLIST = [
  'generated_pkmngg_stamped_finish_v1',
  'generated_cardtrader_stamped_finish_v1',
  'generated_pokecardvalues_stamped_finish_v1',
  'generated_pkg17l_pricecharting_league_active_finish_acquisition_v1',
  'generated_pkg17o_league_preserved_evidence_absorption_v1',
  'generated_pkg17p_pokemonflashfire_league_reverse_source_v1',
  'generated_pkg17s_league_reverse_second_source_v1',
  'generated_pkg18o_pokemonflashfire_live_league_reverse_source_v1',
  'generated_small_custom_stamp_web_evidence_v1',
  'generated_pokumon_stamped_special_candidate_acquisition_v1',
  'generated_pkmngg_stamped_finish_v1',
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

function keyFor(value) {
  return [
    String(value.set_key ?? '').toLowerCase(),
    normalizeNumber(value.card_number),
    normalizeText(value.card_name),
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
      const rows = Array.isArray(json.records) ? json.records : (Array.isArray(json) ? json : []);
      for (const record of rows) {
        if (!record?.finish_key) continue;
        const evidenceText = normalizeText([
          record.evidence_label,
          record.notes,
          record.raw_snapshot_ref,
        ].filter(Boolean).join(' '));
        records.push({
          ...record,
          fixture_file: path.relative(ROOT, file).replace(/\\/g, '/'),
          fixture_dir: dirName,
          evidence_text_normalized: evidenceText,
          match_key: keyFor(record),
        });
      }
    }
  }
  return records;
}

function isVariantRelevant(row, record) {
  const targetTerms = normalizeText([row.variant_key, row.stamp_label].filter(Boolean).join(' '));
  const evidence = record.evidence_text_normalized;
  if (!targetTerms) return false;
  if (normalizeText(row.variant_key) === 'league stamp') return evidence.includes('league');
  if (normalizeText(row.variant_key) === 'league_stamp') return evidence.includes('league');
  if (targetTerms.includes('league')) return evidence.includes('league');
  if (targetTerms.includes('staff')) return evidence.includes('staff');
  if (targetTerms.includes('prerelease')) return evidence.includes('prerelease') || evidence.includes('pre release');
  if (targetTerms.includes('professor')) return evidence.includes('professor');
  return targetTerms.split(' ').filter((term) => term.length > 3).some((term) => evidence.includes(term));
}

function classifyRow(row, recordsByKey) {
  const matches = (recordsByKey.get(keyFor(row)) ?? []).filter((record) => isVariantRelevant(row, record));
  const finishKeys = [...new Set(matches.map((record) => record.finish_key).filter(Boolean))].sort();
  if (matches.length === 0) {
    return {
      ...row,
      consolidation_status: 'still_blocked_no_preserved_exact_finish_fixture',
      candidate_finish_keys: [],
      fixture_matches: [],
      recommended_next_action: 'Manual source acquisition still required. Need exact set + card number + card name + stamp/variant + finish + URL.',
    };
  }
  if (finishKeys.length === 1) {
    return {
      ...row,
      consolidation_status: 'preserved_fixture_single_finish_candidate_no_write',
      candidate_finish_keys: finishKeys,
      fixture_matches: matches.map((record) => ({
        source_key: record.source_key,
        source_kind: record.source_kind,
        source_url: record.source_url,
        finish_key: record.finish_key,
        evidence_label: record.evidence_label,
        fixture_file: record.fixture_file,
      })),
      recommended_next_action: 'Run source-delta/readiness only; do not write until current DB snapshot proves this row is still missing and non-conflicting.',
    };
  }
  return {
    ...row,
    consolidation_status: 'preserved_fixture_conflicting_finish_candidates_no_write',
    candidate_finish_keys: finishKeys,
    fixture_matches: matches.map((record) => ({
      source_key: record.source_key,
      source_kind: record.source_kind,
      source_url: record.source_url,
      finish_key: record.finish_key,
      evidence_label: record.evidence_label,
      fixture_file: record.fixture_file,
    })),
    recommended_next_action: 'Manual finish adjudication required; conflicting preserved finish candidates cannot become truth.',
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Exact Finish Binding Consolidation V1');
  lines.push('');
  lines.push('Audit-only consolidation of the `exact_finish_binding_missing` / `league_finish_exact_source` residual bucket.');
  lines.push('');
  lines.push('- DB writes performed: false');
  lines.push('- Migrations created: false');
  lines.push('- Dry-run package prepared: false');
  lines.push('- Cleanup performed: false');
  lines.push('- Quarantine performed: false');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  for (const [key, value] of Object.entries(report.summary)) {
    if (typeof value !== 'object') lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  lines.push('## By Status');
  lines.push('');
  for (const [status, count] of Object.entries(report.summary.by_status)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');
  lines.push('## Single-Finish Candidates');
  lines.push('');
  const candidates = report.rows.filter((row) => row.consolidation_status === 'preserved_fixture_single_finish_candidate_no_write');
  if (candidates.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Set | Number | Card | Variant | Finish | Sources |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const row of candidates) {
      const sources = row.fixture_matches.map((match) => `[${match.source_key}](${match.source_url})`).join('<br>');
      lines.push(`| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label ?? row.variant_key} | ${row.candidate_finish_keys.join(', ')} | ${sources} |`);
    }
  }
  lines.push('');
  lines.push('## Still Blocked');
  lines.push('');
  const blocked = report.rows.filter((row) => row.consolidation_status === 'still_blocked_no_preserved_exact_finish_fixture');
  if (blocked.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Set | Number | Card | Variant | Next Action |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const row of blocked) {
      lines.push(`| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label ?? row.variant_key} | ${row.recommended_next_action} |`);
    }
  }
  lines.push('');
  lines.push('## Conflicts');
  lines.push('');
  const conflicts = report.rows.filter((row) => row.consolidation_status === 'preserved_fixture_conflicting_finish_candidates_no_write');
  if (conflicts.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Set | Number | Card | Variant | Candidate Finishes |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const row of conflicts) {
      lines.push(`| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label ?? row.variant_key} | ${row.candidate_finish_keys.join(', ')} |`);
    }
  }
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function appendCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  const rel = path.basename(CHECKPOINT_FILE);
  const line = `- 2026-06-22: Exact finish binding consolidation checkpoint — reconciles preserved fixture evidence against 48 league exact-finish rows with no DB writes. See docs/checkpoints/master_index/${rel}.`;
  if (!current.includes(rel)) {
    writeText(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

function writeCheckpoint(report) {
  const lines = [];
  lines.push('# Exact Finish Binding Consolidation Checkpoint V1');
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
  lines.push(`- Single-finish candidates: ${report.summary.by_status.preserved_fixture_single_finish_candidate_no_write ?? 0}`);
  lines.push(`- Conflicting candidates: ${report.summary.by_status.preserved_fixture_conflicting_finish_candidates_no_write ?? 0}`);
  lines.push(`- Still blocked: ${report.summary.by_status.still_blocked_no_preserved_exact_finish_fixture ?? 0}`);
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
  const targetRows = (plan.rows ?? []).filter((row) => row.blocker_class === 'exact_finish_binding_missing');
  const fixtureRecords = loadFixtureRecords();
  const recordsByKey = new Map();
  for (const record of fixtureRecords) {
    if (!recordsByKey.has(record.match_key)) recordsByKey.set(record.match_key, []);
    recordsByKey.get(record.match_key).push(record);
  }
  const rows = targetRows.map((row) => classifyRow(row, recordsByKey));
  const seed = {
    version: 'exact_finish_binding_consolidation_v1',
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
  const fingerprint = sha256(stableJson(seed));
  const report = { ...seed, fingerprint_sha256: fingerprint };
  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeCheckpoint(report);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`fingerprint_sha256=${fingerprint}`);
}

main();

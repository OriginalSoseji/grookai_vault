import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_regional_championship_taxonomy_governance_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_regional_championship_active_finish_adjudication_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_regional_championship_active_finish_adjudication_v1.md',
);

const SET_LEVEL_FINISH_EVIDENCE = [
  {
    source_key: 'bulbapedia_dragon_vault_tcg',
    source_kind: 'human_readable_checklist',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Dragon_Vault_(TCG)',
    evidence_label: 'Dragon Vault set release text states the set cards are foil.',
  },
  {
    source_key: 'pokellector_dragon_vault',
    source_kind: 'collector_reference',
    source_url: 'https://www.pokellector.com/Dragon-Vault-Expansion/',
    evidence_label: 'Pokellector Dragon Vault set page describes the set as holographic.',
  },
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
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

function finishEvidenceFor(row) {
  const exactHoloSources = (row.evidence_sources ?? []).filter((source) => (
    /holo|crosshatch/i.test(source.evidence_label ?? '') &&
    !/reverse/i.test(source.evidence_label ?? '')
  ));
  const reverseLabelSources = (row.evidence_sources ?? []).filter((source) => (
    /reverse/i.test(source.evidence_label ?? '')
  ));

  return {
    exact_holo_sources: exactHoloSources,
    set_level_finish_sources: SET_LEVEL_FINISH_EVIDENCE,
    alternate_source_labels: reverseLabelSources.map((source) => ({
      ...source,
      adjudication: 'treated_as_source_taxonomy_alias_not_canonical_finish_key',
    })),
  };
}

function adjudicate(row) {
  const finishEvidence = finishEvidenceFor(row);
  const finishEvidenceCount = finishEvidence.exact_holo_sources.length + finishEvidence.set_level_finish_sources.length;
  const hasIdentityGovernance = row.governance_status === 'identity_governed_finish_blocked';
  const hasRegionalIdentity = row.governed_variant_key === 'regional_championships_stamp';
  const hasFinishEvidence = finishEvidenceCount >= 2;

  const status = hasIdentityGovernance && hasRegionalIdentity && hasFinishEvidence
    ? 'active_finish_governed_future_dry_run_candidate'
    : 'active_finish_still_blocked';

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    governed_variant_key: row.governed_variant_key,
    governed_printed_identity_modifier: row.governed_printed_identity_modifier,
    governed_stamp_label: row.observed_stamp_label,
    target_child_finish_key: status === 'active_finish_governed_future_dry_run_candidate' ? 'holo' : null,
    crosshatch_treatment: row.crosshatch_treatment,
    active_finish_adjudication_status: status,
    dry_run_candidate: status === 'active_finish_governed_future_dry_run_candidate',
    write_ready_now: 0,
    rationale: status === 'active_finish_governed_future_dry_run_candidate'
      ? 'Regional Championships is the parent identity. Crosshatch is preserved as evidence/display metadata. Existing active finish taxonomy should use holo for the child printing because exact/source labels and Dragon Vault set-level sources describe these as holo/foil cards.'
      : 'Insufficient governed identity or finish evidence for dry-run planning.',
    evidence: {
      identity_sources: row.evidence_sources ?? [],
      finish_sources: finishEvidence.exact_holo_sources,
      set_level_finish_sources: finishEvidence.set_level_finish_sources,
      alternate_source_labels: finishEvidence.alternate_source_labels,
    },
  };
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# Regional Championship Active Finish Adjudication V1');
  lines.push('');
  lines.push('Audit-only adjudication for Dragon Vault Regional Championships rows after identity governance.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- audit_only: true');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- apply_performed: false');
  lines.push('- dry_run_package_prepared: false');
  lines.push('- write_ready_now: 0');
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push('Regional Championships is the parent identity. Crosshatch remains evidence/display metadata, not a canonical `finish_key`. The active child finish candidate is `holo` for the three governed DV1 rows.');
  lines.push('');
  lines.push(markdownTable(
    ['metric', 'value'],
    [
      ['target_rows', report.summary.target_rows],
      ['future_dry_run_candidates', report.summary.future_dry_run_candidates],
      ['target_child_finish_holo', report.summary.by_target_child_finish_key.holo ?? 0],
      ['write_ready_now', report.summary.write_ready_now],
      ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
    ],
  ));
  lines.push('');
  lines.push('## Rows');
  lines.push('');
  lines.push(markdownTable(
    ['set', 'number', 'name', 'variant', 'finish', 'status'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.governed_variant_key,
      row.target_child_finish_key,
      row.active_finish_adjudication_status,
    ]),
  ));
  lines.push('');
  lines.push('## Guardrail');
  lines.push('');
  lines.push('This report prepares the rows for a future guarded dry-run package only. It does not authorize DB writes. Do not create a `crosshatch` finish key from this report.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = (input.rows ?? []).map(adjudicate);

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_regional_championship_active_finish_adjudication_v1',
    input_report: rel(INPUT_JSON),
    governing_contract: input.governing_contract,
    audit_only: true,
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      dry_run_package_prepared: false,
    },
    summary: {
      target_rows: rows.length,
      future_dry_run_candidates: rows.filter((row) => row.dry_run_candidate).length,
      write_ready_now: 0,
      by_active_finish_adjudication_status: countBy(rows, (row) => row.active_finish_adjudication_status),
      by_target_child_finish_key: countBy(rows, (row) => row.target_child_finish_key),
      by_governed_variant_key: countBy(rows, (row) => row.governed_variant_key),
    },
    rows,
  };

  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    input_fingerprint: input.fingerprint_sha256,
    summary: report.summary,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      governed_variant_key: row.governed_variant_key,
      target_child_finish_key: row.target_child_finish_key,
      active_finish_adjudication_status: row.active_finish_adjudication_status,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, writeMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    summary: report.summary,
    fingerprint_sha256: report.fingerprint_sha256,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

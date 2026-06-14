import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const POKECARDVALUES_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pokecardvalues_stamped_finish_acquisition_v1', 'pokecardvalues_stamped_finish_acquisition_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1.md');

const PACKAGE_ID = 'PKG-15I-STAMPED-SAME-FINISH-AMBIGUOUS-ADJUDICATION';

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
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function classify(row) {
  const matches = row.reviewed_matches ?? [];
  const finishKeys = [...new Set(matches.map((match) => match.finish_key).filter(Boolean))].sort();
  const variantTexts = [...new Set(matches.map((match) => match.variant_text).filter(Boolean))].sort();
  const sourceUrls = [...new Set(matches.map((match) => match.source_url).filter(Boolean))].sort();
  const targetFinishKey = finishKeys.length === 1 ? finishKeys[0] : null;
  const baseHasFinish = Boolean(targetFinishKey && (row.base_parent_child_finishes ?? []).includes(targetFinishKey));
  const sameFinishSupported = Boolean(targetFinishKey && baseHasFinish);
  const identityGranularity = variantTexts.length > 1 ? 'multiple_source_variant_labels' : 'single_source_variant_label';

  let adjudicationStatus = 'blocked_identity_granularity_required';
  let recommendation = 'Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish.';
  if (!sameFinishSupported) {
    adjudicationStatus = 'blocked_finish_not_supported_on_base_parent';
    recommendation = 'Do not write. The common source finish is missing from the base parent child finishes.';
  } else if (
    row.proposed_variant_key === 'battle_academy_deck_mark'
    && targetFinishKey === 'normal'
    && variantTexts.length > 1
    && variantTexts.every((text) => /^\d+\s+Battle Academy Stamp Promo$/i.test(text))
  ) {
    adjudicationStatus = 'ready_for_guarded_battle_academy_deck_mark_display_metadata_route';
    recommendation = 'Routable: individual Battle Academy deck numbers are display metadata for this parent identity because every exact source product supports the same Non-Holo active finish.';
  } else if (row.proposed_variant_key === 'battle_academy_deck_mark') {
    recommendation = 'Potentially routable only if Grookai governance intentionally treats individual Battle Academy deck numbers as display metadata under one deck-mark parent.';
  } else if (row.proposed_variant_key === 'staff_stamp') {
    recommendation = 'Potentially routable only if Grookai governance intentionally treats Staff Prerelease and Staff States Championship labels as one generic staff-stamp parent.';
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    stamp_label: row.stamp_label,
    base_parent_child_finishes: row.base_parent_child_finishes ?? [],
    target_finish_key: targetFinishKey,
    source_match_count: matches.length,
    source_variant_labels: variantTexts,
    source_urls: sourceUrls,
    source_titles: matches.map((match) => match.source_title).filter(Boolean),
    same_finish_supported: sameFinishSupported,
    identity_granularity: identityGranularity,
    adjudication_status: adjudicationStatus,
    recommendation,
    governance_rule: adjudicationStatus === 'ready_for_guarded_battle_academy_deck_mark_display_metadata_route'
      ? 'Battle Academy deck numbers remain display metadata. They do not create separate canonical parent identities when every exact source row supports the same Non-Holo active finish for the same set/card/number/name.'
      : null,
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_adjudication_status).map(([status, count]) => [status, count]);
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.target_finish_key ?? '',
    row.source_match_count,
    row.adjudication_status,
  ]);

  return `# PKG-15I Stamped Same-Finish Ambiguous Adjudication V1

Audit-only adjudication for stamped source rows where Poke Card Values found multiple exact stamped product matches. These rows are not write-ready because active finish agreement does not automatically resolve printed identity granularity.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- reviewed_rows: ${report.summary.reviewed_rows}
- same_finish_supported_rows: ${report.summary.same_finish_supported_rows}
- write_ready_now: ${report.write_ready_now}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['adjudication_status', 'rows'], statusRows)}

## Rows

${markdownTable(['set', 'number', 'name', 'variant', 'common_finish', 'source_matches', 'status'], rows)}

## Rule

Multiple exact source rows with the same active finish may prove finish treatment, but they do not prove whether Grookai should store one generic stamped parent or multiple narrower parent identities. These remain blocked until identity-granularity governance is explicit.
`;
}

async function main() {
  const source = await readJson(POKECARDVALUES_JSON);
  const rows = (source.results ?? [])
    .filter((row) => row.status === 'blocked_multiple_matching_stamp_variants')
    .map(classify)
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
  const fingerprintPayload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: normalizeText(row.card_name),
    proposed_variant_key: row.proposed_variant_key,
    target_finish_key: row.target_finish_key,
    source_variant_labels: row.source_variant_labels,
    adjudication_status: row.adjudication_status,
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15i_stamped_same_finish_ambiguous_adjudication_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: rows.filter((row) => row.adjudication_status === 'ready_for_guarded_battle_academy_deck_mark_display_metadata_route').length,
    source_artifacts: {
      pokecardvalues_stamped_finish_acquisition: path.relative(ROOT, POKECARDVALUES_JSON).replaceAll('\\', '/'),
    },
    summary: {
      reviewed_rows: rows.length,
      same_finish_supported_rows: rows.filter((row) => row.same_finish_supported).length,
      by_adjudication_status: countBy(rows, (row) => row.adjudication_status),
      by_target_finish_key: countBy(rows, (row) => row.target_finish_key ?? 'none'),
      by_variant: countBy(rows, (row) => row.proposed_variant_key),
    },
    governance_blocker: 'identity_granularity_required_before_write',
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson(fingerprintPayload));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    reviewed_rows: report.summary.reviewed_rows,
    same_finish_supported_rows: report.summary.same_finish_supported_rows,
    write_ready_now: report.write_ready_now,
    by_adjudication_status: report.summary.by_adjudication_status,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

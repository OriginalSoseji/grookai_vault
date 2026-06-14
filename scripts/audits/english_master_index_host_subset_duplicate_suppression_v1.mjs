import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_host_subset_duplicate_suppression_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_host_subset_duplicate_suppression_v1.md');

const RULES = [
  {
    rule_id: 'cel25_classic_collection_host_duplicate',
    host_set_key: 'cel25',
    subset_set_key: 'cel25c',
    reason: 'Celebrations Classic Collection is governed as subset cel25c; host cel25 Classic Collection copies are preserved as source evidence but suppressed from DB reconciliation.',
    hostMatches: (row) => (row.rarity_values ?? []).some((value) => normalizeText(value) === 'classic collection'),
  },
  {
    rule_id: 'swsh12_5_galarian_gallery_host_duplicate',
    host_set_key: 'swsh12.5',
    subset_set_key: 'swsh12pt5gg',
    reason: 'Crown Zenith Galarian Gallery is governed as subset swsh12pt5gg; host swsh12.5 GG-number copies are preserved as source evidence but suppressed from DB reconciliation.',
    hostMatches: (row) => /^GG/i.test(String(row.card_number ?? '').trim()),
  },
  {
    rule_id: 'swsh9_trainer_gallery_host_duplicate',
    host_set_key: 'swsh9',
    subset_set_key: 'swsh9tg',
    reason: 'Brilliant Stars Trainer Gallery is governed as subset swsh9tg; host swsh9 TG-number copies are preserved as source evidence but suppressed from DB reconciliation.',
    hostMatches: (row) => /^TG/i.test(String(row.card_number ?? '').trim()),
  },
  {
    rule_id: 'swsh10_trainer_gallery_host_duplicate',
    host_set_key: 'swsh10',
    subset_set_key: 'swsh10tg',
    reason: 'Astral Radiance Trainer Gallery is governed as subset swsh10tg; host swsh10 TG-number copies are preserved as source evidence but suppressed from DB reconciliation.',
    hostMatches: (row) => /^TG/i.test(String(row.card_number ?? '').trim()),
  },
  {
    rule_id: 'swsh11_trainer_gallery_host_duplicate',
    host_set_key: 'swsh11',
    subset_set_key: 'swsh11tg',
    reason: 'Lost Origin Trainer Gallery is governed as subset swsh11tg; host swsh11 TG-number copies are preserved as source evidence but suppressed from DB reconciliation.',
    hostMatches: (row) => /^TG/i.test(String(row.card_number ?? '').trim()),
  },
  {
    rule_id: 'swsh12_trainer_gallery_host_duplicate',
    host_set_key: 'swsh12',
    subset_set_key: 'swsh12tg',
    reason: 'Silver Tempest Trainer Gallery is governed as subset swsh12tg; host swsh12 TG-number copies are preserved as source evidence but suppressed from DB reconciliation.',
    hostMatches: (row) => /^TG/i.test(String(row.card_number ?? '').trim()),
  },
  {
    rule_id: 'swsh4_5_shiny_vault_host_duplicate',
    host_set_key: 'swsh4.5',
    subset_set_key: 'swsh45sv',
    reason: 'Shining Fates Shiny Vault is governed as subset swsh45sv; host swsh4.5 SV-number copies are preserved as source evidence but suppressed from DB reconciliation.',
    suppressHostFinishConflicts: true,
    finishConflictReason: 'Shining Fates Shiny Vault SV-number host rows can arrive from source aliases with host-set finish labels. If the canonical subset has the same number + name under a different finish, the host row is suppressed from DB reconciliation and retained only as source evidence for manual review.',
    hostMatches: (row) => /^SV/i.test(String(row.card_number ?? '').trim()),
  },
  {
    rule_id: 'ex10_unown_collection_host_duplicate',
    host_set_key: 'ex10',
    subset_set_key: 'exu',
    reason: 'Unseen Forces Unown Collection is governed as subset exu; host ex10 punctuation/letter Unown copies are preserved as source evidence but suppressed from DB reconciliation.',
    hostMatches: (row) => (
      normalizeText(row.card_name) === 'unown'
      && normalizeText(row.finish_key) === 'holo'
      && /^[a-z!?]$/i.test(decodeNumber(row.card_number))
    ),
  },
];

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
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function printingKey(setKey, number, name, finishKey) {
  return [
    normalizeText(setKey),
    normalizeNumber(decodeNumber(number)),
    normalizeText(name),
    normalizeText(finishKey),
  ].join('|');
}

function decodeNumber(value) {
  let decoded = String(value ?? '').trim();
  for (let index = 0; index < 2; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function setlessPrintingKey(row) {
  return [
    normalizeNumber(decodeNumber(row.card_number)),
    normalizeText(row.card_name),
    normalizeText(row.finish_key),
  ].join('|');
}

function setlessIdentityKey(row) {
  return [
    normalizeNumber(decodeNumber(row.card_number)),
    normalizeText(row.card_name),
  ].join('|');
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_rule).map(([rule, count]) => [
    rule,
    count,
  ]);
  const setRows = Object.entries(report.summary.by_host_set).map(([setKey, count]) => [
    setKey,
    count,
  ]);
  const sampleRows = report.rows.slice(0, 20).map((row) => [
    row.host_set_key,
    row.subset_set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.rule_id,
  ]);

  return `# English Master Index Host/Subset Duplicate Suppression V1

Read-only governance artifact for Master Index rows that are valid source evidence but should not create duplicate DB reconciliation obligations under a host set.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- suppressed_host_duplicate_rows: ${report.summary.suppressed_host_duplicate_rows}
- blocked_unmatched_host_rows: ${report.summary.blocked_unmatched_host_rows}
- fingerprint: ${report.fingerprint}

${markdownTable(['rule', 'rows'], summaryRows)}

${markdownTable(['host_set', 'rows'], setRows)}

## Sample Rows

${markdownTable(['host_set', 'subset_set', 'number', 'name', 'finish', 'rule'], sampleRows)}

## Governance

- Suppression is reconciliation-only.
- Source evidence remains preserved in the Master Index.
- Suppressed host duplicates are not deletion candidates.
- Suppression requires a matching subset Master Index row with the same card number, card name, and finish.
- For explicitly governed host/subset families, host finish conflicts may also be suppressed when the subset has the same card number and name under a different finish. Those rows remain source evidence and require manual source governance before any DB write.
`;
}

const master = await readJson(PRINTINGS_JSON);
const printings = master.printings ?? [];
const rows = [];
const blocked = [];

for (const rule of RULES) {
  const subsetRows = printings.filter((row) => (
    row.status === 'master_verified'
    && normalizeText(row.set_key) === normalizeText(rule.subset_set_key)
  ));
  const subsetBySetlessKey = new Map(subsetRows.map((row) => [setlessPrintingKey(row), row]));
  const subsetByIdentityKey = new Map();
  for (const row of subsetRows) {
    const key = setlessIdentityKey(row);
    if (!subsetByIdentityKey.has(key)) subsetByIdentityKey.set(key, []);
    subsetByIdentityKey.get(key).push(row);
  }
  const hostRows = printings.filter((row) => (
    row.status === 'master_verified'
    && normalizeText(row.set_key) === normalizeText(rule.host_set_key)
    && rule.hostMatches(row)
  ));

  for (const hostRow of hostRows) {
    const subsetRow = subsetBySetlessKey.get(setlessPrintingKey(hostRow));
    if (!subsetRow) {
      const subsetIdentityRows = subsetByIdentityKey.get(setlessIdentityKey(hostRow)) ?? [];
      if (rule.suppressHostFinishConflicts && subsetIdentityRows.length > 0) {
        rows.push({
          suppression_key: printingKey(hostRow.set_key, hostRow.card_number, hostRow.card_name, hostRow.finish_key),
          rule_id: `${rule.rule_id}_finish_conflict`,
          reason: rule.finishConflictReason ?? rule.reason,
          host_set_key: hostRow.set_key,
          host_set_name: hostRow.set_name,
          subset_set_key: rule.subset_set_key,
          subset_set_name: subsetIdentityRows[0].set_name,
          card_number: hostRow.card_number,
          card_name: hostRow.card_name,
          finish_key: hostRow.finish_key,
          subset_finish_keys: [...new Set(subsetIdentityRows.map((row) => row.finish_key))].sort(),
          host_sources: hostRow.sources ?? [],
          subset_sources: [...new Set(subsetIdentityRows.flatMap((row) => row.sources ?? []))].sort(),
          host_evidence_urls: hostRow.evidence_urls ?? [],
          subset_evidence_urls: [...new Set(subsetIdentityRows.flatMap((row) => row.evidence_urls ?? []))].sort(),
          suppression_type: 'host_subset_finish_conflict',
        });
        continue;
      }
      blocked.push({
        rule_id: rule.rule_id,
        host_set_key: hostRow.set_key,
        subset_set_key: rule.subset_set_key,
        card_number: hostRow.card_number,
        card_name: hostRow.card_name,
        finish_key: hostRow.finish_key,
        reason: 'Host row matched suppression rule, but no exact subset row matched number + name + finish.',
        host_evidence_urls: hostRow.evidence_urls ?? [],
      });
      continue;
    }

    rows.push({
      suppression_key: printingKey(hostRow.set_key, hostRow.card_number, hostRow.card_name, hostRow.finish_key),
      rule_id: rule.rule_id,
      reason: rule.reason,
      host_set_key: hostRow.set_key,
      host_set_name: hostRow.set_name,
      subset_set_key: subsetRow.set_key,
      subset_set_name: subsetRow.set_name,
      card_number: hostRow.card_number,
      card_name: hostRow.card_name,
      finish_key: hostRow.finish_key,
      host_sources: hostRow.sources ?? [],
      subset_sources: subsetRow.sources ?? [],
      host_evidence_urls: hostRow.evidence_urls ?? [],
      subset_evidence_urls: subsetRow.evidence_urls ?? [],
    });
  }
}

const fingerprint = sha256(stableJson(rows.map((row) => ({
  suppression_key: row.suppression_key,
  rule_id: row.rule_id,
  subset_set_key: row.subset_set_key,
}))));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_host_subset_duplicate_suppression_v1',
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  fingerprint,
  summary: {
    suppressed_host_duplicate_rows: rows.length,
    blocked_unmatched_host_rows: blocked.length,
    by_rule: countBy(rows, (row) => row.rule_id),
    by_host_set: countBy(rows, (row) => row.host_set_key),
    by_subset_set: countBy(rows, (row) => row.subset_set_key),
  },
  rows,
  blocked,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  summary: report.summary,
  fingerprint,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

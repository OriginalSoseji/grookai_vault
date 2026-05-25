import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const COMPLETION_DIR = 'docs/audits/english_master_index_completion_v1';
const OUTPUT_DIR = 'docs/audits/english_master_index_publishable_v1';
const SETS_DIR = path.join(OUTPUT_DIR, 'sets');

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    grookai_reconciliation_performed: false,
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(COMPLETION_DIR, file), 'utf8'));
}

async function writeJson(file, data, options = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = options.compact ? JSON.stringify(data) : JSON.stringify(data, null, 2);
  await fs.writeFile(file, `${body}\n`);
}

async function writeMarkdown(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text);
}

function countBy(rows, keyFn) {
  const output = {};
  for (const row of rows) {
    const key = keyFn(row);
    output[key] = (output[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b)));
}

function publishabilityStatus(set) {
  if (set.completion.status === 'complete_master_index_set') return 'publishable_complete';
  if (set.card_identity.master_admissible < set.card_identity.total_working_facts) return 'not_publishable_card_identity_gaps';
  if (set.printings.master_admissible < set.printings.total_working_facts) return 'not_publishable_finish_gaps';
  if (set.completion.status === 'source_unavailable') return 'source_unavailable';
  if (set.completion.status === 'conflict_blocked') return 'conflict_blocked';
  return 'not_publishable_manual_review';
}

function setManifestRow(set) {
  return {
    set_key: set.set_key,
    set_name: set.set_name,
    publishability_status: publishabilityStatus(set),
    completion_status: set.completion.status,
    completion_score: set.completion.completion_score,
    cards: {
      master_admissible: set.card_identity.master_admissible,
      total: set.card_identity.total_working_facts,
      gap_count: Math.max(0, set.card_identity.total_working_facts - set.card_identity.master_admissible),
    },
    printings: {
      master_admissible: set.printings.master_admissible,
      total: set.printings.total_working_facts,
      gap_count: Math.max(0, set.printings.total_working_facts - set.printings.master_admissible),
    },
    finish_counts: set.finish_counts ?? {},
    blocker_summary: set.completion.blocker_summary,
    shard_refs: set.completion.status === 'complete_master_index_set'
      ? {
        cards: `sets/${set.set_key}/cards.json`,
        printings: `sets/${set.set_key}/printings.json`,
        evidence: `sets/${set.set_key}/evidence.json`,
        summary: `sets/${set.set_key}/summary.md`,
      }
      : null,
  };
}

function evidenceRows(cards, printings) {
  const rows = [];
  for (const fact of [...cards, ...printings]) {
    for (const url of fact.evidence_urls ?? []) {
      rows.push({
        set_key: fact.set_key,
        card_number: fact.card_number,
        card_name: fact.card_name,
        finish_key: fact.finish_key ?? null,
        source_url: url,
      });
    }
  }
  return rows;
}

function setSummaryMarkdown(row) {
  const finishRows = Object.entries(row.finish_counts ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return `# ${row.set_name}

Status: ${row.publishability_status}

## Summary

- set_key: ${row.set_key}
- cards: ${row.cards.master_admissible}/${row.cards.total}
- printings: ${row.printings.master_admissible}/${row.printings.total}
- completion_score: ${row.completion_score}

## Finish Counts

${markdownTable(['finish_key', 'count'], finishRows)}
`;
}

function manifestMarkdown(manifest) {
  const statusRows = Object.entries(manifest.summary.by_publishability_status);
  const completeRows = manifest.sets
    .filter((set) => set.publishability_status === 'publishable_complete')
    .map((set) => [
      set.set_key,
      set.set_name,
      `${set.cards.master_admissible}/${set.cards.total}`,
      `${set.printings.master_admissible}/${set.printings.total}`,
    ]);
  const blockedRows = manifest.sets
    .filter((set) => set.publishability_status !== 'publishable_complete')
    .slice(0, 120)
    .map((set) => [
      set.set_key,
      set.set_name,
      set.publishability_status,
      set.cards.gap_count,
      set.printings.gap_count,
      set.blocker_summary,
    ]);

  return `# English Master Index Publishable Manifest V1

This artifact is the website-facing publishability boundary for the English physical Pokemon TCG Master Index.

Only \`publishable_complete\` sets are eligible for public complete-list display.

## Safety

- audit_only: ${manifest.audit_only}
- db_writes_performed: ${manifest.db_writes_performed}
- migrations_created: ${manifest.migrations_created}
- cleanup_performed: ${manifest.cleanup_performed}
- quarantine_performed: ${manifest.quarantine_performed}
- grookai_reconciliation_performed: ${manifest.grookai_reconciliation_performed}

## Summary

- total_sets: ${manifest.summary.total_sets}
- publishable_complete_sets: ${manifest.summary.publishable_complete_sets}
- not_publishable_sets: ${manifest.summary.not_publishable_sets}
- publishable_card_facts: ${manifest.summary.publishable_card_facts}
- publishable_printing_facts: ${manifest.summary.publishable_printing_facts}

${markdownTable(['publishability_status', 'sets'], statusRows)}

## Publishable Sets

${markdownTable(['set_key', 'set_name', 'cards', 'printings'], completeRows)}

## Not Publishable Yet

${markdownTable(['set_key', 'set_name', 'status', 'card_gaps', 'finish_gaps', 'blocker'], blockedRows)}
`;
}

async function main() {
  const matrix = await readJson('english_master_index_set_completion_matrix_v1.json');
  const exportArtifact = await readJson('english_master_index_master_admissible_export_v1.json');
  const setRows = matrix.sets.map(setManifestRow);
  const publishableSets = setRows.filter((set) => set.publishability_status === 'publishable_complete');
  const publishableSetKeys = new Set(publishableSets.map((set) => set.set_key));
  const cardsBySet = Map.groupBy(
    (exportArtifact.cards ?? []).filter((row) => publishableSetKeys.has(row.set_key)),
    (row) => row.set_key,
  );
  const printingsBySet = Map.groupBy(
    (exportArtifact.printings ?? []).filter((row) => publishableSetKeys.has(row.set_key)),
    (row) => row.set_key,
  );

  const manifest = {
    version: 'english_master_index_publishable_manifest_v1',
    generated_at: new Date().toISOString(),
    contract: 'ENGLISH_MASTER_INDEX_COMPLETION_V1',
    ...safety(),
    rule: 'Only publishable_complete sets may be displayed as complete public Master Index lists.',
    summary: {
      total_sets: setRows.length,
      publishable_complete_sets: publishableSets.length,
      not_publishable_sets: setRows.length - publishableSets.length,
      publishable_card_facts: [...cardsBySet.values()].reduce((total, rows) => total + rows.length, 0),
      publishable_printing_facts: [...printingsBySet.values()].reduce((total, rows) => total + rows.length, 0),
      by_publishability_status: countBy(setRows, (row) => row.publishability_status),
    },
    sets: setRows,
  };

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await writeJson(path.join(OUTPUT_DIR, 'english_master_index_publishable_manifest_v1.json'), manifest);
  await writeMarkdown(path.join(OUTPUT_DIR, 'english_master_index_publishable_manifest_v1.md'), manifestMarkdown(manifest));

  for (const set of publishableSets) {
    const setDir = path.join(SETS_DIR, set.set_key);
    const cards = cardsBySet.get(set.set_key) ?? [];
    const printings = printingsBySet.get(set.set_key) ?? [];
    await writeJson(path.join(setDir, 'cards.json'), { set_key: set.set_key, cards }, { compact: true });
    await writeJson(path.join(setDir, 'printings.json'), { set_key: set.set_key, printings }, { compact: true });
    await writeJson(path.join(setDir, 'evidence.json'), { set_key: set.set_key, evidence: evidenceRows(cards, printings) }, { compact: true });
    await writeMarkdown(path.join(setDir, 'summary.md'), setSummaryMarkdown(set));
  }

  console.log(JSON.stringify({
    output_dir: OUTPUT_DIR,
    publishable_complete_sets: manifest.summary.publishable_complete_sets,
    not_publishable_sets: manifest.summary.not_publishable_sets,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

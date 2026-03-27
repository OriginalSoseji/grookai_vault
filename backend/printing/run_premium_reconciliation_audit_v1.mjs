import '../env.mjs';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_OUTPUT_PATH = path.resolve(__dirname, 'output', 'premium_reconciliation_audit_v1.json');
const MARKDOWN_OUTPUT_PATH = path.resolve(__dirname, 'output', 'premium_reconciliation_audit_v1.md');
const EXCLUDED_SET_CODES = new Set(['me02.5']);
const PREMIUM_FINISH_KEYS = ['pokeball', 'masterball'];

function compareRowOrder(left, right) {
  const setCompare = String(left.set_code).localeCompare(String(right.set_code));
  if (setCompare !== 0) return setCompare;

  const leftNumber = String(left.number ?? '');
  const rightNumber = String(right.number ?? '');
  const numberCompare = leftNumber.localeCompare(rightNumber, undefined, { numeric: true });
  if (numberCompare !== 0) return numberCompare;

  return String(left.finish_key).localeCompare(String(right.finish_key));
}

async function fetchPremiumRows(supabase) {
  const { data, error } = await supabase
    .from('card_printings')
    .select(
      'finish_key, provenance_source, created_by, card_prints!inner(gv_id,set_code,number)',
    )
    .in('finish_key', PREMIUM_FINISH_KEYS)
    .order('finish_key', { ascending: true });

  if (error) {
    throw new Error(`[premium-reconciliation-audit] query failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    gv_id: row.card_prints?.gv_id ?? null,
    set_code: row.card_prints?.set_code ?? null,
    number: row.card_prints?.number ?? null,
    finish_key: row.finish_key ?? null,
    provenance_source: row.provenance_source ?? null,
    created_by: row.created_by ?? null,
  }));
}

function classifyRow(row) {
  if (row.provenance_source == null || row.created_by == null) {
    return 'UNGOVERNED_LEGACY';
  }

  return 'GOVERNED';
}

function ensureSetSummary(report, setCode) {
  if (!report.bySet[setCode]) {
    report.bySet[setCode] = {
      total: 0,
      governed: 0,
      ungovernedLegacy: 0,
    };
  }

  return report.bySet[setCode];
}

function buildReport(rows) {
  const report = {
    generatedAt: new Date().toISOString(),
    excludedSetCodes: Array.from(EXCLUDED_SET_CODES),
    totals: {
      totalRows: 0,
      governed: 0,
      ungovernedLegacy: 0,
    },
    bySet: {},
    rows: [],
    notes: {
      excludedSpecialSetRows: 0,
      classificationRule:
        'Rows within global premium scope are GOVERNED only when provenance_source and created_by are both non-null; otherwise they remain UNGOVERNED_LEGACY.',
    },
  };

  for (const row of rows) {
    if (EXCLUDED_SET_CODES.has(row.set_code)) {
      report.notes.excludedSpecialSetRows += 1;
      continue;
    }

    const status = classifyRow(row);
    const normalizedRow = {
      gv_id: row.gv_id,
      set_code: row.set_code,
      number: row.number,
      finish_key: row.finish_key,
      provenance_source: row.provenance_source,
      created_by: row.created_by,
      status,
    };

    report.rows.push(normalizedRow);
    report.totals.totalRows += 1;
    const setSummary = ensureSetSummary(report, row.set_code);
    setSummary.total += 1;

    if (status === 'GOVERNED') {
      report.totals.governed += 1;
      setSummary.governed += 1;
    } else {
      report.totals.ungovernedLegacy += 1;
      setSummary.ungovernedLegacy += 1;
    }
  }

  report.rows.sort(compareRowOrder);

  return report;
}

function formatRowLine(row) {
  return `- ${row.set_code} #${row.number} | ${row.gv_id} | ${row.finish_key} | ${row.status}`;
}

function buildMarkdown(report) {
  const governedRows = report.rows.filter((row) => row.status === 'GOVERNED');
  const legacyRows = report.rows.filter((row) => row.status === 'UNGOVERNED_LEGACY');

  const lines = [
    '# PREMIUM RECONCILIATION AUDIT V1',
    '',
    '## Summary',
    `- Total Rows: ${report.totals.totalRows}`,
    `- Governed: ${report.totals.governed}`,
    `- Ungoverned Legacy: ${report.totals.ungovernedLegacy}`,
    `- Excluded Special-Set Rows: ${report.notes.excludedSpecialSetRows}`,
    '',
    '## By Set',
  ];

  const setCodes = Object.keys(report.bySet).sort((left, right) => left.localeCompare(right));
  if (!setCodes.length) {
    lines.push('- None');
  } else {
    for (const setCode of setCodes) {
      const summary = report.bySet[setCode];
      lines.push(
        `- ${setCode}: ${summary.governed} governed / ${summary.ungovernedLegacy} legacy / ${summary.total} total`,
      );
    }
  }

  lines.push('', '## Governed Rows');
  if (!governedRows.length) {
    lines.push('- None');
  } else {
    for (const row of governedRows) {
      lines.push(formatRowLine(row));
    }
  }

  lines.push('', '## Ungoverned Legacy Rows');
  if (!legacyRows.length) {
    lines.push('- None');
  } else {
    for (const row of legacyRows) {
      lines.push(formatRowLine(row));
    }
  }

  lines.push('', '## Notes');
  lines.push(`- Excluded set codes: ${report.excludedSetCodes.join(', ') || 'none'}`);
  lines.push(`- ${report.notes.classificationRule}`);

  return `${lines.join('\n')}\n`;
}

async function writeOutputs(report, markdown) {
  await mkdir(path.dirname(JSON_OUTPUT_PATH), { recursive: true });
  await writeFile(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(MARKDOWN_OUTPUT_PATH, markdown, 'utf8');
}

function printSummary(report) {
  console.log('=== PREMIUM RECONCILIATION AUDIT ===');
  console.log('');
  console.log(`Total Rows: ${report.totals.totalRows}`);
  console.log(`Governed: ${report.totals.governed}`);
  console.log(`Ungoverned Legacy: ${report.totals.ungovernedLegacy}`);
  console.log('');
  console.log('By Set:');

  const setCodes = Object.keys(report.bySet).sort((left, right) => left.localeCompare(right));
  if (!setCodes.length) {
    console.log('(none)');
    return;
  }

  for (const setCode of setCodes) {
    const summary = report.bySet[setCode];
    console.log(`${setCode} → ${summary.governed} governed / ${summary.ungovernedLegacy} legacy`);
  }
}

async function main() {
  const supabase = createBackendClient();
  const rows = await fetchPremiumRows(supabase);
  const report = buildReport(rows);
  const markdown = buildMarkdown(report);

  await writeOutputs(report, markdown);
  printSummary(report);
  console.log('');
  console.log(`Wrote JSON: ${JSON_OUTPUT_PATH}`);
  console.log(`Wrote Markdown: ${MARKDOWN_OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('[premium-reconciliation-audit] failed:', error?.message ?? error);
  process.exitCode = 1;
});

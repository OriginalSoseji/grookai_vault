import '../env.mjs';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  VERSION_FINISH_DECISIONS,
  interpretVersionVsFinish,
} from './version_finish_interpreter_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_OUTPUT_PATH = path.resolve(__dirname, 'output', 'premium_reconciliation_apply_plan_v1.json');
const MARKDOWN_OUTPUT_PATH = path.resolve(__dirname, 'output', 'premium_reconciliation_apply_plan_v1.md');

const EXCLUDED_SET_CODES = new Set(['me02.5']);
const PREMIUM_FINISH_KEYS = ['pokeball', 'masterball'];

const PREMIUM_AUTHORITY = {
  sv8pt5: {
    pokeball: 'ALL_NUMBERS',
    masterball: 'ALL_NUMBERS',
  },
};

const SOURCE_EVIDENCE = [
  {
    label: 'eBay UK listing showing Prismatic Evolutions Poke Ball / Masterball card choices',
    url: 'https://www.ebay.co.uk/itm/286630759912',
  },
];

function compareRowOrder(left, right) {
  const setCompare = String(left.set_code).localeCompare(String(right.set_code));
  if (setCompare !== 0) return setCompare;

  const numberCompare = String(left.number ?? '').localeCompare(String(right.number ?? ''), undefined, {
    numeric: true,
  });
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
    throw new Error(`[premium-authority-match-audit] query failed: ${error.message}`);
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

function matchAuthority(row) {
  if (EXCLUDED_SET_CODES.has(row.set_code)) {
    return 'EXCLUDED_SPECIAL_SET';
  }

  if (PREMIUM_AUTHORITY[row.set_code]?.[row.finish_key]) {
    return 'MATCHED_AUTHORITY';
  }

  return 'UNMATCHED';
}

function evaluateInterpreter(row) {
  return interpretVersionVsFinish({
    source: 'premium_authority_v1',
    setCode: row.set_code,
    cardNumber: row.number,
    canonicalFinishCandidate: row.finish_key,
    upstreamCardId: row.gv_id,
    upstreamName: `${row.gv_id ?? 'unknown'} ${row.finish_key ?? 'unknown'}`,
    observedPrintings: [row.finish_key],
    isDifferentIssuedVersion: false,
    isFinishOnly: true,
    isRepresentableFinish: true,
  });
}

function buildPlan(rows) {
  const report = {
    generatedAt: new Date().toISOString(),
    authorityModel: PREMIUM_AUTHORITY,
    sourceEvidence: SOURCE_EVIDENCE,
    totals: {
      totalRows: 0,
      matched: 0,
      unmatched: 0,
      excludedSpecialSetRows: 0,
      interpreterPassed: 0,
      interpreterFailed: 0,
    },
    bySet: {},
    rows: [],
    applySteps: [
      {
        step: 1,
        action: 'PRE_APPLY_SNAPSHOT',
        description:
          'Capture a pre-apply snapshot of all matched sv8pt5 premium rows and their current provenance fields before any update runs.',
      },
      {
        step: 2,
        action: 'BACKFILL_PROVENANCE',
        description:
          "Set provenance_source='premium_authority_v1' and created_by='premium_reconciliation_v1' for matched sv8pt5 pokeball/masterball rows only.",
      },
      {
        step: 3,
        action: 'POST_APPLY_VERIFY',
        description:
          'Run the verification queries immediately after the update and compare counts against the pre-apply snapshot before treating the lane as governed.',
      },
    ],
    updateSql: `update public.card_printings cpr
set
  provenance_source = 'premium_authority_v1',
  created_by = 'premium_reconciliation_v1'
from public.card_prints cp
where cp.id = cpr.card_print_id
  and cpr.finish_key in ('pokeball', 'masterball')
  and cp.set_code = 'sv8pt5'
  and (cpr.provenance_source is null or cpr.created_by is null);`,
    verificationQueries: [
      `-- No unguided global premium rows remain
select count(*)
from public.card_printings cpr
join public.card_prints cp on cp.id = cpr.card_print_id
where cpr.finish_key in ('pokeball','masterball')
  and cp.set_code = 'sv8pt5'
  and cpr.provenance_source is null;`,
      `-- Only sv8pt5 global premium rows are affected in this phase
select cp.set_code, count(*)
from public.card_printings cpr
join public.card_prints cp on cp.id = cpr.card_print_id
where cpr.finish_key in ('pokeball','masterball')
group by cp.set_code
order by cp.set_code;`,
      `-- Backfilled provenance distribution
select cpr.provenance_source, cpr.created_by, count(*)
from public.card_printings cpr
join public.card_prints cp on cp.id = cpr.card_print_id
where cpr.finish_key in ('pokeball','masterball')
  and cp.set_code = 'sv8pt5'
group by cpr.provenance_source, cpr.created_by
order by cpr.provenance_source, cpr.created_by;`,
    ],
    rollbackPlan: [
      'Before any update, export the matched sv8pt5 premium row snapshot with current provenance_source and created_by values.',
      'Run the provenance backfill inside a single transaction.',
      'If any verification query fails before commit, ROLLBACK the transaction immediately.',
      'If a committed repair must be reverted later, restore provenance_source and created_by from the pre-apply snapshot for the same sv8pt5 finish rows.',
    ],
    stopConditions: [
      'any row fails interpreter check',
      'any row outside sv8pt5 appears after excluding me02.5',
      'any finish outside the global premium vocabulary appears',
      'any mismatch occurs between a legacy row and the temporary authority model',
    ],
    notes: [
      'This is a read-only plan artifact. No update is executed by this runner.',
      'The temporary authority model is deliberately in-memory and must later become a formal rulebook artifact.',
      'me02.5 is explicitly excluded from this reconciliation plan.',
    ],
  };

  for (const row of rows) {
    const authorityStatus = matchAuthority(row);

    if (authorityStatus === 'EXCLUDED_SPECIAL_SET') {
      report.totals.excludedSpecialSetRows += 1;
      continue;
    }

    const setCode = row.set_code ?? 'unknown';
    if (!report.bySet[setCode]) {
      report.bySet[setCode] = {
        total: 0,
        matched: 0,
        unmatched: 0,
      };
    }

    report.totals.totalRows += 1;
    report.bySet[setCode].total += 1;

    const interpreter = evaluateInterpreter(row);
    const normalizedRow = {
      gv_id: row.gv_id,
      set_code: row.set_code,
      number: row.number,
      finish_key: row.finish_key,
      provenance_source: row.provenance_source,
      created_by: row.created_by,
      authorityStatus,
      interpreterDecision: interpreter.decision,
      interpreterReasonCode: interpreter.reasonCode,
    };

    if (authorityStatus === 'MATCHED_AUTHORITY') {
      report.totals.matched += 1;
      report.bySet[setCode].matched += 1;
    } else {
      report.totals.unmatched += 1;
      report.bySet[setCode].unmatched += 1;
    }

    if (interpreter.decision === VERSION_FINISH_DECISIONS.CHILD) {
      report.totals.interpreterPassed += 1;
    } else {
      report.totals.interpreterFailed += 1;
      normalizedRow.interpreterFailure = interpreter;
    }

    report.rows.push(normalizedRow);
  }

  report.rows.sort(compareRowOrder);

  const nonExcludedSetCodes = Object.keys(report.bySet);
  if (report.rows.some((row) => !PREMIUM_FINISH_KEYS.includes(row.finish_key))) {
    throw new Error('[premium-authority-match-audit] unexpected finish outside global premium vocabulary.');
  }

  if (report.totals.interpreterFailed > 0) {
    throw new Error('[premium-authority-match-audit] interpreter consistency check failed.');
  }

  if (report.totals.unmatched > 0) {
    throw new Error('[premium-authority-match-audit] unmatched premium rows detected.');
  }

  if (nonExcludedSetCodes.some((setCode) => setCode !== 'sv8pt5')) {
    throw new Error('[premium-authority-match-audit] unexpected non-excluded set detected.');
  }

  return report;
}

function buildMarkdown(report) {
  const matchedRows = report.rows.filter((row) => row.authorityStatus === 'MATCHED_AUTHORITY');
  const unmatchedRows = report.rows.filter((row) => row.authorityStatus === 'UNMATCHED');

  const lines = [
    '# PREMIUM RECONCILIATION APPLY PLAN V1',
    '',
    '## Summary',
    `- Total Rows: ${report.totals.totalRows}`,
    `- Matched: ${report.totals.matched}`,
    `- Unmatched: ${report.totals.unmatched}`,
    `- Excluded Special-Set Rows: ${report.totals.excludedSpecialSetRows}`,
    `- Interpreter Passed: ${report.totals.interpreterPassed}`,
    `- Interpreter Failed: ${report.totals.interpreterFailed}`,
    '',
    '## By Set',
  ];

  const setCodes = Object.keys(report.bySet).sort((left, right) => left.localeCompare(right));
  if (!setCodes.length) {
    lines.push('- None');
  } else {
    for (const setCode of setCodes) {
      const summary = report.bySet[setCode];
      lines.push(`- ${setCode}: ${summary.matched} matched / ${summary.unmatched} unmatched / ${summary.total} total`);
    }
  }

  lines.push('', '## Matched Rows');
  if (!matchedRows.length) {
    lines.push('- None');
  } else {
    for (const row of matchedRows) {
      lines.push(`- ${row.set_code} #${row.number} | ${row.gv_id} | ${row.finish_key} | ${row.authorityStatus}`);
    }
  }

  lines.push('', '## Unmatched Rows');
  if (!unmatchedRows.length) {
    lines.push('- None');
  } else {
    for (const row of unmatchedRows) {
      lines.push(`- ${row.set_code} #${row.number} | ${row.gv_id} | ${row.finish_key} | ${row.authorityStatus}`);
    }
  }

  lines.push('', '## Apply Steps');
  for (const step of report.applySteps) {
    lines.push(`- ${step.step}. ${step.action}: ${step.description}`);
  }

  lines.push('', '## Update SQL');
  lines.push('```sql');
  lines.push(report.updateSql);
  lines.push('```');

  lines.push('', '## Verification Queries');
  for (const query of report.verificationQueries) {
    lines.push('```sql');
    lines.push(query);
    lines.push('```');
  }

  lines.push('', '## Rollback Plan');
  for (const line of report.rollbackPlan) {
    lines.push(`- ${line}`);
  }

  lines.push('', '## Stop Conditions');
  for (const line of report.stopConditions) {
    lines.push(`- ${line}`);
  }

  lines.push('', '## Notes');
  for (const line of report.notes) {
    lines.push(`- ${line}`);
  }

  lines.push('', '## Source Evidence');
  for (const source of report.sourceEvidence) {
    lines.push(`- ${source.label}: ${source.url}`);
  }

  return `${lines.join('\n')}\n`;
}

async function writeOutputs(report, markdown) {
  await mkdir(path.dirname(JSON_OUTPUT_PATH), { recursive: true });
  await writeFile(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(MARKDOWN_OUTPUT_PATH, markdown, 'utf8');
}

function printSummary(report) {
  console.log('=== PREMIUM AUTHORITY MATCH AUDIT ===');
  console.log('');
  console.log(`Total Rows: ${report.totals.totalRows}`);
  console.log(`Matched: ${report.totals.matched}`);
  console.log(`Unmatched: ${report.totals.unmatched}`);
  console.log(`Interpreter Passed: ${report.totals.interpreterPassed}`);
  console.log(`Interpreter Failed: ${report.totals.interpreterFailed}`);
  console.log('');
  console.log('By Set:');

  const setCodes = Object.keys(report.bySet).sort((left, right) => left.localeCompare(right));
  if (!setCodes.length) {
    console.log('(none)');
    return;
  }

  for (const setCode of setCodes) {
    const summary = report.bySet[setCode];
    console.log(`${setCode} → ${summary.matched} matched / ${summary.unmatched} unmatched`);
  }
}

async function main() {
  const supabase = createBackendClient();
  const rows = await fetchPremiumRows(supabase);
  const report = buildPlan(rows);
  const markdown = buildMarkdown(report);

  await writeOutputs(report, markdown);
  printSummary(report);
  console.log('');
  console.log(`Wrote JSON: ${JSON_OUTPUT_PATH}`);
  console.log(`Wrote Markdown: ${MARKDOWN_OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('[premium-authority-match-audit] failed:', error?.message ?? error);
  process.exitCode = 1;
});

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const REMAINING_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const NON_TCGDEX_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08s_non_tcgdex_parent_insert_readiness_v1.json');
const STAMPED_IDENTITY_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const STAMPED_ROUTING_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg13_blocker_governance_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg13_blocker_governance_plan_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg13_blocker_governance_plan_checkpoint_v1.md');
const execFileAsync = promisify(execFile);

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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

async function liveMappingSources() {
  const conn = connectionString();
  if (!conn) return { available: false, rows: [] };
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select source, count(*)::int as rows
       from public.external_mappings
       group by source
       order by rows desc, source`,
    );
    await client.query('rollback');
    return { available: true, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, error: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

async function fetchTcgdex(cardId) {
  const url = `https://api.tcgdex.net/v2/en/cards/${cardId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { card_id: cardId, source_url: url, available: false, status: response.status };
    }
    const body = await response.json();
    return {
      card_id: cardId,
      source_url: url,
      available: true,
      status: response.status,
      name: body.name ?? null,
      local_id: body.localId ?? null,
      set_id: body.set?.id ?? null,
      set_name: body.set?.name ?? null,
      variants: body.variants ?? null,
      variants_detailed: body.variants_detailed ?? null,
    };
  } catch (error) {
    try {
      const { stdout } = await execFileAsync('powershell', [
        '-NoProfile',
        '-Command',
        `$r = Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -TimeoutSec 20; $r.Content`,
      ], { maxBuffer: 1024 * 1024 });
      const body = JSON.parse(stdout);
      return {
        card_id: cardId,
        source_url: url,
        available: true,
        status: 200,
        fetch_fallback: 'powershell_invoke_webrequest',
        name: body.name ?? null,
        local_id: body.localId ?? null,
        set_id: body.set?.id ?? null,
        set_name: body.set?.name ?? null,
        variants: body.variants ?? null,
        variants_detailed: body.variants_detailed ?? null,
      };
    } catch (fallbackError) {
      return {
        card_id: cardId,
        source_url: url,
        available: false,
        error: error.message,
        fallback_error: fallbackError.message,
      };
    }
  }
}

function stableTcgdexIdsForMissingRows(rows) {
  return rows
    .filter((row) => row.set_key === 'svp')
    .map((row) => `${row.set_key}-${Number.parseInt(String(row.card_number), 10)}`)
    .filter((value) => !value.endsWith('NaN'));
}

function classifyMissingRows({ remainingRows, nonTcgdexRows, tcgdexRows, mappingSources }) {
  const existingMappingSources = new Set((mappingSources.rows ?? []).map((row) => row.source));
  const tcgdexById = new Map(tcgdexRows.map((row) => [row.card_id, row]));
  const nonTcgdexByFact = new Map((nonTcgdexRows ?? []).map((row) => [
    [row.set_key, row.card_number, row.card_name, row.finish_key].join('|'),
    row,
  ]));

  return remainingRows.map((row) => {
    const factKey = [row.set_key, row.card_number, row.card_name, row.finish_key].join('|');
    const readiness = nonTcgdexByFact.get(factKey);
    if (row.set_key === 'mep' && readiness?.preferred_external_mapping?.source === 'bulbapedia') {
      return {
        ...row,
        blocker_class: existingMappingSources.has('bulbapedia')
          ? 'bulbapedia_mapping_carrier_ready_for_dry_run'
          : 'bulbapedia_mapping_carrier_governance_required',
        proposed_next_action: 'Define whether Bulbapedia card pages may be used as durable external_mappings source ids for exact promo card identities.',
        proposed_mapping: readiness.preferred_external_mapping,
        write_ready_now: false,
      };
    }
    if (row.set_key === 'svp') {
      const tcgdexId = `${row.set_key}-${Number.parseInt(String(row.card_number), 10)}`;
      const tcgdex = tcgdexById.get(tcgdexId);
      const tcgdexFinishKeys = [
        ...(tcgdex?.variants?.normal ? ['normal'] : []),
        ...(tcgdex?.variants?.holo ? ['holo'] : []),
        ...(tcgdex?.variants?.reverse ? ['reverse'] : []),
        ...(tcgdex?.variants_detailed ?? []).map((variant) => variant.type).filter(Boolean),
      ];
      return {
        ...row,
        blocker_class: tcgdex?.available
          ? 'stable_tcgdex_id_found_but_finish_conflict'
          : 'stable_card_external_id_still_missing',
        proposed_next_action: tcgdex?.available
          ? 'Resolve SVP 175/176 finish truth before write. TCGdex exposes stable ids but supports normal, while current Master Index row asks for holo.'
          : 'Acquire stable card-level source id before any parent insert.',
        tcgdex_live: tcgdex ?? null,
        tcgdex_finish_keys: [...new Set(tcgdexFinishKeys)],
        write_ready_now: false,
      };
    }
    return {
      ...row,
      blocker_class: 'unclassified_remaining_missing_parent_blocker',
      proposed_next_action: 'Manual review required.',
      write_ready_now: false,
    };
  });
}

function renderMarkdown(report) {
  const rows = report.remaining_parent_blockers.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.blocker_class,
    row.proposed_next_action,
  ]);
  const stampedRows = [
    ['stamped_blocker_rows', report.stamped_summary.stamped_blocker_rows],
    ['identity_ready_clean', report.stamped_summary.ready_for_guarded_parent_identity_insert],
    ['identity_ready_dependency_aware', report.stamped_summary.ready_with_dependency_awareness],
    ['routing_reviewed', report.stamped_routing_summary.candidate_rows_reviewed],
    ['routing_ready', report.stamped_routing_summary.exact_label_routed_rows],
    ['routing_blocked', report.stamped_routing_summary.blocked_rows],
  ];
  return `# PKG-13 Blocker Governance Plan V1

Read-only governance plan for the blockers left after the latest Master Index reconciliation packages.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Remaining Parent Blockers

${markdownTable(['set', 'number', 'name', 'finish', 'blocker', 'next_action'], rows)}

## Stamped Blocker Summary

${markdownTable(['metric', 'value'], stampedRows)}

## Decision

No additional DB write package is ready from this report.

- MEP requires explicit Bulbapedia mapping-carrier governance before parent inserts.
- SVP 175/176 now have live TCGdex card IDs, but TCGdex reports normal while the current Master Index row is holo. That is a finish conflict, not write authority.
- Stamped identity rows may look parent-ready, but stamped finish routing remains blocked because exact active finish routing is not proven.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-13 Blocker Governance Plan Checkpoint V1](20260610_pkg13_blocker_governance_plan_checkpoint_v1.md) | Read-only plan for remaining MEP/SVP parent blockers and stamped routing blockers. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg13_blocker_governance_plan_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg13_blocker_governance_plan_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const remaining = await readJson(REMAINING_JSON);
const nonTcgdex = await readJson(NON_TCGDEX_JSON);
const stampedIdentity = await readJson(STAMPED_IDENTITY_JSON);
const stampedRouting = await readJson(STAMPED_ROUTING_JSON);
const mappingSources = await liveMappingSources();
const remainingParentRows = (remaining.rows ?? []).filter((row) => row.lane === 'missing_parent_in_existing_set');
const tcgdexIds = stableTcgdexIdsForMissingRows(remainingParentRows);
const tcgdexRows = await Promise.all(tcgdexIds.map(fetchTcgdex));
const parentBlockers = classifyMissingRows({
  remainingRows: remainingParentRows,
  nonTcgdexRows: nonTcgdex.rows ?? [],
  tcgdexRows,
  mappingSources,
});
const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg13_blocker_governance_plan_v1',
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  write_ready_now: 0,
  mapping_sources: mappingSources,
  remaining_summary: remaining.summary,
  non_tcgdex_parent_insert_readiness_summary: nonTcgdex.summary,
  remaining_parent_blockers: parentBlockers,
  tcgdex_live_checks: tcgdexRows,
  stamped_summary: stampedIdentity.summary,
  stamped_routing_summary: stampedRouting.summary ?? stampedRouting,
  stop_findings: [
    ...(parentBlockers.some((row) => row.blocker_class === 'stable_tcgdex_id_found_but_finish_conflict') ? ['svp_finish_conflict_requires_adjudication'] : []),
    ...(parentBlockers.some((row) => row.blocker_class === 'bulbapedia_mapping_carrier_governance_required') ? ['bulbapedia_mapping_carrier_not_governed'] : []),
    ...((stampedRouting.summary ?? stampedRouting).blocked_rows > 0 ? ['stamped_finish_routing_not_write_ready'] : []),
  ],
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
  remaining_parent_blockers: parentBlockers.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    blocker_class: row.blocker_class,
  })),
  stamped_routing_blocked_rows: report.stamped_routing_summary.blocked_rows,
  stop_findings: report.stop_findings,
  write_ready_now: 0,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

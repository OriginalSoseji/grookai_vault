import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Client } = pg;

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconciliation_variant_integrity_v1');
const MASTER_INDEX_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'english_master_index_printings_v1.json',
);
const SET_ALIAS_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'english_master_index_set_alias_normalization_v1.json',
);

const NORMALIZED_EMPTY = '';

function getDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/pokemon/g, 'pokémon')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toUpperCase();
}

function canonicalSetCode(value, aliasMap = new Map()) {
  const raw = String(value ?? '').trim();
  return aliasMap.get(raw) ?? raw;
}

function keyFor({ setCode, number, name, finish }, aliasMap = new Map()) {
  return [
    normalizeText(canonicalSetCode(setCode, aliasMap)),
    normalizeNumber(number),
    normalizeText(name),
    normalizeText(finish),
  ].join('|');
}

function cardKeyFor({ setCode, number, name }, aliasMap = new Map()) {
  return [
    normalizeText(canonicalSetCode(setCode, aliasMap)),
    normalizeNumber(number),
    normalizeText(name),
  ].join('|');
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function hasModifier(row) {
  return !isBlank(row.variant_key) || !isBlank(row.printed_identity_modifier);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, getter) {
  const counts = {};
  for (const row of rows) {
    const key = getter(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topRows(rows, count = 25) {
  return rows.slice(0, count);
}

function markdownTable(rows, columns) {
  if (!rows.length) return 'None.';
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const sep = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => {
    const raw = column.value(row);
    return String(raw ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  }).join(' |')} |`);
  return [header, sep, ...body].join('\n');
}

function loadMasterIndex() {
  const aliasMap = loadSetAliasMap();
  const parsed = JSON.parse(fs.readFileSync(MASTER_INDEX_PATH, 'utf8'));
  const printings = parsed.printings ?? [];
  const masterByPrintingKey = new Map();
  const masterByCardKey = new Map();

  for (const fact of printings) {
    if (fact.status !== 'master_verified') continue;
    const printingKey = keyFor({
      setCode: fact.set_key,
      number: fact.card_number,
      name: fact.card_name,
      finish: fact.finish_key,
    }, aliasMap);
    const cardKey = cardKeyFor({
      setCode: fact.set_key,
      number: fact.card_number,
      name: fact.card_name,
    }, aliasMap);
    if (!masterByPrintingKey.has(printingKey)) masterByPrintingKey.set(printingKey, []);
    masterByPrintingKey.get(printingKey).push(fact);
    if (!masterByCardKey.has(cardKey)) masterByCardKey.set(cardKey, []);
    masterByCardKey.get(cardKey).push(fact);
  }

  return {
    generated_at: parsed.generated_at,
    printings_total: printings.length,
    master_verified_printings: [...masterByPrintingKey.values()].reduce((sum, facts) => sum + facts.length, 0),
    masterByPrintingKey,
    masterByCardKey,
    aliasMap,
  };
}

function loadSetAliasMap() {
  if (!fs.existsSync(SET_ALIAS_PATH)) return new Map();
  const parsed = JSON.parse(fs.readFileSync(SET_ALIAS_PATH, 'utf8'));
  const map = new Map();
  for (const row of parsed.remaps ?? []) {
    if (row.from_set_key && row.to_set_key) {
      map.set(String(row.from_set_key).trim(), String(row.to_set_key).trim());
    }
  }
  return map;
}

async function fetchLiveRows(client) {
  const { rows } = await client.query(`
    with child_dependencies as (
      select
        cpr.id as card_printing_id,
        count(distinct e.id)::int as external_printing_mapping_refs,
        count(distinct v.id)::int as vault_item_instance_refs,
        count(distinct w.id)::int as warehouse_candidate_refs
      from public.card_printings cpr
      left join public.external_printing_mappings e on e.card_printing_id = cpr.id
      left join public.vault_item_instances v on v.card_printing_id = cpr.id
      left join public.canon_warehouse_candidates w on w.promoted_card_printing_id = cpr.id
      group by cpr.id
    )
    select
      cp.id as card_print_id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.identity_domain,
      cp.external_ids,
      s.name as set_name,
      s.identity_domain_default,
      cpr.id as card_printing_id,
      cpr.finish_key,
      cpr.printing_gv_id,
      coalesce(dep.external_printing_mapping_refs, 0)::int as external_printing_mapping_refs,
      coalesce(dep.vault_item_instance_refs, 0)::int as vault_item_instance_refs,
      coalesce(dep.warehouse_candidate_refs, 0)::int as warehouse_candidate_refs
    from public.card_printings cpr
    join public.card_prints cp on cp.id = cpr.card_print_id
    left join public.sets s on s.id = cp.set_id
    left join child_dependencies dep on dep.card_printing_id = cpr.id
    where coalesce(cp.identity_domain, s.identity_domain_default) = 'pokemon_eng_standard'
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cpr.finish_key nulls last
  `);
  return rows;
}

function classifyRows(liveRows, master) {
  const rows = liveRows.map((row) => {
    const printingKey = keyFor({
      setCode: row.set_code,
      number: row.number,
      name: row.name,
      finish: row.finish_key,
    }, master.aliasMap);
    const cardKey = cardKeyFor({
      setCode: row.set_code,
      number: row.number,
      name: row.name,
    }, master.aliasMap);
    const supportedFacts = master.masterByPrintingKey.get(printingKey) ?? [];
    const cardFacts = master.masterByCardKey.get(cardKey) ?? [];
    const dependencyCount = Number(row.external_printing_mapping_refs)
      + Number(row.vault_item_instance_refs)
      + Number(row.warehouse_candidate_refs);
    let status = 'verified_by_master_index';
    let recommended_action = 'no_action';
    let reason = 'Live child finish matches a master-verified printing fact.';

    if (!supportedFacts.length && !cardFacts.length) {
      status = 'card_identity_missing_from_master_index';
      recommended_action = 'manual_review';
      reason = 'Live child belongs to a card identity not found in the master-verified printings index.';
    } else if (!supportedFacts.length && hasModifier(row)) {
      status = 'unsupported_modifier_parent_finish';
      recommended_action = 'manual_review';
      reason = 'Finish is not in the master index for this card, but the parent has a variant/modifier boundary.';
    } else if (!supportedFacts.length && dependencyCount > 0) {
      status = 'unsupported_finish_with_dependencies';
      recommended_action = 'dependency_transfer_or_manual_review';
      reason = 'Finish is not in the master index and the child has DB dependency references.';
    } else if (!supportedFacts.length) {
      status = 'unsupported_finish_no_dependencies';
      recommended_action = 'guarded_delete_candidate';
      reason = 'Finish is not in the master index, the card identity is present, and the child has no detected dependencies.';
    }

    return {
      status,
      recommended_action,
      reason,
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      gv_id: row.gv_id,
      printing_gv_id: row.printing_gv_id,
      set_code: row.set_code,
      set_name: row.set_name,
      card_number: row.number,
      card_name: row.name,
      finish_key: row.finish_key,
      variant_key: row.variant_key || null,
      printed_identity_modifier: row.printed_identity_modifier || null,
      master_supported_finishes: [...new Set(cardFacts.map((fact) => fact.finish_key))].sort(),
      master_evidence_urls: [...new Set(cardFacts.flatMap((fact) => fact.evidence_urls ?? []))].slice(0, 8),
      external_printing_mapping_refs: Number(row.external_printing_mapping_refs),
      vault_item_instance_refs: Number(row.vault_item_instance_refs),
      warehouse_candidate_refs: Number(row.warehouse_candidate_refs),
    };
  });

  return rows;
}

function buildReport(classified, master) {
  const unsupported = classified.filter((row) => row.status !== 'verified_by_master_index');
  const deleteCandidates = classified.filter((row) => row.status === 'unsupported_finish_no_dependencies');
  const dependencyRows = classified.filter((row) => row.status === 'unsupported_finish_with_dependencies');
  const modifierRows = classified.filter((row) => row.status === 'unsupported_modifier_parent_finish');
  const missingIdentityRows = classified.filter((row) => row.status === 'card_identity_missing_from_master_index');
  const xy124Rows = classified.filter((row) => row.set_code === 'xyp' && row.card_number === 'XY124');

  return {
    version: 'POST_RECONCILIATION_VARIANT_INTEGRITY_AUDIT_V1',
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    master_index: {
      path: path.relative(ROOT, MASTER_INDEX_PATH),
      generated_at: master.generated_at,
      printings_total: master.printings_total,
      master_verified_printings: master.master_verified_printings,
    },
    summary: {
      live_child_printings_checked: classified.length,
      verified_by_master_index: classified.length - unsupported.length,
      unsupported_total: unsupported.length,
      guarded_delete_candidates_no_dependencies: deleteCandidates.length,
      unsupported_with_dependencies: dependencyRows.length,
      unsupported_modifier_parent_finish: modifierRows.length,
      card_identity_missing_from_master_index: missingIdentityRows.length,
      conflicts_detected: 0,
      candidate_unconfirmed_created: 0,
    },
    by_status: countBy(classified, (row) => row.status),
    unsupported_by_set: countBy(unsupported, (row) => row.set_code),
    unsupported_by_finish: countBy(unsupported, (row) => row.finish_key),
    xy124_seed_case: xy124Rows,
    guarded_delete_candidates_no_dependencies: deleteCandidates,
    unsupported_with_dependencies: dependencyRows,
    unsupported_modifier_parent_finish: modifierRows,
    card_identity_missing_from_master_index: missingIdentityRows,
  };
}

function writeReports(report) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, 'post_reconciliation_variant_integrity_audit_v1.json');
  const mdPath = path.join(OUT_DIR, 'post_reconciliation_variant_integrity_audit_v1.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const xy124 = report.xy124_seed_case;
  const topUnsupported = topRows(report.guarded_delete_candidates_no_dependencies, 40);
  const dependencyRows = topRows(report.unsupported_with_dependencies, 25);
  const modifierRows = topRows(report.unsupported_modifier_parent_finish, 25);

  const markdown = `# Post-Reconciliation Variant Integrity Audit V1

Generated: ${report.generated_at}

This is a read-only audit. It compares live English physical child printings against the current master-verified English Master Index printings.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(Object.entries(report.summary).map(([metric, value]) => ({ metric, value })), [
  { label: 'metric', value: (row) => row.metric },
  { label: 'value', value: (row) => row.value },
])}

## XY124 Seed Case

${markdownTable(xy124, [
  { label: 'status', value: (row) => row.status },
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.card_number },
  { label: 'name', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'printing_gv_id', value: (row) => row.printing_gv_id },
  { label: 'supported_finishes', value: (row) => row.master_supported_finishes.join(', ') },
  { label: 'action', value: (row) => row.recommended_action },
])}

## Unsupported By Set

${markdownTable(Object.entries(report.unsupported_by_set).slice(0, 30).map(([set_code, rows]) => ({ set_code, rows })), [
  { label: 'set_code', value: (row) => row.set_code },
  { label: 'rows', value: (row) => row.rows },
])}

## Unsupported By Finish

${markdownTable(Object.entries(report.unsupported_by_finish).map(([finish_key, rows]) => ({ finish_key, rows })), [
  { label: 'finish_key', value: (row) => row.finish_key },
  { label: 'rows', value: (row) => row.rows },
])}

## Guarded Delete Candidates Without Dependencies

These are not deleted by this audit. They are candidates for a later guarded dry-run package only.

${markdownTable(topUnsupported, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.card_number },
  { label: 'name', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'supported', value: (row) => row.master_supported_finishes.join(', ') },
  { label: 'child_id', value: (row) => row.card_printing_id },
])}

## Unsupported With Dependencies

${markdownTable(dependencyRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.card_number },
  { label: 'name', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'external_refs', value: (row) => row.external_printing_mapping_refs },
  { label: 'vault_refs', value: (row) => row.vault_item_instance_refs },
  { label: 'warehouse_refs', value: (row) => row.warehouse_candidate_refs },
])}

## Modifier Parent Manual Review

${markdownTable(modifierRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.card_number },
  { label: 'name', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'variant', value: (row) => row.variant_key },
  { label: 'modifier', value: (row) => row.printed_identity_modifier },
])}

## Fingerprint

\`${sha256(JSON.stringify(report.summary) + JSON.stringify(report.xy124_seed_case) + JSON.stringify(report.by_status))}\`
`;
  fs.writeFileSync(mdPath, markdown);
  return { jsonPath, mdPath };
}

async function main() {
  const dbUrl = getDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');
  const master = loadMasterIndex();
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const liveRows = await fetchLiveRows(client);
    const classified = classifyRows(liveRows, master);
    const report = buildReport(classified, master);
    const written = writeReports(report);
    console.log(JSON.stringify({
      ...report.summary,
      by_status: report.by_status,
      output_json: path.relative(ROOT, written.jsonPath),
      output_md: path.relative(ROOT, written.mdPath),
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

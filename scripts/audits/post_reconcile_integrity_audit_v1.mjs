import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const MASTER_SETS_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_publishable_v1',
  'sets',
);
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconcile_integrity_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'post_reconcile_integrity_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'post_reconcile_integrity_audit_v1.md');
const GOVERNED_EXCEPTIONS_JSON = path.join(
  OUTPUT_DIR,
  'post_reconcile_append_only_feed_governance_v1.json',
);

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/pokemon/g, 'pokémon')
    .replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^0*(\d+)([a-z]*)$/i);
  if (!match) return text.toLowerCase();
  return `${Number.parseInt(match[1], 10)}${match[2].toLowerCase()}`;
}

function exactKey({ set_code, number, name, finish_key }) {
  return [
    String(set_code ?? '').trim().toLowerCase(),
    String(number ?? '').trim().toLowerCase(),
    normalizeText(name),
    String(finish_key ?? '').trim().toLowerCase(),
  ].join('|');
}

function normalizedKey({ set_code, number, name, finish_key }) {
  return [
    String(set_code ?? '').trim().toLowerCase(),
    normalizeNumber(number),
    normalizeText(name),
    String(finish_key ?? '').trim().toLowerCase(),
  ].join('|');
}

function parentIdentityKey(row) {
  return [
    String(row.set_code ?? '').trim().toLowerCase(),
    normalizeNumber(row.number),
    normalizeText(row.name),
    String(row.printed_identity_modifier ?? '').trim().toLowerCase(),
    String(row.variant_key ?? '').trim().toLowerCase(),
  ].join('|');
}

function hasImage(row, prefix = '') {
  return Boolean(
    row[`${prefix}image_path`]?.trim?.() ||
      row[`${prefix}image_url`]?.trim?.() ||
      row[`${prefix}image_alt_url`]?.trim?.() ||
      row[`${prefix}representative_image_url`]?.trim?.(),
  );
}

async function loadMasterPrintings() {
  const setDirs = await fs.readdir(MASTER_SETS_DIR, { withFileTypes: true });
  const exact = new Set();
  const normalized = new Set();
  const bySet = new Map();
  let total = 0;

  for (const dir of setDirs.filter((entry) => entry.isDirectory())) {
    const file = path.join(MASTER_SETS_DIR, dir.name, 'printings.json');
    let parsed;
    try {
      parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      continue;
    }
    for (const printing of parsed.printings ?? []) {
      if (printing.status !== 'master_verified') continue;
      const row = {
        set_code: printing.set_key,
        number: printing.card_number,
        name: printing.card_name,
        finish_key: printing.finish_key,
      };
      exact.add(exactKey(row));
      normalized.add(normalizedKey(row));
      bySet.set(printing.set_key, (bySet.get(printing.set_key) ?? 0) + 1);
      total += 1;
    }
  }

  return { exact, normalized, bySet, total };
}

async function loadGovernedDuplicateExceptions() {
  try {
    const parsed = JSON.parse(await fs.readFile(GOVERNED_EXCEPTIONS_JSON, 'utf8'));
    const keys = new Map();
    for (const group of parsed.groups ?? []) {
      keys.set(group.normalized_key, {
        status: parsed.governance_status,
        reason: 'append_only_feed_contract',
        canonical_parent_id: group.canonical_parent_id,
        duplicate_parent_id: group.duplicate_parent_id,
        feed_event_rows: (parsed.feed_events ?? []).filter(
          (event) => event.card_print_id === group.duplicate_parent_id,
        ).length,
        governance_fingerprint_sha256: parsed.governance_fingerprint_sha256,
      });
    }
    return keys;
  } catch {
    return new Map();
  }
}

async function fetchDbRows(client) {
  const parents = await client.query(`
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.printed_identity_modifier,
      cp.variant_key,
      cp.identity_domain,
      cp.image_path,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url,
      cp.image_status,
      coalesce(count(cpi.id), 0)::int as child_count
    from public.card_prints cp
    left join public.card_printings cpi on cpi.card_print_id = cp.id
    where coalesce(cp.identity_domain, 'pokemon_eng_standard') = 'pokemon_eng_standard'
      and cp.set_code is not null
    group by cp.id
  `);

  const children = await client.query(`
    select
      cpi.id as card_printing_id,
      cpi.printing_gv_id,
      cpi.finish_key,
      cpi.image_path,
      cpi.image_url,
      cpi.image_alt_url,
      cpi.image_status,
      cpi.image_source,
      cp.id as card_print_id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.printed_identity_modifier,
      cp.variant_key,
      cp.image_path as parent_image_path,
      cp.image_url as parent_image_url,
      cp.image_alt_url as parent_image_alt_url,
      cp.representative_image_url as parent_representative_image_url,
      cp.image_status as parent_image_status
    from public.card_printings cpi
    join public.card_prints cp on cp.id = cpi.card_print_id
    where coalesce(cp.identity_domain, 'pokemon_eng_standard') = 'pokemon_eng_standard'
      and cp.set_code is not null
  `);

  const identities = await client.query(`
    select
      cpi.id,
      cpi.card_print_id,
      cpi.identity_domain,
      cpi.set_code_identity,
      cpi.printed_number,
      cpi.normalized_printed_name,
      cpi.identity_payload,
      cp.gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.printed_identity_modifier,
      cp.variant_key
    from public.card_print_identity cpi
    join public.card_prints cp on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = 'pokemon_eng_standard'
  `);

  return {
    parents: parents.rows,
    children: children.rows,
    identities: identities.rows,
  };
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const existing = map.get(key) ?? [];
    existing.push(row);
    map.set(key, existing);
  }
  return map;
}

function firstRows(rows, limit = 200) {
  return rows.slice(0, limit);
}

function splitGovernedDuplicateGroups(groups, governedExceptions, keyFn = (group) => group.key) {
  const actionable = [];
  const governed = [];
  for (const group of groups) {
    const exception = governedExceptions.get(keyFn(group));
    if (exception) governed.push({ ...group, governed_exception: exception });
    else actionable.push(group);
  }
  return { actionable, governed };
}

function buildMarkdown(report) {
  return `# Post Reconcile Integrity Audit V1

Read-only audit for failure classes exposed by SVP Grey Felt Hat.

## Summary

- db_writes_performed: ${report.safety.db_writes_performed}
- migrations_created: ${report.safety.migrations_created}
- master_verified_printings_loaded: ${report.summary.master_verified_printings_loaded}
- db_parent_rows_scanned: ${report.summary.db_parent_rows_scanned}
- db_child_printings_scanned: ${report.summary.db_child_printings_scanned}
- duplicate_parent_identity_groups: ${report.summary.duplicate_parent_identity_groups}
- duplicate_parent_identity_groups_actionable: ${report.summary.duplicate_parent_identity_groups_actionable}
- duplicate_parent_identity_groups_governed_exceptions: ${report.summary.duplicate_parent_identity_groups_governed_exceptions}
- duplicate_active_identity_normalized_groups: ${report.summary.duplicate_active_identity_normalized_groups}
- duplicate_active_identity_normalized_groups_actionable: ${report.summary.duplicate_active_identity_normalized_groups_actionable}
- duplicate_active_identity_normalized_groups_governed_exceptions: ${report.summary.duplicate_active_identity_normalized_groups_governed_exceptions}
- unsupported_child_printings_exact: ${report.summary.unsupported_child_printings_exact}
- normalized_supported_child_printings: ${report.summary.normalized_supported_child_printings}
- display_image_risk_child_rows: ${report.summary.display_image_risk_child_rows}

## Why Grey Felt Hat Slipped

The previous checks proved child finish truth and image evidence for targeted packages, but they did not assert that a card could not still have a second parent owner using an alternate number form. That allowed a padded canonical parent and an unpadded duplicate parent to coexist until Explore made the ambiguity visible.

## Required Regression Gates

- parent_normalized_identity_unique: no duplicate parent groups by set + normalized number + normalized name + identity modifier + variant.
- active_identity_normalized_unique: no active identity groups by domain + set + normalized printed number + normalized printed name + modifier/variant.
- child_printing_supported_by_master_index: every child printing must be exact-supported by the publishable Master Index, or explicitly classified as normalized-supported review debt.
- display_image_has_truthful_fallback: every visible child row must have either child image truth or parent display image truth; blocked variant rows must be explicitly marked.

## Top Duplicate Parent Groups

${report.duplicate_parent_identity_groups.slice(0, 25).map((group) => `- ${group.key}: ${group.rows.map((row) => `${row.gv_id} #${row.number}`).join(', ')}`).join('\n') || '- none'}

## Governed Duplicate Parent Exceptions

${report.governed_duplicate_parent_exception_groups.slice(0, 25).map((group) => `- ${group.key}: ${group.governed_exception.reason}, feed_events=${group.governed_exception.feed_event_rows}`).join('\n') || '- none'}

## Top Unsupported Child Printings

${report.unsupported_child_printings_exact.slice(0, 25).map((row) => `- ${row.printing_gv_id} ${row.set_code} #${row.number} ${row.name} ${row.finish_key}`).join('\n') || '- none'}

## Top Normalized-Supported Child Printings

${report.normalized_supported_child_printings.slice(0, 25).map((row) => `- ${row.printing_gv_id} ${row.set_code} #${row.number} ${row.name} ${row.finish_key}`).join('\n') || '- none'}

## Top Display Image Risk Rows

${report.display_image_risk_child_rows.slice(0, 25).map((row) => `- ${row.printing_gv_id} ${row.set_code} #${row.number} ${row.name} ${row.finish_key}`).join('\n') || '- none'}
`;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const master = await loadMasterPrintings();
  const governedExceptions = await loadGovernedDuplicateExceptions();
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL.');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const db = await fetchDbRows(client);
  await client.end();

  const duplicateParentGroups = [...groupBy(db.parents, parentIdentityKey).entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      count: rows.length,
      rows: rows
        .map((row) => ({
          id: row.id,
          gv_id: row.gv_id,
          name: row.name,
          set_code: row.set_code,
          number: row.number,
          number_plain: row.number_plain,
          printed_identity_modifier: row.printed_identity_modifier,
          variant_key: row.variant_key,
          child_count: row.child_count,
        }))
        .sort((a, b) => String(a.gv_id).localeCompare(String(b.gv_id))),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const parentSplit = splitGovernedDuplicateGroups(duplicateParentGroups, governedExceptions);

  const identityGroups = [...groupBy(db.identities, (row) =>
    [
      row.identity_domain,
      String(row.set_code_identity ?? '').toLowerCase(),
      normalizeNumber(row.printed_number),
      normalizeText(row.normalized_printed_name ?? row.name),
      String(row.printed_identity_modifier ?? '').toLowerCase(),
      String(row.variant_key ?? '').toLowerCase(),
    ].join('|'),
  ).entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      count: rows.length,
      rows: rows.map((row) => ({
        identity_id: row.id,
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        printed_number: row.printed_number,
      })),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const identitySplit = splitGovernedDuplicateGroups(
    identityGroups,
    governedExceptions,
    (group) => group.key.split('|').slice(1).join('|'),
  );

  const unsupportedExact = [];
  const normalizedSupported = [];
  const exactSupported = [];
  const displayImageRisk = [];

  for (const row of db.children) {
    const exact = master.exact.has(exactKey(row));
    const normalized = master.normalized.has(normalizedKey(row));
    if (exact) exactSupported.push(row);
    else if (normalized) normalizedSupported.push(row);
    else unsupportedExact.push(row);

    if (!hasImage(row) && !hasImage(row, 'parent_')) {
      displayImageRisk.push(row);
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    summary: {
      master_verified_printings_loaded: master.total,
      db_parent_rows_scanned: db.parents.length,
      db_child_printings_scanned: db.children.length,
      exact_supported_child_printings: exactSupported.length,
      unsupported_child_printings_exact: unsupportedExact.length,
      normalized_supported_child_printings: normalizedSupported.length,
      duplicate_parent_identity_groups: duplicateParentGroups.length,
      duplicate_parent_identity_groups_actionable: parentSplit.actionable.length,
      duplicate_parent_identity_groups_governed_exceptions: parentSplit.governed.length,
      duplicate_active_identity_normalized_groups: identityGroups.length,
      duplicate_active_identity_normalized_groups_actionable: identitySplit.actionable.length,
      duplicate_active_identity_normalized_groups_governed_exceptions: identitySplit.governed.length,
      display_image_risk_child_rows: displayImageRisk.length,
    },
    duplicate_parent_identity_groups: firstRows(duplicateParentGroups),
    duplicate_parent_identity_groups_actionable: firstRows(parentSplit.actionable),
    governed_duplicate_parent_exception_groups: firstRows(parentSplit.governed),
    duplicate_active_identity_normalized_groups: firstRows(identityGroups),
    duplicate_active_identity_normalized_groups_actionable: firstRows(identitySplit.actionable),
    governed_duplicate_active_identity_exception_groups: firstRows(identitySplit.governed),
    unsupported_child_printings_exact: firstRows(
      unsupportedExact.map((row) => ({
        card_printing_id: row.card_printing_id,
        printing_gv_id: row.printing_gv_id,
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        name: row.name,
        finish_key: row.finish_key,
        printed_identity_modifier: row.printed_identity_modifier,
        variant_key: row.variant_key,
      })),
    ),
    normalized_supported_child_printings: firstRows(
      normalizedSupported.map((row) => ({
        card_printing_id: row.card_printing_id,
        printing_gv_id: row.printing_gv_id,
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        name: row.name,
        finish_key: row.finish_key,
        printed_identity_modifier: row.printed_identity_modifier,
        variant_key: row.variant_key,
      })),
    ),
    display_image_risk_child_rows: firstRows(
      displayImageRisk.map((row) => ({
        card_printing_id: row.card_printing_id,
        printing_gv_id: row.printing_gv_id,
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        set_code: row.set_code,
        number: row.number,
        name: row.name,
        finish_key: row.finish_key,
        child_image_status: row.image_status,
        parent_image_status: row.parent_image_status,
      })),
    ),
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

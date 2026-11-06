import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: process.env.GROOKAI_ENV_FILE ?? '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const SOURCE_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_parent_insert_readiness_20261031_v1.json');
const OUTPUT_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_repair_routing_20261031_v1.json');
const OUTPUT_MD = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_repair_routing_20261031_v1.md');
const PACKAGE_ID = 'TCGPLAYER-PROFESSOR-PROGRAM-REPAIR-ROUTING-V1';
const VARIANT_KEY = 'professor_program_stamp';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

async function captureCurrentRoutes(client, rows) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         source_product_id text,
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_parent_id uuid,
         target_child_id uuid,
         selected_base_parent_id uuid
       )
     )
     select
       target.source_product_id,
       coalesce(parents.rows, '[]'::jsonb) as professor_program_parents,
       coalesce(mapping.rows, '[]'::jsonb) as current_tcgplayer_mappings
     from target
     left join lateral (
       select jsonb_agg(jsonb_build_object(
         'card_print_id', cp.id::text,
         'variant_key', cp.variant_key,
         'printed_identity_modifier', cp.printed_identity_modifier,
         'active_identity_count', coalesce(identity_rows.active_identity_count, 0),
         'children', coalesce(children.rows, '[]'::jsonb)
       ) order by cp.id::text) as rows
       from public.card_prints cp
       left join lateral (
         select count(*)::int as active_identity_count
         from public.card_print_identity cpi
         where cpi.card_print_id = cp.id and cpi.is_active = true
       ) identity_rows on true
       left join lateral (
         select jsonb_agg(jsonb_build_object(
           'printing_id', cpr.id::text,
           'finish_key', cpr.finish_key,
           'is_provisional', cpr.is_provisional
         ) order by cpr.finish_key, cpr.id::text) as rows
         from public.card_printings cpr where cpr.card_print_id = cp.id
       ) children on true
       where cp.set_code = target.set_key
         and coalesce(cp.number_plain, cp.number) = target.card_number
         and lower(cp.name) = lower(target.card_name)
         and cp.variant_key = $2::text
     ) parents on true
     left join lateral (
       select jsonb_agg(jsonb_build_object(
         'mapping_id', em.id::text,
         'card_print_id', em.card_print_id::text,
         'external_id', em.external_id,
         'active', coalesce(em.active, true)
       ) order by em.id::text) as rows
       from public.external_mappings em
       where em.source = 'tcgplayer'
         and em.external_id = target.source_product_id
         and coalesce(em.active, true) = true
     ) mapping on true
     order by target.source_product_id::bigint`,
    [JSON.stringify(rows), VARIANT_KEY],
  );
  return result.rows;
}

function classify(source, current) {
  const parents = current.professor_program_parents ?? [];
  const mappings = current.current_tcgplayer_mappings ?? [];
  if (mappings.length > 0) {
    return { route: 'blocked_source_product_already_mapped', target_parent_id: null, target_printing_id: null, blockers: ['tcgplayer_source_product_already_mapped'] };
  }
  if (parents.length === 0) {
    const blockers = source.readiness_status === 'ready_for_guarded_dry_run_parent_child_insert'
      ? [] : [...source.blockers];
    return {
      route: blockers.length === 0 ? 'ready_parent_identity_child_insert' : 'blocked_missing_parent_not_insert_ready',
      target_parent_id: source.target_parent_id,
      target_printing_id: source.target_child_id,
      blockers,
    };
  }
  if (parents.length > 1) {
    return { route: 'blocked_multiple_professor_program_parents', target_parent_id: null, target_printing_id: null, blockers: ['multiple_professor_program_parents'] };
  }
  const parent = parents[0];
  const matchingChildren = (parent.children ?? []).filter((child) => child.finish_key === source.target_finish_key);
  if (matchingChildren.length !== 1) {
    return {
      route: 'blocked_existing_parent_finish_conflict',
      target_parent_id: parent.card_print_id,
      target_printing_id: null,
      blockers: matchingChildren.length === 0 ? ['source_finish_child_missing_on_professor_program_parent'] : ['multiple_source_finish_children_on_professor_program_parent'],
    };
  }
  if (Number(parent.active_identity_count) !== 1) {
    return {
      route: 'blocked_existing_parent_active_identity_invalid',
      target_parent_id: parent.card_print_id,
      target_printing_id: matchingChildren[0].printing_id,
      blockers: ['existing_parent_active_identity_count_not_one'],
    };
  }
  if (parent.printed_identity_modifier !== VARIANT_KEY) {
    return {
      route: 'ready_existing_parent_modifier_repair',
      target_parent_id: parent.card_print_id,
      target_printing_id: matchingChildren[0].printing_id,
      blockers: [],
    };
  }
  return {
    route: 'ready_tcgplayer_mapping',
    target_parent_id: parent.card_print_id,
    target_printing_id: matchingChildren[0].printing_id,
    blockers: [],
  };
}

function renderMarkdown(report) {
  return `# TCGPlayer Professor Program Repair Routing V1

Fresh production routing for the eight source-backed Professor Program products. Existing stamped parents are reused; duplicate parents are forbidden.

## Safety

- audit_only: ${report.audit_only}
- db_reads_performed: ${report.db_reads_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- mapping_writes_performed: ${report.mapping_writes_performed}
- pricing_writes_performed: ${report.pricing_writes_performed}

## Summary

${markdownTable(['route', 'rows'], Object.entries(report.summary.by_route))}

## Rows

${markdownTable(
    ['product', 'set', 'number', 'card', 'source finish', 'route', 'target parent', 'target printing', 'blockers'],
    report.rows.map((row) => [
      row.source_product_id,
      row.set_key,
      row.card_number,
      row.card_name,
      row.target_finish_key,
      row.route,
      row.target_parent_id ?? '',
      row.target_printing_id ?? '',
      row.blockers.join(', '),
    ]),
  )}

## Next Boundary

Prepare a rollback-only dry run for the three parent/identity/child inserts and three existing-parent modifier repairs. The already-correct Judge parent remains mapping-only. Professor Sycamore remains held because its existing Professor Program parent has a holo child while TCGPlayer declares Reverse Holofoil.
`;
}

async function main() {
  const sourceBytes = await fs.readFile(SOURCE_JSON);
  const source = JSON.parse(sourceBytes.toString('utf8'));
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required for read-only routing.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  let currentRows;
  try {
    await client.query('begin read only');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    currentRows = await captureCurrentRoutes(client, source.rows);
    await client.query('rollback');
  } finally {
    await client.end();
  }
  const currentByProduct = new Map(currentRows.map((row) => [row.source_product_id, row]));
  const rows = source.rows.map((row) => {
    const current = currentByProduct.get(row.source_product_id) ?? { professor_program_parents: [], current_tcgplayer_mappings: [] };
    return {
      source_product_id: row.source_product_id,
      source_product_name: row.source_product_name,
      source_group_id: row.source_group_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      selected_base_parent_id: row.selected_base_parent_id,
      proposed_parent_id: row.target_parent_id,
      proposed_child_id: row.target_child_id,
      professor_program_parents: current.professor_program_parents,
      current_tcgplayer_mappings: current.current_tcgplayer_mappings,
      ...classify(row, current),
    };
  });
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_sha256: sha256(sourceBytes),
    rows: rows.map((row) => ({
      source_product_id: row.source_product_id,
      route: row.route,
      target_parent_id: row.target_parent_id,
      target_printing_id: row.target_printing_id,
      target_finish_key: row.target_finish_key,
      blockers: row.blockers,
    })),
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'tcgplayer_professor_program_repair_routing_20261031_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_reads_performed: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    mapping_writes_performed: false,
    pricing_writes_performed: false,
    migrations_created: false,
    deletes_performed: false,
    merges_performed: false,
    source_artifact: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    source_sha256: sha256(sourceBytes),
    fingerprint_sha256: fingerprint,
    summary: {
      rows: rows.length,
      ready_rows: rows.filter((row) => row.route.startsWith('ready_')).length,
      blocked_rows: rows.filter((row) => row.route.startsWith('blocked_')).length,
      by_route: countBy(rows, (row) => row.route),
    },
    rows,
    next_boundary: {
      dry_run_insert_rows: rows.filter((row) => row.route === 'ready_parent_identity_child_insert').length,
      dry_run_modifier_repair_rows: rows.filter((row) => row.route === 'ready_existing_parent_modifier_repair').length,
      mapping_only_rows: rows.filter((row) => row.route === 'ready_tcgplayer_mapping').length,
      held_rows: rows.filter((row) => row.route.startsWith('blocked_')).length,
    },
  };
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    fingerprint_sha256: fingerprint,
    summary: report.summary,
    next_boundary: report.next_boundary,
    durable_db_writes_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: process.env.GROOKAI_ENV_FILE ?? '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const SOURCE_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_identity_review_20261030_v1.json');
const BULBAPEDIA_CSV = path.join(ROOT, 'docs', 'audits', 'bulbapedia_catalog_compare_v1', 'name_mismatch.csv');
const OUTPUT_JSON = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_parent_insert_readiness_20261031_v1.json');
const OUTPUT_MD = path.join(ROOT, 'docs', 'audits', 'tcgplayer_professor_program_parent_insert_readiness_20261031_v1.md');

const PACKAGE_ID = 'TCGPLAYER-PROFESSOR-PROGRAM-PARENT-INSERT-READINESS-V1';
const FUTURE_PACKAGE_ID = 'TCGPLAYER-PROFESSOR-PROGRAM-PARENT-INSERTS-V1';
const TARGET_REASON = 'live_professor_program_parent_link_not_proven';
const TARGET_VARIANT_KEY = 'professor_program_stamp';

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

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const [headers, ...data] = rows;
  return data.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? '']),
  ));
}

function selectBaseAuthority(source, bulbaRows) {
  const candidateIds = new Set((source.live_targets ?? []).map((row) => row.card_print_id));
  const expectedNumber = normalizeNumber(source.master_candidates[0]?.card_number);
  const expectedName = normalizeText(source.master_candidates[0]?.card_name);
  const exactBulba = bulbaRows.filter((row) => row.set_code === source.master_candidates[0]?.set_key
    && normalizeNumber(row.db_number) === expectedNumber
    && normalizeText(row.db_name) === expectedName
    && /professor\s+program/i.test(row.bulba_notes)
    && candidateIds.has(row.db_card_print_id));
  const exactBulbaIds = [...new Set(exactBulba.map((row) => row.db_card_print_id))];
  if (exactBulbaIds.length === 1) {
    return {
      selected_base_parent_id: exactBulbaIds[0],
      base_selection_authority: 'bulbapedia_additional_cards_exact_base_reference',
      base_selection_evidence: exactBulba.map((row) => ({
        source_url: row.page_url,
        lane: row.bulba_lane,
        notes: row.bulba_notes,
        db_number: row.db_number,
        bulba_number: row.bulba_number,
      })),
    };
  }
  if (candidateIds.size === 1) {
    return {
      selected_base_parent_id: [...candidateIds][0],
      base_selection_authority: 'unique_live_exact_finish_parent_from_review',
      base_selection_evidence: [],
    };
  }
  return {
    selected_base_parent_id: null,
    base_selection_authority: 'unresolved_multiple_live_exact_finish_parents',
    base_selection_evidence: exactBulba.map((row) => ({
      source_url: row.page_url,
      lane: row.bulba_lane,
      notes: row.bulba_notes,
      db_number: row.db_number,
      bulba_number: row.bulba_number,
    })),
  };
}

function buildTargets(review, bulbaRows) {
  return (review.rows ?? [])
    .filter((row) => row.reason === TARGET_REASON)
    .map((row) => {
      const master = row.master_candidates[0];
      const baseAuthority = selectBaseAuthority(row, bulbaRows);
      const finishEvidence = (row.master_printings ?? []).filter((item) => item.finish_key === row.source_finish_key);
      const stampEvidence = (row.master_printings ?? []).filter((item) => item.professor_program_evidence);
      const seed = `${FUTURE_PACKAGE_ID}:${row.source_product_id}:${master.set_key}:${normalizeNumber(master.card_number)}:${normalizeText(master.card_name)}:${TARGET_VARIANT_KEY}:${row.source_finish_key}`;
      return {
        source_product_id: String(row.source_product_id),
        source_product_name: row.source_product_name,
        source_group_id: String(row.source_group_id),
        source_group_name: row.source_group_name,
        target_parent_id: uuidFromSeed(`${seed}:parent`),
        target_child_id: uuidFromSeed(`${seed}:child`),
        set_key: master.set_key,
        set_name: master.set_name,
        card_number: normalizeNumber(master.card_number),
        card_name: master.card_name,
        target_variant_key: TARGET_VARIANT_KEY,
        target_printed_identity_modifier: TARGET_VARIANT_KEY,
        target_finish_key: row.source_finish_key,
        source_subtypes: row.source_subtypes,
        live_exact_finish_parent_ids: [...new Set((row.live_targets ?? []).map((item) => item.card_print_id))].sort(),
        ...baseAuthority,
        evidence: {
          exact_finish: finishEvidence.flatMap((item) => item.evidence_urls ?? []).sort(),
          professor_program_identity: stampEvidence.flatMap((item) => item.evidence_urls ?? []).sort(),
          base_selection: baseAuthority.base_selection_evidence,
        },
        evidence_counts: {
          exact_finish_rows: finishEvidence.length,
          professor_program_identity_rows: stampEvidence.length,
          base_selection_rows: baseAuthority.base_selection_evidence.length,
        },
      };
    })
    .sort((left, right) => Number(left.source_product_id) - Number(right.source_product_id));
}

async function captureReadiness(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         source_product_id text,
         target_parent_id uuid,
         target_child_id uuid,
         selected_base_parent_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_variant_key text,
         target_printed_identity_modifier text,
         target_finish_key text
       )
     ),
     base as (
       select
         target.source_product_id,
         cp.*
       from target
       left join public.card_prints cp on cp.id = target.selected_base_parent_id
     ),
     projection as (
       select
         target.source_product_id,
         public.card_print_identity_backfill_projection_v1(
           s.source,
           base.set_code,
           s.code,
           base.number,
           base.number_plain,
           base.name,
           target.target_variant_key,
           coalesce(base.printed_total, s.printed_total),
           coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
       from target
       join base on base.source_product_id = target.source_product_id and base.id is not null
       left join public.sets s on s.id = base.set_id
     )
     select
       target.source_product_id,
       base.id::text as selected_base_parent_id,
       base.set_code as base_set_code,
       base.number as base_number,
       base.number_plain as base_number_plain,
       base.name as base_name,
       base.variant_key as base_variant_key,
       base.printed_identity_modifier as base_printed_identity_modifier,
       coalesce(matching_base.matching_base_parent_count, 0)::int as matching_base_parent_count,
       coalesce(base_identity.base_identity_match, false) as base_identity_match,
       coalesce(base_finish.base_finish_exists, false) as base_finish_exists,
       coalesce(active_finish.active_finish_exists, false) as active_finish_exists,
       coalesce(parent_collision.parent_collision_count, 0)::int as target_parent_collision_count,
       coalesce(parent_id_collision.parent_id_collision_count, 0)::int as target_parent_id_collision_count,
       coalesce(child_id_collision.child_id_collision_count, 0)::int as target_child_id_collision_count,
       coalesce(source_mapping.source_mapping_count, 0)::int as source_mapping_count,
       coalesce(projection.projected->>'status' = 'ready', false) as identity_projection_ready,
       projection.projected->>'identity_domain' as identity_domain,
       projection.projected->>'identity_key_version' as identity_key_version,
       projection.projected->>'identity_key_hash' as identity_key_hash,
       coalesce(identity_collision.identity_hash_collision_count, 0)::int as identity_hash_collision_count,
       coalesce(candidate_snapshot.rows, '[]'::jsonb) as matching_base_candidates
     from target
     left join base on base.source_product_id = target.source_product_id
     left join projection on projection.source_product_id = target.source_product_id
     left join lateral (
       select count(*)::int as matching_base_parent_count
       from public.card_prints cp
       where cp.set_code = target.set_key
         and coalesce(cp.number_plain, cp.number) = target.card_number
         and lower(cp.name) = lower(target.card_name)
         and coalesce(cp.variant_key, '') = ''
         and nullif(cp.printed_identity_modifier, '') is null
     ) matching_base on true
     left join lateral (
       select (
         base.id is not null
         and base.set_code = target.set_key
         and coalesce(base.number_plain, base.number) = target.card_number
         and lower(base.name) = lower(target.card_name)
         and coalesce(base.variant_key, '') = ''
         and nullif(base.printed_identity_modifier, '') is null
       ) as base_identity_match
     ) base_identity on true
     left join lateral (
       select true as base_finish_exists
       from public.card_printings cpr
       where cpr.card_print_id = base.id and cpr.finish_key = target.target_finish_key
       limit 1
     ) base_finish on true
     left join lateral (
       select true as active_finish_exists
       from public.finish_keys fk
       where fk.key = target.target_finish_key and fk.is_active = true
       limit 1
     ) active_finish on true
     left join lateral (
       select count(*)::int as parent_collision_count
       from public.card_prints cp
       where cp.set_id = base.set_id
         and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
         and lower(cp.name) = lower(base.name)
         and coalesce(cp.variant_key, '') = target.target_variant_key
     ) parent_collision on true
     left join lateral (
       select count(*)::int as parent_id_collision_count
       from public.card_prints cp where cp.id = target.target_parent_id
     ) parent_id_collision on true
     left join lateral (
       select count(*)::int as child_id_collision_count
       from public.card_printings cpr where cpr.id = target.target_child_id
     ) child_id_collision on true
     left join lateral (
       select count(*)::int as source_mapping_count
       from public.external_mappings em
       where em.source = 'tcgplayer'
         and em.external_id = target.source_product_id
         and coalesce(em.active, true) = true
     ) source_mapping on true
     left join lateral (
       select count(*)::int as identity_hash_collision_count
       from public.card_print_identity cpi
       where cpi.is_active = true
         and cpi.identity_domain = projection.projected->>'identity_domain'
         and cpi.identity_key_version = projection.projected->>'identity_key_version'
         and cpi.identity_key_hash = projection.projected->>'identity_key_hash'
     ) identity_collision on true
     left join lateral (
       select jsonb_agg(jsonb_build_object(
         'card_print_id', cp.id::text,
         'number', cp.number,
         'number_plain', cp.number_plain,
         'name', cp.name,
         'variant_key', cp.variant_key,
         'printed_identity_modifier', cp.printed_identity_modifier,
         'finish_keys', coalesce(finishes.finish_keys, '[]'::jsonb)
       ) order by cp.id::text) as rows
       from public.card_prints cp
       left join lateral (
         select jsonb_agg(cpr.finish_key order by cpr.finish_key) as finish_keys
         from public.card_printings cpr where cpr.card_print_id = cp.id
       ) finishes on true
       where cp.set_code = target.set_key
         and coalesce(cp.number_plain, cp.number) = target.card_number
         and lower(cp.name) = lower(target.card_name)
     ) candidate_snapshot on true
     order by target.source_product_id::bigint`,
    [JSON.stringify(targets)],
  );
  return result.rows;
}

function classify(row) {
  const blockers = [];
  if (!row.selected_base_parent_id) blockers.push('selected_base_parent_missing');
  if (!row.base_identity_match) blockers.push('selected_base_parent_identity_mismatch');
  if (!row.base_finish_exists) blockers.push('selected_base_parent_lacks_source_finish');
  if (!row.active_finish_exists) blockers.push('source_finish_key_inactive');
  if (row.evidence_counts.exact_finish_rows < 1) blockers.push('exact_finish_evidence_missing');
  if (row.evidence_counts.professor_program_identity_rows < 1) blockers.push('professor_program_identity_evidence_missing');
  if (row.base_selection_authority === 'unresolved_multiple_live_exact_finish_parents') blockers.push('base_parent_authority_unresolved');
  if (row.target_parent_collision_count > 0) blockers.push('professor_program_parent_already_exists');
  if (row.target_parent_id_collision_count > 0) blockers.push('target_parent_id_collision');
  if (row.target_child_id_collision_count > 0) blockers.push('target_child_id_collision');
  if (row.source_mapping_count > 0) blockers.push('tcgplayer_source_product_already_mapped');
  if (!row.identity_projection_ready) blockers.push('identity_projection_not_ready');
  if (row.identity_hash_collision_count > 0) blockers.push('identity_hash_collision');
  return {
    readiness_status: blockers.length === 0
      ? 'ready_for_guarded_dry_run_parent_child_insert'
      : 'blocked_before_guarded_dry_run',
    blockers,
  };
}

function renderMarkdown(report) {
  return `# TCGPlayer Professor Program Parent Insert Readiness V1

Read-only production readiness audit for the eight Professor Program products that have exact set, card, finish, and stamped-identity evidence but no distinct live Professor Program parent.

## Safety

- audit_only: ${report.audit_only}
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: ${report.db_writes_performed}
- pricing_writes_performed: ${report.pricing_writes_performed}
- mapping_writes_performed: ${report.mapping_writes_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['ready_for_guarded_dry_run_parent_child_insert', report.summary.ready_for_guarded_dry_run_parent_child_insert],
    ['blocked_before_guarded_dry_run', report.summary.blocked_before_guarded_dry_run],
    ['expected_parent_inserts', report.summary.expected_parent_inserts],
    ['expected_identity_inserts', report.summary.expected_identity_inserts],
    ['expected_child_inserts', report.summary.expected_child_inserts],
    ['expected_deletes', 0],
    ['expected_merges', 0],
    ['package_fingerprint_sha256', report.package_fingerprint_sha256],
  ])}

## Targets

${markdownTable(
    ['product', 'set', 'number', 'card', 'finish', 'base parent', 'selection authority', 'matching base rows', 'status', 'blockers'],
    report.rows.map((row) => [
      row.source_product_id,
      row.set_key,
      row.card_number,
      row.card_name,
      row.target_finish_key,
      row.selected_base_parent_id ?? '',
      row.base_selection_authority,
      row.matching_base_parent_count,
      row.readiness_status,
      row.blockers.join(', '),
    ]),
  )}

## Next Boundary

If every row is ready, the next artifact is a rollback-only guarded dry run for ${FUTURE_PACKAGE_ID}. It may simulate exactly eight parent inserts, eight active identity inserts, and eight child printing inserts. It must not write mappings or prices, mutate ordinary parents, delete, merge, quarantine, or create migrations.
`;
}

async function main() {
  const [reviewBytes, bulbaBytes] = await Promise.all([
    fs.readFile(SOURCE_JSON),
    fs.readFile(BULBAPEDIA_CSV),
  ]);
  const review = JSON.parse(reviewBytes.toString('utf8'));
  const bulbaRows = parseCsv(bulbaBytes.toString('utf8'));
  const targets = buildTargets(review, bulbaRows);
  if (targets.length !== 8) throw new Error(`Expected 8 Professor Program parent targets, found ${targets.length}`);

  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required for read-only readiness checks.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  let dbRows;
  try {
    await client.query('begin read only');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    dbRows = await captureReadiness(client, targets);
    await client.query('rollback');
  } finally {
    await client.end();
  }

  const dbByProduct = new Map(dbRows.map((row) => [row.source_product_id, row]));
  const rows = targets.map((target) => {
    const db = dbByProduct.get(target.source_product_id) ?? {};
    const enriched = {
      ...target,
      selected_base_parent_id: db.selected_base_parent_id ?? target.selected_base_parent_id,
      base_set_code: db.base_set_code ?? null,
      base_number: db.base_number ?? null,
      base_number_plain: db.base_number_plain ?? null,
      base_name: db.base_name ?? null,
      base_variant_key: db.base_variant_key ?? null,
      base_printed_identity_modifier: db.base_printed_identity_modifier ?? null,
      matching_base_parent_count: Number(db.matching_base_parent_count ?? 0),
      base_identity_match: Boolean(db.base_identity_match),
      base_finish_exists: Boolean(db.base_finish_exists),
      active_finish_exists: Boolean(db.active_finish_exists),
      target_parent_collision_count: Number(db.target_parent_collision_count ?? 0),
      target_parent_id_collision_count: Number(db.target_parent_id_collision_count ?? 0),
      target_child_id_collision_count: Number(db.target_child_id_collision_count ?? 0),
      source_mapping_count: Number(db.source_mapping_count ?? 0),
      identity_projection_ready: Boolean(db.identity_projection_ready),
      identity_domain: db.identity_domain ?? null,
      identity_key_version: db.identity_key_version ?? null,
      identity_key_hash: db.identity_key_hash ?? null,
      identity_hash_collision_count: Number(db.identity_hash_collision_count ?? 0),
      matching_base_candidates: db.matching_base_candidates ?? [],
    };
    return { ...enriched, ...classify(enriched) };
  });
  const ready = rows.filter((row) => row.readiness_status === 'ready_for_guarded_dry_run_parent_child_insert');
  const packageFingerprint = sha256(stableJson({
    package_id: FUTURE_PACKAGE_ID,
    source_review_sha256: sha256(reviewBytes),
    bulbapedia_compare_sha256: sha256(bulbaBytes),
    targets: rows.map((row) => ({
      source_product_id: row.source_product_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      selected_base_parent_id: row.selected_base_parent_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      base_selection_authority: row.base_selection_authority,
    })),
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'tcgplayer_professor_program_parent_insert_readiness_20261031_v1',
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    audit_only: true,
    db_reads_performed: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    pricing_writes_performed: false,
    mapping_writes_performed: false,
    migrations_created: false,
    deletes_performed: false,
    merges_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      professor_program_identity_review: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
      bulbapedia_catalog_compare_name_mismatch: path.relative(ROOT, BULBAPEDIA_CSV).replaceAll('\\', '/'),
    },
    source_hashes_sha256: {
      professor_program_identity_review: sha256(reviewBytes),
      bulbapedia_catalog_compare_name_mismatch: sha256(bulbaBytes),
    },
    package_fingerprint_sha256: packageFingerprint,
    summary: {
      target_rows: rows.length,
      ready_for_guarded_dry_run_parent_child_insert: ready.length,
      blocked_before_guarded_dry_run: rows.length - ready.length,
      expected_parent_inserts: ready.length,
      expected_identity_inserts: ready.length,
      expected_child_inserts: ready.length,
      expected_deletes: 0,
      expected_merges: 0,
      by_status: countBy(rows, (row) => row.readiness_status),
      by_finish: countBy(rows, (row) => row.target_finish_key),
      by_base_selection_authority: countBy(rows, (row) => row.base_selection_authority),
    },
    rows,
    next_boundary: {
      recommended_next_step: ready.length === rows.length
        ? 'Build and execute a rollback-only guarded dry run for the exact eight parent, identity, and child inserts.'
        : 'Resolve the listed readiness blockers before preparing any mutation artifact.',
      allowed_future_scope: ['8 card_print parent inserts', '8 card_print_identity inserts', '8 card_printing child inserts'],
      forbidden_future_scope: ['mapping writes', 'pricing writes', 'ordinary parent mutation', 'deletes', 'merges', 'quarantine', 'migrations'],
    },
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    package_fingerprint_sha256: packageFingerprint,
    summary: report.summary,
    db_writes_performed: false,
    pricing_writes_performed: false,
    mapping_writes_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});

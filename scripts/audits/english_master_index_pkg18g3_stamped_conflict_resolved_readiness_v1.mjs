import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18g2_stamped_conflict_source_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18g3_stamped_conflict_resolved_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18g3_stamped_conflict_resolved_readiness_v1.md');

const PACKAGE_ID = 'PKG-18G3-STAMPED-CONFLICT-RESOLVED-READINESS';
const CREATED_BY = 'english_master_index_pkg18g3_stamped_conflict_resolved_readiness_v1';

const FINISH_SUFFIX = {
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
  cosmos: 'COSMOS',
  cracked_ice: 'CRACKED-ICE',
  rocket_reverse: 'ROCKET-RH',
  poke_ball_reverse: 'POKE-BALL-RH',
  master_ball_reverse: 'MASTER-BALL-RH',
};

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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
  const hash = crypto.createHash('sha256').update(seed).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))));
}

function finishSuffix(finishKey) {
  return FINISH_SUFFIX[finishKey] ?? String(finishKey).toUpperCase().replaceAll('_', '-');
}

function normalizeNumber(value) {
  const raw = String(value ?? '').trim();
  return raw.replace(/^0+(?=\d)/, '') || raw;
}

function canonicalTargetKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    row.variant_key,
    row.adjudicated_finish_key,
  ].join('|').toLowerCase();
}

function buildCandidateRows(adjudication) {
  const unique = new Map();
  for (const row of adjudication.rows ?? []) {
    if (!row.dry_run_candidate_after_package_builder || !row.adjudicated_finish_key) continue;
    const key = canonicalTargetKey(row);
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()].sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
    || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })
    || normalizeText(left.card_name).localeCompare(normalizeText(right.card_name))
    || String(left.variant_key).localeCompare(String(right.variant_key)));
}

async function fetchBaseRows(client, candidates) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         set_key text,
         card_number text,
         card_name text,
         variant_key text,
         finish_key text
       )
     )
     select
       target.set_key,
       target.card_number,
       target.card_name,
       target.variant_key as target_variant_key,
       target.finish_key as target_finish_key,
       base.id::text as base_parent_id,
       base.set_id::text as set_id,
       base.game_id::text as game_id,
       base.set_code,
       base.number,
       base.number_plain,
       base.name,
       base.rarity,
       base.gv_id,
       base.identity_domain,
       base.printed_set_abbrev,
       base.printed_total,
       base.representative_image_url,
       base.image_url,
       s.source as set_source,
       s.code as set_source_code,
       s.printed_total as set_printed_total,
       s.printed_set_abbrev as set_printed_set_abbrev,
       coalesce(jsonb_agg(distinct jsonb_build_object('id', cpr.id::text, 'finish_key', cpr.finish_key, 'printing_gv_id', cpr.printing_gv_id)) filter (where cpr.id is not null), '[]'::jsonb) as base_children,
       coalesce(jsonb_agg(distinct jsonb_build_object('id', candidate_parent.id::text, 'variant_key', candidate_parent.variant_key, 'printed_identity_modifier', candidate_parent.printed_identity_modifier)) filter (where candidate_parent.id is not null), '[]'::jsonb) as existing_target_parents
     from target
     left join public.card_prints base
       on base.set_code = target.set_key
      and lower(regexp_replace(base.name, '[^a-zA-Z0-9]+', '', 'g')) = lower(regexp_replace(target.card_name, '[^a-zA-Z0-9]+', '', 'g'))
      and regexp_replace(coalesce(base.number_plain, base.number), '^0+(?=\\d)', '') = regexp_replace(target.card_number, '^0+(?=\\d)', '')
      and coalesce(base.variant_key, '') = ''
     left join public.sets s on s.id = base.set_id
     left join public.card_printings cpr on cpr.card_print_id = base.id
     left join public.card_prints candidate_parent
       on candidate_parent.set_id = base.set_id
      and lower(regexp_replace(candidate_parent.name, '[^a-zA-Z0-9]+', '', 'g')) = lower(regexp_replace(base.name, '[^a-zA-Z0-9]+', '', 'g'))
      and regexp_replace(coalesce(candidate_parent.number_plain, candidate_parent.number), '^0+(?=\\d)', '') = regexp_replace(coalesce(base.number_plain, base.number), '^0+(?=\\d)', '')
      and coalesce(candidate_parent.variant_key, '') = target.variant_key
     group by target.set_key, target.card_number, target.card_name, target.variant_key, target.finish_key, base.id, s.id
     order by target.set_key, target.card_number, target.card_name`,
    [JSON.stringify(candidates.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.adjudicated_finish_key,
    })))],
  );
  return result.rows;
}

async function classifyRows(client, adjudication, candidates, baseRows) {
  const activeFinishResult = await client.query('select key from public.finish_keys where is_active = true');
  const activeFinishes = new Set(activeFinishResult.rows.map((row) => row.key));

  const rows = [];
  for (const candidate of candidates) {
    const baseMatches = baseRows.filter((row) => row.set_key === candidate.set_key
      && normalizeNumber(row.card_number) === normalizeNumber(candidate.card_number)
      && normalizeText(row.card_name) === normalizeText(candidate.card_name)
      && row.target_variant_key === candidate.variant_key
      && row.target_finish_key === candidate.adjudicated_finish_key);

    const blockers = [];
    if (baseMatches.length !== 1 || !baseMatches[0].base_parent_id) blockers.push(`base_parent_match_count_${baseMatches.length}`);
    const base = baseMatches[0] ?? {};
    const baseChildren = Array.isArray(base.base_children) ? base.base_children : [];
    const hasBaseFinish = baseChildren.some((child) => child.finish_key === candidate.adjudicated_finish_key);
    const existingTargetParents = Array.isArray(base.existing_target_parents) ? base.existing_target_parents : [];
    const exactSourceCount = candidate.exact_sources_supporting_adjudicated_finish ?? candidate.evidence_sources?.filter((source) => source.supports_finish_key === candidate.adjudicated_finish_key).length ?? 0;

    if (!activeFinishes.has(candidate.adjudicated_finish_key)) blockers.push('finish_key_inactive');
    if (!hasBaseFinish) blockers.push('base_parent_missing_target_child_finish');
    if (existingTargetParents.length > 0) blockers.push('target_parent_already_exists');
    if (exactSourceCount < 2) blockers.push('second_independent_source_missing');
    if (!base.gv_id) blockers.push('base_parent_missing_gv_id');

    const targetParentId = uuidFromSeed(`${PACKAGE_ID}:parent:${candidate.set_key}:${normalizeNumber(candidate.card_number)}:${normalizeText(candidate.card_name)}:${candidate.variant_key}`);
    const targetChildId = uuidFromSeed(`${PACKAGE_ID}:child:${candidate.set_key}:${normalizeNumber(candidate.card_number)}:${normalizeText(candidate.card_name)}:${candidate.variant_key}:${candidate.adjudicated_finish_key}`);
    const targetGvId = base.gv_id ? `${base.gv_id}-${String(candidate.variant_key).toUpperCase().replaceAll('_', '-')}` : null;
    const targetPrintingGvId = targetGvId ? `${targetGvId}-${finishSuffix(candidate.adjudicated_finish_key)}` : null;

    let identityProjection = null;
    let identityHashCollisionCount = null;
    if (base.base_parent_id && base.set_source) {
      const projectionResult = await client.query(
        `with projected as (
           select public.card_print_identity_backfill_projection_v1(
             $1::jsonb, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text, $8::int, $9::text
           ) as projected
         )
         select
           projected,
           (select count(*)::int
            from public.card_print_identity cpi
            where cpi.is_active = true
              and cpi.card_print_id <> $10::uuid
              and cpi.identity_domain = projected->>'identity_domain'
              and cpi.identity_key_version = projected->>'identity_key_version'
              and cpi.identity_key_hash = projected->>'identity_key_hash') as identity_hash_collision_count
         from projected`,
        [
          JSON.stringify(base.set_source ?? {}),
          base.set_code,
          base.set_source_code,
          base.number,
          base.number_plain,
          base.name,
          candidate.variant_key,
          base.printed_total ?? base.set_printed_total,
          base.printed_set_abbrev ?? base.set_printed_set_abbrev,
          targetParentId,
        ],
      );
      identityProjection = projectionResult.rows[0]?.projected ?? null;
      identityHashCollisionCount = projectionResult.rows[0]?.identity_hash_collision_count ?? null;
      if (!identityProjection || identityProjection.status !== 'ready') blockers.push('identity_projection_not_ready');
      if (identityHashCollisionCount !== 0) blockers.push('identity_hash_collision');
    } else {
      blockers.push('identity_projection_unavailable');
    }

    rows.push({
      set_key: candidate.set_key,
      set_name: candidate.set_name,
      card_number: candidate.card_number,
      card_name: candidate.card_name,
      variant_key: candidate.variant_key,
      stamp_label: candidate.stamp_label,
      target_finish_key: candidate.adjudicated_finish_key,
      previous_candidate_finish_key: candidate.current_finish_key,
      base_parent_id: base.base_parent_id ?? null,
      target_parent_id: targetParentId,
      target_child_id: targetChildId,
      target_variant_key: candidate.variant_key,
      target_printed_identity_modifier: candidate.variant_key,
      target_gv_id: targetGvId,
      target_printing_gv_id: targetPrintingGvId,
      base_children: baseChildren,
      existing_target_parents: existingTargetParents,
      identity_projection: identityProjection,
      identity_hash_collision_count: identityHashCollisionCount,
      exact_sources_supporting_adjudicated_finish: exactSourceCount,
      evidence_sources: candidate.evidence_sources,
      readiness_status: blockers.length ? 'blocked' : 'future_guarded_parent_child_identity_insert_candidate',
      blockers,
      write_ready_now: 0,
      dry_run_execution_authorized: false,
    });
  }

  return rows;
}

function packageFingerprint(adjudication, rows) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint_sha256: adjudication.fingerprint_sha256,
    targets: rows.map((row) => ({
      set_key: row.set_key,
      card_number: normalizeNumber(row.card_number),
      card_name: normalizeText(row.card_name),
      variant_key: row.variant_key,
      finish_key: row.target_finish_key,
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      target_gv_id: row.target_gv_id,
      target_printing_gv_id: row.target_printing_gv_id,
    })),
  }));
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# PKG-18G3 Stamped Conflict Resolved Readiness V1');
  lines.push('');
  lines.push('Read-only readiness packet for conflict rows that now have exact adjudicated finish evidence.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- audit_only: true');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- apply_performed: false');
  lines.push('- cleanup_performed: false');
  lines.push('- dry_run_execution_performed: false');
  lines.push('- write_ready_now: 0');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(markdownTable(['metric', 'value'], [
    ['candidate_identities', report.summary.candidate_identities],
    ['future_guarded_candidates', report.summary.future_guarded_candidates],
    ['blocked_rows', report.summary.blocked_rows],
    ['target_parent_inserts', report.summary.target_parent_inserts],
    ['target_child_inserts', report.summary.target_child_inserts],
    ['target_identity_inserts', report.summary.target_identity_inserts],
    ['write_ready_now', report.summary.write_ready_now],
    ['package_fingerprint_sha256', `\`${report.package_fingerprint_sha256}\``],
  ]));
  lines.push('');
  lines.push('## Candidate Rows');
  lines.push('');
  lines.push(markdownTable(
    ['set_key', 'card_number', 'card_name', 'variant_key', 'target_finish_key', 'readiness_status', 'blockers'],
    report.rows.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.target_finish_key,
      row.readiness_status,
      row.blockers.join(', ') || 'none',
    ]),
  ));
  lines.push('');
  lines.push('## Guardrail');
  lines.push('');
  lines.push('This is not a dry-run execution and does not authorize real apply. The next step, if desired, is a separate rollback-only guarded dry-run transaction using this package fingerprint.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');

  const adjudication = await readJson(INPUT_JSON);
  const candidates = buildCandidateRows(adjudication);

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('begin read only');
    const baseRows = await fetchBaseRows(client, candidates);
    const rows = await classifyRows(client, adjudication, candidates, baseRows);
    await client.query('rollback');

    const futureRows = rows.filter((row) => row.readiness_status === 'future_guarded_parent_child_identity_insert_candidate');
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg18g3_stamped_conflict_resolved_readiness_v1',
      package_id: PACKAGE_ID,
      audit_only: true,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_performed: false,
      dry_run_execution_performed: false,
      write_ready_now: 0,
      source_artifacts: {
        conflict_adjudication: rel(INPUT_JSON),
      },
      source_fingerprint_sha256: adjudication.fingerprint_sha256,
      package_fingerprint_sha256: packageFingerprint(adjudication, rows),
      summary: {
        candidate_identities: rows.length,
        future_guarded_candidates: futureRows.length,
        blocked_rows: rows.length - futureRows.length,
        target_parent_inserts: futureRows.length,
        target_child_inserts: futureRows.length,
        target_identity_inserts: futureRows.length,
        write_ready_now: 0,
        by_status: countBy(rows, (row) => row.readiness_status),
        by_finish: countBy(rows, (row) => row.target_finish_key),
        by_variant_key: countBy(rows, (row) => row.variant_key),
      },
      approval_boundary: {
        next_allowed_step: 'rollback_only_guarded_dry_run_transaction_artifact_preparation',
        real_apply_authorized: false,
        migrations_authorized: false,
        cleanup_authorized: false,
      },
      rows,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));
    console.log(JSON.stringify({
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      summary: report.summary,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

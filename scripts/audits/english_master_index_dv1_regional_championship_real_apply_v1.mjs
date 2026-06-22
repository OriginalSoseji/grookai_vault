import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_regional_championship_active_finish_adjudication_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_regional_championship_real_apply_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_regional_championship_real_apply_v1.md',
);

const PACKAGE_ID = 'DV1-REGIONAL-CHAMPIONSHIP-STAMP-PARENT-INSERTS';
const EXPECTED_FINGERPRINT = 'a180ffd8639a2bbd6dddf99b7b93bff28f7a58ac514e7f25971a83d9aaf0b8d9';
const EXPECTED_DRY_RUN_PROOF = '528940cd7593173f30eeea82bc443061e8a9780c9d413a3dde9b90d7566802a9';
const DRY_RUN_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_regional_championship_guarded_dry_run_v1.json',
);
const CREATED_BY = 'english_master_index_dv1_regional_championship_real_apply_v1';

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
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function packageFingerprint(input, targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    input_fingerprint_sha256: input.fingerprint_sha256,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name.toLowerCase(),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
    })),
  }));
}

async function buildTargets(client, adjudication) {
  const candidateRows = (adjudication.rows ?? []).filter((row) => row.dry_run_candidate);
  if (candidateRows.length !== 3) {
    throw new Error(`Expected 3 Regional Championships dry-run candidates, got ${candidateRows.length}`);
  }

  const result = await client.query(
    `select
       spec.*,
       cp.id as base_parent_id,
       cp.game_id,
       cp.set_id,
       cp.rarity,
       cp.number_plain,
       cp.printed_total,
       cp.printed_set_abbrev,
       cp.identity_domain,
       cp.set_identity_model,
       cp.representative_image_url,
       cp.image_url,
       cp.image_res,
       cp.variants,
       cp.data_quality_flags,
       exists (
         select 1 from public.card_printings cpr
         where cpr.card_print_id = cp.id and cpr.finish_key = spec.target_finish_key
       ) as base_target_child_exists
     from jsonb_to_recordset($1::jsonb) as spec(
       set_key text,
       set_name text,
       card_number text,
       card_name text,
       governed_variant_key text,
       governed_printed_identity_modifier text,
       governed_stamp_label text,
       target_finish_key text,
       crosshatch_treatment text,
       evidence jsonb
     )
     left join public.card_prints cp
       on cp.set_code = spec.set_key
      and coalesce(cp.number_plain, cp.number) = regexp_replace(spec.card_number, '^0+(?=\\d)', '')
      and lower(cp.name) = lower(spec.card_name)
      and coalesce(cp.variant_key, '') = ''`,
    [JSON.stringify(candidateRows.map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      governed_variant_key: row.governed_variant_key,
      governed_printed_identity_modifier: row.governed_printed_identity_modifier,
      governed_stamp_label: row.governed_stamp_label,
      target_finish_key: row.target_child_finish_key,
      crosshatch_treatment: row.crosshatch_treatment,
      evidence: row.evidence,
    })))],
  );

  return result.rows.map((row) => ({
    target_parent_id: uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.governed_variant_key}`),
    target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${normalizeText(row.card_name)}:${row.governed_variant_key}:${row.target_finish_key}`),
    base_parent_id: row.base_parent_id,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    target_finish_key: row.target_finish_key,
    target_variant_key: row.governed_variant_key,
    target_printed_identity_modifier: row.governed_printed_identity_modifier,
    stamp_label: row.governed_stamp_label,
    crosshatch_treatment: row.crosshatch_treatment,
    base_target_child_exists: row.base_target_child_exists,
    evidence: {
      package_id: PACKAGE_ID,
      evidence_rule: 'regional_championship_identity_plus_holo_active_finish_adjudication',
      governing_contract: 'REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1',
      active_finish_adjudication: 'english_master_index_regional_championship_active_finish_adjudication_v1',
      source_urls: [
        ...((row.evidence?.identity_sources ?? []).map((source) => source.source_url)),
        ...((row.evidence?.finish_sources ?? []).map((source) => source.source_url)),
        ...((row.evidence?.set_level_finish_sources ?? []).map((source) => source.source_url)),
      ],
      identity_sources: row.evidence?.identity_sources ?? [],
      finish_sources: row.evidence?.finish_sources ?? [],
      set_level_finish_sources: row.evidence?.set_level_finish_sources ?? [],
      alternate_source_labels: row.evidence?.alternate_source_labels ?? [],
      stamp_label: row.governed_stamp_label,
      variant_key: row.governed_variant_key,
      active_child_finish_key: row.target_finish_key,
      crosshatch_treatment: row.crosshatch_treatment,
    },
  })).sort((left, right) => Number(left.card_number) - Number(right.card_number));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_parent_id uuid, target_child_id uuid, base_parent_id uuid)
     )
     select
       'base_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text as finish_key,
       null::text as identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select
       'target_parent',
       cp.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text,
       null::text
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select
       'target_child',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cpr.finish_key,
       null::text
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'target_identity',
       cpi.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       null::text,
       cpi.identity_key_hash
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.target_parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, variant_key nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: countBy(result.rows, (row) => row.row_type),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

function guardFailuresFrom(row, expectedCount) {
  const expectations = {
    target_count: expectedCount,
    target_parent_count: expectedCount,
    target_child_count: expectedCount,
    missing_base_count: 0,
    inactive_finish_count: 0,
    missing_base_finish_count: 0,
    parent_collision_count: 0,
    child_collision_count: 0,
    identity_target_collision_count: 0,
    ready_identity_projection_count: expectedCount,
    identity_hash_collision_count: 0,
  };
  return Object.entries(expectations)
    .filter(([key, expected]) => row[key] !== expected)
    .map(([key, expected]) => `${key}:${row[key]}!=${expected}`);
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let proof = null;

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table dv1_regional_championship_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         target_printed_identity_modifier text not null,
         stamp_label text not null,
         crosshatch_treatment text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into dv1_regional_championship_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         target_printed_identity_modifier text,
         stamp_label text,
         crosshatch_treatment text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await client.query(
      `with projection as (
         select
           target.target_parent_id,
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
         from dv1_regional_championship_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from dv1_regional_championship_targets) as target_count,
         (select count(distinct target_parent_id)::int from dv1_regional_championship_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from dv1_regional_championship_targets) as target_child_count,
         (select count(*)::int from dv1_regional_championship_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from dv1_regional_championship_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from dv1_regional_championship_targets target
          join public.card_prints base on base.id = target.base_parent_id
          left join public.card_printings base_child on base_child.card_print_id = base.id and base_child.finish_key = target.target_finish_key
          where base_child.id is null) as missing_base_finish_count,
         (select count(*)::int
          from dv1_regional_championship_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from dv1_regional_championship_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count,
         (select count(*)::int from dv1_regional_championship_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as identity_target_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int
          from projection p
          join public.card_print_identity cpi
            on cpi.is_active = true
           and cpi.card_print_id <> p.target_parent_id
           and cpi.identity_domain = p.projected->>'identity_domain'
           and cpi.identity_key_version = p.projected->>'identity_key_version'
           and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    const guardFailures = guardFailuresFrom(guardRow, targets.length);
    if (guardFailures.length) throw new Error(`guard failed: ${guardFailures.join(', ')}`);

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id, external_ids,
         updated_at, set_code, artist, regulation_mark, image_alt_url, image_source, variants, created_at,
         last_synced_at, print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total, gv_id,
         image_path, identity_domain, printed_identity_modifier, set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.target_variant_key, base.rarity, null, null,
         jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code,
         base.artist, base.regulation_mark, null, null, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key,
           'explicit_child_finish_key', target.target_finish_key,
           'crosshatch_treatment', target.crosshatch_treatment
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-', upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, base.identity_domain, target.target_printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Regional Championships stamped canonical identity: ', target.stamp_label, '. Crosshatch preserved as evidence/display metadata; representative base image only until exact stamped image is available.')
       from dv1_regional_championship_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID],
    );

    const identityInsert = await client.query(
      `with projection as (
         select
           target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             cp.set_code,
             s.code,
             cp.number,
             cp.number_plain,
             cp.name,
             cp.variant_key,
             coalesce(cp.printed_total, s.printed_total),
             coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from dv1_regional_championship_targets target
         join public.card_prints cp on cp.id = target.target_parent_id
         left join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select
         target_parent_id,
         projected->>'identity_domain',
         projected->>'set_code_identity',
         projected->>'printed_number',
         projected->>'normalized_printed_name',
         nullif(projected->>'source_name_raw', ''),
         coalesce(projected->'identity_payload', '{}'::jsonb),
         projected->>'identity_key_version',
         projected->>'identity_key_hash'
       from projection
       where projected->>'status' = 'ready'`,
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target.target_child_id,
         target.target_parent_id,
         target.target_finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         concat(target.set_key, ':', target.card_number, ':regional_championship:', target.target_variant_key, ':', target.target_finish_key),
         $1::text,
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Regional Championships stamped child finish routed to active finish ', target.target_finish_key, '; crosshatch is evidence/display metadata.')
       from dv1_regional_championship_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== targets.length || identityInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
      })}`);
    }

    proof = {
      guard: guardRow,
      inserted_parent_rows: parentInsert.rowCount,
      inserted_identity_rows: identityInsert.rowCount,
      inserted_child_rows: childInsert.rowCount,
    };
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    proof,
    apply_proof_sha256: sha256(stableJson({
      before_hash: beforeSnapshot.hash_sha256,
      after_hash: afterSnapshot.hash_sha256,
      inserted_counts: {
        parent: proof?.inserted_parent_rows ?? null,
        identity: proof?.inserted_identity_rows ?? null,
        child: proof?.inserted_child_rows ?? null,
      },
      after_counts: afterSnapshot.counts,
      guard: proof?.guard ?? null,
    })),
  };
}

function buildMarkdown(report) {
  return `# DV1 Regional Championship Real Apply V1

Approved real apply for Dragon Vault Regional Championships stamped parent identities.

## Summary

${markdownTable(['metric', 'value'], [
    ['package_id', `\`${report.package_id}\``],
    ['package_fingerprint_sha256', `\`${report.package_fingerprint_sha256}\``],
    ['apply_status', report.apply_status],
    ['target_rows', report.summary.target_rows],
    ['inserted_parent_rows', report.summary.inserted_parent_rows],
    ['inserted_identity_rows', report.summary.inserted_identity_rows],
    ['inserted_child_rows', report.summary.inserted_child_rows],
    ['dry_run_proof_sha256', `\`${report.dry_run_proof_sha256}\``],
    ['apply_proof_sha256', `\`${report.apply.apply_proof_sha256}\``],
    ['db_writes_performed', report.db_writes_performed],
    ['migrations_created', report.migrations_created],
    ['deletes_performed', report.deletes_performed],
    ['merges_performed', report.merges_performed],
  ])}

## Scope

${markdownTable(
    ['set', 'number', 'card', 'stamp', 'variant', 'finish', 'target parent', 'target child'],
    report.targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.target_variant_key,
      row.target_finish_key,
      row.target_parent_id,
      row.target_child_id,
    ]),
  )}

## Required Approval For Real Apply

\`\`\`text
Approve real ${report.package_id} apply only. Fingerprint: ${report.package_fingerprint_sha256}. Scope: 3 Regional Championships stamped parent inserts, 3 active identity inserts, 3 holo child printing inserts for Dragon Vault Bagon #6, Shelgon #7, and Salamence #8. Dry-run proof: ${report.dry_run_proof_sha256} == ${report.dry_run_proof_sha256}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
\`\`\`

## Safety

- Exact approval was required.
- Package fingerprint matched.
- Dry-run proof matched.
- No migrations.
- No deletes.
- No merges.
- No unsupported cleanup.
- Crosshatch is evidence/display metadata, not a canonical finish key.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL.');

  const adjudication = await readJson(INPUT_JSON);
  const dryRunReport = await readJson(DRY_RUN_JSON);
  if (dryRunReport.package_id !== PACKAGE_ID) throw new Error(`dry-run package mismatch: ${dryRunReport.package_id}`);
  if (dryRunReport.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) {
    throw new Error(`dry-run fingerprint mismatch: ${dryRunReport.package_fingerprint_sha256}`);
  }
  if (dryRunReport.dry_run?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) {
    throw new Error(`dry-run proof mismatch: ${dryRunReport.dry_run?.dry_run_proof_sha256}`);
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const targets = await buildTargets(client, adjudication);
    const fingerprint = packageFingerprint(adjudication, targets);
    if (fingerprint !== EXPECTED_FINGERPRINT) throw new Error(`computed fingerprint mismatch: ${fingerprint}`);
    const apply = await applyPackage(client, targets);

    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_dv1_regional_championship_real_apply_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: fingerprint,
      dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
      source_adjudication: rel(INPUT_JSON),
      source_adjudication_fingerprint_sha256: adjudication.fingerprint_sha256,
      source_dry_run: rel(DRY_RUN_JSON),
      apply_status: 'committed',
      committed: true,
      audit_only: false,
      db_writes_performed: true,
      durable_db_writes_performed: true,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      deletes_performed: false,
      merges_performed: false,
      summary: {
        target_rows: targets.length,
        inserted_parent_rows: apply.proof.inserted_parent_rows,
        inserted_identity_rows: apply.proof.inserted_identity_rows,
        inserted_child_rows: apply.proof.inserted_child_rows,
        target_finish_counts: countBy(targets, (row) => row.target_finish_key),
        target_variant_counts: countBy(targets, (row) => row.target_variant_key),
      },
      targets,
      apply,
      stop_findings: [],
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));

    console.log(JSON.stringify({
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      package_id: report.package_id,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      apply_status: report.apply_status,
      dry_run_proof_sha256: report.dry_run_proof_sha256,
      apply_proof_sha256: report.apply.apply_proof_sha256,
      inserted_rows: {
        parents: report.summary.inserted_parent_rows,
        identities: report.summary.inserted_identity_rows,
        children: report.summary.inserted_child_rows,
      },
      db_writes_performed: true,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

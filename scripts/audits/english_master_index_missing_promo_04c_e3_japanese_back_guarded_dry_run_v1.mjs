import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'remaining_special_gap_source_acquisition_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'e3_japanese_back_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'e3_japanese_back_guarded_dry_run_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04C-E3-JAPANESE-BACK-PARENT-CHILD-INSERTS';
const CREATED_BY = 'english_master_index_missing_promo_04c_e3_japanese_back_guarded_dry_run_v1';

const TARGETS = [
  {
    candidate_key: 'expedition_hoppip_japanese_back',
    set_code: 'ecard1',
    set_name: 'Expedition',
    card_number: '112',
    card_name: 'Hoppip',
    variant_key: 'japanese_card_back',
    printed_identity_modifier: 'japanese_card_back',
    finish_key: 'normal',
    gv_id_suffix: 'JAPANESE-BACK',
  },
  {
    candidate_key: 'expedition_pichu_japanese_back',
    corrected_from: 'ecard1 Pichu #22 holo candidate',
    correction_reason: 'Source-backed E3 Japanese-back Pichu evidence points to #58 non-holo, not #22 holo.',
    set_code: 'ecard1',
    set_name: 'Expedition',
    card_number: '58',
    card_name: 'Pichu',
    variant_key: 'japanese_card_back',
    printed_identity_modifier: 'japanese_card_back',
    finish_key: 'normal',
    gv_id_suffix: 'JAPANESE-BACK',
  },
];

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
  const hash = crypto.createHash('sha256').update(seed).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function targetParentId(target) {
  return uuidFromSeed(`${PACKAGE_ID}:parent:${target.set_code}:${target.card_number}:${target.card_name}:${target.variant_key}`);
}

function targetChildId(target) {
  return uuidFromSeed(`${PACKAGE_ID}:child:${target.set_code}:${target.card_number}:${target.card_name}:${target.variant_key}:${target.finish_key}`);
}

function sourceFindingFor(sourceReport, target) {
  const finding = sourceReport.source_findings.find((row) => row.key === target.candidate_key);
  if (!finding) throw new Error(`Missing source finding for ${target.candidate_key}`);
  return finding;
}

function evidencePayload(target, finding) {
  return {
    source_package_id: PACKAGE_ID,
    source_candidate_key: target.candidate_key,
    classification: 'e3_japanese_back_special_print',
    variant_key: target.variant_key,
    printed_identity_modifier: target.printed_identity_modifier,
    finish_key: target.finish_key,
    correction_reason: target.correction_reason ?? null,
    evidence_urls: finding.evidence.map((row) => row.source_url),
    evidence_labels: finding.evidence.map((row) => row.evidence_label),
    preserved_evidence_sources: finding.evidence.map((row) => row.source_key),
    evidence: finding.evidence,
  };
}

function packageFingerprint(targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    targets: targets.map((target) => ({
      candidate_key: target.candidate_key,
      set_code: target.set_code,
      card_number: target.card_number,
      card_name: target.card_name,
      variant_key: target.variant_key,
      printed_identity_modifier: target.printed_identity_modifier,
      finish_key: target.finish_key,
      target_parent_id: target.target_parent_id,
      target_child_id: target.target_child_id,
      base_parent_id: target.base_parent_id,
      base_parent_gv_id: target.base_parent_gv_id,
      evidence_urls: target.evidence_urls,
    })),
  }));
}

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: [
      'insert two public.card_prints parents cloned from ecard1 base parents with japanese_card_back identity modifier',
      'insert two public.card_print_identity active identities from projection',
      'insert two public.card_printings normal child printings',
    ],
    forbidden: ['stale pichu 22 holo insert', 'parent overwrites', 'external mapping writes', 'pricing writes', 'image writes', 'deletes', 'merges', 'migrations', 'global apply'],
  }));
}

async function attachBaseParents(client, sourceReport) {
  const sourceFindings = Object.fromEntries(TARGETS.map((target) => [target.candidate_key, sourceFindingFor(sourceReport, target)]));
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(set_code text, card_number text, card_name text)
     )
     select
       target.set_code,
       target.card_number,
       target.card_name,
       cp.id::text as base_parent_id,
       cp.gv_id as base_parent_gv_id,
       array_agg(cpr.finish_key order by cpr.finish_key) filter (where cpr.id is not null) as base_child_finishes
     from target
     left join public.card_prints cp
       on cp.identity_domain = 'pokemon_eng_standard'
      and cp.set_code = target.set_code
      and cp.number = target.card_number
      and lower(cp.name) = lower(target.card_name)
      and coalesce(cp.variant_key, '') = ''
      and cp.printed_identity_modifier is null
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     group by target.set_code, target.card_number, target.card_name, cp.id, cp.gv_id`,
    [JSON.stringify(TARGETS.map((target) => ({ set_code: target.set_code, card_number: target.card_number, card_name: target.card_name })))],
  );

  const baseByKey = new Map(result.rows.map((row) => [`${row.set_code}:${row.card_number}:${row.card_name.toLowerCase()}`, row]));
  return TARGETS.map((target) => {
    const base = baseByKey.get(`${target.set_code}:${target.card_number}:${target.card_name.toLowerCase()}`);
    if (!base?.base_parent_id) throw new Error(`missing base parent for ${target.set_code} ${target.card_name} ${target.card_number}`);
    const finding = sourceFindings[target.candidate_key];
    return {
      ...target,
      target_parent_id: targetParentId(target),
      target_child_id: targetChildId(target),
      target_parent_gv_id: `${base.base_parent_gv_id}-${target.gv_id_suffix}`,
      target_printing_gv_id: `${base.base_parent_gv_id}-${target.gv_id_suffix}-STD`,
      base_parent_id: base.base_parent_id,
      base_parent_gv_id: base.base_parent_gv_id,
      base_child_finishes: base.base_child_finishes ?? [],
      evidence_payload: evidencePayload(target, finding),
      evidence_urls: finding.evidence.map((row) => row.source_url),
      evidence: finding.evidence,
    };
  });
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(base_parent_id uuid, target_parent_id uuid, target_child_id uuid)
     )
     select 'base_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from target t join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select 'target_parent', cp.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, null::text
     from target t join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from target t join public.card_printings cpr on cpr.id = t.target_child_id join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.number_plain, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from target t join public.card_print_identity cpi on cpi.card_print_id = t.target_parent_id and cpi.is_active = true join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code, number_plain nulls last, number, name, row_id`,
    [JSON.stringify(targets.map((target) => ({
      base_parent_id: target.base_parent_id,
      target_parent_id: target.target_parent_id,
      target_child_id: target.target_child_id,
    })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: Object.fromEntries(Object.entries(result.rows.reduce((acc, row) => {
      acc[row.row_type] = (acc[row.row_type] ?? 0) + 1;
      return acc;
    }, {})).sort()),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function runDryRun(client, targets, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table e3_japanese_back_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_code text not null,
         card_number text not null,
         card_name text not null,
         variant_key text not null,
         printed_identity_modifier text not null,
         finish_key text not null,
         target_parent_gv_id text not null,
         target_printing_gv_id text not null,
         evidence_payload jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into e3_japanese_back_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_code text,
         card_number text,
         card_name text,
         variant_key text,
         printed_identity_modifier text,
         finish_key text,
         target_parent_gv_id text,
         target_printing_gv_id text,
         evidence_payload jsonb
       )`,
      [JSON.stringify(targets.map((target) => ({
        target_parent_id: target.target_parent_id,
        target_child_id: target.target_child_id,
        base_parent_id: target.base_parent_id,
        set_code: target.set_code,
        card_number: target.card_number,
        card_name: target.card_name,
        variant_key: target.variant_key,
        printed_identity_modifier: target.printed_identity_modifier,
        finish_key: target.finish_key,
        target_parent_gv_id: target.target_parent_gv_id,
        target_printing_gv_id: target.target_printing_gv_id,
        evidence_payload: target.evidence_payload,
      })))],
    );

    const guard = await client.query(
      `with projection as (
         select target.target_parent_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
             target.variant_key, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from e3_japanese_back_targets target
         join public.card_prints base on base.id = target.base_parent_id
         left join public.sets s on s.id = base.set_id
       )
       select
         (select count(*)::int from e3_japanese_back_targets) as target_count,
         (select count(distinct target_parent_id)::int from e3_japanese_back_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from e3_japanese_back_targets) as target_child_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints base on base.id = target.base_parent_id) as base_parent_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_printings cpr on cpr.card_print_id = base.id and cpr.finish_key = target.finish_key) as base_finish_count,
         (select count(*)::int from e3_japanese_back_targets target join public.finish_keys fk on fk.key = target.finish_key and fk.is_active = true) as active_finish_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints cp on cp.id = target.target_parent_id) as target_parent_collision_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as target_child_collision_count,
         (select count(*)::int from e3_japanese_back_targets target join public.card_prints base on base.id = target.base_parent_id join public.card_prints cp on cp.set_id = base.set_id and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number) and lower(cp.name) = lower(base.name) and (coalesce(cp.variant_key, '') = target.variant_key or coalesce(cp.printed_identity_modifier, '') = target.printed_identity_modifier)) as same_identity_parent_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi on cpi.is_active = true and cpi.card_print_id <> p.target_parent_id and cpi.identity_domain = p.projected->>'identity_domain' and cpi.identity_key_version = p.projected->>'identity_key_version' and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
    );
    const guardRow = guard.rows[0];
    const expected = targets.length;
    if (
      guardRow.target_count !== expected
      || guardRow.target_parent_count !== expected
      || guardRow.target_child_count !== expected
      || guardRow.base_parent_count !== expected
      || guardRow.base_finish_count !== expected
      || guardRow.active_finish_count !== expected
      || guardRow.target_parent_collision_count !== 0
      || guardRow.target_child_collision_count !== 0
      || guardRow.same_identity_parent_collision_count !== 0
      || guardRow.ready_identity_projection_count !== expected
      || guardRow.identity_hash_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url,
         tcgplayer_id, external_ids, updated_at, set_code, artist, regulation_mark,
         image_alt_url, image_source, variants, created_at, last_synced_at,
         print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total,
         gv_id, image_path, identity_domain, printed_identity_modifier,
         set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.variant_key, base.rarity, null,
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', target.evidence_payload),
         now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'base_parent_id', base.id::text,
           'variant_key', target.variant_key,
           'printed_identity_modifier', target.printed_identity_modifier,
           'explicit_child_finish_key', target.finish_key
         ),
         null, base.data_quality_flags, 'representative_shared',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         target.target_parent_gv_id,
         null, base.identity_domain, target.printed_identity_modifier, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         'Source-backed E3 Japanese-back special print. Representative base image only until exact variant image is available.'
       from e3_japanese_back_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID],
    );

    const identityInsert = await client.query(
      `with projection as (
         select cp.id as card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from e3_japanese_back_targets target
         join public.card_prints cp on cp.id = target.target_parent_id
         left join public.sets s on s.id = cp.set_id
       )
       insert into public.card_print_identity (
         card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash
       )
       select
         card_print_id,
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
         target.target_child_id, target.target_parent_id, target.finish_key, now(), false,
         'verified_master_set_index_v1',
         concat(target.set_code, ':', target.card_number, ':', target.variant_key, ':', target.finish_key),
         $1::text,
         target.target_printing_gv_id,
         null, null, null, null, 'representative_shared',
         'Source-backed E3 Japanese-back special print child. Representative image only until exact variant image is available.'
       from e3_japanese_back_targets target`,
      [CREATED_BY],
    );

    if (parentInsert.rowCount !== expected || identityInsert.rowCount !== expected || childInsert.rowCount !== expected) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from e3_japanese_back_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join e3_japanese_back_targets target on target.target_parent_id = cp.id and cp.variant_key = target.variant_key and cp.printed_identity_modifier = target.printed_identity_modifier) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity cpi join e3_japanese_back_targets target on target.target_parent_id = cpi.card_print_id and cpi.is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings cpr join e3_japanese_back_targets target on target.target_child_id = cpr.id and cpr.finish_key = target.finish_key) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join e3_japanese_back_targets target on target.target_child_id = cpr.id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows,
         (select count(*)::int from e3_japanese_back_targets where card_name = 'Pichu' and card_number = '22') as stale_pichu_22_rows`,
      [PACKAGE_ID, fingerprint],
    );

    const inTransactionSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);

    return {
      dry_run_status: 'e3_japanese_back_parent_child_insert_completed_rolled_back_no_durable_change',
      guard: guardRow,
      proof: proof.rows[0],
      simulated_write_counts: {
        parent_inserts: parentInsert.rowCount,
        identity_inserts: identityInsert.rowCount,
        child_inserts: childInsert.rowCount,
        deletes: 0,
        merges: 0,
        external_mapping_writes: 0,
        pricing_writes: 0,
        image_writes: 0,
      },
      before_snapshot: beforeSnapshot,
      in_transaction_snapshot: inTransactionSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        package_fingerprint: fingerprint,
        guard: guardRow,
        proof: proof.rows[0],
        before_hash: beforeSnapshot.hash_sha256,
        after_hash: afterSnapshot.hash_sha256,
      })),
      stop_findings: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256 ? [] : ['rollback_snapshot_mismatch'],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'e3_japanese_back_parent_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: null,
      simulated_write_counts: {
        parent_inserts: 0,
        identity_inserts: 0,
        child_inserts: 0,
        deletes: 0,
        merges: 0,
        external_mapping_writes: 0,
        pricing_writes: 0,
        image_writes: 0,
      },
      stop_findings: [`dry_run_error:${error.message}`],
    };
  }
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function renderMarkdown(report) {
  return `# E3 Japanese-Back Guarded Dry Run V1

Rollback-only dry-run for source-backed Expedition E3 Japanese-back special prints.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- transaction_writes_rolled_back: ${report.transaction_writes_rolled_back}
- migrations_created: ${report.migrations_created}
- deletes_performed: ${report.deletes_performed}
- merges_performed: ${report.merges_performed}
- rollback_verified: ${report.execution.rollback_verified}

## Targets

${markdownTable(['set', 'number', 'name', 'variant', 'finish', 'base_parent', 'base_finishes'], report.targets.map((target) => [
    target.set_code,
    target.card_number,
    target.card_name,
    target.variant_key,
    target.finish_key,
    target.base_parent_id,
    target.base_child_finishes.join(', '),
  ]))}

## Correction

- Pichu Japanese-back is modeled as Expedition \`#58 normal\`.
- The stale \`#22 holo\` candidate is not inserted.

## Result

- dry_run_status: ${report.execution.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- sql_hash_sha256: \`${report.sql_hash_sha256}\`
- dry_run_proof_sha256: \`${report.execution.dry_run_proof_sha256}\`
- stop_findings: ${report.execution.stop_findings.length}

## Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

async function main() {
  const sourceReport = await readJson(SOURCE_JSON);
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  let targets;
  let execution;
  let fingerprint;
  try {
    targets = await attachBaseParents(client, sourceReport);
    fingerprint = packageFingerprint(targets);
    execution = await runDryRun(client, targets, fingerprint);
  } finally {
    await client.end().catch(() => {});
  }

  const sqlHashSha256 = sqlHash();
  const pass = execution.dry_run_status === 'e3_japanese_back_parent_child_insert_completed_rolled_back_no_durable_change'
    && execution.rollback_verified
    && execution.stop_findings.length === 0
    && execution.proof?.stale_pichu_22_rows === 0;
  const dryRunProof = `${execution.before_snapshot?.hash_sha256 ?? 'missing'} == ${execution.after_rollback_snapshot?.hash_sha256 ?? 'missing'}`;
  const recommended = pass
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. SQL hash: ${sqlHashSha256}. Scope: 2 E3 Japanese-back parent inserts, 2 active identity inserts, 2 normal child printing inserts for ecard1/Expedition Hoppip #112 and corrected Pichu #58; variant_key=japanese_card_back; printed_identity_modifier=japanese_card_back; stale Pichu #22 holo candidate excluded. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No external mapping writes. No pricing writes. No image writes.`
    : 'No real apply approval recommended; dry-run did not pass.';

  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    mode: 'guarded_rollback_dry_run_only',
    source_report: rel(SOURCE_JSON),
    package_fingerprint_sha256: fingerprint,
    sql_hash_sha256: sqlHashSha256,
    pass,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    transaction_writes_rolled_back: pass,
    migrations_created: false,
    deletes_performed: false,
    merges_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    external_mapping_writes_performed: false,
    pricing_writes_performed: false,
    image_writes_performed: false,
    scope: {
      target_rows: targets.length,
      by_set: countBy(targets, (target) => target.set_code),
      by_finish: countBy(targets, (target) => target.finish_key),
      by_variant: countBy(targets, (target) => target.variant_key),
    },
    targets,
    execution,
    recommended_real_apply_approval_text: recommended,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    package_fingerprint_sha256: fingerprint,
    sql_hash_sha256: sqlHashSha256,
    pass,
    dry_run_status: execution.dry_run_status,
    dry_run_proof: dryRunProof,
    stop_findings: execution.stop_findings,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});

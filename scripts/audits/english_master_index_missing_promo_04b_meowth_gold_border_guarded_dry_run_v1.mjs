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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'meowth_gold_border_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'meowth_gold_border_guarded_dry_run_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-04B-MEOWTH-GOLD-BORDER-PARENT-CHILD-INSERT';
const CREATED_BY = 'english_master_index_missing_promo_04b_meowth_gold_border_guarded_dry_run_v1';

const TARGET = {
  candidate_key: 'jungle_meowth_gold_border',
  set_code: 'base2',
  set_name: 'Jungle',
  card_number: '56',
  card_name: 'Meowth',
  variant_key: 'gold_border',
  printed_identity_modifier: 'gold_border',
  finish_key: 'normal',
  gv_id_suffix: 'GOLD-BORDER',
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

function targetParentId() {
  return uuidFromSeed(`${PACKAGE_ID}:parent:${TARGET.set_code}:${TARGET.card_number}:${TARGET.card_name}:${TARGET.variant_key}`);
}

function targetChildId() {
  return uuidFromSeed(`${PACKAGE_ID}:child:${TARGET.set_code}:${TARGET.card_number}:${TARGET.card_name}:${TARGET.variant_key}:${TARGET.finish_key}`);
}

function packageFingerprint(sourceFinding, baseParent) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    target: TARGET,
    target_parent_id: targetParentId(),
    target_child_id: targetChildId(),
    base_parent_id: baseParent.id,
    base_parent_gv_id: baseParent.gv_id,
    source_evidence: sourceFinding.evidence,
  }));
}

function sqlHash() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    writes: [
      'insert one public.card_prints parent cloned from base2/Jungle Meowth 56 with gold_border identity modifier',
      'insert one public.card_print_identity active identity from projection',
      'insert one public.card_printings normal child printing',
    ],
    forbidden: ['parent overwrites', 'external mapping writes', 'pricing writes', 'image writes', 'deletes', 'merges', 'migrations', 'global apply'],
  }));
}

async function loadBaseParent(client) {
  const result = await client.query(
    `select
       cp.id::text,
       cp.set_id::text,
       cp.game_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.rarity,
       cp.gv_id,
       cp.printed_set_abbrev,
       cp.printed_total,
       cp.identity_domain,
       cp.set_identity_model,
       array_agg(cpr.finish_key order by cpr.finish_key) filter (where cpr.id is not null) as child_finishes
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     where cp.identity_domain = 'pokemon_eng_standard'
       and cp.set_code = $1
       and cp.number = $2
       and lower(cp.name) = lower($3)
       and coalesce(cp.variant_key, '') = ''
       and cp.printed_identity_modifier is null
     group by cp.id`,
    [TARGET.set_code, TARGET.card_number, TARGET.card_name],
  );
  if (result.rows.length !== 1) throw new Error(`expected exactly one base parent, found ${result.rows.length}`);
  return result.rows[0];
}

async function captureSnapshot(client, baseParentId) {
  const result = await client.query(
    `with target as (
       select $1::uuid as base_parent_id, $2::uuid as target_parent_id, $3::uuid as target_child_id
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
     order by row_type, row_id`,
    [baseParentId, targetParentId(), targetChildId()],
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

function evidencePayload(sourceFinding) {
  return {
    source_package_id: PACKAGE_ID,
    source_candidate_key: TARGET.candidate_key,
    classification: 'misc_promo_special_variant',
    variant_key: TARGET.variant_key,
    printed_identity_modifier: TARGET.printed_identity_modifier,
    finish_key: TARGET.finish_key,
    evidence_urls: sourceFinding.evidence.map((row) => row.source_url),
    evidence_labels: sourceFinding.evidence.map((row) => row.evidence_label),
    preserved_evidence_sources: sourceFinding.evidence.map((row) => row.source_key),
    evidence: sourceFinding.evidence,
  };
}

async function runDryRun(client, sourceFinding, baseParent, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, baseParent.id);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await client.query(
      `with projection as (
         select public.card_print_identity_backfill_projection_v1(
           s.source, base.set_code, s.code, base.number, base.number_plain, base.name,
           $1::text, coalesce(base.printed_total, s.printed_total), coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
         from public.card_prints base
         left join public.sets s on s.id = base.set_id
         where base.id = $2::uuid
       )
       select
         (select count(*)::int from public.finish_keys where key = $3 and is_active = true) as active_finish_count,
         (select count(*)::int from public.card_prints where id = $4::uuid) as target_parent_collision_count,
         (select count(*)::int from public.card_printings where id = $5::uuid) as target_child_collision_count,
         (select count(*)::int
          from public.card_prints base
          join public.card_prints cp on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and (coalesce(cp.variant_key, '') = $1 or coalesce(cp.printed_identity_modifier, '') = $6)
          where base.id = $2::uuid) as same_identity_parent_collision_count,
         (select count(*)::int from projection where projected->>'status' = 'ready') as ready_identity_projection_count,
         (select count(*)::int from projection p join public.card_print_identity cpi
           on cpi.is_active = true
          and cpi.identity_domain = p.projected->>'identity_domain'
          and cpi.identity_key_version = p.projected->>'identity_key_version'
          and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collision_count`,
      [TARGET.variant_key, baseParent.id, TARGET.finish_key, targetParentId(), targetChildId(), TARGET.printed_identity_modifier],
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.active_finish_count !== 1
      || guardRow.target_parent_collision_count !== 0
      || guardRow.target_child_collision_count !== 0
      || guardRow.same_identity_parent_collision_count !== 0
      || guardRow.ready_identity_projection_count !== 1
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
         $1::uuid, base.game_id, base.set_id, base.name, base.number,
         $2::text, base.rarity, null,
         null, coalesce(base.external_ids, '{}'::jsonb) || jsonb_build_object('verified_master_index_v1', $3::jsonb),
         now(), base.set_code, base.artist, base.regulation_mark,
         null, null, base.variants, now(), now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $4::text,
           'base_parent_id', base.id::text,
           'variant_key', $2::text,
           'printed_identity_modifier', $5::text,
           'explicit_child_finish_key', $6::text
         ),
         null, base.data_quality_flags, 'representative_shared',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         $7::text,
         null, base.identity_domain, $5::text, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         'Source-backed Meowth Gold Border promo identity. Representative base image only until exact variant image is available.'
       from public.card_prints base
       where base.id = $8::uuid`,
      [
        targetParentId(),
        TARGET.variant_key,
        JSON.stringify(evidencePayload(sourceFinding)),
        PACKAGE_ID,
        TARGET.printed_identity_modifier,
        TARGET.finish_key,
        `${baseParent.gv_id}-${TARGET.gv_id_suffix}`,
        baseParent.id,
      ],
    );

    const identityInsert = await client.query(
      `with projection as (
         select
           cp.id as card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source, cp.set_code, s.code, cp.number, cp.number_plain, cp.name, cp.variant_key,
             coalesce(cp.printed_total, s.printed_total), coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from public.card_prints cp
         left join public.sets s on s.id = cp.set_id
         where cp.id = $1::uuid
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
      [targetParentId()],
    );

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       values (
         $1::uuid, $2::uuid, $3::text, now(), false, 'verified_master_set_index_v1',
         $4::text, $5::text, $6::text, null, null, null, null, 'representative_shared',
         'Source-backed Meowth Gold Border promo child. Representative image only until exact variant image is available.'
       )`,
      [
        targetChildId(),
        targetParentId(),
        TARGET.finish_key,
        `${TARGET.set_code}:${TARGET.card_number}:${TARGET.variant_key}:${TARGET.finish_key}`,
        CREATED_BY,
        `${baseParent.gv_id}-${TARGET.gv_id_suffix}-STD`,
      ],
    );

    if (parentInsert.rowCount !== 1 || identityInsert.rowCount !== 1 || childInsert.rowCount !== 1) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, identity_inserts: identityInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_prints where id = $3::uuid and variant_key = $4 and printed_identity_modifier = $5) as inserted_parent_rows,
         (select count(*)::int from public.card_print_identity where card_print_id = $3::uuid and is_active = true) as inserted_identity_rows,
         (select count(*)::int from public.card_printings where id = $6::uuid and card_print_id = $3::uuid and finish_key = $7) as inserted_child_rows,
         (select count(*)::int from public.card_printings where id = $6::uuid and finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, fingerprint, targetParentId(), TARGET.variant_key, TARGET.printed_identity_modifier, targetChildId(), TARGET.finish_key],
    );

    const inTransactionSnapshot = await captureSnapshot(client, baseParent.id);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, baseParent.id);

    return {
      dry_run_status: 'meowth_gold_border_parent_child_insert_completed_rolled_back_no_durable_change',
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
    const afterSnapshot = await captureSnapshot(client, baseParent.id).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'meowth_gold_border_parent_child_insert_failed_rolled_back',
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

function renderMarkdown(report) {
  return `# Meowth Gold Border Guarded Dry Run V1

Rollback-only dry-run for the source-backed Jungle Meowth Gold Border promo lane.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- transaction_writes_rolled_back: ${report.transaction_writes_rolled_back}
- migrations_created: ${report.migrations_created}
- deletes_performed: ${report.deletes_performed}
- merges_performed: ${report.merges_performed}
- rollback_verified: ${report.execution.rollback_verified}

## Scope

${markdownTable(['field', 'value'], [
    ['package_id', report.package_id],
    ['target', `${TARGET.set_code} ${TARGET.card_name} #${TARGET.card_number}`],
    ['variant_key', TARGET.variant_key],
    ['printed_identity_modifier', TARGET.printed_identity_modifier],
    ['finish_key', TARGET.finish_key],
    ['parent_inserts', report.execution.simulated_write_counts.parent_inserts],
    ['identity_inserts', report.execution.simulated_write_counts.identity_inserts],
    ['child_inserts', report.execution.simulated_write_counts.child_inserts],
  ])}

## Evidence

${markdownTable(['source', 'kind', 'url'], report.source_finding.evidence.map((row) => [
    row.source_key,
    row.source_kind,
    row.source_url,
  ]))}

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
  const sourceFinding = sourceReport.source_findings.find((row) => row.key === TARGET.candidate_key);
  if (!sourceFinding) throw new Error(`Missing source finding for ${TARGET.candidate_key}`);
  if (sourceFinding.recommended_status !== 'ready_for_guarded_parent_child_insert_dry_run') {
    throw new Error(`Source finding is not dry-run ready: ${sourceFinding.recommended_status}`);
  }

  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  let baseParent;
  let execution;
  let fingerprint;
  try {
    baseParent = await loadBaseParent(client);
    fingerprint = packageFingerprint(sourceFinding, baseParent);
    execution = await runDryRun(client, sourceFinding, baseParent, fingerprint);
  } finally {
    await client.end().catch(() => {});
  }

  const sqlHashSha256 = sqlHash();
  const pass = execution.dry_run_status === 'meowth_gold_border_parent_child_insert_completed_rolled_back_no_durable_change'
    && execution.rollback_verified
    && execution.stop_findings.length === 0;
  const dryRunProof = `${execution.before_snapshot?.hash_sha256 ?? 'missing'} == ${execution.after_rollback_snapshot?.hash_sha256 ?? 'missing'}`;
  const recommended = pass
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. SQL hash: ${sqlHashSha256}. Scope: 1 Jungle Meowth Gold Border parent insert, 1 active identity insert, 1 normal child printing insert; set base2/Jungle; variant_key=gold_border; printed_identity_modifier=gold_border. Dry-run proof: ${dryRunProof}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No external mapping writes. No pricing writes. No image writes.`
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
    target: {
      ...TARGET,
      target_parent_id: targetParentId(),
      target_child_id: targetChildId(),
      target_parent_gv_id: `${baseParent.gv_id}-${TARGET.gv_id_suffix}`,
      target_printing_gv_id: `${baseParent.gv_id}-${TARGET.gv_id_suffix}-STD`,
      base_parent_id: baseParent.id,
      base_parent_gv_id: baseParent.gv_id,
      base_child_finishes: baseParent.child_finishes ?? [],
    },
    source_finding: sourceFinding,
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

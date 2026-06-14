import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const ROUTING_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_parent_identity_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_parent_identity_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_parent_identity_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg11b_stamped_parent_identity_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-11B-STAMPED-CANONICAL-PARENT-IDENTITY-ROUTED';
const SOURCE_PACKAGE_ID = 'PKG-11B-STAMPED-FINISH-ROUTING-READINESS';
const ROUTABLE_STATUSES = new Set([
  'ready_finish_routed_exact_label',
  'ready_finish_routed_exact_label_external_finish',
  'ready_single_base_finish',
]);

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function numberPlain(value) {
  const normalized = normalizeNumber(value);
  const match = normalized.match(/[A-Z]*0*(\d+[a-z]?)$/i);
  return match ? match[1].toUpperCase() : normalized;
}

function buildTargets(routing) {
  return (routing.rows ?? [])
    .filter((row) => (
      ROUTABLE_STATUSES.has(row.routing_status)
      && row.target_finish_key
      && row.base_parent_ids?.length === 1
      && row.proposed_variant_key
      && normalizeText(row.proposed_variant_key) !== 'stamped'
      && row.stamp_label
    ))
    .map((row) => {
      const targetParentId = uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${row.card_name}:${row.proposed_variant_key}`);
      const targetChildId = uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${row.card_name}:${row.proposed_variant_key}:${row.target_finish_key}`);
      return {
        target_parent_id: targetParentId,
        target_child_id: targetChildId,
        base_parent_id: row.base_parent_ids[0],
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        target_finish_key: row.target_finish_key,
        target_variant_key: row.proposed_variant_key,
        stamp_label: row.stamp_label,
        target_number_plain: numberPlain(row.card_number),
        evidence: {
          preserved_evidence_sources: row.preserved_evidence_sources,
          evidence_urls: row.preserved_evidence_urls,
          evidence_labels: row.preserved_evidence_labels,
          finish_claims: row.supporting_finish_claims,
          routing_status: row.routing_status,
          routing_fingerprint: routing.fingerprint_sha256,
        },
      };
    });
}

function validateDryRun(dryRun, targets, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.scope?.target_count !== targets.length) findings.push('dry_run_target_count_mismatch');
  if (dryRun.execution?.dry_run_rollback_verified !== true) findings.push('dry_run_rollback_not_verified');
  if (dryRun.execution?.simulated_write_counts?.parent_inserts !== targets.length) findings.push('dry_run_parent_insert_count_mismatch');
  if (dryRun.execution?.simulated_write_counts?.child_inserts !== targets.length) findings.push('dry_run_child_insert_count_mismatch');
  if (dryRun.execution?.simulated_write_counts?.deletes !== 0) findings.push('dry_run_deletes_nonzero');
  if (dryRun.execution?.simulated_write_counts?.merges !== 0) findings.push('dry_run_merges_nonzero');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         target_finish_key text,
         target_variant_key text
       )
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cpr.finish_key
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'proposed_parent_collision' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints base on base.id = t.base_parent_id
     join public.card_prints cp
       on cp.id <> t.target_parent_id
      and cp.set_id = base.set_id
      and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
      and lower(cp.name) = lower(base.name)
      and coalesce(cp.variant_key, '') = coalesce(t.target_variant_key, '')
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_parent_rows: rows.filter((row) => row.row_type === 'target_parent').length,
      target_child_rows: rows.filter((row) => row.row_type === 'target_child').length,
      proposed_parent_collision_rows: rows.filter((row) => row.row_type === 'proposed_parent_collision').length,
      total_rows: rows.length,
    },
  };
}

function validateBefore(snapshot, dryRun) {
  const findings = [];
  if (snapshot.hash_sha256 !== dryRun.execution?.before_snapshot?.hash_sha256) findings.push('fresh_before_hash_mismatch');
  if (snapshot.counts.target_parent_rows !== 0) findings.push('before_target_parent_rows_present');
  if (snapshot.counts.target_child_rows !== 0) findings.push('before_target_child_rows_present');
  if (snapshot.counts.proposed_parent_collision_rows !== 0) findings.push('before_parent_collisions_present');
  return findings;
}

function validateAfter(snapshot, targets) {
  const findings = [];
  if (snapshot.counts.target_parent_rows !== targets.length) findings.push('after_target_parent_count_mismatch');
  if (snapshot.counts.target_child_rows !== targets.length) findings.push('after_target_child_count_mismatch');
  if (snapshot.counts.proposed_parent_collision_rows !== 0) findings.push('after_parent_collisions_present');
  return findings;
}

async function applyPackage(client, targets, dryRun, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const beforeFindings = validateBefore(beforeSnapshot, dryRun);
  if (beforeFindings.length) {
    return {
      apply_status: 'blocked_before_real_apply_live_shape_mismatch',
      committed: false,
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      proof_rows: [],
      write_counts: { parent_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: beforeFindings,
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg11b_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         stamp_label text not null,
         target_number_plain text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg11b_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         stamp_label text,
         target_number_plain text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg11b_targets) as target_count,
         (select count(*)::int from pkg11b_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from pkg11b_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from pkg11b_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from pkg11b_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length ||
      guardRow.missing_base_count !== 0 ||
      guardRow.inactive_finish_count !== 0 ||
      guardRow.parent_collision_count !== 0 ||
      guardRow.child_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }
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
           'source_package_id', $2::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-', upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, base.identity_domain, null, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from pkg11b_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID, SOURCE_PACKAGE_ID],
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
         concat(target.set_key, ':', target.card_number, ':stamped_identity:', target.target_variant_key, ':', target.target_finish_key),
         'english_master_index_pkg11b_stamped_parent_identity_real_apply_v1',
         null, null, null, null, null,
         'representative_shared_stamp',
         concat('Stamped identity child finish routed from exact evidence label: ', target.target_finish_key)
       from pkg11b_targets target`,
    );
    if (parentInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg11b_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg11b_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_printings cpr join pkg11b_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    const afterFindings = validateAfter(afterSnapshot, targets);
    return {
      apply_status: afterFindings.length ? 'committed_but_after_validation_failed' : 'pkg11b_stamped_parent_identity_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: proof.rows,
      guard: guardRow,
      write_counts: { parent_inserts: parentInsert.rowCount, child_inserts: childInsert.rowCount, deletes: 0, merges: 0 },
      stop_findings: afterFindings,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      apply_status: 'pkg11b_stamped_parent_identity_real_apply_failed_rolled_back',
      committed: false,
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: [],
      guard: null,
      write_counts: { parent_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
      stop_findings: [error.message],
    };
  }
}

function renderMarkdown(report) {
  return `# English Master Index PKG-11B Stamped Parent Identity Real Apply V1

- package_id: \`${report.package_id}\`
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- apply_status: ${report.execution.apply_status}
- committed: ${report.execution.committed}
- parent_inserts: ${report.execution.write_counts.parent_inserts}
- child_inserts: ${report.execution.write_counts.child_inserts}
- deletes: ${report.execution.write_counts.deletes}
- merges: ${report.execution.write_counts.merges}
- target_finishes: ${JSON.stringify(report.scope.by_target_finish_key)}
- dry_run_proof: \`${report.dry_run_proof.before_hash}\` == \`${report.dry_run_proof.after_hash}\`
- migrations_created: false
- global_apply: false
- unsupported_cleanup: false
- quarantine_performed: false
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL');
  const routing = await readJson(ROUTING_JSON);
  const dryRun = await readJson(DRY_RUN_JSON);
  const targets = buildTargets(routing);
  const packageFingerprint = sha256(stableJson(targets));
  const dryRunFindings = validateDryRun(dryRun, targets, packageFingerprint);
  if (dryRunFindings.length) throw new Error(`dry-run validation failed: ${dryRunFindings.join(', ')}`);

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const execution = await applyPackage(client, targets, dryRun, packageFingerprint);
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg11b_stamped_parent_identity_real_apply_v1',
      package_id: PACKAGE_ID,
      source_package_id: SOURCE_PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      db_write_committed: execution.committed,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      source_artifacts: {
        routing_readiness: path.relative(ROOT, ROUTING_JSON).replaceAll('\\', '/'),
        guarded_dry_run: path.relative(ROOT, DRY_RUN_JSON).replaceAll('\\', '/'),
      },
      dry_run_proof: {
        before_hash: dryRun.execution.before_snapshot.hash_sha256,
        after_hash: dryRun.execution.after_snapshot.hash_sha256,
        rollback_verified: dryRun.execution.dry_run_rollback_verified,
      },
      scope: {
        target_count: targets.length,
        by_target_finish_key: countBy(targets, (target) => target.target_finish_key),
        by_set: countBy(targets, (target) => target.set_key),
        targets,
      },
      execution,
    };
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    await writeText(CHECKPOINT_MD, `# PKG-11B Stamped Parent Identity Real Apply Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${packageFingerprint}\`
- Apply status: ${execution.apply_status}
- Committed: ${execution.committed}
- Parent inserts: ${execution.write_counts.parent_inserts}
- Child inserts: ${execution.write_counts.child_inserts}
- Deletes: ${execution.write_counts.deletes}
- Merges: ${execution.write_counts.merges}
- Dry-run proof: \`${dryRun.execution.before_snapshot.hash_sha256}\` == \`${dryRun.execution.after_snapshot.hash_sha256}\`
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
`);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      fingerprint_sha256: packageFingerprint,
      apply_status: execution.apply_status,
      committed: execution.committed,
      target_count: targets.length,
      by_target_finish_key: report.scope.by_target_finish_key,
      write_counts: execution.write_counts,
      stop_findings: execution.stop_findings,
      dry_run_proof: `${dryRun.execution.before_snapshot.hash_sha256} == ${dryRun.execution.after_snapshot.hash_sha256}`,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

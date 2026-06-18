import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'retailer_stamp_active_finish_route_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'piplup_burger_king_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'piplup_burger_king_child_insert_guarded_dry_run_v1.md');

const PACKAGE_ID = 'RETAILER-STAMP-04-PIPLUP-BURGER-KING-CHILD-INSERT';
const CREATED_BY = 'piplup_burger_king_child_insert_guarded_dry_run_v1';
const TARGET = {
  set_key: 'dp5',
  card_number: '71',
  card_name: 'Piplup',
  target_variant_key: 'platinum_stamped_burger_king_2009',
  target_finish_key: 'reverse',
  stamp_label: 'Platinum Stamped Burger King 2009',
  target_parent_id: '2df55ec4-c010-4a01-b468-d1da7270e9d2',
  target_child_id: '69df0f74-07d7-4faf-b5de-a1779a33fc4b',
  evidence: [
    {
      source_key: 'bulbapedia_2009_burger_king_toys',
      source_kind: 'human_readable_checklist',
      source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
      evidence_label: 'Burger King 2009 checklist includes Piplup 71/100 and states paired cards are reverse holofoil Platinum-stamped TCG cards.',
    },
    {
      source_key: 'pricecharting_stamped_product',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/piplup-stamped-71',
      evidence_label: 'PriceCharting exact Piplup [Stamped] #71 product includes Burger King Platinum stamped reverse-holo sale labels.',
    },
    {
      source_key: 'pokumon_promo_database',
      source_kind: 'collector_reference',
      source_url: 'https://pokumon.com/card/burger-king-piplup-71-100-burger-king-special-print/',
      evidence_label: 'Pokumon lists Burger King Piplup 71/100 as Reverse Holo Platinum stamp, Burger King Collection 2009.',
    },
  ],
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function packageFingerprint() {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    target: {
      set_key: TARGET.set_key,
      card_number: TARGET.card_number,
      card_name: TARGET.card_name,
      target_parent_id: TARGET.target_parent_id,
      target_child_id: TARGET.target_child_id,
      target_variant_key: TARGET.target_variant_key,
      target_finish_key: TARGET.target_finish_key,
      evidence_urls: TARGET.evidence.map((row) => row.source_url),
    },
  }));
}

async function captureSnapshot(client) {
  const result = await client.query(
    `select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from public.card_prints cp
     where cp.id = $1::uuid
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.card_print_id = $1::uuid
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from public.card_print_identity cpi
     join public.card_prints cp on cp.id = cpi.card_print_id
     where cpi.card_print_id = $1::uuid and cpi.is_active = true
     order by row_type, finish_key nulls last, row_id`,
    [TARGET.target_parent_id],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function runDryRun(client, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await client.query(
      `select
         (select count(*)::int from public.card_prints cp where cp.id = $1::uuid) as parent_count,
         (select count(*)::int from public.card_prints cp where cp.id = $1::uuid and cp.set_code = $2 and cp.number = $3 and lower(cp.name) = lower($4) and cp.variant_key = $5 and cp.printed_identity_modifier is null) as target_parent_match_count,
         (select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = $1::uuid and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from public.finish_keys fk where fk.key = $6 and fk.is_active = true) as active_finish_count,
         (select count(*)::int from public.card_printings cpr where cpr.id = $7::uuid) as child_id_collision_count,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $1::uuid and cpr.finish_key = $6) as existing_target_finish_count,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $1::uuid and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [
        TARGET.target_parent_id,
        TARGET.set_key,
        TARGET.card_number,
        TARGET.card_name,
        TARGET.target_variant_key,
        TARGET.target_finish_key,
        TARGET.target_child_id,
      ],
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.parent_count !== 1
      || guardRow.target_parent_match_count !== 1
      || guardRow.active_identity_count !== 1
      || guardRow.active_finish_count !== 1
      || guardRow.child_id_collision_count !== 0
      || guardRow.existing_target_finish_count !== 0
      || guardRow.forbidden_stamped_child_rows !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         $1::uuid,
         $2::uuid,
         $3::text,
         now(),
         false,
         'verified_master_set_index_v1',
         $4::text,
         $5::text,
         null,
         null,
         null,
         null,
         null,
         'representative_shared_stamp',
         'Burger King Platinum stamped Piplup reverse holo; representative base image until exact stamped image is available.'`,
      [
        TARGET.target_child_id,
        TARGET.target_parent_id,
        TARGET.target_finish_key,
        `${TARGET.set_key}:${TARGET.card_number}:burger_king_platinum:${TARGET.target_finish_key}`,
        CREATED_BY,
      ],
    );

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_printings cpr where cpr.id = $3::uuid) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $4::uuid and cpr.finish_key = $5::text) as matching_target_finish_rows,
         (select count(*)::int from public.card_printings cpr where cpr.card_print_id = $4::uuid and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, fingerprint, TARGET.target_child_id, TARGET.target_parent_id, TARGET.target_finish_key],
    );

    const inTransactionSnapshot = await captureSnapshot(client);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client);
    return {
      dry_run_status: 'piplup_burger_king_child_insert_completed_rolled_back_no_durable_change',
      guard: guardRow,
      proof: proof.rows[0],
      simulated_write_counts: { child_inserts: childInsert.rowCount, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      before_snapshot: beforeSnapshot,
      in_transaction_snapshot: inTransactionSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: sha256(stableJson({ package_id: PACKAGE_ID, package_fingerprint: fingerprint, guard: guardRow, proof: proof.rows[0], before_hash: beforeSnapshot.hash_sha256, after_hash: afterSnapshot.hash_sha256 })),
      stop_findings: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256 ? [] : ['rollback_snapshot_mismatch'],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'piplup_burger_king_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_rollback_snapshot: afterSnapshot,
      rollback_verified: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      dry_run_proof_sha256: null,
      simulated_write_counts: { child_inserts: 0, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      stop_findings: [`dry_run_error:${error.message}`],
    };
  }
}

function renderMarkdown(report) {
  return `# Piplup Burger King Child Insert Guarded Dry Run V1

Rollback-only dry-run for the missing child printing on the existing Piplup Burger King Platinum-stamped parent.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- transaction_writes_rolled_back: ${report.transaction_writes_rolled_back}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- rollback_verified: ${report.execution.rollback_verified}

## Target

${markdownTable(['set', 'number', 'name', 'variant_key', 'finish', 'parent_id', 'child_id'], [[
    TARGET.set_key,
    TARGET.card_number,
    TARGET.card_name,
    TARGET.target_variant_key,
    TARGET.target_finish_key,
    TARGET.target_parent_id,
    TARGET.target_child_id,
  ]])}

## Evidence

${markdownTable(['source', 'kind', 'url', 'label'], TARGET.evidence.map((row) => [
    row.source_key,
    row.source_kind,
    row.source_url,
    row.evidence_label,
  ]))}

## Result

- dry_run_status: ${report.execution.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.execution.dry_run_proof_sha256}\`
- stop_findings: ${report.execution.stop_findings.length}

## Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

async function main() {
  const fingerprint = packageFingerprint();
  const conn = connectionString();
  let execution;

  if (!conn) {
    execution = {
      dry_run_status: 'blocked_missing_database_connection',
      rollback_verified: false,
      dry_run_proof_sha256: null,
      simulated_write_counts: { child_inserts: 0, parent_writes: 0, identity_writes: 0, deletes: 0, merges: 0 },
      stop_findings: ['missing_database_connection'],
    };
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      execution = await runDryRun(client, fingerprint);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const recommended = execution.dry_run_status === 'piplup_burger_king_child_insert_completed_rolled_back_no_durable_change'
    && execution.rollback_verified
    && execution.stop_findings.length === 0
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. Scope: 1 child-only card_printing insert for dp5/Majestic Dawn Piplup #71 Platinum Stamped Burger King 2009 parent; finish reverse=1. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No identity writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
    : 'Not approval-ready; dry-run did not pass cleanly.';

  const report = {
    generated_at: new Date().toISOString(),
    version: 'piplup_burger_king_child_insert_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: fingerprint,
    dry_run_proof_sha256: execution.dry_run_proof_sha256,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    transaction_writes_rolled_back: true,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    target: TARGET,
    execution,
    recommended_real_apply_approval_text: recommended,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    dry_run_status: execution.dry_run_status,
    dry_run_proof_sha256: execution.dry_run_proof_sha256,
    rollback_verified: execution.rollback_verified,
    simulated_write_counts: execution.simulated_write_counts,
    stop_findings: execution.stop_findings,
    recommended_real_apply_approval_text: recommended,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});

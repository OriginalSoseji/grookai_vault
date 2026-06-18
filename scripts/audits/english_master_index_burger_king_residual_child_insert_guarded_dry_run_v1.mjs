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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'burger_king_residual_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'burger_king_residual_child_insert_guarded_dry_run_v1.md');

const PACKAGE_ID = 'RETAILER-STAMP-06-BURGER-KING-RESIDUAL-CHILD-INSERTS';
const CREATED_BY = 'burger_king_residual_child_insert_guarded_dry_run_v1';
const TARGET_FINISH_KEY = 'reverse';
const TARGET_VARIANT_KEY = 'platinum_stamped_burger_king_2009';

const TARGETS = [
  {
    set_key: 'dp5',
    set_name: 'Majestic Dawn',
    card_number: '56',
    card_name: 'Chimchar',
    target_parent_id: '006b48c2-45af-486e-9059-ebf0c2a4f329',
    target_child_id: '7b63ea82-e888-47be-9d23-96810c96e544',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Chimchar 56/100 and states the promotion paired toys with reverse holofoil Platinum-stamped TCG cards.',
      },
      {
        source_key: 'pricecharting_stamped_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/chimchar-stamped-56',
        evidence_label: 'PriceCharting exact product identifies Chimchar [Stamped] #56 in Pokemon Majestic Dawn.',
      },
    ],
  },
  {
    set_key: 'dp5',
    set_name: 'Majestic Dawn',
    card_number: '62',
    card_name: 'Eevee',
    target_parent_id: '5d43f0d8-0fb3-4a0d-bcef-999fd40e67af',
    target_child_id: '6d4b7093-9427-4581-951d-d3204a5e60f7',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Eevee 62/100 and states the promotion paired toys with reverse holofoil Platinum-stamped TCG cards.',
      },
      {
        source_key: 'tcgplayer_burger_king_promos',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/155605/pokemon-burger-king-promos-eevee-62-100-platinum',
        evidence_label: 'TCGplayer exact Burger King Promos product for Eevee 62/100 [Platinum] exposes Reverse Holofoil pricing.',
      },
    ],
  },
  {
    set_key: 'dp5',
    set_name: 'Majestic Dawn',
    card_number: '70',
    card_name: 'Pikachu',
    target_parent_id: '41c3c346-edf5-4306-9dd9-992823418994',
    target_child_id: '210886b2-8058-465d-bf87-3fe1d93b3047',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Pikachu 70/100 and states the promotion paired toys with reverse holofoil Platinum-stamped TCG cards.',
      },
      {
        source_key: 'pricecharting_reverse_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/pikachu-reverse-holo-70',
        evidence_label: 'PriceCharting preserved product evidence includes Platinum-stamped reverse-holo Pikachu #70 sale labels.',
      },
    ],
  },
  {
    set_key: 'dp5',
    set_name: 'Majestic Dawn',
    card_number: '77',
    card_name: 'Turtwig',
    target_parent_id: 'd47a7931-82b8-42ba-a6dc-4137642c2f78',
    target_child_id: '82a0c5ab-c4e7-440b-9cee-320499342139',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Turtwig 77/100 and states the promotion paired toys with reverse holofoil Platinum-stamped TCG cards.',
      },
      {
        source_key: 'pricecharting_stamped_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/turtwig-stamped-77-77',
        evidence_label: 'PriceCharting exact product identifies Turtwig [Stamped] #77 in Pokemon Majestic Dawn.',
      },
    ],
  },
  {
    set_key: 'dp6',
    set_name: 'Legends Awakened',
    card_number: '106',
    card_name: 'Meowth',
    target_parent_id: 'ca2d8167-7a79-4069-b112-9268e2da6ac0',
    target_child_id: uuidFromSeed(`${PACKAGE_ID}:child:dp6:106:meowth:${TARGET_VARIANT_KEY}:${TARGET_FINISH_KEY}`),
    evidence: [
      {
        source_key: 'elitefourum_alternate_checklist',
        source_kind: 'collector_reference',
        source_url: 'https://www.elitefourum.com/t/updated-6-15-15-alternate-set-card-checklist-english/11788',
        evidence_label: 'Elite Fourum alternate checklist lists 106/146 Meowth [Platinum Stamped, Burger King; 2009].',
      },
      {
        source_key: 'pricecharting_stamped_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-legends-awakened/meowth-platinum-stamped-106',
        evidence_label: 'PriceCharting exact product identifies Meowth [Platinum Stamped] #106 in Pokemon Legends Awakened.',
      },
      {
        source_key: 'poke_card_values_exact_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/meowth-106-146-reverse-holo-burger-king-legends-awakened/dp6-106-3-19/',
        evidence_label: 'Poke Card Values exact product identifies Meowth 106/146 Reverse Holo Burger King promo.',
      },
    ],
  },
];

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

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function packageFingerprint(targets) {
  return sha256(stableJson({
    package_id: PACKAGE_ID,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name.toLowerCase(),
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      target_variant_key: TARGET_VARIANT_KEY,
      target_finish_key: TARGET_FINISH_KEY,
      evidence_urls: row.evidence.map((item) => item.source_url),
    })),
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(target_parent_id uuid)
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text as finish_key, null::text as identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cpr.finish_key, null::text
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     join public.card_printings cpr on cpr.card_print_id = cp.id
     union all
     select 'target_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, null::text, cpi.identity_key_hash
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     order by set_code, number, name, row_type, finish_key nulls last, row_id`,
    [JSON.stringify(targets.map((row) => ({ target_parent_id: row.target_parent_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
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
      `create temp table burger_king_residual_child_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         set_key text not null,
         set_name text not null,
         card_number text not null,
         card_name text not null,
         target_variant_key text not null,
         target_finish_key text not null,
         stamp_label text not null,
         evidence jsonb not null
       ) on commit drop`,
    );

    await client.query(
      `insert into burger_king_residual_child_targets (
         target_parent_id, target_child_id, set_key, set_name, card_number, card_name,
         target_variant_key, target_finish_key, stamp_label, evidence
       )
       select target_parent_id, target_child_id, set_key, set_name, card_number, card_name,
         target_variant_key, target_finish_key, stamp_label, evidence
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         stamp_label text,
         evidence jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        ...row,
        target_variant_key: TARGET_VARIANT_KEY,
        target_finish_key: TARGET_FINISH_KEY,
        stamp_label: 'Platinum Stamped Burger King 2009',
      })))],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from burger_king_residual_child_targets) as target_count,
         (select count(distinct target_parent_id)::int from burger_king_residual_child_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from burger_king_residual_child_targets) as target_child_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_prints cp on cp.id = target.target_parent_id) as parent_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_prints cp on cp.id = target.target_parent_id and cp.set_code = target.set_key and cp.number = target.card_number and lower(cp.name) = lower(target.card_name) and cp.variant_key = target.target_variant_key and cp.printed_identity_modifier is null) as target_parent_match_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_print_identity cpi on cpi.card_print_id = target.target_parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true) as active_finish_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_id_collision_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = target.target_finish_key) as existing_target_finish_count,
         (select count(*)::int from burger_king_residual_child_targets target join public.card_printings cpr on cpr.card_print_id = target.target_parent_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.target_parent_count !== targets.length
      || guardRow.target_child_count !== targets.length
      || guardRow.parent_count !== targets.length
      || guardRow.target_parent_match_count !== targets.length
      || guardRow.active_identity_count !== targets.length
      || guardRow.active_finish_count !== targets.length
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
         target.target_child_id,
         target.target_parent_id,
         target.target_finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         target.set_key || ':' || target.card_number || ':burger_king_platinum:' || target.target_finish_key,
         $1::text,
         null,
         null,
         null,
         null,
         null,
         'representative_shared_stamp',
         'Burger King Platinum stamped reverse holo; representative base image until exact stamped image is available.'
       from burger_king_residual_child_targets target`,
      [CREATED_BY],
    );

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from public.card_printings cpr join burger_king_residual_child_targets target on target.target_child_id = cpr.id) as inserted_child_rows,
         (select count(*)::int from public.card_printings cpr join burger_king_residual_child_targets target on target.target_parent_id = cpr.card_print_id and target.target_finish_key = cpr.finish_key) as matching_target_finish_rows,
         (select count(*)::int from public.card_printings cpr join burger_king_residual_child_targets target on target.target_parent_id = cpr.card_print_id and cpr.finish_key = 'stamped') as forbidden_stamped_child_rows`,
      [PACKAGE_ID, fingerprint],
    );

    const inTransactionSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      dry_run_status: 'burger_king_residual_child_insert_completed_rolled_back_no_durable_change',
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
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'burger_king_residual_child_insert_failed_rolled_back',
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
  return `# Burger King Residual Child Insert Guarded Dry Run V1

Rollback-only dry-run for residual Burger King Platinum-stamped parents that exist without a child printing.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- transaction_writes_rolled_back: ${report.transaction_writes_rolled_back}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- rollback_verified: ${report.execution.rollback_verified}

## Scope

- target_child_inserts: ${report.scope.target_count}
- by_set: ${JSON.stringify(report.scope.by_set)}
- by_finish: ${JSON.stringify(report.scope.by_finish)}

${markdownTable(['set', 'number', 'name', 'finish', 'parent_id', 'child_id'], report.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.target_finish_key,
    row.target_parent_id,
    row.target_child_id,
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
  const targets = TARGETS.map((row) => ({
    ...row,
    target_variant_key: TARGET_VARIANT_KEY,
    target_finish_key: TARGET_FINISH_KEY,
    stamp_label: 'Platinum Stamped Burger King 2009',
  }));
  const fingerprint = packageFingerprint(targets);
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
      execution = await runDryRun(client, targets, fingerprint);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const recommended = execution.dry_run_status === 'burger_king_residual_child_insert_completed_rolled_back_no_durable_change'
    && execution.rollback_verified
    && execution.stop_findings.length === 0
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${fingerprint}. Scope: 5 child-only card_printing inserts for residual Burger King Platinum-stamped parents; finish reverse=5; sets dp5=4, dp6=1. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No identity writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
    : 'Not approval-ready; dry-run did not pass cleanly.';

  const report = {
    generated_at: new Date().toISOString(),
    version: 'burger_king_residual_child_insert_guarded_dry_run_v1',
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
    scope: {
      target_count: targets.length,
      by_set: countBy(targets, (row) => row.set_key),
      by_finish: countBy(targets, (row) => row.target_finish_key),
    },
    targets,
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

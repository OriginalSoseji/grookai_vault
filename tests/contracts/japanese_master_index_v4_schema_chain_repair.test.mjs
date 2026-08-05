import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PATH =
  'supabase/migrations/'
  + '20260805100000_master_identity_graph_jpn_review_surfaces_'
  + 'schema_repair_v1.sql';

const TABLES = [
  'card_print_identity_source_evidence',
  'card_print_family_review_queue',
];

const REQUIRED_CONSTRAINTS = [
  'card_print_identity_source_evidence_pkey',
  'card_print_identity_source_evidence_card_print_identity_id_fkey',
  'card_print_identity_source_evidence_card_print_id_fkey',
  'card_print_identity_source_evidence_subject_object_chk',
  'card_print_identity_source_evidence_payload_object_chk',
  'card_print_family_review_queue_pkey',
  'card_print_family_review_queue_card_print_identity_id_fkey',
  'card_print_family_review_queue_card_print_id_fkey',
  'card_print_family_review_queue_evidence_subject_object_chk',
  'card_print_family_review_queue_review_status_chk',
  'card_print_family_review_queue_promotion_allowed_status_chk',
];

const REQUIRED_INDEXES = [
  'idx_card_print_identity_source_evidence_card_print_id_v1',
  'idx_card_print_identity_source_evidence_hash_v1',
  'idx_card_print_identity_source_evidence_source_key_v1',
  'uq_card_print_identity_source_evidence_active_lane_v1',
  'idx_card_print_family_review_queue_card_print_id_v1',
  'idx_card_print_family_review_queue_hash_v1',
  'idx_card_print_family_review_queue_status_v1',
  'uq_card_print_family_review_queue_active_key_v1',
];

const REQUIRED_POLICIES = [
  'card_print_identity_source_evidence_deny_anon_v1',
  'card_print_identity_source_evidence_deny_authenticated_v1',
  'card_print_family_review_queue_deny_anon_v1',
  'card_print_family_review_queue_deny_authenticated_v1',
];

test('schema repair restores both out-of-band tables without row DML', async () => {
  const sql = await fs.readFile(MIGRATION_PATH, 'utf8');
  const normalized = sql.toLowerCase();

  for (const table of TABLES) {
    assert.match(
      normalized,
      new RegExp(`create table if not exists public\\.${table}`),
    );
    assert.match(
      normalized,
      new RegExp(`alter table public\\.${table}\\s+enable row level security`),
    );
  }

  assert.doesNotMatch(
    normalized,
    /(^|\n)\s*(insert\s+into|update\s+public\.|delete\s+from|truncate\s+)/,
  );
});

test('schema repair carries the complete live constraint and index contract', async () => {
  const sql = await fs.readFile(MIGRATION_PATH, 'utf8');
  for (const name of [...REQUIRED_CONSTRAINTS, ...REQUIRED_INDEXES]) {
    assert.ok(sql.includes(name), `missing schema contract: ${name}`);
  }
  assert.match(sql, /approved_for_family_link_promotion/);
  assert.match(sql, /accepted_for_future_promotion/);
});

test('schema repair denies clients and limits service role privileges', async () => {
  const sql = await fs.readFile(MIGRATION_PATH, 'utf8');
  for (const policy of REQUIRED_POLICIES) {
    assert.ok(sql.includes(policy), `missing RLS policy: ${policy}`);
  }

  assert.match(
    sql,
    /revoke all on table[\s\S]+from public, anon, authenticated, service_role;/,
  );
  assert.match(
    sql,
    /grant select, insert, update on table[\s\S]+to service_role;/,
  );
  assert.doesNotMatch(
    sql,
    /grant[\s\S]*\b(delete|truncate)\b[\s\S]*to service_role;/,
  );
});

test('schema repair restores timestamp triggers and fail-closed drift check', async () => {
  const sql = await fs.readFile(MIGRATION_PATH, 'utf8');
  assert.match(
    sql,
    /set_master_identity_graph_jpn_review_tables_updated_at_v1/,
  );
  assert.match(sql, /set search_path = pg_catalog/);
  assert.match(
    sql,
    /trg_card_print_identity_source_evidence_updated_at_v1/,
  );
  assert.match(
    sql,
    /trg_card_print_family_review_queue_updated_at_v1/,
  );
  assert.match(
    sql,
    /missing required columns/,
  );
});

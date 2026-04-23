import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATION_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '20260423150000_contract_runtime_layer_v1.sql');
const DRIFT_SQL_PATH = path.join(REPO_ROOT, 'scripts', 'contracts', 'drift_audit_v1.sql');
const DRIFT_GATE_WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'contracts-drift-gate.yml');

test('contract runtime migration creates append-only ledger and quarantine tables', async () => {
  const sql = await fs.readFile(MIGRATION_PATH, 'utf8');

  assert.match(sql, /create table if not exists public\.contract_violations/i);
  assert.match(sql, /create table if not exists public\.quarantine_records/i);
  assert.match(sql, /trg_contract_violations_append_only_v1/i);
  assert.match(sql, /trg_quarantine_records_append_only_v1/i);
  assert.match(sql, /raise exception 'contract_violations is append-only'/i);
  assert.match(sql, /raise exception 'quarantine_records is append-only'/i);
});

test('drift audit checks quarantine isolation and compatibility view health', async () => {
  const sql = await fs.readFile(DRIFT_SQL_PATH, 'utf8');

  assert.match(sql, /quarantine_view_leakage/i);
  assert.match(sql, /compatibility_views_missing/i);
  assert.match(sql, /v_wall_sections_v1/i);
  assert.match(sql, /v_section_cards_v1/i);
  assert.match(sql, /external_mappings_source_external_duplicates/i);
});

test('contracts drift gate workflow runs the blocking audit command', async () => {
  const workflow = await fs.readFile(DRIFT_GATE_WORKFLOW_PATH, 'utf8');

  assert.match(workflow, /SUPABASE_DB_URL/i);
  assert.match(workflow, /npm run contracts:drift-audit/i);
});

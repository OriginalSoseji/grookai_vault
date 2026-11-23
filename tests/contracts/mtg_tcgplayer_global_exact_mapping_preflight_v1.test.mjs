import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertLiveState,
  assertVerifiedProductionTls,
  connectionConfig,
  expectedApprovalText,
  reconcileApprovedDecision,
  reviewBatchManifestSha256,
} from '../../scripts/audits/mtg_tcgplayer_global_exact_mapping_preflight_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = fs.readFileSync(path.join(
  ROOT,
  'scripts/audits/mtg_tcgplayer_global_exact_mapping_preflight_v1.mjs',
), 'utf8');

function row(id, overrides = {}) {
  return {
    source_product_id: id,
    source_product_name: `Card ${id} (Foil Etched)`,
    source_group_id: 2708,
    source_group_name: 'Commander Legends',
    printed_number: String(id),
    source_subtypes: ['Foil'],
    supporting_gap_row_count: 1,
    target_card_print_id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    target_gv_id: `GV-MTG-${id}`,
    target_set_id: '00000000-0000-4000-8000-000000002708',
    target_set_code: 'cmr',
    target_set_name: 'Commander Legends',
    canonical_name: `Card ${id}`,
    canonical_number: String(id),
    target_variant_key: `scryfall:${id}`,
    group_consensus_set_code: 'cmr',
    mapping_method: 'exact_mtg_global_name_number_unique_review_v1',
    mapping_authority: false,
    publication_authority: false,
    ...overrides,
  };
}

function decisionFixture() {
  const accepted = Array.from({ length: 36 }, (_, index) => row(index + 1));
  const held = Array.from({ length: 13 }, (_, index) => row(index + 101, {
    target_set_code: 'promo',
  }));
  const rejected = [row(58205, { target_set_code: 'sum', group_consensus_set_code: '' })];
  const rows = [...accepted, ...held, ...rejected];
  const bind = (candidate) => ({
    source_product_id: candidate.source_product_id,
    target_card_print_id: candidate.target_card_print_id,
    target_gv_id: candidate.target_gv_id,
    target_set_code: candidate.target_set_code,
    mapping_method: candidate.mapping_method,
  });
  const approval = {
    decision_version: 'MTG_GLOBAL_EXACT_BATCH_0001_CONSERVATIVE_FOUNDER_REVIEW_V1',
    status: 'founder_review_approved',
    batch_manifest_sha256: 'a'.repeat(64),
    decision_fingerprint_sha256: '',
    accepted_source_product_ids: accepted.map((candidate) => candidate.source_product_id),
    held_source_product_ids: held.map((candidate) => candidate.source_product_id),
    rejected_source_product_ids: [58205],
    counts: {
      accepted: 36,
      held: 13,
      rejected: 1,
      total: 50,
    },
    authority: {
      mapping_writes: false,
      pricing_writes: false,
      publication_writes: false,
      canonical_writes: false,
      vault_writes: false,
      production_writes: false,
    },
  };
  const decision = {
    decision_version: approval.decision_version,
    batch_manifest_sha256: approval.batch_manifest_sha256,
    accepted: accepted.map(bind),
    held: held.map(bind),
    rejected: rejected.map(bind),
    mapping_authority: false,
    pricing_authority: false,
    publication_authority: false,
  };
  approval.decision_fingerprint_sha256 = createHash('sha256')
    .update(JSON.stringify(decision)).digest('hex');
  approval.approval_text = `Approve MTG global exact batch 0001 conservative founder review V1. Batch manifest ${approval.batch_manifest_sha256}. Decision fingerprint ${approval.decision_fingerprint_sha256}. Accept only the 36 same-set exact mappings, hold the 13 promo-context rows, and reject TCGPlayer product 58205. Review approval only; no mapping, pricing, publication, canonical, Vault, update, delete, merge, migration, or production writes.`;
  return { rows, approval };
}

test('global exact preflight is structurally read-only and production-bound', () => {
  assert.match(SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(SCRIPT, /transaction_read_only/);
  assert.match(SCRIPT, /production_project_ref_mismatch/);
  assert.match(SCRIPT, /assertPrintingDatabaseTarget/);
  assert.doesNotMatch(SCRIPT, /insert into public\./i);
  assert.doesNotMatch(SCRIPT, /update public\./i);
  assert.doesNotMatch(SCRIPT, /delete from public\./i);
  assert.doesNotMatch(SCRIPT, /await client\.query\(['"]commit/i);
  assert.match(SCRIPT, /separate_exact_founder_approval/);
});

test('global exact database connections require verified production TLS', () => {
  const environment = {
    SUPABASE_URL: 'https://ycdxbpibncqcchqiihfz.supabase.co',
    SUPABASE_DB_URL: 'postgresql://postgres.ycdxbpibncqcchqiihfz:fixture@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=disable',
    SUPABASE_DB_CA_CERT: '-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----',
  };
  const config = connectionConfig('global_exact_tls_contract_v1', environment);
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.servername, 'aws-1-us-east-2.pooler.supabase.com');
  assert.equal(config.ssl.ca, environment.SUPABASE_DB_CA_CERT);
  assert.doesNotThrow(() => assertVerifiedProductionTls({
    connection: { stream: { encrypted: true, authorized: true } },
  }));
  assert.throws(() => assertVerifiedProductionTls({
    connection: { stream: { encrypted: true, authorized: false } },
  }), /production_database_tls_not_verified/);
  assert.throws(() => connectionConfig('global_exact_tls_contract_v1', {
    ...environment,
    NODE_TLS_REJECT_UNAUTHORIZED: '0',
  }), /production_database_insecure_tls_environment/);
  assert.match(SCRIPT, /PINNED_SUPABASE_ROOT_SHA256/);
  assert.match(SCRIPT, /PINNED_SUPABASE_INTERMEDIATE_SHA256/);
  assert.match(SCRIPT, /openssl/);
  assert.match(SCRIPT, /production_database_openssl_unavailable/);
  assert.match(SCRIPT, /certificates\[0\]\.checkHost/);
  assert.match(SCRIPT, /certificates\[0\]\.verify/);
});

test('review decision rejects scope or authority drift before database access', () => {
  const { rows, approval } = decisionFixture();
  assert.equal(reconcileApprovedDecision(rows, approval).accepted.length, 36);
  assert.throws(() => reconcileApprovedDecision(rows, {
    ...approval,
    accepted_source_product_ids: [...approval.accepted_source_product_ids, 101],
  }), /decision_partition_count_changed/);
  assert.throws(() => reconcileApprovedDecision(rows, {
    ...approval,
    authority: { ...approval.authority, mapping_writes: true },
  }), /review_approval_claims_write_authority/);
  assert.throws(() => reconcileApprovedDecision(rows.map((candidate, index) =>
    index === 0 ? { ...candidate, target_set_code: 'wrong' } : candidate), approval),
  /accepted_set_code_changed/);
  assert.throws(() => reconcileApprovedDecision(rows.map((candidate, index) =>
    index === 0 ? { ...candidate, source_group_name: 'Promo Context' } : candidate), approval),
  /accepted_readable_set_context_changed/);
});

test('reusable conservative review supports a content-bound variable partition', () => {
  const accepted = Array.from({ length: 34 }, (_, index) => row(index + 1));
  const held = Array.from({ length: 15 }, (_, index) => row(index + 101, {
    source_group_name: 'Promo Context',
    target_set_name: 'Canonical Set',
    target_set_code: 'canonical',
    group_consensus_set_code: 'promo',
  }));
  const rejected = [row(58205, {
    source_group_name: 'Magic Premiere Shop',
    target_set_name: 'Summer Magic / Edgar',
    target_set_code: 'sum',
    group_consensus_set_code: '',
  })];
  const rows = [...accepted, ...held, ...rejected];
  const bind = (candidate) => ({
    source_product_id: candidate.source_product_id,
    target_card_print_id: candidate.target_card_print_id,
    target_gv_id: candidate.target_gv_id,
    target_set_code: candidate.target_set_code,
    mapping_method: candidate.mapping_method,
  });
  const approval = {
    decision_version: 'MTG_GLOBAL_EXACT_CONSERVATIVE_FOUNDER_REVIEW_V2',
    status: 'founder_review_approved',
    batch_index: 1,
    batch_manifest_sha256: 'b'.repeat(64),
    accepted_source_product_ids: accepted.map((candidate) => candidate.source_product_id),
    held_source_product_ids: held.map((candidate) => candidate.source_product_id),
    rejected_source_product_ids: rejected.map((candidate) => candidate.source_product_id),
    counts: { accepted: 34, held: 15, rejected: 1, total: 50 },
    authority: {
      mapping_writes: false,
      pricing_writes: false,
      publication_writes: false,
      canonical_writes: false,
      vault_writes: false,
      production_writes: false,
    },
  };
  const decision = {
    decision_version: approval.decision_version,
    batch_manifest_sha256: approval.batch_manifest_sha256,
    accepted: accepted.map(bind),
    held: held.map(bind),
    rejected: rejected.map(bind),
    mapping_authority: false,
    pricing_authority: false,
    publication_authority: false,
  };
  approval.decision_fingerprint_sha256 = createHash('sha256')
    .update(JSON.stringify(decision)).digest('hex');
  approval.approval_text = expectedApprovalText(approval);
  const reconciled = reconcileApprovedDecision(rows, approval);
  assert.equal(reconciled.accepted.length, 34);
  assert.equal(reconciled.held.length, 15);
  assert.equal(reconciled.rejected.length, 1);
  assert.match(approval.approval_text, /Accept only the 34 same-set exact mappings/);
  assert.match(approval.approval_text, /hold the 15 context-mismatch rows/);
});

test('batch manifest binds review-critical evidence omitted from the decision fingerprint', () => {
  const { rows } = decisionFixture();
  const before = reviewBatchManifestSha256(rows);
  assert.notEqual(reviewBatchManifestSha256(rows.map((candidate, index) =>
    index === 0 ? { ...candidate, source_product_name: 'Tampered source name' } : candidate)), before);
  assert.notEqual(reviewBatchManifestSha256(rows.map((candidate, index) =>
    index === 0 ? { ...candidate, target_set_id: 'tampered-set-id' } : candidate)), before);
  assert.notEqual(reviewBatchManifestSha256(rows.map((candidate, index) =>
    index === 0 ? { ...candidate, group_consensus_set_count: 999 } : candidate)), before);
});

test('live assertion binds source, target, identity, mapping and current price lane', () => {
  const expected = [row(1)];
  const live = {
    sourceRun: { id: '00000000-0000-4000-8000-000000000001' },
    products: [{
      product_id: 1,
      category_id: 1,
      group_id: 2708,
      group_name: 'Commander Legends',
      name: 'Card 1 (Foil Etched)',
      extended_data: [{ name: 'Number', value: '1' }],
      source_active: true,
      catalog_metadata_status: 'current',
      last_seen_run_id: '00000000-0000-4000-8000-000000000001',
    }],
    observations: [{ product_id: 1, subtype_name: 'Foil' }],
    targets: [{
      card_print_id: expected[0].target_card_print_id,
      gv_id: expected[0].target_gv_id,
      set_id: expected[0].target_set_id,
      set_code: 'cmr',
      name: 'Card 1',
      number: '1',
      variant_key: 'scryfall:1',
      active_standard_identity_count: 1,
      active_tcgplayer_mapping_count: 0,
    }],
    existingMappings: [],
  };
  assert.doesNotThrow(() => assertLiveState(expected, live));
  assert.throws(() => assertLiveState(expected, {
    ...live,
    existingMappings: [{ external_id: '1' }],
  }), /mapping_history_or_collision_now_exists/);
  assert.throws(() => assertLiveState(expected, {
    ...live,
    targets: [{ ...live.targets[0], active_standard_identity_count: 2 }],
  }), /target_identity_not_unique/);
});

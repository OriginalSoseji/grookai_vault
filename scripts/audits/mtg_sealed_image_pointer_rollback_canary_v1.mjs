import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildMtgSealedImagePointerCanaryPlanV1,
  evaluateMtgSealedImagePointerRollbackCanaryV1,
  hashMtgSealedImagePointerCanaryV1,
  validateMtgSealedImagePointerCanaryPlanV1,
} from '../../backend/pricing/mtg_sealed_image_pointer_canary_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import {
  captureState,
  loadBundle,
  writeAttribution,
} from './mtg_sealed_image_release_rollback_canary_v1.mjs';
import { pgSslConfig } from
  './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const DEFAULT_OUT = path.join(ROOT, '.tmp',
  'mtg-sealed-image-pointer-rollback-canary-v1');
const EXPECTED_RELEASE_ID = '86b207e6-4f73-5d9a-af40-864c47256c38';
const EXPECTED_MANIFEST =
  '7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2';
const EXPECTED_PRICE_RELEASE_ID = '25626032-7d72-5542-a8e0-7a6532c2f776';
const EXPECTED_DURABLE_APPLY_EXECUTION =
  '0e477804e8f7fb653b118e4567d9dca6d7b2663d8dd532073d1986c8e9aeb440';

function parseArgs(argv) {
  const args = { execute: false, expectedHeadSha: '',
    expectedPlanFingerprint: '', envFile: DEFAULT_ENV_FILE, outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument === '--execute-rollback-canary') args.execute = true;
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.execute || !/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Exact rollback mode, head SHA, and release plan are required');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function repository(args) {
  const state = { branch: git('branch', '--show-current'),
    head_sha: git('rev-parse', 'HEAD'), expected_head_sha: args.expectedHeadSha,
    tracked_worktree_clean:
      git('status', '--short', '--untracked-files=no') === '' };
  if (state.branch !== 'agent/mtg-sealed-image-migration-promotion-v1' ||
      state.head_sha !== args.expectedHeadSha || !state.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean pointer-canary producer');
  }
  return state;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

function clientOptions(connectionString, applicationName) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 180_000,
    statement_timeout: 180_000, application_name: applicationName };
}

async function rows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

async function setAuthenticatedClaims(client) {
  await client.query(`select set_config(
    'request.jwt.claim.role','authenticated',true)`);
}

async function visibilityAndSigning(client, candidate) {
  await setAuthenticatedClaims(client);
  return (await rows(client, `select
    public.catalog_game_visible_to_request_v1('mtg') as catalog_visible,
    public.sealed_product_game_visible_to_request_v1('mtg') as sealed_visible,
    public.mtg_sealed_image_object_signing_authorized_v1($1,$2)
      as signing_authorized`, [candidate.storage_bucket,
  candidate.object_path]))[0];
}

async function candidateStructuralEligibility(client, candidate) {
  return (await rows(client, `select exists (
    select 1
    from public.sealed_product_image_objects image_object
    join public.sealed_product_variant_image_assertions assertion
      on assertion.image_object_id=image_object.id
     and assertion.game_key=image_object.game_key
     and assertion.assertion_state='exact_verified'
    join public.sealed_product_image_evidence evidence
      on evidence.id=assertion.image_evidence_id
     and evidence.game_key=assertion.game_key
     and evidence.variant_id=assertion.variant_id
     and evidence.source_mapping_id=assertion.source_mapping_id
     and evidence.classification in
       ('exact_image_ready','shared_bytes_exact_variant')
    join public.sealed_product_image_release_members member
      on member.image_assertion_id=assertion.id
     and member.variant_id=assertion.variant_id
    join public.sealed_product_image_releases image_release
      on image_release.id=member.image_release_id
     and image_release.release_state='frozen'
    join public.sealed_product_image_release_pointer image_pointer
      on image_pointer.game_key=image_release.game_key
     and image_pointer.image_release_id=image_release.id
    join public.sealed_product_release_pointer price_pointer
      on price_pointer.game_key=image_release.game_key
     and price_pointer.release_id=image_release.source_price_release_id
    join public.sealed_product_releases price_release
      on price_release.id=price_pointer.release_id
     and price_release.game_key=price_pointer.game_key
     and price_release.release_state='frozen'
    join public.sealed_product_release_members price_member
      on price_member.release_id=price_release.id
     and price_member.id=evidence.source_release_member_id
     and price_member.variant_id=assertion.variant_id
     and price_member.source_mapping_id=assertion.source_mapping_id
     and price_member.qualification_status='qualified_exact'
    join public.sealed_product_pricing_lane_qualifications qualification
      on qualification.id=price_member.qualification_id
     and qualification.variant_id=price_member.variant_id
     and qualification.source_mapping_id=price_member.source_mapping_id
     and qualification.qualification_status='qualified_exact'
    join public.sealed_product_source_mappings mapping
      on mapping.id=price_member.source_mapping_id
     and mapping.variant_id=price_member.variant_id
     and mapping.source_provider='tcgplayer'
    join public.sealed_product_variants variant
      on variant.id=price_member.variant_id
     and variant.language_code='en'
    join public.sealed_product_families family
      on family.id=variant.family_id
     and family.game_key=image_release.game_key
    where image_object.storage_bucket=$1
      and image_object.object_path=$2
      and image_object.storage_readback_sha256=image_object.content_sha256
      and evidence.content_sha256=image_object.content_sha256
      and image_object.image_mime=evidence.image_mime
      and image_object.image_width=evidence.image_width
      and image_object.image_height=evidence.image_height
      and image_object.image_bytes=evidence.image_bytes
      and image_object.object_path =
        'sealed/mtg/sha256/' || left(image_object.content_sha256,2) || '/' ||
        image_object.content_sha256 || case image_object.image_mime
          when 'image/jpeg' then '.jpg'
          when 'image/png' then '.png'
          when 'image/gif' then '.gif'
          when 'image/webp' then '.webp'
        end
      and qualification.source_subtype_name_normalized='normal'
      and qualification.currency='USD'
      and qualification.observed_on between current_date-7 and current_date
      and (qualification.qualification_evidence #>>
        '{observation,market_price}')::numeric > 0
  ) as eligible`, [candidate.storage_bucket, candidate.object_path]))[0].eligible;
}

async function captureAppliedImageState(client, bundle) {
  const base = await captureState(client, bundle);
  const release = (await rows(client, `select
      image_release.id::text,image_release.game_key,image_release.release_state,
      image_release.source_price_release_id::text,
      image_release.manifest_fingerprint,image_release.expected_member_count,
      image_release.frozen_by::text,image_release.frozen_at::text,
      public.sealed_product_image_release_manifest_fingerprint_v1(
        image_release.id) as computed_manifest,
      (select count(*)::integer from public.sealed_product_image_evidence
        where game_key='mtg') as evidence_count,
      (select count(*)::integer from public.sealed_product_image_evidence
        where game_key='mtg' and classification in
          ('exact_image_ready','shared_bytes_exact_variant'))
        as eligible_evidence_count,
      (select count(*)::integer from public.sealed_product_image_evidence
        where game_key='mtg' and classification not in
          ('exact_image_ready','shared_bytes_exact_variant'))
        as excluded_evidence_count,
      (select count(*)::integer from public.sealed_product_image_objects
        where game_key='mtg') as object_count,
      (select count(*)::integer
        from public.sealed_product_variant_image_assertions
        where game_key='mtg') as assertion_count,
      (select count(*)::integer
        from public.sealed_product_image_release_members
        where image_release_id=image_release.id) as member_count
    from public.sealed_product_image_releases image_release
    where image_release.id=$1::uuid`, [EXPECTED_RELEASE_ID]))[0] ?? null;
  const candidate = (await rows(client, `select
      image_object.storage_bucket,image_object.object_path,
      image_object.content_sha256,assertion.variant_id::text,
      assertion.source_mapping_id::text,qualification.observed_on::text,
      (qualification.qualification_evidence #>>
        '{observation,market_price}')::numeric as market_price
    from public.sealed_product_image_release_members member
    join public.sealed_product_variant_image_assertions assertion
      on assertion.id=member.image_assertion_id
    join public.sealed_product_image_objects image_object
      on image_object.id=assertion.image_object_id
    join public.sealed_product_image_evidence evidence
      on evidence.id=assertion.image_evidence_id
    join public.sealed_product_release_members price_member
      on price_member.id=evidence.source_release_member_id
     and price_member.release_id=$2::uuid
     and price_member.qualification_status='qualified_exact'
    join public.sealed_product_pricing_lane_qualifications qualification
      on qualification.id=price_member.qualification_id
     and qualification.observed_on between current_date-7 and current_date
    where member.image_release_id=$1::uuid
      and (qualification.qualification_evidence #>>
        '{observation,market_price}')::numeric > 0
    order by assertion.variant_id limit 1`, [EXPECTED_RELEASE_ID,
  EXPECTED_PRICE_RELEASE_ID]))[0] ?? null;
  const rpcV3Deployed = (await rows(client, `select
    to_regprocedure('public.get_active_sealed_product_pricing_v3(text,integer,integer)')
      is not null as deployed`))[0].deployed;
  return { ...base, release, candidate, rpc_v3_deployed: rpcV3Deployed };
}

function evaluateAppliedPreflight(state, bundle) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const expectedTableCounts = {
    sealed_product_image_evidence: 2182,
    sealed_product_image_objects: 2141,
    sealed_product_variant_image_assertions: 2149,
    sealed_product_image_releases: 1,
    sealed_product_image_release_members: 2149,
    sealed_product_image_release_pointer: 0,
  };
  add(state.authority.active_price_release_id !== EXPECTED_PRICE_RELEASE_ID ||
    state.authority.active_price_release_state !== 'frozen' ||
    state.authority.active_price_expected_member_count !== 2182,
  'active_price_release_drift');
  add(state.authority.current_image_release_id !== null,
    'image_pointer_not_null');
  add(state.authority.mtg_catalog_visibility !== 'signed_in' ||
    state.authority.mtg_sealed_visibility !== 'hidden', 'visibility_drift');
  add(state.authority.one_piece_price_pointer_count !== 1,
    'one_piece_boundary_drift');
  add(state.lineage.expected_count !== 2182 || state.lineage.member_count !== 2182 ||
    state.lineage.mapping_count !== 2182 || state.lineage.mismatch_count !== 0,
  'source_lineage_drift');
  add(state.image_tables.some((row) => !row.rls_enabled || !row.rls_forced ||
    row.row_count !== expectedTableCounts[row.table_name]),
  'image_table_state_drift');
  add(state.table_grants.some((row) =>
    ['anon', 'authenticated'].includes(row.grantee)) ||
    state.table_grants.filter((row) => row.grantee === 'service_role').length !== 11,
  'table_grant_drift');
  add(state.routine_grants.length !== 2 || state.routine_grants.some((row) =>
    row.grantee !== 'service_role'), 'pointer_routine_grant_drift');
  const release = state.release;
  add(!release || release.id !== EXPECTED_RELEASE_ID ||
    release.game_key !== 'mtg' || release.release_state !== 'frozen' ||
    release.source_price_release_id !== EXPECTED_PRICE_RELEASE_ID ||
    release.manifest_fingerprint !== EXPECTED_MANIFEST ||
    release.computed_manifest !== EXPECTED_MANIFEST ||
    Number(release.expected_member_count) !== 2149 ||
    Number(release.evidence_count) !== 2182 ||
    Number(release.eligible_evidence_count) !== 2149 ||
    Number(release.excluded_evidence_count) !== 33 ||
    Number(release.object_count) !== 2141 ||
    Number(release.assertion_count) !== 2149 ||
    Number(release.member_count) !== 2149,
  'durable_image_release_drift');
  add(!state.candidate || state.candidate.storage_bucket !== 'user-card-images' ||
    !state.candidate.object_path?.startsWith('sealed/mtg/sha256/'),
  'signing_candidate_missing');
  add(state.rpc_v3_deployed !== false, 'rpc_v3_unexpectedly_deployed');
  add(bundle.plan.release_id !== EXPECTED_RELEASE_ID ||
    bundle.plan.release_manifest_fingerprint_sha256 !== EXPECTED_MANIFEST,
  'source_plan_drift');
  return { valid: findings.length === 0, findings };
}

async function readOnlyPreflight(connectionString, bundle, applicationName) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  try {
    await client.query('set default_transaction_read_only=on');
    await client.query('begin transaction isolation level repeatable read read only');
    const transactionReadOnly = (await client.query('show transaction_read_only'))
      .rows[0].transaction_read_only === 'on';
    const state = await captureAppliedImageState(client, bundle);
    const beforeVisibility = await visibilityAndSigning(client, state.candidate);
    await client.query('rollback');
    const evaluation = evaluateAppliedPreflight(state, bundle);
    if (beforeVisibility.catalog_visible !== true ||
        beforeVisibility.sealed_visible !== false ||
        beforeVisibility.signing_authorized !== false) {
      evaluation.findings.push('pre_pointer_signing_or_visibility_boundary_drift');
      evaluation.valid = false;
    }
    return { ...evaluation, transaction_read_only: transactionReadOnly,
      state, authenticated_before_pointer: beforeVisibility };
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }
}

function comparableProtectedState(state) {
  return { authority: state.authority, image_tables: state.image_tables,
    table_grants: state.table_grants, routine_grants: state.routine_grants,
    lineage: state.lineage, release: state.release, candidate: state.candidate,
    rpc_v3_deployed: state.rpc_v3_deployed };
}

async function runRollbackCanary(connectionString, bundle, preflight, plan) {
  const client = new Client(clientOptions(connectionString,
    'mtg-sealed-image-pointer-rollback-canary-v1'));
  await client.connect();
  let rolledBack = false;
  try {
    await client.query('begin transaction isolation level repeatable read');
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    await client.query("set local idle_in_transaction_session_timeout='60s'");
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',
      ['mtg_sealed_image_pointer_rollback_canary_v1']);
    const before = await captureAppliedImageState(client, bundle);
    const transactionPreflight = evaluateAppliedPreflight(before, bundle);
    if (!transactionPreflight.valid) {
      throw new Error(`Transaction-local preflight failed: ` +
        transactionPreflight.findings.join(','));
    }
    const signingBefore = await visibilityAndSigning(client, before.candidate);
    await rows(client, `select * from
      public.sealed_product_set_active_image_release_v1(
        $1::uuid,$2::uuid,$3::uuid)`, [plan.target_image_release_id,
    plan.expected_current_image_release_id, plan.changed_by]);
    const pointer = (await rows(client, `select game_key,
      image_release_id::text,previous_image_release_id::text,
      pointer_contract_version,changed_by::text,changed_at::text
      from public.sealed_product_image_release_pointer where game_key='mtg'`))[0];
    const releasePriceBindingValid = (await rows(client, `select exists (
      select 1 from public.sealed_product_image_release_pointer image_pointer
      join public.sealed_product_image_releases image_release
        on image_release.id=image_pointer.image_release_id
       and image_release.game_key=image_pointer.game_key
       and image_release.release_state='frozen'
      join public.sealed_product_release_pointer price_pointer
        on price_pointer.game_key=image_release.game_key
       and price_pointer.release_id=image_release.source_price_release_id
      where image_pointer.game_key='mtg'
        and image_release.id=$1::uuid
        and price_pointer.release_id=$2::uuid
    ) as valid`, [EXPECTED_RELEASE_ID, EXPECTED_PRICE_RELEASE_ID]))[0].valid;
    const structurallyEligible = await candidateStructuralEligibility(client,
      before.candidate);
    const hiddenSigning = await visibilityAndSigning(client, before.candidate);
    const writeAttributionRows = await writeAttribution(client);
    await client.query('rollback');
    rolledBack = true;
    return { plan, preflight,
      transaction_local_preflight: transactionPreflight,
      transaction: { started: true, committed: false, rolled_back: true },
      transaction_pointer_readback: pointer,
      release_price_binding_valid: releasePriceBindingValid,
      candidate_structural_eligibility_with_pointer: structurallyEligible,
      visibility: { catalog_visible: hiddenSigning.catalog_visible,
        sealed_visible: hiddenSigning.sealed_visible },
      signing_authorized_before_pointer: signingBefore.signing_authorized,
      signing_authorized_with_hidden_pointer: hiddenSigning.signing_authorized,
      rpc_v3_deployed: before.rpc_v3_deployed,
      write_attribution: writeAttributionRows };
  } finally {
    if (!rolledBack) await client.query('rollback').catch(() => {});
    await client.end();
  }
}

async function verifyRollback(connectionString, bundle, preflight) {
  const post = await readOnlyPreflight(connectionString, bundle,
    'mtg-sealed-image-pointer-post-rollback-v1');
  const before = comparableProtectedState(preflight.state);
  const after = comparableProtectedState(post.state);
  return { transaction_read_only: post.transaction_read_only,
    pointer_is_null: post.state.authority.current_image_release_id === null,
    release_unchanged: JSON.stringify(before.release) ===
      JSON.stringify(after.release),
    protected_boundaries_unchanged: JSON.stringify(before) ===
      JSON.stringify(after),
    security_boundary_unchanged: JSON.stringify({
      tables: before.image_tables.map(
        ({ table_name, rls_enabled, rls_forced }) =>
          ({ table_name, rls_enabled, rls_forced })),
      table_grants: before.table_grants,
      routine_grants: before.routine_grants,
    }) === JSON.stringify({
      tables: after.image_tables.map(
        ({ table_name, rls_enabled, rls_forced }) =>
          ({ table_name, rls_enabled, rls_forced })),
      table_grants: after.table_grants,
      routine_grants: after.routine_grants,
    }),
    full_preflight_valid: post.valid, state: post.state };
}

async function writeJson(file, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, bytes);
  return bytes;
}

async function writeArtifacts(outDir, files, producerCommitSha) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const bytes = name.endsWith('.json')
      ? await writeJson(path.join(outDir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith('.json')) await fs.writeFile(path.join(outDir, name), bytes);
    hashes[name] = { bytes: bytes.length,
      sha256: hashMtgSealedImagePointerCanaryV1(bytes) };
  }
  await writeJson(path.join(outDir, 'artifact_hashes.json'), {
    hash_algorithm: 'sha256', producer_commit_sha: producerCommitSha,
    artifacts: hashes,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const bundle = await loadBundle(args.expectedPlanFingerprint);
  dotenv.config({ path: args.envFile, override: false, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString || supabaseProjectRefFromUrlV1(connectionString) !==
      MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1) {
    throw new Error('Canonical production database URL is required');
  }
  const preflight = await readOnlyPreflight(connectionString, bundle,
    'mtg-sealed-image-pointer-preflight-v1');
  if (!preflight.valid || !preflight.transaction_read_only) {
    throw new Error(`Fresh pointer preflight failed: ${preflight.findings.join(',')}`);
  }
  const release = bundle.payload.releases[0];
  const plan = buildMtgSealedImagePointerCanaryPlanV1({
    repository: repo, productionPreflight: preflight,
    sourceImageReleasePlanFingerprint: bundle.plan.plan_fingerprint_sha256,
    sourceDurableApplyExecutionFingerprint: EXPECTED_DURABLE_APPLY_EXECUTION,
    releaseId: release.id,
    releaseManifestFingerprint: release.manifest_fingerprint,
    sourcePriceReleaseId: release.source_price_release_id,
    changedBy: release.created_by,
    candidate: preflight.state.candidate,
  });
  const planValidation = validateMtgSealedImagePointerCanaryPlanV1(plan);
  if (!planValidation.valid) {
    throw new Error(`Pointer plan invalid: ${planValidation.findings.join(',')}`);
  }
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, 'run_plan.json'), plan);
  const proof = await runRollbackCanary(connectionString, bundle, preflight, plan);
  proof.post_rollback = await verifyRollback(connectionString, bundle, preflight);
  const validation = evaluateMtgSealedImagePointerRollbackCanaryV1(proof);
  const summary = { status: validation.valid
    ? 'mtg_sealed_image_pointer_rollback_canary_passed_zero_residue'
    : 'mtg_sealed_image_pointer_rollback_canary_failed',
  repository: repo, canary_fingerprint_sha256: plan.canary_fingerprint_sha256,
  target_image_release_id: plan.target_image_release_id,
  required_active_price_release_id: plan.required_active_price_release_id,
  candidate: plan.selected_signing_candidate,
  pointer_inserted_in_transaction: true,
  pointer_rolled_back_to_null: proof.post_rollback.pointer_is_null,
  candidate_structural_eligibility_with_pointer:
    proof.candidate_structural_eligibility_with_pointer,
  signing_remained_denied_while_hidden:
    proof.signing_authorized_with_hidden_pointer === false,
  rpc_v3_deployed: proof.rpc_v3_deployed,
  validation, boundaries: plan.boundaries,
  exact_next_gate: validation.valid
    ? 'build the separately guarded durable image-pointer activation plan'
    : 'stop before any durable image-pointer activation' };
  const report = `# MTG Sealed Image Pointer Rollback Canary V1\n\n` +
    `- Status: **${validation.valid ? 'PASS' : 'FAIL'}**\n` +
    `- Producer: \`${repo.head_sha}\`\n` +
    `- Pointer transition: \`null -> ${plan.target_image_release_id}\`\n` +
    `- Release/price binding: \`${proof.release_price_binding_valid}\`\n` +
    `- Candidate structurally eligible: ` +
      `\`${proof.candidate_structural_eligibility_with_pointer}\`\n` +
    `- Signing while sealed visibility hidden: ` +
      `\`${proof.signing_authorized_with_hidden_pointer}\`\n` +
    `- RPC V3 deployed: \`${proof.rpc_v3_deployed}\`\n` +
    `- Transaction committed: \`false\`\n` +
    `- Pointer after rollback: \`null\`\n`;
  await writeArtifacts(args.outDir, { 'run_plan.json': plan,
    'fresh_production_preflight.json': preflight,
    'transaction_proof.json': proof, 'summary.json': summary,
    'REPORT.md': report }, repo.head_sha);
  process.stdout.write(`${JSON.stringify({ ...summary,
    output_directory: args.outDir }, null, 2)}\n`);
  if (!validation.valid) throw new Error(validation.findings.join(','));
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { captureAppliedImageState, evaluateAppliedPreflight, parseArgs,
  readOnlyPreflight, runRollbackCanary, verifyRollback };

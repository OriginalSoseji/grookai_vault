import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

import dotenv from 'dotenv';

import {
  buildMtgSealedImageReleasePlanV1,
  hashMtgSealedImageReleasePlanV1,
  imageReleaseManifestFingerprintV1,
  validateMtgSealedImageReleasePlanV1,
} from '../../backend/pricing/mtg_sealed_image_release_plan_v1.mjs';
import {
  validateMtgSealedCoverageArtifactBundleV1,
} from '../../backend/pricing/mtg_sealed_image_canary_plan_v1.mjs';
import {
  validateMtgSealedDurableImagePlanV1,
} from '../../backend/pricing/mtg_sealed_durable_image_plan_v1.mjs';
import {
  MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1,
  MTG_SEALED_IMAGE_TABLES_V1,
  supabaseProjectRefFromUrlV1,
} from '../../backend/pricing/mtg_sealed_image_migration_preflight_v1.mjs';
import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './japanese_master_index_v4/read_only_guard_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_ENV_FILE = 'C:\\grookai_vault\\.env.local';
const COVERAGE_DIR = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_image_coverage_v1', '2026-09-04_live_33841181449');
const DURABLE_PLAN_DIR = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_durable_image_plan_v1', '2026-09-04T22-07-02Z_offline');
const DURABLE_EXECUTION_DIR = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_durable_image_storage_v1', '2026-09-05T00-34-15Z_passed');
const DEFAULT_OUT = path.join(ROOT, '.tmp', 'mtg-sealed-image-release-plan-v1');

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  const args = { expectedHeadSha: '', envFile: DEFAULT_ENV_FILE, outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice(10));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha=<40-character SHA> is required');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function repository(expectedHeadSha) {
  const state = {
    branch: git('branch', '--show-current'),
    head_sha: git('rev-parse', 'HEAD'),
    expected_head_sha: expectedHeadSha,
    tracked_worktree_clean:
      git('status', '--short', '--untracked-files=no') === '',
  };
  if (state.head_sha !== expectedHeadSha) throw new Error('HEAD authority mismatch');
  if (!state.tracked_worktree_clean) throw new Error('Tracked worktree must be clean');
  return state;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? '';
}

function jsonlBytes(rows) {
  return Buffer.from(`${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function verifyArtifactManifest(directory, manifestName = 'artifact_hashes.json') {
  const manifest = await readJson(path.join(directory, manifestName));
  const mismatches = [];
  for (const [name, expected] of Object.entries(manifest.artifacts ?? {})) {
    const bytes = await fs.readFile(path.join(directory, name));
    if (bytes.length !== expected.bytes ||
        hashMtgSealedImageReleasePlanV1(bytes) !== expected.sha256) {
      mismatches.push(name);
    }
  }
  return { valid: mismatches.length === 0, mismatches, manifest };
}

async function loadSources() {
  const coverageSummaryBytes = await fs.readFile(path.join(COVERAGE_DIR, 'summary.json'));
  const coverageSummary = JSON.parse(coverageSummaryBytes);
  const coverageManifestBytes = await fs.readFile(
    path.join(COVERAGE_DIR, 'permanent_manifest.json'));
  const coverageManifest = JSON.parse(coverageManifestBytes);
  const coverageCompressedBytes = await fs.readFile(
    path.join(COVERAGE_DIR, 'coverage.jsonl.gz'));
  const coverageUncompressedBytes = gunzipSync(coverageCompressedBytes);
  const coverageRows = coverageUncompressedBytes.toString('utf8')
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const coverageValidation = validateMtgSealedCoverageArtifactBundleV1({
    rows: coverageRows,
    summary: coverageSummary,
    manifest: coverageManifest,
    coverageCompressedBytes,
    coverageUncompressedBytes,
    summaryBytes: coverageSummaryBytes,
  });
  if (!coverageValidation.valid) {
    throw new Error(`Coverage bundle invalid: ${coverageValidation.findings.join(',')}`);
  }

  const durablePlanManifest = await verifyArtifactManifest(DURABLE_PLAN_DIR);
  const durableExecutionManifest = await verifyArtifactManifest(DURABLE_EXECUTION_DIR);
  if (!durablePlanManifest.valid || !durableExecutionManifest.valid) {
    throw new Error('Durable source artifact hash mismatch');
  }
  const durablePlan = await readJson(path.join(DURABLE_PLAN_DIR, 'run_plan.json'));
  const durableObjects = gunzipSync(await fs.readFile(
    path.join(DURABLE_PLAN_DIR, 'objects.jsonl.gz'))).toString('utf8')
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const durableExclusions = (await fs.readFile(
    path.join(DURABLE_PLAN_DIR, 'exclusions.jsonl'), 'utf8'))
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const durablePlanValidation = validateMtgSealedDurableImagePlanV1({
    plan: durablePlan,
    objects: durableObjects,
    exclusions: durableExclusions,
    shards: await readJson(path.join(DURABLE_PLAN_DIR, 'shards.json')),
  });
  if (!durablePlanValidation.valid) {
    throw new Error(`Durable plan invalid: ${durablePlanValidation.findings.join(',')}`);
  }
  const durableSummary = await readJson(path.join(DURABLE_EXECUTION_DIR, 'summary.json'));
  const durableResults = gunzipSync(await fs.readFile(
    path.join(DURABLE_EXECUTION_DIR, 'object_results.jsonl.gz'))).toString('utf8')
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  if (durableSummary.status !== 'passed_all_durable_objects_exactly_verified' ||
      durableSummary.exact_verified_object_count !== durableObjects.length ||
      durableSummary.zero_reconciliation_mismatches !== true) {
    throw new Error('Durable execution is not an exact successful source');
  }
  const terminalEvents = (await fs.readFile(
    path.join(DURABLE_EXECUTION_DIR, 'execution_journal.jsonl'), 'utf8'))
    .split(/\r?\n/).filter(Boolean).map(JSON.parse)
    .filter((row) => row.event === 'object_terminal');
  const verifiedAtByObjectPath = new Map();
  for (const event of terminalEvents) {
    if (['uploaded_and_exact_readback_verified',
      'reused_preexisting_exact_object'].includes(event.status)) {
      verifiedAtByObjectPath.set(event.object_path, event.recorded_at);
    }
  }
  if (verifiedAtByObjectPath.size !== durableObjects.length) {
    throw new Error('Durable journal does not timestamp every exact object');
  }
  return {
    coverageRows, coverageSummary, coverageManifest, durableObjects, durablePlan,
    durableResults, durableSummary, verifiedAtByObjectPath,
    sourceArtifacts: {
      coverage_directory: path.relative(ROOT, COVERAGE_DIR).replaceAll('\\', '/'),
      durable_plan_directory:
        path.relative(ROOT, DURABLE_PLAN_DIR).replaceAll('\\', '/'),
      durable_execution_directory:
        path.relative(ROOT, DURABLE_EXECUTION_DIR).replaceAll('\\', '/'),
      coverage_bundle_valid: coverageValidation.valid,
      durable_plan_artifacts_valid: durablePlanManifest.valid,
      durable_execution_artifacts_valid: durableExecutionManifest.valid,
    },
  };
}

async function rows(client, sql, values = []) {
  return (await client.query(sql, values)).rows;
}

async function captureProductionSnapshot(client, guard, sources) {
  const releaseId = sources.coverageSummary.release_id;
  const sourceMembers = await rows(client, `select
      member.id::text as release_member_id,
      member.variant_id::text,
      member.source_mapping_id::text,
      member.member_fingerprint,
      mapping.source_provider,
      mapping.source_category_id::bigint,
      mapping.source_group_id::bigint,
      mapping.source_product_id::bigint
    from public.sealed_product_release_members member
    join public.sealed_product_source_mappings mapping
      on mapping.id=member.source_mapping_id
     and mapping.variant_id=member.variant_id
    where member.release_id=$1::uuid
    order by member.id`, [releaseId]);
  const authority = (await rows(client, `select
      pointer.release_id::text as active_price_release_id,
      release.release_state as active_price_release_state,
      release.expected_member_count as active_price_expected_member_count,
      image_pointer.image_release_id::text as current_image_release_id,
      sealed_control.release_status as mtg_sealed_visibility,
      catalog_control.release_status as mtg_catalog_visibility,
      (select count(*)::integer from public.sealed_product_release_pointer
        where game_key='one_piece') as one_piece_price_pointer_count
    from public.sealed_product_release_pointer pointer
    join public.sealed_product_releases release
      on release.id=pointer.release_id and release.game_key=pointer.game_key
    left join public.sealed_product_image_release_pointer image_pointer
      on image_pointer.game_key=pointer.game_key
    left join public.sealed_product_game_release_controls sealed_control
      on sealed_control.game_key=pointer.game_key
    left join public.catalog_game_release_controls catalog_control
      on catalog_control.game_key=pointer.game_key
    where pointer.game_key='mtg'`))[0];
  const tableSecurity = await rows(client, `select relation.relname as table_name,
      relation.relrowsecurity as rls_enabled,
      relation.relforcerowsecurity as rls_forced
    from pg_class relation
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public' and relation.relname=any($1::text[])
    order by relation.relname`, [MTG_SEALED_IMAGE_TABLES_V1]);
  const tableState = [];
  for (const tableName of MTG_SEALED_IMAGE_TABLES_V1) {
    const security = tableSecurity.find((row) => row.table_name === tableName);
    const count = (await rows(client,
      `select count(*)::bigint as row_count from public.${tableName}`))[0];
    tableState.push({
      table_name: tableName,
      rls_enabled: security?.rls_enabled ?? false,
      rls_forced: security?.rls_forced ?? false,
      row_count: count.row_count,
    });
  }
  const tableGrants = await rows(client, `select table_name,grantee,privilege_type
    from information_schema.role_table_grants
    where table_schema='public' and table_name=any($1::text[])
      and grantee=any(array['anon','authenticated','service_role'])
    order by table_name,grantee,privilege_type`, [MTG_SEALED_IMAGE_TABLES_V1]);
  const routineGrants = await rows(client, `select routine_name,grantee,privilege_type
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name=any(array[
        'sealed_product_freeze_image_release_v1',
        'sealed_product_set_active_image_release_v1'])
      and grantee=any(array['anon','authenticated','service_role'])
    order by routine_name,grantee,privilege_type`);
  const ledger = await rows(client, `select version,name
    from supabase_migrations.schema_migrations
    where version='20260904130000'`);

  const coverageByMember = new Map(sources.coverageRows.map((row) =>
    [row.release_member_id, row]));
  const sourceMismatches = [];
  for (const row of sourceMembers) {
    const expected = coverageByMember.get(row.release_member_id);
    if (!expected || row.variant_id !== expected.variant_id ||
        row.source_mapping_id !== expected.source_mapping_id ||
        row.member_fingerprint !== expected.member_fingerprint ||
        row.source_provider !== expected.source_provider ||
        Number(row.source_category_id) !== Number(expected.source_category_id) ||
        Number(row.source_group_id) !== Number(expected.source_group_id) ||
        Number(row.source_product_id) !== Number(expected.source_product_id)) {
      sourceMismatches.push(row.release_member_id);
    }
  }
  for (const memberId of coverageByMember.keys()) {
    if (!sourceMembers.some((row) => row.release_member_id === memberId)) {
      sourceMismatches.push(memberId);
    }
  }
  const tableStateComplete = tableState.length === MTG_SEALED_IMAGE_TABLES_V1.length &&
    tableState.every((row) => row.rls_enabled && row.rls_forced);
  const targetRowsEmpty = tableState.every((row) => Number(row.row_count) === 0);
  const appGrantLeak = tableGrants.some((row) =>
    ['anon', 'authenticated'].includes(row.grantee));
  const serviceGrantsValid = MTG_SEALED_IMAGE_TABLES_V1.every((table) => {
    const actual = tableGrants.filter((row) => row.table_name === table &&
      row.grantee === 'service_role').map((row) => row.privilege_type).sort();
    const expected = table === 'sealed_product_image_release_pointer'
      ? ['SELECT'] : ['INSERT', 'SELECT'];
    return JSON.stringify(actual) === JSON.stringify(expected);
  });
  const routineGrantsValid = routineGrants.length === 2 &&
    routineGrants.every((row) => row.grantee === 'service_role' &&
      row.privilege_type === 'EXECUTE');
  const findings = [];
  if (authority?.active_price_release_id !== releaseId) findings.push('active_price_release_drift');
  if (authority?.active_price_release_state !== 'frozen') findings.push('active_price_release_not_frozen');
  if (Number(authority?.active_price_expected_member_count) !== 2182) findings.push('active_price_member_count_drift');
  if (sourceMembers.length !== 2182 || sourceMismatches.length) findings.push('source_release_members_drift');
  if (!targetRowsEmpty) findings.push('image_table_collision');
  if (authority?.current_image_release_id !== null) findings.push('image_pointer_collision');
  if (!tableStateComplete) findings.push('image_schema_rls_drift');
  if (appGrantLeak || !serviceGrantsValid || !routineGrantsValid) findings.push('image_schema_grant_drift');
  if (ledger.length !== 1) findings.push('image_schema_migration_ledger_drift');
  if (authority?.mtg_sealed_visibility !== 'hidden') findings.push('mtg_sealed_visibility_not_hidden');
  if (Number(authority?.one_piece_price_pointer_count) !== 1) findings.push('one_piece_boundary_drift');
  return {
    valid: findings.length === 0,
    findings,
    guard,
    active_price_release_id: authority?.active_price_release_id ?? null,
    active_price_release_state: authority?.active_price_release_state ?? null,
    active_price_expected_member_count:
      Number(authority?.active_price_expected_member_count ?? 0),
    current_image_release_id: authority?.current_image_release_id ?? null,
    mtg_sealed_visibility: authority?.mtg_sealed_visibility ?? null,
    mtg_catalog_visibility: authority?.mtg_catalog_visibility ?? null,
    one_piece_price_pointer_count:
      Number(authority?.one_piece_price_pointer_count ?? 0),
    source_release_member_count: sourceMembers.length,
    source_release_member_mismatch_count: sourceMismatches.length,
    source_release_member_fingerprint_sha256:
      hashMtgSealedImageReleasePlanV1(JSON.stringify(sourceMembers)),
    image_tables: tableState.map((row) => ({ ...row, row_count: Number(row.row_count) })),
    app_table_grant_count: tableGrants.filter((row) =>
      ['anon', 'authenticated'].includes(row.grantee)).length,
    service_table_grant_count: tableGrants.filter((row) =>
      row.grantee === 'service_role').length,
    service_routine_grant_count: routineGrants.filter((row) =>
      row.grantee === 'service_role').length,
    migration_ledger: ledger,
  };
}

async function proveDatabaseFingerprintParity(client, bundle) {
  const release = bundle.payload.releases[0];
  const memberInputs = bundle.payload.release_members.map((member) => {
    const assertion = bundle.payload.assertions.find((row) =>
      row.id === member.image_assertion_id);
    const evidence = bundle.payload.evidence.find((row) =>
      row.id === assertion.image_evidence_id);
    const object = bundle.payload.objects.find((row) =>
      row.id === assertion.image_object_id);
    return {
      id: member.id,
      image_release_id: release.id,
      game_key: member.game_key,
      variant_id: member.variant_id,
      image_assertion_id: member.image_assertion_id,
      assertion_fingerprint: assertion.assertion_fingerprint,
      evidence_fingerprint: evidence.evidence_fingerprint,
      object_fingerprint: object.object_fingerprint,
      planned_fingerprint: member.member_fingerprint,
    };
  });
  const memberParity = (await rows(client, `with input as (
      select value from jsonb_array_elements($1::jsonb) value
    ), computed as (
      select value->>'id' as id,
        encode(extensions.digest(convert_to(jsonb_build_array(
          'SEALED_PRODUCT_IMAGE_RELEASE_MEMBER_V1',
          value->>'image_release_id', value->>'game_key', value->>'variant_id',
          value->>'image_assertion_id', value->>'assertion_fingerprint',
          value->>'evidence_fingerprint', value->>'object_fingerprint'
        )::text,'UTF8'),'sha256'),'hex') as fingerprint,
        value->>'planned_fingerprint' as planned_fingerprint
      from input
    ) select count(*)::integer as checked_count,
      count(*) filter (where fingerprint<>planned_fingerprint)::integer
        as mismatch_count from computed`, [JSON.stringify(memberInputs)]))[0];
  const manifestMembers = [...bundle.payload.release_members]
    .sort((left, right) => left.variant_id.localeCompare(right.variant_id) ||
      left.image_assertion_id.localeCompare(right.image_assertion_id))
    .map((member) => [member.variant_id, member.image_assertion_id,
      member.member_fingerprint]);
  const manifest = (await rows(client, `select encode(extensions.digest(convert_to(
      jsonb_build_array('SEALED_PRODUCT_IMAGE_RELEASE_MANIFEST_V1',
        $1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,
        $8::integer,$9::integer,$10::jsonb)::text,
      'UTF8'),'sha256'),'hex') as fingerprint`, [
    release.id, release.game_key, release.source_price_release_id,
    release.source_audit_producer_sha, release.source_plan_fingerprint,
    release.coverage_fingerprint, release.release_contract_version,
    release.expected_member_count, bundle.payload.release_members.length,
    JSON.stringify(manifestMembers),
  ]))[0];
  return {
    database_member_fingerprint_count: Number(memberParity.checked_count),
    database_member_fingerprint_mismatch_count: Number(memberParity.mismatch_count),
    planned_manifest_fingerprint: imageReleaseManifestFingerprintV1(
      release, bundle.payload.release_members),
    database_manifest_fingerprint: manifest.fingerprint,
    valid: Number(memberParity.checked_count) === bundle.payload.release_members.length &&
      Number(memberParity.mismatch_count) === 0 &&
      manifest.fingerprint === release.manifest_fingerprint,
  };
}

async function writeArtifacts(outDir, files) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, bytes] of Object.entries(files)) {
    await fs.writeFile(path.join(outDir, name), bytes);
    hashes[name] = { bytes: bytes.length, sha256: hashMtgSealedImageReleasePlanV1(bytes) };
  }
  const manifest = Buffer.from(`${JSON.stringify({ hash_algorithm: 'sha256', artifacts: hashes }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'artifact_hashes.json'), manifest);
}

const args = parseArgs(process.argv.slice(2));
const repo = repository(args.expectedHeadSha);
dotenv.config({ path: args.envFile, override: false, quiet: true });
const connectionString = databaseUrl();
if (!connectionString ||
    supabaseProjectRefFromUrlV1(connectionString) !==
      MTG_SEALED_IMAGE_CANONICAL_PROJECT_REF_V1) {
  throw new Error('Canonical production database URL is required');
}
const sources = await loadSources();
const result = await withReadOnlyClient({
  connectionString,
  environmentLabel: 'mtg-sealed-image-release-plan-production-read-only',
  statementTimeoutMs: 180_000,
}, async (client, guard) => {
  const initialSnapshot = await captureProductionSnapshot(client, guard, sources);
  if (!initialSnapshot.valid) {
    throw new Error(`Production preflight failed: ${initialSnapshot.findings.join(',')}`);
  }
  let bundle = buildMtgSealedImageReleasePlanV1({
    ...sources,
    repositoryCommitSha: repo.head_sha,
    productionSnapshot: initialSnapshot,
  });
  const databaseFingerprintParity = await proveDatabaseFingerprintParity(client, bundle);
  const productionSnapshot = {
    ...initialSnapshot,
    database_fingerprint_parity: databaseFingerprintParity,
    valid: initialSnapshot.valid && databaseFingerprintParity.valid,
  };
  bundle = buildMtgSealedImageReleasePlanV1({
    ...sources,
    repositoryCommitSha: repo.head_sha,
    productionSnapshot,
  });
  return { bundle, productionSnapshot };
});
const validation = validateMtgSealedImageReleasePlanV1(result.bundle);
if (!validation.valid) {
  throw new Error(`Image release plan invalid: ${validation.findings.join(',')}`);
}

const runPlan = {
  ...result.bundle.plan,
  repository: repo,
  source_artifacts: sources.sourceArtifacts,
  validation,
};
const summary = {
  status: 'mtg_sealed_image_release_plan_frozen_zero_writes',
  repository: repo,
  plan_fingerprint_sha256: runPlan.plan_fingerprint_sha256,
  release_id: runPlan.release_id,
  release_manifest_fingerprint_sha256:
    runPlan.release_manifest_fingerprint_sha256,
  row_counts: Object.fromEntries(Object.entries(result.bundle.payload)
    .map(([name, rows]) => [name, rows.length])),
  exclusion_count: result.bundle.exclusions.length,
  production_preflight_valid: result.productionSnapshot.valid,
  database_fingerprint_parity:
    result.productionSnapshot.database_fingerprint_parity,
  pointer_activation_included: false,
  boundaries: runPlan.boundaries,
  zero_reconciliation_mismatches: true,
};
const report = `# MTG Sealed Image Release Plan V1\n\n` +
  `- Status: **READY, NOT APPLIED**\n` +
  `- Producer commit: \`${repo.head_sha}\`\n` +
  `- Plan fingerprint: \`${runPlan.plan_fingerprint_sha256}\`\n` +
  `- Release ID: \`${runPlan.release_id}\`\n` +
  `- Evidence / objects / assertions: \`2182 / 2141 / 2149\`\n` +
  `- Release / members: \`1 / 2149\`\n` +
  `- Preserved exclusions: \`33\`\n` +
  `- Database member and manifest hash parity: **PASS**\n` +
  `- Production source, schema, RLS, grants, and collision preflight: **PASS**\n` +
  `- Database writes: \`0\`\n` +
  `- Storage operations: \`0\`\n` +
  `- Pointer activation: \`not included\`\n\n` +
  `The next separately authorized gate inserts and freezes only the append-only ` +
  `evidence release. Pointer activation remains a later compare-and-swap gate ` +
  `after independent readback and a rollback-only pointer canary.\n`;
await writeArtifacts(args.outDir, {
  'run_plan.json': Buffer.from(`${JSON.stringify(runPlan, null, 2)}\n`),
  'production_preflight.json': Buffer.from(
    `${JSON.stringify(result.productionSnapshot, null, 2)}\n`),
  'image_evidence.jsonl.gz': gzipSync(jsonlBytes(result.bundle.payload.evidence),
    { level: 9, mtime: 0 }),
  'image_objects.jsonl.gz': gzipSync(jsonlBytes(result.bundle.payload.objects),
    { level: 9, mtime: 0 }),
  'image_assertions.jsonl.gz': gzipSync(jsonlBytes(result.bundle.payload.assertions),
    { level: 9, mtime: 0 }),
  'image_releases.jsonl': jsonlBytes(result.bundle.payload.releases),
  'image_release_members.jsonl.gz': gzipSync(
    jsonlBytes(result.bundle.payload.release_members), { level: 9, mtime: 0 }),
  'exclusions.jsonl.gz': gzipSync(jsonlBytes(result.bundle.exclusions),
    { level: 9, mtime: 0 }),
  'pointer_plan.json': Buffer.from(
    `${JSON.stringify(runPlan.pointer_transition, null, 2)}\n`),
  'summary.json': Buffer.from(`${JSON.stringify(summary, null, 2)}\n`),
  'REPORT.md': Buffer.from(report),
});
process.stdout.write(`${JSON.stringify({
  ...summary,
  output_directory: args.outDir,
  required_future_authority: runPlan.required_future_authority_template,
}, null, 2)}\n`);

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import { writeShardedRows } from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';
import {
  ALLOWED_IMAGE_POINTER_COLUMNS,
  EXPECTED_IMAGE_POINTER_ROWS,
  IMAGE_POINTER_MUTATION_CONTRACT,
  IMAGE_POINTER_PLAN_VERSION,
  buildImagePointerRows,
  computeImagePointerCodeBundle,
  createProductionSupabaseClient,
  loadPermanentStorageAssets,
  pointerPackageFingerprint,
  pointerPlanHash,
  proofHash,
  reverifyStorageAssets,
} from './image_pointer_common_v1.mjs';

const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/image_pointer_plan_v1';

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  let outputRoot = DEFAULT_OUTPUT_ROOT;
  for (const argument of argv) {
    if (argument.startsWith('--output-root=')) {
      outputRoot = argument.slice('--output-root='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return { outputRoot };
}

async function fetchCurrentRows(client, ids) {
  const { data, error } = await client
    .from('card_prints')
    .select('*')
    .in('id', ids)
    .order('gv_id');
  if (error) throw new Error(`Current row snapshot failed: ${error.message}`);
  return data ?? [];
}

function markdown(report) {
  return `# Japanese Master Index V4 Image Pointer Plan V1

Generated: ${report.generated_at}

- Mode: \`${report.status}\`
- Rows: ${report.scope.rows}
- Rollback-proof updates: ${report.scope.rollback_proof_updates}
- Already-applied no-ops: ${report.scope.already_applied_no_ops}
- Blocked rows: ${report.scope.blocked_rows}
- Storage reverified: ${report.storage_reverification.verified}/53
- Planned columns: ${report.planned_columns.join(', ')}
- Package fingerprint: \`${report.package_fingerprint_sha256}\`
- Pointer plan hash: \`${report.pointer_plan_hash_sha256}\`
- Mutation contract hash: \`${report.mutation_contract_hash_sha256}\`
- Database writes: false
- Storage writes: false
- Ready for rollback proof: ${report.ready_for_rollback_proof}

This package preserves each current \`image_url\`, \`image_source\`, and
\`representative_image_url\`. It adds the exact self-hosted \`image_path\`,
normalizes legacy \`image_status=ok\` to \`exact\`, and replaces the stale
pre-hosting image note. Every row carries complete before and expected-after
snapshots for compare-and-swap verification.
`;
}

async function main() {
  const { outputRoot } = parseArgs(process.argv.slice(2));
  dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
  dotenv.config({ quiet: true });
  const generatedAt = new Date().toISOString();
  const assets = await loadPermanentStorageAssets();
  const client = createProductionSupabaseClient();
  const [currentRows, storageRows, codeBundle] = await Promise.all([
    fetchCurrentRows(client, assets.map((asset) => asset.card_print_id)),
    reverifyStorageAssets(client, assets),
    computeImagePointerCodeBundle(),
  ]);
  const pointerRows = buildImagePointerRows(assets, currentRows, storageRows);
  const blocked = pointerRows.filter((row) => row.validation_errors.length);
  const updates = pointerRows.filter(
    (row) => row.row_disposition === 'rollback_proof_update_required',
  );
  const noOps = pointerRows.filter(
    (row) => row.row_disposition === 'already_applied_no_op',
  );
  const findings = [
    ...(assets.length !== EXPECTED_IMAGE_POINTER_ROWS ? ['asset_scope_changed'] : []),
    ...(currentRows.length !== EXPECTED_IMAGE_POINTER_ROWS ? ['database_row_scope_changed'] : []),
    ...(storageRows.length !== EXPECTED_IMAGE_POINTER_ROWS ? ['storage_scope_changed'] : []),
    ...(new Set(currentRows.map((row) => row.id)).size !== EXPECTED_IMAGE_POINTER_ROWS
      ? ['database_row_ids_not_unique'] : []),
    ...(blocked.length ? ['blocked_pointer_rows'] : []),
    ...(updates.length + noOps.length !== EXPECTED_IMAGE_POINTER_ROWS
      ? ['update_plus_noop_scope_mismatch'] : []),
  ];
  const packageFingerprint = pointerPackageFingerprint(
    assets,
    pointerRows,
    codeBundle.hash,
  );
  const planHash = pointerPlanHash(packageFingerprint, codeBundle.hash, pointerRows);
  const mutationContractHash = proofHash(IMAGE_POINTER_MUTATION_CONTRACT);
  const retrieval = {
    access_mode: 'production_https_data_api_select_plus_exact_storage_readback',
    database_reads: true,
    database_read_transport: 'postgrest_select_only',
    database_transaction_read_only: false,
    database_writes: false,
    storage_reads: true,
    storage_writes: false,
  };
  const rowDataset = await writeShardedRows({
    outputRoot,
    datasetKey: 'jpn_image_pointer_plan_rows_v1',
    packageId: `${IMAGE_POINTER_PLAN_VERSION}-ROWS`,
    rows: pointerRows,
    generatedAt,
    retrieval,
  });
  const report = {
    plan_version: IMAGE_POINTER_PLAN_VERSION,
    generated_at: generatedAt,
    status: 'complete_no_write_pointer_plan',
    target: {
      supabase_project_ref: 'ycdxbpibncqcchqiihfz',
      storage_bucket: 'user-card-images',
      table: 'public.card_prints',
    },
    source_commit: '842b3e0db4ec3256449f0490a218454303fa581f',
    source_storage: {
      permanent_plan_content_fingerprint_sha256:
        '9f124fc23f7f6dcfcfeb26f0f4a54ec4624eea426f785f124e87be81aa63c5d9',
      permanent_apply_proof_hash_sha256:
        '56c1957683e3ef444b28fe74da0aae711d70d588e70d291ab59c188da225c353',
    },
    code_bundle: codeBundle,
    package_fingerprint_sha256: packageFingerprint,
    pointer_plan_hash_sha256: planHash,
    mutation_contract: IMAGE_POINTER_MUTATION_CONTRACT,
    mutation_contract_hash_sha256: mutationContractHash,
    planned_columns: ALLOWED_IMAGE_POINTER_COLUMNS,
    preserved_columns: [
      'card_prints.image_url',
      'card_prints.image_source',
      'card_prints.representative_image_url',
      'all non-image columns',
    ],
    scope: {
      rows: pointerRows.length,
      rollback_proof_updates: updates.length,
      already_applied_no_ops: noOps.length,
      blocked_rows: blocked.length,
    },
    storage_reverification: {
      attempted: storageRows.length,
      verified: storageRows.filter((row) => row.verified).length,
      failed: storageRows.filter((row) => !row.verified).length,
      content_fingerprint_sha256: proofHash(storageRows),
    },
    current_database_snapshot: {
      rows: currentRows.length,
      content_fingerprint_sha256: proofHash(currentRows),
      read_transport: 'postgrest_select_only',
      writes_performed: false,
    },
    row_dataset: rowDataset,
    findings,
    ready_for_rollback_proof: findings.length === 0,
    execution_boundary: {
      database_reads: true,
      database_writes: false,
      storage_reads: true,
      storage_writes: false,
      image_pointer_writes: false,
      durable_changes: 0,
    },
  };
  await writeJsonArtifact(
    path.join(outputRoot, 'jpn_image_pointer_plan_v1.json'),
    buildArtifact({
      packageId: IMAGE_POINTER_PLAN_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(outputRoot, 'jpn_image_pointer_plan_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status: report.status,
    rows: pointerRows.length,
    rollback_proof_updates: updates.length,
    storage_verified: report.storage_reverification.verified,
    package_fingerprint_sha256: packageFingerprint,
    pointer_plan_hash_sha256: planHash,
    mutation_contract_hash_sha256: mutationContractHash,
    findings,
    database_writes: false,
    storage_writes: false,
    ready_for_rollback_proof: report.ready_for_rollback_proof,
  }));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

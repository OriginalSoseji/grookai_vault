import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';

import { readVerifiedArtifact } from './artifact_rows_v1.mjs';
import { stableJson } from './deterministic_artifact_v1.mjs';
import {
  ALLOWED_IMAGE_POINTER_COLUMNS,
  EXPECTED_IMAGE_POINTER_ROWS,
  IMAGE_POINTER_MUTATION_CONTRACT,
  IMAGE_POINTER_PLAN_VERSION,
  computeImagePointerCodeBundle,
  createProductionSupabaseClient,
  loadPermanentStorageAssets,
  pointerPackageFingerprint,
  pointerPlanHash,
  proofHash,
  reverifyStorageAssets,
} from './image_pointer_common_v1.mjs';
import {
  connectVerifiedDbClient,
  targetBindingFromEnvironment,
} from '../self_hosted_images_wh22_common.mjs';

const PACKAGE_ID = 'JPN-MASTER-INDEX-V4-IMAGE-POINTER-ROLLBACK-PROOF-V1';
const PLAN_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_pointer_plan_v1/'
  + 'jpn_image_pointer_plan_v1.json';
const RESULT_ROOT =
  'docs/audits/japanese_master_index_v4/image_pointer_rollback_proof_v1';

function parseArgs(argv) {
  const args = {
    execute: false,
    fingerprint: null,
    pointerPlanHash: null,
    mutationContractHash: null,
  };
  for (const argument of argv) {
    if (argument === '--execute-rollback-proof') args.execute = true;
    else if (argument.startsWith('--fingerprint=')) {
      args.fingerprint = argument.slice('--fingerprint='.length);
    } else if (argument.startsWith('--pointer-plan-hash=')) {
      args.pointerPlanHash = argument.slice('--pointer-plan-hash='.length);
    } else if (argument.startsWith('--mutation-contract-hash=')) {
      args.mutationContractHash = argument.slice('--mutation-contract-hash='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return args;
}

async function loadPointerRows(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count
    || proofHash(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error('Image pointer row dataset verification failed.');
  }
  return rows;
}

async function guardedUpdate(client, row) {
  const entries = Object.entries(row.proposed_values)
    .sort(([left], [right]) => left.localeCompare(right));
  if (proofHash(entries.map(([column]) => column))
    !== proofHash([...ALLOWED_IMAGE_POINTER_COLUMNS].sort())) {
    throw new Error(`Unsupported proposed column set: ${row.gv_id}`);
  }
  const assignments = entries
    .map(([column], index) => `${column} = $${index + 2}`)
    .join(', ');
  const beforeParam = entries.length + 2;
  const values = [
    row.target_row_id,
    ...entries.map(([, value]) => value),
    JSON.stringify(row.current_row_snapshot),
  ];
  const result = await client.query(`
    update public.card_prints as cp
       set ${assignments}
     where cp.id = $1::uuid
       and to_jsonb(cp) = $${beforeParam}::jsonb
     returning to_jsonb(cp) as row_snapshot
  `, values);
  if (result.rowCount !== 1) {
    throw new Error(`Complete-row compare-and-swap miss: ${row.gv_id}`);
  }
  const returned = result.rows[0]?.row_snapshot ?? null;
  if (proofHash(returned) !== row.expected_after_snapshot_hash) {
    throw new Error(`Expected-after row mismatch: ${row.gv_id}`);
  }
}

async function runRollbackProof(pointerRows, targetBinding) {
  const client = await connectVerifiedDbClient(targetBinding);
  let transactionOpen = false;
  let rollbackCompleted = false;
  let lockedRows = 0;
  let updatedRows = 0;
  let afterVerified = 0;
  let durableBeforeRestored = 0;
  try {
    await client.query('begin');
    transactionOpen = true;
    const locked = await client.query(`
      select to_jsonb(cp) as row_snapshot
        from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.gv_id
       for update
    `, [pointerRows.map((row) => row.target_row_id)]);
    lockedRows = locked.rowCount;
    if (lockedRows !== EXPECTED_IMAGE_POINTER_ROWS) {
      throw new Error(`Locked-row count mismatch: ${lockedRows}`);
    }
    const currentById = new Map(
      locked.rows.map((entry) => [entry.row_snapshot.id, entry.row_snapshot]),
    );
    for (const row of pointerRows) {
      const current = currentById.get(row.target_row_id);
      if (proofHash(current) !== row.current_row_snapshot_hash) {
        throw new Error(`Complete-row preflight drift: ${row.gv_id}`);
      }
    }
    for (const row of pointerRows) {
      await guardedUpdate(client, row);
      updatedRows += 1;
    }
    const after = await client.query(`
      select to_jsonb(cp) as row_snapshot
        from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.gv_id
    `, [pointerRows.map((row) => row.target_row_id)]);
    const expectedAfterById = new Map(
      pointerRows.map((row) => [row.target_row_id, row.expected_after_snapshot_hash]),
    );
    afterVerified = after.rows.filter((entry) =>
      proofHash(entry.row_snapshot) === expectedAfterById.get(entry.row_snapshot.id)).length;
    if (afterVerified !== EXPECTED_IMAGE_POINTER_ROWS) {
      throw new Error(`In-transaction after-readback mismatch: ${afterVerified}`);
    }
    await client.query('rollback');
    transactionOpen = false;
    rollbackCompleted = true;
    const durable = await client.query(`
      select to_jsonb(cp) as row_snapshot
        from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.gv_id
    `, [pointerRows.map((row) => row.target_row_id)]);
    const beforeById = new Map(
      pointerRows.map((row) => [row.target_row_id, row.current_row_snapshot_hash]),
    );
    durableBeforeRestored = durable.rows.filter((entry) =>
      proofHash(entry.row_snapshot) === beforeById.get(entry.row_snapshot.id)).length;
    if (durableBeforeRestored !== EXPECTED_IMAGE_POINTER_ROWS) {
      throw new Error(`Post-rollback durable readback mismatch: ${durableBeforeRestored}`);
    }
    return {
      locked_rows: lockedRows,
      updated_rows_inside_transaction: updatedRows,
      after_rows_verified_inside_transaction: afterVerified,
      rollback_completed: rollbackCompleted,
      durable_before_rows_restored: durableBeforeRestored,
    };
  } finally {
    if (transactionOpen) {
      try {
        await client.query('rollback');
      } catch {
        // The original failure remains authoritative.
      }
    }
    await client.end();
  }
}

async function writeResult(result) {
  await fs.mkdir(RESULT_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(RESULT_ROOT, 'jpn_image_pointer_rollback_proof_v1.json'),
    stableJson(result),
  );
  await fs.writeFile(
    path.join(RESULT_ROOT, 'jpn_image_pointer_rollback_proof_v1.md'),
    `# Japanese Master Index V4 Image Pointer Rollback Proof V1

- Status: \`${result.status}\`
- Storage reverified: ${result.storage_reverified}
- Rows locked: ${result.locked_rows}
- Rows updated inside transaction: ${result.updated_rows_inside_transaction}
- After rows verified inside transaction: ${result.after_rows_verified_inside_transaction}
- Rollback completed: ${result.rollback_completed}
- Durable before rows restored: ${result.durable_before_rows_restored}
- Durable database writes: 0
- Storage writes: 0
`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { artifact: planArtifact } = await readVerifiedArtifact(PLAN_ARTIFACT, {
    expectedPackageId: IMAGE_POINTER_PLAN_VERSION,
  });
  const plan = planArtifact.content;
  const pointerRows = await loadPointerRows(plan.row_dataset);
  const assets = await loadPermanentStorageAssets();
  const codeBundle = await computeImagePointerCodeBundle();
  const fingerprint = pointerPackageFingerprint(assets, pointerRows, codeBundle.hash);
  const planHash = pointerPlanHash(fingerprint, codeBundle.hash, pointerRows);
  const mutationContractHash = proofHash(IMAGE_POINTER_MUTATION_CONTRACT);
  if (codeBundle.hash !== plan.code_bundle.hash
    || fingerprint !== plan.package_fingerprint_sha256
    || planHash !== plan.pointer_plan_hash_sha256
    || mutationContractHash !== plan.mutation_contract_hash_sha256) {
    throw new Error('Image pointer rollback plan does not reconcile.');
  }
  if (!args.execute) {
    process.stdout.write(stableJson({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      rows: pointerRows.length,
      fingerprint,
      pointer_plan_hash: planHash,
      mutation_contract_hash: mutationContractHash,
      database_access_performed: false,
      storage_access_performed: false,
    }));
    return;
  }
  if (args.fingerprint !== fingerprint
    || args.pointerPlanHash !== planHash
    || args.mutationContractHash !== mutationContractHash) {
    throw new Error('Explicit rollback-proof fingerprint or hash mismatch.');
  }
  if (pointerRows.length !== EXPECTED_IMAGE_POINTER_ROWS
    || pointerRows.some((row) => row.row_disposition
      !== 'rollback_proof_update_required')) {
    throw new Error('Rollback-proof row scope is not exactly 53 updates.');
  }

  dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
  dotenv.config({ quiet: true });
  const supabase = createProductionSupabaseClient();
  const storageRows = await reverifyStorageAssets(supabase, assets);
  const targetBinding = await targetBindingFromEnvironment();
  if (targetBinding.supabase_project_ref !== 'ycdxbpibncqcchqiihfz'
    || targetBinding.storage_bucket !== 'user-card-images') {
    throw new Error('Rollback-proof target binding mismatch.');
  }
  const proof = await runRollbackProof(pointerRows, targetBinding);
  const result = {
    package_id: PACKAGE_ID,
    completed_at: new Date().toISOString(),
    status: proof.rollback_completed
      && proof.durable_before_rows_restored === EXPECTED_IMAGE_POINTER_ROWS
      ? 'rollback_proof_passed_zero_durable_changes'
      : 'rollback_proof_failed',
    package_fingerprint_sha256: fingerprint,
    pointer_plan_hash_sha256: planHash,
    mutation_contract_hash_sha256: mutationContractHash,
    target_binding: targetBinding,
    storage_reverified: storageRows.filter((row) => row.verified).length,
    ...proof,
    database_writes_inside_rolled_back_transaction: proof.updated_rows_inside_transaction,
    durable_database_writes: 0,
    storage_writes: 0,
    image_pointer_writes_durable: 0,
  };
  result.proof_hash_sha256 = proofHash(result);
  await writeResult(result);
  process.stdout.write(stableJson(result));
  if (result.status !== 'rollback_proof_passed_zero_durable_changes') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});

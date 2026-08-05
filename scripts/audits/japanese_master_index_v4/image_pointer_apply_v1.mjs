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
} from './image_pointer_apply_db_v1.mjs';

const PACKAGE_ID = 'JPN-MASTER-INDEX-V4-IMAGE-POINTER-APPLY-V1';
const PLAN_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_pointer_plan_v1/'
  + 'jpn_image_pointer_plan_v1.json';
const ROLLBACK_PROOF =
  'docs/audits/japanese_master_index_v4/image_pointer_rollback_proof_v1/'
  + 'jpn_image_pointer_rollback_proof_v1.json';
const RESULT_ROOT =
  'docs/audits/japanese_master_index_v4/image_pointer_apply_v1';
const REQUIRED_ROLLBACK_PROOF_HASH =
  'ce3dbf33ba7d1cdb247269a8081ac1f31e0572fdfbf5a1322271baa36bcbe185';

function parseArgs(argv) {
  const args = {
    execute: false,
    fingerprint: null,
    pointerPlanHash: null,
    mutationContractHash: null,
    rollbackProofHash: null,
  };
  for (const argument of argv) {
    if (argument === '--apply') args.execute = true;
    else if (argument.startsWith('--fingerprint=')) {
      args.fingerprint = argument.slice('--fingerprint='.length);
    } else if (argument.startsWith('--pointer-plan-hash=')) {
      args.pointerPlanHash = argument.slice('--pointer-plan-hash='.length);
    } else if (argument.startsWith('--mutation-contract-hash=')) {
      args.mutationContractHash = argument.slice('--mutation-contract-hash='.length);
    } else if (argument.startsWith('--rollback-proof-hash=')) {
      args.rollbackProofHash = argument.slice('--rollback-proof-hash='.length);
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

async function loadVerifiedRollbackProof() {
  const proof = JSON.parse(await fs.readFile(ROLLBACK_PROOF, 'utf8'));
  const { proof_hash_sha256: proofHashValue, ...proofPayload } = proof;
  if (proofHashValue !== REQUIRED_ROLLBACK_PROOF_HASH
    || proofHash(proofPayload) !== proofHashValue
    || proof.status !== 'rollback_proof_passed_zero_durable_changes'
    || proof.rollback_completed !== true
    || proof.durable_before_rows_restored !== EXPECTED_IMAGE_POINTER_ROWS
    || proof.durable_database_writes !== 0) {
    throw new Error('Required rollback proof is missing or invalid.');
  }
  return proof;
}

function validateColumnScope(row) {
  const columns = Object.keys(row.proposed_values).sort();
  if (proofHash(columns) !== proofHash([...ALLOWED_IMAGE_POINTER_COLUMNS].sort())) {
    throw new Error(`Unsupported proposed column set: ${row.gv_id}`);
  }
  return columns;
}

async function guardedUpdate(client, row) {
  const entries = Object.entries(row.proposed_values)
    .sort(([left], [right]) => left.localeCompare(right));
  validateColumnScope(row);
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

async function selectSnapshots(client, pointerRows, forUpdate = false) {
  return client.query(`
    select to_jsonb(cp) as row_snapshot
      from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.gv_id
     ${forUpdate ? 'for update' : ''}
  `, [pointerRows.map((row) => row.target_row_id)]);
}

function countMatchingSnapshots(queryResult, expectedById) {
  return queryResult.rows.filter((entry) =>
    proofHash(entry.row_snapshot) === expectedById.get(entry.row_snapshot.id)).length;
}

async function runDurableApply(pointerRows, targetBinding) {
  const client = await connectVerifiedDbClient(targetBinding);
  let transactionOpen = false;
  let commitCompleted = false;
  let lockedRows = 0;
  let updatedRows = 0;
  let beforeRowsVerified = 0;
  let afterRowsVerified = 0;
  let durableAfterRowsVerified = 0;
  try {
    await client.query('begin');
    transactionOpen = true;
    await client.query("set local lock_timeout = '10s'");
    await client.query("set local statement_timeout = '60s'");
    const locked = await selectSnapshots(client, pointerRows, true);
    lockedRows = locked.rowCount;
    if (lockedRows !== EXPECTED_IMAGE_POINTER_ROWS) {
      throw new Error(`Locked-row count mismatch: ${lockedRows}`);
    }
    const expectedBeforeById = new Map(
      pointerRows.map((row) => [row.target_row_id, row.current_row_snapshot_hash]),
    );
    beforeRowsVerified = countMatchingSnapshots(locked, expectedBeforeById);
    if (beforeRowsVerified !== EXPECTED_IMAGE_POINTER_ROWS) {
      throw new Error(`Complete-row preflight drift: ${beforeRowsVerified}`);
    }
    for (const row of pointerRows) validateColumnScope(row);
    for (const row of pointerRows) {
      await guardedUpdate(client, row);
      updatedRows += 1;
    }
    const expectedAfterById = new Map(
      pointerRows.map((row) => [row.target_row_id, row.expected_after_snapshot_hash]),
    );
    const after = await selectSnapshots(client, pointerRows);
    afterRowsVerified = countMatchingSnapshots(after, expectedAfterById);
    if (afterRowsVerified !== EXPECTED_IMAGE_POINTER_ROWS) {
      throw new Error(`In-transaction after-readback mismatch: ${afterRowsVerified}`);
    }
    await client.query('commit');
    transactionOpen = false;
    commitCompleted = true;
    const durable = await selectSnapshots(client, pointerRows);
    durableAfterRowsVerified = countMatchingSnapshots(durable, expectedAfterById);
    if (durableAfterRowsVerified !== EXPECTED_IMAGE_POINTER_ROWS) {
      throw new Error(`Post-commit durable readback mismatch: ${durableAfterRowsVerified}`);
    }
    return {
      locked_rows: lockedRows,
      before_rows_verified: beforeRowsVerified,
      updated_rows: updatedRows,
      after_rows_verified_inside_transaction: afterRowsVerified,
      commit_completed: commitCompleted,
      durable_after_rows_verified: durableAfterRowsVerified,
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
    path.join(RESULT_ROOT, 'jpn_image_pointer_apply_v1.json'),
    stableJson(result),
  );
  await fs.writeFile(
    path.join(RESULT_ROOT, 'jpn_image_pointer_apply_v1.md'),
    `# Japanese Master Index V4 Image Pointer Apply V1

- Status: \`${result.status}\`
- Storage reverified: ${result.storage_reverified}
- Rows locked: ${result.locked_rows}
- Before rows verified: ${result.before_rows_verified}
- Rows updated: ${result.updated_rows}
- After rows verified inside transaction: ${result.after_rows_verified_inside_transaction}
- Commit completed: ${result.commit_completed}
- Durable after rows verified: ${result.durable_after_rows_verified}
- Durable database writes: ${result.durable_database_writes}
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
  const rollbackProof = await loadVerifiedRollbackProof();
  const codeBundle = await computeImagePointerCodeBundle();
  const fingerprint = pointerPackageFingerprint(assets, pointerRows, codeBundle.hash);
  const planHash = pointerPlanHash(fingerprint, codeBundle.hash, pointerRows);
  const mutationContractHash = proofHash(IMAGE_POINTER_MUTATION_CONTRACT);
  if (codeBundle.hash !== plan.code_bundle.hash
    || fingerprint !== plan.package_fingerprint_sha256
    || planHash !== plan.pointer_plan_hash_sha256
    || mutationContractHash !== plan.mutation_contract_hash_sha256
    || rollbackProof.package_fingerprint_sha256 !== fingerprint
    || rollbackProof.pointer_plan_hash_sha256 !== planHash
    || rollbackProof.mutation_contract_hash_sha256 !== mutationContractHash) {
    throw new Error('Image pointer apply package does not reconcile.');
  }
  if (!args.execute) {
    process.stdout.write(stableJson({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      rows: pointerRows.length,
      fingerprint,
      pointer_plan_hash: planHash,
      mutation_contract_hash: mutationContractHash,
      rollback_proof_hash: rollbackProof.proof_hash_sha256,
      database_access_performed: false,
      storage_access_performed: false,
    }));
    return;
  }
  if (args.fingerprint !== fingerprint
    || args.pointerPlanHash !== planHash
    || args.mutationContractHash !== mutationContractHash
    || args.rollbackProofHash !== rollbackProof.proof_hash_sha256) {
    throw new Error('Explicit durable-apply fingerprint or hash mismatch.');
  }
  if (pointerRows.length !== EXPECTED_IMAGE_POINTER_ROWS
    || pointerRows.some((row) => row.row_disposition
      !== 'rollback_proof_update_required')) {
    throw new Error('Durable apply row scope is not exactly 53 frozen updates.');
  }

  dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
  dotenv.config({ quiet: true });
  const supabase = createProductionSupabaseClient();
  const storageRows = await reverifyStorageAssets(supabase, assets);
  const targetBinding = await targetBindingFromEnvironment();
  if (targetBinding.supabase_project_ref !== 'ycdxbpibncqcchqiihfz'
    || targetBinding.storage_bucket !== 'user-card-images') {
    throw new Error('Durable-apply target binding mismatch.');
  }
  const apply = await runDurableApply(pointerRows, targetBinding);
  const result = {
    package_id: PACKAGE_ID,
    completed_at: new Date().toISOString(),
    status: apply.commit_completed
      && apply.durable_after_rows_verified === EXPECTED_IMAGE_POINTER_ROWS
      ? 'applied_and_durably_verified'
      : 'apply_failed',
    package_fingerprint_sha256: fingerprint,
    pointer_plan_hash_sha256: planHash,
    mutation_contract_hash_sha256: mutationContractHash,
    rollback_proof_hash_sha256: rollbackProof.proof_hash_sha256,
    target_binding: targetBinding,
    storage_reverified: storageRows.filter((row) => row.verified).length,
    ...apply,
    durable_database_writes: apply.durable_after_rows_verified,
    storage_writes: 0,
    allowed_columns: ALLOWED_IMAGE_POINTER_COLUMNS,
  };
  result.proof_hash_sha256 = proofHash(result);
  await writeResult(result);
  process.stdout.write(stableJson(result));
  if (result.status !== 'applied_and_durably_verified') process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import {
  ALLOWED_APPLY_COLUMNS,
  FETCH_CONCURRENCY,
  OUTPUT_DIR,
  POINTER_MUTATION_CONTRACT,
  ROOT,
  computeCodeBundleHash,
  computeManifestFingerprint,
  createStorageClient,
  connectVerifiedDbClient,
  inspectStorageAsset,
  mapLimit,
  proofHash,
  readJson,
  readJsonl,
  targetBindingFromEnvironment,
  targetBindingsEqual,
  validateManifestSemantics,
} from './self_hosted_images_wh22_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-22D-RESIDUAL-GOVERNED-DB-POINTER-APPLY';
const POINTER_PACKAGE_ID = 'IMG-HOST-WH-22C-RESIDUAL-GOVERNED-DB-POINTER-DRY-RUN';
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_upload_dry_run_summary_v1.json');
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_row_manifest_v1.jsonl');
const POINTER_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22c_residual_governed_db_pointer_dry_run_summary_v1.json');
const POINTER_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22c_residual_governed_db_pointer_plan_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22d_residual_governed_db_pointer_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh22d_residual_governed_db_pointer_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22d_residual_governed_db_pointer_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh22d_residual_governed_db_pointer_apply_result_v1.md');

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null, pointerPlanHash: null, mutationContractHash: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--pointer-plan-hash') args.pointerPlanHash = argv[++index] ?? null;
    else if (arg === '--mutation-contract-hash') args.mutationContractHash = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function recomputePointerPlanHash(fingerprint, targetBinding, codeBundleHash, pointerRows) {
  return proofHash({
    package_id: POINTER_PACKAGE_ID,
    fingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundleHash,
    mutation_contract: POINTER_MUTATION_CONTRACT,
    allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
    rows: [...pointerRows]
      .sort((left, right) => left.gv_id.localeCompare(right.gv_id))
      .map((row) => ({
        target_row_id: row.target_row_id,
        gv_id: row.gv_id,
        asset_id: row.asset_id,
        manifest_before_snapshot_hash: row.manifest_before_snapshot_hash,
        manifest_after_snapshot_hash: row.manifest_after_snapshot_hash,
        proposed_values: row.proposed_values,
        target_storage_bucket: row.target_storage_bucket,
        target_storage_path: row.target_storage_path,
      })),
  });
}

function validatePointerRowsAgainstManifest(pointerRows, rowRows) {
  const errors = [];
  const manifestById = new Map(rowRows.map((row) => [row.target_row_id, row]));
  for (const pointer of pointerRows) {
    const manifest = manifestById.get(pointer.target_row_id);
    if (!manifest) {
      errors.push(`pointer_without_manifest:${pointer.target_row_id}`);
      continue;
    }
    for (const key of ['gv_id', 'asset_id', 'target_storage_bucket', 'target_storage_path']) {
      if (pointer[key] !== manifest[key]) errors.push(`pointer_${key}_mismatch:${pointer.gv_id}`);
    }
    if (proofHash(pointer.proposed_values) !== proofHash(manifest.proposed_values)) {
      errors.push(`pointer_proposed_values_mismatch:${pointer.gv_id}`);
    }
    if (pointer.manifest_before_snapshot_hash !== manifest.current_row_snapshot_hash) {
      errors.push(`pointer_before_hash_mismatch:${pointer.gv_id}`);
    }
    if (pointer.manifest_after_snapshot_hash !== manifest.expected_after_snapshot_hash) {
      errors.push(`pointer_after_hash_mismatch:${pointer.gv_id}`);
    }
  }
  return [...new Set(errors)].sort();
}

function buildPlan(sourceSummary, pointerSummary, assetRows, rowRows, pointerRows, targetBinding, codeBundle, args) {
  const fingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const pointerPlanHash = recomputePointerPlanHash(fingerprint, targetBinding, codeBundle.hash, pointerRows);
  const mutationContractHash = proofHash(POINTER_MUTATION_CONTRACT);
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);
  const pointerSemanticErrors = validatePointerRowsAgainstManifest(pointerRows, rowRows);
  const effective = pointerRows.filter((row) => row.row_disposition === 'guarded_pointer_update_required').length;
  const noOps = pointerRows.filter((row) => row.row_disposition === 'already_applied_no_op').length;
  const stopFindings = [
    ...(sourceSummary.fingerprint !== fingerprint ? ['source_manifest_fingerprint_mismatch'] : []),
    ...(pointerSummary.fingerprint !== fingerprint ? ['pointer_summary_fingerprint_mismatch'] : []),
    ...(!targetBindingsEqual(sourceSummary.target_binding, targetBinding) ? ['source_target_binding_mismatch'] : []),
    ...(!targetBindingsEqual(pointerSummary.target_binding, targetBinding) ? ['pointer_target_binding_mismatch'] : []),
    ...(sourceSummary.code_bundle_hash !== codeBundle.hash ? ['source_code_bundle_hash_mismatch'] : []),
    ...(pointerSummary.code_bundle_hash !== codeBundle.hash ? ['pointer_code_bundle_hash_mismatch'] : []),
    ...(pointerSummary.pointer_plan_hash !== pointerPlanHash ? ['pointer_plan_hash_mismatch'] : []),
    ...(pointerSummary.mutation_contract_hash !== mutationContractHash ? ['mutation_contract_hash_mismatch'] : []),
    ...(pointerSummary.ready_for_db_apply !== true ? ['wh22c_not_db_apply_ready'] : []),
    ...(rowRows.length !== 24 || pointerRows.length !== 24 ? ['pointer_row_count_not_24'] : []),
    ...(assetRows.length !== 21 ? ['asset_count_not_21'] : []),
    ...(effective + noOps !== 24 ? ['effective_plus_noop_count_not_24'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_validation_failures'] : []),
    ...(pointerSemanticErrors.length ? ['pointer_semantic_validation_failures'] : []),
  ];
  return {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    fingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    pointer_plan_hash: pointerPlanHash,
    mutation_contract_hash: mutationContractHash,
    parent_row_mappings: rowRows.length,
    unique_assets: assetRows.length,
    guarded_pointer_updates_planned: effective,
    already_applied_no_ops: noOps,
    planned_columns: ALLOWED_APPLY_COLUMNS.map((column) => `card_prints.${column}`),
    preserved_columns: ['card_prints.image_note', 'card_prints.image_alt_url', 'all other non-proposed columns'],
    compare_and_swap_fields: POINTER_MUTATION_CONTRACT.compare_and_swap_fields,
    transport: POINTER_MUTATION_CONTRACT.transport,
    one_transaction: true,
    atomicity_limitation: null,
    failure_recovery: POINTER_MUTATION_CONTRACT.failure_recovery,
    exact_row_scope_required: 24,
    storage_reverification_before_first_write: true,
    post_update_readback_required: true,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    semantic_validation_errors: semanticErrors,
    pointer_semantic_validation_errors: pointerSemanticErrors,
    stop_findings: stopFindings,
    ready_for_apply: stopFindings.length === 0,
  };
}

async function verifyAllStorageAssets(assetRows) {
  const supabase = createStorageClient();
  const results = await mapLimit(assetRows, FETCH_CONCURRENCY, async (asset) => {
    try {
      const inspection = await inspectStorageAsset(supabase, { ...asset, expected: asset.source_expected });
      return { asset_id: asset.asset_id, ...inspection };
    } catch (error) {
      return { asset_id: asset.asset_id, exists: false, valid: false, errors: [String(error?.message ?? error)] };
    }
  });
  const failures = results.filter((row) => !row.valid);
  if (failures.length) throw new Error(`Storage revalidation failed: ${JSON.stringify(failures)}`);
  return results;
}

async function guardedUpdate(client, manifestRow) {
  const entries = Object.entries(manifestRow.proposed_values).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length < 1 || entries.some(([column]) => !ALLOWED_APPLY_COLUMNS.includes(column))) {
    throw new Error(`Unsupported proposed column set: ${manifestRow.gv_id}`);
  }
  const setSql = entries.map(([column], index) => `${column} = $${index + 2}`).join(', ');
  const beforeParam = entries.length + 2;
  const values = [
    manifestRow.target_row_id,
    ...entries.map(([, value]) => value),
    JSON.stringify(manifestRow.current_row_snapshot),
  ];
  const result = await client.query(`
    update public.card_prints as cp
    set ${setSql}
    where cp.id = $1::uuid
      and to_jsonb(cp) = $${beforeParam}::jsonb
    returning to_jsonb(cp) as row_snapshot
  `, values);
  if (result.rowCount !== 1) throw new Error(`guarded_update_compare_and_swap_miss:${manifestRow.gv_id}`);
  const row = result.rows[0]?.row_snapshot ?? null;
  if (proofHash(row) !== manifestRow.expected_after_snapshot_hash) {
    throw new Error(`guarded_update_full_readback_mismatch:${manifestRow.gv_id}`);
  }
  return row;
}

async function applyPointers(plan, rowRows) {
  const client = await connectVerifiedDbClient(plan.target_binding);
  const startedAt = new Date().toISOString();
  let updatedCount = 0;
  let noOpCount = 0;
  try {
    await client.query('begin');
    const locked = await client.query(
      `select to_jsonb(cp) as row_snapshot
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.gv_id
       for update`,
      [rowRows.map((row) => row.target_row_id)],
    );
    if (locked.rowCount !== 24) throw new Error(`Locked-row count mismatch: ${locked.rowCount}`);
    const currentById = new Map(locked.rows.map((row) => [row.row_snapshot.id, row.row_snapshot]));
    for (const manifestRow of [...rowRows].sort((left, right) => left.gv_id.localeCompare(right.gv_id))) {
      const current = currentById.get(manifestRow.target_row_id);
      const currentHash = current ? proofHash(current) : null;
      if (currentHash === manifestRow.expected_after_snapshot_hash) {
        noOpCount += 1;
        continue;
      }
      if (currentHash !== manifestRow.current_row_snapshot_hash) {
        throw new Error(`Full-row preflight drift: ${manifestRow.gv_id}`);
      }
      await guardedUpdate(client, manifestRow);
      updatedCount += 1;
    }
    if (updatedCount + noOpCount !== 24) throw new Error(`Updated/no-op total mismatch: ${updatedCount}+${noOpCount}`);
    const readbackResult = await client.query(
      `select to_jsonb(cp) as row_snapshot
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.gv_id`,
      [rowRows.map((row) => row.target_row_id)],
    );
    const readback = readbackResult.rows.map((row) => row.row_snapshot);
    const expectedById = new Map(rowRows.map((row) => [row.target_row_id, row.expected_after_snapshot_hash]));
    const mismatches = readback.filter((row) => proofHash(row) !== expectedById.get(row.id));
    if (readback.length !== 24 || mismatches.length) {
      throw new Error(`Post-apply full readback mismatch: count=${readback.length}, mismatches=${mismatches.length}`);
    }
    await client.query('commit');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    await client.end();
  }
  return { startedAt, updatedCount, noOpCount };
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Approval fingerprint: \`${plan.fingerprint}\`
- Pointer plan hash: \`${plan.pointer_plan_hash}\`
- Mutation contract hash: \`${plan.mutation_contract_hash}\`
- Code bundle hash: \`${plan.code_bundle_hash}\`
- Supabase project: \`${plan.target_binding.supabase_project_ref}\`
- Parent-row mappings: ${plan.parent_row_mappings}
- Unique assets: ${plan.unique_assets}
- Guarded pointer updates planned: ${plan.guarded_pointer_updates_planned}
- Already-applied no-ops: ${plan.already_applied_no_ops}
- Transport: ${plan.transport}
- Batch atomic: ${plan.one_transaction}
- Atomicity limitation: ${plan.atomicity_limitation ?? 'none'}
- Failure recovery: ${plan.failure_recovery}
- Planned columns: ${plan.planned_columns.join(', ')}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}
- Database writes performed: ${plan.db_writes_performed}
- Storage writes performed: ${plan.storage_writes_performed}
- Migrations created: ${plan.migrations_created}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const [sourceSummary, pointerSummary, assetRows, rowRows, pointerRows, codeBundle] = await Promise.all([
    readJson(SOURCE_SUMMARY_JSON),
    readJson(POINTER_SUMMARY_JSON),
    readJsonl(ASSET_MANIFEST_JSONL),
    readJsonl(ROW_MANIFEST_JSONL),
    readJsonl(POINTER_PLAN_JSONL),
    computeCodeBundleHash(),
  ]);
  const targetBinding = await targetBindingFromEnvironment();
  const plan = buildPlan(sourceSummary, pointerSummary, assetRows, rowRows, pointerRows, targetBinding, codeBundle, args);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_MD, renderPlanMarkdown(plan), 'utf8');

  if (!args.apply) {
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      fingerprint: plan.fingerprint,
      pointer_plan_hash: plan.pointer_plan_hash,
      mutation_contract_hash: plan.mutation_contract_hash,
      code_bundle_hash: plan.code_bundle_hash,
      guarded_pointer_updates_planned: plan.guarded_pointer_updates_planned,
      already_applied_no_ops: plan.already_applied_no_ops,
      ready_for_apply: plan.ready_for_apply,
      stop_findings: plan.stop_findings,
      plan_json: path.relative(ROOT, PLAN_JSON),
      plan_md: path.relative(ROOT, PLAN_MD),
    }, null, 2));
    return;
  }

  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
  if (args.pointerPlanHash !== plan.pointer_plan_hash) throw new Error(`Pointer plan hash mismatch. Expected ${plan.pointer_plan_hash}.`);
  if (args.mutationContractHash !== plan.mutation_contract_hash) {
    throw new Error(`Mutation contract hash mismatch. Expected ${plan.mutation_contract_hash}.`);
  }

  await verifyAllStorageAssets(assetRows);
  const applied = await applyPointers(plan, rowRows);
  const result = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply_result',
    started_at: applied.startedAt,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    target_binding: plan.target_binding,
    code_bundle_hash: plan.code_bundle_hash,
    pointer_plan_hash: plan.pointer_plan_hash,
    mutation_contract_hash: plan.mutation_contract_hash,
    parent_rows_verified: 24,
    updated_count: applied.updatedCount,
    already_applied_no_op_count: applied.noOpCount,
    storage_assets_reverified: assetRows.length,
    planned_columns: plan.planned_columns,
    transport: plan.transport,
    batch_atomic: true,
    failure_recovery: plan.failure_recovery,
    db_writes_performed: applied.updatedCount > 0,
    storage_writes_performed: false,
    migrations_created: false,
  };
  result.proof_hash = proofHash(result);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- Pointer plan hash: \`${result.pointer_plan_hash}\`
- Mutation contract hash: \`${result.mutation_contract_hash}\`
- Proof hash: \`${result.proof_hash}\`
- Updated: ${result.updated_count}
- Already-applied no-ops: ${result.already_applied_no_op_count}
- Storage assets reverified: ${result.storage_assets_reverified}
- Batch atomic: ${result.batch_atomic}
- Failure recovery: ${result.failure_recovery}
- Database writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Migrations created: ${result.migrations_created}
`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

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
  computePointerPlanHash,
  connectVerifiedDbClient,
  createStorageClient,
  inspectStorageAsset,
  mapLimit,
  proofHash,
  readJson,
  readJsonl,
  targetBindingFromEnvironment,
  targetBindingsEqual,
  validateManifestSemantics,
} from './self_hosted_images_wh23_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-23D-POCKET-NATIVE-DB-POINTER-APPLY';
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_upload_dry_run_summary_v1.json');
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_row_manifest_v1.jsonl');
const POINTER_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23c_pocket_native_db_pointer_dry_run_summary_v1.json');
const POINTER_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23c_pocket_native_db_pointer_plan_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23d_pocket_native_db_pointer_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh23d_pocket_native_db_pointer_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23d_pocket_native_db_pointer_apply_result_v1.json');

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

function validatePointerRows(pointerRows, rowRows) {
  const errors = [];
  const manifestById = new Map(rowRows.map((row) => [row.target_row_id, row]));
  for (const pointer of pointerRows) {
    const manifest = manifestById.get(pointer.target_row_id);
    if (!manifest) { errors.push(`pointer_without_manifest:${pointer.target_row_id}`); continue; }
    for (const field of ['gv_id', 'number', 'asset_id', 'target_storage_bucket', 'target_storage_path']) {
      if (pointer[field] !== manifest[field]) errors.push(`pointer_${field}_mismatch:${pointer.gv_id}`);
    }
    if (pointer.manifest_before_snapshot_hash !== manifest.current_row_snapshot_hash) errors.push(`before_hash_mismatch:${pointer.gv_id}`);
    if (pointer.manifest_after_snapshot_hash !== manifest.expected_after_snapshot_hash) errors.push(`after_hash_mismatch:${pointer.gv_id}`);
    if (proofHash(pointer.proposed_values) !== proofHash(manifest.proposed_values)) errors.push(`proposed_values_mismatch:${pointer.gv_id}`);
  }
  return [...new Set(errors)].sort();
}

function buildPlan(sourceSummary, pointerSummary, assetRows, rowRows, pointerRows, targetBinding, codeBundle, args) {
  const fingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const pointerPlanHash = computePointerPlanHash(fingerprint, targetBinding, codeBundle.hash, pointerRows);
  const mutationContractHash = proofHash(POINTER_MUTATION_CONTRACT);
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);
  const pointerErrors = validatePointerRows(pointerRows, rowRows);
  const updateCount = pointerRows.filter((row) => row.row_disposition === 'guarded_pointer_update_required').length;
  const noOpCount = pointerRows.filter((row) => row.row_disposition === 'already_applied_no_op').length;
  const stopFindings = [
    ...(sourceSummary.fingerprint !== fingerprint ? ['source_manifest_fingerprint_mismatch'] : []),
    ...(pointerSummary.fingerprint !== fingerprint ? ['pointer_summary_fingerprint_mismatch'] : []),
    ...(!targetBindingsEqual(sourceSummary.target_binding, targetBinding) ? ['source_target_binding_mismatch'] : []),
    ...(!targetBindingsEqual(pointerSummary.target_binding, targetBinding) ? ['pointer_target_binding_mismatch'] : []),
    ...(sourceSummary.code_bundle_hash !== codeBundle.hash ? ['source_code_bundle_hash_mismatch'] : []),
    ...(pointerSummary.code_bundle_hash !== codeBundle.hash ? ['pointer_code_bundle_hash_mismatch'] : []),
    ...(pointerSummary.pointer_plan_hash !== pointerPlanHash ? ['pointer_plan_hash_mismatch'] : []),
    ...(pointerSummary.mutation_contract_hash !== mutationContractHash ? ['mutation_contract_hash_mismatch'] : []),
    ...(pointerSummary.ready_for_db_apply_after_storage_phase !== true ? ['wh23c_not_ready_after_storage_phase'] : []),
    ...(assetRows.length !== 27 || rowRows.length !== 27 || pointerRows.length !== 27 ? ['scope_not_exactly_27'] : []),
    ...(updateCount + noOpCount !== 27 ? ['update_plus_noop_scope_not_27'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_failure'] : []),
    ...(pointerErrors.length ? ['pointer_semantic_failure'] : []),
  ];
  return {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    fingerprint,
    pointer_plan_hash: pointerPlanHash,
    mutation_contract_hash: mutationContractHash,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    exact_row_scope_required: 27,
    guarded_pointer_updates_planned: updateCount,
    already_applied_no_ops: noOpCount,
    planned_columns: ALLOWED_APPLY_COLUMNS.map((column) => `card_prints.${column}`),
    preserved_identity: ['gv_id', 'set_id', 'set_code', 'number', 'identity_domain', 'external_ids'],
    complete_row_compare_and_swap: true,
    all_rows_locked_before_first_update: true,
    single_transaction: true,
    rollback_on_any_failure: true,
    storage_reverified_before_transaction: true,
    complete_row_readback_before_commit: true,
    stop_findings: stopFindings,
    semantic_validation_errors: semanticErrors,
    pointer_validation_errors: pointerErrors,
    ready_for_apply_after_storage_phase: stopFindings.length === 0,
    ready_for_apply_now: stopFindings.length === 0 && pointerSummary.ready_for_db_apply_now === true,
    storage_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
  };
}

async function verifyAllStorageAssets(assetRows) {
  const supabase = createStorageClient();
  const results = await mapLimit(assetRows, FETCH_CONCURRENCY, async (asset) => {
    try {
      const inspection = await inspectStorageAsset(supabase, asset);
      return { asset_id: asset.asset_id, ...inspection };
    } catch (error) {
      return { asset_id: asset.asset_id, exists: false, valid: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  });
  const failures = results.filter((row) => !row.valid);
  if (failures.length) throw new Error(`Storage revalidation failed before transaction: ${JSON.stringify(failures)}`);
  return results;
}

async function guardedUpdate(client, manifestRow) {
  const entries = Object.entries(manifestRow.proposed_values).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length !== 4 || entries.some(([column]) => !ALLOWED_APPLY_COLUMNS.includes(column))) {
    throw new Error(`Unsupported proposed column set: ${manifestRow.gv_id}`);
  }
  const assignments = entries.map(([column], index) => `${column} = $${index + 2}`).join(', ');
  const beforeParam = entries.length + 2;
  const values = [manifestRow.target_row_id, ...entries.map(([, value]) => value), JSON.stringify(manifestRow.current_row_snapshot)];
  const result = await client.query(`
    update public.card_prints as cp
       set ${assignments}
     where cp.id = $1::uuid
       and to_jsonb(cp) = $${beforeParam}::jsonb
     returning to_jsonb(cp) as row_snapshot
  `, values);
  if (result.rowCount !== 1) throw new Error(`complete_row_compare_and_swap_miss:${manifestRow.gv_id}`);
  const returned = result.rows[0]?.row_snapshot ?? null;
  if (proofHash(returned) !== manifestRow.expected_after_snapshot_hash) throw new Error(`complete_row_update_readback_mismatch:${manifestRow.gv_id}`);
}

async function applyPointers(plan, rowRows) {
  const client = await connectVerifiedDbClient(plan.target_binding);
  let updated = 0;
  let noOps = 0;
  try {
    await client.query('begin');
    const locked = await client.query(`
      select to_jsonb(cp) as row_snapshot
        from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.gv_id
       for update
    `, [rowRows.map((row) => row.target_row_id)]);
    if (locked.rowCount !== 27) throw new Error(`Locked-row count mismatch: ${locked.rowCount}`);
    const currentById = new Map(locked.rows.map((row) => [row.row_snapshot.id, row.row_snapshot]));
    for (const manifest of [...rowRows].sort((a, b) => Number(a.number) - Number(b.number))) {
      const current = currentById.get(manifest.target_row_id);
      const currentHash = current ? proofHash(current) : null;
      if (currentHash === manifest.expected_after_snapshot_hash) { noOps += 1; continue; }
      if (currentHash !== manifest.current_row_snapshot_hash) throw new Error(`Complete-row preflight drift: ${manifest.gv_id}`);
      await guardedUpdate(client, manifest);
      updated += 1;
    }
    if (updated + noOps !== 27) throw new Error(`Updated/no-op total mismatch: ${updated}+${noOps}`);
    const readbackResult = await client.query(`
      select to_jsonb(cp) as row_snapshot
        from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.gv_id
    `, [rowRows.map((row) => row.target_row_id)]);
    const expectedById = new Map(rowRows.map((row) => [row.target_row_id, row.expected_after_snapshot_hash]));
    const mismatches = readbackResult.rows.filter((entry) => proofHash(entry.row_snapshot) !== expectedById.get(entry.row_snapshot.id));
    if (readbackResult.rowCount !== 27 || mismatches.length) throw new Error(`Post-apply full readback mismatch: count=${readbackResult.rowCount}, mismatches=${mismatches.length}`);
    await client.query('commit');
  } catch (error) {
    try { await client.query('rollback'); } catch { /* Preserve original error. */ }
    throw error;
  } finally {
    await client.end();
  }
  return { updated, noOps };
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
  await fs.writeFile(PLAN_MD, `# ${PACKAGE_ID}\n\n- Mode: ${plan.mode}\n- Approval fingerprint: \`${plan.fingerprint}\`\n- Pointer plan hash: \`${plan.pointer_plan_hash}\`\n- Mutation contract hash: \`${plan.mutation_contract_hash}\`\n- Guarded updates: ${plan.guarded_pointer_updates_planned}\n- Ready after WH23B: ${plan.ready_for_apply_after_storage_phase}\n- Ready right now: ${plan.ready_for_apply_now}\n- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}\n- Single atomic transaction: true\n- Database writes performed: false\n- Storage writes performed: false\n- Migrations created: false\n`, 'utf8');
  if (!args.apply) {
    console.log(JSON.stringify({ package_id: PACKAGE_ID, mode: 'plan_only', fingerprint: plan.fingerprint, pointer_plan_hash: plan.pointer_plan_hash, mutation_contract_hash: plan.mutation_contract_hash, code_bundle_hash: plan.code_bundle_hash, ready_for_apply_after_storage_phase: plan.ready_for_apply_after_storage_phase, ready_for_apply_now: plan.ready_for_apply_now, stop_findings: plan.stop_findings, plan_json: path.relative(ROOT, PLAN_JSON) }, null, 2));
    return;
  }
  if (!plan.ready_for_apply_after_storage_phase) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
  if (args.pointerPlanHash !== plan.pointer_plan_hash) throw new Error(`Pointer plan hash mismatch. Expected ${plan.pointer_plan_hash}.`);
  if (args.mutationContractHash !== plan.mutation_contract_hash) throw new Error(`Mutation contract hash mismatch. Expected ${plan.mutation_contract_hash}.`);
  const storageVerification = await verifyAllStorageAssets(assetRows);
  const applied = await applyPointers(plan, rowRows);
  const result = {
    package_id: PACKAGE_ID,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    pointer_plan_hash: plan.pointer_plan_hash,
    mutation_contract_hash: plan.mutation_contract_hash,
    storage_assets_reverified_before_transaction: storageVerification.length,
    updated_count: applied.updated,
    already_applied_no_op_count: applied.noOps,
    batch_atomic: true,
    rollback_on_any_failure: true,
    db_writes_performed: applied.updated > 0,
    storage_writes_performed: false,
    migrations_created: false,
  };
  result.proof_hash = proofHash(result);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

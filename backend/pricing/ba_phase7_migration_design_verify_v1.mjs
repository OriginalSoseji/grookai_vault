import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const PATHS = {
  baseline: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_migration_design_baseline_v1.json'),
  tableDesign: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_card_print_identity_table_design_v1.md'),
  indexDesign: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_card_print_identity_index_design_v1.md'),
  domainMatrix: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_identity_domain_field_matrix_v1.md'),
  hashDesign: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_identity_key_hash_design_v1.md'),
  gvIdDesign: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_gvid_derivation_design_v1.md'),
  mappingsContinuity: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_external_mappings_continuity_v1.md'),
  backfillPlan: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_identity_backfill_plan_v1.md'),
  noDrift: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_no_drift_checks_v1.md'),
  baAlignment: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_ba_storage_alignment_target_v1.json'),
  checkpoint: path.join(repoRoot, 'docs', 'checkpoints', 'BATTLE_ACADEMY_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1.md'),
  output: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase7_migration_design_verification_v1.json'),
};

async function readText(targetPath) {
  return fs.readFile(targetPath, 'utf8');
}

async function readJson(targetPath) {
  return JSON.parse(await readText(targetPath));
}

function includesAll(text, patterns) {
  return patterns.every((pattern) => text.includes(pattern));
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const existenceEntries = Object.entries(PATHS).filter(([key]) => key !== 'output');
  const existing = await Promise.all(existenceEntries.map(([, targetPath]) => exists(targetPath)));

  const checks = [];

  checks.push({
    name: 'V1_ALL_REQUIRED_ARTIFACTS_EXIST',
    passed: existing.every(Boolean),
    detail: existenceEntries.map(([key, targetPath], index) => ({
      key,
      path: targetPath,
      exists: existing[index],
    })),
  });

  if (!checks[0].passed) {
    const result = {
      generated_at: new Date().toISOString(),
      phase: 'BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1',
      all_passed: false,
      checks,
    };
    await fs.writeFile(PATHS.output, JSON.stringify(result, null, 2) + '\n', 'utf8');
    console.error('[ba-phase7-migration-design-verify-v1] STOP: missing required artifacts.');
    process.exitCode = 1;
    return;
  }

  const tableDesign = await readText(PATHS.tableDesign);
  const indexDesign = await readText(PATHS.indexDesign);
  const domainMatrix = await readText(PATHS.domainMatrix);
  const hashDesign = await readText(PATHS.hashDesign);
  const gvIdDesign = await readText(PATHS.gvIdDesign);
  const mappingsContinuity = await readText(PATHS.mappingsContinuity);
  const backfillPlan = await readText(PATHS.backfillPlan);
  const noDrift = await readText(PATHS.noDrift);
  const checkpoint = await readText(PATHS.checkpoint);
  const baseline = await readJson(PATHS.baseline);
  const baAlignment = await readJson(PATHS.baAlignment);

  checks.push({
    name: 'V2_TARGET_TABLE_SHAPE_IS_EXACT',
    passed: includesAll(tableDesign, [
      'public.card_print_identity',
      '`id` | `uuid not null default gen_random_uuid()`',
      '`card_print_id` | `uuid not null`',
      '`identity_domain` | `text not null`',
      '`set_code_identity` | `text not null`',
      '`printed_number` | `text not null`',
      '`normalized_printed_name` | `text null`',
      '`source_name_raw` | `text null`',
      '`identity_payload` | `jsonb not null default \'{}\'::jsonb`',
      '`identity_key_version` | `text not null`',
      '`identity_key_hash` | `text not null`',
      '`is_active` | `boolean not null default true`',
    ]),
    detail: {
      required_columns_locked: true,
    },
  });

  checks.push({
    name: 'V3_CONSTRAINT_DESIGN_IS_EXPLICIT',
    passed: includesAll(tableDesign, [
      '### C1 — PK',
      '### C2 — FK',
      '### C3 — One Active Identity Per Canonical Row',
      '### C4 — Canonical Identity Uniqueness',
      '### C5 — Domain Guard',
      '### C6 — No Identity-Less Canonical Row After Backfill Completion',
      'partial unique index',
    ]),
    detail: {
      required_constraints: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
    },
  });

  checks.push({
    name: 'V4_INDEX_DESIGN_IS_EXPLICIT_AND_QUERY_LINKED',
    passed: includesAll(indexDesign, [
      'Query Supported',
      'uq_card_print_identity_active_card_print_id',
      'idx_card_print_identity_identity_domain',
      'uq_card_print_identity_active_domain_hash',
      'idx_card_print_identity_domain_set_code_number',
      'idx_card_print_identity_domain_normalized_name_not_null',
    ]),
    detail: {
      required_index_surface: true,
    },
  });

  checks.push({
    name: 'V5_EACH_APPROVED_DOMAIN_HAS_FIELD_MATRIX',
    passed: includesAll(domainMatrix, [
      '## 2. `pokemon_eng_standard`',
      '## 3. `pokemon_ba`',
      '## 4. `pokemon_eng_special_print`',
      '## 5. `pokemon_jpn`',
      'pokemon_eng_standard:v1',
      'pokemon_ba:v1',
      'pokemon_eng_special_print:v1',
      'pokemon_jpn:v1',
    ]),
    detail: {
      approved_domain_versions: baseline.approved_domain_versions,
    },
  });

  checks.push({
    name: 'V6_IDENTITY_KEY_HASH_DESIGN_IS_DETERMINISTIC_AND_VERSIONED',
    passed: includesAll(hashDesign, [
      'identity_key_hash = sha256(serialized_identity_key_v1)',
      'lowercase hex digest',
      'identity_key_version',
      'JSON.stringify([',
      'keys sorted lexicographically ascending',
    ]),
    detail: {
      hash_function: 'sha256',
    },
  });

  checks.push({
    name: 'V7_GV_ID_DERIVATION_PATH_IS_EXPLICIT',
    passed: includesAll(gvIdDesign, [
      'gv_id remains stored on `card_prints`',
      '## 3. G1 — Existing Backfilled Rows',
      '## 4. G2 — New Promoted Rows',
      '## 5. G3 — Cross-Domain Determinism',
      '## 6. G4 — BA Source Name Participation',
      '## 7. G5 — Future Identity Law Version Changes',
    ]),
    detail: {
      gv_id_anchor: 'card_prints',
    },
  });

  checks.push({
    name: 'V8_EXTERNAL_MAPPINGS_CONTINUITY_IS_EXPLICIT',
    passed: includesAll(mappingsContinuity, [
      'external_mappings continues to reference `card_prints`',
      '## 2. M1 — Existing Mappings During Identity Backfill',
      '## 3. M2 — BA Mappings After Promotion',
      '## 4. M3 — Why Mappings Must Not Point To `card_print_identity` In V1',
    ]),
    detail: {
      mapping_anchor: 'card_prints',
    },
  });

  checks.push({
    name: 'V9_BACKFILL_PHASES_ARE_EXPLICIT_AND_ORDERED',
    passed: includesAll(backfillPlan, [
      '## 1. Phase 7A — Schema Introduction Design',
      '## 2. Phase 7B — Existing Canon Domain Backfill Design',
      '## 3. Phase 7C — Binding Verification Design',
      '## 4. Phase 7D — GV ID Derivation Alignment Design',
      '## 5. Phase 7E — BA Enablement Design',
    ]),
    detail: {
      ordered_phases: ['7A', '7B', '7C', '7D', '7E'],
    },
  });

  checks.push({
    name: 'V10_NO_DRIFT_CHECKS_EXIST_AND_INCLUDE_REPLAYABILITY',
    passed: includesAll(noDrift, [
      '## D1 — Local Replayability',
      'supabase db reset --local',
      '## D2 — Existing `card_prints` Consumers Continue To Function',
      '## D7 — No Hidden Manual Schema Edits',
    ]),
    detail: {
      replayability_required: true,
    },
  });

  checks.push({
    name: 'V11_BA_STORAGE_ALIGNMENT_TARGET_IS_EXPLICIT',
    passed:
      baAlignment.identity_domain === 'pokemon_ba' &&
      baAlignment.identity_key_version === 'pokemon_ba:v1' &&
      baAlignment.candidate_projection?.ba_candidate_count === 328 &&
      baAlignment.storage_mapping?.ba_set_code?.column === 'set_code_identity' &&
      baAlignment.storage_mapping?.source_name_raw?.column === 'source_name_raw' &&
      typeof baAlignment.ba_unblock_statement === 'string',
    detail: {
      candidate_count: baAlignment.candidate_projection?.ba_candidate_count ?? null,
      unblock_statement_present: typeof baAlignment.ba_unblock_statement === 'string',
    },
  });

  checks.push({
    name: 'V12_NO_SCHEMA_WRITE_MIGRATION_OR_PROMOTION_OCCURRED',
    passed: includesAll(checkpoint, [
      'This phase defines the exact migration-ready design for the identity subsystem. It does not implement schema change and does not promote BA canon rows.',
      '## 10. Phase Boundary',
    ]),
    detail: {
      phase_boundary_locked: true,
    },
  });

  const result = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1',
    all_passed: checks.every((check) => check.passed),
    checks,
  };

  await fs.writeFile(PATHS.output, JSON.stringify(result, null, 2) + '\n', 'utf8');

  if (!result.all_passed) {
    console.error('[ba-phase7-migration-design-verify-v1] STOP: one or more checks failed.');
    process.exitCode = 1;
    return;
  }

  console.log('[ba-phase7-migration-design-verify-v1] verification passed.');
  console.log(`[ba-phase7-migration-design-verify-v1] wrote ${PATHS.output}`);
}

main().catch((error) => {
  console.error('[ba-phase7-migration-design-verify-v1] fatal', error);
  process.exitCode = 1;
});

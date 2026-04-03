import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const PATHS = {
  baseline: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase6_identity_architecture_baseline_v1.json'),
  contract: path.join(repoRoot, 'docs', 'contracts', 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md'),
  gvIdDecision: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase6_gvid_location_decision_v1.json'),
  mappingDecision: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase6_mapping_reference_decision_v1.json'),
  migrationStrategy: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase6_identity_migration_strategy_v1.md'),
  unblockConditions: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase6_ba_unblock_conditions_v1.json'),
  checkpoint: path.join(repoRoot, 'docs', 'checkpoints', 'BATTLE_ACADEMY_PHASE6_IDENTITY_SUBSYSTEM_ARCHITECTURE_V1.md'),
  output: path.join(repoRoot, 'docs', 'checkpoints', 'ba_phase6_identity_architecture_verification_v1.json'),
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

async function main() {
  const baseline = await readJson(PATHS.baseline);
  const contractText = await readText(PATHS.contract);
  const gvIdDecision = await readJson(PATHS.gvIdDecision);
  const mappingDecision = await readJson(PATHS.mappingDecision);
  const migrationStrategyText = await readText(PATHS.migrationStrategy);
  const unblockConditions = await readJson(PATHS.unblockConditions);
  const checkpointText = await readText(PATHS.checkpoint);

  const qChecks = ['Q1.', 'Q2.', 'Q3.', 'Q4.', 'Q5.', 'Q6.'];
  const unblockCodes = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const checks = [];

  checks.push({
    name: 'V1_MAJOR_DECISION_QUESTIONS_ANSWERED',
    passed: includesAll(contractText, qChecks),
    detail: {
      required_questions: qChecks,
    },
  });

  checks.push({
    name: 'V2_CONTRACT_DEFINES_REQUIRED_ARCHITECTURE_SURFACES',
    passed: includesAll(contractText, [
      '## 4. Ownership Boundary',
      '## 7. GV ID Location Decision',
      '## 8. Mapping Reference Model',
      '## 9. Uniqueness Law',
      '## 10. Identity Domains',
      '## 12. Migration Strategy Boundary',
      'docs/checkpoints/ba_phase6_identity_migration_strategy_v1.md',
    ]),
    detail: {
      required_sections: [
        'boundary',
        'gv_id_location',
        'mapping_reference_model',
        'uniqueness_law',
        'identity_domains',
        'migration_strategy_link',
      ],
    },
  });

  checks.push({
    name: 'V3_CARD_PRINTS_REMAINS_STABLE_CANONICAL_REFERENCE',
    passed:
      gvIdDecision.decision?.gv_id_storage_table === 'card_prints' &&
      mappingDecision.decision?.mapping_anchor_table === 'card_prints' &&
      contractText.includes('card_prints remains the durable canonical entity referenced by downstream systems'),
    detail: {
      gv_id_storage_table: gvIdDecision.decision?.gv_id_storage_table ?? null,
      mapping_anchor_table: mappingDecision.decision?.mapping_anchor_table ?? null,
    },
  });

  checks.push({
    name: 'V4_NO_VARIANT_KEY_ABUSE',
    passed: contractText.includes('No identity discriminator may be hidden inside `variant_key` as a shortcut.'),
    detail: {
      required_rule: 'No identity discriminator may be hidden inside `variant_key` as a shortcut.',
    },
  });

  checks.push({
    name: 'V5_NO_HEURISTIC_MATCHING_DEPENDENCY',
    passed:
      contractText.includes('No heuristic fields are allowed in the hash input.') &&
      contractText.includes('no domain may use fuzzy matching as identity input'),
    detail: {
      required_markers: [
        'No heuristic fields are allowed in the hash input.',
        'no domain may use fuzzy matching as identity input',
      ],
    },
  });

  checks.push({
    name: 'V6_NO_SCHEMA_WRITE_OR_CANON_PROMOTION_IN_THIS_PHASE',
    passed:
      checkpointText.includes('It does not implement schema change and does not promote BA canon rows.') &&
      migrationStrategyText.includes('No migration is written here.') &&
      baseline.baseline_facts?.current_storage_cannot_represent_ba_identity_law_directly === true,
    detail: {
      checkpoint_statement_present: checkpointText.includes(
        'It does not implement schema change and does not promote BA canon rows.',
      ),
      migration_statement_present: migrationStrategyText.includes('No migration is written here.'),
      baseline_storage_gap_locked:
        baseline.baseline_facts?.current_storage_cannot_represent_ba_identity_law_directly === true,
    },
  });

  checks.push({
    name: 'V7_BA_UNBLOCK_CONDITIONS_EXPLICIT',
    passed:
      Array.isArray(unblockConditions.ba_unblock_conditions) &&
      unblockCodes.every((code) =>
        unblockConditions.ba_unblock_conditions.some((entry) => entry.code === code),
      ),
    detail: {
      required_codes: unblockCodes,
      present_codes: Array.isArray(unblockConditions.ba_unblock_conditions)
        ? unblockConditions.ba_unblock_conditions.map((entry) => entry.code)
        : [],
    },
  });

  const result = {
    generated_at: new Date().toISOString(),
    phase: 'BA_PHASE6_IDENTITY_SUBSYSTEM_ARCHITECTURE_V1',
    all_passed: checks.every((check) => check.passed),
    checks,
  };

  await fs.writeFile(PATHS.output, JSON.stringify(result, null, 2) + '\n', 'utf8');

  if (!result.all_passed) {
    console.error('[ba-phase6-identity-architecture-verify-v1] STOP: one or more checks failed.');
    process.exitCode = 1;
    return;
  }

  console.log('[ba-phase6-identity-architecture-verify-v1] verification passed.');
  console.log(`[ba-phase6-identity-architecture-verify-v1] wrote ${PATHS.output}`);
}

main().catch((error) => {
  console.error('[ba-phase6-identity-architecture-verify-v1] fatal', error);
  process.exitCode = 1;
});

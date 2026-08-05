import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import {
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './read_only_guard_v1.mjs';
import {
  capturePreflight,
  loadManifestDataset,
  migrationCoverage,
  schemaContract,
  sortRows,
  TARGET_TABLES,
} from './payload_preflight_v1.mjs';

export const PAYLOAD_PREFLIGHT_V2_VERSION =
  'JPN-MASTER-INDEX-PAYLOAD-PREFLIGHT-V2';
export const STABLE_IDENTIFIER_NAMESPACE =
  'JPN-MASTER-INDEX-PAYLOAD-PREFLIGHT-V1';

const DEFAULT_FINAL_ROOT =
  'docs/audits/japanese_master_index_v4/complete_no_write';
const DEFAULT_UNION_MANIFEST =
  'docs/audits/japanese_master_index_v4/index/'
  + 'candidate_union_manifest_v1.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/payload_preflight_v2';

const FINAL_FILES = Object.freeze({
  direct: 'jpn_v4_direct_card_promotion_package.jsonl',
  dependent: 'jpn_v4_dependent_card_promotion_package.jsonl',
  additional: 'jpn_v4_additional_resolved_card_package.jsonl',
  sets: 'jpn_v4_set_promotion_package.jsonl',
});

export const EXPECTED_COUNTS_V2 = Object.freeze({
  direct: 38,
  dependent: 3_850,
  additional: 1_448,
  cards: 5_336,
  sets: 1_041,
});

const DATASET_SPECS_V2 = [
  ['set_rows', 'jpn_preflight_v2_set_target_rows'],
  ['card_print_rows', 'jpn_preflight_v2_card_print_target_rows'],
  ['identity_rows', 'jpn_preflight_v2_identity_target_rows'],
  ['evidence_rows', 'jpn_preflight_v2_evidence_target_rows'],
  ['family_review_rows', 'jpn_preflight_v2_family_review_target_rows'],
  ['child_printing_rows', 'jpn_preflight_v2_child_printing_target_rows'],
  ['collision_rows', 'jpn_preflight_v2_collision_rows'],
];

function parseArgs(argv) {
  const options = {
    finalRoot: DEFAULT_FINAL_ROOT,
    unionManifest: DEFAULT_UNION_MANIFEST,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    envFile: null,
    environmentLabel: 'production-read-only',
  };
  for (const argument of argv) {
    if (argument.startsWith('--final-root=')) {
      options.finalRoot = argument.slice('--final-root='.length);
    } else if (argument.startsWith('--union-manifest=')) {
      options.unionManifest = argument.slice('--union-manifest='.length);
    } else if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length);
    } else if (argument.startsWith('--environment=')) {
      options.environmentLabel = argument.slice('--environment='.length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseJsonLines(buffer, filePath) {
  const text = buffer.toString('utf8');
  try {
    return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    throw new Error(`Invalid JSONL in ${filePath}: ${error.message}`);
  }
}

async function loadFinalFile(finalRoot, filename, fingerprintManifest) {
  const filePath = path.join(finalRoot, filename);
  const buffer = await fs.readFile(filePath);
  const expected = fingerprintManifest.files[filename];
  if (!expected) throw new Error(`Final fingerprint missing: ${filename}`);
  if (buffer.length !== expected.bytes || sha256(buffer) !== expected.sha256) {
    throw new Error(`Final package fingerprint mismatch: ${filename}`);
  }
  const rows = parseJsonLines(buffer, filePath);
  if (rows.length !== expected.row_count) {
    throw new Error(`Final package row count mismatch: ${filename}`);
  }
  return rows;
}

function speciesIdFromFamily(family) {
  if (family?.species_id) return family.species_id;
  const match = String(family?.family_key ?? '').match(/^species:(.+)$/);
  return match?.[1] ?? null;
}

function normalizedPromotionLane(row, lane) {
  if (row.promotion_lane) return row.promotion_lane;
  if (row.promotion_contract?.lane === 'direct') return 'existing_set';
  if (row.promotion_contract?.lane === 'set_first') {
    return 'set_prerequisite';
  }
  return lane;
}

export function normalizeFinalCardCandidate(row, lane) {
  const family = row.family_relationship ?? {};
  const speciesId = speciesIdFromFamily(family);
  const relationshipType = family.relationship_type
    ?? (speciesId
      ? 'language_agnostic_species'
      : 'classified_non_pokemon_domain');
  return {
    ...row,
    promotion_lane: normalizedPromotionLane(row, lane),
    family_relationship: {
      confidence: family.confidence ?? null,
      family_key: family.family_key,
      family_status: family.family_status,
      relationship_type: relationshipType,
      review_status: family.review_status
        ?? 'reviewed_for_index_only_not_promoted',
      species_id: speciesId,
    },
  };
}

export function assertFinalPackage({
  direct,
  dependent,
  additional,
  sets,
  counts,
}) {
  const actual = {
    direct: direct.length,
    dependent: dependent.length,
    additional: additional.length,
    cards: direct.length + dependent.length + additional.length,
    sets: sets.length,
  };
  if (stableJson(actual) !== stableJson(EXPECTED_COUNTS_V2)) {
    throw new Error(
      `Final package counts changed: ${stableJson(actual)}`,
    );
  }
  if (
    counts.promotion?.total_cards_ready
    !== EXPECTED_COUNTS_V2.cards
  ) {
    throw new Error('Final counts do not authorize 5,336 card candidates.');
  }
  if (counts.promotion?.sets_first !== EXPECTED_COUNTS_V2.sets) {
    throw new Error('Final counts do not authorize 1,041 set candidates.');
  }
  const cards = [...direct, ...dependent, ...additional];
  const candidateKeys = cards.map((row) => row.candidate_key);
  if (new Set(candidateKeys).size !== cards.length) {
    throw new Error('Final card package contains duplicate candidate keys.');
  }
  if (cards.some((row) => (row.promotion_blockers ?? []).length > 0)) {
    throw new Error('A promotion-ready card still contains blockers.');
  }
  if (cards.some((row) => !row.image_evidence?.urls?.length)) {
    throw new Error('A promotion-ready card lacks image evidence.');
  }
  if (cards.some((row) => row.generated_public_gv_id === true)) {
    throw new Error('Final package unexpectedly generated public GV IDs.');
  }
  if (sets.some((row) => row.generated_public_route === true)) {
    throw new Error('Final package unexpectedly generated public set routes.');
  }
}

function markdown(report) {
  return `# Japanese Master Index V4 Payload Preflight V2

Generated: ${report.generated_at}

## Status

- Status: \`${report.status}\`
- Payload fingerprint: \`${report.payload_fingerprint_sha256}\`
- Final adjudication fingerprint: \`${report.source_final_fingerprint_sha256}\`
- Stable identifier namespace: \`${report.stable_identifier_namespace}\`
- Blocking collisions: ${report.summary.blocking_collisions}
- Non-blocking natural-key accommodations: ${report.summary.nonblocking_collisions}

## Proposed Rows

- Sets: ${report.summary.set_rows}
- Parent card_prints: ${report.summary.card_print_rows}
- card_print_identity: ${report.summary.identity_rows}
- Source evidence: ${report.summary.evidence_rows}
- Family review: ${report.summary.family_review_rows}
- Deferred public child printings: ${report.summary.child_printing_rows}

## Boundaries

- The database was opened in a proven read-only transaction.
- No database, Storage, image, pricing, English identity, or public child
  writes occurred.
- All 5,336 final-adjudication cards are included exactly once.
- The V1 identifier namespace is intentionally retained so the original
  3,888 reviewed candidates keep stable deterministic IDs.
- Public child rows remain blocked behind separate exact-printing,
  self-hosted-image, and visibility gates.
`;
}

async function main() {
  assertAuditOnlyArgs();
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;

  const fingerprintPath = path.join(
    options.finalRoot,
    'jpn_v4_final_fingerprints.json',
  );
  const countsPath = path.join(
    options.finalRoot,
    'jpn_v4_final_counts.json',
  );
  const fingerprintManifest = JSON.parse(
    await fs.readFile(fingerprintPath, 'utf8'),
  );
  const finalCounts = JSON.parse(await fs.readFile(countsPath, 'utf8'));
  if (fingerprintManifest.status !== 'deterministic_artifact_fingerprints') {
    throw new Error('Final adjudication fingerprint manifest is not ready.');
  }
  if (finalCounts.status !== 'complete_no_write_adjudication') {
    throw new Error('Final adjudication counts are not complete.');
  }

  const [directRaw, dependentRaw, additionalRaw, setCandidates] =
    await Promise.all([
      loadFinalFile(
        options.finalRoot,
        FINAL_FILES.direct,
        fingerprintManifest,
      ),
      loadFinalFile(
        options.finalRoot,
        FINAL_FILES.dependent,
        fingerprintManifest,
      ),
      loadFinalFile(
        options.finalRoot,
        FINAL_FILES.additional,
        fingerprintManifest,
      ),
      loadFinalFile(
        options.finalRoot,
        FINAL_FILES.sets,
        fingerprintManifest,
      ),
    ]);
  assertFinalPackage({
    direct: directRaw,
    dependent: dependentRaw,
    additional: additionalRaw,
    sets: setCandidates,
    counts: finalCounts,
  });
  const cardCandidates = sortRows([
    ...directRaw.map((row) => normalizeFinalCardCandidate(row, 'direct')),
    ...dependentRaw.map((row) =>
      normalizeFinalCardCandidate(row, 'set_prerequisite')),
    ...additionalRaw.map((row) =>
      normalizeFinalCardCandidate(row, 'set_prerequisite')),
  ], ['candidate_key']);

  const assertionKeys = new Set(cardCandidates.flatMap(
    (row) => row.source_evidence.source_assertion_keys,
  ));
  const union = await loadManifestDataset(
    options.unionManifest,
    'source_assertion_union_rows_v1',
  );
  const assertions = union.rows.filter(
    (row) => assertionKeys.has(row.assertion_key),
  );
  if (assertions.length !== assertionKeys.size) {
    throw new Error(
      `Assertion coverage mismatch: ${assertions.length} != `
      + assertionKeys.size,
    );
  }

  const repositorySchemaCoverage = await migrationCoverage();
  const generatedAt = new Date().toISOString();
  const result = await withReadOnlyClient({
    connectionString,
    environmentLabel: options.environmentLabel,
  }, async (db, guard) => {
    const schema = await schemaContract(db);
    const preflight = await capturePreflight({
      db,
      setCandidates,
      cardCandidates,
      assertions,
      schema,
    });
    return { guard, schema, preflight };
  });

  const retrieval = {
    access_mode: 'live_database_proven_read_only_plus_final_artifacts',
    database_reads: true,
    database_writes: false,
    source_fetches: false,
    storage_access: false,
    guard: result.guard,
  };
  const descriptors = {};
  const rowsByKey = {
    ...result.preflight.contracts,
    collision_rows: result.preflight.collisions,
  };
  for (const [key, datasetKey] of DATASET_SPECS_V2) {
    descriptors[key] = await writeShardedRows({
      outputRoot: options.outputRoot,
      datasetKey,
      packageId: `${PAYLOAD_PREFLIGHT_V2_VERSION}:${datasetKey}`,
      rows: rowsByKey[key],
      generatedAt,
      retrieval,
    });
  }

  const schemaArtifactPath = path.join(
    options.outputRoot,
    'jpn_payload_target_schema_contract_v2.json',
  );
  const schemaArtifactRecord = await writeJsonArtifact(
    schemaArtifactPath,
    buildArtifact({
      packageId: 'JPN-PAYLOAD-TARGET-SCHEMA-CONTRACT-V2',
      generatedAt,
      retrieval,
      content: result.schema,
    }),
  );
  const blockingCollisions = result.preflight.collisions.filter(
    (row) => row.blocking,
  );
  const missingMigrationCoverage = repositorySchemaCoverage.filter(
    (row) => row.creating_migration_paths.length === 0,
  );
  const payloadFingerprint = contentFingerprint({
    source_final_fingerprint:
      fingerprintManifest.aggregate_sha256,
    datasets: Object.fromEntries(
      Object.entries(descriptors).map(([key, value]) => [
        key,
        value.content_fingerprint_sha256,
      ]),
    ),
    live_snapshot: result.preflight.live_snapshot,
    schema_fingerprint_sha256:
      result.preflight.live_snapshot.schema_fingerprint_sha256,
    stable_identifier_namespace: STABLE_IDENTIFIER_NAMESPACE,
  });
  const status = blockingCollisions.length > 0
    ? 'blocked_by_live_collision'
    : missingMigrationCoverage.length > 0
      ? 'preflight_complete_repository_schema_drift'
      : 'preflight_complete_no_write';
  const report = {
    generated_at: generatedAt,
    generator_version: PAYLOAD_PREFLIGHT_V2_VERSION,
    status,
    payload_fingerprint_sha256: payloadFingerprint,
    source_final_fingerprint_sha256:
      fingerprintManifest.aggregate_sha256,
    source_union_manifest_fingerprint:
      union.descriptor.content_fingerprint_sha256,
    stable_identifier_namespace: STABLE_IDENTIFIER_NAMESPACE,
    final_adjudication_counts: EXPECTED_COUNTS_V2,
    summary: {
      set_rows: rowsByKey.set_rows.length,
      card_print_rows: rowsByKey.card_print_rows.length,
      identity_rows: rowsByKey.identity_rows.length,
      evidence_rows: rowsByKey.evidence_rows.length,
      family_review_rows: rowsByKey.family_review_rows.length,
      child_printing_rows: rowsByKey.child_printing_rows.length,
      blocking_collisions: blockingCollisions.length,
      nonblocking_collisions:
        result.preflight.collisions.length - blockingCollisions.length,
      repository_schema_drift_tables: missingMigrationCoverage.length,
    },
    datasets: descriptors,
    live_snapshot: result.preflight.live_snapshot,
    schema_contract: {
      fingerprint_sha256: contentFingerprint(result.schema),
      artifact_path: schemaArtifactRecord.path,
      artifact_sha256: schemaArtifactRecord.sha256,
      target_tables: TARGET_TABLES,
      column_count: result.schema.columns.length,
      constraint_count: result.schema.constraints.length,
      index_count: result.schema.indexes.length,
    },
    repository_schema_coverage: repositorySchemaCoverage,
    execution_boundary: {
      database_reads: true,
      database_transaction_read_only: true,
      database_writes: false,
      storage_writes: false,
      source_fetches: false,
      apply_payload_generated: false,
      public_child_rows_apply_eligible: false,
      english_mutation: false,
      pricing_mutation: false,
      family_promotion: false,
      promotion_approval_implied: false,
    },
    guard: result.guard,
  };
  await fs.mkdir(options.outputRoot, { recursive: true });
  await writeJsonArtifact(
    path.join(options.outputRoot, 'jpn_payload_preflight_v2.json'),
    buildArtifact({
      packageId: PAYLOAD_PREFLIGHT_V2_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_payload_preflight_v2.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status,
    payload_fingerprint_sha256: payloadFingerprint,
    summary: report.summary,
    output_root: options.outputRoot,
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

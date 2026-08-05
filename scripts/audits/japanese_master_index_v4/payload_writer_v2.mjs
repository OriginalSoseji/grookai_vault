import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import {
  buildArtifact,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  buildWriterContract,
  executeDatabaseMode,
  loadPayload,
} from './payload_writer_v1.mjs';

export const PAYLOAD_WRITER_V2_VERSION =
  'JPN-MASTER-INDEX-V4-PAYLOAD-WRITER-V2';
export const EXPECTED_PREFLIGHT_V2_FINGERPRINT =
  'b269de1cae5bb83113e9b88f27400613fca92508c681950861c62213cd6ec36b';
export const APPROVAL_ENV_V2 = 'JPN_V4_PAYLOAD_V2_APPLY_APPROVAL';

const DEFAULT_PREFLIGHT =
  'docs/audits/japanese_master_index_v4/payload_preflight_v2/'
  + 'jpn_payload_preflight_v2.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/payload_writer_v2';

function parseArgs(argv) {
  const options = {
    mode: 'plan',
    preflight: DEFAULT_PREFLIGHT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    envFile: null,
  };
  for (const argument of argv) {
    if (argument === '--dry-run') options.mode = 'dry-run';
    else if (argument === '--apply') options.mode = 'apply';
    else if (argument.startsWith('--preflight=')) {
      options.preflight = argument.slice('--preflight='.length);
    } else if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return options;
}

function markdown(report) {
  return `# Japanese Master Index V4 Payload Writer V2

Generated: ${report.generated_at}

## Status

- Mode: \`${report.mode}\`
- Status: \`${report.status}\`
- Writer payload fingerprint: \`${report.payload_fingerprint_sha256}\`
- Source preflight fingerprint: \`${report.source_preflight_fingerprint_sha256}\`
- Public child rows deferred: ${report.deferred_public_child_count}
- Durable database writes: ${report.execution_boundary.database_writes}

## Insert Scope

- Sets: ${report.counts.sets}
- Parent card_prints: ${report.counts.card_prints}
- card_print_identity: ${report.counts.card_print_identity}
- Source evidence: ${report.counts.card_print_identity_source_evidence}
- Family review: ${report.counts.card_print_family_review_queue}

## Approval Boundary

\`\`\`text
${report.required_approval_message}
\`\`\`

This V2 writer is pinned to the final 5,336-card adjudication payload. It is
insert-only and fails closed on any occupied package ID, public GV ID, set
code, active identity hash, evidence lane, or family-review lane. It never
writes child printings, Storage, images, species links, pricing, vault data,
English identities, cleanup, quarantine, or deletions.
`;
}

export async function buildWriterV2Plan(
  preflightPath = DEFAULT_PREFLIGHT,
) {
  const payload = await loadPayload(
    preflightPath,
    EXPECTED_PREFLIGHT_V2_FINGERPRINT,
  );
  const contract = buildWriterContract(payload, {
    writerVersion: PAYLOAD_WRITER_V2_VERSION,
    expectedPreflightFingerprint:
      EXPECTED_PREFLIGHT_V2_FINGERPRINT,
  });
  return { payload, contract };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });

  const { payload, contract } = await buildWriterV2Plan(
    options.preflight,
  );
  if (
    options.mode === 'apply'
    && process.env[APPROVAL_ENV_V2] !== contract.required_approval_message
  ) {
    throw new Error(
      `Exact approval missing from ${APPROVAL_ENV_V2}.`,
    );
  }

  let databaseProof = null;
  if (options.mode !== 'plan') {
    const connectionString = process.env.SUPABASE_DB_URL
      ?? process.env.DATABASE_URL
      ?? process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Database connection string is missing.');
    }
    databaseProof = await executeDatabaseMode({
      connectionString,
      mode: options.mode,
      payload,
      contract,
      applicationName: 'jpn_master_index_v4_payload_writer_v2',
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    writer_version: PAYLOAD_WRITER_V2_VERSION,
    mode: options.mode,
    status: options.mode === 'plan'
      ? 'writer_plan_complete_no_database_access'
      : options.mode === 'dry-run'
        ? 'rollback_dry_run_passed_no_durable_change'
        : 'payload_applied_and_read_back',
    ...contract,
    database_proof: databaseProof,
    execution_boundary: {
      database_reads: options.mode !== 'plan',
      transactional_insert_attempted: options.mode !== 'plan',
      database_writes: options.mode === 'apply',
      transaction_rolled_back: options.mode === 'dry-run',
      public_child_writes: false,
      storage_writes: false,
      image_writes: false,
      family_promotion: false,
      english_mutation: false,
      non_jpn_mutation: false,
      pricing_mutation: false,
      vault_mutation: false,
      deletes: false,
      truncates: false,
    },
  };
  const retrieval = {
    access_mode: options.mode === 'plan'
      ? 'verified_local_artifacts_only'
      : 'verified_local_artifacts_plus_guarded_database_transaction',
    database_reads: options.mode !== 'plan',
    database_writes: options.mode === 'apply',
    source_fetches: false,
    storage_access: false,
  };
  await fs.mkdir(options.outputRoot, { recursive: true });
  await writeJsonArtifact(
    path.join(options.outputRoot, 'jpn_payload_writer_v2.json'),
    buildArtifact({
      packageId: PAYLOAD_WRITER_V2_VERSION,
      generatedAt: report.generated_at,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_payload_writer_v2.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status: report.status,
    payload_fingerprint_sha256:
      report.payload_fingerprint_sha256,
    counts: report.counts,
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

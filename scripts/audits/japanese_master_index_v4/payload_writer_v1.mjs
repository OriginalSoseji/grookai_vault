import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  readVerifiedArtifact,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';

const { Client } = pg;

export const PAYLOAD_WRITER_VERSION =
  'JPN-MASTER-INDEX-V4-PAYLOAD-WRITER-V1';
export const EXPECTED_PREFLIGHT_FINGERPRINT =
  '14be9772c50707a8e200e3b8d63d4bf831fab0de63c63741b3253623bc26d3e3';

const DEFAULT_PREFLIGHT =
  'docs/audits/japanese_master_index_v4/payload_preflight/'
  + 'jpn_payload_preflight_v1.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/payload_writer';
const APPROVAL_ENV = 'JPN_V4_PAYLOAD_APPLY_APPROVAL';

export const CONFLICT_CONTRACT = Object.freeze({
  sets: {
    conflict_targets: ['id', 'game+code', 'code'],
    row_grain: 'one Japanese source release or product set',
    behavior: 'insert_only_fail_closed',
    winning_row_rule: 'the deterministic V4 row is the only admissible row',
    mutable_columns: [],
    immutable_columns: [
      'id',
      'game',
      'code',
      'name',
      'release_date',
      'source',
      'printed_total',
      'printed_set_abbrev',
      'set_role',
      'identity_domain_default',
      'identity_model',
    ],
  },
  card_prints: {
    conflict_targets: [
      'id',
      'gv_id',
      'set_id+number_plain+printed_identity_modifier+variant_key',
    ],
    row_grain: 'one Japanese parent card identity',
    behavior: 'insert_only_fail_closed',
    winning_row_rule: 'the deterministic V4 row is the only admissible row',
    mutable_columns: [],
    immutable_columns: [
      'id',
      'set_id',
      'set_code',
      'number_plain',
      'printed_identity_modifier',
      'variant_key',
      'identity_domain',
      'gv_id',
    ],
  },
  card_print_identity: {
    conflict_targets: ['id', 'active identity_domain+identity_key_hash'],
    row_grain: 'one active internal identity per Japanese parent card',
    behavior: 'insert_only_fail_closed',
    winning_row_rule: 'the deterministic V4 identity hash must be unused',
    mutable_columns: [],
    immutable_columns: [
      'id',
      'card_print_id',
      'identity_domain',
      'identity_key_version',
      'identity_key_hash',
    ],
  },
  card_print_identity_source_evidence: {
    conflict_targets: [
      'id',
      'card_print_identity_id+source_key+acquisition_key where active',
    ],
    row_grain: 'one preserved source assertion lane per card identity',
    behavior: 'insert_only_fail_closed',
    winning_row_rule: 'the exact preserved assertion is authoritative',
    mutable_columns: [],
    immutable_columns: [
      'id',
      'card_print_identity_id',
      'card_print_id',
      'acquisition_key',
      'source_key',
      'evidence_key_hash',
    ],
  },
  card_print_family_review_queue: {
    conflict_targets: [
      'id',
      'card_print_identity_id+family_candidate_source'
        + '+normalized_family_candidate where active',
    ],
    row_grain: 'one pending family candidate per Japanese card identity',
    behavior: 'insert_only_fail_closed',
    winning_row_rule: 'the deterministic V4 pending review row is retained',
    mutable_columns: [],
    immutable_columns: [
      'id',
      'card_print_identity_id',
      'card_print_id',
      'acquisition_key',
      'family_candidate_source',
      'normalized_family_candidate',
      'review_key_hash',
    ],
  },
});

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

async function loadRows(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count) {
    throw new Error(
      `Descriptor row count mismatch: ${rows.length} != `
      + descriptor.row_count,
    );
  }
  return rows;
}

export async function loadPayload(
  preflightPath = DEFAULT_PREFLIGHT,
  expectedPreflightFingerprint = EXPECTED_PREFLIGHT_FINGERPRINT,
) {
  const { artifact } = await readVerifiedArtifact(preflightPath);
  const report = artifact.content;
  if (report.status !== 'preflight_complete_no_write') {
    throw new Error(`Preflight is not ready: ${report.status}`);
  }
  if (
    report.payload_fingerprint_sha256
    !== expectedPreflightFingerprint
  ) {
    throw new Error(
      'Preflight fingerprint changed: '
      + report.payload_fingerprint_sha256,
    );
  }

  const descriptorKeys = [
    'set_rows',
    'card_print_rows',
    'identity_rows',
    'evidence_rows',
    'family_review_rows',
  ];
  const loaded = await Promise.all(
    descriptorKeys.map((key) => loadRows(report.datasets[key])),
  );
  const rows = Object.fromEntries(
    descriptorKeys.map((key, index) => [
      key,
      loaded[index].map((row) => row.db_row),
    ]),
  );
  const childRows = await loadRows(report.datasets.child_printing_rows);
  const collisionRows = await loadRows(report.datasets.collision_rows);

  if (childRows.some(
    (row) => row.apply_lane !== 'deferred_visibility_and_storage_gate',
  )) {
    throw new Error('A child printing escaped the deferred gate.');
  }
  if (collisionRows.some((row) => row.blocking)) {
    throw new Error('Blocking preflight collisions are present.');
  }

  return {
    preflight: report,
    rows,
    deferred_child_count: childRows.length,
  };
}

export function buildWriterContract(payload, {
  writerVersion = PAYLOAD_WRITER_VERSION,
  expectedPreflightFingerprint = EXPECTED_PREFLIGHT_FINGERPRINT,
} = {}) {
  const counts = {
    sets: payload.rows.set_rows.length,
    card_prints: payload.rows.card_print_rows.length,
    card_print_identity: payload.rows.identity_rows.length,
    card_print_identity_source_evidence:
      payload.rows.evidence_rows.length,
    card_print_family_review_queue:
      payload.rows.family_review_rows.length,
  };
  const payloadFingerprint = contentFingerprint({
    writer_version: writerVersion,
    source_preflight_fingerprint:
      payload.preflight.payload_fingerprint_sha256,
    conflict_contract: CONFLICT_CONTRACT,
    rows: payload.rows,
  });
  const approvalMessage =
    'I approve applying the Japanese V4 master identity payload only: '
    + `${counts.sets} set rows, ${counts.card_prints} parent card_print `
    + `rows, ${counts.card_print_identity} card_print_identity rows, `
    + `${counts.card_print_identity_source_evidence} source evidence `
    + `rows, and ${counts.card_print_family_review_queue} family review `
    + `rows, using writer payload fingerprint ${payloadFingerprint} and `
    + `source preflight fingerprint ${expectedPreflightFingerprint}. `
    + 'I do not approve public child printing writes, Storage writes, '
    + 'image repoints, family promotion, English mutation, non-JPN '
    + 'mutation, pricing writes, vault writes, cleanup, quarantine, '
    + 'deletion, truncation, or rows outside this Japanese V4 payload.';

  return {
    counts,
    payload_fingerprint_sha256: payloadFingerprint,
    source_preflight_fingerprint_sha256:
      payload.preflight.payload_fingerprint_sha256,
    deferred_public_child_count: payload.deferred_child_count,
    conflict_contract: CONFLICT_CONTRACT,
    required_approval_message: approvalMessage,
  };
}

async function captureEnglishFamilyFingerprint(client) {
  const species = (await client.query(`
    select
      id::text,
      national_dex_number,
      canonical_name,
      slug,
      is_form,
      coalesce(base_species_id::text, '') as base_species_id
    from public.pokemon_species
    where active
    order by national_dex_number, slug, id
  `)).rows;
  const links = (await client.query(`
    select
      s.card_print_id::text,
      s.species_id::text,
      s.role,
      s.counts_for_completion,
      s.source,
      coalesce(s.confidence::text, '') as confidence
    from public.card_print_species s
    join public.card_prints c on c.id = s.card_print_id
    where s.active
      and c.identity_domain = 'pokemon_eng_standard'
    order by s.card_print_id, s.species_id, s.role, s.id
  `)).rows;
  const speciesFingerprint = contentFingerprint(species);
  const linkFingerprint = contentFingerprint(links);
  return {
    active_species_count: species.length,
    active_species_fingerprint_sha256: speciesFingerprint,
    active_english_species_link_count: links.length,
    active_english_species_link_fingerprint_sha256: linkFingerprint,
    combined_fingerprint_sha256: contentFingerprint({
      species: speciesFingerprint,
      links: linkFingerprint,
    }),
  };
}

async function collisionCounts(client, rows) {
  const result = {};
  const checks = [
    [
      'sets',
      `select count(*)::int as count
       from public.sets
       where id = any($1::uuid[]) or code = any($2::text[])`,
      [
        rows.set_rows.map((row) => row.id),
        rows.set_rows.map((row) => row.code),
      ],
    ],
    [
      'card_prints',
      `select count(*)::int as count
       from public.card_prints
       where id = any($1::uuid[]) or gv_id = any($2::text[])`,
      [
        rows.card_print_rows.map((row) => row.id),
        rows.card_print_rows.map((row) => row.gv_id),
      ],
    ],
    [
      'card_print_identity',
      `select count(*)::int as count
       from public.card_print_identity
       where id = any($1::uuid[])
          or (
            identity_domain = 'pokemon_jpn'
            and identity_key_hash = any($2::text[])
            and is_active
          )`,
      [
        rows.identity_rows.map((row) => row.id),
        rows.identity_rows.map((row) => row.identity_key_hash),
      ],
    ],
    [
      'card_print_identity_source_evidence',
      `select count(*)::int as count
       from public.card_print_identity_source_evidence
       where id = any($1::uuid[])`,
      [rows.evidence_rows.map((row) => row.id)],
    ],
    [
      'card_print_family_review_queue',
      `select count(*)::int as count
       from public.card_print_family_review_queue
       where id = any($1::uuid[])`,
      [rows.family_review_rows.map((row) => row.id)],
    ],
  ];
  for (const [key, sql, values] of checks) {
    result[key] = (await client.query(sql, values)).rows[0].count;
  }
  return result;
}

async function insertSets(client, rows) {
  await client.query(`
    insert into public.sets (
      id, game, code, name, release_date, source, printed_total,
      printed_set_abbrev, set_role, identity_domain_default, identity_model
    )
    select
      x.id, x.game, x.code, x.name, x.release_date, x.source,
      x.printed_total, x.printed_set_abbrev, x.set_role,
      x.identity_domain_default, x.identity_model
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid, game text, code text, name text, release_date date,
      source jsonb, printed_total integer, printed_set_abbrev text,
      set_role text, identity_domain_default text, identity_model text
    )
  `, [JSON.stringify(rows)]);
}

async function insertCardPrints(client, rows) {
  await client.query(`
    insert into public.card_prints (
      id, set_id, set_code, name, number, gv_id,
      external_ids, data_quality_flags, printed_set_abbrev,
      identity_domain, printed_identity_modifier, set_identity_model,
      image_status, image_source, image_note, image_url, image_alt_url,
      representative_image_url, printed_total, rarity, regulation_mark,
      print_identity_key, variant_key, variants, ai_metadata, image_res
    )
    select
      x.id, x.set_id, x.set_code, x.name, x.number, x.gv_id,
      x.external_ids, x.data_quality_flags,
      x.printed_set_abbrev, x.identity_domain,
      x.printed_identity_modifier, x.set_identity_model, x.image_status,
      x.image_source, x.image_note, x.image_url, x.image_alt_url,
      x.representative_image_url, x.printed_total, x.rarity,
      x.regulation_mark, x.print_identity_key, x.variant_key, x.variants,
      x.ai_metadata, x.image_res
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid, set_id uuid, set_code text, name text, number text,
      number_plain text, gv_id text, external_ids jsonb,
      data_quality_flags jsonb, printed_set_abbrev text,
      identity_domain text, printed_identity_modifier text,
      set_identity_model text, image_status text, image_source text,
      image_note text, image_url text, image_alt_url text,
      representative_image_url text, printed_total integer, rarity text,
      regulation_mark text, print_identity_key text, variant_key text,
      variants jsonb, ai_metadata jsonb, image_res jsonb
    )
  `, [JSON.stringify(rows)]);
}

async function insertIdentities(client, rows) {
  await client.query(`
    insert into public.card_print_identity (
      id, card_print_id, identity_domain, set_code_identity,
      printed_number, normalized_printed_name, source_name_raw,
      identity_payload, identity_key_version, identity_key_hash, is_active
    )
    select
      x.id, x.card_print_id, x.identity_domain, x.set_code_identity,
      x.printed_number, x.normalized_printed_name, x.source_name_raw,
      x.identity_payload, x.identity_key_version, x.identity_key_hash,
      x.is_active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid, card_print_id uuid, identity_domain text,
      set_code_identity text, printed_number text,
      normalized_printed_name text, source_name_raw text,
      identity_payload jsonb, identity_key_version text,
      identity_key_hash text, is_active boolean
    )
  `, [JSON.stringify(rows)]);
}

async function insertEvidence(client, rows) {
  await client.query(`
    insert into public.card_print_identity_source_evidence (
      id, card_print_identity_id, card_print_id, acquisition_key,
      source_key, evidence_key_hash, evidence_subject, evidence_payload,
      active
    )
    select
      x.id, x.card_print_identity_id, x.card_print_id, x.acquisition_key,
      x.source_key, x.evidence_key_hash, x.evidence_subject,
      x.evidence_payload, x.active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid, card_print_identity_id uuid, card_print_id uuid,
      acquisition_key text, source_key text, evidence_key_hash text,
      evidence_subject jsonb, evidence_payload jsonb, active boolean
    )
  `, [JSON.stringify(rows)]);
}

async function insertFamilyReviews(client, rows) {
  await client.query(`
    insert into public.card_print_family_review_queue (
      id, card_print_identity_id, card_print_id, acquisition_key,
      family_status, family_candidate_source, normalized_family_candidate,
      review_status, family_link_promotion_allowed, review_key_hash,
      evidence_subject, active
    )
    select
      x.id, x.card_print_identity_id, x.card_print_id, x.acquisition_key,
      x.family_status, x.family_candidate_source,
      x.normalized_family_candidate, x.review_status,
      x.family_link_promotion_allowed, x.review_key_hash,
      x.evidence_subject, x.active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid, card_print_identity_id uuid, card_print_id uuid,
      acquisition_key text, family_status text,
      family_candidate_source text, normalized_family_candidate text,
      review_status text, family_link_promotion_allowed boolean,
      review_key_hash text, evidence_subject jsonb, active boolean
    )
  `, [JSON.stringify(rows)]);
}

async function insertPayload(client, rows) {
  await insertSets(client, rows.set_rows);
  await insertCardPrints(client, rows.card_print_rows);
  await insertIdentities(client, rows.identity_rows);
  await insertEvidence(client, rows.evidence_rows);
  await insertFamilyReviews(client, rows.family_review_rows);
}

async function exactReadback(client, rows) {
  const counts = await collisionCounts(client, rows);
  return {
    sets: counts.sets,
    card_prints: counts.card_prints,
    card_print_identity: counts.card_print_identity,
    card_print_identity_source_evidence:
      counts.card_print_identity_source_evidence,
    card_print_family_review_queue:
      counts.card_print_family_review_queue,
  };
}

function expectedReadback(contract) {
  return contract.counts;
}

function hasAnyRows(counts) {
  return Object.values(counts).some((count) => count !== 0);
}

export async function executeDatabaseMode({
  connectionString,
  mode,
  payload,
  contract,
  applicationName = 'jpn_master_index_v4_payload_writer_v1',
}) {
  const client = new Client({
    connectionString,
    application_name: applicationName,
  });
  await client.connect();
  try {
    const englishBefore = await captureEnglishFamilyFingerprint(client);
    const collisions = await collisionCounts(client, payload.rows);
    if (hasAnyRows(collisions)) {
      throw new Error(
        `Live collision gate failed: ${stableJson(collisions)}`,
      );
    }

    await client.query('begin');
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '180s'");
      await insertPayload(client, payload.rows);
      const transactionReadback = await exactReadback(
        client,
        payload.rows,
      );
      if (
        stableJson(transactionReadback)
        !== stableJson(expectedReadback(contract))
      ) {
        throw new Error(
          `Transaction readback mismatch: ${stableJson(transactionReadback)}`,
        );
      }
      const englishInside = await captureEnglishFamilyFingerprint(client);
      if (
        englishInside.combined_fingerprint_sha256
        !== englishBefore.combined_fingerprint_sha256
      ) {
        throw new Error('English family fingerprint changed in transaction.');
      }

      if (mode === 'apply') await client.query('commit');
      else await client.query('rollback');

      const durableReadback = await exactReadback(client, payload.rows);
      const expectedDurable = mode === 'apply'
        ? expectedReadback(contract)
        : Object.fromEntries(
          Object.keys(expectedReadback(contract)).map((key) => [key, 0]),
        );
      if (stableJson(durableReadback) !== stableJson(expectedDurable)) {
        throw new Error(
          `Durable readback mismatch: ${stableJson(durableReadback)}`,
        );
      }
      const englishAfter = await captureEnglishFamilyFingerprint(client);
      if (
        englishAfter.combined_fingerprint_sha256
        !== englishBefore.combined_fingerprint_sha256
      ) {
        throw new Error('English family fingerprint changed durably.');
      }
      return {
        collision_counts_before: collisions,
        transaction_readback: transactionReadback,
        durable_readback: durableReadback,
        english_family_before: englishBefore,
        english_family_after: englishAfter,
      };
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

function markdown(report) {
  return `# Japanese Master Index V4 Payload Writer

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

This writer is insert-only and fails closed on any occupied package ID,
public GV ID, set code, active identity hash, evidence lane, or family-review
lane. It never writes child printings, Storage, images, species links,
pricing, vault data, English identities, cleanup, quarantine, or deletions.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });

  const payload = await loadPayload(options.preflight);
  const contract = buildWriterContract(payload);
  if (
    options.mode === 'apply'
    && process.env[APPROVAL_ENV] !== contract.required_approval_message
  ) {
    throw new Error(
      `Exact approval missing from ${APPROVAL_ENV}.`,
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
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    writer_version: PAYLOAD_WRITER_VERSION,
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
    path.join(options.outputRoot, 'jpn_payload_writer_v1.json'),
    buildArtifact({
      packageId: PAYLOAD_WRITER_VERSION,
      generatedAt: report.generated_at,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_payload_writer_v1.md'),
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

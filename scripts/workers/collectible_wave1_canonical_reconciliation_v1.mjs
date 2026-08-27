import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import {
  COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_VERSION,
  expandCandidateGameAliasesV1,
  reconcileCollectibleCandidatesV1,
} from "../../backend/catalog/collectible_wave1_canonical_reconciliation_v1.mjs";

const { Client } = pg;
const EXPECTED_PARSER_VERSION = "COLLECTIBLE_SHADOW_PARSER_WAVE1_V1";
const FROZEN_LIVE_INPUT = Object.freeze({
  parser_run_id: "33118951166",
  parser_head_sha: "90afb4b7f33ff5b37c8c2183889bccae486b734b",
  candidate_count: 46259,
  candidate_sha256: "30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f",
});
const CANDIDATE_FILE = "candidate_index.jsonl";
const REQUIRED_INPUT_ARTIFACTS = Object.freeze([
  "run_plan.json",
  CANDIDATE_FILE,
  "validation_failures.jsonl",
  "source_snapshots.json",
  "completeness_report.json",
  "summary.json",
]);
const OUTPUT_BUCKET_FILES = Object.freeze({
  exact_existing_identity: "exact_existing_identity.jsonl",
  new_candidate: "new_candidates.jsonl",
  ambiguous_candidate: "ambiguous_candidates.jsonl",
  conflicting_candidate: "conflicting_candidates.jsonl",
  blocked_missing_game_foundation: "blocked_candidates.jsonl",
});

function parseArgs(argv) {
  const options = {
    canonicalFixture: null,
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ?? null,
    expectedCandidateSha256: null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    outDir: null,
    parserArtifactDir: null,
    parserRunId: null,
  };
  for (const token of argv) {
    if (token.startsWith("--canonical-fixture=")) {
      options.canonicalFixture = path.resolve(token.slice(20));
    } else if (token.startsWith("--db-url=")) {
      options.databaseUrl = token.slice(9);
    } else if (token.startsWith("--expected-candidate-sha256=")) {
      options.expectedCandidateSha256 = token.slice(28);
    } else if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice(20);
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice(10));
    } else if (token.startsWith("--parser-artifact-dir=")) {
      options.parserArtifactDir = path.resolve(token.slice(22));
    } else if (token.startsWith("--parser-run-id=")) {
      options.parserRunId = token.slice(16);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  if (!options.parserArtifactDir) throw new Error("--parser-artifact-dir is required");
  if (!options.parserRunId) throw new Error("--parser-run-id is required");
  if (!/^[0-9a-f]{64}$/.test(options.expectedCandidateSha256 ?? "")) {
    throw new Error("--expected-candidate-sha256 must be a lowercase SHA-256");
  }
  if (options.expectedHeadSha && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a lowercase 40-character SHA");
  }
  if (!options.canonicalFixture && !options.databaseUrl) {
    throw new Error("SUPABASE_DB_URL is required outside fixture mode");
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function currentHeadSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

async function writeBytes(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return bytes;
}

async function writeJson(file, value) {
  return writeBytes(file, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

async function writeJsonl(file, rows) {
  const text = rows.length === 0 ? "" : `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  return writeBytes(file, Buffer.from(text));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function verifyParserArtifacts(options) {
  if (!options.canonicalFixture) {
    if (options.parserRunId !== FROZEN_LIVE_INPUT.parser_run_id ||
        options.expectedCandidateSha256 !== FROZEN_LIVE_INPUT.candidate_sha256) {
      throw new Error("live reconciliation input does not match the frozen artifact tuple");
    }
  }
  const manifest = await readJson(path.join(options.parserArtifactDir, "artifact_hashes.json"));
  if (manifest?.algorithm !== "sha256" || !Array.isArray(manifest?.artifacts)) {
    throw new Error("parser artifact hash manifest is malformed");
  }
  const manifestByPath = new Map(manifest.artifacts.map((row) => [row.path, row]));
  const verified = [];
  for (const artifactPath of REQUIRED_INPUT_ARTIFACTS) {
    const expected = manifestByPath.get(artifactPath);
    if (!expected || !/^[0-9a-f]{64}$/.test(expected.sha256 ?? "")) {
      throw new Error(`parser hash manifest is missing ${artifactPath}`);
    }
    const bytes = await fs.readFile(path.join(options.parserArtifactDir, artifactPath));
    const actual = sha256(bytes);
    if (actual !== expected.sha256 || bytes.length !== expected.bytes) {
      throw new Error(`parser artifact mismatch: ${artifactPath}`);
    }
    verified.push({ path: artifactPath, bytes: bytes.length, sha256: actual });
  }
  const candidate = manifestByPath.get(CANDIDATE_FILE);
  if (candidate.sha256 !== options.expectedCandidateSha256) {
    throw new Error("candidate index does not match the approved SHA-256");
  }
  const parserPlan = await readJson(path.join(options.parserArtifactDir, "run_plan.json"));
  const parserSummary = await readJson(path.join(options.parserArtifactDir, "summary.json"));
  const completeness = await readJson(
    path.join(options.parserArtifactDir, "completeness_report.json"),
  );
  if (parserPlan?.version !== EXPECTED_PARSER_VERSION ||
      parserSummary?.version !== EXPECTED_PARSER_VERSION ||
      parserPlan?.mode !== "shadow-only" || parserSummary?.mode !== "shadow-only") {
    throw new Error("parser artifacts do not satisfy the Wave 1 contract");
  }
  if (!options.canonicalFixture &&
      (parserPlan.actual_head_sha !== FROZEN_LIVE_INPUT.parser_head_sha ||
       parserPlan.expected_head_sha !== FROZEN_LIVE_INPUT.parser_head_sha ||
       parserSummary.candidate_count !== FROZEN_LIVE_INPUT.candidate_count)) {
    throw new Error("live parser metadata does not match the frozen artifact tuple");
  }
  if (parserSummary.validation_failure_count !== 0 ||
      parserSummary.failed_source_count !== 0) {
    throw new Error("parser artifacts contain failures and cannot be reconciled");
  }
  for (const boundary of Object.values(parserSummary.boundaries ?? {})) {
    if (boundary !== false) throw new Error("parser artifact production boundary was not closed");
  }
  return { completeness, parserPlan, parserSummary, verified };
}

async function loadCandidates(options, parserSummary) {
  const text = await fs.readFile(path.join(options.parserArtifactDir, CANDIDATE_FILE), "utf8");
  const candidates = text.split(/\r?\n/).filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  if (candidates.length !== parserSummary.candidate_count) {
    throw new Error("candidate line count does not match parser summary");
  }
  const ids = new Set(candidates.map((row) => row.shadow_candidate_id));
  if (ids.size !== candidates.length) throw new Error("candidate index contains duplicate IDs");
  return candidates;
}

function requireSslTransport(databaseUrl) {
  const url = new URL(databaseUrl);
  // Preserve libpq's encrypted-but-unverified `require` semantics explicitly.
  // The current production connection does not yet supply the project CA.
  url.searchParams.set("uselibpqcompat", "true");
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

async function assertSchema(client) {
  const required = {
    games: ["id", "code", "name", "slug"],
    sets: ["id", "game", "code", "name"],
    card_prints: ["id", "game_id", "set_id", "name", "number", "variant_key", "rarity"],
    card_print_identity: ["card_print_id", "identity_domain", "set_code_identity",
      "printed_number", "normalized_printed_name", "is_active"],
    external_mappings: ["card_print_id", "source", "external_id", "active"],
  };
  const result = await client.query(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any($1::text[])
    order by table_name, ordinal_position
  `, [Object.keys(required)]);
  const actual = new Map();
  for (const row of result.rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
    actual.get(row.table_name).add(row.column_name);
  }
  const missing = [];
  for (const [table, columns] of Object.entries(required)) {
    for (const column of columns) {
      if (!actual.get(table)?.has(column)) missing.push(`${table}.${column}`);
    }
  }
  if (missing.length > 0) throw new Error(`canonical schema is missing: ${missing.join(",")}`);
  return { required_column_count: Object.values(required).flat().length, missing_columns: [] };
}

async function loadDatabaseSnapshot(databaseUrl, candidateGames) {
  const client = new Client({
    connectionString: requireSslTransport(databaseUrl),
    application_name: "collectible_wave1_canonical_reconciliation_v1_read_only",
    options: "-c default_transaction_read_only=on -c statement_timeout=120000",
  });
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    const settings = (await client.query(`
      select
        current_setting('default_transaction_read_only') as default_transaction_read_only,
        current_setting('transaction_read_only') as transaction_read_only
    `)).rows[0];
    if (settings.default_transaction_read_only !== "on" ||
        settings.transaction_read_only !== "on") {
      throw new Error("database session did not prove read-only state");
    }
    const schema = await assertSchema(client);
    const games = (await client.query(`
      select id::text, code::text, name::text, slug::text
      from public.games
      order by code, id
    `)).rows;
    const sets = (await client.query(`
      select
        s.id::text,
        s.game::text,
        s.code::text,
        s.name::text,
        g.id::text as game_id
      from public.sets s
      join public.games g
        on lower(g.code) = lower(s.game)
        or lower(g.slug) = lower(s.game)
      where lower(coalesce(s.game, '')) = any($1::text[])
      order by s.game, s.code, s.name, s.id
    `, [candidateGames])).rows;
    const cards = (await client.query(`
      select
        cp.id::text,
        cp.game_id::text,
        cp.set_id::text,
        cp.name::text,
        cp.number::text,
        cp.variant_key::text,
        cp.rarity::text,
        s.game::text as set_game,
        s.code::text as set_code,
        s.name::text as set_name,
        g.code::text as game_code,
        coalesce((
          select jsonb_agg(jsonb_build_object(
            'identity_domain', identity.identity_domain,
            'set_code_identity', identity.set_code_identity,
            'printed_number', identity.printed_number,
            'normalized_printed_name', identity.normalized_printed_name,
            'is_active', identity.is_active
          ) order by identity.identity_domain, identity.identity_key_hash)
          from public.card_print_identity identity
          where identity.card_print_id = cp.id
            and identity.is_active = true
        ), '[]'::jsonb) as identities,
        coalesce((
          select jsonb_agg(jsonb_build_object(
            'source', mapping.source,
            'external_id', mapping.external_id,
            'active', mapping.active
          ) order by mapping.source, mapping.external_id)
          from public.external_mappings mapping
          where mapping.card_print_id = cp.id
            and mapping.active = true
        ), '[]'::jsonb) as mappings
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      join public.games g
        on g.id = cp.game_id
       and (lower(g.code) = lower(s.game) or lower(g.slug) = lower(s.game))
      where lower(coalesce(g.code, '')) = any($1::text[])
         or lower(coalesce(g.slug, '')) = any($1::text[])
      order by cp.id
    `, [candidateGames])).rows;
    await client.query("rollback");
    const snapshot = { games, sets, cards };
    return {
      snapshot,
      proof: {
        database_access: true,
        database_writes: false,
        transaction_ended_with: "rollback",
        ssl_mode: "require",
        ssl_transport: "encrypted",
        certificate_authority_verification: "not_configured_for_existing_connection",
        ...settings,
        schema,
        game_count: games.length,
        candidate_game_set_count: snapshot.sets.length,
        candidate_game_card_count: cards.length,
        snapshot_sha256: sha256(stableJson(snapshot)),
      },
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function loadFixtureSnapshot(file) {
  const snapshot = await readJson(file);
  return {
    snapshot,
    proof: {
      database_access: false,
      database_writes: false,
      fixture: true,
      game_count: snapshot.games?.length ?? 0,
      candidate_game_set_count: snapshot.sets?.length ?? 0,
      candidate_game_card_count: snapshot.cards?.length ?? 0,
      snapshot_sha256: sha256(stableJson(snapshot)),
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (process.env.CATALOG_AUTOMATION_MODE !== "shadow-only") {
    throw new Error("CATALOG_AUTOMATION_MODE must equal shadow-only");
  }
  const actualHeadSha = currentHeadSha();
  if (options.expectedHeadSha && options.expectedHeadSha !== actualHeadSha) {
    throw new Error("Current HEAD does not match --expected-head-sha");
  }
  const input = await verifyParserArtifacts(options);
  const candidates = await loadCandidates(options, input.parserSummary);
  const candidateGames = [...new Set(candidates.map((row) =>
    String(row.identity_coordinates?.game ?? "").toLowerCase()).filter(Boolean))].sort();
  const candidateGameAliases = expandCandidateGameAliasesV1(candidateGames);

  const boundaries = {
    database_writes: false,
    storage_access: false,
    storage_writes: false,
    image_access: false,
    pricing_access: false,
    canonical_writes: false,
    publication_writes: false,
    vault_access: false,
    writer_dispatches: false,
  };
  const runPlan = {
    version: COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_VERSION,
    mode: "shadow-only-read-only-reconciliation",
    expected_head_sha: options.expectedHeadSha,
    actual_head_sha: actualHeadSha,
    fixture_mode: Boolean(options.canonicalFixture),
    parser_run_id: options.parserRunId,
    parser_head_sha: input.parserPlan.actual_head_sha,
    expected_candidate_sha256: options.expectedCandidateSha256,
    parser_candidate_count: input.parserSummary.candidate_count,
    candidate_games: candidateGames,
    candidate_game_aliases: candidateGameAliases,
    verified_parser_artifacts: input.verified,
    boundaries,
  };
  const artifacts = [];
  const planBytes = await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  artifacts.push({ path: "run_plan.json", bytes: planBytes.length, sha256: sha256(planBytes) });

  const canonical = options.canonicalFixture
    ? await loadFixtureSnapshot(options.canonicalFixture)
    : await loadDatabaseSnapshot(options.databaseUrl, candidateGameAliases);
  const reconciled = reconcileCollectibleCandidatesV1(candidates, canonical.snapshot);
  if (reconciled.rows.length !== candidates.length) {
    throw new Error("reconciliation output count does not match candidate input count");
  }
  const decisionCountSum = Object.values(reconciled.decision_counts)
    .reduce((sum, count) => sum + count, 0);
  if (decisionCountSum !== candidates.length) {
    throw new Error("reconciliation decision buckets do not match candidate input count");
  }

  const aggregateUnresolvedVariantCount = input.completeness.reduce((sum, row) =>
    sum + Number(row?.unresolved_variant_classes?.alternative_artwork_mapping ?? 0), 0);
  const artifactLimitations = [];
  if (aggregateUnresolvedVariantCount > reconciled.unresolved_variant_row_count) {
    artifactLimitations.push({
      limitation: "unresolved_alternative_artwork_scope_not_row_addressable",
      aggregate_source_count: aggregateUnresolvedVariantCount,
      row_addressable_count: reconciled.unresolved_variant_row_count,
      decision: "preserve_aggregate_and_block_promotion_until_parser_metadata_refinement",
    });
  }
  const summary = {
    version: COLLECTIBLE_WAVE1_CANONICAL_RECONCILIATION_VERSION,
    mode: "shadow-only-read-only-reconciliation",
    status: artifactLimitations.length > 0 ||
        (reconciled.decision_counts.blocked_missing_game_foundation ?? 0) > 0
      ? "completed_with_blockers"
      : "completed",
    parser_run_id: options.parserRunId,
    parser_candidate_sha256: options.expectedCandidateSha256,
    selected_candidate_count: candidates.length,
    reconciled_candidate_count: reconciled.rows.length,
    decision_bucket_count_sum: decisionCountSum,
    decision_counts: reconciled.decision_counts,
    unresolved_variant_row_count: reconciled.unresolved_variant_row_count,
    unresolved_variant_aggregate_source_count: aggregateUnresolvedVariantCount,
    artifact_limitation_count: artifactLimitations.length,
    database_proof: canonical.proof,
    boundaries,
    completed_at: new Date().toISOString(),
  };

  const outputSets = [
    ["reconciliation_index.jsonl", reconciled.rows, writeJsonl],
    ...Object.entries(OUTPUT_BUCKET_FILES).map(([decision, file]) => [
      file,
      reconciled.rows.filter((row) => row.decision === decision),
      writeJsonl,
    ]),
    ["unresolved_variants.jsonl",
      reconciled.rows.filter((row) => row.unresolved_variant_evidence), writeJsonl],
    ["artifact_limitations.json", artifactLimitations, writeJson],
    ["database_snapshot_summary.json", canonical.proof, writeJson],
    ["summary.json", summary, writeJson],
  ];
  for (const [name, value, writer] of outputSets) {
    const bytes = await writer(path.join(options.outDir, name), value);
    artifacts.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts,
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

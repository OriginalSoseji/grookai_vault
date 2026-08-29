import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import {
  COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
  buildCollectibleWave1CardIdentityProposalV1,
} from "../../backend/catalog/collectible_wave1_card_identity_proposal_v1.mjs";
import {
  COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION,
  COLLECTIBLE_WAVE1_GAMES,
} from "../../backend/catalog/collectible_wave1_game_foundations_v1.mjs";

const { Client } = pg;
const FROZEN_INPUTS = Object.freeze({
  parser: Object.freeze({
    run_id: "33118951166",
    head_sha: "90afb4b7f33ff5b37c8c2183889bccae486b734b",
    candidate_count: 46259,
    candidate_sha256: "30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f",
  }),
  alternative_artwork: Object.freeze({
    run_id: "33132457407",
    head_sha: "23c6bb77941916f4bbcfd3b1f703fa0a1b7700e8",
    row_count: 124,
    index_sha256: "ac33edbe569b8a1bb020366780182c4d3f293291fde46a10d8f76b257cbacddf",
  }),
  selected_sets: Object.freeze({
    row_count: 505,
    yugioh_count: 500,
    gundam_count: 5,
    payload_sha256: "2c07787bf965909a2b9f0a6296e45d6a2407c7faf28d70069c23a305beec7144",
    canonical_payload_fingerprint_sha256:
      "fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668",
  }),
});
const PARSER_REQUIRED_ARTIFACTS = Object.freeze([
  "run_plan.json",
  "candidate_index.jsonl",
  "validation_failures.jsonl",
  "source_snapshots.json",
  "completeness_report.json",
  "summary.json",
]);
const ALT_REQUIRED_ARTIFACTS = Object.freeze([
  "run_plan.json",
  "candidate_index.jsonl",
  "alternative_artwork_index.jsonl",
  "validation_failures.jsonl",
  "source_snapshots.json",
  "completeness_report.json",
  "summary.json",
]);

function parseArgs(argv) {
  const options = {
    altArtArtifactDir: null,
    databaseFixture: null,
    databaseUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    outDir: null,
    parserArtifactDir: null,
    setApplyPayload: null,
  };
  for (const token of argv) {
    if (token.startsWith("--alt-art-artifact-dir=")) {
      options.altArtArtifactDir = path.resolve(token.slice(23));
    } else if (token.startsWith("--database-fixture=")) {
      options.databaseFixture = path.resolve(token.slice(19));
    } else if (token.startsWith("--db-url=")) {
      options.databaseUrl = token.slice(9);
    } else if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice(20);
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice(10));
    } else if (token.startsWith("--parser-artifact-dir=")) {
      options.parserArtifactDir = path.resolve(token.slice(22));
    } else if (token.startsWith("--set-apply-payload=")) {
      options.setApplyPayload = path.resolve(token.slice(20));
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  for (const [field, flag] of [
    ["outDir", "--out-dir"],
    ["parserArtifactDir", "--parser-artifact-dir"],
    ["altArtArtifactDir", "--alt-art-artifact-dir"],
    ["setApplyPayload", "--set-apply-payload"],
  ]) {
    if (!options[field]) throw new Error(`${flag} is required`);
  }
  if (options.expectedHeadSha && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a lowercase 40-character SHA");
  }
  if (!options.databaseFixture && !options.databaseUrl) {
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
    return `{${Object.keys(value).sort().map((field) =>
      `${JSON.stringify(field)}:${stableJson(value[field])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function rowsFingerprint(namedRows) {
  const hash = crypto.createHash("sha256");
  for (const [name, rows] of namedRows) {
    hash.update(name);
    hash.update("\u0000");
    for (const row of rows) {
      hash.update(stableJson(row));
      hash.update("\n");
    }
  }
  return hash.digest("hex");
}

function currentHeadSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function readJsonl(file) {
  const text = await fs.readFile(file, "utf8");
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
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

async function verifyArtifactDirectory(directory, requiredPaths) {
  const manifest = await readJson(path.join(directory, "artifact_hashes.json"));
  if (manifest?.algorithm !== "sha256" || !Array.isArray(manifest?.artifacts)) {
    throw new Error(`artifact manifest is malformed: ${directory}`);
  }
  const byPath = new Map(manifest.artifacts.map((row) => [row.path, row]));
  const verified = [];
  for (const artifactPath of requiredPaths) {
    const expected = byPath.get(artifactPath);
    if (!expected || !/^[0-9a-f]{64}$/.test(expected.sha256 ?? "")) {
      throw new Error(`artifact manifest is missing ${artifactPath}`);
    }
    const bytes = await fs.readFile(path.join(directory, artifactPath));
    const actual = sha256(bytes);
    if (actual !== expected.sha256 || bytes.length !== expected.bytes) {
      throw new Error(`artifact hash or byte mismatch: ${artifactPath}`);
    }
    verified.push({ path: artifactPath, bytes: bytes.length, sha256: actual });
  }
  return { byPath, verified };
}

async function loadFrozenInputs(options) {
  const parser = await verifyArtifactDirectory(
    options.parserArtifactDir,
    PARSER_REQUIRED_ARTIFACTS,
  );
  const parserPlan = await readJson(path.join(options.parserArtifactDir, "run_plan.json"));
  const parserSummary = await readJson(path.join(options.parserArtifactDir, "summary.json"));
  if (parser.byPath.get("candidate_index.jsonl")?.sha256 !==
        FROZEN_INPUTS.parser.candidate_sha256 ||
      parserPlan?.actual_head_sha !== FROZEN_INPUTS.parser.head_sha ||
      parserPlan?.expected_head_sha !== FROZEN_INPUTS.parser.head_sha ||
      parserSummary?.candidate_count !== FROZEN_INPUTS.parser.candidate_count ||
      parserSummary?.validation_failure_count !== 0 ||
      parserSummary?.failed_source_count !== 0 || parserSummary?.mode !== "shadow-only") {
    throw new Error("parser artifact does not match the frozen Wave 1 tuple");
  }
  const candidates = await readJsonl(path.join(
    options.parserArtifactDir,
    "candidate_index.jsonl",
  ));
  if (candidates.length !== FROZEN_INPUTS.parser.candidate_count) {
    throw new Error("parser candidate count does not match the frozen tuple");
  }

  const alt = await verifyArtifactDirectory(
    options.altArtArtifactDir,
    ALT_REQUIRED_ARTIFACTS,
  );
  const altPlan = await readJson(path.join(options.altArtArtifactDir, "run_plan.json"));
  const altSummary = await readJson(path.join(options.altArtArtifactDir, "summary.json"));
  if (alt.byPath.get("alternative_artwork_index.jsonl")?.sha256 !==
        FROZEN_INPUTS.alternative_artwork.index_sha256 ||
      altPlan?.actual_head_sha !== FROZEN_INPUTS.alternative_artwork.head_sha ||
      altPlan?.expected_head_sha !== FROZEN_INPUTS.alternative_artwork.head_sha ||
      altSummary?.alternative_artwork_source_card_count !==
        FROZEN_INPUTS.alternative_artwork.row_count ||
      altSummary?.validation_failure_count !== 0) {
    throw new Error("alternative artwork artifact does not match the frozen tuple");
  }
  const alternativeArtworkRows = await readJsonl(path.join(
    options.altArtArtifactDir,
    "alternative_artwork_index.jsonl",
  ));
  if (alternativeArtworkRows.length !== FROZEN_INPUTS.alternative_artwork.row_count) {
    throw new Error("alternative artwork row count does not match the frozen tuple");
  }

  const setBytes = await fs.readFile(options.setApplyPayload);
  if (sha256(setBytes) !== FROZEN_INPUTS.selected_sets.payload_sha256) {
    throw new Error("selected set apply payload does not match the frozen SHA-256");
  }
  const selectedSetRows = setBytes.toString("utf8").split(/\r?\n/)
    .filter((line) => line.trim()).map((line) => JSON.parse(line));
  const byGame = Object.groupBy(selectedSetRows, (row) => row.game);
  if (selectedSetRows.length !== FROZEN_INPUTS.selected_sets.row_count ||
      (byGame.yugioh?.length ?? 0) !== FROZEN_INPUTS.selected_sets.yugioh_count ||
      (byGame.gundam?.length ?? 0) !== FROZEN_INPUTS.selected_sets.gundam_count) {
    throw new Error("selected set payload partition does not match the frozen tuple");
  }
  return {
    alternativeArtworkRows,
    candidates,
    selectedSetRows,
    verified: {
      parser: parser.verified,
      alternative_artwork: alt.verified,
      selected_set_payload: {
        path: path.basename(options.setApplyPayload),
        bytes: setBytes.length,
        sha256: sha256(setBytes),
      },
    },
  };
}

function requireSslTransport(databaseUrl) {
  const url = new URL(databaseUrl);
  url.searchParams.set("uselibpqcompat", "true");
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

function dateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ?? null;
}

function expectedPersistedSetRow(row) {
  return {
    id: row.id,
    game: row.game,
    code: row.code,
    name: row.name,
    release_date: dateOnly(row.release_date),
    source: {
      ...row.source,
      canonical_apply_version: "COLLECTIBLE_WAVE1_SET_FOUNDATIONS_V1",
      canonical_payload_fingerprint_sha256:
        FROZEN_INPUTS.selected_sets.canonical_payload_fingerprint_sha256,
    },
    printed_total: row.printed_total ?? null,
    printed_set_abbrev: row.printed_set_abbrev ?? null,
    set_role: row.set_role ?? null,
    identity_domain_default: row.identity_domain_default ?? null,
    identity_model: row.identity_model,
    logo_url: row.logo_url ?? null,
    symbol_url: row.symbol_url ?? null,
    hero_image_url: row.hero_image_url ?? null,
    hero_image_source: row.hero_image_source ?? null,
  };
}

function actualPersistedSetRow(row) {
  return {
    id: row.id,
    game: row.game,
    code: row.code,
    name: row.name,
    release_date: dateOnly(row.release_date),
    source: row.source,
    printed_total: row.printed_total ?? null,
    printed_set_abbrev: row.printed_set_abbrev ?? null,
    set_role: row.set_role ?? null,
    identity_domain_default: row.identity_domain_default ?? null,
    identity_model: row.identity_model,
    logo_url: row.logo_url ?? null,
    symbol_url: row.symbol_url ?? null,
    hero_image_url: row.hero_image_url ?? null,
    hero_image_source: row.hero_image_source ?? null,
  };
}

export function setReadbackFindings(
  expectedRows,
  actualRows,
  games,
  controls,
  cardCount,
) {
  const findings = [];
  const expectedById = new Map(expectedRows.map((row) => [row.id, row]));
  if (actualRows.length !== expectedRows.length) findings.push("selected_set_count_mismatch");
  for (const actual of actualRows) {
    const expected = expectedById.get(actual.id);
    if (!expected) {
      findings.push(`unexpected_set:${actual.id}`);
      continue;
    }
    if (stableJson(actualPersistedSetRow(actual)) !==
        stableJson(expectedPersistedSetRow(expected))) {
      findings.push(`selected_set_row_mismatch:${actual.id}`);
    }
  }
  const sortedGames = [...games].sort((left, right) => left.code.localeCompare(right.code));
  const expectedGames = [...COLLECTIBLE_WAVE1_GAMES]
    .map((row) => ({ ...row }))
    .sort((left, right) => left.code.localeCompare(right.code));
  if (stableJson(sortedGames) !== stableJson(expectedGames)) {
    findings.push("game_foundations_mismatch");
  }
  for (const game of ["yugioh", "gundam"]) {
    const control = controls.find((row) => row.game_code === game);
    if (!control || control.release_status !== "hidden" ||
        control.release_version !== COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_VERSION) {
      findings.push(`hidden_release_control_mismatch:${game}`);
    }
  }
  if (Number(cardCount) !== 0) findings.push("target_set_card_count_not_zero");
  return [...new Set(findings)].sort();
}

async function loadProductionReadback(databaseUrl, selectedSetRows) {
  const client = new Client({
    connectionString: requireSslTransport(databaseUrl),
    application_name: "collectible_wave1_card_identity_proposal_v1_read_only",
    options: "-c default_transaction_read_only=on -c statement_timeout=180000",
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
    const setIds = selectedSetRows.map((row) => row.id);
    const sets = (await client.query(`
      select id::text, game::text, code::text, name::text,
        release_date, source, printed_total,
        printed_set_abbrev::text, set_role::text,
        identity_domain_default::text, identity_model::text,
        logo_url::text, symbol_url::text, hero_image_url::text,
        hero_image_source::text
      from public.sets
      where id = any($1::uuid[])
      order by id
    `, [setIds])).rows;
    const games = (await client.query(`
      select id::text, code::text, name::text, slug::text
      from public.games
      where code in ('yugioh', 'gundam')
      order by code
    `)).rows;
    const controls = (await client.query(`
      select game_code::text, release_status::text, release_version::text
      from public.catalog_game_release_controls
      where game_code in ('yugioh', 'gundam')
      order by game_code
    `)).rows;
    const cardCount = (await client.query(`
      select count(*)::int as count
      from public.card_prints
      where set_id = any($1::uuid[])
    `, [setIds])).rows[0]?.count ?? 0;
    const findings = setReadbackFindings(
      selectedSetRows,
      sets,
      games,
      controls,
      cardCount,
    );
    await client.query("rollback");
    if (findings.length > 0) {
      throw new Error(`production selected-set readback failed: ${findings.join(",")}`);
    }
    return {
      fixture: false,
      database_access: true,
      database_writes: false,
      transaction_ended_with: "rollback",
      ...settings,
      selected_set_count: sets.length,
      selected_set_sha256: sha256(stableJson(sets)),
      game_foundation_count: games.length,
      hidden_release_control_count: controls.length,
      target_set_card_count: Number(cardCount),
      finding_count: 0,
      findings: [],
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function loadFixtureReadback(file, selectedSetRows) {
  const fixture = await readJson(file);
  const findings = setReadbackFindings(
    selectedSetRows,
    fixture.sets ?? [],
    fixture.games ?? [],
    fixture.controls ?? [],
    fixture.target_set_card_count ?? 0,
  );
  if (findings.length > 0) {
    throw new Error(`fixture selected-set readback failed: ${findings.join(",")}`);
  }
  return {
    fixture: true,
    database_access: false,
    database_writes: false,
    selected_set_count: fixture.sets.length,
    game_foundation_count: fixture.games.length,
    hidden_release_control_count: fixture.controls.length,
    target_set_card_count: Number(fixture.target_set_card_count ?? 0),
    finding_count: 0,
    findings: [],
  };
}

function renderReport(summary) {
  return [
    "# Collectible Wave 1 Card Identity Proposal V1",
    "",
    `- Status: \`${summary.status}\``,
    `- Producer SHA: \`${summary.actual_head_sha}\``,
    `- Proposal fingerprint: \`${summary.proposal_fingerprint_sha256}\``,
    `- Source printing candidates: \`${summary.metrics.selected_candidate_count}\``,
    `- Inside approved sets: \`${summary.metrics.selected_source_printing_count}\``,
    `- Excluded without approved set: \`${summary.metrics.excluded_source_printing_count}\``,
    `- Proposed parent identities: \`${summary.metrics.proposed_parent_count}\``,
    `- Proposal-ready parents: \`${summary.metrics.parent_status_counts.proposal_ready ?? 0}\``,
    `- Review-required parents: \`${summary.metrics.review_required_parent_count}\``,
    `- Conflicting number coordinates: \`${summary.metrics.conflicting_coordinate_count}\``,
    `- Reconciliation mismatches: \`${summary.metrics.candidate_reconciliation_mismatch_count}\``,
    "",
    "## Boundaries",
    "",
    "This run is an artifact-only proposal. It performs one repeatable-read,",
    "read-only production transaction that ends in rollback. It writes no",
    "database, Storage, image, pricing, publication, search, or Vault state and",
    "does not dispatch a writer.",
    "",
  ].join("\n");
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
  const inputs = await loadFrozenInputs(options);
  const boundaries = {
    database_access: true,
    database_writes: false,
    storage_access: false,
    storage_writes: false,
    image_access: false,
    image_writes: false,
    pricing_access: false,
    pricing_writes: false,
    canonical_writes: false,
    publication_writes: false,
    search_writes: false,
    vault_access: false,
    vault_writes: false,
    writer_dispatches: false,
  };
  const runPlan = {
    version: COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
    mode: "shadow-only-read-only-card-identity-proposal",
    expected_head_sha: options.expectedHeadSha,
    actual_head_sha: actualHeadSha,
    fixture_mode: Boolean(options.databaseFixture),
    frozen_inputs: FROZEN_INPUTS,
    verified_inputs: inputs.verified,
    boundaries: options.databaseFixture
      ? { ...boundaries, database_access: false }
      : boundaries,
  };
  const artifacts = [];
  const planBytes = await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  artifacts.push({ path: "run_plan.json", bytes: planBytes.length, sha256: sha256(planBytes) });

  const readback = options.databaseFixture
    ? await loadFixtureReadback(options.databaseFixture, inputs.selectedSetRows)
    : await loadProductionReadback(options.databaseUrl, inputs.selectedSetRows);
  const proposal = buildCollectibleWave1CardIdentityProposalV1({
    candidates: inputs.candidates,
    selectedSetRows: inputs.selectedSetRows,
    alternativeArtworkRows: inputs.alternativeArtworkRows,
  });
  const proposalFingerprint = rowsFingerprint([
    ["parent_card_identity_proposals", proposal.parentProposals],
    ["source_printing_evidence", proposal.sourcePrintingEvidence],
    ["candidate_dispositions", proposal.candidateDispositions],
  ]);
  const summary = {
    version: COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
    mode: "shadow-only-read-only-card-identity-proposal",
    status: "completed_with_review_findings",
    actual_head_sha: actualHeadSha,
    proposal_fingerprint_sha256: proposalFingerprint,
    metrics: proposal.metrics,
    database_readback: readback,
    boundaries: runPlan.boundaries,
    completed_at: new Date().toISOString(),
  };
  const outputs = [
    ["parent_card_identity_proposals.jsonl", proposal.parentProposals, writeJsonl],
    ["source_printing_evidence.jsonl", proposal.sourcePrintingEvidence, writeJsonl],
    ["candidate_dispositions.jsonl", proposal.candidateDispositions, writeJsonl],
    ["excluded_candidates.jsonl", proposal.excludedCandidates, writeJsonl],
    ["review_required_parents.jsonl", proposal.reviewRequiredParents, writeJsonl],
    ["database_readback.json", readback, writeJson],
    ["summary.json", summary, writeJson],
    ["REPORT.md", renderReport(summary), writeBytes],
  ];
  for (const [name, value, writer] of outputs) {
    const bytes = await writer(
      path.join(options.outDir, name),
      typeof value === "string" ? Buffer.from(value) : value,
    );
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

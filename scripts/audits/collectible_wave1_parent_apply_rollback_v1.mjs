import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import pg from "pg";

import {
  COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION,
  COLLECTIBLE_WAVE1_PARENT_EXPECTED,
  COLLECTIBLE_WAVE1_PARENT_GAME_POLICY,
  COLLECTIBLE_WAVE1_PARENT_INPUT,
  COLLECTIBLE_WAVE1_PARENT_MIGRATION_VERSION,
  buildCollectibleWave1ParentApplyProposalV1,
  buildCollectibleWave1ParentRollbackContractV1,
  evaluateCollectibleWave1ParentPreflightV1,
  renderCollectibleWave1ParentMigrationCandidateV1,
  stableJsonWave1ParentApplyV1,
  wave1ParentApplyFingerprintV1,
} from "../../backend/catalog/collectible_wave1_parent_apply_proposal_v1.mjs";
import {
  splitSealedMigrationStatementsV1,
  stripSealedMigrationTransactionWrapperV1,
} from "../../backend/pricing/cross_tcg_sealed_product_schema_apply_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const EXECUTOR_VERSION = "COLLECTIBLE_WAVE1_PARENT_APPLY_ROLLBACK_V1";
const SET_PAYLOAD_SHA256 =
  "2c07787bf965909a2b9f0a6296e45d6a2407c7faf28d70069c23a305beec7144";
const SET_PAYLOAD_FINGERPRINT =
  "fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668";
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const DEFAULT_SET_PAYLOAD = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "collectible_wave1_set_apply_proposal_v1",
  "set_apply_payload.jsonl",
);

function clean(value) {
  return String(value ?? "").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const options = {
    artifactDir: null,
    envFile: "C:\\grookai_vault\\.env.local",
    execute: false,
    expectedHeadSha: "",
    outDir: null,
    setPayload: DEFAULT_SET_PAYLOAD,
  };
  for (const argument of argv) {
    if (argument.startsWith("--artifact-dir=")) {
      options.artifactDir = path.resolve(argument.slice(15));
    } else if (argument.startsWith("--env-file=")) {
      options.envFile = path.resolve(argument.slice(11));
    } else if (argument === "--execute-rollback-only") {
      options.execute = true;
    } else if (argument.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      options.outDir = path.resolve(argument.slice(10));
    } else if (argument.startsWith("--set-payload=")) {
      options.setPayload = path.resolve(argument.slice(14));
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (!options.execute) throw new Error("--execute-rollback-only is required");
  if (!options.artifactDir || !options.outDir) {
    throw new Error("--artifact-dir and --out-dir are required");
  }
  if (!/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return options;
}

function clientOptions(connectionString, applicationName, readOnly = false) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 30_000,
    query_timeout: 420_000,
    statement_timeout: 420_000,
    application_name: applicationName,
    ...(readOnly ? { options: "-c default_transaction_read_only=on" } : {}),
  };
}

function cleanError(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 4000);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const body = await fs.readFile(filePath, "utf8");
  return body.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}

async function writeJson(filePath, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, body, "utf8");
  return Buffer.from(body);
}

async function writeJsonl(filePath, rows) {
  const body = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  await fs.writeFile(filePath, body, "utf8");
  return Buffer.from(body);
}

async function verifyInput(filePath, expected) {
  const bytes = await fs.readFile(filePath);
  if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
    throw new Error(`Frozen input mismatch: ${path.basename(filePath)}`);
  }
  return { path: path.basename(filePath), bytes: bytes.length, sha256: sha256(bytes) };
}

function dateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ?? null;
}

function expectedSetRow(row) {
  return {
    id: row.id,
    game: row.game,
    code: row.code,
    name: row.name,
    release_date: dateOnly(row.release_date),
    source: {
      ...row.source,
      canonical_apply_version: "COLLECTIBLE_WAVE1_SET_FOUNDATIONS_V1",
      canonical_payload_fingerprint_sha256: SET_PAYLOAD_FINGERPRINT,
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

function actualSetRow(row) {
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

function protectedCountsSql() {
  return `jsonb_build_object(
    'games',(select count(*) from public.games),
    'release_controls',(select count(*) from public.catalog_game_release_controls),
    'sets',(select count(*) from public.sets),
    'card_prints',(select count(*) from public.card_prints),
    'legacy_cards',(select count(*) from public.cards),
    'identity_rows',(select count(*) from public.card_print_identity),
    'source_evidence_rows',(select count(*) from public.card_print_identity_source_evidence),
    'printing_rows',(select count(*) from public.card_printings),
    'external_mappings',(select count(*) from public.external_mappings),
    'external_printing_mappings',(select count(*) from public.external_printing_mappings),
    'sealed_families',(select count(*) from public.sealed_product_families),
    'sealed_variants',(select count(*) from public.sealed_product_variants),
    'storage_objects',(select count(*) from storage.objects),
    'vault_items',(select count(*) from public.vault_items),
    'vault_item_instances',(select count(*) from public.vault_item_instances)
  )`;
}

function plannedCardRows(proposal) {
  return proposal.cardPrints.map((row) => ({
    id: row.id,
    gv_id: row.gv_id,
    set_id: row.set_id,
    number_plain: row.number_plain,
    variant_key: row.variant_key,
  }));
}

function plannedIdentityRows(proposal) {
  return proposal.identities.map((row) => ({
    id: row.id,
    identity_domain: row.identity_domain,
    identity_key_version: row.identity_key_version,
    identity_key_hash: row.identity_key_hash,
  }));
}

function plannedEvidenceRows(proposal) {
  return proposal.sourceEvidence.map((row) => ({
    id: row.id,
    card_print_identity_id: row.card_print_identity_id,
    source_key: row.source_key,
    acquisition_key: row.acquisition_key,
  }));
}

async function captureBaseline(
  connectionString,
  proposal,
  setRows,
  applicationName,
) {
  const client = new pg.Client(clientOptions(connectionString, applicationName, true));
  await client.connect();
  let open = false;
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const cards = plannedCardRows(proposal);
    const identities = plannedIdentityRows(proposal);
    const evidence = plannedEvidenceRows(proposal);
    const setIds = setRows.map((row) => row.id);
    const { rows } = await client.query(`
      with planned_cards as materialized (
        select * from jsonb_to_recordset($1::jsonb) as row(
          id uuid,gv_id text,set_id uuid,number_plain text,variant_key text
        )
      ), planned_identities as materialized (
        select * from jsonb_to_recordset($2::jsonb) as row(
          id uuid,identity_domain text,identity_key_version text,identity_key_hash text
        )
      ), planned_evidence as materialized (
        select * from jsonb_to_recordset($3::jsonb) as row(
          id uuid,card_print_identity_id uuid,source_key text,acquisition_key text
        )
      )
      select jsonb_build_object(
        'transaction_read_only',current_setting('transaction_read_only')::boolean,
        'latest_migration',(select max(version) from supabase_migrations.schema_migrations),
        'migration_versions',(select coalesce(jsonb_agg(version order by version),'[]'::jsonb)
          from supabase_migrations.schema_migrations),
        'candidate_migration_count',(select count(*) from supabase_migrations.schema_migrations
          where version=$5),
        'planned_card_print_count',(select count(*) from planned_cards),
        'planned_identity_count',(select count(*) from planned_identities),
        'planned_evidence_count',(select count(*) from planned_evidence),
        'existing_card_print_id_count',(select count(*) from public.card_prints existing
          join planned_cards planned on planned.id=existing.id),
        'existing_gv_id_count',(select count(*) from public.card_prints existing
          join planned_cards planned on planned.gv_id=existing.gv_id),
        'existing_standard_coordinate_count',(select count(*) from public.card_prints existing
          join planned_cards planned on planned.set_id=existing.set_id
            and planned.number_plain=existing.number_plain
            and coalesce(planned.variant_key,'')=coalesce(existing.variant_key,'')
            and existing.set_identity_model='standard'),
        'existing_identity_id_count',(select count(*) from public.card_print_identity existing
          join planned_identities planned on planned.id=existing.id),
        'existing_identity_hash_count',(select count(*) from public.card_print_identity existing
          join planned_identities planned on planned.identity_domain=existing.identity_domain
            and planned.identity_key_version=existing.identity_key_version
            and planned.identity_key_hash=existing.identity_key_hash and existing.is_active),
        'existing_evidence_id_count',(select count(*)
          from public.card_print_identity_source_evidence existing
          join planned_evidence planned on planned.id=existing.id),
        'existing_evidence_lane_count',(select count(*)
          from public.card_print_identity_source_evidence existing
          join planned_evidence planned
            on planned.card_print_identity_id=existing.card_print_identity_id
            and planned.source_key=existing.source_key
            and planned.acquisition_key=existing.acquisition_key and existing.active),
        'existing_target_set_card_count',(select count(*) from public.card_prints
          where set_id=any($4::uuid[])),
        'selected_set_count',(select count(*) from public.sets where id=any($4::uuid[])),
        'identity_domain_constraint',(select pg_get_constraintdef(oid) from pg_constraint
          where conrelid='public.card_print_identity'::regclass
            and conname='card_print_identity_identity_domain_check'),
        'release_controls',(select coalesce(jsonb_agg(jsonb_build_object(
          'game_code',game_code,'release_status',release_status,
          'release_version',release_version,'evidence',evidence
        ) order by game_code),'[]'::jsonb) from public.catalog_game_release_controls
          where game_code in ('gundam','yugioh')),
        'games',(select coalesce(jsonb_agg(to_jsonb(game) order by code),'[]'::jsonb)
          from public.games game where code in ('gundam','yugioh')),
        'conflicting_lock_count',(select count(*) from pg_locks where not granted
          and relation in ('public.card_prints'::regclass,'public.card_print_identity'::regclass,
            'public.card_print_identity_source_evidence'::regclass)),
        'protected_counts',${protectedCountsSql()}
      ) as value
    `, [
      JSON.stringify(cards),
      JSON.stringify(identities),
      JSON.stringify(evidence),
      setIds,
      COLLECTIBLE_WAVE1_PARENT_MIGRATION_VERSION,
    ]);
    const setReadback = (await client.query(`select id::text,game,code,name,release_date,
      source,printed_total,printed_set_abbrev,set_role,identity_domain_default,
      identity_model,logo_url,symbol_url,hero_image_url,hero_image_source
      from public.sets where id=any($1::uuid[]) order by id`, [setIds])).rows;
    await client.query("rollback");
    open = false;
    const expectedSets = setRows.map(expectedSetRow).sort((left, right) =>
      left.id.localeCompare(right.id));
    const actualSets = setReadback.map(actualSetRow).sort((left, right) =>
      left.id.localeCompare(right.id));
    return {
      ...rows[0].value,
      selected_set_payload_expected_sha256:
        wave1ParentApplyFingerprintV1(expectedSets),
      selected_set_payload_actual_sha256:
        wave1ParentApplyFingerprintV1(actualSets),
      selected_set_payload_mismatch_count:
        stableJsonWave1ParentApplyV1(expectedSets) ===
          stableJsonWave1ParentApplyV1(actualSets) ? 0 : 1,
    };
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function cardProjection(row) {
  return {
    id: row.id,
    game_id: row.game_id,
    set_id: row.set_id,
    name: row.name,
    number: row.number,
    number_plain: row.number_plain,
    variant_key: row.variant_key,
    rarity: row.rarity,
    image_url: row.image_url,
    image_alt_url: row.image_alt_url,
    image_source: row.image_source,
    image_status: row.image_status,
    tcgplayer_id: row.tcgplayer_id,
    external_ids: row.external_ids,
    set_code: row.set_code,
    gv_id: row.gv_id,
    identity_domain: row.identity_domain,
    print_identity_key: row.print_identity_key,
    printed_identity_modifier: row.printed_identity_modifier,
    set_identity_model: row.set_identity_model,
    data_quality_flags: row.data_quality_flags,
    ai_metadata: row.ai_metadata,
  };
}

function identityProjection(row) {
  return {
    id: row.id,
    card_print_id: row.card_print_id,
    identity_domain: row.identity_domain,
    set_code_identity: row.set_code_identity,
    printed_number: row.printed_number,
    normalized_printed_name: row.normalized_printed_name,
    source_name_raw: row.source_name_raw,
    identity_payload: row.identity_payload,
    identity_key_version: row.identity_key_version,
    identity_key_hash: row.identity_key_hash,
    is_active: row.is_active,
  };
}

function evidenceProjection(row) {
  return {
    id: row.id,
    card_print_identity_id: row.card_print_identity_id,
    card_print_id: row.card_print_id,
    acquisition_key: row.acquisition_key,
    source_key: row.source_key,
    evidence_key_hash: row.evidence_key_hash,
    evidence_subject: row.evidence_subject,
    evidence_payload: row.evidence_payload,
    active: row.active,
  };
}

async function roleVisibleCount(client, role, setIds) {
  if (!new Set(["anon", "authenticated"]).has(role)) throw new Error("Invalid role");
  try {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    await client.query(`set local role ${role}`);
    return Number((await client.query(
      "select count(*)::int as count from public.card_prints where set_id=any($1::uuid[])",
      [setIds],
    )).rows[0].count);
  } finally {
    await client.query("reset role").catch(() => {});
  }
}

async function transactionReadback(client, proposal, setRows, baseline) {
  const cardIds = proposal.cardPrints.map((row) => row.id);
  const identityIds = proposal.identities.map((row) => row.id);
  const evidenceIds = proposal.sourceEvidence.map((row) => row.id);
  const setIds = setRows.map((row) => row.id);
  const cardRows = (await client.query(`select id::text,game_id::text,set_id::text,name,
    number,number_plain,variant_key,rarity,image_url,image_alt_url,image_source,image_status,
    tcgplayer_id,external_ids,set_code,gv_id,identity_domain,print_identity_key,
    printed_identity_modifier,set_identity_model,data_quality_flags,ai_metadata
    from public.card_prints where id=any($1::uuid[]) order by id`, [cardIds])).rows
    .map(cardProjection);
  const identityRows = (await client.query(`select id::text,card_print_id::text,
    identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,
    identity_payload,identity_key_version,identity_key_hash,is_active
    from public.card_print_identity where id=any($1::uuid[]) order by id`, [identityIds])).rows
    .map(identityProjection);
  const evidenceRows = (await client.query(`select id::text,card_print_identity_id::text,
    card_print_id::text,acquisition_key,source_key,evidence_key_hash,evidence_subject,
    evidence_payload,active from public.card_print_identity_source_evidence
    where id=any($1::uuid[]) order by id`, [evidenceIds])).rows.map(evidenceProjection);
  const expectedCards = [...proposal.cardPrints].sort((left, right) => left.id.localeCompare(right.id));
  const expectedIdentities = [...proposal.identities]
    .sort((left, right) => left.id.localeCompare(right.id));
  const expectedEvidence = [...proposal.sourceEvidence]
    .sort((left, right) => left.id.localeCompare(right.id));
  const attributableWrites = (await client.query(`select relname,
    coalesce(n_tup_ins,0)::bigint as inserted,coalesce(n_tup_upd,0)::bigint as updated,
    coalesce(n_tup_del,0)::bigint as deleted,coalesce(n_tup_hot_upd,0)::bigint as hot_updated
    from pg_stat_xact_user_tables where schemaname='public'
      and (coalesce(n_tup_ins,0)<>0 or coalesce(n_tup_upd,0)<>0 or
        coalesce(n_tup_del,0)<>0 or coalesce(n_tup_hot_upd,0)<>0)
    order by relname`)).rows;
  const metadata = (await client.query(`select
    (select pg_get_constraintdef(oid) from pg_constraint
      where conrelid='public.card_print_identity'::regclass
        and conname='card_print_identity_identity_domain_check') as identity_domain_constraint,
    (select coalesce(jsonb_agg(version order by version),'[]'::jsonb)
      from supabase_migrations.schema_migrations) as migration_versions,
    ${protectedCountsSql()} as protected_counts`)).rows[0];
  return {
    card_print_count: cardRows.length,
    identity_count: identityRows.length,
    source_evidence_count: evidenceRows.length,
    expected_card_payload_sha256: wave1ParentApplyFingerprintV1(expectedCards),
    actual_card_payload_sha256: wave1ParentApplyFingerprintV1(cardRows),
    expected_identity_payload_sha256: wave1ParentApplyFingerprintV1(expectedIdentities),
    actual_identity_payload_sha256: wave1ParentApplyFingerprintV1(identityRows),
    expected_evidence_payload_sha256: wave1ParentApplyFingerprintV1(expectedEvidence),
    actual_evidence_payload_sha256: wave1ParentApplyFingerprintV1(evidenceRows),
    anon_visible_card_count: await roleVisibleCount(client, "anon", setIds),
    authenticated_visible_card_count: await roleVisibleCount(client, "authenticated", setIds),
    identity_domain_constraint: metadata.identity_domain_constraint,
    migration_versions_unchanged:
      stableJsonWave1ParentApplyV1(metadata.migration_versions) ===
        stableJsonWave1ParentApplyV1(baseline.migration_versions),
    protected_counts: metadata.protected_counts,
    attributable_writes: attributableWrites,
  };
}

function transactionFindings(readback, baseline) {
  const findings = [];
  for (const [field, expected] of [
    ["card_print_count", COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count],
    ["identity_count", COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count],
    ["source_evidence_count", COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_source_evidence_count],
  ]) if (Number(readback?.[field]) !== expected) findings.push(`${field}_mismatch`);
  for (const [expectedField, actualField, label] of [
    ["expected_card_payload_sha256", "actual_card_payload_sha256", "card_payload"],
    ["expected_identity_payload_sha256", "actual_identity_payload_sha256", "identity_payload"],
    ["expected_evidence_payload_sha256", "actual_evidence_payload_sha256", "evidence_payload"],
  ]) if (readback?.[expectedField] !== readback?.[actualField]) {
    findings.push(`${label}_mismatch`);
  }
  if (readback?.anon_visible_card_count !== 0) findings.push("anon_visibility_not_zero");
  if (readback?.authenticated_visible_card_count !== 0) {
    findings.push("authenticated_visibility_not_zero");
  }
  if (!readback?.migration_versions_unchanged) findings.push("migration_ledger_changed");
  for (const policy of Object.values(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY)) {
    if (!clean(readback?.identity_domain_constraint).includes(policy.identity_domain)) {
      findings.push(`transient_identity_domain_missing:${policy.identity_domain}`);
    }
  }
  const writes = Object.fromEntries((readback?.attributable_writes ?? [])
    .map((row) => [row.relname, row]));
  const expectedWrites = {
    card_prints: COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count,
    card_print_identity: COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count,
    card_print_identity_source_evidence:
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_source_evidence_count,
  };
  for (const [table, count] of Object.entries(expectedWrites)) {
    if (Number(writes[table]?.inserted ?? 0) !== count ||
        Number(writes[table]?.updated ?? 0) !== 0 ||
        Number(writes[table]?.deleted ?? 0) !== 0) {
      findings.push(`attributable_write_mismatch:${table}`);
    }
  }
  for (const table of Object.keys(writes)) {
    if (!Object.hasOwn(expectedWrites, table)) findings.push(`unexpected_write_table:${table}`);
  }
  const expectedProtected = {
    ...baseline.protected_counts,
    card_prints: Number(baseline.protected_counts.card_prints) +
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count,
    identity_rows: Number(baseline.protected_counts.identity_rows) +
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.proposal_ready_parent_count,
    source_evidence_rows: Number(baseline.protected_counts.source_evidence_rows) +
      COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_source_evidence_count,
  };
  if (stableJsonWave1ParentApplyV1(readback?.protected_counts) !==
      stableJsonWave1ParentApplyV1(expectedProtected)) {
    findings.push("transient_protected_counts_mismatch");
  }
  return [...new Set(findings)].sort();
}

async function executeRollbackOnly(connectionString, migrationSql, proposal, setRows, baseline) {
  const statements = splitSealedMigrationStatementsV1(
    stripSealedMigrationTransactionWrapperV1(migrationSql),
  );
  const client = new pg.Client(clientOptions(
    connectionString,
    "collectible-wave1-parent-apply-rollback-v1",
  ));
  await client.connect();
  let open = false;
  let rollbackAttempted = false;
  let rollbackSucceeded = false;
  let readback = null;
  let error = null;
  try {
    await client.query("begin");
    open = true;
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='420s'");
    await client.query("set local idle_in_transaction_session_timeout='480s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION,
    ]);
    for (const statement of statements) await client.query(statement);
    readback = await transactionReadback(client, proposal, setRows, baseline);
    const findings = transactionFindings(readback, baseline);
    if (findings.length) throw new Error(findings.join(","));
  } catch (caught) {
    error = caught;
  } finally {
    if (open) {
      rollbackAttempted = true;
      try {
        await client.query("rollback");
        rollbackSucceeded = true;
      } catch (rollbackError) {
        error ??= rollbackError;
      }
      open = false;
    }
    await client.end();
  }
  return {
    migration_statement_count: statements.length,
    readback,
    error: error ? cleanError(error) : null,
    rollback_attempted: rollbackAttempted,
    rollback_succeeded: rollbackSucceeded,
  };
}

function restorationFindings(before, after) {
  const findings = [];
  for (const field of [
    "migration_versions",
    "identity_domain_constraint",
    "release_controls",
    "games",
    "protected_counts",
    "selected_set_payload_actual_sha256",
  ]) if (stableJsonWave1ParentApplyV1(before?.[field]) !==
      stableJsonWave1ParentApplyV1(after?.[field])) {
    findings.push(`post_rollback_changed:${field}`);
  }
  for (const field of [
    "existing_card_print_id_count",
    "existing_gv_id_count",
    "existing_standard_coordinate_count",
    "existing_identity_id_count",
    "existing_identity_hash_count",
    "existing_evidence_id_count",
    "existing_evidence_lane_count",
    "existing_target_set_card_count",
    "candidate_migration_count",
  ]) if (Number(after?.[field] ?? -1) !== 0) findings.push(`post_rollback_${field}_not_zero`);
  return findings;
}

async function artifactHashes(outDir) {
  const names = (await fs.readdir(outDir)).filter((name) =>
    name !== "artifact_hashes.json").sort();
  const artifacts = [];
  for (const name of names) {
    const filePath = path.join(outDir, name);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) continue;
    const bytes = await fs.readFile(filePath);
    artifacts.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return { algorithm: "sha256", artifacts };
}

function report(summary) {
  return `# Collectible Wave 1 Parent Apply Rollback Proof V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer SHA: \`${summary.actual_head_sha}\`\n` +
    `- Parent rows: \`${summary.metrics.card_print_count}\`\n` +
    `- Identity rows: \`${summary.metrics.identity_count}\`\n` +
    `- Source evidence rows: \`${summary.metrics.source_evidence_count}\`\n` +
    `- Payload fingerprint: \`${summary.payload_fingerprint_sha256}\`\n` +
    `- Rollback proved: \`${summary.rollback_proved}\`\n` +
    `- Migration-ledger writes: \`0\`\n` +
    `- Durable database writes: \`0\`\n` +
    `- App visibility enabled: \`false\`\n` +
    `- Findings: \`${summary.findings.length}\`\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const actualHeadSha = git("rev-parse", "HEAD");
  if (actualHeadSha !== options.expectedHeadSha) {
    throw new Error(`Expected SHA ${options.expectedHeadSha}, found ${actualHeadSha}`);
  }
  if (git("status", "--porcelain")) throw new Error("Tracked worktree must be clean");

  const parentPath = path.join(options.artifactDir, "parent_card_identity_proposals.jsonl");
  const evidencePath = path.join(options.artifactDir, "source_printing_evidence.jsonl");
  const verifiedInputs = [
    await verifyInput(parentPath, COLLECTIBLE_WAVE1_PARENT_INPUT.parent_proposals),
    await verifyInput(evidencePath, COLLECTIBLE_WAVE1_PARENT_INPUT.source_printing_evidence),
  ];
  const sourceSummary = await readJson(path.join(options.artifactDir, "summary.json"));
  if (sourceSummary?.proposal_fingerprint_sha256 !==
      COLLECTIBLE_WAVE1_PARENT_INPUT.proposal_fingerprint_sha256 ||
      sourceSummary?.actual_head_sha !== COLLECTIBLE_WAVE1_PARENT_INPUT.producer_sha) {
    throw new Error("Source proposal provenance does not match the frozen tuple");
  }
  const setBytes = await fs.readFile(options.setPayload);
  if (sha256(setBytes) !== SET_PAYLOAD_SHA256) {
    throw new Error("Selected set payload does not match the frozen hash");
  }
  const setRows = setBytes.toString("utf8").split(/\r?\n/)
    .filter((line) => line.trim()).map((line) => JSON.parse(line));
  if (setRows.length !== COLLECTIBLE_WAVE1_PARENT_EXPECTED.selected_set_count) {
    throw new Error("Selected set payload count does not match the frozen profile");
  }
  const proposal = buildCollectibleWave1ParentApplyProposalV1({
    parentProposals: await readJsonl(parentPath),
    sourcePrintingEvidence: await readJsonl(evidencePath),
  });
  const migrationSql = renderCollectibleWave1ParentMigrationCandidateV1(proposal);
  const rollbackContract = buildCollectibleWave1ParentRollbackContractV1(proposal);
  const runPlanCore = {
    version: EXECUTOR_VERSION,
    created_at: new Date().toISOString(),
    actual_head_sha: actualHeadSha,
    expected_head_sha: options.expectedHeadSha,
    source_proposal: COLLECTIBLE_WAVE1_PARENT_INPUT,
    verified_inputs: verifiedInputs,
    set_payload: { bytes: setBytes.length, sha256: sha256(setBytes) },
    payload_fingerprint_sha256: proposal.payload_fingerprint_sha256,
    migration_version_candidate: COLLECTIBLE_WAVE1_PARENT_MIGRATION_VERSION,
    exact_scope: proposal.metrics,
    boundaries: {
      execution_mode: "production_rollback_only",
      durable_database_writes: 0,
      migration_ledger_writes: 0,
      review_required_rows: 0,
      child_printing_mapping_storage_image_pricing_publication_vault_writes: 0,
      app_visibility_enabled: false,
    },
  };
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: wave1ParentApplyFingerprintV1(runPlanCore),
  };
  await fs.mkdir(options.outDir, { recursive: true });
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  await writeJsonl(path.join(options.outDir, "card_print_payload.jsonl"), proposal.cardPrints);
  await writeJsonl(path.join(options.outDir, "identity_payload.jsonl"), proposal.identities);
  await writeJsonl(path.join(options.outDir, "source_evidence_payload.jsonl"),
    proposal.sourceEvidence);
  await fs.writeFile(path.join(options.outDir, "migration_candidate.sql"), migrationSql, "utf8");
  await writeJson(path.join(options.outDir, "rollback_contract.json"), rollbackContract);

  dotenv.config({ path: options.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  let baseline = null;
  let transaction = null;
  let postRollback = null;
  let primaryError = null;
  try {
    baseline = await captureBaseline(
      connectionString,
      proposal,
      setRows,
      "collectible-wave1-parent-baseline-v1",
    );
    const baselineFindings = evaluateCollectibleWave1ParentPreflightV1(baseline);
    if (Number(baseline.selected_set_payload_mismatch_count) !== 0) {
      baselineFindings.push("selected_set_payload_mismatch");
    }
    if (baselineFindings.length) {
      throw new Error(`Fresh preflight failed: ${baselineFindings.join(",")}`);
    }
    transaction = await executeRollbackOnly(
      connectionString,
      migrationSql,
      proposal,
      setRows,
      baseline,
    );
    if (transaction.error || !transaction.rollback_succeeded) {
      throw new Error(transaction.error ?? "Rollback was not proven");
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (baseline) {
      try {
        postRollback = await captureBaseline(
          connectionString,
          proposal,
          setRows,
          "collectible-wave1-parent-post-rollback-v1",
        );
      } catch (error) {
        primaryError ??= error;
      }
    }
  }
  const findings = [];
  if (baseline && postRollback) findings.push(...restorationFindings(baseline, postRollback));
  else findings.push("fresh_post_rollback_readback_missing");
  if (primaryError) findings.push(cleanError(primaryError));
  const uniqueFindings = [...new Set(findings)].sort();
  const rollbackProved = transaction?.rollback_succeeded === true &&
    uniqueFindings.length === 0;
  const summary = {
    version: EXECUTOR_VERSION,
    status: rollbackProved ? "rollback_proved_candidate_not_applied" : "failed_closed",
    actual_head_sha: actualHeadSha,
    payload_fingerprint_sha256: proposal.payload_fingerprint_sha256,
    metrics: proposal.metrics,
    rollback_proved: rollbackProved,
    database_writes: 0,
    migration_ledger_writes: 0,
    app_visibility_enabled: false,
    findings: uniqueFindings,
  };
  await writeJson(path.join(options.outDir, "database_preflight.json"), baseline);
  await writeJson(path.join(options.outDir, "transaction_readback.json"), transaction);
  await writeJson(path.join(options.outDir, "post_rollback.json"), postRollback);
  await writeJson(path.join(options.outDir, "summary.json"), summary);
  await fs.writeFile(path.join(options.outDir, "REPORT.md"), report(summary), "utf8");
  await writeJson(path.join(options.outDir, "artifact_hashes.json"),
    await artifactHashes(options.outDir));
  console.log(JSON.stringify(summary, null, 2));
  if (!rollbackProved) process.exitCode = 1;
}

await main().catch((error) => {
  console.error(cleanError(error));
  process.exitCode = 1;
});

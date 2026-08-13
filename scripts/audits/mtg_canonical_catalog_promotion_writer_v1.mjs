import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import {
  buildMtgCanonicalPromotionContractV1,
  stripMtgPromotionMigrationEnvelopeV1,
} from "./mtg_canonical_catalog_promotion_contract_v1.mjs";
import {
  captureMtgClientVisibilityV1,
  captureMtgPromotionCollisionsV1,
  captureMtgPromotionExactReadbackV1,
  captureMtgPromotionStateV1,
  captureVisiblePokemonCountV1,
  insertMtgPromotionRowsV1,
  MTG_GAME_ID,
} from "./mtg_canonical_catalog_promotion_rollback_proof_v1.mjs";
import { stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_PROMOTION_WRITER_V1";
const APPROVAL_ENV = "MTG_CANONICAL_PROMOTION_APPROVAL";
const MIGRATIONS = Object.freeze([
  {
    version: "20260813190000",
    name: "mtg_canonical_catalog_foundation_v1",
  },
  {
    version: "20260813200000",
    name: "mtg_catalog_app_visibility_boundary_v1",
  },
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = { mode: "plan", payload: null, outDir: null };
  for (const arg of argv) {
    if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  return args;
}

export function buildMtgPromotionLedgerRowsV1(migrationSqlByVersion) {
  return MIGRATIONS.map((migration) => ({
    version: migration.version,
    name: migration.name,
    statements: [stripMtgPromotionMigrationEnvelopeV1(migrationSqlByVersion[migration.version])],
  }));
}

export function buildMtgCanonicalPromotionApprovalV1(plan, ledgerRows) {
  const ledgerFingerprintSha256 = sha256(stableJson(ledgerRows));
  return {
    ledger_fingerprint_sha256: ledgerFingerprintSha256,
    required_approval_message:
      `I approve only the hidden DSK canonical promotion plan ` +
      `${plan.promotion_plan_sha256}, writer payload ${plan.writer_payload_fingerprint}, ` +
      `foundation migration ${plan.foundation_migration_sha256}, visibility migration ` +
      `${plan.visibility_migration_sha256}, mutation contract ` +
      `${plan.mutation_contract_sha256}, and migration ledger ${ledgerFingerprintSha256}. ` +
      `This may insert one MTG game, Foil and Etched finish keys, one hidden MTG ` +
      `release control, 1 set, 417 card_prints, 417 card_print_identity rows, ` +
      `807 card_printings, 417 Scryfall mappings, and 807 TCGPlayer printing ` +
      `mappings. I do not approve signed-in or public MTG visibility, images, ` +
      `Storage, image pointers, pricing, publication, Vault writes, another set, ` +
      `Pokemon mutation, updates, deletes, truncates, cleanup, or global db push.`,
  };
}

function assertCount(actual, expected, label) {
  if (Number(actual) !== Number(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function captureLedger(client) {
  const result = await client.query(
    `select version, name
     from supabase_migrations.schema_migrations
     where version in ('20260813190000', '20260813200000')
     order by version`,
  );
  return result.rows;
}

async function captureSecurity(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'release_table_rls', (
        select relrowsecurity from pg_class
        where oid = 'public.catalog_game_release_controls'::regclass
      ),
      'anon_release_select', has_table_privilege(
        'anon', 'public.catalog_game_release_controls', 'select'
      ),
      'authenticated_release_select', has_table_privilege(
        'authenticated', 'public.catalog_game_release_controls', 'select'
      ),
      'service_release_select', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'select'
      ),
      'service_release_insert', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'insert'
      ),
      'service_release_update', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'update'
      ),
      'restrictive_policy_count', (
        select count(*)
        from pg_policies
        where schemaname = 'public'
          and permissive = 'RESTRICTIVE'
          and policyname in (
            'games_catalog_release_visibility_v1',
            'sets_catalog_release_visibility_v1',
            'card_prints_catalog_release_visibility_v1',
            'card_print_identity_catalog_release_visibility_v1',
            'card_printings_catalog_release_visibility_v1'
          )
      ),
      'internal_search_anon_execute', has_function_privilege(
        'anon',
        'public.search_print_identity_unfiltered_internal_v1(text,text,text,text,integer,integer)',
        'execute'
      ),
      'internal_search_authenticated_execute', has_function_privilege(
        'authenticated',
        'public.search_print_identity_unfiltered_internal_v1(text,text,text,text,integer,integer)',
        'execute'
      ),
      'wrapper_search_anon_execute', has_function_privilege(
        'anon',
        'public.search_print_identity_v1(text,text,text,text,integer,integer)',
        'execute'
      ),
      'wrapper_search_authenticated_execute', has_function_privilege(
        'authenticated',
        'public.search_print_identity_v1(text,text,text,text,integer,integer)',
        'execute'
      )
    ) as value
  `);
  return result.rows[0].value;
}

function assertSecurity(security) {
  const expected = {
    release_table_rls: true,
    anon_release_select: false,
    authenticated_release_select: false,
    service_release_select: true,
    service_release_insert: true,
    service_release_update: true,
    restrictive_policy_count: 5,
    internal_search_anon_execute: false,
    internal_search_authenticated_execute: false,
    wrapper_search_anon_execute: true,
    wrapper_search_authenticated_execute: true,
  };
  if (stableJson(security) !== stableJson(expected)) {
    throw new Error(`MTG visibility security mismatch: ${stableJson(security)}`);
  }
}

async function captureServiceCounts(client, plan) {
  const result = await client.query(
    `select jsonb_build_object(
       'release_status', (
         select release_status from public.catalog_game_release_controls where game_code = 'mtg'
       ),
       'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
       'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
       'mtg_card_count', (select count(*) from public.card_prints where game_id = $1),
       'mtg_identity_count', (
         select count(*) from public.card_print_identity where identity_domain = 'mtg_eng_paper_print'
       ),
       'mtg_printing_count', (
         select count(*) from public.card_printings where card_print_id = any($2::uuid[])
       ),
       'parent_mapping_count', (
         select count(*) from public.external_mappings
         where source = 'scryfall' and external_id = any($3::text[])
       ),
       'printing_mapping_count', (
         select count(*) from public.external_printing_mappings
         where source = 'tcgplayer_market' and external_id = any($4::text[])
       ),
       'pokemon_card_count', (
         select count(*) from public.card_prints card
         join public.games game on game.id = card.game_id
         where game.code = 'pokemon'
       )
     ) as value`,
    [
      MTG_GAME_ID,
      plan.rows.card_prints.map((row) => row.id),
      plan.rows.external_mappings.map((row) => row.external_id),
      plan.rows.external_printing_mappings.map((row) => row.external_id),
    ],
  );
  return result.rows[0].value;
}

function assertExactReadback(exact, plan) {
  for (const [name, check] of Object.entries(exact)) {
    assertCount(check.planned_count, plan.row_counts[name], `${name} planned count`);
    assertCount(check.actual_count, plan.row_counts[name], `${name} actual count`);
    assertCount(check.exact_count, plan.row_counts[name], `${name} exact count`);
  }
}

function assertClientHidden(evidence, role) {
  for (const key of [
    "game_count",
    "set_count",
    "card_count",
    "identity_count",
    "printing_count",
    "legacy_search_count",
    "print_search_count",
  ]) {
    assertCount(evidence[key], 0, `${role} ${key}`);
  }
}

async function verifyAppliedState(client, payload, plan, pokemonServiceBefore, pokemonAuthBefore) {
  const state = await captureMtgPromotionStateV1(client, plan);
  const ledger = await captureLedger(client);
  const security = await captureSecurity(client);
  const exact = await captureMtgPromotionExactReadbackV1(client, plan.rows);
  const service = await captureServiceCounts(client, plan);
  const anon = await captureMtgClientVisibilityV1(client, "anon", payload.selected_set.code);
  const authenticated = await captureMtgClientVisibilityV1(
    client,
    "authenticated",
    payload.selected_set.code,
  );
  if (
    stableJson(ledger) !==
    stableJson(MIGRATIONS.map(({ version, name }) => ({ version, name })))
  ) {
    throw new Error(`Migration ledger mismatch: ${stableJson(ledger)}`);
  }
  assertSecurity(security);
  assertExactReadback(exact, plan);
  if (service.release_status !== "hidden") throw new Error("MTG release is not hidden");
  assertCount(service.mtg_game_count, 1, "MTG game count");
  assertCount(service.mtg_set_count, plan.row_counts.sets, "MTG set count");
  assertCount(service.mtg_card_count, plan.row_counts.card_prints, "MTG card count");
  assertCount(
    service.mtg_identity_count,
    plan.row_counts.card_print_identity,
    "MTG identity count",
  );
  assertCount(service.mtg_printing_count, plan.row_counts.card_printings, "MTG printing count");
  assertCount(
    service.parent_mapping_count,
    plan.row_counts.external_mappings,
    "MTG parent mapping count",
  );
  assertCount(
    service.printing_mapping_count,
    plan.row_counts.external_printing_mappings,
    "MTG printing mapping count",
  );
  assertCount(service.pokemon_card_count, pokemonServiceBefore, "Pokemon service count");
  assertClientHidden(anon, "anon");
  assertClientHidden(authenticated, "authenticated");
  assertCount(
    authenticated.pokemon_card_count,
    pokemonAuthBefore,
    "authenticated Pokemon visibility",
  );
  return { state, ledger, security, exact, service, client_visibility: { anon, authenticated } };
}

async function executeDatabaseMode({ mode, payload, plan, ledgerRows }) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
  });
  await client.connect();
  try {
    await client.query("begin");
    try {
      const before = await captureMtgPromotionStateV1(client, plan);
      if (before.foundation_migration_present || before.visibility_migration_present) {
        throw new Error("MTG canonical migrations already exist");
      }
      if (before.visibility_table_present) throw new Error("Unrecorded visibility table exists");
      assertCount(before.staging_batch_count, 1, "staging batch count");
      assertCount(before.staging_row_count, 2866, "staging row count");
      assertCount(before.mtg_game_count, 0, "pre-apply MTG game count");
      assertCount(before.mtg_set_count, 0, "pre-apply MTG set count");
      assertCount(before.mtg_card_count, 0, "pre-apply MTG card count");
      const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
      for (const [name, count] of Object.entries(collisions)) assertCount(count, 0, name);
      const pokemonAuthBefore = await captureVisiblePokemonCountV1(client, "authenticated");
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '240s'");
      for (const ledgerRow of ledgerRows) {
        await client.query(ledgerRow.statements[0]);
        await client.query(
          `insert into supabase_migrations.schema_migrations (version, statements, name)
           values ($1, $2::text[], $3)`,
          [ledgerRow.version, ledgerRow.statements, ledgerRow.name],
        );
      }
      const inserted = await insertMtgPromotionRowsV1(client, plan.rows);
      for (const [name, count] of Object.entries(plan.row_counts)) {
        assertCount(inserted[name], count, `${name} inserted count`);
      }
      const inside = await verifyAppliedState(
        client,
        payload,
        plan,
        before.pokemon_card_count,
        pokemonAuthBefore,
      );
      if (mode === "apply") await client.query("commit");
      else await client.query("rollback");
      if (mode === "apply") {
        const durable = await verifyAppliedState(
          client,
          payload,
          plan,
          before.pokemon_card_count,
          pokemonAuthBefore,
        );
        return { before, collisions, inserted, transaction: inside, durable };
      }
      const after = await captureMtgPromotionStateV1(client, plan);
      if (after.foundation_migration_present || after.visibility_migration_present) {
        throw new Error("Migration ledger survived rollback");
      }
      if (after.visibility_table_present) throw new Error("Visibility table survived rollback");
      assertCount(after.staging_batch_count, 1, "post-rollback staging batch count");
      assertCount(after.staging_row_count, 2866, "post-rollback staging row count");
      assertCount(after.mtg_game_count, 0, "post-rollback MTG game count");
      assertCount(after.mtg_set_count, 0, "post-rollback MTG set count");
      assertCount(after.mtg_card_count, 0, "post-rollback MTG card count");
      assertCount(after.pokemon_card_count, before.pokemon_card_count, "post-rollback Pokemon count");
      return { before, collisions, inserted, transaction: inside, after_rollback: after };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(result) {
  return `# MTG DSK Canonical Promotion Writer

- Status: **${result.status.toUpperCase()}**
- Mode: \`${result.mode}\`
- Promotion plan: \`${result.plan.promotion_plan_sha256}\`
- Foundation migration: \`${result.plan.foundation_migration_sha256}\`
- Visibility migration: \`${result.plan.visibility_migration_sha256}\`
- Migration ledger: \`${result.ledger_fingerprint_sha256}\`
- Release status: \`hidden\`
- Durable database writes: \`${result.boundaries.database_writes}\`

## Exact Approval

\`\`\`text
${result.required_approval_message}
\`\`\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(await fs.readFile(args.payload, "utf8"));
  const migrationSqlByVersion = {};
  for (const migration of MIGRATIONS) {
    migrationSqlByVersion[migration.version] = await fs.readFile(
      path.join(
        ROOT,
        "supabase",
        "migrations",
        `${migration.version}_${migration.name}.sql`,
      ),
      "utf8",
    );
  }
  const plan = buildMtgCanonicalPromotionContractV1({
    payload,
    foundationMigrationSha256: sha256(migrationSqlByVersion["20260813190000"]),
    visibilityMigrationSha256: sha256(migrationSqlByVersion["20260813200000"]),
  });
  const ledgerRows = buildMtgPromotionLedgerRowsV1(migrationSqlByVersion);
  const approval = buildMtgCanonicalPromotionApprovalV1(plan, ledgerRows);
  if (args.mode === "apply" && process.env[APPROVAL_ENV] !== approval.required_approval_message) {
    throw new Error(`Exact approval missing from ${APPROVAL_ENV}`);
  }
  const proof =
    args.mode === "plan"
      ? null
      : await executeDatabaseMode({ mode: args.mode, payload, plan, ledgerRows });
  const publicPlan = { ...plan, rows: undefined };
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    mode: args.mode,
    status:
      args.mode === "plan"
        ? "promotion_apply_plan_complete_no_database_access"
        : args.mode === "dry-run"
          ? "promotion_writer_rollback_proof_passed"
          : "hidden_canonical_promotion_applied_and_read_back",
    plan: publicPlan,
    ledger_rows: ledgerRows.map((row) => ({ version: row.version, name: row.name })),
    ledger_fingerprint_sha256: approval.ledger_fingerprint_sha256,
    required_approval_message: approval.required_approval_message,
    database_proof: proof,
    boundaries: {
      database_writes: args.mode === "apply",
      transaction_rolled_back: args.mode === "dry-run",
      release_status: "hidden",
      app_visibility_activation: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
      global_db_push: false,
    },
  };
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_catalog_promotion_writer_v1");
  await fs.mkdir(outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(
    `${JSON.stringify({ out_dir: outDir, status: result.status, plan: plan.promotion_plan_sha256 })}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

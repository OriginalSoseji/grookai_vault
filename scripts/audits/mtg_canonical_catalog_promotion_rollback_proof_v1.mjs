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

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_CATALOG_PROMOTION_ROLLBACK_PROOF_V1";
const MTG_GAME_ID = "4d544700-0000-4000-8000-000000000001";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const args = { payload: null, outDir: null };
  for (const arg of argv) {
    if (arg.startsWith("--payload=")) args.payload = path.resolve(arg.slice(10));
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.payload) throw new Error("--payload=<writer_payload.json> is required");
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function assertEqual(actual, expected, label) {
  if (Number(actual) !== Number(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function baseline(client, plan) {
  const result = await client.query(
    `select jsonb_build_object(
       'foundation_migration_present', exists (
         select 1 from supabase_migrations.schema_migrations where version = '20260813190000'
       ),
       'visibility_migration_present', exists (
         select 1 from supabase_migrations.schema_migrations where version = '20260813200000'
       ),
       'visibility_table_present', to_regclass('public.catalog_game_release_controls') is not null,
       'staging_batch_count', (
         select count(*) from public.mtg_canonical_import_batches
         where id = $1
           and payload_fingerprint_sha256 = $2
       ),
       'staging_row_count', (
         select count(*) from public.mtg_canonical_import_rows where batch_id = $1
       ),
       'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
       'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
       'mtg_card_count', (select count(*) from public.card_prints where game_id = $3),
       'pokemon_card_count', (
         select count(*)
         from public.card_prints card
         join public.games game on game.id = card.game_id
         where game.code = 'pokemon'
       )
     ) as value`,
    [plan.staging_batch_id, plan.writer_payload_fingerprint, MTG_GAME_ID],
  );
  return result.rows[0].value;
}

async function collisionReadback(client, rows) {
  const result = await client.query(
    `select jsonb_build_object(
       'set_ids', (select count(*) from public.sets where id = any($1::uuid[])),
       'set_codes', (select count(*) from public.sets where lower(code) = any($2::text[])),
       'card_print_ids', (select count(*) from public.card_prints where id = any($3::uuid[])),
       'parent_gv_ids', (select count(*) from public.card_prints where gv_id = any($4::text[])),
       'identity_ids', (select count(*) from public.card_print_identity where id = any($5::uuid[])),
       'identity_hashes', (
         select count(*) from public.card_print_identity where identity_key_hash = any($6::text[])
       ),
       'printing_ids', (select count(*) from public.card_printings where id = any($7::uuid[])),
       'printing_gv_ids', (
         select count(*) from public.card_printings where printing_gv_id = any($8::text[])
       ),
       'parent_mappings', (
         select count(*) from public.external_mappings
         where source = 'scryfall' and external_id = any($9::text[])
       ),
       'printing_mappings', (
         select count(*) from public.external_printing_mappings
         where source = 'tcgplayer_market' and external_id = any($10::text[])
       )
     ) as value`,
    [
      rows.sets.map((row) => row.id),
      rows.sets.map((row) => row.code.toLowerCase()),
      rows.card_prints.map((row) => row.id),
      rows.card_prints.map((row) => row.gv_id),
      rows.card_print_identity.map((row) => row.id),
      rows.card_print_identity.map((row) => row.identity_key_hash),
      rows.card_printings.map((row) => row.id),
      rows.card_printings.map((row) => row.printing_gv_id),
      rows.external_mappings.map((row) => row.external_id),
      rows.external_printing_mappings.map((row) => row.external_id),
    ],
  );
  return result.rows[0].value;
}

async function visiblePokemonCount(client, role) {
  await client.query(`set local role ${role}`);
  await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
  try {
    const result = await client.query(
      `select count(*)::integer as count
       from public.card_prints card
       join public.games game on game.id = card.game_id
       where game.code = 'pokemon'`,
    );
    return result.rows[0].count;
  } finally {
    await client.query("reset role");
  }
}

async function insertPromotionRows(client, rows) {
  const inserted = {};
  inserted.sets = (
    await client.query(
      `insert into public.sets (
         id, game, code, name, release_date, source, set_role,
         identity_domain_default, identity_model, logo_url, symbol_url,
         hero_image_url, hero_image_source
       )
       select id, game, code, name, release_date, source, set_role,
              identity_domain_default, identity_model, logo_url, symbol_url,
              hero_image_url, hero_image_source
       from jsonb_to_recordset($1::jsonb) as row(
         id uuid, game text, code text, name text, release_date date, source jsonb,
         set_role text, identity_domain_default text, identity_model text,
         logo_url text, symbol_url text, hero_image_url text, hero_image_source text
       )`,
      [JSON.stringify(rows.sets)],
    )
  ).rowCount;
  inserted.card_prints = (
    await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url,
         image_alt_url, image_source, image_status, tcgplayer_id, external_ids,
         set_code, artist, variants, print_identity_key, gv_id, identity_domain,
         printed_identity_modifier, set_identity_model, data_quality_flags
       )
       select id, game_id, set_id, name, number, variant_key, rarity, image_url,
              image_alt_url, image_source, image_status, tcgplayer_id, external_ids,
              set_code, artist, variants, print_identity_key, gv_id, identity_domain,
              printed_identity_modifier, set_identity_model, data_quality_flags
       from jsonb_to_recordset($1::jsonb) as row(
         id uuid, game_id uuid, set_id uuid, name text, number text, variant_key text,
         rarity text, image_url text, image_alt_url text, image_source text,
         image_status text, tcgplayer_id text, external_ids jsonb, set_code text,
         artist text, variants jsonb, print_identity_key text, gv_id text,
         identity_domain text, printed_identity_modifier text, set_identity_model text,
         data_quality_flags jsonb
       )`,
      [JSON.stringify(rows.card_prints)],
    )
  ).rowCount;
  inserted.card_print_identity = (
    await client.query(
      `insert into public.card_print_identity (
         id, card_print_id, identity_domain, set_code_identity, printed_number,
         normalized_printed_name, source_name_raw, identity_payload,
         identity_key_version, identity_key_hash, is_active
       )
       select id, card_print_id, identity_domain, set_code_identity, printed_number,
              normalized_printed_name, source_name_raw, identity_payload,
              identity_key_version, identity_key_hash, is_active
       from jsonb_to_recordset($1::jsonb) as row(
         id uuid, card_print_id uuid, identity_domain text, set_code_identity text,
         printed_number text, normalized_printed_name text, source_name_raw text,
         identity_payload jsonb, identity_key_version text, identity_key_hash text,
         is_active boolean
       )`,
      [JSON.stringify(rows.card_print_identity)],
    )
  ).rowCount;
  inserted.card_printings = (
    await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source,
         provenance_ref, created_by, printing_gv_id, image_source, image_path,
         image_url, image_alt_url, image_status, image_note
       )
       select id, card_print_id, finish_key, is_provisional, provenance_source,
              provenance_ref, created_by, printing_gv_id, image_source, image_path,
              image_url, image_alt_url, image_status, image_note
       from jsonb_to_recordset($1::jsonb) as row(
         id uuid, card_print_id uuid, finish_key text, is_provisional boolean,
         provenance_source text, provenance_ref text, created_by text,
         printing_gv_id text, image_source text, image_path text, image_url text,
         image_alt_url text, image_status text, image_note text
       )`,
      [JSON.stringify(rows.card_printings)],
    )
  ).rowCount;
  inserted.external_mappings = (
    await client.query(
      `insert into public.external_mappings (
         card_print_id, source, external_id, active, meta
       )
       select card_print_id, source, external_id, active, meta
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id uuid, source text, external_id text, active boolean, meta jsonb
       )`,
      [JSON.stringify(rows.external_mappings)],
    )
  ).rowCount;
  inserted.external_printing_mappings = (
    await client.query(
      `insert into public.external_printing_mappings (
         card_printing_id, source, external_id, active, meta
       )
       select card_printing_id, source, external_id, active, meta
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id uuid, source text, external_id text, active boolean, meta jsonb
       )`,
      [JSON.stringify(rows.external_printing_mappings)],
    )
  ).rowCount;
  return inserted;
}

async function exactReadback(client, rows) {
  const checks = {};
  checks.sets = (
    await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb) as row(
           id uuid, game text, code text, name text, release_date date, source jsonb,
           set_role text, identity_domain_default text, identity_model text,
           logo_url text, symbol_url text, hero_image_url text, hero_image_source text
         )
       )
       select count(*)::integer as planned_count,
              count(actual.id)::integer as actual_count,
              count(actual.id) filter (where
                actual.game is not distinct from planned.game and
                actual.code is not distinct from planned.code and
                actual.name is not distinct from planned.name and
                actual.release_date is not distinct from planned.release_date and
                actual.source is not distinct from planned.source and
                actual.set_role is not distinct from planned.set_role and
                actual.identity_domain_default is not distinct from planned.identity_domain_default and
                actual.identity_model is not distinct from planned.identity_model and
                actual.logo_url is not distinct from planned.logo_url and
                actual.symbol_url is not distinct from planned.symbol_url and
                actual.hero_image_url is not distinct from planned.hero_image_url and
                actual.hero_image_source is not distinct from planned.hero_image_source
              )::integer as exact_count
       from planned left join public.sets actual on actual.id = planned.id`,
      [JSON.stringify(rows.sets)],
    )
  ).rows[0];
  checks.card_prints = (
    await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb) as row(
           id uuid, game_id uuid, set_id uuid, name text, number text, variant_key text,
           rarity text, image_url text, image_alt_url text, image_source text,
           image_status text, tcgplayer_id text, external_ids jsonb, set_code text,
           artist text, variants jsonb, print_identity_key text, gv_id text,
           identity_domain text, printed_identity_modifier text, set_identity_model text,
           data_quality_flags jsonb
         )
       )
       select count(*)::integer as planned_count,
              count(actual.id)::integer as actual_count,
              count(actual.id) filter (where
                actual.game_id = planned.game_id and actual.set_id = planned.set_id and
                actual.name = planned.name and actual.number is not distinct from planned.number and
                actual.variant_key is not distinct from planned.variant_key and
                actual.rarity is not distinct from planned.rarity and
                actual.image_url is not distinct from planned.image_url and
                actual.image_alt_url is not distinct from planned.image_alt_url and
                actual.image_source is not distinct from planned.image_source and
                actual.image_status is not distinct from planned.image_status and
                actual.tcgplayer_id is not distinct from planned.tcgplayer_id and
                actual.external_ids is not distinct from planned.external_ids and
                actual.set_code is not distinct from planned.set_code and
                actual.artist is not distinct from planned.artist and
                actual.variants is not distinct from planned.variants and
                actual.print_identity_key is not distinct from planned.print_identity_key and
                actual.gv_id is not distinct from planned.gv_id and
                actual.identity_domain is not distinct from planned.identity_domain and
                actual.printed_identity_modifier is not distinct from planned.printed_identity_modifier and
                actual.set_identity_model is not distinct from planned.set_identity_model and
                actual.data_quality_flags is not distinct from planned.data_quality_flags
              )::integer as exact_count
       from planned left join public.card_prints actual on actual.id = planned.id`,
      [JSON.stringify(rows.card_prints)],
    )
  ).rows[0];
  checks.card_print_identity = (
    await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb) as row(
           id uuid, card_print_id uuid, identity_domain text, set_code_identity text,
           printed_number text, normalized_printed_name text, source_name_raw text,
           identity_payload jsonb, identity_key_version text, identity_key_hash text,
           is_active boolean
         )
       )
       select count(*)::integer as planned_count,
              count(actual.id)::integer as actual_count,
              count(actual.id) filter (where
                actual.card_print_id = planned.card_print_id and
                actual.identity_domain = planned.identity_domain and
                actual.set_code_identity = planned.set_code_identity and
                actual.printed_number = planned.printed_number and
                actual.normalized_printed_name is not distinct from planned.normalized_printed_name and
                actual.source_name_raw is not distinct from planned.source_name_raw and
                actual.identity_payload = planned.identity_payload and
                actual.identity_key_version = planned.identity_key_version and
                actual.identity_key_hash = planned.identity_key_hash and
                actual.is_active = planned.is_active
              )::integer as exact_count
       from planned left join public.card_print_identity actual on actual.id = planned.id`,
      [JSON.stringify(rows.card_print_identity)],
    )
  ).rows[0];
  checks.card_printings = (
    await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb) as row(
           id uuid, card_print_id uuid, finish_key text, is_provisional boolean,
           provenance_source text, provenance_ref text, created_by text,
           printing_gv_id text, image_source text, image_path text, image_url text,
           image_alt_url text, image_status text, image_note text
         )
       )
       select count(*)::integer as planned_count,
              count(actual.id)::integer as actual_count,
              count(actual.id) filter (where
                actual.card_print_id = planned.card_print_id and
                actual.finish_key = planned.finish_key and
                actual.is_provisional = planned.is_provisional and
                actual.provenance_source is not distinct from planned.provenance_source and
                actual.provenance_ref is not distinct from planned.provenance_ref and
                actual.created_by is not distinct from planned.created_by and
                actual.printing_gv_id is not distinct from planned.printing_gv_id and
                actual.image_source is not distinct from planned.image_source and
                actual.image_path is not distinct from planned.image_path and
                actual.image_url is not distinct from planned.image_url and
                actual.image_alt_url is not distinct from planned.image_alt_url and
                actual.image_status is not distinct from planned.image_status and
                actual.image_note is not distinct from planned.image_note
              )::integer as exact_count
       from planned left join public.card_printings actual on actual.id = planned.id`,
      [JSON.stringify(rows.card_printings)],
    )
  ).rows[0];
  checks.external_mappings = (
    await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb) as row(
           card_print_id uuid, source text, external_id text, active boolean, meta jsonb
         )
       )
       select count(*)::integer as planned_count,
              count(actual.id)::integer as actual_count,
              count(actual.id) filter (where
                actual.card_print_id = planned.card_print_id and
                actual.active = planned.active and actual.meta = planned.meta
              )::integer as exact_count
       from planned left join public.external_mappings actual
         on actual.source = planned.source and actual.external_id = planned.external_id`,
      [JSON.stringify(rows.external_mappings)],
    )
  ).rows[0];
  checks.external_printing_mappings = (
    await client.query(
      `with planned as (
         select * from jsonb_to_recordset($1::jsonb) as row(
           card_printing_id uuid, source text, external_id text, active boolean, meta jsonb
         )
       )
       select count(*)::integer as planned_count,
              count(actual.id)::integer as actual_count,
              count(actual.id) filter (where
                actual.card_printing_id = planned.card_printing_id and
                actual.active = planned.active and actual.meta = planned.meta
              )::integer as exact_count
       from planned left join public.external_printing_mappings actual
         on actual.source = planned.source and actual.external_id = planned.external_id`,
      [JSON.stringify(rows.external_printing_mappings)],
    )
  ).rows[0];
  return checks;
}

async function clientVisibility(client, role, setCode) {
  await client.query(`set local role ${role}`);
  await client.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
  try {
    const result = await client.query(
      `select jsonb_build_object(
         'game_count', (select count(*) from public.games where code = 'mtg'),
         'set_count', (select count(*) from public.sets where game = 'mtg'),
         'card_count', (select count(*) from public.card_prints where game_id = $1),
         'identity_count', (
           select count(*) from public.card_print_identity identity_row
           join public.card_prints card on card.id = identity_row.card_print_id
           where card.game_id = $1
         ),
         'printing_count', (
           select count(*) from public.card_printings printing
           join public.card_prints card on card.id = printing.card_print_id
           where card.game_id = $1
         ),
         'legacy_search_count', (
           select count(*) from public.search_card_prints_v1(null, $2, null, 1000, 0)
         ),
         'print_search_count', (
           select count(*) from public.search_print_identity_v1(null, $2, null, null, 1000, 0)
         ),
         'pokemon_card_count', (
           select count(*)
           from public.card_prints card
           join public.games game on game.id = card.game_id
           where game.code = 'pokemon'
         )
       ) as value`,
      [MTG_GAME_ID, setCode],
    );
    return result.rows[0].value;
  } finally {
    await client.query("reset role");
  }
}

async function rollbackProof({ payload, plan, foundationSql, visibilitySql }) {
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is required");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
  });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query("begin");
    transactionOpen = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '240s'");
    const before = await baseline(client, plan);
    const authenticatedPokemonBefore = await visiblePokemonCount(client, "authenticated");
    if (before.foundation_migration_present) throw new Error("Foundation migration is already applied");
    if (before.visibility_migration_present) throw new Error("Visibility migration is already applied");
    if (before.visibility_table_present) throw new Error("Visibility table already exists");
    assertEqual(before.staging_batch_count, 1, "staging batch count");
    assertEqual(before.staging_row_count, 2866, "staging row count");
    assertEqual(before.mtg_game_count, 0, "baseline MTG game count");
    assertEqual(before.mtg_set_count, 0, "baseline MTG set count");
    assertEqual(before.mtg_card_count, 0, "baseline MTG card count");
    const collisions = await collisionReadback(client, plan.rows);
    for (const [name, count] of Object.entries(collisions)) assertEqual(count, 0, name);

    await client.query(stripMtgPromotionMigrationEnvelopeV1(foundationSql));
    await client.query(stripMtgPromotionMigrationEnvelopeV1(visibilitySql));
    const inserted = await insertPromotionRows(client, plan.rows);
    for (const [name, expected] of Object.entries(plan.row_counts)) {
      assertEqual(inserted[name], expected, `${name} inserted rows`);
    }
    const exact = await exactReadback(client, plan.rows);
    for (const [name, check] of Object.entries(exact)) {
      assertEqual(check.planned_count, plan.row_counts[name], `${name} planned readback`);
      assertEqual(check.actual_count, plan.row_counts[name], `${name} actual readback`);
      assertEqual(check.exact_count, plan.row_counts[name], `${name} exact readback`);
    }
    const serviceReadback = await client.query(
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
    const service = serviceReadback.rows[0].value;
    assertEqual(service.mtg_game_count, 1, "service MTG game count");
    assertEqual(service.mtg_set_count, plan.row_counts.sets, "service MTG set count");
    assertEqual(service.mtg_card_count, plan.row_counts.card_prints, "service MTG card count");
    assertEqual(
      service.mtg_identity_count,
      plan.row_counts.card_print_identity,
      "service MTG identity count",
    );
    assertEqual(
      service.mtg_printing_count,
      plan.row_counts.card_printings,
      "service MTG printing count",
    );
    if (service.release_status !== "hidden") throw new Error("MTG release is not hidden");
    assertEqual(service.pokemon_card_count, before.pokemon_card_count, "Pokemon service count");

    const anon = await clientVisibility(client, "anon", payload.selected_set.code);
    const authenticated = await clientVisibility(
      client,
      "authenticated",
      payload.selected_set.code,
    );
    for (const [role, evidence] of Object.entries({ anon, authenticated })) {
      for (const key of [
        "game_count",
        "set_count",
        "card_count",
        "identity_count",
        "printing_count",
        "legacy_search_count",
        "print_search_count",
      ]) {
        assertEqual(evidence[key], 0, `${role} ${key}`);
      }
    }
    assertEqual(
      authenticated.pokemon_card_count,
      authenticatedPokemonBefore,
      "authenticated Pokemon visibility",
    );

    await client.query("rollback");
    transactionOpen = false;
    const after = await baseline(client, plan);
    if (after.visibility_table_present) throw new Error("Visibility table survived rollback");
    assertEqual(after.staging_batch_count, 1, "post-rollback staging batch count");
    assertEqual(after.staging_row_count, 2866, "post-rollback staging row count");
    assertEqual(after.mtg_game_count, 0, "post-rollback MTG game count");
    assertEqual(after.mtg_set_count, 0, "post-rollback MTG set count");
    assertEqual(after.mtg_card_count, 0, "post-rollback MTG card count");
    assertEqual(after.pokemon_card_count, before.pokemon_card_count, "post-rollback Pokemon count");
    return {
      before,
      collisions,
      inserted,
      exact_readback: exact,
      service_readback: service,
      client_visibility: { anon, authenticated },
      authenticated_pokemon_before: authenticatedPokemonBefore,
      after_rollback: after,
    };
  } catch (error) {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function report(result) {
  return `# MTG DSK Canonical Promotion Rollback Proof

- Status: **${result.status.toUpperCase()}**
- Promotion plan: \`${result.plan.promotion_plan_sha256}\`
- Promotion rows: \`${result.plan.total_rows}\`
- Release status inside proof: \`${result.proof.service_readback.release_status}\`
- Anonymous MTG cards: \`${result.proof.client_visibility.anon.card_count}\`
- Authenticated MTG cards: \`${result.proof.client_visibility.authenticated.card_count}\`
- Anonymous search rows: \`${result.proof.client_visibility.anon.print_search_count}\`
- Authenticated search rows: \`${result.proof.client_visibility.authenticated.print_search_count}\`
- Canonical MTG cards after rollback: \`${result.proof.after_rollback.mtg_card_count}\`
- Durable canonical writes: \`0\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(await fs.readFile(args.payload, "utf8"));
  const foundationFile = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260813190000_mtg_canonical_catalog_foundation_v1.sql",
  );
  const visibilityFile = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260813200000_mtg_catalog_app_visibility_boundary_v1.sql",
  );
  const foundationSql = await fs.readFile(foundationFile, "utf8");
  const visibilitySql = await fs.readFile(visibilityFile, "utf8");
  const plan = buildMtgCanonicalPromotionContractV1({
    payload,
    foundationMigrationSha256: sha256(foundationSql),
    visibilityMigrationSha256: sha256(visibilitySql),
  });
  const proof = await rollbackProof({ payload, plan, foundationSql, visibilitySql });
  const publicPlan = { ...plan, rows: undefined };
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    status: "rollback_proof_passed",
    plan: publicPlan,
    proof,
    boundaries: {
      durable_database_writes: false,
      foundation_migration_applied: false,
      visibility_migration_applied: false,
      canonical_promotion_applied: false,
      app_visibility_activated: false,
      storage_writes: false,
      image_pointer_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
    },
  };
  const outDir =
    args.outDir ??
    path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "mtg_canonical_catalog_promotion_rollback_proof_v1",
    );
  await fs.mkdir(outDir, { recursive: true });
  const planBody = await writeJson(path.join(outDir, "promotion_plan.json"), publicPlan);
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "promotion_plan.json": sha256(planBody),
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

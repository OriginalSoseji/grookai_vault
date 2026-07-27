import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomInt, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import pg from "pg";

const { Client } = pg;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WORKER = path.join(
  REPO_ROOT,
  "scripts",
  "workers",
  "tcgplayer_market_publication_worker_v1.mjs",
);
const DEFAULT_URL =
  "postgresql://postgres:postgres@127.0.0.1:54330/postgres";

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    DEFAULT_URL
  );
}

function assertLocalUrl(url) {
  if (!/localhost|127\.0\.0\.1|\[::1\]/i.test(url)) {
    throw new Error("local smoke test refuses a non-local database URL");
  }
}

async function runWorker(url, runKey, outRoot) {
  return execFileAsync(
    process.execPath,
    [
      WORKER,
      "--mode=canary",
      `--run-key=${runKey}`,
      "--limit=1",
      `--out-root=${outRoot}`,
    ],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, SUPABASE_DB_URL: url },
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  );
}

async function withClient(url, callback) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function seedFixture(client, fixture) {
  const base = await client.query(
    `select
       (select id from public.games where code = 'pokemon' limit 1) as game_id,
       (select id from public.sets order by created_at, id limit 1) as set_id`,
  );
  assert.ok(base.rows[0].game_id, "local Pokemon game seed is required");
  assert.ok(base.rows[0].set_id, "at least one local set seed is required");

  await client.query("begin");
  try {
    await client.query(
      `insert into public.card_prints (
         id,
         game_id,
         set_id,
         name,
         number,
         rarity,
         set_code,
         gv_id,
         identity_domain
       )
       values ($1, $2, $3, 'Pricing Smoke Pikachu', '1', 'Rare Holo', 'SMOKE', $4, 'pokemon_eng_standard')`,
      [
        fixture.cardPrintId,
        base.rows[0].game_id,
        base.rows[0].set_id,
        fixture.gvId,
      ],
    );
    await client.query(
      `insert into public.card_print_identity (
         id,
         card_print_id,
         identity_domain,
         set_code_identity,
         printed_number,
         normalized_printed_name,
         source_name_raw,
         identity_payload,
         identity_key_version,
         identity_key_hash,
         is_active
       )
       values (
         $1, $2, 'pokemon_eng_standard', 'SMOKE', '1',
         'pricing smoke pikachu', 'Pricing Smoke Pikachu',
         '{"variant_key_current":"standard"}'::jsonb,
         'pokemon_eng_standard:v1', $3, true
       )`,
      [randomUUID(), fixture.cardPrintId, randomUUID().replaceAll("-", "")],
    );
    await client.query(
      `insert into public.card_printings (
         id,
         card_print_id,
         finish_key,
         printing_gv_id,
         provenance_source,
         provenance_ref
       )
       values ($1, $2, 'holo', $3, 'local_smoke', $4)`,
      [
        fixture.cardPrintingId,
        fixture.cardPrintId,
        fixture.printingGvId,
        fixture.sourceRunKey,
      ],
    );
    await client.query(
      `insert into public.external_mappings (
         card_print_id,
         source,
         external_id,
         meta,
         active
       )
       values (
         $1,
         'tcgplayer',
         $2,
         '{"derived_from":"local_smoke_deterministic_mapping","confidence":1}'::jsonb,
         true
       )`,
      [fixture.cardPrintId, String(fixture.productId)],
    );
    await client.query(
      `insert into public.tcgcsv_source_sync_runs (
         id,
         run_key,
         sync_mode,
         status,
         source_marker,
         observed_on,
         request_count,
         category_count,
         group_count,
         product_count,
         price_row_count,
         inserted_count,
         failed_count,
         artifact_hash,
         worker_version,
         parser_version,
         schema_contract_version,
         git_commit_sha,
         started_at,
         finished_at
       )
       values (
         $1, $2, 'current_full_sync', 'completed', $3, current_date,
         1, 1, 1, 1, 1, 1, 0, $4,
         'LOCAL_SMOKE', 'LOCAL_SMOKE', 'LOCAL_SMOKE', 'local-smoke',
         now() - interval '2 minutes', now() - interval '1 minute'
       )`,
      [
        fixture.sourceRunId,
        fixture.sourceRunKey,
        fixture.sourceMarker,
        fixture.runArtifactHash,
      ],
    );
    await client.query(
      `insert into public.tcgcsv_source_artifacts (
         id,
         sync_run_id,
         run_key,
         artifact_kind,
         local_path,
         sha256,
         byte_size,
         fetched_at,
         http_status,
         observed_on
       )
       values
         ($1, $2, $3, 'prices', $4, $5, 4096, now() - interval '1 minute', 200, current_date),
         ($6, $2, $3, 'run_summary', $7, $8, 1024, now() - interval '1 minute', 200, current_date)`,
      [
        fixture.priceArtifactId,
        fixture.sourceRunId,
        fixture.sourceRunKey,
        `local-smoke/${fixture.sourceRunKey}/prices.json`,
        fixture.priceArtifactHash,
        fixture.summaryArtifactId,
        `local-smoke/${fixture.sourceRunKey}/summary.json`,
        fixture.runArtifactHash,
      ],
    );
    await client.query(
      `insert into public.tcgcsv_source_products (
         product_id,
         category_id,
         group_id,
         name,
         clean_name,
         extended_data,
         raw_payload,
         payload_hash,
         last_seen_run_id,
         source_active,
         catalog_metadata_status
       )
       values (
         $1::bigint, 3, 1, 'Pricing Smoke Pikachu', 'Pricing Smoke Pikachu',
         '[{"name":"Number","value":"1"}]'::jsonb,
         jsonb_build_object(
           'productId', $1::bigint,
           'name', 'Pricing Smoke Pikachu'
         ),
         $2, $3, true, 'current'
       )`,
      [
        fixture.productId,
        fixture.productPayloadHash,
        fixture.sourceRunId,
      ],
    );
    await client.query(
      `insert into public.tcgcsv_source_price_daily_observations (
         id,
         source_price_row_identity,
         product_id,
         category_id,
         group_id,
         subtype_name,
         subtype_name_normalized,
         observed_on,
         low_price,
         mid_price,
         high_price,
         market_price,
         direct_low_price,
         currency,
         raw_payload,
         payload_hash,
         source_artifact_id,
         first_seen_run_id,
         last_seen_run_id,
         first_observed_at,
         last_observed_at
       )
       values (
         $1, $2, $3, 3, 1, 'Holofoil', 'holofoil', current_date,
         9.50, 11.00, 15.00, 12.34, 10.25, 'USD',
         '{"subTypeName":"Holofoil","marketPrice":12.34}'::jsonb,
         $4, $5, $6, $6, now() - interval '1 minute', now() - interval '1 minute'
       )`,
      [
        fixture.observationId,
        fixture.rowIdentity,
        fixture.productId,
        fixture.rowHash,
        fixture.priceArtifactId,
        fixture.sourceRunId,
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function publicationState(client, runKey) {
  const result = await client.query(
    `select
       pipeline_run.id as run_id,
       pipeline_run.state,
       pipeline_run.reconciliation_state,
       pipeline_run.selected_count,
       pipeline_run.eligible_count,
       pipeline_run.snapshot_count,
       pipeline_run.required_phase_count,
       pipeline_run.succeeded_phase_count,
       publication_set.id as publication_set_id,
       publication_set.publication_state,
       (
         select count(*)::integer
         from public.market_price_pipeline_phase_attempts phase
         where phase.run_id = pipeline_run.id
       ) as phase_attempt_rows
     from public.market_price_pipeline_runs pipeline_run
     join public.market_price_publication_sets publication_set
       on publication_set.run_id = pipeline_run.id
     where pipeline_run.run_key = $1`,
    [runKey],
  );
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function main() {
  const url = connectionString();
  assertLocalUrl(url);
  const fixtureKey = new Date().toISOString().replace(/[:.]/g, "-");
  const fixture = {
    cardPrintId: randomUUID(),
    cardPrintingId: randomUUID(),
    gvId: `GV-PK-SMOKE-${fixtureKey}`,
    printingGvId: `GV-PK-SMOKE-${fixtureKey}-HOLO`,
    productId: randomInt(900_000_000, 999_999_999),
    sourceRunId: randomUUID(),
    sourceRunKey: `LOCAL-SOURCE-${fixtureKey}`,
    sourceMarker: `LOCAL-MARKER-${fixtureKey}`,
    priceArtifactId: randomUUID(),
    summaryArtifactId: randomUUID(),
    observationId: randomUUID(),
    rowIdentity: `3:990001:holofoil:${fixtureKey}`,
    rowHash: randomUUID().replaceAll("-", ""),
    productPayloadHash: randomUUID().replaceAll("-", ""),
    priceArtifactHash: randomUUID().replaceAll("-", ""),
    runArtifactHash: randomUUID().replaceAll("-", ""),
  };
  const outRoot = path.join(
    REPO_ROOT,
    "artifacts",
    "market_pricing_product_v1",
    "local_smoke",
    fixtureKey,
  );
  await fs.mkdir(outRoot, { recursive: true });

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await seedFixture(client, fixture);
    const firstRunKey = `LOCAL-PUBLICATION-A-${fixtureKey}`;
    await runWorker(url, firstRunKey, outRoot);
    const first = await publicationState(client, firstRunKey);
    assert.equal(first.state, "verified");
    assert.equal(first.reconciliation_state, "reconciled");
    assert.equal(Number(first.selected_count), 1);
    assert.equal(Number(first.eligible_count), 1);
    assert.equal(Number(first.snapshot_count), 1);
    assert.equal(
      Number(first.succeeded_phase_count),
      Number(first.required_phase_count),
    );

    const current = await client.query(
      `select *
         from public.v_market_price_current_v1
        where card_printing_id = $1`,
      [fixture.cardPrintingId],
    );
    assert.equal(current.rowCount, 1);
    assert.equal(Number(current.rows[0].market_price), 12.34);
    assert.equal(current.rows[0].publication_set_id, first.publication_set_id);

    await runWorker(url, firstRunKey, outRoot);
    const resumed = await publicationState(client, firstRunKey);
    assert.equal(
      Number(resumed.phase_attempt_rows),
      Number(first.phase_attempt_rows),
      "resuming a verified run must not repeat completed phases",
    );

    const secondRunKey = `LOCAL-PUBLICATION-B-${fixtureKey}`;
    await runWorker(url, secondRunKey, outRoot);
    const second = await publicationState(client, secondRunKey);
    assert.equal(second.state, "verified");
    assert.notEqual(second.publication_set_id, first.publication_set_id);

    const pointerBeforeRollback = await client.query(
      `select * from public.market_price_current_publication where singleton`,
    );
    assert.equal(
      pointerBeforeRollback.rows[0].publication_set_id,
      second.publication_set_id,
    );
    const rollback = await client.query(
      `select public.rollback_market_price_publication_set_v1($1, $2) as restored_set_id`,
      [
        second.publication_set_id,
        "local smoke verifies atomic rollback to prior publication",
      ],
    );
    assert.equal(rollback.rows[0].restored_set_id, first.publication_set_id);

    const pointerAfterRollback = await client.query(
      `select * from public.market_price_current_publication where singleton`,
    );
    assert.equal(
      pointerAfterRollback.rows[0].publication_set_id,
      first.publication_set_id,
    );

    await withClient(url, async (immutabilityClient) => {
      await assert.rejects(
        immutabilityClient.query(
          `update public.market_price_qualification_decisions
              set market_price = 99
            where run_id = $1`,
          [first.run_id],
        ),
        /append-only/i,
      );
    });

    const authenticated = await withClient(
      url,
      async (authenticatedClient) => {
        await authenticatedClient.query("begin");
        try {
          await authenticatedClient.query("set local role authenticated");
          return await authenticatedClient.query(
            `select count(*)::integer as row_count
               from public.get_market_pricing_read_model_v1(array[$1]::uuid[], null)`,
            [fixture.cardPrintId],
          );
        } finally {
          await authenticatedClient.query("rollback");
        }
      },
    );
    assert.equal(Number(authenticated.rows[0].row_count), 1);

    const provenance = current.rows[0].provenance_id;
    await withClient(url, async (authenticatedClient) => {
      await authenticatedClient.query("begin");
      try {
        await authenticatedClient.query("set local role authenticated");
        await assert.rejects(
          authenticatedClient.query(
            `select public.get_market_price_trace_v1($1) as trace`,
            [provenance],
          ),
          /permission denied/i,
        );
      } finally {
        await authenticatedClient.query("rollback");
      }
    });
    const trace = await client.query(
      `select public.get_market_price_trace_v1($1) as trace`,
      [provenance],
    );
    assert.equal(trace.rowCount, 1);
    assert.ok(trace.rows[0].trace);
    assert.equal(
      trace.rows[0].trace.source_observation_id,
      fixture.observationId,
    );

    const summary = {
      smoke_version: "TCGPLAYER_MARKET_PUBLICATION_LOCAL_SMOKE_V1",
      status: "passed",
      source_run_id: fixture.sourceRunId,
      card_print_id: fixture.cardPrintId,
      card_printing_id: fixture.cardPrintingId,
      first_run_id: first.run_id,
      first_publication_set_id: first.publication_set_id,
      second_run_id: second.run_id,
      second_publication_set_id: second.publication_set_id,
      restored_publication_set_id: rollback.rows[0].restored_set_id,
      market_price: Number(current.rows[0].market_price),
      authenticated_read_rows: Number(authenticated.rows[0].row_count),
      service_trace_rows: trace.rows[0].trace ? 1 : 0,
      artifact_root: path.relative(REPO_ROOT, outRoot).replace(/\\/g, "/"),
    };
    await fs.writeFile(
      path.join(outRoot, "local_smoke_summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[market-publication-local-smoke] ${error.stack || error.message}`);
  process.exitCode = 1;
});

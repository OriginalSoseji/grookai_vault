import assert from 'node:assert/strict';
import {randomUUID,randomInt} from 'node:crypto';
// Synthetic source and card fixture adapted from the pricing smoke seed.
export async function seedMappingPriceFixture(client, fixture) {
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
       values ($1, $2, $3, $5, $6, 'Rare Holo', 'SMOKE', $4, 'pokemon_eng_standard')`,
      [
        fixture.cardPrintId,
        base.rows[0].game_id,
        base.rows[0].set_id,
        fixture.gvId,
        fixture.canonicalName,
        fixture.canonicalNumber,
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
         $1, $2, 'pokemon_eng_standard', 'SMOKE', $4,
         $5, $6,
         '{"variant_key_current":"standard"}'::jsonb,
         'pokemon_eng_standard:v1', $3, true
       )`,
      [
        randomUUID(),
        fixture.cardPrintId,
        randomUUID().replaceAll("-", ""),
        fixture.canonicalNumber,
        fixture.canonicalName.toLowerCase(),
        fixture.canonicalName,
      ],
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
         $1::bigint, 3, 1, $4::text, $4::text,
         jsonb_build_array(
           jsonb_build_object('name', 'Number', 'value', $5::text)
         ),
         jsonb_build_object(
           'productId', $1::bigint,
           'name', $4::text
         ),
         $2, $3, true, 'current'
       )`,
      [
        fixture.productId,
        fixture.productPayloadHash,
        fixture.sourceRunId,
        fixture.canonicalName,
        fixture.canonicalNumber,
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


export function mappingPriceFixture(){
  const fixtureKey = new Date().toISOString().replace(/[:.]/g, "-");
  const fixtureSuffix = randomInt(100_000, 999_999);
  const fixture = {
    cardPrintId: randomUUID(),
    cardPrintingId: randomUUID(),
    ownerUserId: randomUUID(),
    ownerEmail: `pricing-smoke-${fixtureSuffix}@example.test`,
    ownerSlug: `pricing-smoke-${fixtureSuffix}`,
    exactVaultInstanceIdA: randomUUID(),
    exactVaultInstanceIdB: randomUUID(),
    unresolvedVaultInstanceId: randomUUID(),
    exactGvviIdA: `GV-VI-SMOKE-${fixtureSuffix}-A`,
    exactGvviIdB: `GV-VI-SMOKE-${fixtureSuffix}-B`,
    unresolvedGvviId: `GV-VI-SMOKE-${fixtureSuffix}-U`,
    gvId: `GV-PK-SMOKE-${fixtureKey}`,
    printingGvId: `GV-PK-SMOKE-${fixtureKey}-HOLO`,
    canonicalName: `Pricing Smoke Pikachu ${fixtureSuffix}`,
    canonicalNumber: `SMOKE-${fixtureSuffix}`,
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
return fixture;
}

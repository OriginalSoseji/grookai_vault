import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import { upsertPrinting } from '../../backend/printing/printing_upsert_v1.mjs';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

const TARGET = Object.freeze({
  card_print_id: '1a243678-bb93-4845-b979-b43a74d8a007',
  gv_id: 'GV-PK-SSP-057-PLAY-POKEMON-STAMP',
  finish_key: 'holo',
  printing_gv_id: 'GV-PK-SSP-057-PLAY-POKEMON-STAMP-HOLO',
  source: 'justtcg',
  external_id: 'pokemon-prize-pack-series-cards-pikachu-ex-057-191-double-rare',
  evidence_type: 'variant_printing_label',
  evidence_ref: 'Holofoil',
});

const APPLY = process.argv.includes('--apply');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'special_variant_printing_coverage_v1');
const OUT_PATH = path.join(
  OUT_DIR,
  APPLY ? 'pikachu_ssp057_printing_apply_v1.json' : 'pikachu_ssp057_printing_dry_run_v1.json',
);

function getDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function preflight(client) {
  const { rows } = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.gv_id,
       cp.name,
       cp.number,
       cp.set_code,
       cp.variant_key,
       count(cpr.id)::int as existing_child_count,
       count(cpr.id) filter (where cpr.finish_key = $3)::int as target_finish_child_count,
       count(collision.id)::int as printing_gv_collision_count,
       count(em.id) filter (
         where em.active = true and em.source = $4 and em.external_id = $5
       )::int as exact_parent_mapping_count,
       count(ri.id) filter (
         where ri.source = $4
           and ri.payload->>'_kind' = 'card'
           and ri.payload->>'_external_id' = $5
           and exists (
             select 1
             from jsonb_array_elements(coalesce(ri.payload->'variants', '[]'::jsonb)) variant
             where lower(coalesce(variant->>'printing', variant->>'finish', variant->>'name', variant->>'title', '')) = 'holofoil'
           )
       )::int as exact_holofoil_payload_count
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.card_printings collision on collision.printing_gv_id = $2
     left join public.external_mappings em on em.card_print_id = cp.id
     left join public.raw_imports ri
       on ri.source = em.source
      and ri.payload->>'_external_id' = em.external_id
     where cp.id = $1::uuid and cp.gv_id = $6
     group by cp.id, cp.gv_id, cp.name, cp.number, cp.set_code, cp.variant_key`,
    [
      TARGET.card_print_id,
      TARGET.printing_gv_id,
      TARGET.finish_key,
      TARGET.source,
      TARGET.external_id,
      TARGET.gv_id,
    ],
  );
  return rows[0] ?? null;
}

function assertPreflight(row) {
  if (!row) throw new Error('Target canonical parent was not found.');
  if (row.variant_key !== 'play_pokemon_stamp') throw new Error('Target variant key changed.');
  if (row.target_finish_child_count !== 0) throw new Error('Target holo child already exists.');
  if (row.printing_gv_collision_count !== 0) throw new Error('Target printing GV-ID collides.');
  if (row.exact_parent_mapping_count < 1) throw new Error('Exact active parent mapping is missing.');
  if (row.exact_holofoil_payload_count < 1) throw new Error('Exact stored Holofoil source evidence is missing.');
}

async function readback(client) {
  const { rows } = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text,
       cpr.finish_key,
       cpr.printing_gv_id,
       cpr.is_provisional,
       cpr.provenance_source,
       cpr.provenance_ref,
       fk.is_active as finish_is_active,
       not exists (
         select 1 from public.card_printing_truth_reviews ctr
         where ctr.card_printing_id = cpr.id
           and ctr.active = true
           and ctr.public_visibility in ('hidden_pending_review', 'hidden_unsupported')
       ) as passes_truth_visibility
     from public.card_printings cpr
     join public.finish_keys fk on fk.key = cpr.finish_key
     where cpr.card_print_id = $1::uuid
       and cpr.finish_key = $2
       and cpr.printing_gv_id = $3`,
    [TARGET.card_print_id, TARGET.finish_key, TARGET.printing_gv_id],
  );
  return rows;
}

async function main() {
  const dbUrl = getDbUrl();
  if (!dbUrl) throw new Error('Missing database URL.');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let before;
  let after = [];
  try {
    await client.query('begin read only');
    before = await preflight(client);
    await client.query('rollback');
    assertPreflight(before);

    if (APPLY) {
      const supabase = createBackendClient();
      await upsertPrinting({
        supabase,
        card_print_id: TARGET.card_print_id,
        finish_key: TARGET.finish_key,
        printing_gv_id: TARGET.printing_gv_id,
        source: TARGET.source,
        ref: TARGET.external_id,
        evidence: {
          source: TARGET.source,
          external_id: TARGET.external_id,
          evidence_type: TARGET.evidence_type,
          evidence_ref: TARGET.evidence_ref,
        },
        is_provisional: false,
        created_by: 'pikachu_ssp057_play_stamp_printing_repair_v1',
      });
      after = await readback(client);
      if (after.length !== 1) throw new Error(`Expected one readback row, received ${after.length}.`);
    }
  } finally {
    await client.end();
  }

  const payload = {
    version: 'PIKACHU_SSP057_PLAY_STAMP_PRINTING_REPAIR_V1',
    generated_at: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry_run',
    target: TARGET,
    preflight: before,
    db_writes_performed: APPLY,
    readback: after,
  };
  payload.fingerprint_sha256 = sha256(JSON.stringify(payload));
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({
    mode: payload.mode,
    target: TARGET.gv_id,
    preflight: before,
    readback: after,
    artifact: path.relative(ROOT, OUT_PATH),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

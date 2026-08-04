import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createBackendClient } from '../../backend/supabase_backend_client.mjs';
import { upsertPrinting } from '../../backend/printing/printing_upsert_v1.mjs';

const ROOT = process.cwd();

const TARGET = Object.freeze({
  card_print_id: '1a243678-bb93-4845-b979-b43a74d8a007',
  gv_id: 'GV-PK-SSP-057-PLAY-POKEMON-STAMP',
  card_printing_id: '0c231887-95a8-4f86-9c60-91b36e56ac2f',
  finish_key: 'holo',
  printing_gv_id: 'GV-PK-SSP-057-PLAY-POKEMON-STAMP-HOLO',
  tcgplayer_product_id: '648703',
  tcgplayer_sku_id: '8882935',
  master_fact_key: 'surging sparks|57|pikachu ex|holo',
});

const APPLY = process.argv.includes('--apply');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'special_variant_printing_coverage_v1');
const OUT_PATH = path.join(
  OUT_DIR,
  APPLY
    ? 'pikachu_ssp057_printing_provenance_apply_v1.json'
    : 'pikachu_ssp057_printing_provenance_dry_run_v1.json',
);
const MASTER_INDEX_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
  'english_master_index_printings_v1.json',
);

const PROVENANCE = Object.freeze({
  source: 'tcgplayer_catalog_corroborated',
  ref: `product:${TARGET.tcgplayer_product_id}|sku:${TARGET.tcgplayer_sku_id}|master:${TARGET.master_fact_key}`,
  official_prize_pack_gallery: 'https://play.pokemon.com/en-us/rewards/gallery/?filter=series7',
  tcgplayer_search: 'https://www.tcgplayer.com/search/pokemon/product?q=Pikachu+ex+-+057%2F191',
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function loadMasterFact() {
  const payload = JSON.parse(await fs.readFile(MASTER_INDEX_PATH, 'utf8'));
  const matches = (payload.printings ?? []).filter((row) => (
    row.status === 'master_verified'
    && row.key === TARGET.master_fact_key
    && row.finish_key === TARGET.finish_key
    && (row.sources ?? []).includes('tcgplayer_price_guide')
  ));
  if (matches.length !== 1) {
    throw new Error(`Expected one corroborating Master Index fact, received ${matches.length}.`);
  }
  return matches[0];
}

async function readExactlyOne(request, label) {
  const { data, error } = await request;
  if (error) throw new Error(`${label} read failed: ${error.message}`);
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error(`Expected one ${label} row, received ${data?.length ?? 0}.`);
  }
  return data[0];
}

async function readDatabaseEvidence(supabase) {
  const cardPrint = await readExactlyOne(
    supabase
      .from('card_prints')
      .select('id,gv_id,name,number,set_code,variant_key')
      .eq('id', TARGET.card_print_id)
      .limit(2),
    'canonical card print',
  );
  const printing = await readExactlyOne(
    supabase
      .from('card_printings')
      .select('id,card_print_id,finish_key,printing_gv_id,provenance_source,provenance_ref')
      .eq('id', TARGET.card_printing_id)
      .eq('card_print_id', TARGET.card_print_id)
      .eq('printing_gv_id', TARGET.printing_gv_id)
      .limit(2),
    'child printing',
  );
  const mapping = await readExactlyOne(
    supabase
      .from('external_mappings')
      .select('external_id')
      .eq('card_print_id', TARGET.card_print_id)
      .eq('source', 'justtcg')
      .eq('active', true)
      .limit(2),
    'active discovery mapping',
  );
  const rawImport = await readExactlyOne(
    supabase
      .from('raw_imports')
      .select('payload')
      .eq('source', 'justtcg')
      .eq('payload->>_external_id', mapping.external_id)
      .limit(2),
    'raw catalog evidence',
  );
  const payload = rawImport.payload ?? {};
  const exactHolofoilSkuPresent = (payload.variants ?? []).some((variant) => (
    String(variant?.printing ?? '').toLowerCase() === 'holofoil'
    && String(variant?.tcgplayerSkuId ?? '') === TARGET.tcgplayer_sku_id
  ));
  const row = {
    card_print_id: cardPrint.id,
    gv_id: cardPrint.gv_id,
    name: cardPrint.name,
    number: cardPrint.number,
    set_code: cardPrint.set_code,
    variant_key: cardPrint.variant_key,
    card_printing_id: printing.id,
    finish_key: printing.finish_key,
    printing_gv_id: printing.printing_gv_id,
    provenance_source: printing.provenance_source,
    provenance_ref: printing.provenance_ref,
    tcgplayer_product_id: String(payload.tcgplayerId ?? ''),
    exact_holofoil_sku_present: exactHolofoilSkuPresent,
  };
  if (row.gv_id !== TARGET.gv_id || row.variant_key !== 'play_pokemon_stamp') {
    throw new Error('Canonical parent identity changed before provenance repair.');
  }
  if (row.finish_key !== TARGET.finish_key || row.tcgplayer_product_id !== TARGET.tcgplayer_product_id) {
    throw new Error('Exact finish or TCGplayer product evidence changed before provenance repair.');
  }
  if (row.exact_holofoil_sku_present !== true) {
    throw new Error('Exact Holofoil SKU evidence is missing.');
  }
  return row;
}

async function main() {
  const masterFact = await loadMasterFact();
  const supabase = createBackendClient();
  const before = await readDatabaseEvidence(supabase);
  let after = null;

  if (APPLY) {
      await upsertPrinting({
        supabase,
        card_print_id: TARGET.card_print_id,
        finish_key: TARGET.finish_key,
        printing_gv_id: TARGET.printing_gv_id,
        source: PROVENANCE.source,
        ref: PROVENANCE.ref,
        evidence: {
          source: 'tcgplayer',
          external_id: TARGET.tcgplayer_product_id,
          evidence_type: 'exact_product_holofoil_sku_corroborated_by_master_index',
          evidence_ref: TARGET.tcgplayer_sku_id,
        },
        is_provisional: false,
        created_by: 'pikachu_ssp057_play_stamp_printing_provenance_repair_v1',
      });
      after = await readDatabaseEvidence(supabase);
      if (after.provenance_source !== PROVENANCE.source || after.provenance_ref !== PROVENANCE.ref) {
        throw new Error('Corrected printing provenance did not round-trip.');
      }
  }

  const payload = {
    version: 'PIKACHU_SSP057_PLAY_STAMP_PRINTING_PROVENANCE_REPAIR_V1',
    generated_at: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry_run',
    target: TARGET,
    authority_decision: 'JustTCG remains discovery evidence only. The persisted child provenance is the independently corroborated TCGplayer product/SKU, supported by the master-verified base finish and official Prize Pack identity.',
    provenance: PROVENANCE,
    master_fact: masterFact,
    before,
    after,
    db_writes_performed: APPLY,
  };
  payload.fingerprint_sha256 = sha256(JSON.stringify(payload));
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({
    mode: payload.mode,
    target: TARGET.gv_id,
    before_provenance: before.provenance_source,
    after_provenance: after?.provenance_source ?? null,
    artifact: path.relative(ROOT, OUT_PATH),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

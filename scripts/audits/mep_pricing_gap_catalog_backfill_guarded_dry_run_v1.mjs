import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'mep_pricing_gap_catalog_backfill_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'mep_pricing_gap_catalog_backfill_guarded_dry_run_v1.md');
const PACKAGE_ID = 'MEP-PRICING-GAP-CATALOG-BACKFILL-20261016';
const CREATED_BY = 'mep_pricing_gap_catalog_backfill_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

const TARGETS = [
  ['072', 'Mega Clefable ex', '696607'],
  ['073', 'Mega Gengar ex', '696608'],
  ['081', 'Mega Greninja ex', '704879'],
  ['088', 'Zarude', '706193'],
].map(([cardNumber, cardName, productId]) => ({
  set_key: 'mep',
  live_set_code: 'mep',
  set_name: 'MEP Black Star Promos',
  card_number: cardNumber,
  number_plain: cardNumber,
  card_name: cardName,
  finish_key: 'holo',
  mapping: {
    source: 'tcgplayer',
    external_id: productId,
    mapping_method: 'verified_master_set_index_v1',
    source_url: `https://www.tcgplayer.com/product/${productId}`,
  },
  evidence_urls: [
    `https://www.tcgplayer.com/product/${productId}`,
    `https://api.tcgdex.net/v2/en/cards/mep-${cardNumber}`,
    'https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list',
  ],
  evidence_note: `Exact TCGPlayer MEP product ${productId} supplies the Holofoil finish; the verified English Master Index independently fixes ${cardName} at MEP ${cardNumber}.`,
}));

const PACKAGE_IDS = {
  '072': {
    card_print_id: 'b51a0069-2f8c-4c6d-bae7-8ebdc34339df',
    card_printing_id: 'f788ae03-6a8e-446d-ba85-2297d9d6c7c0',
  },
  '073': {
    card_print_id: '9e37deec-786d-4f22-bf63-28350e6dc523',
    card_printing_id: 'b93fed6a-7dce-44af-ace8-652b000364e7',
  },
  '081': {
    card_print_id: 'c35b8cee-d244-401f-82a4-40070d77f72e',
    card_printing_id: 'f6aaf813-8176-40f0-9e36-e77e580c02fb',
  },
  '088': {
    card_print_id: '6a9d3fe6-d3b2-4f79-9eb2-b7b06eb68699',
    card_printing_id: '1a114f0e-4ac6-40b2-9420-2d393356d98f',
  },
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function resolveSet(client) {
  const result = await client.query(
    `select id::text as set_id, code, name, source, printed_total,
            printed_set_abbrev, identity_domain_default
       from public.sets
      where game = 'pokemon' and lower(code) = 'mep'
      order by id`,
  );
  if (result.rows.length !== 1) throw new Error(`expected one MEP set, found ${result.rows.length}`);
  if (result.rows[0].identity_domain_default !== 'pokemon_eng_standard') {
    throw new Error(`MEP identity domain is ${result.rows[0].identity_domain_default}`);
  }
  return result.rows[0];
}

async function buildPlan(client, setRow) {
  const parentRows = TARGETS.map((row) => ({
    card_print_id: PACKAGE_IDS[row.card_number].card_print_id,
    set_id: setRow.set_id,
    live_set_code: setRow.code,
    set_key: row.set_key,
    card_number: row.card_number,
    number_plain: row.number_plain,
    card_name: row.card_name,
    rarity: 'Promo',
    variant_key: '',
    printed_identity_modifier: null,
    gv_id: `GV-PK-MEP-${row.card_number}`,
    external_ids: { tcgplayer: row.mapping.external_id },
    ai_metadata: {
      source: PROVENANCE_SOURCE,
      package_id: PACKAGE_ID,
      evidence_note: row.evidence_note,
      evidence_urls: row.evidence_urls,
    },
    mapping: row.mapping,
    evidence_urls: row.evidence_urls,
  }));
  const childRows = parentRows.map((row) => ({
    card_printing_id: PACKAGE_IDS[row.card_number].card_printing_id,
    card_print_id: row.card_print_id,
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: 'holo',
    printing_gv_id: `${row.gv_id}-HOLO`,
    provenance_source: PROVENANCE_SOURCE,
    provenance_ref: `mep:${row.card_number}:holo`,
    created_by: CREATED_BY,
  }));
  const mappingRows = parentRows.map((row) => ({
    source: 'tcgplayer',
    external_id: row.mapping.external_id,
    card_print_id: row.card_print_id,
    meta: {
      package_id: PACKAGE_ID,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      mapping_method: row.mapping.mapping_method,
      source_url: row.mapping.source_url,
      evidence_urls: row.evidence_urls,
    },
  }));
  const identityResult = await client.query(
    `select x.card_print_id,
            public.card_print_identity_backfill_projection_v1(
              $1, x.live_set_code, $2, x.card_number, x.number_plain,
              x.card_name, x.variant_key, $3, $4
            ) as projected
       from jsonb_to_recordset($5::jsonb) as x(
         card_print_id text, live_set_code text, card_number text,
         number_plain text, card_name text, variant_key text
       )
      order by x.card_number, x.card_print_id`,
    [setRow.source, setRow.code, setRow.printed_total, setRow.printed_set_abbrev, JSON.stringify(parentRows)],
  );
  const identityRows = identityResult.rows;
  return { parentRows, identityRows, childRows, mappingRows };
}

function packageFingerprint(plan) {
  return sha256(stableJson({ package_id: PACKAGE_ID, ...plan }));
}

async function captureSnapshot(client, plan) {
  const result = await client.query(
    `with parent_target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid, live_set_code text, number_plain text,
         printed_identity_modifier text, card_name text, gv_id text
       )
     ), identity_target as (
       select * from jsonb_to_recordset($2::jsonb) as t(card_print_id uuid)
     ), mapping_target as (
       select * from jsonb_to_recordset($3::jsonb) as t(source text, external_id text)
     )
     select 'parent' as row_type, cp.id::text as row_id, cp.set_code,
            coalesce(cp.number_plain, cp.number) as card_number, cp.name as card_name,
            null::text as finish_key, null::text as source, null::text as external_id,
            null::text as identity_domain, null::text as mapping_method
       from parent_target target
       join public.card_prints cp on cp.id = target.card_print_id
         or cp.gv_id = target.gv_id
         or (lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
             and regexp_replace(coalesce(cp.number_plain, cp.number, ''), '^0+', '') = regexp_replace(target.number_plain, '^0+', '')
             and lower(coalesce(cp.printed_identity_modifier, '')) = lower(coalesce(target.printed_identity_modifier, ''))
             and lower(cp.name) = lower(target.card_name))
     union all
     select 'child', cpr.id::text, cp.set_code, coalesce(cp.number_plain, cp.number), cp.name,
            cpr.finish_key, null::text, null::text, null::text, null::text
       from parent_target target
       join public.card_prints cp on cp.id = target.card_print_id or cp.gv_id = target.gv_id
       join public.card_printings cpr on cpr.card_print_id = cp.id
     union all
     select 'identity', cpi.id::text, cp.set_code, coalesce(cp.number_plain, cp.number), cp.name,
            null::text, null::text, null::text, cpi.identity_domain, null::text
       from identity_target target
       join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true
       join public.card_prints cp on cp.id = cpi.card_print_id
     union all
     select 'mapping', em.id::text, cp.set_code, coalesce(cp.number_plain, cp.number), cp.name,
            null::text, em.source, em.external_id, null::text, em.meta->>'mapping_method'
       from mapping_target target
       join public.external_mappings em on em.source = target.source and em.external_id = target.external_id
       left join public.card_prints cp on cp.id = em.card_print_id
     order by row_type, card_number, card_name, finish_key, external_id, row_id`,
    [JSON.stringify(plan.parentRows), JSON.stringify(plan.identityRows), JSON.stringify(plan.mappingRows)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    counts: countBy(result.rows, (row) => row.row_type),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function runDryRun(client, plan, fingerprint) {
  const before = await captureSnapshot(client, plan);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    const guard = await client.query(
      `with parent_target as (
         select * from jsonb_to_recordset($1::jsonb) as t(
           card_print_id uuid, live_set_code text, number_plain text,
           printed_identity_modifier text, card_name text, gv_id text
         )
       ), child_target as (
         select * from jsonb_to_recordset($2::jsonb) as t(card_printing_id uuid, printing_gv_id text, finish_key text)
       ), identity_target as (
         select * from jsonb_to_recordset($3::jsonb) as t(card_print_id uuid, projected jsonb)
       ), mapping_target as (
         select * from jsonb_to_recordset($4::jsonb) as t(source text, external_id text, meta jsonb)
       )
       select
         (select count(*)::int from parent_target) parent_rows,
         (select count(*)::int from child_target) child_rows,
         (select count(*)::int from identity_target) identity_rows,
         (select count(*)::int from mapping_target) mapping_rows,
         (select count(*)::int from child_target t left join public.finish_keys fk on fk.key=t.finish_key and fk.is_active=true where fk.key is null) inactive_finishes,
         (select count(*)::int from parent_target t join public.card_prints cp on cp.gv_id=t.gv_id
            or (lower(coalesce(cp.set_code,''))=lower(t.live_set_code)
                and regexp_replace(coalesce(cp.number_plain,cp.number,''),'^0+','')=regexp_replace(t.number_plain,'^0+','')
                and lower(coalesce(cp.printed_identity_modifier,''))=lower(coalesce(t.printed_identity_modifier,'')))) parent_collisions,
         (select count(*)::int from child_target t join public.card_printings cpr on cpr.id=t.card_printing_id or cpr.printing_gv_id=t.printing_gv_id) child_collisions,
         (select count(*)::int from identity_target where projected->>'status' <> 'ready' or nullif(projected->>'identity_key_hash','') is null) invalid_identity_projections,
         (select count(*)::int from identity_target t join public.card_print_identity cpi on cpi.card_print_id=t.card_print_id and cpi.is_active=true) identity_parent_collisions,
         (select count(*)::int from identity_target t join public.card_print_identity cpi on cpi.is_active=true and cpi.identity_domain=t.projected->>'identity_domain' and cpi.identity_key_version=t.projected->>'identity_key_version' and cpi.identity_key_hash=t.projected->>'identity_key_hash') identity_hash_collisions,
         (select count(*)::int from (select projected->>'identity_key_hash' from identity_target group by projected->>'identity_key_hash' having count(*) > 1) duplicate_hash) duplicate_identity_hashes,
         (select count(*)::int from mapping_target where nullif(meta->>'mapping_method','') is null) missing_mapping_methods,
         (select count(*)::int from mapping_target t join public.external_mappings em on em.source=t.source and em.external_id=t.external_id) mapping_collisions`,
      [JSON.stringify(plan.parentRows), JSON.stringify(plan.childRows), JSON.stringify(plan.identityRows), JSON.stringify(plan.mappingRows)],
    );
    const g = guard.rows[0];
    if (g.parent_rows !== 4 || g.identity_rows !== 4 || g.child_rows !== 4 || g.mapping_rows !== 4 || g.inactive_finishes || g.parent_collisions || g.child_collisions || g.invalid_identity_projections || g.identity_parent_collisions || g.identity_hash_collisions || g.duplicate_identity_hashes || g.missing_mapping_methods || g.mapping_collisions) {
      throw new Error(`guard failed: ${JSON.stringify(g)}`);
    }
    const parents = await client.query(
      `insert into public.card_prints
         (id,set_id,set_code,number,name,rarity,variant_key,printed_identity_modifier,gv_id,identity_domain,set_identity_model,external_ids,ai_metadata)
       select x.card_print_id::uuid,x.set_id::uuid,x.live_set_code,x.card_number,x.card_name,x.rarity,x.variant_key,
              x.printed_identity_modifier,x.gv_id,'pokemon_eng_standard','standard',x.external_ids,x.ai_metadata
         from jsonb_to_recordset($1::jsonb) as x(
           card_print_id text,set_id text,live_set_code text,card_number text,number_plain text,card_name text,rarity text,
           variant_key text,printed_identity_modifier text,gv_id text,external_ids jsonb,ai_metadata jsonb)`,
      [JSON.stringify(plan.parentRows)],
    );
    const identities = await client.query(
      `insert into public.card_print_identity (
         card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,
         source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active
       )
       select x.card_print_id::uuid,x.projected->>'identity_domain',x.projected->>'set_code_identity',
              x.projected->>'printed_number',nullif(x.projected->>'normalized_printed_name',''),
              nullif(x.projected->>'source_name_raw',''),coalesce(x.projected->'identity_payload','{}'::jsonb),
              x.projected->>'identity_key_version',x.projected->>'identity_key_hash',true
         from jsonb_to_recordset($1::jsonb) as x(card_print_id text,projected jsonb)`,
      [JSON.stringify(plan.identityRows)],
    );
    const children = await client.query(
      `insert into public.card_printings
         (id,card_print_id,finish_key,is_provisional,provenance_source,provenance_ref,created_by,printing_gv_id)
       select x.card_printing_id::uuid,x.card_print_id::uuid,x.finish_key,false,x.provenance_source,x.provenance_ref,x.created_by,x.printing_gv_id
         from jsonb_to_recordset($1::jsonb) as x(
           card_printing_id text,card_print_id text,finish_key text,provenance_source text,provenance_ref text,created_by text,printing_gv_id text)`,
      [JSON.stringify(plan.childRows)],
    );
    const mappings = await client.query(
      `insert into public.external_mappings(source,external_id,card_print_id,meta)
       select x.source,x.external_id,x.card_print_id::uuid,x.meta
         from jsonb_to_recordset($1::jsonb) as x(source text,external_id text,card_print_id text,meta jsonb)`,
      [JSON.stringify(plan.mappingRows)],
    );
    if (parents.rowCount !== 4 || identities.rowCount !== 4 || children.rowCount !== 4 || mappings.rowCount !== 4) throw new Error('insert count mismatch');
    await client.query('rollback');
    const after = await captureSnapshot(client, plan);
    if (before.hash_sha256 !== after.hash_sha256) throw new Error('rollback snapshot mismatch');
    return { status: 'passed_rolled_back', fingerprint, guard: g, before_snapshot: before, after_snapshot: after, attempted: { parents: 4, identities: 4, children: 4, mappings: 4 }, stop_findings: [] };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const after = await captureSnapshot(client, plan).catch(() => before);
    return { status: 'failed_rolled_back', fingerprint, before_snapshot: before, after_snapshot: after, attempted: { parents: 0, identities: 0, children: 0, mappings: 0 }, stop_findings: [String(error.message ?? error)] };
  }
}

function renderMarkdown(report) {
  return `# MEP Pricing Gap Catalog Backfill Guarded Dry Run V1

- package: \`${PACKAGE_ID}\`
- fingerprint: \`${report.package_fingerprint_sha256}\`
- status: ${report.execution.status}
- rollback_verified: ${report.execution.before_snapshot.hash_sha256 === report.execution.after_snapshot.hash_sha256}
- parent_rows: ${report.scope.parent_rows.length}
- active_identity_rows: ${report.scope.identity_rows.length}
- child_rows: ${report.scope.child_rows.length}
- external_mappings: ${report.scope.external_mapping_rows.length}
- durable_writes: false

${markdownTable(['number','name','finish','TCGPlayer product'], report.scope.parent_rows.map((row) => [row.card_number,row.card_name,'holo',row.mapping.external_id]))}

This package is rollback-only proof. It does not authorize or perform a durable production write.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL');
  const client = new Client({ connectionString: conn, ssl: process.env.NODE_EXTRA_CA_CERTS ? { rejectUnauthorized: true } : undefined });
  await client.connect();
  try {
    const setRow = await resolveSet(client);
    const plan = await buildPlan(client, setRow);
    const fingerprint = packageFingerprint(plan);
    const execution = await runDryRun(client, plan, fingerprint);
    const report = {
      generated_at: new Date().toISOString(),
      version: 'mep_pricing_gap_catalog_backfill_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: fingerprint,
      db_writes_performed: false,
      migrations_created: false,
      scope: { parent_rows: plan.parentRows, identity_rows: plan.identityRows, child_rows: plan.childRows, external_mapping_rows: plan.mappingRows },
      execution,
    };
    await writeJson(OUTPUT_JSON, report);
    await fs.writeFile(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({ package_id: PACKAGE_ID, fingerprint, status: execution.status, attempted: execution.attempted, stop_findings: execution.stop_findings }, null, 2));
    if (execution.status !== 'passed_rolled_back') process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

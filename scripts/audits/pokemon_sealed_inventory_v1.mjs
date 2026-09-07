import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import dotenv from 'dotenv';
import pg from 'pg';
import { classifyCrossTcgSealedProductV1 } from '../../backend/pricing/cross_tcg_sealed_product_identity_v1.mjs';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const index = arg.indexOf('=');
  if (index < 0) throw new Error(`Expected --key=value: ${arg}`);
  return [arg.slice(2, index), arg.slice(index + 1)];
}));
if (!args.out) throw new Error('--out required');
dotenv.config({ path: args.env ?? 'C:/grookai_vault/.env.local', override: true, quiet: true });
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL,
  ssl: pgSslConfig(process.env.SUPABASE_DB_URL), statement_timeout: 60000,
  application_name: 'pokemon-sealed-inventory-read-only-v1' });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await client.connect();
try {
  await client.query('begin isolation level repeatable read read only');
  const categories = (await client.query(`select category_id,name,display_name,non_sealed_label
    from tcgcsv_source_categories where name ilike '%pokemon%'
    or display_name ilike '%pokemon%' order by category_id`)).rows;
  const rows = (await client.query(`select product.*,category.name category_name,
    category.display_name category_display_name,category.non_sealed_label,
    source_group.name group_name from tcgcsv_source_products product
    join tcgcsv_source_categories category using(category_id)
    left join tcgcsv_source_groups source_group using(group_id)
    where product.category_id=any($1::bigint[]) and product.source_active
    order by product.category_id,product.product_id`,
  [categories.map(row => row.category_id)])).rows;
  const dispositions = rows.map(row => ({ product_id: Number(row.product_id),
    category_id: Number(row.category_id), name: row.name, group_name: row.group_name,
    source_payload_hash: row.payload_hash, ...classifyCrossTcgSealedProductV1(row) }));
  const existing = (await client.query(`select game_key,count(*)::integer families
    from sealed_product_families group by game_key order by game_key`)).rows;
  const controls = (await client.query('select * from sealed_product_game_release_controls order by game_key')).rows;
  await client.query('rollback');
  const counts = {};
  for (const row of dispositions) {
    const key = `${row.category_id}:${row.classification}:${row.candidate_identity?.package_form ?? 'none'}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const summary = { version: 'POKEMON_SEALED_INVENTORY_V1', generated_at: new Date().toISOString(),
    categories, source_products: rows.length, counts, existing_families: existing,
    release_controls: controls, database_writes: 0, storage_writes: 0 };
  await fs.mkdir(args.out, { recursive: true });
  const files = { 'source_products.jsonl.gz': gzipSync(rows.map(row => JSON.stringify(row)).join('\n')+'\n'),
    'dispositions.jsonl.gz': gzipSync(dispositions.map(row => JSON.stringify(row)).join('\n')+'\n'),
    'summary.json': JSON.stringify(summary, null, 2)+'\n' };
  const hashes = {};
  for (const [name, bytes] of Object.entries(files)) {
    await fs.writeFile(path.join(args.out, name), bytes);
    hashes[name] = hash(bytes);
  }
  await fs.writeFile(path.join(args.out, 'artifact_hashes.json'), JSON.stringify(hashes, null, 2)+'\n');
  console.log(JSON.stringify(summary, null, 2));
} finally { await client.end(); }

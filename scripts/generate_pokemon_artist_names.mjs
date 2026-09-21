import '../backend/env.mjs';
import fs from 'node:fs/promises';
import pg from 'pg';

// Read-only catalog snapshot; normal search still retrieves cards through RLS.
const projectRef = 'ycdxbpibncqcchqiihfz';
const dbUrl = new URL(process.env.SUPABASE_DB_URL);
if (new URL(process.env.SUPABASE_URL).hostname !== `${projectRef}.supabase.co` ||
    !(dbUrl.hostname.includes(projectRef) || decodeURIComponent(dbUrl.username).includes(projectRef))) {
  throw new Error('Artist snapshot environment mismatch');
}
const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
});
await client.connect();
try {
  await client.query('begin read only');
  const { rows } = await client.query(`
    select distinct artist
    from public.card_prints
    where gv_id like 'GV-PK-%'
      and nullif(trim(artist), '') is not null
      and coalesce(data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'
    order by artist
  `);
  await client.query('rollback');
  const artists = rows.map((row) => row.artist);
  if (artists.length < 100) throw new Error('Artist snapshot unexpectedly small');
  const output = new URL('../apps/web/src/lib/search/pokemonArtistNames.json', import.meta.url);
  const existing = await fs.readFile(output, 'utf8').then(JSON.parse).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && artists.length < existing.artists.length * 0.9) {
    throw new Error('Artist snapshot failed retention guard');
  }
  await fs.writeFile(output, `${JSON.stringify({
    source: 'public.card_prints: visible Pokemon artist names',
    generated_at: new Date().toISOString(),
    artists,
  }, null, 2)}\n`);
  console.log(`Refreshed ${artists.length} Pokemon artist names (read-only)`);
} finally {
  await client.end();
}

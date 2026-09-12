import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');
export const sourceOrigin = 'https://ycdxbpibncqcchqiihfz.supabase.co';
const container = 'supabase_db_ycdxbpibncqcchqiihfz';
const setCodes = ['sv03.5', 'sv02', 'sv06', 'sv08', 'sv8pt5'];
const cardColumns = 'id,game_id,set_id,name,number,variant_key,rarity,image_url,set_code,number_plain,artist,regulation_mark,image_alt_url,image_source,print_identity_key,image_status,printed_set_abbrev,printed_total,gv_id,image_path,identity_domain,printed_identity_modifier,set_identity_model,representative_image_url,image_note';
const setColumns = 'id,game,code,name,release_date,source,logo_url,symbol_url,identity_domain_default,hero_image_url,hero_image_source,identity_model,printed_set_abbrev,printed_total,set_role';
const printingColumns = 'id,card_print_id,finish_key,printing_gv_id,image_source,image_path,image_url,image_alt_url,image_status,image_note';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;

export function guardSourceRequest(input, init = {}) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = (init.method ?? input?.method ?? 'GET').toUpperCase();
  if (url.origin !== sourceOrigin || method !== 'GET' ||
      !/^\/rest\/v1\/(sets|card_prints|card_printings)$/.test(url.pathname)) {
    throw new Error('Only allowlisted public catalog GET requests are permitted.');
  }
}

export function guardDestination(value) {
  if (new URL(value).origin !== 'http://127.0.0.1:54321') {
    throw new Error('Local catalog destination must be the existing loopback Supabase.');
  }
}

export function validateSnapshot(snapshot) {
  if (snapshot.sets.length !== 5 || snapshot.cards.length < 20 || snapshot.cards.length > 600 || snapshot.printings.length > 1800) throw new Error('Snapshot exceeds frozen sample bounds.');
  const sets = new Set(snapshot.sets.map(row => row.id));
  const cards = new Set(snapshot.cards.map(row => row.id));
  if (sets.size !== 5 || cards.size !== snapshot.cards.length || new Set(snapshot.cards.map(row => row.gv_id)).size !== cards.size) throw new Error('Duplicate identity.');
  if (snapshot.sets.some(row => row.game !== 'pokemon' || !setCodes.includes(row.code))) throw new Error('Unexpected set.');
  if (snapshot.cards.some(row => !sets.has(row.set_id) || !setCodes.includes(row.set_code) || !row.gv_id)) throw new Error('Detached card identity.');
  if (snapshot.printings.some(row => !cards.has(row.card_print_id)) || new Set(snapshot.printings.map(row => row.id)).size !== snapshot.printings.length) throw new Error('Detached/duplicate printing.');
}

function sql(command) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], {
    input: command, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  }).trim();
}

function insertRows(table, rows) {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]).filter(column => !(table === 'card_prints' && column === 'number_plain'));
  if (!['sets', 'card_prints', 'card_printings'].includes(table) || columns.some(column => !/^[a-z_]+$/.test(column))) throw new Error('Unexpected insert target.');
  const names = columns.map(column => `"${column}"`).join(',');
  return `insert into public.${table} (${names}) select ${names} from jsonb_populate_recordset(null::public.${table},${quote(JSON.stringify(rows))}::jsonb);`;
}

async function main() {
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  if (branch !== 'design/collector-real-local' || process.env.VERCEL) throw new Error('Isolated local branch required.');
  if (process.env.SUPABASE_URL?.replace(/\/$/, '') !== sourceOrigin) throw new Error('Unexpected source project.');
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error('Public credential missing.');
  if (!key.startsWith('sb_publishable_')) {
    const payload = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url'));
    if (payload.role !== 'anon') throw new Error('Source must use public/anon authority, never service role.');
  }
  if (Number(sql('select count(*) from public.card_prints;')) !== 0) throw new Error('Destination is no longer empty; refusing replacement.');
  const local = JSON.parse(execFileSync('supabase.exe', ['status', '-o', 'json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  guardDestination(local.API_URL);
  const output = path.join('C:/grookai_vault_operator_artifacts/collector_polish', new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-') + '_public_catalog_local');
  mkdirSync(path.join(output, 'images'), { recursive: true });
  const sourceRequests = [];
  const source = createClient(sourceOrigin, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    guardSourceRequest(input, init);
    sourceRequests.push({ method: 'GET', url: String(input) });
    return fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(45000) });
  } } });
  const read = async query => { const { data, error } = await query; if (error) throw new Error(error.message); return data; };
  const sets = await read(source.from('sets').select(setColumns).in('code', setCodes).eq('game', 'pokemon').order('code'));
  const cards = [];
  for (const code of setCodes) {
    let query = source.from('card_prints').select(cardColumns).eq('set_code', code).not('gv_id', 'is', null).order('gv_id').limit(500);
    if (code !== 'sv03.5') query = query.in('rarity', ['Special Illustration Rare', 'Special illustration rare', 'Illustration Rare']);
    cards.push(...await read(query));
  }
  const printings = [];
  for (let i = 0; i < cards.length; i += 60) printings.push(...await read(source.from('card_printings').select(printingColumns).in('card_print_id', cards.slice(i, i + 60).map(row => row.id)).order('id').limit(1000)));
  const snapshot = { sourceOrigin, sets, cards, printings };
  validateSnapshot(snapshot);
  writeFileSync(path.join(output, 'source_snapshot.json'), JSON.stringify(snapshot, null, 2));
  const localGameId = sql("select id from public.games where code='pokemon';");
  if (!/^[0-9a-f-]{36}$/.test(localGameId)) throw new Error('Local Pokemon game unavailable.');
  const projected = { sets, cards: cards.map(row => ({ ...row, game_id: localGameId })), printings };
  const plan = { sourceOrigin, branch, baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceSha256: sha(JSON.stringify(snapshot)), counts: { sets: sets.length, cards: cards.length, printings: printings.length }, sourceRequests, destination: local.API_URL, productionWrites: 0, localGameIdRemap: { source: [...new Set(cards.map(row => row.game_id))], destination: localGameId }, excluded: ['accounts', 'Vault', 'memories', 'messages', 'prices', 'approvals', 'release controls'], sample: 'Complete public 151 parent cards; illustration and special illustration rares from four other sets.' };
  writeFileSync(path.join(output, 'plan.json'), JSON.stringify(plan, null, 2));
  console.log(JSON.stringify({ phase: 'snapshot', output, counts: plan.counts }));
  if (!process.argv.includes('--apply-local')) return;

  // Preserve the pre-existing local catalog before any insertion. No restore/delete is automatic.
  const backup = execFileSync('docker', ['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--data-only', '--table=public.games', '--table=public.sets', '--table=public.card_prints', '--table=public.card_printings'], { maxBuffer: 30 * 1024 * 1024 });
  writeFileSync(path.join(output, 'local_catalog_before.sql'), backup);
  // Prove all inserts/constraints before touching even local Storage.
  const inserts = insertRows('sets', projected.sets) + insertRows('card_prints', projected.cards) + insertRows('card_printings', projected.printings);
  sql(`begin; set local statement_timeout='30s'; ${inserts} rollback;`);
  const imageEntries = new Map();
  const imageGaps = [];
  for (const row of [...cards, ...printings]) {
    if (!row.image_path || row.image_source !== 'identity') continue;
    if (!/^warehouse-derived\/(self-hosted-images-v1|image-truth-v1)\//.test(row.image_path) || row.image_path.includes('..')) {
      imageGaps.push({ gvId: row.gv_id ?? row.printing_gv_id, reason: 'Path not supported by the existing public image reader; identity unchanged.' });
      continue;
    }
    if (!imageEntries.has(row.image_path)) imageEntries.set(row.image_path, { path: row.image_path, gvId: row.gv_id ?? row.printing_gv_id });
  }
  const images = [...imageEntries.values()];
  let cursor = 0;
  await Promise.all(Array.from({ length: 1 }, async () => {
    while (cursor < images.length) {
      const index = cursor++;
      const item = images[index];
      await delay(1200);
      if (!item.gvId) throw new Error('Image has no public identity.');
      const url = `https://grookaivault.com/api/canon/cards/${encodeURIComponent(item.gvId)}/image`;
      let response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (response.status === 429) {
        const seconds = Number(response.headers.get('retry-after')) || 65;
        if (seconds > 120) throw new Error('Public image rate limit requires a later retry.');
        await delay((seconds + 1) * 1000);
        response = await fetch(url, { signal: AbortSignal.timeout(45000) });
        if (response.status === 429) throw new Error('Public image rate limit persists; stopping requests.');
      }
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
        imageGaps.push({ gvId: item.gvId, reason: `Public image unavailable (${response.status}); identity unchanged.` });
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 500 || bytes.length > 15 * 1024 * 1024) throw new Error('Unexpected image size.');
      Object.assign(item, { file: `${index}.bin`, sha256: sha(bytes), bytes: bytes.length, contentType: response.headers.get('content-type'), sourceUrl: url });
      writeFileSync(path.join(output, 'images', item.file), bytes);
      if ((index + 1) % 25 === 0) console.log(JSON.stringify({ phase: 'downloaded', completed: index + 1, total: images.length }));
    }
  }));
  const destination = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    guardDestination(new URL(String(input)).origin);
    return fetch(input, init);
  } } });
  let bucket = await destination.storage.getBucket('user-card-images');
  if (bucket.error) {
    const created = await destination.storage.createBucket('user-card-images', { public: false });
    if (created.error) throw new Error(created.error.message);
  }
  for (const item of images) {
    if (!item.file) continue;
    const bytes = readFileSync(path.join(output, 'images', item.file));
    const before = await destination.storage.from('user-card-images').download(item.path);
    if (before.data) {
      if (sha(Buffer.from(await before.data.arrayBuffer())) !== item.sha256) throw new Error('Local Storage collision.');
    } else {
      const upload = await destination.storage.from('user-card-images').upload(item.path, bytes, { upsert: false, contentType: item.contentType });
      if (upload.error) throw new Error(upload.error.message);
    }
    const after = await destination.storage.from('user-card-images').download(item.path);
    if (!after.data || sha(Buffer.from(await after.data.arrayBuffer())) !== item.sha256) throw new Error('Local image readback mismatch.');
  }
  sql(`begin; set local statement_timeout='30s'; ${inserts} commit;`);
  for (const [table, rows] of [['sets', projected.sets], ['card_prints', projected.cards], ['card_printings', projected.printings]]) {
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]);
    const expression = keys.flatMap(key => [quote(key), `t."${key}"`]).join(',');
    const actual = JSON.parse(sql(`select jsonb_agg(jsonb_build_object(${expression}) order by t.id) from public.${table} t where id in (${rows.map(row => quote(row.id)).join(',')});`));
    for (const row of rows) {
      const match = actual.find(candidate => candidate.id === row.id);
      if (!match || keys.some(key => JSON.stringify(match[key]) !== JSON.stringify(row[key]))) throw new Error(`Local catalog readback mismatch: ${table}/${row.id}`);
    }
  }
  writeFileSync(path.join(output, 'receipt.json'), JSON.stringify({ ...plan, completedAt: new Date().toISOString(), exactReadback: true, localBackupSha256: sha(backup), images: images.filter(image => image.file), imageGaps, productionWrites: 0 }, null, 2));
  console.log(JSON.stringify({ phase: 'complete', output, counts: plan.counts, images: images.filter(image => image.file).length, imageGaps, productionWrites: 0, exactReadback: true }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });

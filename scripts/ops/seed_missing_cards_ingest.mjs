#!/usr/bin/env node
// Seed missing card prints by fetching from PokemonTCG locally and ingesting via import-cards?op=ingest
// Usage: node scripts/ops/seed_missing_cards_ingest.mjs [--throttle 150] [--pageSize 200]
// Reads env/.env automatically (dotenv):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, PROJECT_URL, POKEMONTCG_API_KEY, POKEMON_GAME_ID

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const args = process.argv.slice(2);
function argOf(flag, def) {
  const i = args.indexOf(flag);
  if (i >= 0) return args[i+1] ?? def;
  return def;
}

const THROTTLE_MS = Number(argOf('--throttle', '150')) || 150;
const PAGE_SIZE   = Math.min(250, Math.max(1, Number(argOf('--pageSize', '200')) || 200));
const MAX_SETS    = Number(argOf('--maxSets', '0')) || 0; // 0 = no limit
const MODE        = (argOf('--mode', 'prints') || 'prints').toLowerCase(); // 'prints' or 'sets'
const SKIP_EXIST  = (() => { const v = argOf('--skipExisting','true'); return (v === '' || v.toLowerCase()==='true'); })();
const BASE_BACKOFF= Number(argOf('--backoff', '1000')) || 1000; // ms
const MAX_RETRY   = Number(argOf('--retry', '5')) || 5;
const RESUME_FLAG = (() => { const v = argOf('--resume', 'false'); return (v === '' || v.toLowerCase() === 'true'); })();
const RESUME_FILE = argOf('--resumeFile', path.join('build','diagnostics','seed_resume.json'));
const ENV_FILE    = argOf('--env', '.env');
const ONLY_ARG    = (argOf('--only','') || '').trim();
const ONLY_LIST   = ONLY_ARG ? ONLY_ARG.split(',').map(s=>s.trim()).filter(Boolean) : [];

const dotenvResult = dotenv.config({ path: ENV_FILE });
if (!dotenvResult.error) {
  console.log('✅ Loaded env from .env');
}

function readEnvWithOverrides() {
  // Allow CLI overrides without ever printing secrets
  const arg = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? (args[i+1] ?? '') : '';
  };

  const SUPABASE_URL = (arg('--supabaseUrl') || process.env.SUPABASE_URL || process.env.PROJECT_URL || process.env.SB_URL || '').trim();
  const SRK = (arg('--srk') || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SB_SERVICE_ROLE_KEY || '').trim();
  const PTCG = (arg('--apiKey') || process.env.POKEMONTCG_API_KEY || '').trim();

  // Optional (not used directly here, but confirm they’re available for ops):
  const ANON = (arg('--anon') || process.env.SUPABASE_ANON_KEY || '').trim();
  const PROJECT_URL = (arg('--projectUrl') || process.env.PROJECT_URL || '').trim();
  const GAME_ID = (arg('--gameId') || process.env.POKEMON_GAME_ID || '').trim();

  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SRK)          missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!PTCG)         missing.push('POKEMONTCG_API_KEY');
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(', ')}. Set them in ${ENV_FILE} or pass CLI flags (--supabaseUrl, --srk, --apiKey).`);
    process.exit(1);
  }

  // Do not log secret values
  console.log(`Env OK: SUPABASE_URL, SRK, POKEMONTCG_API_KEY${ANON ? ', ANON' : ''}${PROJECT_URL ? ', PROJECT_URL' : ''}${GAME_ID ? ', POKEMON_GAME_ID' : ''}`);
  return { SUPABASE_URL, SRK, PTCG };
}

async function fetchJson(url, init, attempts = MAX_RETRY) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, init);
      if (r.ok) return await r.json().catch(() => ({}));
      const txt = await r.text().catch(() => '');
      lastErr = new Error(`HTTP ${r.status} ${r.statusText}: ${txt}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(res => setTimeout(res, Math.min(10_000, BASE_BACKOFF * (2 ** i))));
  }
  throw lastErr || new Error('fetchJson failed');
}

async function listPtcgSetIds(apiKey) {
  const out = new Set();
  let page = 1;
  while (true) {
    const u = new URL('https://api.pokemontcg.io/v2/sets');
    u.searchParams.set('pageSize', '250');
    u.searchParams.set('page', String(page));
    const j = await fetchJson(u, { headers: { 'X-Api-Key': apiKey } });
    const arr = Array.isArray(j?.data) ? j.data : [];
    for (const s of arr) if (s?.id) out.add(String(s.id));
    if (arr.length < 250) break;
    page++;
  }
  return Array.from(out).sort();
}

async function listDbSetCodes(supabaseUrl, srk) {
  const headers = {
    apikey: srk,
    Authorization: `Bearer ${srk}`,
    'Accept-Profile': 'public',
  };
  const out = new Set();
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const u = new URL(`${supabaseUrl.replace(/\/?$/, '')}/rest/v1/card_prints`);
    u.searchParams.set('select', 'set_code');
    u.searchParams.set('order', 'set_code');
    u.searchParams.set('limit', String(pageSize));
    u.searchParams.set('offset', String(offset));
    const r = await fetch(u, { headers });
    if (!r.ok) break;
    const arr = await r.json().catch(() => []);
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const row of arr) if (row?.set_code) out.add(String(row.set_code));
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return Array.from(out).sort();
}

async function listDbSetCodesFromSets(supabaseUrl, srk) {
  const headers = { apikey: srk, Authorization: `Bearer ${srk}`, 'Accept-Profile': 'public' };
  const out = new Set();
  const pageSize = 1000; let offset = 0;
  while (true) {
    const u = new URL(`${supabaseUrl.replace(/\/?$/, '')}/rest/v1/sets`);
    u.searchParams.set('select', 'code');
    u.searchParams.set('order', 'code');
    u.searchParams.set('limit', String(pageSize));
    u.searchParams.set('offset', String(offset));
    const r = await fetch(u, { headers });
    if (!r.ok) break;
    const arr = await r.json().catch(() => []);
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const row of arr) if (row?.code) out.add(String(row.code));
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return Array.from(out).sort();
}

async function getSetIdForCode(supabaseUrl, srk, code) {
  const headers = { apikey: srk, Authorization: `Bearer ${srk}`, 'Accept-Profile': 'public' };
  const u = new URL(`${supabaseUrl.replace(/\/?$/, '')}/rest/v1/sets`);
  u.searchParams.set('select', 'id,code');
  u.searchParams.set('code', `eq.${code}`);
  const r = await fetch(u, { headers });
  if (!r.ok) return null;
  const arr = await r.json().catch(() => []);
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[0]?.id || null;
}

async function hasAnyPrintsForSetId(supabaseUrl, srk, setId) {
  if (!setId) return false;
  const headers = { apikey: srk, Authorization: `Bearer ${srk}`, 'Accept-Profile': 'public' };
  const u = new URL(`${supabaseUrl.replace(/\/?$/, '')}/rest/v1/card_prints`);
  u.searchParams.set('select', 'id');
  u.searchParams.set('set_id', `eq.${setId}`);
  u.searchParams.set('limit', '1');
  const r = await fetch(u, { headers });
  if (!r.ok) return false;
  const arr = await r.json().catch(() => []);
  return Array.isArray(arr) && arr.length > 0;
}

async function fetchPtcgCards(setId, page, pageSize, apiKey) {
  const u = new URL('https://api.pokemontcg.io/v2/cards');
  u.searchParams.set('q', `set.id:${setId}`);
  u.searchParams.set('page', String(page));
  u.searchParams.set('pageSize', String(pageSize));
  let lastErr = null;
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      const r = await fetch(u, { headers: { 'X-Api-Key': apiKey } });
      if (r.ok) return await r.json().catch(() => ({}));
      const text = await r.text().catch(() => '');
      // Retry only on 5xx
      if (r.status >= 500) {
        lastErr = new Error(`PTCG ${r.status}: ${text.slice(0,300)}`);
      } else {
        throw new Error(`PTCG ${r.status}: ${text.slice(0,300)}`);
      }
    } catch (e) {
      lastErr = e;
    }
    await new Promise(res => setTimeout(res, Math.min(10_000, BASE_BACKOFF * (2 ** i))));
  }
  throw lastErr || new Error('PTCG fetch failed');
}

async function ingestBatch(supabaseUrl, cards) {
  const url = `${supabaseUrl.replace(/\/?$/, '')}/functions/v1/import-cards?op=ingest`;
  const body = JSON.stringify({ cards });
  // No auth header required (import-cards verify_jwt=false) but ok to omit
  let lastErr = null;
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      if (r.ok) return await r.json().catch(() => ({}));
      const text = await r.text().catch(() => '');
      if (r.status >= 500) {
        lastErr = new Error(`ingest ${r.status}: ${text.slice(0,300)}`);
      } else {
        throw new Error(`ingest ${r.status}: ${text.slice(0,300)}`);
      }
    } catch (e) {
      lastErr = e;
    }
    await new Promise(res => setTimeout(res, Math.min(10_000, BASE_BACKOFF * (2 ** i))));
  }
  throw lastErr || new Error('ingest failed');
}

async function main() {
  const { SUPABASE_URL, SRK, PTCG } = readEnvWithOverrides();

  // BEFORE snapshot
  const beforeDbSetsPrints = await listDbSetCodes(SUPABASE_URL, SRK);
  const beforeDbSets = await listDbSetCodesFromSets(SUPABASE_URL, SRK);
  const ptcgSetIds = ONLY_LIST.length ? ONLY_LIST : await listPtcgSetIds(PTCG);
  const bySetsMissing = ptcgSetIds.filter(s => !new Set(beforeDbSets).has(s));
  let beforeMissing;
  if (MODE === 'sets') {
    beforeMissing = bySetsMissing;
  } else {
    beforeMissing = [];
    const seen = new Set(beforeDbSetsPrints);
    for (const code of ptcgSetIds) {
      if (seen.has(code)) continue;
      const setId = await getSetIdForCode(SUPABASE_URL, SRK, code);
      if (!setId) { beforeMissing.push(code); continue; }
      const hasPrint = await hasAnyPrintsForSetId(SUPABASE_URL, SRK, setId);
      if (!hasPrint) beforeMissing.push(code);
    }
  }
  const workList = MAX_SETS > 0 ? beforeMissing.slice(0, MAX_SETS) : beforeMissing;

  // Resume support (completed set tracking)
  const resumeDir = path.dirname(RESUME_FILE);
  if (RESUME_FLAG) fs.mkdirSync(resumeDir, { recursive: true });
  let completed = new Set();
  if (RESUME_FLAG && fs.existsSync(RESUME_FILE)) {
    try {
      const j = JSON.parse(fs.readFileSync(RESUME_FILE, 'utf8'));
      if (Array.isArray(j?.completed)) completed = new Set(j.completed.map(String));
    } catch {}
  }

  console.log(`[before] db sets=${beforeDbSets.length} ptcg=${ptcgSetIds.length} missing=${beforeMissing.length} mode=${MODE}${ONLY_LIST.length?` only=[${ONLY_LIST.join(',')}]`:''}`);

  for (let idx = 0; idx < workList.length; idx++) {
    const setId = workList[idx];
    if (RESUME_FLAG && completed.has(setId)) {
      console.log(`[${idx+1}/${workList.length}] Skipping already completed ${setId}`);
      continue;
    }
    console.log(`[${idx+1}/${workList.length}] Seeding set ${setId} ...`);
    let page = 1; let imported = 0;
    if (SKIP_EXIST) {
      const setIdDb = await getSetIdForCode(SUPABASE_URL, SRK, setId);
      if (setIdDb) {
        const already = await hasAnyPrintsForSetId(SUPABASE_URL, SRK, setIdDb);
        if (already) {
          console.log(`  -> skip: prints already exist for set ${setId}`);
          if (RESUME_FLAG) {
            try {
              completed.add(setId);
              fs.writeFileSync(RESUME_FILE, JSON.stringify({ completed: Array.from(completed) }, null, 2));
            } catch {}
          }
          continue;
        }
      }
    }
    while (true) {
      try {
        const j = await fetchPtcgCards(setId, page, PAGE_SIZE, PTCG);
        const cards = Array.isArray(j?.data) ? j.data : [];
        if (!cards.length) { break; }
        await ingestBatch(SUPABASE_URL, cards);
        imported += cards.length;
        if (cards.length < PAGE_SIZE) break;
        page++;
        if (THROTTLE_MS > 0) await new Promise(res => setTimeout(res, THROTTLE_MS));
      } catch (e) {
        console.warn(`  warn: ${String(e?.message || e).slice(0,200)}`);
        // simple backoff and retry same page
        await new Promise(res => setTimeout(res, Math.max(1000, BASE_BACKOFF)));
      }
    }
    console.log(`  -> imported ${imported} cards for set ${setId}`);
    if (RESUME_FLAG) {
      try {
        completed.add(setId);
        fs.writeFileSync(RESUME_FILE, JSON.stringify({ completed: Array.from(completed) }, null, 2));
      } catch {}
    }
  }

  // AFTER snapshot
  const afterDbSetsPrints = await listDbSetCodes(SUPABASE_URL, SRK);
  const afterDbSets = await listDbSetCodesFromSets(SUPABASE_URL, SRK);
  let afterMissing;
  if (MODE === 'sets') {
    afterMissing = ptcgSetIds.filter(s => !new Set(afterDbSets).has(s));
  } else {
    afterMissing = [];
    const seenAfter = new Set(afterDbSetsPrints);
    for (const code of ptcgSetIds) {
      if (seenAfter.has(code)) continue;
      const setId = await getSetIdForCode(SUPABASE_URL, SRK, code);
      if (!setId) { afterMissing.push(code); continue; }
      const hasPrint = await hasAnyPrintsForSetId(SUPABASE_URL, SRK, setId);
      if (!hasPrint) afterMissing.push(code);
    }
  }
  console.log(`[after] db sets=${afterDbSets.length} missing=${afterMissing.length} mode=${MODE}`);

  // Report
  const outDir = path.join('build', 'diagnostics');
  const outPath = path.join(outDir, 'MISSING_CARDS_REPORT.md');
  fs.mkdirSync(outDir, { recursive: true });
  const lines = [];
  lines.push(`# MISSING_CARDS_REPORT (ingest seeding)`);
  lines.push('');
  lines.push(`- Mode: ${MODE}`);
  lines.push(`- Before: db=${beforeDbSets.length} ptcg=${ptcgSetIds.length} missing=${beforeMissing.length}`);
  lines.push(`- After:  db=${afterDbSets.length} missing=${afterMissing.length}`);
  lines.push('');
  lines.push('## Missing (before)');
  lines.push(beforeMissing.join(', '));
  lines.push('');
  lines.push('## Missing (after)');
  lines.push(afterMissing.join(', '));
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Report written: ${outPath}`);
}

main().catch(e => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

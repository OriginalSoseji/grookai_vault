import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.local', quiet: true });
loadDotenv({ path: '.env', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'image_truth_trainer_kit_mcd_404_pass_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'image_truth_trainer_kit_mcd_404_pass_v1.md');

const PACKAGE_ID = 'IMAGE-TRUTH-TRAINER-KIT-MCD-404-PASS-V1';
const APPLY = process.argv.includes('--apply');
const NOW = new Date().toISOString();

const MCDONALDS_2021_NAME = "McDonald's Collection 2021";
const MCDONALDS_REPLACEMENT_NOTE =
  "IMAGE-TRUTH-TRAINER-KIT-MCD-404-PASS-V1: source-backed PokemonTCG mcd21 image replaces broken TCGdex 2021swsh asset URL.";
const TRAINER_KIT_ALIAS_REPLACEMENT_NOTE =
  'IMAGE-TRUTH-TRAINER-KIT-MCD-404-PASS-V1: source-backed PokemonTCG Trainer Kit alias image replaces broken TCGdex asset URL.';
const TRAINER_KIT_BLOCKED_NOTE =
  'IMAGE-TRUTH-TRAINER-KIT-MCD-404-PASS-V1: withheld broken TCGdex Trainer Kit asset URL; exact image requires governed source import.';
const UNRESOLVED_IMAGE_STATUS = 'unresolved';

const SAFE_POKEMONTCG_SET_ALIASES = new Map([
  ['2021swsh', { pokemonTcgSetCode: 'mcd21', min: 1, max: 25, note: MCDONALDS_REPLACEMENT_NOTE }],
  ['tk-ex-latia', { pokemonTcgSetCode: 'tk1a', note: TRAINER_KIT_ALIAS_REPLACEMENT_NOTE }],
  ['tk-ex-m', { pokemonTcgSetCode: 'tk2b', note: TRAINER_KIT_ALIAS_REPLACEMENT_NOTE }],
  ['tk-ex-p', { pokemonTcgSetCode: 'tk2a', note: TRAINER_KIT_ALIAS_REPLACEMENT_NOTE }],
  ['tk2b', { pokemonTcgSetCode: 'tk2b', note: TRAINER_KIT_ALIAS_REPLACEMENT_NOTE }],
]);

const AUDITED_SET_CODES = [
  '2021swsh',
  'mcd21',
  'tk1a',
  'tk2b',
  'tk-bw-e',
  'tk-bw-z',
  'tk-dp-l',
  'tk-dp-m',
  'tk-ex-latia',
  'tk-ex-m',
  'tk-ex-p',
  'tk-sm-l',
  'tk-sm-r',
  'tk-xy-b',
  'tk-xy-n',
  'tk-xy-p',
  'tk-xy-sy',
  'tk-xy-w',
];

function supabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_PUBLISHABLE_KEY.');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedSetCode(row) {
  return clean(row.set_code).toLowerCase();
}

function numericNumber(row) {
  const value = clean(row.number);
  if (/^\d+$/.test(value)) return Number(value);
  const plain = clean(row.number_plain);
  if (/^\d+$/.test(plain)) return Number(plain);
  return null;
}

function isBrokenTcgdexUrl(value) {
  const normalized = clean(value).toLowerCase();
  return (
    normalized.includes('assets.tcgdex.net/en/tk/') ||
    normalized.includes('assets.tcgdex.net/en/mc/2021swsh/')
  );
}

function rowHasBrokenTcgdexImage(row) {
  return (
    isBrokenTcgdexUrl(row.image_url) ||
    isBrokenTcgdexUrl(row.image_alt_url) ||
    isBrokenTcgdexUrl(row.image_path) ||
    isBrokenTcgdexUrl(row.representative_image_url)
  );
}

function normalizeSetName(name) {
  return clean(name)
    .replaceAll("Macdonald's", "McDonald's")
    .replaceAll('trainer Kit', 'Trainer Kit');
}

function replacementForRow(row) {
  const setCode = normalizedSetCode(row);
  const alias = SAFE_POKEMONTCG_SET_ALIASES.get(setCode);
  const number = numericNumber(row);
  if (!alias || number == null) return null;
  if (typeof alias.min === 'number' && number < alias.min) return null;
  if (typeof alias.max === 'number' && number > alias.max) return null;
  return {
    card_print_id: row.id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    previous_image_url: row.image_url,
    target_image_url: `https://images.pokemontcg.io/${alias.pokemonTcgSetCode}/${number}_hires.png`,
    target_image_source: 'pokemonapi',
    target_image_status: 'exact',
    target_image_note: alias.note,
  };
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function fetchAllRows(client) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('card_prints')
      .select('id,gv_id,name,set_code,number,number_plain,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note')
      .in('set_code', AUDITED_SET_CODES)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return rows.sort((left, right) => (
    clean(left.set_code).localeCompare(clean(right.set_code)) ||
    clean(left.number).localeCompare(clean(right.number), undefined, { numeric: true }) ||
    clean(left.name).localeCompare(clean(right.name)) ||
    clean(left.id).localeCompare(clean(right.id))
  ));
}

async function fetchSetRows(client) {
  const { data, error } = await client
    .from('sets')
    .select('id,code,name,printed_set_abbrev,printed_total,release_date')
    .in('code', AUDITED_SET_CODES)
    .order('code', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function headWithTlsFallback(url) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: 'HEAD',
        rejectUnauthorized: false,
      },
      (response) => {
        response.resume();
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          headers: {
            get(name) {
              return response.headers[name.toLowerCase()] ?? null;
            },
          },
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

async function probeImage(url) {
  let response;
  let tlsFallback = false;
  try {
    response = await fetch(url, { method: 'HEAD' });
  } catch (error) {
    response = await headWithTlsFallback(url);
    tlsFallback = true;
  }
  const contentType = response.headers.get('content-type') ?? '';
  return {
    url,
    ok: response.ok && contentType.toLowerCase().startsWith('image/'),
    status: response.status,
    content_type: contentType,
    content_length: response.headers.get('content-length'),
    tls_fallback: tlsFallback,
  };
}

async function probeReplacements(replacements) {
  const probes = [];
  for (const row of replacements) {
    probes.push({
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      ...(await probeImage(row.target_image_url)),
    });
  }
  return probes;
}

async function applyUpdates(client, plan) {
  const results = {
    set_renames_applied: 0,
    image_replacements_applied: 0,
    image_blocks_applied: 0,
  };

  for (const row of plan.set_renames) {
    const { error } = await client
      .from('sets')
      .update({ name: row.target_name })
      .eq('id', row.set_id);
    if (error) throw new Error(`set rename failed for ${row.code}: ${error.message}`);
    results.set_renames_applied += 1;
  }

  for (const row of plan.image_replacements) {
    const { error } = await client
      .from('card_prints')
      .update({
        image_url: row.target_image_url,
        image_alt_url: null,
        image_source: row.target_image_source,
        image_path: null,
        representative_image_url: null,
        image_status: row.target_image_status,
        image_note: row.target_image_note,
      })
      .eq('id', row.card_print_id);
    if (error) throw new Error(`image replacement failed for ${row.gv_id}: ${error.message}`);
    results.image_replacements_applied += 1;
  }

  for (const row of plan.image_blocks) {
    const { error } = await client
      .from('card_prints')
      .update({
        image_url: null,
        image_alt_url: null,
        image_source: null,
        image_path: null,
        representative_image_url: null,
        image_status: UNRESOLVED_IMAGE_STATUS,
        image_note: TRAINER_KIT_BLOCKED_NOTE,
      })
      .eq('id', row.card_print_id);
    if (error) throw new Error(`image block failed for ${row.gv_id}: ${error.message}`);
    results.image_blocks_applied += 1;
  }

  return results;
}

function buildMarkdown(artifact) {
  const lines = [
    `# ${PACKAGE_ID}`,
    '',
    `- Generated: ${artifact.generated_at}`,
    `- Mode: ${artifact.mode}`,
    `- Fingerprint: \`${artifact.fingerprint_sha256}\``,
    `- Set renames: ${artifact.plan.set_renames.length}`,
    `- Image replacements: ${artifact.plan.image_replacements.length}`,
    `- Image blocks: ${artifact.plan.image_blocks.length}`,
    `- Replacement probes ok: ${artifact.replacement_probe_summary.ok}/${artifact.replacement_probe_summary.total}`,
    '',
    '## Counts By Set',
    '',
    '| Set | Broken Rows | Replacements | Blocks |',
    '|---|---:|---:|---:|',
  ];
  const setCodes = new Set([
    ...Object.keys(artifact.summary.broken_by_set),
    ...Object.keys(artifact.summary.replacements_by_set),
    ...Object.keys(artifact.summary.blocks_by_set),
  ]);
  for (const setCode of [...setCodes].sort()) {
    lines.push(`| ${mdEscape(setCode)} | ${artifact.summary.broken_by_set[setCode] ?? 0} | ${artifact.summary.replacements_by_set[setCode] ?? 0} | ${artifact.summary.blocks_by_set[setCode] ?? 0} |`);
  }

  lines.push('', '## Current Live State', '');
  lines.push('| Set | Name | Total | Exact PokemonTCG | Unresolved No URL | Broken TCGdex URLs |');
  lines.push('|---|---|---:|---:|---:|---:|');
  for (const row of artifact.current_live_state ?? []) {
    lines.push(
      `| ${mdEscape(row.code)} | ${mdEscape(row.name)} | ${row.total_cards} | ${row.exact_pokemonapi} | ${row.unresolved_no_url} | ${row.broken_tcgdex_urls} |`,
    );
  }

  lines.push('', '## Set Renames', '', '| Code | Previous | Target |', '|---|---|---|');
  for (const row of artifact.plan.set_renames) {
    lines.push(`| ${mdEscape(row.code)} | ${mdEscape(row.previous_name)} | ${mdEscape(row.target_name)} |`);
  }

  lines.push('', '## Replacement Sample', '', '| GV ID | Name | Set | Number | Target |', '|---|---|---|---|---|');
  for (const row of artifact.plan.image_replacements.slice(0, 30)) {
    lines.push(`| ${mdEscape(row.gv_id)} | ${mdEscape(row.name)} | ${mdEscape(row.set_code)} | ${mdEscape(row.number)} | ${mdEscape(row.target_image_url)} |`);
  }

  lines.push('', '## Block Sample', '', '| GV ID | Name | Set | Number | Previous URL |', '|---|---|---|---|---|');
  for (const row of artifact.plan.image_blocks.slice(0, 30)) {
    lines.push(`| ${mdEscape(row.gv_id)} | ${mdEscape(row.name)} | ${mdEscape(row.set_code)} | ${mdEscape(row.number)} | ${mdEscape(row.previous_image_url)} |`);
  }

  return `${lines.join('\n')}\n`;
}

function buildCurrentLiveState(setRows, cardRows) {
  const setNames = new Map(setRows.map((row) => [clean(row.code), clean(row.name)]));
  const counts = new Map();
  for (const row of cardRows) {
    const code = clean(row.set_code);
    const current = counts.get(code) ?? {
      code,
      name: setNames.get(code) ?? '',
      total_cards: 0,
      exact_pokemonapi: 0,
      unresolved_no_url: 0,
      broken_tcgdex_urls: 0,
    };
    current.total_cards += 1;
    if (clean(row.image_source) === 'pokemonapi' && clean(row.image_status) === 'exact') {
      current.exact_pokemonapi += 1;
    }
    if (clean(row.image_status) === UNRESOLVED_IMAGE_STATUS && !clean(row.image_url)) {
      current.unresolved_no_url += 1;
    }
    if (rowHasBrokenTcgdexImage(row)) {
      current.broken_tcgdex_urls += 1;
    }
    counts.set(code, current);
  }
  return [...counts.values()].sort((left, right) => left.code.localeCompare(right.code));
}

async function main() {
  const client = supabaseClient();
  const [setRows, cardRows] = await Promise.all([fetchSetRows(client), fetchAllRows(client)]);
  const brokenRows = cardRows.filter(rowHasBrokenTcgdexImage);
  const replacements = brokenRows
    .map(replacementForRow)
    .filter(Boolean);
  const replacementIds = new Set(replacements.map((row) => row.card_print_id));
  const blocks = brokenRows
    .filter((row) => !replacementIds.has(row.id))
    .map((row) => ({
      card_print_id: row.id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      previous_image_url: row.image_url,
      previous_image_status: row.image_status,
      target_image_status: UNRESOLVED_IMAGE_STATUS,
      target_image_note: TRAINER_KIT_BLOCKED_NOTE,
    }));
  const setRenames = setRows
    .map((row) => ({
      set_id: row.id,
      code: row.code,
      previous_name: row.name,
      target_name: normalizeSetName(row.name),
    }))
    .filter((row) => clean(row.previous_name) !== clean(row.target_name));
  const replacementProbes = await probeReplacements(replacements);
  const failedProbes = replacementProbes.filter((probe) => !probe.ok);
  if (failedProbes.length > 0) {
    throw new Error(`Replacement probe failed: ${JSON.stringify(failedProbes.slice(0, 5), null, 2)}`);
  }

  const plan = {
    set_renames: setRenames,
    image_replacements: replacements,
    image_blocks: blocks,
  };
  const fingerprintRows = {
    set_renames: setRenames.map(({ set_id, code, target_name }) => ({ set_id, code, target_name })),
    image_replacements: replacements.map(({ card_print_id, target_image_url, target_image_source, target_image_status }) => ({
      card_print_id,
      target_image_url,
      target_image_source,
      target_image_status,
    })),
    image_blocks: blocks.map(({ card_print_id, target_image_status }) => ({ card_print_id, target_image_status })),
  };
  const apply_result = APPLY ? await applyUpdates(client, plan) : null;
  const afterRows = APPLY ? await fetchAllRows(client) : null;
  const afterBrokenRows = afterRows ? afterRows.filter(rowHasBrokenTcgdexImage) : null;
  const artifact = {
    package_id: PACKAGE_ID,
    generated_at: NOW,
    mode: APPLY ? 'real_apply' : 'dry_run',
    fingerprint_sha256: sha256(stableJson(fingerprintRows)),
    constraints: {
      no_migrations: true,
      no_deletes: true,
      no_merges: true,
      no_child_printing_writes: true,
      normal_search_ai_unchanged: true,
    },
    plan,
    replacement_probes: replacementProbes,
    replacement_probe_summary: {
      total: replacementProbes.length,
      ok: replacementProbes.filter((probe) => probe.ok).length,
      failed: failedProbes.length,
    },
    current_live_state: buildCurrentLiveState(setRows, afterRows ?? cardRows),
    apply_result,
    summary: {
      audited_sets: AUDITED_SET_CODES.length,
      audited_card_rows: cardRows.length,
      broken_rows: brokenRows.length,
      broken_by_set: countBy(brokenRows, (row) => row.set_code),
      replacements_by_set: countBy(replacements, (row) => row.set_code),
      blocks_by_set: countBy(blocks, (row) => row.set_code),
      post_apply_broken_rows: afterBrokenRows?.length ?? null,
      post_apply_broken_by_set: afterBrokenRows ? countBy(afterBrokenRows, (row) => row.set_code) : null,
    },
  };

  await writeJson(OUTPUT_JSON, artifact);
  await writeText(OUTPUT_MD, buildMarkdown(artifact));
  console.log(JSON.stringify({
    mode: artifact.mode,
    fingerprint_sha256: artifact.fingerprint_sha256,
    set_renames: setRenames.length,
    image_replacements: replacements.length,
    image_blocks: blocks.length,
    apply_result,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
  }, null, 2));
}

await main();

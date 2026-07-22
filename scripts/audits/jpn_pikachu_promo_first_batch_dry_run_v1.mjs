import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const AUDIT_DIR = path.join(
  'docs',
  'audits',
  'master_identity_graph_v1',
  'jpn_pikachu_promo_gap_audit_v1',
);
const AUDIT_JSON = path.join(AUDIT_DIR, 'jpn_pikachu_promo_gap_audit_v1.json');
const OUT_DIR = path.join(
  'docs',
  'audits',
  'master_identity_graph_v1',
  'jpn_pikachu_promo_first_batch_dry_run_v1',
);

const BULBAPEDIA_PIKACHU_URL = 'https://bulbapedia.bulbagarden.net/wiki/Pikachu_(TCG)';

const PROMO_SET_MAP = {
  'SV-P': { set_code: 'jpn-svp', gv_prefix: 'SVP' },
  'S-P': { set_code: 'jpn-sp', gv_prefix: 'SP' },
  'SM-P': { set_code: 'jpn-smp', gv_prefix: 'SMP' },
  'XY-P': { set_code: 'jpn-xyp', gv_prefix: 'XYP' },
  'BW-P': { set_code: 'jpn-bwp', gv_prefix: 'BWP' },
  'DP-P': { set_code: 'jpn-dpp', gv_prefix: 'DPP' },
  'DPT-P': { set_code: 'jpn-dptp', gv_prefix: 'DPTP' },
};

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return crypto.createHash('sha256').update(text).digest('hex');
}

function slugToDisplayName(slug) {
  const displayName = slug
    .replace(/-?(?:scarlet-and-violet|sword-and-shield|sun-and-moon|xy|black-and-white|diamond-and-pearl|platinum)-promos-\d+-(?:sv|s|sm|xy|bw|dp|dpt)-p$/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bDxs\b/g, 'DX')
    .replace(/\bVmax\b/g, 'VMAX');

  return displayName
    .replace(/\bEx\b/g, 'ex')
    .replace(/\bGx\b/g, 'GX')
    .replace(/\bLv X\b/g, 'LV.X')
    .replace(/\bSapporos\b/g, "Sapporo's")
    .replace(/\bAshs\b/g, "Ash's")
    .replace(/\bTeam Magmas\b/g, "Team Magma's")
    .replace(/\bTeam Aquas\b/g, "Team Aqua's");
}

function candidateSlug(sourceUrl, numberKey) {
  const rawSlug = new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1) ?? numberKey;
  return rawSlug
    .replace(/-?(?:scarlet-and-violet|sword-and-shield|sun-and-moon|xy|black-and-white|diamond-and-pearl|platinum)-promos-\d+-(?:sv|s|sm|xy|bw|dp|dpt)-p$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function parseNumber(numberKey) {
  const match = numberKey.match(/^(\d{1,3})\/([A-Z]+-P)$/i);
  if (!match) return null;
  return {
    number_plain: match[1].padStart(3, '0'),
    promo_suffix: match[2].toUpperCase(),
  };
}

function buildTarget(card) {
  const parsed = parseNumber(card.source_number_key);
  if (!parsed) return null;
  const set = PROMO_SET_MAP[parsed.promo_suffix];
  if (!set) return null;
  if (!card.corroborated_by_bulbapedia) return null;

  const slug = candidateSlug(card.source_url, card.source_number_key);
  const displayName = slugToDisplayName(new URL(card.source_url).pathname.split('/').filter(Boolean).at(-1) ?? slug);
  const modifier = `jpn_promo_${parsed.promo_suffix.toLowerCase().replace('-', '')}_${parsed.number_plain}_${slug}`;
  const gvId = `GV-PK-JPN-${set.gv_prefix}-${parsed.number_plain}-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
  const identityPayload = {
    identity_domain: 'pokemon_jpn',
    set_code_identity: set.set_code,
    printed_number: parsed.number_plain,
    normalized_printed_name: displayName.toLowerCase(),
    printed_identity_modifier: modifier,
    source_number: card.source_number_key,
  };

  return {
    candidate_key: sha256({
      source: 'jpn_pikachu_promo_first_batch_v1',
      source_number_key: card.source_number_key,
      slug,
    }),
    action_type: card.grookai_rows ? 'insert_reused_promo_number_parent' : 'insert_missing_promo_parent',
    source_number_key: card.source_number_key,
    name: displayName,
    set_code: set.set_code,
    number: parsed.number_plain,
    number_plain: parsed.number_plain,
    gv_id: gvId,
    printed_identity_modifier: modifier,
    variant_key: null,
    identity_domain: 'pokemon_jpn',
    identity_key_version: 'jpn_pikachu_promo_first_batch_v1',
    identity_key_hash: sha256(identityPayload),
    identity_payload: identityPayload,
    source_evidence: [
      {
        source_key: 'tcgcollector',
        source_url: card.source_url,
        source_number: card.source_number_key,
        source_label: card.source_label,
      },
      {
        source_key: 'bulbapedia_pikachu_tcg',
        source_url: BULBAPEDIA_PIKACHU_URL,
        source_number: card.source_number_key,
        source_label: `Pikachu TCG page includes ${card.source_number_key}`,
      },
    ],
    existing_number_occupants_preserved: card.grookai_rows ?? [],
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Japanese Pikachu Promo First Batch Dry Run v1');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Read-only dry run. No DB writes, no image writes, no public visibility writes.');
  lines.push('- Includes only modern numbered promo suffix lanes with existing set containers: `SV-P`, `S-P`, `SM-P`, `XY-P`, `BW-P`, `DP-P`, `DPt-P`.');
  lines.push('- Excludes `ADV-P`, `PCG-P`, `MP No.`, `No.`, `/P`, and other legacy lanes until their set/identity containers are modeled separately.');
  lines.push('- Existing non-Pikachu rows with reused promo numbers are preserved; proposed Pikachu rows receive explicit `printed_identity_modifier` values.');
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`- Proposed parent card_print rows: ${report.counts.card_print_inserts}`);
  lines.push(`- Proposed card_print_identity rows: ${report.counts.card_print_identity_inserts}`);
  lines.push(`- Proposed source evidence rows: ${report.counts.source_evidence_inserts}`);
  lines.push(`- Proposed family review rows: ${report.counts.family_review_rows}`);
  lines.push(`- Reused-number inserts: ${report.counts.reused_number_parent_inserts}`);
  lines.push(`- Missing-number inserts: ${report.counts.missing_number_parent_inserts}`);
  lines.push(`- Payload fingerprint: \`${report.payload_fingerprint_sha256}\``);
  lines.push(`- Preflight status: ${report.preflight.ok ? '`pass`' : '`fail`'}`);
  lines.push(`- GV ID collisions: ${report.preflight.gv_id_collisions.length}`);
  lines.push(`- Identity hash collisions: ${report.preflight.identity_hash_collisions.length}`);
  lines.push(`- Missing set containers: ${report.preflight.missing_set_codes.length}`);
  lines.push('');
  lines.push('## By Set');
  lines.push('');
  lines.push('| Set | Total | Reused-number | Missing-number |');
  lines.push('|---|---:|---:|---:|');
  for (const [setCode, row] of Object.entries(report.by_set).sort()) {
    lines.push(`| ${setCode} | ${row.total} | ${row.reused_number_parent_inserts} | ${row.missing_number_parent_inserts} |`);
  }
  lines.push('');
  lines.push('## Targets');
  lines.push('');
  lines.push('| GV ID | Name | Number | Set | Action |');
  lines.push('|---|---|---|---|---|');
  for (const target of report.targets) {
    lines.push(`| ${target.gv_id} | ${target.name.replaceAll('|', '\\|')} | ${target.source_number_key} | ${target.set_code} | ${target.action_type} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function supabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_PUBLISHABLE_KEY.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function selectInChunks(supabase, table, column, values, select) {
  const out = [];
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    const { data, error } = await supabase.from(table).select(select).in(column, chunk);
    if (error) throw error;
    out.push(...(data ?? []));
  }
  return out;
}

async function runPreflight(targets) {
  const supabase = await supabaseClient();
  const gvIds = targets.map((target) => target.gv_id);
  const identityHashes = targets.map((target) => target.identity_key_hash);
  const setCodes = [...new Set(targets.map((target) => target.set_code))];

  const [gvRows, identityRows, setRows] = await Promise.all([
    selectInChunks(supabase, 'card_prints', 'gv_id', gvIds, 'gv_id,name,set_code,number'),
    selectInChunks(supabase, 'card_print_identity', 'identity_key_hash', identityHashes, 'identity_key_hash,card_print_id,identity_domain,is_active'),
    selectInChunks(supabase, 'sets', 'code', setCodes, 'code,id,name'),
  ]);

  const foundSetCodes = new Set(setRows.map((row) => row.code));
  const missingSetCodes = setCodes.filter((code) => !foundSetCodes.has(code));
  return {
    ok: gvRows.length === 0 && identityRows.length === 0 && missingSetCodes.length === 0,
    gv_id_collisions: gvRows,
    identity_hash_collisions: identityRows,
    missing_set_codes: missingSetCodes,
    resolved_set_codes: setRows,
  };
}

async function hydrateIdentityHashes(targets) {
  const supabase = await supabaseClient();
  const hydrated = [];

  for (const target of targets) {
    const { data, error } = await supabase.rpc('card_print_identity_hash_v1', {
      p_identity_domain: target.identity_domain,
      p_identity_key_version: 'pokemon_jpn:v1',
      p_set_code_identity: target.set_code,
      p_printed_number: target.number_plain,
      p_normalized_printed_name: target.name,
      p_source_name_raw: target.name,
      p_identity_payload: target.identity_payload,
    });

    if (error) throw error;
    hydrated.push({
      ...target,
      identity_key_version: 'pokemon_jpn:v1',
      identity_key_hash: data,
    });
  }

  return hydrated;
}

async function main() {
  const audit = JSON.parse(await fs.readFile(AUDIT_JSON, 'utf8'));
  const rawTargets = audit.comparison.two_source_actionable
    .map(buildTarget)
    .filter(Boolean)
    .sort((a, b) => a.gv_id.localeCompare(b.gv_id));
  const targets = await hydrateIdentityHashes(rawTargets);

  const bySet = {};
  for (const target of targets) {
    bySet[target.set_code] ??= {
      total: 0,
      reused_number_parent_inserts: 0,
      missing_number_parent_inserts: 0,
    };
    bySet[target.set_code].total += 1;
    if (target.action_type === 'insert_reused_promo_number_parent') bySet[target.set_code].reused_number_parent_inserts += 1;
    else bySet[target.set_code].missing_number_parent_inserts += 1;
  }

  const preflight = await runPreflight(targets);
  const reportCore = {
    package_id: 'jpn_pikachu_promo_first_batch_v1',
    generated_at: new Date().toISOString(),
    source_audit_path: AUDIT_JSON,
    counts: {
      card_print_inserts: targets.length,
      card_print_identity_inserts: targets.length,
      source_evidence_inserts: targets.length * 2,
      family_review_rows: targets.length,
      reused_number_parent_inserts: targets.filter((target) => target.action_type === 'insert_reused_promo_number_parent').length,
      missing_number_parent_inserts: targets.filter((target) => target.action_type === 'insert_missing_promo_parent').length,
    },
    by_set: bySet,
    preflight,
    targets,
  };
  const report = {
    ...reportCore,
    payload_fingerprint_sha256: sha256(reportCore),
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, 'jpn_pikachu_promo_first_batch_dry_run_v1.json');
  const mdPath = path.join(OUT_DIR, 'jpn_pikachu_promo_first_batch_dry_run_v1.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, toMarkdown(report));
  console.log(JSON.stringify({
    status: 'ok',
    json_path: jsonPath,
    md_path: mdPath,
    counts: report.counts,
    payload_fingerprint_sha256: report.payload_fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

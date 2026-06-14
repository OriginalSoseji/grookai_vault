import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const FIXTURE_ROOT = path.join(DEFAULT_OUTPUT_DIR, 'source_fixtures');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const REMAINING_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_stamped_identity_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'STAMPED-IDENTITY-READINESS-V1';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
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
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function factKey(row) {
  return [
    normalizeText(row.set_key),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    'stamped',
  ].join('|');
}

function liveNumberCandidates(row) {
  return [...new Set([
    row?.card_number,
    row?.number,
    row?.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
}

function slug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function titleCaseLabel(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function exactPhraseInsideParens(value) {
  const matches = [...String(value ?? '').matchAll(/\(([^()]+)\)|\[([^\[\]]+)\]/g)];
  return matches.map((match) => match[1] ?? match[2]).find((phrase) => /stamp|staff|prerelease|league promo|prize pack|play pokemon|world championship|pokemon together|pumpkin|silhouette|deck/i.test(phrase)) ?? null;
}

function inferStampIdentity(evidenceRows) {
  const texts = evidenceRows.flatMap((row) => [
    row.source_key,
    row.evidence_label,
    row.notes,
    row.raw_snapshot_ref,
    row.source_url,
  ]).filter(Boolean).map(String);
  const combined = texts.join(' | ');
  const lower = normalizeText(combined);
  const parenthetical = exactPhraseInsideParens(combined);
  const tcgCollectorVariant = combined.match(/TCGCollector card variant\s+([^|]+?\bstamp\b)/i)?.[1];
  const pokeScopeVariant = combined.match(/PokeScope:[^|]+?\blists\s+([^|]+?\bstamp)\s+as a variant/i)?.[1];
  const cardTraderStaffChampionship = combined.match(/CardTrader blueprint row [^|]+-\s*STAFF\s*\|\s*([^|]+?)\s+\d/i)?.[1];

  if (tcgCollectorVariant) {
    const phrase = titleCaseLabel(tcgCollectorVariant);
    return { stamp_label: phrase, variant_key: slug(phrase), stamp_confidence: 'exact_label' };
  }
  if (pokeScopeVariant) {
    const phrase = titleCaseLabel(pokeScopeVariant);
    return { stamp_label: phrase, variant_key: slug(phrase), stamp_confidence: 'exact_label' };
  }
  if (cardTraderStaffChampionship) {
    const phrase = `${titleCaseLabel(cardTraderStaffChampionship)} Staff Stamp`;
    return { stamp_label: phrase, variant_key: slug(phrase), stamp_confidence: 'exact_label' };
  }

  if (/staff\s*\+\s*prerelease|staff prerelease/i.test(combined)) {
    return { stamp_label: 'Staff Prerelease Stamp', variant_key: 'staff_prerelease_stamp', stamp_confidence: 'exact_label' };
  }
  if (/build\s*&?\s*battle|build_battle/i.test(combined) && /prerelease|pre-release/i.test(combined)) {
    return { stamp_label: 'Prerelease Stamp', variant_key: 'prerelease_stamp', stamp_confidence: 'derived_from_build_battle_prerelease_rule' };
  }
  if (/\bstaff stamp\b/i.test(combined) || /\bstaff\b/i.test(parenthetical ?? '')) {
    const phrase = parenthetical && /world championship/i.test(parenthetical)
      ? `${parenthetical} Stamp`
      : 'Staff Stamp';
    return { stamp_label: phrase, variant_key: slug(`${phrase} stamp`).replace(/_stamp_stamp$/, '_stamp'), stamp_confidence: 'exact_label' };
  }
  if (/gold foil\s+["']?staff["']?\s+stamp/.test(lower)) {
    return { stamp_label: 'Staff Stamp', variant_key: 'staff_stamp', stamp_confidence: 'exact_label' };
  }
  if (/\bprerelease stamp\b/i.test(combined) || /\bprerelease\b/i.test(parenthetical ?? '')) {
    return { stamp_label: 'Prerelease Stamp', variant_key: 'prerelease_stamp', stamp_confidence: 'exact_label' };
  }
  if (/\bpre[-\s]?release\b|\bprerelease\b/i.test(combined)) {
    return { stamp_label: 'Prerelease Stamp', variant_key: 'prerelease_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pokemon together/i.test(combined)) {
    return { stamp_label: 'Pokemon Together Stamp', variant_key: 'pokemon_together_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pokemon center logo|pokemon center stamp|pokemon center elite trainer box|pokemon-center/.test(lower)) {
    return { stamp_label: 'Pokemon Center Stamp', variant_key: 'pokemon_center_stamp', stamp_confidence: 'exact_label' };
  }
  if (/gamestop logo stamp|game stop logo stamp|gamestop stamp|game stop stamp/.test(lower)) {
    return { stamp_label: 'GameStop Stamp', variant_key: 'gamestop_stamp', stamp_confidence: 'exact_label' };
  }
  if (/eb games/.test(lower)) {
    return { stamp_label: 'EB Games Stamp', variant_key: 'eb_games_stamp', stamp_confidence: 'exact_label' };
  }
  if (/mcdonalds logo|mcdonald s logo|mcdonald's logo/.test(lower)) {
    return { stamp_label: "McDonald's Stamp", variant_key: 'mcdonalds_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pikachu jack o lantern stamp|trick or trade|boooster bundle/.test(lower)) {
    return { stamp_label: "Pikachu Jack-o'-Lantern Stamp", variant_key: 'pikachu_jack_o_lantern_stamp', stamp_confidence: 'exact_label' };
  }
  if (/winner version|winner stamp/.test(lower)) {
    return { stamp_label: 'Winner Stamp', variant_key: 'winner_stamp', stamp_confidence: 'exact_label' };
  }
  if (/prize[_\s-]*pack/i.test(combined)) {
    return { stamp_label: 'Prize Pack Stamp', variant_key: 'prize_pack_stamp', stamp_confidence: 'exact_label' };
  }
  if (/quarter finalist|quarter-finalist/.test(lower)) {
    return { stamp_label: 'Quarter Finalist Stamp', variant_key: 'quarter_finalist_stamp', stamp_confidence: 'exact_label' };
  }
  if (/(^|[^a-z])finalist($|[^a-z])/.test(lower)) {
    return { stamp_label: 'Finalist Stamp', variant_key: 'finalist_stamp', stamp_confidence: 'exact_label' };
  }
  if (/league cup staff|league-cup-staff|league staff|league-staff/.test(lower)) {
    return { stamp_label: 'League Cup Staff Stamp', variant_key: 'league_cup_staff_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pikachu pumpkin/i.test(combined)) {
    return { stamp_label: 'Pikachu Pumpkin Stamp', variant_key: 'pikachu_pumpkin_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pikachu stamp/i.test(combined)) {
    return { stamp_label: 'Pikachu Stamp', variant_key: 'pikachu_stamp', stamp_confidence: 'exact_label' };
  }
  if (/play pokemon|play! pokemon/i.test(combined)) {
    return { stamp_label: 'Play! Pokemon Stamp', variant_key: 'play_pokemon_stamp', stamp_confidence: 'exact_label' };
  }
  if (/chaos rising stamped/i.test(combined)) {
    return { stamp_label: 'Chaos Rising Stamp', variant_key: 'chaos_rising_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pokemon center ny/i.test(combined)) {
    return { stamp_label: 'Pokemon Center NY Stamp', variant_key: 'pokemon_center_ny_stamp', stamp_confidence: 'exact_label' };
  }
  if (/\bwotc stamp\b/i.test(combined)) {
    return { stamp_label: 'WOTC Stamp', variant_key: 'wotc_stamp', stamp_confidence: 'exact_label' };
  }
  if (/\bleague stamp\b/i.test(combined)) {
    return { stamp_label: 'League Stamp', variant_key: 'league_stamp', stamp_confidence: 'exact_label' };
  }
  if (/crosshatch/.test(lower)) {
    return { stamp_label: 'Player Rewards Crosshatch Stamp', variant_key: 'player_rewards_crosshatch_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pokemon league/i.test(combined) && /\b1st place\b/i.test(combined)) {
    return { stamp_label: 'Pokemon League 1st Place Stamp', variant_key: 'pokemon_league_1st_place_stamp', stamp_confidence: 'exact_label' };
  }
  if (/pokemon league/.test(lower)) {
    return { stamp_label: 'League Stamp', variant_key: 'league_stamp', stamp_confidence: 'exact_label' };
  }
  if (/league promo|league-promo|(^|[^a-z])league($|[^a-z0-9])/.test(lower)) {
    return { stamp_label: 'League Stamp', variant_key: 'league_stamp', stamp_confidence: 'exact_label' };
  }
  if (/asia championship/i.test(combined) || /asia-championship/i.test(combined)) {
    return { stamp_label: 'Asia Championship Stamp', variant_key: 'asia_championship_stamp', stamp_confidence: 'exact_label' };
  }
  if (/city championship/i.test(combined) || /city-championships?/i.test(combined)) {
    return { stamp_label: 'City Championships Stamp', variant_key: 'city_championships_stamp', stamp_confidence: 'exact_label' };
  }
  if (/state championship|states championship/i.test(combined) || /state-championships?/i.test(combined)) {
    return { stamp_label: 'State Championships Stamp', variant_key: 'state_championships_stamp', stamp_confidence: 'exact_label' };
  }
  if (/regional championship/i.test(combined) || /regional-championships?/i.test(combined)) {
    return { stamp_label: 'Regional Championships Stamp', variant_key: 'regional_championships_stamp', stamp_confidence: 'exact_label' };
  }
  if (/national championship/i.test(combined) || /national-championships?/i.test(combined)) {
    return { stamp_label: 'National Championships Stamp', variant_key: 'national_championships_stamp', stamp_confidence: 'exact_label' };
  }
  if (/world championship/i.test(combined) || /world-championships?/i.test(combined)) {
    return { stamp_label: 'World Championships Stamp', variant_key: 'world_championships_stamp', stamp_confidence: 'exact_label' };
  }
  if (/player rewards program special print|player rewards special print|player_rewards/i.test(combined)) {
    return { stamp_label: 'Player Rewards Crosshatch Stamp', variant_key: 'player_rewards_crosshatch_stamp', stamp_confidence: 'exact_label' };
  }
  if (/professor program/i.test(combined)) {
    return { stamp_label: 'Professor Program Stamp', variant_key: 'professor_program_stamp', stamp_confidence: 'exact_label' };
  }
  if (/professor[-\s]+[a-z0-9-]*program|program[-\s]+[0-9]{4}/.test(lower)) {
    return { stamp_label: 'Professor Program Stamp', variant_key: 'professor_program_stamp', stamp_confidence: 'exact_label' };
  }
  if (/championship staff|championships staff|staff championship|staff championships/.test(lower)) {
    return { stamp_label: 'Championship Staff Stamp', variant_key: 'championship_staff_stamp', stamp_confidence: 'exact_label' };
  }
  if (/league promo/i.test(combined)) {
    return { stamp_label: 'Play! Pokemon Stamp', variant_key: 'play_pokemon_stamp', stamp_confidence: 'derived_from_prize_pack_league_promo' };
  }
  if (/colored silhouettes|silhouette|deck mark|battle academy/i.test(combined)) {
    return { stamp_label: 'Battle Academy Deck Mark', variant_key: 'battle_academy_deck_mark', stamp_confidence: 'derived_from_product_rule' };
  }
  if (/burger king collection 2008|burger king 2008/i.test(combined) && /diamond\s*&?\s*pearl/i.test(combined)) {
    return { stamp_label: 'Diamond & Pearl Stamp', variant_key: 'diamond_pearl_stamp', stamp_confidence: 'derived_from_burger_king_collection_rule' };
  }
  if (/burger king collection 2009|burger king 2009/i.test(combined) && /platinum/i.test(combined)) {
    return { stamp_label: 'Platinum Stamped Burger King 2009', variant_key: 'platinum_stamped_burger_king_2009', stamp_confidence: 'derived_from_burger_king_collection_rule' };
  }
  if (/stamp|stamped/.test(lower) && parenthetical) {
    const phrase = parenthetical.toLowerCase().includes('stamp') ? parenthetical : `${parenthetical} Stamp`;
    return { stamp_label: titleCaseLabel(phrase), variant_key: slug(phrase), stamp_confidence: 'exact_label' };
  }
  if (/stamp|stamped/.test(lower)) {
    return { stamp_label: null, variant_key: null, stamp_confidence: 'generic_stamped_only' };
  }
  return { stamp_label: null, variant_key: null, stamp_confidence: 'missing_stamp_phrase' };
}

async function listJsonFiles(dir) {
  const out = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(filePath);
      else if (entry.isFile() && entry.name.endsWith('.json')) out.push(filePath);
    }
  }
  await walk(dir);
  return out;
}

async function loadStampedFixtureRecords() {
  const files = await listJsonFiles(FIXTURE_ROOT);
  const records = [];
  for (const filePath of files) {
    let parsed;
    try {
      parsed = await readJson(filePath);
    } catch {
      continue;
    }
    const rows = Array.isArray(parsed?.records) ? parsed.records : [];
    for (const row of rows) {
      if (normalizeText(row.finish_key) !== 'stamped') continue;
      records.push({
        ...row,
        fixture_path: path.relative(ROOT, filePath).replaceAll('\\', '/'),
      });
    }
  }
  return records;
}

async function loadLiveParents(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', parents: [] };
  const setCodes = [...new Set(rows.map((row) => normalizeText(row.set_key)))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_id::text,
         cp.set_code,
         cp.number,
         cp.number_plain,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.name as card_name,
         cp.printed_identity_modifier,
         cp.variant_key,
         cp.gv_id,
         coalesce((select jsonb_agg(cpr.finish_key order by cpr.finish_key) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as child_finishes,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id), 0) as external_mapping_count,
         coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_instance_parent_count,
         coalesce((select count(*)::int from public.pricing_watch pw where pw.card_print_id = cp.id), 0) as pricing_watch_count,
         coalesce((select count(*)::int from public.card_feed_events cfe where cfe.card_print_id = cp.id), 0) as card_feed_event_count
       from public.card_prints cp
       where lower(coalesce(cp.set_code, '')) = any($1::text[])
       order by cp.set_code, cp.number, cp.name, cp.variant_key nulls first, cp.id`,
      [setCodes],
    );
    await client.query('rollback');
    return { available: true, reason: null, parents: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, parents: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function classifyRow(row, evidenceRows, liveParents) {
  const stamp = inferStampIdentity(evidenceRows);
  const sameSlotParents = liveParents.filter((parent) => (
    normalizeText(parent.set_code) === normalizeText(row.set_key)
    && liveNumberCandidates(parent).includes(normalizeNumber(row.card_number))
    && normalizeText(parent.card_name) === normalizeText(row.card_name)
  ));
  const baseParents = sameSlotParents.filter((parent) => !parent.variant_key);
  const stampedCollisions = stamp.variant_key
    ? sameSlotParents.filter((parent) => normalizeText(parent.variant_key) === normalizeText(stamp.variant_key))
    : [];
  const dependencyRefs = baseParents.reduce((sum, parent) => (
    sum
    + Number(parent.vault_item_count ?? 0)
    + Number(parent.vault_instance_parent_count ?? 0)
    + Number(parent.pricing_watch_count ?? 0)
    + Number(parent.card_feed_event_count ?? 0)
  ), 0);

  let readiness_status = 'blocked_manual_review';
  const blockers = [];
  if (!stamp.variant_key || !stamp.stamp_label) blockers.push(`stamp_identity_${stamp.stamp_confidence}`);
  if (baseParents.length !== 1) blockers.push(`base_parent_count_${baseParents.length}`);
  if (stampedCollisions.length > 0) blockers.push(`stamped_variant_collision_${stampedCollisions.length}`);
  if (evidenceRows.length < 1) blockers.push('no_preserved_fixture_evidence');

  if (blockers.length === 0) {
    readiness_status = dependencyRefs > 0
      ? 'ready_for_guarded_parent_identity_insert_with_dependency_awareness'
      : 'ready_for_guarded_parent_identity_insert';
  } else if (stamp.variant_key && baseParents.length === 1 && stampedCollisions.length === 0) {
    readiness_status = 'needs_source_label_review_before_insert';
  } else if (baseParents.length === 0) {
    readiness_status = 'blocked_base_parent_missing';
  } else if (baseParents.length > 1) {
    readiness_status = 'blocked_base_parent_ambiguous';
  } else if (stampedCollisions.length > 0) {
    readiness_status = 'already_has_stamped_variant_collision';
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    source_count: row.source_count,
    sources: row.sources ?? [],
    evidence_urls: row.evidence_urls ?? [],
    preserved_evidence_count: evidenceRows.length,
    preserved_evidence_sources: [...new Set(evidenceRows.map((evidence) => evidence.source_key))].sort(),
    preserved_evidence_urls: [...new Set(evidenceRows.map((evidence) => evidence.source_url).filter(Boolean))].sort(),
    preserved_evidence_labels: [...new Set(evidenceRows.map((evidence) => evidence.evidence_label).filter(Boolean))].sort(),
    preserved_evidence_notes: [...new Set(evidenceRows.map((evidence) => evidence.notes).filter(Boolean))].sort(),
    preserved_evidence_snapshot_refs: [...new Set(evidenceRows.map((evidence) => evidence.raw_snapshot_ref).filter(Boolean))].sort(),
    stamp_label: stamp.stamp_label,
    proposed_variant_key: stamp.variant_key,
    stamp_confidence: stamp.stamp_confidence,
    base_parent_count: baseParents.length,
    base_parent_ids: baseParents.map((parent) => parent.card_print_id),
    base_parent_child_finishes: [...new Set(baseParents.flatMap((parent) => parent.child_finishes ?? []))].sort(),
    stamped_variant_collision_count: stampedCollisions.length,
    stamped_variant_collision_ids: stampedCollisions.map((parent) => parent.card_print_id),
    dependency_ref_count_on_base_parent: dependencyRefs,
    readiness_status,
    blockers,
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_readiness_status).map(([key, count]) => [key, count]);
  const variantRows = Object.entries(report.summary.by_proposed_variant_key).slice(0, 30).map(([key, count]) => [key, count]);
  const setRows = Object.entries(report.summary.by_set).slice(0, 30).map(([key, count]) => [key, count]);
  const sampleRows = report.rows.slice(0, 40).map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label ?? 'unknown',
    row.proposed_variant_key ?? 'unknown',
    row.base_parent_count,
    row.readiness_status,
  ]);
  return `# English Master Index Stamped Identity Readiness V1

Audit-only readiness plan for current \`stamped\` Master Index blockers. This does not activate \`stamped\` as a child finish.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- stamped_blocker_rows: ${report.summary.stamped_blocker_rows}
- preserved_fixture_stamped_records: ${report.summary.preserved_fixture_stamped_records}
- ready_for_guarded_parent_identity_insert: ${report.summary.ready_for_guarded_parent_identity_insert}
- ready_with_dependency_awareness: ${report.summary.ready_with_dependency_awareness}
- pkg11a_single_base_finish_write_ready_rows: ${report.summary.pkg11a_single_base_finish_write_ready_rows}
- active_finish_routing_required_rows: ${report.summary.active_finish_routing_required_rows}
- blocked_or_review_rows: ${report.summary.blocked_or_review_rows}
- fingerprint: \`${report.fingerprint_sha256}\`

${markdownTable(['readiness_status', 'rows'], statusRows)}

## Proposed Variant Keys

${markdownTable(['variant_key', 'rows'], variantRows)}

## Top Sets

${markdownTable(['set', 'rows'], setRows)}

## Sample Rows

${markdownTable(['set', 'number', 'name', 'stamp_label', 'variant_key', 'base_parent_count', 'status'], sampleRows)}

## Next Safe Work

- Build a guarded write package only when rows have both stamped parent identity and an unambiguous active child finish.
- Do not insert child \`stamped\` printings.
- Do not mutate rows with ambiguous or missing stamp labels.
- Preserve base parent rows and create stamped canonical parent rows only after dry-run proof.
`;
}

async function updateCheckpointIndex() {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [Stamped Identity Readiness Checkpoint V1](20260610_stamped_identity_readiness_checkpoint_v1.md) | Current readiness plan for stamped Master Index blockers as canonical identity work, not child finish activation. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? await fs.readFile(indexPath, 'utf8') : '# Master Index Checkpoint Index\n\n';
  if (current.includes('20260610_stamped_identity_readiness_checkpoint_v1.md')) {
    const next = current.split(/\r?\n/).map((existingLine) => (
      existingLine.includes('20260610_stamped_identity_readiness_checkpoint_v1.md') ? line : existingLine
    )).join('\n');
    await fs.writeFile(indexPath, next.endsWith('\n') ? next : `${next}\n`);
    return;
  }
  await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
}

async function main() {
  const remaining = await readJson(REMAINING_JSON);
  const stampedRows = (remaining.rows ?? []).filter((row) => (
    row.lane === 'blocked_finish_taxonomy' &&
    normalizeText(row.finish_key) === 'stamped'
  ));
  const fixtureRecords = await loadStampedFixtureRecords();
  const evidenceByKey = new Map();
  for (const record of fixtureRecords) {
    const key = factKey(record);
    if (!evidenceByKey.has(key)) evidenceByKey.set(key, []);
    evidenceByKey.get(key).push(record);
  }
  const live = await loadLiveParents(stampedRows);
  const rows = stampedRows.map((row) => classifyRow(row, evidenceByKey.get(factKey(row)) ?? [], live.parents));

  const ready = rows.filter((row) => row.readiness_status === 'ready_for_guarded_parent_identity_insert');
  const readyWithDeps = rows.filter((row) => row.readiness_status === 'ready_for_guarded_parent_identity_insert_with_dependency_awareness');
  const pkg11aSingleBaseFinishReady = ready.filter((row) => (
    row.base_parent_child_finishes?.length === 1
    && ['normal', 'holo', 'cosmos'].includes(row.base_parent_child_finishes[0])
    && row.base_parent_ids?.length === 1
    && row.proposed_variant_key
    && row.stamp_label
  ));
  const activeFinishRoutingRequired = ready.filter((row) => !pkg11aSingleBaseFinishReady.includes(row));
  const payload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    readiness_status: row.readiness_status,
    base_parent_ids: row.base_parent_ids,
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_identity_readiness_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    fingerprint_sha256: sha256(stableJson(payload)),
    source_artifacts: {
      remaining_missing_reconciliation_lanes: path.relative(ROOT, REMAINING_JSON).replaceAll('\\', '/'),
      source_fixture_root: path.relative(ROOT, FIXTURE_ROOT).replaceAll('\\', '/'),
    },
    live_read: {
      available: live.available,
      reason: live.reason,
      parent_rows_loaded: live.parents.length,
    },
    summary: {
      stamped_blocker_rows: stampedRows.length,
      preserved_fixture_stamped_records: fixtureRecords.length,
      rows_with_preserved_fixture_evidence: rows.filter((row) => row.preserved_evidence_count > 0).length,
      ready_for_guarded_parent_identity_insert: ready.length,
      ready_with_dependency_awareness: readyWithDeps.length,
      pkg11a_single_base_finish_write_ready_rows: pkg11aSingleBaseFinishReady.length,
      active_finish_routing_required_rows: activeFinishRoutingRequired.length + readyWithDeps.length,
      blocked_or_review_rows: rows.length - ready.length - readyWithDeps.length,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_stamp_confidence: countBy(rows, (row) => row.stamp_confidence),
      by_proposed_variant_key: countBy(rows, (row) => row.proposed_variant_key ?? 'unknown'),
      by_set: countBy(rows, (row) => row.set_key),
    },
    recommended_next_package: {
      package_id: pkg11aSingleBaseFinishReady.length > 0
        ? 'PKG-11A-STAMPED-CANONICAL-PARENT-IDENTITY-PILOT'
        : 'PKG-11B-STAMPED-FINISH-ROUTING-READINESS',
      candidate_rows: Math.min(25, pkg11aSingleBaseFinishReady.length),
      allowed_write_shape: 'insert stamped canonical card_print parent rows only, with deterministic variant_key and normal/holo child rows only if explicitly routed by the source package',
      forbidden_write_shape: 'do not activate stamped finish; do not insert card_printings.finish_key=stamped; do not delete or merge base rows',
      status: pkg11aSingleBaseFinishReady.length > 0
        ? 'ready_for_scoped_guarded_dry_run_pilot'
        : 'blocked_exact_active_finish_required',
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# Stamped Identity Readiness Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${report.fingerprint_sha256}\`
- Stamped blocker rows: ${report.summary.stamped_blocker_rows}
- Ready rows: ${report.summary.ready_for_guarded_parent_identity_insert}
- Ready with dependency awareness: ${report.summary.ready_with_dependency_awareness}
- PKG-11A single-base-finish write-ready rows: ${report.summary.pkg11a_single_base_finish_write_ready_rows}
- Active finish routing required rows: ${report.summary.active_finish_routing_required_rows}
- Blocked/review rows: ${report.summary.blocked_or_review_rows}
- DB writes performed: \`false\`
- Migrations created: \`false\`
- Stamped finish activated: \`false\`
`);
  await updateCheckpointIndex();

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    checkpoint_md: path.relative(ROOT, CHECKPOINT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    recommended_next_package: report.recommended_next_package,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

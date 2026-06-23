import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const WCD_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_CARDS_JSONL = path.join(WCD_DIR, 'world_championship_decks_09c_proposed_card_prints_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh09d_world_championship_residual_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh09d_world_championship_residual_pointer_dry_run_summary_v1.md');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh09d_world_championship_residual_pointer_plan_v1.jsonl');
const PACKAGE_ID = 'IMG-HOST-WH-09D-WORLD-CHAMPIONSHIP-RESIDUAL-POINTER-DRY-RUN';
const FUTURE_APPLY_PACKAGE_ID = 'IMG-HOST-WH-09E-WORLD-CHAMPIONSHIP-RESIDUAL-POINTER-APPLY';
const SOURCE_TRANSLATION_FINGERPRINT = 'da7a18fb284b6ba18078a64868c6375a5e15145d37392b4c92da788de69e0594';

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/pokemon/g, 'pokemon')
    .replace(/[—–-]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\bex\b/g, ' ')
    .replace(/['`"._]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value, max = 40) {
  const normalized = normalizeText(value).replace(/\s+/g, '-').replace(/^-|-$/g, '');
  return (normalized || 'unknown').slice(0, max).replace(/-$/g, '');
}

function gvSlug(value, max = 32) {
  return slug(value, max).toUpperCase().replace(/-/g, '_');
}

function numberPlain(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits || null;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 50) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function isSelfHostedPath(value) {
  return clean(value)?.startsWith('warehouse-derived/self-hosted-images-v1/') ?? false;
}

function hasAnyImageField(row) {
  return Boolean(clean(row.image_path) || clean(row.image_url) || clean(row.image_alt_url) || clean(row.representative_image_url));
}

function isWeakImageStatus(value) {
  const normalized = clean(value)?.toLowerCase();
  return !normalized || normalized === 'missing' || normalized === 'unresolved' || normalized === 'blocked';
}

function parsedSourcePart(card) {
  const deckSlug = gvSlug(card.deck_name, 24);
  const prefix = `GV-PK-WCD-${card.deck_year}-${deckSlug}-`;
  if (!String(card.proposed_gv_id ?? '').startsWith(prefix)) return null;
  const rest = card.proposed_gv_id.slice(prefix.length);
  const match = rest.match(/^\d{2}-([^-]+)-/);
  return match?.[1]?.replace(/_/g, ' ') ?? null;
}

function sourceAliases(card) {
  const aliases = new Set();
  const sourceName = clean(card.source_set_name);
  const sourcePart = clean(parsedSourcePart(card));
  const cardNumber = clean(card.source_card_number);

  if (sourceName) aliases.add(sourceName);
  if (sourcePart && sourcePart.toLowerCase() !== 'energy') aliases.add(sourcePart);
  if (sourceName === 'EX' && /hidden legends/i.test(cardNumber ?? '')) aliases.add('Hidden Legends');
  if (sourcePart === 'EX' && /hidden legends/i.test(cardNumber ?? '')) aliases.add('Hidden Legends');
  if (sourceName && sourcePart && sourcePart.toLowerCase() !== 'energy') aliases.add(`${sourceName} ${sourcePart}`);

  return [...aliases]
    .map((alias) => normalizeText(alias))
    .filter(Boolean);
}

function setAliasScore(setName, alias) {
  const setNorm = normalizeText(setName);
  if (!alias || !setNorm) return 0;
  if (setNorm === alias) return 100;
  if (setNorm.endsWith(` ${alias}`)) return 88;
  if (setNorm.startsWith(`${alias} `)) return 82;
  if (setNorm.includes(` ${alias} `)) return 78;
  if (alias.includes(setNorm)) return 70;
  return 0;
}

function baseImageRank(row) {
  const status = clean(row.image_status)?.toLowerCase();
  const variant = clean(row.variant_key);
  const modifier = clean(row.printed_identity_modifier);
  return [
    status === 'exact' ? 1000 : 0,
    !variant && !modifier ? 100 : 0,
    status?.startsWith('representative_') ? 20 : 0,
    isSelfHostedPath(row.image_path) ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function chooseSourceRow(card, sourceRows) {
  const aliases = sourceAliases(card);
  const targetName = normalizeText(card.name);
  const targetNumber = numberPlain(card.source_card_number);
  if (!targetName || !targetNumber || aliases.length === 0) {
    return { sourceRow: null, matchKind: 'missing_source_key', matchCount: 0, aliases };
  }

  const candidates = [];
  for (const row of sourceRows) {
    if (normalizeText(row.name) !== targetName) continue;
    if (numberPlain(row.number_plain ?? row.number) !== targetNumber) continue;
    const bestAliasScore = Math.max(...aliases.map((alias) => setAliasScore(row.set_name, alias)));
    if (bestAliasScore <= 0) continue;
    candidates.push({
      row,
      score: bestAliasScore + baseImageRank(row),
      alias_score: bestAliasScore,
    });
  }

  const selfHostedCandidates = candidates.filter((entry) => isSelfHostedPath(entry.row.image_path));
  const usable = selfHostedCandidates.length ? selfHostedCandidates : candidates;
  usable.sort((left, right) =>
    right.score - left.score
    || baseImageRank(right.row) - baseImageRank(left.row)
    || String(left.row.gv_id ?? '').localeCompare(String(right.row.gv_id ?? '')));

  if (usable.length === 0) {
    return { sourceRow: null, matchKind: 'no_alias_source_match', matchCount: 0, aliases };
  }

  const best = usable[0];
  const tiedBest = usable.filter((entry) => entry.score === best.score);
  if (tiedBest.length > 1) {
    return {
      sourceRow: null,
      matchKind: 'ambiguous_best_source_match',
      matchCount: tiedBest.length,
      aliases,
      tied_gv_ids: tiedBest.map((entry) => entry.row.gv_id).slice(0, 20),
    };
  }

  return {
    sourceRow: best.row,
    matchKind: best.alias_score >= 100 ? 'exact_alias_source_match' : 'normalized_alias_source_match',
    matchCount: usable.length,
    aliases,
  };
}

function proposedNote(row) {
  return [
    `Residual representative image from ordinary source card ${row.source_gv_id} for World Championship Deck display continuity.`,
    `This is not an exact ${row.deck_year} ${row.deck_name} replica image and may omit World Championship back, border, and player signature treatment.`,
    `Prepared by ${PACKAGE_ID}; exact WCD image remains uncataloged.`,
  ].join(' ');
}

function buildPlanRow({ card, currentRow, sourceRow, match }) {
  const currentValues = {
    image_source: clean(currentRow.image_source),
    image_path: clean(currentRow.image_path),
    image_status: clean(currentRow.image_status),
    image_note: clean(currentRow.image_note),
  };
  const row = {
    package_id: FUTURE_APPLY_PACKAGE_ID,
    source_dry_run_package_id: PACKAGE_ID,
    source_translation_fingerprint: SOURCE_TRANSLATION_FINGERPRINT,
    plan_type: 'metadata_pointer_repoint',
    target_table: 'card_prints',
    target_row_id: currentRow.id,
    gv_id: currentRow.gv_id,
    name: currentRow.name,
    set_code: currentRow.set_code,
    set_name: currentRow.set_name,
    number: currentRow.number,
    number_plain: currentRow.number_plain,
    variant_key: currentRow.variant_key,
    deck_year: card.deck_year,
    deck_name: card.deck_name,
    player_name: card.player_name,
    source_set_name: card.source_set_name,
    source_card_number: card.source_card_number,
    source_aliases: match.aliases,
    source_match_kind: match.matchKind,
    representative_source_table: 'card_prints',
    representative_source_row_id: sourceRow.id,
    representative_source_gv_id: sourceRow.gv_id,
    representative_source_set_code: sourceRow.set_code,
    representative_source_set_name: sourceRow.set_name,
    source_image_status: sourceRow.image_status,
    source_image_path: sourceRow.image_path,
    current_values: currentValues,
    proposed_values: {
      image_source: 'identity',
      image_path: clean(sourceRow.image_path),
      image_status: 'representative_shared',
      image_note: null,
    },
    exact_image_claim_change: false,
    db_write_performed: false,
    storage_write_performed: false,
    runtime_public_url_field_write_planned: false,
    allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
  };
  row.source_gv_id = sourceRow.gv_id;
  row.proposed_values.image_note = proposedNote(row);
  row.changed_columns = Object.keys(row.proposed_values).filter((key) =>
    clean(row.current_values[key]) !== clean(row.proposed_values[key]));
  delete row.source_gv_id;
  return row;
}

async function loadDbSnapshot(client) {
  const [currentWcd, sourceRows] = await Promise.all([
    client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.variant_key,
        cp.image_source,
        cp.image_path,
        cp.image_url,
        cp.image_alt_url,
        cp.representative_image_url,
        cp.image_status,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.code = cp.set_code
      where cp.set_code like 'wcd%'
        and cp.variant_key = 'world_championship_deck_replica'
      order by cp.set_code, cp.number_plain nulls last, cp.gv_id
    `),
    client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source,
        cp.image_path,
        cp.image_url,
        cp.image_alt_url,
        cp.representative_image_url,
        cp.image_status,
        cp.image_note
      from public.card_prints cp
      left join public.sets s on s.code = cp.set_code
      where cp.set_code not like 'wcd%'
    `),
  ]);
  return {
    currentWcdRows: currentWcd.rows,
    sourceRows: sourceRows.rows,
  };
}

async function main() {
  const sourceCards = await readJsonl(SOURCE_CARDS_JSONL);
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let db;
  try {
    db = await loadDbSnapshot(client);
  } finally {
    await client.end();
  }

  const currentByGvId = new Map(db.currentWcdRows.map((row) => [row.gv_id, row]));
  const residualCards = [];
  const alreadyResolvedRows = [];
  const missingCurrentRows = [];
  for (const card of sourceCards) {
    const currentRow = currentByGvId.get(card.proposed_gv_id);
    if (!currentRow) {
      missingCurrentRows.push(card);
      continue;
    }
    if (hasAnyImageField(currentRow) || !isWeakImageStatus(currentRow.image_status)) {
      alreadyResolvedRows.push({ card, currentRow });
      continue;
    }
    residualCards.push({ card, currentRow });
  }

  const candidates = [];
  const unresolvedRows = [];
  const sourceWithoutSelfHostedRows = [];
  const sourceWithoutImageRows = [];
  for (const item of residualCards) {
    const match = chooseSourceRow(item.card, db.sourceRows);
    if (!match.sourceRow) {
      unresolvedRows.push({ ...item, match });
      continue;
    }
    if (!hasAnyImageField(match.sourceRow)) {
      sourceWithoutImageRows.push({ ...item, match, sourceRow: match.sourceRow });
      continue;
    }
    if (!isSelfHostedPath(match.sourceRow.image_path)) {
      sourceWithoutSelfHostedRows.push({ ...item, match, sourceRow: match.sourceRow });
      continue;
    }
    candidates.push(buildPlanRow({ ...item, sourceRow: match.sourceRow, match }));
  }

  const effectiveCandidates = candidates.filter((row) => row.changed_columns.length > 0);
  const noOpCandidates = candidates.filter((row) => row.changed_columns.length === 0);
  const stopFindings = [];
  if (missingCurrentRows.length) stopFindings.push(`missing_current_wcd_rows:${missingCurrentRows.length}`);
  if (sourceCards.length !== 1944) stopFindings.push(`unexpected_source_card_count:${sourceCards.length}`);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, candidates.map((row) => JSON.stringify(row)).join('\n') + (candidates.length ? '\n' : ''), 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    future_apply_package_id: FUTURE_APPLY_PACKAGE_ID,
    source_translation_fingerprint: SOURCE_TRANSLATION_FINGERPRINT,
    source_cards_jsonl: path.relative(ROOT, SOURCE_CARDS_JSONL),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    source_card_rows: sourceCards.length,
    current_wcd_rows: db.currentWcdRows.length,
    already_resolved_wcd_rows: alreadyResolvedRows.length,
    residual_missing_wcd_rows: residualCards.length,
    missing_current_wcd_rows: missingCurrentRows.length,
    residual_representative_candidate_rows: candidates.length,
    effective_metadata_pointer_updates: effectiveCandidates.length,
    no_op_candidate_rows: noOpCandidates.length,
    unresolved_residual_rows: unresolvedRows.length,
    source_rows_without_any_image_field: sourceWithoutImageRows.length,
    source_rows_without_self_hosted_path: sourceWithoutSelfHostedRows.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    child_writes_performed: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    planned_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url', 'representative_image_url'],
    candidate_set_codes: countBy(candidates, (row) => row.set_code),
    candidate_deck_years: countBy(candidates, (row) => String(row.deck_year)),
    source_match_kinds: countBy(candidates, (row) => row.source_match_kind),
    proposed_image_sources: countBy(candidates, (row) => row.proposed_values.image_source),
    proposed_image_statuses: countBy(candidates, (row) => row.proposed_values.image_status),
    changed_column_sets: countBy(candidates, (row) => row.changed_columns.join(',') || 'no_op'),
    unresolved_match_kinds: countBy(unresolvedRows, (row) => row.match.matchKind),
    unresolved_source_sets: countBy(unresolvedRows, (row) => row.card.source_set_name ?? 'unknown'),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0 && effectiveCandidates.length > 0,
    samples: {
      residual_candidates: candidates.slice(0, 20).map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        source_gv_id: row.representative_source_gv_id,
        source_set_name: row.representative_source_set_name,
        source_match_kind: row.source_match_kind,
      })),
      unresolved_rows: unresolvedRows.slice(0, 40).map((row) => ({
        gv_id: row.card.proposed_gv_id,
        name: row.card.name,
        source_set_name: row.card.source_set_name,
        source_card_number: row.card.source_card_number,
        source_reference_kind: row.card.source_card_reference_kind,
        match_kind: row.match.matchKind,
        aliases: row.match.aliases,
        tied_gv_ids: row.match.tied_gv_ids,
      })),
    },
  };

  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    future_apply_package_id: summary.future_apply_package_id,
    source_translation_fingerprint: summary.source_translation_fingerprint,
    residual_missing_wcd_rows: summary.residual_missing_wcd_rows,
    residual_representative_candidate_rows: summary.residual_representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    planned_columns: summary.planned_columns,
    proposed_image_sources: summary.proposed_image_sources,
    proposed_image_statuses: summary.proposed_image_statuses,
    plan_rows: candidates.map((row) => ({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      representative_source_row_id: row.representative_source_row_id,
      representative_source_gv_id: row.representative_source_gv_id,
      proposed_values: row.proposed_values,
      changed_columns: row.changed_columns,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Future apply package: \`${summary.future_apply_package_id}\`
- Source translation fingerprint: \`${summary.source_translation_fingerprint}\`
- Source card rows: ${summary.source_card_rows}
- Current WCD rows: ${summary.current_wcd_rows}
- Already resolved WCD rows: ${summary.already_resolved_wcd_rows}
- Residual missing WCD rows: ${summary.residual_missing_wcd_rows}
- Residual representative candidate rows: ${summary.residual_representative_candidate_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Unresolved residual rows: ${summary.unresolved_residual_rows}
- Source rows without any image field: ${summary.source_rows_without_any_image_field}
- Source rows without self-hosted path: ${summary.source_rows_without_self_hosted_path}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Child writes performed: ${summary.child_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}

## Finding

This residual pass recovers additional WCD representative images by resolving source-set aliases such as \`Expedition\` -> \`Expedition Base Set\`, \`Triumphant\` -> \`HS-Triumphant\`, and by preferring ordinary exact source rows over stamped variants when both exist. It still writes only representative display metadata and does not claim exact World Championship Deck imagery.

## Proposed Image Statuses

${markdownTable(topEntries(summary.proposed_image_statuses))}

## Source Match Kinds

${markdownTable(topEntries(summary.source_match_kinds))}

## Candidate Years

${markdownTable(topEntries(summary.candidate_deck_years, 30))}

## Largest Candidate Sets

${markdownTable(topEntries(summary.candidate_set_codes, 60))}

## Unresolved Match Kinds

${markdownTable(topEntries(summary.unresolved_match_kinds))}

## Unresolved Source Sets

${markdownTable(topEntries(summary.unresolved_source_sets, 40))}

## Apply Boundary

A future apply package, if approved, should update only \`card_prints.image_source\`, \`card_prints.image_path\`, \`card_prints.image_status\`, and \`card_prints.image_note\` for the candidate rows in \`${path.relative(ROOT, PLAN_JSONL)}\`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, deletes, merges, migrations, or exact-image claims.
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    residual_missing_wcd_rows: summary.residual_missing_wcd_rows,
    residual_representative_candidate_rows: summary.residual_representative_candidate_rows,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    unresolved_residual_rows: summary.unresolved_residual_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});

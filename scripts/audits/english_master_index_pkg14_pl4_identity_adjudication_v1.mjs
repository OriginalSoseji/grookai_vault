import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12_parent_identity_mismatch_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg14_pl4_identity_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg14_pl4_identity_adjudication_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260611_pkg14_pl4_identity_adjudication_checkpoint_v1.md');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const PACKAGE_ID = 'PKG-14-PL4-IDENTITY-ADJUDICATION';

const ADJUDICATIONS = [
  {
    match: { set_key: 'pl4', card_number: '12', card_name: 'Zapdos G' },
    source_name_aliases: ['Zapdos', 'Zapdos G'],
    adjudication_status: 'db_parent_name_and_mapping_transfer_ready',
    db_action: 'prepare_guarded_zapdos_g_parent_name_update_and_mapping_transfer',
    canonical_name: 'Zapdos G',
    target_parent_card_print_id: '8716f287-3497-49b2-a499-9c1e026a6a94',
    current_target_parent_name: 'Zapdos',
    preserve_parent_card_print_ids: ['6b44fbe5-21e8-4ee9-9065-195f24d74eb8'],
    mapping_transfer_candidates: [
      {
        source: 'tcgplayer',
        external_id: '90726',
        from_card_print_id: '6b44fbe5-21e8-4ee9-9065-195f24d74eb8',
        to_card_print_id: '8716f287-3497-49b2-a499-9c1e026a6a94',
        reason: 'TCGplayer product is Zapdos G #12, not Shinx SH12.',
      },
      {
        source: 'justtcg',
        external_id: 'pokemon-arceus-zapdos-g-holo-rare',
        from_card_print_id: '6b44fbe5-21e8-4ee9-9065-195f24d74eb8',
        to_card_print_id: '8716f287-3497-49b2-a499-9c1e026a6a94',
        reason: 'JustTCG slug is Zapdos G holo rare, not Shinx SH12.',
      },
    ],
    preserve_mappings: [
      {
        source: 'tcgdex',
        external_id: 'pl4-SH12',
        card_print_id: '6b44fbe5-21e8-4ee9-9065-195f24d74eb8',
        reason: 'Shinx SH12 is a distinct shiny subset identity and must remain on the Shinx parent.',
      },
    ],
    evidence: [
      {
        source_key: 'pokemontcg_api',
        source_kind: 'structured_api',
        source_url: 'https://api.pokemontcg.io/v2/cards/pl4-12',
        evidence_label: 'PokemonTCG.io PL4-12 supports Zapdos G.',
      },
      {
        source_key: 'tcgplayer_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/90726/pokemon-arceus-zapdos-g',
        evidence_label: 'TCGplayer product 90726 is Zapdos G from Arceus.',
      },
      {
        source_key: 'pricecharting',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-arceus/zapdos-g-12',
        evidence_label: 'PriceCharting lists Zapdos G #12 for Pokemon Arceus.',
      },
      {
        source_key: 'thepricedex_price_list',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.thepricedex.com/set/pl4/arceus/price-list',
        evidence_label: 'ThePriceDex Arceus price list participates in the existing Master Index evidence.',
      },
    ],
  },
  {
    match: { set_key: 'pl4', card_number: '26', card_name: 'Porygon-Z' },
    adjudication_status: 'master_index_label_correction_required_no_db_write',
    db_action: 'do_not_update_db_parent_name',
    canonical_name: 'Porygon-Z G',
    target_parent_card_print_id: '177d5026-d94e-4662-a008-cf20d6a35ef0',
    current_target_parent_name: 'Porygon-Z G',
    mapping_transfer_candidates: [],
    preserve_mappings: [],
    evidence: [
      {
        source_key: 'tcgplayer_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/88320/pokemon-arceus-porygon-z-g',
        evidence_label: 'TCGplayer product 88320 is Porygon-Z G from Arceus.',
      },
      {
        source_key: 'bulbapedia_card_page',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Porygon-Z_G_%28Arceus_26%29',
        evidence_label: 'Bulbapedia card page title supports Porygon-Z G (Arceus 26).',
      },
      {
        source_key: 'bulbapedia_sp_category',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Category%3APok%C3%A9mon_SP_cards',
        evidence_label: 'Bulbapedia Pokemon SP category includes Porygon-Z G (Arceus 26).',
      },
      {
        source_key: 'official_carddex_pdf',
        source_kind: 'official_gallery',
        source_url: 'https://www.pokemon.com/cms/pdf/tcg/carddex/Arceus.pdf',
        evidence_label: 'Official Arceus CardDex text references Porygon-Z [G].',
      },
    ],
  },
  {
    match: { set_key: 'pl4', card_number: '53', card_name: 'Beedrill' },
    adjudication_status: 'master_index_label_correction_required_no_db_write',
    db_action: 'do_not_update_db_parent_name',
    canonical_name: 'Beedrill G',
    target_parent_card_print_id: '6d6576aa-99bf-4381-96b1-af58ab28d5c2',
    current_target_parent_name: 'Beedrill G',
    mapping_transfer_candidates: [],
    preserve_mappings: [],
    evidence: [
      {
        source_key: 'bulbapedia_arceus_category',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Category%3AArceus_cards',
        evidence_label: 'Bulbapedia Arceus card category includes Beedrill G (Arceus 53).',
      },
      {
        source_key: 'pricecharting',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-Arceus/Beedrill--53',
        evidence_label: 'PriceCharting page is indexed for Beedrill G #53 from Arceus.',
      },
      {
        source_key: 'sportscardinvestor_reverse',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.sportscardinvestor.com/cards/beedrill-g-pokemon/2009-platinum-arceus-reverse-holo-53-99',
        evidence_label: 'Sports Card Investor tracks Beedrill G 53/99 reverse holo.',
      },
      {
        source_key: 'ebay_listing_evidence',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/389165301041',
        evidence_label: 'Marketplace listing labels Beedrill G 53/99 Arceus English card.',
      },
    ],
  },
];

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
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function findAdjudication(row) {
  return ADJUDICATIONS.find((entry) => (
    entry.match.set_key === row.set_key
    && entry.match.card_number === row.card_number
    && (
      entry.match.card_name === row.card_name
      || (entry.source_name_aliases ?? []).includes(row.card_name)
    )
  ));
}

function rowKey(row) {
  return `${row.set_key}|${row.card_number}|${row.card_name}|${row.finish_key}`;
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_adjudication_status).map(([status, count]) => [status, count]);
  const actionRows = Object.entries(report.summary.by_db_action).map(([action, count]) => [action, count]);
  const rowRows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.source_card_name,
    row.finish_key,
    row.canonical_name,
    row.adjudication_status,
    row.db_action,
  ]);
  const transferRows = report.mapping_transfer_candidates.map((row) => [
    row.source,
    row.external_id,
    row.from_card_print_id,
    row.to_card_print_id,
    row.reason,
  ]);

  return `# PKG-14 PL4 Identity Adjudication V1

Audit-only adjudication for the remaining PL4 parent identity blockers.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- adjudicated_rows: ${report.summary.adjudicated_rows}
- fingerprint: \`${report.fingerprint_sha256}\`

${markdownTable(['adjudication_status', 'rows'], summaryRows)}

${markdownTable(['db_action', 'rows'], actionRows)}

## Adjudicated Rows

${markdownTable(['set', 'number', 'source_name', 'finish', 'canonical_name', 'status', 'db_action'], rowRows)}

## Mapping Transfer Candidates

${mappingTable(transferRows)}

## Decision

- PL4 #12 should become \`Zapdos G\` in the DB, and only the Zapdos-labelled mappings currently attached to Shinx SH12 should move to the Zapdos G parent.
- PL4 #26 and #53 should not update the DB. The DB already uses the supported SP names \`Porygon-Z G\` and \`Beedrill G\`; the Master Index/source-label lane needs correction or governed suppression.
- Shinx SH12 remains a distinct shiny subset identity and keeps its \`tcgdex:pl4-SH12\` mapping.
`;
}

function mappingTable(rows) {
  if (rows.length === 0) return '_No mapping transfers._';
  return markdownTable(['source', 'external_id', 'from', 'to', 'reason'], rows);
}

function checkpointMarkdown(report) {
  return `# PKG-14 PL4 Identity Adjudication Checkpoint V1

- package_id: ${report.package_id}
- generated_at: ${report.generated_at}
- fingerprint: \`${report.fingerprint_sha256}\`
- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Outcome

- PL4 #12 Zapdos G: write-ready for a narrow parent-name update plus two external mapping transfers.
- PL4 #26 Porygon-Z: DB should remain \`Porygon-Z G\`; Master Index/source label needs correction or suppression.
- PL4 #53 Beedrill: DB should remain \`Beedrill G\`; Master Index/source label needs correction or suppression.

## Next Package

Prepare \`PKG-14A-PL4-ZAPDOS-G-PARENT-NAME-MAPPING-TRANSFER\` as a guarded dry-run first. Scope must be exactly:

- 1 parent name update: \`Zapdos\` -> \`Zapdos G\`
- 2 external mapping transfers to the Zapdos parent
- 0 child writes
- 0 deletes
- 0 migrations
- preserve Shinx SH12 and \`tcgdex:pl4-SH12\`
`;
}

function updateCheckpointIndex() {
  const line = '| 2026-06-11 | [PKG-14 PL4 Identity Adjudication Checkpoint V1](20260611_pkg14_pl4_identity_adjudication_checkpoint_v1.md) | Audit-only adjudication of the final PL4 identity blockers; scopes Zapdos G as a narrow DB correction and Porygon-Z G/Beedrill G as Master Index/source-label corrections. No writes or migrations. |';
  const current = fsSync.existsSync(CHECKPOINT_INDEX) ? fsSync.readFileSync(CHECKPOINT_INDEX, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260611_pkg14_pl4_identity_adjudication_checkpoint_v1.md')) {
    fsSync.writeFileSync(CHECKPOINT_INDEX, current.split('\n').map((existingLine) => (
      existingLine.includes('20260611_pkg14_pl4_identity_adjudication_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.set_key === 'pl4');
const rows = sourceRows.map((row) => {
  const adjudication = findAdjudication(row);
  if (!adjudication) {
    return {
      row_key: rowKey(row),
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      source_card_name: row.card_name,
      finish_key: row.finish_key,
      adjudication_status: 'unadjudicated',
      db_action: 'blocked',
      canonical_name: null,
      evidence: [],
      live_same_number_candidates: row.live_same_number_candidates ?? [],
    };
  }
  return {
    row_key: rowKey(row),
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    source_card_name: row.card_name,
    finish_key: row.finish_key,
    canonical_name: adjudication.canonical_name,
    target_parent_card_print_id: adjudication.target_parent_card_print_id,
    current_target_parent_name: adjudication.current_target_parent_name,
    adjudication_status: adjudication.adjudication_status,
    db_action: adjudication.db_action,
    evidence: adjudication.evidence,
    live_same_number_candidates: row.live_same_number_candidates ?? [],
    mapping_transfer_candidates: adjudication.mapping_transfer_candidates,
    preserve_mappings: adjudication.preserve_mappings,
  };
});

const mappingTransferCandidates = ADJUDICATIONS.flatMap((row) => row.mapping_transfer_candidates.map((candidate) => ({
  ...candidate,
  set_key: row.match.set_key,
  card_number: row.match.card_number,
  canonical_name: row.canonical_name,
})));

const fingerprintPayload = {
  source_fingerprint: source.fingerprint,
  rows: rows.map((row) => ({
    row_key: row.row_key,
    canonical_name: row.canonical_name,
    adjudication_status: row.adjudication_status,
    db_action: row.db_action,
    mapping_transfer_candidates: row.mapping_transfer_candidates,
    preserve_mappings: row.preserve_mappings,
  })),
};

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg14_pl4_identity_adjudication_v1',
  package_id: PACKAGE_ID,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: path.relative(ROOT, SOURCE_JSON),
  fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
  summary: {
    source_rows: sourceRows.length,
    adjudicated_rows: rows.filter((row) => row.adjudication_status !== 'unadjudicated').length,
    by_adjudication_status: countBy(rows, (row) => row.adjudication_status),
    by_db_action: countBy(rows, (row) => row.db_action),
    mapping_transfer_candidates: mappingTransferCandidates.length,
    parent_name_update_candidates: rows.filter((row) => row.db_action === 'prepare_guarded_zapdos_g_parent_name_update_and_mapping_transfer').length,
    no_db_write_rows: rows.filter((row) => row.db_action === 'do_not_update_db_parent_name').length,
  },
  rows,
  mapping_transfer_candidates: mappingTransferCandidates,
  stop_findings: rows.some((row) => row.adjudication_status === 'unadjudicated') ? ['unadjudicated_pl4_rows_present'] : [],
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, checkpointMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint: path.relative(ROOT, CHECKPOINT_MD),
  fingerprint_sha256: report.fingerprint_sha256,
  summary: report.summary,
  stop_findings: report.stop_findings,
}, null, 2));

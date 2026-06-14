import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15_stamped_explicit_finish_readiness_v1.json');
const STAMPED_READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15b_stamped_generic_variant_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15b_stamped_generic_variant_adjudication_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260611_pkg15b_stamped_generic_variant_adjudication_checkpoint_v1.md');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const PACKAGE_ID = 'PKG-15B-STAMPED-GENERIC-VARIANT-ADJUDICATION';

const ADJUDICATIONS = {
  'dp1|35|pachirisu': {
    target_variant_key: 'diamond_pearl_stamp',
    target_stamp_label: 'Diamond & Pearl Stamp',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2008',
    evidence: [
      {
        source_key: 'bulbapedia_2008_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2008_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2008 checklist lists Pachirisu 35/130; page states Diamond & Pearl stamp mirror reverse holofoil variants.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'pricecharting_stamped_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-diamond-%26-pearl/pachirisu-stamped-35',
        evidence_label: 'PriceCharting exact product: Pachirisu [Stamped] #35 in Pokemon Diamond & Pearl.',
        supports: ['card_identity', 'stamp_family'],
      },
    ],
  },
  'dp1|49|grotle': {
    target_variant_key: 'diamond_pearl_stamp',
    target_stamp_label: 'Diamond & Pearl Stamp',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2008',
    evidence: [
      {
        source_key: 'bulbapedia_diamond_pearl_tcg',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Diamond_%26_Pearl_(TCG)',
        evidence_label: 'Diamond & Pearl additional-cards table lists Grotle 49/130 as Reverse Holo with Diamond & Pearl stamp for Burger King Collection 2008.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'tcgplayer_burger_king_promos',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/155608/pokemon-burger-king-promos-grotle-49-130-diamond-and-pearl',
        evidence_label: 'TCGplayer exact Burger King Promos product for Grotle 49/130 [Diamond & Pearl] exposes Reverse Holofoil pricing.',
        supports: ['card_identity', 'reverse_finish'],
      },
    ],
  },
  'dp1|56|monferno': {
    target_variant_key: 'diamond_pearl_stamp',
    target_stamp_label: 'Diamond & Pearl Stamp',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2008',
    evidence: [
      {
        source_key: 'bulbapedia_diamond_pearl_tcg',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Diamond_%26_Pearl_(TCG)',
        evidence_label: 'Diamond & Pearl additional-cards table lists Monferno 56/130 as Reverse Holo with Diamond & Pearl stamp for Burger King Collection 2008.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'tcgplayer_burger_king_promos',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/174129/pokemon-burger-king-promos-monferno-56-130-diamond-and-pearl',
        evidence_label: 'TCGplayer exact Burger King Promos product for Monferno 56/130 [Diamond & Pearl] exposes Reverse Holofoil pricing.',
        supports: ['card_identity', 'reverse_finish'],
      },
    ],
  },
  'dp5|56|chimchar': {
    target_variant_key: 'platinum_stamped_burger_king_2009',
    target_stamp_label: 'Platinum Stamped Burger King 2009',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2009',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Chimchar 56/100; page states the promotion paired toys with reverse holofoil Platinum TCG cards with a Platinum stamp.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'pricecharting_stamped_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/chimchar-stamped-56',
        evidence_label: 'PriceCharting exact product: Chimchar [Stamped] #56 in Pokemon Majestic Dawn.',
        supports: ['card_identity', 'stamp_family'],
      },
    ],
  },
  'dp5|62|eevee': {
    target_variant_key: 'platinum_stamped_burger_king_2009',
    target_stamp_label: 'Platinum Stamped Burger King 2009',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2009',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Eevee 62/100; page states the promotion paired toys with reverse holofoil Platinum TCG cards with a Platinum stamp.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'tcgplayer_burger_king_promos',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/155605/pokemon-burger-king-promos-eevee-62-100-platinum',
        evidence_label: 'TCGplayer exact Burger King Promos product for Eevee 62/100 [Platinum] exposes Reverse Holofoil pricing.',
        supports: ['card_identity', 'reverse_finish'],
      },
    ],
  },
  'dp5|70|pikachu': {
    target_variant_key: 'platinum_stamped_burger_king_2009',
    target_stamp_label: 'Platinum Stamped Burger King 2009',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2009',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Pikachu 70/100; page states the promotion paired toys with reverse holofoil Platinum TCG cards with a Platinum stamp.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'pricecharting_reverse_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/pikachu-reverse-holo-70',
        evidence_label: 'PriceCharting reverse-holo product for Pikachu #70 includes observed Platinum-stamped reverse-holo sale labels.',
        supports: ['card_identity', 'reverse_finish'],
      },
    ],
  },
  'dp5|71|piplup': {
    target_variant_key: 'platinum_stamped_burger_king_2009',
    target_stamp_label: 'Platinum Stamped Burger King 2009',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2009',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Piplup 71/100; page states the promotion paired toys with reverse holofoil Platinum TCG cards with a Platinum stamp.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'pricecharting_reverse_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/piplup-reverse-holo-71',
        evidence_label: 'PriceCharting reverse-holo product for Piplup #71 includes observed stamped reverse-holo sale labels.',
        supports: ['card_identity', 'reverse_finish'],
      },
    ],
  },
  'dp5|77|turtwig': {
    target_variant_key: 'platinum_stamped_burger_king_2009',
    target_stamp_label: 'Platinum Stamped Burger King 2009',
    target_finish_key: 'reverse',
    stamp_family: 'Burger King Collection 2009',
    evidence: [
      {
        source_key: 'bulbapedia_2009_burger_king_toys',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
        evidence_label: 'Burger King 2009 checklist lists Turtwig 77/100; page states the promotion paired toys with reverse holofoil Platinum TCG cards with a Platinum stamp.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
      {
        source_key: 'pricecharting_stamped_product',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-majestic-dawn/turtwig-stamped-77-77',
        evidence_label: 'PriceCharting exact product: Turtwig [Stamped] #77 in Pokemon Majestic Dawn includes reverse-holo stamped sale labels.',
        supports: ['card_identity', 'stamp_family', 'reverse_finish'],
      },
    ],
  },
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
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

function rowKey(row) {
  return [row.set_key, row.card_number, normalizeText(row.card_name)].join('|');
}

function classify(row) {
  const adjudication = ADJUDICATIONS[rowKey(row)];
  if (!adjudication) {
    return {
      ...row,
      adjudication_status: 'needs_manual_review',
      target_variant_key: null,
      target_stamp_label: null,
      target_finish_key: null,
      blocker: 'no_adjudication_rule',
      evidence: [],
    };
  }

  const hasBaseReverse = (row.base_parent_child_finishes ?? []).includes('reverse');
  const parsedFalseHoloClaims = (row.finish_claims ?? []).filter((claim) => claim.finish_key === 'holo');
  const evidenceSourceKinds = new Set(adjudication.evidence.map((source) => source.source_kind));
  const hasHumanChecklist = evidenceSourceKinds.has('human_readable_checklist');
  const blockers = [];
  if (!hasBaseReverse) blockers.push('base_parent_missing_reverse_finish');
  if (!hasHumanChecklist) blockers.push('missing_human_readable_checklist');
  if (adjudication.evidence.length < 2) blockers.push('source_count_below_two');

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    original_variant_key: row.proposed_variant_key,
    original_stamp_label: row.stamp_label,
    original_finish_claims: row.finish_claims ?? [],
    parsed_false_holo_claims: parsedFalseHoloClaims,
    source_parser_correction: parsedFalseHoloClaims.length > 0
      ? 'Double Holo source-name text was parsed as finish=holo; adjudicated sources prove reverse holo stamped.'
      : null,
    target_variant_key: adjudication.target_variant_key,
    target_stamp_label: adjudication.target_stamp_label,
    target_finish_key: adjudication.target_finish_key,
    stamp_family: adjudication.stamp_family,
    base_parent_ids: row.base_parent_ids ?? [],
    base_parent_child_finishes: row.base_parent_child_finishes ?? [],
    evidence: adjudication.evidence,
    adjudication_status: blockers.length === 0 ? 'ready_for_guarded_reverse_stamped_identity_route' : 'blocked_after_adjudication',
    blockers,
    write_shape_after_approval: blockers.length === 0
      ? 'insert stamped canonical parent with deterministic variant_key plus reverse child printing'
      : 'none',
  };
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_adjudication_status).map(([status, count]) => [status, count]);
  const readyRows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.original_variant_key,
    row.target_variant_key ?? '',
    row.target_finish_key ?? '',
    row.adjudication_status,
  ]);
  const sourceRows = report.rows.flatMap((row) => row.evidence.map((source) => [
    row.set_key,
    row.card_number,
    row.card_name,
    source.source_key,
    source.source_kind,
    source.source_url,
  ]));

  return `# PKG-15B Stamped Generic Variant Adjudication V1

Audit-only adjudication for the eight stamped rows that were blocked because the prior readiness pass had only \`variant_key=stamped\`.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- reviewed_rows: ${report.summary.reviewed_rows}
- ready_rows_after_adjudication: ${report.summary.ready_rows_after_adjudication}
- blocked_rows_after_adjudication: ${report.summary.blocked_rows_after_adjudication}
- false_holo_parser_claims_corrected: ${report.summary.false_holo_parser_claims_corrected}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['adjudication_status', 'rows'], summaryRows)}

## Adjudicated Rows

${markdownTable(['set', 'number', 'name', 'original_variant', 'target_variant', 'target_finish', 'status'], readyRows)}

## Source URLs

${markdownTable(['set', 'number', 'name', 'source', 'kind', 'url'], sourceRows)}

## Governance Finding

These rows should not be routed as generic \`stamped\` and should not use child finish \`holo\`. The source-name phrase "Double Holo" caused a parser false-positive. The admissible route is deterministic stamped parent identity plus child finish \`reverse\`.
`;
}

function checkpointMarkdown(report) {
  return `# PKG-15B Stamped Generic Variant Adjudication Checkpoint V1

- package_id: ${report.package_id}
- generated_at: ${report.generated_at}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`
- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}

## Outcome

- reviewed_rows: ${report.summary.reviewed_rows}
- ready_rows_after_adjudication: ${report.summary.ready_rows_after_adjudication}
- blocked_rows_after_adjudication: ${report.summary.blocked_rows_after_adjudication}
- false_holo_parser_claims_corrected: ${report.summary.false_holo_parser_claims_corrected}

## Rule Added

Burger King Collection 2008 Diamond & Pearl evidence maps to \`diamond_pearl_stamp\`.
Burger King Collection 2009 Platinum evidence maps to \`platinum_stamped_burger_king_2009\`.

No DB writes, migrations, cleanup, quarantine, or apply paths were executed.
`;
}

function updateCheckpointIndex() {
  const line = '| 2026-06-11 | [PKG-15B Stamped Generic Variant Adjudication Checkpoint V1](20260611_pkg15b_stamped_generic_variant_adjudication_checkpoint_v1.md) | Audit-only correction of 8 generic stamped rows to deterministic Burger King stamp identities and reverse child finish; no writes or migrations. |';
  const current = fsSync.existsSync(CHECKPOINT_INDEX) ? fsSync.readFileSync(CHECKPOINT_INDEX, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260611_pkg15b_stamped_generic_variant_adjudication_checkpoint_v1.md')) {
    fsSync.writeFileSync(CHECKPOINT_INDEX, current.split('\n').map((existingLine) => (
      existingLine.includes('20260611_pkg15b_stamped_generic_variant_adjudication_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const stampedReadiness = await readOptionalJson(STAMPED_READINESS_JSON);
  const genericRows = [
    ...input.rows.filter((row) => row.readiness_status === 'blocked_generic_stamp_variant_key'),
    ...((stampedReadiness?.rows ?? []).filter((row) => (
      row.readiness_status === 'blocked_manual_review'
      && (row.blockers ?? []).includes('stamp_identity_generic_stamped_only')
    ))),
  ];
  const uniqueGenericRows = [...new Map(genericRows.map((row) => [rowKey(row), row])).values()];
  const rows = uniqueGenericRows
    .filter((row) => ADJUDICATIONS[rowKey(row)])
    .map(classify);
  const payloadForFingerprint = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    original_variant_key: row.original_variant_key,
    target_variant_key: row.target_variant_key,
    target_finish_key: row.target_finish_key,
    evidence_urls: row.evidence.map((source) => source.source_url).sort(),
    adjudication_status: row.adjudication_status,
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15b_stamped_generic_variant_adjudication_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      pkg15_readiness: path.relative(ROOT, INPUT_JSON).replaceAll(path.sep, '/'),
      stamped_identity_readiness: path.relative(ROOT, STAMPED_READINESS_JSON).replaceAll(path.sep, '/'),
    },
    summary: {
      candidate_generic_rows_seen: uniqueGenericRows.length,
      candidate_generic_rows_with_adjudication_rule: rows.length,
      reviewed_rows: rows.length,
      ready_rows_after_adjudication: rows.filter((row) => row.adjudication_status === 'ready_for_guarded_reverse_stamped_identity_route').length,
      blocked_rows_after_adjudication: rows.filter((row) => row.adjudication_status !== 'ready_for_guarded_reverse_stamped_identity_route').length,
      false_holo_parser_claims_corrected: rows.reduce((sum, row) => sum + (row.parsed_false_holo_claims?.length ?? 0), 0),
      by_adjudication_status: countBy(rows, (row) => row.adjudication_status),
      by_target_variant_key: countBy(rows, (row) => row.target_variant_key ?? 'none'),
      by_target_finish_key: countBy(rows, (row) => row.target_finish_key ?? 'none'),
    },
    governance_rules: [
      'Do not promote generic variant_key=stamped.',
      'Do not parse source/site names such as Double Holo as finish=holo.',
      'Burger King Collection 2008 Diamond & Pearl stamped rows route to variant_key=diamond_pearl_stamp and child finish=reverse when exact card evidence exists.',
      'Burger King Collection 2009 Platinum stamped rows route to variant_key=platinum_stamped_burger_king_2009 and child finish=reverse when exact card evidence exists.',
    ],
    rows,
  };
  report.fingerprint_sha256 = sha256(stableJson(payloadForFingerprint));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, checkpointMarkdown(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    reviewed_rows: report.summary.reviewed_rows,
    ready_rows_after_adjudication: report.summary.ready_rows_after_adjudication,
    blocked_rows_after_adjudication: report.summary.blocked_rows_after_adjudication,
    false_holo_parser_claims_corrected: report.summary.false_holo_parser_claims_corrected,
    fingerprint_sha256: report.fingerprint_sha256,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

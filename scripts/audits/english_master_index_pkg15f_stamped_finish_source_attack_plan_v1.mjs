import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15f_stamped_finish_source_attack_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15f_stamped_finish_source_attack_plan_v1.md');

const PACKAGE_ID = 'PKG-15F-STAMPED-FINISH-SOURCE-ATTACK-PLAN';

const SOURCE_STRATEGIES = {
  staff_stamp: {
    priority: 1,
    source_family: 'staff prerelease/product checklist',
    allowed_sources: [
      'TCGplayer product pages only when title/printing says Staff and active finish',
      'PriceCharting/Poke Card Values/Sports Card Investor only when exact title says Staff plus Non-Holo/Holo/Reverse',
      'Bulbapedia card release notes only when exact release row names Staff and active finish',
    ],
    acceptance_rule: 'Exact set + number + card name + Staff stamp + active finish phrase. Do not infer Staff from prerelease or base reverse availability.',
  },
  battle_academy_deck_mark: {
    priority: 2,
    source_family: 'Battle Academy decklist finish text',
    allowed_sources: [
      'Bulbapedia Battle Academy product pages only when the deck-list row includes Holofoil/Non Holofoil for the exact TCG ID',
      'Pokemon.com product/checklist pages if exact finish text exists',
      'TCGplayer/PriceCharting product pages only when exact title includes Battle Academy stamp/deck mark and finish',
    ],
    acceptance_rule: 'Deck membership and colored silhouette prove variant identity only. Active finish requires exact Holofoil/Non Holofoil/Reverse/Cosmos text for that card.',
  },
  prerelease_stamp: {
    priority: 3,
    source_family: 'prerelease promo finish checklist',
    allowed_sources: [
      'Bulbapedia card release notes or promo list rows with exact finish',
      'TCGplayer product pages with exact Prerelease and finish title',
      'PriceCharting/Poke Card Values exact product pages only when finish is explicit',
    ],
    acceptance_rule: 'Prerelease stamp is parent identity. Active finish must be explicit and card-level.',
  },
  play_pokemon_stamp: {
    priority: 4,
    source_family: 'Play! Pokemon / league promo finish checklist',
    allowed_sources: [
      'League promo checklist pages with exact finish',
      'TCGplayer/PriceCharting exact product pages with Play! Pokemon stamp and finish',
      'Bulbapedia release notes if exact active finish is stated',
    ],
    acceptance_rule: 'League/Play! stamp alone is not finish evidence.',
  },
  default: {
    priority: 5,
    source_family: 'specific stamped product evidence',
    allowed_sources: [
      'Exact product page or checklist entry with set/card/number/stamp/finish',
      'Manual review with preserved URL and short evidence label',
    ],
    acceptance_rule: 'No broad stamp-family inference. Capture source URL and exact finish phrase or keep blocked.',
  },
};

const ACTIVE_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);

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

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function strategyFor(row) {
  return SOURCE_STRATEGIES[row.proposed_variant_key] ?? SOURCE_STRATEGIES.default;
}

function hasAmbiguousBaseFinishes(row) {
  const finishes = (row.base_parent_child_finishes ?? []).filter((finish) => ACTIVE_FINISHES.has(finish));
  return finishes.length > 1;
}

function sourceFamilyKey(row) {
  const strategy = strategyFor(row);
  return `${String(strategy.priority).padStart(2, '0')}|${strategy.source_family}`;
}

function buildRows(inputRows) {
  return inputRows
    .filter((row) => row.routing_status === 'blocked_missing_exact_finish_phrase')
    .map((row) => {
      const strategy = strategyFor(row);
      return {
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        proposed_variant_key: row.proposed_variant_key,
        stamp_label: row.stamp_label,
        base_parent_child_finishes: row.base_parent_child_finishes ?? [],
        source_family: strategy.source_family,
        source_priority: strategy.priority,
        acquisition_status: hasAmbiguousBaseFinishes(row)
          ? 'needs_exact_active_finish_source'
          : 'needs_exact_source_before_single_finish_route',
        recommended_sources: strategy.allowed_sources,
        acceptance_rule: strategy.acceptance_rule,
        preserved_evidence_sources: row.preserved_evidence_sources ?? [],
        preserved_evidence_urls: row.preserved_evidence_urls ?? [],
        preserved_evidence_labels: row.preserved_evidence_labels ?? [],
        blocked_reason: 'stamp identity is source-supported, but no exact active finish phrase is attached to the same set/card/number/stamp fact',
      };
    })
    .sort((a, b) => a.source_priority - b.source_priority
      || String(a.proposed_variant_key).localeCompare(String(b.proposed_variant_key))
      || String(a.set_key).localeCompare(String(b.set_key))
      || String(a.card_number).localeCompare(String(b.card_number), undefined, { numeric: true })
      || String(a.card_name).localeCompare(String(b.card_name)));
}

function buildSourceFamilies(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = sourceFamilyKey(row);
    if (!groups.has(key)) {
      groups.set(key, {
        source_family: row.source_family,
        priority: row.source_priority,
        rows: [],
        variant_keys: new Set(),
        set_keys: new Set(),
        recommended_sources: row.recommended_sources,
        acceptance_rule: row.acceptance_rule,
      });
    }
    const group = groups.get(key);
    group.rows.push(row);
    group.variant_keys.add(row.proposed_variant_key);
    group.set_keys.add(row.set_key);
  }

  return [...groups.values()].map((group) => ({
    source_family: group.source_family,
    priority: group.priority,
    row_count: group.rows.length,
    variant_keys: [...group.variant_keys].sort(),
    set_count: group.set_keys.size,
    sample_rows: group.rows.slice(0, 12).map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      proposed_variant_key: row.proposed_variant_key,
      base_parent_child_finishes: row.base_parent_child_finishes,
      preserved_evidence_urls: row.preserved_evidence_urls,
    })),
    recommended_sources: group.recommended_sources,
    acceptance_rule: group.acceptance_rule,
  })).sort((a, b) => a.priority - b.priority || b.row_count - a.row_count);
}

function renderMarkdown(report) {
  const familyRows = report.source_families.map((family) => [
    family.priority,
    family.source_family,
    family.row_count,
    family.variant_keys.join(', '),
    family.set_count,
  ]);

  const variantRows = Object.entries(report.summary.by_variant_key).map(([variant, count]) => [variant, count]);
  const sourceRows = Object.entries(report.summary.by_preserved_source).slice(0, 30).map(([source, count]) => [source, count]);
  const sampleRows = report.rows.slice(0, 80).map((row) => [
    row.source_priority,
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.base_parent_child_finishes.join(', '),
    row.acquisition_status,
  ]);

  return `# English Master Index PKG-15F Stamped Finish Source Attack Plan V1

Audit-only plan for reducing the remaining stamped finish blockers. This report does not write to the database and does not promote any printing.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Core Rule

Stamped evidence is parent identity evidence only. A row is not write-ready until an independent source proves the active child finish for the exact set, card number, card name, and stamp/variant.

## Summary

- input_candidate_rows: ${report.summary.input_candidate_rows}
- attack_plan_rows: ${report.summary.attack_plan_rows}
- write_ready_now: ${report.write_ready_now}
- fingerprint_sha256: ${report.fingerprint_sha256}

## Source Families

${markdownTable(['priority', 'source family', 'rows', 'variant keys', 'sets'], familyRows)}

## Variant Buckets

${markdownTable(['variant key', 'rows'], variantRows)}

## Preserved Source Buckets

${markdownTable(['preserved source', 'rows'], sourceRows)}

## Acquisition Samples

${markdownTable(['priority', 'set', 'number', 'card', 'variant', 'base finishes', 'status'], sampleRows)}

## Acceptance

- Do not infer active finish from stamp family.
- Do not infer active finish from base parent availability.
- Do not treat marketplace title-only evidence as sufficient unless it contains exact set/card/number/stamp/finish.
- Rows with exact source text can move into a guarded parent identity insert package.
- Rows without exact source text remain blocked.
`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const input = await readJson(INPUT_JSON);
  const rows = buildRows(input.rows ?? []);
  const sourceFamilies = buildSourceFamilies(rows);
  const reportForHash = {
    package_id: PACKAGE_ID,
    rows,
    source_families: sourceFamilies,
  };
  const fingerprint = sha256(stableJson(reportForHash));
  const report = {
    generated_at: generatedAt,
    version: 'english_master_index_pkg15f_stamped_finish_source_attack_plan_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      stamped_finish_routing_readiness: INPUT_JSON,
    },
    fingerprint_sha256: fingerprint,
    summary: {
      input_candidate_rows: (input.rows ?? []).length,
      attack_plan_rows: rows.length,
      by_variant_key: countBy(rows, (row) => row.proposed_variant_key ?? 'unknown'),
      by_set: countBy(rows, (row) => row.set_key),
      by_source_family: countBy(rows, (row) => row.source_family),
      by_preserved_source: countBy(
        rows.flatMap((row) => row.preserved_evidence_sources),
        (source) => source,
      ),
    },
    source_families: sourceFamilies,
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    attack_plan_rows: report.summary.attack_plan_rows,
    source_families: sourceFamilies.map((family) => ({
      priority: family.priority,
      source_family: family.source_family,
      row_count: family.row_count,
    })),
    fingerprint_sha256: fingerprint,
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

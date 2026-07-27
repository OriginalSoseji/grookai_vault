import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import {
  contentFingerprint,
  stableJson,
} from './deterministic_artifact_v1.mjs';

const GENERATOR_VERSION = 'JPN-MASTER-INDEX-V4-COMPLETE-ADJUDICATION-V1';
const GENERATED_AT = '2026-07-27T00:00:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/complete_no_write';

const paths = {
  cards:
    'docs/audits/japanese_master_index_v4/final/'
    + 'jpn_master_resolved_card_identities_v1.json',
  assertions:
    'docs/audits/japanese_master_index_v4/final/'
    + 'jpn_master_assertion_dispositions_v1.json',
  printings:
    'docs/audits/japanese_master_index_v4/final/'
    + 'jpn_master_resolved_printing_facts_v1.json',
  gaps:
    'docs/audits/japanese_master_index_v4/final/'
    + 'jpn_master_source_gap_queue_v1.json',
  promotion:
    'docs/audits/japanese_master_index_v4/promotion_package/'
    + 'jpn_promotion_package_v1.json',
  reconciliation:
    'docs/audits/japanese_master_index_v4/reconciliation/'
    + 'jpn_live_reconciliation_v1.json',
  baselineRows:
    'docs/audits/japanese_master_index_v4/baseline/'
    + 'live_jpn_row_baseline_manifest_v1.json',
  finalPackage:
    'docs/audits/japanese_master_index_v4/index/'
    + 'jpn_master_index_final_package_v1.json',
};

function parseArgs(argv) {
  const result = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    quiet: false,
  };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
    } else if (value === '--quiet') {
      result.quiet = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readArtifact(filePath) {
  const input = fs.readFileSync(filePath);
  const raw = filePath.endsWith('.gz')
    ? zlib.gunzipSync(input)
    : input;
  const artifact = JSON.parse(raw.toString('utf8'));
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
}

function loadRows(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const artifact = readArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count) {
    throw new Error(
      `Row count mismatch for ${descriptor.dataset_key}: `
      + `${rows.length} != ${descriptor.row_count}`,
    );
  }
  if (contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error(`Dataset fingerprint mismatch: ${descriptor.dataset_key}`);
  }
  return rows;
}

function by(values, keyFn) {
  const map = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const bucket = map.get(key) ?? [];
    bucket.push(value);
    map.set(key, bucket);
  }
  return map;
}

function countBy(values, keyFn) {
  return Object.fromEntries(
    [...by(values, keyFn)]
      .map(([key, rows]) => [String(key), rows.length])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function compact(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizedNumber(value) {
  const text = String(value ?? '').trim();
  if (/^\d+$/.test(text)) return String(Number(text));
  return text.toLocaleLowerCase('en-US');
}

function normalizeHtmlName(value) {
  return String(value ?? '')
    .replaceAll('&apos;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('’', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function semanticName(value) {
  return normalizeHtmlName(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '');
}

function identityCoordinate(row) {
  return JSON.stringify([
    row.jpn_set_key,
    normalizedNumber(row.printed_number),
    row.printed_name_ja,
    row.identity_modifiers ?? [],
  ]);
}

function candidateScore(row) {
  return [
    row.final_disposition === 'master_admissible' ? 1 : 0,
    row.independent_source_count ?? 0,
    row.official_source_present ? 1 : 0,
    row.human_readable_source_present ? 1 : 0,
  ];
}

function compareCandidateSurvivors(a, b) {
  const aa = candidateScore(a);
  const bb = candidateScore(b);
  for (let index = 0; index < aa.length; index += 1) {
    if (aa[index] !== bb[index]) return bb[index] - aa[index];
  }
  return a.jpn_card_identity_key.localeCompare(b.jpn_card_identity_key);
}

function buildDuplicateMap(cards) {
  const rows = [];
  const groups = by(
    cards.filter((row) => row.candidate_kind === 'existing_parent'),
    identityCoordinate,
  );
  for (const candidates of groups.values()) {
    if (candidates.length < 2) continue;
    const sorted = [...candidates].sort(compareCandidateSurvivors);
    const survivor = sorted[0];
    for (const loser of sorted.slice(1)) {
      rows.push({
        alias_key: null,
        canonical_identity_key: survivor.jpn_card_identity_key,
        canonical_card_print_id: survivor.existing_card_print_id,
        canonical_gv_id: survivor.existing_gv_id,
        disposition: 'duplicate_of_existing_production_identity',
        duplicate_identity_key: loser.jpn_card_identity_key,
        duplicate_card_print_id: loser.existing_card_print_id,
        duplicate_gv_id: loser.existing_gv_id,
        equivalence_evidence: {
          identity_coordinate: {
            identity_modifiers: loser.identity_modifiers ?? [],
            jpn_set_key: loser.jpn_set_key,
            printed_name_ja: loser.printed_name_ja,
            printed_number: normalizedNumber(loser.printed_number),
          },
          canonical_source_count: survivor.independent_source_count,
          canonical_source_ids: survivor.source_ids,
          duplicate_source_count: loser.independent_source_count,
          duplicate_source_ids: loser.source_ids,
        },
        match_basis: 'set_number_japanese_name_modifiers',
        survivor_rule:
          'admissible_then_source_count_then_official_then_lexicographic',
      });
    }
  }
  return rows.sort((a, b) =>
    a.duplicate_identity_key.localeCompare(b.duplicate_identity_key));
}

function buildEnglishConsensus(cards) {
  const evidence = by(
    cards.filter((row) =>
      row.candidate_kind === 'existing_parent'
      && row.printed_name_ja
      && row.collector_facing_name_en),
    (row) => `${row.card_domain}\u0000${row.printed_name_ja}`,
  );
  const accepted = new Map();
  const reviewed = new Map();
  for (const [key, rows] of evidence) {
    const exact = by(rows, (row) =>
      normalizeHtmlName(row.collector_facing_name_en));
    const ranked = [...exact]
      .map(([name, support]) => ({ name, support }))
      .sort((a, b) =>
        b.support.length - a.support.length || a.name.localeCompare(b.name));
    const total = rows.length;
    reviewed.set(key, {
      mapping_candidates: ranked.map((candidate) => ({
        support_count: candidate.support.length,
        support_identity_keys: candidate.support
          .map((row) => row.jpn_card_identity_key)
          .sort(),
        value: candidate.name,
      })),
      total_mapping_count: total,
    });
    if (ranked.length === 1 && ranked[0].support.length >= 2) {
      accepted.set(key, {
        value: ranked[0].name,
        method: 'unique_existing_bilingual_mapping',
        name_kind: 'approved_collector_display_mapping_not_claimed_official',
        confidence: 0.9,
        support_count: ranked[0].support.length,
        total_mapping_count: total,
        support_identity_keys: ranked[0].support
          .map((row) => row.jpn_card_identity_key)
          .sort(),
      });
      continue;
    }
    if (ranked[0].support.length >= 2
        && ranked[0].support.length / total >= 0.8) {
      accepted.set(key, {
        value: ranked[0].name,
        method: 'dominant_existing_bilingual_mapping',
        name_kind: 'approved_collector_display_mapping_not_claimed_official',
        confidence: 0.92,
        support_count: ranked[0].support.length,
        total_mapping_count: total,
        support_identity_keys: ranked[0].support
          .map((row) => row.jpn_card_identity_key)
          .sort(),
      });
      continue;
    }

    const semantic = by(rows, (row) =>
      semanticName(row.collector_facing_name_en));
    const semanticRanked = [...semantic]
      .map(([name, support]) => ({ name, support }))
      .sort((a, b) =>
        b.support.length - a.support.length || a.name.localeCompare(b.name));
    const first = semanticRanked[0];
    const second = semanticRanked[1];
    if (first?.name
        && first.support.length >= 3
        && (!second || first.support.length >= second.support.length * 3)) {
      const spellings = by(first.support, (row) =>
        normalizeHtmlName(row.collector_facing_name_en));
      const selected = [...spellings]
        .map(([name, support]) => ({ name, count: support.length }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
      accepted.set(key, {
        value: selected.name,
        method: 'semantic_dominant_existing_bilingual_mapping',
        name_kind: 'approved_collector_display_mapping_not_claimed_official',
        confidence: 0.88,
        support_count: first.support.length,
        total_mapping_count: total,
        support_identity_keys: first.support
          .map((row) => row.jpn_card_identity_key)
          .sort(),
      });
    }
  }
  return { accepted, reviewed };
}

function setMatchScore(reconciliation, match) {
  const canonicalNames = compact([
    reconciliation.collector_facing_name_en,
    reconciliation.canonical_name_ja,
  ]).map((value) => value.toLocaleLowerCase('en-US'));
  const matchName = String(match.name ?? '').toLocaleLowerCase('en-US');
  const source = match.source ?? {};
  const sourceText = JSON.stringify(source);
  let score = 0;
  if (canonicalNames.includes(matchName)) score += 500;
  if (!/^japanese\b/i.test(String(match.name ?? ''))) score += 100;
  if (/second_batch|canonical_set_key|set_name_ja/i.test(sourceText)) {
    score += 40;
  }
  if (match.printed_total) score += 5;
  return score;
}

function recommendedSetMatch(row) {
  if (!row?.live_matches?.length) return null;
  return [...row.live_matches]
    .sort((a, b) =>
      setMatchScore(row, b) - setMatchScore(row, a)
      || String(a.id).localeCompare(String(b.id)))[0];
}

function setResolutionEvidence(reconciliation, selected) {
  return {
    conflict_classification: 'duplicate_live_set_shells',
    method: 'canonical_name_then_source_richness',
    recommended_action:
      'reuse_named_canonical_set_preserve_other_shell_no_mutation',
    selected_match: {
      code: selected.code,
      id: selected.id,
      name: selected.name,
      printed_total: selected.printed_total,
      source_contract_keys: Object.keys(selected.source ?? {}).sort(),
    },
    rejected_matches: reconciliation.live_matches
      .filter((match) => match.id !== selected.id)
      .map((match) => ({
        code: match.code,
        id: match.id,
        name: match.name,
        printed_total: match.printed_total,
        reason:
          'duplicate_live_set_shell_not_selected_as_named_canonical_survivor',
        source_contract_keys: Object.keys(match.source ?? {}).sort(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    comparison_evidence: {
      canonical_name_ja: reconciliation.canonical_name_ja,
      collector_facing_name_en:
        reconciliation.collector_facing_name_en,
      release_kind: reconciliation.release_kind,
      source_ids: reconciliation.source_ids,
    },
  };
}

function promotionContract(row, lane, sequence) {
  return {
    ...row,
    promotion_contract: {
      dependency: lane === 'set_first'
        ? `set:${row.target_set?.jpn_set_key ?? row.jpn_set_key}`
        : null,
      lane,
      sequence,
      preconditions: [
        'frozen_source_fingerprints_match',
        'candidate_identity_absent_or_idempotently_equivalent',
        'canonical_set_mapping_matches_package',
        'english_and_japanese_names_present',
      ],
      conflict_checks: [
        'no_active_parent_same_set_number_name_modifiers',
        'no_public_gv_id_allocated_by_this_package',
        'no_english_family_mutation',
      ],
      post_invariants: [
        'one_active_parent_identity',
        'all_source_assertions_preserved',
        'family_relationship_preserved',
      ],
      downstream_readiness: [
        'public_visibility_requires_separate_approval',
        'image_hosting_requires_separate_approval',
        'search_sitemap_scanner_refresh_after_public_visibility',
      ],
    },
  };
}

function confidenceForDisposition(disposition) {
  if (disposition === 'explicitly_excluded') return 1;
  if (disposition === 'duplicate_of_existing_production_identity') {
    return 0.99;
  }
  if (disposition.includes('insert_ready')
      || disposition === 'additional_resolved_promotion_ready') {
    return 0.95;
  }
  if (disposition === 'existing_production_identity_preserved') {
    return 0.98;
  }
  if (disposition === 'existing_production_identity_with_core_drift') {
    return 0.85;
  }
  if (disposition === 'historical_record_deferred_for_later_review') {
    return 0.45;
  }
  if (disposition === 'blocked_but_otherwise_admissible') return 0.9;
  if (disposition === 'insufficient_evidence') return 0.25;
  return 0.2;
}

function enrichIdentityDisposition(classification, card, reconciliation, set) {
  const {
    source_count: _sourceCount,
    source_ids: _sourceIds,
    ...baseClassification
  } = classification;
  const promotionEligible = [
    'additional_resolved_promotion_ready',
    'direct_card_insert_ready',
    'existing_production_identity_preserved',
    'existing_production_identity_with_core_drift',
    'set_first_then_card_insert_ready',
  ].includes(classification.disposition);
  const identityAdmissible = promotionEligible
    || classification.disposition === 'blocked_but_otherwise_admissible';
  const familyReady = String(card.family_status).startsWith('resolved_');
  return {
    ...baseClassification,
    confidence: confidenceForDisposition(classification.disposition),
    promotion_status: classification.promotion_lane
      ? 'packaged_no_write'
      : classification.disposition.startsWith('existing_production')
        ? 'already_live_no_mutation'
        : 'not_promotion_ready',
    printed_identity: {
      card_domain: card.card_domain,
      collector_facing_name_en:
        classification.resolved_display_name_en
        ?? card.collector_facing_name_en,
      jpn_set_key: card.jpn_set_key,
      printed_name_ja: card.printed_name_ja,
      printed_number: card.printed_number,
    },
    evidence: {
      human_readable_source_present: card.human_readable_source_present,
      image_candidate_count: card.image_urls.length,
      independent_source_count: card.independent_source_count,
      official_source_present: card.official_source_present,
      source_ids: card.source_ids,
    },
    production_alignment: {
      core_drift_fields: reconciliation?.core_drift_fields ?? [],
      existing_card_print_id: card.existing_card_print_id,
      existing_gv_id: card.existing_gv_id,
      reconciliation_status: reconciliation?.reconciliation_status ?? null,
    },
    readiness: {
      canonical_parent_identity: identityAdmissible,
      child_printing: reconciliation?.live_state?.child_printing_count > 0
        ? 'already_live'
        : 'separate_gate',
      english_display_name: Boolean(
        classification.resolved_display_name_en
        ?? card.collector_facing_name_en,
      ),
      family_relationship: familyReady,
      image: card.image_urls.length > 0,
      japanese_display_name: Boolean(card.printed_name_ja),
      numbering: Boolean(
        card.printed_number || card.governed_unnumbered_key,
      ),
      provenance: card.independent_source_count > 0
        || card.baseline_evidence_ids.length > 0,
      public_gv_id_input: promotionEligible && Boolean(card.printed_number),
      public_safe_copy: promotionEligible && Boolean(
        classification.resolved_display_name_en
        ?? card.collector_facing_name_en,
      ),
      public_surfaces:
        'separate_gate',
      self_hosting:
        reconciliation?.live_state?.has_image
          ? 'existing_live_pointer_preserved'
          : 'separate_gate',
      set_mapping: set?.promotion_readiness
        ?? (card.jpn_set_key ? 'working_set_key_only' : 'unresolved'),
    },
  };
}

function sourceAssertionIndex() {
  const root = 'docs/audits/japanese_master_index_v4/cards';
  const files = fs.readdirSync(root)
    .filter((name) => name.endsWith('_assertions_v1.json.gz'))
    .sort();
  const index = new Map();
  for (const filename of files) {
    const artifact = readArtifact(path.join(root, filename));
    for (const assertion of artifact.content.assertions ?? []) {
      index.set(assertion.assertion_key, assertion);
    }
  }
  return index;
}

function enrichPromotionEvidence(row, assertionIndex) {
  const assertions = (row.source_evidence?.source_assertion_keys ?? [])
    .map((key) => assertionIndex.get(key))
    .filter(Boolean);
  const printed = row.printed_identity ?? {};
  return {
    ...row,
    source_derived_metadata: {
      artist_evidence: compact(assertions.map((item) => item.illustrator)),
      image_sources: compact(assertions.flatMap((item) =>
        (item.image_urls ?? []).map((url) => `${item.source_id}:${url}`))),
      rarity_evidence: compact(assertions.map((item) => item.rarity)),
      regulation_mark_evidence: compact(
        assertions.map((item) => item.regulation_mark),
      ),
      release_date_evidence: compact(
        assertions.map((item) => item.release_date),
      ),
      source_urls: compact(assertions.flatMap((item) => [
        item.source_url,
        ...(item.related_urls ?? []),
      ])),
    },
    proposed_parent_identity: {
      canonical_candidate_key: row.candidate_key,
      natural_key_inputs: {
        identity_modifiers: printed.identity_modifiers ?? [],
        jpn_set_key: row.target_set?.jpn_set_key ?? row.jpn_set_key,
        printed_name_ja: printed.printed_name_ja,
        printed_number: printed.printed_number,
      },
    },
    proposed_public_facing_identity: {
      collector_facing_name_en: printed.collector_facing_name_en,
      printed_name_ja: printed.printed_name_ja,
      printed_number: printed.printed_number,
      public_gv_id_generated: false,
      public_gv_id_inputs_ready: Boolean(
        printed.collector_facing_name_en
        && printed.printed_name_ja
        && printed.printed_number,
      ),
      public_visibility_requires_separate_approval: true,
    },
  };
}

function classifyIdentity(row, {
  duplicateByLoser,
  directKeys,
  dependentKeys,
  additionalByKey,
  blockedByKey,
  reconciliationByKey,
}) {
  const duplicate = duplicateByLoser.get(row.jpn_card_identity_key);
  if (duplicate) {
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'duplicate_of_existing_production_identity',
      canonical_identity_key: duplicate.canonical_identity_key,
      canonical_card_print_id: duplicate.canonical_card_print_id,
      promotion_lane: null,
      reason_codes: ['exact_identity_coordinate_duplicate'],
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  if (additionalByKey.has(row.jpn_card_identity_key)) {
    const additional = additionalByKey.get(row.jpn_card_identity_key);
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'additional_resolved_promotion_ready',
      canonical_identity_key: row.jpn_card_identity_key,
      canonical_card_print_id: null,
      promotion_lane: additional.promotion_contract.lane,
      resolved_display_name_en:
        additional.printed_identity.collector_facing_name_en,
      reason_codes: additional.resolution.reasons,
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  if (directKeys.has(row.jpn_card_identity_key)) {
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'direct_card_insert_ready',
      canonical_identity_key: row.jpn_card_identity_key,
      canonical_card_print_id: null,
      promotion_lane: 'direct',
      reason_codes: [],
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  if (dependentKeys.has(row.jpn_card_identity_key)) {
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'set_first_then_card_insert_ready',
      canonical_identity_key: row.jpn_card_identity_key,
      canonical_card_print_id: null,
      promotion_lane: 'set_first',
      reason_codes: [],
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  if (row.final_disposition === 'adjudicated_excluded') {
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'explicitly_excluded',
      canonical_identity_key: null,
      canonical_card_print_id: null,
      promotion_lane: null,
      reason_codes: row.disposition_reasons,
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  if (row.final_disposition === 'master_admissible') {
    const reconciliation =
      reconciliationByKey.get(row.jpn_card_identity_key);
    if (reconciliation?.reconciliation_status
        === 'novel_candidate_missing_from_live') {
      const blocked = blockedByKey.get(row.jpn_card_identity_key);
      return {
        candidate_key: row.jpn_card_identity_key,
        candidate_kind: row.candidate_kind,
        disposition: 'blocked_but_otherwise_admissible',
        canonical_identity_key: row.jpn_card_identity_key,
        canonical_card_print_id: null,
        promotion_lane: null,
        reason_codes: compact([
          ...(blocked?.promotion_blockers ?? []),
          'insufficient_authoritative_bilingual_mapping_support',
        ]),
        source_count: row.independent_source_count,
        source_ids: row.source_ids,
      };
    }
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: reconciliation?.reconciliation_status
        === 'existing_parent_core_drift'
        ? 'existing_production_identity_with_core_drift'
        : 'existing_production_identity_preserved',
      canonical_identity_key: row.jpn_card_identity_key,
      canonical_card_print_id: row.existing_card_print_id,
      promotion_lane: null,
      reason_codes: reconciliation?.core_drift_fields ?? [],
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  const reasons = row.disposition_reasons ?? [];
  const contradiction = row.conflict_status !== 'none';
  if (contradiction) {
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'unresolved_contradiction',
      canonical_identity_key: null,
      canonical_card_print_id: row.existing_card_print_id,
      promotion_lane: null,
      reason_codes: reasons,
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  if (row.candidate_kind === 'existing_parent') {
    return {
      candidate_key: row.jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'historical_record_deferred_for_later_review',
      canonical_identity_key: row.jpn_card_identity_key,
      canonical_card_print_id: row.existing_card_print_id,
      promotion_lane: null,
      reason_codes: reasons,
      source_count: row.independent_source_count,
      source_ids: row.source_ids,
    };
  }
  return {
    candidate_key: row.jpn_card_identity_key,
    candidate_kind: row.candidate_kind,
    disposition: 'insufficient_evidence',
    canonical_identity_key: null,
    canonical_card_print_id: null,
    promotion_lane: null,
    reason_codes: reasons,
    source_count: row.independent_source_count,
    source_ids: row.source_ids,
  };
}

const ASSERTION_DISPOSITION_BY_IDENTITY = {
  additional_resolved_promotion_ready: 'additional_ready',
  blocked_but_otherwise_admissible: 'admissible_blocked',
  direct_card_insert_ready: 'direct_ready',
  duplicate_of_existing_production_identity:
    'duplicate_identity_excluded',
  explicitly_excluded: 'excluded_identity',
  existing_production_identity_preserved: 'existing_aligned',
  existing_production_identity_with_core_drift:
    'existing_core_drift',
  historical_record_deferred_for_later_review:
    'historical_deferred',
  insufficient_evidence: 'insufficient_evidence',
  set_first_then_card_insert_ready: 'set_first_ready',
  unresolved_contradiction: 'unresolved_contradiction',
};

const ASSERTION_DISPOSITION_MEANINGS = {
  additional_ready:
    'assertion supports an additional resolved promotion-ready identity',
  admissible_blocked:
    'assertion supports an admissible identity still blocked from promotion',
  direct_ready:
    'assertion supports a direct card insert-ready identity',
  duplicate_identity_excluded:
    'assertion belongs to a duplicate identity excluded from promotion',
  excluded_identity:
    'assertion belongs to an explicitly excluded identity',
  existing_aligned:
    'assertion supports an aligned existing production identity',
  existing_core_drift:
    'assertion supports an existing production identity with core drift',
  historical_deferred:
    'assertion supports a historical identity deferred for review',
  insufficient_evidence:
    'assertion supports an identity lacking sufficient evidence',
  set_first_ready:
    'assertion supports a set-first card insert-ready identity',
  unresolved_contradiction:
    'assertion supports an identity with an unresolved contradiction',
  source_group_conflict:
    'assertion is unlinked because its source identity group conflicts',
  excluded_source_assertion:
    'assertion was explicitly excluded before candidate linkage',
  unlinked_source_assertion_requires_adjudication:
    'assertion has no final candidate link and requires adjudication',
};

function assertionDisposition(identity, assertion) {
  if (identity) {
    const disposition =
      ASSERTION_DISPOSITION_BY_IDENTITY[identity.disposition];
    if (!disposition) {
      throw new Error(
        `Missing assertion disposition for ${identity.disposition}`,
      );
    }
    return disposition;
  }
  if (assertion.final_disposition === 'conflict_blocked') {
    return 'source_group_conflict';
  }
  if (assertion.final_disposition === 'adjudicated_excluded') {
    return 'excluded_source_assertion';
  }
  return 'unlinked_source_assertion_requires_adjudication';
}

function classifyGap(row, identityByKey, printingByKey) {
  const identity = identityByKey.get(row.subject_key);
  const printing = printingByKey.get(row.subject_key);
  if (row.gap_kind === 'printing_evidence_gap') {
    if (printing?.disposition === 'unsupported_exact_printing_claim_rejected') {
      return 'evidence_no_longer_needed_fact_rejected';
    }
    if (printing?.disposition === 'existing_production_printing_preserved') {
      return 'source_coverage_limitation';
    }
    return 'genuine_acquisition_target';
  }
  if (row.gap_kind === 'source_lane_status') {
    return 'source_coverage_limitation';
  }
  if (identity?.disposition === 'explicitly_excluded'
      || identity?.disposition
        === 'duplicate_of_existing_production_identity') {
    return 'evidence_no_longer_needed';
  }
  if (identity?.disposition === 'unresolved_contradiction') {
    return 'source_conflict';
  }
  if (identity?.disposition?.includes('ready')
      || identity?.disposition?.startsWith('existing_production')) {
    return row.gap_kind === 'card_admission_gap'
      ? 'expected_source_absence'
      : 'source_coverage_limitation';
  }
  return row.gap_kind === 'single_source_identity'
    ? 'missing_corroboration'
    : 'genuine_acquisition_target';
}

function classifyPrinting(row) {
  if (row.candidate_kind === 'existing_printing') {
    return {
      printing_fact_key: row.printing_fact_key,
      parent_candidate_key: row.parent_jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'existing_production_printing_preserved',
      canonical_finish_key: row.canonical_finish_key,
      existing_card_printing_id: row.existing_card_printing_id,
      evidence_status: {
        exact_source_assertion_keys: row.exact_source_assertion_keys,
        human_readable_source_present: row.human_readable_source_present,
        independent_source_count: row.independent_source_count,
        independent_source_families: row.independent_source_families,
      },
      evidence_needed:
        'independent_human_readable_finish_corroboration_for_future_rebuild',
      reason_codes: row.disposition_reasons,
    };
  }
  if (row.candidate_kind === 'novel_printing_explicit_finish') {
    return {
      printing_fact_key: row.printing_fact_key,
      parent_candidate_key: row.parent_jpn_card_identity_key,
      candidate_kind: row.candidate_kind,
      disposition: 'explicit_finish_claim_requires_corroboration',
      canonical_finish_key: row.canonical_finish_key,
      existing_card_printing_id: null,
      evidence_status: {
        exact_source_assertion_keys: row.exact_source_assertion_keys,
        human_readable_source_present: row.human_readable_source_present,
        independent_source_count: row.independent_source_count,
        independent_source_families: row.independent_source_families,
      },
      evidence_needed:
        'second_independent_source_and_one_human_readable_source',
      reason_codes: row.disposition_reasons,
    };
  }
  return {
    printing_fact_key: row.printing_fact_key,
    parent_candidate_key: row.parent_jpn_card_identity_key,
    candidate_kind: row.candidate_kind,
    disposition: 'unsupported_exact_printing_claim_rejected',
    canonical_finish_key: null,
    existing_card_printing_id: null,
    evidence_status: {
      exact_source_assertion_keys: row.exact_source_assertion_keys,
      human_readable_source_present: row.human_readable_source_present,
      independent_source_count: row.independent_source_count,
      independent_source_families: row.independent_source_families,
    },
    evidence_needed: null,
    reason_codes: [
      'no_explicit_finish_claim',
      'base_identity_does_not_imply_exact_printing',
    ],
  };
}

async function writeJsonl(outputPath, rows) {
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const row of rows) {
    const line = `${JSON.stringify(row)}\n`;
    bytes += Buffer.byteLength(line);
    hash.update(line);
    if (!stream.write(line)) {
      await new Promise((resolve) => stream.once('drain', resolve));
    }
  }
  await new Promise((resolve, reject) => {
    stream.end(resolve);
    stream.on('error', reject);
  });
  return {
    bytes,
    row_count: rows.length,
    sha256: hash.digest('hex'),
  };
}

async function writeJson(outputPath, value) {
  const serialized = stableJson(value);
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await fsp.writeFile(outputPath, serialized);
  return {
    bytes: Buffer.byteLength(serialized),
    sha256: crypto.createHash('sha256').update(serialized).digest('hex'),
  };
}

async function fingerprintFile(filePath) {
  const value = await fsp.readFile(filePath);
  const lines = filePath.endsWith('.jsonl')
    ? value.toString('utf8').split('\n').filter(Boolean).length
    : null;
  return {
    bytes: value.byteLength,
    row_count: lines,
    sha256: crypto.createHash('sha256').update(value).digest('hex'),
  };
}

function promoteAdditional(row, card, resolution, setReconciliation) {
  const setMatch = recommendedSetMatch(setReconciliation);
  const setFirst = setReconciliation?.promotion_readiness
    === 'set_insert_candidate';
  const lane = setFirst ? 'set_first' : 'direct';
  const collectorName = resolution.english?.value
    ?? card.collector_facing_name_en;
  return promotionContract({
    candidate_key: row.candidate_key,
    printed_identity: {
      language: 'ja',
      market: 'JP',
      printed_name_ja: card.printed_name_ja,
      collector_facing_name_en: collectorName,
      collector_facing_name_source: resolution.english?.name_kind
        ?? 'master_index_explicit',
      printed_number: card.printed_number,
      card_domain: card.card_domain,
      card_type: card.card_type,
      identity_modifiers: card.identity_modifiers,
    },
    target_set: {
      jpn_set_key: card.jpn_set_key,
      live_set_id: setFirst ? null : setMatch?.id ?? null,
      live_set_code: setFirst ? null : setMatch?.code ?? null,
      prerequisite: setFirst
        ? 'promote_set_candidate_first'
        : 'none',
      mapping_method: resolution.set
        ? 'deterministic_existing_set_survivor'
        : setReconciliation?.reconciliation_status ?? null,
    },
    source_evidence: {
      source_ids: card.source_ids,
      source_assertion_keys: card.source_assertion_keys,
      independent_source_families: card.independent_source_families,
      independent_source_count: card.independent_source_count,
      official_source_present: card.official_source_present,
      human_readable_source_present:
        card.human_readable_source_present,
    },
    image_evidence: {
      candidate_count: card.image_urls.length,
      urls: card.image_urls,
    },
    family_relationship: {
      family_key: card.family_key,
      family_status: card.family_status,
    },
    resolution,
    generated_database_identifiers: false,
    generated_public_gv_id: false,
    promotion_blockers: [],
  }, lane, lane === 'set_first' ? 4 : 3);
}

function datasetByKey(manifest, datasetKey) {
  const descriptor = manifest.content.datasets.find(
    (item) => item.dataset_key === datasetKey,
  );
  if (!descriptor) throw new Error(`Dataset not found: ${datasetKey}`);
  return descriptor;
}

function packageCardCoordinate(row) {
  return JSON.stringify([
    row.target_set.live_set_id ?? row.target_set.jpn_set_key,
    normalizedNumber(row.printed_identity.printed_number),
    row.printed_identity.printed_name_ja,
    row.printed_identity.identity_modifiers ?? [],
  ]);
}

function analyzeCardPackageConflicts(rows, liveParents) {
  const coordinateGroups = by(rows, packageCardCoordinate);
  const duplicateCoordinates = new Set(
    [...coordinateGroups]
      .filter(([, candidates]) => candidates.length > 1)
      .map(([coordinate]) => coordinate),
  );
  const liveBySetAndNumber = by(
    liveParents,
    (row) => JSON.stringify([
      row.set_id,
      normalizedNumber(row.printed_number),
    ]),
  );
  const annotatedRows = rows.map((row) => {
    const liveKey = JSON.stringify([
      row.target_set.live_set_id,
      normalizedNumber(row.printed_identity.printed_number),
    ]);
    const liveOccupants = row.target_set.live_set_id
      ? (liveBySetAndNumber.get(liveKey) ?? [])
      : [];
    const coordinate = packageCardCoordinate(row);
    return {
      ...row,
      promotion_contract: {
        ...row.promotion_contract,
        conflict_check_results: {
          package_coordinate_duplicate:
            duplicateCoordinates.has(coordinate),
          live_set_number_occupant_ids: liveOccupants
            .map((item) => item.card_print_id)
            .sort(),
          public_gv_id_generated: row.generated_public_gv_id === true,
          child_printing_generated: false,
        },
      },
    };
  });
  const liveConflictRows = annotatedRows.filter((row) =>
    row.promotion_contract.conflict_check_results
      .live_set_number_occupant_ids.length > 0);
  return {
    rows: annotatedRows,
    proof: {
      package_card_rows: rows.length,
      unique_package_coordinates: coordinateGroups.size,
      duplicate_package_coordinate_groups: duplicateCoordinates.size,
      duplicate_package_candidate_rows: rows.filter((row) =>
        duplicateCoordinates.has(packageCardCoordinate(row))).length,
      existing_live_set_target_rows: rows.filter(
        (row) => Boolean(row.target_set.live_set_id),
      ).length,
      live_set_number_conflict_rows: liveConflictRows.length,
      generated_database_identifiers: rows.filter(
        (row) => row.generated_database_identifiers === true,
      ).length,
      generated_public_gv_ids: rows.filter(
        (row) => row.generated_public_gv_id === true,
      ).length,
      generated_child_printings: 0,
      all_conflict_checks_pass:
        duplicateCoordinates.size === 0 && liveConflictRows.length === 0,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const expectedRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot === path.parse(outputRoot).root) {
    throw new Error('Refusing to use a filesystem root as output');
  }
  if (outputRoot === expectedRoot
      || outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    await fsp.rm(outputRoot, { force: true, recursive: true });
  } else {
    throw new Error(
      'Output must be the canonical root or a .tmp replay root',
    );
  }
  await fsp.mkdir(outputRoot, { recursive: true });

  const cardManifest = readJson(paths.cards);
  const assertionManifest = readJson(paths.assertions);
  const printingManifest = readJson(paths.printings);
  const gapManifest = readJson(paths.gaps);
  const promotionManifest = readJson(paths.promotion);
  const reconciliationManifest = readJson(paths.reconciliation);
  const baselineManifest = readJson(paths.baselineRows);
  const finalPackage = readJson(paths.finalPackage);

  const cards = loadRows(cardManifest.content.dataset);
  const assertions = loadRows(assertionManifest.content.dataset);
  const printings = loadRows(printingManifest.content.dataset);
  const gaps = loadRows(gapManifest.content.dataset);
  const promotion = promotionManifest.content.datasets;
  const directCards = loadRows(promotion.direct_card_candidates);
  const dependentCards = loadRows(
    promotion.set_dependent_card_candidates,
  );
  const setCandidates = loadRows(promotion.set_insert_candidates);
  const blockedCards = loadRows(promotion.novel_blocked_review);
  const setReviews = loadRows(promotion.set_mapping_review);
  const cardReconciliations = loadRows(
    reconciliationManifest.content.card_dataset,
  );
  const setReconciliations = loadRows(
    reconciliationManifest.content.set_dataset,
  );
  const liveParentRows = loadRows(datasetByKey(
    baselineManifest,
    'live_jpn_parent_rows_v1',
  ));

  const cardsByKey = new Map(
    cards.map((row) => [row.jpn_card_identity_key, row]),
  );
  const setByKey = new Map(
    setReconciliations.map((row) => [row.jpn_set_key, row]),
  );
  const cardReconciliationByKey = new Map(
    cardReconciliations.map((row) => [row.jpn_card_identity_key, row]),
  );
  const duplicateRows = buildDuplicateMap(cards);
  const duplicateByLoser = new Map(
    duplicateRows.map((row) => [row.duplicate_identity_key, row]),
  );
  const englishEvidence = buildEnglishConsensus(cards);
  const englishConsensus = englishEvidence.accepted;
  const blockedByKey = new Map(
    blockedCards.map((row) => [row.candidate_key, row]),
  );

  const additionalRows = [];
  for (const blocked of blockedCards) {
    const card = cardsByKey.get(blocked.candidate_key);
    if (!card) throw new Error(`Blocked candidate missing: ${blocked.candidate_key}`);
    const needsEnglish = blocked.promotion_blockers.includes(
      'collector_facing_english_name_missing',
    );
    const needsSet = blocked.promotion_blockers.includes(
      'set_mapping_not_promotion_safe',
    );
    const english = needsEnglish
      ? englishConsensus.get(`${card.card_domain}\u0000${card.printed_name_ja}`)
      : null;
    const setReconciliation = setByKey.get(card.jpn_set_key);
    const setMatch = needsSet
      ? recommendedSetMatch(setReconciliation)
      : null;
    if ((needsEnglish && !english) || (needsSet && !setMatch)) continue;
    const resolution = {
      english: english
        ? {
          confidence: english.confidence,
          method: english.method,
          name_kind: english.name_kind,
          support_count: english.support_count,
          total_mapping_count: english.total_mapping_count,
          value: english.value,
          support_identity_keys: english.support_identity_keys,
        }
        : null,
      set: setMatch
        ? setResolutionEvidence(setReconciliation, setMatch)
        : null,
      reasons: compact([
        english ? 'english_name_resolved_from_existing_bilingual_consensus' : null,
        setMatch ? 'ambiguous_live_set_resolved_to_canonical_survivor' : null,
      ]),
    };
    additionalRows.push(
      promoteAdditional(blocked, card, resolution, setReconciliation),
    );
  }
  additionalRows.sort((a, b) =>
    a.candidate_key.localeCompare(b.candidate_key));
  const additionalByKey = new Map(
    additionalRows.map((row) => [row.candidate_key, row]),
  );

  const directKeys = new Set(
    directCards.map((item) => item.candidate_key),
  );
  const dependentKeys = new Set(
    dependentCards.map((item) => item.candidate_key),
  );
  const identityRows = cards
    .map((row) => {
      const classification = classifyIdentity(row, {
        additionalByKey,
        blockedByKey,
        dependentKeys,
        directKeys,
        duplicateByLoser,
        reconciliationByKey: cardReconciliationByKey,
      });
      return enrichIdentityDisposition(
        classification,
        row,
        cardReconciliationByKey.get(row.jpn_card_identity_key),
        setByKey.get(row.jpn_set_key),
      );
    })
    .sort((a, b) => a.candidate_key.localeCompare(b.candidate_key));
  const identityByKey = new Map(
    identityRows.map((row) => [row.candidate_key, row]),
  );

  const printingRows = printings
    .map(classifyPrinting)
    .sort((a, b) =>
      a.printing_fact_key.localeCompare(b.printing_fact_key));
  const printingByKey = new Map(
    printingRows.map((row) => [row.printing_fact_key, row]),
  );

  const assertionRows = assertions.map((row) => {
    const identity = identityByKey.get(row.projected_candidate_key);
    const evidenceNeeded =
      identity?.disposition === 'insufficient_evidence'
        ? 'independent_corroborating_identity_source'
        : identity?.disposition === 'blocked_but_otherwise_admissible'
          ? 'second_independent_approved_bilingual_mapping_or_authoritative_name'
        : identity?.disposition === 'unresolved_contradiction'
          ? 'contradiction_resolution'
          : !identity && row.final_disposition === 'conflict_blocked'
            ? 'source_identity_group_conflict_resolution'
          : null;
    const result = {
      kind: 'a',
      record_key: row.assertion_key ?? row.union_row_key,
      source_key: row.source_key,
      subject_key: row.projected_candidate_key,
      disposition: assertionDisposition(identity, row),
      ...(evidenceNeeded ? { evidence_needed: evidenceNeeded } : {}),
    };
    return result;
  });
  const gapRows = gaps.map((row) => {
    const result = {
      kind: 'g',
      record_key: row.source_gap_key,
      subject_key: row.subject_key,
      disposition: classifyGap(row, identityByKey, printingByKey),
      evidence_needed: row.findings,
    };
    if (row.source_family) result.source_key = row.source_family;
    return result;
  });
  const sourceRows = [...assertionRows, ...gapRows].sort((a, b) =>
    a.kind.localeCompare(b.kind)
    || String(a.record_key).localeCompare(String(b.record_key)));

  const assertionIndex = sourceAssertionIndex();
  const directPackageBase = directCards
    .map((row) => promotionContract(row, 'direct', 2))
    .map((row) => enrichPromotionEvidence(row, assertionIndex))
    .sort((a, b) => a.candidate_key.localeCompare(b.candidate_key));
  const setPackage = setCandidates
    .map((row) => {
      const reconciliation = setByKey.get(row.candidate_key);
      const liveMatches = reconciliation?.live_matches ?? [];
      return {
        ...row,
        promotion_contract: {
          sequence: 1,
          preconditions: [
            'frozen_source_fingerprints_match',
            'set_code_and_name_conflict_checks_pass',
          ],
          conflict_check_results: {
            reconciliation_status:
              reconciliation?.reconciliation_status ?? null,
            promotion_readiness:
              reconciliation?.promotion_readiness ?? null,
            live_match_ids: liveMatches.map((match) => match.id).sort(),
            generated_database_identifier:
              row.generated_database_identifier === true,
            generated_public_route: row.generated_public_route === true,
          },
          post_invariants: [
            'one_canonical_japanese_set',
            'no_public_route_generated_by_this_package',
          ],
        },
      };
    })
    .sort((a, b) => a.candidate_key.localeCompare(b.candidate_key));
  const dependentPackageBase = dependentCards
    .map((row) => promotionContract(row, 'set_first', 3))
    .map((row) => enrichPromotionEvidence(row, assertionIndex))
    .sort((a, b) => a.candidate_key.localeCompare(b.candidate_key));
  const additionalPackageBase = additionalRows
    .map((row) => enrichPromotionEvidence(row, assertionIndex))
    .sort((a, b) => a.candidate_key.localeCompare(b.candidate_key));
  const packageAnalysis = analyzeCardPackageConflicts([
    ...directPackageBase,
    ...dependentPackageBase,
    ...additionalPackageBase,
  ], liveParentRows);
  const analyzedPackageByKey = new Map(
    packageAnalysis.rows.map((row) => [row.candidate_key, row]),
  );
  const directPackage = directPackageBase.map(
    (row) => analyzedPackageByKey.get(row.candidate_key),
  );
  const dependentPackage = dependentPackageBase.map(
    (row) => analyzedPackageByKey.get(row.candidate_key),
  );
  const additionalPackage = additionalPackageBase.map(
    (row) => analyzedPackageByKey.get(row.candidate_key),
  );
  const setPackageConflictProof = {
    set_rows: setPackage.length,
    missing_set_reconciliations: setPackage.filter((row) =>
      row.promotion_contract.conflict_check_results
        .reconciliation_status === 'missing_set').length,
    insert_ready_reconciliations: setPackage.filter((row) =>
      row.promotion_contract.conflict_check_results
        .promotion_readiness === 'set_insert_candidate').length,
    live_match_conflict_rows: setPackage.filter((row) =>
      row.promotion_contract.conflict_check_results
        .live_match_ids.length > 0).length,
    generated_database_identifiers: setPackage.filter((row) =>
      row.generated_database_identifier === true).length,
    generated_public_routes: setPackage.filter((row) =>
      row.generated_public_route === true).length,
  };

  const unresolvedBlocked = blockedCards
    .filter((row) => !additionalByKey.has(row.candidate_key));
  const unresolvedSetReviews = setReviews.filter((row) => {
    const affected = blockedCards.some((card) =>
      card.jpn_set_key === row.candidate_key
      && additionalByKey.has(card.candidate_key));
    return !affected;
  });
  const reviewQueues = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'complete_partitioned_review_queues',
    queues: {
      unresolved_english_name: unresolvedBlocked
        .filter((row) => row.promotion_blockers.includes(
          'collector_facing_english_name_missing',
        ))
        .map((row) => {
          const card = cardsByKey.get(row.candidate_key);
          const reviewed = englishEvidence.reviewed.get(
            `${card.card_domain}\u0000${card.printed_name_ja}`,
          );
          return {
            candidate_key: row.candidate_key,
            printed_name_ja: row.printed_name_ja,
            printed_number: row.printed_number,
            jpn_set_key: row.jpn_set_key,
            mapping_candidates: reviewed?.mapping_candidates ?? [],
            total_mapping_count: reviewed?.total_mapping_count ?? 0,
            evidence_needed:
              'second_independent_approved_bilingual_mapping_or_authoritative_name',
          };
        }),
      unresolved_set_mapping: unresolvedSetReviews.map((row) => ({
        candidate_key: row.candidate_key,
        reconciliation_status: row.reconciliation_status,
        live_match_ids: row.live_matches.map((match) => match.id).sort(),
        evidence_needed: 'canonical_live_set_survivor_adjudication',
      })),
      identity_contradictions: identityRows
        .filter((row) => row.disposition === 'unresolved_contradiction')
        .map((row) => ({
          candidate_key: row.candidate_key,
          reason_codes: row.reason_codes,
          evidence_needed: 'conflict_specific_adjudication',
        })),
      insufficient_identity_evidence: identityRows
        .filter((row) => row.disposition === 'insufficient_evidence')
        .map((row) => ({
          candidate_key: row.candidate_key,
          reason_codes: row.reason_codes,
          evidence_needed: 'independent_corroborating_identity_source',
        })),
      deferred_historical_review: identityRows
        .filter((row) =>
          row.disposition === 'historical_record_deferred_for_later_review')
        .map((row) => ({
          candidate_key: row.candidate_key,
          reason_codes: row.reason_codes,
          evidence_needed:
            'preserved_source_lineage_or_missing_identity_fields',
        })),
      source_acquisition_targets: gapRows
        .filter((row) => [
          'genuine_acquisition_target',
          'missing_corroboration',
        ].includes(row.disposition))
        .map((row) => ({
          source_gap_key: row.record_key,
          subject_key: row.subject_key,
          source_key: row.source_key ?? null,
          disposition: row.disposition,
          evidence_needed: row.evidence_needed,
        })),
      explicit_finish_corroboration: printingRows
        .filter((row) =>
          row.disposition === 'explicit_finish_claim_requires_corroboration')
        .map((row) => ({
          printing_fact_key: row.printing_fact_key,
          evidence_needed: row.evidence_needed,
        })),
    },
  };
  reviewQueues.summary = Object.fromEntries(
    Object.entries(reviewQueues.queues)
      .map(([key, rows]) => [key, rows.length]),
  );
  reviewQueues.systematic_source_gap_counts = countBy(
    gapRows,
    (row) => `${row.source_key ?? 'unspecified'}:${row.disposition}`,
  );
  const candidateSourceGapGroups = by(
    gaps,
    (row) => JSON.stringify([
      row.subject_key,
      row.source_family ?? null,
    ]),
  );
  const candidateSourceKindGapGroups = by(
    gaps,
    (row) => JSON.stringify([
      row.subject_key,
      row.source_family ?? null,
      row.gap_kind,
    ]),
  );
  reviewQueues.source_gap_grouping_proof = {
    source_gap_rows: gapRows.length,
    candidate_source_groups: candidateSourceGapGroups.size,
    candidate_source_groups_with_multiple_rows:
      [...candidateSourceGapGroups.values()]
        .filter((rows) => rows.length > 1).length,
    candidate_source_kind_groups: candidateSourceKindGapGroups.size,
    duplicate_candidate_source_kind_groups:
      [...candidateSourceKindGapGroups.values()]
        .filter((rows) => rows.length > 1).length,
    max_candidate_source_kind_group_size: Math.max(
      ...[...candidateSourceKindGapGroups.values()]
        .map((rows) => rows.length),
    ),
  };

  const invalidExclusions = [];
  const gapDispositionCounts = countBy(gapRows, (row) => row.disposition);
  const promotionRows = [
    ...directPackage,
    ...dependentPackage,
    ...additionalPackage,
  ];
  const imageReadyCards = promotionRows.filter(
    (row) => (row.image_evidence?.candidate_count ?? 0) > 0,
  ).length;
  const counts = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'complete_no_write_adjudication',
    input: {
      working_identity_candidates: cards.length,
      source_assertions: assertions.length,
      source_gaps: gaps.length,
      source_assertions_and_gaps: sourceRows.length,
      working_printing_facts: printings.length,
    },
    identity_dispositions: countBy(identityRows, (row) => row.disposition),
    identity_truth: {
      blocked_candidates_classified: identityRows.filter((row) => [
        'duplicate_of_existing_production_identity',
        'historical_record_deferred_for_later_review',
        'insufficient_evidence',
        'unresolved_contradiction',
      ].includes(row.disposition)).length,
      defensibly_known_base_identities: cards.filter(
        (row) => row.final_disposition === 'master_admissible',
      ).length,
      newly_verified_v4_identities_absent_from_production:
        cardReconciliations.filter((row) =>
          row.reconciliation_status === 'novel_candidate_missing_from_live')
          .length,
    },
    printing_dispositions: countBy(printingRows, (row) => row.disposition),
    printing_truth: {
      duplicate_facts: 0,
      exact_printing_facts_ready: 0,
      exact_printing_facts_rejected: printingRows.filter((row) =>
        row.disposition === 'unsupported_exact_printing_claim_rejected')
        .length,
      exact_printing_facts_unresolved: printingRows.filter((row) =>
        row.disposition === 'explicit_finish_claim_requires_corroboration')
        .length,
      existing_production_printings_preserved: printingRows.filter((row) =>
        row.disposition === 'existing_production_printing_preserved')
        .length,
    },
    source_dispositions: countBy(sourceRows, (row) => row.disposition),
    source_gap_dispositions: gapDispositionCounts,
    source_gap_resolution: {
      acquisition_required:
        (gapDispositionCounts.genuine_acquisition_target ?? 0)
        + (gapDispositionCounts.missing_corroboration ?? 0),
      contradiction_adjudication_required:
        gapDispositionCounts.source_conflict ?? 0,
      no_further_acquisition_required:
        gaps.length
        - (gapDispositionCounts.genuine_acquisition_target ?? 0)
        - (gapDispositionCounts.missing_corroboration ?? 0)
        - (gapDispositionCounts.source_conflict ?? 0),
    },
    source_disposition_schema: {
      kind: {
        a: 'source_assertion',
        g: 'source_gap',
      },
      record_key: 'immutable_assertion_or_gap_key',
      subject_key: 'identity_or_printing_fact_key',
      assertion_dispositions: ASSERTION_DISPOSITION_BY_IDENTITY,
      assertion_disposition_meanings: ASSERTION_DISPOSITION_MEANINGS,
    },
    readiness_schema: {
      separate_gate:
        'requires a later separately authorized exact-printing, storage, '
        + 'public-visibility, search, sitemap, or scanner action',
    },
    promotion: {
      direct_cards: directPackage.length,
      sets_first: setPackage.length,
      dependent_cards: dependentPackage.length,
      additional_resolved_cards: additionalPackage.length,
      additional_resolved_english_names: additionalPackage.filter(
        (row) => row.resolution.english,
      ).length,
      additional_resolved_set_mappings: additionalPackage.filter(
        (row) => row.resolution.set,
      ).length,
      image_ready_cards: imageReadyCards,
      total_cards_ready:
        directPackage.length
        + dependentPackage.length
        + additionalPackage.length,
      card_package_conflict_proof: packageAnalysis.proof,
      set_package_conflict_proof: setPackageConflictProof,
    },
    deduplication: {
      duplicate_losers: duplicateRows.length,
      aliases: duplicateRows.filter((row) => row.alias_key).length,
    },
    invalid_non_card_exclusions: invalidExclusions.length,
    remaining_review: reviewQueues.summary,
    reconciliation: {
      identity_rows_reconcile:
        identityRows.length === cards.length,
      source_rows_reconcile:
        sourceRows.length === assertions.length + gaps.length,
      printing_rows_reconcile:
        printingRows.length === printings.length,
      promotion_original_counts_preserved:
        directPackage.length === 38
        && setPackage.length === 1041
        && dependentPackage.length === 3850,
      generic_blocked_dispositions: identityRows.filter(
        (row) => row.disposition === 'blocked',
      ).length,
      generic_linked_assertion_dispositions: sourceRows.filter(
        (row) =>
          row.disposition === 'linked_to_final_identity_disposition',
      ).length,
      package_conflict_checks_pass:
        packageAnalysis.proof.all_conflict_checks_pass
        && setPackageConflictProof.live_match_conflict_rows === 0
        && setPackageConflictProof.missing_set_reconciliations
          === setPackage.length
        && setPackageConflictProof.insert_ready_reconciliations
          === setPackage.length,
    },
  };

  const promotionOrder = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'promotion_order_only_no_execution',
    stages: [
      {
        sequence: 0,
        name: 'preflight',
        package: 'jpn_v4_final_fingerprints.json',
        row_count: 0,
        action:
          'verify frozen inputs, live no-write baseline, and conflicts',
      },
      {
        sequence: 1,
        name: 'sets_first',
        package: 'jpn_v4_set_promotion_package.jsonl',
        row_count: setPackage.length,
        action: 'insert or idempotently reuse canonical Japanese sets',
      },
      {
        sequence: 2,
        name: 'direct_cards',
        package: 'jpn_v4_direct_card_promotion_package.jsonl',
        row_count: directPackage.length,
        action: 'promote cards mapped to existing canonical sets',
      },
      {
        sequence: 3,
        name: 'dependent_cards',
        package: 'jpn_v4_dependent_card_promotion_package.jsonl',
        row_count: dependentPackage.length,
        action: 'promote cards after their set prerequisites',
      },
      {
        sequence: 4,
        name: 'additional_resolved_cards',
        package: 'jpn_v4_additional_resolved_card_package.jsonl',
        row_count: additionalPackage.length,
        action:
          'promote conservatively resolved cards in dependency order',
      },
      {
        sequence: 5,
        name: 'separately_authorized_downstream_surfaces',
        package: null,
        row_count: 0,
        action:
          'public GV IDs, child printings, image hosting, family promotion, '
          + 'search, sitemap, and scanner refresh require separate approval',
      },
    ],
    execution_authorized: false,
  };

  const report = [
    '# Japanese Master Index V4 Final Reconciliation',
    '',
    `Generator: \`${GENERATOR_VERSION}\``,
    '',
    '## Result',
    '',
    `- ${cards.length.toLocaleString()} identity candidates received one `
      + 'mutually exclusive final disposition.',
    `- ${(assertions.length + gaps.length).toLocaleString()} source `
      + 'assertions and gap records received a final evidence disposition.',
    `- ${printings.length.toLocaleString()} printing facts were preserved, `
      + 'rejected, or assigned a concrete corroboration target.',
    `- ${additionalPackage.length.toLocaleString()} promotion-blocked card `
      + 'candidates are now promotion-ready through conservative bilingual '
      + 'or set-survivor evidence.',
    '- Bilingual consensus names are approved collector display mappings; '
      + 'they are not asserted to be official English printed names.',
    `- ${duplicateRows.length.toLocaleString()} exact duplicate production `
      + 'identity shells have deterministic canonical survivors.',
    `- ${cards.filter((row) =>
      row.final_disposition === 'master_admissible').length.toLocaleString()} `
      + 'base identities remain defensibly known under the strict V4 rules.',
    `- ${cardReconciliations.filter((row) =>
      row.reconciliation_status === 'novel_candidate_missing_from_live')
      .length.toLocaleString()} verified V4 identities are absent from the `
      + 'frozen production parent baseline.',
    '',
    '## Promotion Readiness',
    '',
    `- Direct card package: ${directPackage.length.toLocaleString()}`,
    `- Set-first package: ${setPackage.length.toLocaleString()} sets`,
    `- Set-dependent card package: ${dependentPackage.length.toLocaleString()}`,
    `- Additional resolved card package: ${additionalPackage.length.toLocaleString()}`,
    `- Total card candidates ready: ${(
      directPackage.length + dependentPackage.length + additionalPackage.length
    ).toLocaleString()}`,
    `- Cards with image evidence: ${imageReadyCards.toLocaleString()}`,
    `- English-name blockers remaining: ${unresolvedBlocked.filter((row) =>
      row.promotion_blockers.includes(
        'collector_facing_english_name_missing',
      )).length.toLocaleString()}`,
    `- Set review rows remaining: ${unresolvedSetReviews.length.toLocaleString()}`,
    `- Card-level set-mapping blockers remaining: ${unresolvedBlocked.filter(
      (row) => row.promotion_blockers.includes(
        'set_mapping_not_promotion_safe',
      ),
    ).length.toLocaleString()}`,
    `- Package coordinate duplicate groups: ${(
      packageAnalysis.proof.duplicate_package_coordinate_groups
    ).toLocaleString()}`,
    `- Frozen live-set number conflicts: ${(
      packageAnalysis.proof.live_set_number_conflict_rows
    ).toLocaleString()}`,
    '',
    '## Remaining Legitimate Work',
    '',
    `- Insufficient identity evidence: ${(
      counts.identity_dispositions.insufficient_evidence ?? 0
    ).toLocaleString()}`,
    `- Deferred historical records: ${(
      counts.identity_dispositions
        .historical_record_deferred_for_later_review ?? 0
    ).toLocaleString()}`,
    `- Unresolved contradictions: ${(
      counts.identity_dispositions.unresolved_contradiction ?? 0
    ).toLocaleString()}`,
    `- Source gaps requiring acquisition: ${(
      counts.source_gap_resolution.acquisition_required
    ).toLocaleString()}`,
    `- Source gaps requiring contradiction adjudication: ${(
      counts.source_gap_resolution.contradiction_adjudication_required
    ).toLocaleString()}`,
    `- Candidate/source/kind gap groups: ${(
      candidateSourceKindGapGroups.size
    ).toLocaleString()} (${reviewQueues.source_gap_grouping_proof
      .duplicate_candidate_source_kind_groups.toLocaleString()} duplicate groups)`,
    '',
    '## Printing Facts',
    '',
    '- New exact printing facts ready: 0',
    `- Unsupported exact printing claims rejected: ${(
      counts.printing_truth.exact_printing_facts_rejected
    ).toLocaleString()}`,
    `- Explicit finish claims unresolved: ${(
      counts.printing_truth.exact_printing_facts_unresolved
    ).toLocaleString()}`,
    '- Existing live printings are preserved; V4 does not rewrite them.',
    '- Generated rows without an explicit finish claim are rejected as '
      + 'unsupported exact-printing claims.',
    '- Explicit finish claims remain only where a second independent and '
      + 'human-readable source is still required.',
    '- No new exact printing fact is promoted by this package.',
    '',
    '## Invalid And Non-card Inputs',
    '',
    '- No candidate-level invalid/non-card rows survived the upstream set and '
      + 'product filters. The exclusion deliverable is therefore intentionally '
      + 'empty. Future-release exclusions remain explicitly excluded in the '
      + 'identity ledger and are not mislabeled as invalid.',
    '',
    '## No-write Boundary',
    '',
    '- This run reads only committed audit artifacts.',
    '- It generates no SQL, IDs, migrations, storage objects, or deployment.',
    '- Frozen live and English fingerprints are carried into the attestation.',
    '- Every downstream database or public-surface action requires separate '
      + 'authorization.',
    '',
  ].join('\n');

  const outputFiles = {
    identities: 'jpn_v4_final_identity_disposition.jsonl',
    sources: 'jpn_v4_final_source_assertion_disposition.jsonl',
    printings: 'jpn_v4_final_printing_fact_disposition.jsonl',
    direct: 'jpn_v4_direct_card_promotion_package.jsonl',
    sets: 'jpn_v4_set_promotion_package.jsonl',
    dependent: 'jpn_v4_dependent_card_promotion_package.jsonl',
    additional: 'jpn_v4_additional_resolved_card_package.jsonl',
    duplicates: 'jpn_v4_duplicate_alias_map.jsonl',
    invalid: 'jpn_v4_invalid_non_card_exclusions.jsonl',
    review: 'jpn_v4_remaining_review_queues.json',
    order: 'jpn_v4_promotion_order.json',
    report: 'jpn_v4_final_reconciliation_report.md',
    counts: 'jpn_v4_final_counts.json',
    fingerprints: 'jpn_v4_final_fingerprints.json',
    attestation: 'jpn_v4_no_write_attestation.json',
  };

  await writeJsonl(path.join(outputRoot, outputFiles.identities), identityRows);
  await writeJsonl(path.join(outputRoot, outputFiles.sources), sourceRows);
  await writeJsonl(path.join(outputRoot, outputFiles.printings), printingRows);
  await writeJsonl(path.join(outputRoot, outputFiles.direct), directPackage);
  await writeJsonl(path.join(outputRoot, outputFiles.sets), setPackage);
  await writeJsonl(path.join(outputRoot, outputFiles.dependent), dependentPackage);
  await writeJsonl(
    path.join(outputRoot, outputFiles.additional),
    additionalPackage,
  );
  await writeJsonl(path.join(outputRoot, outputFiles.duplicates), duplicateRows);
  await writeJsonl(path.join(outputRoot, outputFiles.invalid), invalidExclusions);
  await writeJson(path.join(outputRoot, outputFiles.review), reviewQueues);
  await writeJson(path.join(outputRoot, outputFiles.order), promotionOrder);
  await fsp.writeFile(path.join(outputRoot, outputFiles.report), report);
  await writeJson(path.join(outputRoot, outputFiles.counts), counts);

  const noWriteAttestation = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'attested_no_write',
    source_final_package_fingerprint:
      finalPackage.content_fingerprint_sha256,
    frozen_live_baseline: finalPackage.content.live_baseline_recheck,
    package_conflict_proof: {
      cards: packageAnalysis.proof,
      sets: setPackageConflictProof,
    },
    execution_boundary: {
      canonical_id_allocation: false,
      database_reads: false,
      database_writes: false,
      deployment: false,
      english_mutation: false,
      family_promotion: false,
      image_writes: false,
      migration_apply: false,
      pricing_writes: false,
      public_gv_ids_generated: false,
      source_fetches: false,
      sql_generated: false,
      storage_writes: false,
    },
    production_state_mutated: false,
    promotion_authorized: false,
  };
  await writeJson(
    path.join(outputRoot, outputFiles.attestation),
    noWriteAttestation,
  );

  const fingerprintedFiles = Object.values(outputFiles)
    .filter((name) => name !== outputFiles.fingerprints)
    .sort();
  const fingerprints = {};
  for (const filename of fingerprintedFiles) {
    fingerprints[filename] = await fingerprintFile(
      path.join(outputRoot, filename),
    );
  }
  await writeJson(path.join(outputRoot, outputFiles.fingerprints), {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'deterministic_artifact_fingerprints',
    files: fingerprints,
    aggregate_sha256: contentFingerprint(fingerprints),
  });

  if (!args.quiet) {
    console.log(JSON.stringify({
      additional_resolved_cards: additionalPackage.length,
      duplicate_losers: duplicateRows.length,
      identity_rows: identityRows.length,
      output_root: args.outputRoot.replaceAll('\\', '/'),
      printing_rows: printingRows.length,
      promotion_ready_cards:
        directPackage.length
        + dependentPackage.length
        + additionalPackage.length,
      source_rows: sourceRows.length,
      status: counts.status,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

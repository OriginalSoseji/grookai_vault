# Japanese Master Index V4 Build Plan

Status: In progress - Phases 0-1 complete; Phase 2 active
Branch: `catalog/jpn-master-index-v4`
Baseline commit: `b95f291ef1ffcdd46fa7eeb361e293d2c0616bf3`
Date: 2026-07-26

## Progress

| Phase | Status | Evidence |
|---|---|---|
| 0 - Workspace and no-write guard | Complete | Guard contract tests pass; session and transaction both prove read-only |
| 1 - Reproducible baseline export | Complete | Production export and independent replay have matching content fingerprints |
| 2 - Japanese set/product registry | Active | Set-code and placeholder inventories frozen; source acquisition next |
| 3 - Source acquisition engine | Pending | Starts after the set/product registry gate |
| 4-8 | Pending | Candidate union through final admissible index |

Phase 1 completion evidence:

- all frozen production counts reproduce exactly;
- all 94 identity/evidence-gap rows are individually classified;
- all 62 private/no-image rows are classified as superseded duplicate shells;
- the remaining 32 gaps are new-release identity/evidence-pending rows;
- six core baseline artifacts reproduce identical content fingerprints;
- English reference freeze includes 1,025 active species rows and 19,346
  active English species relationships;
- artifact hashes and credential-exclusion tests pass;
- no database or Storage mutation occurred.

## Objective

Build the most complete reproducible Japanese physical Pokemon TCG reference
index Grookai can support, while keeping Japanese print identities inside the
same language-agnostic Master Identity Graph used by English.

This build stops at final index artifacts. It does not write to Supabase,
Storage, pricing, public visibility, image pointers, canonical families, or
any application table.

The governing contract is:

```text
docs/contracts/JAPANESE_MASTER_INDEX_COMPLETION_V1.md
```

## Current Evidence Baseline

A read-only production audit on 2026-07-26 found:

| Measure | Current value |
|---|---:|
| Japanese parent rows | 26,047 |
| Public Japanese GV IDs | 25,985 |
| Active Japanese identities | 25,953 |
| Japanese child printings | 25,953 |
| Raw Japanese set codes | 504 |
| Case-folded set codes | 388 |
| Case-only alias groups | 116 |
| Source-placeholder sets | 45 |
| Cards under source-placeholder sets | 1,297 |
| Rows with no public GV ID/image | 62 |
| Rows with no active identity/evidence lane | 94 |

Current active evidence coverage:

| Source lane | Evidence rows/cards |
|---|---:|
| TCGCollector JP | 25,059 |
| Art of Pokemon JP | 23,868 |
| Official Pokemon Card JP | 21,294 evidence rows / 21,235 cards |
| Limitless JP | 18,462 |
| Pokellector JP | 17,734 |
| TCGdex JA | 6,061 |
| Bulbapedia JP card lists | 3,977 |
| Bulbapedia Pikachu corroboration | 134 |

Active evidence-lane distribution:

| Independent stored lanes | Parent rows |
|---:|---:|
| 0 | 94 |
| 1 | 90 |
| 2 | 2,443 |
| 3 | 3,337 |
| 4 | 4,449 |
| 5 | 10,057 |
| 6 | 5,577 |

TCGCollector's live Japanese surface reported 27,491 cards and 453 sets at
plan time. Those totals are discovery floors, not automatic Master Index
truth. The current deltas must be classified rather than treated as direct
insert counts.

## Hard Boundaries

Forbidden for the entire plan:

- database writes of any kind;
- migrations or schema changes;
- Storage uploads, deletes, or pointer changes;
- public GV ID or child-printing writes;
- family promotion;
- pricing or market-evidence writes;
- cleanup, quarantine, archive, or deletion;
- treating the current Grookai database as self-proving truth;
- forcing Japanese identities into English set or number assumptions.

Allowed:

- read-only, transaction-guarded database exports;
- public-source acquisition within source terms and rate limits;
- versioned local JSON, Markdown, HTML, and raw evidence snapshots;
- deterministic normalization, matching, and report generation;
- read-only comparison to English family references.

## Build Layout

All durable outputs live under:

```text
docs/audits/japanese_master_index_v4/
```

Raw or large transient acquisitions may use:

```text
.tmp/japanese_master_index_v4/
```

Every promoted artifact receives a manifest entry with:

- relative path;
- byte size;
- SHA-256;
- generator version;
- source retrieval timestamps;
- dependency fingerprints.

## Phase 0 - Workspace and No-Write Guard

Deliverables:

- dedicated clean worktree and branch;
- active Japanese completion contract;
- executable build plan;
- shared `read_only_guard_v1` module;
- contract tests proving mutation SQL and mutation flags are rejected;
- environment fingerprint that omits secrets.

Gate:

```text
clean worktree
read-only transaction established
mutation probes rejected
English baseline fingerprint captured
zero DB writes
```

## Phase 1 - Reproducible Baseline Export

Build a read-only exporter for:

- current Japanese parent facts;
- active Japanese identity facts;
- source-evidence summaries;
- family-review outcomes;
- existing species/family links;
- current set rows and source aliases;
- English language-agnostic family reference keys;
- source-placeholder and duplicate-shell classifications.

The exporter must run through PostgreSQL `BEGIN READ ONLY`, set
`default_transaction_read_only = on`, and roll back.

Outputs:

- `baseline/live_jpn_parent_summary_v1.json`;
- `baseline/live_jpn_source_coverage_v1.json`;
- `baseline/live_jpn_set_code_inventory_v1.json`;
- `baseline/live_jpn_identity_gap_queue_v1.json`;
- `baseline/english_family_reference_fingerprint_v1.json`;
- Markdown summary.

Gate:

- counts reproduce the plan baseline or drift is explicitly reported;
- the 94 zero-evidence/identity rows are individually classified;
- the 62 private/no-image rows are individually classified;
- no secret values appear in artifacts;
- repeated export is deterministic apart from declared retrieval metadata.

## Phase 2 - Japanese Set and Product Registry

Acquire and preserve the complete release-container universe before resolving
cards.

Primary lanes:

- Official Pokemon Card Game Japan products, card search, campaigns, and
  events;
- TCGCollector Japanese sets;
- Art of Pokemon set/product structure;
- Limitless Japanese set structure.

Corroborating lanes:

- Pokellector;
- TCGdex Japanese sets;
- Bulbapedia;
- PokeGuardian;
- deck, gift-box, tournament, magazine, movie, vending, and campaign archives.

Tasks:

1. Preserve raw set/product listings from every source.
2. Build a source-native set assertion union.
3. Normalize aliases without deleting source labels.
4. Resolve the 116 case-only aliases.
5. Replace all 45 source-placeholder set identities.
6. Classify deck/product/promo/event relationships.
7. Record expected card counts by source without forcing equality.
8. Produce blocked rows for conflicting or insufficient release identity.

Outputs:

- `sets/source_set_assertions_v1.json`;
- `sets/jpn_set_alias_map_v1.json`;
- `sets/jpn_set_registry_v1.json`;
- `sets/jpn_set_conflict_queue_v1.json`;
- `sets/jpn_source_placeholder_resolution_v1.json`;
- coverage report by era and release kind.

Gate:

- every discovered source set/product is mapped, blocked, excluded, or out of
  scope;
- zero source-placeholder keys in the admissible registry;
- zero unexplained alias collisions;
- official code and collector alias remain distinct fields;
- no card-level promotion runs before this gate passes.

## Phase 3 - Source Acquisition Engine

Implement one adapter per independent source family. Each adapter emits the
same source-assertion contract while preserving raw fields.

Required adapters:

1. Official Pokemon Card Game Japan.
2. TCGCollector JP.
3. Art of Pokemon JP.
4. Limitless JP.
5. Pokellector JP.
6. TCGdex JA.
7. Bulbapedia.
8. PokeGuardian and release-report archives.
9. Historical deck/product/campaign/tournament/magazine archives.
10. Bounded marketplace/auction review evidence for unresolved historical
    cards only.

Each adapter must support:

- resumable acquisition;
- explicit rate limiting and user agent;
- retry with bounded backoff;
- raw snapshot preservation;
- source health and count reporting;
- adapter/parser version;
- no-source-reset union with preserved evidence;
- a deterministic offline replay mode.

Outputs:

- per-source raw manifests;
- per-source normalized assertion files;
- source health report;
- source independence map;
- source delta report against the prior healthy snapshot.

Gate:

- every required source is harvested, explicitly unavailable, or explicitly
  source-limited;
- live-source losses do not reduce preserved evidence;
- offline replay produces identical normalized assertions;
- no adapter has database credentials.

## Phase 4 - Candidate Union

Union source assertions without destructive deduplication.

Normalize:

- set/product aliases;
- printed-number forms and zero padding;
- unnumbered identities;
- Japanese Unicode and punctuation;
- collector-facing English display names;
- owner/trainer names;
- rarity and card type;
- edition, regulation, campaign, deck, and stamp labels;
- image and distribution evidence.

Outputs:

- `candidates/jpn_source_assertion_union_v1.json`;
- `candidates/jpn_identity_candidates_v1.json`;
- `candidates/jpn_printing_candidates_v1.json`;
- number/name/set collision queues;
- unmatched source assertion queue.

Gate:

- every source assertion has a deterministic disposition;
- no source row disappears during normalization;
- every merge retains all contributing source evidence;
- possible duplicates remain reviewable until identity resolution.

## Phase 5 - Identity and Printing Resolution

Resolve parent identities using the Japanese contract.

Resolution order:

1. Exact official set/product + number + printed name.
2. Exact multi-source set/product + number + printed name.
3. Governed unnumbered identity with product/distribution evidence.
4. Identity-modifier resolution for stamps, deck/product origin, owner names,
   campaigns, errors, and edition marks.
5. Printing/finish resolution under the stricter finish gate.
6. Conflict or manual-review disposition.

Outputs:

- `resolution/jpn_resolved_card_identities_v1.json`;
- `resolution/jpn_resolved_printing_facts_v1.json`;
- `resolution/jpn_identity_conflicts_v1.json`;
- `resolution/jpn_finish_conflicts_v1.json`;
- `resolution/jpn_adjudicated_exclusions_v1.json`.

Gate:

- zero unresolved exact identity collisions in the admissible set;
- no finish inferred from English or era assumptions;
- every admissible identity satisfies its evidence admission rule;
- every excluded or blocked row remains preserved and explained.

## Phase 6 - Family and Cross-Language Relationships

Read existing English and language-agnostic family references without
mutating them.

Tasks:

- map Pokemon cards to species;
- map named-owner Pokemon to the correct species plus identity modifier;
- classify trainers, energy, tools, stadiums, and special concepts;
- propose cross-language print relationships only when exact equivalence is
  evidenced;
- preserve language-exclusive cards without forcing an English peer.

Outputs:

- `families/jpn_family_relationship_candidates_v1.json`;
- `families/jpn_cross_language_relationships_v1.json`;
- `families/jpn_family_review_queue_v1.json`;
- relationship coverage report.

Gate:

- every admissible Pokemon identity has a species relationship or documented
  exception;
- non-Pokemon identities have a governed family domain or non-family reason;
- no English identity or family row changed;
- uncertain equivalence remains review-only.

## Phase 7 - Coverage and Source Exhaustion

Generate coverage by:

- era;
- set/product;
- promo family;
- deck and gift-box lane;
- event, trophy, tournament, campaign, magazine, movie, and vending lane;
- numbered versus unnumbered;
- card type;
- source;
- evidence-lane count;
- identity status;
- printing/finish status;
- family-link status.

Required queues:

- source-only cards;
- missing source cards;
- single-source identities;
- set/number/name conflicts;
- source-placeholder remnants;
- unresolved aliases;
- unnumbered candidates;
- deck/product-exclusive candidates;
- identity-modifier conflicts;
- printing/finish conflicts;
- family-link review;
- adjudicated exclusions.

Gate:

- every source delta is explained;
- no queue is silently omitted from the completion denominator;
- source exhaustion is recorded per lane;
- raw count comparisons are accompanied by identity-grain explanations.

## Phase 8 - Final Admissible Index

Build:

- `jpn_master_admissible_sets_v1.json`;
- `jpn_master_admissible_cards_v1.json`;
- `jpn_master_admissible_printings_v1.json`;
- `jpn_master_family_relationships_v1.json`;
- `jpn_master_blocked_facts_v1.json`;
- `jpn_master_adjudicated_exclusions_v1.json`;
- `jpn_master_coverage_matrix_v1.json`;
- `jpn_master_completion_report_v1.md`;
- `jpn_master_build_manifest_v1.json`.

The final report must distinguish:

- discovered assertions;
- working candidates;
- master-admissible identities;
- master-admissible printing facts;
- blocked facts;
- adjudicated exclusions;
- out-of-scope facts.

Gate:

- all completion requirements in
  `JAPANESE_MASTER_INDEX_COMPLETION_V1` pass;
- two clean offline rebuilds produce matching content fingerprints;
- English reference fingerprints match Phase 0;
- no mutation-capable artifact was emitted;
- no database or Storage row was changed.

## Verification Strategy

Contract tests cover:

- no-write SQL guard;
- mutation flag rejection;
- source assertion schema;
- set alias determinism;
- Unicode and printed-number normalization;
- source independence;
- identity key determinism;
- no-source-reset behavior;
- exact collision retention;
- family relationship non-mutation;
- manifest hash verification;
- offline replay reproducibility.

Operational proof includes:

- read-only database transaction logs;
- pre/post English fingerprints;
- pre/post live Japanese counts for observation only;
- source artifact hashes;
- final manifest verification.

## Work Sequencing

The build proceeds continuously in these batches without per-source
micro-approval:

1. Guard, contract, and baseline.
2. Set/product registry.
3. Tier 1 acquisition.
4. Tier 2 acquisition.
5. Historical and niche acquisition.
6. Candidate union and identity resolution.
7. Printing and family resolution.
8. Coverage, exhaustion, and final package.

The build stops only for:

- a source legal/terms restriction requiring a product decision;
- evidence that two source lanes are not independent;
- a scope decision about whether an object is a Pokemon TCG card;
- a request for database or Storage mutation;
- an irreconcilable identity-law ambiguity requiring owner judgment.

## Rollback

No database rollback exists because the build performs no database writes.

Artifact rollback is:

1. retain raw preserved evidence;
2. mark the failed build manifest non-promotable;
3. revert generator changes;
4. rebuild from the last healthy preserved source manifest.

Previously preserved evidence is never deleted merely because a build fails.

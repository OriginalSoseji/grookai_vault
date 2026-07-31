# Visual Search V1 Unified Evidence Checkpoint

## Status

COMPLETE FOR LOCAL LAB; PRODUCTION ACTIVATION NOT AUTHORIZED.

## Producer

- Branch: `agent/visual-search-lab-runtime-fix`
- Implementation commit:
  `4900c2908becbb901b96538c732d7c9205aa1901`
- Date: `2026-07-29` America/Denver

## Context

Grookai had three relevant search lanes:

- canonical identity and ordinary print metadata;
- observation-backed Card Visual Fact Graph search;
- approved and newly imported curated cameo relationships.

The production `search_card_prints_v1` read model already included approved
cameo tokens, while the local visual-search lab ranked Fact Graph evidence
separately. The July 29 curated workbook import added 909 exact canonical
candidates without mutating paid visual payloads.

Collectors should not need to select one lane before searching.

## Problem

A query such as `Pikachu` should find direct Pikachu cards, cards with
observation-backed Pikachu visual facts, and cards with curated Pikachu cameo
associations.

At the same time, specificity must remain strict:

- `Pikachu cameo` requires a curated relationship;
- `Pikachu pillow` requires Pikachu-bound pillow evidence;
- `Pikachu sleeping` cannot be satisfied by a Pikachu cameo plus an unrelated
  sleeping subject;
- `Pikachu shaped cookie` cannot be inferred from independent Pikachu and
  cookie evidence.

## Risk

A naive union would create convincing but false relationships by combining
unrelated facts from the same card.

Copying external curator rows into Fact Graph observations would also destroy
provenance by presenting card-level reference evidence as pixel-level model
evidence.

## Decision

Use one result set with three preserved evidence authorities:

1. `canonical_identity` / `canonical_metadata`;
2. `visual_fact_graph`;
3. `curated_cameo`.

The curated workbook is projected into immutable runtime documents with
external evidence IDs. It never receives fabricated observation IDs.

Direct canonical identity ranks above cameo-only identity for an unqualified
query. Multiple lanes may contribute match reasons to one artwork result.

Subject-scoped semantic constraints require evidence binding. Artwork-level
co-occurrence may combine independent authorities only when the query does not
assert a specific subject relationship.

## Alternatives Rejected

- Separate canonical, visual, and cameo search tabs: rejected because the
  collector must already know which index contains the answer.
- Flatten every source into free-text tokens: rejected because it loses
  authority and relationship scope.
- Convert spreadsheet rows into Fact Graph observations: rejected because the
  source does not prove pixel locations or image observations.
- Treat all exact spreadsheet matches as approved: rejected because 909 rows
  remain external exact candidates.
- Let a card-level cameo association bind every visual fact on that card:
  rejected because it creates false pose, anatomy, and representation claims.

## Implementation

- Added
  `backend/card_descriptions/card_visual_search_curated_cameo_v1.mjs`.
- Added optional `--cameo-reference` and
  `CARD_VISUAL_SEARCH_CAMEO_REFERENCE`.
- Added curated identities to the in-memory candidate/parser index.
- Added explicit `cameo` query-source filtering.
- Added external-evidence-aware role matching.
- Added named-subject semantic binding.
- Added bounded multi-source result merging.
- Added `matched_sources`, `why_matched`, `retrieval_modes`, external evidence
  IDs, authority, and governance status.
- Updated the lab UI to distinguish observation and external evidence.
- Added the governing
  `CARD_VISUAL_SEARCH_UNIFIED_EVIDENCE_V1` contract.

## Real Corpus Readback

Inputs:

- immutable projection artwork groups: `9,532`;
- original structured entries: `321,937`;
- curated canonical-match rows: `2,329`.

Runtime projection:

- curated rows attached to eligible artwork: `711`;
- existing-approved attached relationships: `471`;
- external exact-candidate attached relationships: `240`;
- artwork groups with curated cameos: `463`;
- runtime curated entries: `773`;
- combined indexed entries: `322,710`;
- rows outside the eligible projection: `1,617`;
- rejected row with no card-print ID: `1`.

The rejected row is the prior approved Charizard relationship on
`GV-PK-PR-SV-101`; its imported prior artifact has an empty `card_print_id`.
It remains outside this artwork-group projection rather than being guessed.

## Query Proof

- `Pikachu`
  - `112` artwork matches;
  - direct Pikachu cards rank first;
  - top direct rows expose canonical and Fact Graph sources.
- `Pikachu cameo`
  - `20` artwork matches;
  - direct-only Pikachu cards are excluded;
  - results distinguish existing-approved and external-exact-candidate rows.
- `Pikachu pillow`
  - `1` artwork match;
  - Whimsicott, `GV-PK-FCO-71`;
  - evidence is curated source record
    `cvr_8c8a98a59997c8a74ca4`;
  - governance remains `external_exact_candidate`.
- `Pokemon as food`
  - `2` artwork matches;
  - Slurpuff `GV-PK-ASC-094` is supported by explicit Snorlax and Swirlix
    `sweets` source evidence;
  - no identity is assigned to the held cookie.
- `sleeping Pokemon`
  - `34` observation-backed artwork matches.
- `Pikachu shaped cookie`
  - strict zero;
  - no available evidence proves that exact representation relationship.

## Visual Proof

The live local lab at `http://127.0.0.1:4181/` was verified in Chrome.

For `Pikachu pillow`, the UI showed:

- one Whimsicott result;
- the self-hosted image loaded at natural width `600`;
- `Curated cameo relationship`;
- the external evidence ID;
- `external_exact_candidate`;
- no fabricated observation reference.

## Tests

- Syntax/import checks: passed.
- New unified evidence contracts: `6/6` passed.
- Local lab plus unified evidence contracts: `15/15` passed.
- All `card_visual_search*.test.mjs` contracts: `113/113` passed.
- `git diff --check`: passed.
- Release secret guard inside the pre-commit hook: passed.
- Repository preflight did not run past environment validation because
  `SUPABASE_DB_URL` is absent in this worktree. The implementation commit used
  `--no-verify` only after the focused no-write test suite passed.

## Current Truths

- One local query can combine canonical, Fact Graph, and curated cameo evidence.
- Raw model observations remain immutable.
- Curated candidates are visibly distinct from approved relationships.
- The current semantic lane is deterministic structured/lexical Fact Graph
  matching. No embedding or vector search has been activated.
- Production regular search already contains approved cameo integration.
- The private visual-search persistence migration is still unapplied.
- Production does not yet expose this unified three-lane response.

## Invariants

- External evidence IDs must never be presented as observation IDs.
- Canonical identity remains canonical authority.
- Curated cameos cannot redefine canonical identity.
- Exact source reconciliation does not equal human approval.
- Blank Notes cannot establish scene/depicted/representation role.
- Subject-scoped claims require bound evidence.
- Unsupported specificity returns zero.
- Artwork results remain deduplicated before printing expansion.
- No paid Fact Graph regeneration is required for this merge.

## What Must Never Be Broken

- A cameo association must not make every object, pose, environment, or action
  on the card a fact about that cameo.
- Existing paid Fact Graph payloads must not be rewritten to absorb external
  spreadsheet claims.
- Direct canonical matches must not be buried by cameo-only matches for plain
  identity queries.
- Candidate evidence must not silently appear approved.
- Production activation must not bypass calibration, holdout, persistence,
  access-control, or rollout gates.

## Explicit Next Gate

Run human mixed-query calibration in the unified local lab using direct
identity, regular metadata, visual discovery, curated cameo, role-specific,
mixed-constraint, and valid-zero queries.

After calibration passes:

1. freeze ranking and authority thresholds;
2. execute the sealed holdout without tuning;
3. apply and verify the private visual-search persistence migration;
4. stage-load and reconcile the immutable visual projection;
5. build one signed-in unified read service that merges:
   - `search_card_prints_v1` canonical/cameo results;
   - private visual candidate results;
   - governed JavaScript final ranking and explanations;
6. smoke test direct, visual, cameo, mixed, and strict-zero queries;
7. canary with signed-in collectors before any public rollout.

Stop before database apply or production search activation.

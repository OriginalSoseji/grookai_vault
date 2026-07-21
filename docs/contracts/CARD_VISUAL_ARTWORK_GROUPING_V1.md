# CARD_VISUAL_ARTWORK_GROUPING_V1

Status: Superseded by `CARD_VISUAL_ARTWORK_GROUPING_V1_1`

Date: 2026-07-21

## Purpose

Define the first deterministic artwork grouping pass for the locked Card Visual Corpus V1. Grouping reduces duplicate-printing crowding without merging canonical identities from model similarity or card-name similarity alone.

This contract does not mutate source graphs, correct canonical metadata, write database rows, create search projections, generate embeddings, activate search, or approve visual facts.

## Inputs

- Reconciled `CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4` decisions.
- Reconciled `CARD_VISUAL_CORPUS_SOURCE_INVENTORY_V1` rows.
- Source image SHA-256.
- Canonical name snapshot.
- Prompt branch snapshot.
- Fact-graph and generated-row hashes.

Only Tier A and Tier B rows are grouping candidates. Tier C and source gaps remain excluded.

## V1 Grouping Authority

V1 may merge rows only when all three values agree:

1. source image SHA-256;
2. normalized canonical card name; and
3. prompt branch.

This is authority `exact_image_hash_same_canonical_name_and_branch`.

Normalization is deterministic Unicode NFKC, lowercase, whitespace-normalized text. It does not remove owner names, species forms, variant labels, or meaningful punctuation tokens.

## Conservative Split Rules

- Same canonical name with different image hashes remains separate artwork groups.
- Same set/number with different image hashes remains separate.
- Visual similarity, embedding similarity, color similarity, and graph similarity cannot merge rows.
- Different canonical names sharing one image hash produce a grouping conflict.
- Different branches sharing one image hash produce a grouping conflict.
- Missing image hashes produce a grouping conflict.
- Conflicted rows remain explicitly accounted for and do not produce active artwork groups.

An exact shared image may group the same named card across sets or printings. This authorizes shared artwork facts only; it does not authorize inherited stamps, logos, text lines, borders, errors, finish, or other print markers.

## Singleton Rule

An eligible row with no safe merge partner becomes a valid singleton artwork group. Singleton status is not a failure and does not claim the artwork is globally unique.

## Stable IDs

Artwork group IDs are derived from:

- source image SHA-256;
- normalized canonical name; and
- prompt branch.

The ID must not depend on processing order, member order, eligibility tier, or current timestamp.

The group checksum includes:

- stable group ID;
- sorted member card-print IDs;
- sorted source fact-graph hashes;
- sorted source generated-row hashes;
- group tier;
- union of projection guards; and
- grouping authority/evidence.

## Group Tier And Guards

- A group is Tier A only when every member is Tier A.
- A group is Tier B when any member is Tier B.
- Group projection guards are the union of all member guards.
- Tier C never enters a group.

## Printing Boundary

Each membership records:

- `card_print_id`
- `artwork_group_id`
- `artwork_fact_source = own_image`
- `variant_image_status = available`
- `print_marker_evidence_status = observed_or_unreadable_or_not_observed`
- grouping authority and evidence
- source image hash
- source fact-graph hash
- source eligibility decision hash

V1 does not expand to card printings without a source image. Later canonical evidence may map those printings to a shared parent artwork without inheriting print markers.

## Required Artifacts

- `run_plan.json`
- `artwork_groups.jsonl`
- `artwork_group_memberships.jsonl`
- `artwork_group_conflicts.jsonl`
- `ARTWORK_GROUPING_RECONCILIATION.json`
- `ARTWORK_GROUPING_RECONCILIATION.md`
- `artifact_hashes.json`

## Acceptance Criteria

- Every Tier A/B card-print ID is represented exactly once as a group member or explicit conflict.
- No Tier C or Energy row becomes a group member.
- No card-print ID appears in multiple groups.
- No group spans multiple normalized names or branches.
- Every multi-member group has one exact image hash.
- Every singleton has stable authority and checksum.
- Conflicts are preserved, not silently dropped.
- Group and membership counts reconcile exactly.
- No provider, database, approval, embedding, projection, index, or public-read activity occurs.

## Collision And Split Audit

Before lock, audit:

- every cross-name or cross-branch image-hash collision;
- a deterministic sample of multi-member groups;
- a deterministic sample of singleton groups;
- repeated canonical names split across multiple image hashes; and
- membership uniqueness and checksums.

The audit judges grouping authority only. It does not approve descriptions.

## Next Gate

If grouping reconciles and the collision/split audit passes, freeze the artwork-group manifest. Then build deterministic Tier A/Tier B projection documents with every V1.4 guard enforced. Do not generate embeddings before lexical/structured projection evaluation passes.

## Related Contracts

- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`

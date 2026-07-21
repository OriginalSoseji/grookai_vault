# CARD_VISUAL_ARTWORK_GROUPING_V1_1

Status: Active - offline fail-closed grouping only

Date: 2026-07-21

## Purpose

Govern deterministic artwork grouping for the locked Card Visual Corpus V1. This version incorporates every boundary and invariant in `CARD_VISUAL_ARTWORK_GROUPING_V1` and narrowly repairs false identity splits caused by equivalent punctuation.

## Inputs And Scope

- Reconciled `CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4` decisions.
- Reconciled `CARD_VISUAL_CORPUS_SOURCE_INVENTORY_V1` rows.
- Tier A and Tier B rows only.
- Source image SHA-256, canonical name snapshot, prompt branch, and source hashes.

Tier C, Energy rows, source gaps, and incomplete source evidence cannot become group members.

## Grouping Authority

Rows may merge only when all three values agree:

1. exact source image SHA-256;
2. normalized canonical card name; and
3. prompt branch.

Authority remains `exact_image_hash_same_canonical_name_and_branch`. Visual similarity, embeddings, color, graph similarity, set/number, and card-name similarity cannot independently authorize a merge.

## Name Normalization

Normalization applies, in order:

- Unicode NFKC;
- lowercase;
- typographic apostrophes to ASCII apostrophe;
- repeated whitespace to one space; and
- terminal `-EX`/` EX` and `-GX`/` GX` to one space before the suffix.

No other hyphen is removed. Species tokens such as `Ho-Oh` and `Porygon-Z`, owner names, forms, and variant labels remain distinct.

The punctuation repair is safe only in conjunction with exact image-byte equality and branch equality. It does not merge rows on normalized names alone.

## Conservative Splits And Conflicts

- Same normalized name with different image hashes remains split.
- Different normalized names or branches sharing an image hash become explicit conflicts.
- Missing image, fact-graph, generated-row, eligibility-decision, name, or branch evidence becomes an explicit conflict.
- Upstream Energy rows accidentally marked eligible become explicit conflicts.
- Conflicts remain accounted for but do not create active groups.
- A row without a safe partner becomes a valid singleton group.

## Group And Printing Boundaries

- Tier A requires all members to be Tier A; otherwise the group is Tier B.
- Group guards are the union of member guards.
- Stable group IDs derive from image hash, normalized name, and branch.
- Group hashes cover sorted memberships and source hashes.
- Memberships record `artwork_fact_source = own_image` and `variant_image_status = available`.
- Shared artwork does not authorize inherited stamps, logos, text, borders, errors, finish, or print markers.
- `not_observed` does not mean absent.

## Acceptance Criteria

- Every eligible row is represented exactly once as a membership or conflict.
- No Tier C or Energy row is a member.
- No duplicate group, membership, or conflict ID exists.
- No membership/conflict overlap exists.
- Every group has one normalized name, branch, and image hash.
- Counts, member lists, stable IDs, and group hashes reconcile.
- Artifact hashes verify.
- No provider, database, approval, embedding, projection, index, or public-read activity occurs.

## Required Audit

Before lock, review every conflict and deterministic samples of:

- multi-member groups;
- singleton groups; and
- repeated normalized names split across image hashes.

The audit checks grouping authority and accounting, not description approval.

## Next Gate

After a reconciled run and passing grouping audit, freeze the artwork manifest. Then build deterministic Tier A/Tier B search projections. Do not generate embeddings before lexical and structured search evaluation passes.

## Related Contracts

- `docs/contracts/CARD_VISUAL_ARTWORK_GROUPING_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4.md`
- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`

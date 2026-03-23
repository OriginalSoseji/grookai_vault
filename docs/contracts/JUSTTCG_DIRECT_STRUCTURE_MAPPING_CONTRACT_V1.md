# JUSTTCG_DIRECT_STRUCTURE_MAPPING_CONTRACT_V1

Status: ACTIVE  
Type: Mapping Contract  
Scope: Safe automatic JustTCG mapping through direct JustTCG set structure and exact printed identity.

---

## Purpose

Define the only allowed automatic write path for the direct JustTCG structure lane.

This contract exists to keep Grookai inside a deterministic identity boundary:

- Grookai canonical identity remains Grookai-owned
- JustTCG is used as an external integration surface
- automatic writes require exact aligned-set proof plus exact printed identity proof
- all ambiguous and conflicting cases fail closed

---

## Upstream Boundary

Official JustTCG docs audited: [https://justtcg.com/docs](https://justtcg.com/docs)

Verified upstream rules used by this contract:

- `/sets` supports set discovery by `game` with optional `q`
- `/cards` supports identifier lookup and flexible search/filter lookup when no identifier is present
- identifier inputs take precedence over search inputs
- `include_null_prices` is ignored when `q` is used

Contract implication:

- automatic writes may use `/sets` for alignment discovery
- automatic writes may use `/cards` with aligned `set + number` retrieval
- global search/query results are retrieval aids only, never write authority

---

## Good Attachment Inputs vs Retrieval-Only Inputs

### Good for automatic writes

- explicit helper set alignment in `public.justtcg_set_mappings`
- exact automatic set alignment by unique raw or canonicalized set name
- exact printed number comparison
- exact normalized card-name comparison
- exact normalized rarity only as a final unique tie-break
- explicit helper identity rows in `public.justtcg_identity_overrides`

### Retrieval-only, not automatic write authority

- `q`
- `cardId`
- `variantId`
- `tcgplayerSkuId`
- `include_null_prices`
- `updated_after`
- set-wide browse results without exact number narrowing

### Banned automatic paths

- loose global search
- first-result wins
- substring-only set alignment
- fuzzy name similarity
- cross-set matching without aligned-set proof
- TCGplayer dependency
- overwriting existing conflicting active JustTCG ownership

---

## Set Alignment Rules

Automatic set alignment is allowed only when exactly one JustTCG set is proven by:

1. exact raw set-name equivalence, or
2. exact canonicalized set-name equivalence after stable prefix stripping

Manual set alignment is allowed only through:

- `public.justtcg_set_mappings`

Allowed helper statuses:

- `exact_aligned`
- `manual_helper_override`

Blocked alignment states:

- `absent_upstream`
- `ambiguous_upstream`

Automatic writes must stop if no aligned JustTCG set exists.

---

## Card Matching Rules

Inside an aligned set, automatic writes are allowed only when all of the following are true:

1. the Grookai row has no active `source='justtcg'` mapping
2. the aligned JustTCG set is known
3. a printed-number query is available
4. `/cards?game=pokemon&set=<justtcg_set_id>&number=<printed_number>&include_null_prices=true` returns candidate rows
5. exactly one row matches exact normalized name
6. if more than one exact-name row exists, exact normalized rarity reduces the set to one row
7. the resolved JustTCG card `id` is conflict-free

Allowed match outcomes:

- `exact_match`
- `override_match`

Blocked outcomes:

- `no_set_alignment`
- `no_candidate_rows`
- `ambiguous`
- `conflicting_existing`
- `already_correct`
- `error`

---

## Helper Storage Rules

### `public.justtcg_set_mappings`

Allowed purpose:

- integration-only Grookai-set -> JustTCG-set alignment

Not allowed:

- redefining Grookai canonical set identity
- using helper rows to justify fuzzy card matching

### `public.justtcg_identity_overrides`

Allowed purpose:

- integration-only JustTCG-side card name / number / rarity overrides for repeatable upstream modeling differences

Not allowed:

- changing canonical Grookai card identity
- broad family-level fuzzy matching
- automatic override creation without audit proof

---

## Conflict Rules

The worker must skip, never overwrite, if:

- the `card_print_id` already has a different active JustTCG external ID
- the resolved JustTCG external ID already belongs to a different `card_print_id`
- an aligned-set query produces multiple viable exact candidates
- a set alignment is ambiguous

The worker must preserve:

- uniqueness of `(source, external_id)`
- fail-closed behavior on all conflicts

---

## Dry-Run Requirements

Dry-run is mandatory and first-class.

Required counters:

- `inspected`
- `aligned_set_ready`
- `no_set_alignment`
- `no_candidate_rows`
- `exact_match`
- `override_match`
- `ambiguous`
- `conflicting_existing`
- `already_correct`
- `would_upsert`
- `upserted`
- `errors`

Dry-run must never write:

- `external_mappings`
- `justtcg_set_mappings`
- `justtcg_identity_overrides`

---

## Apply-Mode Write Rules

Apply mode must be explicit.

Write targets:

- `public.external_mappings`
- `public.justtcg_set_mappings` only for newly proven exact automatic set alignments

Write shape for `external_mappings`:

- `card_print_id`
- `source='justtcg'`
- `external_id=<validated JustTCG card id>`
- `active=true`
- `synced_at=now()`
- deterministic `meta`

Write shape for auto-promoted set alignments:

- `grookai_set_id`
- `justtcg_set_id`
- `justtcg_set_name`
- `alignment_status='exact_aligned'`
- deterministic `match_method`
- deterministic `notes`

Apply mode must never:

- auto-create new identity override rows
- overwrite conflicting active ownership
- elevate ambiguous set or card matches

---

## Rollback / Containment

Containment strategy:

- bounded dry-run first
- bounded apply second
- verify after every apply batch

Rollback target if needed:

- deactivate or delete only the rows inserted by `promote_justtcg_direct_structure_mapping_v1`
- do not mutate canonical identity tables
- do not delete helper rows unless the helper definition itself was wrong

---

## Verification Requirements

Post-apply verification must confirm:

- active JustTCG coverage increased
- no duplicate active JustTCG external IDs exist
- no `card_print_id` has multiple active JustTCG rows
- helper tables remain bounded and intentional

Required SQL is emitted by the worker and must be run after bounded applies.

---

## Final Rule

This lane is valid only because it is:

- set-scoped
- exact
- helper-backed where repeatable upstream mismatches exist
- fail-closed on ambiguity

If a family cannot meet that bar, it is not eligible for automatic writes.

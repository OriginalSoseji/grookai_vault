# JUSTTCG_REMAINING_MAPPING_CONTRACT_V1

Status: ACTIVE  
Type: Mapping Contract  
Scope: Safe automatic expansion of Grookai `source='justtcg'` coverage beyond the original tcgplayerId lane.

---

## Purpose

Define the only allowed automatic write paths for the remaining JustTCG mapping backlog.

This contract exists to keep Grookai inside a deterministic identity lane:

- upstream documented behavior first
- repo-grounded bridge evidence second
- dry-run before apply
- skip on ambiguity
- never overwrite active ownership blindly

---

## Upstream Capability Summary

Official JustTCG docs prove:

- `POST /cards` batch lookup is supported
- `tcgplayerId`, `cardId`, `variantId`, and `tcgplayerSkuId` are documented lookup inputs
- `number`, `include_null_prices`, and `updated_after` are documented `/cards` capabilities
- JustTCG card and variant IDs changed in 2025, and previously stored IDs became invalid

Contract implication:

- `tcgplayerId` is the safest automatic bridge input
- `cardId` and `variantId` are retrieval-capable, not automatic attachment ownership inputs in this pass
- search/filter capabilities remain probe-only unless separately proven deterministic

---

## Allowed Automatic Matching Inputs

### Allowed path 1: existing active `tcgplayer` bridge

Input requirements:

- active `external_mappings(source='tcgplayer')`
- no active `external_mappings(source='justtcg')`

Lookup contract:

- JustTCG `POST /cards`
- one lookup object per `tcgplayerId`
- deterministic match-back by returned `tcgplayerId`

Persistence:

- persist only the validated JustTCG card `id` into `external_mappings(source='justtcg')`

### Allowed path 2: deterministic TCGdex productId bridge

Input requirements:

- active `external_mappings(source='tcgdex')`
- no active `external_mappings(source='tcgplayer')`
- no active `external_mappings(source='justtcg')`
- full TCGdex payload exposes at least one populated `pricing.tcgplayer.*.productId`
- all populated productId buckets agree on exactly one distinct value

Lookup contract:

- derive transient `tcgplayerId` from TCGdex productId agreement
- call JustTCG `POST /cards` using that `tcgplayerId`
- deterministic match-back by returned `tcgplayerId`

Persistence:

- persist only the validated JustTCG card `id`
- do not persist the derived TCGplayer productId as JustTCG ownership

---

## Good Attachment Keys vs Retrieval-Only Inputs

### Good for automatic attachment writes

- active `tcgplayer` external mapping
- derived TCGplayer productId from TCGdex pricing agreement, but only as a transient bridge input
- validated returned JustTCG card `id`, but only after the deterministic bridge succeeds

### Retrieval-only / banned from automatic ownership writes

- `cardId`
- `variantId`
- `tcgplayerSkuId`
- search-query (`q`) matches
- exact set + number search results
- `include_null_prices`-expanded search results
- `updated_after`-filtered results

These may be used for:

- probes
- manual review
- future contract design

They may not be used for automatic apply-mode writes in this contract.

---

## Match Priority Order

1. Active `tcgplayer` mapping -> JustTCG `POST /cards`
2. Active `tcgdex` mapping with exactly one distinct `pricing.tcgplayer.*.productId` -> JustTCG `POST /cards`
3. Everything else is manual review / future contract work

There is no automatic priority path for:

- `cardId`
- `variantId`
- set + number search
- name normalization
- fuzzy similarity

---

## Stop Rules

Automatic writes must stop for a row if any of the following is true:

- no bridge input exists
- multiple distinct TCGplayer productIds are present in the TCGdex payload
- JustTCG returns no row for the validated bridge input
- JustTCG returns duplicate rows for the validated bridge input
- JustTCG returns a malformed row without a usable card `id`
- the target `card_print_id` already has a different active `justtcg` mapping
- the resolved JustTCG `external_id` is already attached to a different `card_print_id`
- any transport or parsing error occurs

Rows that hit a stop rule must be skipped, never force-written.

---

## Ambiguity Rules

Ambiguity is any of:

- duplicate JustTCG rows for one lookup bridge
- multiple distinct TCGplayer productIds from TCGdex pricing buckets
- more than one active conflicting JustTCG ownership candidate

Ambiguous rows are:

- dry-run visible
- apply-mode skipped
- ineligible for automatic writes until separately resolved

---

## Conflict Rules

The worker must never:

- overwrite an active conflicting `justtcg` mapping
- reassign a JustTCG external ID already owned by another `card_print_id`
- bypass the uniqueness of `(source, external_id)`

Conflict handling is always:

- classify
- log
- skip

---

## Dry-Run Requirements

Dry-run mode is mandatory and first-class.

Required behavior:

- no writes
- per-row disposition
- deterministic summary counts
- explicit upstream path used

Required summary fields:

- `inspected`
- `batch_ready`
- `no_bridge`
- `no_match`
- `ambiguous`
- `conflicting_existing`
- `already_correct`
- `upstream_path_tcgplayer`
- `upstream_path_cardid`
- `upstream_path_exact_identity`
- `would_upsert`
- `upserted`
- `errors`

---

## Apply-Mode Write Rules

Apply mode must be explicit.

Write target:

- `public.external_mappings`

Write shape:

- `card_print_id`
- `source='justtcg'`
- `external_id=<validated JustTCG card id>`
- `active=true`
- `synced_at=now()`
- deterministic `meta`

Required `meta` for the new TCGdex bridge path:

- `resolved_via`
- `tcgdex_external_id`
- `tcgplayer_external_id`
- `validated_variant_paths`
- `promoted_by`

Optional supporting `meta`:

- `justtcg_set_name`
- `justtcg_number`

---

## Rollback / Containment Strategy

Containment strategy is operational, not destructive:

1. stop apply mode immediately if ambiguity or conflict inflation appears
2. keep runs bounded by `--limit`
3. prefer dry-run before every widened apply
4. verify integrity after each bounded apply
5. do not mass-deactivate mappings unless a separate repair contract exists

---

## Unsupported / Unverified Paths

These are banned from automatic writes under this contract:

- undocumented GET pseudo-batching
- loose fuzzy name matching
- array-position assumptions
- search-only `set + number + name` automatic writes
- `q`-driven automatic writes
- `cardId`-only attachment writes
- `variantId`-only attachment writes
- `tcgplayerSkuId`-only attachment writes
- overwriting active conflicting mappings

---

## Verification Requirements

Every bounded apply run must verify:

- active JustTCG coverage increased or stayed stable as expected
- `external_mappings(source, external_id)` uniqueness remained intact
- no `card_print_id` gained multiple conflicting active `justtcg` rows
- previously valid mappings were not modified incorrectly

---

## Contract Conclusion

The remaining JustTCG backlog may be widened automatically only through deterministic bridges that satisfy both:

- official JustTCG behavior
- verified Grookai identity evidence

In this contract, that means:

- keep `tcgplayerId` as the JustTCG lookup contract
- allow TCGdex pricing productId agreement only as a transient bridge into that lookup
- persist only the resolved JustTCG card ID
- skip everything ambiguous, conflicting, or unverified

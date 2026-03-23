# JUSTTCG_UPSTREAM_CAPABILITY_AUDIT_V1

Status: ACTIVE  
Type: Upstream Capability Audit  
Scope: Official JustTCG lookup and identity capabilities relevant to remaining Grookai card-level mapping.

---

## Purpose

Audit official JustTCG capabilities before changing Grookai mapping behavior.

This audit answers four questions:

1. Which official JustTCG lookup paths exist today for card attachment?
2. Which documented inputs are safe to use as attachment bridges?
3. Which documented inputs are retrieval-only and must not become persistent ownership keys?
4. Which upstream ID changes create risk for long-term attachment semantics?

---

## Sources Audited

Official JustTCG sources only:

- `https://justtcg.com/docs`

The JustTCG docs page includes the live `/cards` reference plus the official changelog entries for:

- `include_null_prices`
- `number`
- `updated_after`
- set ID standardization
- card / variant ID breaking changes

---

## Verified Official Capabilities

### 1. `GET /cards` supports both identifier lookup and search/filter lookup

The official docs describe the cards endpoint as:

- a high-performance endpoint for card data
- usable when you already have identifiers
- also usable when you do not

The docs explicitly state:

- any identifier takes precedence over a search query
- "Card ID" retrieves all variants of a single card
- "Variant ID" is for exact variant retrieval

Verified documented `GET /cards` capabilities relevant to Grookai:

- `tcgplayerId`
- `tcgplayerSkuId`
- `cardId`
- `variantId`
- `printing`
- `condition`
- `include_price_history`
- `priceHistoryDuration`
- `include_statistics`
- `include_null_prices`

The official changelog on the same docs page also confirms:

- `number` was added to `/cards`
- `updated_after` was added to both `GET /cards` and `POST /cards`
- `/cards-search` was deprecated and merged into `/cards`

### 2. `POST /cards` batch lookup is officially supported

The docs explicitly define "Batch Card Lookup" as:

- `POST /cards`
- JSON array body
- one lookup object per requested card

Documented POST body inputs relevant to Grookai:

- `tcgplayerId`
- `tcgplayerSkuId`
- `cardId`
- `variantId`
- `updated_after`
- `printing`
- `condition`

The docs also state:

- avoid using multiple identifiers in the same object
- identifier precedence is `variantId > tcgplayerSkuId > tcgplayerId > mtgjsonId > scryfallId > cardId`
- `tcgplayerSkuId` disables printing / condition filters

### 3. Response fields expose card-level identity evidence

The official card object includes:

- `id`
- `name`
- `game`
- `set`
- `set_name`
- `number`
- `tcgplayerId`
- `rarity`
- `variants`

This is enough upstream evidence to:

- confirm a returned row's card-level identity surface
- inspect set / number / rarity for manual review
- compare returned `tcgplayerId` against a deterministic bridge input

It is not, by itself, enough to authorize automatic fuzzy writes from search results.

---

## Attachment-Key Eligibility

### Good for attachment bridge inputs

#### `tcgplayerId`

Verdict: `ALLOWED`

Why:

- officially documented on both `GET /cards` and `POST /cards`
- already proven in repo reality
- deterministic match-back is possible by returned `tcgplayerId`
- current Grookai worker already uses this safely

#### `tcgdex pricing.tcgplayer.*.productId` -> `tcgplayerId`

Verdict: `ALLOWED AS TRANSIENT BRIDGE INPUT`

Why:

- this is not a JustTCG input by itself
- but when TCGdex yields exactly one productId across populated pricing buckets, Grookai can safely feed that value into JustTCG's documented `tcgplayerId` lookup lane
- the persisted attachment key remains the JustTCG card `id`, not the transient productId

Important boundary:

- the productId is only a bridge input
- it must not become persisted source ownership for JustTCG

### Good for retrieval only, not safe as automatic attachment ownership

#### `cardId`

Verdict: `RETRIEVAL-ONLY / NOT ELIGIBLE FOR AUTOMATIC OWNERSHIP WRITES IN THIS PASS`

Why:

- officially documented for direct card retrieval
- useful for read-side follow-up when already known
- but the JustTCG docs also record breaking 2025 card ID changes and explicitly say previously stored IDs became invalid

Operational meaning for Grookai:

- `cardId` is useful for retrieval
- `cardId` is not trusted as a newly invented automatic bridge key unless a separate contract proves persistence safety for the specific write path

#### `variantId`

Verdict: `RETRIEVAL-ONLY / PRICING-ORIENTED / NOT A CARD-LEVEL ATTACHMENT KEY`

Why:

- officially documented for exact variant retrieval
- the docs explicitly position it as the fast path for specific variant information
- variant IDs are condition + printing scoped, not Grookai card-level identity scoped
- the same 2025 breaking ID note applies to variant IDs

Operational meaning for Grookai:

- valid for exact pricing/history retrieval
- not valid as automatic card-level attachment ownership

#### `tcgplayerSkuId`

Verdict: `RETRIEVAL-ONLY / VARIANT-ONLY / NOT A CARD-LEVEL ATTACHMENT KEY`

Why:

- officially documented for variant lookup
- docs explicitly note printing / condition filters do not apply when it is defined
- this is variant-grain identity, not Grookai card-print ownership identity

#### `set` + `number` (+ optional name / rarity review)

Verdict: `UNVERIFIED FOR AUTOMATIC WRITES`

Why:

- official docs prove `/cards` search/filter behavior and the changelog proves `number` is supported
- official card responses expose `set`, `set_name`, `number`, and `rarity`
- this is enough to support manual review or future probing
- but this audit did not prove a fully deterministic automatic write rule from search/filter results alone

Operational meaning for Grookai:

- allowed for audit probes only
- banned from automatic apply-mode writes in this pass

#### `include_null_prices=true`

Verdict: `SEARCH COVERAGE AID ONLY`

Why:

- official docs say it includes cards without pricing data
- docs also say it is ignored when `q` is present
- useful for wider read-side coverage when exploring whether cards exist upstream without prices
- not itself an identity bridge

#### `updated_after`

Verdict: `DELTA SYNC ONLY`

Why:

- official docs say it filters results by pricing freshness timestamp
- useful for incremental sync
- not an identity bridge

---

## Documented Stability / Change Risk

### Card / Variant ID risk

The official docs changelog records a breaking change in July 2025:

- card and variant `id` formats were changed
- rarity was added to the ID format
- previously stored IDs were declared invalid and had to be re-fetched or updated

This is the critical upstream boundary for Grookai:

- JustTCG `cardId` and `variantId` are valid retrieval identifiers
- but they are not automatically safe as independently invented bridge keys for new write paths unless Grookai already reached them through a stronger deterministic lane

### Set ID risk

The official docs changelog also states:

- set IDs were standardized in September 2025
- set IDs now include the game name
- `set_name` was added to the card object

Operational meaning:

- upstream set IDs are useful retrieval evidence
- they are not automatically safe as new persisted Grookai ownership keys without a separate bridge contract

---

## Usable-for-Mapping Table

| Capability | Officially documented | Good for automatic attachment writes? | Notes |
|---|---|---:|---|
| `POST /cards` batch | Yes | Yes | Only when input bridge is deterministic |
| `tcgplayerId` | Yes | Yes | Existing proven Grookai lane |
| `cardId` | Yes | No | Retrieval-capable, but upstream ID-breaking history makes it unsafe as a fresh write key in this pass |
| `variantId` | Yes | No | Variant/pricing retrieval only |
| `tcgplayerSkuId` | Yes | No | Variant retrieval only |
| `set` + `number` | Partially proven via docs + changelog | No | Probe/manual-review only in this pass |
| `include_null_prices` | Yes | No | Coverage aid only |
| `updated_after` | Yes | No | Delta sync only |

---

## Safe Candidate Ranking For Remaining Grookai Mapping

1. Existing deterministic `tcgplayerId` bridge
2. Deterministic `tcgdex pricing.tcgplayer.productId` agreement -> JustTCG `tcgplayerId`
3. Exact set + number + normalized identity probe path for future manual review only
4. Any other path only after separate upstream proof and repo contract

---

## Hard No-Go List

The following are not eligible for automatic writes in this pass:

- undocumented GET pseudo-batching
- response-order assumptions
- `q`-driven fuzzy write paths
- search-result automatic writes based only on set / number / name resemblance
- persistence of `variantId`
- persistence of `tcgplayerSkuId`
- treating newly discovered JustTCG `cardId` values as independently trusted bridge keys without stronger upstream-to-repo proof

---

## Conclusion

Official JustTCG documentation proves:

- `POST /cards` batch is real and supported
- `tcgplayerId` remains the safest documented card-level bridge input
- `cardId` and `variantId` are powerful retrieval identifiers but must be separated from automatic attachment-key ownership
- `set`, `set_name`, `number`, `rarity`, `include_null_prices`, and `updated_after` are useful audit and retrieval aids, not automatic write authorization

For Grookai's remaining backlog, the safest new documented path is:

- keep `tcgplayerId` as the JustTCG lookup contract
- widen bridge discovery upstream of that lookup, not downstream of it
- persist only validated JustTCG card IDs after deterministic resolution

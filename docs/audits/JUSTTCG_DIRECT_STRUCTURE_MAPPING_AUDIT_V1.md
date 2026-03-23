# JUSTTCG_DIRECT_STRUCTURE_MAPPING_AUDIT_V1

Status: ACTIVE  
Type: Upstream + Repo Audit  
Scope: Audit and proof for direct JustTCG set-scoped identity mapping without using TCGplayer as the central attachment lane.

---

## Purpose

Prove whether Grookai can map more of the remaining JustTCG backlog by using JustTCG's own structure directly:

1. align Grookai sets to JustTCG sets
2. retrieve candidates inside those aligned sets
3. auto-write only exact unique matches
4. use explicit Grookai-side helper storage for repeatable JustTCG modeling differences

This audit is the authority for the direct-structure worker introduced in this pass.

---

## Upstream Capability Summary

Official JustTCG docs audited: [https://justtcg.com/docs](https://justtcg.com/docs)

Verified upstream behavior:

- `/sets` supports set discovery by `game` with optional `q`
- `/cards` supports identifier lookup and flexible search/filter lookup when no identifier is present
- identifier inputs take precedence over search/filter inputs
- set-scoped retrieval is supported cleanly through `/cards` filters such as `set` and `number`
- `include_null_prices` is ignored when `q` search is used

Live repo-grounded probes against the documented API confirmed:

- `GET /sets?game=pokemon` returns the full Pokémon set catalog and set IDs usable for alignment discovery
- `GET /cards?game=pokemon&set=<justtcg_set_id>&number=<printed_number>&include_null_prices=true` returns bounded candidate rows suitable for exact identity comparison
- set-wide `GET /cards?set=<id>` paging exists, but it is not required for automatic writes and is too loose for write authority

### Safe Identity Evidence

These fields are strong enough to support exact matching once a set is aligned:

- JustTCG set `id`
- JustTCG set `name`
- card `number`
- card `name`
- card `rarity` only as an exact tie-breaker

### Retrieval-Only Helper Fields

These are useful for probing or manual review, but not automatic write authority by themselves:

- `q`
- `cardId`
- `variantId`
- `tcgplayerSkuId`
- `include_null_prices`
- `updated_after`

### Banned Automatic Write Inputs

- loose global search results
- first-result wins
- substring-only set alignment
- cross-set card matching
- undocumented search behavior
- TCGplayer bridge dependence in this lane

---

## Starting Backlog For This Pass

Baseline from the hard remainder after the exhausted tcgplayer and tcgdex bridge lanes:

- active JustTCG coverage before this pass: `14,142 / 22,239`
- hard remainder before this direct-structure pilot: `8,097`

The old ceiling audit established that the remainder is concentrated in:

- promo families
- Pocket family sets
- trainer kit / best-of-game families
- special numbering families

This pass tested whether that remainder is materially reducible through direct JustTCG structure.

---

## Set Alignment Findings

Weighted by remaining unmapped card_print rows, the direct-structure audit produced this set-alignment baseline:

| Alignment status | Rows | Meaning |
|---|---:|---|
| `exact-aligned` | `4,419` | Grookai set name aligns uniquely to one JustTCG set by exact raw or canonicalized name |
| `probable-helper-override` | `1,653` | A repeatable family mismatch exists and can be solved by explicit helper storage |
| `absent-upstream` | `1,993` | No JustTCG set object was found |
| `ambiguous-upstream` | `32` | More than one upstream set candidate exists; automatic writes are not allowed |

Interpretation:

- a large share of the old ceiling is not an upstream dead-end
- the biggest reducible bucket is now direct set alignment, not another tcgplayer bridge
- helper storage is justified because JustTCG models several families with stable, repeatable family names that differ from Grookai

### Representative Set Alignment Examples

#### Exact-aligned

- `sv02` | `Paldea Evolved` -> `sv02-paldea-evolved-pokemon`
- `sv04` | `Paradox Rift` -> `sv04-paradox-rift-pokemon`
- `sv08` | `Surging Sparks` -> `sv08-surging-sparks-pokemon`
- `sv10` | `Destined Rivals` -> `sv10-destined-rivals-pokemon`

#### Manual helper override candidates

- `swshp` | `SWSH Black Star Promos` -> `swsh-sword-shield-promo-cards-pokemon`
- `smp` | `SM Black Star Promos` -> `sm-promos-pokemon`
- `svp` | `SVP Black Star Promos` -> `sv-scarlet-violet-promo-cards-pokemon`
- `bwp` | `BW Black Star Promos` -> `black-and-white-promos-pokemon`
- trainer-kit split families such as `tk-bw-e`, `tk-bw-z`, `tk-dp-m`, `tk-dp-l`, `tk-xy-p`, `tk-sm-l`

#### Absent upstream

- `A1` | `Genetic Apex`
- `A2` | `Space-Time Smackdown`
- `A4` | `Wisdom of Sea and Sky`
- `B1` | `Mega Rising`

Representative no-set-alignment row:

- `2918cc36-7194-4c96-9935-7d7be2fe36e2` | `Bulbasaur` | `A1` | `Genetic Apex` | `001`

#### Ambiguous upstream

- `tk-ex-latia`
- `tk-ex-latio`
- `swsh1`
- `ecard1`

These remain banned from automatic set alignment.

---

## Direct Card Match Findings Inside Aligned Sets

Using aligned sets plus exact printed identity, the audit found this card-level baseline:

| Card result | Rows |
|---|---:|
| `aligned_set_ready` | `6,072` |
| `exact_match` | `4,674` |
| `ambiguous` | `928` |
| `no_candidate_rows` | `446` |
| `conflicting_existing` | `24` |
| `errors` | `0` |

Additional proof:

- `4,672` exact matches resolved on exact normalized `name + number`
- `2` more required exact rarity tie-break after exact name+number narrowing
- JustTCG rate limiting was survivable after adding 429 retry handling in `backend/pricing/justtcg_client.mjs`

### Representative Exact Match

- `0008eb85-aa11-4afd-926d-16b81f6eb258` | `GV-PK-PR-SV-067` | `Roaring Moon ex` | `svp` | `067`
- matched JustTCG card: `pokemon-sv-scarlet-violet-promo-cards-roaring-moon-ex-067-promo`

### Representative Override-Assisted Match

Explicit identity override seeded:

- `GV-PK-PR-SW-SWSH242` | `Comfey`
- Grookai printed identity: `Comfey` / `SWSH242`
- JustTCG candidate row: `Comfey - SWSH242 (Prerelease)`
- direct probe proved the override target exists:
  `GET /cards?game=pokemon&set=swsh-sword-shield-promo-cards-pokemon&number=SWSH242&include_null_prices=true`

This is why `justtcg_identity_overrides` is justified.

### Representative Ambiguous Match

- `018a19f9-b60c-42b4-a83f-31d73f80c192` | `GV-PK-PR-SV-090` | `Metang` | `svp` | `090`
- candidates:
  - `Metang - 090 (Prerelease)`
  - `Metang - 090 (Prerelease) [Staff]`

Automatic write is correctly banned.

### Representative No-Candidate Match

- `068cdf37-7d05-4b40-8f49-a50ff7e8968c` | `GV-PK-PR-SV-106` | `Pikachu ex` | `svp` | `106`
- aligned set exists, but `set + number` returned zero JustTCG cards

### Representative Conflict

- `02eb2e6a-e65a-4d8e-8b5e-8f23b868c53f` | `GV-PK-LOR-98` | `Hariyama` | `swsh11` | `098`
- matched JustTCG card: `pokemon-swsh11-lost-origin-hariyama-uncommon`
- that JustTCG external ID was already owned by another `card_print_id`

Automatic write is correctly banned.

---

## Helper Storage Justified By This Audit

This pass introduced two integration-only helper tables:

### `public.justtcg_set_mappings`

Purpose:

- store explicit Grookai-set -> JustTCG-set alignment
- preserve canonical Grookai identity while solving family mismatches locally

Seeded in this pass:

- Black Star promo families (`swshp`, `smp`, `svp`, `xyp`, `bwp`, `dpp`, `np`)
- trainer kit families with repeatable family-name mismatches

### `public.justtcg_identity_overrides`

Purpose:

- store explicit JustTCG-side number/name/rarity guidance for cards that JustTCG models with suffixes or specialized naming

Seeded in this pass:

- `GV-PK-PR-SW-SWSH242` -> `Comfey - SWSH242 (Prerelease)`
- `GV-PK-PR-SV-167` -> `Flareon - 167 (Cosmos Holo)`

These helpers are integration storage only. They do not alter canonical Grookai identity.

---

## Worker Proof

Implemented worker:

- `backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs`

Supporting probe:

- `backend/pricing/test_justtcg_set_number_probe_v1.mjs`

### Dry-run proof

`--dry-run --limit=50`

- `inspected: 50`
- `aligned_set_ready: 50`
- `exact_match: 37`
- `ambiguous: 11`
- `no_candidate_rows: 2`
- `would_upsert: 37`
- `errors: 0`

`--dry-run --limit=500`

- `inspected: 500`
- `aligned_set_ready: 500`
- `exact_match: 354`
- `ambiguous: 127`
- `no_candidate_rows: 19`
- `would_upsert: 354`
- `errors: 0`

### Bounded apply proof

`--apply --limit=100`

- `inspected: 100`
- `exact_match: 68`
- `ambiguous: 27`
- `no_candidate_rows: 5`
- `upserted: 68`
- `errors: 0`

Post-pilot verification:

- active JustTCG coverage: `14,210 / 22,239`
- coverage: `63.90%`
- remaining without JustTCG: `8,029`
- active helper set rows: `20`
- active identity override rows: `2`
- conflicting active JustTCG external IDs: `0`
- card_prints with multiple active JustTCG mappings: `0`

---

## Conclusion

This audit proves the next JustTCG mapping lane should be JustTCG-structure-first, not tcgplayer-first.

What is now proven:

- direct JustTCG set alignment is materially real
- exact set-scoped card matching is materially real
- helper set storage is justified
- helper identity override storage is justified
- automatic writes can remain fail-closed and deterministic

What remains out of scope for automatic writes:

- absent-upstream families
- ambiguous set families
- ambiguous prerelease/staff families without explicit override rows
- conflict ownership cases

Recommendation:

- keep expanding this direct structure lane only through exact aligned sets and explicit helper storage
- do not invent another general tcgplayer bridge lane
- only add more helper rows where the family mismatch is repeatable and materially large

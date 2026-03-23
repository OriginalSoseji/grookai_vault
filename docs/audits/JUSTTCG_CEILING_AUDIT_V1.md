# JUSTTCG_CEILING_AUDIT_V1

Status: ACTIVE  
Type: Ceiling Audit  
Scope: Explains why active JustTCG mapping coverage now plateaus at `14,142 / 22,239` after all currently proven deterministic lanes.

---

## Purpose

Turn the remaining JustTCG backlog into a ceiling explanation with proof.

This audit answers:

- why coverage stops near `~14k`
- whether any safe automatic writes remain in the currently proven lanes
- what the hard remainder is actually made of
- whether the ceiling is primarily:
  - upstream coverage
  - bridge availability
  - identity-shape ambiguity
  - or a mix

---

## Inputs Audited

Repo / worker truth:

- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
- `backend/pricing/promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs`
- `backend/pricing/justtcg_client.mjs`
- `docs/audits/JUSTTCG_REMAINING_MAPPING_AUDIT_V1.md`
- `docs/contracts/JUSTTCG_REMAINING_MAPPING_CONTRACT_V1.md`

Live DB / API truth:

- `public.card_prints`
- `public.external_mappings`
- `public.card_print_traits`
- live TCGdex full-card payloads for all remaining `tcgdex`-only rows
- live JustTCG `POST /cards` batch lookups for all remaining deterministic `tcgplayerId` candidates

---

## Verified Baseline

Current live state at audit time:

- active JustTCG mappings: `14,142`
- total `card_prints`: `22,239`
- current remaining without active JustTCG: `8,097`
- current coverage: `63.59%`

Critical result from the full ceiling audit:

- additional safe upserts still available through the currently proven deterministic lanes: `0`
- hard remainder after exhausting those lanes: `8,097`
- effective coverage ceiling for the currently proven lanes: still `63.59%`

Meaning:

The plateau is real for the currently proven automatic paths.

---

## Full Remaining Composition

### Current remaining buckets

| Bucket | Count |
|---|---:|
| active `tcgplayer` present | `38` |
| active `tcgdex` present, no active `tcgplayer` | `7,828` |
| neither active `tcgplayer` nor active `tcgdex` | `231` |
| total remaining | `8,097` |

### Hard remainder after exhausting all currently proven deterministic lanes

The full audit re-ran the proven matching logic over every remaining row.

Result:

| Hard bucket | Count | Interpretation |
|---|---:|---|
| `tcgdex_no_pricing_productid` | `7,828` | TCGdex exists, but the full TCGdex payload exposes no `pricing.tcgplayer.*.productId`, so the proven bridge cannot even start |
| `no_tcgplayer_no_tcgdex` | `231` | no deterministic bridge exists anywhere in current repo truth |
| `tcgplayer_upstream_duplicate` | `37` | deterministic `tcgplayerId` exists, but JustTCG returns duplicate rows for that id |
| `tcgplayer_upstream_missing` | `1` | deterministic `tcgplayerId` exists, but JustTCG returns no row |
| total hard remainder | `8,097` | no further safe auto-write remains in the proven lanes |

What did **not** appear in the full audit:

- `tcgdex_ambiguous_pricing_productid = 0`
- `tcgdex_bridge_upstream_duplicate = 0`
- `tcgdex_bridge_upstream_missing = 0`
- `tcgdex_bridge_conflicting_existing = 0`
- `current_tcgdex_bridge_would_upsert = 0`
- `current_tcgplayer_would_upsert = 0`

This matters because it proves the ceiling is not caused by a worker leaving easy deterministic writes on the table.

---

## Why Coverage Plateaus Near ~14k

The plateau is caused by a mix, but the mix is overwhelmingly one-sided:

1. **Bridge ceiling / coverage boundary dominates**
   - `8,059 / 8,097 = 99.53%` of the hard remainder is blocked before a safe JustTCG write can happen
   - that bucket is:
     - `7,828` rows with `tcgdex` but no TCGplayer productId in the full TCGdex payload
     - `231` rows with neither `tcgplayer` nor `tcgdex`

2. **Identity-shape / manual-review ceiling is small**
   - `37 / 8,097 = 0.46%`
   - those rows have deterministic `tcgplayerId` inputs, but JustTCG returns duplicate rows for the same id

3. **Pure upstream absence is tiny**
   - `1 / 8,097 = 0.01%`
   - that row has a valid `tcgplayerId`, but JustTCG returns nothing

Conclusion:

The current ceiling is **not** a remaining worker ceiling.  
It is primarily a **bridge ceiling**, with strong signs of an **upstream coverage ceiling in specific families**, plus a very small **duplicate-resolution/manual-review lane**.

---

## Top 25 Remaining Set Codes

Current remaining and hard remainder are identical, so this table applies to both.

| Rank | Set Code | Count |
|---|---|---:|
| 1 | `B1` | `331` |
| 2 | `swshp` | `304` |
| 3 | `A1` | `286` |
| 4 | `sv02` | `279` |
| 5 | `sv04` | `266` |
| 6 | `sv08` | `252` |
| 7 | `smp` | `248` |
| 8 | `sv4pt5` | `245` |
| 9 | `sv10` | `244` |
| 10 | `A4` | `241` |
| 11 | `A3` | `239` |
| 12 | `sv03` | `230` |
| 13 | `sv06` | `226` |
| 14 | `svp` | `220` |
| 15 | `sv05` | `218` |
| 16 | `xyp` | `214` |
| 17 | `A2` | `207` |
| 18 | `sv03.5` | `207` |
| 19 | `sv09` | `190` |
| 20 | `sv8pt5` | `180` |
| 21 | `sv07` | `175` |
| 22 | `sv10.5w` | `173` |
| 23 | `sv10.5b` | `172` |
| 24 | `pl3` | `151` |
| 25 | `me02` | `130` |

Concentration:

- top 10 set codes account for `2,696 / 8,097 = 33.30%`
- top 25 set codes account for `5,628 / 8,097 = 69.51%`

Interpretation:

The remainder is **not random**.  
It is materially concentrated in specific set families rather than being evenly spread.

---

## Top Numbering Pattern Breakdown

| Pattern | Count |
|---|---:|
| `plain_numeric` | `5,019` |
| `leading_zero_numeric` | `1,620` |
| `alpha_prefix_numeric` | `1,000` |
| `shiny_vault` | `216` |
| `trainer_gallery` | `120` |
| `galarian_gallery` | `70` |
| `other_alphanumeric` | `37` |
| `numeric_suffix_alpha` | `14` |
| `shining_subset` | `1` |

Interpretation:

- the hard remainder is not dominated by malformed numbering
- most rows still use normal-looking printed numbers
- however, non-standard families remain material:
  - `alpha_prefix_numeric = 1,000`
  - `shiny_vault = 216`
  - `trainer_gallery = 120`
  - `galarian_gallery = 70`

This supports a “special-subset / promo / coverage-family” explanation more than a generic parser failure explanation.

---

## Set-Family Concentration

| Set family | Count |
|---|---:|
| `standard_or_other` | `4,764` |
| `pocket_family` | `1,478` |
| `promo` | `1,271` |
| `ex_era_family` | `240` |
| `trainer_kit_best_of_game` | `187` |
| `mega_evolution_family` | `131` |
| `cosmic_eclipse_family` | `26` |

What this means:

- `pocket_family + promo + trainer_kit_best_of_game = 2,936` rows
- those families alone explain over one-third of the hard remainder
- the ceiling is heavily shaped by family-level coverage/bridge gaps, not just isolated one-off misses

---

## Likely Absent vs Likely Bridge-Missing

### Likely bridge-missing

Backed by direct evidence:

- `7,828` rows have active `tcgdex`, but **no** `pricing.tcgplayer.*.productId` in the full TCGdex card payload
- `231` rows have **no** active `tcgplayer` and **no** active `tcgdex`

Count:

- `8,059`

Share of hard remainder:

- `99.53%`

Interpretation:

These rows are blocked by missing deterministic bridge inputs.  
Some of these families may also be outside JustTCG coverage, but the current repo-safe automatic lanes cannot prove that yet because they never reach a deterministic JustTCG lookup.

### Likely absent from JustTCG

Backed by direct evidence:

- `1` row has a valid deterministic `tcgplayerId`, and JustTCG returned no card

Count:

- `1`

Share of hard remainder:

- `0.01%`

### Duplicate-resolution / manual-review lane

Backed by direct evidence:

- `37` rows have deterministic `tcgplayerId`, but JustTCG returned duplicate rows for the same id

Count:

- `37`

Share of hard remainder:

- `0.46%`

Interpretation:

This is not a bridge problem.  
It is a small identity-shape ambiguity lane that would require duplicate resolution or manual review, not a blind automatic writer.

---

## Representative Sample Rows By Bucket

### Bucket: `tcgdex_no_pricing_productid`

These rows have active `tcgdex` but no productId anywhere in the full TCGdex pricing object.

- `0008eb85-aa11-4afd-926d-16b81f6eb258` | `GV-PK-PR-SV-067` | `Roaring Moon ex` | `svp` | `SVP Black Star Promos` | `067`
- `000a7ecc-38ed-4006-8cac-4a888521b644` | `GV-PK-LOT-182` | `Lusamine ◇` | `sm8` | `Lost Thunder` | `182`
- `00121e16-72ac-47b4-8e8e-8f23a4176f76` | `GV-PK-BLK-101` | `Panpour` | `sv10.5b` | `Black Bolt` | `101`
- `0012ad37-0f0a-4b16-9a25-4f57cfd5c689` | `GV-PK-PR-SM-SM125` | `Naganadel-GX` | `smp` | `SM Black Star Promos` | `SM125`
- `001cad3b-66e9-493d-ba11-1fc6569adc5c` | `GV-PK-PR-XY-XY83` | `Arceus` | `xyp` | `XY Black Star Promos` | `XY83`

Why they miss:

- full TCGdex payload contains no deterministic TCGplayer productId
- current proven automatic lanes cannot attach them safely

### Bucket: `tcgplayer_upstream_duplicate`

These rows already have deterministic `tcgplayerId`, but JustTCG returns duplicate rows for the same id.

- `05aee438-0f6c-464d-a1ba-fc65a8709a18` | `GV-PK-CEC-252` | `Volcarona-GX` | `sm12` | `Cosmic Eclipse` | `252` | `tcgplayer=201641`
- `16cae8a3-2d4e-4bd8-8ce7-df2c51d4a570` | `GV-PK-HP-111` | `Mew` | `ex13` | `Holon Phantoms` | `111` | `tcgplayer=87400`
- `2fdcfbf3-2633-4332-bb0d-6b4b67c78a17` | `GV-PK-BUS-148` | `Golisopod-GX` | `sm3` | `Burning Shadows` | `148` | `tcgplayer=138296`
- `354579d2-abfb-495f-be37-bf8376fc48ec` | `GV-PK-CEC-260` | `Naganadel & Guzzlord-GX` | `sm12` | `Cosmic Eclipse` | `260` | `tcgplayer=201622`
- `3bae2141-b45e-4691-8d41-14ba783f1b85` | `GV-PK-CEC-253` | `Blastoise & Piplup-GX` | `sm12` | `Cosmic Eclipse` | `253` | `tcgplayer=201612`

Why they miss:

- automatic writes must stop on upstream duplicate returns

### Bucket: `tcgplayer_upstream_missing`

- `06263541-5358-4bb4-98e4-e7f18558f87b` | `GV-PK-TK-tk-xy-b-2` | `Metal Energy` | `tk-xy-b` | `XY trainer Kit (Bisharp)` | `2` | `tcgplayer=98148`

Why it misses:

- deterministic `tcgplayerId` exists
- JustTCG returns no matching card

### Bucket: `no_tcgplayer_no_tcgdex`

- `0146aa14-0968-47bb-a219-7178812932c9` | `GV-PK-SK-H21` | `Nidoqueen` | `ecard3` | `Skyridge` | `H21`
- `01c5da32-bee4-47a8-9fa4-2b11b967c2d4` | `GV-PK-CEL-145CC` | `Garchomp C LV.X` | `cel25` | `Celebrations: Classic Collection` | `145`
- `02a9c42c-5303-4d7c-85c9-886497097710` | `gv_id = null` | `Garganacl` | `legacy_orphan` | `Legacy Orphan (Quarantine)` | `84`
- `02eb2e6a-e65a-4d8e-8b5e-8f23b868c53f` | `GV-PK-LOR-98` | `Hariyama` | `swsh11` | `Lost Origin` | `98`
- `03a8bb19-b9c2-42df-b18c-1671746030ab` | `GV-PK-BP-7` | `Dark Venusaur` | `bp` | `Best of Game` | `7`

Why they miss:

- there is no deterministic bridge input at all in current repo truth

---

## Legacy / Malformed Tail

This exists, but it is small.

Verified counts:

- `legacy_orphan` rows in the current remaining: `16`
- rows with missing `set_code` in the current remaining: `14`

Interpretation:

Malformed / quarantined legacy data is real, but it is **not** the primary explanation for the ~14k ceiling.

---

## What The Ceiling Is, Precisely

### Not the cause

- not a worker bug in the currently proven lanes
- not a leftover batch of easy deterministic writes
- not primarily malformed numbering
- not primarily duplicate conflict inflation

### Primary cause

The current ceiling is a **bridge ceiling**, heavily shaped by **coverage-family gaps**:

- the vast majority of remaining rows cannot produce a deterministic TCGplayer bridge input
- the biggest concentrations are in:
  - Pocket-family sets
  - promo families
  - modern special subsets
  - trainer-kit / Best of Game style families

### Secondary cause

A small but real **identity-shape ceiling** remains:

- `37` rows where JustTCG duplicates a deterministic `tcgplayerId`

### Minimal direct upstream absence

- only `1` row is directly proven absent via a deterministic JustTCG lookup

---

## Recommendation

### Primary recommendation

**Do not build another automatic write path yet.**

Reason:

- the currently proven deterministic lanes are fully exhausted
- the hard remainder is now well-defined
- no materially large bucket is already proven bridgeable from current repo truth

### What to do instead

1. **Treat the current automatic ceiling as real**
   - `14,142` covered
   - `8,097` hard remaining

2. **If more coverage is still a product goal, probe special-subset families before writing**
   - especially:
     - Pocket-family sets
     - promo families
     - trainer-kit / Best of Game
   - but only through an upstream-documented, deterministic audit path first

3. **Keep the duplicate lane separate**
   - the `37` duplicate `tcgplayerId` rows are a duplicate-resolution/manual-review problem
   - they should not be mixed into automatic bridge expansion

### Explicit non-recommendation

Do **not** recommend a new automatic apply-mode worker from this audit alone.

This ceiling audit proves a hard remainder, but it does **not** prove a new materially large deterministic write bucket.

---

## Verification Snapshot

Verified during this audit:

- current remaining without JustTCG: `8,097`
- current safe writes left in proven lanes: `0`
- hard remainder after exhausting those lanes: `8,097`
- current coverage: `63.59%`

Supporting SQL:

```sql
select count(*) as covered_justtcg
from public.external_mappings
where source = 'justtcg'
  and active = true;

select count(*) as total_card_prints
from public.card_prints;

select
  covered.covered_justtcg,
  totals.total_card_prints,
  round(100.0 * covered.covered_justtcg / nullif(totals.total_card_prints, 0), 2) as coverage_pct,
  totals.total_card_prints - covered.covered_justtcg as remaining_without_justtcg
from (
  select count(*)::numeric as covered_justtcg
  from public.external_mappings
  where source = 'justtcg'
    and active = true
) covered
cross join (
  select count(*)::numeric as total_card_prints
  from public.card_prints
) totals;
```

---

## Final Answer

JustTCG mapping stops around `~14k` because the currently proven automatic bridges are exhausted.

The hard remainder is overwhelmingly made of rows that **cannot produce a deterministic bridge input at all** under current repo truth:

- `7,828` have `tcgdex` but no TCGplayer productId anywhere in the full TCGdex payload
- `231` have neither `tcgplayer` nor `tcgdex`
- only `37` are duplicate-return manual-review cases
- only `1` is directly proven absent from JustTCG

So the current ceiling is real, and it is primarily a **bridge / coverage-family ceiling**, not a remaining deterministic worker opportunity.

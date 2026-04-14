# JUSTTCG_BATTLE_ACADEMY_STALE_MAPPING_CONTRACT_AUDIT_V1

## Context

The stale remap audit split the remaining JustTCG bridge residue into two families:

- `2` Battle Academy 2022 Yamper rows
- `1` Classic Collection row

This artifact handles only the Battle Academy subset:

- `pokemon-battle-academy-2022-yamper-074-202-58-pikachu-stamped-promo`
- `pokemon-battle-academy-2022-yamper-074-202-1-pikachu-stamped-promo`

Both rows currently point at the same non-canonical `A4a` Yamper placeholder and both appear to have a clean underlying canonical match to `GV-PK-SSH-74`.

That apparent match is exactly what this contract forbids.

## Identity Conflict Explanation

### What naive logic sees

For both rows:

- raw printed name normalizes to `yamper`
- raw printed number normalizes to `74`
- the strongest underlying canonical candidate is:
  `GV-PK-SSH-74 / Yamper / swsh1`

Under naive bridge logic, that looks like a safe exact reuse.

### Why that logic is wrong

The raw source labels are not ordinary set prints:

- `Yamper - 074/202 (#1 Pikachu Stamped)`
- `Yamper - 074/202 (#58 Pikachu Stamped)`

Those labels carry Battle Academy overlay identity evidence.

What they prove:

- the row belongs to Battle Academy 2022 product context
- the row is not simply the underlying Sword & Shield Yamper
- the row is not a canonical `card_print` in the existing set model
- the `#1` and `#58` deck-stamp markers do not belong in `card_print` identity, but they do prove this is a product-layer artifact rather than a reusable canonical print

So while the underlying `swsh1` card is real, these JustTCG rows are not lawful canonical remap targets.

## Root Cause

Formal root cause:

- `BATTLE_ACADEMY_OVERLAY_IDENTITY_MISSING`

Characteristics:

- deck-stamped product row
- product-teaching/deck context
- repeated underlying card identity reused across a curated product
- not part of standard canonical set numbering
- not representable as a lawful `card_print` remap

## Identity Contract

A Battle Academy-derived JustTCG row is not:

- a canonical `card_print`
- a canonical variant of an existing `card_print`
- a suffix-based identity lane
- a safe cross-set remap target

For bridge purposes it is:

- a product-layer artifact
- carrying non-canonical overlay evidence
- outside the lawful `card_print` remap surface

Therefore the bridge contract is:

- `classification = NON_CANONICAL_UPSTREAM`
- `reason = BATTLE_ACADEMY_OVERLAY_IDENTITY_MISSING`
- `allowed_action = DO_NOT_REMAP`

## Formal System Rules

1. Battle Academy rows must never remap to canonical `card_prints`.
2. Cross-set identity reuse is prohibited even when name + number agree.
3. Name + number matching alone is insufficient when product-layer overlay evidence is present.
4. Deck-slot or deck-stamp identifiers are not canonical `card_print` identity.
5. Battle Academy JustTCG rows belong in `NON_CANONICAL_UPSTREAM` or a future product-layer system, not in canonical bridge remap.

## Why Remap Is Unsafe

If either row were remapped to `GV-PK-SSH-74`:

- Battle Academy product context would be collapsed into ordinary Sword & Shield canon
- two distinct upstream Battle Academy surfaces would be forced into one canonical bridge target
- the bridge would encode product-layer noise as canonical truth

That violates the core rule that `card_prints` is canonical printed-card truth, not product packaging or teaching-deck overlay truth.

## Future System Implications

Lawful future options:

### Option A

- keep these rows permanently `NON_CANONICAL_UPSTREAM`

### Option B

- design a separate `PRODUCT_IDENTITY_LAYER` outside `card_prints`

### Option C

- route them into warehouse/manual review if a future product-overlay system is needed

What is not allowed:

- direct canonical remap
- `gv_id` assignment
- variant-key overloading
- cross-set canonical reuse

## Result

This contract is now explicit:

- `battle_academy_row_count = 2`
- `classification = NON_CANONICAL_UPSTREAM`
- `contract_defined = yes`
- `canonical_mapping_allowed = no`

Next lawful stale-bridge unit:

- `JUSTTCG_CLASSIC_COLLECTION_STALE_MAPPING_CONTRACT_AUDIT_V1`

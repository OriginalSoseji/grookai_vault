# STAMPED_IDENTITY_RULE_V1

Status: ACTIVE  
Type: Printed Identity Rule  
Scope: stamped / overlay / event-marked cards that Grookai treats as separate canonical identities

## Authority

This rule aligns with:

- `docs/GROOKAI_RULEBOOK.md`
- `docs/contracts/PRINTED_IDENTITY_MODEL_V1.md`
- `docs/contracts/PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1.md`
- `docs/contracts/WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1.md`
- `docs/contracts/SET_CLOSURE_PLAYBOOK_V1.md`
- `docs/contracts/REPRESENTATIVE_IMAGE_CONTRACT_V1.md`

Core invariants:

- Grookai owns canonical truth.
- No guessing.
- Finish-only rows do not become canon rows.
- Identity-bearing stamped rows must not collapse into base canon rows.
- Source evidence may justify a split, but raw source slug text is never canonical truth by itself.

## 1. What Is A Stamped Identity?

A stamped card is a separate canonical identity only when the printed card carries
an identity-bearing overlay, stamp, or event marker that Grookai treats as a
printed identity delta rather than a finish effect.

Examples of lawful stamped identity deltas in V1:

- `Staff`
- `Prerelease`
- `Staff + Prerelease`
- explicit mascot deck stamps such as `Pikachu Stamped`
- explicit event/trophy overlays such as `Battle Road Spring 2012 [1st Place]`
- other explicit named stamp phrases such as `Pokemon Together Stamp`, `SDCC Stamp`, `Stellar Crown Stamp`

## 2. Required Identity Basis

A stamped canonical row must be grounded in:

1. a known underlying base printed identity
2. plus a deterministic stamped modifier

Default rule:

- stamped identity = base canonical identity + stamped `variant_key`

The stamped row does not replace the base row.

## 3. What Is Not Enough

The following are not sufficient by themselves:

- vague marketing titles
- raw source slug only
- unsupported source-only adjectives
- family-only source routing hints with no explicit printed stamp phrase
- deck-slot numbers such as `#40`
- year-only promo labels such as `(2023)` when no printed stamped modifier is proven

V1 therefore blocks:

- generic `prize-pack-series-cards-pokemon` rows when no explicit series/stamp phrase is present
- professor-program year surfaces with no explicit stamp marker
- rows that look like special promos but are not proven stamped modifiers

## 4. Canonical Separation Rule

If a stamped row is lawful:

- keep base printed `name`
- keep base printed number / printed identity
- keep base `variant_key = NULL`
- create the stamped canonical row with deterministic non-null `variant_key`

The stamped modifier is the separator.  
The canonical `name` does not change.

## 5. Display Rule

UI may render:

- `<name> <printed_number> (<stamp label>)`

Examples:

- `Kyogre SM129 (Staff Prerelease Stamp)`
- `Victory Cup BW31 (Battle Road Spring 2012 1st Place Stamp)`
- `Potion 127/149 (Pikachu Stamp)`

Canonical `name` remains unchanged.

## 6. Exclusions

Do not treat a row as stamped canonical identity when it is really:

- finish-only variation
- printing-layer variation
- product/accessory noise
- a separate promo/special lane that is not a stamped modifier on a known base row
- insufficiently evidenced source noise

Explicitly excluded from stamped auto-resolution in V1:

- `Cosmos Holo`, `Cracked Ice`, and other finish-only phrases
- deck-slot markers by themselves
- family-only source hints with no explicit printed stamp phrase

## 7. Backward Alignment

Backward alignment remains:

- base rows use `variant_key = NULL`
- stamped rows use deterministic lowercase snake_case `variant_key`

Stamped rows must never collapse into the base row by reusing `variant_key = NULL`.

## 8. Variant Key Rule

`variant_key` must be:

- deterministic
- lowercase snake_case
- Grookai-owned
- derived from printed identity evidence, not copied verbatim from a raw source slug

Examples:

- `staff_stamp`
- `prerelease_stamp`
- `staff_prerelease_stamp`
- `pikachu_stamp`
- `battle_road_spring_2012_1st_place_stamp`

## 9. Underlying Base Match Rule

Stamped canonical creation requires an underlying base match unless a later
contract proves a lawful exception.

V1 default:

1. resolve the base canon row first
2. then resolve the stamped modifier
3. only then mark the stamped row ready for warehouse intake

If the underlying base route is missing or ambiguous:

- do not auto-queue for warehouse
- classify as base repair or manual review

## 10. Warehouse Rule

A stamped row is warehouse-ready only when:

- stamped identity is resolved deterministically
- the underlying base match is proven
- the canonical set route is deterministic
- no ambiguity remains

Otherwise:

- `UNDERLYING_BASE_MISSING` or equivalent base-routing gap -> base repair
- ambiguous stamp phrase -> manual review
- non-stamped / finish-only / wrong lane -> reject from stamped intake

## 11. Result

After adoption of this rule:

- stamped rows can be detected without collapsing into base canon rows
- stamped identity is carried through deterministic `variant_key`
- the stamped backlog can be reduced into ready / base-repair / manual / reject buckets
- the first warehouse-ready stamped batch can be selected without widening into global promotion

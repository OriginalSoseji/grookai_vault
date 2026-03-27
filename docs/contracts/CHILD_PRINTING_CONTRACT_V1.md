# CHILD_PRINTING_CONTRACT_V1

Status: ACTIVE  
Type: System Contract  
Scope: Governs the lawful boundary of `card_printings` under current Grookai canon.

## PURPOSE

This contract exists to bound the child printing layer while `card_prints` remains the current canonical authority.

This contract prevents the following drift:

- child printing logic redefining canon by assumption
- finish or parallel handling silently becoming permanent truth for canon-sensitive distinctions
- external source payloads or mappings deciding identity placement
- condition, grading, ownership, or pricing leaking into printing identity

This contract keeps the child layer usable under current canon without freezing future canon maturation.

## SCOPE

This contract:

- governs `card_printings`
- respects current `card_prints` authority
- governs the conceptual use of `finish_keys` and printing-level mappings as subordinate child constructs
- does not mutate canon
- does not settle unresolved canon-sensitive distinctions by assumption
- allows future promotion of provisional distinctions into canonical `card_prints` through separate formal review

This contract does not define:

- schema redesign
- migrations
- data repair steps
- worker changes
- pricing redesign
- UI behavior

## CORE LAW

1. Printed truth remains the governing principle.
2. Under current operating law, `card_prints` is the working canonical authority.
3. A child printing may exist only under an existing canonical `card_prints` row.
4. A child printing is subordinate to canon and cannot redefine canon.
5. A child printing is valid only when the parent canonical row remains unchanged under current canon.
6. A child printing may be provisional when a distinction is canon-sensitive and not yet finally classified.
7. A provisional child classification does not settle canon.
8. Canon promotion requires separate explicit review. Child logic cannot promote canon by implication.

## DECISION RULE

Classify every distinction in the following order:

1. If the distinction is already represented in current canon as separate `card_prints` rows, it is `D. ALREADY CANONICAL / MUST NOT BE REINTRODUCED AS CHILD`.
2. If the distinction never belongs to printing identity, it is `B. FORBIDDEN IN CHILD PRINTINGS`.
3. If the distinction is a finish or parallel treatment of the same current canonical card and does not require selecting a different parent `card_prints` row, it is `A. STABLE CHILD PRINTING`.
4. If the distinction cannot be safely locked into A or D under current canon, it is `C. CANON-SENSITIVE / PROVISIONAL`.

Rules for bucket C:

- bucket C may exist only as explicitly provisional child handling or explicit unresolved handling
- bucket C must not be treated as permanent child truth
- bucket C remains subordinate to future canon review

Bucket A defines allowed placement. Bucket A does not require every parent card to have every child printing.

## CLASSIFICATION FRAMEWORK

| Distinction | Bucket | Contract Rule |
| --- | --- | --- |
| `normal` | A. STABLE CHILD PRINTING | Stable child finish under the same canonical card. |
| `holo` | A. STABLE CHILD PRINTING | Stable child finish under the same canonical card. |
| `reverse holo` | A. STABLE CHILD PRINTING | Stable child finish under the same canonical card. |
| `pokeball` | A. STABLE CHILD PRINTING | Stable child premium parallel under the same canonical card. |
| `masterball` | A. STABLE CHILD PRINTING | Stable child premium parallel under the same canonical card. |
| `1st Edition` | D. ALREADY CANONICAL / MUST NOT BE REINTRODUCED AS CHILD | Already treated as canonical identity. Must not be modeled as child. |
| `Unlimited` | D. ALREADY CANONICAL / MUST NOT BE REINTRODUCED AS CHILD | Already treated as canonical identity. Must not be modeled as child. |
| `staff stamp` | C. CANON-SENSITIVE / PROVISIONAL | Stamp distinction is canon-sensitive. It may not be locked as permanent child truth without canon review. |
| `prerelease stamp` | C. CANON-SENSITIVE / PROVISIONAL | Stamp distinction is canon-sensitive. It may not be locked as permanent child truth without canon review. |
| `promo stamp` | C. CANON-SENSITIVE / PROVISIONAL | Stamp distinction is canon-sensitive. It may not be locked as permanent child truth without canon review. |
| `stamped promos generally` | C. CANON-SENSITIVE / PROVISIONAL | Stamped promo distinctions are canon-sensitive. They require explicit review before permanent classification. |
| `alt art` | C. CANON-SENSITIVE / PROVISIONAL | Art-based distinction is canon-sensitive. If a specific case already has its own canonical row, that case falls under bucket D. |
| `full art` | C. CANON-SENSITIVE / PROVISIONAL | Art-style distinction is canon-sensitive. If a specific case already has its own canonical row, that case falls under bucket D. |
| `secret rare style differences` | C. CANON-SENSITIVE / PROVISIONAL | Style and rarity-treatment distinctions are canon-sensitive. They require explicit review before permanent classification. |
| `cosmos holo style differences` | C. CANON-SENSITIVE / PROVISIONAL | Holo-style distinctions are canon-sensitive as a class. If a specific case already has its own canonical row, that case falls under bucket D. |
| `deck-exclusive printings` | C. CANON-SENSITIVE / PROVISIONAL | Deck-origin distinctions are canon-sensitive. They may encode separate printed identity and require review. |
| `theme deck / league deck exclusives` | C. CANON-SENSITIVE / PROVISIONAL | Release-lane distinctions are canon-sensitive. They require explicit review before permanent classification. |
| `regional print differences` | C. CANON-SENSITIVE / PROVISIONAL | Regional distinctions are canon-sensitive. They must not be silently flattened into child status. |
| `different collector number with same artwork` | D. ALREADY CANONICAL / MUST NOT BE REINTRODUCED AS CHILD | Current canon treats collector-number changes as separate canonical identity. |
| `different artwork with same Pokemon/name` | C. CANON-SENSITIVE / PROVISIONAL | Artwork change is canon-sensitive as a class. If a specific case already has its own canonical row, that case falls under bucket D. |
| `release-channel exclusives` | C. CANON-SENSITIVE / PROVISIONAL | Distribution-channel distinctions are canon-sensitive. They require explicit review before permanent classification. |
| `jumbo / oversized cards` | B. FORBIDDEN IN CHILD PRINTINGS | Size or object-format differences do not belong in child printing identity. |
| `misprints / factory errors` | B. FORBIDDEN IN CHILD PRINTINGS | Defects and factory anomalies do not belong in child printing identity. |
| `condition differences` | B. FORBIDDEN IN CHILD PRINTINGS | Condition is not printing identity. |
| `grading differences` | B. FORBIDDEN IN CHILD PRINTINGS | Grading is not printing identity. |
| `ownership differences` | B. FORBIDDEN IN CHILD PRINTINGS | Ownership is not printing identity. |
| `pricing differences` | B. FORBIDDEN IN CHILD PRINTINGS | Pricing is not printing identity. |

## PROMOTION RULE

If future printed-truth audit proves that a bucket C distinction is actually a separate canonical identity, that distinction must be promoted through explicit canon review.

Promotion rule:

- promotion must be explicit
- promotion must be backed by canon review
- promotion must not occur by implication from child handling
- provisional child handling must be explicit, traceable, and queryable for audit and promotion review
- a promoted distinction must not remain silently classified as a child forever
- after promotion, child-layer handling must defer to canon

This contract allows provisional child handling. This contract forbids silent permanent settlement of canon-sensitive distinctions inside the child layer.

## RELATION TO EXISTING TABLES

### `card_prints`

- current working canonical authority
- answers which canonical printed card Grookai currently recognizes
- child printing logic must defer to this layer

### `card_printings`

- subordinate child layer under `card_prints`
- may represent stable finish or parallel distinctions under bucket A
- may temporarily host explicit provisional handling for bucket C
- must not redefine canon

### `finish_keys`

- bounded child-printing vocabulary for current stable child finish classes
- new finish categories must not be introduced implicitly through ingestion, mapping, or source payload interpretation
- expansion of `finish_keys` requires explicit contract update
- does not define canon
- does not prove that every distinction expressed through a finish-like label is permanently a child distinction

### `external_mappings`

- binds external source rows to canonical `card_prints`
- does not decide canon
- does not authorize child placement

### `external_printing_mappings`

- binds external source rows to child printings
- does not create child authority by itself
- does not settle canon-sensitive distinctions

### `vault_items`

- ownership layer
- does not define canonical identity
- does not define child printing identity
- ownership state must defer to canonical and child identity, not the reverse

## INVARIANTS

1. A child printing cannot exist unless its parent canonical `card_prints` row exists.
2. A child printing cannot override canon by assumption.
3. Child printings may be created only through controlled ingestion paths or audited, contract-aligned transformation paths.
4. Ad hoc or manual child-printing creation outside a controlled or audited path is unlawful.
5. A distinction cannot be authoritative in both canonical and child layers at the same time.
6. Condition, grading, pricing, and ownership are forbidden from printing identity.
7. Stable child printing is limited to finish or parallel treatment of the same current canonical card.
8. Any canon-sensitive distinction must be explicit, traceable, and queryable. It must not be buried implicitly inside child handling.
9. A provisional child classification cannot silently become permanent truth where canon remains uncertain.
10. If a distinction is promoted into canon later, child-layer handling must defer to canon.
11. External mappings do not decide whether a distinction is canonical or child.
12. A parent canonical row may exist with zero child printings.
13. The presence of a child printing does not prove that the distinction is globally settled forever.

## DECISION EXAMPLES

1. Reverse holo under the same canonical card:
   - Same parent `card_prints` row.
   - Finish changes.
   - Classification: `A. STABLE CHILD PRINTING`.

2. Pokeball or Masterball premium parallel under the same canonical card:
   - Same parent `card_prints` row.
   - Premium parallel treatment changes.
   - Classification: `A. STABLE CHILD PRINTING`.

3. Base Set `1st Edition` vs `Unlimited`:
   - Current canon already treats this as separate canonical identity.
   - Classification: `D. ALREADY CANONICAL / MUST NOT BE REINTRODUCED AS CHILD`.

4. Staff stamped promo:
   - Stamp distinction is canon-sensitive.
   - Child handling cannot settle the final identity rule by assumption.
   - Classification: `C. CANON-SENSITIVE / PROVISIONAL`.

5. Prerelease promo:
   - Stamp and release-lane distinction is canon-sensitive.
   - Child handling may be provisional only.
   - Classification: `C. CANON-SENSITIVE / PROVISIONAL`.

6. Alt art with a different collector number:
   - Current canon treats collector-number change as canonical.
   - Classification: `D. ALREADY CANONICAL / MUST NOT BE REINTRODUCED AS CHILD`.

7. Same artwork but different collector number:
   - Collector-number change still changes canonical selection.
   - Classification: `D. ALREADY CANONICAL / MUST NOT BE REINTRODUCED AS CHILD`.

8. Deck-exclusive marked print:
   - Distinction is canon-sensitive and may require separate canonical identity.
   - It cannot be treated as permanent stable child truth without review.
   - Classification: `C. CANON-SENSITIVE / PROVISIONAL`.

9. `PSA 10` vs raw:
   - Grade state changes ownership or slab state, not printing identity.
   - Classification: `B. FORBIDDEN IN CHILD PRINTINGS`.

10. `NM` vs `LP`:
   - Condition changes market and ownership description, not printing identity.
   - Classification: `B. FORBIDDEN IN CHILD PRINTINGS`.

## OPEN GATES

The following distinction families require future source audit and canon review before global permanent classification:

- stamp families, including `staff`, `prerelease`, `promo`, and other stamped promo treatments
- art and rarity-treatment families, including `alt art`, `full art`, `secret rare`, and specialized holo styles such as `cosmos holo`
- deck-origin and release-channel distinctions, including theme deck, league deck, and other release-lane exclusives
- regional print differences
- artwork changes that do not already resolve cleanly through current canonical rows
- object-format boundary for jumbo or oversized cards
- defect and anomaly handling for misprints and factory errors

Until these gates are closed by explicit canon review, they must not be treated as globally settled stable child truth.

## RESULT

After adoption of this contract:

- `card_printings` is safe to use for stable child finish and parallel distinctions under current canon
- canon-sensitive distinctions remain bounded and explicitly provisional
- child handling cannot silently redefine `card_prints`
- future canon promotion remains available through explicit review
- cleanup and redesign work can proceed against a clear authority boundary without freezing canon maturation

# BATTLE_ACADEMY_CANON_CONTRACT_V1

Status: FROZEN (amended in place by explicit audit-backed reality corrections on 2026-04-01 and 2026-04-02)
Type: Canon Domain / Governance Contract
Scope: Defines Battle Academy as a curated-product overlay canon domain inside Grookai, including release resolution, printed-evidence identity law, inclusion and exclusion boundaries, promotion guardrails, conflict governance, and future implementation constraints.
Authority: Aligns with `GROOKAI_RULEBOOK.md`, `GV_SCHEMA_CONTRACT_V1.md`, `REFERENCE_BACKED_IDENTITY_CONTRACT_V1.md`, `EXTERNAL_SOURCE_INGESTION_MODEL_V1.md`, `EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1.md`, `PRINTED_IDENTITY_MODEL_V1.md`, and `CANON_WAREHOUSE_FOUNDER_GATED_PROMOTION_CONTRACT_V1.md`.

---

## 1. Purpose

This contract defines and locks the Battle Academy canon model for Grookai.

It exists to prevent Battle Academy rows from being mis-modeled as:

- standard expansion-set prints
- TK-style mapping-only rows
- product packaging noise
- pure standalone set-number identities

Battle Academy is a governed canon domain.
It is not a loose exception lane.

---

## 2. Historical Audit Baseline

This section records the pre-promotion audit baseline that justified the Battle Academy contract.
It is historical evidence, not a claim about the current local runtime after later BA execution phases.

As of 2026-04-01, the audited Battle Academy corpus had the following verified operating reality:

- upstream sets:
  - `battle-academy-pokemon`
  - `battle-academy-2022-pokemon`
  - `battle-academy-2024-pokemon`
- staged rows:
  - `334` `CLEAN_CANON_CANDIDATE`
  - plus product and noise rows outside canon eligibility
- no existing Battle Academy canonical presence at that baseline point in:
  - `sets`
  - `card_prints`
  - `external_mappings`
- observed row population includes:
  - valid Pokemon cards
  - trainer cards
  - energy cards
  - product noise such as code cards, `N/A`, and stamped or packaging labels

Later execution phases may populate lawful BA canon under this contract.
That does not change the historical baseline captured here.

If later audit evidence differs, V1 must not be silently reinterpreted.
Audit first, then version or amend explicitly.

---

## 3. Amendment / Reality Correction

This contract was first amended in place on 2026-04-01 because the original V1 identity assumption was false in audited production reality.

The disproven assumption was:

```text
(ba-YYYY, printed number) = full Battle Academy canonical identity
```

The recent production conflict audit showed real collisions where the same Battle Academy release plus printed number pointed to different cards and/or different printed totals.

Audited conflict surface:

- total conflict groups: `9`
- `IDENTITY_NAME_CONFLICT`: `0`
- `IDENTITY_PRINTED_TOTAL_CONFLICT`: `2`
- `IDENTITY_NAME_AND_TOTAL_CONFLICT`: `7`

Representative examples:

- `ba-2020 | 043` -> `Electabuzz 43/156` and `Electivire 43/147`
- `ba-2020 | 119` -> `Cynthia 119/156` and `Great Ball 119/149`
- `ba-2022 | 029` -> `Turtonator 29/202` and `Vulpix 29/264`
- `ba-2024 | 188` -> `Potion 188/198` and `Potion 188/192`

Therefore:

- `(ba-YYYY, printed number)` is not a lawful full identity key
- Battle Academy promotion cannot proceed on release plus number alone
- any implementation that treats Battle Academy as a simple standalone set-number domain is non-compliant with this amended contract

That correction remained binding.

This contract was amended again in place on 2026-04-02 because the 2026-04-01 correction still left Battle Academy identity dependent on `underlying card identity`, which Phase 3 and Phase 4 proved was not the minimal lawful printed-evidence key.

Phase 3 result:

- `63` exact-key duplicate groups
- all `63` classified as `MODEL_INSUFFICIENT`
- `0` `SOURCE_ROW_DUPLICATE`
- `0` `EVIDENCE_INSUFFICIENT`

Phase 4 result:

- candidate keys `K1` through `K9` tested using existing repo evidence only
- `K4` selected as the minimal sufficient key
- `K4` produced `328` distinct keys
- `K4` produced `0` duplicate groups
- both named conflicts were resolved:
  - `ba-2022 | 226 | bug catcher`
  - `ba-2024 | 188 | potion`

Dimension validation result:

- `source_name_raw` classified as `VALID_DIMENSION`
- consistently present on the audited duplicate surface
- stable per row
- differentiates all `63` duplicate groups
- originates from raw ingestion payload and is not a heuristic or inferred field

Therefore the governing Battle Academy identity law is now:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

This amendment supersedes the earlier underlying-card-identity requirement as the canonical Battle Academy identity discriminator.
Underlying matches remain allowed as reference or provenance only.

---

## 4. Domain Definition

Battle Academy is a curated-product overlay domain.

It contains:

- real printed cards
- cards originating from multiple existing canonical identities
- product-scoped numbering
- curated deck composition
- duplicate physical copies inside the product
- product-only artifacts that are not cards

Therefore Battle Academy is modeled as:

```text
a first-class curated-product overlay canon domain in Grookai
```

It is NOT:

- a mapping-only domain
- a TK-style slot-resolution lane
- a standard expansion-set family
- a pure standalone set-local identity model

Duplicate physical copies inside a Battle Academy product do not create multiple canonical identities.
Quantity and deck composition are product facts, not identity.

---

## 5. Canonical Release Set Model

Each Battle Academy release remains its own canonical release container:

```text
ba-2020
ba-2022
ba-2024
```

Authoritative upstream-to-release mapping:

| Upstream set id | Canonical release code |
|---|---|
| `battle-academy-pokemon` | `ba-2020` |
| `battle-academy-2022-pokemon` | `ba-2022` |
| `battle-academy-2024-pokemon` | `ba-2024` |

Rules:

- each release code defines Battle Academy release context
- no cross-release identity reuse
- upstream set ids are routing inputs, not canonical identity
- Battle Academy printed number alone does not guarantee uniqueness within one release
- the same Battle Academy number may appear on multiple different underlying cards within the same release

---

## 6. Identity Model

### 6.1 Routing Hint vs Full Identity

Within Battle Academy:

```text
(ba-YYYY, printed number)
```

is a routing hint and grouping key.
It is not a lawful full identity key.

### 6.2 Full Battle Academy Identity

The full Battle Academy identity must be modeled as:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

All four parts are required.

### 6.3 Validation Fields

The required identity dimensions are defined as follows:

- `ba_set_code`: authoritative Battle Academy release context
- `printed_number`: deterministic Battle Academy printed number
- `normalized_printed_name`: comparison form of the printed card name using trim, internal-whitespace collapse, and lowercase only
- `source_name_raw`: raw source-captured card-facing identity label, preserved without synonym expansion, fuzzy matching, or heuristic rewriting

Not allowed:

- synonym expansion
- fuzzy matching
- cross-set equivalence
- variant inference
- printed-total inference

`printed_total`, stamp prose, deck suffixes, and package labels remain evidence fields.

They may help validate or disprove identity.
They do not, by themselves, replace the required four-part Battle Academy identity key.

### 6.4 Schema-Agnostic Constraint

This contract locks identity law only.

It does not choose:

- a specific database schema
- a specific column layout
- a specific linkage table
- a specific storage representation for Battle Academy overlay identity

Any future canonical implementation must enforce uniqueness on the full identity key and must generate `gv_id` from that full key.
No partial-key identity is lawful.

Any implementation must satisfy this identity law without inventing schema commitments that have not yet been audited.

---

## 7. Underlying Card Identity

Underlying card identity means:

- the real canonical printed card identity outside the Battle Academy overlay
- determined by Grookai's existing canonical identity model
- validated through deterministic normalization and evidence
- never trusted directly from upstream labels without review

Clarifications:

- Battle Academy rows are not pure set-local identities like standard expansions
- Battle Academy rows may correspond to existing underlying canon rows, but that linkage is reference-only
- the Battle Academy layer preserves product-specific identity through printed evidence captured in the Battle Academy identity key
- underlying identity may be stored or linked later as provenance, lineage, or mapping context
- underlying identity never defines, replaces, or overrides Battle Academy identity

Deterministic underlying linkage remains valuable, but it is not the canonical Battle Academy identity discriminator.

---

## 8. Inclusion and Promotion Rules

A Battle Academy row is promotable only if all of the following are true:

1. the row belongs to a valid Battle Academy release
2. the row is a real playable card, not packaging or product metadata
3. the Battle Academy printed number is parseable deterministically
4. the full Battle Academy identity key is present and deterministic:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

5. the row is unique under that full identity key
6. the row is not a member of any unresolved duplicate group
7. no `MODEL_INSUFFICIENT` classification remains
8. `source_name_raw` dimension validation has passed
9. no conflicting canonical row exists for the same full identity key
10. founder-gated promotion rules are obeyed

Hard rule:

```text
If the full four-part Battle Academy identity key is not known, promotion is NOT lawful.
```

Underlying reference linkage may exist, but it is never required to define Battle Academy identity.

Required path remains:

```text
raw_imports
-> normalization
-> BA domain classification and release resolution
-> external_discovery_candidates
-> founder-gated staged promotion
-> canon
```

No automatic process may promote Battle Academy rows directly into canon.

---

## 9. Exclusion and Hold Rules

Reject a row if any of the following are true:

- `number_raw = N/A`
- the row is a code card
- the row is packaging, a bundle label, a guide, a board, or metadata-only product context
- the usable identity collapses to a product label instead of a card
- the row cannot produce deterministic Battle Academy printed-number routing

Hold a row out of promotion if any of the following are true:

- any required identity dimension is missing or non-deterministic
- the same full Battle Academy identity key still produces a duplicate group
- a prior duplicate group is still classified as `MODEL_INSUFFICIENT` or `EVIDENCE_INSUFFICIENT`
- `source_name_raw` fails dimension validation
- a conflicting canonical row exists for the same full identity key
- printed-total or other printed-evidence conflicts show the current identity key is insufficient

These hold conditions are not reject-forever by default.
They are not-promotable-until-resolved conditions.

---

## 10. Classification Model

Each Battle Academy row must still classify into exactly one content class:

- `POKEMON`
- `TRAINER`
- `ENERGY`
- `PRODUCT_CONTEXT`
- `REJECT`

Promotable content classes:

- `POKEMON`
- `TRAINER`
- `ENERGY`

Never promotable:

- `PRODUCT_CONTEXT`
- `REJECT`

However, promotable content class alone is insufficient.
A playable card row still cannot promote unless the full Battle Academy identity key is lawful and conflict-free.

---

## 11. Relation to Existing Canon

A Battle Academy printing is a product-context canonical printing governed by Battle Academy release context plus directly captured printed evidence.

Rules:

- Battle Academy does not replace any underlying card
- Battle Academy does not merge into the underlying set
- Battle Academy remains isolated from all non-BA canon
- underlying matches remain reference-only and never define Battle Academy identity

This is a printed-evidence Battle Academy model:

- release-context identity
- plus printed number
- plus normalized printed name
- plus raw source-captured card-facing label

Underlying linkage or source-set lineage may be preserved as provenance or audit context.
It must not override Battle Academy identity law.

---

## 12. Difference From Standard Sets and TK

| Domain | Identity basis | Canon behavior |
|---|---|---|
| Standard expansion set | set-local print identity | direct canon inside the expansion set |
| TK | deck and slot resolution | deterministic mapping to existing canon by deck-slot logic |
| Battle Academy | release context plus printed number plus normalized printed name plus raw source-captured label | curated-product overlay printing isolated inside BA canon and optionally linked to underlying canon as reference |

Hard rules:

- TK logic must not be reused to define Battle Academy identity
- Battle Academy must not be collapsed into standard-set reprints
- Battle Academy must not be promoted from release plus number alone
- Battle Academy must not be promoted from any partial key that omits `source_name_raw`

---

## 13. Conflict Governance

If conflict audit finds that multiple rows share a partial Battle Academy key and disagree on:

- normalized name
- raw source-captured label
- printed total
- other printed evidence

then:

- promotion must stop
- the rows remain in review
- the contract interpretation must be corrected before implementation resumes

The 2026-04-01 conflict audit proved that naive release-plus-number promotion is unsafe.
The 2026-04-02 dimension-expansion audit proved that the four-part printed-evidence key resolves the known duplicate surface without heuristics.

---

## 14. Mapping Rules

After a lawful Battle Academy canonical row exists:

- source mappings may point to that Battle Academy row
- mapping may carry provenance about any known underlying source card

Before lawful canon exists:

- no mapping may define Battle Academy identity
- no upstream `cardId`, `set`, or source label may substitute for the full Battle Academy identity key

Battle Academy remains canon first, mapping second.

---

## 15. Invariants

The following must always hold:

1. Battle Academy number alone is never sufficient to define full identity.
2. Full Battle Academy identity requires `ba_set_code`, `printed_number`, `normalized_printed_name`, and `source_name_raw`.
3. `source_name_raw` must originate from directly captured raw evidence, not heuristic transformation.
4. Product noise never enters canon.
5. Battle Academy rows never replace or merge into non-BA canon by default.
6. Deterministic promotion only; no fuzzy or first-result-wins behavior.
7. Zero-collision uniqueness on the full Battle Academy identity key is mandatory.
8. Duplicate product quantity is not identity.
9. Underlying reference never defines Battle Academy identity.

---

## 16. Future Extension Gate

Future implementation may use:

- deterministic linkage to existing canon where available
- product-printing or overlay modeling

This contract does NOT choose schema yet.
It only locks the identity law.

Future curated box sets or starter-deck families may reuse this model only after explicit audit proves all of the following:

- release context is real and deterministic
- product-scoped numbering is usable as routing input
- the full printed-evidence identity key is available deterministically
- product-only noise can be excluded deterministically
- no unresolved full-key collisions remain

If those proofs are missing, do not silently apply this contract to the new family.
Write a new domain contract instead.

---

## 17. Stop Rule

STOP and refine the contract or implementation if any Battle Academy canon step requires:

- guessing
- heuristic identity matching
- upstream trust as identity authority
- promotion from release plus number alone
- promotion from any partial identity key
- unresolved full-key collisions
- unresolved printed-total conflicts
- unresolved boundary between valid card and product context

Fail closed.
Do not promote around uncertainty.

---

## 18. Result

Grookai gains:

- a reality-aligned Battle Academy identity law
- a fail-closed curated-product overlay model
- explicit prohibition on naive `(ba-YYYY, printed number)` promotion
- an evidence-backed four-part Battle Academy identity key
- a lawful strict promotion gate
- preserved doctrine: audit first, no assumptions, deterministic promotion only

Battle Academy is no longer treated as a pure standalone set-number identity domain.
It is now governed as a curated-product overlay domain whose canonical identity is derived from directly captured printed evidence:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

---

## 19. Lock

This contract remains frozen.

Any further change requires:

- explicit audit evidence
- explicit version bump or explicit amendment
- explicit contract-index update

Silent reinterpretation is prohibited.

# CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1

Status: FROZEN
Type: Architecture / Identity Governance Contract
Scope: Defines Option B identity architecture for canonical `card_prints`, a governed `card_print_identity` subsystem, `gv_id` ownership, mapping-anchor behavior, domain strategy, and migration boundary without executing schema change.
Authority: Aligns with `BATTLE_ACADEMY_CANON_CONTRACT_V1`, `GV_ID_ASSIGNMENT_V1`, `VERSION_VS_FINISH_CONTRACT_V1`, `PRINTED_IDENTITY_MODEL_V1`, `EXTERNAL_SOURCE_INGESTION_MODEL_V1`, and `EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1`.

---

## 1. Purpose

This contract selects Option B:

```text
identity becomes its own governed subsystem
```

It exists because Battle Academy Phase 6 proved the current storage model cannot lawfully store the validated BA identity law directly, and because repo evidence already shows identity pressure beyond BA:

- stamped cards
- staff / prerelease families
- promo-vs-set version splits
- future Japanese-domain identity expansion

This contract is architecture only.
It does not write schema, create migrations, or promote canon rows.

---

## 2. Historical Selection Baseline

This section records the Phase 6 architecture-selection baseline that justified Option B.
It is historical evidence, not a statement that later implementation phases failed to progress.

The following facts were locked when this contract was selected:

- Battle Academy promotion candidates: `328`
- Battle Academy identity law:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

- live `card_prints` storage at that baseline did not contain:
  - `normalized_printed_name`
  - `source_name_raw`
- live `card_prints` uniqueness at that baseline was still:

```text
uq_card_prints_identity = (game_id, set_id, number_plain, variant_key)
```

- live `external_mappings` still references `card_prints.id`
- live public routing still treats `card_prints.gv_id` as the outward-facing canonical token

Therefore Battle Academy Phase 6 stopped lawfully.
The blocker is storage architecture, not remaining BA identity ambiguity.

Later implementation phases may:

- add the identity subsystem
- exclude non-canonical domains such as `tcg_pocket`
- remove legacy parent identity enforcement from `card_prints`
- align canonical FK sources such as Pokemon `game_id`
- complete lawful BA promotion

Those later execution results do not amend the architectural boundary selected here.

---

## 3. Architecture Questions Answered

### Q1. What is the canonical ownership boundary between `card_prints` and the identity subsystem?

Answer:

- `card_prints` remains the durable canonical card object
- `card_print_identity` becomes the printed-identity authority object
- `card_prints` owns downstream object continuity
- `card_print_identity` owns the identity dimensions and the law that makes one print unique

### Q2. Where does uniqueness live?

Answer:

- uniqueness for canonical printed identity lives on `card_print_identity`
- uniqueness must not remain scattered across `card_prints` columns and ad hoc conventions

### Q3. Where is `gv_id` derived and stored?

Answer:

- `gv_id` remains stored on `card_prints`
- derivation inputs come from the one active canonical `card_print_identity` row
- `card_print_identity` owns the identity inputs
- `card_prints` owns the public stable token

### Q4. How do `external_mappings` reference canon after the split?

Answer:

- `external_mappings` continues to reference `card_prints`
- the identity subsystem informs which `card_print` is canonical
- it does not replace `card_prints` as the external reference anchor

### Q5. How does the design support BA, ENG special prints, and future JPN identity expansion?

Answer:

- `identity_domain` partitions identity law by governed domain
- common audited dimensions live in first-class columns
- domain-specific dimensions extend through governed payload fields or an equivalent future-safe extension zone
- no domain may widen `card_prints` ad hoc every time identity law evolves

### Q6. How do we introduce this without breaking existing canon law?

Answer:

- add the identity subsystem beside existing canon first
- backfill identity rows from current lawful canon
- bind each `card_print` to one active canonical identity row
- adapt `gv_id` derivation to read from the active identity row
- enable new domains such as BA only after subsystem storage is live and verified

---

## 4. Ownership Boundary

### Layer A — `card_prints`

Purpose:

- canonical card object
- durable downstream foreign-key target
- home of public-facing `gv_id`
- home of non-identity attributes that should remain stable even if identity law evolves

Examples of `card_prints` concerns:

- public routing
- pricing joins
- vault ownership
- external mappings
- images
- non-identity presentation fields

### Layer B — `card_print_identity`

Purpose:

- canonical printed-identity authority
- governed home for identity dimensions
- home of uniqueness enforcement for canonical printed identity
- versioned basis for domain-specific identity law across ENG, BA, special-print, and JPN lanes

---

## 5. Target Model

The target identity subsystem is a two-layer model:

```text
card_prints
  -> stable canonical card object
  -> one active canonical identity row

card_print_identity
  -> identity authority object
  -> owns uniqueness
  -> stores identity dimensions and versioned law inputs
```

Minimum required design fields for `card_print_identity`:

- `id`
- `card_print_id`
- `identity_domain`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw`
- `identity_payload_jsonb` or equivalent future-safe extension zone
- `identity_key_version`
- `identity_key_hash`
- `created_at`
- `updated_at`

Field behavior:

- these are design-level required fields, not a migration executed in this phase
- domain contracts decide which fields are mandatory inputs for that domain's identity law
- fields not used by a domain remain null only when the domain contract explicitly allows that
- ad hoc storage outside governed fields or governed payload is prohibited

---

## 6. Core Rules

### R1

One canonical `card_print` must have exactly one active canonical identity row.

### R2

All uniqueness for canonical printed identity must live on `card_print_identity`, not scattered across `card_prints`.

### R3

Future domain-specific dimensions must extend through governed identity fields or governed payload, not through ad hoc widening of `card_prints`.

### R4

`card_prints` remains the durable canonical entity referenced by downstream systems unless explicit audited evidence disproves that boundary.

card_prints remains the durable canonical entity referenced by downstream systems.

### R5

The identity subsystem must support versioned identity-law evolution without silently rewriting history.

Historical or superseded identity rows may exist later, but exact lifecycle fields are chosen in migration design, not in this phase.

---

## 7. GV ID Location Decision

Chosen option:

```text
Option B1
gv_id stored on card_prints, derived from joined card_print_identity
```

Decision:

- `gv_id` stays on `card_prints`
- the active `card_print_identity` row owns the derivation inputs
- `card_prints` remains the public route and search token holder

Why:

- public URL stability already depends on `card_prints.gv_id`
- downstream systems already expect `card_prints` as the canonical object
- one active canonical identity row per `card_print` means `gv_id` can remain stable on the parent object without ambiguity
- migration safety is better when existing public routing does not move to a new table first

Hard rule:

- `gv_id` derivation inputs come from the active canonical identity row
- `gv_id` itself remains stored on `card_prints`
- any future `gv_id` change requires explicit migration/backfill contract review

---

## 8. Mapping Reference Model

Chosen option:

```text
M1
external_mappings continue to point to card_prints only
```

Decision:

- `external_mappings` remains anchored to `card_prints.id`
- the identity subsystem informs what the canonical print is
- it does not become the new foreign-key anchor for source mappings

Why:

- live schema already enforces `external_mappings.card_print_id -> card_prints.id`
- downstream repo flows already assume mappings represent canonical card objects
- changing mapping anchors would create avoidable breakage in pricing, ingestion, and catalog flows

Hard rule:

- mappings are about which canonical card object an external row refers to
- identity rows are internal authority, not the primary external anchor

---

## 9. Uniqueness Law

### U1

`card_print_identity` owns canonical printed-identity uniqueness.

### U2

Uniqueness is enforced by:

- `identity_domain`
- `identity_key_version`
- `identity_key_hash`

and may also be supported by explicit governed identity columns when a domain contract requires them.

### U3

`card_prints` no longer needs to be stretched to directly carry every identity discriminator.

### U4

No identity discriminator may be hidden inside `variant_key` as a shortcut.

`variant_key` may remain part of current-law identity inputs for domains that already use it, but it must be represented as a governed identity dimension, not as an unmanaged catch-all container for future identity growth.

### U5

One active canonical identity row per `card_print` is mandatory.

### Hash rule

`identity_key_hash` must be built from the ordered canonical serialization of the exact domain-required identity dimensions for `identity_key_version`.

No heuristic fields are allowed in the hash input.

### BA v1 realization

Inside the subsystem, Battle Academy V1 identity is:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

That law lives in the identity subsystem as governed domain law.
It must not be implemented as ad hoc `card_prints`-only widening.

---

## 10. Identity Domains

The identity subsystem must support governed domains.

Initial required domains:

- `pokemon_eng_standard`
- `pokemon_ba`
- `pokemon_eng_special_print`
- `pokemon_jpn`

### 10.1 `pokemon_eng_standard`

Required discriminator fields:

- `identity_domain`
- `set_code_identity`
- `printed_number`
- `identity_payload_jsonb.variant_key_current` when current ENG standard canon law requires the existing variant dimension

Optional fields:

- `normalized_printed_name`
- `identity_payload_jsonb.printed_total`
- `identity_payload_jsonb.printed_set_abbrev`

Forbidden heuristic fields:

- fuzzy name aliases
- vendor-only set guesses
- synonym expansion
- external ranking or confidence scores

`source_name_raw`-like dimensions:

- not required by default
- only permitted if a future audit-backed domain contract proves they are lawful printed discriminators

Future additions:

- only through explicit domain-contract update that names the payload keys and version bump

### 10.2 `pokemon_ba`

Required discriminator fields:

- `identity_domain`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- `source_name_raw`

Optional fields:

- `identity_payload_jsonb.printed_total`
- `identity_payload_jsonb.underlying_card_print_id`
- `identity_payload_jsonb.upstream_set_id`

Forbidden heuristic fields:

- underlying-card guessing
- fuzzy label cleanup
- deck inference
- inferred totals

`source_name_raw`-like dimensions:

- permitted
- required by current BA law

Future additions:

- only by explicit BA contract amendment or BA identity-key version bump

### 10.3 `pokemon_eng_special_print`

Required discriminator fields:

- `identity_domain`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- governed special-print discriminator fields inside `identity_payload_jsonb`

The initial governed special-print discriminator family is:

- `stamp_text`
- `stamp_program`
- `release_marking`
- `distribution_mark`

At least the exact audited printed discriminator fields required by the applicable special-print contract must be present.

Optional fields:

- `source_name_raw`
- `identity_payload_jsonb.printed_total`
- `identity_payload_jsonb.variant_key_current`

Forbidden heuristic fields:

- generic "special" flags
- seller wording
- inferred promo families
- unmanaged packing of all identity into `variant_key`

`source_name_raw`-like dimensions:

- permitted if an audit-backed special-print contract proves they are lawful printed evidence
- never accepted as a shortcut without that contract

Future additions:

- only through domain contract that names the exact new discriminator keys

### 10.4 `pokemon_jpn`

Required discriminator fields:

- `identity_domain`
- `set_code_identity`
- `printed_number`
- `normalized_printed_name`
- governed Japan-domain discriminator fields inside `identity_payload_jsonb`

The initial governed Japan-domain discriminator family is:

- `language_code`
- `rarity_policy`
- `edition_marking`
- `release_context`

Optional fields:

- `source_name_raw`
- `identity_payload_jsonb.printed_total`
- `identity_payload_jsonb.variant_key_current`

Forbidden heuristic fields:

- ENG-to-JPN equivalence guesses
- translation synonyms
- inferred rarity backfills
- set-family assumptions not present in audited printed evidence

`source_name_raw`-like dimensions:

- permitted only if an audited Japan-domain contract proves they are stable lawful printed evidence

Future additions:

- only through Japan-domain contract versioning

---

## 11. Domain Governance

Identity domains are contract-governed.

Rules:

- a domain contract defines which discriminator fields are lawful
- a domain contract defines which payload keys are allowed
- no domain may use fuzzy matching as identity input
- no domain may rely on external source labels as canonical authority
- new dimensions require explicit contract amendment or new version

This subsystem contract defines the architecture.
It does not silently amend domain-specific identity law.

---

## 11A. Non-Canon Domain Participation Boundary

Amendment / Reality Clarification:

Phase 8 implementation proved the current live canon surface contains rows whose
`set.source.domain` is `tcg_pocket`.
`tcg_pocket` is not an approved canonical identity domain and does not belong in CanonDB.

Rules:

- Only approved canonical domains participate in `card_print_identity` backfill and identity rollout.
- Unsupported non-canonical domains must be excluded explicitly, reported explicitly, and prevented from silently entering canonical identity storage.
- `tcg_pocket` is currently classified as `NON_CANON_DOMAIN`.
- Future support for `tcg_pocket` requires an explicit later contract. Incidental inclusion is prohibited.

Backfill taxonomy:

- `SUPPORTED_CANON_DOMAIN`
  - row participates in canonical identity backfill
- `EXCLUDED_NONCANON_DOMAIN`
  - row belongs to an explicitly excluded non-canonical domain and must receive zero identity rows
- `BLOCKED_UNKNOWN_DOMAIN`
  - row belongs to a domain that is neither approved nor explicitly excluded and must fail closed

---

## 12. Migration Strategy Boundary

The exact migration-ready schema is not chosen here.

The required migration phases are:

- Phase A — create `card_print_identity` table and constraints
- Phase B — backfill identity rows for existing canon using current identity law
- Phase C — bind `card_prints` to active canonical identity rows
- Phase D — adapt `gv_id` derivation to read from the identity subsystem
- Phase E — enable BA promotion through the identity subsystem

The migration-design artifact for this architecture is:

`docs/checkpoints/ba_phase6_identity_migration_strategy_v1.md`

No migration is written in this phase.

---

## 13. Invariants

1. `card_prints` remains the durable downstream canonical object.
2. `card_print_identity` owns printed-identity authority and uniqueness.
3. `gv_id` remains on `card_prints`.
4. `external_mappings` remains anchored to `card_prints`.
5. No identity discriminator may be hidden inside `variant_key`.
6. No heuristic field may participate in identity law or identity hashes.
7. One active canonical identity row per `card_print` is mandatory.
8. Domain-specific identity growth must occur through governed fields or governed payload, never through ad hoc schema drift.

---

## 14. Stop Rule

STOP and refine the architecture if any implementation step would:

- move canonical downstream authority away from `card_prints` without explicit audited proof
- leave `gv_id` ownership undecided
- leave mapping-anchor behavior undecided
- split uniqueness ambiguously across tables
- hide new identity dimensions inside `variant_key`
- introduce heuristic identity matching
- write schema or promote canon under this architecture phase

Fail closed.

---

## 15. Result

Grookai gains:

- a governed identity subsystem boundary
- explicit ownership of uniqueness
- stable public `gv_id` continuity
- stable external mapping anchors
- a domain-ready architecture for BA, ENG special prints, and future JPN expansion
- a no-drift path from current canon to migration-ready identity storage

This contract selects and freezes the Option B architecture.
It does not execute schema change or canon promotion.

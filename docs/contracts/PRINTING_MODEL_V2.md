# PRINTING_MODEL_V2

Status: DESIGN  
Type: Schema + Ingestion Spec  
Scope: Proposed V2 shape and ownership model for `card_printings` under current Grookai canon  
Authority: Subordinate to `CHILD_PRINTING_CONTRACT_V1`

---

## 1. Purpose

This spec defines the proposed V2 architecture for the child printing layer before any migration or worker changes begin.

It exists to lock:

- the minimal schema extension for `card_printings`
- ingestion ownership of child-printing creation
- deterministic normalization and upsert rules
- provisional traceability for canon-sensitive child handling
- enforcement boundaries that prevent manual drift

This is a design-only artifact. No schema, migration, worker, pricing, vault, or UI change is part of this step.

---

## 2. Locked Constraints

The following constraints are fixed for this design:

- `card_prints` remains canonical identity
- `card_printings` remains child layer only
- `CHILD_PRINTING_CONTRACT_V1` governs all child-layer behavior
- `finish_keys` remains bounded vocabulary
- child printings must be controlled, deterministic, replayable, and ingestion-owned
- child printings may represent only:
  - stable child finish or parallel distinctions under bucket A
  - explicit, traceable provisional child handling under bucket C

This spec does not reopen:

- canonical classification
- `card_prints` identity rules
- generalized multi-axis variant modeling
- pricing redesign
- vault redesign

---

## 3. Repo-Grounded Current State

Current repo reality:

- `public.card_printings` is currently:
  - `id`
  - `card_print_id`
  - `finish_key`
  - `created_at`
- uniqueness is currently enforced on `(card_print_id, finish_key)`
- `finish_key` currently references `public.finish_keys(key)`
- `external_printing_mappings` already exists as the child-mapping table
- `premium_parallel_eligibility` exists, but current raw text matching is not strong enough to be treated as sufficient premium authority

Current worker reality:

- `backend/pokemon/pokemonapi_normalize_worker.mjs` writes `sets`, `card_prints`, `card_print_traits`, and `external_mappings`
- `backend/pokemon/tcgdex_normalize_worker.mjs` writes `sets`, `card_prints`, `card_print_traits`, and `external_mappings`
- neither normalization worker currently owns `card_printings` or `external_printing_mappings`
- current child-printing creation also appears in controlled playbook and repair flows

V2 corrects this ownership gap by moving child-printing truth into controlled ingestion and audited transformation paths only.

---

## 4. Design Goals

PRINTING_MODEL_V2 must:

1. Preserve canon completely.
2. Represent only valid child printings under the contract.
3. Keep child creation ingestion-driven.
4. Make child-printing state deterministic and replayable.
5. Make provisional cases explicit and auditable.
6. Prevent duplicate, implicit, or drifting child states.
7. Preserve a clean future promotion path from child handling into canon.

---

## 5. Schema Design

### 5.1 `public.card_printings`

Current identity remains:

- one child printing per `(card_print_id, finish_key)`

V2 keeps that identity and adds only the minimum fields required for authority and traceability.

Proposed V2 columns:

- `id uuid primary key`
- `card_print_id uuid not null`
- `finish_key text not null`
- `is_provisional boolean not null default false`
- `provenance_source text not null`
- `provenance_ref text null`
- `created_at timestamptz not null default now()`
- `created_by text not null`

Column intent:

- `card_print_id`
  - parent canonical print
  - required
- `finish_key`
  - bounded child finish vocabulary
  - required
- `is_provisional`
  - `false` for stable bucket A child printings
  - `true` for explicit bucket C provisional child handling
- `provenance_source`
  - identifies lawful creation authority
  - bounded operational values for V2:
    - `tcgdex`
    - `pokemonapi`
    - `contract`
    - `manual_audit`
- `provenance_ref`
  - external reference id, contract reference, or audit reference
  - nullable for stable upstream-derived child rows
  - required in practice for provisional rows
- `created_by`
  - identifies the controlled path that wrote the row
  - bounded operational values for V2:
    - `ingestion_worker`
    - `audit_process`
    - `migration`

Proposed constraints:

- `primary key (id)`
- `foreign key (card_print_id) references public.card_prints(id)`
- `foreign key (finish_key) references public.finish_keys(key)`
- `unique (card_print_id, finish_key)`
- `check (btrim(provenance_source) <> '')`
- `check (btrim(created_by) <> '')`
- `check (provenance_ref is null or btrim(provenance_ref) <> '')`

Enforcement notes:

- bucket classification is not a new schema axis in V2
- V2 does not add a `classification` column
- bucket state is represented by `is_provisional` plus provenance
- the rule "provisional is allowed only for explicit bucket C handling" is enforced by controlled ingestion, not by a generalized DB classifier

No additional child axes are introduced.

V2 explicitly does not add:

- `edition`
- `stamp`
- `parallel_type`
- dynamic attribute columns
- generalized variant tables

Reason:

- those distinctions are either already canonical, forbidden in child identity, or canon-sensitive and awaiting separate promotion review

### 5.2 Boundary of Provisional Representation

V2 does not claim to model every bucket C distinction as a first-class child dimension.

V2 allows provisional child rows only when both conditions are true:

1. explicit contract or audited review authorizes temporary child handling
2. the temporary child handling can still be expressed through the locked `finish_key` vocabulary

If a canon-sensitive distinction cannot be expressed lawfully through the locked finish vocabulary, V2 does not create a child row for it.

### 5.3 `public.finish_keys`

No schema expansion is part of V2.

Locked values remain:

- `normal`
- `holo`
- `reverse`
- `pokeball`
- `masterball`

V2 enforcement:

- no dynamic insertion of new finish keys
- no implicit finish-key creation from ingestion
- no finish expansion by source payload interpretation
- finish-key expansion requires explicit contract update and later schema work

### 5.4 `public.external_printing_mappings`

No new schema axis is proposed for `external_printing_mappings` in V2.

V2 rules:

- mapping rows remain subordinate to `card_printings`
- a mapping row may be created only after the target child printing exists
- mappings do not create child authority
- mappings must be written by the same controlled ingestion or audited transformation paths that own child-printing creation

### 5.5 Optional Audit View

V2 includes one optional audit support view:

`v_provisional_printings`

Conceptual definition:

```sql
select *
from public.card_printings
where is_provisional = true;
```

Purpose:

- deterministic audit of bucket C handling
- promotion-candidate review
- debugging and operational verification

This view is optional because it adds no new authority. It exists only to make provisional handling easy to inspect.

---

## 6. Ingestion Model

### 6.1 Ownership

Child-printing creation is owned by controlled ingestion.

Primary V2 owners:

- `backend/pokemon/tcgdex_normalize_worker.mjs` after extension
- `backend/pokemon/pokemonapi_normalize_worker.mjs` after extension
- controlled audit or repair paths operating under explicit contract authority

Forbidden creators:

- UI flows
- pricing workers
- vault flows
- random SQL
- one-off manual edits outside an audited transformation path

### 6.2 Canon Resolution

For every candidate child printing:

1. resolve the parent `card_prints` row first
2. require exactly one parent canonical row
3. never create canonical rows inside child-printing logic

If parent canonical resolution fails, child-printing creation stops.

### 6.3 Finish Signal Extraction

V2 finish extraction is source-aware and normalized before any write occurs.

Upstream sources:

- TCGdex
- PokemonAPI
- explicit contract-driven premium eligibility inputs

Upstream source payloads do not write `finish_key` directly.

### 6.4 Finish Normalization

Normalization is deterministic and bounded.

TCGdex mapping:

- `normal` -> `normal`
- `holofoil` -> `holo`
- `reverse-holofoil` -> `reverse`

PokemonAPI mapping:

- `normal` -> `normal`
- `holo` -> `holo`
- `reverse` -> `reverse`

Premium mapping:

- `pokeball` and `masterball` are never inferred from generic upstream finish labels alone
- premium child creation requires explicit contract-backed eligibility

Unknown or unsupported upstream finish labels do not create child rows.

### 6.5 Classification

Every candidate child printing must be classified before insert.

Stable rule:

- if `finish_key` is one of:
  - `normal`
  - `holo`
  - `reverse`
  - `pokeball`
  - `masterball`
- and no canon conflict exists
- and the child distinction is contract-valid under bucket A
- then:
  - `is_provisional = false`

Provisional rule:

- canon-sensitive distinctions must never be inferred into child rows by generic source normalization
- a bucket C child row may be created only when explicit contract or audited review has already authorized temporary child handling
- if such a row is created:
  - `is_provisional = true`
  - `provenance_source = 'contract'` or `provenance_source = 'manual_audit'` under an audited transformation path
  - `provenance_ref` is required

If a distinction is canon-sensitive and not explicitly authorized for temporary child handling, no child row is created.

### 6.6 Upsert Logic

For each normalized `(card_print_id, finish_key)` candidate:

- if row exists:
  - no-op
- if row does not exist:
  - insert with:
    - `card_print_id`
    - `finish_key`
    - `is_provisional`
    - `provenance_source`
    - `provenance_ref`
    - `created_by`

V2 keeps idempotent child creation anchored to the existing uniqueness rule on `(card_print_id, finish_key)`.

### 6.7 External Printing Mapping Write Order

`external_printing_mappings` is downstream of printing creation.

Required order:

1. resolve canonical parent
2. normalize finish
3. ensure `card_printings` row exists
4. write `external_printing_mappings`

Forbidden order:

- mapping first, then printing resolution later
- mapping rows that imply child existence without a child row

### 6.8 Deletion and Correction Rule

V2 does not allow blind deletion of child rows based only on missing upstream signal.

If a previously known child printing is no longer emitted upstream:

- do not auto-delete
- mark for audit or reconciliation
- require contract-aligned review before removal

Reason:

- upstream omission is not sufficient proof that the child printing was unlawful

---

## 7. Premium Parallel Handling

`pokeball` and `masterball` are contract-governed premium parallels.

V2 rule:

- premium child rows may be created only when eligibility is explicit and deterministic
- raw text-number matching is not sufficient authority
- number comparison must be normalized before eligibility evaluation

Design consequence:

- V2 does not treat the current raw shape of `premium_parallel_eligibility` as sufficient authority by itself
- premium eligibility enforcement moves into controlled ingestion logic using normalized collector-number comparison
- premium creation remains subordinate to contract authority

Operational meaning:

- `pokeball` and `masterball` are lawful child finishes
- their presence must come from contract-backed eligibility, not guesswork

---

## 8. Provisional Handling

Bucket C handling in V2 is explicit and bounded.

Rules:

- provisional child rows must set `is_provisional = true`
- provisional child rows must carry provenance
- provisional child rows must be queryable deterministically
- provisional child rows must not exist only by implication

Required provenance behavior:

- `provenance_ref` must identify the contract or audit artifact authorizing temporary child handling
- `created_by` must identify the controlled path that wrote the row

Restrictions:

- provisional rows must not be treated as stable UI truth
- provisional rows must not become silent permanent truth
- provisional rows must not drive pricing truth as if they were settled canon

Recommended audit surface:

- `v_provisional_printings`

Future promotion compatibility:

- if later canon review promotes the distinction into `card_prints`, child handling defers to canon

---

## 9. Invariant Enforcement

V2 enforcement rules are hard requirements:

1. `card_printings` is derived, not hand-authored.
2. `finish_keys` cannot expand without explicit contract update.
3. no duplicate `(card_print_id, finish_key)` rows are allowed.
4. child-printing creation must occur only through controlled ingestion or audited transformation paths.
5. upstream payloads do not define `finish_key` directly; normalization does.
6. provisional rows must be explicit, traceable, and queryable.
7. child rows cannot override canon.
8. mapping rows cannot substitute for child rows.
9. premium child rows require normalized eligibility enforcement.
10. printing absence is not proof of non-existence and must remain auditable.

---

## 10. Migration Strategy

Design only. Do not implement in this step.

Future migration path:

1. snapshot current child-printing state
2. extend controlled ingestion with V2 normalization and provenance rules
3. rebuild or replay child-printing derivation under V2 rules
4. compare:
   - missing
   - extra
   - mismatched
   - provisional
5. reconcile through controlled migration only

This path preserves canon because canonical `card_prints` remains untouched throughout the transition.

---

## 11. Non-Goals

V2 intentionally avoids over-modeling.

V2 does not introduce:

- multi-axis child-printing tables
- stamp columns
- edition columns
- generalized variant attribute engines
- new canonical identity rules

Reason:

- canon owns identity complexity
- child layer remains finish-bounded
- provisional state captures uncertainty without silently redefining canon

---

## 12. Result

After PRINTING_MODEL_V2:

- child-printing creation becomes deterministic
- ingestion owns child truth
- reverse and finish-child derivation becomes replayable
- premium drift is blocked by normalized eligibility enforcement
- provisional cases become visible and auditable
- future promotion from provisional child handling into canon remains clean
- canonical `card_prints` remains untouched

## 13. Final Recommendation

- Spec Status: READY FOR REVIEW
- Migration Ready: NO
- Worker Ready: NO
- Next Lawful Step: review this spec against `CHILD_PRINTING_CONTRACT_V1`, then convert accepted sections into migration and worker tasks

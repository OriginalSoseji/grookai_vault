# CHECKPOINT — BA Phase 7 Card Print Identity Table Design V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact design for `public.card_print_identity` without writing migration SQL
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Target Table

Target table:

```text
public.card_print_identity
```

Purpose:

- store canonical printed-identity authority outside `card_prints`
- own identity uniqueness
- support versioned identity law by domain
- represent BA 4D identity losslessly without widening `card_prints`

---

## 2. Exact Column Design

| Column | Design Type / Default | Purpose | Nullability Reason | Domain Scope | Explicit vs Payload |
|---|---|---|---|---|---|
| `id` | `uuid not null default gen_random_uuid()` | Stable row identifier for the identity authority object | Never nullable; follows current repo UUID/default pattern | All domains | Explicit column |
| `card_print_id` | `uuid not null` | Parent canonical object anchor | Never nullable because identity rows are subordinate to canonical `card_prints` | All domains | Explicit column |
| `identity_domain` | `text not null` | Selects the contract-governed identity law family | Never nullable because hash and uniqueness are domain-scoped | All domains | Explicit column |
| `set_code_identity` | `text not null` | Stores the canonical set or release code used by identity law | Never nullable because every approved domain keys identity to a set/release container | All domains | Explicit column |
| `printed_number` | `text not null` | Stores the canonical printed number token used by identity law | Never nullable because every approved domain requires a printed-number lane | All domains | Explicit column |
| `normalized_printed_name` | `text null` | Stores the comparison-safe printed name used by identity law | Nullable at table level so schema introduction can precede full backfill and so future domains can explicitly approve an equivalent identity-name field before making this mandatory | Required by all currently approved domains at active-row state | Explicit column |
| `source_name_raw` | `text null` | Stores raw source-captured printed evidence when the domain law requires it | Nullable because only BA and future audit-backed domains require it | Domain-specific | Explicit column |
| `identity_payload` | `jsonb not null default '{}'::jsonb` | Holds governed domain-specific identity dimensions that do not belong in universal columns | Never nullable so extension data is always structurally present and serialization is stable | Domain-specific | Payload extension zone |
| `identity_key_version` | `text not null` | Names the exact contract version that governs hash inputs for the row | Never nullable because uniqueness and replay depend on versioned law | All domains | Explicit column |
| `identity_key_hash` | `text not null` | Stores the deterministic identity hash used for uniqueness and lookup | Never nullable because uniqueness must not depend on ad hoc composite matching | All domains | Explicit column |
| `is_active` | `boolean not null default true` | Marks the one canonical identity row currently in force for a `card_print` | Never nullable because active-row constraints depend on it | All domains | Explicit column |
| `created_at` | `timestamptz not null default now()` | Creation timestamp | Never nullable; standard repo audit field | All domains | Explicit column |
| `updated_at` | `timestamptz not null default now()` | Update timestamp for identity-row lifecycle changes | Never nullable; standard repo audit field | All domains | Explicit column |

---

## 3. Explicit Column vs Payload Rule

Explicit columns are reserved for:

- cross-domain identity fields already proven necessary
- uniqueness primitives
- lifecycle / parent-binding fields

`identity_payload` is reserved for:

- domain-specific discriminators
- domain-specific compatibility bridge fields
- domain-specific evidence fields that are lawful identity inputs but not universal

Hard rule:

- no future identity discriminator may be hidden in `variant_key` on `card_prints`
- new dimensions must either become governed payload keys or explicit columns through contract update

---

## 4. Intended Constraint Design

### C1 — PK

Primary key on `id`.

Intent:

- stable identity-authority row handle

Rollout order:

- created with the table

### C2 — FK

Foreign key:

```text
card_print_id -> public.card_prints(id)
```

Intent:

- keep `card_print_identity` subordinate to the durable canonical object

Rollout order:

- created with the table

### C3 — One Active Identity Per Canonical Row

Intent:

```text
unique(card_print_id) where is_active = true
```

Implementation note:

- in Postgres this is expressed as a partial unique index, even though it is a design-level constraint

Rollout order:

- created at schema-introduction time before backfill so duplicate-active rows fail closed during population

### C4 — Canonical Identity Uniqueness

Intent:

```text
unique(identity_domain, identity_key_version, identity_key_hash) where is_active = true
```

Implementation note:

- this is also expressed as a partial unique index in Postgres

Rollout order:

- created at schema-introduction time before backfill so collisions fail closed

### C5 — Domain Guard

Intent:

`identity_domain` must be limited to the approved contract domains:

- `pokemon_eng_standard`
- `pokemon_ba`
- `pokemon_eng_special_print`
- `pokemon_jpn`

Exact design:

- implement as a `CHECK` constraint in V1
- expansion requires explicit contract update and explicit migration

Rollout order:

- created with the table

### C6 — No Identity-Less Canonical Row After Backfill Completion

Intent:

- every `card_prints` row must have exactly one active `card_print_identity` row after backfill completes

Important:

- this is a final-state invariant, not the initial table DDL constraint for Phase 8
- V1 does not add a parent-side binding column or trigger in this design phase
- V1 enforces C6 as a post-backfill verification gate using anti-join proofs before BA enablement

Rollout order:

1. introduce table and C1-C5
2. backfill existing canon rows
3. verify `NOT EXISTS` identity-less parent rows
4. only after proof may BA enablement proceed

---

## 5. Updated-At Behavior

Exact design intent:

- `updated_at` follows the repo-standard trigger pattern using `public.set_timestamp_updated_at()`

This is design only.
No trigger SQL is written in this phase.

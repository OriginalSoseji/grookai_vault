# CHECKPOINT — BA Phase 7 Card Print Identity Index Design V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact index design for `public.card_print_identity`
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Index Inventory

| Index / Intent Name | Definition Intent | Query Supported | Unique? | Required For |
|---|---|---|---|---|
| `uq_card_print_identity_active_card_print_id` | `(card_print_id) where is_active = true` | Fetch the one active identity row for a known `card_print_id` and prevent duplicate-active parents | Yes, partial | Backfill and steady-state |
| `idx_card_print_identity_card_print_id` | `(card_print_id)` | History lookup for all identity rows tied to one `card_print_id` | No | Backfill and steady-state |
| `idx_card_print_identity_identity_domain` | `(identity_domain)` | Domain-scoped audits, domain backfill batches, and domain-specific promotion lanes | No | Backfill and steady-state |
| `uq_card_print_identity_active_domain_hash` | `(identity_domain, identity_key_version, identity_key_hash) where is_active = true` | Active canonical lookup by domain/version/hash and collision prevention | Yes, partial | Backfill and steady-state |
| `idx_card_print_identity_domain_set_code_number` | `(identity_domain, set_code_identity, printed_number)` | Set/release plus number lookup during BA and domain-specific audits | No | Steady-state and BA enablement |
| `idx_card_print_identity_domain_normalized_name_not_null` | `(identity_domain, normalized_printed_name) where normalized_printed_name is not null` | Domain-qualified name lookups when normalized identity name is present | No, partial | Backfill and steady-state |

---

## 2. Exact Support Rules

### Lookup by `card_print_id`

Supported by:

- `uq_card_print_identity_active_card_print_id`
- `idx_card_print_identity_card_print_id`

Reason:

- active lookup and historical lookup have different access patterns

### Lookup by `identity_domain`

Supported by:

- `idx_card_print_identity_identity_domain`

Reason:

- backfill and audits will batch by domain

### Lookup by `identity_key_hash`

Supported by:

- `uq_card_print_identity_active_domain_hash`

Reason:

- active canonical identity lookup must already carry `identity_domain` and `identity_key_version`
- no redundant second hash index is required in V1

### Lookup by `set_code_identity + printed_number`

Supported by:

- `idx_card_print_identity_domain_set_code_number`

Reason:

- the domain qualifier is included intentionally because identical set/number pairs can exist across domains

### Lookup by `normalized_printed_name` when populated

Supported by:

- `idx_card_print_identity_domain_normalized_name_not_null`

Reason:

- name-only lookups are meaningful only when domain-qualified and when the field is populated

---

## 3. Rollout Order

1. Create both partial-unique indexes at schema introduction so duplicate writes fail closed.
2. Create supporting non-unique indexes at schema introduction.
3. Do not add redundant indexes that duplicate the active uniqueness indexes without a proven query need.

No SQL is written in this phase.

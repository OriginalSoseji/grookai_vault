# GROOKAI VAULT — PRICING MIGRATION CLEANUP V1

## 1. TITLE

GROOKAI VAULT — PRICING MIGRATION CLEANUP V1  
Status: ACTIVE  
Scope: Final detachment of pricing system from `vault_items` and full alignment to canonical instance-based ownership (`vault_item_instances`)

## 2. OBJECTIVE

Ensure the pricing system:

```text
uses ONLY canonical ownership truth
```

and fully eliminates:

```text
all bucket-based assumptions (vault_items.qty)
```

while preserving:

- correctness
- performance
- dual-run validation integrity

This follows best practice of **validating and phasing out legacy systems only after parity is proven**, rather than immediate removal ([Atlan][1])

## 3. CURRENT VERIFIED STATE

From prior work:

- pricing scheduler uses instance counts ✅
- pricing backfill uses instance counts ✅
- pricing live request uses instance counts ✅
- dual-run parity check passed (`mismatchCount = 0`) ✅

Remaining risk:

```text
hidden or indirect vault_items dependency
```

## 4. PRICING SURFACES AUDITED

### 4.1 Files

- `backend/pricing/pricing_scheduler_v1.mjs`
- `backend/pricing/pricing_backfill_worker_v1.mjs`
- `supabase/functions/pricing-live-request/index.ts`

### 4.2 Dependency Types Checked

- direct queries to `vault_items`
- joins involving `vault_items`
- `qty` usage
- derived metrics based on bucket counts
- fallback logic referencing bucket data
- indirect dependencies via views

## 5. PRE-FIX BEHAVIOR (LEGACY)

Previously pricing relied on:

```text
vault_items.qty
→ aggregated ownership
→ ranking / intensity metrics
```

Problems:

- ambiguous ownership
- drift risk
- mismatch with actual objects

## 6. CANONICAL MODEL (POST-CUTOVER)

Pricing now derives:

```sql
count(*) filter (where archived_at IS NULL)
from vault_item_instances
```

Meaning:

```text
each owned object = 1 unit of signal
```

## 7. CLEANUP ACTIONS

### 7.1 Remove All Direct Bucket Usage

Confirm and enforce:

- NO `SELECT ... FROM vault_items` in pricing
- NO `qty` references
- NO joins to `vault_items` for ownership

### 7.2 Remove Hidden Dependency Paths

Audit and eliminate:

- views that internally depend on `vault_items`
- helper functions that still aggregate bucket data
- legacy code paths left behind during refactor

### 7.3 Enforce Canonical Query Pattern

All pricing logic must follow:

```sql
select
  card_print_id,
  count(*) filter (where archived_at is null) as owned_count
from vault_item_instances
group by card_print_id;
```

### 7.4 Normalize Ownership Signal

Ensure all ranking logic uses:

```text
owned_count (instance-based)
```

NOT:

```text
qty
```

## 8. VALIDATION

### 8.1 Dual-Run Verification (Already Proven)

```text
mismatchCount = 0
```

Meaning:

```text
instance counts == bucket counts (during migration)
```

### 8.2 Final Canonical Validation

Run:

```sql
select
  card_print_id,
  count(*) as instance_count
from vault_item_instances
where archived_at is null
group by card_print_id;
```

Ensure pricing outputs match this distribution.

## 9. RESULT

Classification:

```text
PASS
```

Reason:

- no remaining pricing dependency on `vault_items`
- canonical instance truth fully adopted
- dual-run parity proven
- no migration required

## 10. REMAINING RISKS

None in pricing layer.

Remaining risks exist only in:

- historical `vault_item_id` consumers
- reconciliation-required systems

## 11. HARD RULES (PRICING)

1. Pricing MUST use instance truth only
2. Pricing MUST NOT reference `vault_items`
3. Ownership signal MUST be derived, not stored
4. Any future pricing feature MUST be GVVI-compatible

## 12. NEXT STEP

```text
isolate historical vault_item_id consumers
```

This is required before:

- fingerprint system expansion
- condition system migration
- marketplace object binding

## 13. FINAL STATE

Pricing system is now:

```text
GVVI-native
fully detached from bucket semantics
safe for future expansion
```

## FINAL TERMINAL SUMMARY

- pricing dependencies converted: 3 core systems
- canonical instance metrics confirmed
- bucket removed from pricing truth
- no remaining pricing dependencies on `vault_items`
- destructive removal deferred
- next step: isolate historical `vault_item_id` consumers

[1]: https://atlan.com/data-warehouse-migration-best-practices/?utm_source=chatgpt.com "10 Data Warehouse Migration Best Practices to Follow"

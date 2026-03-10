# PRICING_SURFACE_GUARD_V1.md

**Status:** ACTIVE — Binding Contract
**Date:** 2026-02-18

## 1. Purpose

This contract ensures Grookai Vault pricing surfaces are **truthful** and do not misrepresent pricing availability. It blocks regressions where a vault item shows a pricing source or timestamp when no price exists.

This contract applies to:

* `public.v_best_prices_all_gv_v1`
* `public.v_vault_items`
* Downstream surfaces inheriting from `v_vault_items` (e.g., `v_recently_added`)
* `public.v_vault_items_ext` and downstream `v_vault_items_web`

---

## 2. Core Truthfulness Rules

### Rule 2.1 — No Fake Source When Unpriced (Vault Surface)

If a vault item has `price` NULL (or `market_price` NULL), then:

* `price_source` MUST be NULL
* `price_ts` MUST be NULL (if surfaced)

**Rationale:** A NULL price means pricing was not available; the surface must not claim an authoritative source.

---

### Rule 2.2 — No Fake Base Source/Timestamp When Unpriced (Pricing Compatibility Surface)

In `public.v_best_prices_all_gv_v1`:

If `base_market` is NULL, then:

* `base_source` MUST be NULL
* `base_ts` MUST be NULL

**Rationale:** `card_print_active_prices` may contain placeholder/seed rows. A NULL Grookai Value must not be treated as a priced state.

---

## 3. Required Verification Queries

### 3.1 Verify Rule 2.2 (v_best_prices_all_gv_v1 truthfulness)

Expected result: `violations = 0`

```sql
select
  count(*) as violations
from public.v_best_prices_all_gv_v1
where base_market is null
  and (base_source is not null or base_ts is not null);
```

---

### 3.2 Verify Rule 2.1 (v_vault_items truthfulness)

Expected result: `violations = 0`

```sql
select
  count(*) as violations
from public.v_vault_items
where price is null
  and (price_source is not null or price_ts is not null);
```

---

### 3.3 Coverage Snapshot (Operational Sanity)

This query is informational. It should reflect current system state.

```sql
select
  count(*) as vault_rows,
  count(*) filter (where price is not null) as priced_rows,
  count(*) filter (where price_source = 'grookai.value.v1') as grookai_sourced_rows,
  count(*) filter (where price_source is null) as null_source_rows
from public.v_vault_items;
```

---

## 4. Enforcement

* Any PR/migration that changes the pricing surfaces MUST run the verification queries above.
* If any verification returns `violations > 0`, the change is rejected.
* Fix must be applied via versioned view evolution or repair migrations (no rewriting applied migration history).

---

## 5. Notes

This guard is compatible with future pricing versions (`v_grookai_value_v2`, etc.). The truthfulness rules remain unchanged across versions.

---

## PROOF OF SUCCESS

After creating the file:

* Show `git status` (should show only `docs/contracts/PRICING_SURFACE_GUARD_V1.md` added).
* Stop.

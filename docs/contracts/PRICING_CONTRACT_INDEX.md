# PRICING_CONTRACT_INDEX.md

**Status: ACTIVE — Binding Governance Document**

## 1. Purpose

This document defines all invariant rules governing Grookai Vault pricing logic.

No pricing logic may be modified unless it preserves these contracts.

Violations block promotion.

---

## 2. Versioning Contract

### Rule 2.1 — Immutable Versions

Every pricing engine upgrade must create a new versioned view:

* `v_grookai_value_v1`
* `v_grookai_value_v2`
* `v_grookai_value_v3`

Never modify an existing version in place.

---

### Rule 2.2 — Parallel Operation

Before promotion:

* New version must run side-by-side with current version.
* Comparison queries must exist.
* Backtest results must be documented.

---

## 3. Bounding Contract

### Rule 3.1 — NM Bounds

For any version:

`grookai_value_nm ∈ [min(nm_floor, nm_median), max(nm_floor, nm_median)]`

This must always hold.

Required validation query:

```sql
select count(*) as violations
from v_grookai_value_vX
where grookai_value_nm is not null
  and (
    grookai_value_nm < least(nm_floor, nm_median)
    or grookai_value_nm > greatest(nm_floor, nm_median)
  );
```

Must return 0.

---

### Rule 3.2 — Null Integrity

If either:

* `nm_floor` is null
* `nm_median` is null

Then:

`grookai_value_nm must be null`

No synthetic fallback.

---

## 4. Monotonic Safety Contract

### Rule 4.1 — Liquidity Monotonicity

Holding floor and median constant:

If `listing_count` increases, Grookai Value must not move away from median.

This must be provable analytically for each version.

---

### Rule 4.2 — No Confidence Escalation

Confidence may:

* Temper downward
* Not amplify beyond median

Final value must still obey bounding contract.

---

## 5. Data Source Contract

### Rule 5.1 — V1 Source Restriction

`v_grookai_value_v1` may only reference:

* `public.card_print_active_prices`

No legacy pricing views.
No cross joins.
No UI-derived fields.

---

### Rule 5.2 — Sold Data Introduction

Sold data may only be introduced in V5 or later.

Must be:

* Separately auditable
* Independently bounded
* Non-dominant without validation.

---

## 6. Floor Guard Contract (For V1.1+)

If effective floor guard is introduced:

It must:

* Never exceed `nm_median`
* Be deterministic
* Be percentage-based or statistically derived
* Be documented with threshold rationale

---

## 7. Nonlinear Curve Contract (For V2+)

If liquidity curve changes:

It must:

1. Still produce `w ∈ [0,1]`
2. Still satisfy bounding contract
3. Be mathematically monotonic increasing with `listing_count`
4. Have a closed-form expression (no randomness)

---

## 8. Scarcity & Momentum Contract (V3+)

Any upward bias must:

* Never exceed `nm_median`
* Be bounded
* Be capped (e.g., max +5%)
* Be reversible if signal weakens

No unlimited upward drift.

---

## 9. Deployment Contract

Before promotion, must complete:

Audit → Backtest → Simulate → Migrate → Verify

Must produce:

* Bounds proof
* Distribution shift comparison
* Segment analysis (thin vs thick markets)
* 30-day sample comparison

---

## 10. Freeze Rule

Pricing upgrades may NOT be deployed during:

* Major set release week
* Market pump events
* Known volatility spikes

Deployment must occur during stable pricing windows.

---

## 11. Rollback Guarantee

Every version must be:

* Pure SQL view
* Reversible by switching consumer view
* Backwards compatible

No destructive schema mutation allowed in pricing layer.

---

## 12. Canonical Invariant Summary

Grookai Value must always be:

* Deterministic
* Bounded
* Monotonic-safe
* Liquidity-aware
* Versioned
* Auditable
* Explainable

## If any of these are violated, the version is rejected.

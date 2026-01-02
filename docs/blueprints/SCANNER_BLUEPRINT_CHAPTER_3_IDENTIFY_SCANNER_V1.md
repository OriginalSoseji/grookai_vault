# Chapter 3 — Identify-Only Scanner (No-Write Path) (V1)

**Status:** LOCKED (inherits Blueprint V1 lock)  
**Backlink:** [Book Index](./SCANNER_BLUEPRINT_BOOK_INDEX_V1.md)

Hard rule: Identify-only performs zero persistence.

---

## 3.1 IDENTIFY_ONLY_REQUEST_CONTRACT_V1 (Step C1)

In-memory normalization + identify request. No storage uploads, no snapshots.

Proof:

```sql
select count(*)
from public.condition_snapshots
where created_at > now() - interval '5 minutes';
```

---

## 3.2 IDENTIFY_MATCHING_CONTRACT_V1

Ranked candidates with identity confidence; ambiguity is first-class.

---

## 3.3 IDENTIFY_RESULTS_UI_CONTRACT_V1 (Step C2)

UI clearly labels “Not saved” and does not imply persistence.

---

## 3.4 IDENTIFY_PROMOTE_TO_VAULT_CONTRACT_V1 (Step C3)

Explicit promotion; Write Gate enforced; no silent writes.

# Chapter 2 — Condition Assist Scanner (Write Path) (V1)

**Status:** LOCKED (inherits Blueprint V1 lock)  
**Backlink:** [Book Index](./SCANNER_BLUEPRINT_BOOK_INDEX_V1.md)

---

## 2.1 CONDITION_SNAPSHOT_CREATE_CONTRACT_V1

Create immutable snapshot via `scan-upload-plan` + PUT + `condition_snapshots_insert_v1`.

Proof:

```sql
select id, vault_item_id, created_at
from public.condition_snapshots
where id = '<snapshot_id>';
```

---

## 2.2 CONDITION_ANALYSIS_TRIGGER_CONTRACT_V1 (Step A1)

Auto-trigger measurement workers after snapshot insert. No manual CLI.

Proof:

```sql
select snapshot_id
from public.v_condition_snapshot_latest_analysis
where snapshot_id = '<snapshot_id>';
```

---

## 2.3 CONDITION_RESULTS_BINDING_CONTRACT_V1 (Step A2)

Results UI binds to:

* `scan-read(snapshot_id)` signed URLs
* `v_condition_snapshot_latest_analysis`

Synthetic only for stub snapshot IDs.

---

## 2.4 CONDITION_HISTORY_UI_CONTRACT_V1 (Step A3)

Append-only history; view-only; versions and confidence visible.

---

## 2.5 CONDITION_ANALYSIS_ORCHESTRATOR_CONTRACT_V1 (Optional)

Operational simplification: single worker binary running multiple modules.

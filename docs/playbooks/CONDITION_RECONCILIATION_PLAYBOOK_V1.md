# GROOKAI VAULT — CONDITION RECONCILIATION PLAYBOOK V1

## 1. TITLE

GROOKAI VAULT — CONDITION RECONCILIATION PLAYBOOK V1  
Status: ACTIVE  
Scope: Define how condition snapshots / scans transition from `vault_item_id` (episode) to GVVI (object identity)

## 2. OBJECTIVE

Define deterministic rules for handling condition/scan data where:

```text
vault_item_id → may represent multiple physical objects
```

and the system now requires:

```text
GVVI → one real object
```

Goal:

```text
preserve truth
avoid false precision
enable future object-level condition system
```

## 3. CORE PRINCIPLE

```text
NEVER ASSIGN A CONDITION SNAPSHOT TO A SPECIFIC OBJECT WITHOUT PROOF
```

If uncertain:

```text
PRESERVE AS UNASSIGNED
```

Ambiguity must be modeled explicitly, not hidden. This aligns with reconciliation best practices where uncertainty is retained rather than forced into incorrect mappings.

## 4. DATA MODEL DEFINITIONS

### 4.1 Historical Anchor

```text
vault_item_id → ownership episode context
```

### 4.2 Canonical Object

```text
gv_vi_id → single physical card
```

### 4.3 Condition Snapshot

Represents:

- scan
- condition measurements
- metadata

## 5. CLASSIFICATION RULES

Every condition snapshot must be classified:

### A. DETERMINISTIC (SAFE)

Criteria:

```text
1 vault_item_id
1 active GVVI
1 snapshot
```

Action:

```text
MIGRATE → assign gv_vi_id
```

### B. AMBIGUOUS (HOLD)

Criteria:

```text
1 vault_item_id
multiple GVVI
snapshot count < instance count
```

Action:

```text
KEEP → vault_item_id
MARK → unassigned_to_instance = true
```

### C. PARTIAL MATCH (SPECIAL)

Criteria:

```text
multiple instances
multiple snapshots
but not equal
```

Action:

```text
NO AUTO-MIGRATION
REQUIRES USER OR FUTURE LOGIC
```

### D. NON-OBJECT SNAPSHOT

Criteria:

```text
bulk condition (e.g. "2 cards NM")
```

Action:

```text
FREEZE as historical
NO MIGRATION
```

## 6. RECONCILIATION STRATEGIES

### Strategy 1 — Deterministic Migration

```text
if exactly 1 instance → assign gv_vi_id
```

### Strategy 2 — Unassigned State

Introduce concept:

```text
condition_snapshot.gv_vi_id = NULL
condition_snapshot.unassigned = TRUE
```

Meaning:

```text
belongs to collection, not specific object
```

### Strategy 3 — User Resolution (Future)

Allow:

```text
user selects which card this scan belongs to
```

Only when needed.

### Strategy 4 — Deferred

Leave unresolved:

```text
until system gains enough signal
```

## 7. MIGRATION RULES

### Rule 1

```text
NO BULK AUTO-MAPPING
```

### Rule 2

```text
NO DUPLICATION OF SNAPSHOTS
```

### Rule 3

```text
NO RANDOM ASSIGNMENT
```

### Rule 4

```text
NO DATA LOSS
```

### Rule 5

```text
ALL MAPPINGS MUST BE AUDITABLE
```

## 8. SAFE MIGRATION PROCESS

### Step 1 — Identify deterministic rows

```sql
select vault_item_id
from vault_items
join vault_item_instances
group by vault_item_id
having count(*) = 1;
```

### Step 2 — Apply mapping

```sql
update condition_snapshots cs
set gv_vi_id = i.gv_vi_id
from vault_item_instances i
where cs.vault_item_id = i.vault_item_id
  and i.archived_at is null;
```

### Step 3 — Verify

```sql
select count(*)
from condition_snapshots
where vault_item_id is not null
  and gv_vi_id is null
  and deterministic = true;
```

Expected:

```text
0
```

## 9. HIGH-RISK SCENARIOS

Do NOT migrate automatically when:

- multiple instances created from one bucket row
- multiple scans uploaded historically
- scans taken before instance identity existed
- condition edits represent aggregate state

## 10. FUTURE MODEL

Final system will support:

```text
condition_snapshots → gv_vi_id (primary)
condition_snapshots → vault_item_id (historical only)
```

## 11. HARD RULES

1. GVVI = only object-level truth
2. `vault_item_id` = historical only
3. ambiguous data stays ambiguous
4. user-visible condition must not lie
5. reconciliation must be reversible or auditable

## 12. VALIDATION REQUIREMENT

All reconciliation must include:

- record-level validation
- count validation
- no duplication
- no orphaned data

Consistent validation ensures migration correctness and prevents downstream inconsistencies.

## 13. RESULT

This playbook guarantees:

```text
correct object-level condition system
+
preserved historical meaning
+
no data corruption
```

## 14. NEXT STEP

After playbook approval:

```text
execute FIRST deterministic condition snapshot migration (Category A)
```

Then:

```text
design user-assisted resolution UI
```

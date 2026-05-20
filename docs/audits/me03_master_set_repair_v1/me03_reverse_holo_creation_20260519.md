# ME03 Reverse Holo Creation Gate

Date: 2026-05-19

Scope: pre-execution candidate audit for missing ME03 Reverse Holo child
printings.

Result: `CANDIDATES_CLEAN_WRITE_DEFERRED`

No child printings were inserted because the paired ghost-row removal gate did
not pass, and applying this lane alone would leave ME03 at 209 master-set
objects instead of the required 203.

## Candidate Gate

| Check | Result |
| --- | ---: |
| Reverse Holo candidates | 79 |
| Distinct parent numbers | 79 |
| Existing reverse child rows | 0 |
| Proposed `printing_gv_id` collisions | 0 |
| Missing parent `gv_id` | 0 |
| Ghost target candidates | 0 |
| Duplicate proposed `printing_gv_id` values | 0 |

## Candidate Rule

Candidate row shape:

```text
card_print_id = existing ME03 parent id
finish_key = reverse
printing_gv_id = <parent_gv_id>-RH
is_provisional = false
provenance_source = me03_master_set_repair_v1
provenance_ref = carddex:pokecottage:20260519
created_by = codex:me03_master_set_repair_v1
```

## Espurr Check

`GV-PK-ME03-033` is in the candidate set and would receive:

```text
GV-PK-ME03-033-RH
```

No row was created in this run.


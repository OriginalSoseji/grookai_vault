# GROOKAI VAULT — FIRST UNASSIGNED SCAN ASSIGNMENT UI V1

## Title

GROOKAI VAULT — FIRST UNASSIGNED SCAN ASSIGNMENT UI V1

## Date

2026-03-16

## Objective

Add the first **user-assisted assignment UI** for unassigned condition snapshots so a user can explicitly map:

```text
condition_snapshots.gv_vi_id = NULL
```

to:

```text
a selected GVVI
```

No auto-assignment was added. No scanner flow was changed. No already-assigned snapshot can be overwritten. `vault_item_id` remains preserved.

## Files Changed

- [20260316121500_condition_snapshots_assignment_lane_v1.sql](/c:/grookai_vault/supabase/migrations/20260316121500_condition_snapshots_assignment_lane_v1.sql)
- [getAssignmentCandidatesForSnapshot.ts](/c:/grookai_vault/apps/web/src/lib/condition/getAssignmentCandidatesForSnapshot.ts)
- [assignConditionSnapshotAction.ts](/c:/grookai_vault/apps/web/src/lib/condition/assignConditionSnapshotAction.ts)
- [AssignConditionSnapshotDialog.tsx](/c:/grookai_vault/apps/web/src/components/condition/AssignConditionSnapshotDialog.tsx)
- [ConditionSnapshotSection.tsx](/c:/grookai_vault/apps/web/src/components/condition/ConditionSnapshotSection.tsx)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)

## Candidate Selection Rules

Candidate helper added:

```text
apps/web/src/lib/condition/getAssignmentCandidatesForSnapshot.ts
```

Function:

```ts
getAssignmentCandidatesForSnapshot(userId, snapshotId, cardPrintId)
```

Candidate rules implemented:

- authenticated user scope only
- snapshot must exist for the same user
- snapshot must still be unassigned:
  - `gv_vi_id IS NULL`
  - `vault_item_id IS NOT NULL`
- candidate instances must be:
  - same user
  - active only: `archived_at IS NULL`
  - same card scope only

Candidate preference order:

```text
1. lineage match: vault_item_instances.legacy_vault_item_id = snapshot.vault_item_id
2. fallback: same user + same card_print_id
```

Sort order:

- lineage matches first
- newest first within the same match class

No cross-card guessing is allowed.

## Assignment Action Rules

Server action added:

```text
apps/web/src/lib/condition/assignConditionSnapshotAction.ts
```

Action:

```ts
assignConditionSnapshotAction({ snapshotId, gvviId, cardPrintId })
```

Validation rules implemented:

1. authenticated user required
2. snapshot must exist for that user
3. snapshot must still have `gv_vi_id IS NULL`
4. snapshot must still have `vault_item_id IS NOT NULL`
5. selected GVVI must:
   - belong to the same user
   - be active
   - match the same card context as the current card page
6. assignment updates only:
   - `condition_snapshots.gv_vi_id`
7. no reassignment path exists
8. no historical fields are modified

Repo-truth adjustment:

- `condition_snapshots` was previously fully append-only
- a minimal migration was required to allow exactly one update shape:

```text
gv_vi_id: NULL → NON-NULL
with every other field unchanged
```

That lane is enforced by the updated [20260316121500_condition_snapshots_assignment_lane_v1.sql](/c:/grookai_vault/supabase/migrations/20260316121500_condition_snapshots_assignment_lane_v1.sql).

## UI Behavior

UI component added:

```text
apps/web/src/components/condition/AssignConditionSnapshotDialog.tsx
```

Section behavior:

- unassigned rows now show `Assign` only when valid candidates exist
- assigned rows do not show assignment controls
- the dialog title is:

```text
Assign this scan to a card
```

Dialog candidate list shows:

- GVVI
- created date
- lineage match badge when applicable

Actions:

- Confirm assignment
- Cancel

On success:

- no optimistic state rewrite beyond route refresh
- card detail refreshes
- assigned row is expected to move from `Unassigned scan` to `Assigned to owned card`

## Verification

Replay proof:

- `supabase db reset --local` passed with the new assignment-lane migration included

Type safety:

- `npm run typecheck` in `apps/web` passed

Build:

- `npm run build` in `apps/web` did not complete within the time window
- no assignment-specific build error was surfaced before timeout

Local runtime-data limitation:

- rebuilt local dataset currently has no `condition_snapshots` rows
- because of that, no real end-to-end assignment click path could be exercised without fabricating snapshot state

Verifiable from current local repo truth:

- Case 2: already-assigned snapshots do not expose assignment in the UI contract
- Case 4: no candidates means no Assign button because candidate map is empty

Not directly verifiable locally yet:

- Case 1: unassigned snapshot with one valid candidate
- Case 3: invalid candidate / mismatched user against a real snapshot row

## Result

```text
PASS WITH FOLLOW-UP
```

Reason:

- assign UI was added
- assignment action was added
- card-scoped candidate selection is deterministic
- overwrite and reassignment are blocked
- replay passed
- typecheck passed
- local environment had no real snapshot rows to prove the full assignment path end to end

## Next Step

```text
wait for real snapshot data and verify end-to-end
```

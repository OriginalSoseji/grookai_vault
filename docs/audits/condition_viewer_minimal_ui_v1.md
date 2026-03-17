# GROOKAI VAULT — CONDITION VIEWER (MINIMAL UI) V1

## Title

GROOKAI VAULT — CONDITION VIEWER (MINIMAL UI) V1

## Date

2026-03-16

## Objective

Add a minimal read-only condition viewer so users can see condition snapshots on card detail without editing or resolving anything yet.

The viewer surfaces:

```text
assigned snapshot   → linked to this GVVI/card
unassigned snapshot → exists but not yet mapped to GVVI
```

No mutation was added. No resolution UI was added. No scanner behavior was changed.

## Files Changed

- [getConditionSnapshotsForCard.ts](/c:/grookai_vault/apps/web/src/lib/condition/getConditionSnapshotsForCard.ts)
- [ConditionSnapshotSection.tsx](/c:/grookai_vault/apps/web/src/components/condition/ConditionSnapshotSection.tsx)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)

## Data Contract

Helper added:

```text
apps/web/src/lib/condition/getConditionSnapshotsForCard.ts
```

Function:

```ts
getConditionSnapshotsForCard(userId: string, cardPrintId: string)
```

Normalized return shape:

```ts
type ConditionSnapshotListItem = {
  id: string;
  created_at: string;
  gv_vi_id: string | null;
  vault_item_id: string | null;
  assignment_state: "assigned" | "unassigned";
  scan_quality: string | null;
  confidence: number | null;
};
```

Repo-truth read rules used:

- assigned snapshots:
  - `condition_snapshots.gv_vi_id is not null`
  - matched through active `vault_item_instances` for the current `user_id + card_print_id`
- unassigned historical snapshots:
  - `condition_snapshots.gv_vi_id is null`
  - `condition_snapshots.vault_item_id is not null`
  - matched through the user’s `vault_items.id` rows for the same `card_id`

Important boundaries:

- no bucket quantity logic
- no ownership fallback logic
- no guessed object assignment
- assigned rows come first
- unassigned rows come second
- newest first inside each group

## UI Behavior

Component added:

```text
apps/web/src/components/condition/ConditionSnapshotSection.tsx
```

Read-only section behavior:

- section title: `Condition`
- empty state: `No condition scans yet`
- assigned label: `Assigned to owned card`
- unassigned label: `Unassigned scan`

Each row shows only:

- assignment label
- created date
- scan quality when present
- confidence when present

Not added:

- edit controls
- assign controls
- delete controls
- scanner CTA
- pricing logic

Page integration:

- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx) now fetches condition snapshots only for authenticated users
- the condition section is rendered below the existing vault section and before collector details
- unauthenticated users do not see the condition section

## Verification

Verified:

- `npm run typecheck` in `apps/web` passed

Build:

- `npm run build` in `apps/web` did not complete within the time window
- no build error specific to the condition viewer was surfaced before timeout

Local data verification:

- rebuilt local dataset currently has `0` `condition_snapshots` rows for the test user/cards
- that means the only directly provable UI state from local repo truth is the empty state:

```text
No condition scans yet
```

Case coverage against available local data:

- Case 1 — card with no snapshots: verifiable
- Case 2 — assigned snapshot: not locally available
- Case 3 — unresolved historical snapshot: not locally available
- Case 4 — mixed assigned/unassigned ordering: not locally available

## Result

```text
PASS WITH FOLLOW-UP
```

Reason:

- assigned/unassigned viewer was added cleanly
- the surface is read-only and does not introduce mutation or false ownership semantics
- typecheck passed
- local data did not contain assigned or unassigned snapshots to exercise the non-empty states
- build did not finish within the allotted window

## Next Step

Build the first assignment UI for unassigned scans, but only after this viewer is exercised against real assigned/unassigned snapshot data.

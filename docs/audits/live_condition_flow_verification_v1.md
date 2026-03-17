# GROOKAI VAULT — LIVE CONDITION FLOW VERIFICATION V1

## Date
2026-03-16

## Objective
Prove the real user loop works end-to-end:

```text
mobile scan -> snapshot created -> appears on web -> assignment works
```

This verification was run under the task rule set:
- no new code
- no fixes mid-test
- no assumptions
- only real runtime proof

## Steps Executed
### Step 1 — Mobile scan
Requested flow:

```text
identity scan -> add card to vault -> condition scan capture -> complete scan
```

Actual execution result:
- Not executed.

Why:
- `flutter devices` found only:
  - `Windows (desktop)`
  - `Chrome (web)`
  - `Edge (web)`
- No Android/iOS device or emulator was available for a real mobile camera scan.
- `adb` was not available on PATH in this shell.
- The task explicitly disallowed synthetic substitution, so I did not fabricate the scan by calling DB/RPC paths directly.

### Step 2 — DB check
Executed against the running local Supabase stack at `http://127.0.0.1:54321` using `@supabase/supabase-js` and the local secret key from `supabase status`.

Query equivalent:

```sql
select id, vault_item_id, gv_vi_id
from condition_snapshots
order by created_at desc
limit 5;
```

Result:
- no rows

Additional baseline checks:
- `condition_snapshots` count = `0`
- `vault_item_instances` recent rows = `0`
- `card_prints` count = `0`

### Step 3 — Web card page
Requested flow:

```text
open /card/[gv_id]
verify "Unassigned scan" appears
```

Actual execution result:
- Not proven.

Why:
- There was no snapshot row to render.
- There was no catalog row available locally (`card_prints` count = `0`) to select a real target `gv_id`.
- The local port `3000` responded, but the root request returned a `404`, so there was no reliable local runtime card-page target to verify from this shell.

### Step 4 — Assignment
Requested flow:

```text
click Assign -> select candidate -> verify condition_snapshots.gv_vi_id is not null
```

Actual execution result:
- Not executed.

Why:
- No unassigned snapshot existed.
- No candidate GVVI existed locally.
- The task disallowed creating synthetic test state mid-verification.

### Step 5 — UI update
Requested flow:

```text
refresh page -> row moves from Unassigned -> Assigned
```

Actual execution result:
- Not executed.

Why:
- Steps 1 through 4 could not be completed with real runtime state.

## DB Results
### Local Supabase status
- `supabase status` confirmed the local stack is running.

### Snapshot query result
| Query | Result |
|---|---|
| `condition_snapshots latest 5` | `[]` |
| `condition_snapshots count` | `0` |

### Supporting baseline
| Query | Result |
|---|---|
| `vault_item_instances latest 10` | `[]` |
| `card_prints count` | `0` |

## UI Results
| Surface | Expected | Actual |
|---|---|---|
| Mobile identity scan | Create a real scanable card flow | Not executable in this environment |
| Mobile condition scan capture | Create `condition_snapshots` row | Not executable in this environment |
| Web card detail | Show `Unassigned scan` | Not provable; no local snapshot/card data |
| Web assignment dialog | Assign GVVI and refresh to assigned state | Not provable; no eligible row/candidate |

## Issues Found
1. No real mobile runtime was available for a camera-based condition flow.
2. Local Supabase data required for this loop is absent:
   - no `card_prints`
   - no `vault_item_instances`
   - no `condition_snapshots`
3. Because the task forbids assumptions and synthetic substitution, the loop cannot be honestly marked as verified from this environment.
4. The local web runtime was not in a state where a real card-page target could be verified from shell-only access.

## Result
```text
FAIL
```

Reason:
- The required end-to-end loop was not proven with real runtime data.
- No snapshot was created.
- No web `Unassigned scan` state was observed.
- No assignment was executed.

## Next Action
Run the same verification against an environment with:
- a real mobile device or emulator with camera-capable flow access
- at least one real card in `card_prints`
- a real scan-created `condition_snapshots` row

Only then should the flow be reclassified.

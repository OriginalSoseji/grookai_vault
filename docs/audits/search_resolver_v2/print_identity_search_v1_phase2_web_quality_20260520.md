# PRINT_IDENTITY_SEARCH_V1 Phase 2 Web Resolver Quality

Date: 2026-05-20

## Scope

This pass is limited to web resolver regression quality. It does not add new search architecture.

Regression queries:

- `espurr reverse holo`
- `pikachu masterball`
- `sv8pt5 exeggutor pokeball`
- `GV-PK-ME03-033-RH`

## Changes

Implemented two narrow resolver refinements in `apps/web/src/lib/explore/getExploreRows.ts`:

1. Exact child printing fallback
   - If the print identity RPC returns no rows for a direct `printing_gv_id`, the resolver checks `card_printings.printing_gv_id` directly.
   - The returned result still routes through the parent card route with selected printing query context.
   - This fixes exact searches such as `GV-PK-ME03-033-RH`.

2. Clean single-name fallback ranking
   - When a variant query has no exact child printing match, clean card-name rows are preferred over decorated name-family rows.
   - This keeps `pikachu masterball` useful without pretending a Pikachu Master Ball child printing exists.

## Local Web Smoke

Smoke target:

```text
http://127.0.0.1:3000/api/resolver/search
```

Dev server was run with:

```text
NODE_OPTIONS=--use-system-ca
```

This was required because plain local `next dev` hit TLS fetch failures against Supabase.

| Query | Result | Top result | Selected printing context |
| --- | --- | --- | --- |
| `espurr reverse holo` | PASS | `GV-PK-BST-60` Espurr | `GV-PK-BST-60-RH` / Reverse Holo |
| `pikachu masterball` | PASS_WITH_DATA_GAP | `GV-PK-PAF-131` Pikachu | none |
| `sv8pt5 exeggutor pokeball` | PASS | `GV-PK-PRE-002` Exeggutor | `GV-PK-PRE-002-PB` / Poké Ball |
| `GV-PK-ME03-033-RH` | PASS | `GV-PK-ME03-033` Espurr | `GV-PK-ME03-033-RH` / Reverse Holo |

## Data Notes

`pikachu masterball` is not an exact child-printing result because the current DB has no Pikachu child printing with:

- `printing_gv_id` ending in `-MB`
- `finish_key` or finish label matching Master Ball

The resolver now falls back to clean Pikachu results instead of promoting a decorated name-family result such as `_____'s Pikachu`.

## Route Boundary

Child printing results continue to route through the parent route:

```text
/card/<parent_gv_id>?printing=<printing_gv_id>
```

No `/card/<printing_gv_id>` route was enabled.

## Verification

Passed:

- `npm --prefix apps/web run typecheck`
- `npm --prefix apps/web run lint`
  - Existing `WarehouseSubmissionForm.tsx` `<img>` warning only.
- `npm --prefix apps/web run build`
  - Existing `WarehouseSubmissionForm.tsx` `<img>` warning only.
- `npm run contracts:test`
  - 74 tests passed.
- `npm run contracts:runtime-health`
- `npm run preflight`
  - `PASS_WITH_DEFERRED_DEBT`, 0 critical failures.
- `git diff --check`

## Confirmations

- No DB writes.
- No migrations.
- No parent `card_prints.gv_id` changes.
- No Species Dex denominator changes.
- No scanner changes.
- No public child printing route enablement.

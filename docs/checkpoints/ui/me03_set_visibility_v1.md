# me03 Set Visibility v1

## Context

`me03` (`Perfect Order`) was canon-complete enough to surface without new canon work:

- `sets.code = 'me03'`
- `card_prints where set_code = 'me03' = 130`
- public read path could already see all 130 mapped `gv_id` rows
- imagery existed only through representative card images

DB reality check on 2026-04-16:

- `sets.printed_total = 124`
- `sets.release_date = null`
- `sets.hero_image_url = null`
- `sets.logo_url = null`
- `exact_rows = 0`
- `representative_rows = 130`

This confirmed a visibility problem, not a canon completeness problem.

## Blocker Found

Two concrete blockers were found.

1. Cross-platform date/order bucketing:
   - Web `apps/web/src/lib/publicSets.ts`
   - Mobile `lib/services/public/public_sets_service.dart`
   - Both surfaces sorted the public set catalog strictly by `release_date`.
   - Because `me03.release_date` is `null`, it was pushed to the undated tail of the catalog.
   - That buried `me03` in default browse order and kept it out of limited discovery slices that take the front of the ordered list.

2. Web-only runtime config drift:
   - Web `apps/web/src/lib/publicSets.ts`
   - The server-side public sets reader still depended on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Current repo config authority is `SUPABASE_URL` plus `SUPABASE_PUBLISHABLE_KEY` via `apps/web/src/lib/supabase/config.ts`.
   - Under the current local env contract, that made the web public set read surface brittle.

## Search Blocker Found

The actual set-search entrypoints were local catalog filters, not the global resolver:

- Web:
  - `apps/web/src/app/sets/page.tsx`
  - `apps/web/src/lib/publicSets.ts`
  - `apps/web/src/lib/publicSets.shared.ts`
- App:
  - `lib/screens/sets/public_sets_screen.dart`
  - `lib/services/public/public_sets_service.dart`

Repo evidence:

- Web `/sets` fetches the full catalog through `getPublicSets()` and then filters it with `filterPublicSets(...)`.
- App public sets search fetches the full catalog through `PublicSetsService.fetchSets(...)`, stores it in `_sets`, then applies `filterAndSortSets(...)`.

The concrete search bug was that the local matching rules had drifted:

- Web had an extra custom code/search-text path that was not the same bounded contract used by app.
- App used a whole-query haystack substring check instead of the intended every-token match across `name` and `code`.

That made the search behavior inconsistent across web and app, even though `me03` was already present in the fetched set list on both surfaces.

## Exact Surfaces Patched

- `apps/web/src/lib/publicSets.shared.ts`
- `apps/web/src/lib/publicSets.ts`
- `lib/services/public/public_sets_service.dart`

Patched behavior:

- added a non-display `sort_date` / `sortDate` fallback derived from `release_date ?? created_at`
- used that fallback for default catalog ordering
- used that fallback for `newest` / `oldest` sorting
- aligned the web server-side public sets reader with the shared Supabase config helper
- added one mirrored local set-search contract across web and app

Search patch files:

- `apps/web/src/lib/publicSets.shared.ts`
- `apps/web/src/lib/publicSets.ts`
- `lib/services/public/public_sets_service.dart`

Final search matching rule:

- trim input
- lowercase input
- split on whitespace
- ignore empty tokens
- searchable fields are `name` and `code`
- a set matches only when every token matches at least one searchable field by partial substring

Examples:

- `me03` -> matches by `code`
- `perfect` -> matches by `name`
- `perfect order` -> both tokens match `name`
- `order` -> matches by `name`

## Why me03 Was Hidden

`me03` was not excluded by query visibility, hidden flags, missing `gv_id`, missing set detail cards, or representative-image-only card art.

It was hidden by ordering:

- `release_date = null`
- catalog sort treated dated sets as always higher priority
- `me03` landed at index `169` of `187` in the pre-patch public set order
- mobile discovery uses `filteredSets.take(6)`, so `me03` never entered the visible app discovery slice

After the patch:

- effective sort date became `2026-04-16T13:55:55.549875+00:00` from `created_at`
- `me03` moved to index `0`
- app discovery front slice now includes `me03`
- web browse order now surfaces `me03` immediately

## Read-Model / Fallback Decision

No canon rewrite was needed.

Decision:

- a valid canonical set must remain visible when `release_date` is absent
- browse/discovery ordering may fall back to `created_at` for visibility
- representative card imagery is valid for card/detail rendering
- missing exact imagery must not suppress set/card visibility
- missing set logo or hero image must degrade gracefully, not hide the set

The existing card read model already handled representative image truth correctly, so no card-image contract change was required in this pass.

## Verification Proof

### DB / Read-model

- `me03` set row readable from public client
- `card_print_count = 130`
- `count with gv_id = 130`
- `exact_rows = 0`
- `representative_rows = 130`
- no canon drift after patch: `card_prints where set_code = 'me03'` stayed `130`

### Web

- `npm run typecheck` passed
- `npm run build` passed
- local server started on `http://localhost:3001`
- `/sets` returned `200` and contained `Perfect Order` plus `/sets/me03`
- `/sets/me03` returned `200` and contained `Perfect Order`, `Spinarak`, and `/card/GV-PK-ME03-001`
- `/card/GV-PK-ME03-001` returned `200`, linked back to `/sets/me03`, and exposed representative-image truth UI text

### Mobile / App

Service-level proof after patch:

- public set order top 6 became:
  - `me03`
  - `me02.5`
  - `me02`
  - `me01`
  - `sv09`
  - `sv08`
- `me03` public set detail payload resolves with:
  - `cardCount = 130`
  - `displayImageUrl = representative_image_url`
  - `displayImageKind = representative`
- fetched set list contains `me03` before search filtering
- app local search now returns `Perfect Order` for:
  - `me03`
  - `perfect`

### Search Verification

Web local `/sets` search proof:

- `/sets?q=me03` returned `200` and rendered `Perfect Order`
- `/sets?q=perfect` returned `200` and rendered `Perfect Order`
- `/sets?q=Perfect%20Order` returned `200` and rendered `Perfect Order`
- `/sets?q=order` returned `200` and rendered `Perfect Order`

App local catalog-search proof:

- `fetchSets(...)` includes `me03` in the fetched set list before query filtering
- mirrored app search rule returns `Perfect Order` for:
  - `me03`
  - `perfect`
  - `perfect order`

### Explore / Discovery

- generic browse/discovery ordering now surfaces `me03`
- the curated web `/explore` notable-set rail was not changed in this pass because it is intentionally hardcoded/promotional and outside the bounded general visibility fix

## Invariant

Valid canonical sets must not be hidden solely because imagery is representative.

Canonical visible sets must also be searchable by both `code` and `name` on local catalog search surfaces.

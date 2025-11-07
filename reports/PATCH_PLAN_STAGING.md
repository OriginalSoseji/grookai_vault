PR Group: Staging Env Fix (no writes to staging)

- Populate `.env.staging` with real values:
  - `SUPABASE_URL=https://ycdxbpibncqcchqiihfz.supabase.co`
  - `SUPABASE_ANON_KEY=<publishable>`
- Validation: Re-run REST probes (read-only) to confirm `search_cards` 200 and views not 404.
- Rollback: revert env change if needed (local-only).

Rationale: All staging probes depend on valid URL/key. No code change; local-only config.
Test: Re-run `reports/staging_scan_*/` probe scripts and confirm non-000 HTTP.


PR Group: Wall Feed Exposure + Grants (staging migration when approved)

- Ensure objects exist: `public.wall_feed_view`, `public.wall_thumbs_3x4`.
- Grants (documented now; apply later):
  - `GRANT SELECT ON public.wall_feed_view, public.wall_thumbs_3x4 TO anon, authenticated;`
- Test (read-only): GET `/rest/v1/wall_feed_view?select=listing_id,title,created_at&limit=1`.

Rationale: Flutter and edge code call `wall_feed_view`; missing object/grants produce 404/401.
Apply Later (SQL to stage when allowed; do not run now):
```sql
-- Create or replace view (idempotent)
create or replace view public.wall_feed_view as
select l.id as listing_id, l.title, l.created_at, t.thumb_url
from public.listings l
left join public.wall_thumbs_3x4 t on t.listing_id = l.id
where l.status = 'active' and l.visibility = 'public';

-- Materialized view thumbs (if missing)
create materialized view if not exists public.wall_thumbs_3x4 as
select listing_id, thumb_url from public.v_wall_thumbs_source; -- align to your source

-- Grants
grant select on public.wall_feed_view to anon, authenticated;
grant select on public.wall_thumbs_3x4 to anon, authenticated;
```
Rollback: `drop view ...`/`revoke` (only if needed). Guard with IF EXISTS in scripts.


PR Group: Search API Contract Lock

- Confirm RPC signature on staging (read-only): `public.search_cards(q text, "limit" int, "offset" int)`.
- Ensure function is `SECURITY DEFINER`, `SET search_path = public` and has:
  - `GRANT EXECUTE ON FUNCTION public.search_cards(text,int,int) TO anon, authenticated;`
- Add repo docs/tests (local) reflecting the contract.

Rationale: Prevent signature drift and ambiguous overloads.
Apply Later (SQL to stage when allowed; do not run now):
```sql
create or replace function public.search_cards(q text, "limit" int, "offset" int)
returns setof public.v_card_search
language sql
security definer
set search_path = public
as $$
  select * from public.v_card_search
  where (q is null or q = '' or name ilike ('%' || q || '%'))
  order by popularity desc nulls last, name asc
  limit coalesce("limit", 50)
  offset coalesce("offset", 0);
$$;
grant execute on function public.search_cards(text,int,int) to anon, authenticated;
```
Tests (local only): add a DB smoke that posts to `/rpc/search_cards` with empty `q` and asserts JSON array.
Rollback: `drop function if exists public.search_cards(text,int,int);`


PR Group: Flutter Perf + Stability (staging-safe)

- Debounce search input (250–350ms), set timeouts (10s) on network calls.
- Ensure feed uses 3:4 thumbnails; detail prefetch of full images only on demand.
- Add `const` in hot paths, avoid context after async gaps.

Rationale: Reduce jank on staging when scrolling and searching.
Changes (repo):
- Debounce search input in `lib/features/lookup/card_lookup.dart:1` by wrapping onChanged with a 300ms debounce.
- Add timeouts to Supabase calls in `lib/services/cards_service.dart:9`, `lib/services/legacy_search_service.dart:7` by chaining `.timeout(const Duration(seconds: 10))` on futures returned by PostgREST queries.
- Use thumbnails in wall feed list items `lib/features/wall/wall_feed_page.dart:49`:
  Before:
  ```dart
  Image.network(row['image_url'])
  ```
  After:
  ```dart
  Image.network(row['thumb_url'],
    cacheWidth: 720, cacheHeight: 960,
    filterQuality: FilterQuality.low,
    errorBuilder: (_, __, ___) => const Icon(Icons.image_not_supported),
  )
  ```
Tests: Manual run on device (staging) and verify stable frame times; no functional change expected.
Rollback: Pure client-side; revert diffs.

PR Group: Test Harness Fix (staging-safe)

- Wrap `ScanHintSubtitle` test with a theme/app provider to fix failing unit test.
- File: `test/scan_hint_subtitle_test.dart:1`
  Before:
  ```dart
  testWidgets('ScanHintSubtitle formats text', (tester) async {
    await tester.pumpWidget(const ScanHintSubtitle());
  });
  ```
  After:
  ```dart
  testWidgets('ScanHintSubtitle formats text', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: GVTheme(child: ScanHintSubtitle())));
  });
  ```
Rationale: The widget expects GVTheme from context.
Test: `flutter test` green.
Rollback: revert test change.


PR Group: CI Guardrails (local-only checks in CI)

- Add DB smoke (local containers) that calls `search_cards` and asserts JSON response.
- Add migrations apply (local) on PRs touching `supabase/**`.
- Keep staging probes out of default CI; if added, make them opt-in and read-only.

Rationale: Prevent regressions by validating DB + migrations locally and avoid accidental staging writes.
Changes (repo):
- Add `.github/workflows/db-smoke.yml` (local containers) calling `/rpc/search_cards` and asserting JSON (see REPORTS/CI_CHECKS_STAGING.md for snippet).
- Add `.github/workflows/migrations-apply.yml` to lint and apply migrations to local containers on PRs touching `supabase/**`.
- Optional manual job: `staging-probe.yml` using secrets, read-only curls, `workflow_dispatch` only.
Tests: Observe green workflows on PRs; verify artifacts contain probe outputs.
Rollback: Remove or disable workflows.

Appendix: File Touch List

- `.env.staging` (local-only config)
- `lib/features/wall/wall_feed_page.dart`
- `lib/services/cards_service.dart`
- `lib/services/legacy_search_service.dart`
- `lib/features/lookup/card_lookup.dart`
- `test/scan_hint_subtitle_test.dart`
- `.github/workflows/db-smoke.yml`
- `.github/workflows/migrations-apply.yml`
- (Migration SQL later, gated): `supabase/migrations/*`


# MOBILE_RESOLVER_PARITY_CONTRACT_V1

## 1. Scope
- This phase brings the live Flutter app search surfaces into parity with the hardened web resolver semantics.
- This phase covers mobile search entrypoints in [main.dart](/c:/grookai_vault/lib/main.dart), the mobile card search repository in [card_print.dart](/c:/grookai_vault/lib/models/card_print.dart), one thin web API surface in [route.ts](/c:/grookai_vault/apps/web/src/app/api/resolver/search/route.ts), and app config in [secrets.dart](/c:/grookai_vault/lib/secrets.dart).
- This phase does not change scoring, normalization, alias coverage, schema, pricing, or AI posture.
- This phase does not attempt a mobile UX redesign. It aligns behavior and state semantics inside the existing app search surfaces.

## 2. Current App Resolver Audit
- Entry points:
  - Home catalog search in [main.dart](/c:/grookai_vault/lib/main.dart#L1059)
  - Vault catalog picker search in [main.dart](/c:/grookai_vault/lib/main.dart#L1837)
- Current flow before parity:
  - UI text field -> `CardPrintRepository.searchCardPrints(...)` in [card_print.dart](/c:/grookai_vault/lib/models/card_print.dart#L240) -> direct Supabase RPC `search_card_prints_v1` -> on error or empty, local legacy query builder in the same file
- Current resolver behavior before parity:
  - No web resolver gateway usage
  - No web resolver metadata (`resolverState`, score context, ambiguity state)
  - No mobile-side structured ambiguity or weak-match messaging
  - No auto-resolution from search result rows. Users manually tap results.
- Current drift from web:
  - Web authority lives in [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts) and [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
  - Flutter search did not call either path
  - Flutter owned a separate authoritative search path through `search_card_prints_v1` plus a local deterministic fallback query builder
  - That meant app and web could diverge on normalization, scoring, and ambiguity semantics

## 3. Parity Gaps
- `P0`
  - Mobile live search entrypoints did not use the hardened web resolver authority at all.
  - Mobile had no `STRONG_MATCH` / `AMBIGUOUS_MATCH` / `WEAK_MATCH` / `NO_MATCH` model.
  - Mobile non-empty queries could silently drift because `search_card_prints_v1` and the local legacy fallback were a competing resolver surface.
- `P1`
  - Mobile users had no explicit weak-match or ambiguous-match warning state.
  - No-match handling was only an empty list message, not a resolver-state-driven outcome.
- `P2`
  - Empty-query browse mode remains local and is intentionally not forced through the web ranked resolver.
  - On-device runtime verification against a deployed web route is still `UNVERIFIED`.

## 4. Chosen Parity Strategy
- Selected strategy: app calls the same server-side resolver behavior through a thin web API layer.
- Implemented path:
  - Flutter non-empty search -> [route.ts](/c:/grookai_vault/apps/web/src/app/api/resolver/search/route.ts) -> [resolveQueryWithMeta](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts) with `mode: "ranked"` -> canonical ranked resolver in [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- Why this path was selected:
  - It keeps normalization, coverage, scoring, and resolver-state authority on the web side.
  - It avoids duplicating hardened resolver logic in Dart.
  - It keeps blast radius tight: one new read-only JSON route, one mobile repository consumer, no schema or scoring change.
- Rejected strategy in this phase:
  - Re-implementing resolver-state logic in Flutter
  - Extending the old Flutter Supabase fallback path further
  - Introducing a separate mobile-only resolver API

## 5. Implementation Changes
- [route.ts](/c:/grookai_vault/apps/web/src/app/api/resolver/search/route.ts)
  - Added a thin public GET route at `/api/resolver/search`
  - Calls `resolveQueryWithMeta(query, { mode: "ranked", sortMode: "relevance", exactSetCode: "" })`
  - Returns ranked rows plus resolver metadata
- [card_print.dart](/c:/grookai_vault/lib/models/card_print.dart)
  - Added `CardPrintSearchResult`, `CardSearchResolverMeta`, and `ResolverSearchState`
  - Added `searchCardPrintsResolved(...)`
  - Non-empty queries now call the web resolver route
  - Empty-query browse remains local and returns `meta: null`
  - Non-empty mobile search no longer falls back to local legacy resolution
- [main.dart](/c:/grookai_vault/lib/main.dart)
  - Home search and catalog picker now call `searchCardPrintsResolved(...)`
  - Added `_ResolverStatusBanner` to surface ambiguity / weak / no-match states without redesigning the screen
  - Search error handling is explicit instead of silently falling through to a second resolver authority
- [secrets.dart](/c:/grookai_vault/lib/secrets.dart)
  - Added `grookaiWebBaseUrl`
  - Resolution order: `GROOKAI_WEB_BASE_URL` -> `NEXT_PUBLIC_SITE_URL` -> `SITE_URL` -> `https://grookaivault.com`
- Intentionally unchanged:
  - Web scoring rules
  - Web normalization rules
  - Alias coverage
  - Mobile result-row layout and manual tap-to-open behavior

## 6. App Behavior After Parity
- `STRONG_MATCH`
  - Mobile receives a strong resolver state from the web authority.
  - The app still shows the ranked results list and does not auto-open a card. This preserves current app UX and avoids adding a new auto-navigation rule in this phase.
- `AMBIGUOUS_MATCH`
  - Mobile shows the ranked candidates.
  - A status banner explains that multiple plausible matches exist.
  - No silent auto-resolution occurs.
- `WEAK_MATCH`
  - Mobile shows approximate ranked results.
  - A status banner explains that the query is weak and should be strengthened with set / number / promo evidence.
  - No silent auto-resolution occurs.
- `NO_MATCH`
  - Mobile shows an honest no-match banner and empty-state message.
  - No misleading fallback to unrelated cards occurs through a second resolver authority.

## 7. Verification
- Commands run:
  - `cd C:\grookai_vault\apps\web && npm run typecheck`
  - `cd C:\grookai_vault\apps\web && npx eslint src/app/api/resolver/search/route.ts`
  - `cd C:\grookai_vault && flutter analyze lib/main.dart lib/models/card_print.dart lib/secrets.dart`
  - Route smoke test:
    ```powershell
    @'
    import fs from 'node:fs';
    import { NextRequest } from 'next/server';
    import { GET } from './apps/web/src/app/api/resolver/search/route.ts';

    for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL ||= process.env.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= process.env.SUPABASE_PUBLISHABLE_KEY;

    const queries = ['gardevoir ex sv01 245', 'charizard', 'pikachu sv promo', 'zzzzzzzzzz'];
    for (const q of queries) {
      const req = new NextRequest(`http://localhost/api/resolver/search?q=${encodeURIComponent(q)}&limit=5`);
      const res = await GET(req);
      const json = await res.json();
      console.log(JSON.stringify({
        q,
        status: res.status,
        ok: json.ok,
        resolverState: json.meta?.resolverState ?? null,
        candidateCount: json.meta?.candidateCount ?? null,
        topName: json.rows?.[0]?.name ?? null,
      }, null, 2));
    }
    '@ | node --loader ./tools/resolver/ts_web_loader.mjs --input-type=module -
    ```
- Outcomes:
  - `npm run typecheck`: passed
  - targeted `eslint`: passed
  - `flutter analyze`: did not return clean because [main.dart](/c:/grookai_vault/lib/main.dart) and [card_print.dart](/c:/grookai_vault/lib/models/card_print.dart) already contain a large pre-existing warning/info set. No new Dart syntax errors were introduced in this phase.
  - Route smoke test results:
    - `gardevoir ex sv01 245` -> `STRONG_MATCH`
    - `charizard` -> `AMBIGUOUS_MATCH`
    - `pikachu sv promo` -> `AMBIGUOUS_MATCH`
    - `zzzzzzzzzz` -> `NO_MATCH`
- App-side manual runtime on device/emulator:
  - `UNVERIFIED`. INITIATING AUDIT was completed, but no emulator session was run in this phase.

## 8. Risks / Non-Goals
- This phase intentionally did not:
  - change scoring
  - change normalization
  - expand alias coverage
  - add AI
  - add mobile auto-navigation
  - redesign app search UI
- Remaining risks:
  - Mobile now depends on the web route being reachable at `grookaiWebBaseUrl` for non-empty resolver queries.
  - Empty-query browse remains local by design, so parity applies to active resolver behavior, not to blank discovery browsing.
  - The legacy Flutter search method still exists in repo memory, but live app search entrypoints no longer use it for non-empty queries.

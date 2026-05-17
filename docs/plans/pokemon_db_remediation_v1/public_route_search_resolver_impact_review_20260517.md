# Public Route/Search Resolver Impact Review - 2026-05-17

Status: no-write public app impact review. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, route writes, card backfills, variant writes, or production data mutation.

## Purpose

Review whether the current public web resolver/search path would consume the planned source-route classification rows:

| Source route | Canonical set | Planned DB classification |
| --- | --- | --- |
| `shiny-vault` | `sma` | `source_route_classification_write_plan_20260517.md` |
| `rm` | `ru1` | `source_route_classification_write_plan_20260517.md` |

This is an app/runtime impact review only. It does not execute the planned DB rows.

## Source Evidence

- `source_route_equivalence_evidence_20260517.md`
- `source_route_classification_write_plan_20260517.md`
- `source_route_classification_write_plan_matrix_20260517.json`
- `apps/web/src/components/PublicSearchForm.tsx`
- `apps/web/src/lib/publicSearchRouting.ts`
- `apps/web/src/lib/publicSearchResolver.ts`
- `apps/web/src/lib/publicSets.shared.ts`
- `apps/web/src/lib/publicSets.ts`
- `apps/web/src/lib/resolver/normalizeQuery.ts`
- `apps/web/src/lib/explore/getExploreRows.ts`
- `apps/web/src/app/search/route.ts`
- `apps/web/src/app/api/resolver/search/route.ts`
- `apps/web/src/app/api/public-set-cards/route.ts`
- `apps/web/src/app/sets/[set_code]/page.tsx`

Fresh preflight for this review confirmed the migration ledger is aligned and no DB writes were made.

## Runtime Findings

### Public Search Form

`PublicSearchForm` submits through `buildPublicSearchDestination(query)`. That routing decision is static and lives in `publicSearchRouting.ts`.

Current result:

- `rm` is not in `SET_INTENT_ALIAS_MAP`, `EXACT_SET_ALIASES`, or set-code regex coverage, so a plain `rm` search routes to `/explore`, not `/search`.
- `shiny vault` and `shiny-vault` are not exact static set aliases or configured set phrases, so they also route to `/explore`, not `/search`.
- Therefore the normal user search form will not use the direct set resolver for these source routes today.

### Direct `/search` Resolver

`/search` calls `resolveQueryWithMeta(rawQuery, { mode: "direct" })`, which eventually uses `publicSearchResolver.ts`.

Current result:

- The direct resolver does not query `set_code_classification`.
- Exact set alias resolution is driven by `SET_INTENT_ALIAS_MAP`.
- Fuzzy set-intent matching uses `getPublicSets()` and set metadata derived from `sets` plus `card_prints.set_code`.
- If a user manually reaches `/search?q=shiny%20vault`, fuzzy set matching can likely find `sma` because the canonical set name is `Hidden Fates Shiny Vault`.
- `rm` is not guaranteed to resolve because `ru1` is the DB code and `RU` is the printed abbreviation; `RM` is a source route token from PkmnCards.

Conclusion: direct `/search` can partially help `shiny vault` by fuzzy name, but source-route correctness is not deterministic for both planned routes.

### Ranked `/api/resolver/search`

`/api/resolver/search` calls `resolveQueryWithMeta(rawQuery, { mode: "ranked", exactSetCode })`.

Current result:

- Query normalization uses `STRUCTURED_CARD_SET_ALIAS_MAP`.
- Ranked scoring compares `expectedSetCodes` directly to `card_prints.set_code`.
- `set_code_classification` is not queried.
- `shiny-vault`, `shiny vault`, and `rm` are absent from the set alias maps, so they do not produce deterministic `expectedSetCodes`.
- If callers pass `?set=shiny-vault` or `?set=rm`, the exact set filter remains the raw alias code and filters directly against `card_prints.set_code`, returning no canonical cards.

Conclusion: ranked search needs an app-side alias resolver before source-route aliases are user-facing complete.

### Public Sets Page

`/sets` loads `getPublicSets()`, which builds public set summaries from `sets` rows and card counts from `card_prints.set_code`.

Current result:

- Source-only alias rows with zero card rows will not appear as standalone public sets.
- `/sets?q=shiny-vault` or `/sets?q=shiny vault` may find `Hidden Fates Shiny Vault` through token matching.
- `/sets?q=rm` does not reliably find `Pokemon Rumble`, because `rm` is not present in the public set name or canonical code.

Conclusion: set-list search is only partially alias-aware through text matching. It is not route-classification aware.

### Set Detail Routes And Public Set Card API

`/sets/[set_code]` calls:

- `getPublicSetByCode(params.set_code)`
- `getPublicSetCards(params.set_code, ...)`

`/api/public-set-cards` calls:

- `getPublicSetCards(set_code, ...)`

Current result:

- Both code paths use the requested `set_code` directly after lowercasing.
- Neither path resolves through `set_code_classification`.
- `/sets/shiny-vault` returns not found.
- `/sets/rm` returns not found.
- `/api/public-set-cards?set_code=shiny-vault` returns no canonical cards.
- `/api/public-set-cards?set_code=rm` returns no canonical cards.

Conclusion: direct routes and card pagination require a canonical set-code resolver before alias URLs or API params can work.

## Scope-Specific Matrix

Machine-readable matrix:

- `public_route_search_resolver_impact_matrix_20260517.json`

Summary:

| Alias | Canonical | Normal form search | Direct `/sets/{alias}` | Ranked exact `set` filter | Public route/search status |
| --- | --- | --- | --- | --- | --- |
| `shiny-vault` | `sma` | partial through fuzzy text only | not found | empty | incomplete |
| `rm` | `ru1` | not deterministic | not found | empty | incomplete |

## Product Impact

The planned DB source-route classification rows are still valid as DB route evidence and audit hygiene, but they do not automatically update public web behavior because the public app does not consume `set_code_classification`.

Executing only the DB classification rows would:

- help future DB-side route/audit consumers that explicitly read `set_code_classification`;
- not move cards;
- not create sets;
- not change public set pages by itself;
- not make `/sets/shiny-vault` or `/sets/rm` work by itself;
- not make exact ranked search filters for `shiny-vault` or `rm` work by itself.

## Recommendation

Before executing the planned DB source-route rows, create a narrow app-side resolver patch or write plan that covers:

1. A central public set-code alias resolver for source-route and approved route aliases.
2. Static public aliases for:
   - `shiny-vault -> sma`
   - `shiny vault -> sma`
   - `rm -> ru1`
3. Direct route resolution for:
   - `/sets/shiny-vault`
   - `/sets/rm`
4. API exact-set normalization for:
   - `/api/resolver/search?set=shiny-vault`
   - `/api/resolver/search?set=rm`
   - `/api/public-set-cards?set_code=shiny-vault`
   - `/api/public-set-cards?set_code=rm`
5. Regression checks proving the patch does not include hard-stop or review-stop aliases.

The patch should not include card movement, set deletion, metadata merge, external mapping movement, or any Supabase write.

## Stop Conditions Before DB Execution

Do not execute the source-route classification DB plan until:

- app resolver behavior is either patched or consciously accepted as DB-only;
- `shiny-vault` and `rm` are covered by route/search regression evidence;
- a fresh DB preflight confirms the planned route rows are still absent;
- explicit approval is given for the two source-route DB inserts only.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No route writes.
- No card backfills.
- No data changes.

# Public Route/Search Resolver Patch - 2026-05-17

Status: app-side route/search patch. This patch authorizes no Supabase writes, migrations, inserts, updates, deletes, card backfills, variant writes, or production data mutation.

## Purpose

Implement the app-side follow-up required by `public_route_search_resolver_impact_review_20260517.md` before any future DB source-route classification write for:

| Alias | Canonical set |
| --- | --- |
| `shiny-vault` | `sma` |
| `shiny vault` | `sma` |
| `rm` | `ru1` |

The patch also includes the already executed safe route aliases:

| Alias | Canonical set |
| --- | --- |
| `sv3pt5` | `sv03.5` |
| `sm35` | `sm3.5` |

Hard-stop and review-stop aliases remain excluded.

## App Changes

- `apps/web/src/lib/publicSets.shared.ts`
  - adds `PUBLIC_SET_ROUTE_ALIAS_MAP`;
  - adds `resolvePublicSetRouteCode`;
  - adds static search aliases for the approved route/source aliases.
- `apps/web/src/lib/publicSearchRouting.ts`
  - derives exact set aliases from `SET_INTENT_ALIAS_MAP`;
  - routes multi-token exact set aliases, such as `shiny vault`, through `/search`.
- `apps/web/src/lib/publicSets.ts`
  - canonicalizes set route params before set detail lookup;
  - canonicalizes set route params before public set card lookup.
- `apps/web/src/app/api/resolver/search/route.ts`
  - canonicalizes the exact `set` filter before ranked search.
- `apps/web/src/lib/resolver/publicSetRouteAliasGuard.test.mjs`
  - guards the approved alias list;
  - checks that hard-stop aliases are not introduced into the route alias map;
  - checks that public runtime paths consume the shared resolver.

## Expected Behavior

After this app patch:

- search form submissions for `shiny vault`, `shiny-vault`, and `rm` can use the direct resolver path;
- direct set intent resolves to canonical set codes;
- `/sets/shiny-vault` resolves through `sma`;
- `/sets/rm` resolves through `ru1`;
- `/api/public-set-cards?set_code=shiny-vault` resolves through `sma`;
- `/api/public-set-cards?set_code=rm` resolves through `ru1`;
- `/api/resolver/search?set=shiny-vault` filters on `sma`;
- `/api/resolver/search?set=rm` filters on `ru1`.

## Non-Goals

- No DB route writes.
- No card movement.
- No card inserts.
- No set creation.
- No set deletion.
- No metadata copy.
- No external mapping movement.
- No missing-card backfill.
- No variant writes.
- No hard-stop or review-stop alias coverage.

## Remaining Gate Before DB Source-Route Writes

The source-route DB classification write plan remains unexecuted. Before any future DB write:

1. Run fresh migration-ledger and route-row preflight.
2. Confirm `shiny-vault` and `rm` classification rows are still absent.
3. Rerun app/type/lint checks.
4. Get explicit approval to execute only the two DB route inserts.

## Verification Notes

- Static route alias guard passed.
- Web typecheck passed.
- Web lint passed with the existing `WarehouseSubmissionForm.tsx` `<img>` warning.
- Runtime smoke confirmed:
  - `/search?q=rm` returned a 307 redirect before DB-backed page rendering.
  - `/search?q=shiny%20vault` returned a 307 redirect before DB-backed page rendering.
- Runtime smoke for DB-backed set pages and set-card APIs was blocked by the local dev server's existing Supabase fetch TLS error: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No data changes.

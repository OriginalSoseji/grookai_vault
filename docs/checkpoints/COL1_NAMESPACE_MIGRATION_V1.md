# COL1_NAMESPACE_MIGRATION_V1

## Context

`col1` is the Call of Legends mixed-lane family. Canonical `col1` rows already exist across both standard numeric tokens and `SL#` shiny-legend tokens, but the live canonical namespace still uses the legacy `GV-PK-CL-*` prefix.

`COL1_IDENTITY_CONTRACT_V1` established the correct public form as `GV-PK-COL-<PRINTED_NUMBER>`, preserving the exact printed token for both numeric and `SL#` lanes. This phase is a canonical namespace rewrite only. `card_prints.id` remains stable, card identity remains stable, and no new rows or `gv_id` values are minted.

## Why Legacy Namespace Was Incorrect

Legacy canonical `col1` rows were emitted under `GV-PK-CL-*`, but the current contract requires `COL` as the namespace token:

- legacy: `GV-PK-CL-35`
- contract: `GV-PK-COL-35`
- legacy: `GV-PK-CL-SL10`
- contract: `GV-PK-COL-SL10`

The exact printed Call of Legends token is already authoritative. The short `CL` prefix is historical drift and should not remain canonical.

## Migration Mapping Rule

Deterministic rewrite:

```text
GV-PK-CL-<PRINTED_NUMBER> -> GV-PK-COL-<PRINTED_NUMBER>
```

Examples:

- `GV-PK-CL-11 -> GV-PK-COL-11`
- `GV-PK-CL-35 -> GV-PK-COL-35`
- `GV-PK-CL-SL10 -> GV-PK-COL-SL10`

Apply scope is limited to canonical `card_prints` rows where:

- `set_code = 'col1'`
- `gv_id like 'GV-PK-CL-%'`

## Collision Audit Proof

Dry-run hard gates:

- candidate count: `95`
- canonical `col1` row count: `95`
- derived new `gv_id` count: `95`
- null derived `gv_id` count: `0`
- internal derived collision count: `0`
- live table collision count: `0`
- already-new-namespace count before apply: `0`
- foreign-key references to `public.card_prints.gv_id`: `0`

Representative mappings:

- `11`: `GV-PK-CL-11 -> GV-PK-COL-11`
- `35`: `GV-PK-CL-35 -> GV-PK-COL-35`
- `SL10`: `GV-PK-CL-SL10 -> GV-PK-COL-SL10`

## Routing Strategy

Because `gv_id` is public, legacy `GV-PK-CL-*` links must continue resolving after the canonical namespace flips.

Compatibility is handled in the shared alias layer:

- [gvIdAlias.ts](C:/grookai_vault/apps/web/src/lib/gvIdAlias.ts)

Existing card and market page redirect behavior already compares the requested `gv_id` with the resolved canonical `card.gv_id`, so once the alias layer understands `CL -> COL`, legacy `col1` routes resolve and redirect automatically.

Affected read surfaces:

- [getPublicCardByGvId.ts](C:/grookai_vault/apps/web/src/lib/getPublicCardByGvId.ts)
- [getAdjacentPublicCardsByGvId.ts](C:/grookai_vault/apps/web/src/lib/getAdjacentPublicCardsByGvId.ts)
- [publicSearchResolver.ts](C:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- [getPublicCardsByGvIds.ts](C:/grookai_vault/apps/web/src/lib/cards/getPublicCardsByGvIds.ts)
- [page.tsx](C:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
- [page.tsx](C:/grookai_vault/apps/web/src/app/card/[gv_id]/market/page.tsx)

Compatibility behavior:

- old `GV-PK-CL-*` requests still resolve
- canonical responses prefer `GV-PK-COL-*`
- card and market routes redirect legacy `col1` URLs to canonical `COL` URLs
- direct public search and compare-card lookups accept both legacy and canonical forms during transition

## Denormalized Surface Updates

`gv_id` is not an FK, but live denormalized `gv_id` copies must remain aligned with canonical `card_prints`.

This migration audits and, if present, updates:

- `vault_items.gv_id`
- `shared_cards.gv_id`

Historical telemetry in `web_events` is not rewritten. Route compatibility preserves old public URLs without mutating analytics history.

Observed dry-run counts:

- `vault_items` legacy-match rows: `0`
- `shared_cards` legacy-match rows: `0`
- legacy `web_events` rows: `0`

## Risks And Mitigation

- Risk: derived `GV-PK-COL-*` collisions.
  - Mitigation: hard gate requires zero internal and zero live collisions before apply.
- Risk: stale denormalized `gv_id` copies in user-facing tables.
  - Mitigation: update `vault_items.gv_id` and `shared_cards.gv_id` in the same transaction.
- Risk: broken public links after namespace rewrite.
  - Mitigation: route compatibility resolves legacy `CL` IDs and redirects to canonical `COL` URLs.
- Risk: partial migration.
  - Mitigation: single transaction, no inserts, no deletes, rollback on any failure.

## Post-Migration State

Verified post-apply truth:

- updated canonical `col1` rows: `95`
- updated `vault_items` rows: `0`
- updated `shared_cards` rows: `0`
- remaining legacy `GV-PK-CL-*` rows on canonical `col1`: `0`
- canonical `GV-PK-COL-*` rows on `col1`: `95`
- remaining legacy `vault_items` rows for canonical `col1`: `0`
- remaining legacy `shared_cards` rows for canonical `col1`: `0`
- remaining legacy `web_events` rows: `0`
- live `card_prints.gv_id` collision count: `0`
- legacy `col1` routes continue resolving through compatibility alias support

Backup artifacts created before apply:

- [col1_namespace_preapply_schema.sql](C:/grookai_vault/backups/col1_namespace_preapply_schema.sql)
- [col1_namespace_preapply_data.sql](C:/grookai_vault/backups/col1_namespace_preapply_data.sql)

Verified anchor mappings:

- `11`: `GV-PK-CL-11 -> GV-PK-COL-11`
- `35`: `GV-PK-CL-35 -> GV-PK-COL-35`
- `SL10`: `GV-PK-CL-SL10 -> GV-PK-COL-SL10`

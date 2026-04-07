# SMP_NAMESPACE_MIGRATION_V1

## Context

`smp` is the Sun & Moon Black Star Promo family. Canonical `smp` rows already exist and all alias-lane rows have already been collapsed onto those canonical parents. The remaining identity drift is namespace-only: live canonical rows still use legacy `GV-PK-PR-SM-*`, while `SMP_IDENTITY_CONTRACT_V1` defines the correct public form as `GV-PK-SM-<PROMO_CODE>`.

This phase is a canonical namespace rewrite only. `card_prints.id` stays stable, card identity stays stable, and no new rows or `gv_id` values are minted.

## Why Legacy Namespace Was Incorrect

Legacy canonical `smp` rows were emitted under a promo-family prefix that does not match the current contract:

- legacy: `GV-PK-PR-SM-SM01`
- contract: `GV-PK-SM-SM01`

The printed promo code `SM##` / `SM###` is already authoritative. The additional `PR-` segment is historical drift and should not remain canonical.

## Migration Mapping Rule

Deterministic rewrite:

```text
GV-PK-PR-SM-<PROMO_CODE> -> GV-PK-SM-<PROMO_CODE>
```

Examples:

- `GV-PK-PR-SM-SM01 -> GV-PK-SM-SM01`
- `GV-PK-PR-SM-SM100 -> GV-PK-SM-SM100`
- `GV-PK-PR-SM-SM248 -> GV-PK-SM-SM248`

Apply scope is limited to canonical `card_prints` rows where:

- `set_code = 'smp'`
- `gv_id like 'GV-PK-PR-SM-%'`

## Collision Audit Proof

Dry-run proof:

- candidate count: `248`
- canonical `smp` row count: `248`
- derived new `gv_id` count: `248`
- null derived `gv_id`: `0`
- internal derived collision count: `0`
- live table collision count: `0`
- already-new-namespace count before apply: `0`

Anchor mappings:

- `SM01` `Rowlet`: `GV-PK-PR-SM-SM01 -> GV-PK-SM-SM01`
- `SM100` `Lucario-GX`: `GV-PK-PR-SM-SM100 -> GV-PK-SM-SM100`
- `SM248` `Pikachu & Zekrom-GX`: `GV-PK-PR-SM-SM248 -> GV-PK-SM-SM248`

## Routing Considerations

Because `gv_id` is public, legacy links must continue resolving during and after migration.

Compatibility was added in the web layer:

- [gvIdAlias.ts](C:/grookai_vault/apps/web/src/lib/gvIdAlias.ts)
- [getPublicCardByGvId.ts](C:/grookai_vault/apps/web/src/lib/getPublicCardByGvId.ts)
- [getAdjacentPublicCardsByGvId.ts](C:/grookai_vault/apps/web/src/lib/getAdjacentPublicCardsByGvId.ts)
- [publicSearchResolver.ts](C:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- [getPublicCardsByGvIds.ts](C:/grookai_vault/apps/web/src/lib/cards/getPublicCardsByGvIds.ts)
- [page.tsx](C:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
- [page.tsx](C:/grookai_vault/apps/web/src/app/card/[gv_id]/market/page.tsx)

Compatibility behavior:

- old `GV-PK-PR-SM-*` requests still resolve
- canonical responses prefer `GV-PK-SM-*`
- card and market routes redirect legacy SMP URLs to canonical SMP URLs
- compare-card and direct search lookups accept both legacy and canonical SMP forms during transition

## Denormalized Surface Updates

`gv_id` is not an FK, but live denormalized copies must remain aligned with canonical `card_prints`.

Dry-run counts:

- `vault_items` rows still holding legacy canonical `gv_id`: `1`
- `shared_cards` rows still holding legacy canonical `gv_id`: `1`
- mismatch rows on either surface: `0`

Migration updates those two live denormalized surfaces alongside `card_prints`.

Historical telemetry in `web_events` is intentionally left unchanged:

- legacy `web_events` rows observed: `21`

Those rows represent historical path and lookup data. Route compatibility handles old URLs without rewriting analytics history.

## Risks And Mitigation

- Risk: derived `GV-PK-SM-*` collisions.
  - Mitigation: hard gate requires zero internal and zero live collisions before apply.
- Risk: stale denormalized `gv_id` copies in user-facing tables.
  - Mitigation: update `vault_items.gv_id` and `shared_cards.gv_id` in the same transaction.
- Risk: broken public links after namespace rewrite.
  - Mitigation: route compatibility resolves legacy SMP IDs and redirects to canonical SMP URLs.
- Risk: partial migration.
  - Mitigation: single transaction; no inserts; no deletes; rollback on any failure.

## Apply Result

Apply completed in one transaction with backup artifacts created first:

- [smp_namespace_migration_preapply_schema.sql](C:/grookai_vault/backups/smp_namespace_migration_preapply_schema.sql)
- [smp_namespace_migration_preapply_data.sql](C:/grookai_vault/backups/smp_namespace_migration_preapply_data.sql)

Committed updates:

- `card_prints`: `248`
- `vault_items`: `1`
- `shared_cards`: `1`

## Post-Migration State

Verified post-apply truth:

- all `248` canonical `smp` rows now use `GV-PK-SM-*`
- no canonical `smp` rows remain on `GV-PK-PR-SM-*`
- `vault_items` and `shared_cards` no longer retain legacy SMP `gv_id`
- live `card_prints.gv_id` collision count remains `0`
- historical `web_events` legacy rows remain `21`
- legacy routes keep resolving and redirecting to canonical SMP URLs through the compatibility layer

Verified anchors:

- `SM01` `Rowlet`: `GV-PK-PR-SM-SM01 -> GV-PK-SM-SM01`
- `SM100` `Lucario-GX`: `GV-PK-PR-SM-SM100 -> GV-PK-SM-SM100`
- `SM248` `Pikachu & Zekrom-GX`: `GV-PK-PR-SM-SM248 -> GV-PK-SM-SM248`

# MEE Core Lifecycle Schema Remote Apply V1

Generated: 2026-06-26

Mode: targeted remote schema apply only

## Approved Scope

`MEE-CORE-LIFECYCLE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY`

Approved migration:

`supabase/migrations/20260625060000_market_evidence_core_lifecycle_v1.sql`

Approved migration hash:

`24328318BF5C49B170852844623CDB3B4F87BFFED9C7F1C29971F343749126E9`

## Apply Result

Executed:

`supabase db query --file supabase/migrations/20260625060000_market_evidence_core_lifecycle_v1.sql --linked`

Result:

- created provider-agnostic internal lifecycle schema objects
- no evidence backfill
- no provider calls
- no source fetches
- no public pricing views
- no app-visible pricing
- no pricing writes

The migration summary row returned:

- proposed tables: 2
- proposed views: 1
- proposed indexes: 5
- proposed service-role policies: 2
- rollback only: false
- writes `pricing_observations`: false
- writes `ebay_active_prices_latest`: false
- creates public pricing view: false
- creates app-visible pricing: false
- writes identity tables: false
- writes vault tables: false
- writes image/storage tables: false

## Migration History

Executed:

`supabase migration repair --status applied 20260625060000 --linked`

Result:

- migration version `20260625060000` marked applied

Direct migration-table readback verified:

- version: `20260625060000`
- name: `market_evidence_core_lifecycle_v1`

Note: `supabase migration list --linked` later failed with a CLI password-auth error, so migration history was verified through direct linked DB query against `supabase_migrations.schema_migrations`.

## Object Readback

Remote objects now exist:

| Object | Type |
| --- | --- |
| `market_evidence_observations` | base table |
| `market_evidence_lifecycle_events` | base table |
| `v_market_evidence_lifecycle_current_v1` | view |

## RLS And Policies

RLS enabled:

| Table | RLS |
| --- | --- |
| `market_evidence_observations` | true |
| `market_evidence_lifecycle_events` | true |

Policies:

| Table | Policy | Role | Command |
| --- | --- | --- | --- |
| `market_evidence_observations` | `market_evidence_observations_service_role_all` | `service_role` | `ALL` |
| `market_evidence_lifecycle_events` | `market_evidence_lifecycle_events_service_role_all` | `service_role` | `ALL` |

## Row Counts

| Table | Row Count |
| --- | ---: |
| `market_evidence_observations` | 0 |
| `market_evidence_lifecycle_events` | 0 |

This confirms no evidence backfill was performed.

## Index Readback

Indexes present:

- `market_evidence_observations_pkey`
- `market_evidence_observations_source_record_idx`
- `market_evidence_observations_card_idx`
- `market_evidence_observations_unique_source_record_idx`
- `market_evidence_lifecycle_events_pkey`
- `market_evidence_lifecycle_events_unique_hash`
- `market_evidence_lifecycle_events_observation_stage_idx`
- `market_evidence_lifecycle_events_state_idx`
- `market_evidence_lifecycle_events_rollup_idx`

## Public Pricing Isolation

`public.v_card_pricing_ui_v1` readback:

- references `market_evidence_*`: false
- references `market_listing_*`: false
- references `market_reference_*`: false
- references JustTCG: false
- view definition md5: `6621f9428731334061ae9f8c560e7d77`

Current public price table counts:

| Table | Row Count |
| --- | ---: |
| `pricing_observations` | 0 |
| `ebay_active_prices_latest` | 1,690 |

No public pricing tables were written by this apply.

## Boundary Proof

Performed:

- approved migration hash verification
- targeted linked schema apply
- migration history repair for only version `20260625060000`
- object existence readback
- RLS readback
- service-role-only policy readback
- zero-row evidence table readback
- index readback
- public pricing isolation readback

Not performed:

- no evidence backfill
- no provider calls
- no source fetches
- no `pricing_observations` writes
- no `ebay_active_prices_latest` writes
- no public pricing views
- no app-visible pricing
- no public price rollups
- no identity-table writes
- no vault writes
- no image/storage writes
- no deletes
- no merges
- no db push
- no global apply

## Next Step

Next should be `MEE-CORE-LIFECYCLE-PROJECTION-DRY-RUN-V1`.

Goal:

- map a tiny sample from `market_reference_*` and `market_listing_*` into proposed lifecycle observation/event rows,
- prove the stage mapping is deterministic,
- prove no rows skip stages,
- produce local JSON/Markdown artifacts only,
- no DB writes.

Recommended approval prompt:

`Approve real MEE-CORE-LIFECYCLE-PROJECTION-DRY-RUN-V1 run only. Scope: create a read-only local projection plan that maps a tiny sample of existing market_reference_* and market_listing_* rows into proposed market_evidence_observations and market_evidence_lifecycle_events rows, producing local JSON/Markdown artifacts only. No DB writes. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No merges. No migrations. No global apply.`

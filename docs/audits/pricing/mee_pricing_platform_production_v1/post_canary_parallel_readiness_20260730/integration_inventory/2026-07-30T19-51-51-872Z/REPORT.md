# TCGPlayer Market Post-Canary Integration Inventory

- Audit: `TCGPLAYER_MARKET_POST_CANARY_INTEGRATION_INVENTORY_V1`
- Status: `rehearsal_ready`
- Current main: `92147f8c0aa81d5ab89453a89c63f2871e86b626`
- Pricing branch: `cecfc06627c3de47af362f5397b57141f157e897`
- Merge base: `97c5657c8c5d4a160248d160bb3c08e6c53eeeaa`
- Pricing-only commits: `80`
- Main-only commits: `50`
- Manual merge conflicts: `11`

## Decision

A wholesale merge is not authorized. Integrate reviewed Production V1 files
from current main, resolve every conflict explicitly, and rerun all release
gates from the resulting candidate.

## File Inventory

| Classification | Files |
| --- | ---: |
| audit_evidence | 364 |
| contract_test | 26 |
| database_migration | 21 |
| flutter_client | 17 |
| governing_documentation | 7 |
| manual_review | 27 |
| pricing_runtime | 45 |
| shared_infrastructure | 4 |
| web_client | 33 |

## Pending Migration Package

| Migration | Exists | Hash matches | SHA-256 |
| --- | --- | --- | --- |
| `20260728130000` | yes | yes | `028c94a4b86cf2e29fcd74dba4e5111c24ce70512019db3688c6d1e5b1632681` |
| `20260728133000` | yes | yes | `a66c7ae4aa3903077ad70d81bd1aeaa595f90a27ad30dd5b5604198eb7975cd7` |
| `20260730180000` | yes | yes | `2cca3f5634a40ee68489944fc08e026f8de840a276f159e43546cd3458ea31cf` |

The original two-migration manifest remains immutable historical evidence.
The post-canary candidate must explicitly include the later parent-summary
runtime repair as a third pending migration.

## Manual Conflict Files

- `apps/web/src/components/PublicSetCardGrid.tsx`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `lib/main_vault.dart`
- `lib/screens/compare/compare_screen.dart`
- `lib/services/public/public_collector_service.dart`
- `package.json`
- `scripts/audits/jpn_pikachu_promo_first_batch_dry_run_v1.mjs`
- `scripts/audits/jpn_pikachu_promo_gap_audit_v1.mjs`
- `scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs`
- `supabase/functions/notification-dispatcher/index.ts`
- `tests/contracts/search_resolver_pricing_resilience.test.mjs`

## Product Surface Contract

- Required surfaces: `17`
- Captures are deployment evidence and remain pending until the integrated
  clients are deployed.

## Boundaries

- database writes: `false`
- production deployment: `false`
- migration apply: `false`
- publication activation: `false`
- canary configuration changes: `false`

# JUSTTCG_SCHEMA_GAP

## Scope

Repository-grounded comparison between the current Grookai schema and the JustTCG contract already documented or verified in this repo.

Files inspected:

- `apps/web/src/lib/pricing/getReferencePricing.ts`
- `backend/pricing/justtcg_client.mjs`
- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
- `docs/audits/JUSTTCG_SOURCE_AUDIT_V1.md`
- `docs/contracts/JUSTTCG_BATCH_LOOKUP_CONTRACT_V1.md`
- `supabase/migrations/20251213153625_baseline_init.sql`
- `supabase/migrations/20260304070000_printing_layer_v1.sql`
- `supabase/migrations/20260319150000_pricing_observations_v1.sql`

## JustTCG Contract Facts Used

Grounded facts used for this comparison:

- card lookup by `tcgplayerId` exists and is already implemented in repo
- variants are the primary market unit
- variant identity is `(condition + printing)` oriented
- bulk endpoints exist
- history and analytics exist

## Field Mapping

| JustTCG field | Current Grookai fit | Status |
| --- | --- | --- |
| `card.id` | `external_mappings(source='justtcg').external_id` | FIT |
| `card.tcgplayerId` | `external_mappings(source='tcgplayer')`, `card_prints.tcgplayer_id`, `card_prints.external_ids` | FIT |
| `card.name` | `card_prints.name` | FIT FOR VERIFICATION ONLY |
| `card.set_name` | `sets.name` / reference lookup context | FIT FOR VERIFICATION ONLY |
| `card.number` | `card_prints.number` / `number_plain` | FIT FOR VERIFICATION ONLY |
| `card.rarity` | `card_prints.rarity` | FIT FOR VERIFICATION ONLY |
| `variant.condition` | no isolated JustTCG variant storage; only listing-level `condition_bucket` exists | GAP |
| `variant.printing` | no active pricing surface carries printing; `card_printings` exists but is not a pricing lane | GAP |
| `variant.language` | no active pricing dimension for language | GAP |
| `variant.price` | no safe destination in existing truth pricing tables | GAP |
| `variant.lastUpdated` | no isolated JustTCG variant snapshot/cache layer | GAP |
| history / analytics windows | no JustTCG-specific history storage layer | GAP |

## Missing Dimensions

Current repo reality is missing the following for a safe JustTCG pricing integration:

### 1. Variant storage domain

There is no active table or view that stores one market row per:

- `card_print`
- `condition`
- `printing`

### 2. Printing-aware pricing layer

`card_printings` exists for finish identity, but active pricing tables do not join or price through it.

### 3. Source-isolated vendor aggregate layer

Current eBay truth lane stores:

- listing observations
- snapshot summaries
- latest compatibility row

There is no equivalent source-isolated JustTCG aggregate domain in schema.

### 4. History / analytics storage

The repo has no current isolated JustTCG history/statistics store.

## Important Non-Gap

Card-level mapping is not the blocker.

The repo already has:

- deterministic `tcgplayer -> justtcg` card mapping
- safe card-level `external_mappings(source='justtcg')`

The blocker is pricing dimensionality, not card identity.

## Gap Conclusion

JustTCG can attach safely at the card mapping layer today.

JustTCG variant pricing cannot fit cleanly into the current active pricing schema because the repo is missing:

- variant storage
- printing-aware pricing
- source-isolated aggregate pricing storage
- reference-lane history storage

Operationally, the gap is architectural, not transport-related.

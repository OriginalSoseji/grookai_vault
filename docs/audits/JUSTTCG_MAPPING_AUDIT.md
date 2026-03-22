# JUSTTCG_MAPPING_AUDIT

## Scope

Repository-grounded audit of the current mapping layer relevant to JustTCG attachment.

Files inspected:

- `supabase/migrations/20251213153625_baseline_init.sql`
- `supabase/migrations/20251213153630_baseline_constraints.sql`
- `supabase/migrations/20260304070000_printing_layer_v1.sql`
- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
- `backend/pricing/justtcg_client.mjs`
- `backend/pricing/test_justtcg_post_batch_probe.mjs`
- `apps/web/src/lib/pricing/getReferencePricing.ts`
- `docs/contracts/JUSTTCG_BATCH_LOOKUP_CONTRACT_V1.md`
- `docs/checkpoints/JUSTTCG_MAPPING_LANE_V1.md`

## Canonical Mapping Tables

### `public.external_mappings`

- Grain:
  - external card-level identity attached to `card_print_id`
- Columns:
  - `id bigint primary key`
  - `card_print_id uuid not null`
  - `source text not null`
  - `external_id text not null`
  - `meta jsonb`
  - `synced_at timestamptz`
  - `active boolean`
- Constraints:
  - primary key: `id`
  - foreign key: `card_print_id -> public.card_prints(id)`
  - unique: `(source, external_id)`
- Canonical meaning in this repo:
  - one external source identifier resolves to at most one canonical `card_print`
  - a single `card_print` may have many mapping rows across different sources
  - the DB does not enforce uniqueness on `(card_print_id, source)`
  - operational workers therefore must guard conflicting same-source rows in code

### `public.external_printing_mappings`

- Grain:
  - external printing-level identity attached to `card_printing_id`
- Columns:
  - `id uuid primary key`
  - `card_printing_id uuid not null`
  - `source text not null`
  - `external_id text not null`
  - `active boolean`
  - `synced_at timestamptz`
  - `meta jsonb`
- Constraints:
  - primary key: `id`
  - foreign key: `card_printing_id -> public.card_printings(id)`
  - unique: `(source, external_id)`
- Canonical meaning in this repo:
  - finish-child identity only
  - not general market variant identity

## Current JustTCG Mapping Behavior

Current JustTCG integration in repo reality is card-level mapping only.

### Implemented scripts / helpers

- `backend/pricing/justtcg_client.mjs`
  - canonical JustTCG transport/helper layer
  - uses documented `POST /cards`
  - resolves by returned `tcgplayerId`
  - blocks unsafe GET pseudo-batch paths
- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
  - promotes validated card-level JustTCG IDs into `external_mappings(source='justtcg')`
  - reads active `external_mappings(source='tcgplayer')`
  - preserves dry-run and apply modes
  - skips conflicts instead of overwriting
- `backend/pricing/test_justtcg_post_batch_probe.mjs`
  - validates POST batch resolution behavior
- `apps/web/src/lib/pricing/getReferencePricing.ts`
  - reads `external_mappings` for `source in ('justtcg', 'tcgplayer')`
  - performs reference-only JustTCG lookups
  - never writes to Grookai storage

## Mapping Cardinality Verdict

### Card-level mapping

Safe and already implemented for:

- `tcgplayer` bridge IDs
- `justtcg` card IDs

Cardinality:

- one `(source, external_id)` -> one canonical `card_print_id`
- one `card_print_id` -> many mapping rows across sources

### Printing-level mapping

Not currently safe for JustTCG variants.

Why:

- repo printing identity is `card_printing_id + finish_key`
- JustTCG variants are market-facing combinations of:
  - `condition`
  - `printing`
  - `language`
  - `price`
  - sometimes `tcgplayerSkuId`
- that is not the same thing as Grookai finish-child identity

## Uniqueness and Conflict Rules

DB-enforced uniqueness:

- `external_mappings(source, external_id)` is unique
- `external_printing_mappings(source, external_id)` is unique

Operational consequences:

- duplicate external IDs cannot point to multiple canonical rows
- same-source conflicts for one `card_print_id` are prevented in current JustTCG promotion scripts by code, not by a `(card_print_id, source)` unique constraint

## Mapping Boundary for JustTCG

Safe:

- persist only JustTCG card `id` into `external_mappings(source='justtcg')`
- use `tcgplayerId` as deterministic bridge input

Unsafe:

- persist search-derived JustTCG matches
- persist JustTCG variant IDs
- persist `tcgplayerSkuId`
- use `external_printing_mappings` for JustTCG variant pricing identity

## Mapping Audit Conclusion

The mapping layer is already ready for card-level JustTCG attachment and already operational in repo reality.

What is not solved by the current mapping layer:

- pricing ingestion
- variant storage
- printing-aware pricing semantics
- history/statistics storage

Those require a separate source-isolated domain and must not be forced into the existing mapping tables beyond the safe card-level `external_mappings(source='justtcg')` row.

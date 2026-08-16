# Pricing Checkpoint 46: MTG DSK Service-Only Staging Applied

## Status

The bounded Duskmourn: House of Horror (`dsk`) MTG canary is durably stored in
service-only import staging and independently read back from production.

This checkpoint does not claim canonical MTG support, app visibility, image
availability, or pricing publication. Those gates remain closed.

## Durable Changes

The following exact production changes were made:

- migration `20260813185000_mtg_canonical_import_staging_v1` was applied and
  recorded in `supabase_migrations.schema_migrations`;
- one immutable import batch was inserted into
  `public.mtg_canonical_import_batches`;
- 2,866 immutable payload rows were inserted into
  `public.mtg_canonical_import_rows`.

No other database target was authorized or changed by this apply.

## Frozen Provenance

- Branch: `agent/mtg-pricing-readiness-v1`
- Apply tooling commit: `0a0b58fc76b22518047ee4e0546a3aef229df1a5`
- Payload-producing commit:
  `64a2b627cb76072c2e1910510e4035f7caf45a67`
- Batch ID: `60ea72dd-df1c-5ef8-9270-2dcbefc4adfe`
- Writer payload fingerprint:
  `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Source bulk SHA-256:
  `4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c`
- Staging migration SHA-256:
  `20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8`
- Staging migration-ledger fingerprint:
  `2179eeba053bdd9eb57d78063d8c4c6d096089f8e8adf23bea624224c2f246c7`
- Future canonical foundation migration SHA-256:
  `d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082`
- Staged rows SHA-256:
  `f8d5da47f8fa8c9e454b76dc5ddfd93bd0b2cfbe7681a4b0ad68565ec6a13ce0`
- Mutation contract SHA-256:
  `0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c`

## Exact Staged Contents

| Entity | Rows |
|---|---:|
| Sets | 1 |
| Parent `card_prints` | 417 |
| `card_print_identity` | 417 |
| Child `card_printings` | 807 |
| Scryfall parent mappings | 417 |
| Exact TCGPlayer printing mappings | 807 |
| Total staged rows | 2,866 |

All 807 planned TCGPlayer product/subtype lanes were present in the current
source snapshot. All 807 had a positive `marketPrice`. No collision lane was
promoted into this canary.

## Independent Production Readback

The post-apply verifier opened a read-only production transaction and rebuilt
the expected staging contract from the frozen writer payload.

- Expected rows: 2,866
- Read-back rows: 2,866
- Missing rows: 0
- Unexpected rows: 0
- Changed rows: 0
- Expected aggregate row hash:
  `f8d5da47f8fa8c9e454b76dc5ddfd93bd0b2cfbe7681a4b0ad68565ec6a13ce0`
- Read-back aggregate row hash:
  `f8d5da47f8fa8c9e454b76dc5ddfd93bd0b2cfbe7681a4b0ad68565ec6a13ce0`
- Findings: 0

The first local verifier execution reported only an aggregate ordering
mismatch: PostgreSQL returned entity groups in lexical order while the frozen
contract hashes its declared entity order. Every individual row already
matched. The verifier was repaired to reconstruct frozen contract order before
hashing, covered by a regression test, and rerun. No database write or payload
change occurred during either readback.

## Security And Visibility Proof

- RLS is enabled on both staging tables.
- `anon` has no staging-table select privilege.
- `authenticated` has no staging-table select privilege.
- The service-only schema exposes no app-facing RPC.
- Legacy card search results for `dsk`: 0.
- Print-identity search results for `dsk`: 0.
- Canonical MTG game rows: 0.
- Canonical MTG set rows: 0.
- Canonical MTG card rows: 0.
- Pokémon card count before and after: 58,769.
- Future foundation migration `20260813190000` remains unapplied.

## Tests And Artifact Integrity

- Targeted MTG contracts: 39 / 39 passed.
- Readback script syntax check: passed.
- Schema-apply artifact hashes: verified.
- Staging-apply artifact hashes: verified.
- Post-apply readback artifact hashes: verified.

Permanent evidence:

- `docs/audits/pricing/mtg_canonical_import_staging_schema_v1/2026-08-13T19-01-28Z_apply/`
- `docs/audits/pricing/mtg_canonical_catalog_canary_plan_v1/dsk/service_only_stage_apply/2026-08-13T19-01-42Z/`
- `docs/audits/pricing/mtg_canonical_catalog_stage_readback_v1/2026-08-13T19-06-22Z/`

## Current Truths

- Grookai now has a durable, immutable, service-only DSK promotion candidate.
- The staging data is not canonical truth and is not client-readable.
- No MTG product can currently appear through normal Grookai search or product
  surfaces because of this staging apply.
- No MTG image has been self-hosted or assigned to a canonical card.
- No MTG market price has been qualified or published by MEE.
- The shared canonical foundation remains a future, unapplied migration.
- Existing Pokémon identity, search, images, Vault data, and pricing remain
  unchanged.

## Invariants

- Staging never authorizes canonical promotion by itself.
- Canonical promotion must consume the exact immutable staged payload and fail
  on any hash, collision, or boundary mismatch.
- Canonical promotion does not authorize app visibility.
- App visibility does not authorize price publication.
- Price publication must remain game-aware and exact-printing aware.
- Source image references may not become app image pointers before a
  self-hosted upload, hash, readback, and provenance gate.
- Pokémon records and pricing authority may not be changed by MTG rollout.
- Ambiguous product/subtype ownership remains quarantined.
- Unsupported Etched publication remains deferred.

## Exact Next Gate

Build and rollback-prove an explicit MTG canonical-promotion and app-visibility
boundary using the immutable DSK staging batch.

That next gate may prepare:

1. a deterministic promotion plan from staged rows to shared canonical tables;
2. a rollback-only production proof of the still-unapplied MTG foundation
   migration plus exact DSK promotion;
3. explicit search/product exclusion controls that keep MTG hidden until a
   separate release activation;
4. collision, count, hash, RLS, and Pokémon non-mutation checks.

It may not durably apply the foundation migration, promote DSK, create Storage
objects, repoint images, publish prices, or activate app visibility without a
new bounded apply decision.

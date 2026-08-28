# Collectible Wave 1 Set Foundations V1

## Objective

Promote only the 505 reviewed English Wave 1 set proposals into hidden canonical
set foundations after a complete rollback-only production proof.

This gate creates set metadata only. It does not authorize cards, identity,
printings, mappings, images, pricing, publication, Vault data, or app visibility.

## Frozen Input

- payload rows: `505`;
- Yu-Gi-Oh rows: `500`;
- Gundam rows: `5`;
- payload file SHA-256:
  `2c07787bf965909a2b9f0a6296e45d6a2407c7faf28d70069c23a305beec7144`;
- payload fingerprint:
  `fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668`;
- excluded review-required rows: `551`.

The exact payload is permanently preserved at
`docs/audits/catalog_discovery/collectible_wave1_set_apply_proposal_v1/set_apply_payload.jsonl`.

## Migration Scope

The migration may insert exactly 505 rows into `public.sets`:

- deterministic UUIDv5 IDs from the reviewed source proposal IDs;
- globally namespaced `ygo-` and `gcg-` canonical codes;
- exact English names and source-supported release dates;
- exact source evidence and payload provenance;
- source set abbreviations as printed evidence;
- null `printed_total`, `set_role`, and `identity_domain_default`;
- `standard` identity model;
- null logo, symbol, hero-image, and image-source fields.

The migration is insert-only. It may tolerate exact already-present rows for
migration replay, but it must fail closed on any ID, global code, source
proposal, same-game name, or field-level conflict.

## Visibility Boundary

Yu-Gi-Oh and Gundam must remain hidden in
`public.catalog_game_release_controls`. The existing restrictive
`sets_catalog_release_visibility_v1` RLS policy must prevent both `anon` and
`authenticated` from reading the transient set rows. Set creation cannot alter
release controls or authorize app visibility.

## Required Rollback Proof

1. Freeze the exact merged repository SHA, migration bytes, and payload.
2. Capture a repeatable-read production baseline with default read-only mode.
3. Prove migration parent `20260828024500`, zero existing target rows, and zero
   collisions.
4. Execute the deterministic migration body inside one outer production
   transaction.
5. Read back exactly 505 transient rows and reconcile every owned field.
6. Prove no cards, identities, printings, mappings, images, pricing,
   publication, Storage, or Vault rows changed.
7. Prove hidden visibility for all request semantics and zero direct set rows
   through `anon` and `authenticated` RLS.
8. Prove no migration-ledger row was created.
9. Roll back and independently prove the complete baseline was restored.
10. Hash and permanently checkpoint every bounded proof artifact.

## Durable Apply Gate

The separately authorized durable gate may execute only migration SHA-256
`0bef87cb2f487e84729a93aa2ba1bfb9b90cc559a10e981de34dcd1d7a8305fb`
from an exact merged default-branch SHA. Before execution it must prove that
production history ends at `20260828024500`, no target set exists or collides,
and the Supabase CLI offers only migration `20260828063000`.

The durable change is limited to exactly 505 `public.sets` rows and exactly one migration-ledger row.
Post-apply readback must reconcile every owned set field,
the 500/5 game partition, the exact ledger row, hidden request visibility, zero
direct set rows through anon/authenticated RLS, unchanged release controls, and
zero changes in cards, identities, printings, mappings, images, pricing,
publication, Storage, or Vault data. A second read-only connection must repeat
the verification.

Stop after durable apply evidence is permanently checkpointed. No later card,
image, pricing, publication, or visibility gate is implied by this set apply.

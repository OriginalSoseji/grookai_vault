# Pricing Checkpoint 47: MTG DSK Canonical Promotion Rollback Proven

## Status

The immutable Duskmourn: House of Horror (`dsk`) staging batch now has a
deterministic canonical-promotion contract and a production rollback proof.

The proof temporarily applied the MTG foundation and app-visibility boundary,
inserted all 2,866 candidate rows, verified exact canonical readback, proved
zero anonymous and signed-in MTG visibility, and rolled the entire transaction
back.

No canonical MTG row, app release, image, price, or migration from this gate is
durable in production.

## Frozen Promotion Plan

- Staging batch ID: `60ea72dd-df1c-5ef8-9270-2dcbefc4adfe`
- Writer payload fingerprint:
  `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Staging rows SHA-256:
  `f8d5da47f8fa8c9e454b76dc5ddfd93bd0b2cfbe7681a4b0ad68565ec6a13ce0`
- Foundation migration SHA-256:
  `d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082`
- App-visibility migration SHA-256:
  `925b31fcf1ba0895f2ed276bb77b45c948d3f1f0c2ef147843487be7ba7125a4`
- Promotion mutation contract SHA-256:
  `fbc8760b5b47b0c08bf7576b930c4f7b83ec9919656ffa6b05ac02350fca4899`
- Canonical promotion rows SHA-256:
  `714a1ea492d4f1d74d7d43651958ae239801818c2212ceb8741f8ef90ba25238`
- Promotion plan SHA-256:
  `a336eabaeafcc0d216794fd069e892de9dce1008357db3c844393d64881b8a54`

## Planned Canonical Inserts

| Entity | Rows |
|---|---:|
| Sets | 1 |
| Parent `card_prints` | 417 |
| `card_print_identity` | 417 |
| Child `card_printings` | 807 |
| Scryfall parent mappings | 417 |
| Exact TCGPlayer printing mappings | 807 |
| Total | 2,866 |

Only inserts are permitted. The promotion contract prohibits canonical
updates, deletes, truncates, image pointers, Storage writes, pricing writes,
publication writes, and Pokémon mutation.

## App-Visibility Boundary

The new, unapplied migration
`20260813200000_mtg_catalog_app_visibility_boundary_v1.sql` introduces a
service-owned release control with three possible states:

- `hidden`
- `signed_in`
- `public`

Non-Pokémon games fail closed when no release row exists or the row is hidden.
Pokémon remains visible under its existing contract.

The migration adds restrictive read policies to:

- `games`
- `sets`
- `card_prints`
- `card_print_identity`
- `card_printings`

It also wraps the security-definer print-identity search so that owner-level
execution cannot bypass the game release decision. The unfiltered function is
renamed to an internal function and all client execution is revoked.

Canonical promotion cannot change release status. A separate, explicit
activation action is required later.

## Rollback Proof

The rollback proof ran against production in one transaction.

Before the proof:

- Durable staging batches: 1
- Durable staged rows: 2,866
- Canonical MTG games: 0
- Canonical MTG sets: 0
- Canonical MTG cards: 0
- Pokémon cards: 58,769

Inside the proof:

- MTG games: 1
- MTG sets: 1
- MTG parent cards: 417
- MTG identity rows: 417
- MTG child printings: 807
- Scryfall parent mappings: 417
- TCGPlayer printing mappings: 807
- Release state: `hidden`
- Exact row mismatches: 0
- Canonical ID, GV-ID, identity, printing, and mapping collisions: 0

Anonymous visibility inside the proof:

- MTG games: 0
- MTG sets: 0
- MTG cards: 0
- MTG identities: 0
- MTG printings: 0
- Legacy search results: 0
- Print-identity search results: 0

Authenticated visibility inside the proof was also zero for every MTG row and
both search paths. Existing authenticated Pokémon visibility stayed at its
pre-proof count of 58,768; one preserved Pokémon row is already suppressed by
the unrelated identity-conflict visibility guard.

After rollback:

- Canonical MTG games: 0
- Canonical MTG sets: 0
- Canonical MTG cards: 0
- Durable staging batches: 1
- Durable staged rows: 2,866
- Pokémon cards: 58,769
- Foundation migration applied: false
- Visibility migration applied: false
- Visibility release table present: false

## Tests And Evidence

- Targeted MTG contracts: 47 / 47 passed.
- Promotion and rollback scripts: syntax checks passed.
- Promotion artifact hashes: verified.
- Durable database writes in this gate: 0.

Permanent evidence:

- `docs/audits/pricing/mtg_canonical_catalog_promotion_rollback_proof_v1/2026-08-13T19-21-09Z/`

## Current Truths

- DSK is durably staged and canonical promotion is rollback-proven.
- DSK is not durably canonical.
- The MTG foundation and visibility migrations remain unapplied.
- MTG remains absent from all normal app searches and product reads.
- No self-hosted MTG images exist in this workstream.
- No MTG MEE qualification or publication exists.
- All 807 DSK Normal/Foil source lanes remain available and positive, but
  warehouse evidence is not a published price.
- Etched publication remains deferred.
- Pokémon remains unchanged.

## Invariants

- Foundation and visibility migrations must move together before promotion.
- The visibility control must be `hidden` during canonical promotion.
- Promotion must consume the exact staged batch and frozen plan hashes.
- A promotion count or field mismatch fails the entire transaction.
- Canonical promotion does not authorize app visibility.
- App visibility does not authorize price publication.
- Pricing must be game-aware and exact-printing aware before MTG activation.
- Images must be self-hosted, hashed, and read back before any canonical image
  pointer is assigned.
- No MTG gate may mutate Pokémon identity, images, Vault rows, or pricing.

## Exact Next Gate

Prepare the bounded durable DSK canonical apply package using the frozen
promotion plan. Before applying it, add an enforcing post-apply verifier that
reconciles migration history, all 2,866 canonical rows, release status,
anonymous/authenticated visibility, staging lineage, and Pokémon non-mutation.

The durable apply package may contain only:

1. foundation migration `20260813190000`;
2. visibility migration `20260813200000` with MTG status `hidden`;
3. the exact 2,866-row promotion plan
   `a336eabaeafcc0d216794fd069e892de9dce1008357db3c844393d64881b8a54`.

It may not activate signed-in or public visibility, write images or Storage,
publish pricing, create Vault rows, mutate Pokémon, process another MTG set,
or remove the service-only staging evidence.

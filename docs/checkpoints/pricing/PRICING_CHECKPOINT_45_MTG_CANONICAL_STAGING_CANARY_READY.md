# Pricing Checkpoint 45: MTG Canonical Staging Canary Ready

## Status

The English paper MTG catalog is reconciled and the Duskmourn canary is ready
for an explicitly approved, service-only staging apply.

No migration or durable database write was performed. No canonical MTG row,
Storage object, image pointer, price publication row, or app-visible MTG row
exists because of this work.

The final canary and rollback proof were produced from commit
`64a2b627cb76072c2e1910510e4035f7caf45a67` on
`agent/mtg-pricing-readiness-v1`.

## Context

TCGCSV already warehouses a large current Magic source catalog, but Grookai
had no canonical MTG identities. Scryfall's versioned default-card bulk export
was selected as the canonical print candidate source because it preserves
stable print and set UUIDs, exact collector-number tokens, treatments,
finishes, paper availability, image references, and TCGPlayer product links.

## Full-Catalog Dry Run

| Metric | Value |
|---|---:|
| Scryfall bulk objects | 116,703 |
| English paper print candidates | 104,712 |
| Canonical set candidates | 953 |
| Planned finish children | 158,262 |
| Candidates with image references | 104,550 |
| Candidates without TCGPlayer links | 5,845 |
| Exact TCGPlayer product links | 97,918 |
| Linked product IDs present in warehouse | 97,917 |
| Exact product/subtype candidate lanes | 148,346 |
| Supported current Normal/Foil lanes | 144,482 |
| Positive current marketPrice lanes | 142,690 |
| Etched links preserved outside V1 | 1,155 |
| Product/subtype ownership collisions quarantined | 26 |
| Warehouse products not linked by Scryfall | 19,350 |

Source bulk SHA-256:
`4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c`

Full candidate payload fingerprint:
`857fd2246f75965a57922b6fc12ddb99b8d433e156edf4c17052b32b68a32b4c`

Exact mapping plan hash:
`233120f9f3b75b82e59741edd5613c76f2bb99c47b37578848f8b61cb649668c`

## Canary Scope

Selected set: **Duskmourn: House of Horror** (`dsk`)

| Intended canonical entity | Rows staged |
|---|---:|
| Sets | 1 |
| Parent `card_prints` | 417 |
| `card_print_identity` | 417 |
| Child `card_printings` | 807 |
| Scryfall parent mappings | 417 |
| Exact TCGPlayer printing mappings | 807 |
| Total immutable staging rows | 2,866 |

All 807 exact TCGPlayer lanes exist in the current production source snapshot
and all 807 have positive `marketPrice`. The set has zero quarantined mapping
collisions.

## Frozen Hashes

- Producing commit:
  `64a2b627cb76072c2e1910510e4035f7caf45a67`
- Writer payload fingerprint:
  `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Staging migration SHA-256:
  `20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8`
- Future canonical foundation migration SHA-256:
  `d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082`
- Staged rows SHA-256:
  `f8d5da47f8fa8c9e454b76dc5ddfd93bd0b2cfbe7681a4b0ad68565ec6a13ce0`
- Mutation contract SHA-256:
  `0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c`
- Staging batch ID:
  `60ea72dd-df1c-5ef8-9270-2dcbefc4adfe`

## Important Safety Finding

The original canary plan targeted shared canonical tables and claimed that no
app visibility would result. Code inspection proved that claim was unsafe:
generic set and card search surfaces can discover canonical rows before MTG
product support is ready.

The apply design was therefore changed before any write:

```text
frozen canonical payload
  -> immutable service-only MTG staging
  -> reviewed promotion gate
  -> shared canonical tables
  -> controlled app and pricing rollout
```

This prevents an incomplete MTG set or image-less card from leaking into
current collector surfaces.

## Rollback Proof

The staging migration and complete 2,866-row payload were executed together
inside one production transaction and rolled back.

- Batch rows inside transaction: 1
- Payload rows inside transaction: 2,866
- Readback mismatches: 0
- RLS enabled on both staging tables: true
- `anon` table access: false
- `authenticated` table access: false
- `service_role` select/insert access: true
- MTG canonical games after rollback: 0
- MTG canonical sets after rollback: 0
- Staging tables after rollback: absent
- Durable staging rows after rollback: 0
- Pokémon card count before/after: 58,769 / 58,769

## Tests

- MTG targeted contracts: `34 / 34` passed.
- Agent and audit syntax checks: passed.
- `git diff --check`: passed.
- Production preflight transaction read-only: true.
- Canonical ID, GV-ID, identity-hash, printing-ID, and mapping collisions: 0.
- Full repository hook limitation remains environmental: web lint resolves an
  incompatible `eslint/config` through the shared dependency junction in this
  isolated worktree. This is not an MTG contract failure.

## Permanent Evidence

- Full reconciliation:
  `docs/audits/pricing/mtg_canonical_catalog_reconciliation_v1/2026-08-13T18-09-16-746Z/`
- Duskmourn plan, preflight, and rollback proof:
  `docs/audits/pricing/mtg_canonical_catalog_canary_plan_v1/dsk/`

## Current Truths

- MTG source warehousing is ready for canonical work.
- The full English paper catalog has a deterministic candidate graph.
- Exact Normal/Foil TCGPlayer reconciliation is broad but not complete.
- The 26 ambiguous product/subtype lanes are quarantined, not guessed.
- Etched price publication is deferred.
- Source image URLs are references only; no image is self-hosted yet.
- The service-only staging schema and payload are proven but not applied.
- The shared MTG canonical foundation migration is not applied.
- MEE remains Pokémon-only and unchanged.

## Invariants

- Source presence never creates canonical identity.
- TCGPlayer `productId + subtype` is the market-lane boundary.
- Exact collector tokens and Scryfall print UUIDs are preserved.
- Normal, Foil, and Etched remain separate finish identities.
- Canonical collisions are quarantined; no winner is inferred.
- No source image URL becomes an app pointer before self-hosted hash and
  readback proof.
- Staging does not authorize canonical promotion.
- Canonical promotion does not authorize price publication.
- Price publication does not authorize anonymous or public product rollout.
- Pokémon identity, images, Vault data, and pricing may not change.

## Exact Next Gate

Apply only the service-only staging migration and this exact immutable DSK
payload after an explicit approval containing all three hashes below:

```text
staging migration:
20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8

writer payload:
83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7

mutation contract:
0bb200c5e273f99fcb3090d54b2accfa0b781d26d985584fbbe59882e04a387c
```

That gate may create one staging batch and 2,866 staging rows only. It may not
write canonical tables, Storage, images, prices, publication rows, app
visibility, Pokémon rows, updates, deletes, truncates, cleanup, or promotion.

## Remaining MTG V1 Sequence

1. Apply and read back the service-only DSK staging canary.
2. Review staged row hashes and exact source mappings.
3. Build and prove an explicit MTG app-visibility release boundary.
4. Apply the canonical foundation migration.
5. Promote DSK into shared canon and verify every row and boundary.
6. Acquire, self-host, hash, and read back a bounded DSK image canary.
7. Make MEE publication game-aware without changing Pokémon authority.
8. Build an MTG exact-price shadow and source-to-UI provenance proof.
9. Run a signed-in DSK product canary with rollback.
10. Expand canonical staging and promotion in bounded set batches.
11. Quarantine unresolved mappings and unsupported finishes.
12. Complete signed-in MTG rollout before considering anonymous access.

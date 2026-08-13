# Pricing Checkpoint 48: MTG DSK Hidden Canonical Apply Ready

## Status

The exact durable writer for the hidden Duskmourn (`dsk`) canonical promotion
is implemented and rollback-proven. The package is ready for a separate exact
apply decision.

No durable canonical MTG write was performed by this checkpoint.

## Exact Apply Package

- Promotion plan SHA-256:
  `a336eabaeafcc0d216794fd069e892de9dce1008357db3c844393d64881b8a54`
- Writer payload fingerprint:
  `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Foundation migration SHA-256:
  `d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082`
- Visibility migration SHA-256:
  `925b31fcf1ba0895f2ed276bb77b45c948d3f1f0c2ef147843487be7ba7125a4`
- Mutation contract SHA-256:
  `fbc8760b5b47b0c08bf7576b930c4f7b83ec9919656ffa6b05ac02350fca4899`
- Migration ledger fingerprint:
  `de5cdf352f30466605aa7b84401afac70f4493ac0bc6c8540d46a877aaf0b42d`

The writer applies exactly two migration-history rows in order:

1. `20260813190000_mtg_canonical_catalog_foundation_v1`
2. `20260813200000_mtg_catalog_app_visibility_boundary_v1`

It then inserts exactly:

- 1 DSK set;
- 417 parent cards;
- 417 active identity rows;
- 807 Normal/Foil child printings;
- 417 Scryfall mappings;
- 807 exact TCGPlayer product/subtype mappings.

The foundation also creates the deterministic MTG game row and the Foil and
Etched finish taxonomy keys. Etched pricing remains deferred.

## Writer Enforcement

The writer defaults to plan mode. Durable execution requires both `--apply`
and the exact approval string in `MTG_CANONICAL_PROMOTION_APPROVAL`.

All writes occur in one transaction. Before commit, the writer enforces:

- both migration-history rows are absent;
- the durable staging batch and all 2,866 staged rows still exist;
- all canonical IDs, GV-IDs, identity hashes, printing IDs, and mappings are
  collision-free;
- every inserted row exactly matches the frozen promotion graph;
- the release status is `hidden`;
- five restrictive catalog release policies exist;
- the release-control table remains service-only;
- anonymous and authenticated clients see zero MTG catalog and search rows;
- the internal unfiltered print search is not executable by clients;
- Pokémon service and authenticated visibility counts do not change.

After commit, apply mode repeats the full canonical, ledger, security,
visibility, and Pokémon readback. A post-commit mismatch is reported as a
failed apply even though the committed transaction would then require the
bounded rollback procedure; this is why every pre-commit assertion is also
enforced inside the transaction.

## Dry-Run Result

The exact writer completed its production dry-run and rolled back cleanly.

- Transactional MTG games: 1
- Transactional DSK sets: 1
- Transactional cards: 417
- Transactional identities: 417
- Transactional printings: 807
- Transactional Scryfall mappings: 417
- Transactional TCGPlayer printing mappings: 807
- Exact row mismatches: 0
- Migration-ledger mismatches: 0
- Security mismatches: 0
- Anonymous MTG visibility: 0
- Authenticated MTG visibility: 0
- Search visibility: 0
- Durable MTG canonical rows after rollback: 0
- Durable staging rows after rollback: 2,866
- Pokémon card count after rollback: 58,769

Permanent evidence:

- `docs/audits/pricing/mtg_canonical_catalog_promotion_writer_v1/2026-08-13T19-27-59Z_dry_run/`

## Exact Approval Text

```text
I approve only the hidden DSK canonical promotion plan a336eabaeafcc0d216794fd069e892de9dce1008357db3c844393d64881b8a54, writer payload 83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7, foundation migration d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082, visibility migration 925b31fcf1ba0895f2ed276bb77b45c948d3f1f0c2ef147843487be7ba7125a4, mutation contract fbc8760b5b47b0c08bf7576b930c4f7b83ec9919656ffa6b05ac02350fca4899, and migration ledger de5cdf352f30466605aa7b84401afac70f4493ac0bc6c8540d46a877aaf0b42d. This may insert one MTG game, Foil and Etched finish keys, one hidden MTG release control, 1 set, 417 card_prints, 417 card_print_identity rows, 807 card_printings, 417 Scryfall mappings, and 807 TCGPlayer printing mappings. I do not approve signed-in or public MTG visibility, images, Storage, image pointers, pricing, publication, Vault writes, another set, Pokemon mutation, updates, deletes, truncates, cleanup, or global db push.
```

## Current Truths

- DSK remains service-only staged, not canonical.
- The durable writer is code-complete and dry-run proven.
- The foundation and visibility migrations remain unapplied.
- MTG remains hidden from all app users.
- Images, pricing, and product release remain separate later gates.

## Exact Next Gate

Run the writer once in `--apply` mode only after the exact approval text above
is supplied. Stop after durable readback. Do not activate MTG visibility,
upload images, publish pricing, process another set, or change Pokémon.

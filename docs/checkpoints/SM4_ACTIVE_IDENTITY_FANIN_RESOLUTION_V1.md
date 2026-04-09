# SM4_ACTIVE_IDENTITY_FANIN_RESOLUTION_V1

## Context

`sm4` already had a lawful Class F normalization proof. The blocker was not ambiguity and it was not cross-set drift. The blocker was a canonical fan-in case that violated the live active-identity uniqueness rule:

- `uq_card_print_identity_active_card_print_id`
- exactly one active `card_print_identity` row may exist per canonical `card_print_id`

The live schema does **not** have `card_print_identity.archived_at`. In practice, archival is represented by preserving the identity row as history with `is_active = false` and updating `updated_at`.

## Root Cause

Live normalization on `sm4` proves:

- `source_count = 25`
- `canonical_count = 124`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 24`
- `unmatched = 25`
- lawful normalized map count = `25`
- reused canonical target count = `1`

The single fan-in group is:

- canonical target `3ccd86b2-311f-45a7-bcda-25d1b142c7d9 / Guzzlord-GX / 63 / GV-PK-CIN-63`
- source `819e8213-eafc-4fcd-885a-3f8913072768 / Guzzlord GX / 63`
- source `39339f6a-f300-449e-bb10-b136bb0288eb / Guzzlord-GX / 63a`

Both source identities are active, so a naive reassignment would create two active identity rows on one canonical parent and fail.

## Decision

Resolve fan-in by converging all mapped identity rows onto the canonical `card_print_id`, but keep exactly one active identity row per canonical parent:

1. select the winning active identity deterministically
2. preserve all losing identities as inactive history rows on the canonical parent
3. proceed with the standard FK collapse and delete the old null-`gv_id` parents

The runner uses the live schema representation:

- winning row stays `is_active = true`
- losing rows become `is_active = false`
- losing rows are not deleted
- all identity rows are repointed onto the canonical parent so history survives after parent deletion

## Proof

Normalization remains deterministic:

- ambiguity = `0`
- invalid normalized rows = `0`
- cross-set targets = `0`

Fan-in group count:

- `1`

Archived identity count after selection:

- `1`

Selected active identity count after selection:

- `24`

Selection rule:

1. normalized canonical name match
2. canonical token match
3. lexical distance
4. smallest UUID

For the `Guzzlord` fan-in cluster, both sources normalize to the canonical name, so token match breaks the tie:

- keep active: `819e8213-eafc-4fcd-885a-3f8913072768 / Guzzlord GX / 63`
- archive as history: `39339f6a-f300-449e-bb10-b136bb0288eb / Guzzlord-GX / 63a`

That preserves the canonical collector number on the one active identity row while retaining the suffix identity as history.

## Invariants Introduced

- exactly `1` active identity row per canonical `card_print_id`
- surplus fan-in identities are preserved as inactive history
- canonical `gv_id` namespace remains unchanged
- no cross-set collapse is permitted
- no new `gv_id` are created

## Risks

- incorrect active-row selection could surface the wrong printed number in identity-driven reads
- deactivating the wrong row could hide required canonical identity inputs
- any non-deterministic merge in traits, printings, or mappings remains a hard stop
- the live schema lacks `archived_at`, so history retention depends on `is_active = false` plus row preservation

## Post-State Truth

Apply completed.

Verified post-state:

1. fan-in groups resolved = `1`
2. archived history identities retained = `1`
3. deleted old parent rows = `25`
4. unresolved `sm4` null-`gv_id` parents = `0`
5. remaining old parent rows = `0`
6. canonical `sm4` row count remains `124`
7. canonical namespace drift = `0`
8. target identity rows on the `24` canonical targets = `25` total, `24` active, `1` inactive
9. active-identity conflicts on target parents = `0`
10. clean target groups after collapse = `24`
11. remaining duplicate groups = `0`
12. old FK references = `0`

Apply operations:

- archived identity rows = `1`
- updated identity rows = `25`
- inserted traits = `24`
- deleted old traits = `25`
- merged printing metadata rows = `72`
- deleted redundant printings = `75`
- updated external mappings = `25`
- updated vault items = `0`

Verified sample rows:

- `591dc740-d4dc-4e21-b257-55bc072441f1 / Gyarados GX / 18 -> bcab766c-f8db-4609-b8c3-5463f156dfe5 / Gyarados-GX / GV-PK-CIN-18`
- `39339f6a-f300-449e-bb10-b136bb0288eb / Guzzlord-GX / 63a -> 3ccd86b2-311f-45a7-bcda-25d1b142c7d9 / Guzzlord-GX / GV-PK-CIN-63`
- `4ddc5165-eeed-4416-8e4d-13cd1ec00040 / Silvally GX / 119 -> aaff3981-321c-4f41-acd1-8dcd472272af / Silvally-GX / GV-PK-CIN-119`

The fan-in sample now resolves with `2` identity rows on the canonical parent: `1` active and `1` inactive history row.

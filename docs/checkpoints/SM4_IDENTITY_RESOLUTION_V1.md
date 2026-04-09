# SM4_IDENTITY_RESOLUTION_V1

## Classification

`sm4` was classified as `BASE_VARIANT_COLLAPSE`, not lawful direct duplicate collapse.

Live class detection:

- `source_count = 25`
- `canonical_count = 124`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 24`
- `unmatched = 25`

This preserves the Sun & Moon identity-first invariant: the unresolved `sm4` lane is a null-`gv_id` base-variant surface that must normalize into canonical `sm4` before any duplicate logic is relevant.

## Normalization Summary

The authoritative source identity lived on active `card_print_identity` rows with `set_code_identity = 'sm4'`, while the old parents remained structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

`sm4` uses the stabilized normalization contract:

- `NAME_NORMALIZE_V2`
  - lowercase
  - unicode apostrophe to ASCII
  - normalize dash separators to spaces
  - normalize `GX` punctuation
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - numeric base extraction
  - suffix routing only when a same-set canonical target is deterministic
  - no cross-number merging
  - no cross-set routing

Live split:

- `name_normalize_v2 = 24`
- `suffix_variant = 1`

The single suffix case was:

- `63a -> 63` (`Guzzlord-GX -> Guzzlord-GX`)

Observed normalization surface:

- `GX` punctuation normalization, e.g. `Gyarados GX -> Gyarados-GX`
- no unicode-specific repair was required to unlock additional `sm4` rows
- no dash-specific repair was required to unlock additional `sm4` rows

## Mapping Proof

Pre-apply proof:

- unresolved source rows: `25`
- canonical `sm4` targets: `124`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `24`
- exact-token unmatched rows: `25`
- lawful base-variant map count: `25`
- multiple-match old rows: `0`
- reused targets: `1`
- unmatched base-variant rows: `0`
- invalid normalized rows: `0`
- cross-set targets: `0`
- distinct canonical targets in lawful map: `24`

Representative blocked pair:

- old `591dc740-d4dc-4e21-b257-55bc072441f1`
- old name `Gyarados GX`
- old printed token `18`
- candidate canonical `bcab766c-f8db-4609-b8c3-5463f156dfe5`
- candidate canonical name `Gyarados-GX`
- candidate canonical `gv_id = GV-PK-CIN-18`

Blocking fan-in cluster:

- canonical target `3ccd86b2-311f-45a7-bcda-25d1b142c7d9 / Guzzlord-GX / 63 / GV-PK-CIN-63`
- old `819e8213-eafc-4fcd-885a-3f8913072768 / Guzzlord GX / 63`
- old `39339f6a-f300-449e-bb10-b136bb0288eb / Guzzlord-GX / 63a`

This is a lawful normalized identity collapse, but it is not lawful under the current apply contract because both old rows carry active `card_print_identity` records and `public.uq_card_print_identity_active_card_print_id` allows only one active identity row per canonical parent.

Live FK inventory on old parents:

- `card_print_identity = 25`
- `card_print_traits = 25`
- `card_printings = 75`
- `external_mappings = 25`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit on standard FK tables is otherwise clean:

- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `75`
- metadata-only mergeable printing conflicts: `75`
- non-deterministic printing conflicts: `0`

## Risks

- collapsing two active source identities onto one canonical parent would violate the active identity uniqueness invariant
- resolving that fan-in would require identity-row mutation beyond simple `card_print_id` reassignment
- stale apply surface could change the blocking cluster between audit and execution
- unsupported FK references outside the handled table list remain hard-stop conditions

## Invariants Preserved

- scope remains inside the null-parent `sm4` source lane and canonical `sm4` targets
- canonical namespace remains unchanged
- no new `gv_id` are created
- no canonical `gv_id` are modified
- no row outside `sm4` was touched
- the runner fails closed before apply when active-identity fan-in is present

## Post-State Truth

Apply was intentionally stopped before mutation.

Dry-run truth:

1. classification = `BASE_VARIANT_COLLAPSE`
2. lawful normalized map count = `25`
3. blocking reused canonical target count = `1`
4. canonical `sm4` count remains `124`
5. unresolved `sm4` null-`gv_id` parents remain unchanged because no apply ran
6. no backups were created because apply did not start
7. no FK rows were moved

Planned sample mappings before stop:

- `591dc740-d4dc-4e21-b257-55bc072441f1 / Gyarados GX / 18 -> bcab766c-f8db-4609-b8c3-5463f156dfe5 / Gyarados-GX / GV-PK-CIN-18`
- `193de958-9670-45be-bbfb-a86e3b86d3f7 / Buzzwole GX / 104 -> 7e787d3a-1e3c-40a4-a096-abeeeb767664 / Buzzwole-GX / GV-PK-CIN-104`
- `4ddc5165-eeed-4416-8e4d-13cd1ec00040 / Silvally GX / 119 -> aaff3981-321c-4f41-acd1-8dcd472272af / Silvally-GX / GV-PK-CIN-119`

The runner stop reason is:

- `ACTIVE_IDENTITY_FAN_IN_BLOCKED:uq_card_print_identity_active_card_print_id:1`

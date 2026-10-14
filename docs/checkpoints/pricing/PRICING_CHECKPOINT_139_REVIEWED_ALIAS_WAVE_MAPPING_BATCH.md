# Pricing Checkpoint 139: Reviewed Alias Wave Mapping Batch

## Status

`21 EXACT MAPPINGS COMMITTED AND VERIFIED; PRICING SHADOW QUEUED`

## Scope

This batch freezes 21 TCGPlayer products whose established source group already
resolves to one canonical set but whose displayed source name does not equal the
canonical Master Index name:

- five `XY - Phantom Forces` products in canonical set `xy4`, where TCGPlayer
  omits the canonical Team Flare Gear or Team Flare Hyper Gear suffix;
- eleven `SM - Lost Thunder` products in canonical set `sm8`, where TCGPlayer
  spells the Prism Star glyph or Fairy Charm type differently; and
- five `ME: Mega Evolution Promo` products in canonical set `mep`, where the
  source title explicitly identifies the Pokemon Center Exclusive treatment.

The registry admits each row only by exact product ID, group ID and name, raw
source title, full printed coordinate, parent UUID and GV-ID, set, canonical
name, variant key, child GV-ID, finish, and provenance. It does not add general
name normalization rules.

## Exclusions

The rehearsal deliberately excludes Call of Legends Shiny aliases because the
canonical targets already have active TCGPlayer mappings. It excludes Professor
Elm's Lecture because its printed coordinate did not resolve to one live parent.
It also excludes the MEP Ace Trainer variant without a governed child and newer
MEP products whose canonical cards are not yet present. Those rows remain
explicitly evidence-blocked.

## Evidence and Rehearsal

The read-only verified-TLS planner produced 21 candidates and retained 713
blocked products. Those candidates cover 28 missing-price observations because
some products have more than one source subtype. The authority rehearsal then
confirmed 21 current source products, 21 unique active
`pokemon_eng_standard` parents, 21 selected active public non-provisional
children, and zero source or target mapping collisions.

Checked-in English Master Index card and printing exports independently verify
all three canonical sets and selected finishes. The five stamped MEP parents
also require the retained special-variant coverage evidence. Base targets have
active verified visible truth reviews. The stamped targets have no live review
override, so the package asserts that null state and binds their governed child
evidence instead.

- trial candidates: `21`
- projected missing-price observations: `28`
- bounded packages: `1` (`21` mappings)
- trial candidates SHA-256:
  `7ff9072569b859f448173df6fba612357a6bba010bad1046152906ca3e5e1131`
- trial authority fingerprint:
  `475bc470e011a30aebbc754608aa3b243ec529ac386a1715c20534063eb5e470`
- database writes: `0`

Trial artifacts are retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/alias-wave-21-plan-trial-v1`
and `alias-wave-21-authority-trial-v2`.

## Production Mapping Result

PR #660 merged the reviewed registry, guarded planner/apply support, authority
builder, and contracts at exact commit
`ccffdee1afd820072e020ee52a9c59d32110d1c7`. The verified-TLS clean plan retained
the same 21 candidates and SHA-256
`7ff9072569b859f448173df6fba612357a6bba010bad1046152906ca3e5e1131`.
The clean three-scope authority package was generated from a clean tracked
worktree and has fingerprint
`d88b27eaec488f92138c9738fcbd58508fa1d6497e52f6abcd354371756a4c6d`.

Canonical dry run `1e13b6bc-dd17-4253-b07f-25f9bcaeeeba` selected all 21 rows,
planned all 21 inserts, and proved rollback with zero writes. Production
maintenance run `227e73af-61c7-49c5-8819-12422f4e6c05` then committed exactly 21
insert-only mappings and read back all 21 inside the guarded transaction. It
made zero publication writes and zero customer-state writes.

An independent repeatable-read, read-only query subsequently verified 21 exact
source products, 21 active mappings bound to that maintenance run, 21 unique
active standard parents, and 21 selected governed public non-provisional
printings. The complete clean plan, authority, rollback rehearsal, apply
receipt, and independent readback are retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/alias-wave-21-production-release-v1`.

## Next Gate

Full-scope pricing shadow run `38615087902` was superseded while pending by
combined run `38619200134`, which is queued at
`ebe54053cecd9ca22f04fac361695febd3bb0864` and includes this wave plus the
subsequent Prism Star mappings. Mapping alone did not publish customer prices.
Inspect the combined shadow's coverage, quarantine, and freshness evidence
before a governed pricing publication decision, while the completion agent
continues routing the next evidence-backed mapping batch.

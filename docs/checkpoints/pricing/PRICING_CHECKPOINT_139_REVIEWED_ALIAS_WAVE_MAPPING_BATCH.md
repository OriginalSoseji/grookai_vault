# Pricing Checkpoint 139: Reviewed Alias Wave Mapping Batch

## Status

`21 EXACT MAPPINGS PREPARED; PRODUCTION APPLY PENDING CLEAN MERGE`

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

## Next Gate

Merge the reviewed registry, guarded planner/apply support, authority builder,
and contracts. Regenerate the plan and three-scope authority package from that
exact clean commit, prove rollback with the canonical maintenance launcher,
apply the same frozen package under the production gate, and independently
verify all 21 mappings. Mapping alone does not publish customer prices. Queue a
fresh exact-commit pricing shadow before any governed publication decision.

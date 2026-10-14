# Pricing Checkpoint 141: Reviewed Alias Wave 2 Mapping Batch

## Status

`5 EXACT MAPPINGS PREPARED; PRODUCTION APPLY PENDING CLEAN MERGE`

## Scope

This batch freezes five TCGPlayer Holofoil products whose source display names
differ from their unique canonical card names while their set and printed
coordinates remain exact:

- Pokémon Breeder Full Art 73/73 from Shining Legends (`sm3.5`);
- Poké Kid Full Art 070/072 from Shining Fates (`swsh4.5`); and
- the red, green, and blue RGB Mew cards from 30th Celebration (`30c`).

Every source product is active and current, has one Holofoil price observation,
one unique unmapped `pokemon_eng_standard` parent, and one active, public,
non-provisional Holo child with an active verified truth review. The registry
freezes product ID, group, raw title, printed coordinate, parent identity, Holo
printing identity, and provenance. It does not add a global name-normalization
rule.

## Retained Holds

The verified-printing scan also found four Nintendo promo products with live
verified Normal children. They remain held because TCGPlayer has multiple
edition-specific products competing for the same canonical parent. Mapping one
without modeled distribution identity would blend Target Promo and EX Deck Tin
prices and prevent the other exact source from being represented safely.

The broader scan evaluated 139 structurally unique number matches. Candidates
without one active verified visible printing remain evidence-blocked.

## Evidence and Rehearsal

The verified-TLS planner produced exactly five candidates from the refreshed
pricing backlog and retained 729 blocked products. The three-scope authority
rehearsal independently checked live source products, unique parents, selected
Holo printings, truth reviews, checked-in Master Index evidence for `sm3.5` and
`swsh4.5`, and checked-in reviewed coordinate evidence for `30c`.

- candidates: `5`
- projected missing-price observations: `5`
- bounded packages: `1` (`5` mappings)
- candidates SHA-256:
  `e982d5f8e56b52fb2979a19c7326872f7397bc184b7896068e0a94ef83042f79`
- trial authority fingerprint:
  `6abada93c6db1d9d4a5ca5dd94abacfb7d76e575082e4639eb2077686de67685`
- database writes: `0`

Trial evidence is retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/alias-wave-2-plan-trial-v1`
and `alias-wave-2-authority-trial-v1`.

## Next Gate

Merge the exact registry, evidence, planner/apply support, read-only authority
builder, and contracts. Regenerate the plan and authority package from that
exact clean commit, prove rollback through the canonical maintenance launcher,
apply the same frozen package under the production gate, and independently
verify all five mappings. Mapping and customer price publication remain
separate guarded steps.

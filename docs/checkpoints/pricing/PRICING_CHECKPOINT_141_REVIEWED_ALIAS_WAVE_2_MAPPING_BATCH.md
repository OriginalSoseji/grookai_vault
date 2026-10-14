# Pricing Checkpoint 141: Reviewed Alias Wave 2 Mapping Batch

## Status

`5 EXACT MAPPINGS APPLIED AND INDEPENDENTLY VERIFIED`

## Scope

This batch freezes five TCGPlayer Holofoil products whose source display names
differ from their unique canonical card names while their set and printed
coordinates remain exact:

- Pokémon Breeder Full Art 73/73 from Shining Legends (`sm3.5`);
- Poké Kid Full Art 070/072 from Shining Fates (`swsh4.5`); and
- the red, green, and blue RGB Mew cards from 30th Celebration (`30c`).

Before apply, every source product was active and current, had one Holofoil
price observation, one unique unmapped `pokemon_eng_standard` parent, and one
active, public, non-provisional Holo child with an active verified truth review.
The production run has now mapped each source product to that frozen parent.
The registry freezes product ID, group, raw title, printed coordinate, parent
identity, Holo printing identity, and provenance. It does not add a global
name-normalization rule.

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
- clean authority fingerprint:
  `302c3f95dd43ade394e6b6d5136820520507d5f2302adffea37a74042d5c0acb`
- clean authority file SHA-256:
  `5c544323ad175c92a5753f7041f5fa184600f35f3357972d9d6100bd9daa8b1e`
- database writes: `0`

Trial evidence is retained under
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/alias-wave-2-plan-trial-v1`
and `alias-wave-2-authority-trial-v1`.

## Production Result

PR `#664` squash-merged the governed authority at commit
`1da51a6dba0ab60820848e72e6b9bafb7a21ae74`. The plan and authority were
regenerated from that exact clean commit. Canonical maintenance dry run
`787e48b2-c34a-4b71-9040-002d48dfbca4` selected all five rows, planned five
inserts, and proved rollback with zero writes. Production run
`538a75b4-1f92-43cf-ac01-0ac78c37fcbd` committed exactly five active mappings
and read back all five. It wrote no publication or customer-state rows.

An independent repeatable-read, read-only query then verified the five current
source products, five exact active mappings, five unique canonical parents,
five selected public verified Holo printings, and the production maintenance
run ID. The complete release evidence and SHA-256 inventory are retained at
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/alias-wave-2-production-release-v1`.

The older queued Prism Star shadow was canceled after it became stale. Combined
full-scope shadow run `38624164995` is queued from the exact merged commit and
includes every earlier mapping plus this batch. Mapping and customer price
publication remain separate guarded steps.

## Next Gate

Inspect the combined full-scope shadow when the older serialized run finishes,
then use the refreshed completion-agent backlog to select the next evidence-safe
mapping or upstream truth-review repair batch. Keep the four Nintendo promo
edition collisions and every unverified printing explicit until their identity
or review evidence is resolved.

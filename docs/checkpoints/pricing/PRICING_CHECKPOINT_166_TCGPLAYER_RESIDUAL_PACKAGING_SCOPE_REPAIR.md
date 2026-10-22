# Pricing Checkpoint 166: TCGPlayer Residual Packaging Scope Repair

## Status

`IMPLEMENTED - EXACT-COMMIT SHADOW PENDING`

## Problem

The verified V1.4 release removed 2,352 numberless packaged products from the
identity-repair queue. Its fresh completion artifact still contained 457
numberless products. A complete row-by-row audit found that 253 were additional
sealed or packaged listings whose names used narrower TCGPlayer conventions:
Theme and Collector Boosters, tournament and promo packs, Clash Packs, blisters,
cartons, starter sets, prerelease products, land stations, Draft Night products,
Mythic Editions, Game Night sets, Commander deck products, and similar boxed
editions.

The other 204 numberless products include legitimate card-like records such as
early Magic singles, oversize cards, Art Cards, Secret Lair letter and insert
cards, World Championship biography and decklist cards, and Pokemon basic
Energy. They remain in the identity-review queue.

## V1.5 Contract

`TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_5` preserves every earlier classifier
for replay and adds four explicit rule families:

- `sealed_pack_family_v1_5`;
- `sealed_starter_family_v1_5`;
- `sealed_event_family_v1_5`;
- `sealed_boxed_edition_family_v1_5`.

These rules run only when printed-number evidence is absent. Numbered card names
such as `Booster Tutor`, `Wolf Pack`, `Pack Rat`, and `The Deck of Many Things`
remain in scope. The broader publication-ledger policy remains V1.3 because the
database lineage guards require that stable version. The publication worker
advances to V1.20 and the coverage audit to V1.5.

## Frozen Simulation

The V1.5 classifier was replayed against all 13,317 unique products from
completion workflow `39702473069`. The result was exact:

- 253 additional exclusions: 221 Magic and 32 Pokemon;
- 194 pack-family, 25 event-family, 27 boxed-edition-family, and 7
  starter-family exclusions;
- zero products with printed-number evidence excluded;
- projected queue: 13,064 products, comprising 12,796 Magic and 268 Pokemon;
- projected retained numberless population: 204.

The independent simulation receipt is
`C:\grookai_vault_operator_artifacts\tcgplayer_scope_v15_simulation_39702473069.json`.

## Release Gate

Merge the tested source, run a full-scope shadow from the exact merged commit,
and independently verify the decision counts, V1.5 policy evidence, rule
population, numbered-card protection, hashes, and reconciliation. Guarded
production publication may run only from that same commit and successful shadow
key. A later completion workflow must emit exactly one reconciled Magic queue,
Pokemon queue, and combined queue before the local Ollama consumer changes.

This correction only classifies product scope. It creates no card mappings,
canonical identities, customer records, or publication authority.

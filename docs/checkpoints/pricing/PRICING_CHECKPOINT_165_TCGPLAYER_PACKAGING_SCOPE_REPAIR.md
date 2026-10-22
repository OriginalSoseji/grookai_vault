# Pricing Checkpoint 165: TCGPlayer Packaging Scope Repair

## Status

`LIVE VERIFIED - RESIDUAL SCOPE REPAIR CONTINUES IN CHECKPOINT 166`

## Problem

The first live cross-category completion artifact was internally consistent but
overstated the missing-card queue. The production scope policy recognized common
Booster Boxes and Tins, but it did not recognize several TCGPlayer naming
families used for sealed and packaged products. Examples included Fat Packs,
Intro Packs, preconstructed decks, bundles, displays, collections, cases, kits,
and whole Secret Lair drops.

These products belong outside the ordinary card-identity repair lane. Sending
them to the MTG or Pokemon mapping worker would waste capacity and could create
false card mappings.

## Live Population Audit

The exact production run behind completion workflow `39613976600` contained
15,669 deduplicated products classified as in-scope identity gaps. Direct
read-only evidence showed:

- 12,860 products with printed-number evidence;
- 2,809 products without printed-number evidence;
- 2,352 numberless products matched explicit package signals under the new
  policy;
- zero products with printed-number evidence were removed;
- the projected ordinary-card queue is 13,317 products: 13,017 Magic and 300
  Pokemon.

The remaining numberless products are retained for category-specific review;
the policy does not infer that every numberless object is sealed.

## V1.4 Contract

`TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_4` adds a versioned package rule. It
applies only when printed-number evidence is absent and recognizes package
terms such as Box, Deck, Display, Bundle, Kit, Case, Collection, Fat Pack,
Intro Pack, Booster Pack, and Secret Lair product listings. Numbered cards whose
names contain those words remain in scope.

The publication worker and coverage audit require V1.4 product-scope evidence.
The broader publication ledger remains on V1.3 so the deployed database lineage
guards stay unchanged; the worker advances to V1.19. Older product-scope
classifiers remain exported unchanged so historical decisions stay reproducible.

## Release Gate

Merge the tested source, run a full-scope shadow from the exact merged commit,
and reconcile the complete decision counts. Run guarded production publication
only from that same commit and the successful shadow key. Then rerun the pricing
completion workflow and verify the package listings no longer enter either
category's ordinary identity queue before changing the local Ollama input.

No scope-policy change creates card mappings, canonical identities, or customer
ownership records. Publication activation remains a separate guarded operation.

## Live Verification

The exact-commit full shadow completed in workflow run `39617270650` at commit
`91439ea8f57827beecc77d4911a3ae0d4c97a183`. All 208,666 decisions used product
scope V1.4, all 2,352 audited package products were excluded, all 12,860
numbered products had zero package-rule violations, and reconciliation was
exact.

Guarded production workflow `39643358995` activated publication set
`0fd8c589-0e56-4c7e-a9bb-e1ec89cb0692` from the same commit and shadow key.
It activated 176,830 rows, excluded 14,006, quarantined 17,830, and reported no
reconciliation mismatch. Scheduled completion workflow `39702473069` then
emitted an exact 13,317-product queue: 13,017 Magic and 300 Pokemon.

The completion readback confirmed that V1.4 removed its intended package
population without touching numbered card names. It also exposed 253 additional
numberless package listings with naming families outside V1.4. Checkpoint 166
owns that narrower residual correction.

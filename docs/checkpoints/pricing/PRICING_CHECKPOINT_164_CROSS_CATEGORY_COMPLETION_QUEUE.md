# Pricing Checkpoint 164: Cross-Category Completion Queue

## Status

`LIVE WORKFLOW VERIFIED - PRODUCT SCOPE REPAIR REQUIRED`

## Problem

The scheduled TCGPlayer pricing-completion agent measured both Magic and
Pokemon identity gaps every fifteen minutes, but its planning and downstream
Ollama artifact were Pokemon-only. The local worker therefore treated a few
hundred Pokemon planner holds as the complete backlog while more than fourteen
thousand actionable Magic source products remained outside its input.

The larger unpublished count also mixed separate problems: genuine in-scope
identity gaps, special variants, unsupported or sealed products, and missing
positive market values. It could not be used as a count of missing cards.

## Queue Contract

Each completion cycle now emits one deduplicated product queue plus separate
Magic and Pokemon queue files. A queued product must be in the pricing policy's
`in_scope` lane. All supporting observation IDs, subtypes, gap reasons, source
group data, category data, and assigned repair-agent key are retained. Special
variants and unsupported product kinds remain in their existing routes and do
not enter the identity queue.

The V2 heartbeat reports both category lanes, including raw backlog rows,
source products, groups, and actionable queued products. The largest group is
selected across categories. Existing reviewed Pokemon candidates keep their
priority; otherwise an available Magic queue becomes the next repair action.

## Boundaries

- Queue construction performs no canonical, mapping, pricing, publication, or
  customer-state writes.
- Deduplication never converts an advisory row into mapping authority.
- Magic and Pokemon retain separate identity domains and repair owners.
- Ollama output remains advisory and cannot apply a queue item.
- Zero unpublished pricing observations remains the completion condition.

## Verification Gate

After merge, dispatch the scheduled workflow and verify that the artifact
contains exactly one `identity_product_queue.jsonl`, one
`mtg_identity_product_queue.jsonl`, and one
`pokemon_identity_product_queue.jsonl`. Reconcile their product counts to the
V2 heartbeat, then update the local consumer to use the category queue rather
than the Pokemon planner's `blocked.jsonl`.

## Live Verification

PR 761 merged at `24cea687b4fe9d99460e372e1cf310584e365113`.
Workflow run `39613976600` completed from that exact commit and emitted one copy
of every required queue. The receipt and downloaded bytes reconciled exactly:

- combined: 15,669 rows, SHA-256
  `1f8b0cf0d9527fc285e4af5f3aed335895b8a5725375c03a7a6f95cbb425c5ca`;
- Magic: 15,198 rows, SHA-256
  `d2f410dea9df4eff879560f984e01de4143b273a4013f6a9181bb6b52ab65aca`;
- Pokemon: 471 rows, SHA-256
  `e38e68575f724f8ce9953d65a4428ac87967a406705094a8e9aec0de74b567b5`.

The live artifact also exposed stale scope classification: Fat Packs, Intro
Packs, decks, bundles, displays, and other packaged products were marked
`in_scope`. Checkpoint 165's exact-commit shadow, production activation, and
completion readback removed 2,352 of them. That readback exposed 253 narrower
package-name families; checkpoint 166 owns the remaining correction. The local
consumer must remain on its existing input until V1.5 production and completion
evidence remove those products from the card-identity queue.

# Pricing Checkpoint 169: Hosted MTG Finish Backfill Runner

## Status

`IMPLEMENTED - HOSTED PLAN PENDING`

## Problem

The October 22 parent bridge inserted 1,084 exact MTG TCGPlayer product-to-card
mappings, but the next full pricing shadow remained identical to current
production: 208,816 selected and 176,807 eligible. Parent identity alone does
not provide the exact `productId:finish` lineage required by publication.

The remaining 1,184 multi-parent products are lawful Normal/Foil splits. They
must stay on the finish-specific mapping lane; selecting one parent for the
whole product would misprice the other finish.

## Repair

The MTG pricing runner now exposes `finish_map_plan`, `finish_map_dry_run`, and
`finish_map_apply`. The plan downloads current Scryfall default-card bulk data,
converts it to deterministic gzip JSONL, freezes its hash and timestamp, and
plans against the exact active pricing publication run.

Dry-run downloads the successful plan artifact and reuses its frozen source.
Apply downloads the successful rollback artifact. Both re-plan against the
same commit, pricing run, source hash, and plan fingerprint before continuing.

## Boundaries

- Only active `tcgplayer_market` printing mappings may be inserted.
- Normal and Foil remain separate exact child identities.
- Etched authority cannot be reused for Foil.
- Conflicts, ambiguity, hidden rows, provisional rows, and non-exact identities
  fail closed or remain review-only.
- The writer cannot update or delete mappings, alter canonical catalog rows,
  publish prices, or mutate Pokemon data.
- Apply requires the plan-derived acknowledgement and a successful immutable
  rollback receipt from the exact same commit.

## Release gate

Run plan, inspect the selected and review-only classifications, run rollback,
then apply only the identical frozen plan. A new full pricing shadow must show a
reconciled eligibility gain before production activation.

# Card Visual Search Checkpoint Index

This index contains the current checkpoint intentionally carried into the
repository reconciliation candidate. The complete historical checkpoint set
remains preserved on the Visual Search source refs and in the off-machine
recovery package.

## Current Handoff

- [Visual Search V2 Pre-PokeJavi Handoff](VISUAL_SEARCH_V2_PRE_POKEJAVI_HANDOFF_20260730.md) - `2026-07-30` - Engineering and zero-AI corpus preparation complete; human calibration, holdout, migration apply, release load, and activation remain gated.

## Boundary

This index does not authorize merging PR #118, applying its persistence
migration, loading a visual-search release, generating embeddings, executing
the sealed holdout, or activating collector visual search.

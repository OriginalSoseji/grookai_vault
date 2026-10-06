# Collectr sealed product labels — October 6, 2026

PR601 is live and its successful import is complete: 1,590 accounted copies,
562 remaining source rows. Never replay its consumed requests. This candidate
starts from main04980f98d, preserving PR602 language-index work.

The shared sealed planner now recognizes four exact source-label differences:
the `Universes Beyond:` prefix for Final Fantasy Collector Booster Display,
Gift Bundle and Starter Kit, and the space/hyphen spelling of Prismatic
Evolutions Super-Premium Collection. Aliases bind the entire source label,
game, normalized set and package form. They do not remove arbitrary qualifiers
or create catalog records. Website preview and server validation share the rule.

Fresh read-only canonical catalog evidence confirms the four released mappings.
The original file qualifies 12 additional rows / 19 sealed copies in USD.
All other preview objects remain exactly equal, and all 1,310 previously mapped
source groups retain their selected identities and metadata. Projected totals
are 1,609 accounted copies and 550 held rows; these are not live import counts.

Focused regression tests cover preview/server agreement, original source and
cost preservation, rollout/currency gates, language and package distinctions,
wrong sets/games, ambiguous aliases, unreleased products and invalid mappings.
No SQL, permissions, native, pricing or existing inventory changes are included.

Private evidence and actual test/release state:
`C:/grookai_vault_operator_artifacts/collectr_sealed_labels_20261006/CHECKPOINT.json`.
Release qualification, deployment and a separate owner-bound incremental save
remain. The prior PR601 release and import intents stay consumed.

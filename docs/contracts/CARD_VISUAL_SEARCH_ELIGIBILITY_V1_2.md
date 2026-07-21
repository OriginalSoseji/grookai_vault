# CARD_VISUAL_SEARCH_ELIGIBILITY_V1_2

Status: Active - offline eligibility repair and audit only

Date: 2026-07-21

## Purpose

This contract supersedes `CARD_VISUAL_SEARCH_ELIGIBILITY_V1_1` after its repaired stratified sample exposed three remaining identity-boundary failures: Energy cards mislabeled as Pokémon, Pokémon cards mislabeled as Stadium, and valid Pokémon scenes incorrectly rejected because a secondary human was visible.

V1.2 preserves all V1.1 tier, evidence, guard, and immutability rules. It adds identity detection that is independent of the source prompt branch.

## Energy Exclusion

Energy cards remain deferred and must be Tier C even when source metadata routes them through another prompt branch.

Energy identity is detected from:

- prompt branch `energy`;
- exact supertype, subtype, or category `Energy`; or
- a canonical name ending in the localized Energy noun, including `Energy`, `Energie`, `Énergie`, `Energia`, `Energía`, `エネルギー`, `에너지`, or `能量`.

Names such as `Energy Search`, `Energy Switch`, and `エネルギー転送` are tools/items and do not match the suffix rule.

Every decision records `energy_card_detected`. The reconciliation gate requires zero detected Energy rows to be search eligible.

## Pokémon Branch Completeness

A row routed through the `pokemon` branch must contain at least one typed `scene_subject`. An object, symbol, body-region observation, or untyped subject-like observation does not satisfy this boundary.

Rows without a typed scene subject receive Tier C reason:

`prompt_branch_profile_conflict:pokemon_without_scene_subject`

This prevents object cards, Energy cards, and materially incomplete Pokémon graphs from entering search solely because their prompt branch says Pokémon.

## Cross-Branch Pokémon Identity

The offline policy loads the repository-governed Pokémon identity map from:

`lib/services/identity/pokemon_japanese_name_map.dart`

The map currently provides more than `1,000` Japanese/English identity entries. A card routed as `trainer` or `stadium` fails closed when its canonical name begins with a known Pokémon identity. This catches cases such as `Unown R (Temple of Anger No. 022)` routed as Stadium.

The lexicon is used only as contradiction evidence. It does not create visual facts or rewrite canonical metadata.

## Secondary Human Evidence

`potential_unavailable_metadata_prompt_branch_mismatch` becomes guarded Tier B when the expected canonical Pokémon is itself present as a typed scene subject, even if another visible human or non-Pokémon object caused the original heuristic flag.

The decision records reason:

`canonical_subject_is_visibly_present_despite_secondary_non_pokemon_evidence`

Rows without the expected canonical subject remain Tier C.

## Preserved V1.1 Repairs

- owner/variant base-identity matches become guarded Tier B, never Tier A;
- structurally separated subject roles become guarded Tier B;
- cross-role observation reuse remains Tier C;
- Trainer branch without human evidence remains Tier C;
- Stadium branch with human evidence remains Tier C;
- Stadium branch on a `Trainer`-named card remains Tier C;
- unknown flags and policy rules remain Tier C;
- all source graphs remain immutable.

## Acceptance Criteria

- All `11,000` source IDs receive exactly one V1.2 decision.
- Zero detected Energy cards are search eligible.
- Every `pokemon` branch row without a typed scene subject is Tier C.
- Known Pokémon identities routed as Trainer or Stadium are Tier C.
- A visible canonical Pokémon plus a secondary human does not fail solely for unavailable-metadata branch mismatch.
- The prior V1 and V1.1 sampled failures replay to their reviewed safe tier.
- No duplicate decisions, unknown flags, unknown rules, or reconciliation mismatches exist.
- The seeded stratified audit is regenerated again before lock.

## Boundaries

- Provider calls: forbidden.
- Database connection or writes: forbidden.
- Approval changes: forbidden.
- Embeddings: forbidden.
- Artwork grouping: forbidden until the V1.2 audit passes.
- Search projections and index writes: forbidden.
- Public reads: forbidden.

## Next Gate

Replay all `11,000` rows under V1.2, verify zero Energy leakage, and regenerate the deterministic stratified audit. If another policy class appears, stop and version the repair. Otherwise lock eligibility and begin the fail-closed artwork-grouping contract.

## Related Contracts

- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_1.md`
- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`

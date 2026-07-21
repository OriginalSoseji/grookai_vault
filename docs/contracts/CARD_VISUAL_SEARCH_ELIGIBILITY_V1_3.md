# CARD_VISUAL_SEARCH_ELIGIBILITY_V1_3

Status: Active - offline eligibility repair and audit only

Date: 2026-07-21

## Purpose

This contract supersedes `CARD_VISUAL_SEARCH_ELIGIBILITY_V1_2` after the next seeded sample found non-Pokémon cards routed through the Pokémon prompt with plausible but unrelated scene facts. Branch labels and generic scene subjects are not sufficient identity evidence.

V1.3 requires the canonical card name, repository Pokémon identity map, and typed scene subjects to agree before a Pokémon-branch row can become search eligible.

## Canonical Pokémon Identity Agreement

The policy loads Japanese/English alias pairs from:

`lib/services/identity/pokemon_japanese_name_map.dart`

For every `pokemon` branch row:

1. The canonical card name must contain a known Pokémon identity alias.
2. The graph must contain at least one typed `scene_subject`.
3. At least one typed scene-subject identity must match a Japanese or English alias for a Pokémon identity present in the canonical name.

Failures receive Tier C reasons:

- `prompt_branch_profile_conflict:pokemon_branch_without_known_pokemon_identity`
- `prompt_branch_profile_conflict:pokemon_without_scene_subject`
- `prompt_branch_profile_conflict:pokemon_without_matching_canonical_subject`

This catches Stadium, Trainer, Item, and Energy cards mislabeled as Pokémon even when the model extracted a plausible environment, object, or human.

## Alias Matching

Alias matching is normalized and boundary-aware for Latin names and supports contained Japanese identity strings. It supports:

- Japanese canonical name with English extracted identity;
- English canonical name with Japanese extracted identity;
- owner-prefixed identities such as `Misty's Horsea`;
- variant suffixes such as `ex`, `GX`, `V`, `VMAX`, and delta notation; and
- multi-subject names where at least one canonical subject is safely matched for guarded retrieval.

The alias map is contradiction evidence only. It does not write or infer canonical identity.

## Preserved Repairs

V1.3 preserves all V1.2 rules:

- Energy identity is excluded independently of prompt branch.
- Energy tools whose names do not end in the Energy noun remain non-Energy.
- Owner/variant base-identity flag false positives become guarded Tier B.
- Structurally separated role flag false positives become guarded Tier B.
- A visible canonical Pokémon plus secondary human evidence may recover to guarded Tier B.
- Trainer without human evidence remains Tier C.
- Trainer/Stadium cards containing a known Pokémon identity remain fail-closed when branch evidence conflicts.
- Source graphs and original quality flags remain immutable.

## Acceptance Criteria

- All `11,000` source IDs receive exactly one V1.3 decision.
- Zero detected Energy cards are search eligible.
- Zero Pokémon-branch rows lacking a known canonical Pokémon alias are eligible.
- Zero Pokémon-branch rows lacking a matching typed canonical scene subject are eligible.
- Japanese/English alias matches preserve valid Pokémon rows.
- Prior sampled false exclusions remain guarded Tier B where evidence proves the canonical subject.
- Prior sampled wrong-branch rows become Tier C.
- No duplicate decisions, unknown flags, unknown policy rules, or reconciliation mismatches exist.
- A fresh seeded stratified audit is generated before eligibility lock.

## Boundaries

- No provider calls.
- No database connections or writes.
- No approvals.
- No embeddings.
- No artwork grouping.
- No search projection or index writes.
- No public reads.

## Next Gate

Replay the exact `11,000`-row source inventory under V1.3 and regenerate the seeded audit. If it is clean at the tier/guard trust boundary, lock eligibility and proceed to fail-closed artwork grouping. Do not continue vocabulary-level tuning inside already guarded Tier B rows.

## Related Contracts

- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_2.md`
- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`

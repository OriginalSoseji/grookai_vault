# CARD_VISUAL_SEARCH_ELIGIBILITY_V1_1

Status: Active - offline eligibility repair and audit only

Date: 2026-07-21

## Purpose

This contract supersedes `CARD_VISUAL_SEARCH_ELIGIBILITY_V1` after its first stratified audit found both overly strict subject exclusions and overly permissive prompt-branch routing. It preserves the Tier A/B/C model and all source boundaries while adding reviewed, evidence-based handling for those demonstrated failure classes.

It does not approve visual facts, mutate source graphs, assign artwork groups, write database rows, create embeddings, or activate search.

## Preserved Tier Model

- Tier A: clean, trusted retrieval evidence with no known limitations.
- Tier B: structurally valid evidence with explicit projection guards that suppress affected claim classes.
- Tier C: excluded evidence, source gaps, critical contradictions, unknown failure classes, and Energy rows.

Search eligibility remains independent from structural validity and human approval.

## Reviewed Critical-Flag Reclassification

A nominally critical source flag may be downgraded only by a deterministic reviewed rule. The decision must retain the original flag, record the reclassification reason, and add a projection guard.

### Base Subject Identity Match

`potential_primary_subject_mismatch` becomes guarded Tier B when a scene-subject identity contains the same meaningful base identity as the canonical name after normalization.

Supported examples include:

- `Erika's Exeggutor` and `Exeggutor`
- `giovanniのmeowth（u）` and `meowth`
- `Flareon δ` and `flareon_delta_species_pokemon`

Owner prefixes, possessives, rarity/variant suffixes, and generic words cannot create a mismatch by themselves. A different species, missing subject, or generic/unknown subject remains Tier C.

Recovered rows receive the `subject_semantics` projection guard.

### Structurally Separated Subject Roles

`potential_subject_kind_classification_confusion` becomes guarded Tier B only when:

- every `subjects` entry is a `scene_subject` with an observation ID;
- subject, depicted-subject, and character-representation observation IDs do not overlap; and
- the graph contains at least one scene subject.

This prevents body-region labels and multiple physically present background subjects from being excluded solely by a phrase heuristic. Cross-role observation reuse or an invalid subject kind remains Tier C.

Recovered rows receive the `subject_semantics` projection guard.

## Prompt-Branch Profile Conflicts

The first audit found incorrect or incomplete card-type traits that could produce a structurally valid graph under the wrong extraction branch. V1.1 fails closed when graph evidence contradicts the active branch.

Critical V1.1 conflicts include:

- `trainer` branch with no human-appearance facts, human typed facts, or visibly human subject identity;
- `stadium` branch with human-appearance evidence; and
- `stadium` branch applied to a card whose canonical name explicitly contains the word `Trainer`.

These checks do not correct canonical metadata. They exclude the affected graph and preserve the contradiction for the canonical trait repair queue.

## Human Evidence Detection

Human evidence may come from:

- `modules.human_appearance` fact IDs;
- visible body regions;
- facial evidence;
- hair, gesture, or accessory entries;
- typed facts in the `human_appearance` module; or
- an explicitly human generic identity such as woman, man, girl, boy, person, child, adult, or trainer.

Person names alone are not inferred to be human unless the graph includes human-appearance evidence.

## Decision Evidence

Every V1.1 decision retains all V1 fields and adds:

- `reviewed_flag_reclassifications`
  - original flag
  - disposition
  - deterministic reason
  - projection guard

Branch-profile conflicts are recorded in `critical_reasons`.

## Invariants

- Original Fact Graph V2 payloads remain byte-for-byte unchanged.
- Original source quality flags remain visible in decisions.
- A recovered critical flag cannot become Tier A; it becomes guarded Tier B.
- Unknown flags and unknown rules fail closed to Tier C.
- Tier C rows cannot enter search projections.
- Tier B guards must be implemented by the future projection builder.
- Energy rows remain excluded.
- No eligibility decision implies visual approval or canonical truth.

## Acceptance Criteria

- All `11,000` source IDs receive exactly one deterministic V1.1 decision.
- Owner/variant base-identity matches in the failed audit no longer receive Tier C solely for name normalization.
- Structurally separated multi-subject/body-part cases no longer receive Tier C solely for the subject-kind heuristic.
- Proven image or identity mismatches remain Tier C.
- Trainer/Stadium profile contradictions found by the audit become Tier C.
- Tier A contains no flags, policy results, limitations, or branch-profile conflicts.
- No duplicate IDs, unknown flags, unknown rules, Energy eligibility, or reconciliation mismatches exist.
- The same seeded stratified audit is regenerated from the V1.1 decisions before eligibility lock.

## Boundaries

- Provider calls: forbidden.
- Database connection or writes: forbidden.
- Approval changes: forbidden.
- Embeddings: forbidden.
- Artwork grouping: forbidden until this audit passes.
- Search projections and index writes: forbidden.
- Public reads: forbidden.

## Next Gate

Replay all `11,000` inventory rows under V1.1 and regenerate the deterministic stratified audit. Eligibility can lock only after the repaired audit has no material false inclusion or false exclusion. Then define fail-closed artwork grouping.

## Related Contracts

- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1.md`
- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`

# CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4

Status: Active - LOCKED at the tier and projection-guard boundary

Date: 2026-07-21

## Purpose

This contract supersedes `CARD_VISUAL_SEARCH_ELIGIBILITY_V1_3` after direct evidence review found valid Japanese Pokémon rows whose extracted subject identity used romanized Japanese rather than the Japanese or English canonical alias.

V1.4 preserves canonical-subject agreement while adding deterministic kana romanization and tightly bounded spelling tolerance. It does not weaken mismatch handling globally.

## Romanized Alias Evidence

For every Japanese Pokémon identity in the repository map, the policy derives a deterministic romanized alias from kana. The Japanese, English, and romanized aliases remain one identity group.

Examples:

- `ガブリアス` / `Garchomp` / `gaburiasu`
- `クルマユ` / `Swadloon` / `kurumayu`

An extracted Latin subject token may match a romanized alias when:

- the alias is at least five characters;
- both values contain only Latin letters/numbers after normalization; and
- edit distance is at most `max(1, floor(longer_length * 0.12))`.

This admits narrow model spellings such as `Gaburias` and `kuramayu` while rejecting unrelated identities such as `Lucario` for `チョロネコ` / `Purrloin`.

## Preserved Boundaries

- A name or branch label alone cannot create a visual fact.
- Pokémon branch still requires a known canonical Pokémon alias and typed scene subject.
- The typed scene subject must match a canonical Japanese, English, or tightly matched romanized alias.
- Energy remains excluded independently of branch.
- Trainer/Stadium profile contradictions remain Tier C.
- Reviewed owner/variant and role-separation recoveries remain guarded Tier B.
- Unknown flags/rules and unresolved identity conflicts remain Tier C.
- Source graphs and source flags remain immutable.

## Acceptance Criteria

- All `11,000` source IDs reconcile exactly once.
- `Gaburias` for `シロナのガブリアスex` and `kuramayu` for `クルマユ` no longer fail solely for alias spelling.
- `Lucario` for `チョロネコ` remains Tier C.
- Zero detected Energy cards are eligible.
- Zero branch-profile contradictions are Tier A or Tier B without an explicit reviewed recovery.
- No duplicate decisions, unknown flags, unknown rules, or reconciliation findings exist.
- The expanded audit covers every Tier B guard, every valid-row Tier C reason, every source-gap class, and every included branch.

## Boundaries

- No provider calls.
- No database connections or writes.
- No approvals.
- No embeddings.
- No artwork grouping.
- No projections or index writes.
- No public reads.

## Next Gate

Replay the exact source inventory and regenerate the expanded stratified audit. Lock eligibility at the tier/guard boundary only if the audit shows no material false inclusion or exclusion. Then proceed to fail-closed artwork grouping.

## Related Contracts

- `docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_3.md`
- `docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md`
- `docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md`
- `docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md`

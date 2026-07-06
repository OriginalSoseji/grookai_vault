# MEE-09K PokemonTCG.io Second Source Backfill Plan

- Package: `MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-PLAN-V1`
- Ready: `true`
- Manifest hash: `e8a91143648af9076118642afb82da02be8e2086fc7f91995f7cc497afd713fc`
- Normalized artifact hash: `387d7dd270c26f1a0b5a4ad41506abe0b6d54a08f890c2f755b94d2c23d92eda`
- Package fingerprint: `ed2c4e8d233c5a7a770b7b01bbcc4cc76f584dca75470bb5c613ad05a7d1cb58`
- Target count: `570`
- Candidate rows: `10720`
- Normalized rows: `10720`

## Boundary

- Apply plan only.
- No provider calls.
- No source fetches.
- No DB writes.
- No pricing observations writes.
- No public/app-visible pricing.
- No price rollups.

## Remote Collision Check

- Checked: `true`
- Candidate hashes checked: `10720`
- Candidate hash collisions: `0`

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-REFERENCE-POKEMONTCG-SECOND-SOURCE-BACKFILL-APPLY-V1 apply only. Package fingerprint: ed2c4e8d233c5a7a770b7b01bbcc4cc76f584dca75470bb5c613ad05a7d1cb58. Manifest hash: e8a91143648af9076118642afb82da02be8e2086fc7f91995f7cc497afd713fc. Normalized artifact hash: 387d7dd270c26f1a0b5a4ad41506abe0b6d54a08f890c2f755b94d2c23d92eda. Scope: insert 10,720 market_reference_candidates rows and 10,720 market_reference_normalized_evidence rows for PokemonTCG.io second-source evidence only. Use candidate_hash to link normalized rows to inserted candidates. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No migrations. No global apply.
```

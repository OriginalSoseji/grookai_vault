# MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-CANDIDATE-V1

## Status

- Package fingerprint: `1D0EA8EF1C041F3474E88470D570241F24D012ABB181A2C94DE0D3141B85C920`
- Migration hash: `6D3A3020D74E6B114792A917D2A57FBCCA64DFCB2A2F25364148491ED6317DE7`
- Rollback dry-run hash: `1A56D2C5BEAC42E02B5858640BE2AD579CFE6470EFE3F39D0B932F10E68EA96C`
- Readback hash: `FA4B3B3C2BE417A400F037190513B0A3E9622813F7DDE3DA017C7316B32E1FFA`
- Proposed object: `public.v_market_evidence_candidate_quality_scores_v1`

## Purpose

Install the quality scoring read model as an internal service-role-only view. This is the read layer that separates:

- low match confidence
- raw/slab lane mismatch
- hard exclusion flags
- manual-policy flags
- quality rollup eligibility

## Boundary

This package does not publish prices, write evidence, invoke actions, or run acquisition.

## Approval Prompt

```text
Approve real MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: 6D3A3020D74E6B114792A917D2A57FBCCA64DFCB2A2F25364148491ED6317DE7. Scope: execute supabase/migrations/20260625110000_market_evidence_quality_scoring_read_model_v1.sql against linked Supabase project ycdxbpibncqcchqiihfz only, creating internal-only service-role view public.v_market_evidence_candidate_quality_scores_v1. Then mark only migration version 20260625110000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No function invocation. No action event inserts. No disposition updates. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No db push. No global apply.
```

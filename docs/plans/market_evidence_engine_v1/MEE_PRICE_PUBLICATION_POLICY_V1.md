# MEE Price Publication Policy V1 Plan

Mode: plan-only

Generated: 2026-06-29T03:48:24.494Z

## What This Adds

- A local internal SQL view candidate: `docs/sql/mee_price_publication_policy_v1_view_candidate.sql`
- A read-only readback query: `docs/sql/mee_price_publication_policy_v1_readback.sql`
- A deterministic policy contract: `docs/contracts/MEE_PRICE_PUBLICATION_POLICY_V1.md`
- A checkpoint preserving why pricing remains non-public: `docs/checkpoints/market_evidence_engine/MEE_PRICE_PUBLICATION_POLICY_V1.md`

## Current Result

The policy finds 11 narrow raw-single future-publication-review candidates from 16833 internal candidate rows.

These are not public prices. They are only the first rows that clear the initial narrow policy and can be reviewed by a future publication gate.

## Next Implementation Step

If this policy shape is accepted, the next safe implementation step is a targeted internal schema apply for `v_market_evidence_price_publication_policy_v1`, still service-role-only and still not app-visible.

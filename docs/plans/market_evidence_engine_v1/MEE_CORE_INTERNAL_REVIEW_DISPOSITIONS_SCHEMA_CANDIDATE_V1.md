# MEE Core Internal Review Dispositions Schema Candidate V1

Status: plan only

## Goal

Prepare a local Supabase migration candidate for internal Market Evidence Engine review disposition tracking.

## Proposed Table

`public.market_evidence_review_dispositions`

The table records internal review outcomes against:

- `card_print_id`
- `gv_id`
- `review_lane`
- `evidence_lane`
- `review_status`
- `review_disposition`
- audit payloads for evidence summary, source mix, blockers, and reviewer context

## Safety Model

- RLS enabled.
- Service-role-only policy.
- Public roles revoked.
- No direct public-price capability.
- `publication_gate_candidate`, `can_publish_price_directly`, `publishable`, `app_visible`, and `market_truth` are constrained to `false`.

## Verification

Run:

```bash
node --test tests/contracts/mee_core_internal_review_dispositions_schema_candidate_v1.test.mjs
```

## Next Step After This Plan

If approved separately, execute a targeted remote schema apply for only:

`supabase/migrations/20260625080000_market_evidence_review_dispositions_v1.sql`

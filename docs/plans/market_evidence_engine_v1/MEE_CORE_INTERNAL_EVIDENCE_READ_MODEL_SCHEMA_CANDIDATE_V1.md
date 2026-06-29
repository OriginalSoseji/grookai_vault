# MEE Core Internal Evidence Read Model Schema Candidate V1

Status: plan only

## Goal

Prepare a local Supabase migration candidate for internal-only Market Evidence Engine read models.

## Proposed Views

- `v_market_evidence_card_signal_summary_v1`
  - one row per card print with evidence count, source mix, lifecycle flags, review burden, and internal rollup candidacy
- `v_market_evidence_card_review_queue_v1`
  - operator review lane assignment derived from the signal summary

## Safety Model

- `security_invoker = true`
- explicit revoke from `public`, `anon`, and `authenticated`
- grant select only to `service_role`
- no public pricing view changes
- no public price publication
- no app-visible pricing

## Verification

Run:

```bash
node --test tests/contracts/mee_core_internal_evidence_read_model_schema_candidate_v1.test.mjs
```

## Next Step After This Plan

If approved separately, execute a targeted remote schema apply for only:

`supabase/migrations/20260625070000_market_evidence_internal_read_model_v1.sql`

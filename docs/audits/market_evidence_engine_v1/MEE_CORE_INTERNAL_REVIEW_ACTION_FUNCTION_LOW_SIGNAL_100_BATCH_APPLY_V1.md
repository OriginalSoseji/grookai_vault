# MEE Core Internal Review Action Function Low Signal 100 Batch Apply V1

Status: applied

## Scope

Executed `docs/sql/mee_core_internal_review_action_function_low_signal_100_batch_v1_apply_candidate.sql` against linked Supabase project `ycdxbpibncqcchqiihfz`.

Approved package:

- Package fingerprint: `fa48e0f26db2d375b7d26cd557ed225fcf1bfc6d6702bed7a34dc4dd1e235b2a`
- Row manifest hash: `bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d`
- Apply SQL hash: `5b53a42219577bcfc365902a4657aa269e0b999f10494300af8fcdb0a799bd07`

## Preflight

- Apply SQL hash matched approval.
- Preflight eligible target rows: `100`

## Apply Result

The apply invoked `public.apply_market_evidence_review_action_v1` for the 100 approved `low_signal_monitor` dispositions with action `confirm_monitor_only`.

The Supabase CLI surfaced only the final function-call row from the multi-statement apply output, so the package readback was used for complete proof.

## Package Readback

- Matching package action event rows: `100`
- Distinct event disposition rows: `100`
- Updated target disposition rows: `100`
- Event public flag rows: `0`
- Target public flag rows: `0`
- Pricing observation rows: `0`
- Public pricing view references: `0`

## Boundary

No provider calls, source fetches, pricing observation writes, `ebay_active_prices_latest` writes, public pricing view writes, app-visible pricing, public rollups, identity writes, vault writes, image/storage writes, migrations, merges, or global apply were performed.

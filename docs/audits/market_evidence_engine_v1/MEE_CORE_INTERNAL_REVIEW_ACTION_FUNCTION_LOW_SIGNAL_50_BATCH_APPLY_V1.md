# MEE Core Internal Review Action Function Low Signal 50 Batch Apply V1

Status: applied

## Scope

Executed `docs/sql/mee_core_internal_review_action_function_low_signal_50_batch_v1_apply_candidate.sql` against linked Supabase project `ycdxbpibncqcchqiihfz`.

Approved package:

- Package fingerprint: `efa823f4b29c0de2852b82b397b3b450fe034704acfb177e2d51c4922020f1ad`
- Row manifest hash: `7d0db97a1aadebc1929c0b81b43610d61f53305edaa52e81c0375d143f85f21e`
- Apply SQL hash: `d2e55ee90118c5569277a425986dfd1e5fb8d9b3c1a36387ad6e72a3b2a760d5`

## Preflight

- Apply SQL hash matched approval.
- Preflight eligible target rows: `50`

## Apply Result

The apply invoked `public.apply_market_evidence_review_action_v1` for the 50 approved `low_signal_monitor` dispositions with action `confirm_monitor_only`.

The Supabase CLI surfaced only the final function-call row from the multi-statement apply output, so the package readback was used for complete proof.

## Package Readback

- Matching package action event rows: `50`
- Distinct event disposition rows: `50`
- Updated target disposition rows: `50`
- Event public flag rows: `0`
- Target public flag rows: `0`
- Pricing observation rows: `0`
- Public pricing view references: `0`

## Boundary

No provider calls, source fetches, pricing observation writes, `ebay_active_prices_latest` writes, public pricing view writes, app-visible pricing, public rollups, identity writes, vault writes, image/storage writes, migrations, merges, or global apply were performed.

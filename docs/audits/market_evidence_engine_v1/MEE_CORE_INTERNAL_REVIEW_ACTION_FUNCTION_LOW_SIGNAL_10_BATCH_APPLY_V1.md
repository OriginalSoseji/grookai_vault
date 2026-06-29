# MEE Core Internal Review Action Function Low Signal 10 Batch Apply V1

Status: applied

## Scope

Executed `docs/sql/mee_core_internal_review_action_function_low_signal_10_batch_v1_apply_candidate.sql` against linked Supabase project `ycdxbpibncqcchqiihfz`.

Approved package:

- Package fingerprint: `943a5382c847ae807de876c72ca6871a6dfac4792961a72659b9270217e836cb`
- Row manifest hash: `14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2`
- Apply SQL hash: `1eefbfe74b8f9bfb50cb000ac0e042e6b139a140d4ecad217bbb53e3ac5dd610`

## Preflight

- Apply SQL hash matched approval.
- Preflight eligible target rows: `10`

## Apply Result

The apply invoked `public.apply_market_evidence_review_action_v1` for the 10 approved `low_signal_monitor` dispositions with action `confirm_monitor_only`.

The Supabase CLI surfaced only the final function-call row from the multi-statement apply output, so a consolidated readback was used for complete proof.

## Consolidated Readback

- Matching package action event rows: `10`
- Distinct event disposition rows: `10`
- Updated target disposition rows: `10`
- Target public flag rows: `0`
- Pricing observation rows: `0`
- Public pricing view JustTCG references: `0`

Action event ids:

- `211568cc-6944-4527-b36c-5f83eb975f1d`
- `43acbe62-0f55-4f05-aafb-46e5b837437d`
- `8072aa0b-1ef3-47de-be03-02ff66405330`
- `87158b71-75a1-4609-b266-0b64518361d6`
- `8bddc4d0-2379-45cc-8d88-c4ee4d54c60c`
- `a60a0192-5d03-41a3-bdfb-2fc7636412e7`
- `a851c3d2-f957-45b9-bbb0-13201f990bb8`
- `a8fc7410-e5ce-48ca-a6f2-7b377e7643ef`
- `c58b3eea-01cd-494d-9a9c-93a7b509b9be`
- `fd96f79d-22f3-4891-b05e-9400aa23d586`

## Boundary

No provider calls, source fetches, pricing observation writes, `ebay_active_prices_latest` writes, public pricing view writes, app-visible pricing, public rollups, identity writes, vault writes, image/storage writes, migrations, merges, or global apply were performed.

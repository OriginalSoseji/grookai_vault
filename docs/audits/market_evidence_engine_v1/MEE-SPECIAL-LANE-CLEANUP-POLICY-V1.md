# MEE-SPECIAL-LANE-CLEANUP-POLICY-V1

Mode: plan only

Generated: 2026-06-27

## Scope

Audited the `39,180` seeded cleanup rows with `cleanup_state = needs_special_lane_policy` and created a deterministic special-lane handling policy.

No DB writes. No cleanup event inserts. No provider calls. No source fetches. No function invocation. No public pricing.

## Readback

```json
{
  "total_rows": 39180,
  "distinct_candidate_ids": 39180,
  "distinct_card_prints": 338,
  "public_boundary_leak_rows": 0
}
```

## Rows By Family

```json
{
  "base_print_run": 252,
  "mcdonalds": 3658,
  "mep_black_star_promos": 6658,
  "promo_or_alt_distribution": 3599,
  "trainer_kit": 14306,
  "world_championship_deck": 10707
}
```

## Card Prints By Family

```json
{
  "base_print_run": 5,
  "mcdonalds": 55,
  "mep_black_star_promos": 29,
  "promo_or_alt_distribution": 68,
  "trainer_kit": 80,
  "world_championship_deck": 101
}
```

## Handling Policy

- `world_championship_deck`: exact card evidence required
- `mcdonalds`: exact card evidence required
- `mep_black_star_promos`: exact card or program evidence required
- `trainer_kit`: separate source matching required
- `base_print_run`: print-run exactness required
- `promo_or_alt_distribution`: distribution-lane review required

## Decision

No apply candidate is generated.

Special-lane cleanup rows stay held until a family-specific policy package or manual review package records a non-public cleanup decision. This policy blocks accidental promotion of ordinary-card listings into special-lane price evidence.

## Artifacts

- Contract: `docs/contracts/MEE_SPECIAL_LANE_CLEANUP_POLICY_V1.md`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE-SPECIAL-LANE-CLEANUP-POLICY-V1/special_lane_manifest.json`
- Summary: `docs/audits/market_evidence_engine_v1/MEE-SPECIAL-LANE-CLEANUP-POLICY-V1/special_lane_summary.json`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-SPECIAL-LANE-CLEANUP-POLICY-V1/report.json`
- Readback SQL: `docs/sql/mee_special_lane_cleanup_policy_v1_readback.sql`
- Contract test: `tests/contracts/mee_special_lane_cleanup_policy_v1.test.mjs`

## Next Step

Start with the largest concrete family: Trainer Kit special-lane matching policy, or World Championship Deck exact-evidence policy. Both should remain non-public.


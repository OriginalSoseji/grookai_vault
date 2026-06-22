# Event/Staff Exact Source Evidence Checkpoint V1

Date: 2026-06-22

## Purpose

Preserve the audit-only source acquisition pass for the remaining `event_staff_exact_source` stamped/special queue rows.

This checkpoint exists because event and staff variants are especially easy to contaminate:

- placement labels can differ by source
- Staff and non-Staff event cards can share card name and number
- marketplace pages may prove identity but not active finish
- live listings can disappear or change wording

## Safety

- DB writes performed: false
- Migrations created: false
- Apply performed: false
- Cleanup performed: false
- Quarantine performed: false
- Write-ready packages created: false

## Artifacts

- Source report: `docs/audits/english_master_index_source_exhaustion_v1/event_staff_exact_source_evidence_v1/event_staff_exact_source_evidence_v1.json`
- Human report: `docs/audits/english_master_index_source_exhaustion_v1/event_staff_exact_source_evidence_v1/event_staff_exact_source_evidence_v1.md`
- Generated fixture directory: `docs/audits/verified_master_set_index_v1/source_fixtures/generated_event_staff_exact_source_evidence_v1/`
- Source delta report: `docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/event_staff_exact_source_evidence_v1_source_delta_audit_v1.json`

## Results

- Target queue rows: 19
- Script targets matched to queue: 19
- Source-ready-looking candidates found: 10
- Identity-supported but active-finish-unproven rows: 7
- Source-exhausted rows: 2
- Fixture records written: 11
- Write-ready created: 0
- Fingerprint: `c0ef790ca638e9623fc46c7efc3174e33cf54451e118cf4e60437c3a3bc7d1e7`

## Source Delta Outcome

The source-delta guard found:

- Candidate records loaded: 11
- Useful candidate matches: 0
- Already in current Master Index: 7
- Unmatched candidate records: 4
- Recommended next step: no global rebuild

This means the pass improved preservation and documentation, but it did not create a safe promotion lane.

## Rows Already Master-Verified

The delta guard classified these candidate records as already present in the current Master Index:

- `dp6` Buck's Training #130 normal
- `sm8` Professor Elm's Lecture #188 reverse
- `swsh2` Boss's Orders #154 reverse
- `xy8` Giovanni's Scheme #138 reverse
- `xy9` Misty's Determination #104 reverse
- `xyp` Champions Festival #XY27 holo

## Rows Still Not Safe

The following remain blocked or not useful for promotion from this pass:

- `dpp` Tropical Wind #DP25 Finalist: identity support exists, but exact active finish is not cleanly isolated.
- `sm3` Guzma #115: source evidence points to a Regional Championships Staff row, while the queue row says World Championships.
- `smp` Champions Festival #SM231: identity support exists, but active finish is not proven by this pass.
- `sv10` current Staff rows: mostly identity-supported only; live listing evidence is not stable enough for active finish truth.
- `svp` Pikachu #225: World Championships identity support exists, but active finish remains unproven.
- `swshp` Champions Festival #SWSH296: no exact usable source found in this pass.

## Guardrail Preserved

No source in this pass promoted a generic event/staff identity into canonical DB truth. Exact finish evidence must still match a current gap, pass source-delta, and go through rollback-only dry-run before any future write.

## Verification

- `node --check scripts/audits/english_master_index_event_staff_exact_source_evidence_v1.mjs`: passed
- `node scripts/audits/english_master_index_event_staff_exact_source_evidence_v1.mjs`: passed
- `node scripts/audits/english_master_index_source_delta_audit_v1.mjs --source-key event_staff_exact_source_evidence_v1 --source-kind marketplace_checklist --fixture-dir docs/audits/verified_master_set_index_v1/source_fixtures/generated_event_staff_exact_source_evidence_v1`: passed

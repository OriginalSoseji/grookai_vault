# Chapter 5 — Completion Gates (link: [Index](SCANNER_BLUEPRINT_BOOK_INDEX_V1.md))

## Condition Assist DONE Criteria
- Snapshot create path proven (upload-plan → PUT → RPC insert) with auth.
- Analysis trigger proven idempotent; latest analysis readable by owner.
- UI shows snapshot id, results, and history; unknown states surfaced.

## Identify-only DONE Criteria
- Identify request works with zero persistence by default.
- Results UI shows candidates/“no match”/“not sure”; promote gated and tested.
- No unintended DB/storage writes in identify-only mode.

## Measurement Expansion Gates
- New measurements require contract + proof harness + determinism runbook.
- No grades/bands introduced; measurements-only unless explicit new contract.

## Instant Experience Gate
- Capture → review → feedback loop < target latency; errors surfaced clearly.
- No hidden retries; retries must be user-visible.

## Drift Prevention Gates
- Env targets documented; JWT/headers verified via debug harness.
- Function configs checked (verify_jwt, env vars).
- Schema/contract drift checks before release.

## Checkpoint Format
- `YYYY-MM-DD | scope | artifact | proof harness | owner | status`
- Stored in audits/playbooks; required before promoting changes.

## Monetization Allowed Gate
- No monetization until completion gates met and legal review of disclaimers.

## Blueprint Lock Procedure
- Blueprint is LOCKED. Changes require `SCANNER_BLUEPRINT_BOOK_AMENDMENT_V2.md` and review.
# Chapter 5 — Completion Gates & Release Criteria (V1)

**Status:** LOCKED (inherits Blueprint V1 lock)  
**Backlink:** [Book Index](./SCANNER_BLUEPRINT_BOOK_INDEX_V1.md)

---

## 5.1 Condition Scanner DONE
- Upload-plan → PUT → `condition_snapshots_insert_v1` proven with auth.
- Analysis trigger runs automatically; `v_condition_snapshot_latest_analysis` returns latest row.
- UI shows snapshot_id, analysis payload, history timeline; unknown states surfaced (no “clean by omission”).

## 5.2 Identify Scanner DONE
- Identify request runs with zero persistence by default (no storage/DB writes).
- Results UI handles match, no-match, not-sure; clearly marked “Not saved”.
- Promote-to-write is explicit, gated, and tested; no silent promotion.

## 5.3 Measurement Expansion Gate
- New measurement requires: contract, proof harness, determinism validation, rollback note.
- No grades/bands; measurements-only unless a new contract adds them.

## 5.4 Instant Experience Gate
- Capture → review → feedback loop meets target latency; errors are explicit.
- No hidden retries; retries must be user-visible.

## 5.5 Drift & Auth Gate
- Env target documented; headers verified via debug harness; `verify_jwt` and env vars confirmed.
- Schema/contract drift checks performed before release.

## 5.6 Monetization Gate
- No monetization or pricing claims until all gates pass and legal disclaimers are approved.

## 5.7 Blueprint Lock Rule
- Blueprint is LOCKED. Any change requires `SCANNER_BLUEPRINT_BOOK_AMENDMENT_V2.md` and review.

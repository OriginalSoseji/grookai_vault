# SVP Append-Only Feed Exception Checkpoint V1

Date: 2026-06-16

## Purpose

Document why the final two post-reconciliation duplicate parent groups were intentionally left in the database instead of being deleted or merged.

This is not unresolved generic cleanup debt. It is a governed exception caused by append-only feed-history constraints.

## Remaining Rows

| Card | Canonical parent | Duplicate parent | Feed rows |
| --- | --- | --- | ---: |
| SVP Bulbasaur #046 | `GV-PK-PR-SV-046` | `GV-PK-PR-SV-46` | 1 |
| SVP Greninja ex #054 | `GV-PK-PR-SV-054` | `GV-PK-PR-SV-54` | 2 |

## Decision

Leave the two duplicate parent rows in place as governed exceptions until Grookai has an explicit feed-correction model or founder-approved feed-remap maintenance path.

Reason:

`card_feed_events` is append-only. The table has `BEFORE UPDATE` and `BEFORE DELETE` triggers that raise `card_feed_events is append-only`.

Deleting the duplicate parent rows would conflict with feed-history preservation because `card_feed_events.card_print_id` references `card_prints(id)` with `ON DELETE CASCADE`.

## Current Audit State

- raw duplicate parent groups: 2
- actionable duplicate parent groups: 0
- governed duplicate parent exceptions: 2
- raw duplicate active identity groups: 2
- actionable duplicate active identity groups: 0
- governed active identity exceptions: 2
- display image risk rows: 0

## References

- Explanation: `docs/audits/post_reconcile_integrity_v1/WHY_SVP_DUPLICATES_REMAIN_APPEND_ONLY_FEED_EXCEPTION_V1.md`
- Governance report: `docs/audits/post_reconcile_integrity_v1/post_reconcile_append_only_feed_governance_v1.md`
- Integrity audit: `docs/audits/post_reconcile_integrity_v1/post_reconcile_integrity_audit_v1.md`

## Future Safe Paths

1. Keep as governed exceptions.
2. Add a feed-correction event model that preserves old events and records canonical remap intent.
3. Add a narrow founder-approved maintenance path for feed remapping, with fresh dry-run proof before any apply.

Do not process these rows through generic duplicate-parent cleanup.

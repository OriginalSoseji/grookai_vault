# GV-ID Namespace / Source Policy - 2026-05-17

Status: no-write policy decision for the 208 Lane A rows that had collision-free generated `gv_id` candidates but no approved namespace/source policy. This document does not authorize Supabase writes, migrations, generated ID backfills, public route exposure, public view loosening, card movement, set changes, missing-card backfill, image work, or variant work.

## Public Gate

The public web gate remains strict: no stable approved `gv_id`, no public `/card/[gv_id]` route. Builder output is evidence, not approval.

## Policy Summary

| Metric | Count |
| --- | --- |
| Policy-review rows | 208 |
| Approved for future write plan | 0 |
| Not approved | 208 |
| Recommended immediate writes | 0 |

## Set Decisions

| Set | Rows | Namespace | Decision | Class | Approved | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A3a | 103 | A3A | NOT_APPROVED_FOR_PUBLIC_GV_ID_BACKFILL | SOURCE_DOMAIN_POLICY_BLOCKED | false | Generated GV-PK-A3A-* IDs are not acceptable under current public physical identity rules. |
| fut2020 | 5 | FUT2020 | NOT_APPROVED_YET_NAMESPACE_CONTRACT_REQUIRED | PHYSICAL_SPECIAL_COLLECTION_REVIEW | false | Pokemon Futsal 2020 appears eligible in principle, but GV-PK-FUT2020-* is not approved yet. |
| P-A | 100 | P-A | NOT_APPROVED_FOR_PUBLIC_GV_ID_BACKFILL | SOURCE_DOMAIN_POLICY_BLOCKED | false | Generated GV-PK-P-A-* IDs are not acceptable under current public physical identity rules. |

## Decisions

- `A3a` and `P-A`: do not mint public `GV-PK-*` identities under the current physical public identity rules. Treat as source-domain policy blocked until the source family is explicitly classified and a separate inclusion contract exists.
- `fut2020`: physical/special collection appears eligible in principle, but the namespace and printed-number token are not approved. Do not write `GV-PK-FUT2020-*` until a namespace contract decides `FUT2020` and `1-5` versus `001-005`.
- The generated IDs stay useful as evidence only. They must not be written without a future regenerated matrix and explicit approval.

## Required Next Gates

- Keep `A3a` and `P-A` out of public card routes unless a future source-domain contract explicitly includes them.
- For `fut2020`, create a namespace-token and printed-number-token contract before drafting any write plan.
- Regenerate live evidence before any future write-plan candidate.
- Future writes, if separately approved, must update only `card_prints.gv_id` and must not loosen public web gates.

## Confirmation

- Supabase writes: none.
- Migrations: none.
- Data changes: none.
- Public web gates loosened: no.

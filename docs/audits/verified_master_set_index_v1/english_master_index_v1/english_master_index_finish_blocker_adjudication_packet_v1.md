# English Master Index Finish Blocker Adjudication Packet V1

Audit only. This packet does not authorize DB writes, migrations, cleanup, quarantine, or public hiding.

Generated: 2026-06-08T19:27:31.645Z

## Safety

| field | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| mutation_authority | false |
| write_ready_now | 0 |

## Summary

| metric | value |
| --- | --- |
| total_blockers | 5 |
| promotion_safe_now | 0 |
| write_ready_now | 0 |
| by_proposed_adjudication | {"requested_finish_not_supported_as_plain_holo":1,"requested_finish_not_supported_as_normal":3,"card_number_alias_or_child_print_required":1} |
| by_blocker_type | {"finish_label_conflict":4,"card_number_conflict":1} |

## Proposed Adjudications

| set | number | name | finish | blocker | proposed_adjudication | confidence | future_write_shape_if_approved |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bw8 | 94 | Druddigon | holo | finish_label_conflict | requested_finish_not_supported_as_plain_holo | high | Treat the plain holo claim as unsupported. Preserve or model cracked_ice_holo only through a distinct source-backed finish, never by collapsing it into holo. |
| ex9 | 107 | Farfetch'd | normal | finish_label_conflict | requested_finish_not_supported_as_normal | medium_high | Treat the normal claim as unsupported unless an exact normal source appears. Do not replace it by inference; the supported context points to secret rare/holo context. |
| sm8 | 187 | Net Ball | stamped | card_number_conflict | card_number_alias_or_child_print_required | high | Do not promote stamped #187. Evidence points to #187a/214, so this needs a numbering/alias or child-print plan before any canonical mutation. |
| sv03.5 | 146 | Moltres | normal | finish_label_conflict | requested_finish_not_supported_as_normal | high | Treat the normal claim as unsupported unless exact normal evidence appears. Current exact source context supports holo and reverse holo, not normal. |
| swsh3.5 | 62 | Professor's Research (Professor Magnolia) | normal | finish_label_conflict | requested_finish_not_supported_as_normal | high | Treat the normal claim as unsupported unless exact normal evidence appears. Current exact source context supports holo and reverse holo, not normal. |

## Required Before Any Future Write

| set | number | name | finish | required_before_write |
| --- | --- | --- | --- | --- |
| bw8 | 94 | Druddigon | holo | Confirm Grookai row IDs affected by the plain holo claim.; Confirm cracked_ice_holo is represented separately before any cleanup proposal.; Generate dry-run removal/isolation package with rollback artifact. |
| ex9 | 107 | Farfetch'd | normal | Confirm exact Grookai row IDs affected by the normal finish claim.; Confirm whether supported secret rare/holo finish already exists as a distinct printing.; Generate dry-run removal/isolation package with rollback artifact. |
| sm8 | 187 | Net Ball | stamped | Confirm whether Grookai has or needs a separate #187a identity.; Confirm stamped evidence belongs to #187a only.; Generate dry-run alias/child-print package with rollback artifact and post-apply verification. |
| sv03.5 | 146 | Moltres | normal | Confirm exact Grookai row IDs affected by the normal finish claim.; Confirm holo and reverse holo are represented separately.; Generate dry-run removal/isolation package with rollback artifact. |
| swsh3.5 | 62 | Professor's Research (Professor Magnolia) | normal | Confirm exact Grookai row IDs affected by the normal finish claim.; Confirm holo and reverse holo are represented separately.; Generate dry-run removal/isolation package with rollback artifact. |

## Stop Rules

- Stop if the proposed adjudication is not explicitly approved.
- Stop if exact Grookai row IDs are missing.
- Stop if rollback artifacts are missing.
- Stop if post-apply verification queries are missing.
- Stop if evidence supports a different finish or card number than the row under review.

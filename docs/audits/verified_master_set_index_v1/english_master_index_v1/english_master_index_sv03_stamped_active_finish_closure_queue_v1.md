# English Master Index SV03 Stamped Active Finish Closure Queue V1

Generated: 2026-06-12T16:19:59.580Z

Audit-only queue. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Safety

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| durable_db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| write_ready_now | 0 |

## Summary

| metric | value |
| --- | --- |
| target_rows | 18 |
| write_ready_now | 0 |
| promotion_safe_now | 0 |
| rows_with_active_finish_observation | 2 |
| rows_requiring_active_finish_acquisition | 16 |
| fingerprint_sha256 | `a3f54c072541aed4dfcd7ecd93db916f81de8548ec84b3864014beb9ad8cd242` |

## Closure Lanes

| lane | rows | type | safety | rule |
| --- | --- | --- | --- | --- |
| SV03-STAMPED-ACTIVE-FINISH-OBSERVED-IDENTITY-REVIEW | 2 | manual_identity_source_review | audit_only | Active finish observation is not enough. The stamped identity still needs exact independent evidence before any DB package. |
| SV03-STAMPED-ACTIVE-FINISH-SOURCE-ACQUISITION | 16 | source_acquisition | audit_only | Search only exact sources proving set, number, card name, stamp identity, and active finish. Ambiguous title evidence remains blocked. |

## Rows

| number | card | closure_lane | proposed_active_finish | current_sources | next_action |
| --- | --- | --- | --- | --- | --- |
| 22 | Toedscruel ex | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 40 | Larvesta | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 41 | Volcarona | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 42 | Eiscue ex | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 66 | Tyranitar ex | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 92 | Lunatone | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 95 | Claydol | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 125 | Charizard ex | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 131 | Houndour | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 133 | Houndoom | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 136 | Darkrai | active_finish_observed_identity_still_required | cosmos | thepricedex_price_list | Find exact independent stamped identity evidence for this card, then prepare guarded dry-run only if active finish and stamped identity both remain non-conflicting. |
| 139 | Salandit | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 140 | Salazzle | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 141 | Scizor | active_finish_observed_identity_still_required | cosmos | thepricedex_price_list | Find exact independent stamped identity evidence for this card, then prepare guarded dry-run only if active finish and stamped identity both remain non-conflicting. |
| 164 | Pidgeot ex | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 188 | Geeta | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 189 | Letter of Encouragement | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |
| 196 | Town Store | active_finish_source_acquisition_required |  | thepricedex_price_list | Acquire exact source evidence proving the active finish carried by the stamped variant; do not infer from Prize Pack or product-family rules. |

## Non-Negotiable Rule

No row in this queue may become child `finish_key=stamped`. The only safe shape is stamped parent identity plus an active child finish proven by exact evidence.

# Ascended Heroes Verified Index V1

Generated: 2026-05-24T05:23:31.140Z

Audit only. No DB writes, quarantine, deletes, or public hiding.

Ascended Heroes is a stress pilot. API agreement is not master truth, and exact finishes fail closed without human-readable finish evidence.

## Strict Guardrails

- Stop immediately if source conflicts appear.
- Stop immediately if a not-applicable finish, including Master Ball, is asserted as present.
- Stop immediately if a master-verified finish has fewer than two independent source authorities.
- Stop immediately if a batch does not match its expected finish-count checkpoint.
- Stop immediately if exact unverified printing rows appear during a controlled paired-source batch.

## Source Availability

| source | alias | status |
| --- | --- | --- |
| tcgdex |  | unavailable |
| pokemontcg_api |  | unavailable |
| official_gallery |  | fixture_required |
| human_readable_checklist |  | fixture_available |
| marketplace_checklist |  | fixture_available |
| collector_reference |  | fixture_available |

## Totals

| metric | count |
| --- | --- |
| source evidence rows | 1368 |
| master verified cards | 0 |
| master verified printings | 620 |
| api agreed cards | 0 |
| api agreed printings | 0 |
| candidate cards | 0 |
| candidate printings | 0 |
| conflicts | 0 |
| manual review | 4 |
| finish absent source backed | 2 |

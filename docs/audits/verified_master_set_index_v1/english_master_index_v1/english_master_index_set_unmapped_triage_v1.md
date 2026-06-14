# English Master Index Set Unmapped Triage V1

Generated: 2026-06-12T08:27:20.983Z

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Set-unmapped rows are set identity/audit-scope issues first. Do not judge printing truth until the set category is resolved.

## Summary

| category | count |
| --- | --- |
| legacy_orphan | 16 |
| missing_set_code | 5019 |
| out_of_scope_pocket | 5427 |

## Missing Set Code

Rows whose Grookai parent card has no usable `set_code`. These need source identity recovery before comparison.

| set_code | count |
| --- | --- |
| unknown | 5019 |

## Out Of Scope Pocket

Rows whose set code matches Pokemon TCG Pocket-style source IDs. They are intentionally excluded from the English physical TCG Master Index.

| set_code | count |
| --- | --- |
| B1 | 993 |
| A1 | 858 |
| A4 | 723 |
| A3 | 717 |
| A2 | 621 |
| A2b | 333 |
| A3b | 321 |
| A4a | 315 |
| A2a | 288 |
| A1a | 258 |

## Legacy Orphan

Rows already labeled as legacy orphans. They need a separate legacy identity recovery pass.

| set_code | count |
| --- | --- |
| legacy_orphan | 16 |

## Real Alias Gap

Rows that appear in-scope but do not currently map to a Master Index set alias.

| set_code | count |
| --- | --- |

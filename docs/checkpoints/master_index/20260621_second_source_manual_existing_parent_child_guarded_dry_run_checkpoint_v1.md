# Second Source Manual Existing Parent Child Guarded Dry Run Checkpoint V1

Date: 2026-06-21

## Scope

Rollback-only dry-run for one existing stamped parent that has sufficient second-source evidence and is missing only the governed active child finish.

No durable DB writes, migrations, real apply, parent writes, identity writes, deletes, merges, quarantine, or unsupported cleanup were performed.

## Package

- Package ID: `SECOND-SOURCE-MANUAL-EXISTING-PARENT-CHILD-INSERTS`
- Package fingerprint: `2a13058796cf4bd29795ee3ec9a15731dd8f1b69063148059698c5d1b74040de`
- Dry-run proof: `ea07cbe23ba260d9f176f27fe6bb22d267a9994f4cb93d18bea8a4dc96e796fd`
- Report fingerprint: `f23d54d5f4af8ec658597340d94077d265cd450aadce7003d58e98c4c17e4e26`

## Scope Rows

| set | number | card | stamp | variant_key | finish | parent_id | child_id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `xy1` | `083` | Honedge | Regional Championships Staff Stamp | `regional_championships_staff_stamp` | `holo` | `d9103e6e-08fa-4798-b6bd-1b6ea501f3e0` | `4d8867d0-20b1-4283-a27b-8336bf46a3d2` |

## Evidence

- `https://www.tcgplayer.com/product/267992/pokemon-league-and-championship-cards-honedge-83-146-regional-championships-staff`
- `https://pokumon.com/card/staff-honedge-83-146-regional-championships-special-print/`
- `https://pokescope.app/card/xy1-83/`

Evidence labels:

- TCGplayer product page identifies Honedge 83/146 Regional Championships Staff.
- Pokumon exact card page identifies Staff Honedge 83/146 as Crosshatch Holo Autumn Regional Championships 2014-2015 promo.
- PokeScope exact card page snippet identifies XY Honedge 83 Holo Crosshatch 2014 Autumn Regional Championships STAFF.

## Guard Results

- `target_count`: 1
- `target_parent_count`: 1
- `target_child_count`: 1
- `missing_parent_count`: 0
- `inactive_finish_count`: 0
- `target_child_id_collision_count`: 0
- `existing_parent_finish_collision_count`: 0
- `active_identity_count`: 1
- `inserted_child_rows`: 1 in rollback-only transaction
- `rollback_verified`: true

## Approval Boundary

This package is approval-ready for a future real apply only if explicitly approved.

Exact real-apply scope would be:

- 1 child-only `card_printing` insert
- No parent writes
- No identity writes
- No deletes
- No merges
- No migrations
- No global apply

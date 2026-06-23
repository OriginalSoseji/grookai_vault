# BASE-SET-PRINT-RUN-LANES-IMAGE-GAP-AUDIT-V1

- Generated: 2026-06-23T22:09:39.660Z
- Mode: audit_and_dry_run_no_write
- Fingerprint: `797668d995eeb7cb633e69ed7eaebc627587bfc60a314ce3dddd55472fd57d2f`
- Future apply package: `BASE-SET-PRINT-RUN-LANES-REPRESENTATIVE-PARENT-IMAGE-POINTER-APPLY-V1`
- Lane rows audited: 304
- Lane rows without any image field: 304
- Lane rows with weak image status: 304
- Missing ordinary Base Set matches: 0
- Ordinary Base rows without image fields: 0
- Ordinary Base rows without self-hosted image_path: 0
- Representative candidate rows: 304
- Effective metadata pointer updates in candidate plan: 304
- Ready for apply package: true
- Stop findings: none
- Planned columns: image_source, image_path, image_status, image_note
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false
- Exact image claim changes performed: false
- Runtime public URL field writes planned: false

## Finding

The Base Set print-run lane rows were intentionally created with `image_status = missing` because exact Shadowless, 1st Edition, and 1999-2000 lane images were not cataloged at lane-creation time. This audit only proposes a representative ordinary Base Set artwork pointer for display continuity. It does not claim the representative art is an exact print-run image.

## Current Set Codes

| key | count |
| --- | ---: |
| base1-1999-2000 | 102 |
| base1-first-edition | 101 |
| base1-shadowless | 101 |

## Current Image Statuses

| key | count |
| --- | ---: |
| missing | 304 |

## Proposed Image Statuses

| key | count |
| --- | ---: |
| representative_shared | 304 |

## Proposed Image Sources

| key | count |
| --- | ---: |
| identity | 304 |

## Changed Column Sets

| key | count |
| --- | ---: |
| image_source,image_path,image_status,image_note | 304 |

## Child Rows By Set

_None._

## Apply Boundary

A future apply package, if approved, should update only `card_prints.image_source`, `card_prints.image_path`, `card_prints.image_status`, and `card_prints.image_note` for the candidate rows in `docs\audits\base_set_print_run_lanes_v1\base_set_print_run_lanes_representative_parent_pointer_candidate_plan_v1.jsonl`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, or exact-image claims.

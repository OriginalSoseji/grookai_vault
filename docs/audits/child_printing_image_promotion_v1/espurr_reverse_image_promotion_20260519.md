# Espurr Reverse Image Promotion Audit

Date: 2026-05-19

## Decision

Status: BLOCKED_NO_WRITE

Candidate `5b20c5f5-836f-4c48-ae5e-0d3cdb1191c6` was not promoted.

The requested target was `GV-PK-ME03-033` Espurr Reverse Holo. The candidate
still references `GV-PK-ME03-095-SHINY-RARE`, and its proposed action remains
`CREATE_CARD_PRINTING`. The target parent `GV-PK-ME03-033` exists, but no
resolved Reverse Holo child printing row exists to enrich.

## Preflight

- Branch: `scanner-v4-card-present-gate`
- Migration ledger: aligned through `20260519163000`
- `npm run preflight`: `PASS_WITH_DEFERRED_DEBT`
- `git diff --check`: pass

Known unrelated dirty files were excluded from this audit:

- `.flutter-plugins-dependencies`
- `.gitignore`
- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
- `docs/audits/pokemon_master_set_audit_v1/`
- `docs/ops/PRICING_HIGHWAY_REPAIR_PLAN_V1.md`
- `scripts/audits/pokemon_master_set_audit_v1.mjs`

## Candidate Read-Only Check

- Candidate state: `REVIEW_READY`
- Submission intent: `MISSING_IMAGE`
- Interpreter decision: `CHILD`
- Interpreter resolved finish key: `reverse`
- Identity resolution: `ATTACH_PRINTING`
- Proposed action type: `CREATE_CARD_PRINTING`
- Reference `card_gv_id`: `GV-PK-ME03-095-SHINY-RARE`
- Expected requested parent: `GV-PK-ME03-033`
- Front evidence image: present
- Current staging row: none
- Founder approved at: none
- Promoted at: none

## Target Resolution Check

Requested parent:

- `GV-PK-ME03-033`
- name: `Espurr`
- number: `033`
- child printings found: `0`
- reverse child printing found: no

Candidate referenced parent:

- `GV-PK-ME03-095-SHINY-RARE`
- name: `Espurr`
- number: `095`
- child printings found: `0`
- reverse child printing found: no

## Stop Reason

Promotion requires a single lawful child printing image target. This candidate
does not satisfy that gate because:

1. The candidate reference does not match requested parent `GV-PK-ME03-033`.
2. The candidate proposed action is still `CREATE_CARD_PRINTING`, not
   `ENRICH_CARD_PRINTING_IMAGE`.
3. No resolved child printing row exists for the requested Reverse Holo target.

## Required Next Action

Create or resolve the correct child printing target before image enrichment:

1. Resolve whether the intended parent is `GV-PK-ME03-033` or
   `GV-PK-ME03-095-SHINY-RARE`.
2. Ensure the correct Reverse Holo `card_printings` row exists.
3. Reclassify the candidate action as `ENRICH_CARD_PRINTING_IMAGE`.
4. Rerun the one-candidate guarded promotion gate.

## Safety Confirmation

- No DB write was performed.
- No `card_printings` image field was updated.
- No parent `card_prints` image field was updated.
- No warehouse candidate was promoted.
- No pricing change was made.
- No scanner change was made.
- No Species Dex denominator change was made.
- No public child route was enabled.

# Legacy JustTCG Mapping Review Boundary

Date: 2026-09-17
Status: Local implementation and contract verification; not deployed enforcement.

## Purpose

Retire direct mapping promotion based on TCGPlayer ID agreement, TCGdex pricing
buckets, or JustTCG set/name/number agreement. Preserve discovery as review leads.
Provider agreement and existing database mappings do not establish reviewed
Master Index printing identity. See `MASTER_INDEX_PRINTING_AUTHORITY_V1.md` in
`docs/contracts` and the Master Index first ingestion playbook.

## Changed Paths

- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
- `backend/pricing/promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs`
- `backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs`

All three retain maintenance-only discovery. Any `--apply` form, including apply
followed by dry-run, or `CANON_MAINTENANCE_DRY_RUN=false`, fails before provider
or database client setup. Card-mapping and automatic set-mapping upserts have
been removed, not merely hidden behind a default flag.

The selected-card limit defaults to 50 and must be 1..500. This is not a bound on
database metadata scans or transport retries: legacy unmapped-first selection
can scan beyond the selected rows. Do not schedule broad repeated discovery
under an assumption that only 50 database rows will be read.

JSON row records preserve raw canonical identity and matched provider payloads;
the bridge also retains its TCGdex payload. Every record is explicitly review-only
and `write_ready:false`. Existing matches require review; external-ID collisions
are checked before classifying an existing match. Human-readable log suppression
does not suppress the direct-structure script's JSON records.

These are discovery records, not immutable reviewed authority packages. Preserve
the run output, adjudicate actual source evidence, and use the applicable governed
executor for future writes. Never turn a candidate's `write_ready` flag on.

## Verification

23 targeted contracts passed locally, including real CLI and maintenance-launcher
apply rejection; local HTTP fixtures for all three discovery paths; raw identity
and source preservation; existing matches; and conflicting external-ID owners.
The fixture database endpoints observed GET requests only. No real provider calls
or production data writes occurred. Full release gates remain separate.

PR #485 review identified legacy selectors still excluding mapped TCGdex and
direct-structure cards before the new existing-match checks could run. Four
real-CLI regressions reproduced this (18 passing / 4 failing before repair).
The selectors now include existing mappings, including TCGdex rows that also
have TCGPlayer mappings; the full-table active JustTCG prefilter was removed.
Existing-match and hidden conflicting-owner tests now pass on all three routes.
The selected-card bound and review-only/write-retired boundary are unchanged.

## Release And Remaining Work

The preceding authority repair PR #484 merged as
`7c626ee4c79969513c9a29d1c87582fb79febf4e` at 2026-09-17 12:41:46 UTC.
Its code checks passed; the exact-head Vercel failure was the independently
verified explicit-production-activation guard. No activation was performed.

This follow-up still needs normal full checks, commit, PR review and release.
Do not claim all ingestion writers closed. In particular,
`promote_source_backed_justtcg_mapping_v1.mjs` is a separate writer using the canon
execution wrapper; its source-candidate and identity authority require further
audit. Presence in source alone does not prove active scheduled invocation.

Do not deploy main over MEE's divergent preserved runtime. Prepare a reviewed
runtime parity plan. The frozen McDonald's apply still requires exact production
authority; the broader historical identity and dependency reconciliation remains
incomplete. Preserve IDs, ownership, history, recovery artifacts and other trees.

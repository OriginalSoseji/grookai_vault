# Card Visual Fact Graph V2 High-Value 1,000 Apply-Readiness Recovery

Status: 999 SAVED ROWS RECONCILED; ONE PROVIDER RETRY BLOCKED; NO DATABASE APPLY

Date: 2026-07-20

## Context

The 1,000-card non-Energy harvest produced 962 saved rows and 38 quarantined outcomes. The grouped offline repair recovered all 37 quarantined payloads that contained model output, leaving one Happiny provider exception with no raw payload.

Recovery implementation commit:

`15b2797de155181b708a3572297f7403c5fb8973`

## Problem

The 37 recovered payloads lacked complete image provenance in their historical failure records. They could validate structurally but could not be converted into production saved-row shapes without resolving the current canonical images through the same image resolver. Happiny still required one bounded provider call.

## Risk

- Reconstructed rows could be mistaken for cryptographically linked historical image evidence.
- Shared representative images could incorrectly confirm printing-specific stamps or text.
- A missing provider credential could be hidden as a successful retry.
- Partial recovery could create missing or duplicated card-print outcomes.

## Decision

Add a read-only apply-readiness recovery runner that:

- reads frozen identity metadata through Supabase REST
- downloads canonical self-hosted images through the production resolver
- computes SHA-256, dimensions, MIME type, source key, and image quality
- revalidates preserved payloads
- builds rows through the production saved-row builder
- records current reconstruction separately from historical hash linkage
- forces shared representative variants to `needs_review`
- optionally retries only the single provider exception from a clean frozen commit
- performs no database writes

## Migration Applied

None.

## Artifacts

Frozen recovery gate:

`docs/audits/card_visual_descriptions/2026-07-20T22-03-34-380Z_apply_readiness_recovery_0751b9727880`

Key files:

- `run_plan.json`
- `reconstructed_saved_rows.jsonl`
- `image_provenance_manifest.jsonl`
- `remaining_failures.jsonl`
- `ALL_1000_APPLY_READINESS_SAVED_SYSTEM_JSON.json`
- `APPLY_READINESS_RECONCILIATION.json`
- `APPLY_READINESS_RECOVERY_REPORT.md`
- `artifact_hashes.json`

All 7 recorded artifact hashes were verified.

## Recovery Proof

- selected outcomes: 1,000
- original saved rows preserved: 962
- canonical image provenance resolved: 38/38
- reconstructed saved rows: 37/37
- image failures: 0
- payload reconstruction failures: 0
- saved-system rows available: 999
- remaining failures: 1
- duplicate export IDs: 0
- reconciliation mismatches: 0
- reconstructed statuses: 10 pending / 27 needs_review / 0 approved

## Variant Boundary Proof

Two rows use `representative_shared_stamp` images:

- `GV-PK-SVI-088-PLAY-POKEMON-STAMP`
- `GV-PK-BST-097-PLAY-POKEMON-STAMP`

Both now contain `variant_specific_print_marker_not_confirmed_by_image` and route to `needs_review`.

Artwork facts may be reused. The shared image does not confirm the specific printing's stamp, logo, copyright line, bottom text, border, error, or color difference.

## Provider Retry Result

Target:

- card: Happiny
- GV-ID: `GV-PK-PL-76`
- card-print ID: `0848dd13-a194-4538-87fe-3dc74021129a`
- model: `gpt-4.1-mini`
- image detail: high
- ceiling: $0.03

The frozen retry gate was invoked, but `OPENAI_API_KEY` was not configured. No provider request was made, no tokens were consumed, and no cost was incurred. Happiny remains quarantined with no generated payload.

## Provenance Truth

- All 37 reconstructed rows have complete current saved-row provenance.
- 31 use `identity + exact` canonical image status.
- Four use identity sources whose status is null.
- Two use `representative_shared_stamp` and are explicitly review-routed.
- Historical failure records did not preserve image hashes for the 37 payloads, so historical model-image cryptographic linkage remains unavailable.
- Current canonical reconstruction is not described as historical hash proof.

## Tests

- agent syntax check: passed
- recovery runner syntax check: passed
- targeted contract suite: 65/65 passed
- `git diff --check`: passed

The repository-wide shipcheck was not rerun because its environment preflight remains blocked by missing `SUPABASE_DB_URL`. No unrelated Flutter result is attributed to this isolated Node recovery.

## Current Truths

- 999 card-print outcomes now have saved-system rows.
- One card remains an explicit provider quarantine.
- No row is approved.
- No database row was written.
- No embedding or downstream integration occurred.
- The full 1,000-card set is not wholly apply-ready because Happiny has no payload.

## Token And Cost Result

This recovery gate used:

- OpenAI requests: 0
- retries: 0
- tokens: 0
- new estimated cost: $0

The source harvest cost remains $10.5361256.

## Why This Remains Derived Intelligence

These rows contain model-extracted and deterministically normalized visual facts. They do not become canonical identity, printing truth, approval truth, image ownership truth, or public product truth through reconstruction.

## What Must Never Be Broken

- Never equate current reconstructed provenance with historical hash linkage.
- Never let a shared representative image confirm variant-specific print markers.
- Never hide a provider exception inside successful row counts.
- Never approve or embed rows during artifact recovery.
- Never write a partial batch without an explicit selected subset and exact reconciliation.
- Never overwrite approved/current human-reviewed rows.

## Explicit Next Gate

Configure `OPENAI_API_KEY` and rerun the frozen recovery command with `--retry-provider --max-retry-cost-usd=0.03` to generate Happiny only. If Happiny validates and all 1,000 outcomes reconcile, request the separately governed 250-row artifact-to-database apply/readback canary. Do not regenerate the other 999 cards.

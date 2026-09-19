# Japanese Source Semantics Prevention Release

Date: September 19, 2026.

## Scope

Isolate the already-developed Japanese source and reconciliation corrections from
the mixed repair worktree. This release changes future source interpretation; it
does not replay historical payloads or write catalog, pricing, ownership or images.

- Preserve printed prefixes, suffixes and promo-series identity.
- Keep printed denominators separate from full checklist counts.
- Retain literal unnumbered source labels without inventing numeric coordinates.
- Stop an empty illustrator block from borrowing a later product-link name.
- Preserve every official V-UNION component; an assembly cannot certify its first
  piece as the identity of the entire image.
- Match resolved set UUIDs as well as aliases before proposing a new parent.
- Retain conflicting names/numbers and product-container overlaps for reconciliation
  rather than creating duplicate canonical rows or silently merging existing ones.

Source parsers are versioned Official V3, Limitless V3 and TCGdex V2. Candidate
resolution, final admission and live reconciliation are now V2 so new derivations
cannot be mistaken for original V1 output. Historical raw captures and manifests
remain unchanged. Old approvals are not reusable execution authority for new output.

## Verification Boundary

The isolated branch passed all 250 Japanese contracts. Offline source replay
verified 37,906 archived assertions: 19,904 Limitless, 8,159 TCGdex and 9,843
Official. Every selected raw member hash matched. Historical assertion IDs and
source archives were preserved; no source request or database write occurred.
The replay removes 19,904 unsupported checklist-derived denominators, corrects
83 TCGdex denominator fallbacks and retains 12 physical coordinates across three
official V-UNION assemblies. These are sidecar source corrections, not new live
database repair counts. Unknown denominators require evidence, not another guess.

Operator receipts live under retrospective_printing_audit_20260917:
`japanese-release-denominator-replay-v1/summary.json` and
`japanese-release-multipart-replay-v1/summary.json`.

Run all Japanese contract tests and the full repository shipcheck before release.
Runtime verification must use the deployed revision and a read-only/staging path;
local tests and merged code alone do not prove a running worker uses the fix.
Do not trigger a historical durable apply or a worker that creates founder jobs
merely to obtain a read-only smoke result.

The database-wide repair remains unfinished: Japanese foundation/legacy overlap,
physical finish evidence and provisional children still require reconciliation.
Passing these prevention tests does not certify existing Japanese rows, mappings,
pricing, visibility, or collector/Vault behavior.

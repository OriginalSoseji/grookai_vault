# Collectible Shadow Adapters V1

## Status

Adapter registry, no-write source probes, default-branch schedule, and live
artifact reconciliation are complete. Catalog parsing and canonical promotion
remain closed.

## Context

Grookai needs to discover new collectible releases beyond Pokemon, Magic: The
Gathering, and One Piece without forcing every collectible into a Pokemon card
identity model or granting unattended canonical authority.

The first expansion covers additional TCGs, Funko vinyl figures, Hot Wheels
die-cast vehicles, and sports cards. Comics remain blocked pending a licensed
cross-publisher source.

## Decision

New collectible domains enter through domain-specific shadow adapters. Source
health and response evidence are monitored daily, but a healthy response is not
treated as a parsed or complete catalog.

All new adapters remain evidence-only:

- no production database access or writes;
- no Storage writes;
- no image downloads or pointer changes;
- no raw source-body persistence;
- no canonical, pricing, publication, or Vault writes;
- no writer dispatch;
- no text or image republication authority inferred from an official source.

## Implemented Domains

The registry defines separate identity contracts for:

- TCG cards;
- vinyl figures;
- die-cast vehicles;
- sports cards;
- comics.

Pokemon, MTG, and One Piece remain owned by the existing universal discovery
runtime. Sixteen additional official-source probes are registered for eleven
TCGs, Funko, Hot Wheels, and Topps, Panini, and Upper Deck sports catalogs.

Comics are registered as `licensed_source_required` and cannot run.

## Implementation

- Contract: `docs/contracts/COLLECTIBLE_SHADOW_ADAPTERS_V1.md`
- Registry:
  `backend/catalog/collectible_shadow_adapter_registry_v1.mjs`
- Artifact-only worker:
  `scripts/workers/collectible_shadow_adapter_probe_v1.mjs`
- Scheduled workflow:
  `.github/workflows/collectible-shadow-adapters.yml`
- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/270`
- Merge commit: `e0ea428d6e94df3cd69b7bc179477c38b6216b4a`

Candidate normalization rejects empty source-owned identifiers, requires and
preserves a lowercase SHA-256 evidence hash, and never grants canonical or image
authority. Network bodies are hashed while streaming and cancelled above the
25 MiB limit.

## Validation

- Targeted catalog contracts: 21/21 passed.
- Node syntax checks: passed.
- `git diff --check`: passed.
- CodeQL: passed.
- Contracts drift gate: passed.
- Runtime protection: passed.
- Legacy-key guard: passed.
- Vercel preview: passed.

## Default-Branch Live Proof

Workflow run:
`https://github.com/OriginalSoseji/grookai_vault/actions/runs/33111034449`

The run executed from exact merge SHA
`e0ea428d6e94df3cd69b7bc179477c38b6216b4a` and recorded:

- 16 selected adapters;
- 10 healthy source responses;
- 6 publisher-side HTTP failures;
- 0 artifact hash mismatches;
- database access `false`;
- database writes `false`;
- Storage writes `false`;
- image downloads `false`;
- writer dispatches `false`.

The failed sources were Flesh and Blood, Cardfight Vanguard, Weiss Schwarz,
Funko, Topps, and Panini. Their restrictions are preserved in operational issue
`https://github.com/OriginalSoseji/grookai_vault/issues/271`. No candidates were
invented for failed sources.

## Current Truths

- The cross-collectible domain and source registry is production-scheduled.
- Source health evidence is immutable and hash-reconciled.
- The new adapters currently emit no catalog candidates.
- No new TCG, Funko, Hot Wheels, sports, or comic catalog is complete merely
  because its source probe is healthy.
- Official provenance does not authorize copying product text, artwork, or
  images into Grookai.
- Publisher access restrictions are operational work, not permission to bypass
  access controls.

## What Remains

1. Complete a source-specific terms and licensing classification for each
   adapter.
2. Build checked-in fixtures and deterministic parsers for approved sources.
3. Prove pagination, language, product, collector-number, and variant coverage.
4. Emit evidence-backed shadow candidates with source-owned IDs and response
   hashes.
5. Reconcile candidate completeness without production writes.
6. Resolve publisher-side probe restrictions through documented public
   endpoints or approved feeds, not access-control bypasses.
7. Establish a licensed cross-publisher comic source before enabling comics.
8. Keep image acquisition and self-hosting as a separate rights-governed gate.
9. Require a separate bounded apply contract before any canonical promotion.

## Invariants

1. A source probe is not a catalog parser.
2. A shadow candidate is not canonical identity.
3. Every candidate carries a source-owned ID and exact response evidence hash.
4. Domain identity remains domain-specific.
5. No scheduled adapter can access the production database or dispatch writers.
6. Publisher restrictions fail closed.
7. Canonical promotion requires a separately frozen payload, explicit authority,
   bounded mutation contract, readback, rollback proof, and checkpoint.

## Explicit Next Gate

Implement Parser Wave 1 for healthy, terms-cleared TCG sources. Each parser must
use checked-in fixtures, prove deterministic pagination and variant behavior,
and complete one bounded live shadow run. Stop with candidate artifacts and a
completeness report; do not write production database, Storage, image, pricing,
publication, or Vault state.

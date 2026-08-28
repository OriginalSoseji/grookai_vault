# Collectible Wave 1 Set Foundations Apply V1

## Context

The reviewed Wave 1 set foundation contains exactly 505 English set rows: 500
Yu-Gi-Oh and 5 Gundam. The game foundations were already present in production,
hidden for every request role, and the exact set migration had passed a
production rollback proof with zero durable change.

## Problem

The set foundations had to be written durably without treating set discovery as
card identity authority, exposing either game, or changing any existing
production row. The production migration ledger also had to prove the exact
ordered SQL statements that were applied.

## Risk

- `public.sets.code` is globally unique across every TCG.
- Direct set reads exist in web and Flutter, so hidden-game RLS must remain the
  effective visibility boundary.
- A broad payload could admit any of the 551 review-routed source rows.
- A set row could be mistaken for card, printing, image, pricing, or publication
  authority.
- Global production counts can change concurrently and cannot be used as the
  sole proof of this migration's effects.

## Decision

Apply only migration
`20260828063000_collectible_wave1_set_foundations_v1.sql` from frozen default-
branch commit `02aa12d9eddb719c4d6d1286aba55fc5a21a87dc`. Attribute the
write through exact target rows, exact migration-ledger statement hashes, zero
target-dependent rows, unchanged release controls, hidden RLS, and two
independent readbacks. Treat global counts as diagnostics only.

## Alternatives Rejected

- Direct SQL outside the migration ledger was rejected.
- Applying all 1,056 source proposals was rejected because 551 remain
  review-routed.
- Requiring the target migration to remain the latest migration after commit was
  rejected because an unrelated concurrent migration may land lawfully.
- Exact post-commit comparisons of every global count were rejected because
  concurrent unrelated writes are not attributable to this migration.
- Enabling game or set visibility was rejected as outside this foundation gate.

## Migration Applied

- implementation PR: `296`;
- workflow run: `33180216578`;
- frozen producer SHA: `02aa12d9eddb719c4d6d1286aba55fc5a21a87dc`;
- migration version: `20260828063000`;
- migration SHA-256:
  `0bef87cb2f487e84729a93aa2ba1bfb9b90cc559a10e981de34dcd1d7a8305fb`;
- payload SHA-256:
  `2c07787bf965909a2b9f0a6296e45d6a2407c7faf28d70069c23a305beec7144`;
- payload fingerprint:
  `fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668`;
- exact durable set rows: `505`;
- partition: `500` Yu-Gi-Oh / `5` Gundam;
- exact migration-ledger rows: `1`;
- exact ledger statement count: `9`;
- existing rows updated or deleted: `0`.

## Database And Security Readback

- exact target IDs and codes: `505 / 505`;
- direct RLS visibility: `0` anon / `0` authenticated;
- request visibility: false for anon, authenticated, and service role;
- target-dependent card, legacy-card, identity, printing, and mapping rows: `0`;
- release-control changes: `0`;
- Storage, image, pricing, publication, and Vault changes: `0`;
- first and independent workflow readbacks: exact match;
- fresh post-workflow read-only verification: passed;
- reconciliation findings: `0`;
- artifact hash mismatches: `0`;
- credential leaks: `0`.

## Current Truths

1. Production contains exactly the reviewed 505 Wave 1 set foundations.
2. Production has one exact ledger row for migration `20260828063000` with the
   reviewed ordered statement hashes.
3. Yu-Gi-Oh and Gundam remain hidden and return no direct set rows to anon or
   authenticated clients.
4. The foundation created no cards, identities, printings, mappings, images,
   prices, publication state, or Vault data.
5. The 551 review-routed source set proposals remain outside production.
6. The write and its evidence are fully attributable to frozen commit
   `02aa12d9eddb719c4d6d1286aba55fc5a21a87dc`.

## Invariants

- These 505 rows and the migration-ledger entry are durable history.
- Existing rows may not be rewritten to make future payloads easier.
- Release controls must remain hidden until a separate release gate succeeds.
- Downstream card rows must reference these deterministic set IDs.
- Set presence never authorizes identity, printing, image, pricing, or app
  visibility.

## What Must Never Be Broken

- Never admit a review-routed source row through inference or convenience.
- Never reuse unnamespaced source codes in the global set-code domain.
- Never infer printed totals or identity domains from source card counts.
- Never expose a hidden game merely because sets or cards exist.
- Never delete or roll back these sets after downstream rows reference them;
  repair future errors forward through a separately governed migration.

## Evidence

Permanent artifacts are preserved under
`docs/audits/catalog_discovery/collectible_wave1_set_foundations_v1/production_apply_v1/`.
`provenance.json` identifies the workflow and artifact, while
`preserved_artifact_hashes.json` fixes the reviewed local bytes.

## Explicit Next Gate

Prepare a hidden, artifact-only card identity proposal against these exact set
IDs. Reconcile source rows, alternate artwork addressability, identity evidence,
and unresolved cases before proposing any card write. Do not enable application
visibility, pricing, images, Storage, or publication as part of that gate.

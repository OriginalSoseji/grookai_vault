# Collectible Wave 1 Set Apply Proposal V1 Checkpoint

## Decision

Preserve the exact 505-row set payload as reviewed apply-planning evidence, not
as write authority. The payload contains 500 Yu-Gi-Oh and 5 Gundam sets. The
other 551 source rows remain explicitly excluded because they still carry
shared-code, language, name, or source-completeness review requirements.

## Proven Result

- implementation PR: `291`;
- merged producer SHA: `63c75e308d56878647ae400c37c3ac9a43c17095`;
- workflow run: `33146520564`;
- artifact ID: `9675986021`;
- artifact digest:
  `sha256:d353abf3470fa9e3f075ae7415955de26af7b4d8903ceb7261531ba5bdc20507`;
- payload fingerprint:
  `fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668`;
- run-plan fingerprint:
  `a082904c3f679d1e48687350ee7a621f5c0c731b4d3905b0700ac1dd8b63cc69`;
- 505 unique deterministic UUIDv5 IDs;
- 505 unique globally namespaced canonical codes;
- 551 unique excluded source rows;
- all 1,056 source proposals reconciled exactly once;
- zero ID, code, source-proposal, or same-game name collisions;
- zero validation bytes, URL leaks, or artifact mismatches;
- production access was repeatable-read and read-only;
- database, migration-ledger, card, identity, mapping, Storage, image,
  pricing, publication, and Vault writes: zero.

## Current Truths

- Production still contains zero Yu-Gi-Oh and Gundam sets.
- Both game release controls remain hidden.
- Production migration history was exactly `20260828024500` during preflight.
- Canonical codes are `ygo-<source code>` and `gcg-<source code>` in lowercase.
- Exact source codes remain preserved as `printed_set_abbrev` and source
  evidence.
- Card identity domains remain null because this set-only gate does not
  authorize card identity.
- The exact 505-row `set_apply_payload.jsonl` is committed here with its
  workflow-produced byte count and SHA-256 so the next gate does not depend on
  GitHub Actions retention.
- The remaining large row artifacts remain in GitHub Actions until
  `2026-11-26T06:00:52Z`; their exact hashes remain committed here.

## What Must Never Be Broken

- The 551 review-required rows must not enter a migration built from this
  payload.
- Shared Yu-Gi-Oh source codes must not be silently merged.
- Namespaced canonical codes must remain globally collision-free.
- Set creation must not enable app visibility or authorize card ingestion.
- Source card counts must remain evidence and must not be misrepresented as
  canonical `printed_total` values.
- A rollback must never delete a set after it acquires downstream references;
  such a case requires a forward fix.

## Exact Next Gate

Generate a migration candidate for only these exact 505 rows and this exact
payload fingerprint. The candidate must have insert-only SQL, exact conflict
guards, exact readback, no visibility change, no card or identity domain
changes, and a rollback-only production proof.

Stop after rollback proof. Durable apply requires separate authorization naming
the migration SHA, payload fingerprint, run-plan fingerprint, exact row counts,
and rollback proof.

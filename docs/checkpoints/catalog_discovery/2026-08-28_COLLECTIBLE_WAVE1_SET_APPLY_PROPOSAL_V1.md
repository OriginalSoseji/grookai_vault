# Collectible Wave 1 Set Apply Proposal V1

## Context

The Wave 1 set-foundation proposal reconciled 1,056 Yu-Gi-Oh and Gundam source
sets. Only 505 rows had no shared-code, language, name, or source-completeness
finding. Production already contained the two hidden game foundations and zero
sets for either game.

## Problem

The existing source set codes cannot be written directly because
`public.sets.code` is globally unique across every TCG. The apply boundary also
needed deterministic IDs, explicit English evidence, exact exclusions, current
schema verification, collision ownership, and a rollback design before any
migration could be considered.

## Risk

A direct source-code insert could collide with Pokemon, MTG, One Piece, or a
future catalog. A broad migration could accidentally include any of the 551
review-required rows. Setting card identity domains or changing release controls
in the same gate could expose or authorize an unfinished catalog.

## Decision

Build an artifact-only apply proposal for exactly 505 rows:

- 500 Yu-Gi-Oh sets with `ygo-` canonical code prefixes;
- 5 Gundam sets with `gcg-` canonical code prefixes;
- deterministic UUIDv5 IDs from source set proposal IDs;
- exact English source evidence;
- null card identity domains and image fields;
- hidden visibility inherited from the existing release controls;
- all 551 other rows preserved as explicit exclusions.

No migration was generated and no durable write was authorized.

## Alternatives Rejected

- Raw source codes were rejected because production enforces global code
  uniqueness.
- Name-slug canonical codes were rejected because name punctuation and future
  editorial changes are less stable than source code evidence.
- Adding all 1,056 sets was rejected because 551 rows retain unresolved evidence
  classes.
- Adding card identity domains was rejected because no card payload is part of
  this gate.
- Generating a migration before production preflight was rejected because
  collision and schema ownership had not yet been proven.

## Production Read-Only Proof

- producer SHA: `63c75e308d56878647ae400c37c3ac9a43c17095`;
- workflow run: `33146520564`;
- artifact ID: `9675986021`;
- payload fingerprint:
  `fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668`;
- run-plan fingerprint:
  `a082904c3f679d1e48687350ee7a621f5c0c731b4d3905b0700ac1dd8b63cc69`;
- selected/excluded/source partition: `505 / 551 / 1,056`;
- planned ID collisions: `0`;
- planned global code collisions: `0`;
- planned source-proposal collisions: `0`;
- planned same-game name collisions: `0`;
- validation failures: `0`;
- database transaction: repeatable-read, read-only, rollback-ended;
- database writes: `0`.

## Current Truths

1. The exact 505-row set payload is deterministic and collision-free against
   the observed production baseline.
2. Production still contains zero Yu-Gi-Oh and Gundam sets.
3. Both games remain hidden for all app request roles.
4. The 551 review-required source sets remain outside write scope.
5. No cards, identities, mappings, images, prices, publication state, or Vault
   data were created.

## Invariants

- Only the exact payload fingerprint may enter the next migration candidate.
- Every canonical code remains globally namespaced.
- Source codes and names remain preserved in source evidence.
- Set creation cannot change hidden release controls.
- Card identity requires a later independent payload and domain gate.
- Rollback selectors are exact and non-executable until separately authorized.

## Exact Next Gate

Build the exact 505-row migration candidate, verify its SQL and migration
history parent, then complete a rollback-only production proof. Execute it only
inside a production transaction that ends in rollback. Prove exact transient
rows, exact rollback absence, unchanged release controls, unchanged protected
counts, and zero migration-ledger change.

Stop before durable apply. Durable apply requires separate authorization with
the migration SHA, payload and run-plan fingerprints, exact row counts, and the
rollback proof.

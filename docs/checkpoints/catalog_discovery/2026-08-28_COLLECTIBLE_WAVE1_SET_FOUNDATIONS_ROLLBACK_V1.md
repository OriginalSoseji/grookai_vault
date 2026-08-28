# Collectible Wave 1 Set Foundations Rollback V1

## Context

The permanent Wave 1 set proposal contains exactly 505 reviewed English set
rows: 500 Yu-Gi-Oh and 5 Gundam. Both canonical game foundations already exist
in production and remain hidden for every request role.

## Problem

The proposal needed to become an exact insert-only migration candidate without
allowing global code collisions, unresolved source rows, identity assumptions,
or accidental app visibility. A static migration was not sufficient evidence;
the complete transient state and rollback restoration had to be proven against
current production.

## Risk

- `public.sets.code` is globally unique across every TCG.
- Direct set reads exist in web and Flutter and therefore require the
  restrictive hidden-game RLS boundary to remain effective.
- A broad insert could include any of the 551 review-required source rows.
- Set creation could be mistaken for card identity, image, pricing, or release
  authority.
- An incomplete rollback could leave catalog rows or a migration-ledger entry.

## Decision

Generate migration `20260828063000_collectible_wave1_set_foundations_v1.sql`
deterministically from the permanent 505-row payload. The migration:

- inserts only into `public.sets`;
- uses deterministic UUIDv5 IDs and globally namespaced codes;
- stores exact source and payload provenance;
- keeps totals, identity domains, roles, and images unasserted;
- fails closed on ID, code, source-proposal, same-game name, or field conflicts;
- changes no release control or visibility state.

Execute the migration body only inside an outer production transaction and
always roll it back.

## Alternatives Rejected

- Direct durable apply without rollback proof was rejected.
- Source codes without `ygo-` and `gcg-` namespaces were rejected because code
  ownership is global.
- Adding all 1,056 source sets was rejected because 551 remain review-routed.
- Assigning printed totals from source card counts was rejected because those
  counts are evidence, not canonical totals.
- Adding cards, domains, images, or visibility in the same migration was
  rejected because each requires an independent governed payload.

## Production Rollback Proof

- implementation PR: `294`;
- merged producer SHA: `51f47be5a79e5e05391f6b2193a30729e53fc2ac`;
- workflow run: `33171480355`;
- artifact ID: `9685801358`;
- migration SHA-256:
  `0bef87cb2f487e84729a93aa2ba1bfb9b90cc559a10e981de34dcd1d7a8305fb`;
- payload fingerprint:
  `fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668`;
- run-plan fingerprint:
  `e6daef9af7c9f0a489cd4c42a3f223194348dc0cca41268debb07a739497581c`;
- transient rows: `505`;
- unique transient IDs and codes: `505 / 505`;
- transient partition: `5` Gundam / `500` Yu-Gi-Oh;
- direct RLS-visible rows: `0` anon / `0` authenticated;
- request visibility: false for anon, authenticated, and service role;
- card, identity, printing, mapping, Storage, image, pricing, publication, and
  Vault deltas: `0`;
- migration-ledger delta: `0`;
- release-control delta: `0`;
- rollback succeeded: true;
- before/after production readback: exact;
- findings, artifact mismatches, and credential leaks: `0`.

## Current Truths

1. The exact 505-row migration is production-compatible and rollback-proven.
2. Production still contains zero Yu-Gi-Oh and Gundam sets.
3. Production migration history still ends at `20260828024500`.
4. Both games remain hidden and no app-facing catalog was enabled.
5. The 551 review-required set proposals remain outside the migration.
6. No durable database, Storage, pricing, publication, image, or Vault write
   occurred.

## Invariants

- Only the exact migration SHA and payload fingerprint may be durably applied.
- Durable apply may create exactly 505 set rows and one migration-ledger row.
- No existing row may be updated or deleted.
- Release controls must remain byte-for-byte unchanged.
- Set RLS must keep both games hidden after apply.
- No card, identity, printing, mapping, image, pricing, publication, or Vault
  authority follows from set creation.

## What Must Never Be Broken

- Never include a review-required source row through inference or convenience.
- Never reuse raw source codes without their global TCG namespace.
- Never use source card counts as `printed_total` without canonical evidence.
- Never expose a hidden game merely because its set or card rows exist.
- Never roll back a set after downstream rows reference it; use a forward fix.

## Exact Next Gate

Prepare the exact durable apply plan for migration SHA
`0bef87cb2f487e84729a93aa2ba1bfb9b90cc559a10e981de34dcd1d7a8305fb`.
The plan must authorize only 505 `public.sets` inserts and the single governed
migration-ledger row, then require exact post-apply readback, hidden RLS proof,
protected-count reconciliation, and an independent read-only verification.

Stop before durable apply. The apply is the next actual write decision.

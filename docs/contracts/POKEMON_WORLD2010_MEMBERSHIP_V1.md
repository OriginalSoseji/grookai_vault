# Pokemon World2010 anthology membership V1

This automated completion policy governs all 109 existing World2010 warehouse
identities in the four decks reviewed by `POKEMON_WORLD2010_RELATIONSHIP_REVIEW_V1.md`.
It consumes the unchanged source-replayed identity projection; it grants no
database, parent, printing, mapping or finish authority and signs for no human.

Each profile binds the exact admitted Master fact hashes, existing parent UUIDs,
original coordinates, original printed denominators and source provenance, plus
every held product ID, source payload hash, original checklist hash and reason.
The whole group has 92 admitted candidate identities and 17 holds. Per-deck counts
are Boltevoir 28/32, LuxChomp 20/30, Happy Luck 22/24, Power Cottonweed 22/23.
All four physical decks have 60 cards; neither physical quantity nor expected
membership supplies a printed denominator. Set-level printed_total stays null.

Frozen per-deck fingerprints were derived from the original projection with all
four original checklists replayed and a fresh independent database observation.
The checked-in candidate fixture retains the source bindings and all holds.
A payload's recomputed self hash cannot change these fingerprints. Resolving a
hold requires new evidence and a new governed policy; this version cannot mark
held rows resolved or silently remove them.

The ordinary completion builder requires the profile whenever a protected deck
configuration, identity or printing appears. It verifies exact admitted facts,
counts and set metadata before deriving anything. Expected membership and held
membership stay separate from present working facts and from printing gaps.
Every hold remains visible in the gap queue, source worklist and admissible
export, including its original reason and source IDs. The compact identity
export preserves original denominators and parent UUID/GV-ID anchors.

All four decks are anthology_identity_membership_incomplete. Future exact finish
admission cannot remove membership holds. Publication independently checks the
frozen profile and counts and refuses complete-set shards even if an upstream
status is incorrectly labelled complete. Missing or altered profiles stop output.

`scripts/audits/pokemon_world2010_membership_v1.mjs` is an offline immutable
stager. It accepts the same six explicit paths as the identity-projection CLI,
replays that CLI in a new child directory, attaches profiles, rebuilds completion
and verifies every prior set outcome. It rechecks source hashes and output bytes,
records a terminal receipt and refuses overwrite, apply and duplicate switches.
It changes neither active Master nor production. Before active integration,
qualify a separate additive integration with before/pending/complete receipts,
exact old-fact preservation and recovery from interrupted local writes.

This completes a membership/publication prerequisite only. Governed 83-raw
ingress retaining nine lineages, the new 92-relationship identity/mapping
executor and atomic journal, SQL dependency/rollback/idempotency/lost-response
proof, normal source commit/push, frozen production apply and independent public
readback remain separate. Historical World printing approvals remain consumed.

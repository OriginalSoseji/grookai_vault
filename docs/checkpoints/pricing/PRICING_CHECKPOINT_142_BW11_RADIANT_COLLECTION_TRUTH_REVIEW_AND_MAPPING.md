# Pricing Checkpoint 142: BW11 Radiant Collection Truth Review and Mapping

## Status

`9 PRINTINGS REHEARSED; PRODUCTION TRUTH REVIEW AND MAPPING PENDING MERGE`

## Scope

This batch freezes nine active TCGPlayer products from Legendary Treasures:
Radiant Collection group `1465`. Each product has one exact printed coordinate,
one unique active `pokemon_eng_standard` parent in canonical set `bw11`, and one
existing active, non-provisional Holo child:

- Audino `RC17/RC25`;
- Emolga Full Art `RC23/RC25`;
- Meloetta EX `RC11/RC25`;
- Meloetta EX Full Art `RC25/RC25`;
- Mew EX Full Art `RC24/RC25`;
- Ralts `RC8/RC25`;
- Reshiram Full Art `RC22/RC25`;
- Servine `RC2/RC25`; and
- Shaymin EX Full Art `RC21/RC25`.

The source products and canonical parents are currently unmapped. Their Holo
children are public under the current null-review policy, but lack an active
truth review. This change adds a narrow truth-review maintenance task before
the products can enter the exact-mapping authority path.

## Evidence and Guardrails

The checked-in English Master Index verifies the card and Holo printing for all
nine coordinates with at least two sources per printing. The maintenance task
pins the exact source file hashes, product IDs, group, raw names, coordinates,
parent IDs, printing IDs, public IDs, finish, provenance, production project,
and producing commit.

- cards SHA-256:
  `39f5922a9f97bff9d0fc27c711b1f271054cef2fcf69e05e4a0e1c0f540b252c`
- printings SHA-256:
  `fc906d766bfa441858af42b5ede5f5461fa5a6c25c07638f715b1a12b1271f24`
- rehearsal authority fingerprint:
  `5c296b788734ad0970e31bd5d63791691a76a1cb69e56327285f21e981351b1c`
- planned truth-review inserts: `9`
- mapping, publication, and customer-state writes: `0`

The production-connected dry run used verified TLS and a repeatable-read,
read-only transaction. Maintenance run
`929e1b28-cd41-4fbf-9744-438deedd4bc5` validated all live preconditions,
rolled back successfully, and independently proved that none of the nine
deterministic review rows persisted.

The truth-review task defaults to dry run, is callable only through the canonical
maintenance launcher, uses a serializable transaction and advisory lock in apply
mode, inserts only verified/visible/high-confidence reviews, performs
pre-commit and fresh post-transaction readback, and contains no update or delete
path. The exact-mapping authority remains a separate read-only package, and the
existing guarded mapping writer remains the only mapping mutation path.

## Next Gate

Merge the code through reviewed CI. From the exact clean merge commit, regenerate
the fingerprint, rerun the truth-review dry run, apply and independently verify
the nine review rows, then build and apply the nine exact mappings. Pricing
shadow and customer-visible publication remain separate guarded steps. Continue
to the next evidence-safe backlog batch after production readback.

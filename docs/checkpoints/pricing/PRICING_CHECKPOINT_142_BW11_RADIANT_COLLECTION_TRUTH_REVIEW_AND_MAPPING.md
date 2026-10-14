# Pricing Checkpoint 142: BW11 Radiant Collection Truth Review and Mapping

## Status

`9 TRUTH REVIEWS AND EXACT MAPPINGS APPLIED AND INDEPENDENTLY VERIFIED`

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

Before this release, the source products and canonical parents were unmapped.
Their Holo children were public under the null-review policy but lacked active
truth reviews. This release added the nine narrow truth reviews first, then the
nine exact mappings; both sets of rows are now active and independently verified.

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

## Production Result

PR `#667` squash-merged the bounded review and mapping authority at commit
`4764223949c38006f7b34c279dd353c380a31f13`. The merge included explicit
reconciliation receipts for lost commit acknowledgements and failed fresh
readback, and all required CI checks passed.

From that exact clean commit, truth-review dry run
`2f35a7ca-79b3-4368-82d5-47042f514cdd` selected all nine rows, proved rollback,
and left zero durable rows. Production truth-review run
`01cc9291-b391-4389-add8-344b55f02c9a` then committed exactly nine rows and read
back all nine before and after commit. Its transaction outcome was acknowledged;
`commit_uncertain`, `rollback_uncertain`, mapping writes, publication writes, and
customer-state writes were all zero or false as applicable.

An independent verified-TLS, repeatable-read query confirmed all nine active
reviews are `verified`, `visible`, and `high` confidence; bind the intended Holo
printing and canonical parent; carry authority fingerprint
`5c296b788734ad0970e31bd5d63791691a76a1cb69e56327285f21e981351b1c`;
and preserve the frozen Master Index file hashes.

The refreshed exact-mapping planner evaluated 734 Pokémon source products and
produced exactly nine candidates in the reviewed-product authority lane. It
retained 725 blocked products. The bounded authority package froze:

- candidate SHA-256:
  `b13a30772e228a9103790b11352a59cfee62fc5d6dcd20d11611c1c36a2212f2`;
- authority fingerprint:
  `339c2e997bd0a8ff29b9cc8b130dd38f42d28cefc2cb428942286ac13a0957bc`;
- authority file SHA-256:
  `1373ddbb737c9524131ea9c5b9fe7f5f5ed42c256513fac55c6bbaf22ee3adf6`;
  and
- apply batch fingerprint:
  `adf600d3e0b5f65589e60f42959b0b7873187c979e7f2aad6af574993ba6b59e`.

Mapping dry run `b3992b95-2921-458c-9c3c-21a0fa6a337b` selected all nine,
validated every live boundary, and proved rollback with zero writes. Production
mapping run `77362035-d234-436b-ab4d-09288fba3ccf` committed exactly nine active
mappings and read back all nine. An independent verified-TLS repeatable-read
then confirmed nine current source products, nine active exact mappings, nine
unique standard parents, nine verified visible Holo printings, and the exact
maintenance run ID. Publication and customer-state writes remained zero.

The full release evidence, including a 57-file SHA-256 inventory, is retained at
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/bw11-radiant-collection-production-release-v1`.

Stale full-scope shadow run `38624164995` was canceled because it predates this
batch. Replacement run `38631343122` is queued from the exact merge commit and
includes this batch plus every earlier mapping.

## Next Gate

Inspect full-scope shadow run `38631343122`, retain its immutable evidence, and
advance customer-visible pricing only through the existing publication gate.
Use the refreshed completion-agent backlog to select the next evidence-safe
set-authority or truth-review repair batch. Keep ambiguous, colliding, or
unsupported products explicitly blocked.

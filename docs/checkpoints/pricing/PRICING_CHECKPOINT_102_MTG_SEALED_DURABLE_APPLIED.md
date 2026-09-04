# Pricing Checkpoint 102: MTG Sealed Durable Applied

## Context

The MTG sealed-world payload had already passed schema migration, visibility
isolation, exact live planning, read-only preflight, and a complete rollback
canary. Checkpoint 101 froze the only permitted durable apply authority:

- producer SHA
  `800d41e65fbaaaf52f1e32b5cde1ae0367e1a976`;
- preserved ref `ops/mtg-sealed-apply-800d41e65`;
- plan fingerprint
  `45abdb1e37819e343274f82524d9e55dbf9c096345b4d600dca1e9d0ec6f79c4`;
- source fingerprint
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`.

On September 3, 2026 (Denver time), the founder granted single-use production
authority for that exact insert-only payload and one MTG release pointer.

## Problem

The transaction had to persist the proven MTG sealed catalog without allowing
live source data, a newer branch, or a later recomputation to expand its
authority. It also had to prove that the existing One Piece sealed world and
all unrelated product boundaries remained unchanged.

## Risk

- Source or plan drift could have changed the rows after approval.
- A partially committed payload could have left broken references.
- Cross-game SQL could have changed One Piece state.
- Setting the release pointer could have accidentally exposed sealed data.
- Reusing the apply authority for a second writer run could have duplicated or
  mutated durable state.
- Aggregate write telemetry could be mistaken for table-level readback.

## Decision

Dispatch the exact preserved workflow ref once in `apply` mode. Require the
workflow to regenerate and bind the approved plan, source, and complete count
object; pass a fresh empty-target preflight; pass the full rollback canary;
commit once; and pass independent post-commit readback.

Afterward, dispatch the same preserved ref in `readback` mode only. This is the
zero-row idempotency rerun: it rebuilds the exact source-derived plan, compares
all planned projections with durable production state, and has no writer step.
The single-use `apply` authority was not reused.

## Alternatives Rejected

- Dispatching from current `main`: it was not the approved producer.
- Recomputing authority from the live plan: the operation may not authorize
  itself.
- Running `apply` a second time: the writer is intentionally insert-only, and
  the authorization cannot be reused for another durable apply.
- Activating visibility with the payload: publication remains a separate gate.
- Treating aggregate `database_rows_written` telemetry as stronger than exact
  table projections: the aggregate currently includes a derived metric.

## Authorized Payload

The durable transaction inserted exactly:

| Boundary | Rows |
| --- | ---: |
| Families | 237 |
| Variants | 2,904 |
| Candidates | 2,904 |
| Reviews | 2,904 |
| Mappings | 2,904 |
| Evidence | 14,070 |
| Qualifications | 2,779 |
| Frozen releases | 1 |
| Release members | 2,182 |
| MTG release pointers | 1 |

The nine insert tables contain `30,885` rows in total. The separate pointer
operation created one MTG pointer, for `30,886` durable row writes across the
authorized boundary.

`qualification_holds: 144` is a derived status count within the 2,779
qualification rows. It is not a separate table or additional insert class.

## Durable Apply Proof

- Workflow run: `33828154527`
- URL:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33828154527`
- Result: `success`
- Producer SHA:
  `800d41e65fbaaaf52f1e32b5cde1ae0367e1a976`
- Started: `2026-09-04T02:04:36Z`
- Completed: `2026-09-04T02:28:02Z`
- Apply status: `mtg_sealed_world_applied_and_verified`

The run passed, in order:

1. exact producer and contract verification;
2. live plan regeneration;
3. separate plan/source/count authority binding;
4. fresh production read-only preflight with an empty MTG target;
5. full rollback canary with zero residue;
6. the single durable transaction and transaction-local exact readback;
7. independent post-commit exact readback;
8. immutable evidence upload.

Every durable projection read back exactly:

- families: `true`;
- variants: `true`;
- candidates: `true`;
- reviews: `true`;
- mappings: `true`;
- evidence: `true`;
- qualifications: `true`;
- releases: `true`;
- members: `true`.

The frozen MTG release is
`25626032-7d72-5542-a8e0-7a6532c2f776`, with manifest fingerprint
`2455c752047c27993d8afb826223cb72474f7d9214fdfa86855321410b46f9e3`
and expected member count `2,182`.

The pointer readback is:

- `game_key: mtg`;
- `release_id: 25626032-7d72-5542-a8e0-7a6532c2f776`;
- `previous_release_id: null`;
- `pointer_contract_version: CROSS_TCG_SEALED_PRODUCT_RELEASE_POINTER_V2`.

## Zero-Row Idempotency Rerun

- Workflow run: `33829699266`
- URL:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33829699266`
- Result: `success`
- Producer SHA:
  `800d41e65fbaaaf52f1e32b5cde1ae0367e1a976`
- Started: `2026-09-04T02:29:17Z`
- Completed: `2026-09-04T02:36:28Z`
- Status: `mtg_sealed_readback_passed`
- Database writes: `0`

All apply/migration/canary writer stages were skipped. The rerun regenerated
the same plan and source fingerprints, returned exact projections for all nine
payload tables, returned the same MTG pointer and frozen release, and wrote no
rows.

The plan payload gzip and readback summary are byte-identical between the apply
run and the separate readback run:

- `sealed_world_plan.json.gz` SHA-256:
  `c650f5b410912512cb7b0b70579b9d0f4ee8de651ee97400fdf10dfc075f6f87`;
- readback `summary.json` SHA-256:
  `d9e48950566f4ca8fdd541a9a07f9745ca68607884f243fdb25a59eb903a29b3`.

## Isolation And Visibility Proof

- One Piece boundary SHA-256 before and after:
  `83e84e94755dce0dbecf5f02be2c25fa4c9ef2517c98dbe8f95225de5000be03`.
- One Piece unchanged: `true` in transaction readback, apply readback, and the
  separate zero-write rerun.
- Hidden governed MTG RPC rows returned: `0` in every post-apply readback.
- MTG sealed visibility was not activated.
- Cards, sets, Storage, image pointers, pricing publication, Vault, One Piece,
  updates, deletes, and cleanup remained outside the operation.

## Artifact Hashes

GitHub retained immutable artifacts named:

- `mtg-sealed-apply-33828154527`;
- `mtg-sealed-readback-33829699266`.

Key SHA-256 values from the apply artifact are:

- apply `summary.json`:
  `8bab1b2b19bdb6d003fc055f0e3813ee1953bc040430b73cb04c3527b0bdfe29`;
- apply `run_plan.json`:
  `20965a653db5149c561b6978d411e86bf8c0b7885f3bac227bce361cfa11bb43`;
- fresh preflight `summary.json`:
  `1aea2bbf15bfe2f439a4c7bcf3f89f20ff7c478eff90cd3d2d8365e6e0df8fb3`;
- rollback canary `summary.json`:
  `e320f220183e84ad1e508cc6e8abe0d8677cca50d69fbee4ebaa04fccddc3e6f`;
- independent readback `summary.json`:
  `d9e48950566f4ca8fdd541a9a07f9745ca68607884f243fdb25a59eb903a29b3`.

## Telemetry Finding

The apply summary reports `database_rows_written: 31029`. That field is
arithmetically wrong: its implementation sums every value in `plan.counts`, so
it counts the derived `qualification_holds: 144` as inserted rows and does not
include the pointer operation.

This is a reporting defect, not a production data mismatch. Exact projection
readback proves `30,885` table inserts plus one pointer. No extra qualification
rows or other out-of-scope rows were written. The defect must be repaired and
covered by a contract test before this writer pattern is reused for another
sealed-world durable apply.

## Current Truths

- The exact approved MTG sealed payload is durably present in production.
- The release is frozen and contains exactly 2,182 members.
- The MTG per-game release pointer targets that frozen release.
- MTG sealed remains hidden from the governed client RPC.
- One Piece remains byte-stable by boundary hash.
- The separate post-commit rerun reproduced the exact plan and exact readback
  with zero database writes.
- The single-use apply authorization is consumed.
- No pricing publication, images, Storage, Vault, or client rollout occurred.

## Invariants

- This authority and its fingerprints may never be reused for another apply.
- Frozen release membership must remain immutable.
- MTG and One Piece sealed state must remain game-isolated.
- Visibility and pricing publication remain separately authorized operations.
- Any future sealed writer must distinguish payload-row counts from derived
  diagnostic counts and pointer writes.
- Exact table projections and boundary hashes remain the authoritative
  reconciliation evidence.

## What Must Never Be Broken

- Canonical cards, sets, and printing identity.
- One Piece sealed rows, release membership, and pointer.
- Service-only write authority and the hidden-before-release boundary.
- Exact TCGPlayer source lineage and immutable evidence.
- Transaction rollback on any drift or projection mismatch.
- The prohibition on implicit publication, image mutation, Vault mutation,
  updates, deletes, or cleanup.

## Explicit Next Gate

Do not activate MTG sealed visibility or pricing automatically.

First, repair the aggregate write-count telemetry on a separate code branch and
add a regression proving that derived qualification diagnostics are not counted
as inserted rows and the pointer is reported separately. That repair requires
no production data mutation.

Any later Storage/image work, pricing publication, or signed-in visibility
activation requires its own bounded plan, production preflight, rollback proof,
and explicit authority tied to new fingerprints.

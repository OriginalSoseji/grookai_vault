# Pricing Checkpoint 74: One Piece ST-01 Printing And Image Mutation Plan Frozen

## Current Truth

The offline mutation package for the 17 durably applied English One Piece ST-01
numbered-card parents is frozen and content-addressed. The package proposes:

- `17` parent artwork-pointer updates;
- `14` normal `card_printings` inserts;
- `14` exact TCGPlayer `external_printing_mappings` inserts;
- `3` preserved source-foil taxonomy blockers; and
- `0` child image-pointer writes.

No database or Storage access occurred. No mutation was executed.

## Frozen Producer

- Commit SHA: `400498b8827d6d4d3197929836eed82d82fe84ce`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Plan version: `ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_V1`
- Plan fingerprint:
  `3aef93b51bb1c376ead251a8dc0e8422795573215abe01f250bbdb734fb2587c`
- Mutation payload fingerprint:
  `a4eadd4738aaa515579733bdbd66fa7ae73a0412cf8e43c4efa0004e74bef6c7`
- Status: `frozen_offline_plan_no_database_access`
- Findings: `0`

## Context And Problem

Checkpoint 73 proved that all 17 parent artwork pointers and 14 normal child
printings are ready, while three foil products remain blocked by finish
taxonomy. Production mutation was still unsafe because the intended rows,
allowed columns, transaction attribution, rollback readback, and zero-residue
proof had not been frozen as one immutable package.

## Decision

The mutation package is now exact and fail-closed:

- `card_prints`: exactly `17` updates and no inserts or deletes;
- `card_printings`: exactly `14` inserts and no updates or deletes;
- `external_printing_mappings`: exactly `14` inserts and no updates or deletes;
- parent updates may change only `image_source`, `image_path`, `image_status`,
  `image_note`, and `data_quality_flags`;
- every proposed child image field remains null;
- the three source-foil rows have no proposed child or mapping row; and
- no execution mode, approval environment, database client, or Storage client
  exists in the plan generator.

## Risk And Alternatives Rejected

The principal risks are mutating canonical identity while setting artwork
pointers, inventing One Piece foil taxonomy, copying parent artwork into exact
child image fields, leaving rollback residue, or allowing an unattributed write.

Rejected alternatives:

- translating One Piece `foil` to Pokemon `holo`;
- creating all 17 child printings before foil taxonomy is governed;
- assigning parent artwork as finish-specific child evidence;
- using upsert or update authority on child and mapping tables;
- executing directly from the readiness audit without a frozen plan; and
- treating transaction rollback as sufficient without an independent
  post-rollback zero-residue readback.

## Invariants

- The 17 existing parent identities remain unchanged.
- `image_pointer_deferred` changes from true to false only for the 17 proposed
  parent pointer updates.
- `exact_printing_children_deferred` remains true.
- Child image URL, source, path, status, and note fields remain null.
- `ST01-001`, `ST01-012`, and `ST01-013` remain foil blockers.
- One Piece remains hidden from anonymous, authenticated, and service release
  surfaces.
- No DON!!, sealed, pricing, publication, Vault, Pokemon, Japanese, or MTG row
  is in scope.

## Rollback-Only Contract

A future production canary must:

1. bind the exact producer SHA, plan fingerprint, and mutation payload
   fingerprint;
2. pass a fresh collision and baseline preflight;
3. begin one transaction and perform only the exact `17 / 14 / 14` footprint;
4. prove transaction-local attribution and exact proposed-state readback;
5. roll back unconditionally;
6. independently prove the original null-pointer, zero-child, zero-mapping
   baseline; and
7. emit no durable apply or commit mode.

Any mismatch must stop the canary and preserve all raw evidence.

## Validation

- Focused mutation-plan contracts: `8 / 8` passed.
- Full One Piece contract suite: `158 / 158` passed.
- Full repository contracts: `1,953 / 1,953` passed.
- Flutter tests: `614 / 614` passed.
- Web typecheck, lint, and strict production build: passed.
- Strict build also passed with failed sitemap source fetches by emitting bounded
  valid sitemap fallbacks.
- Flutter analysis: passed.
- Release secret guard: passed.
- Commit and push shipchecks: passed.
- Artifact reconciliation mismatches: `0`.

## Artifact Integrity

- `mutation_plan.json` SHA-256:
  `a66452042df00e0ea2673cbeb0845040619de3ea85fbbc2c3a138eaa15e3382c`
- `summary.json` SHA-256:
  `d26786325b31a640268e61d447fa5bfb543208259976020a63b71e7e6ae8424e`
- `REPORT.md` SHA-256:
  `9c33eb0c8326ecb53b44d13074666383ec3dc33c38ded34b65c6b9739158be58`
- `artifact_hashes.json` SHA-256:
  `4e1903986803f5867a60f2a9483d3f104fe4093713de49a10eb3d8b3415ea9aa`

## Artifacts

- Frozen offline plan:
  `docs/audits/pricing/one_piece_st01_printing_image_mutation_plan_v1/frozen_offline_plan_v1/`
- Governing readiness audit:
  `docs/audits/pricing/one_piece_st01_printing_image_readiness_v1/production_read_only_v1/`
- Prior readiness checkpoint:
  `docs/checkpoints/pricing/PRICING_CHECKPOINT_73_ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_PASSED.md`

## Exact Next Gate

Implement a guarded rollback-only production canary and a separate independent
post-rollback verifier from this frozen plan. That gate may perform the exact
transaction temporarily, but it must always roll back and prove zero residue.

Do not perform a durable apply, create the three foil children, write child
image pointers, alter visibility, publish pricing, promote DON!! or sealed
products, or mutate Vault data in that gate.

# Pricing Checkpoint 73: One Piece ST-01 Printing And Image Readiness Passed

## Current Truth

The 17 durably applied English One Piece ST-01 numbered-card parents have now
passed a fresh production read-only child-printing and image-pointer readiness
audit.

The result is intentionally split by evidence authority:

- `17 / 17` parent artwork pointers are ready for a separately authorized gate.
- `14 / 17` exact normal child printings are ready for a separately authorized
  gate.
- `14 / 17` exact TCGPlayer child mappings are ready with those normal children.
- `3 / 17` source-foil children remain blocked by finish taxonomy.
- `0 / 17` finish-specific child image pointers are authorized.

No production rows or Storage objects changed during this audit.

## Frozen Producer

- Commit SHA: `2d40da1cb78bd5d3f53f30924ced7e4abefc136e`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Evidence-plan fingerprint:
  `ed64eb0c2c7496816640811ff41739b017778415e8446611cde9e4db8b421980`
- Production-readiness fingerprint:
  `430a9b54a5820078934fbf6900cc6ebc7073c86514ed912cb10af26a679251b1`
- Audit status: `pass_with_expected_finish_taxonomy_blockers`
- Unexpected findings: `0`

## Evidence Decision

The frozen TCGPlayer source price lane provides one exact source finish subtype
for each numbered product:

- `normal`: `14`
- `foil`: `3`

The three source-foil rows are:

- `ST01-001` Monkey.D.Luffy
- `ST01-012` Monkey.D.Luffy
- `ST01-013` Roronoa Zoro

The live `finish_keys` registry contains `normal`, `holo`, and `foil`, but the
current `foil` key is explicitly scoped to MTG by
`MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1`. The audit therefore did not use that
key for One Piece and did not translate One Piece `foil` to Pokemon `holo`.

The 17 official English Bandai images independently prove exact parent artwork
identity. Their immutable self-hosted objects passed the earlier byte/hash
readback. Those images do not prove physical finish, so they qualify only as
parent artwork pointers. They do not qualify as exact normal or foil child
images.

## Candidate Scope

### Parent Artwork Pointers

All 17 parents are eligible for a future guarded pointer update using:

- `image_source = official_one_piece_card_game`
- the existing immutable self-hosted `image_path`
- `image_status = exact`
- an explicit note that the asset proves artwork identity, not physical finish

The future pointer package must clear `image_pointer_deferred` while preserving
`exact_printing_children_deferred` until all finish children are resolved.

### Normal Child Printings

Fourteen source-normal products are eligible for future non-provisional
`card_printings` rows with:

- `finish_key = normal`
- deterministic child UUID
- `printing_gv_id = <parent GV-ID>-STD`
- exact TCGPlayer source-price-lane provenance
- no child image fields

Each is also eligible for one deterministic exact TCGPlayer
`external_printing_mappings` row. No price or publication authority follows from
that mapping.

### Foil Children

The three source-foil products remain blocked. Before they can become children,
Grookai must explicitly extend the finish vocabulary/contract to authorize
`foil` for One Piece or introduce another source-proven One Piece finish key.
That decision requires its own migration and contract gate. `holo` is not an
acceptable implicit substitute.

## Production Readback

- Existing ST-01 child printings: `0`
- Existing ST-01 external printing mappings: `0`
- Parent image fields already populated: `0`
- Proposed child-ID collisions: `0`
- Proposed printing-GV-ID collisions: `0`
- Proposed parent/normal-finish collisions: `0`
- Proposed printing-mapping-ID collisions: `0`
- Proposed TCGPlayer printing-mapping collisions: `0`
- Existing references to the 17 proposed image paths: `0`
- Blocking database sessions: `0`
- Transaction read-only: `true`
- Release status: `hidden`
- Anon visibility: `false`
- Authenticated visibility: `false`
- Service visibility: `false`

## Preserved Boundaries

- Database writes: `0`
- Storage writes or deletes: `0`
- Image-pointer writes: `0`
- Child-printing writes: `0`
- Pricing or publication writes: `0`
- Vault or ownership writes: `0`
- App visibility changes: `0`
- DON!! or sealed promotion: `0`
- Pokemon, Japanese, MTG, or existing canonical mutation: `0`

## Validation

- Focused readiness contracts: `6 / 6` passed.
- Full One Piece contract suite: `150 / 150` passed.
- Repository shipcheck: passed twice, for commit and push.
- Runtime critical failures: `0`.
- Web typecheck, lint, and strict build: passed.
- Flutter analysis: passed.
- Flutter tests: `614 / 614` passed.
- Release secret guard: passed.
- Artifact reconciliation mismatches: `0`.
- Readiness JSONL rows: `17 / 17`.

## Artifact Integrity

- Summary SHA-256:
  `b08b96c320b0c509bf3061729091265339ccc51c10b4cb7d026f12a973997578`
- Production readback SHA-256:
  `114281953ff2fb57834dbfc5db7c15369e72b35b8514feceacb1c5f1c8de3b04`
- Artifact hash manifest SHA-256:
  `42ed13b168b5b844bc05afe603b2fb79f512eab3802cd98aa8591ac5bdd8abe1`

## Artifacts

- Read-only readiness audit:
  `docs/audits/pricing/one_piece_st01_printing_image_readiness_v1/production_read_only_v1/`
- Prior durable parent proof:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/independent_post_apply_v1/`
- Prior immutable Storage proof:
  `docs/audits/pricing/one_piece_st01_storage_permanent_readback_v1/st01_18_objects_v1/`

## Work Remaining For This ST-01 Step

1. Freeze an offline guarded mutation plan for exactly 17 parent artwork-pointer
   updates, 14 normal child inserts, and 14 external printing-mapping inserts.
2. Add exact transaction-attribution, rollback, readback, collision, and
   zero-residue tests for that package.
3. Run a separately governed rollback-only production canary from a clean frozen
   commit.
4. Obtain explicit durable authorization before any pointer, child, or mapping
   write.
5. Independently verify any durable write and keep One Piece hidden.
6. Define and migrate an explicit One Piece foil taxonomy in a separate gate.
7. Create and verify the remaining three foil children only after that taxonomy
   is authoritative.
8. Acquire finish-specific images later if exact child-image evidence becomes
   available. Parent artwork remains the lawful fallback until then.

## Exact Next Gate

Build the offline guarded mutation plan for the 17 parent artwork pointers, 14
normal child printings, and 14 TCGPlayer child mappings. The plan must contain no
execution mode, must preserve the three foil blockers and all child image fields
as null, and must define exact rollback-only transaction attribution before any
production mutation is proposed.

Do not enable One Piece visibility, pricing, publication, Vault use, DON!!
promotion, sealed promotion, or the three foil children in that gate.

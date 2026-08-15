# Pricing Checkpoint 72: One Piece ST-01 Durable Apply Verified

## Current Truth

The separately authorized English One Piece ST-01 numbered-card canonical
payload is durably applied and independently verified in production.

Production now contains one hidden ST-01 set, 17 canonical parent cards, 17
active print identities, 17 source-evidence rows, and 17 exact TCGPlayer parent
mappings. One Piece remains hidden from anon, authenticated, and service
catalog requests.

## Authorized Execution

- Apply producer SHA:
  `ad9d7b1d6e87277edc07f2a60d7c21d6cb88cc9a`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Applied at: `2026-08-15T02:10:05.992Z`
- Apply-plan fingerprint:
  `6c09e30e1982b24f0eccf1437269db7747e31190669671f0a753413567cf3d7a`
- Payload fingerprint:
  `2cc2e7b308796cc681c0c863f08ada835806d6cbb4596d7880f5cd25ac78cb86`
- Authorized preflight fingerprint:
  `41204a27e7c487e20dbc731d848c547ed531f019483f7eb82d3f7113d984e630`
- Writer status: `durable_apply_committed_and_readback_passed`
- Committed: `true`
- Writer findings: `0`

## Exact Transaction Attribution

| Table | Inserts | Updates | Deletes | Hot updates |
| --- | ---: | ---: | ---: | ---: |
| `sets` | 1 | 0 | 0 | 0 |
| `card_prints` | 17 | 0 | 0 | 0 |
| `card_print_identity` | 17 | 0 | 0 | 0 |
| `card_print_identity_source_evidence` | 17 | 0 | 0 | 0 |
| `external_mappings` | 17 | 0 | 0 | 0 |

No other public table had an attributable write.

## Writer Readback

- ST-01 set rows: `1 / 1`
- Parent card rows: `17 / 17`
- Active identity rows: `17 / 17`
- Source-evidence rows: `17 / 17`
- Exact TCGPlayer mappings: `17 / 17`
- Release status: `hidden`
- Anon visibility: `false`
- Authenticated visibility: `false`
- Service visibility: `false`
- Fresh apply preflight transaction read-only: `true`

Every persisted row matched the frozen payload byte-for-byte after normalized
database readback.

## Independent Verification

- Verified at: `2026-08-15T02:10:17.579Z`
- Status: `fresh_read_only_post_apply_verification_passed`
- Findings: `0`
- Transaction read-only: `true`
- Independently verified set/card/identity/evidence/mapping rows:
  `1 / 17 / 17 / 17 / 17`
- Independently verified visibility:
  `hidden / false / false / false`

The independent verifier reconciled the frozen promotion plan, durable apply
plan, execution summary, transaction-local attribution, writer readbacks, and a
new production readback.

## Preserved Boundaries

- Child `card_printings` written: `0`
- DON!! rows written: `0`
- Sealed rows written: `0`
- Storage objects written or changed: `0`
- Image pointers written: `0`
- Pricing or publication rows written: `0`
- Vault or ownership rows written: `0`
- Existing rows updated or deleted: `0`
- App visibility enabled: `false`
- Pokemon, Japanese, MTG, and existing canonical data changed: `false`

The 18 previously uploaded self-hosted objects remain evidence only. This gate
did not authorize the new parent rows to reference them.

## Artifact Integrity

- Execution run-plan SHA-256:
  `076a643d9c726b19f860daa2eefd4b885d74ae2b1a8933e54ed39cadf852afec`
- Execution summary SHA-256:
  `42bb5d77726ee272a6c84cf093098713da94685e9d4f7b44828fa8936bf28f73`
- Execution hash manifest SHA-256:
  `6969a1c750951926b89cb2e6594e0e789502690c89000a20b915f4d569f5b706`
- Independent readback SHA-256:
  `93214d2eedc722bb26f48f9306e064172e105b98c7e6eeb685135c487eaceaac`
- Independent summary SHA-256:
  `1446e17ba5b806059c1edd958b3c93349d085a6b1001243352a921f783508015`
- Independent hash manifest SHA-256:
  `3e6e4f4dabcb14828be9b8fb56b92a81031324fe639d2f6a094eedd5654b62e6`

## Validation Inherited From The Frozen Gate

- Durable apply contracts: `8 / 8` passed.
- Full One Piece contract suite: `144 / 144` passed.
- Repository shipcheck: passed.
- Web typecheck, lint, and strict build: passed.
- Flutter analysis: passed.
- Flutter tests: `614 / 614` passed.
- Runtime critical failures: `0`.

## Artifacts

- Durable execution:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/durable_apply_execution_v1/`
- Independent post-apply verification:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/independent_post_apply_v1/`
- Frozen readiness gate:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/durable_apply_ready_v1/`

## Exact Next Gate

Perform a read-only ST-01 printing and image-pointer readiness audit. Determine
whether source evidence supports one exact base printing child per numbered
parent, preserve any unresolved finish or variant ambiguity, and reconcile each
candidate to its existing immutable self-hosted image object. Produce a
separate rollback-only plan before proposing any child-printing or pointer
write. Do not enable One Piece visibility, pricing, publication, Vault use,
DON!! promotion, or sealed promotion in that gate.

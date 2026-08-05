# Japanese Master Index V4 Database Apply Completion V1

Date: 2026-08-05

## Context

Japanese Master Index V4 had a frozen, collision-free, insert-only payload
for 5,336 Japanese parent card identities. Migration version
`20260805100000` was already durably applied and the complete payload had
passed a production rollback proof.

The durable payload apply was executed from branch
`catalog/jpn-v4-production-integration-v2` at frozen producer commit
`d9dc0990bdae654fe3878a4fc9e4460e0604180b` after the user supplied the
writer's exact approval message.

## Approved Boundary

The approval covered only:

- 1,041 set rows
- 5,336 parent `card_prints` rows
- 5,336 `card_print_identity` rows
- 5,461 `card_print_identity_source_evidence` rows
- 5,336 `card_print_family_review_queue` rows

It explicitly excluded public child printings, Storage writes, image
repoints, family promotion, English or non-Japanese mutation, pricing, vault,
cleanup, quarantine, deletion, truncation, and all rows outside this payload.

## Frozen Inputs

- Writer payload fingerprint:
  `b11c033901f8cb94b641f2c6e7f3586a3db2bc994242f7d8aa28cb2198218e2c`
- Source preflight fingerprint:
  `b269de1cae5bb83113e9b88f27400613fca92508c681950861c62213cd6ec36b`
- Migration version: `20260805100000`
- Migration SQL SHA-256:
  `2cd8c70026d74296a469afdb5017944bb37c3a640e064288e4d55d140c037fb6`

## Apply Proof

- Writer status: `payload_applied_and_read_back`
- Transaction readback exactly matched all five approved row counts.
- Durable readback exactly matched all five approved row counts.
- Pre-apply collision count was zero for every target table.
- The active English family combined fingerprint remained
  `163a3ffaa8c9023d02475e2be587ccd254eb7ed24b67b947db7f8d29c75a6142`
  before and after the transaction.
- The writer reports no deletes, truncates, public-child writes, Storage
  writes, image writes, family promotion, English mutation, non-Japanese
  mutation, pricing mutation, or vault mutation.
- A post-apply read-only schema-history preflight reports
  `schema_and_history_equivalent`, one local ledger row, one production
  ledger row, exact contract equivalence, and no findings.

The first command invocation used an incorrect approval environment-variable
name and failed before opening the approved write path. It made no database
change. The successful invocation used
`JPN_V4_PAYLOAD_V2_APPLY_APPROVAL` with the exact approved message.

## Artifact Hashes

- `payload_writer_v2/jpn_payload_writer_v2.json`:
  `36fba721b2bee7952b82536907aff4f271b3f1c980788c31875403e6d29c7589`
- Payload writer content fingerprint:
  `8a871ebc28bf495ef574dbcaee943dd95e591697a65272ce73535d4b78422634`
- `schema_history_preflight_v1/jpn_schema_history_preflight_v1.json`:
  `025a5dacdc8b1452cd81e3420153a5dc88393e714ba47bddbd148a11dc85512e`
- Schema-history preflight content fingerprint:
  `9b9dbd68876223a6ade4c127bff0dce635b39d47910602c5680da720503a10ad`

## Verification

- Japanese Master Index contract suite: 128/128 passed before apply.
- Writer and preflight syntax checks passed.
- Post-apply schema/history verification passed.
- `git diff --check` passed for the permanent evidence update.

The repository-wide pre-commit shipcheck could not complete in this isolated
worktree because `SUPABASE_DB_URL` is intentionally absent there. Its release
secret guard passed before the environment-dependent preflight stopped. The
targeted Japanese tests and live guarded writers used the external approved
environment file.

## Current Truths

- The Japanese V4 parent identity payload is durably present in production.
- Family-review rows remain review data and are not promoted family facts.
- Public child printing rows remain deferred.
- V4 did not self-host or repoint images.
- V4 did not make the new parents publicly visible through product surfaces.
- Existing English canonical-family state is unchanged.

## Invariants

- V1 deterministic IDs must not change.
- Parent identity evidence must not be converted into finish or child-printing
  claims without printing-level evidence.
- Family review must remain separate from promoted canonical family facts.
- Public visibility, image hosting, pricing, vault, scanner, and search work
  require separate bounded gates.
- No follow-up process may rewrite, merge, or delete these rows merely to
  simplify publication.

## Explicit Next Gate

Build a read-only product-integration inventory for the newly applied parent
rows. Quantify image-hosting coverage, public child-printing eligibility,
family-review dispositions, and existing search/scanner visibility without
writing any of those layers. Use that inventory to define the next bounded
project rather than automatically publishing all 5,336 parents.

## Stop State

The approved Japanese V4 database apply is complete. The parent identity,
evidence, and review layers are durable and reconciled. Public printings,
self-hosted images, family promotion, and product-surface integration remain
deliberately incomplete and were not authorized by this apply.

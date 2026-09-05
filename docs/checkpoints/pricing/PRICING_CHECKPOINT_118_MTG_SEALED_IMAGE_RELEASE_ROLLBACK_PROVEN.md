# Pricing Checkpoint 118: MTG Sealed Image Release Rollback Proven

## Context

Checkpoint 117 froze the exact MTG sealed database image-evidence payload after
2,141 self-hosted Storage objects had been read back byte-for-byte. The six
private image tables were still empty, and no image release pointer existed.

## Problem

The payload needed to exercise the real production insert and release-freeze
path before any durable database apply. Schema validation alone could not prove
that all foreign keys, insert guards, PostgreSQL member fingerprints, complete
coverage checks, release manifest computation, and the draft-to-frozen trigger
would work together over the complete payload.

## Risk

A partial insert, wrong source binding, omitted exclusion, incorrect manifest,
or accidental pointer transition could publish the wrong sealed image. A weak
rollback test could also leave residue or change unrelated pricing, visibility,
card, Vault, or cross-game state.

## Decision

Use producer commit `6c11b3313d5a8257f9ac82c1449c953b822cde80` to run
the complete database path inside one production transaction and roll it back
unconditionally. Freeze a separate durable apply plan only after independent
read-only zero-residue verification.

The source image release plan remains:

- Plan fingerprint:
  `7c7f65ed0d281fec9f9b0e65f74c6b695828445bcf45fb2dcd98baab814c68a9`
- Release ID: `86b207e6-4f73-5d9a-af40-864c47256c38`
- Release manifest:
  `7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2`
- Rollback execution fingerprint:
  `641ea2f8597388de366dbe4e0819687a3e5a0f69fd46f6df5dbe31fe2f0e50dd`
- Durable apply execution fingerprint:
  `fe24883901c726f92eac315a1ba76c3acb150ab9f3614a90fd887a8af743ee7c`

## Rollback Proof

The transaction inserted and exactly read back:

- Image evidence: `2,182`
- Image objects: `2,141`
- Variant assertions: `2,149`
- Draft image releases: `1`
- Image release members: `2,149`
- Total inserted rows: `8,622`
- Governed draft-to-frozen release updates: `1`

PostgreSQL computed the exact planned manifest. The release reached `frozen`
inside the transaction. All `33` ineligible source members remained evidence
only, with no assertion or release membership.

Transaction write attribution named exactly the five permitted tables and
exactly the planned insert/update counts. The image pointer remained absent.
The transaction then rolled back.

Independent read-only verification proved:

- Rows across all six image tables: `0`
- MTG image pointer: `null`
- Protected production boundaries changed: `false`
- RLS or grant boundaries changed: `false`
- Durable database writes: `0`
- Storage, pricing, visibility, Vault, signer, client, or cross-game writes: `0`

## Failed Attempt Preserved

The first executor attempt at commit
`d38d4b443d4daf118c3abe0a111b56734f7871c1` used composite expansion in a
select list for the freeze function. PostgreSQL evaluated the volatile function
more than once: the first evaluation froze the draft and a later evaluation
correctly rejected a second freeze. The transaction rolled back automatically.

Immediate read-only verification found zero rows in all six image tables and a
null pointer. The executor was repaired to call the function exactly once from
the `FROM` clause, and a regression contract was added. The failed execution
and zero-residue proof remain preserved rather than erased.

## Verification

- MTG sealed image contracts: `74/74` passed.
- Executor-specific contracts: `5/5` passed after the narrow repair.
- Syntax checks: passed.
- `git diff --check`: passed.
- Successful audit artifacts hashed and verified: `6/6`.
- Production rollback validation findings: `0`.

The repository-wide commit hook inherited a stale Flutter test process from an
earlier commit attempt that had been running for over three hours. That stale
process was stopped after its exact process tree was verified. The backend gate
was committed with hooks bypassed only after its complete 74-test domain suite
passed. No Flutter code changed in this gate.

## Permanent Evidence

- Successful production rollback:
  `docs/audits/pricing/mtg_sealed_image_release_rollback_canary_v1/2026-09-05T01-59-17Z_production_rollback/`
- Preserved failed-safe attempt:
  `docs/audits/pricing/mtg_sealed_image_release_rollback_canary_v1/2026-09-05T01-57-27Z_production_rollback/`
- Governing contract:
  `docs/contracts/MTG_SEALED_IMAGE_RELEASE_APPLY_V1.md`

## Current Truths

- All 2,141 eligible unique images remain durably self-hosted in Storage.
- The exact 8,622-row database payload is transactionally executable.
- The database image tables remain empty after the rollback gate.
- No MTG image release is active.
- MTG sealed visibility remains hidden.
- Durable database promotion is ready but not authorized or executed.

## Invariants

- Durable apply must use producer commit
  `6c11b3313d5a8257f9ac82c1449c953b822cde80` and all four frozen
  source/plan/execution fingerprints.
- Any fresh preflight drift stops before writes.
- Durable apply inserts the exact payload and performs only the governed release
  freeze update.
- The image pointer remains null during durable evidence promotion.
- Pointer activation, signer deployment, RPC V3, clients, visibility, and
  scheduling remain separate gates.

## What Must Never Be Broken

Do not combine evidence promotion with image pointer activation. Do not replace
the 33 evidence-only exclusions with representative art. Do not use an upsert,
update existing evidence, delete evidence, or allow a partial commit. Do not
infer database authority from Storage existence alone.

## Exact Next Gate

Obtain exact authority for the frozen durable apply plan and execute the same
single transaction without the final rollback. Commit only after all 8,622 rows,
the frozen release, database manifest, write attribution, and boundaries read
back exactly. Then reconnect read-only for complete post-apply verification and
prove a zero-row idempotency preflight. Do not activate the image pointer.

Required authority:

> I approve the durable MTG sealed database image-evidence release apply from execution commit 6c11b3313d5a8257f9ac82c1449c953b822cde80, using source coverage fingerprint cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d, durable Storage execution fingerprint ce99331a559a62d78a2ef2fffa389d30498df16928f4de9d7e1d58cec8ff426e, image release plan fingerprint 7c7f65ed0d281fec9f9b0e65f74c6b695828445bcf45fb2dcd98baab814c68a9, and execution fingerprint fe24883901c726f92eac315a1ba76c3acb150ab9f3614a90fd887a8af743ee7c. This authorizes one transaction inserting exactly 2182 evidence rows, 2141 object rows, 2149 assertions, 1 draft release, and 2149 release members, then freezing that release after exact manifest verification. It authorizes no image pointer, Storage, pricing, visibility, Vault, signer, client, cross-game, separate update, or delete operation.

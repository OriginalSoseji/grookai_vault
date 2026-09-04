# MTG Sealed Image Schema Candidate V1

**Status:** Offline candidate; unapplied

**Date:** 2026-09-04

## Purpose

Translate the completed 2,182-member Gate A coverage audit into a reviewable
sealed-image database and transient-canary design without applying a migration,
calling Storage, changing prices, or activating MTG sealed visibility.

## Frozen Input

- Producer: `e616615883cb808ad8c870380d9d52da4a4d80bf`
- Release: `25626032-7d72-5542-a8e0-7a6532c2f776`
- Coverage fingerprint:
  `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`
- Eligible members: `2,149`
- Explicit exceptions: `33`

## Candidate Model

The SQL remains outside `supabase/migrations` at
`docs/sql/mtg_sealed_image_evidence_and_release_v1_migration_candidate.sql`.
It proposes six service-owned resources:

1. append-only exact source retrieval evidence;
2. append-only content-addressed self-hosted object readback evidence;
3. append-only exact variant-to-evidence-to-object assertions;
4. immutable game-scoped image releases bound to one frozen price release;
5. immutable image release members;
6. a game-scoped compare-and-swap image release pointer.

Shared bytes may produce one object row, but every sealed variant retains its
own evidence and assertion. A release-member insert is accepted only when the
assertion is exact and its source evidence points back to the same variant and
mapping in the bound frozen price release.

An assertion insert also requires exact parity between retrieval evidence and
the selected self-hosted object for content SHA-256, MIME type, width, height,
and byte count. Matching game identity alone is insufficient. Image releases
can be created, populated, and frozen only while their exact source price
release is already frozen.

## Security

- Every proposed table enables and forces RLS.
- All table privileges are revoked from `public`, `anon`, and `authenticated`.
- Only `service_role` receives the minimum select/insert or function execution
  privileges.
- Evidence, objects, assertions, and release members are append-only.
- Releases permit only the exact draft-to-frozen transition.
- The pointer changes only through a game-scoped compare-and-swap function.
- No client RPC is created in this candidate.
- Source image URLs never become client image URLs.

## Transient Canary Plan

The deterministic planner chooses 17 unique image byte objects from exact
eligible rows, stratifies package forms, and includes a shared-byte case when
available. Every proposed path is under a separate canary prefix and must be
absent before upload. A future execution must use `upsert=false`, read back
exact bytes, remove only objects created by that execution, and verify all are
absent afterward.

The planner itself reads only the permanently preserved compressed coverage
artifact. Before selecting rows, it verifies compressed and uncompressed file
hashes and sizes against the permanent manifest, verifies the preserved
summary, and recomputes the logical coverage fingerprint from all 2,182 rows.
It performs zero provider, database, or Storage calls.

## Boundaries

This candidate authorizes no migration promotion or apply, database write,
Storage read/upload/delete, image assertion or pointer, price refresh,
release-pointer change, visibility activation, client deployment, Vault write,
anonymous access, cleanup, or destructive operation.

## Exact Next Gate

Review the candidate SQL, its hash, the 17-object transient plan, and focused
tests. A later migration promotion and a later transient Storage execution are
separate authorities. Neither is implied by this contract.

# Collector Set Binder Replay V1

Date: September 11, 2026. Status: local candidate, not production authority.
Continuation of the authenticated collector staging work requested by the founder.

## Boundary

Build the missing Set Binder path without changing the approved design. Schema
experiments run only in a newly created, named local replay database. Do not reset
or apply schema to the existing 326-card sample. No production access, linked
migration push, worker, deployment or real checklist activation is authorized.
The global Set Binder client flag remains off pending full release verification.

The linked migration audit script explicitly targets REMOTE. It is not the preflight
for this isolated replay. Record local schema hashes and replay results instead;
the normal strict linked audit and full migration replay are still required before
any future production migration. Do not label this candidate a production migration.

## Required Authority

- Raw printing presence is not a master-set denominator.
- A service-only immutable release records reviewed required slots, set ID, source
  evidence reference/hash and expected count. A separate pointer selects a release.
- Every slot is an exact non-provisional child or an explicitly authorized parent
  fallback with no non-provisional children. One slot per identity; no overlap.
- No ownership, canonical identities, prices or images are changed by the authority.
- Hidden, signed-in-only, suppressed, provisional, mismatched or missing identities
  invalidate the entire active checklist. Do not silently shrink the denominator.
- Checklist reads, contribution eligibility and progress use the same authority.
- Copies without an exact printing cannot fill child slots. Multiple copies of one
  printing fill one slot. Existing membership, blocking, consent and ownership
  checks remain authoritative. Species/custom behavior must remain unchanged.
- Test manifests are synthetic replay fixtures, never approvals for real set scope.

## Verification

The candidate also includes `binder_set_options_v1`: a bounded authenticated RPC
returning only sets with valid reviewed authority. The web selector uses this RPC,
not raw set enumeration. SQL regression checks reject unreviewed options and an
overlong query. The combined `collector-pricing-replay.mjs --browser` additionally
exercises the real browser/API path against one clearly synthetic Set manifest in
a separate clone. It does not enable Set Binders in the normal sample or approve
any real checklist. All eight candidate functions are included in idempotency
readback.

Replay the candidate twice, verify private grants/RLS, exact slot integrity and
fail-closed behavior. Exercise contribution matching and progress using the existing
functions, including unknown sets, wrong finish, unresolved copies, duplicates,
public/link consent and invalidated identities. Keep original and failed evidence.
Do not declare Set Binders complete from function existence or SQL compilation alone.

## September 11 RPC Verification Addendum

The replay now restores source object ownership, creates its isolated database with
owner `postgres`, and executes the candidate as that same local migration role.
Before applying the candidate, compare all Binder function definitions, owners,
grants and table RLS settings with the source sample. Do not grant broad privileges
to make a failed test pass. Verify the original sample security readback again at
the end, and persist reconciliation failures in the report.

`collector_set_binder_rpc_tests_v1.sql` tests actual existing RPC entrypoints under
the `authenticated` and `anon` database roles. Synthetic session claims simulate
PostgREST's SQL auth context; they are not signed JWTs and do not prove GoTrue,
HTTP middleware or browser behavior. Exercise owner/contributor/outsider behavior,
create/add idempotency, invitations, exact-copy matching, withdrawal, public consent
and revocation, and existing custom/species workflows. No production users copied.

All fixture changes, including temporary flags, species evidence and slot manifests,
must roll back. Compare fixture counts and flags before/after both suites. Preserve
test/source hashes and failed replay artifacts. These are local security and RPC
tests, not a replacement for full migration replay, real checklist review or UI tests.

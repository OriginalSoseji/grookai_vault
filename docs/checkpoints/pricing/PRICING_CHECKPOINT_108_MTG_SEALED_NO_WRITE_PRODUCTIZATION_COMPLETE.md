# Pricing Checkpoint 108: MTG Sealed No-Write Productization Complete

## Context

Checkpoints 104 through 107 split MTG sealed productization into serial image,
pricing, API, and client gates. The image source audit, image schema design,
read-only pricing refresh, and RPC V3 design are complete. This checkpoint
records the final work allowed before any new production or Storage write:
typed web and Flutter clients prepared behind literal false source flags.

## Problem

Waiting until production cutover to implement clients would combine schema,
Storage, pricing, API, UI, and deployment risk. Implementing them early without
a hard disable could accidentally expose the hidden sealed world through a
route, environment change, or partial backend state.

## Risk

- A runtime flag could activate against an unapplied RPC.
- A client could trust stale, cross-game, or malformed response rows.
- A private object path could be rendered as a broken public Storage URL.
- Source-provider image URLs could leak into product behavior.
- One platform could implement weaker evidence checks than the other.
- UI wiring could make a prepared adapter reachable before visibility review.

## Decision

Prepare both client adapters now, but keep them unreachable through literal
`false` constants with no environment override and no route or navigation
wiring. Both adapters:

- require authenticated context and call only RPC V3;
- repeat MTG, English, TCGPlayer, USD, positive-price, and seven-day freshness
  checks;
- validate content-addressed private Storage paths, matching SHA-256, MIME,
  dimensions, and byte count;
- reject external image authority;
- create one-hour signed URLs only after validation;
- model disabled, loading, signed-out, empty, ready, missing-image, stale,
  offline, and error states;
- fail closed on a malformed row rather than displaying a partial response.

Repository contract coverage also fails if a web route/component or Flutter
product surface imports the adapter before this gate is deliberately revised.

Automated review identified that existing `user-card-images` SELECT policies
do not permit a collector JWT to sign `sealed/mtg/sha256/...` objects. A
separate unapplied authenticated image-signing authorization candidate and an
undeployed trusted signer now close that design gap without changing the
previously hashed image-schema candidate. The signer validates the collector
JWT and asks the authenticated RPC to authorize one exact object before its
service client signs that path. Collector clients receive no direct Storage
SELECT or list authority. The authorization requires the exact object to belong
to the active frozen image release and matching active frozen, fresh exact price
release, with both visibility controls true.
Its SQL SHA-256 is
`46e0c6d15cebd06d7a4e1299563d483fded19c23a23cb0936ce9a23e7ed4e6b0`.

## Alternatives Rejected

- Environment-controlled early access: rejected because deployment config
  could activate before backend readiness.
- Public Storage URLs: rejected because `user-card-images` is private.
- Trust RPC output without client validation: rejected because defense in
  depth is inexpensive at this boundary.
- Add screens now but hide navigation: rejected because deep links and route
  discovery would still create reachability.
- Render valid rows while dropping invalid rows: rejected because partial
  response corruption should be visible as an operational state.

## Verification

- Web adapter runtime tests: `6/6` passed.
- Flutter adapter tests: `4/4` passed.
- Trusted signer Deno check: passed.
- Combined focused MTG sealed contracts: `30/30` passed.
- Web TypeScript check: passed.
- Web lint: passed.
- Targeted Flutter analysis: passed.
- Hard-disable and no-surface-wiring contract: passed.
- Authenticated image-read candidate contract: passed.
- Database writes: `0`.
- Storage reads/writes: `0/0`.
- Pricing, release pointer, visibility, Vault, and provider writes: `0`.

## Current Truths

- The active internal MTG sealed release still has 2,182 members and is hidden.
- The latest read-only plan supports 2,149 fresh exact image-eligible variants.
- The exact image schema candidate is not an active migration.
- No transient or durable image object has been uploaded by this sequence.
- No image evidence, assertion, release, or pointer has been written.
- No refreshed price qualification, release, or pointer has been written.
- RPC V3 is an unapplied SQL candidate; production still has RPC V2.
- The authenticated sealed-image signing predicate is an unapplied SQL
  candidate and its trusted Edge Function is undeployed; existing production
  policies still deny these client paths.
- Web and Flutter adapters exist but are unreachable and make zero calls.
- No client has been deployed or activated by this gate.

## Invariants

- Prepared code is not production authority.
- Literal false flags cannot be overridden by environment or remote state.
- Clients cannot activate before image, price, API, and signed-in canaries pass.
- Every visible row requires current exact price and exact self-hosted image.
- Private image objects use signed URLs; provider URLs are never rendered.
- Anonymous sealed access remains denied.
- One Piece, card catalogs, Vault, and public pricing remain unchanged.

## What Must Never Be Broken

- The 2,149 eligible / 33 image-gap partition without new exact evidence.
- The permanent merged-main pricing refresh proof and its hashes.
- Exact same-release image and price lineage.
- Seven-day serving freshness and future-date rejection.
- Full-response fail-closed client behavior.
- No route, screen, or navigation wiring while hard-disabled.
- Serial activation and rollback boundaries.

## Exact Remaining Production Gates

1. Promote the reviewed image schema candidate and authenticated image-read
   addendum into one versioned migration package.
2. Apply it under a separately frozen migration hash and read back schema,
   constraints, functions, grants, RLS, signing-authorization RPC, anonymous
   denial, ledger, and cross-game state.
3. Execute the 17-object transient Storage canary with collision preflight,
   exact readback, removal, and verified absence.
4. Upload the 2,144 unique durable self-hosted objects for 2,149 variants with
   per-object collision prevention and exact readback.
5. Write exact image evidence, objects, assertions, one frozen image release,
   and its members; activate its pointer by compare-and-swap and reconcile all
   2,149 eligible plus 33 excluded variants.
6. Build, rollback-test, write, freeze, and compare-and-swap the governed fresh
   price release; preserve every hold and prove idempotency.
7. Promote and apply RPC V3, then read back definition, ACLs, and anonymous
   denial.
8. Deploy and smoke-test the trusted one-object signer, then smoke-test signed-in
   ready, empty, missing-image, stale, offline, and error behavior while clients
   remain hard-disabled. Prove no direct client Storage listing or download.
9. Deploy the disabled clients, verify zero reachability, then use a separate
   reviewed code change and release decision for a bounded signed-in canary.
10. After canary rollback proof, activate the scheduler and complete an
    operational soak before broader availability.

No step above is authorized by this checkpoint. The next production action is
Step 1 only; later steps remain dependent on successful readback of each prior
gate.

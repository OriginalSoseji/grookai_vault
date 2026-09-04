# MTG Sealed Productization Gates V1

**Status:** Frozen plan

**Date:** 2026-09-03

## Purpose

Define the only permitted path from the hidden, durable MTG sealed catalog to
a reliable signed-in product. Images, ongoing pricing, and visibility are three
independent authority domains. Success in one domain does not authorize work in
another.

This contract freezes future execution requirements. It authorizes no Storage
write, database write, price publication, visibility change, deployment,
anonymous access, update, delete, or cleanup.

## Proven Starting State

Merged-main readback run `33834897002`, produced by commit
`a9a384cb4085a5369e73ebd7039ab6ddcffb2a47`, proves:

- `237` families;
- `2,904` exact variants, candidates, reviews, and TCGPlayer mappings;
- `14,070` identity evidence rows;
- `2,779` durable qualification rows;
- `2,182` `qualified_exact` members in one frozen release;
- `480` rows blocked for missing market price;
- `117` rows blocked as stale;
- one MTG release pointer targeting the `2,182`-member frozen release;
- exact projections for every durable resource;
- an unchanged One Piece boundary;
- zero rows from the hidden client RPC;
- zero database writes during merged-main verification.

The current release is internal evidence, not a completed customer product.
Self-hosted sealed images are not yet governed, automated refresh has not been
soak-proven, and MTG sealed visibility remains `hidden`.

## Shared Invariants

- Sealed products never enter `card_prints`, `card_printings`, or Vault card
  ownership identity.
- Exact TCGPlayer product ID and source mapping remain the source-identity
  anchor.
- External image URLs are acquisition evidence, not permanent client URLs.
- Unknown image, language, package, price, or availability facts remain
  unknown; sibling products cannot supply missing truth.
- Old immutable releases and evidence remain preserved.
- Release-pointer and visibility-control changes are separate compare-and-swap
  operations with independently proven rollback.
- Anonymous access stays denied throughout V1.
- A plan, canary, readback, or client deployment cannot authorize a production
  mutation.
- No gate inherits mutation authority from another.
- Each production mutation requires a fresh exact producer SHA, plan
  fingerprint, source fingerprint where applicable, expected counts, collision
  proof, rollback proof, and explicit bounded authority.
- Productization proceeds in the order below. Later gates cannot activate while
  an earlier gate is incomplete.

## Gate A: Self-Hosted Images

### Objective

Give every client-visible MTG sealed release member an exact, self-hosted image
without hotlinking TCGPlayer or inventing image ownership.

### Required design

1. Define a sealed-specific image evidence and pointer contract. Do not reuse a
   card-image field or pretend a product package is a card printing.
2. Build an immutable source plan from exact sealed source mappings. Preserve
   source URL, source product ID, payload hash, retrieval timestamp, HTTP result,
   MIME type, dimensions, byte count, and content SHA-256.
3. Classify every variant as `exact_image_ready`, `shared_bytes_exact_variant`,
   `missing_source_image`, `invalid_image`, `placeholder`, or
   `identity_conflict`. Shared bytes may deduplicate Storage objects, but every
   variant retains its own evidence relationship.
4. Use content-addressed, game-scoped Storage paths. Run collision preflight
   before any upload and reject mismatched existing bytes.
5. Run a transient bounded upload/readback/removal canary first. Verify every
   created object is absent afterward.
6. Run the permanent upload as resumable batches. Read back and hash every
   object. On failure, remove only objects created by that execution.
7. Apply image evidence/pointers in a separate rollback-proven transaction
   after Storage verification. Existing exact pointers cannot be overwritten
   silently.

### Acceptance

- Every one of the `2,182` intended release members has an exact self-hosted
  image and valid evidence, or is excluded from the client release with an
  explicit reason.
- Zero client response uses an external source image URL.
- Zero placeholder or representative image is labeled exact.
- Storage plan, upload ledger, readback, pointer plan, database readback, and
  hashes reconcile exactly.
- One Piece, cards, pricing rows, release pointer, visibility control, and Vault
  remain unchanged.

### Stop rules

Stop before writes on source drift, identity ambiguity, duplicate plan IDs,
collision mismatch, invalid content, unknown rollback ownership, or any need
to change pricing or visibility.

## Gate B: Governed Pricing Refresh

### Objective

Turn the one-time internal MTG sealed price release into an unattended,
traceable sequence of immutable current releases.

### Publication policy

Only publish a row when all of the following are exact:

- TCGPlayer category, group, product, mapping, and sealed variant ownership;
- English language scope;
- supported package form;
- `normal`, USD TCGPlayer `marketPrice`;
- non-null market value;
- observation no more than seven days old relative to the latest completed full
  source sync;
- no ambiguity, conflicting owner, inactive-source, currency, or stale hold.

No inferred price, Grookai Value, sibling price, listing estimate, or historical
average may enter this release.

### Required operation

1. Recompute candidates and qualifications from the latest completed source
   warehouse sync without mutating the active release.
2. Freeze exact counts and source, plan, and release-manifest fingerprints.
3. Produce a complete delta against the active release: added, removed, price
   changed, newly stale, newly missing, and unchanged.
4. Pass read-only preflight and a full rollback canary.
5. Insert new append-only qualifications, release, and members; then move the
   MTG pointer atomically by compare-and-swap.
6. Read back every member to its exact mapping, qualification, price row, source
   observation, and image eligibility.
7. Prove pointer restoration before scheduled operation is enabled.
8. Run at least seven consecutive unattended scheduled cycles with zero
   reconciliation mismatch and alert on failure, staleness, coverage loss, or
   abnormal price movement.

### Acceptance

- Every released price is traceable from source row through exact variant and
  qualification to immutable release membership.
- Release counts, member hashes, token-free source processing, pointer state,
  and database writes reconcile exactly.
- Source freshness and qualification coverage are observable per cycle.
- A failed cycle leaves the prior release active and sends an operator alert.
- Gate A image eligibility is enforced for client-intended members.
- Cards, One Piece, Vault, and visibility control remain unchanged.

### Stop rules

Stop on source-sync incompleteness, mapping drift, stale evidence, price
currency/subtype ambiguity, anomalous deltas outside the frozen threshold,
pointer mismatch, reconciliation mismatch, or rollback failure.

## Gate C: Signed-In Visibility

### Objective

Expose the proven MTG sealed release to signed-in collectors through one
governed read interface and verified web/mobile surfaces.

### Prerequisites

- Gate A is complete for every client-intended member.
- Gate B has a fresh active release and has passed its operational soak.
- `get_active_sealed_product_pricing_v2` and its grants/RLS are read back from
  production.
- The MTG card-catalog control and independent MTG sealed-product control are
  verified separately.
- Web and Flutter consume the same response contract and render package name,
  package form, exact image, market price, currency, source, and observation
  time without falling back to card identity.
- Loading, empty, missing-image, stale-price, offline, and error states pass
  deterministic tests.

### Activation sequence

1. Run a rollback-only `signed_in` visibility simulation and prove anonymous
   denial, authenticated rows, exact release ownership, and restoration to
   `hidden` with zero residue.
2. Deploy the client surface behind a disabled signed-in feature flag.
3. Smoke-test web and Android/iOS release candidates against the hidden state.
4. Freeze activation plan, current control version, expected row count, release
   ID, client commit/builds, rollback plan, and monitoring thresholds.
5. Under separate authority, change only the MTG sealed control from `hidden`
   to `signed_in` and enable the signed-in client flag.
6. Verify real signed-in rendering and anonymous denial on every supported
   surface.
7. Observe the bounded signed-in production canary. Roll back to `hidden` on
   identity, image, pricing, latency, security, or reconciliation failure.

The current database control has only `hidden`, `signed_in`, and `public`.
Therefore activation grants the governed RPC to all authenticated users; a
smaller account-level security canary would require a separately designed
schema and cannot be implied by a client-only flag.

### Acceptance

- Signed-in users receive only members from the active frozen MTG release.
- Every visible row has exact self-hosted image evidence and fresh exact price
  evidence.
- Anonymous RPC execution or row access remains denied.
- Web and Flutter counts, identity, images, prices, and provenance reconcile to
  the same read model.
- Latency and error-rate thresholds are frozen before activation and hold
  through the canary.
- Control rollback to `hidden` is tested and immediately operable.

### Stop rules

Stop on any anonymous exposure, cross-game row, missing exact image, stale or
unqualified price, client/read-model disagreement, unacceptable latency/error
rate, control drift, or rollback failure.

## Explicitly Deferred

- Public or anonymous MTG sealed visibility.
- Non-English MTG sealed products.
- Accessories, repacks, ambiguous bundles, individual cards, slabs, or Vault
  ownership.
- Grookai Value or inferred sealed valuation.
- Mixing MTG productization with One Piece, card catalog, visual search, or
  multilingual Pokemon mutations.

## Exact Next Gate

Gate A planning only: define the sealed image evidence/pointer contract and
produce a zero-write live image-source coverage plan for the current `2,182`
release members. Stop before migration creation, Storage upload, database
mutation, pricing refresh, deployment, or visibility activation.

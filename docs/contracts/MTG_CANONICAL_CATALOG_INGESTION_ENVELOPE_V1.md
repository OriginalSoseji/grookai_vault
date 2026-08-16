# MTG Canonical Catalog Ingestion Envelope V1

## Purpose

This contract replaces repeated per-set approvals with one immutable,
manifest-bound authorization for the frozen English paper MTG catalog. It does
not weaken the database boundary: every set remains an independent,
insert-only, exactly reconciled transaction unit.

## Authority

The envelope binds all of the following:

- the frozen full-catalog manifest SHA-256;
- the pinned Scryfall and warehouse source hashes;
- all 953 exact payload hashes and fingerprints;
- the governing code commit and aggregate source hash;
- exact maximum row counts;
- deterministic execution order;
- the hidden release boundary;
- prohibited adjacent operations.

One exact envelope authorization permits automatic progression through clean
sets and bounded transient retries. It never authorizes payload substitution or
newly discovered cards outside the frozen manifest.

## Execution Model

Each remaining set moves through these states:

```text
absent
-> exact service-only staging transaction
-> exact hidden canonical promotion transaction
-> independent durable readback
-> complete_exact
```

Database state, not a local journal, is authoritative during resume. A crash
after staging resumes at promotion. A crash after promotion recognizes the
exact canonical state and does not insert duplicate rows.

The executor runs one set at a time. It holds a catalog ingestion advisory lock,
records progress after every transition, retries only transient database or
network failures, and stops before the next set on structural drift.

## Automatic Safety Ramp

The deterministic order begins with:

1. MSH, the already rollback-proven additive set.
2. A 25-set stratified canary covering every observed set type, release-date
   abstention, zero-mapping payloads, and quarantined ambiguous source lanes.
3. Remaining sets in frozen manifest order.

At set 1, set 25, and final completion, aggregate database counts, DSK, Pokemon,
security, staging, and zero-client-visibility boundaries must reconcile. Clean
gates continue automatically without human approval.

## Stop Conditions

The executor stops before the next set when any of these occur:

- manifest, payload, source, code, or approval hash mismatch;
- duplicate or missing payload;
- partial canonical or staging state;
- unexpected collision;
- exact row or delta mismatch;
- MTG visibility is not `hidden`;
- anonymous or authenticated MTG rows become visible;
- DSK or Pokemon changes unexpectedly;
- unsupported mutation is required;
- a structural failure occurs;
- a transient failure exceeds the retry ceiling;
- a second executor holds the advisory lock.

## Boundaries

The envelope permits service-only staging inserts and hidden canonical inserts
for exact frozen rows. It does not permit migrations, release-control changes,
updates, deletes, truncates, cleanup, images, Storage, image pointers, pricing
publication, Vault writes, Pokemon mutation, or public/signed-in MTG release.

Future or newly discovered sets require a new manifest and envelope. That is a
catalog-version approval, not a per-set approval.

Future-dated sets already present in the frozen manifest are deferred before
database access. They may be resumed under the same immutable envelope after
their release date. Sets whose set-level date is intentionally abstained remain
eligible because their card-level release evidence is preserved in the frozen
payload.

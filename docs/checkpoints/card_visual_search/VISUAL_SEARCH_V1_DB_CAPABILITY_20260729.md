# Visual Search V1 Database Capability Checkpoint

Date: 2026-07-29

Status: COMPLETE; PRODUCTION READBACK PROVEN; NO WRITE

## Context

Local outbound PostgreSQL connections to both the direct and pooler endpoints
timed out. The production readback was therefore executed through the existing
governed GitHub Actions database secret.

## Proof

- Workflow: `Contracts Drift Gate`
- GitHub Actions run: `30469205941`
- Producing SHA:
  `5d36b6d0195f05851b188cba83ad2a9d9ea39163`
- Workflow result: `success`
- Transaction mode: `read only`
- Audit payload SHA-256:
  `b917804424db4db43072f728504b223b9fbdba32c2666c7021657092913085fc`
- Preserved artifact SHA-256:
  `7f121f04b3ffb1b7d9af3a961c651535c6a580b4d76b83732efa50cae796803e`

## Current Truths

- Production runs PostgreSQL `17.4`.
- `pg_trgm 1.6`, `unaccent 1.1`, and `vector 0.8.0` are installed.
- Existing visual-description tables contain `1,078` descriptions and `12`
  runs.
- Both existing visual tables have RLS enabled and no policies.
- Existing grants keep those tables private to `service_role`.
- No persistent Card Visual Search V1 projection table exists.
- No Card Visual Search V1 RPC exists.
- Existing generic card-search RPCs do not implement the governed Fact Graph
  query contract.

## Decision

Prepare an additive, unapplied persistence migration for immutable search
releases, artwork groups, printing memberships, projected documents, evidence,
and a singleton active-release pointer.

The initial migration must:

- remain private to `service_role`;
- create no public or authenticated read;
- not activate a release;
- not import data;
- not generate embeddings;
- use installed structured/lexical capabilities;
- leave vector storage to a separate model-and-dimensions gate.

## Exact Next Gate

Write and contract-test the unapplied migration, RLS posture, service-only
candidate RPC, and no-write loader plan. Stop before migration apply or corpus
load.

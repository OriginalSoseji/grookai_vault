# SYSTEM_PARITY_CRAWL_V1

Status: Active

Effective date: 2026-09-03

Owner: Grookai Vault founder

## Purpose

This contract governs the immutable system baseline and no-loss comparison used
while Grookai completes remaining catalog, sealed-product, multilingual, search,
and collectible-adapter work after repository reconciliation.

The contract prevents a new convergence branch from combining unrelated domains
without proof. Current `origin/main` remains authority. Each capability must be
integrated through a bounded fresh-main lane and compared against the same
recorded baseline before it can advance.

## Architecture

The release sequence is:

```text
current origin/main
-> immutable baseline crawl
-> one bounded fresh-main capability lane
-> tests and domain proof
-> reviewed merge
-> main rebaseline
-> next capability lane
-> final candidate crawl
-> no-loss comparison
```

Parallel source research, read-only discovery, fixture building, and isolated
experiments are allowed. Production integration is serial.

## Baseline Authority

Every baseline records:

- exact authority ref and SHA;
- producer branch and SHA;
- crawler path, version, and Git object SHA;
- capture timestamp;
- database project ref;
- read/write boundaries;
- hashes for every permanent artifact.

The authority tree is read with Git object commands. It is never inferred from a
branch name or a potentially stale working tree.

## Required Capture Domains

### Repository

- every tracked path, mode, object type, and blob/tree object ID;
- every migration path and object ID;
- every workflow and schedule;
- package scripts and dependency versions;
- every web page and route handler;
- worker, workflow, and Edge Function entrypoints;
- configuration-file identities;
- referenced environment-variable names, never values.

### Database

The production database is inspected inside a read-only transaction. Capture:

- project and server sanity;
- schemas, relations, columns, constraints, indexes, views, triggers, and
  functions;
- RLS state, policies, and grants;
- migration ledger;
- table statistics and storage footprint;
- canonical game, set, card, image, and identity-domain aggregates.

The database connection string itself must identify the expected Supabase
project. A matching HTTP API URL cannot substitute for an unidentifiable or
mismatched direct/pooler database connection.

The crawl grants no migration, canonical, Storage, pricing, Vault, auth, or
publication write authority.

### Runtime

- GitHub repository identity;
- current remote heads;
- recent workflow runs;
- pull-request state;
- deployed web endpoint response and deployment headers when available.

### Product

The baseline product crawl is signed out and GET-only. It records route response,
title and heading evidence, page errors, request failures, visible image health,
timing, content hashes, and screenshots at desktop and mobile viewports.

Temporary auth-account creation is forbidden in this baseline lane.

## Parity Classification

Every candidate difference is classified as:

- `unchanged`;
- `intentionally_added`;
- `intentionally_changed`;
- `intentionally_replaced`;
- `regression`;
- `not_comparable`.

Intentional removals or workflow changes require a versioned change ledger.
Migration deletion or mutation always fails; a ledger cannot waive immutable
migration history.

RLS disablement, forced-RLS removal, policy mutation, newly granted table
privileges, and newly grantable privileges fail closed unless the exact security
object is named in `allowed_changed_database_security_objects`.

## No-Loss Invariants

A candidate is blocked when any of the following is unexplained:

- a tracked route, workflow, executable entrypoint, migration, database object,
  policy, or RPC disappears;
- an existing migration changes;
- canonical card counts decrease;
- RLS or grants weaken;
- a previously captured product case fails;
- visible image failures increase;
- the same capture case is missing;
- artifact hashes or authority SHAs do not reconcile.

A crawl is incomplete and exits unsuccessfully when any required database query,
runtime capture, or product case fails. HTTP 200 pages containing recognized
application/internal/not-found error copy are failed product cases, not valid
captures.

Performance regressions are warnings at 1.5 times the baseline duration or more
than two additional seconds, whichever allows more variance. A domain release
may enforce a stricter threshold.

## Serial Integration Lanes

The intended order is:

1. immutable current-main baseline;
2. MTG sealed reconciliation from unique preserved work;
3. Japanese Pokemon Master Index completion automation;
4. Simplified and Traditional Chinese Pokemon shadow Master Index automation;
5. per-game sealed automation;
6. collectible adapters, one typed parser per bounded lane;
7. Visual Search reimplementation from unique preserved evidence;
8. final cross-platform candidate crawl and release gates.

The order may change only through a checkpoint explaining the dependency change.
It does not authorize combining these lanes into one branch or PR.

## Per-Lane Requirements

Each lane must:

- begin from freshly fetched current `origin/main`;
- have one named capability and one owning domain;
- preserve staging/candidate/final authority boundaries;
- add focused contract tests;
- run relevant domain tests and `git diff --check`;
- document any migrations without applying them unless separately authorized;
- merge before the next production-integration lane begins;
- rebaseline current main after merge.

## Required Artifacts

Each crawl directory contains:

- `SYSTEM_PARITY_MANIFEST.json`;
- `repository_tree.jsonl`;
- `repository_snapshot.json`;
- `database_snapshot.json`;
- `runtime_snapshot.json`;
- `product_snapshot.json`;
- screenshots;
- `summary.json`;
- `REPORT.md`;
- `artifact_hashes.json`;
- `parity_comparison.json` for candidate crawls.

## Stop Conditions

Stop the affected lane before merge or production mutation when:

- authority moves after the lane was based;
- a required baseline capture is incomplete;
- a migration was edited or removed;
- a no-loss regression remains unexplained;
- database project sanity fails;
- a production write, deployment, or publication would be required without its
  own approval;
- two domains become coupled strongly enough that the lane can no longer be
  reviewed or rolled back independently.

## Commands

```powershell
npm run system:parity:baseline
node scripts/audits/system_parity_crawl_v1.mjs `
  --mode=candidate `
  --authority=HEAD `
  --baseline-dir=<baseline-directory> `
  --change-ledger=<versioned-change-ledger.json> `
  --out-dir=<candidate-directory>
node --test tests/contracts/system_parity_crawl_v1.test.mjs
```

## Explicit Non-Authority

This contract does not authorize database writes, Storage writes, catalog
promotion, pricing publication, public rollout, deployment, branch deletion,
or merging a candidate. Those actions remain governed by their domain contracts
and explicit release boundaries.

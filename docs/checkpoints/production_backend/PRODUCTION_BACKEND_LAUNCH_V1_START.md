# Production Backend Launch V1 Start Checkpoint

**Date:** 2026-08-23

**Branch:** `release/production-backend-launch-v1`

**Starting commit:** `d96f4964ffa8673db60c0141b30190ffabf8d3c8`

## Context

Grookai has extensive production, pricing, ingestion, security, release,
catalog, and mobile evidence, but that evidence is distributed across dated
artifacts, many historical worktrees, and domain-specific supervisors. The
final launch effort needs one current operational truth surface.

## Problem

The existing Founder Ops dashboard is useful as a historical summary but does
not yet prove all live production requirements. Several cards read fixed audit
paths, including dated new-set and MEE artifacts. The current dashboard does
not establish complete live worker schedule freshness, queue/dead-letter
health, Supabase capacity, backup/restore readiness, or end-to-end publication
reconciliation.

## Decision

`GROOKAI_PRODUCTION_BACKEND_LAUNCH_V1` is the frozen contract for the final
production countdown. Existing contracts remain authoritative within their
domains. This contract converges their release evidence and adds operational
freshness, workload isolation, capacity, and recovery requirements.

## Current Truths

- `origin/main` began this lane at
  `d96f4964ffa8673db60c0141b30190ffabf8d3c8`.
- The existing runtime preflight reports zero critical drift findings and ten
  known deferred-debt checks.
- The runtime health report passes its two current checks and records seven
  intentionally blocked or contained legacy paths.
- The Founder Ops workflow runs daily, but its domain cards are not all
  generated from live, freshness-enforced sources.
- MEE has a frozen Product V1 contract and extensive workers, canary evidence,
  and rollback tooling that must be reconciled rather than redesigned.
- Multiple catalog supervisors and readiness branches exist, but there is no
  single common production worker registry covering every active lane.
- Supabase has prior security remediation evidence, but a current launch
  capacity, performance, growth, backup, and restore report is not yet proven
  by this lane.

## Invariants

- No user-data cleanup or destructive canonical mutation is authorized.
- Existing domain contracts are not weakened.
- Dated artifacts are historical evidence unless current freshness is proven.
- Background catalog workers cannot compete with collector-critical traffic.
- Catalog completion is not a launch blocker; safe autonomous operation is.

## Immediate Work

1. Build the authoritative production topology and worker registry.
2. Replace fixed dashboard evidence with live or freshness-checked providers.
3. Reconcile MEE, pricing publication, and new-set ingestion health.
4. Measure Supabase security, performance, capacity, and recovery readiness.
5. Close shared client, load, failure, canary, and rollback gates.

## Explicit Next Gate

Publish a machine-readable production topology and a baseline launch matrix
that classify every contract requirement as `pass`, `fail`, `stale`,
`unmeasured`, or `not_applicable`, with evidence paths and observation times.
No launch-ready claim is permitted before that gate is complete.

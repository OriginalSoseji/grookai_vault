# Pricing Checkpoint 43: Flutter Device Release Readiness

## Status

Pre-migration Flutter readiness is complete. Production migration, actual
price rendering proof, iPhone proof, and TestFlight distribution remain gated
by the active replacement pricing canary.

## Context

Checkpoint 42 restarted the canary after repairing its stale commit pin. The
72-hour duration cannot be compressed. Work that did not mutate production
was therefore completed in parallel: Flutter contract hardening, Android
build verification, exact-printing route preservation, negative-state proof,
and physical Samsung smoke testing.

## Problem

The existing Flutter client had release-critical ambiguity before governed
pricing could be enabled:

- unavailable totals could still imply a TCGPlayer-backed value;
- exact printing context could be lost when entering Compare;
- some card artwork labels omitted printing identity;
- duplicate governed rows were not rejected as ambiguous;
- the Compare action could sit under bottom navigation on a real device.

These problems could make a correct backend price appear attached to the
wrong printing or make an unavailable price look authoritative.

## Risk

Applying migrations or distributing iOS before resolving those defects would
expand the blast radius of wrong-printing pricing. Claiming device readiness
from automated tests alone would also miss viewport and route-transition
failures found only on the Samsung device.

## Decision

- Repair only Production V1 Flutter pricing and identity behavior.
- Preserve exact card-printing context through every deterministic route.
- Fail closed on duplicate or missing exact governed pricing.
- Show honest unavailable states without false source attribution.
- Prove startup and all eight Flutter surfaces on a physical Samsung device.
- Preserve private device evidence by hash rather than commit screenshots that
  contain account or collection data.
- Prepare, but do not execute, the iPhone/TestFlight packet before canary pass.

## Current Truths

| Truth | Value |
| --- | --- |
| Producing code commit | `725aa1fc1d320a4c2a4e3702c4c0a147249f2403` |
| Flutter tests | `570 / 570` passed |
| Flutter analysis | passed |
| Samsung | SM-S908U, Android API 36 |
| APK hash | `de3b4c2f2659a4da4fd8111f96c9e60f46e8068a4e768758bd7150c793a363d4` |
| Eight Flutter routes | reachable without fatal errors |
| Exact-printing identity | preserved in tested paths |
| Actual governed price rendering | not yet proven; migrations pending |
| Production writes | none |
| TestFlight upload | none |
| Anonymous pricing | denied |

## Invariants

- Pricing authority remains TCGPlayer `marketPrice` for eligible exact English
  Pokemon raw singles.
- Exact card-print, language, and finish identity are mandatory.
- A missing exact child price may not fall back to a parent price.
- `From` is valid only when governed accepted children support it.
- Unavailable pricing may not carry TCGPlayer source attribution.
- Device screenshots must reconcile with machine-readable governed evidence.
- The two frozen migrations may not move before the terminal canary pass.
- Anonymous pricing remains outside this release gate.

## What Must Never Be Broken

- Exact-printing context during navigation.
- Source-to-publication-to-read-model-to-UI provenance.
- Fail-closed ambiguous, stale, and source-missing behavior.
- Private Vault and account data handling.
- Frozen migration and candidate-SHA provenance.
- Honest separation between readiness evidence and production completion.

## Permanent Evidence

Evidence is rooted at:

`docs/audits/pricing/mee_pricing_platform_production_v1/flutter_device_readiness_20260805/`

The report records the device matrix and validation. The artifact manifest
hashes the local screenshots and APK. The iPhone/TestFlight packet preserves
the exact post-canary execution and stop conditions.

## Explicit Next Gate

After `2026-08-08T07:51:54.064Z` and final-slot completion grace, require the
terminal pricing observer to pass. Then freeze a clean integration SHA, apply
only migrations `20260728130000` and `20260728133000`, perform schema/RLS/read
and rollback proof, capture actual pricing on Android and iPhone, and upload
the reconciled exact-SHA iOS archive to a bounded signed-in TestFlight canary.

If the observer fails, do not migrate, deploy, or distribute this candidate.

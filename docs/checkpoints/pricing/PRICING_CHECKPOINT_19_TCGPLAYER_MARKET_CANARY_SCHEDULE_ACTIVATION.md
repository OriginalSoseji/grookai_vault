# Pricing Checkpoint 19: TCGPlayer Market Canary Schedule Activation

## Context

The exact 100-printing TCGPlayer Market canary had passed visual/data
verification, same-SHA shadow proof, exact-definition dry-run, signed-in
activation, shared-read-model validation, and rollback testing.

The remaining operational gate required the canary to run unattended on the
production scheduler, fail closed, alert the founder durably, and preserve
enough evidence to explain any displayed price from source row through
publication and client read.

## Problem

Two production capabilities were still missing:

1. the pricing pipeline had no durable founder-alert route tied to systemd
   failure
2. the daily canary had not been installed from a clean, pinned production
   checkout

The first actual systemd execution also exposed a health-policy defect. A
warehouse source check that correctly returned `skipped_no_change` was treated
as unhealthy even though its source marker matched a complete, fresh,
zero-failure warehouse run containing `540,037` price rows.

## Risk

- a scheduled pricing failure could occur without a durable, reconciled alert
- operations alerts could bypass RLS or become mutable after delivery
- custom webhook authentication could be broken by an Edge Function JWT default
- an old timer could race the governed pricing pipeline
- an apparently clean no-change source check could either be rejected forever
  or accepted without proving continuity to real source evidence
- scheduler repair could accidentally mutate canonical identity, vault data, or
  anonymous visibility
- an audit-only commit could be confused with the SHA that produced the run

## Decision

Production scheduling now uses:

- one clean checkout on branch `pricing/mee-productization-v1`
- one guarded systemd service and timer
- one protected environment file
- a `flock` concurrency boundary
- an `OnFailure` route to an authenticated operations webhook
- an append-only operations event ledger
- the existing notification outbox and delivery log
- explicit service-role-only database RPCs
- exact canary definition and hash verification

Source continuity accepts `skipped_no_change` only when it can be joined to a
fresh completed run with the same source marker, nonzero evidence, and zero
failures. It is not a generic healthy status.

The SHA that produced the successful scheduled run is permanently recorded as:

`c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d`

A later audit-only commit does not replace that provenance.

## Alternatives Rejected

- continuing with cron or an unverified ad hoc shell invocation
- modifying the dirty historical checkout at `/opt/grookai_vault_mee_nightly`
- leaving the obsolete warehouse timer active
- allowing anonymous or authenticated callers to enqueue operations alerts
- storing the webhook bearer in repository artifacts
- accepting every `skipped_no_change` result without marker and evidence proof
- changing source ingestion semantics merely to satisfy the health check
- suppressing the first failed run or deleting its alert evidence
- declaring the 72-hour gate passed after one repaired run

## Migration Applied

Production migration:

`20260728050000_pricing_operations_notification_webhook_v1.sql`

Preflight proved the local-only migration set contained exactly that migration.
Migration object scanning and complete local replay passed before linked
`supabase db push`.

Production schema/security readback proved:

- `operations_notification_events`: RLS enabled
- `notification_outbox`: RLS enabled
- `notification_outbox_card_anchor_v2`: present and validated
- operations ledger policy: service-role only
- enqueue and claim RPCs: security-definer, owned by `postgres`
- anonymous execute: denied
- authenticated execute: denied
- service-role execute: allowed
- event ledger UPDATE and DELETE: blocked by append-only trigger

## Runtime Deployment

The active Edge Functions are:

- `notification-dispatcher`, version `12`, `verify_jwt=false`
- `operations-webhook-v1`, version `1`, `verify_jwt=false`

The custom bearer secret exists only in protected production secret storage.
Unauthorized access returned HTTP `401`.

The active scheduler is:

- `grookai-tcgplayer-market-pipeline.timer`
- daily at `08:15 UTC`
- enabled and active
- working directory:
  `/home/grookai/grookai_vault_mee_productization_v1`

The superseded `grookai-tcgcsv-warehouse.timer` is disabled.

## Alert Proof

Two production alerts reconciled exactly from webhook event through delivery:

- smoke notification:
  `1788c06a698f2675d3b6be07453223b6554637f68ea585e8ca8cf7790d81264d`
- actual systemd failure:
  `f46328c60e338adfaf53902691673ce7edbedba8b33074159612bd28ee733809`

For each notification:

- event rows: `1`
- outbox rows: `1`
- delivery logs: `1`
- attempts: `1`
- final send status: `sent`

## Initial Failure And Repair

The first scheduled run published and reconciled all 100 exact canary rows, then
failed the health gate because the current source attempt had status
`skipped_no_change`.

The failure was preserved, classified non-retryable, returned a failed systemd
state, and sent the founder alert.

The repair introduced `TCGPLAYER_MARKET_HEALTH_POLICY_V1`. It accepts verified
no-change continuity only when:

- latest and completed source markers match exactly
- the supporting run completed successfully
- the supporting run contains nonzero source evidence
- failed source rows equal zero
- freshness remains inside the configured window

The repaired systemd run completed in one attempt on commit `c0cdce55`.

## Scheduled Canary Proof

Run key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-28-REPAIR1`

Result:

- status: `completed`
- classification: `success`
- selected: `100`
- eligible: `100`
- snapshots: `100`
- traced snapshots: `100`
- delayed: `0`
- suppressed: `0`
- quarantined: `0`
- excluded: `0`
- reconciliation mismatches: `0`
- health: `healthy`
- source continuity: `verified_no_change`
- supporting source price rows: `540,037`

Production readback:

- exact printing prices: `100`
- parent-card rows: `99`
- positive USD prices: `100`
- missing provenance: `0`
- signed-in shared-read rows: `99`
- anonymous read: denied, code `42501`

## Current Truths

- exactly 100 verified English Pokemon printings have current signed-in
  TCGPlayer Market prices
- all 100 rows retain source and publication provenance
- the exact canary has zero delayed, suppressed, quarantined, or excluded rows
- the scheduled pipeline is enabled and has a durable founder-alert path
- verified no-change source continuity is fail-closed and evidence-backed
- canonical identity, vault ownership, and modeled values were not modified
- anonymous pricing remains disabled
- the 72-hour scheduled observation gate is active but not yet complete

## Invariants

1. Only the exact verified canary definition may publish during this gate.
2. Every price must retain exact printing, finish, source row, and publication
   provenance.
3. `skipped_no_change` is healthy only with matching, fresh, nonzero,
   zero-failure completed evidence.
4. The scheduler must fail closed on broken lineage, stale source data,
   reconciliation mismatch, or broken trace.
5. Operations alerts remain append-only, service-role-only, idempotent, and
   reconciled through delivery.
6. The old warehouse timer must remain disabled while the governed pipeline
   timer is active.
7. Canonical identity, vault state, and modeled value lanes remain outside the
   publication worker.
8. Anonymous pricing remains denied until its separate governance gate passes.
9. Audit commits never replace the frozen code SHA that produced a run.

## What Must Never Be Broken

- exact card/printing/language/finish qualification
- fixed canary selection and definition hash
- source-to-publication-to-client traceability
- append-only decision, snapshot, and operations evidence
- service-role-only operations write boundary
- fail-closed scheduler and health behavior
- signed-in versus anonymous rollout separation
- one shared pricing read model across supported clients
- preservation of the original failed run and its delivered alert

## Explicit Next Gate

Observe the installed scheduler for 72 hours from the repaired activation and
preserve every scheduled run, health result, alert event, publication pointer,
artifact hash, and shared-read-model check.

The gate passes only if all scheduled cycles reconcile, all source continuity
checks remain evidence-backed, no broken traces appear, signed-in reads remain
correct, anonymous reads remain denied, and rollback remains available.

After the 72-hour gate passes, advance to full eligible signed-in publication
under a separate bounded rollout. Do not enable anonymous pricing until explicit
TCGPlayer licensing and display authority is recorded.

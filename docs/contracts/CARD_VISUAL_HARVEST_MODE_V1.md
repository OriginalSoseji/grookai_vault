# CARD_VISUAL_HARVEST_MODE_V1

Status: Active

Date: 2026-07-20

## Purpose

`CARD_VISUAL_HARVEST_MODE_V1` governs large calibration runs for the card visual fact graph agent.

Harvest mode exists to collect useful validated rows while quarantining invalid payloads for later grouped repair. It is not a lock gate, approval gate, database apply gate, semantic-search integration, embedding job, or production rollout.

## Core Rule

Strict gates decide whether a batch is promotion-ready.

Harvest runs preserve evidence and keep moving within a bounded envelope.

## Boundaries

Harvest mode must not:

- write database rows
- approve generated descriptions
- create embeddings
- enable semantic search
- integrate Taste Engine, Listing Resolver, Grookai Signature, or downstream product surfaces
- process deferred Energy cards unless that branch is explicitly reopened

## Quarantine Lane

Validation failures in harvest mode are not discarded and do not invalidate already validated rows.

Each invalid payload must be written to:

- `validation_failures.jsonl`
- `validation_quarantine.jsonl`
- the saved-system export as a raw failed payload

Each quarantine row must preserve:

- selected card identity
- findings
- raw failed payload when available
- usage telemetry
- failure-class grouping

## Harvest Status

Harvest runs report one of:

- `clean`: no validation failures
- `completed_with_quarantine`: validation failures are inside the configured tolerance
- `quarantine_threshold_exceeded`: failure rate or failure count exceeded tolerance
- `hard_stop`: cost, retry, provider, duplicate, missing-ID, or reconciliation safety issue

The default validation failure tolerance is `15%`.

## Required Artifacts

Harvest mode must write:

- `run_plan.json`
- `summary.json`
- `generated_outputs.jsonl`
- `validation_failures.jsonl`
- `validation_quarantine.jsonl`
- `HARVEST_REPORT.json`
- `HARVEST_REPORT.md`
- `ALL_N_SAVED_SYSTEM_JSON.json`
- `RECONCILIATION_REPORT.json`
- `RECONCILIATION_REPORT.md`

## Scaling Rule

New failure classes stop promotion, not extraction.

If a harvest run completes with quarantine inside tolerance, validated rows may be preserved as evidence and invalid rows may be repaired later in grouped offline replays.

No harvested row becomes apply-ready until a later strict gate proves the selected apply subset reconciles cleanly.


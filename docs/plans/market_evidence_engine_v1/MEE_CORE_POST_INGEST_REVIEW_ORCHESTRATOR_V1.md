# MEE Core Post-Ingest Review Orchestrator V1

Status: plan only

## Why This Exists

This package converts the current MEE review lanes into one deterministic post-ingest status and action grouping. It does not ingest, does not call providers, does not invoke review actions, and does not publish prices.

## Safe Internal Actions

The orchestrator may classify these as safe internal actions for a future batch apply package:

- low-signal monitor -> `confirm_monitor_only`
- classification blocked -> `request_reclassification`
- mixed raw/slab -> `require_split`

## Held Actions

These remain held until the lane policy contract is explicit:

- reference metric rows
- raw-single/slab internal candidate confirmation
- candidate review rows
- any unknown/manual hold bucket

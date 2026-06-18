# Grookai Assistant Guarded Foundation V1

Date: 2026-06-17

## Objective

Build the first implementation slice for the Grookai AI product boundary without turning normal search into an AI cost surface.

## What Changed

- Added a shared AI product boundary module for Search, Assistant, and Intelligence lanes.
- Added a fail-closed Assistant entitlement guard.
- Added typed Assistant response schemas.
- Added an explicit `POST /api/assistant/search-interpretation` endpoint.
- Added a separate model runtime guard that keeps model calls disabled by default.
- Added an Assistant capability registry so planned modes cannot run before their grounded handlers exist.

## Current Behavior

The endpoint:

- requires explicit invocation
- runs deterministic Smart Search interpretation first
- returns an entitlement decision
- returns a stable cache key
- performs no AI model call
- performs no DB writes
- performs no SQL generation
- performs no canonical truth mutation
- returns both entitlement status and model runtime-guard status
- blocks model calls for planned Assistant modes until each mode has an implemented grounded handler

## Runtime Gates

Assistant is disabled by default unless:

```text
GROOKAI_ASSISTANT_ENABLED=true
```

Model calls are separately disabled by default unless:

```text
GROOKAI_AI_MODEL_CALLS_ENABLED=true
```

Even with that runtime flag enabled, the Search lane remains blocked from model calls.

The first implemented mode is:

```text
search_interpretation
```

It is currently a deterministic no-model preview.

Planned but blocked modes:

```text
variant_explanation
collection_gap_summary
chase_list_proposal
```

These require grounded Grookai data handlers before they can become model eligible.

Founder/admin access can be enabled with:

```text
GROOKAI_ASSISTANT_FOUNDER_EMAILS=email@example.com
```

Vendor/power-user access can be enabled with:

```text
GROOKAI_INTELLIGENCE_VENDOR_EMAILS=email@example.com
```

An explicit limited free trial can be enabled later with:

```text
GROOKAI_ASSISTANT_FREE_TRIAL_ENABLED=true
```

## Safety Confirmation

```text
grookai_search_model_default: false
assistant_model_call_performed: false
model_calls_enabled_by_default: false
search_lane_model_calls_allowed: false
planned_assistant_modes_model_eligible: false
db_writes_performed: false
migrations_created: false
canonical_truth_mutation_allowed: false
arbitrary_sql_allowed: false
```

## Next Step

Build the UI entry point that clearly separates:

```text
Grookai Search understood
```

from:

```text
Grookai Assistant can help with this as a premium feature
```

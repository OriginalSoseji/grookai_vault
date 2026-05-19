# PRINTING_IDENTITY_IMAGE_INTAKE_WIRING_AUDIT_20260519

Date: 2026-05-19
Status: audit only

## Scope

Audit the existing card/image suggestion intake system and define how the card detail `Suggest image` affordance can wire into it.

No implementation, DB write, migration, scanner change, pricing change, public child route enablement, or image promotion was performed.

## Existing Intake System

The existing user-facing intake route is:

```text
/submit
```

It renders `WarehouseSubmissionForm` and requires an authenticated user.

The form already supports:

- `MISSING_CARD`
- `MISSING_IMAGE`
- notes
- optional `tcgplayer_id`
- required front image
- optional back image
- browser upload to warehouse evidence storage
- Edge Function submission through `warehouse-intake-v1`

The upload boundary is already correctly separated:

1. Browser uploads image evidence to storage.
2. Edge Function validates the request.
3. RPC writes warehouse candidate/evidence rows atomically.

## Existing Backend Boundary

The Edge Function is:

```text
supabase/functions/warehouse-intake-v1/index.ts
```

The RPC is:

```text
public.warehouse_intake_v1
```

The warehouse tables are:

```text
public.canon_warehouse_candidates
public.canon_warehouse_candidate_evidence
```

Current valid submission intents are:

```text
MISSING_CARD
MISSING_IMAGE
```

Evidence rows are append-only and support:

```text
IDENTITY_SNAPSHOT
CONDITION_SNAPSHOT
SCAN_EVENT
IMAGE
```

## Current Blocker For Direct Wiring

The card detail page knows the exact parent card and selected child printing context:

- parent `card_print_id`
- parent `gv_id`
- selected `card_printing_id`
- selected finish label
- selected `printing_gv_id` when present

But the current warehouse intake payload only accepts:

- notes
- `tcgplayer_id`
- submission intent
- intake channel
- optional scan/snapshot ids
- image storage paths

The current RPC stores empty JSON for:

```text
claimed_identity_payload
reference_hints_payload
metadata_payload
```

So a card-detail image suggestion would lose the strongest context unless the user manually writes it into notes or supplies a TCGPlayer ID.

## Safe Wiring Direction

Wire `Suggest image` to the existing `/submit` route first, not to a new write path.

Recommended route shape:

```text
/submit?intent=MISSING_IMAGE&card=<parent_gv_id>&printing=<printing_gv_id-or-finish-key>
```

The route should prefill form state only. It must not submit automatically.

Recommended prefilled notes shape:

```text
Image suggestion for GV-PK-PRE-002
Selected version: Master Ball
Selected printing id: internal child printing selected on card page
Reason: selected version is using the base card image
```

The UI should hide raw UUIDs from visible copy when possible. Raw `card_printing_id` may be submitted only as internal metadata after the backend contract accepts it.

## Backend Contract Gap

For production-grade wiring, extend the intake payload/RPC in a separate migration lane so `MISSING_IMAGE` can carry structured reference context:

```json
{
  "source_surface": "card_detail_variant_finish",
  "parent_gv_id": "GV-PK-PRE-002",
  "card_print_id": "<uuid>",
  "card_printing_id": "<uuid>",
  "printing_gv_id": "GV-PK-PRE-002-MB",
  "finish_key": "masterball",
  "finish_label": "Master Ball",
  "image_gap_reason": "child_printing_uses_parent_image"
}
```

Recommended storage:

- `reference_hints_payload` for parent/printing identity context
- `canon_warehouse_candidate_evidence.metadata_payload` for per-image evidence context

Do not store this only in notes.

## Minimal V1 Implementation Plan

1. Add query-param support to `/submit`.
2. Prefill `WarehouseSubmissionForm` with:
   - `submissionIntent = MISSING_IMAGE`
   - notes from card/printing context
   - optional TCGPlayer ID if the card has one
3. Change `Suggest image` from disabled button to link when:
   - user is authenticated or login redirect can return to `/submit`
   - selected child printing is known
   - selected child printing is using the base image
4. Keep the upload/review flow unchanged.
5. Keep founder review and promotion gates unchanged.

This V1 is useful even before the backend structured-context extension because it guides the user into the existing reviewed flow.

## Production V2 Implementation Plan

1. Extend `submitWarehouseIntake` payload with optional `reference_hints`.
2. Extend `warehouse-intake-v1` validation to accept only whitelisted hint keys.
3. Extend `warehouse_intake_v1` RPC with `p_reference_hints jsonb default '{}'::jsonb`.
4. Store sanitized hints in `canon_warehouse_candidates.reference_hints_payload`.
5. Optionally store image-level hint metadata in `canon_warehouse_candidate_evidence.metadata_payload`.
6. Update founder review display to surface:
   - parent card
   - selected child printing
   - selected finish
   - image gap reason
7. Add tests proving raw UUIDs do not leak publicly and canon image updates remain founder-gated.

## Safety Requirements

The wiring must preserve these invariants:

- Intake never promotes images.
- Intake never updates `card_prints.image_url`.
- Intake never updates `card_printings`.
- Intake never enables `/card/<printing_gv_id>`.
- Intake never changes parent `gv_id`.
- Intake never changes Species Dex denominators.
- Intake remains authenticated.
- Founder approval and promotion executor remain the only canon mutation path.

## Recommendation

Implement in two small lanes:

1. `PRINTING_IDENTITY_IMAGE_SUGGESTION_LINK_V1`
   - UI-only link from card detail to `/submit`
   - query-prefill support
   - no schema change
   - no DB writes beyond the existing user-submitted intake action

2. `WAREHOUSE_IMAGE_SUGGESTION_CONTEXT_V1`
   - schema/RPC/Edge Function extension for structured reference hints
   - founder review surfacing
   - tests and contract update

Do not build a new upload system. The existing warehouse intake pipeline is the correct authority boundary.


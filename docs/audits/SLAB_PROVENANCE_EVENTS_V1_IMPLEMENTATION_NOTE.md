# Slab Provenance Events V1 Implementation Note

Status: implemented as schema only.  
Scope: slab-specific append-only provenance lane.  
Out of scope: ingestion, pricing, client writes, fingerprint provenance reuse.

## What Was Created
- `public.slab_provenance_events`

## Anchor Identity
- Provenance is anchored to `slab_cert_id`.
- `card_print_id` and `vault_item_id` are optional context links, not the provenance anchor.

## Append-Only Design
- No `updated_at`
- No mutable status fields
- UPDATE and DELETE are blocked by mutation triggers

## Idempotency Model
- Duplicate protection is implemented with a partial unique index on:
  - `(slab_cert_id, event_source, source_event_key)`
  - only when `source_event_key` is present

## Explicit Deferrals
- No ingestion logic was added.
- No pricing logic was added.
- No fingerprint provenance tables or RPCs were reused directly.

# GV Slab Provenance Contract V1

Status: LOCKED CONTRACT (documentation only; no schema/code changes in this file)  
Scope: Append-only provenance and history model for slab certificate objects in Grookai Vault.  
Out of scope: slab identity minting rules, pricing math, ingestion implementation, generic cross-domain provenance framework, fingerprint provenance reuse.

## 1) Purpose
- Governs provenance for slab certificate objects.
- Supports durable history for:
  - listing observations
  - sale observations
  - ownership observations
  - verification observations
  - card-link observations
- Keeps slab history distinct from fingerprint provenance.

## 2) Anchor Identity
- Slab provenance is anchored to slab certificate identity.
- Required anchor:
  - internal slab cert object id and/or `gv_slab_id`
- Slab provenance must not be anchored to:
  - `fingerprint_key`
  - `analysis_key`
  - `snapshot_id`
- `card_print_id` is a linked attribute, not the provenance anchor.

## 3) Provenance Model
- Slab cert identity is a current-state object row.
- Slab provenance is an append-only event ledger for that slab object.
- Current state and historical evidence must remain separate.
- No provenance design may collapse the slab object row and its event history into one mutable record.

## 4) Event Discipline
- Provenance events are append-only.
- Writes are backend-authoritative.
- Direct client-authoritative event insertion is prohibited.
- Core anchors must be present on every event row.
- Metadata is allowed, but metadata must not replace required anchors.
- Historical rows must not be mutated to change prior event meaning.

## 5) Recommended Event Shape
- Expected conceptual event record:
  - slab provenance event id
  - slab anchor id
  - `event_type`
  - `event_source`
  - `source_event_key`
  - optional `card_print_id`
  - optional `vault_item_id`
  - optional `price`
  - optional `currency`
  - `event_metadata`
  - `event_ts`
  - `created_at`
- `source_event_key` exists to support explicit duplicate protection for repeated observations from the same upstream source.

## 6) Event Types
- V1 event families:
  - `cert_observed`
  - `cert_linked_to_card`
  - `cert_linked_to_vault_item`
  - `cert_listing_observed`
  - `cert_sale_observed`
  - `cert_ownership_observed`
  - `cert_verification_observed`
  - `cert_image_observed`
- Event vocabulary must stay slab-specific.
- Fingerprint event names must not be reused for slab history.

## 7) Idempotency Model
- Slab provenance must not use fingerprint `analysis_key` semantics.
- Idempotency must be based on slab anchor plus source event identity.
- `source_event_key` must be stable when the upstream source provides stable identity.
- Duplicate observation protection must be explicit.
- Replays must not create duplicate event rows for the same slab anchor and source event identity.

## 8) Relationship to Other Systems
- Slab provenance links to canonical card identity through `card_print_id`.
- Slab provenance may link to `vault_item_id` when a slab is represented in a user vault.
- Slab provenance may later feed slab pricing systems.
- Slab provenance must remain separate from fingerprint provenance in V1.
- A shared provenance abstraction may be considered only after proven multi-domain use across fingerprint and slab systems.

## 9) Non-Goals / Exclusions
- This is not a fingerprint history contract.
- This is not a generic provenance framework contract.
- This is not the slab pricing engine contract.
- This is not a replacement for vault ownership episodes.
- This is not a schema or ingestion implementation document.

## 10) Red Flags
- Overloading `fingerprint_provenance_events` for slab history.
- Using mutable listing state as slab identity.
- Mixing current-state slab rows with append-only history semantics.
- Allowing direct client writes into slab provenance.
- Generalizing provenance before slab and fingerprint domains have both proven stable object contracts.

## 11) V1 Implementation Direction
- Slab provenance must be implemented as a parallel slab-specific event lane.
- It must reuse the proven patterns from fingerprint provenance:
  - append-only events
  - explicit idempotency
  - backend-authoritative writes
- It must not reuse fingerprint tables or fingerprint RPCs directly.
- Generalization remains a later step, not a V1 requirement.

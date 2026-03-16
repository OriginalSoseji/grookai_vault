# Slab Cert Identity V1 Implementation Note

Status: implemented as schema only.  
Scope: slab object identity lane only.  
Out of scope: provenance, pricing, ingestion, fingerprint reuse.

## What Was Created
- `public.generate_gv_slab_id(grader text, cert_number text)`
- `public.slab_certs`

## Identity Anchor
- Slab identity is anchored to normalized `grader` plus normalized `cert_number`.
- `gv_slab_id` is derived deterministically from that anchor as `GV-SLAB-{GRADER}-{CERT}`.

## Non-Identity Fields
- `grade` is stored as an attribute of the slab object. It is not part of the uniqueness anchor.
- `card_print_id` links the slab object to canonical card identity. It is not part of the uniqueness anchor.

## Explicit Deferrals
- Slab provenance events are not implemented in this change.
- Slab pricing is not implemented in this change.
- No fingerprint bindings, fingerprint provenance tables, or generic provenance abstractions are reused here.

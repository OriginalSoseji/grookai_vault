# MTG Sealed Image Evidence And Pointer V1

Status: Frozen design; no mutation authority  
Date: 2026-09-03

## Purpose

This contract defines how an exact MTG sealed-product variant may receive a
self-hosted package image without treating the package as a card printing,
hotlinking a source image, or allowing one image to silently establish another
variant's identity.

## Identity Boundary

The image owner is `sealed_product_variants.id`. Every image assertion must
also retain its active frozen release member, exact source mapping, TCGPlayer
category/group/product identity, mapping payload hash, current warehouse payload
hash, source URL, and retrieval evidence.

Shared bytes may deduplicate one Storage object. They never deduplicate or
transfer the evidence relationship: each variant keeps its own assertion.

## Evidence States

- `exact_image_ready`: valid image bytes obtained from an exact mapped product.
- `shared_bytes_exact_variant`: exact mapped variants share identical valid
  bytes and retain separate evidence.
- `missing_source_image`: no valid exact source image can be retrieved.
- `invalid_image`: the source response is unavailable, malformed, oversized,
  or not an allowed image format.
- `placeholder`: bytes are image-shaped but dimensions or size indicate a
  placeholder.
- `identity_conflict`: canonical release membership, source mapping, current
  warehouse identity, name, game, or allowed source host does not reconcile.

Only the first two states are eligible for a future self-hosted pointer.

## Retrieval Evidence

The immutable coverage artifact records:

- release/member/family/variant/mapping identifiers;
- canonical and source product names;
- source category, group, and product identifiers;
- mapping and current source payload hashes;
- original source image URL and attempted exact image routes;
- retrieval time, selected route, final URL, HTTP status, and retry outcomes;
- detected format, MIME type, dimensions, byte count, and content SHA-256;
- classification and explicit exclusion reason;
- deterministic proposed Storage path.

Allowed source hosts are limited to exact TCGPlayer product image hosts already
bound through the private warehouse and exact mapping. Redirects outside that
allowlist fail closed.

## Storage Addressing

Future images use the game-scoped content address:

```text
sealed/mtg/sha256/<first-two-hash-characters>/<full-sha256>.<extension>
```

The path is a proposal until a separately authorized collision preflight and
upload succeeds. An artifact path is not a Storage object or database pointer.

## Future Database Model

A future unapplied migration may define append-only, service-owned tables for:

- immutable image evidence bound to variant and source mapping;
- verified self-hosted objects bound to exact content hash and dimensions;
- variant image assertions that reference both evidence and object;
- an immutable image release and per-game pointer, or equivalent release-bound
  eligibility that cannot expose images outside the active sealed release.

The model must force RLS, deny `public` and `anon`, prevent silent replacement,
and expose images only through a new versioned RPC after pricing freshness and
sealed visibility both pass.

## Zero-Write Coverage Gate

The first execution must query the current active frozen MTG sealed release in
a read-only transaction and reconcile exactly 2,182 members. It may perform
bounded external GET requests and write local/GitHub artifacts only.

Required artifacts are `run_plan.json`, `source_plan.jsonl`, `coverage.jsonl`,
`exceptions.jsonl`, `summary.json`, `REPORT.md`, and `artifact_hashes.json`.
Every selected member must appear exactly once in the source plan and coverage.

## Prohibited By This Contract

This contract authorizes no migration application, database write, Storage
upload, image pointer, price refresh/publication, release-pointer change,
visibility activation, client deployment, Vault mutation, or anonymous access.
It also does not authorize a TCGPlayer URL in any client response.

## Next Gate

After the zero-write coverage report is reviewed, freeze an exact eligible and
excluded member set. Then prepare an unapplied schema candidate and a transient
Storage canary plan. Stop before applying the schema or uploading any object.

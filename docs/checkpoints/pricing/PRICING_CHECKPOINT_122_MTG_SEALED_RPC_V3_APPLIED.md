# Pricing Checkpoint 122: MTG Sealed RPC V3 Applied

## Context

Checkpoint 121 activated the frozen MTG sealed image release as internal image
authority while sealed visibility and image signing remained denied. The next
serial gate was the reviewed read-only RPC that joins current exact pricing and
exact self-hosted image evidence without exposing the product to clients.

## Problem

Production RPC V2 does not require exact image evidence or repeat the seven-day
price-freshness rule at serving time. It could not safely become the MTG sealed
client boundary.

## Risk

An incorrectly promoted function could expose anonymous reads, return stale or
image-less variants, mix image and price releases, leak provider URLs, or alter
visibility and product data while appearing to be a schema-only change.

## Decision

Preserve the reviewed candidate SHA-256, promote it under the next valid
forward-only migration version, and use one immutable producer for read-only
preflight, a full rollback canary, and durable apply. Require exact function
definition characteristics, ACLs, hidden-visibility behavior, ledger readback,
and unchanged protected state before accepting the gate.

## Alternatives Rejected

- Promote under the obsolete placeholder timestamp: rejected because it would
  sort before its image-schema dependencies on clean migration replay.
- Reuse RPC V2: rejected because it lacks exact-image and serving-time freshness
  requirements.
- Enable sealed visibility during the RPC test: rejected because visibility is
  a separate publication gate.
- Return source image URLs: rejected because acquisition URLs are not client
  media endpoints.

## Migration Applied

- Producer commit:
  `3e5bc3aac6b2ec5608a6e35f6c571ff03e2087e4`
- Reviewed candidate SHA-256:
  `5e3872f8d433d0e360a3039ba62a5a6d009c6a36ad0112479cb298220450a5a2`
- Migration:
  `20260905070000_mtg_sealed_image_backed_pricing_rpc_v3.sql`
- Migration SHA-256:
  `4695d4a0af162a258af7f7fe5bd035472c32530d4829498a579eeb8c319d798f`
- Apply-plan fingerprint:
  `d846361789558553fbe7254851e3d167b8068c5e969b45fcb5165c0c907e385c`
- Migration-ledger inserts: `1`
- Functions created or replaced: `1`
- Transaction committed: `true`
- Independent readback findings: `0`

## Live Evidence

- Active price release members: `2,182`
- Exact image-backed rows: `2,149`
- Fresh exact rows currently eligible for RPC V3: `2,144`
- Explicit image gaps: `33`
- Rows outside current eligibility: `38`
- Stale rows: `5`

The five stale rows are intentionally excluded by the read-time seven-day
freshness predicate. They were not misclassified as image gaps and no pricing
data was changed by this gate.

## Schema And Security Proof

- Function signature:
  `public.get_active_sealed_product_pricing_v3(text,text,integer,integer)`
- Volatility: `stable`
- Security: `security definer`
- Search path: `pg_catalog, public`
- `authenticated` execute: allowed
- `service_role` execute: allowed
- `anon` execute: denied
- `public` execute: denied
- Authenticated rows while MTG sealed is hidden: `0`
- Service-role rows while MTG sealed is hidden: `0`
- Anonymous direct invocation: denied with insufficient privilege
- External provider image URLs in output: none

## Boundary Proof

- Sealed-product data writes: `0`
- Image evidence writes: `0`
- Storage operations: `0`
- Pricing writes: `0`
- Pointer writes: `0`
- Visibility writes: `0`
- Vault writes: `0`
- Signer deployments: `0`
- Client activations: `0`
- Cross-game writes: `0`
- Deletes: `0`
- Protected-state drift: `0`

## Current Truths

- RPC V3 is durably installed in production.
- MTG catalog visibility remains `signed_in`.
- MTG sealed visibility remains `hidden`.
- The image pointer remains active on the frozen image release.
- RPC V3 returns no rows while sealed visibility is hidden.
- The signer and both typed clients remain undeployed or hard-disabled.
- Five stale prices currently fail closed at read time.

## Invariants

- Every returned row must bind one frozen active price release to one frozen
  active image release through the same source price authority.
- Price evidence must remain exact TCGPlayer `normal`, English, USD, positive,
  not future-dated, and no older than seven days.
- Image evidence must remain exact, byte-readback verified, content-addressed,
  and tied to the same variant, mapping, and source release member.
- Anonymous access remains denied.
- Missing or stale evidence removes a row and never triggers fallback.
- RPC deployment does not authorize visibility, signing, or client activation.

## What Must Never Be Broken

Do not grant `anon` or `public` execution, return provider image URLs, bypass
release or freshness checks, relax missing-image behavior, or treat RPC
availability as authority to publish MTG sealed products.

## Verification

- Focused RPC/client tests: `20/20` passed.
- Complete MTG sealed contract suite: `172/172` passed.
- Full repository shipcheck: passed.
- Flutter tests: `657/657` passed.
- Rollback canary: passed with zero residue.
- Permanent audit artifact hashes: `16/16` valid.

## Permanent Evidence

- Read-only plan:
  `docs/audits/pricing/mtg_sealed_rpc_v3_gate_v1/2026-09-05T07-04-19Z_plan_only/`
- Production rollback canary:
  `docs/audits/pricing/mtg_sealed_rpc_v3_gate_v1/2026-09-05T07-04-34Z_rollback_canary/`
- Durable apply and independent readback:
  `docs/audits/pricing/mtg_sealed_rpc_v3_gate_v1/2026-09-05T07-05-05Z_apply/`
- Contract:
  `docs/contracts/MTG_SEALED_RPC_V3_APPLY_V1.md`

## Exact Next Gate

Deploy and prove the trusted `mtg-sealed-sign-image-v1` function while keeping
web and Flutter clients hard-disabled and MTG sealed visibility hidden. Prove
authentication rejection, hidden-state signing denial, no listing capability,
and no database, Storage, pricing, pointer, visibility, or Vault mutation.

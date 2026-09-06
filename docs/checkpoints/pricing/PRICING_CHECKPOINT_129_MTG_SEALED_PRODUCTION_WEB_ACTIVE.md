# Pricing Checkpoint 129: MTG Sealed Production Web Active

## Context

Checkpoint 127 proved the bounded signed-in clients in canary conditions.
Checkpoint 128 prepared a separate forward-only constraint repair without
applying it. PR 415 then passed the complete local and protected GitHub gates
and was squash-merged into production `main`.

## Problem

The active MTG sealed backend still had no production collector surface. The
web route needed a reversible production activation with explicit signed-out,
signed-in, pricing, search, and image-boundary proof.

## Risk

A deployment could use an untested source tree, expose rows anonymously, serve
provider-hosted images, lose price evidence, exceed the bounded page size, or
couple client rollback to database mutation.

## Decision

Activate only the signed-in web client using the dedicated Vercel Production
config flag. Keep the page bounded to 24 products, preserve RPC V3 and the
trusted signer as the only client data interfaces, and leave mobile disabled.

## Authority And Provenance

- Pull request: 415
- Tested producer commit:
  `951c0cbde7b626b064e14ee19704f2c1dd8a3604`
- Squash-merged production commit:
  `249332eb302efccd78c37bf9e3c25e1c944c569d`
- Shared tree:
  `10ec2a0404cbc75712d9762a35e79654645bdaf1`
- Vercel deployment: `2qFZTfA8uZpttaNkbw8WtvqyCEBq`
- Production flag: `NEXT_PUBLIC_MTG_SEALED_CLIENT_V1_ENABLED=true`

## Current Truths

- `/sealed/mtg` is active for signed-in production collectors.
- Signed-out access returns `307` to the login route.
- Signed-in readback returns exactly 24 bounded products and 24 market prices.
- All 24 product images load from signed private Supabase Storage URLs.
- No external image fallback is used.
- Search for `Arena Starter Kit` returns four relevant products.
- No Grookai-origin console errors were observed.
- No database, Storage, pricing, image, Vault, approval, or mobile write
  occurred during this rollout.
- Migration `20260905120000` remains prepared and unapplied.

## Rollback

Set `NEXT_PUBLIC_MTG_SEALED_CLIENT_V1_ENABLED=false` in Vercel Production and
redeploy the current source. The implementation defaults to disabled unless
the value is exactly `true`. This client rollback does not alter backend or
data state. The backend game release control remains a separate kill switch.

## Invariants

- Anonymous MTG sealed browsing remains denied.
- RPC V3 and the trusted signer remain the only client interfaces.
- Product rows remain bounded to 24 until a pagination/performance gate.
- Private Storage paths and signed URL values are not persisted in audits.
- Mobile activation requires its own release/profile device evidence.
- The dimension repair requires a separate migration apply authority.

## Verification

- Focused schema contracts: 32/32.
- Full repository shipcheck: passed, including Flutter 659/659.
- PR 415 protected checks: all passed.
- Production Vercel deployment: Ready in 165 seconds.
- Signed-out, signed-in, image, price, and search smoke tests: passed.

## Permanent Evidence

- `docs/audits/pricing/mtg_sealed_production_web_rollout_v1/2026-09-06T06-54-57Z/`

## Exact Next Gate

Observe the bounded production web surface. Then run a release/profile Flutter
performance canary on a physical device and proceed to TestFlight only if it
passes. Independently finish strict preflight and local replay for the
unapplied dimension constraint repair before requesting its schema-only apply.

# Collector Backend Release Repair V1

September 12, 2026 UTC / September 11 America/Denver.
Founder instruction: "ok fix the 2 issues."

This extends the prior website-only work to repair MTG sealed price refresh and
the missing confirmed-cameo reader. Preserve the approved website and original
production deployment. Do not broaden collectible identity, visibility, ownership,
Storage, unconfirmed cameo authority or price freshness.

## MTG Paired Refresh

Reuse only the 2,149 variants in frozen verified image release
`86b207e6-4f73-5d9a-af40-864c47256c38`. No new identities or image downloads.
Source must remain exact TCGPlayer category 1, English, same product/group and
payload hash. Only positive USD Normal marketPrice observations aged zero through
seven days qualify. Completed warehouse authority must be at most two days old.
At most five percent of the fixed image-backed baseline may be excluded; price
ratios outside one-third through three times the prior quote stop execution.

Build immutable price and image releases together, preserving original image
retrieval timestamps and verified objects. Serializability, advisory lock, exact
fresh-plan parity, collision checks, manifest checks, atomic compare-and-swap
pointers, independent readback and zero-write idempotency are required. Exclude
other games, Storage, canonical identities, visibility, Vault and deletions.

Plans are read-only. Durable execution requires a clean committed producer, exact
SHA and plan fingerprint. Scheduled mode additionally requires
`MTG_SEALED_REFRESH_ACTIVE=true`; keep it false until real database rollback-canary,
durable apply and independent/idempotency receipts pass. A successful audit must
never be reported as a published release.

## Confirmed Cameos

Migration `20260912050000_confirmed_card_cameo_read_v2.sql` adds only the private
confirmation table and bounded public projection. It promotes zero existing rows.
Bind active confirmation to exact source-row hash, reviewed image path, artifact
hash and appearance role; depictions/representations require host evidence.
Public clients cannot read/write confirmations or raw source evidence. Hidden or
signed-in game/set records must not leak through this public reader.

Apply only through the migration maintenance contract. Strict preflight and full
isolated migration-chain replay remain required; a local cloned-schema test is
additional proof, not a substitute. Never apply generated broad schema-diff SQL.

## Release Boundary

Record plans/tests, reconcile existing schema drift, freeze reviewed producer,
perform bounded database canary, then apply/read back the exact repair under the
governing authority. Do not activate schedules or switch the website while these
gates are incomplete. Do not bypass commit hooks to manufacture a producer SHA.

Status: `docs/ops/COLLECTOR_BACKEND_REPAIR_CHECKPOINT_20260912.md`.

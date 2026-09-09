# Pokemon Sealed Source Containment

Date: September 9, 2026. Scope: launch repair, not identity expansion.

Run 34369019748 failed on variant 42d3df7c-26a6-5de9-88ce-a39fc62e28b7,
TCGPlayer 624676, Destined Rivals Elite Trainer Box. Its supplier payload changed.
The existing exact-hash check correctly rejected it, but stopped every other
verified product's refresh. Original failure artifacts remain preserved under
the September 9 release-closeout operator directory.

`POKEMON_SEALED_SOURCE_CONTAINMENT_V1` excludes changed, inactive, missing or
cross-category source rows from both new price and image releases. It records
expected and observed evidence without changing canonical identity or mapping.
All exclusions share the existing 95% fixed-baseline coverage minimum; duplicate
inputs, corrupted image evidence and extreme price movements still stop writes.

Health readback distinguishes active drift (failure) from confirmed exclusion
from the current catalog (operator maintenance warning). Neither is called
healthy. Missing/inactive source rows are also reported, and an absent published
variant ID fails the evidence check instead of proving containment. The operator
issue stays open until the source identity is actually reconciled.

Verification: the initial 31 targeted contracts passed. Production execution
completed September 9 from `fd4938df3853bd2d25414d0e7556a646c8d15d5c`.
Frozen plan: `f9f001deff3ad0bb0a31a2f7d053116fccadf1e609a3f0ec22256591a552ba4a`.
The rollback transaction passed, followed by 8,532 immutable inserted rows and
two pointer changes: 1,712 published products and nine excluded. Exact readback
passed; the identical plan then inserted zero rows and changed zero pointers.
Price release: `9fb3a5b9-18d1-5759-8145-e0bdecae85a5`.
Image release: `8933f0b0-b9c5-5bab-8d03-163039196e29`.
No identity, Storage, Vault or cross-game writes occurred. Do not reapply this
completed action. Receipts are under
`C:/grookai_vault_operator_artifacts/release_closeout/20260909/`, in
`sealed_source_containment_rehearsal`, `sealed_source_containment_idempotency`
and `sealed_source_containment_health`.

Remaining: merge the scheduled-worker repair, then verify scheduled health.
One changed product remains excluded pending identity reconciliation; aging
source prices remain reported rather than silently renewed. Category-move
diagnostics now retain all observed alternatives without accepting a
product-ID-only match as canonical identity.

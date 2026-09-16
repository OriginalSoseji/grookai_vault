# Anniversary Sealed Intake

Date: 2026-09-16. Founder requested anniversary sealed products on the completion
list and completion of anniversary catalog/native delivery work.

## September 16 Publication Follow-up

The preparation below is historical, superseded by external execution receipts.
Producer `7c40054d387d792953994a7870675eea2719632e` has now admitted nine products
(100 catalog rows) and verified nine Storage objects plus 37 image records.
Rollback, independent readback and zero-write repeats passed. Both nine-product
releases remain inactive; no repeat admission or upload is needed.
See `SEALED_ADDITIVE_APPLY_CHECKPOINT.md` and `SEALED_IMAGE_APPLY_CHECKPOINT.md`
in the private artifact directory below for immutable execution details.

`POKEMON_SEALED_ANNIVERSARY_REFRESH_V1` now defines the opt-in 1,730-member union
and 27 pinned source reconciliations. Read-only production replay qualified
1,694 products: all prior 1,658 plus 36 (27 reconciled and nine new), with 36
withheld. This is a preview, not an activation receipt. Targeted tests passed
40/40 before producer freeze. Publication, scheduled selector rollout and live
readback remain to be executed from the frozen tested producer. Use the external
`COMPLETION_CHECKLIST.md` for the latest post-freeze state.

## Current Evidence

Private artifacts: `C:/grookai_vault_operator_artifacts/pokemon_30th_20260916/`.
Start with `COMPLETION_CHECKLIST.md`, `anniversary-sealed-final-snapshot.json`,
`sealed-incremental-preparation/READINESS.md`, and `sealed-image-review.json`.

Production read-only audit found 48 source products, 39 existing mappings,
11 members in both active price/image releases, 27 changed source hashes,
and 9 unmapped identities. There are 47 fresh positive Normal source prices.
Do not report 48 new products or 48 published products.

The 39 original source receipts all match their preserved mapping hashes.
Full raw-payload reconciliation now proves that 26 changes only add a valid
UPC plus modification metadata; one changes modification metadata only.
All previous extended-data fields and other identity fields are unchanged.
`sealed-source-reconciliation-verified.json` preserves 39 versioned receipts,
including 12 unchanged rows. These receipts do not authorize publication or
silently bypass the existing refresh source-hash policy.

## Implemented Locally

- Pokemon contents matching now understands numbered set names and TCG colons.
- Classic Collection packs require explicit randomized card contents evidence.
- Existing card/accessory/repack exclusions and other-game builders remain intact.
- Bounded incremental readiness builder/CLI distinguishes new identities,
  changed mappings, missing prices and unpaired image/price release membership.
- Nine-product candidate plan and nine exact downloaded source images preserved.
  Image byte validation passed 9/9 with nine requests, no retries or paid AI.
- All nine source images were visually inspected by the assistant, not a human.
- Strict source reconciliation rejects identity, contents, image, owner,
  checksum, and raw-payload projection drift; it never rewrites old mappings.
- Additive catalog executor reuses the existing family only after full parity.
  It requires a serializable transaction, frozen scope and fresh source/price
  parity, verifies exact readback, and rejects partial collisions.
- Real local PostgreSQL proof passed: append-only protection, source drift
  rejection, partial-collision rejection, insert/freeze, zero-write repeat,
  full rollback and verified absence. No production rollback apply was run.
- Production read-only preflight passed at 2026-09-16T20:12:37.060Z: nine products,
  100 proposed insert rows, existing family reused, zero actual writes.
  See `sealed-additive-live-preflight.json`. Producer is NOT frozen/apply-ready.
- Verification: all sealed contract files ran with the local SQL test enabled:
  537 passed, one existing skip, zero failures. Full client builds were not rerun
  because this local preparation does not change or deploy client code.

The booster wrapper says 5 additional game cards; its source description says
6. Preserve the conflict, leave confirmed contents unknown, and do not derive
physical printing/foil authority from generic pack copy.

## Remaining Implementation

The governed execution entry point now supports preflight, rollback canary,
apply with exact canary receipt/hash, and independent readback. It refuses dirty
tracked producers, wrong projects, receipt drift and overwriting old artifacts.
Lost COMMIT responses are preserved as unknown and are never auto-retried.
See `docs/contracts/POKEMON_SEALED_ADDITIVE_CATALOG_V1.md` for the exact procedure.

1. Freeze/commit the tested producer and regenerate its exact manifest. Run the
   governed execution entry point, fresh preflight and independent readback.
   The additive executor and local rollback proof are complete, not applied.
2. Integrate the 27 source reconciliation receipts into new release evidence.
   Never mutate an old frozen release's provenance or permit arbitrary drift.
3. Upload only verified missing images with collision checks/readback; preserve
   existing objects and exclusions. Downloads are not Storage uploads.
4. Build paired price/image releases preserving the entire existing catalog,
   not a 9- or 48-product replacement. Extend governed refresh baseline so a
   future scheduled refresh cannot drop newly admitted variants.
5. Apply/read back the frozen bounded work, then
   smoke Search/detail/Vault with no founder collection mutations.

No production catalog, Storage, release-pointer, pricing, or visibility writes
were made in this follow-up. Source is local, not merged or deployed.

## Other Completion Tasks

Singles finishes and regional admissions still require independent evidence.
Existing seven-card monitor stays active and no paid Vision rerun is required.
Samsung 321 and native cover commit bd561329 remain preserved in their original
tree. TestFlight is not uploaded. Duet native helper reports missing pipe after
kernel reset/retry; established Tailscale SSH is refused and LAN SSH times out.
Do not ask for new accounts or claim the Mac is locked from that error.

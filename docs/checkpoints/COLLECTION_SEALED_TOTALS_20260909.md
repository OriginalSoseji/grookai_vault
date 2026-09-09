# Collection Sealed Totals - September 9, 2026

## Request And Finding

The founder requires Your Collection to include cards and owned sealed products.
Read-only production evidence at 16:09:46 UTC confirms one Blooming Waters
Premium Collection copy with seal and package condition both `unknown`.
Its released USD reference is 326.70, but its owned market price is null.
The totals RPC returns one active, zero priced and one unpriced sealed copy.

The existing valuation contract requires `factory_sealed` and `undamaged` for
the factory-sealed market reference to value a holding. Do not infer these
conditions, substitute asking/acquisition price, or silently promote the
reference into the collection total. The founder was asked to confirm condition;
no confirmation or production holding update is recorded by this change.

Evidence: `C:/grookai_vault_operator_artifacts/sealed_ownership/20260909_blooming_waters/collection_totals_1788970187108.json`.

## Repair

- Native collection totals load independently from visible inventory slivers,
  filters and pagination. Stale responses and cross-account results are dropped.
- Confirmed sealed adds, edits, sales, trades and removals emit value-refresh
  events only after successful readback. No active inventory panel is required.
- Web totals load independently of inventory-page success and filters.
- Both clients show cards plus sealed subtotals and separate non-USD amounts.
  Pending/failed sealed reads are explicitly a card subtotal, not a complete
  collection total. Unpriced sealed holdings explain their exclusion.
- No migration, inventory mutation, price-policy change or global activation.

## Verification

- 27 targeted Flutter tests pass, including 11 new total/refresh regressions.
- Five web value contracts pass, including the Blooming Waters example.
- 12 sealed boundary contracts pass.
- Flutter analyzer, web TypeScript check and diff check pass.
- Example arithmetic: 2038.80 cards + 326.70 eligible sealed = 2365.50 USD.
  This is a test calculation, not a claim that the founder's copy is eligible.

## Delivery

Implementation branch: `fix/collection-sealed-total-refresh`, based on
`222b6dee132c596f9726301ba4e3fcdfdac75c2f`.
Source changes are local and not yet committed, merged or deployed to web/iOS.
Samsung profile build 318 is installed and visually verified. APK SHA-256:
`219c34bc7ab9258f7fba2cd88f236fb37fde4466cf9aede82396ac954d255bb7`.
Evidence in the external Blooming Waters directory:
`collection_total_android_build_318.log`, `collection_totals_vault_318.xml`
and `collection_totals_vault_318.png`. Cold launch completed in 1945 ms.
The first APK retained the checkout's build number 312 and installation was
rejected as a downgrade; the installed app was unchanged by that attempt.
The public-config builder now accepts optional `-BuildNumber`; retry used 318
and normal `adb install -r`, preserving app data and the signed-in session.

The native screen showed USD 2025.04 card subtotal, one unpriced sealed copy,
and the explicit unconfirmed-condition exclusion alongside USD 326.70 reference.
Earlier USD 2038.80 remains a historical test fixture, not the latest live total.
Final read-only receipt `collection_totals_1788970926714.json` at 16:22:06 UTC
confirms the holding remains unknown/unknown and unpriced. No holding was edited.
Do not conflate local Samsung installation with TestFlight or web deployment.

## Remaining

Confirm the real copy's seal/package condition before changing it. Once genuinely
eligible, verify its readback and the combined collection total. The active
account-only test's original expiry and scope remain unchanged. Promote the
client repair through normal repository checks before web/iOS distribution.

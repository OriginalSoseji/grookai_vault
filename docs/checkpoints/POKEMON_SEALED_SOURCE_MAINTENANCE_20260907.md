# Pokemon Sealed Source Maintenance

Date: 2026-09-07. Scope: bounded source-gap investigation and actionable monitoring.
Prior release: `POKEMON_SEALED_PRODUCTION_20260907.md`; no reopening of identity,
freshness, Storage, public visibility, or other-game publication boundaries.

## Verified Results

- Production environment sanity: 170,404 cards, 3,397 sets, 32,903 traits.
- Latest source warehouse sync completed on 2026-09-07 with zero failed fetches
  and 548,022 source price rows. An overall healthy warehouse does not prove
  every individual product has a recent price observation.
- Live sealed readback: 1,721 products. Three authenticated image signatures and
  complete byte hashes passed; wrong-game signing remained denied.
- Sixteen active release prices are at least four days old. Three are seven days
  old: Mythical Pokemon Collection Box [Genesect], [Meloetta], and [Victini].
  Those quotes must be withheld from 2026-09-08 unless a fresh exact observation
  is ingested and a governed release is published. Do not rewrite observed dates.
- Bounded missing-image replay: 35 exact product entries, zero recovered images.
  Responses were 70 HTTP 403 and 35 HTTP 404. No alternate product identities,
  substitute images, access-control bypass, database writes, or Storage writes.
- Direct source price checks for eight groups returned HTTP 401. Therefore the
  audit cannot establish current source price availability. It does not conclude
  that the products or their current prices do not exist.
- Original source/acquisition artifacts remain unchanged. New evidence lives at
  `C:/grookai_vault_operator_artifacts/pokemon_sealed/20260907_source_gap_audit/`
  and `20260907_detailed_health/` under the same artifact root.

## Monitoring Changes

Daily health now preserves `aging_prices.json` with exact names, product IDs,
observation dates, age, and the first withholding date. The operator issue shows
the affected products instead of only a generic warning. Existing severity and
seven-day publication policy are unchanged.

Manual `audit_only=true` dispatch skips paired release writes without temporarily
changing the repository refresh flag. The normal daily schedule still refreshes.
The separate maintenance CLI stops an origin on 401/403/429, allows already
in-flight requests to finish, and does not automatically retry blocked endpoints.

## Remaining Evidence Gates

The 35 images need a permitted, exact source image before an image-evidence apply
can be planned. Source access needs to recover before the current-price endpoint
can provide new evidence. Existing warehouse ingestion and publication continue
under their established contracts; missing or expired quotes remain excluded.
No new app build is needed for these backend monitoring changes.

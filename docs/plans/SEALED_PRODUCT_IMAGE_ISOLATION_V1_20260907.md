# Sealed Product Image Isolation V1

Date: 2026-09-07
Status: Deferred. Planning only; not scheduled or authorized for execution by this document.
Requested by: Founder, to resume at a later date.

## Purpose

Remove the exterior white image background from sealed-product display images
so products sit naturally against Grookai's light and dark surfaces. Preserve
the actual product and every original verified image. This is presentation
work, not an identity, pricing, or source-evidence repair.

## Observed Starting Point

Four locally stored Pokemon sealed images were inspected: a blister, booster
pack, tin, and collection box. Exterior white background exists in these JPEGs;
some white areas are part of the physical packaging and must remain intact.
This inspection does not establish that every catalog image needs isolation.

Current display paths:
- `apps/web/src/app/sealed/pokemon/page.tsx`
- `apps/web/src/app/sealed/mtg/page.tsx`
- `lib/screens/sets/mtg_sealed_catalog_screen.dart`

Both clients currently contain-fit the source image. Changing the container
background alone cannot remove white pixels embedded in a JPEG.

## Boundaries

- Keep original bytes, hashes, evidence, identity links, and release manifests unchanged.
- Create separate, self-hosted display derivatives; never overwrite source objects.
- Use background-only masking, not regenerated products, invented edges, or altered artwork.
- Preserve white packaging, text, logos, product colors, foil highlights, clear
  windows, shrink wrap, and all items in multi-product compositions.
- Never make every white pixel transparent or use a blend mode that changes product colors.
- Ambiguous masks retain the original image and enter review; do not force coverage.
- No canonical, price, Vault, cross-game release, or anonymous-access changes.
- Existing signer authorization must cover derivatives explicitly. Private
  originals are not a reason to create publicly accessible derivative URLs.
- No paid processing, schema apply, Storage upload, deployment, or bulk processing
  is initiated by saving this plan. Determine method, rights, costs, and budgets on resume.

## Delivery Sequence

1. Revalidate current main, display paths, source releases, access contracts,
   original image availability, and permitted image transformation rights.
2. Freeze a representative 20-product preview manifest using verified originals.
   Include Pokemon and MTG boxes, tins, packs, blisters, white packaging, clear
   windows, reflective wrapping, and multi-product bundles. Record source hashes.
3. Compare suitable background-only processing methods on this local preview.
   Preserve product pixels; handle difficult edges conservatively. Record method
   and version. Do not decide the implementation vendor/library from this plan alone.
4. Produce before/after previews on both light and dark backgrounds, with enlarged
   edge views and originals alongside. No production replacement at this stage.
5. Review every preview for product completeness, halos, edge quality, readable
   packaging, and correct retention of white/transparent product regions.
6. After the preview gate passes, implement a versioned, resumable derivative
   worker with bounded concurrency, checksums, failure artifacts, and original fallback.
7. Generate thumbnail and enlarged alpha-capable images. Choose encoding and sizes
   after measuring file size, decoding, and visual fidelity on Flutter and web.
   Trim exterior empty space, add consistent padding, preserve aspect ratio,
   and never crop product content or normalize away meaningful package proportions.
8. Integrate derivative selection into the governed image read/signing path.
   Prefer verified derivatives; fall back to originals on missing, rejected,
   or failed derivatives. Keep original viewing available.
9. Test web desktop/mobile and Samsung, including light/dark mode, zoom, slow
   network, cache behavior, access denial, and fallback. Check iOS alpha rendering
   before an iOS release. A new app build may be needed for client integration.
10. Roll out in bounded batches across Pokemon and MTG sealed. Extend the same
    pipeline to future sealed ingestion only after monitoring and rollback pass.

## Derivative Provenance

Design an additive representation, not a replacement for canonical evidence:
- Original object path and SHA-256.
- Source product/artwork association, without merging lookalike variants.
- Processing method, processing version, and settings hash.
- Derivative object path, SHA-256, dimensions, byte size, and encoding.
- Crop bounds and retained padding relative to the original.
- Review status, fallback reason, and verification timestamp.

Deduplicate processing by source bytes plus processing settings. Preserve each
product's existing source association. Source updates invalidate only affected
derivatives. Select an immutable display release or equivalent governed mapping;
any required schema change must be planned and tested separately before apply.

## Acceptance And Rollback

- Zero altered product identities, invented details, clipped components, or
  removed white packaging in the accepted preview.
- No visible exterior white halos or distracting jagged edges on either theme.
- Consistent framing without stretching or losing text and included accessories.
- All accepted derivatives trace to intact originals and valid access boundaries.
- Record bytes, loading latency, and decode/render behavior against the existing
  baseline; no material loading regression. Freeze measured budgets before bulk rollout.
- Failed processing never creates a broken product tile or blocks catalog ingestion.
- Demonstrate returning to original-image selection without restoring deleted data.
- Automation must not self-certify visual correctness from a confidence score alone.

## Resume Point

Start with the frozen 20-product local before/after preview, not the full catalog.
Review this plan against current code and source state first. No work is running
and no reminder or scheduled worker has been created for this deferred task.

Related checkpoint:
`docs/checkpoints/POKEMON_SEALED_SOURCE_MAINTENANCE_20260907.md`.
Image source gaps and aging price alerts remain independent maintenance work.

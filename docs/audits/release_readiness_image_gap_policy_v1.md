# RELEASE READINESS IMAGE GAP POLICY V1

Generated: 2026-07-03

Mode: audit_policy_no_write

This policy turns the image audit into launch criteria. It performs no DB writes, Storage writes, migrations, cleanup, or image claim changes.

## Source Evidence

- Image state audit: `docs/audits/image_truth_v1/self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.md`
- Web route audit: `docs/audits/web_cohesion_link_integrity_v1/web_cohesion_link_integrity_v1.md`
- Live sample finding: `/network` rendered nested `/_next/image` URLs and fragile external image optimizer requests before the release-readiness image fix.

## Current Image State

- Parent rows scanned: 53,147
- Parent rows with any image field: 53,058
- Parent rows without any image field: 89
- English physical parent image gaps: 62
- TCG Pocket excluded parent image gaps: 27
- Child rows scanned: 69,956
- Child rows without direct image fields: 43,079
- Priority parent image gaps: 0
- Priority child image gaps: 0
- McDonald's parent image gaps: 0
- Trainer Kit parent image gaps: 0
- Base Set print-run lane parent image gaps: 0
- World Championship parent image gaps: 0

## Release Gate

Release can proceed only when all of these are true:

1. Public route crawl reports zero broken routes and zero dead internal links.
2. Priority parent rows have zero image gaps.
3. Priority child rows have zero image gaps.
4. Public product surfaces do not render nested `/_next/image` URLs.
5. Public product surfaces do not depend on Vercel optimizer success for fragile third-party image hosts.
6. Parent image gaps are explicitly classified as known catalog debt or excluded domains.
7. Child image gaps are allowed only when they do not surface as broken public images and a parent/display fallback is available where the UI exposes the card.

## Known Deferred Debt

The current 89 parent image gaps are not launch blockers if they remain classified as:

- 62 English physical parent gaps in known residual sets.
- 27 TCG Pocket excluded parent gaps.

The 43,079 child rows without direct image fields are not automatically launch blockers because child printings often inherit parent/display fallback behavior. They become launch blockers only when a public page renders an empty or broken card image for a card that should have a visible image.

## Cleanup Queue

1. Fix any public surface that emits nested `/_next/image` URLs.
2. Bypass Next image optimization for fragile external hosts where the optimizer produces 400s or timeouts.
3. Add a recurring live image sample probe for homepage, Explore, Network, Dex, card detail, set detail, and public profile pages.
4. Reduce the 62 English physical parent image gaps after release-critical UI surfaces are stable.
5. Triage child gaps by public exposure frequency instead of raw row count.

## Launch Interpretation

The app is not blocked by raw child image gap count alone. It is blocked by visible broken images, unstable image loading on core feeds, or unclassified parent image gaps on public product pages.

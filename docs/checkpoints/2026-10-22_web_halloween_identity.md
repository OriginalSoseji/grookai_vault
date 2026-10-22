# Website Halloween identity — October 22, 2026

## Source and scope

Prepared from production/main `5cb367de5da0290de4dda18f9e9d290ed94165db` in the
isolated `release/web-halloween-20261022` worktree. The owner authorized publishing
the approved website visuals with the Halloween version.

The web client now bundles Roboto, uses lowercase brand names and shared Black
900 wordmarks, and adopts the canonical ink/bone visual system with the active
season's matching accent. The owner's subsequent clarification makes Halloween
orange `#FF8A33` authoritative over the unthemed lime. Header
avatars are larger relative to the name, recolor the unchanged original logo,
and contain animated Halloween spiders. Pause/play persists in local storage;
reduced motion disables decorative animation. Winter snowflakes remain available
in the development-only preview. The production theme is explicitly Halloween.

This release retains current main's features, route semantics, authentication,
payment code, backend clients, deployment configuration, and release guard. No
database, schema, pricing, or worker changes are included.

## Verification and release status

Final typecheck, lint, production build, and secret-packaging guard pass. The
build used loopback read-only collector mode with no production credentials;
Vercel must rebuild the source using its existing production environment.

The final orange candidate passes 126 browser checks: 117 mobile/reference,
accessibility, geometry, layout, navigation, and collector journey checks plus
nine real-header, homepage, and logo checks. These cover the original silhouette
across all six palettes at 320/390/1440px, Halloween and Winter motion,
pause/resume, reduced motion, Roboto Black, dark/light palettes, and overflow.
Three theme/artwork contract checks pass, including AA contrast in both modes
and hashes of the unchanged original emblem sources. Saved visual references
have been refreshed for the approved identity, including orange accents and the
new canonical geometry. Header colors are asserted directly so a small accent
change cannot hide within a full-page screenshot tolerance.

The targeted existing public-rendering/link/species source suite has four stale
source-string failures reproduced on the unchanged main baseline: non-anchor
species artwork, root redirect expectation, route dynamic/cache expectation, and
visible exact-ID link text. The candidate has the same four failures and 22
passing checks after updating only the affected brand/grid expectations. These
do not indicate new runtime failures from the identity release.

The original production deployment is GitHub deployment `7248125297`, source
`5cb367de5da0290de4dda18f9e9d290ed94165db`, with successful readback before this
release. Keep it as the prior deployment reference. Hosted release readback
will be recorded after completion; this source
checkpoint alone does not claim that production is live.

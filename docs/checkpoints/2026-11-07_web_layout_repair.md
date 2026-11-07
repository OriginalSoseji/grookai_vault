# Website layout repair — November 7, 2026

The collector Sets grid and brand lockup now follow the native visual system.
The original logo, bundled Roboto Black wordmark, and active Winter palette
remain the shared brand authority.

- Replace the measured -2px avatar/wordmark overlap with an 8px gap; retain the
  original 64px avatar and 20px wordmark.
- Set the header wordmark color from the active theme, including the collector
  cascade in light mode.
- Present set artwork upright in 5:7 frames with 10px corners/insets, without
  decorative rotation or shadows. Use a two-column phone grid and denser desktop
  layouts with 9px gaps, readable two-line names, and bilingual metadata.
- Preserve governed artwork selection, game filters, pagination, compare state,
  and set routes. No catalog, image-pointer, account, or pricing writes.

The release candidate is based on live deployment
`dpl_4Bq4zf22P4m2p16zLTgFeLqCowLp`, preserving the newer seller features absent
from main. The source audit changes only four visual files; the other 2,542
deployable files retain their exact hashes. Do not replace that feature baseline
with a main-only deployment while releasing this correction.

Qualification: 162 default website browser checks and 11 brand browser checks
passed. Hosted candidate `grookai-vault-hmg8j6nm6-sosejis-projects.vercel.app`
passed at 320, 390, 900, 1440, and 1920px in dark and light mode; verified the
original 64px avatar, 8px gap, Roboto 900, upright images, 9px grid, 10px corners,
two-line titles, no horizontal overflow, and game-preserving One Piece/MTG links.
The 390/1440px accessibility checks reported no serious or critical findings.

Local fixtures exercise long Japanese titles, missing/broken artwork, and the
production collector CSS cascade. Visual fixtures remain unavailable in
production. Normal commit/push checks and actual production alias readback are
recorded separately in operator artifacts under `web_visual_repair_20261107`;
candidate qualification alone does not assert publication.

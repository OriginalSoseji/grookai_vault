# Card detail artist navigation

The founder requested a live link from the card detail artist to their page.
The Artist row, Illustrated by credit, and Card information Illustrator value
now link to the existing artist-filtered Explore page. Artist names are encoded
as URL parameter values, the card's game scope is retained, and active comparison
cards are preserved. All languages remain available on the destination. Blank
artist credits remain absent. Links are underlined and keyboard focusable.

This is a website change based on live/main
`3a1f104777e69bd729d80de84caafec165e80c64`, rollback deployment
`dpl_735os7qbYZkknKr46dEwe1atcmgy`. Work is isolated in
`C:/grookai_vault_artist_release_20260920`, branch `fix/card-detail-artist-link`.
No database/schema, worker, native binary or feature-setting changes.

The established full local shipcheck and protected-production promotion flow
apply. Verify all three rendered links, tap the main Artist value, and confirm
the destination's artist name and total count. Release and browser evidence:
`C:/grookai_vault_operator_artifacts/card_detail_artist_link_20260920`.

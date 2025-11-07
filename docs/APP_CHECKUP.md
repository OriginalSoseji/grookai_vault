# App Checkup

Area | Status | Evidence | Fix suggestion | Priority
--- | --- | --- | --- | ---
Explore Feed | Yellow | Uses mixed image renderers; now standardized to 3:4 helper | Keep using FixedAspectImage; remove lingering unused imports | P2
Wall Feed | Green | REST `wall_feed_v` + WallThumb 3:4 in place | Consider prefetch for smoother scroll | P3
Search | Green | Thumbnails via `thumbFromRow`; subtitle cleanup | Add clear button to text field | P3
Card Detail | Yellow | Header image standardized to 3:4; verify full-res path | Add tap-to-zoom experience in follow-up | P3
Diagnostics | Green | Pages render; GlowButton gated by flag | None | P3
Price Service | Yellow | Edge `ebay_sold_engine` is stub; view fallback present | Keep using sold_comps_v; replace stub later | P2
Thumb Maker | Yellow | Copy shim (no resize) writes 720x960 | Swap in real resize when image lib available | P1
Storage | Green | Ensure buckets script + policy note | Add explicit RLS/policy docs snippet | P2

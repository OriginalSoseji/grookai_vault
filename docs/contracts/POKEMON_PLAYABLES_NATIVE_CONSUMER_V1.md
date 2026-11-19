# Pokémon Playables Native Consumer V1

Status: Active implementation and release contract.

The owner's next-step direction continues the accepted Pokémon usage feature
into native search and card details. This is a thin consumer of
[the existing engine](POKEMON_PLAYABLES_ENGINE_CONTRACT_V1.md), following its
simplified V1 scope. It introduces no gameplay, legality or per-card review
authority. The original Smart Search V1 mobile exclusion remains historical
scope; this separate contract governs the native integration of the already
published shared resolver and read model.

- Forward `playable=1` and unmodified `playable` / `playables` queries through
  the shared resolver, retaining language, ownership, rarity and paging intent.
  Empty results and failed requests cannot retry by quoting away the playable
  constraint or fall back to a different parser or unfiltered database query.
- Native search grid/list and card details show the same published membership,
  including verified full-art and SIR versions. Rarity and artwork do not set
  native flags. Canonical, printing, ownership and pricing truth are unchanged.
- Read only `/api/playables`, the sanitized public projection. Verify its
  version, physical Pokémon Standard scope, identity uniqueness, bounded rows,
  counts and validity. Native receives no private source evidence or secrets.
- Visible consumers share one request and at most one minute of cache. Refresh
  while observed and on app resume. Expiry, invalid data and transport failure
  remove highlights. A superseding snapshot removes revoked membership.
- A playable search requires a current ready publication containing its
  returned canonical IDs. Publication changes trigger the same query again;
  expiry or unavailability clears stale results while keeping query/filter
  context and retry available. Filtering and ordering remain backend work.
- The badge explains recent Standard decklist usage over 30 days, support,
  evaluation/expiry and attribution. It makes no new exact-print eligibility or
  purchase claim. Preserve shared typography, semantic colors and layout.
- Verify failure, expiry, revocation, request coalescing, ordinary/premium
  agreement, query preservation and real native presentation. Managed hooks and
  hosted checks remain required. Device updates additionally require a higher
  build and identical signer through the Android preflight; preserve app data.
- Android/iOS source and candidate version remain aligned under the mobile
  continuity contract. An Android candidate is not a completed paired store
  release. Store submission remains a distinct authorized action.

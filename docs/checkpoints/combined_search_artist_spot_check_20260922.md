# Artist search spot check — September 22

Source: `b943b03fac34b3d5b750822ee9340de047ed3a5d`. Requested read-only spot check.
Evidence directory: `C:/grookai_vault_operator_artifacts/combined_search_20260922/`.

## Live pagination results

Compared every live result page with public Pokemon catalog records. Counts are
card parents, not finish printings or a complete independent artist bibliography.

| Artist | Stored matching parents | Live results | Pages | Outcome |
| --- | ---: | ---: | ---: | --- |
| Ken Sugimori | 1,299 individual + 1 shared credit | 1,300 | 21 | Complete after shared-credit reconciliation |
| 5ban Graphics | 1,719 | 1,719 | 27 | Complete |
| Tomokazu Komiya | 242 | 242 | 4 | Complete |
| Asako Ito | 32 | 32 | 1 | Complete |
| ryoma uratsuka | 41 | 41 | 1 | Complete |
| Yuka Tanaka | 3 | 3 | 1 | Complete |

All 55 pages returned HTTP 200, with stable per-query totals and no duplicate or
missing IDs in the reconciled comparison. Lowercase first-page queries retained
the same total and identities for all five mixed-case names; ryoma was already
lowercase. The first exact-credit-only comparison flagged Ken's shared card as
an extra; retain that raw finding alongside the reconciled result, not as a live
product failure. Public readback confirms Cynthia & Caitlin, Cosmic Eclipse
#189 (`GV-PK-CEC-189`), has credit `Ken Sugimori/Yusuke Ohmura`.

Five sample credits agree with official Pokemon card listings:
[Aron, Ken Sugimori](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/ex1/50/),
[Leafeon V, 5ban Graphics](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/swsh7/166),
[Drilbur, Tomokazu Komiya](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/bw5/55/),
[Shelgon, Asako Ito](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/sm7/105),
and [Poochyena, ryoma uratsuka](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/swsh4/103/).
Yuka Tanaka's official page yielded no usable extracted text; independent primary
credit verification remains open for that sample, despite stored-credit parity.

Requests were limited to two concurrent readers. 5ban Graphics pages ranged
from 2.605 to 8.883 seconds; Ken pages ranged from 2.017 to 3.762 seconds.
These are observations, not a controlled benchmark or candidate performance
acceptance. Performance remains a release follow-up. No catalog writes, user
account reads, deployment or application changes were performed.

## CS-ARTIST-02 — shared-credit regression in unreleased candidate

Priority: P1, fix before combined-search release. Current live Ken search includes
Cynthia & Caitlin #189. The candidate's `recognizeCombinedArtist` produces only
`["Ken Sugimori"]` for a full-name match, and the route passes those `artistNames`
to `fetchPokemonArtistRows`. Its equality membership query consequently excludes
the stored joint credit. The equivalent query for Yusuke Ohmura has the same issue.

Reproduced offline using the real current parser and catalog query helper with
the captured public joint-credit row as a frozen client response. In all three
cases, the prior helper name expansion includes the card and the candidate's
explicit parsed-name list excludes it:

- `Ken Sugimori`
- `Ken Sugimori Cynthia & Caitlin`
- `Yusuke Ohmura Cynthia & Caitlin`

This is an executed shared-function reproduction, not a live candidate API,
browser or device result. Relevant code:
`apps/web/src/lib/search/combinedArtistIntent.ts`,
`apps/web/src/lib/search/artistSearch.ts`, and
`apps/web/src/app/api/resolver/search/route.ts` (artistNames handoff).
No repair was made in this spot check.

Acceptance for repair: an individual contributor's search includes recorded
shared credits containing that contributor; card-name and recorded-finish
constraints remain AND constraints; unrelated artists stay excluded; complete
pagination, spelling correction and ambiguous-name selection remain intact.
Add a local API fixture for this real shared-credit shape, then verify web/native
behavior and existing regressions before rerunning affected release gates.

Receipts: `artist-spot-check.json` (raw exact-credit comparison),
`artist-spot-check-reconciled.json` (reconciliation, official sources and executed
candidate reproduction). The prior missing Lost Origin Wurmple credit remains
CS-CATALOG-01; passing stored-record pagination does not close catalog omissions.
Environment counts used only restricted administrative HEAD reads for sanity;
all compared card data used the public client. This documentation-only checkpoint
uses the operator hook bypass and does not claim a new full repository gate.

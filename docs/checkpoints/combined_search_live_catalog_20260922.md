# Combined search live catalog readback — September 22

Candidate `56f29416fadb9c0b1ebc68f69bf4c28287e404a1`. This is read-only public
catalog evidence and offline interpretation, not a deployed combined-search test.
Private receipts live under
`C:/grookai_vault_operator_artifacts/combined_search_20260922/`.

## Current artist-search completeness

At 17:40 UTC, all 195 public Pokemon parents with exact artist `Yuka Morii`
appeared in the deployed artist search across five pages. There were 195 unique
IDs, no missing IDs, and no extras compared with the public catalog read.
Page counts: 48, 48, 48, 48, 3. Observed response times: 1,024, 589, 660, 584,
552 ms. These five observations are not a load test or candidate latency proof.
Matching the stored catalog does not establish completeness against every card
ever printed, artist aliases, all languages, or missing catalog credits.

Environment validation matched the canonical host and checked-in project ID.
Exact administrative HEAD counts were 170,658 card prints, 3,399 sets, and
32,903 traits. The initial anonymous whole-table count returned an error and is
retained separately; no error was converted into zero. Administrative access was
restricted to these three sanity counts. All compared catalog/card/printing rows
used the public client and its visibility rules. No application server was
configured against production and no writes were issued.

## Real Wurmple example

The public exact English-name read contains 13 Wurmple parents. One is credited
to Yuka Morii: Platinum #103, `GV-PK-PL-103`, release date 2009-02-11.
Its recorded children are `GV-PK-PL-103-STD` (normal) and
`GV-PK-PL-103-RH` (reverse). No matching parent lacks child records.
Pokemon's [official Platinum carddex](https://assets.pokemon.com/assets/cms/pdf/tcg/carddex/Platinum.pdf),
page 37, independently confirms Wurmple #103/127 and Yuka Morii's credit.
The official HTML card page reports 103/133 instead; this readback does not
resolve or mutate that denominator discrepancy. The PDF does not prove finish
completeness, and no inference from rarity or artwork created a finish.

The current parser was executed offline against the frozen readback, followed
by independent filtering of that captured subset:

| Query | Expected from recorded subset |
| --- | --- |
| Yuka Morii Wurmple | One parent, Platinum #103 |
| Yuka Morri Wurmple | Same parent; visible Morri-to-Morii correction |
| Wurmple reverse holo Yuka Morii | One reverse printing |
| Yuka, wurmple, holo | Zero recorded ordinary-holo matches |
| Morii Wurmple non-holo | One normal printing |
| Yuka Morii Wurmple any holo | One reverse printing |
| Yuka Morii Wurmple 2007 | Zero in this subset |
| Yuka Morii Wurmple 2009 | One parent |

Eight offline cases agree with these expectations. This is parser-plus-captured-
data evidence, not execution of the candidate database resolver. Ordinary holo
and reverse holo remain distinct as agreed. Zero recorded ordinary-holo matches
does not establish that such a printing never existed. Japanese-name discovery,
independent finish completeness and production-scale candidate latency remain open.

## Catalog finding CS-CATALOG-01 — missing credit

`GV-PK-LOR-006` (Wurmple, Lost Origin #006) has a null artist in the public
catalog. Pokemon's [official card listing](https://www.pokemon.com/uk/pokemon-tcg/pokemon-cards/series/swsh11/6/)
credits ryoma uratsuka. This is a catalog metadata gap, not a missing Yuka Morii
match. It can prevent exact-artist matching for the correct illustrator.

Priority: P2, catalog discoverability. Proposed follow-up: use the governed
source-backed catalog repair process, preserve card/printing identities and
ownership, and verify the approved credit through public card detail and artist
search after any separately authorized apply. Do not patch production directly
or attribute the card to Yuka Morii. No repair was applied here.

Evidence: `live-wurmple-coverage.json`, `live-wurmple-missing-credit.json`,
`live-wurmple-interpretation.json`; the failed initial count is retained in
`live-wurmple-public-count-attempt.json`. Raw/private scripts and receipts stay
outside source. No product source changed; the documentation checkpoint uses
the established operator hook bypass without claiming a new full shipcheck.

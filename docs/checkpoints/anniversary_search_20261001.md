# Anniversary search consistency — October 1

Source: fix/anniversary-search-20261001, based on PR572 main 98e75510bd.
Private release receipts: C:/grookai_vault_operator_artifacts/anniversary_search_20261001.
That directory records deployment status; source alone is not proof of release.

The 30th anniversary had a special family rule. Other anniversaries only matched
literal titles, so English Celebrations and Classic Collection were absent from
25th anniversary searches. All numbered anniversary titles now contribute to a
caller-visible, game-scoped family. Localized titles and embedded product names
count, including Japanese 周年. Pokemon numbered Celebration titles retain their
existing interpretation. Exact full titles/codes stay more specific than the
generic anniversary alias. Short ordinals use the same family and retain card-name
disambiguation. Unknown/quoted words stay literal.

Renamed Pokemon releases have explicit code associations: g1/xy12 for 20th;
cel25/cel25c/mcd21/2021swsh for 25th. Only codes present in the caller's current
catalog are used. Release years and similar names never imply membership:
Prismatic Evolutions, Start Deck Generations, and other McDonald's years are
excluded. This is search interpretation, not catalog identity consolidation.
Individual anniversary promos within broader promo sets are not inferred.

Catalog title/presentation evidence is frozen in the private catalog snapshot.
Regional association references: Pokemon TCG Generations and XY Evolutions
product pages; Japanese CP6 20th Anniversary product page; official Celebrations
card checklist (25th_web_cardlist_en.pdf, including Classic Collection); McDonald's
2021 Happy Kids 56 booklet (mcdonalds.pt/media/6294/happykids_56_web-1.pdf).

Tests cover short/full ordinals, order, specific collection names, catalog
visibility, game scope, artist/finish/language constraints, legacy clients and
complete pagination. Preserve PR572's V5 bounded name reads and request-local
first-page provenance. No schema, catalog, inventory or native binary changes.

Release requires normal commit/push hooks, CI, unchanged 414 migration ledger,
protected hosted candidate and live full-result/browser verification. Compare
anniversary results to independently enumerated visible family sets, not the
previous incomplete anniversary response. Preserve old search regression IDs.

# Pokémon playable collector filters

The live resolver treated `sir playables` as literal text and returned no cards,
although the current publication included 32 Special Illustration Rare cards.
The complete catalog-search path now recognizes the existing SIR and IR aliases
as exact, separate rarity categories and exposes removable filter labels.
Common is exact and cannot match Uncommon. Card-name terms, printed numbers,
other constraints and the published playable membership remain in force.

`full art`, `full-art` and `fullart` use an explicit Full Art catalog marker in
rarity, variant, printed identity modifier or display discriminator. Names,
prices, premium rarity categories and shared gameplay membership cannot create
an artwork classification. Quoted literals and non-Pokémon SIR text retain
their meaning. No canonical data or source-collection change is included.

Canonical environment readback passed for `ycdxbpibncqcchqiihfz`: 173,837 card
prints, 3,420 sets and 47,409 traits. Against the 269 published positive IDs,
the actual discovery matcher returned exactly 32 SIRs, 15 IRs and 42 commons;
the SIR Bloodmoon Ursaluna query selected its two SIRs. Ordinary name search
retained all five ordinary/premium family versions.

None of these 269 catalog rows currently has an explicit Full Art marker.
Consequently that narrower filter remains empty for this publication. The
ordinary playable query still includes matching full-art versions, including
`GV-PK-TWM-202`. Adding artwork metadata is a separate catalog evidence task;
this correction does not infer Full Art from Ultra Rare or SIR.

Focused validation: all 12 playable search tests passed, web typecheck passed,
focused lint passed and `git diff --check` was clean. The tests exercise the
actual discovery text matcher, visible filter removal, exact rarity separation,
explicit artwork metadata and preservation of other search terms. Existing
membership, unavailable-source and ownership tests remain in the same suite.
Standard managed commit/push checks and hosted checks apply to publication.

The first managed commit run stopped with 8,782 contract passes, 11 existing
skips and one temporary Git-fixture failure: Windows denied writing an object
in the cleanup test's temporary bare repository. All nine tests in that suite
passed unchanged in isolation. The failed receipt is retained and the complete
managed gate is rerun without assertion, timeout or exclusion changes.

The next run passed all 8,783 contract assertions (11 existing skips) and the
eBay backend tests, then stopped on a native Windows process crash
(`3221226356`) in the unchanged Square artwork test. The same dependency
versions and bundled font hashes matched the previously verified checkout.
The artwork suite subsequently passed all 21 tests from the required checkout
root without source, dependency, assertion or environment changes. The native
crash receipt is retained; it does not establish a search regression or a
diagnosed native-library root cause.

Review then narrowed exact-category checks to Common, Uncommon, IR and SIR,
preserving existing word-order behavior for other rarity phrases. The owned
verification process was stopped before this edit and its receipt retained.
All 11 focused tests passed again, including the legacy rarity-order cases.

The Windows image library reports 24 native workers by default. Local managed
verification uses the documented `VIPS_CONCURRENCY=1` resource cap after repeat
native artwork crashes; the complete 120-test Square suite passes with this
setting. Assertions, timeouts and exclusions are unchanged. Verification uses
the standard pinned Flutter test command and separate per-run logs. A prior
overlapping verification process and its mixed log are retained separately;
only the active run's output is used for acceptance.

Review correction: the resolver now carries a separate discovery query that
retains user-supplied quotes, while display text stays unchanged. Quoted `SIR`
and `Full Art` text cannot become collector constraints after dispatch. The
regression test exercises the actual resolver route's forwarded text and the
actual discovery matcher, including mixed quoted text and an unquoted SIR
constraint. Automatically protected set phrases retain their existing syntax.

Private readback evidence: `.tmp/pokemon_playables_search_comparison_20261119.json`
and `.tmp/pokemon_playables_search_metadata_20261119.json` in the primary workspace.

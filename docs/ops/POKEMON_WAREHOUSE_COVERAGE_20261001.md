# Pokemon warehouse coverage — October 1, 2026

Status: implementation candidate. The six-hour workflow change is not deployed.
Dragonite intake and classification were applied; no canonical promotion was applied.

The discovery workflow previously checked English Pokemon set inventories but did
not reconcile the complete Pokemon product warehouse. Its product-level warehouse
reconciliation covered One Piece. Successful discovery runs therefore did not prove
that every warehoused Pokemon card had reached the Master Index or canon.

## Coverage invariant

Every preserved TCGCSV product in categories 3 and 85 appears once in the coverage
report, including retired products. A source mapping establishes a relationship,
not exact printing truth or whole-catalog completeness. Wrong-language mappings,
retailer/base mismatches, ambiguous mappings, parent-only rows and unresolved
products remain open. Missing numbers never prove that a product is not a card.

Name/number hints identify possible existing parents for review. They cannot close
a gap or authorize a mapping. This prevents inserting duplicates of the existing
Duraludon and Suicune GameStop identities. Existing queue IDs and their original
age remain attached to each task; a parked review is not completion.

Run with a new output directory, canonical database credentials and the trusted
Supabase CA:

```powershell
node scripts/workers/pokemon_warehouse_coverage_v1.mjs --out-dir=C:/operator-evidence/pokemon-coverage-new --require-complete
```

Outputs: `coverage.json`, `summary.json`, `gamestop.json`, `worklist.json`.
Exit 2 means unresolved warehouse products; source/database failure is a failed
run, never an empty successful inventory. The workflow job runs independently of
remote checklist acquisition and preserves evidence even on failure. Worklists
use stable product keys, reuse existing queue IDs and prioritize retailer gaps.
This worker does not acquire source evidence, create queue records, or promote.

## Observed production state

- 63,563 products: 32,855 English and 30,708 Japanese.
- 40,155 unresolved relationships, including 213 mapped parents without children.
- 11,829 have possible existing parent matches requiring exact mapping review.
- These counts are not a count of missing cards.
- 24 GameStop products: 20 discovery reviews, two existing identity mapping
  reviews, one promotion review and one product without a discovery candidate.

The full private receipts are under
`C:/grookai_vault_operator_artifacts/gamestop_catalog_gap_20261001/`.
The final coverage receipt is `warehouse-coverage-final/summary.json`.

## Dragonite and the bridge defect

TCGplayer product 456093 identifies Dragonite 131/195, and its preserved image
shows the red GameStop stamp. Bulbapedia's exact card release section distinguishes
that Holofoil variant from the Silver Tempest-logo and EB Games variants:
https://bulbapedia.bulbagarden.net/wiki/Dragonite_(Silver_Tempest_131)

The existing generic `stamped` Master Index fact for this card describes the
Silver Tempest logo. It must not be reused as GameStop evidence. The archived
Pokemon.com announcement also describes the Silver Tempest logo, so it was not
counted as independent exact GameStop-stamp evidence.

The first bridge apply failed before insertion because `payload_snapshot` was
undefined. Its post-write proof parameters also captured the candidate ID before
insertion. Both are corrected: the actual payload is passed, and proofs resolve
the returned ID after insertion. Tests exercise actual shared-runtime execution
and require both candidate and event readbacks.

Exact source candidate: `652e688e-f4ae-4246-87e5-b0e13f6d4e12`.
Exact live warehouse candidate: `8a259799-2c4a-4688-a43a-ad828bf9ef9a`.
State after bounded intake and classification: `REVIEW_READY`,
`PROMOTE_VARIANT`, `CREATE_CARD_PRINT`, `gamestop_stamp`, set `swsh12`.

This is not a promotion receipt. The current parent stage explicitly creates no
child printing, external mapping or image. A complete promotion still requires
the exact reviewed Master Index package, guarded parent admission, verified Holo
child admission and public search/selection readback. Do not report the parent
stage alone as collector-ready. No old frozen retailer repair may be replayed.

## Verification and follow-through

The focused coverage, bridge, shared-runtime and universal-discovery suites pass
59 tests. Search regression checks pass another 14 tests. The first broad run
passed 6,058 contract tests with 10 skipped, plus TypeScript and ESLint. Its build
stopped at the production activation guard; local verification uses the supported
read-only preview mode, without administrative credentials. A complete live
read-only run accounted for all products and returned
exit 2 as required. The source acquisition failure cannot hide warehouse gaps.

The current main mobile search uses the web resolver. A legacy name-only RPC
still exists, but that is not evidence that the main mobile search uses it.
The production website returned HTTP503 for `gamestop`. The combined search path
was scanning the catalog before filtering stamps. A broad ILIKE/JSON predicate
also timed out under public RLS. Exact `gamestop_stamp` equality on either
canonical modifier column narrows before that visibility check. Final constraints
and all result pages are retained. Only the governed GameStop stamp key uses this
optimization; unknown labels retain the existing path.

`Game Stop` was separately misparsed as the partial artist `GAME FREAK inc.`.
Masking that retailer phrase during artist recognition preserves the original
offsets and reversible filter chips.

Local read-only web verification against the live public database returns HTTP200
and the existing Duraludon/Suicune rows for `gamestop` (883ms) and `Game Stop`
(370ms), and only Duraludon for `Duraludon gamestop`. `Dragonite gamestop` correctly
remains empty. These are local implementation receipts, not deployment proof.
Source images for 23 of the 24 warehouse products were preserved privately;
the Team Rocket's Zapdos image returned403 and remains unresolved.

Finish the GameStop evidence and promotion packages first, then process the
remaining worklist by language and source product group. Resolve each task with
exact parent/printing/mapping readbacks or a specific retained evidence conflict;
never close a task merely because discovery or classification ran successfully.

# Collectr catalog scope review and retailer matching

Baseline main a7b2e8ceb includes PR608 and the founder dashboard refresh. The
previous import and receipt recovery are complete: 1,616 accounted copies,
543 review rows, 1,329 preserved groups and 3,223 owner copies. No old request
may be reused to import another increment.

Fresh read-only catalog review covers all 216 source rows previously classified
as set-scope or collector-number gaps. Exact normalized-name/number discovery
found candidates for 88 rows; 128 returned none under that bounded probe. This
does not prove catalog absence or establish a source-to-candidate identity.
The private row ledger preserves every source record, candidate and next action.

Of the 216 rows, 72 explicitly identify Japanese cards, 71 explicitly identify
Chinese cards, and 73 need product/variant scope review. Among the 17 Japanese
candidate parents inspected, six are public-visible and 11 have existing child
rows, but none returns a public printing option. Existing children and historical
normal defaults do not authorize their use or publication. Language scope,
printed variants and finish evidence require separate governed reconciliation.

Two English retailer rows, totaling four copies, bind to an existing Generations
Pikachu26 parent with both Toys R Us stamp fields and one active public Holo
printing. The candidate routes only the full source product label plus 26/83
coordinate out of the umbrella category. It rejects unstamped/wrong-language
parents, wrong totals, other stamps, unknown labels and conflicting finishes.
It introduces no schema, catalog, permission or printing changes.

Fresh public preview and server validation used 301 read-only requests. Only
these two source rows changed; all other preview rows and all 1,329 saved source
groups remained exactly unchanged. Projected totals are 1,620 accounted copies
and 541 review rows. These projections are not a claim of deployment or saving.
Shared web/server/native fixtures cover correct matching and 23 rejection cases,
including missing, inactive and duplicate printing evidence. TypeScript and all
950 importer contracts pass; native retailer tests pass.

Private evidence and actual normal-hook, hosted-check, release and save status:
`C:/grookai_vault_operator_artifacts/collectr_scope_review_20261007/CHECKPOINT.json`.
The scope ledger leaves 214 of this 216-row batch unresolved with specific
evidence requirements. Preserve the separate 327 review rows, the pending
graded-item preference, all consumed receipts and every populated local lab.

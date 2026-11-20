# Market reconciliation scope correction

The full V2 shadow 44737703296 built 187251 snapshots from 249511 selected
observations, then failed reconciliation because the scope marker referenced
the undefined variable `canaryDefinition`. It never verified or activated.
Existing production publication and condition-price readers remained live.

Worker V1_25 reads `args.canaryDefinition` for the scope marker. Full unlimited
selection records true; limited or explicit canary selection records false.
The worker version changes so the failed V1_24 shadow cannot authorize this
runtime. A new full shadow and guarded production activation remain required.
The deployed 512 schema and immutable migration payload remain unchanged.

Four behavioral tests execute the actual resumed durable reconciliation path,
including a missing snapshot trace that must not verify. Reintroducing the old
reference reproduces the original ReferenceError; restoring the correction
passes all four tests. No source-string assertion substitutes for execution.

The actual worker also completed all five durable phases against the retained
unlinked 512 PostgreSQL fixture: eight full-source candidates, five traced
snapshots and no mismatches, followed by a one-candidate limited run whose
full-source marker stayed false. Test-only category/group/product display
metadata completed the synthetic fixture; it is not provider authority.
All writes, including that metadata, rolled back. Protected-table fingerprints
were identical afterward. The fixture contained zero Auth users or owned
copies, used its existing internal Docker network and published no ports.

Private execution receipts are in
`C:/grookai_market_reconcile_20261120/artifacts/pricing_reconcile_fix_v1/20261120/`.
The initial fixture-harness failures remain retained. Normal full local hooks,
hosted checks, a new same-runtime full shadow, guarded production activation,
independent app readback and refresh health remain release gates.

This branch starts from main d848cdb93e and preserves the newer eBay review
wording and catalog work. It changes no canonical identity, mapping, price
amount, condition reference, asking price, inventory or valuation calculation.

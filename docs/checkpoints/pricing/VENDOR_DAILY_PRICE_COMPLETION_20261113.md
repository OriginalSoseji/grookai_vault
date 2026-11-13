# Daily vendor asking prices and permanent QR continuity

The owner's requested default is fresh exact TCGPlayer Market rounded up to
the next whole USD, with zero markup or fixed adjustment. An already whole
dollar stays unchanged. Existing My price copies remain fixed. New unpriced
private copies inherit the opted-in default; publication still requires For sale.

The daily market producer and five-minute vendor repricer are separate clocks.
The producer acquires real source observations and publishes a fully reconciled
market generation. The repricer applies the saved rule to automatic copies and
hands changed asks to the existing Square queue. Running the repricer against a
stale publication is not evidence of a daily market refresh.

November 13 investigation found the production timer still pinned to
`cdcec2aa6ab39c237047119fa1dd31605ea1449f`, worker V1_17. Daily source collection
completed, but November 12/13 activation failed closed with an exact two-row
readback mismatch. The current pointer remained on the November 11 generation.
The reviewed V1_22 qualification repair already excludes the invalidated Gengar
mapping, as documented in
[its qualification record](../../audits/pricing/tcgplayer_reviewed_invalidation_qualification_repair_20261106_v1/REPORT.md).
Do not relax the count check, admit invalid mappings, extend the 36-hour source
freshness limit, or edit the publication pointer directly.

The initial V1_22 runtime correction at source
`318548dde7d8abb9152c3e0b566e043aa2512b5a` is an intermediate recovery receipt,
not the final continuity source. Final reviewed continuity source is
`786ec75d9b010bff4db202b0f2ac8a58944117b5` (PR914–916), worker V1_23. It shares
the current-source advisory lock with source acquisition, so a new warehouse
generation cannot invalidate a publication in progress. The active-ask phase
retains its own 120-minute timeout even when publication needs a longer budget.
See the binding [pricing runbook](../../runbooks/TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md).

The primary daily timer stays at 08:15 UTC, with existing storage preflight,
locks, source acquisition, reconciliation, alerting, and immutable evidence
retained. The independent hosted continuity watchdog evaluates every two hours,
refreshes at 26 hours of source age or at 18 hours following a production failure,
and defers an active production run for six hours. The client cutoff remains
36 hours. Existing operations endpoint credentials are configured separately in
the server and hosted workflow; check delivery receipts, not a notification step
marked successful under continue-on-error. No credential belongs in this record.

Replace only the qualified pricing runtime pointer and its public expected-commit
pin through a guarded, recorded operation. Installed files, active pointer,
scheduled configuration, successful invocation and current publication are
separate states. Preserve retention, other workers, environment secrets, and
failed daily run directories. Never resume a frozen failed run under a different
commit; a verification run needs a distinct run key.

The protected continuation root is
`C:/grookai_vault_operator_artifacts/vendor_daily_completion_20261113` and the
server-side preparation root is
`/var/lib/grookai/ops/vendor-daily-20261113`. Read the latest checkpoint and
actual systemd/database/provider receipts before operating. Preparation, a
workflow dispatch, or this document does not establish restored publication.
The earlier V1_22 source-matched shadow is `43480276260`; the redundant pending
dispatch `43480294730` was cancelled. Its automatic production dispatcher was
stopped when main advanced, before any production dispatch. Do not restart that
obsolete coordinator. The V1_23 continuity recovery uses the ordinary guarded
full-production runner, with its unchanged qualification, zero-mismatch readback
and activation gates. Recovery `43495002642` is source-bound to the final commit
above; consult actual terminal receipts instead of inferring success from this
historical run identifier. Never launch a competing recovery while one is active.

Completion evidence must distinguish real daily source acquisition, successful
current publication, actual rule-based asking-price readback, current permanent
QR destination, confirmed Square price, and checkout evidence. Source changes
can be exercised in the isolated authenticated lab; never invent production
market evidence, physical stock, or a cash transaction. A previously recorded
genuine checkout remains checkout evidence, not a new automatic-price sale.

The permanent `/q/{GVVI}` QR contains identity, not an embedded amount. Its
redirect is no-store, and the public copy page is dynamic with revalidation
disabled, reading the current exact-copy ask. Labels remain price-free and use
actual full set names. The existing Munbyn 102 x 152 mm physical print and both
phone/Square scans are accepted. Android P21 physical acceptance is separate.

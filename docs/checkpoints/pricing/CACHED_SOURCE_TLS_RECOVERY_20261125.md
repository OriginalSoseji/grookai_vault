# Cached TCGCSV source TLS recovery — November 25, 2026

The pipeline's outage fallback used a separate `pg.Client` configuration with
certificate verification disabled. It now calls the shared canonical database
configuration and a dedicated read-only source reader. The active source query,
ordering, selected fields, freshness policy and source timestamps are unchanged.

Remote connections must have an authorized TLS socket. The reader starts and
verifies an explicit read-only transaction before selecting source evidence,
because the actual session pooler ignores startup read-only options. Failure to
verify either condition prevents fallback evidence from being returned. Cleanup
rolls back and closes the connection on success or failure. Literal loopback
remains available for owned qualification databases.

Tests cover the real reader boundary, verified direct and session-pooler routes,
unverified TLS, unenforced transaction mode, invalid project/database/routes,
missing evidence, connection/query errors and cleanup. The pipeline imports this
reader; it has no second unverified fallback configuration. The scheduled health
reader had the same independent TLS bypass. It now uses the shared connection
helper, verifies the actual remote socket and explicitly confirms its existing
read-only transaction before reading evidence. All health SQL and thresholds are
unchanged. A regression against its original source fails before this correction.

Prepared reader qualification used a fresh verified production read-only
transaction and retained the exact original source row. Receipts are under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/current-main-1055-v1/tls-preparation-v1/`.
That prototype proof is not final-source release acceptance. The first full check
was deliberately stopped when the additional health-reader bypass was observed;
its original partial log and stop reason are retained. Normal full hooks,
hosted checks, review and runtime qualification remain required for this source.

The full worker32 shadow from source `62cb16aba7` reached all 249,767 candidate
decisions before its original four-hour outer timeout. Its original failure is
retained. One separately terminal-qualified continuation resumes the same durable
run under the original locks, unchanged worker/source/freshness and no activation.
This branch changes neither that staged source nor any running pricing worker.

No schema, mapping, canonical identity, owner, price, source observation or
publication pointer is written by this change. Completed Japanese link batches
and original stamp holds must not be replayed. Production completion still needs
full reconciled publication, guarded activation, actual consumer/app comparison
and a natural scheduled refresh.

## Server runtime handoff

The credential-free Linux candidate is under
`/var/lib/grookai/market-pricing/worker32-tls-staging-20261125-e848d8fb21`.
Its complete target Git tree and all 609 original execution inputs passed; all
178 publication/transport tests passed without failures or skips. This is the
historical `e848d8fb21` candidate. Main subsequently advanced through PR1062;
the integrated source must complete fresh normal, hosted and review checks.
Neither candidate staging nor these tests activate pricing.

Production handoff must use the runtime deployment lock, a recorded exact
qualified source SHA, the verified Node22.23.5 binary and approved CA. Preserve
the existing private environment file, original rollback evidence and MEE link.
Protect executable runtime paths from service-user writes and scope Git trust to
that exact runtime directory when required. Put writable output under the data
volume, with both existing storage floors intact.

The real full shadow exceeded the original four-hour outer publication budget.
Budget the server publication phase for eight hours and its service for twelve
hours; retain the active-ask 120-minute cap, unlimited source scope, 36-hour
freshness, reconciliation, coverage and activation checks. The separate manual
GitHub workflow retains its own checked-in bounds. Keep the daily08:15UTC timer;
do not count an incomplete or failed daily slot as natural-refresh acceptance.
Bind replacement verification to the actual completed full shadow and source
qualification, never a copied historical release flag. Capture actual first-run
resource use and source/consumer/app amounts before declaring the handoff done.

# Pricing completion operator readback V1

The adapter also accepts the explicit `FIXED_OPERATOR_PRICING_SOURCE_EXPORT_V2`
envelope. V2 selects the current publication through fixed SQL within one
repeatable-read, read-only transaction; no worker supplies a run ID or query.
Its six ordered records retain a terminal rollback record. The adapter requires
read-only startup still on after rollback and ordinary isolation restored, and
rejects source evidence already older than 24 hours when captured. Later aging
still produces stale coverage; recapturing a run does not refresh its source.
V1's original five-record format remains supported as historical evidence.

The version and terminal-record checks are offline validation of pinned operator
claims, not independent authentication of a live server. The separate protected
operator service now supplies atomic publication and a hash-bound handoff, as
described below. Neither format permits repository code or worker-selected SQL to
run with database credentials. The fixed collector must remain immutable to its
consumers; only its data output may enter their runtime.

This offline adapter accepts data captured by a separate fixed operator
inspection. The adapter itself does not establish a recurring feed or authorize production
execution. No database client, credential, environment configuration, subprocess,
or researcher-supplied SQL is loaded by the adapter.

The operator independently reviews and pins the exact remote script and literal
SQL. The historical V1 October 13 source census is frozen to run
`51ce449c-5bdf-4662-8f97-d0190f959384` and publication set
`58f535eb-fbfa-40a9-907d-219cbbf541a4`. It uses installed remote Python standard
library and psql, verified TLS with a pinned public CA, and a fixed repeatable-read
read-only transaction ending in rollback. The existing credential stays remote.
This is a manual bounded operator action, never a scheduled worker invocation or
a means to execute repository code under the operator's account.

The historical V1 source export script SHA-256 is
`a4f3fe7e93faef7a47419e1d77b1fce1b7e7469743c14478427e52eb8e5eda55`;
the literal SQL SHA-256 is
`6dca0430989b0f2dbd902bd9751c5ad7d79be642ebf10955768687f99a7825b0`.
Retained operator artifacts and actual outcomes live outside guest mappings at
`C:/grookai_vault_agents/pricing_completion_validation_20261013/operator-readback`.
The adapter is given only the exported JSON bytes and independently pinned hashes.
Hashes bind bytes; they do not authenticate an arbitrary self-declared operator.

The protected V2 source service uses collector SHA-256
`91eeb5f032b150ec5c23eaa0b8880850de761952bb3e3aca0c1dc42c41bd8e5c`
and literal SQL SHA-256
`2b48b80cab4d9b1317bf7fdbafcaa5bbbbfee9fe6637cef3d28f6d8f67190155`.
`grookai-pricing-completion-source.service` runs the reviewed
`publish_source_feed_v2.py` under installed isolated Python, with immutable
operator files under `/var/lib/grookai-pricing-completion-operator-v1`, root-only
configuration under `/etc/grookai-pricing-completion`, and only
`/var/lib/grookai-pricing-completion-feed-v1` writable. It has no worker-provided
SQL, run identifiers, file paths or executable inputs. Verified TLS and the fixed
repeatable-read/read-only transaction ending in rollback remain mandatory.

Publication writes an immutable generation, then atomic `latest.json`, then a
successful status. Before collection, status becomes failed/in-progress so an
interrupted attempt cannot silently reuse prior success. The credential-free
preparation service separately checks exact schemas, both independent code/SQL
pins, capture/manifest digests, run/set bindings, clocks and the terminal record.
It persists a durable accepted-feed cursor before queue work. The publisher keeps
at least two generations and every generation within the 30-minute age window;
the consumer normally retains two normalized caches. Queue/history/packets are
preserved. See `PRICING_COMPLETION_FEED_V1.md` for bounded failure retention.

The final implementation passed 41 queue/feed/worker tests and 22 publisher tests;
Linux qualification passed 18 synthetic feed checks, 13 boundary checks and full
43,022-item first/restart history and legacy-checksum comparisons. Two earlier
heap-exhaustion attempts remain retained. Bounded JSON hashing/writing passed at
the same 1 GiB/no-swap limit; memory reached that limit, so no headroom is claimed.
The shared CPU quota is 50% of one core; both services disable core dumps.

The initial live source generation
`c64ae9b728069f7ee9331a31bfe5caa80c2f30e05d39628e376db136f2319a15`
was captured at 2026-10-14T01:52:41.149Z, published at 01:52:47.198Z and finalized
in successful publisher status at 01:52:49.972Z, after a retained 01:50:53Z failure.
Windows preparation has stopped
and its byte-identical state transfer is recorded. The first resulting live Linux
cycle succeeded with 43,022 unchanged review-needed records, zero inserted,
reopened or resolved items, and 18,470 historical report hashes unchanged. The
heartbeat's 01:52:51.431Z timestamp is cycle start. The report remains
`blocked_execution_capability`. Fixed evidence is retained in
`operator-readback/runtime-live-readback-v1.json`. The independent post-handoff
history audit passed at 2026-10-14T02:00:44.384Z, preserving all 43,022 keys,
generations and history prefixes with zero additions or resolutions; its receipt
is `operator-readback/handoff-history-audit-v1/audit-receipt.json`. The timer was
enabled at 02:01:08Z and its first scheduled source/preparation cycle succeeded.
Final readback at 02:07:21.350035Z is retained in
`operator-readback/runtime-scheduled-readback-v1.json`, SHA-256
`b960603708d444700a077e869c702ded27b7f95227cab712969e085de5117690`.
Generation `11ba2c2e376e6f279ac50752ab7675f587bead0efad5cb7f2889a8c5f60d5bf9`
was captured at 02:02:10.069Z; 02:02:19.478Z is publisher status time, not capture
time. Both services exited successfully; the enabled timer is active/waiting,
with the next run due at 02:17:20Z. All 43,022 records remain unchanged and
review-needed, zero records were inserted/reopened/resolved, and 18,470 historical
report hashes were verified unchanged. No pause file or writer lock remains.
Installation, data handoff and source capture do not mean missing prices have
been repaired.

`normalizePricingCompletionOperatorReadbackV1` checks the canonical project,
pinned CA and SQL hashes, exact record shape, maturity, current publication/run
binding and capture freshness. A strict offline query replay reuses the source
exporter's identity, count and reason-partition validation. This replay is not
a live database transaction and does not independently verify remote rollback.
The receipt records `transport:fixed_operator_readback` and
`liveDatabaseAccess:false` to preserve that distinction.

Run the CLI only in the isolated runtime:

```text
node scripts/audits/pricing_completion_operator_readback_v1.mjs --input=<absolute-JSON> --expected-file-sha256=<independently-pinned-result-hash> --expected-sql-sha256=<reviewed-SQL-hash> --out-dir=<new-absolute-directory>
```

Output contains a normalized snapshot, receipt and hash-bound input manifest.
The manifest is written last; a failed or partial directory is not accepted.
Input and output directories must be separate, with no redirected paths.

Coverage is all unpublished observations in this one selected production run.
It does not enumerate warehouse products missing from that run or the Master
Index's exact-price gaps. Master coverage remains unknown, and no absence from
the refreshed export closes an old queue item. Preserve the earlier historical
queue and receipts when initializing the fresh, fully dimensioned queue.

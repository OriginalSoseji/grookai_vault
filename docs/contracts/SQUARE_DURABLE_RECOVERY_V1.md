# Square durable recovery V1

Status: default-off implementation candidate; not production qualified.

The [integrated capacity audit](../audits/SQUARE_INTEGRATED_CAPACITY_20261123.md)
separates actual shared-SDK/local-provider measurements from unit models, live
Square capacity and full-backlog freshness. A bounded wave is not a daily SLO.

The owner launch target is 100 vendors with 1,000 cards each. A clock-selected
merchant window can skip vendors when scheduled invocations arrive late. This
candidate stores due work per connection and selects the oldest due eligible
connection instead. It does not establish a daily freshness guarantee. Pricing
drain, provider capacity, hosted clock delivery and actual seller acceptance
require their own evidence.

`GROOKAI_SQUARE_DURABLE_RECOVERY_ENABLED` is server-only and defaults to false.
It requires `GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED=true`, canonical production
routing, production runtime and no owner-token, staging or read-only preview
override. Malformed flags fail before backend initialization. The existing
cloud enable flag, route authorization and GitHub clock enable retain their
meaning. Both clocks must carry the same qualified setting. Disabling the new
flag restores each existing clock path and retains every queue/business row.

The prepared price batch flag `GROOKAI_SQUARE_PRICE_BATCH_ENABLED` also defaults
off, requires this durable flag, and is carried by both clock adapters. Its
per-member acknowledgements and failures/reviews remain separate from the
five-target receipt. See the [scheduled batch audit](../audits/SQUARE_PRICE_BATCH_SCHEDULING_20261123.md)
for bounded actual local SDK overlap and new-card backlog evidence. That proof
does not establish delivery of either hosted clock or full daily freshness.

Both enabled clocks use one backend scheduler and the shared Supabase SDK.
Provisional admission is at most 100 distinct connections per invocation, eight
concurrent connections, five ordinary automatic targets per connection and
180 seconds of new admission. The database independently checks the deadline,
run token and claim ceiling. These limits are qualification inputs, not measured
throughput. Concurrent clocks can admit different merchants; queue fencing
prevents their concurrent admission of the same connection. The pre-existing
unique environment/merchant binding prevents two connections to one seller.
Foreground work still uses its existing writer lease and can make a scheduled
connection busy. There is no parallel catalog request inside a seller.

The first four-worker candidate failed the separate write-heavy local profiles:
96 merchants at 250ms provider delay and 64 at 500ms before admission closed.
Those failed receipts remain retained. The forward eight-worker candidate
reached all 100 merchants and acknowledged 400 changed prices in 151.14 seconds
at 500ms delay, with the same deadline, claims, target ceiling and serial seller
work. All 100,300 mappings and stock counts matched independent readback.
No SQL, lease, grant, monetary writer or provider retry policy changed. This
bounded profile does not qualify the full daily backlog or live Square.

Migration `20261123011000` adds three private RLS tables, one service-only RPC
and its private result helper. It pins the complete prior commerce authority
and all new catalog metadata, rejecting partial installations or changed
definitions, grants, constraints, indexes, policies and triggers. It does not
alter an existing function, role, grant, stock claim or business-effect key.
Reapplication with exactly matching metadata is a no-op. Locally applied SQL
is immutable; any correction after persistent application must be forward-only.

Eligibility comes from the existing `commerce_connections` action. Queue
admission additionally respects connected state, refresh uncertainty, provider
retry-after and active writer leases. Stored due times survive missed clock
ticks. `FOR UPDATE SKIP LOCKED`, a monotonically increasing queue fence and an
unpredictable claim token isolate overlapping invocations. Each connection may
be admitted once per run. Successful/review checks are due no earlier than
60 seconds after admission. Failures retain bounded exponential backoff with
stable per-connection jitter, capped at one hour before any longer existing
provider deferral. Busy retries preserve failure history and respect the
existing writer lease. No retry changes provider backoff or credentials.

The independent queue claim lasts 330 seconds. It grants no catalog or inventory
lease. Existing provider/stock fencing remains authoritative. Expired work
retains its attempt and becomes abandoned when reclaimed; its old completion
cannot mutate the newer queue fence. Expiry, disabling a flag, disconnecting,
provider failure or an interrupted worker never releases an external stock
claim, restores a sold copy or erases an operation or sale.

Every admitted connection has a durable attempt with explicit succeeded,
failed, busy, review or abandoned outcome. A normal receipt must reference a
terminal existing commerce worker run bound to the same owner, connection,
environment and admission time. A thrown provider error may record a sanitized
failure with zero checked targets and no child identifier; it cannot assert
success. Conflicting terminal receipts fail; exact retries return the original.
The conservative checked-target tally excludes review-only work and never means
that a price or physical quantity is acknowledged by Square POS.

The scheduler awaits all admitted work before finishing. It never races a
timeout and reports completion while its own admitted promises continue.
Database/receipt failures stop new admission while other admitted workers drain.
Unresolved attempts remain pending and make the aggregate fail. Run results are
stored independently of the legacy 25-count journal, preserve completed progress
and support 100 merchant outcomes. Crashed runs retain failed aggregate receipts;
replaying a terminal run repeats no business work. A running duplicate does not
restart admission, even with the original token.

Private health exposes due/unqueued counts, oldest due time, active/expired
claims, stale runs, provider deferrals, reconnect/refresh requirements and the
last terminal result. It reads without seeding or making provider requests.
Responses/logs include only aggregate counts, run IDs and sanitized codes;
run tokens, claim tokens, provider messages and customer data remain private.
Health data and HTTP/GitHub failure signals do not by themselves qualify alert
delivery or sustained operations.

Source regression, real local RPC/roles/concurrency, genuine fresh replay,
populated upgrade/no-op, complete schema/security/data proof, actual HTTP Auth,
normal managed and hosted checks, exact production PrePush and independent
release readback remain separate gates. Provider trials must measure latency,
rate limiting, retry recovery and end-to-end acknowledgement at the launch
target. Synthetic runs do not prove real Square throughput or daily pricing.
The shared duplicate-set main merge pause remains binding. This contract grants
no production apply, merge, flag activation or installation exception.

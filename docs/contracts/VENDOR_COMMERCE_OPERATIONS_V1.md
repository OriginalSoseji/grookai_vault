# Commerce worker and monitoring candidate V1

Continues the durable order queue at d4ab9a738. This change adds no schema,
payment authority, stock transition, provider resource or automatic activation.
All 406 migration bytes remain unchanged.

The private `vendor_commerce_worker_v1.mjs` has exactly three modes. `--orders`
executes one existing durable queue tick; `--billing` executes the existing bounded
subscription reconciliation pass; `--health` reads both existing health RPCs.
The shared backend client supplies system authority. Mode/account/database
validation runs before client construction. Both Stripe modes must agree. Test
mode accepts only the dedicated 22021 API; live mode accepts only the canonical
project. Configuring live mode is not authorization to activate it.

Order work depends on its own queue control, independently of onboarding,
subscription packages, store publication and acquisition. Billing keeps its
existing processing and reconciliation gates. Health ignores processing gates,
requires no Stripe secret and never constructs a provider service. A failed lane
does not suppress the other lane's health result. Logs contain fixed outcomes,
aggregate counts and alert codes, never order/account IDs or raw errors.

Billing health covers never-started/stale/abandoned/failed runs, overdue events,
failed accounts and required recovery. Order health reuses the queue's governed
projection and alert rules. Stale or malformed returned health fails closed.
Health is evidence about reconciliation only, not fulfillment or payout success.

The separate alert command requires explicit enablement, receiver credentials and
a named operations owner. It accepts only the three fixed commerce service names
or `--retry`. Before delivery it writes a private notification with a stable ID.
No journal or database contents enter the message. Delivery requires HTTPS, except
an explicit synthetic loopback test; redirects are rejected and IO has a 15-second
deadline. Only a 2xx response moves a queued message into the retained archive.
Failures retain the original notification for retry. The receiver must deduplicate
by notification ID, since acceptance followed by process failure may redeliver.
Repeated failures for a unit share its pending notification. After delivery,
reminders are limited to once per fifteen minutes; this is not incident resolution.

Each invocation processes at most ten messages. An atomic saved cursor cycles
past failed messages so one bad message cannot starve later messages. Systemd
alert services share one flock for enqueue/dispatch/cursor changes. The spool is
private host storage; it requires disk monitoring, backup and an approved retention
policy. No archive deletion or notification acknowledgement by an operator is
implemented. A delivered alert does not mean the underlying problem is resolved.

Candidate systemd files separate order work, billing and independent health timers.
Each service is a bounded oneshot; the next run follows service completion. Alerts
have a separate retry timer. No unit or timer is installed or enabled by this change.
Host failure, disabled timers and a failed alert receiver need external monitoring;
an in-host health service cannot prove its own availability.

Release requires actual Stripe test proof, Linux unit validation, load/cadence
proof, an approved host and named owner/receiver, alert outage/recovery rehearsal,
independent dead-man monitoring and the normal integration/deployment approval.
Stopping acquisition must never silently stop reconciliation of retained obligations.
Rollback stops new timers while retaining the database queues and alert spool,
and arranges the existing governed manual reconciliation path first.

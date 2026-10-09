# Price targets V1

Status: implemented locally; production editing, evaluation and delivery remain
disabled. This contract does not authorize activation or claim device delivery.

An owner explicitly selects one non-provisional raw-card printing, a positive
USD amount and an inclusive at-or-below or at-or-above comparison. Amounts and
revisions cross client boundaries as decimal strings. The database performs all
price qualification and comparisons. No client computes a market-price match.
Slab, sealed, converted-currency and parent-card fallback prices are excluded.

## Owner writes and recovery

`price_targets_read_v1()` derives the owner from `auth.uid()` and returns only
that owner's targets. `price_targets_save_v1(jsonb)` validates a bounded payload,
locks the owner's request namespace and checks the expected target revision.
Each owner/request ID records the exact payload and result. Retrying the same
request recovers that result, including after editing is disabled; changing its
payload rejects. Cross-owner target IDs cannot overwrite another owner's target.
An owner may retain at most 1,000 targets and enable at most 100.

Every successful new save starts a revision, clears its prior evaluation state
and permits one future event. Pause is an explicit revision with `enabled=false`.
The first qualifying reference may already satisfy a target. A matched target
does not automatically reset or send repeatedly as its price fluctuates.

Web and native transport capture the original authenticated owner and bearer.
Account replacement permanently closes an existing private session and discards
delayed results. Mutation requests omit cookie credentials and never silently
retry under another account. An uncertain save retains its original serialized
request in memory and offers explicit identical retry. The user must keep that
page/screen open; pending request recovery across process termination is not
implemented. Existing saved targets remain available on a fresh authenticated
read. Reads, edits, pause and recovery never require a social profile.

## Qualified references

The service evaluator accepts exactly one available, fresh, non-`from` USD
TCGPlayer Market reference for the selected printing. It independently joins
the published snapshot, published publication set, current publication pointer
and reconciled published/verified pipeline run. Printing, parent card, amount,
observation time, publication time and provenance must agree. Future timestamps,
observations older than 36 hours, ambiguous rows, provisional printings, missing
publication state and unavailable prices produce no match.

An already consumed observation, older publication or repeated provenance cannot
produce another crossing. A correction to the same observation does not recross.
Exact PostgreSQL numeric comparison preserves values beyond JavaScript precision.

## Evaluation, audit and delivery

`price_targets_evaluate_v1(integer)` is service-only, accepts limits 1–100 and
locks pending targets using `FOR UPDATE SKIP LOCKED`. It requires the default-off
database evaluation control. Its private core is not executable by service,
authenticated or anonymous roles. A matched revision atomically writes target
state, an immutable event and a notification outbox entry. The dedupe key hashes
the version, target, owner, revision, parent, printing, direction, normalized
amount and currency. Unique target/revision events prevent duplicates.

Each enabled, completed database invocation writes a run ID, start/end times,
requested bound and checked/triggered counts. A caught core failure rolls back
all target/event/outbox work, persists SQLSTATE and a bounded private error detail,
and returns a failed run ID without exposing the detail. Service role can read
these audit rows but cannot insert, rewrite or delete them directly. Disabled
calls do not start a run. PostgreSQL cancellation, connection loss before commit
and database unavailability can prevent a receipt; absence must not be treated
as success. Operational monitoring must account for unavailable invocations.

The notification dispatcher invokes evaluation only when its explicit
`PRICE_TARGET_EVALUATION_ENABLED=true` server switch is set and the request is
not a targeted operations request. Evaluation failure must not stop unrelated
notification processing. No new scheduler or provider is introduced.

Delivery retains existing preferences, quiet hours, mutes and budgets. An early
eligibility check and the final atomic send-start gate verify the event's current
owner, revision, enabled/matched state, exact outbox payload and evaluation gate.
Owner pause or revision change before that final gate cancels queued delivery.
A provider send already started cannot be recalled. A matched status proves
evaluation only; it does not claim that the device received a notification.

## Entry points and release boundaries

Account links to `/account/price-alerts`. Native and web notification links accept
an optional valid target UUID; authentication and owner reads remain mandatory.
The local proof switch accepts only its fixed loopback lab and rejects hosted,
production, telemetry-enabled and mixed environment modes.

Migrations: `20261009180000`, `20261009181000`, `20261009190000`. Fresh replay,
populated upgrade, ledger-based no-op push, runtime failure/retry, owner isolation
and exact release/shadow inspection are required. The separately deferred receipt
delivery migration remains outside the release package. Earlier sealed lab and
production proofs must never be rewritten to represent these new sources.

See [current verification and operations](../ops/PRODUCT_PRICE_TARGETS_20261009.md).

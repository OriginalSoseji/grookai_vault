# Square cloud recovery V1

Status: active implementation and release contract; default-off until hosted qualification.

This adds an independent five-minute Vercel cloud clock for the existing
SQUARE_COMMERCE_SYNC_V2 service. The owner requested unattended production
operation; the GitHub schedule showed gaps exceeding an hour while direct
owner saves and dispatched workers succeeded. GitHub reconciliation remains
enabled. This is an additional trigger, not new inventory or payment authority.

The Node route `/api/square/recovery` accepts only authenticated GET requests.
Vercel's standard server-only `CRON_SECRET` supplies a dedicated random bearer
credential; it is neither an owner session nor a Supabase credential. Missing,
malformed, mismatched or short secrets fail closed before backend initialization.
HEAD cannot invoke GET side effects. Preview/development deployments cannot run
the job. No URL parameter, request body, cookie or client-provided owner selects
the seller or work. Responses and logs contain run identifiers, aggregate counts,
fixed trigger labels and sanitized error codes, never secrets or customer data.

New invocation additionally requires
`GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED=true`, canonical production project routing,
and the existing catalog/commerce configuration. Both the route and backend
default off. A paused clock performs no backend work; the separate GitHub clock
can continue retained recovery. Pausing all periodic triggers requires pausing
both clocks; existing allocation and request history is retained.

The backend uses the shared client, existing scheduler rotation and existing
service-only RPCs. One seller and at most two targets are checked per cloud tick.
The route awaits completion and has a 300-second limit. Seller auto-sync and
database controls retain their existing meaning. Provider reads, credential
refresh, enrollment, stock, sale settlement, image retry and failure persistence
remain in the ordinary commerce service. Existing fenced leases and immutable
business-effect keys handle overlapping/duplicate triggers; busy is recorded as
skipped rather than evidence of completed work. No production payment-create or
refund-create authority is added. No schema or native installation changes.

Each admitted batch starts and finishes an existing durable worker run, including
empty checks and failures. Failures remain failures even when stock succeeded and
only artwork failed. A replayed terminal run does not repeat business work.
Unexpected details are sanitized before transport or logging. Existing pending
operations survive invocation failures and reconcile through their retained keys.

Hosting must be verified to support five-minute cron without a plan change. The
current project is on Pro. Delivery is best effort on both providers; configuration
alone cannot establish freshness. Release requires normal source/hosted checks,
unauthorized/default-off checks, one authenticated bounded hosted pass, and at
least two natural cron invocations whose log run IDs match successful database
receipts. Re-read current inventory, artwork operation counts and the known cash
sale to prove no duplicate image or stock/sale effect. Preserve original QR URLs,
prices, seller images, stock claims and the single existing sale.

The production secret and enable flag are configured only after the exact source
has qualified. Store the secret privately before deployment; never print it, put
it in a URL, commit it or add a public alias. A redeploy captures the matching
platform/header and runtime secret. Pause only this new clock if its qualification
fails; preserve the healthy website, installed531, schema493 and GitHub recovery.

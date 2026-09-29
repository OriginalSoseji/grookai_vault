# Existing seller connection — September 28

## Current state

Candidate: `C:/gv_store_seller_link_20260928`, branch
`feature/store-seller-link-20260928`, from current main
`ebfaf4e66039081f8e5a7e2e66a59f1b70c6ce4d`, now integrated with main
`a9432e0b055e17d0c6610193c4c1d2f7275d6782`. Changes are not deployed.
The operator-playbook conflict retained both upstream and seller notes. Recovery
stash eaac627aad92a03d838414c167a3589e07a4561b remains intact.
The older dirty cart/commission candidate remains intact at
`C:/gv_store_cart_20260927`. Do not import its stale406 schema baseline or reset
its409 lab. Current main includes two native-import migrations absent there.

The real Stripe platform is `acct_1UIUSYEXmSPisC0R`. The founder's existing live
storefront seller is `acct_1UKfcYI49eSoal6p`. Both use similar Grookai display names;
they have different roles and IDs. Never create another account as a retry.
Platform login and key creation are complete. Four read-only live Stripe GETs
passed at2026-09-29T06:19:09Z: platform Account/Balance, seller Account, and seller
scoped Balance. Exact identities and live mode match. Controller is application,
is_controller=true, fees=account, losses=stripe, requirements=stripe, dashboard=full.
Charges/payouts/details are enabled; card_payments and transfers are active.
Current, past-due and pending requirements are zero; disabled_reason is null.
Metadata is present with no grookai_ keys. No provider writes or money movement.
The confirmed production owner email hash and exact store pairing match the seller
at06:20 UTC. This is verification evidence, not a grant or application binding.

The restricted verification credential is current-user DPAPI encrypted outside
the repo in the external storefront artifact directory, `seller-verification-key/`.
The founder pasted it in chat, was advised to rotate, and explicitly requested
using it with rotation deferred. Do not reproduce it or use it as a checkout key.
The one-time Stripe key display is closed. Local capture used PowerShell7; the
temporary listener exited after saving. Private provider/owner receipts are there.

Fresh read-only production inventory at06:19 UTC September29 verified project
`ycdxbpibncqcchqiihfz`, 408 migrations, 171021 cards, 3400 sets and32903 traits.
The supplied app account resolved uniquely to store `grookaivault`. There are
zero seller bindings. Seller onboarding and orders remain disabled. Vercel's
production project has no STRIPE_* or GROOKAI_VENDOR_* configuration entries.
The newly retained live verification key is separate from the older encrypted
test credential. Neither is deployed as application runtime configuration.
Private receipt: external storefront artifact directory, LIVE_SELLER_PREFLIGHT.

## Implemented candidate

- Private expiring owner/account adoption approvals and immutable provenance.
- Authenticated owner connection endpoint with strict Origin/body checks.
- Independent platform/account/controller/mode verification using GETs only.
- Database confirmation of ownership, email, package and financial-hold state.
- Account/store lock coordination, idempotency and early deauthorization handling.
- Existing-seller button in the seller payments page, gated by a private approval.
- Legacy creation/recovery and existing closeout behavior preserved.

Read `../contracts/VENDOR_SELLER_ADOPTION_V1.md`. Migration candidate:
`20260928213000_vendor_seller_adoption_v1.sql`. No grants or rollout controls are
enabled by this migration. The operator plan/apply module, fixed-scope command,
and service-only issuance RPC are implemented; no production issuance occurred.
The read-only command successfully prepared the founder's real scope on September29
at06:44 UTC. Its private plan expires in30 minutes and must be regenerated for
the eventual release. Do not treat that local plan as an issued approval.

## Verified checks and remaining release work

Passed:
- Strict fresh production408/full408 schema and security baseline: zero normalized
  difference,1098 security objects. No production writes.
- 297 focused adoption/enrollment/gateway/HTTP/closeout/financial-review tests.
- Web TypeScript and focused ESLint checks.
- Full dedicated Supabase17 replay/reset/no-op push of409 migrations passes.
  Project grookai-seller-link-20260928 uses30221/API,30222/DB and an internal
  Docker network; workers and external telemetry are disabled.
- Separate408-to409 upgrade passes in grookai-seller-upgrade-20260929 on306xx.
  Reserved, creating, bound, deauthorized and closing legacy rows are unchanged;
  upgraded schema/security matches the fresh409 replay. No approvals auto-created.
- Eight real Auth/PostgREST/HTTP groups pass, including actual Next routes,
  cookie-authenticated seller-page rendering and duplicate signed deauthorization
  webhook delivery. Fresh binding uses an injected GET-only provider transport;
  actual Next proves retained-binding retry. No provider HTTP requests or
  production writes occur in these tests. Interactive browser proof is separate.
- Fourteen staging/collector checks pass, including exact30221 target isolation.
- Full normal shipcheck passes before main integration:5692 Node tests pass,
  four skipped, zero failed; TypeScript, ESLint, strict production web build,
  Flutter analysis and760 Flutter tests pass. The integrated source must pass
  the normal commit hook again. Receipt:shipcheck-1790665614089.
- Exact-pending release AuditLinkedSchema passes with fresh read-only production408
  parity and current409 lab parity. PrePush still requires clean committed source
  and matching normal-check/Auth/Next receipts; no production apply is authorized
  by a read-only gate result.
- Supplementary PostgreSQL16.2 test:42 SQL/role/behavior groups, including five
  observed lock waits, duplicate-account prevention and late/early deauthorization.
  The dedicated temporary cluster used loopback57942, synthetic data and zero
  workers, and was stopped afterward. Shared services were untouched.

Private evidence lives in `.local/integration/seller-adoption-v1`. The first
native helper hit a Windows inherited-pipe timeout after its own cluster started;
that exact cluster was stopped. File-backed child logs fixed the helper. Keep
the failed artifact. The final schema hash and test groups are in the latest
pg16 receipt. This subset uses synthetic capability/Auth fixtures; it is not
full Supabase/Auth/HTTP proof.

Resolved blocker and remaining work:
- Docker became available externally; this task did not restart shared services.
  Preserve replay-409, upgrade-proof and http-proof-TIMESTAMP artifacts and labs.
  Earlier failed startup, webhook-argument, staging-target and bearer-only page
  checks are retained. The final HTTP runner uses real SSR session cookies.
- Provider API/controller/mode and confirmed owner identity now pass. Runtime
  provider/webhook configuration, private grant and owner connection remain open.

## Next work and release boundary

1. Completed: platform-scoped live GETs and confirmed owner/store comparison.
   Actual controller/capabilities match the existing conservative policy; no
   relaxation is needed. Refresh provider evidence when issuing/consuming a grant.
2. Completed: dedicated302xx full replay,306xx upgrade parity and actual Auth/HTTP
   boundaries. Finish interactive UI proof and normal release checks on integrated
   source. Never reuse a consumed replay directory or a shared repair database.
3. The bounded approval issuer passes local tests and real read-only planning.
   Complete the exact migration release gate and deployment package. Owner confirms the approved connection
   through the authenticated page after deployment; no identity impersonation.
4. Configure verified live provider/webhook access, apply the reviewed additive
   migration and release the connection UI through normal gates. Verify binding
   and owner status directly. No production apply/deploy/flag changes occurred.
5. Complete the separate cart/commission live-order work. Current cart candidate
   is synthetic/test-only, including quote/fulfillment/tax policy and actual
   provider checkout/commission/refund evidence. Linking alone does not make
   buyer checkout ready. Preserve the ten-minute reservation requirement.

Rollback disables new adoption and retains bindings, approval evidence and all
financial obligations. Do not delete accounts, reset ownership or restore old
creation-attempt semantics over an adopted binding.

## Live Stripe webhook created; runtime not configured

The user confirmed continuing after the action-time webhook question. The
platform destination `we_1UL2D1EXmSPisC0R459VNYKf` is created and Active with name
`Grookai seller status — live`, connected-account scope,
snapshot payload, API version `2026-08-26.dahlia`, and exactly two events:
`account.updated` and `account.application.deauthorized`. Destination:
`https://grookaivault.com/api/vendor-payments/webhook`.

Its signing secret is current-user DPAPI encrypted outside the repo at
`seller-verification-key/stripe-live-seller-webhook.dpapi`. No plaintext was
logged or persisted; Stripe's secret is hidden again and the capture listener
closed. The first reveal controls required a page reload. Zero deliveries were
shown at creation. This does not prove configured runtime or successful delivery;
verify deployed signature/mode/account boundaries before owner adoption.

Stripe's [Connect webhook documentation](https://docs.stripe.com/connect/webhooks)
states that v2 connected accounts emit both event generations. Their v1 events
use connected-account scope; v2 core events use platform scope. This release
consumes the two existing v1 events and does not subscribe to unrelated payment
events or claim that a local synthetic delivery proves live delivery.

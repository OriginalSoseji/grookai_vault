# Real Supabase Storefront Verification — September 18, 2026

## Result

The existing browse-only storefront/custom-collectible candidate now passes a full
**397-migration local Supabase replay**, real GoTrue/Storage/PostgREST integration,
real Next API/browser checks, and real-schema exact-copy eligibility checks.
A stale-edit error discovered only with real PostgREST was fixed additively.
No production release or full native authentication proof is claimed.

Worktree: `C:/grookai_vault_storefronts_v1`, branch `feature/vendor-storefronts-v1`,
HEAD `a14388f689235d62b3165c1dd88aaa4c562ab186`. This remains an uncommitted,
reviewable local candidate. Starting hashes are in `starting-source.json`.
All prior implementation/device receipts and the two original storefront
migrations remain byte-identical. No other worktree was edited.

## Docker recovery and isolation

The user explicitly approved restarting Docker Desktop after the previous proof
was blocked by its unresponsive daemon. The graceful restart stalled. Recovery
stopped only verified Docker Desktop/backend processes, terminated only the
`docker-desktop` WSL distribution, and relaunched Desktop hidden. No shared volume
was deleted, no shared schema reset, and no repair database was reused.
`restart.json` records that recovery. Shared services restarted under their own
Docker policies. Shared Supabase database/Auth/Storage became healthy; its vector
container remained in a restart loop. That unrelated condition was not repaired.

The new project is `grookai-storefront-verification-20260918`, prepared under
`.local/storefront/supabase-verification`. API/DB/mail use loopback ports
16421/16422/16424. Supabase CLI 2.90.0 uses PostgreSQL 17.6. The dedicated Docker
network is internal; the database has no default outbound route. Realtime,
edge-runtime, analytics/vector, Studio and other unnecessary services were excluded.
A restricted Node relay publishes only fixed DB/Kong/mail destinations on host
loopback because Docker did not expose this internal network directly. It has no
Docker socket, credentials or arbitrary proxy endpoint. No shared API port was used.

The CLI recreates the dedicated PG17 container/volume during `db reset`.
`ALTER SYSTEM` alone therefore does not persist replay protection. The local
configuration sets `db.settings.max_worker_processes=0` before any migration runs,
preventing cron/pg_net background execution. The receipt verifies zero cron runs.
Historical migrations may define jobs; they cannot execute in this project.
No production environment files, linked-project metadata or credentials were copied.
Next uses a strict OS environment allowlist, a loopback-only network preload and
production telemetry disabled. `web_events` remained empty.
An initial CLI debug start attempted CLI usage telemetry to PostHog; subsequent
CLI commands used `DO_NOT_TRACK=1`. This was not a production application request.

Two initial isolated starts could not reach the internal-network DB; the CLI
removed only its own newly created empty container/volume. After the relay was
added, the initial 396-migration replay passed. Following the conflict fix, the
same dedicated project was reset only after checking its recorded first replay,
fixture-only account email patterns, and zero canonical/Vault rows. The complete
397-migration replay then passed. The initial replay receipt is retained separately.
The final project now contains synthetic catalog fixtures and the replay script
intentionally refuses to reset that populated state.

## Defect and correction

The custom edit RPC raised SQLSTATE `40001` when an expected version was stale.
With the synthetic SQL adapter it looked like an ordinary conflict. Real
PostgREST treated it as a retryable serialization failure: one concurrent save
completed, while the stale request repeatedly retried until the test timed out.
`conflict-failure.json` preserves the failing result.

Additive migration `20260918100000_vendor_custom_collectible_conflict_status_v1.sql`
replaces that function with the same body except for SQLSTATE `PT409`. PostgREST
returns HTTP 409 promptly. The web owner API maps `PT409` to the existing reload
message/409 response; native callers already handle HTTP 409. No stock, identity,
entitlement or publication semantics changed. The original migration is preserved.
Both real RPC and HTTP races now prove exactly one successful save and one conflict.

This behavior is documented by [Supabase's custom-error troubleshooting guide](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
The candidate no longer relies on deployment-specific retry behavior.

## Executed checks

| Check | Result | Receipt |
|---|---|---|
| Full isolated schema replay | 397/397, exact source hashes, workers disabled | `replay-result.json` |
| Real Auth/Storage/RPC | 8/8 groups | `auth-storage-receipt.json` |
| Real Next HTTP/browser/referral | 6/6 groups | `web-receipt.json` |
| Real-schema synthetic catalog/copies | 4/4 groups | `catalog-receipt.json` |
| Synthetic SQL regression | 49/49 checks | `synthetic-receipt.json` |
| Runtime referral/routing/target guards | 7/7 | `runtime.log` |
| Guarded Next production build with real local backend | passed | `web-build-real.log` |

Real Auth checks create two owners and a visitor, sign in with passwords, refresh
sessions, and authenticate server reads. Database-only package simulation verifies
app-only versus web access, draft isolation, denied base writes, positive stock,
explicit publication, app/web DTO parity, zero-stock suspension, downgrade and
explicit republishing on upgrade. Upload checks cover real Dart-shaped multipart
requests, MIME/size limits, another owner's paths, product binding, private download
and byte equality. No billing provider or production grants are involved.

HTTP checks verify no-store detail/media delivery, public SKU redaction,
owner-only preview, immediate unpublication, and denied forged credit telemetry.
A real new signup receives exactly one service-written ledger credit under
concurrent calls; authenticated clients, existing accounts, self-referrals and
expired contexts cannot obtain credit. Encryption/tampering and safe auth return
paths are covered by the separate runtime suite, not claimed as OAuth-provider proof.

Real-schema fixtures prove separate physical copy rows and prices, explicit
selection (including no enrollment on ordinary price edits), section intersection,
bounded search/pagination, app/web parity, quarantine/unassigned-printing exclusion,
and archive/transfer/zero-price/privacy invalidation. The actual schema rejects a
wrong-parent assignment before it can be stored. These are synthetic local catalog
rows solely for boundary tests, not custom products or canonical repair data.

Desktop/mobile browser captures show the public browse-only custom store/detail
with actual private Storage bytes. Screenshots are `real-*.png`. A mobile full-page
capture includes the existing fixed navigation at its viewport position; content
is scrollable. No checkout/purchase-complete UI was introduced.

During harness development, empty-filename Node FormData did not reproduce Dart's
multipart format; explicit MIME serialization corrected the test. Other corrected
harness expectations were the existing unauthenticated app endpoint's 401 status,
Next dev's persistent requests preventing `networkidle`, explicit synthetic
printing IDs, and the existing wrong-parent database trigger. The first build
failed when no backend was listening on the guarded loopback target; the final
build passed with the real local backend. These are not hidden product fixes.

## Reproduction and remaining gates

Checked-in fixed-target tools: `storefront_supabase_replay_v1.mjs`,
`storefront_supabase_relay_v1.mjs`, `storefront_supabase_live_v1.mjs`,
`storefront_supabase_web_v1.mjs`, `storefront_supabase_http_v1.mjs` and
`storefront_supabase_catalog_v1.mjs` under `scripts/tests/`.
Never substitute linked/remote targets. Local credentials and fixture tokens remain
only in ignored `.local`; raw CLI start logs were not copied into receipts.
Restart the retained dedicated containers/relay, then run live, web and HTTP checks
before catalog fixtures. The replay tool is deliberately restricted to an empty
project or the recorded pre-correction fixture-only state; do not loosen its guard
to rerun against the final retained database. Preserve that database as evidence.

The earlier physical Samsung proof is unchanged and still uses the isolated shell
with synthetic authentication. Full native main-shell login/refresh, pending store
and product routes through authentication, and the installed-client branding/setup
journey remain integration work. No new device proof is claimed here.
Catalog repair schema/dependency fingerprints and the navigation overlap with
Vault-add PR #473 still need coordinated integration. No current production schema,
RLS, entitlement, deployment or full current-main readback was performed. Billing,
checkout and custom domains remain outside Phase 1.

Rollback remains feature disablement with store metadata, product histories,
private photos, selections and Vault ownership retained. No push, merge, remote
migration, production entitlement change, worker activation, payment or deployment
was performed. Final source hashes and cleanup results accompany this receipt.

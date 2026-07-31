# Release Readiness Audit 2026-07-31 V2

## Decision

Grookai is ready for a controlled invite-only beta. It is not ready for an
expanded beta or unrestricted public launch.

This audit re-evaluates the release against the same standard used for commit
`91ab3c198d6c1fb300cd3f28cf463f72c62e79f6`. The audited production source is
merged `main` commit `687106e99e0b62d44963d9dea85b6067d7ea2fdc`.

| Area | Rating | Judgment |
| --- | ---: | --- |
| Product foundation | 9.3 / 10 | strong canonical, contract, and security base |
| Controlled beta readiness | 9.2 / 10 | authorized within current signed-in boundaries |
| Expanded beta readiness | 8.8 / 10 | waits on clean-account physical-iPhone proof |
| Public launch readiness | 7.2 / 10 | pricing duration, migration, surface, and licensing gates remain |
| Operational confidence | 8.4 / 10 | live probes are healthy; duration gates remain authoritative |

## Scope And Boundaries

The audit covered repository truth, GitHub Actions and security state,
Supabase advisor and function authority, production Edge Functions, public web
routes, TestFlight evidence, and the frozen TCGPlayer Market canary.

No database row, grant, RLS policy, pricing pointer, approval, embedding, or
canonical identity was changed. Eight existing Edge Functions were redeployed
from merged `main` after their runtime error boundaries were hardened.

## Original Assessment Reconciliation

| Original gate | Current state | Evidence |
| --- | --- | --- |
| Repair both `wall_feed` defects | closed | out-of-range pagination and response-body failures are controlled |
| Deploy and probe `wall_feed` | closed | governed Edge function is live; production core and edge probes pass |
| Resolve Apple build failure | closed | Xcode Cloud archive and App Store processing completed |
| Produce current TestFlight build | closed | Build 258 is `Testing` in Friends and Family |
| Run clean-account iPhone journey | open | requires a person using a physical iPhone |
| Show trustworthy pricing or hide it | in progress | governed signed-in read model works; 72-hour canary has not elapsed |
| Run production smoke | partially closed | public web and Edge reads pass; signed-in mutation journey remains physical-device gated |

## Merged Repairs

| PR | Merge SHA | Result |
| --- | --- | --- |
| #155 Runtime input and service boundaries | `bd135ba55651f3318c9aa36f502d1b35bc99bdf3` | query normalization, wildcard, URL, auth, and client-error hardening |
| #156 Privacy helper authority | `11c5828fb91812f4d60ac179e94686133a3ab812` | candidate migration and rollback-only authority proof |
| #157 GitHub Actions permissions | `58fd8ae49155eca1415d6313f80d76d3da18078c` | six workflows default to read-only repository contents |
| #158 Viewer argument binding | `e7fca94a06cd3712e36aec137826f0d948952299` | viewer-scoped privacy calls fail closed on identity mismatch |
| #159 Canary shared read probe | `b3c955f2d02d2bbd5ce1c942704e99fa2fcc4c8b` | observer uses the governed per-card pricing read model |
| #160 Production core probe | `5caef8d9e3c131cecdf25838c266398cd362469c` | probe uses the governed `wall_feed` Edge boundary |
| #161 Active runtime security | `687106e99e0b62d44963d9dea85b6067d7ea2fdc` | credential diagnostics removed; raw internal errors and active ReDoS repaired |

## Production Proof

### Core API

Manual production run `30669004552`, executed from merge
`5caef8d9e3c131cecdf25838c266398cd362469c`, passed:

- `search_cards` RPC: HTTP 200 with an array response
- `wall_feed` Edge Function: HTTP 200 with `items` and numeric `count`

The scheduled `Prod Edge Probe (read-only)` also passed from current `main` in
run `30669255850`.

### Public Web

A fresh unauthenticated smoke against `https://grookaivault.com` returned HTTP
200 for all seven sampled surfaces:

| Surface | Bytes | Observed latency |
| --- | ---: | ---: |
| `/` | 60,913 | 555 ms |
| `/login` | 21,882 | 297 ms |
| `/sets` | 399,735 | 768 ms |
| `/network` | 205,056 | 1,045 ms |
| `/explore?q=Pikachu` | 64,948 | 342 ms |
| `/card/GV-PK-AR-71` | 143,532 | 535 ms |
| canonical card image | 52,536 WebP bytes | 673 ms |

The sampled card detail contained the `TCGPlayer Market` label and signed-in
access treatment. It did not render the stale `No pricing data yet` fallback.

### Edge Security Deployment

The following existing functions were deployed from
`687106e99e0b62d44963d9dea85b6067d7ea2fdc` and read back as active:

| Function | Version | JWT gateway | Unauthenticated smoke |
| --- | ---: | --- | --- |
| `scan-upload-plan` | 18 | function-managed | 401 `missing_bearer_token` |
| `scan-read` | 11 | function-managed | 401 `missing_bearer_token` |
| `identity_scan_enqueue_v1` | 23 | function-managed | 401 `missing_bearer_token` |
| `identity_scan_get_v1` | 23 | function-managed | 401 `missing_bearer_token` |
| `notification-dispatcher` | 13 | shared-secret managed | 401 `unauthorized` |
| `operations-webhook-v1` | 2 | shared-secret managed | 401 `unauthorized` |
| `warehouse-intake-v1` | 16 | gateway verified | 401 before function execution |
| `vault-add-card-instance-v1` | 8 | gateway verified | 401 before function execution |

The probes supplied no authorization and could not reach mutation code. The
repository-only `ingestion-enqueue-v1` function was not present in the remote
inventory and was intentionally not created by this deployment.

## Pricing Canary

The 100-row TCGPlayer Market canary remains healthy and observing.

- start: `2026-07-31T10:34:15.670Z`
- required end: `2026-08-03T10:34:15.670Z`
- activation run: `0c23045d-8141-4b9c-ba41-2f8c44522921`
- frozen pricing commit: `416c4691d1c1d6be8a1461c148deebe627e813f8`
- observation as of: `2026-07-31T22:16:05.092Z`
- observed duration: 11.697 of 72 required hours

The read-only observation reported:

- 100 exact prices and 100 positive USD values
- zero missing provenance, stale prices, or broken traces
- healthy source continuity with 540,870 source rows
- zero terminal alerts or findings
- authenticated governed read: one row in 246.019 ms
- anonymous runtime denial: SQLSTATE `42501`
- prior publication and service rollback authority available

The canary cannot pass before its required end. The prior top-market browse RPC
also exceeded the 120-second observer budget because its current view scans the
heavy listing-evidence path. The pending read-model completion migration is
expected to move that path to the governed materialized source; performance
must be re-proven after migration rather than assumed.

## Security Audit

### Closed Or Improved

- GitHub Dependabot has zero open alerts.
- Leaked-password protection is enabled in Supabase Auth.
- GitHub workflow default permissions are explicit and read-only.
- The prior missing-workflow-permission CodeQL findings are closed.
- Credential fragments are no longer returned or logged by scan upload and
  identity enqueue request diagnostics.
- Deployed runtime responses use stable external error codes while preserving
  detailed server-side diagnostics.
- The active controlled-growth EX/GX normalization expressions no longer use
  ambiguous nested repetition.
- Default-branch CodeQL run `30669255273` passed on
  `687106e99e0b62d44963d9dea85b6067d7ea2fdc`, and all nine targeted
  active-runtime alert instances are marked fixed.

### Supabase Advisor Truth

The latest advisor readback contains four security-definer-view errors and 129
warnings after leaked-password protection was enabled. The warnings are mostly
intentional `SECURITY DEFINER` entrypoints that require object-level authority
classification, plus an available PostgreSQL maintenance upgrade.

The four owner-context views cannot be converted mechanically to invoker
context: rollback-only compatibility proof showed that required bounded public
reads would break. They remain explicit governed exceptions until equivalent
interfaces are designed.

The project is on PostgreSQL `17.4.1.074`; available patches should be applied
in a planned maintenance window, not during the active pricing canary.

### CodeQL Backlog

GitHub still reports 526 open alerts in archived HTML evidence and one-shot
audit, acquisition, migration, and historical repair scripts. They do not
represent deployed web, Flutter, Edge, or continuous ingestion request paths.
They remain real repository-tooling debt and prevent a claim that the entire
repository is CodeQL-clean. No alert was bulk-dismissed or hidden during this
audit.

## Pending Migration History

The two security hardening migrations have passed rollback-only compatibility
proof but are not applied. Clean migration history requires this exact order
after the pricing canary passes:

1. `20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql`
2. `20260728133000_vault_exact_market_pricing_targets_v1.sql`
3. `20260731170000_retire_legacy_ingest_merge_card_prints_v1.sql`
4. `20260731210500_security_advisor_privacy_helper_execute_hardening_v1.sql`
5. `20260731211500_security_advisor_viewer_argument_binding_v1.sql`

No direct apply, migration-history repair, or out-of-order security apply is
authorized while the canary is active.

## Verification

| Check | Result |
| --- | ---: |
| Active runtime security contracts | 4 / 4 passed |
| Full Node contract suite | 1,227 / 1,227 passed |
| Changed Edge Function Deno checks | 9 / 9 passed |
| Changed Node syntax checks | passed |
| Legacy-key guard | passed |
| Git diff whitespace check | passed |
| PR #161 CodeQL, drift, runtime, Windows, Vercel | passed |
| Default-branch CodeQL run `30669255273` | passed |
| Targeted active-runtime CodeQL alerts | 9 / 9 fixed |
| Current-main drift, runtime, legacy-key, edge probe | passed |
| Production core API probe | passed |
| Production public-web smoke | 7 / 7 passed |
| Deployed Edge unauthenticated smoke | 8 / 8 failed closed |
| Dependabot open alerts | 0 |

Local Flutter analysis was not repeated because VS Code currently owns a
locked Flutter SDK artifact and may contain unsaved work. The hosted Windows
checks passed, and Xcode Cloud/TestFlight Build 258 remains the authoritative
Apple distribution evidence. The editor process was not terminated.

## Current Release Gates

### Expanded Beta

Open: install TestFlight Build 258 on a physical iPhone and complete the clean
account journey:

`sign up -> find card -> own card -> create binder -> add intent/listing -> see activity`

Use `docs/release/PHYSICAL_IPHONE_CLEAN_ACCOUNT_JOURNEY_V1.md` and require the
read-only `release:journey:verify` reconciliation to pass.

### Pricing Production V1

Open until all of the following pass:

1. preserve the canary through `2026-08-03T10:34:15.670Z`
2. run the mandatory final `--require-pass` observer
3. run the linked migration preflight
4. apply the five migrations above in exact order
5. verify schema, grants, RLS, authenticated access, and anonymous denial
6. re-prove top-market read performance
7. deploy the exact web and Flutter clients
8. reconcile all 17 source-to-render pricing surfaces
9. enable signed-in full publication through the governed pointer
10. observe seven unattended production cycles
11. rehearse rollback and publish the final production report

### Public Launch

Open: anonymous pricing remains denied until licensing and display authority
are explicitly approved. Repository-tooling CodeQL debt and the PostgreSQL
maintenance upgrade also require governed follow-up, but neither authorizes
weakening current product boundaries.

## Invariants

- Do not shorten or backdate the 72-hour canary.
- Do not apply the pending migrations out of order.
- Do not call a code merge a production database apply.
- Do not claim a physical-device journey without a physical-device operator.
- Do not enable anonymous pricing before licensing and display authority.
- Do not weaken RLS, service authority, canonical identity, or client read
  contracts to satisfy a release deadline.
- Do not classify archived CodeQL findings as deployed runtime findings, and do
  not hide the remaining repository-tooling debt.

## Exact Next Gate

The next human gate is the clean-account TestFlight journey on a physical
iPhone. The next timed system gate is the final pricing observer after
`2026-08-03T10:34:15.670Z`. No migration apply or public-release declaration is
permitted before those respective proofs.

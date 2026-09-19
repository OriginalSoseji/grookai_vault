# Storefront release and paid vendor product

The founder's current goal advances the local browse-only candidate toward release,
an initial pilot and automated $30/$50 subscriptions. It supersedes the earlier
local-only stopping point. Buyer checkout and seller payouts are confirmed scope.
Custom domains are deferred; use `grookaivault.com/store/{slug}` URLs first. The
founder selected the existing Grookai Stripe account for subscriptions and payments.
Existing migration, account, source, privacy and release verification remain required.

## Verified starting state

- Candidate: `6af5cff68af2ad95155a752a4d47ca00fdf588e2`, clean at opening.
- Current main and live Vercel source: `a151794a98cc1e47a9a8886e0e643009cea898e5`.
- Main Vercel deployment: `dpl_DhGerfQ6NiDFgkoUATvdw4BrCXXJ`, READY.
- Actual public domain: `grookaivault.com`; canonical stores use `/store/{slug}`.
- PR #473 remains open/conflicting at `6e747bb1561354fc56b62c73be39f258da506f15`;
  its application changes are already included and tested in the candidate.
- Fresh read-only production query: 394 migrations, 170,658 cards, 3,399 sets,
  32,903 traits; no store tables or active store grants. No production writes.
- No GitHub Actions runs were queued or in progress at the initial readback.
- Dirty catalog/search work remains untouched in its existing worktree.

Readback receipts are private under `.local/integration/goal-release/`.
The shipped domain is not `grookai.com`; use verified project/domain metadata.

## Release-tool repair

The pre-push hook runs the full shipcheck and then requires a clean worktree.
Next's storefront distDir rewrites tracked `next-env.d.ts` and `tsconfig.json`,
which previously required manual restoration after local validation. The build
wrapper now captures and restores only the exact known generated differences in
local storefront test mode. Unexpected or concurrent edits fail and are retained.
Production/ordinary builds do not restore files. Both web packaging tools include
the helper. Six focused runtime tests pass; full hook validation remains required.

## Completion requirements still open

1. Review PR #496, observe its required checks and reconcile main.
   Preserve the already included #473 prerequisite and catalog work.
2. Refresh the governed schema preflight and applicable catalog dependency evidence.
   Apply only consolidated migration `20260919050000`; historical three-file
   storefront migrations must not also be applied. Keep rollout flags off initially.
3. Stage the production-target web release with automatic alias assignment controlled
   and previous live deployment preserved. Verify before promotion. Build and verify
   native clients, including iOS/provider auth/cold-start routing, through existing
   signing and tester-audience paths. Do not infer installed acceptance from upload.
4. Identify the intended existing pilot accounts before granting access. Verify
   owner/private/public/media/QR boundaries and revocation before expanding access.
5. Implement verified Stripe subscription billing, renewal/cancellation/failure
   policy and reconciliation into database capabilities. No existing billing provider
   integration or configured billing environment names were found in inspected source
   or the live web project. Never collect real payment as an implementation test.
6. Complete desktop gaps, buyer checkout and seller payouts. Custom domains are
   deferred by the founder, not a blocker for this release.

## Current integration evidence

PR #496 is open as a mergeable draft at `7a13b553278aced661a35ffd8457727b448a7fb3`.
Both mandatory commit and push hooks passed: 3,910 Node tests, three skipped, 748
Flutter tests and the complete web gates. The working tree stayed clean after build.
GitHub source, Windows, visual and CodeQL checks are being reconciled; no merge yet.

The CI key guard found four local harnesses consuming an old CLI credential field.
The installed CLI exposes modern `PUBLISHABLE_KEY`/`SECRET_KEY` fields; read-only
requests using each returned HTTP 200 from the dedicated local API. Those harnesses
now map modern fields to canonical app environment names. The guard is unchanged.
Historical real-local receipts remain evidence for their original harness revision.

The existing Mac is reachable and its primary checkout is preserved. Apple's latest
build is 324 (VALID), containing #473. A separate sparse worktree for proposed build
325 has the frozen storefront source, matching release settings and 96 passing
Mac-native tests. No archive/upload has occurred. A Windows trailing-line transport
error followed the first successful test run; a normalized-LF rerun exited zero.

Production's complete schema/security snapshot remains identical to the bound
formal baseline (zero SQL diff, all 893 inspected security objects equal). No
production application data/schema/grant change or website promotion has occurred.
Pilot identities and private Stripe test-credential location are pending founder
input. Browser tool initialization failed through both available runtime entry
points; do not infer Stripe account absence from that failure.

Keep the full goal active until each applicable requirement has direct evidence.
Rollback disables store availability and restores clients while retaining metadata,
media, selections and ownership. Paid-order access, if implemented, must survive
subscription downgrade.

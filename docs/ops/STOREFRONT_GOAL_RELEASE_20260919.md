# Storefront release and paid vendor product

The founder's current goal advances the local browse-only candidate toward release,
an initial pilot and automated $30/$50 subscriptions. It supersedes the earlier
local-only stopping point. Conditional buyer checkout/payouts and custom domains
remain explicit scope questions; do not silently drop or implement those choices.
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

1. Publish/review the candidate PR, observe its required checks and reconcile main.
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
5. Choose and implement verified subscription billing, renewal/cancellation/failure
   policy and reconciliation into database capabilities. No existing billing provider
   integration or configured billing environment names were found in inspected source
   or the live web project. Never collect real payment as an implementation test.
6. Complete agreed desktop gaps and the explicitly selected commerce/domain scope.

Keep the full goal active until each applicable requirement has direct evidence.
Rollback disables store availability and restores clients while retaining metadata,
media, selections and ownership. Paid-order access, if implemented, must survive
subscription downgrade.

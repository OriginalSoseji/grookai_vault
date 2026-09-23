# Combined search live release preflight — September 22

Read-only receipt at 2026-09-22T16:57:51Z; candidate
`ba1ffa8d0f272a99aea7879aaabda83de4bc9608`, with a clean worktree.
No application launch, installation, deployment, account change, or production
write was performed. Evidence is private:
`C:/grookai_vault_operator_artifacts/combined_search_20260922/release-preflight-readback.json`.

## Source and rollback reference

Remote main is `a98dd26f79967a741632c7efa3086d85cccacb87`, already an ancestor
of the candidate. No source reconciliation is needed at this observation time.
Vercel production is READY at `dpl_CgUBadbyQKRN3tYeU2fkoDyya3Fe`, sourced from
that same main commit. The public health endpoint independently reports the
same deployment ID. Automatic custom-domain assignment remains enabled.
The receipt preserves the observed public feature flags and deployment URL.

This deployment is the rollback reference for a future separately approved
release. Re-read the live pointer immediately before staging/promotion; neither
this observation nor the older artist-search release receipt is lasting authority
to change it. No candidate deployment was created.

## Android link acceptance limitation

The physical Samsung primary app is build 324, shell-installed and DEBUGGABLE.
Its certificate SHA-256 is
`E9:57:5F:DD:80:E4:BC:1B:4E:5A:80:E3:63:8C:76:F9:63:AE:26:18:DB:4F:71:F9:5D:5A:00:22:BC:70:89:C2`.
The live Android association publishes only
`51:E5:18:EF:64:7B:2B:D5:C1:C9:1D:3D:00:D0:8E:1F:E3:19:2A:F6:33:B2:AF:67:41:A6:7F:DC:E8:72:E0:33`.
The fingerprints do not match. Device package readback reports domain state
1024, not `verified`; a non-launching resolution query for the production search
URL returns Android ResolverActivity. This does not prove what another installed
release build or another device would do. It does establish that this debug
installation cannot close the production app-link verification gate.

Do not publish the debug fingerprint or alter user defaults to manufacture a
passing result. Verify the approved release signing identity against the live
association, then exercise cold/warm OS dispatch on that release candidate while
preserving the user's existing installation and keeping test writes isolated.
Prior local package-targeted HTTP intents remain valid route-handling evidence,
not production-domain verification.

## iOS and remaining gates

Both live association files match the candidate byte-for-byte. The iOS file
still omits `/search` and `/explore`, preserving older-client compatibility and
existing web handling. No association expansion was published.

Fresh CoreDevice and Xcode checks both report the physical iPhone unavailable;
Xcode reports device error -27. The prior simulator pass remains valid and is
not physical-phone acceptance. Reconnect/unlock the iPhone, confirm connectivity,
establish a contained fixture network route, and test an isolated signed build.
No new iPhone build was installed during this preflight.

Release gates still open: physical iPhone acceptance, release-signed Android
production-domain dispatch, production-scale combined-query latency and live
catalog/finish coverage, and separate deployment/distribution review. Existing
fixture tests cannot prove those outcomes. The broader app/website audit also
retains its independent unfinished inventory; this search preflight does not
complete that audit.

This checkpoint changes documentation only. Application source remains the
previously verified candidate; its full repository and device receipts retain
their original source attribution. Local commit uses the documented operator
hook bypass without claiming another full shipcheck run.

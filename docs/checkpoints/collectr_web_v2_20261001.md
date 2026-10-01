# Source-aware Collectr import on the website

The founder requested web-first validation and removed physical iPhone testing
as a prerequisite. This branch builds on the directional set-scope candidate
07fe91ac9 (PR562); it is not a deployment or a completed real collection import.

The website now previews the original CSV using the same source normalization,
set scopes and governed Pokemon/MTG identity predicates as Edge V2. Every source
record remains visible, including grades, unsupported finishes, numberless items
and unknown fields. Matching reads every catalog/printing page, preserves
ambiguity when printing evidence is absent, and selects only one verified child.
Identical metadata can aggregate quantities; original individual records remain
available in the details view. The initial display is bounded to 50 groups.

The authenticated same-origin Next endpoint invokes the existing V2 handler
inside executeOwnerWriteV1. It uses one atomic receipt-backed SQL write, then
independently reads the private source, source-to-copy mapping and exact copies
through the owner's RLS before reporting success. The web client freezes the
original CSV, selected targets and request UUID in owner-bound sessionStorage
before dispatch. Interrupted responses and reloads reuse that attempt. Only a
confirmed rolled-back attempt permits a new request ID. Existing V1 drafts use
the legacy recovery screen; it cannot accept new files in recovery mode.

No migration, catalog changes, grade substitution or physical device test is
included. Unsupported review rows remain source evidence, not owned cards. The
real export has not been saved. Its offline web replay agrees with all 1,082
ready native rows and 1,249 copies; 790 source rows remain held for review.

Qualification uses the existing retained full410 lab, never a reset or real user.
GV_COLLECTR_WEB_HTTP_PROOF=1 selects the fixed isolated web worktree and runs the
existing real Auth/HTTP/SQL suite through Next, followed by a cookie-authenticated
mobile browser CSV preview, interrupted response, reload and verified retry.
It checks unchanged exact copy IDs and pre-existing ownership rows, owner/visitor
privacy, denied cross-origin/account requests and archived-copy recovery.
The helper pins the API to loopback58541 and Next to58863, rejects inherited
production credentials, and uses webpack because shared dependency junctions
are outside Turbopack's filesystem root. The local test flag is disallowed in
production and every other staging mode. Stop only the helper's own process tree.

Private source, screenshots, failures and terminal receipts are under
C:/grookai_vault_operator_artifacts/collectr_web_v2_20261001. The private checkpoint
records current commit/push/release status. Passing local browser tests do not
establish a deployed website or a new TestFlight build.

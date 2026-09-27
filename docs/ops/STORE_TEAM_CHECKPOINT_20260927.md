# Store team permissions — September 27, 2026

Status: implementation, database, real HTTP/Auth/Storage and browser proof complete;
normal repository release checks and governed production migration/release pending.
Nothing in this checkpoint authorizes replaying consumed reset/apply intents.

Latest release continuation is retained at
`C:/grookai_vault_operator_artifacts/storefront_production_20260926/STORE_TEAM_CHECKPOINT.md`.
Read that file before applying or activating anything; it records consumed intents
and subsequent live verification independently of this source checkpoint.

The owner requested a way to make someone a manager and choose their access.
This extends the original single-owner storefront scope to optional delegated
actions. Billing, payouts, ownership, publication and team administration remain
owner-only. No real invitation or membership has been created.

Source: `feature/store-team-permissions-20260927`, based on current main
`c037aea8206541675963ee5f8f89f7bc8969d31d`, in `C:/gv_store_production_20260926`.
Other worktrees and paused catalog-repair evidence are preserved.

## Implemented

- Owner Team page: email-bound invitation links, independent condition, pricing,
  listing and branding checkboxes, permission changes, cancellation and revocation.
- Separate manager workspace over existing explicitly selected store copies;
  thumbnails, condition, asking prices, listing state and store branding.
- Verified matching email required to accept. Tokens are random, hashed at rest,
  expire after seven days, and cannot restore revoked access by replay.
- Active database grants and rollout checks; private held, transferred, archived
  and unselected personal copies remain outside manager access.
- Database action checks and actor audit records; no owner impersonation.
- Locked store row serializes manager writes with revocation; optimistic copy/store
  versions prevent stale overwrites. Existing eligibility and stock guards remain.
- Store-scoped private branding uploads. Invitation destinations survive login
  while analytics and referrer headers suppress token disclosure.

Manager new-card intake/scans, custom collectibles, sections, personal copy images
and native manager UI are not included in this initial delegated workspace. The
permission labels and owner page state this scope explicitly.

## Local proof

- Strict read-only baseline audit: production/local ledgers equal at402,1066
  security objects, zero normalized schema difference. Private receipt:
  `.local/integration/store-team-v1/baseline.json`.
- Dedicated294xx project `grookai-store-team-20260927`, internal network,
  zero workers. Original290xx lab remains untouched.
- Initial403 preparation preserved in `.local/integration/store-team-lab-v1`.
  Media functions were added afterward; its original hashes are not final proof.
- Final frozen403 source is in `.local/integration/store-team-replay-v2`.
  One-use402 reset,403 upgrade,403 full reset and no-op local push completed.
  `docs/audits/store_team_v1/replay.json`:10355 previous objects retained,
  73 additions, no existing definition/ACL/RLS changes; replay parity passed.
- Eleven real database permission/identity/CAS/concurrency checks passed;
  `docs/audits/store_team_v1/runtime-1790488654965.json`.
- First runtime attempt exposed fixture cleanup errors (Storage metadata deletion,
  append-only card events, pricing watch FK) and a wrong test RPC signature.
  Only synthetic rows in294xx were recovered. Existing protections stayed intact.
  Harness now removes exact fixture IDs and uses transaction-local cleanup only.
- Six real Next/Auth/Storage checks passed twice. Browser proof covered owner
  checkboxes, actual invitation acceptance, scoped manager controls, persisted
  card edits and390px layouts. A final browser regression proves condition saves
  retain unsaved price drafts. Receipts are in `docs/audits/store_team_v1/`.
- Web typecheck, lint and3 focused privacy/HTTP contract tests pass. No production
  mutation, invitations or grants. Local synthetic data is removed; team remains off.
- Commit97c96450 passed the complete normal hook:5507 Node tests,4 skips, web
  typecheck/lint/build, Flutter analysis and749 Flutter tests. Push attempts
  retained a generated-report clean-tree failure and intermittent legacy-test
  timeouts. No check was bypassed. Final visual inspection then corrected light
  theme readability and verified both themes; full checks must bind this correction.
- Unapplied release packageV1 and its dry-run are superseded by V2 after that
  source correction. V1 remains preserved and must never be applied. Fresh
  AuditLinkedSchema/PrePush receipts now stay in `.local/integration/store-team-v1`
  so generating release evidence cannot dirty the source tree during push.

## Remaining release gates

1. Complete normal shipcheck and review. Recheck schema/source
   fingerprints and paused catalog checkpoint before any remote application.
2. Run the new narrow `VendorStoreTeamReleaseV1` PrePush gate for20260927060000.
   Its AuditLinkedSchema passes against fresh production402. The original
   `VendorStoreTeamBaselineAudit` remains read-only and grants no apply authority.
3. Governed403 remote apply with team control disabled and retained-data readback;
   reviewed web release; then enable only team control after live verification.
4. Return the working Team URL. Do not invite anyone until the owner chooses
   their email and permissions in the UI. Never send invitations automatically.

Rollback: disable `vendor_store_team_control.enabled`, retain all team data,
leave storefront, scan, catalog and payment controls unchanged.

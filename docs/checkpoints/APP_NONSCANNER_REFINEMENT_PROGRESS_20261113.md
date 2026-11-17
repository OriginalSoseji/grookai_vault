# Non-Scanner App Refinement Progress — 2026-11-13

## Completed in this worktree

- Vault browsing, filtering, density and By Set continuity from the earlier
  refinement checkpoints.
- Sales Desk and event/profit reporting visual convergence and clearer return
  navigation. The reports slice is committed locally as `5e1d111a0`.
- Trade review now has distinct give/receive panels, artwork-backed incoming
  copies, an agreed-value/net summary, and an explanation of one-copy outcome
  recording.
- The existing eBay seller workspace supports the full guarded
  draft/prepare/review/publish/status-recovery flow.
- Private/family/community Binder entry points are present in the native and web
  main builds.
- The unrelated minimatch Dependabot failure was resolved by merged PR #911.
- Scanner implementation remains deferred at the owner's direction.

## Local verification

- Web/mobile parity suite: 170/170 passed (the existing scanner regression
  cases also ran; scanner source was not changed).
- eBay seller workspace suite: 17/17 passed.
- Collector Binder native integration: 21/21 passed.
- Binder browser refinement: 7/7 passed.
- Web typecheck, ESLint, and `git diff --check` passed.

## Open external/release work

- Two full push-gate retries reached the end of the native suite but each lost a
  local HTTP connection while loading one Flutter test file. Both affected
  files passed alone. The changes therefore remain local and are not reported
  as pushed or hosted.
- Production eBay readback last showed 18 saved drafts. No exact intended draft
  was identified or published, so live listing publication is still unverified.
- Family/community verification used isolated local fixtures. The production
  Binder rollout runbook remains prepared but unapplied; its flags stay off.
- Duet only mirrors the workstation, so no live Samsung screen sign-off is
  claimed.

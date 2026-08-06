# Fresh Release Baseline Verification 20260806 V1

## Scope

This audit re-verifies merged production baseline `e8fcbdbb47b97a9db215d3874ea9ae83ce075adf` from isolated branch `release/8-week-completion-v1`. It establishes fresh repository, database-read, browser-parity, production-web, and connected-Android evidence before final-candidate journey testing.

## Repository And Database Gate

`npm run shipcheck` passed after loading the governed database connection from ignored local configuration into the command process. No secret value was copied into the worktree or written to an artifact.

- Release secret packaging guard: pass
- Runtime preflight: `PASS_WITH_DEFERRED_DEBT`
- Critical preflight failures: `0`
- Node contracts: `1,516/1,516`
- Runtime health: pass
- Quarantine and deferred-debt reports: generated successfully
- Web TypeScript: pass
- Web lint: pass
- Strict Next production build: pass
- Flutter analysis: pass
- Flutter tests: `570/570`

Known deferred debt remains contained by the runtime contract. This audit does not promote or repair the 62 legacy rows without GV-ID, five historical source/card duplicate groups, or 2,466 canonical rows without an active identity row.

## Browser Parity

The first local parity invocation found an evidence-integrity defect in the test runner: Playwright could reuse an unrelated server already listening on default port `3100`. That invocation reached `85/99` before stale-server fixture responses returned HTTP 404. It is not accepted as product evidence.

The suite was rerun from the isolated worktree on dedicated port `3117`:

- Mobile and desktop accessibility: pass
- Horizontal overflow checks: pass
- Canonical mobile goldens: pass
- Release-convergence state fixtures: pass
- P0 desktop, narrow, and Samsung visual goldens: pass
- Result: `99/99`

The Playwright configuration now refuses server reuse by default. Reuse requires explicit `GROOKAI_PLAYWRIGHT_REUSE_SERVER=1`; a release run can therefore no longer silently test stale code.

## Production Web Readback

Authenticated production Chrome readback against `https://grookaivault.com` proved:

- Home presents the permanent digital card show position and the five primary product pillars.
- Search returned 48 Pikachu results with exact-card identity, set, number, rarity, and direct exact-version Vault actions.
- Card detail rendered identity, ownership, exact printing choices, image state, card facts, set context, other versions, owned-copy context, and honest pricing abstention when no qualified exact mapping exists.
- Vault rendered 1,021 cards across 215 unique identities with set, number, finish-assignment state, raw/slab context, Wall status, and collector intent.
- No browser console errors were observed on the sampled Home, Search, Card Detail, or Vault pages.

No production mutation was performed.

## Android Connection

- Device: Samsung `SM-S908U`
- ADB state: connected
- Display state: awake

This connection check does not replace the prior physical-device journey evidence and does not claim a fresh final-candidate device run.

## Decision

The repository-quality gate is proven for the current baseline. Product completion remains prohibited because the final candidate has not yet completed all six production journeys, the full cross-platform state matrix, operational/store verification, or the 72-hour soak.

# Pricing Checkpoint 42: Canary Commit-Pin Repair and Restart

## Status

Active time-gated release checkpoint.

The special-variant exact-image review is complete. The Pricing Production V1
canary has restarted from a healthy, reconciled publication after a stale
systemd expected-commit pin invalidated the prior observation window.

The replacement canary is not complete. Its 72-hour observation window ends
at `2026-08-08T07:51:54.064Z`, before final-slot grace is applied.

## Context

Checkpoint 39 documented the preceding pricing runtime incident and repair.
The later replacement window beginning `2026-08-02T22:29:17.856Z` did not
receive either of its first two unattended daily cycles.

The observer correctly failed closed. It found missing August 3 and August 4
schedule slots, two terminal alerts, stale source evidence, zero current exact
rows, and an empty authenticated pricing read.

## Problem

The production checkout and pricing artifacts were pinned to reviewed commit
`6b729441bf8944048885ade5d9905e23166d9d46`, but the systemd environment still
required historical commit `08bfddc15f4f19777ea1ed588f84bbd908ea770b`.

The scheduler's fail-closed commit guard rejected both unattended cycles
before pricing work began. No data was destroyed, but the missing cycles made
the prior 72-hour claim invalid.

## Risk

A superficial repair could have hidden the incident, resumed an invalid
window, substituted canary identities, or allowed an unreviewed checkout to
publish prices. Any of those would break the Production V1 authority chain.

## Decision

- Preserve the failed window as permanent evidence.
- Keep producing code frozen at `6b729...`.
- Correct only the runtime expected-commit configuration.
- Verify exact 100-row canary continuity before recovery.
- Use one unique recovery key and remove it after completion.
- Restart a new 72-hour window from the reconciled activation timestamp.
- Keep GitHub observation read-only and pinned to the producing commit.
- Do not authorize post-canary work until the replacement window passes.

## Alternatives Rejected

- Ignoring the two missing schedule slots.
- Editing or deleting the terminal alerts.
- Backdating the replacement window.
- Disabling the commit guard.
- Publishing from `main` instead of the frozen pricing commit.
- Substituting a normal printing for the unavailable holofoil canary row.
- Applying post-canary migrations before operational duration is proven.

## Current Truths

| Truth | Value |
| --- | --- |
| Frozen producing commit | `6b729441bf8944048885ade5d9905e23166d9d46` |
| Canary definition | `TCGPLAYER_MARKET_CANARY_100_V2` |
| Canary definition hash | `861b9dd97baaa0c93a6bcdd94c5f9ef903388bbc87a31923cfee3fbeb8cfc3d2` |
| Replacement activation | `3c1be9e1-de61-4459-9110-890fd7cc9210` |
| Replacement publication set | `168e8206-4926-41a1-9e78-d997273bdb08` |
| Replacement window start | `2026-08-05T07:51:54.064Z` |
| Required window end | `2026-08-08T07:51:54.064Z` |
| Current exact rows | `99` |
| Current positive rows | `99` |
| Authenticated governed reads | `99` |
| Broken traces | `0` |
| Anonymous runtime access | denied (`42501`) |
| Health | `healthy` |
| Rollback | available |
| Matched unattended slots | `1 / 3` |
| First unattended completion | `2026-08-05T08:36:26.696Z`, success |

One expected row is explicitly source-missing. Exact-printing policy did not
substitute its normal variant, and the `1` missing row is within the frozen
maximum of `5`.

## Invariants

- TCGPlayer `marketPrice` remains the market close authority.
- Exact card-print, language, and finish identity remain mandatory.
- Source-missing is an explicit outcome, not permission to substitute.
- Canonical identity, Vault, and modeled-value writes remain denied.
- Anonymous pricing access remains denied pending its separate authority gate.
- The observer may read and report; it may not publish, migrate, or repair.
- A passing activation is not a passing 72-hour canary.
- Historical failed windows remain failed.

## What Must Never Be Broken

- The source-to-canonical-to-publication-to-read-model provenance chain.
- Immutable run keys and terminal run evidence.
- Frozen commit and canary-definition hashes.
- Exact-printing boundaries.
- Reconciled counts across decisions, snapshots, traces, and reads.
- Fail-closed scheduler behavior.
- Rollback availability.

## Evidence

Permanent evidence is rooted at:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_commit_pin_repair_20260805/`

It contains the failed observer, recovery run plan and reconciliation,
production health readback, systemd unit definitions, replacement observer,
first unattended cycle and observation, report, and artifact hashes.

## Explicit Next Gate

Reconcile all scheduled cycles in the replacement window. After
`2026-08-08T07:51:54.064Z` and final-slot completion grace, require a terminal
observer pass. If it passes, execute the already frozen post-canary migration,
deployment, 17-surface verification, signed-in rollout, and rollback-proof
sequence. If it fails, preserve the evidence and stop without broadening
publication.

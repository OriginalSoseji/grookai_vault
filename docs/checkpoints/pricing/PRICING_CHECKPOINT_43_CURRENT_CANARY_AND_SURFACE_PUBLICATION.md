# Pricing Checkpoint 43: Current Canary and Surface Publication

## Status

Active, time-gated Production V1 release checkpoint.

The MEE pricing read model and all 17 registered app surfaces are implemented.
The web surface proof repair is deployed from merge commit
`72d4f645a2697bc4c50e7602e5b9ec4e2ef3cf87`. Full eligible signed-in
publication remains blocked until the active 72-hour canary passes.

## Context

The prior August 5 canary window is historical. A later governed recovery
started a new active canary on August 13. The GitHub observer still referenced
the expired August 5 activation and silently exited after reporting that its
old window had ended. The production systemd canary continued to operate, but
GitHub was no longer observing the active release gate.

## Decision

- Preserve the frozen 100-printing cohort, its current 99 resolved rows, and
  its producing SHA unchanged.
- Validate source-missing variation against the reviewed maximum of five;
  never freeze an observer to a transient resolved-row count.
- Point the read-only GitHub observer at the current activation.
- Keep the full eligible publication blocked until the observer passes.
- Deploy the web proof-role repair now so post-canary captures are
  deterministic.
- Keep anonymous pricing denied.
- Do not weaken exact-printing Vault policy to manufacture a canary overlap.

## Current Truths

| Truth | Value |
| --- | --- |
| Canary producing commit | `6b729441bf8944048885ade5d9905e23166d9d46` |
| Active activation run | `e902fb55-c0ac-49d5-a9b4-9412d694900e` |
| Active publication set | `a1c26975-c8b3-423f-b604-8bf61dbe85b0` |
| Previous publication set | `9eeb8801-9729-4c37-a24b-a2068fe43c91` |
| Window start | `2026-08-13T09:56:42.279Z` |
| Required 72-hour end | `2026-08-16T09:56:42.279Z` |
| Frozen cohort size | `100` |
| Allowed source-missing rows | `5` |
| Current exact rows | `99` |
| Current parent rows | `98` |
| Warehouse source rows | `543,960` |
| Stale rows | `0` |
| Broken traces | `0` |
| Terminal alerts in current window | `0` |
| Authenticated governed read | healthy |
| Anonymous governed read | denied (`42501`) |
| Rollback generation | available |
| Production web commit | `72d4f645a2697bc4c50e7602e5b9ec4e2ef3cf87` |

## Surface Truth

All 17 surfaces remain registered against the shared governed read model:

- nine web surfaces
- eight Flutter surfaces

Production smoke checks on the deployed web commit proved Card Detail,
Compare, and Market History rendering from the active canary. Compare now
labels one price per card as primary proof and repeated table values as
supplemental proof. Direct proof emitters explicitly carry the primary role.

The current canary has no exact-printing overlap with an eligible raw Vault
copy. Therefore the exact-Vault positive sample and Vault total render proof
cannot pass during this canary. This is a coverage fact, not permission to use
a parent or guessed finish. Final Vault proof must run immediately after full
eligible activation, with rollback available.

## Verification

- Pricing contracts: `168 / 168` passed before merge.
- Surface proof contracts: `19 / 19` passed after the final review repair.
- Web typecheck, lint, and production build: passed.
- Targeted Flutter pricing tests and analysis: passed.
- GitHub CodeQL, drift, runtime, legacy-key, Vercel, and Samsung parity gates:
  passed for the release PR.
- Production web deployment reports commit `72d4f645...`.
- Live MEE health from the merge commit: healthy.
- Live canary observer from the merge commit: `observing`, zero findings.
- Schema and access authority: verified; positive Vault sample remains
  unavailable until eligible publication overlaps an exact owned printing.

## Permanent Evidence

Current live observer evidence:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_restart_20260813/2026-08-13T15-51-13-054Z/`

The evidence was produced read-only from merge commit `72d4f645...`. It records
the active canary's producing commit separately as `6b729441...`.

## Invariants

- TCGPlayer `marketPrice` remains the market-close authority.
- Only exact English Pokemon printings and finishes publish in V1.
- Canonical identity and Vault ownership data are never mutated by pricing.
- Unresolved Vault printings remain unpriced.
- Anonymous pricing remains denied.
- Historical failed canary windows remain failed.
- The GitHub observer is read-only and cannot activate publication.
- The MEE runtime remains pinned to the active canary until the current window
  passes.

## Exact Next Gate

After the final scheduled canary cycle and no earlier than
`2026-08-16T09:56:42.279Z` plus the configured completion grace:

1. Require the current observer to pass with all scheduled cycles reconciled.
2. Freeze the exact full-rollout commit and confirm web and Flutter deployment
   provenance.
3. Run a fresh complete-scope shadow and require at least 95% governed
   coverage with zero unclassified gaps.
4. Activate the full eligible signed-in publication with no row limit.
5. Run health, coverage, performance, provenance, Vault readback, and rollback
   dry-run.
6. Capture and reconcile all 17 deployed surfaces. Roll back the publication
   if any accepted displayed value disagrees with governed evidence.
7. Pin and enable the full-scope daily scheduler.
8. Observe seven unattended full-production cycles before declaring
   Production V1 operationally complete.

No further product design or manual pricing approval is required for this
gate. Only failed evidence may stop promotion.

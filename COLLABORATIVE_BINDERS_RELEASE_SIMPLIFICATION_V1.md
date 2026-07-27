# Collaborative Binders Release Simplification V1

## Release shape

Every production release uses one frozen checkout at the reviewed commit. Build and review work ends before production execution begins; execution mode is no-new-engineering unless a real production failure is discovered.

Before readiness, the release owner designates:

- one authoritative, reviewed activation script that performs only the ordered production writes and immediate readbacks;
- one authoritative, read-only post-release verifier for database, web, and client state.

Their paths, hashes, ordered changes, rollback/kill-switch behavior, and expected final vector are frozen with the release. Do not add wrappers, supervisors, collectors, secondary validators, or validators for validators after readiness.

## Mandatory safeguards

Keep only:

- a verified usable backup;
- a known live pre-state;
- a frozen commit and reviewed artifacts;
- ordered activation with exactly one expected change per step;
- direct full-state readback after every production write;
- enforcement that excluded features remain off;
- a reviewed kill switch;
- no blind retries;
- post-deployment database, web, and device verification.

If a write command fails after it may have changed production, determine live state read-only before doing anything else. Stop on ambiguous state, partial application, an enabled excluded feature, artifact identity mismatch, or a condition requiring destructive recovery.

Evidence storage must use ordinary project-accessible paths. ACL or evidence-sealing requirements that depend on unavailable Windows privileges must not be imposed.

## Time budget and escalation

Once readiness is declared, production execution has a 60-minute budget. If that budget expires, stop adding process machinery and escalate the exact unresolved production condition to the release owner. Optional paperwork never delays a healthy launch.

## Lessons from this rollout

- The Binder product and reviewed artifacts were ready; release machinery became the blocker.
- Live readback was the authoritative evidence and allowed safe direct execution.
- A completed verified backup did not need to be duplicated.
- Unsupported ACL requirements were unrelated to product safety.
- Build/review mode and execution mode must remain separate.
- Safety comes from a small set of enforceable invariants, not from multiplying controllers and evidence layers.

# Collaborative Binders Rollout Process Correction V1

## Purpose

This plan keeps the protections that made the Binder release safe while
preventing release execution from turning into another engineering project.
It applies once a release is reviewed and declared ready for production.

## Freeze before execution

Build and review happen before release execution. Readiness records one exact
commit, one isolated checkout, the approved database and client artifacts,
their hashes, the ordered production changes, and the expected final state.
The checkout is then frozen: no fetch, pull, merge, rebase, or unrelated edit
is permitted until the release ends. Later `main` movement is deferred to a
future release.

After readiness, the release enters **no new engineering** mode. A newly
encountered production failure may justify the smallest necessary fix, but
that fix must be reviewed, tested, and frozen as a new release identity before
execution resumes.

## Maximum evidence stack

Every release has exactly:

1. one authoritative rollout controller containing the approved, ordered
   activation script;
2. one authoritative post-rollout verifier; and
3. one execution evidence root containing the controller's ordered results
   and verifier output.

Do not add supervisors, secondary controllers, acceptance-receipt systems,
watchers, validators for validators, or repeated evidence resealing after
readiness. Supporting screenshots or dashboard copies are optional
observability, not additional production gates.

The evidence root is ordinary storage for script and verifier output. It is
not a protocol, sealing system, independent acceptance gate, or
privilege-dependent ACL requirement. A release must not depend on Windows ACL
or evidence-sealing behavior that is unavailable to the execution identity.

Mandatory safeguards are:

- a verified usable backup and reviewed restore path;
- a read-only, known production pre-state;
- the frozen release commit and content-addressed artifacts;
- ordered activation with one expected change per step;
- full-state readback after every possible production mutation;
- enforcement that P8 and excluded features remain disabled;
- no blind retry after an ambiguous command result;
- a reviewed kill switch or rollback path; and
- post-deployment database, web, mobile, device, and invariant verification.

Optional safeguards may improve convenience or audit presentation, but they
must not delay a healthy release or become dependencies of the mandatory
gates.

## External gates and time budget

When a required external operation is already running and its state can be
queried—such as a backup, deployment, or build—the release waits on that
authoritative operation. It does not create a new polling framework or start
a duplicate operation.

Production execution has a 60-minute budget after readiness. At the budget
limit, the release owner stops adding machinery, reads live state, and
escalates the exact unresolved condition. Production state, not the amount of
paperwork produced, determines whether the release continues.

## Failure and retry discipline

If a command fails before any mutation, correct only the demonstrated blocker
and revalidate the frozen package. If a command may have changed production,
inspect live state read-only before deciding what happened. Retry only when
the prior operation is proven state-neutral or idempotent and the current
state is known. Never use automatic rollback, destructive cleanup, or data
deletion to make evidence look clean.

Stop on ambiguous production state, an inconsistent migration, an enabled
excluded feature, artifact identity drift, or a condition requiring
destructive recovery. Do not stop merely because optional evidence could be
more elaborate.

## Lessons recorded

- Repository drift during an active release must be prevented at checkout
  freeze time, not compensated for with expanding guard layers.
- Build/review mode and release-execution mode are separate responsibilities.
- Existing completed backup evidence should be consumed once; duplicate
  backup work is not a substitute for forward progress.
- Live readback is authoritative after any possible production write.
- Narrow contract bugs require narrow fixes and regression tests, not a new
  rollout framework.
- Platform-specific credential limitations should be solved at the boundary
  or escalated. Unavailable Windows ACL or evidence-sealing privileges must
  not become release gates, and must not produce protection systems for other
  protection systems.
- The backup, known pre-state, ordered activation, excluded-feature
  enforcement, no-blind-retry rule, kill switch, frozen release identity, and
  final verification remain non-negotiable.

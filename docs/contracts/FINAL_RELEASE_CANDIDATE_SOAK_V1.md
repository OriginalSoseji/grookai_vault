# Final Release Candidate Soak V1

## Purpose

The final release-candidate soak proves that one immutable web, Android, and iOS
candidate remains healthy for at least 72 continuous hours. It cannot replace
physical-device, fresh-user, store, privacy, or journey evidence.

## Start Gate

The soak may start only when every completion-manifest gate other than
`final_72_hour_release_candidate_soak` is `proven`. The start and recording
timestamps must be created together; a start more than five minutes before or
after its recording time is invalid.

The state must preserve a deterministic start-authorization projection containing
the frozen candidate identity and every non-soak gate's status, evidence, and
remaining-evidence list. Its SHA-256 is recorded with the start. Legacy states,
unproven projections, digest tampering, or prerequisite drift during the soak
fail closed. A state created before the prerequisites were proven cannot become
valid merely because the live manifest changes later.

The frozen identity contains all of:

- source commit
- production web deployment ID
- Android APK SHA-256
- iOS IPA SHA-256

Any identity change creates a new candidate and requires a new soak.

## Observation Contract

Each observation must preserve the frozen candidate identity and prove:

- runtime health passed
- production web passed
- data truth passed
- privacy and authorization passed
- zero unresolved P0 defects
- zero launch-blocking crashes

An initial observation is required within two hours of the start. Observation
gaps may not exceed 26 hours, and a final observation must occur at or after the
72-hour boundary. The soak is never backdated or shortened.

## Final Report Gate

The final production report is allowed only when the policy result is `passed`.
`observing`, `failed`, `blocked_prerequisites`, and `ready_to_start` cannot be
reported as release completion.

## Commands

Readiness/status only; this does not create a soak:

```text
npm run release:soak:status
```

Evaluate a recorded state:

```text
node scripts/audits/release_candidate_soak_v1.mjs --state=<path>
```

Require a completed, clean soak before final reporting:

```text
node scripts/audits/release_candidate_soak_v1.mjs --state=<path> --require-pass
```

The verifier deliberately has no implicit start command. Starting the clock is
a governed release-management action performed only after prerequisites pass.

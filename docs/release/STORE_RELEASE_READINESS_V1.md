# Store Release Readiness V1

## Contract

Store readiness has two independent layers:

1. Repository readiness: metadata, privacy/data-safety answers, public support and deletion URLs, package identity, build identity, and asset references are complete and internally consistent.
2. Submission readiness: current assets exist and the authenticated Apple and Google consoles have been verified with review access configured.

The repository must never claim submission readiness from configuration files alone.

## Current Truth

- Apple metadata and privacy answers are present for iOS 1.0.
- Google Play listing and data-safety answers are present for Android 1.0.
- Public privacy, support, and account-deletion routes are live contract requirements.
- Reviewer credentials remain outside source control.
- Apple console verification requires a fresh authenticated App Store Connect session.
- Google Play requires creation or identification of a developer account before listing verification.
- Current store screenshot and graphic paths are required but not yet populated on this branch.

## Commands

```text
npm run release:store:status
npm run release:store:require
```

The status command succeeds when repository metadata is valid and reports external/asset blockers. The require command fails until every submission blocker is closed.

## Never Do

- Never store reviewer passwords, API private keys, session tokens, or personal account identifiers in the repository.
- Never mark a console field complete without direct readback from that console.
- Never upload screenshots from a stale or materially different application build.
- Never infer Google Play developer-account readiness from a signed-in Google session.

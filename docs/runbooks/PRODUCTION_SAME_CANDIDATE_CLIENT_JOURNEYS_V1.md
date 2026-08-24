# Production Same-Candidate Client Journeys V1

## Purpose

Prove that production web, signed Android, and TestFlight iOS were built from
one frozen source commit and satisfy the same collector-critical backend
journeys.

Historical functional evidence can guide execution, but it cannot pass this
gate for a different commit or binary.

## Candidate Freeze

1. Merge the release branch only after all prerequisite gates permit a final
   candidate.
2. Record the resulting 40-character source commit.
3. Deploy web from that commit.
4. Build Android from that commit through the governed signed workflow.
5. Build iOS from that commit through Xcode Cloud and distribute it through
   TestFlight.
6. Record deployment/build IDs, timestamps, and mobile binary SHA-256 values.

Android GitHub Actions and Xcode Cloud inject `GROOKAI_SOURCE_COMMIT_SHA` into
the Flutter build. Crashlytics custom keys record the source commit and build
run ID without including user data.

## Required Journeys

Each platform must pass:

- authentication;
- search;
- pricing;
- Vault;
- self-hosted images;
- sharing; and
- Memory links.

Mutation journeys must either remain read-only or provide a before/after
database reconciliation and net-zero cleanup. Evidence must be captured after
the candidate freeze.

## Platform Evidence

### Web

Run the governed signed-out and signed-in Playwright suites against the exact
deployment. Record Vercel deployment ID and `VERCEL_GIT_COMMIT_SHA`.

### Android

Install the governed signed artifact without substituting a local build.
Record workflow run, artifact ID, APK/AAB hash, package/version, and embedded
source commit. Execute the required journeys on the Samsung or a governed
emulator where hardware is not required.

### iOS

Use the TestFlight build produced by Xcode Cloud. Record Xcode Cloud build ID,
TestFlight build number, IPA hash, bundle/version, and `CI_COMMIT`. Execute the
required journeys on the iPhone or a governed simulator where hardware is not
required.

## Evaluation

Prepare a fail-closed evidence package before freezing or deploying anything:

```powershell
npm run production:clients:prepare
```

This writes a hashed manifest template under `C:\secure-ops` using the current
source SHA. Artifact source SHAs, build IDs, binary hashes, journey timestamps,
and evidence paths remain empty until independently proven. The preparation
command never freezes a candidate, starts a deployment, triggers a mobile
build, or changes production.

Copy
`docs/release/production_same_candidate_client_gate_v1.example.json` into the
new audit directory, replace every placeholder with immutable evidence, and
run:

```powershell
node scripts/audits/production_same_candidate_client_gate_v1.mjs `
  --manifest=<audit-directory>/same_candidate_client_manifest.json `
  --require-pass
```

The gate fails for commit drift, stale evidence, missing journeys, missing
artifact hashes, missing evidence files, or unreconciled database effects.

## Boundaries

- No public rollout.
- No RLS widening.
- No production mutation solely to manufacture evidence.
- No local or ad hoc mobile binary may substitute for the governed artifact.
- Any application-source change creates a new candidate and invalidates prior
  candidate-scoped journey evidence.

# Xcode Cloud TestFlight External Release Audit

## Objective

Produce one App Store-eligible Xcode Cloud build from the frozen `main` commit
and make it available to the existing internal and external TestFlight groups.

## Root Cause

Xcode Cloud Build 275 succeeded, but the workflow archive action was configured
with `buildDistributionAudience: INTERNAL_ONLY`. The binary is therefore valid
for internal testing but ineligible for the two external TestFlight groups.

## Governed Operation

1. Preserve the before-state and exact release plan.
2. Change only the archive action audience to `APP_STORE_ELIGIBLE`.
3. Read the workflow back and verify the exact setting.
4. Start exactly one build from `main` commit
   `06f83b8542cf8fb7dbbc17180eefad5eaf4e5ac0`.
5. Wait for Xcode Cloud and App Store Connect processing.
6. Assign the valid build to the existing TestFlight groups.
7. If Apple requires Beta App Review, record that gate and do not represent the
   build as externally available until review succeeds.

## Boundaries

- TestFlight only.
- No public App Store release.
- No bundle ID, signing owner, capability, or application identity changes.
- No second build if the controlled build fails.
- No secrets in audit artifacts.

## Status

Rolled back after runtime failure.

- Workflow audience changed and read back as `APP_STORE_ELIGIBLE`.
- Exactly one controlled run was created: Xcode Cloud Build 276.
- Build 276 succeeded from frozen `main` commit
  `06f83b8542cf8fb7dbbc17180eefad5eaf4e5ac0`.
- The processed build is `VALID` and `APP_STORE_ELIGIBLE`.
- Beta App Review is `APPROVED`.
- The external build state is `IN_BETA_TESTING`.
- Build 276 is assigned to both external groups. The internal group retains
  all-build access.
- No public App Store release or application identity change occurred.

After installation, Build 276 displayed a persistent white screen. It was
removed from both external groups immediately; Build 23 is again their latest
assigned build. Build 276 was not expired so its evidence remains available.

Binary inspection proved the exact production Supabase URL and publishable key
were absent from the shipped AOT application. No dotenv file was bundled. The
app therefore threw before `runApp()` and never rendered a Flutter frame.

The repository repair makes the Xcode Cloud bootstrap invoke the ignored iOS
secret writer, gives workflow process environment precedence, fails the build
before archive when required values are absent, and renders a visible startup
error if configuration is ever missing again.

Local runtime proof is complete from a clean Mac worktree at repair commit
`9496af3ab965cde75d32965aef9fd6f1eed1486f`:

- six targeted contracts passed;
- `flutter analyze lib/main.dart` passed with no issues;
- the process-environment writer test passed;
- the iOS simulator app rendered the Grookai login screen;
- the first Flutter post-frame callback occurred at 471 ms;
- the login route rendered at 1.017 seconds;
- live backend requests returned HTTP 200;
- a no-codesign release device build succeeded; and
- the release AOT binary contains the exact expected configuration values.

The first replacement attempt, Xcode Cloud Build 277, stopped safely before
archive because `ci_post_clone.sh` exited with code 27. App Store Connect issue
readback confirms the failure occurred in the post-clone bootstrap. No Build
277 TestFlight artifact was created. The Xcode Cloud workflow is disabled to
prevent additional paid runs while runtime configuration is unresolved.

The subsequent Binder audit found that the shipped release writer also omitted
all 11 public Binder compile-time gates. Every Binder gate therefore defaulted
to false even though production readback proves schema, personal, shared, view
links, public, community, custom, and templates are active. The iOS writer now
mirrors that exact production vector while preserving process/dotenv override
authority. Notifications, Pulse sharing, and set Binders remain false.

Binders already has a feature-gated card and action inside Vault. The repair
also adds a visible signed-in mobile drawer entry and desktop rail entry. A
clean pinned-Flutter simulator build succeeded, rendered an existing signed-in
session, and passed a release-specific feature-vector test. The screenshots and
structured readback are retained in this directory.

The workflow is currently disabled. Converting it to a manual-only or
path-filtered release workflow remains a separate cost-control gate.

# Bounded audit web release — September 27, 2026

The founder approved separating a bounded release from the expanding audit repair
package. This web candidate contains existing interface repairs that do not depend
on the pending import/slab migrations or the new maintenance control. It preserves
the latest merged store-manager workflows and the original backend/native candidate.

Worktree: `C:/grookai_vault_web_audit_release_20260927`.
Branch: `fix/audit-web-release-20260927`.
Base: `2e59493297141b7828dc4399d2baa30333ff517b` (current main, including PR523).
Source repair tree: `b6c99bf1f3fdcb3d76b1ff3e8fce721c706fdc6e` in the preserved
`C:/grookai_vault_audit_release_20260927` worktree.
Private evidence: `C:/grookai_vault_operator_artifacts/audit_web_release_20260927`.

## Fixed scope

| User outcome | Included change | Acceptance |
| --- | --- | --- |
| Compare remains usable above mobile navigation | Measured dock height, responsive placement, short-screen scrolling | Chromium/Windows WebKit viewport, pointer, keyboard and navigation checks |
| Search suggestions work consistently with keyboard and assistive semantics | Combobox/listbox roles, active option, Escape/Tab dismissal, stale-response handling | Actual search component with isolated responses in both browser engines |
| Japanese image fallback survives canon image failure | Scoped official HTTPS fallback; accessible missing-image state | Image failure/fallback browser checks and URL boundary contracts |
| Confirmation-required signup explains the next action | Check-email state, resend, safe return destination, callback failure handling | Intercepted Auth browser tests plus executable callback contracts; real provider delivery remains separate |
| Recovery does not falsely promise that an interrupted save changed nothing | Honest root error message | Existing product-state contract |
| Founder pages show the requested record and correct day | Fetch linked work item outside recent 100; UTC date display | Founder authorization, lookup/error and timezone contracts |

The extraction manifest lists twelve runtime files and fifteen test/support files.
The only additional config change hides the developer badge in the existing local
visual-test mode. Both fixture pages return not-found outside local development;
production modes and staging target guards are unchanged.

## Dependency proof and exclusions

Each selected file was checked for upstream changes between the old repair base
and current main before extraction; none overlapped. Files were copied from the
preserved staged Git blobs and hashed. No code under `supabase/`, `lib/` or
`backend/` changes. No pending audit migration, new RPC, permission, entitlement,
provider mapping, import writer, slab writer or native change is included.
Existing search interpretation and artist-search behavior remain on current main.

This release must not grow to absorb additional audit findings. Fix only regressions
or blockers caused by this package; record other findings in the deferred work.

## Qualification and delivery

Run the four focused browser suites on this exact branch, then the normal commit
hook (full shipcheck) with an explicitly isolated read-only runtime database.
The browser suites use synthetic/intercepted data and Windows browser engines;
they do not establish real email delivery, spoken screen-reader output, iOS Safari
or physical-device behavior. A preview build does not establish production-config
qualification. The private receipts record actual commands, exit codes and source.

No migration or writer pause is required for this web-only package. Hosting/source
verification, production-config qualification, website release and post-release
smoke checks still apply. Do not use this scope split to bypass ordinary hooks or
represent a local build as deployed. Keep production inspection read-only and
account-changing tests on isolated data.

## Remaining process, in delivery order

1. Finish this web package's checks, commit/review, then its website release and
   deployed smoke checks. Report a usable release outcome.
2. Return to the preserved native/data repair package with a separately frozen
   scope: interrupted import recovery, slab identity/provider constraints and its
   migration/device/release requirements. Do not rebuild the database just to
   repeat already-established evidence.
3. Refresh the five original audit deliverables with fixed/released/unverified
   status and remaining platform evidence. Missing feature parity and visual
   improvements remain prioritized roadmap work, not automatic blockers for this
   bounded website release. Audit completion does not require implementing the
   entire roadmap.

The latest machine-readable `result.json` in the private evidence root is the
delivery status for this batch. This source document defines scope and acceptance;
it does not itself assert a passing gate or deployed release.

## CI suite isolation

The first PR run discovered that the default parity config also collected the
new account-recovery and search specs under the wrong fixture environment. The
canonical config now names its original four suites (104 cases); four dedicated
CI jobs run all 40 audit cases with each suite's own isolated configuration and
both Chromium and Windows WebKit. No assertion or release guard is disabled.
This follow-up changes test routing only; the twelve runtime repairs are intact.
The workflow also covers changes to web library helpers, including image URL and
search utilities, so helper-only regressions cannot skip these browser jobs.

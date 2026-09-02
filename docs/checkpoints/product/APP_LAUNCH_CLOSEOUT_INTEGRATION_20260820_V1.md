# APP LAUNCH CLOSEOUT INTEGRATION - 2026-08-20

## Status

SAFE NON-MTG INTEGRATION COMPLETE / PUBLICATION AND EXTERNAL STORE GATES OPEN

## Frozen Baseline

- Integration worktree: `C:\grookai_vault_launch_closeout`
- Integration branch: `agent/app-launch-closeout-v1`
- Baseline `origin/main`: `d6840bf89bfc056cd318f1f3a22de5e344a769bd`
- Production writes performed: none
- MTG workflow, catalog, migration, pricing, image, and release-control changes: none

## Integrated Work

The isolated closeout worktree reconciles these previously separate product changes onto the current main baseline:

- Chat safety and store-readiness implementation from `3d639a6c120a1277867913002c5cef79bf01369c`.
- Safe Vault bulk selection and archive flow from `6f2db5dae`.
- Unified collector catalog search UX from `893119c8c`.

The product checkpoint index was reconciled manually so the newer GVVI checkpoint and the imported August 17 checkpoints are all preserved.

## Current Truths

- Web and Flutter message writers enforce Chat Safety Policy V1 before writes.
- Reports retain explicit reason codes and founder-only review controls.
- The chat-safety gate adds no database migration and does not delete or rewrite existing messages.
- Vault supports explicit selection, pricing filters, select-all, and atomic removal of selected canonical cards.
- Production already contains migration `20260819023000_vault_bulk_archive_selected_cards_v1`.
- Read-only production verification proved the migration ledger row and function are present.
- The production bulk archive function is `security definer`, binds the owner through `auth.uid()`, delegates to the governed single-card archive function, denies `anon`, and permits `authenticated` and `service_role` execution.
- Web search exposes live exact-card suggestions through `/api/search/suggestions`.
- Search redirects to the shared Explore experience and preserves governed TCG scope selection.
- Founder trust-safety remains authentication-gated.

## MTG Isolation Proof

No MTG runtime, ingestion, workflow, migration, pricing, image, publication, or release-control file changed.

The only MTG-named changed path is `tests/contracts/mtg_signed_in_client_boundary_v1.test.mjs`. Its assertion now verifies that the existing MTG game selector is rendered by the shared search form instead of the old Explore-local selector. All MTG contracts passed.

## Verification

- Targeted Node contracts: `26/26` passed.
- Full Node contract suite: `2261/2261` passed.
- Targeted Flutter tests: `5/5` passed.
- Full Flutter suite: `631/631` passed.
- `flutter analyze`: no issues.
- Web TypeScript: passed.
- Web ESLint: passed with zero warnings.
- Next.js production build: passed; 691 checked-in set counts validated.
- `git diff --check`: passed.
- Local production smoke at `http://localhost:3111`:
  - `/`: `200`
  - `/explore`: `200`
  - `/search?q=pikachu`: governed redirect to Explore
  - `/api/search/suggestions?q=pikachu`: `200` with exact-card rows
  - `/founder/trust-safety`: authentication redirect

## Store Readiness

The repository metadata contract is valid for build `300`, but submission is not ready.

Current blockers:

- Six prepared store-media outputs are absent from a clean checkout.
- The prior generator references untracked Android and iPad source captures that are no longer available.
- Old hashes prove those files once existed, but they are not reproducible from repository-owned inputs.
- Apple console listing and review credentials require fresh authenticated verification.
- Google Play listing, Advertising ID declaration, and photo/video permission declaration require fresh authenticated verification.

The missing media must be recaptured from the current candidate. Stale captures must not be reconstructed or presented as current evidence.

## Remaining Gates

1. Publish this isolated integration through normal Git review and CI.
2. Build the next release candidate from the merged commit.
3. Capture current Android, iPhone, and iPad store media and regenerate the deterministic store package.
4. Complete and read back the Google Play declarations and listing.
5. Complete and read back the App Store Connect listing and reviewer access configuration.
6. Run one final Android, iOS, and web launch smoke against the exact distributed candidate.

## Invariants

- Do not modify or rebase the active MTG writer/supervisor branch while ingestion is running.
- Do not apply the MTG pricing migration or activate MTG from this closeout branch.
- Do not rerun the already-applied Vault bulk migration.
- Do not weaken anonymous catalog, pricing, trust-safety, or founder authorization boundaries.
- Do not claim store submission readiness from repository metadata alone.

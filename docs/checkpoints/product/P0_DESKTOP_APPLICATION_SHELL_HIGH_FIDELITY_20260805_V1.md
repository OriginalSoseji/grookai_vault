# P0 Desktop Application Shell High-Fidelity Checkpoint V1

## Context

Search, Card Detail, Vault, exact-copy, Pulse, Wall, and Collector Profile had reached the
approved release hierarchy. Desktop navigation still exposed many destinations with
similar weight, used inline route matching, and switched away from mobile presentation
132 pixels before the canonical mobile dock disappeared.

## Problem

Collectors lacked a stable desktop distinction between primary product responsibilities
and supporting tools. Narrow desktop could show desktop header behavior while the mobile
dock was still present. Signed-out, unread, unavailable-Wall, and pushed-route states
were not governed as one deterministic shell contract.

## Risk

A shell repair could change route ownership, reveal private tools before authentication,
duplicate auth authority, lose compare state, hide feature-gated tools incorrectly, or
alter the frozen mobile dock.

## Decision

Create one pure desktop route manifest and one presentation-only desktop shell. Preserve
Pulse, Wall, Scan, Vault, and Search in native order; place collection/account tools in a
secondary tier; continue sourcing private state from the existing authenticated shell
endpoint; and align both shells at exactly 900px.

## Alternatives Rejected

- Giving every destination equal weight: rejected because it obscures the five product
  responsibilities.
- Replacing the mobile dock: rejected because its order and behavior are frozen.
- A second client-side auth/data lookup in the desktop shell: rejected because the
  existing cookie-verified endpoint is authoritative.
- Hiding unavailable Wall state: rejected because degraded state must remain explicit.
- Dynamic record-name inference in global chrome: rejected because page routes own that
  identity.

## Implementation

- Branch: `release/8-week-convergence-v1`
- Evidence-producing commit: `e3dfad5b5cffb7eadbb94fc990eac9fabe85a190`
- Audit: `docs/audits/release_convergence_v1/P0_DESKTOP_APPLICATION_SHELL_HIGH_FIDELITY_V1.md`
- Screenshots: `apps/web/tests/parity/__screenshots__/canonical-samsung/p0-desktop-shell-*.png`

## Current Truths

- Desktop primary navigation is Pulse, Wall, Scan, Vault, Search.
- Sets, Dex, Compare, Binders, and Messages are secondary tools.
- Private tools render only after authenticated shell state is confirmed.
- Unread state is sourced from the existing governed response.
- Wall lookup failure becomes an explicit unavailable state without blocking Wall access.
- Pushed routes retain parent and primary-product context.
- Desktop begins at 900px, exactly where the mobile dock ends.
- Signed-out, unread, unavailable, narrow, wide, and pushed states are deterministic.

## Invariants

- The five-item mobile dock order and route ownership do not change.
- Private navigation never appears from guessed client state.
- Shell presentation performs no database access or canonical inference.
- Feature flags remain authoritative for Dex and Binders.
- Compare selections remain present in Search and Compare links.
- Unavailable state does not imply a Wall or profile was deleted.
- Child routes do not replace page-owned identity with shell guesses.

## Verification

- Full contract suite: `1,497/1,497` pass.
- Full browser suite: `85/85` pass.
- New desktop-shell screenshots: `4/4` pass.
- Existing native mobile screenshots: unchanged.
- Web typecheck, lint, and strict production build: pass.
- Flutter analysis: no issues.
- Flutter tests: `565/565` pass.
- Runtime preflight: attempted but unavailable because the isolated worktree has no
  `SUPABASE_DB_URL`; no production credential was copied into it.

## What Must Never Be Broken

- Canonical identity, exact printing, ownership, privacy, pricing, and image-truth
  boundaries.
- The frozen Pulse, Wall, Scan, Vault, Search mobile dock.
- The desktop primary/secondary responsibility split.
- Cookie-verified authenticated shell authority and private no-store response behavior.
- Honest unread, unavailable, signed-out, and pushed-route presentation.
- Existing Scan, Wall, Vault, Search, Binder, Message, Profile, and Account destinations.

## Explicit Next Gate

Converge Binders and Invitations. Reconcile library, workspace, template, share-token,
and invitation route ownership; define collaborator, invite, expired, private,
unavailable, and read-only public states; preserve standalone-secret chrome suppression
and collaboration authority; and stop before schema changes or deployment.

# P0 Pulse, Wall, and Collector Profile High-Fidelity Checkpoint V1

## Context

Search, Card Detail, Vault, and exact-copy surfaces already established the approved
release hierarchy: visible collector facts and actions first, stable card geometry,
diagnostic evidence disclosed, and honest degraded states. Pulse, Wall, and Collector
Profile were the remaining social and public P0 surfaces using overlapping legacy
presentation.

## Problem

Pulse events, community activity, Wall collections, and profile cards looked similar
despite representing different responsibilities. Actor, activity, exact card identity,
variant, availability, ownership, timestamp, destinations, and internal IDs competed for
attention. Route-local loading and failure coverage was incomplete, and some failures
could expose raw backend text.

## Risk

A visual convergence could accidentally merge event and collection semantics, weaken
variant clarity, alter follow/block/message behavior, expose private copies, or change
exact-copy ownership and image authority.

## Decision

Use a distinct event grammar for Pulse and collection-display grammar for Wall, backed
by one narrow presentation-only card-facts primitive. Keep exact variant and ownership
facts visible, place diagnostic IDs behind evidence disclosure, and add deterministic
loaded and degraded states without changing authority or mutations.

## Alternatives Rejected

- One universal social card: rejected because an activity event and a curated collection
  item have different primary information and actions.
- Hiding variant context for compactness: rejected because every displayed card must
  remain unambiguous.
- Removing provenance entirely: rejected because evidence must remain inspectable.
- Broad data or API refactoring: rejected because this gate is presentation-only.

## Implementation

- Branch: `release/8-week-convergence-v1`
- Evidence-producing commit: `31712421f9d841cdf61069e4e48f9d2009def04f`
- Audit: `docs/audits/release_convergence_v1/P0_PULSE_WALL_COLLECTOR_PROFILE_HIGH_FIDELITY_V1.md`
- Screenshots: `apps/web/tests/parity/__screenshots__/canonical-samsung/p0-{pulse-event,wall-collection,profile-collector}-*.png`

## Current Truths

- Pulse cards lead with actor and activity; Wall cards lead with collection content.
- Exact card version, availability, and ownership remain separate visible facts.
- Card art remains uncropped in stable 5:7 geometry with no label overlap.
- Public profile cards retain visible variant context.
- Raw IDs and image provenance remain available under evidence disclosures.
- Pulse, Wall, and Profile loaded and degraded states are deterministic and testable.
- Route-local failures do not expose raw backend exception text.

## Invariants

- Activity events are not collection items.
- A card image never substitutes for exact printed identity or variant truth.
- Follow, block, contact, and message authority remains server governed.
- Public surfaces expose only already-authorized public projections.
- Exact-copy ownership and destination IDs are not inferred or rewritten.
- Shared presentation components make no data-authority decisions.
- Missing, private, blocked, deleted, and partial states remain honest.

## Verification

- Full contract suite: `1,491/1,491` pass.
- Full browser suite: `69/69` pass.
- Release-convergence browser subset: `46/46` pass.
- New visual baselines: `6/6` pass.
- Web typecheck, lint, and strict production build: pass.
- Flutter analysis: no issues.
- Flutter tests: `565/565` pass.
- Runtime preflight: attempted but unavailable because the isolated worktree has no
  `SUPABASE_DB_URL`; no production credential was copied into it.

## What Must Never Be Broken

- Canonical identity, exact printing, finish truth, ownership, privacy, pricing, and
  image-truth boundaries.
- Visible variant context anywhere a card or exact copy appears.
- The distinction between Pulse activity and Wall curation.
- Actor, activity, timestamp, exact card, availability, and destination clarity.
- Follow, block, message, public-profile, and contact-eligibility enforcement.
- Existing route destinations and exact-copy identifiers.

## Explicit Next Gate

Converge the Desktop Application Shell while preserving the fixed five-item mobile dock.
Define primary versus secondary desktop navigation and deterministic signed-out, narrow,
wide, unread, unavailable-Wall, and pushed-route states. Verify responsive geometry,
keyboard/focus behavior, and route restoration. Stop before deployment.

# Prioritized High-Fidelity Redesign Inventory V1

## Purpose

This inventory identifies surfaces that need explicit design direction after bounded convergence. It is not authorization to redesign them. Recommendations preserve existing product capabilities and the release rule against new islands.

## Visual Baseline

The installed Android app remains canonical for compact hierarchy, dark surfaces, artwork emphasis, and the five-item dock. Use the six deterministic Samsung screenshots in `apps/web/tests/parity/__screenshots__/canonical-samsung/` as the baseline.

The repaired bridge/state evidence is in `docs/audits/release_convergence_v1/screenshots/`.

## P0: Release-Critical Journeys

### 1. Search and Discover

**Evidence:** `search-discovery.png`, `search-vault-mobile.png`, `search-vault-desktop.png`.

**Current truth:** Search has multiple result densities, discovery sections, technical identity detail, Compare, pricing, and the newly repaired Vault bridge. Functional capability is strong, but the hierarchy becomes dense quickly.

**Design recommendation:** Define one high-fidelity mobile result card and one desktop result row. Keep card image, exact printed identity, set/number, finish, price, and primary action visible. Move diagnostics and provenance into a deliberate evidence disclosure. Define zero exact result, partial availability, locked pricing, missing image, and loading states.

**Do not change without approval:** resolver semantics, canonical grouping, exact-printing rules, comparison behavior, or the existing Vault mutation.

### 2. Card Detail

**Evidence:** current card-detail implementation and canonical card-art geometry.

**Current truth:** Card Detail contains identity, image truth, pricing, Vault actions, related context, and diagnostic sections. Legacy presentation rules include oversized sections and decorative backgrounds even though the card should remain the dominant signal.

**Design recommendation:** Approve a fixed information order: exact identity, artwork, primary collection action, market context, owned-copy state, social/collector context, then evidence. Produce mobile loading, missing image, representative image, price unavailable, signed-out, and error states.

**Do not change without approval:** image-truth labels, pricing disclosure, exact-copy boundaries, or ownership mutation behavior.

### 3. Vault and Exact Copies

**Evidence:** `vault-populated.png`, existing Vault route family, exact-copy and GVVI detail screens.

**Current truth:** Vault supports collection, exact copies, intent, filters, value context, Binders, Journeys, Memories, and photos. The number of adjacent capabilities can obscure the primary ownership task.

**Design recommendation:** Establish a hierarchy from collection overview to card family to exact copy. Standardize card grid, list, selection, edit, remove, duplicate-copy, private, loading, empty, partial-error, and offline states. Keep variant/finish visible whenever a card appears.

**Do not change without approval:** copy identity, ownership semantics, intent semantics, privacy, or Binder/Journey/Memory data ownership.

### 4. Pulse, Wall, and Collector Profile

**Evidence:** `pulse-empty.png`, `wall-populated.png`, public collector components.

**Current truth:** Pulse, Wall, public profiles, Following, and local/community cards overlap visually but serve different responsibilities.

**Design recommendation:** Define one event-card grammar for Pulse and one collection-display grammar for Wall. Specify actor, exact card, activity, timestamp, availability, and destination hierarchy. Produce private, blocked, deleted, empty, loading, and partial-error states.

**Do not change without approval:** privacy projections, follow behavior, activity generation, or public availability policy.

### 5. Desktop Application Shell

**Evidence:** mobile canon and the current production `SiteHeader`/`AppChrome` split.

**Current truth:** Mobile has a frozen five-item dock. Desktop still exposes many destinations through legacy header patterns and lacks equivalent approved hierarchy.

**Design recommendation:** Design a desktop shell that preserves the five primary product pillars while moving Sets, Dex, Compare, Binders, Messages, Account, and support tools into a clear secondary layer. Include signed-out, narrow desktop, wide desktop, unread, unavailable-Wall, and pushed-route states.

**Do not change without approval:** the five primary mobile destinations or route ownership.

## P1: Supporting Release Surfaces

### 6. Binders and Invitations

**Current truth:** Binder library, workspace, collaboration, sharing, and invitation states exist, but two matrix routes do not map to exact page files. A shared private/error state now exists.

**Recommendation:** Resolve route ownership first, then design library, workspace, collaborator, invite, expired invite, private, and read-only public states. Preserve secret-route chrome suppression.

### 7. Sets, Dex, and Compare

**Current truth:** These are useful secondary discovery tools with separate legacy card and progress presentations.

**Recommendation:** Reuse the approved Search card grammar, tokenized progress treatment, and exact card geometry. Define transitions back to Search, Card Detail, and Vault instead of creating isolated browsing loops.

### 8. Messages, Matches, and Notifications

**Current truth:** Card-centered contact and Want Match are part of the launch loop, but action/context continuity needs visual proof.

**Recommendation:** Design thread and notification rows around exact card identity, collector, availability, and next action. Define stale availability, deleted card, blocked user, empty inbox, loading, and send failure.

### 9. Scan

**Evidence:** `scan-ready.png`.

**Current truth:** Scan has its own fullscreen capability surface and must remain distinct from import/photos.

**Recommendation:** Preserve the approved camera framing. Design permission denied, no camera, low-confidence result, multiple candidates, network failure, and successful exact-card handoff.

## P2: Public and Long-Tail Surfaces

### 10. Home and Signed-Out Entry

**Current truth:** Customer language is cleaner and the primary offer is literal, but the page still carries older promotional composition.

**Recommendation:** Design a truthful entry that demonstrates Search, exact identity, Vault, and collector connection with real product imagery. Preserve intended-action continuation after sign-in.

### 11. Legal, Privacy, Support, and Account Deletion

**Current truth:** Content exists and now uses canonical surface radii. It remains light-oriented and visually separate from the app.

**Recommendation:** Apply a minimal standalone information template with app typography, accessible long-form reading width, dark-mode coverage, and no promotional treatment.

### 12. Long-Tail Route States

**Current truth:** Root error/not-found coverage exists, but only five collector routes have local loading boundaries and two have local error boundaries.

**Recommendation:** Audit the route-state matrix journey by journey. Add local state treatment only when the surface can provide a more useful recovery or preserve partial content. Do not create dozens of decorative empty-state cards.

## Cross-Cutting Design Questions

These require explicit owner/design approval before implementation:

1. Desktop navigation composition and the relationship between five primary pillars and secondary tools.
2. The standard dense search result at mobile and desktop widths.
3. Card Detail information order and the visual priority of price versus ownership.
4. Vault family versus exact-copy navigation.
5. Pulse event grammar versus Wall display grammar.
6. How much evidence/provenance ordinary collectors see by default.
7. Which remaining gradients are intentional brand moments versus legacy decoration.

## Acceptance Standard For Each Future Design

Every approved screen must include mobile and desktop layouts where applicable, loaded and degraded states, long text, enlarged text, hosted/fallback/missing images, clear primary/secondary actions, visible exact variant context, and explicit behavior for signed-out or private access.

The next design phase should not start with all 44 collector routes. Start with the two release journeys that have the highest dependency value, approve their shared primitives, then propagate them deliberately.

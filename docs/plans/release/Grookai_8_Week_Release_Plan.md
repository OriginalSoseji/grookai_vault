# Grookai Vault — 8-Week Product Completion Plan

**Plan date:** August 5, 2026  
**Target release:** October 5, 2026  
**Operating rule:** Build no new islands. Build only the bridges required to make the existing product complete.

## 1. The Objective

Grookai does not need another feature phase.

It already contains the required product:

- exact card identity;
- Search and Discover;
- Vault and exact copies;
- Own, Want, Trade, Sell, and Showcase intent;
- collector profiles and Walls;
- follows and collector discovery;
- Pulse and Following;
- Want Matches;
- card-centered messaging;
- notifications;
- Sets and Dex;
- Binders;
- Card Journeys;
- Collector Memories;
- pricing context;
- Scanner and add flows;
- public sharing.

The problem is convergence. These capabilities feel like separate pieces instead of one finished experience.

The next eight weeks will:

1. unify the existing pieces around one understandable product loop;
2. make every critical journey visually coherent;
3. finish incomplete states and remove exposed internal artifacts;
4. simplify navigation and language;
5. improve reliability and perceived performance;
6. release the strongest truthful version of what is already built.

Small new implementation is allowed only when it functions as a bridge between existing capabilities and is necessary to complete an existing journey.

## 2. Launch Position

> **Grookai is the permanent digital card show.**

Collectors and vendors can keep the show floor open throughout the month: display what they have, discover exact cards, see who has them available, connect around the card, and transact directly or in person.

Grookai is not launching as a native marketplace. There will be no new checkout, payment, shipping, tax, refund, dispute, or payout system in this release.

### The existing product loop

1. Find or scan an exact card.
2. Add it to the Vault or mark it Wanted.
3. Set Trade, Sell, or Showcase intent on an owned copy.
4. Let Pulse, Discover, profiles, Walls, and Want Match expose relevant activity.
5. Message the collector about the exact card.
6. Complete the exchange directly or in person.
7. Maintain truthful availability and ownership using existing controls.

No new product system is required to explain or support this loop. The work is to connect and polish the existing systems.

## 3. Bridge-Only Scope Contract

### The bridge rule

A release task may introduce a small amount of new code, UI, routing, query composition, or state handling only when all of the following are true:

1. Both sides of the bridge already exist as approved Grookai capabilities.
2. A real user journey currently breaks, dead-ends, duplicates work, or loses context between them.
3. The work creates no new standalone destination, content type, engagement loop, or product promise.
4. Existing data contracts are reused wherever possible.
5. A bounded acceptance test proves the original journey is now complete.

Valid bridges include:

- Search result to exact printing selection to Vault add.
- Want Match notification to the correct card and owner context.
- Available card to its card-anchored message thread.
- Pulse activity to the relevant card, collector, Binder, Dex, or Set destination.
- Public feature preview to login and then back to the intended action.
- Vault card to exact copy, Binder, Journey, or Memory context.
- Collector profile to a publicly available card and existing contact action.
- Shared design primitives that make existing mobile and web surfaces feel related.

Forbidden new islands include:

- A new marketplace or checkout flow.
- A new post, story, reaction, or reputation system.
- A new vendor platform.
- A new deal-management product.
- A new ranking engine.
- A new public Memory-sharing product.
- A new collection concept alongside Vault, Wall, Binders, Dex, Sets, Journeys, or Memories.

### Allowed work

- Recompose existing capabilities into clearer journeys.
- Simplify navigation.
- Restyle existing surfaces.
- Rewrite customer-facing copy.
- Fix bugs, contradictions, privacy issues, and broken routes.
- Complete already-intended loading, empty, error, signed-out, and permission states.
- Improve measured performance.
- Reuse existing tables, RPCs, services, routes, and components.
- Hide unfinished or inappropriate surfaces safely.
- Remove public test data, worklists, raw source IDs, and operational language.
- Add tests for existing behavior.
- Improve analytics around events that already exist.
- Build bounded bridges that satisfy the five-part bridge rule.

### Not allowed before release

- New product pillars.
- New marketplace systems.
- New social primitives.
- New content types.
- New ranking engines.
- New vendor platform.
- New deal or reservation workflow.
- New public Memory-sharing system.
- New reputation or verification system.
- New payment, checkout, shipping, or order infrastructure.
- New large schema programs unless a production defect makes a bounded repair unavoidable.
- New feature requests discovered during polish.

### Decision rule

Every task must be classified as one of five things:

1. **Finish** — existing intended behavior is incomplete or broken.
2. **Unify** — existing pieces need to operate or appear as one journey.
3. **Polish** — existing behavior needs visual, copy, performance, or state refinement.
4. **Hide** — an existing surface cannot reach release quality in time and should not be exposed.
5. **Bridge** — two existing capabilities need a bounded handoff to complete an approved journey.

If a task does not fit one of these categories, it does not enter the release. A Bridge task must name both existing endpoints and the broken journey between them.

## 4. The Finished Product Model

The user should experience one connected product, not a list of departments.

### Home

Use the already-built Pulse, Discover, and Following concepts as the living center of Grookai.

- Pulse: finite, meaningful changes around cards, Wants, collectors, and collection goals.
- Discover: visual exploration beyond the user's current graph.
- Following: activity from collectors the user chose to follow.

Do not create a new feed. Finish and visually distinguish the feed modes already present.

### Discover

Bring existing Search, Sets, Dex, collector discovery, language controls, filters, and Compare into one understandable discovery family.

Do not replace their data models. Improve entry points, hierarchy, defaults, relevance presentation, and visual continuity.

### Add

Treat the existing Scanner and search-to-add flow as one action: add the exact card.

Do not build a new scanner. Finish the transition from recognition or search result to exact-print selection, Vault add, and intent.

### Collection

Present the existing Vault, exact copies, Wants, Binders, Journeys, and Memories as related layers of one collection.

Do not merge their underlying contracts. Improve how the user moves between them and understands their roles.

### Profile

Finish the existing public collector profile and Wall experience so it clearly expresses identity, collection, availability, follows, and shared sections.

Do not add a generic posting system or create a new vendor product.

### Card detail

Use the existing exact-card page as the bridge among identity, pricing, ownership, intent, available copies, collectors, other versions, and card context.

Do not add new card intelligence. Reveal existing intelligence in a customer-first hierarchy.

## 5. Visual Completion Standard

### Principles

1. Card art is the dominant visual object.
2. One primary action is obvious in every state.
3. Existing features share one typography, spacing, radius, surface, and action system.
4. Technical evidence is progressively disclosed rather than placed in the main hierarchy.
5. People and intent appear beside cards when they matter.
6. Screens use fewer containers, borders, pills, labels, and competing controls.
7. Motion communicates transitions and state changes; it is not decoration.
8. Light and dark modes feel equally intentional.
9. Mobile and web express the same product even when layouts differ.

### Required visual audit

Every launch surface must be checked for:

- hierarchy;
- alignment and spacing;
- typography;
- card-image size and cropping;
- button priority;
- chip and filter consistency;
- excessive borders or nested cards;
- loading stability;
- empty-state usefulness;
- error recovery;
- signed-out behavior;
- text scaling;
- contrast and touch targets;
- desktop, narrow web, iPhone, and Android behavior.

### Language standard

Customer-facing copy must use collector language.

Prefer:

- exact card;
- version;
- printing;
- finish;
- available;
- wanted;
- in your Vault;
- collector;
- Binder;
- message about this card.

Remove or hide:

- collector intelligence layer;
- relationship, not the row;
- first-class identity;
- canonical mapping;
- reconciled catalog;
- canary;
- source-ready;
- image worklist;
- exact identity lane;
- raw provider identifiers.

## 6. Release Journeys to Finish

These are not new features. They are complete journeys assembled from existing capabilities.

### Journey A — First-time visitor

1. Understand Grookai within ten seconds.
2. Explore a real card without signing in.
3. See why exact identity, ownership, and collector availability matter.
4. Encounter sign-in only when attempting a personal action.

### Journey B — First card

1. Create an account.
2. Scan or search.
3. Select the exact printing and finish.
4. Add the exact copy to the Vault.
5. Set existing intent when appropriate.
6. Land in a collection state that visibly changed.

### Journey C — Want and match

1. Find the exact card.
2. Mark it Wanted through the canonical existing path.
3. Receive or encounter an existing Want Match.
4. Open the correct card and owner context.
5. Message about that exact card.

### Journey D — Collector connection

1. Discover a collector through existing surfaces.
2. Understand what they collect and share.
3. Follow them.
4. See their relevant activity in the existing Following or Pulse experience.
5. Open a card and message in context.

### Journey E — Collection depth

1. Move naturally from Vault to exact copy.
2. Understand how Binders, Dex, Sets, Journeys, and Memories relate to owned cards.
3. Return to the original collection context without navigation confusion.

### Journey F — Signed-out locked features

1. Understand what Scan, Wall, Vault, pricing, and personal actions do.
2. Never click a named feature and receive an unexplained generic login wall.
3. Preserve the intended post-login destination.

## 7. Eight-Week Execution Plan

### Week 1 — Exhaustive product inventory and freeze

**Goal:** Establish the exact truth of what exists and stop roadmap expansion.

Actions:

- Inventory every route, mobile screen, public page, component, feature flag, RPC, table, and product contract relevant to the six release journeys.
- Map duplicated entry points and contradictory terminology.
- Identify features that exist in code but are hidden, feature-flagged, disconnected, or exposed differently on mobile and web.
- Record every broken, partial, loading, empty, error, signed-out, and privacy state.
- Label every candidate task Finish, Unify, Polish, Hide, Bridge, or Reject.
- Freeze all unrelated feature and infrastructure work.
- Capture baseline screenshots and timings for critical screens.

Deliverables:

- Existing-capability map.
- Route and navigation map.
- Feature-flag and hidden-surface inventory.
- Completion backlog with only bounded bridge work and no new product islands.
- Public-artifact suppression list.
- Baseline visual and performance evidence.

Gate:

- Every release task points to an existing capability, a defect, or a precisely bounded bridge between two existing capabilities.

### Week 2 — Product composition and high-fidelity completion designs

**Goal:** Decide how the existing pieces become one product before changing code broadly.

Design complete states for:

- Home with existing Pulse, Discover, and Following.
- Discover landing and results.
- Exact-card detail.
- Scanner/search-to-add transition.
- Vault and exact-copy hierarchy.
- Public collector profile and Wall.
- Want Match to message.
- Binders, Dex, Sets, Journeys, and Memories entry relationships.
- Signed-out previews and login continuations.

For each surface, include loading, empty, error, private, unavailable, and dense states.

Gate:

- No design introduces a new product island. Any new requirement must be a bounded bridge between existing systems.
- All critical existing states are represented before implementation.

### Week 3 — Shell, navigation, terminology, and signed-out continuity

**Goal:** Make Grookai feel like one product at the structural level.

Actions:

- Simplify mobile and web navigation using existing destinations.
- Remove equal top-level emphasis from utilities that belong contextually.
- Standardize product names across mobile, web, notifications, and public pages.
- Fix dead-door sign-in behavior with existing preview or continuation patterns.
- Rewrite the homepage around the permanent digital card show positioning.
- Remove internal language and exposed QA links from public navigation.
- Apply shared visual primitives to the shell and common controls.

Gate:

- A tester can move among Home, discovery, adding, collection, and profile without learning Grookai's internal architecture.

### Week 4 — Discover, Search, and exact-card polish

**Goal:** Make Grookai's strongest intelligence immediately understandable and visually desirable.

Actions:

- Finish Search and Discover hierarchy using existing filters and data.
- Correct broad-query presentation and language defaults using current capabilities.
- Remove public worklists, test sets, raw provider IDs, and incomplete operational metadata.
- Standardize result cards, card-art treatment, loading states, and Compare placement.
- Recompose card detail around exact identity, Own/Want, existing pricing context, ownership intent, available collectors, and other versions.
- Move repeated IDs and technical evidence out of the primary hierarchy.
- Resolve contradictory consumer copy.

Gate:

- Pikachu, Charizard, a set, a stamped variant, and an exact Grookai ID all produce polished, understandable journeys.

### Week 5 — Home, Pulse, Following, and profiles

**Goal:** Make existing community behavior feel alive and connected.

Actions:

- Finish the implemented Pulse presentation.
- Visually separate Pulse, Discover, and Following without creating new feed logic.
- Create polished event treatments for existing event types.
- Remove default raw IDs and system language from activity cards.
- Finish collector profiles and Walls using the data already available.
- Make Follow, available-card, and card-anchored Message actions obvious.
- Polish truthful low-density and caught-up states.
- Verify notification-to-Pulse and deep-link continuity.

Gate:

- Every activity item clearly communicates who, what card, what happened, why it matters, and the existing next action.

### Week 6 — Vault, exact copies, intents, Binders, and emotional depth

**Goal:** Make the collection feel like one system instead of several attached features.

Actions:

- Finish Vault-to-exact-copy navigation and hierarchy.
- Standardize Own, Want, Trade, Sell, and Showcase wording and states using existing contracts.
- Remove duplicate or legacy entry points where a canonical route already exists.
- Clarify the roles of Vault, Binders, Wall, Dex, Sets, Journeys, and Memories.
- Improve transitions among these existing surfaces.
- Decide whether feature-flagged existing capabilities are release-ready; enable or hide them without expanding scope.
- Complete the existing message path from available card to correct owner/copy context.

Gate:

- A collector can explain where a card lives, what its intent means, and how each collection layer relates to it.

### Week 7 — Full polish and adversarial QA

**Goal:** Stop implementation and make the product dependable.

Actions:

- Freeze all non-blocker code changes.
- Run the six release journeys on clean and established accounts.
- Test iPhone, Android, desktop web, and narrow web.
- Verify loading, empty, error, offline, private, and signed-out states.
- Profile perceived and measured performance on Home, Search, card detail, Vault, profile, and messaging.
- Fix layout shifts, prolonged skeletons, image instability, and measured query bottlenecks.
- Audit accessibility, light/dark parity, text scaling, and touch targets.
- Audit RLS, privacy, public projections, deep links, notification taps, and account deletion.
- Remove remaining test content and engineering copy.

Gate:

- No P0 crash, privacy, authorization, navigation, or data-truth defect remains.
- No customer-facing test artifact remains.
- Every exposed feature meets the completion standard or is hidden.

### Week 8 — Release candidate and launch

**Goal:** Release a stable product, not a final week of development.

Actions:

- Cut Release Candidate 1 at the beginning of the week.
- Run controlled beta verification with fresh collectors and current beta users.
- Collect only comprehension, journey-blocker, visual-defect, and reliability feedback.
- Reject new feature suggestions for this release.
- Fix release blockers only.
- Verify analytics, crash reporting, support, privacy, terms, and production monitoring.
- Prepare accurate App Store, Play Store, and website assets based on the finished product.
- Cut the final candidate at least 72 hours before release.
- Release by October 5, 2026 if gates pass.

Gate:

- The product feels complete around its existing loop.
- Nothing visible feels like a forgotten beta surface.

## 8. Completion Backlog Order

When prioritizing existing defects, use this order:

### P0 — Journey blockers and trust failures

- Wrong identity, finish, ownership, intent, or collector context.
- Privacy or authorization defects.
- Broken add, Want, follow, message, or navigation paths.
- Public test data, internal worklists, raw operational metadata, or contradictory pricing claims.
- Crashes and unrecoverable errors.

### P1 — Product fragmentation

- Duplicate destinations.
- Inconsistent names.
- Different mobile and web mental models.
- Generic login dead ends.
- Disconnected Pulse, profile, Vault, Binder, Dex, Set, Journey, or Memory entry points.
- Actions that exist but are difficult to find.

### P2 — Visual and performance polish

- Hierarchy, spacing, typography, cards, chips, borders, and action priority.
- Skeleton duration and layout shift.
- Empty, error, offline, and dense states.
- Animation and transition consistency.
- Accessibility and responsive behavior.

### Not release work

- Any new capability proposed because an existing screen feels empty.
- Any system whose primary justification is future scale.
- Any marketplace, payment, shipping, reputation, or verification feature.
- Any generic social interaction not already implemented.

## 9. Release Scorecard

### Clarity

- Fresh testers understand Grookai within ten seconds.
- Fresh testers understand that collectors connect around exact cards and transact directly or in person.
- Testers can distinguish Home, Discover, Add, Collection, and Profile concepts even if the final labels differ.

### Existing activation loop

- First exact card added.
- First Want set through the canonical path.
- First collector followed.
- First relevant Pulse or Following item understood.
- First card-centered message opened or sent.

### Completion

- All six release journeys pass on mobile and web where supported.
- No visible feature lacks loading, empty, error, signed-out, and privacy behavior.
- No duplicate path contradicts canonical truth.
- Every public route uses customer language.

### Quality

- No launch-blocking crashes.
- No P0 privacy or security defects.
- No public test or operational artifacts.
- Core surfaces meet agreed performance budgets.
- Deep links and notifications land in the correct existing context.

## 10. First 72 Hours

1. Announce the product freeze: no new features before October release.
2. Create the exhaustive existing-capability and route inventory.
3. Build the Finish / Unify / Polish / Hide / Bridge backlog.
4. Capture screenshots of every current critical state on mobile and web.
5. Map the six release journeys to current routes, services, RPCs, and flags.
6. Identify duplicated ownership, Want, intent, profile, feed, and messaging paths.
7. Produce the high-fidelity completion brief for Week 2.
8. Open the public artifact and engineering-copy cleanup task.
9. Freeze unrelated identity, pricing, MEE, and infrastructure work unless production safety requires it.
10. Schedule one owner acceptance gate every week through October 5.

## 11. Final Standard

The goal is not to make Grookai larger.

The goal is to make it feel inevitable: every existing piece should appear to have been designed for the same product, the same collector, and the same core loop.

By release, users should not see Search, Vault, Pulse, Wall, Dex, Binders, Journeys, Memories, pricing, and messaging as separate features.

They should experience one polished truth:

> Find the exact card. Understand it. Add it. Want it. See who has it. Connect with the collector. Keep collecting.

If an existing piece cannot support that experience at release quality, hide it. Do not replace it with another feature. Build only the minimum bridge necessary when two valuable existing pieces fail to connect.

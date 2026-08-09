# Final Candidate Physical Android Journeys and State Matrix V1

## Result

Status: `PASSED ANDROID SCOPE / IOS AND FRESH-USER GATES OPEN`

The physical Samsung Galaxy S22 Ultra passed the remaining Android journey and state checks on frozen app source `82d5f8b26cb914f405cde4ea13fd395456134574`, production package `com.grookai.vault`, version `1.0.0 (21)`. The protected `com.grookai.vault.lockedacceptance` package remained installed and was neither launched nor modified.

This audit does not claim iPhone, clean-account Want Match, Google Play, soak, or overall release completion.

## Signed-Out Journey

1. Cold launch completed in 875 ms and rendered the Grookai start screen.
2. `Explore cards` loaded 24 of 32 cards with self-hosted images.
3. Tiles exposed set, card number, and finish instead of a name-only identity.
4. Wizards Black Star Promos `#24 Holo` opened with the same exact identity.
5. Want produced `Sign in to want this card` and stated that the app would finish the action after sign-in.
6. The login screen preserved the same exact pending card destination.
7. Existing Google authentication returned through `com.grookai.vault`, not the protected acceptance package.
8. The exact card returned with its signed-in copy state and completed Want action.

## Collector Surfaces

- Pulse loaded and rendered a valid empty `Caught up` state.
- Wall loaded 31 cards with set, number, condition, and intent labels.
- Wall card controls exposed `Manage copy` and `Remove from Wall`; neither was invoked.
- Vault loaded 1,008 cards, 215 unique cards, 53 sets, Binders, filters, and card images.
- Assigned Holo and Normal printing labels rendered correctly.
- Some legacy copies rendered `Printing unassigned`. The application did not guess a variant. This remains an explicit data-coverage gap.

## Journey D

- Discover loaded an exact graded Charizard ex copy with owner context.
- The copy opened with exact set/number, grade, certificate context, and owner.
- `Message collector` opened a card-centered draft and was cancelled without sending.
- The collector profile opened and showed an existing `Following` state.
- The Following feed loaded a dated exact-card sale activity.

Journey D is physically proven on Android for the frozen candidate.

## Journey E

- Pikachu `151 #173 Holo` opened with exact identity and an owned-copy state.
- `Around this card` opened the public Journey collector sheet.
- Dismissing the sheet returned to the same exact card.
- `Share Memory` opened a draft explicitly tied to `Pikachu - Holo`.
- Back navigation returned to the same exact card without saving a Memory.

Journey E mobile Journey and Memory context return is physically proven on Android.

## State Matrix

- Loading: stable search skeleton rows and progress indicator.
- Empty: valid Pulse `Caught up` state.
- Offline/error: search explained that it was temporarily limited and used local results when available.
- Recovery: after connectivity restoration, a new query returned 24 of 32 cards.
- Private: owned-copy overview and copy list rendered private state.
- Signed out: public exploration and gated personal action rendered correctly.
- Text scaling: at 1.3 scale there was no overlap or inaccessible primary action. Discover and Following tabs used ellipsis.

Wi-Fi, mobile data, and font scale were restored to their exact initial states. The final readback was Wi-Fi enabled, mobile data enabled, and font scale `0.8`.

## Net-Zero Want Cleanup

The signed-out continuation created a new Want for `GV-PK-PR-24` at `2026-08-08T00:29:06.383Z`. Read-only database inspection proved that this run created it. The same product UI then disabled the Want at `2026-08-08T00:48:07.178Z`.

Final database truth:

- current Want: `false`
- Want-on event: present
- Want-off event: present
- vault copy count changed: `false`
- message sent: `false`
- direct database write: `false`

## Sensitive Evidence Boundaries

- OAuth account picker material is excluded.
- No email, password, token, user ID, device serial, or UDID is stored.
- The unsent message body is excluded.
- Only a one-way subject fingerprint is stored for database reconciliation.

## Remaining Gates

1. Record a fresh-user ten-second comprehension result.
2. Complete signed-out and signed-in physical iPhone/TestFlight proof on build `286`.
3. Complete the clean-account iPhone Want-to-match-to-message-to-opt-out proof.
4. Establish or identify Google Play developer-account authority and inspect the listing.
5. Reconcile the completion manifest.
6. Start the governed 72-hour soak only after every prerequisite is proven.


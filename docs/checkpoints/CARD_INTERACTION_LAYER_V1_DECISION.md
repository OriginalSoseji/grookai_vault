# CARD_INTERACTION_LAYER_V1_DECISION

## Why This Layer Matters

Grookai already has:
- canonical card identity
- public shared-card surfaces
- owner-to-owner interaction flows

What it does not yet have is a clean lightweight layer for:
- public card-centered discussion
- durable user desire signals

Without this decision, future implementation risks drifting into generic social features or duplicating old wishlist/network tables.

## Why "Comments" Were Reframed as Card Talk

`Comments` is too generic.

It suggests:
- profile posting
- feed chatter
- discussion detached from the card object

`Card Talk` is the correct frame because it keeps the feature subordinate to the card and to the public card surface where the conversation happens.

## Why Want Is a Signal, Not a Full Wishlist Product

V1 does not need:
- folders
- ranking
- notes
- list management
- social exposure

V1 does need:
- a clean explicit expression of desire
- one durable signal per user per card
- a future-friendly demand primitive for ranking and discovery

That makes `Want` the right shape for V1.

## Why Card Remains the Anchor

Anchor decisions:
- Want -> canonical `card_print_id`
- Card Talk -> `shared_cards.id` with required `card_print_id` shadow

This preserves the product rule:
- card is truth
- public context matters
- no generic social drift

## Decision Summary

- Want is private in V1
- Card Talk is public in V1
- Want must not reuse `wishlist_items`
- Card Talk must not reuse `card_interactions`
- both features stay minimal and implementation-friendly

## Result

PC can now implement:
- `user_card_signals`
- `card_talk_messages`
- RLS
- minimal service surfaces
- small card-first UI affordances

without turning Grookai into a general social product.

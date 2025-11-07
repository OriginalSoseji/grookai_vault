# Wall Post — Manual Tests

## Preconditions
- User is signed in.
- Vault contains at least one item with image and card_print_id.

## Positive flow
1. From a Vault-driven Card Detail (row includes `vault_item_id`), tap the AppBar action “Post to Wall”.
2. Accept defaults (price prefilled from index if available; qty=1; condition from Vault).
3. Tap Post. Expect “Posted to Wall”.
4. Wall view refreshes (via rpc_refresh_wall) and shows the new listing at top.

## Negative tests
- Try posting with quantity 0 or missing price → client should block; server would reject.
- Try posting with a different user’s `vault_item_id` → server rejects (RLS/ownership check).
- Anon user cannot post (no execute grant).

## Search checks
- After posting, search with inputs like: `49`, `049`, `049/203`, `pika 49` — results should include the card variants.


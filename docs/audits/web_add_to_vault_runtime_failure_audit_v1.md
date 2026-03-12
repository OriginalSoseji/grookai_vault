# Web Add to Vault Runtime Failure Audit V1

Date: 2026-03-12

## 1. Execution Path

Route entry:

- [apps/web/src/app/card/[gv_id]/page.tsx](/C:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
  - `CardPage`
  - Resolves:
    - authenticated user via `createServerComponentClient().auth.getUser()`
    - canonical public card via `getPublicCardByGvId(params.gv_id)`
    - adjacent cards for page navigation
  - Assumptions:
    - `gv_id` resolves to a canonical `card_prints` row
    - the page has a valid authenticated user if the add form is shown

Canonical card resolution:

- [apps/web/src/lib/getPublicCardByGvId.ts](/C:/grookai_vault/apps/web/src/lib/getPublicCardByGvId.ts)
  - `getPublicCardByGvId(gv_id)`
  - Reads `card_prints` by `gv_id`
  - Returns public display fields plus canonical `id`
  - Assumptions:
    - `card_prints.gv_id` is unique and populated
    - `id` is the compatibility `card_id` lane needed for vault writes

Form action:

- [apps/web/src/app/card/[gv_id]/page.tsx](/C:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx#L150)
  - `addToVaultAction`
  - Creates a new server Supabase client
  - Re-checks `auth.getUser()`
  - Rejects missing `user`
  - Rejects missing canonical `card.id` / `card.gv_id`
  - Calls `addCardToVault(...)`
  - Assumptions:
    - the server action client carries the authenticated session into table writes
    - redirects are the only return path

Vault write helper:

- [apps/web/src/lib/vault/addCardToVault.ts](/C:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts)
  - `addCardToVault`
  - Step order:
    1. `SELECT id,qty FROM vault_items WHERE user_id = ? AND gv_id = ?`
    2. If existing row found:
       - `UPDATE vault_items SET qty=?, gv_id=?, card_id=? WHERE id=?`
    3. Else:
       - `INSERT INTO vault_items (user_id, gv_id, card_id, qty, name, set_name, photo_url, condition_label)`
  - Assumptions:
    - `vault_items.gv_id` exists and is writeable
    - RLS permits authenticated owner reads and writes
    - duplicate behavior is handled either by pre-read/update or insert conflict `23505`

Supabase server client:

- [apps/web/src/lib/supabase/server.ts](/C:/grookai_vault/apps/web/src/lib/supabase/server.ts)
  - `createServerComponentClient`
  - Uses publishable key plus request cookies
  - Assumptions:
    - auth cookies are available in server action context
    - `createServerClient` applies that session to PostgREST table operations

## 2. Failure Mask

The real error was being hidden in:

- [apps/web/src/app/card/[gv_id]/page.tsx](/C:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx#L177)

Previous behavior:

- `addCardToVault(...)` threw
- `catch (error)` logged only a generic console line
- the action redirected to `?vault=error`
- the page rendered:
  - `Vault add failed`
  - `An unexpected error occurred while adding this card to your vault.`

That means the actual Supabase / Postgres error message, code, details, and hint were discarded before reaching the UI.

## 3. Debug Patch

Files changed:

- [apps/web/src/lib/vault/addCardToVault.ts](/C:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts)
- [apps/web/src/app/card/[gv_id]/page.tsx](/C:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)

Patch behavior:

- The helper now wraps Supabase errors with explicit step context:
  - `vault_items.select-existing`
  - `vault_items.update-existing`
  - `vault_items.insert`
- The wrapped message includes:
  - `error.message`
  - `code`
  - `details`
  - `hint`
- The server action now:
  - logs structured debug context
  - includes `userId`, `gvId`, `cardId`, and the exact detail string
  - redirects back to the same card page with `vault_detail=...`
- The page now renders the real failure string in the existing error panel instead of the generic text

What should now surface on next reproduction:

- UI:
  - the actual wrapped error string in the card page failure state
- Server log:
  - `[vault:add] addToVaultAction failed`
  - plus `userId`, `gvId`, `cardId`, `detail`, and raw `error`

Reproduction path:

- `/card/{gv_id}`
- click `Add to Vault`

## 4. Most Likely Root Cause

Classification:

- `OTHER`

Evidence-based reason:

- The repository proves the failure occurs inside the DB write helper path, not in page rendering:
  - user-null path redirects to login, not generic error
  - missing canonical card path redirects to `not-found`, not generic error
  - the generic UI error is only reachable when `addCardToVault(...)` throws
- The helper can throw from three database steps:
  - select-existing
  - update-existing
  - insert
- Current repository evidence alone does **not** prove which bucket it is among:
  - auth session not resolving
  - RLS / permission
  - insert payload mismatch
  - uniqueness / constraint
- The exact subtype was masked until this patch

So the only proven classification before reproduction is:

- a masked runtime database write error in the add-to-vault helper path

## 5. Safe Next Step

Deploy this debug patch and reproduce once on:

- `/card/{gv_id} -> Add to Vault`

Then capture the exact surfaced message from either:

- the card page error panel, or
- the server log line `[vault:add] addToVaultAction failed`

Use that message to make the next change narrowly against the confirmed failure bucket rather than changing RLS, schema, or product flow blindly.

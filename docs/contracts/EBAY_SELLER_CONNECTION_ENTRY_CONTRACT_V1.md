# eBay Seller Connection Entry Contract V1

## Status and scope

Active as of 2026-11-22. This contract governs the native Accounts-to-eBay
seller connection path and its recovery states.

## Required behavior

- Accounts must always expose a direct route to the eBay seller workspace.
- The seller workspace must always show a visible seller authentication
  action: **Connect eBay** when unlinked or status is missing, and
  **Reconnect eBay** when a seller is linked or needs reconnection. This gives
  the owner an explicit recovery path when an existing link is stale or tied to
  a different seller session.
  An absent or incomplete `account` object must never hide the connection
  action or be interpreted as a linked seller.
- When status is missing, label it as unavailable and provide refresh plus an
  explicit connection action. The action may attempt the server-owned OAuth
  start flow; backend controls remain authoritative and any rejection must be
  shown in the workspace.
- Whenever the response explicitly sets `linkingEnabled` to false, even if
  other status fields are missing, disable connection and explain that seller
  listings are unavailable. Missing unrelated fields must not bypass this
  control.
- Start OAuth only through the authenticated seller endpoint. Accept only the
  server-issued Grookai launch URL with the expected host, path, and capability
  shape. eBay credentials and tokens remain server-side.
- Returning from OAuth or resuming the app refreshes seller status before the
  user continues. A draft save is not a publication; publishing remains a
  separate, explicit action gated by server readiness and publication controls.

## Regression gates

- A widget test omitting `account` from a successful workspace response must
  find an enabled **Connect eBay** action and prove that it invokes the `link`
  action.
- Known-disabled linking must remain unavailable, including when the status is
  partial. A linked seller must still have an explicit **Reconnect eBay**
  action, and invoking it must use the same server-owned OAuth start flow.
- Before release, verify on Android and iOS that Accounts → eBay reaches the
  connection action, an OAuth return refreshes status, and the seller workspace
  never silently presents an empty screen when status is unavailable.
- A release claim of successful selling requires a separate real-account
  verification that an explicitly selected, ready listing reaches eBay and is
  confirmed live. Saving a draft is not sufficient evidence.


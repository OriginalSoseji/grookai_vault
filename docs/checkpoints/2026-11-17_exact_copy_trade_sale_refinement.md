# Exact-Copy Trade and Sale Refinement — 2026-11-17

## Outcome

Clarified the completed-sale/trade receipt flow on the exact-copy page so it is
visibly distinct from publishing a listing. The form states that it records a
deal completed outside grookai, does not create an eBay listing or collect
payment, and archives the exact copy. Sale entry names the amount actually
received; trade entry names what was received and whether cash changed hands.

The confirmation action names both the transaction and the archive effect.
Controls now use the shared surface, border, primary, and text tokens, an 8px
surface radius, and 44px minimum control height. Transaction and ownership
behavior were not changed.

## Source

- `apps/web/src/components/vault/VaultDispositionCard.tsx`

## Verification

- Targeted ESLint — passed.
- Web typecheck — passed with `NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY=true`
  and the administrative Supabase credential removed from the process
  environment.
- `git diff --check` — passed.
- The isolated live Auth/RPC/browser disposition runner was not run: its guard
  requires a separate fixed audit checkout, and it rejected this worktree before
  contacting its fixture services.

## Data and publication

Presentation-only change. No database, account, marketplace, or listing state
was changed. No release build or production deployment was published from this
checkpoint.

# Transaction History Refinement — 2026-11-17

## Outcome

Refined the private transaction-history destination to continue the exact-copy
trade/sale flow with compact hierarchy, shared theme/surface tokens, flat 8px
surfaces, and 44px navigation and control targets. Search, filters, receipt
content, pagination, seller workspace, and Vault destinations remain available.

History now labels a sale's actual amount separately from cash in a trade, and
the empty state points back to Vault. It continues to explain that recorded
transactions are private off-platform records and do not confirm an online
payment.

No route, data, access, or transaction behavior changed.

## Source

- `apps/web/src/app/vault/transactions/page.tsx`

## Verification

- Targeted ESLint — passed.
- Web typecheck — passed with read-only collector preview mode and no
  administrative Supabase credential in the process environment.
- `git diff --check` — passed.

## Data and publication

Presentation-only change. No account, database, marketplace, or listing state
was changed. No release build or production deployment was published from this
checkpoint.
